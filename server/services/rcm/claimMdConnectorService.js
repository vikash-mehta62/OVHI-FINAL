const mysql = require('mysql2/promise');
const axios = require('axios');
const dbConfig = require('../../config/db');

class ClaimMDConnectorService {
    constructor() {
        this.pool = mysql.createPool(dbConfig);
        this.apiBaseUrl = process.env.CLAIMMD_API_URL || 'https://api.claimmd.com/v1';
        this.apiKey = process.env.CLAIMMD_API_KEY;
        this.clientId = process.env.CLAIMMD_CLIENT_ID;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Submit claim to ClaimMD
     */
    async submitClaim(claim) {
        try {
            const connection = await this.pool.getConnection();

            // Transform claim data to ClaimMD format
            const claimMDData = await this.transformClaimData(claim);

            // Validate claim before submission
            const validationResult = await this.validateClaim(claimMDData);
            if (!validationResult.isValid) {
                throw new Error(`Claim validation failed: ${validationResult.errors.join(', ')}`);
            }

            // Submit to ClaimMD with retry logic
            const submissionResult = await this.submitWithRetry(claimMDData);

            // Store submission record
            const [result] = await connection.execute(`
                INSERT INTO rcm_claimmd_submissions 
                (claim_id, claimmd_id, submission_status, confirmation_number, submission_date)
                VALUES (?, ?, ?, ?, NOW())
            `, [
                claim.id,
                submissionResult.claimMDId,
                submissionResult.status,
                submissionResult.confirmationNumber
            ]);

            const submissionId = result.insertId;

            // Store any errors
            if (submissionResult.errors && submissionResult.errors.length > 0) {
                for (const error of submissionResult.errors) {
                    await connection.execute(`
                        INSERT INTO rcm_claimmd_errors 
                        (submission_id, error_code, error_message, error_severity)
                        VALUES (?, ?, ?, ?)
                    `, [
                        submissionId,
                        error.code,
                        error.message,
                        error.severity || 'medium'
                    ]);
                }
            }

            connection.release();

            return {
                submissionId,
                claimMDId: submissionResult.claimMDId,
                status: submissionResult.status,
                confirmationNumber: submissionResult.confirmationNumber,
                errors: submissionResult.errors || []
            };

        } catch (error) {
            console.error('Error submitting claim to ClaimMD:', error);
            throw error;
        }
    }

    /**
     * Get claim status from ClaimMD
     */
    async getClaimStatus(claimMDId) {
        try {
            const response = await this.makeAPIRequest('GET', `/claims/${claimMDId}/status`);
            
            // Update local status
            await this.updateClaimStatus(claimMDId, response.data);

            return {
                claimMDId,
                status: response.data.status,
                statusDate: response.data.statusDate,
                statusDetails: response.data.details,
                paymentInfo: response.data.payment,
                denialInfo: response.data.denial
            };

        } catch (error) {
            console.error('Error getting claim status from ClaimMD:', error);
            throw error;
        }
    }

    /**
     * Download ERA file from ClaimMD
     */
    async downloadERA(eraId) {
        try {
            const response = await this.makeAPIRequest('GET', `/era/${eraId}/download`, {
                responseType: 'stream'
            });

            const connection = await this.pool.getConnection();

            // Store ERA file record
            const [result] = await connection.execute(`
                INSERT INTO rcm_era_files 
                (file_name, file_path, payer_id, processing_status, uploaded_at)
                VALUES (?, ?, ?, 'pending', NOW())
            `, [
                `era_${eraId}.txt`,
                `/era_files/era_${eraId}.txt`,
                null // Will be determined during processing
            ]);

            connection.release();

            return {
                eraId,
                fileName: `era_${eraId}.txt`,
                fileStream: response.data,
                fileId: result.insertId
            };

        } catch (error) {
            console.error('Error downloading ERA from ClaimMD:', error);
            throw error;
        }
    }

    /**
     * Validate claim data
     */
    async validateClaim(claimData) {
        const errors = [];
        const warnings = [];

        // Required field validation
        if (!claimData.patientInfo?.firstName) {
            errors.push('Patient first name is required');
        }
        if (!claimData.patientInfo?.lastName) {
            errors.push('Patient last name is required');
        }
        if (!claimData.patientInfo?.dateOfBirth) {
            errors.push('Patient date of birth is required');
        }
        if (!claimData.providerInfo?.npi) {
            errors.push('Provider NPI is required');
        }
        if (!claimData.serviceLines || claimData.serviceLines.length === 0) {
            errors.push('At least one service line is required');
        }

        // Service line validation
        if (claimData.serviceLines) {
            claimData.serviceLines.forEach((line, index) => {
                if (!line.procedureCode) {
                    errors.push(`Service line ${index + 1}: Procedure code is required`);
                }
                if (!line.diagnosisCode) {
                    errors.push(`Service line ${index + 1}: Diagnosis code is required`);
                }
                if (!line.serviceDate) {
                    errors.push(`Service line ${index + 1}: Service date is required`);
                }
                if (!line.chargeAmount || line.chargeAmount <= 0) {
                    errors.push(`Service line ${index + 1}: Valid charge amount is required`);
                }
            });
        }

        // Insurance validation
        if (!claimData.insuranceInfo?.payerId) {
            errors.push('Insurance payer ID is required');
        }
        if (!claimData.insuranceInfo?.memberNumber) {
            errors.push('Insurance member number is required');
        }

        // Business rule validation
        if (claimData.serviceLines) {
            const totalCharges = claimData.serviceLines.reduce((sum, line) => sum + (line.chargeAmount || 0), 0);
            if (totalCharges > 50000) {
                warnings.push('Total charges exceed $50,000 - may require additional review');
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Transform internal claim data to ClaimMD format
     */
    async transformClaimData(claim) {
        try {
            const connection = await this.pool.getConnection();

            // Get related data
            const [patientData] = await connection.execute(`
                SELECT p.*, pa.address, pa.city, pa.state, pa.zip_code, pa.phone
                FROM patients p
                LEFT JOIN patient_addresses pa ON p.id = pa.patient_id
                WHERE p.id = ?
            `, [claim.patient_id]);

            const [providerData] = await connection.execute(`
                SELECT * FROM providers WHERE id = ?
            `, [claim.provider_id]);

            const [insuranceData] = await connection.execute(`
                SELECT * FROM insurance WHERE id = ?
            `, [claim.primary_insurance_id]);

            const [serviceLines] = await connection.execute(`
                SELECT * FROM claim_line_items WHERE claim_id = ?
            `, [claim.id]);

            connection.release();

            if (!patientData.length || !providerData.length || !insuranceData.length) {
                throw new Error('Missing required claim data');
            }

            const patient = patientData[0];
            const provider = providerData[0];
            const insurance = insuranceData[0];

            // Transform to ClaimMD format
            return {
                claimNumber: claim.claim_number,
                patientInfo: {
                    firstName: patient.first_name,
                    lastName: patient.last_name,
                    middleName: patient.middle_name,
                    dateOfBirth: patient.date_of_birth,
                    gender: patient.gender,
                    ssn: patient.ssn,
                    address: {
                        street: patient.address,
                        city: patient.city,
                        state: patient.state,
                        zipCode: patient.zip_code
                    },
                    phone: patient.phone
                },
                providerInfo: {
                    npi: provider.npi,
                    taxId: provider.tax_id,
                    name: provider.practice_name,
                    address: {
                        street: provider.address,
                        city: provider.city,
                        state: provider.state,
                        zipCode: provider.zip_code
                    },
                    phone: provider.phone
                },
                insuranceInfo: {
                    payerId: insurance.payer_id,
                    payerName: insurance.insurance_name,
                    memberNumber: insurance.member_number,
                    groupNumber: insurance.group_number,
                    planName: insurance.plan_name
                },
                serviceLines: serviceLines.map(line => ({
                    lineNumber: line.line_number,
                    procedureCode: line.procedure_code,
                    modifier1: line.modifier_1,
                    modifier2: line.modifier_2,
                    diagnosisCode: line.diagnosis_code,
                    serviceDate: line.service_date,
                    chargeAmount: parseFloat(line.charge_amount),
                    units: line.units || 1,
                    placeOfService: line.place_of_service
                })),
                claimInfo: {
                    totalCharges: parseFloat(claim.total_amount),
                    serviceFromDate: claim.service_from_date,
                    serviceToDate: claim.service_to_date,
                    admissionDate: claim.admission_date,
                    dischargeDate: claim.discharge_date,
                    claimType: claim.claim_type || 'professional'
                }
            };

        } catch (error) {
            console.error('Error transforming claim data:', error);
            throw error;
        }
    }

    /**
     * Submit claim with retry logic
     */
    async submitWithRetry(claimData, attempt = 1) {
        try {
            const response = await this.makeAPIRequest('POST', '/claims/submit', claimData);
            
            return {
                claimMDId: response.data.claimId,
                status: response.data.status,
                confirmationNumber: response.data.confirmationNumber,
                errors: response.data.errors || []
            };

        } catch (error) {
            if (attempt < this.retryAttempts && this.isRetryableError(error)) {
                console.log(`Retrying ClaimMD submission, attempt ${attempt + 1}`);
                await this.delay(this.retryDelay * attempt);
                return this.submitWithRetry(claimData, attempt + 1);
            }
            throw error;
        }
    }

    /**
     * Make API request to ClaimMD
     */
    async makeAPIRequest(method, endpoint, data = null, options = {}) {
        try {
            const config = {
                method,
                url: `${this.apiBaseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Client-ID': this.clientId,
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                timeout: 30000,
                ...options
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                config.data = data;
            }

            const response = await axios(config);
            return response;

        } catch (error) {
            if (error.response) {
                // API returned an error response
                throw new Error(`ClaimMD API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
            } else if (error.request) {
                // Network error
                throw new Error('ClaimMD API Network Error: No response received');
            } else {
                throw error;
            }
        }
    }

    /**
     * Update claim status in database
     */
    async updateClaimStatus(claimMDId, statusData) {
        try {
            const connection = await this.pool.getConnection();

            await connection.execute(`
                UPDATE rcm_claimmd_submissions 
                SET submission_status = ?, response_date = NOW()
                WHERE claimmd_id = ?
            `, [statusData.status, claimMDId]);

            // Store response data
            await connection.execute(`
                INSERT INTO rcm_claimmd_responses 
                (submission_id, response_type, response_data)
                SELECT id, 'status_update', ?
                FROM rcm_claimmd_submissions 
                WHERE claimmd_id = ?
            `, [JSON.stringify(statusData), claimMDId]);

            connection.release();

        } catch (error) {
            console.error('Error updating claim status:', error);
            throw error;
        }
    }

    /**
     * Sync claim statuses for all pending claims
     */
    async syncClaimStatuses() {
        try {
            const connection = await this.pool.getConnection();

            // Get all pending submissions
            const [pendingClaims] = await connection.execute(`
                SELECT claimmd_id, submission_date
                FROM rcm_claimmd_submissions 
                WHERE submission_status IN ('submitted', 'pending')
                AND submission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            const syncResults = [];

            for (const claim of pendingClaims) {
                try {
                    const status = await this.getClaimStatus(claim.claimmd_id);
                    syncResults.push({
                        claimMDId: claim.claimmd_id,
                        status: status.status,
                        success: true
                    });
                } catch (error) {
                    syncResults.push({
                        claimMDId: claim.claimmd_id,
                        error: error.message,
                        success: false
                    });
                }
            }

            connection.release();
            return syncResults;

        } catch (error) {
            console.error('Error syncing claim statuses:', error);
            throw error;
        }
    }

    /**
     * Get ClaimMD integration dashboard data
     */
    async getClaimMDDashboard() {
        try {
            const connection = await this.pool.getConnection();

            // Get submission statistics
            const [submissionStats] = await connection.execute(`
                SELECT 
                    submission_status,
                    COUNT(*) as count,
                    DATE(submission_date) as submission_date
                FROM rcm_claimmd_submissions 
                WHERE submission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY submission_status, DATE(submission_date)
                ORDER BY submission_date DESC
            `);

            // Get error statistics
            const [errorStats] = await connection.execute(`
                SELECT 
                    error_code,
                    error_severity,
                    COUNT(*) as count
                FROM rcm_claimmd_errors e
                JOIN rcm_claimmd_submissions s ON e.submission_id = s.id
                WHERE s.submission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                GROUP BY error_code, error_severity
                ORDER BY count DESC
                LIMIT 10
            `);

            // Get recent submissions
            const [recentSubmissions] = await connection.execute(`
                SELECT 
                    s.*,
                    c.claim_number,
                    p.first_name,
                    p.last_name
                FROM rcm_claimmd_submissions s
                JOIN claims c ON s.claim_id = c.id
                JOIN patients p ON c.patient_id = p.id
                ORDER BY s.submission_date DESC
                LIMIT 20
            `);

            connection.release();

            return {
                submissionStats,
                errorStats,
                recentSubmissions,
                summary: {
                    totalSubmissions: submissionStats.reduce((sum, stat) => sum + stat.count, 0),
                    successRate: this.calculateSuccessRate(submissionStats),
                    avgProcessingTime: await this.calculateAvgProcessingTime()
                }
            };

        } catch (error) {
            console.error('Error getting ClaimMD dashboard:', error);
            throw error;
        }
    }

    /**
     * Helper methods
     */
    isRetryableError(error) {
        // Retry on network errors or 5xx server errors
        return !error.response || (error.response.status >= 500 && error.response.status < 600);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    calculateSuccessRate(submissionStats) {
        const total = submissionStats.reduce((sum, stat) => sum + stat.count, 0);
        const successful = submissionStats
            .filter(stat => stat.submission_status === 'accepted')
            .reduce((sum, stat) => sum + stat.count, 0);
        
        return total > 0 ? (successful / total) * 100 : 0;
    }

    async calculateAvgProcessingTime() {
        try {
            const connection = await this.pool.getConnection();

            const [result] = await connection.execute(`
                SELECT AVG(TIMESTAMPDIFF(HOUR, submission_date, response_date)) as avg_hours
                FROM rcm_claimmd_submissions 
                WHERE response_date IS NOT NULL
                AND submission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `);

            connection.release();
            return result[0]?.avg_hours || 0;

        } catch (error) {
            console.error('Error calculating average processing time:', error);
            return 0;
        }
    }
}

module.exports = ClaimMDConnectorService;