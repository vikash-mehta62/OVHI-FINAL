const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * ABN (Advance Beneficiary Notice) Service
 * Handles ABN requirements, signature capture, and compliance tracking
 */

class ABNService {
    constructor() {
        this.connection = null;
        this.abnStoragePath = process.env.ABN_STORAGE_PATH || './server/public/abn-signatures';
    }

    /**
     * Initialize database connection
     */
    async initConnection() {
        if (!this.connection) {
            this.connection = await mysql.createConnection({
                host: process.env.DB_HOST || 'localhost',
                user: process.env.DB_USER || 'root',
                password: process.env.DB_PASSWORD || '',
                database: process.env.DB_NAME || 'varn-health'
            });
        }
        return this.connection;
    }

    /**
     * Check if ABN is required for specific tests and patient insurance
     * @param {number} patientId - Patient ID
     * @param {Array} tests - Array of test objects
     * @param {number} facilityId - Lab facility ID
     * @returns {object} ABN requirement details
     */
    async checkABNRequirement(patientId, tests, facilityId) {
        try {
            const connection = await this.initConnection();
            
            // Get patient insurance information
            const patientInsurance = await this.getPatientInsurance(patientId);
            
            // Get lab facility ABN policies
            const facilityPolicies = await this.getFacilityABNPolicies(facilityId);
            
            // Check each test for ABN requirements
            const testRequirements = [];
            let abnRequired = false;
            let abnReason = [];

            for (const test of tests) {
                const requirement = await this.checkTestABNRequirement(
                    test, 
                    patientInsurance, 
                    facilityPolicies
                );
                
                testRequirements.push(requirement);
                
                if (requirement.abnRequired) {
                    abnRequired = true;
                    abnReason.push(requirement.reason);
                }
            }

            return {
                abnRequired,
                reasons: abnReason,
                testRequirements,
                patientInsurance,
                facilityPolicies: facilityPolicies.map(p => ({
                    testCode: p.test_code,
                    payerType: p.payer_type,
                    requiresABN: p.requires_abn,
                    reason: p.reason
                }))
            };

        } catch (error) {
            console.error('❌ Error checking ABN requirement:', error);
            throw new Error(`Failed to check ABN requirement: ${error.message}`);
        }
    }

    /**
     * Generate ABN form for patient signature
     * @param {number} orderId - Lab order ID
     * @param {object} abnDetails - ABN requirement details
     * @returns {object} ABN form data
     */
    async generateABNForm(orderId, abnDetails) {
        try {
            const connection = await this.initConnection();
            
            // Get order details
            const [orders] = await connection.execute(`
                SELECT 
                    lo.*,
                    lf.name as lab_facility_name,
                    lf.clia_number,
                    up.firstname,
                    up.lastname,
                    up.dob,
                    up.address_line,
                    up.city,
                    up.state,
                    up.zip
                FROM lab_orders lo
                JOIN lab_facilities lf ON lo.lab_facility_id = lf.id
                JOIN user_profiles up ON lo.patient_id = up.fk_userid
                WHERE lo.id = ?
            `, [orderId]);

            if (orders.length === 0) {
                throw new Error('Lab order not found');
            }

            const order = orders[0];

            // Get order tests
            const [tests] = await connection.execute(`
                SELECT 
                    lot.*,
                    lc.display_name,
                    lc.lab_test_code
                FROM lab_order_tests lot
                JOIN lab_compendium lc ON lot.compendium_id = lc.id
                WHERE lot.lab_order_id = ?
            `, [orderId]);

            // Generate ABN form content
            const abnForm = {
                formId: `ABN-${order.order_number}-${Date.now()}`,
                orderNumber: order.order_number,
                patientInfo: {
                    name: `${order.firstname} ${order.lastname}`,
                    dateOfBirth: order.dob,
                    address: {
                        line: order.address_line,
                        city: order.city,
                        state: order.state,
                        zip: order.zip
                    }
                },
                facilityInfo: {
                    name: order.lab_facility_name,
                    cliaNumber: order.clia_number
                },
                tests: tests.map(test => ({
                    code: test.lab_test_code,
                    name: test.display_name,
                    estimatedCost: this.getEstimatedTestCost(test.lab_test_code)
                })),
                abnReasons: abnDetails.reasons,
                totalEstimatedCost: this.calculateTotalEstimatedCost(tests),
                generatedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                patientOptions: [
                    {
                        option: 'A',
                        description: 'I want the test(s) listed above. I understand that Medicare or my insurance may not pay for the test(s), and I agree to be personally and fully responsible for payment.'
                    },
                    {
                        option: 'B', 
                        description: 'I do not want the test(s) listed above. I understand that by declining these tests, my health may be affected.'
                    }
                ],
                legalText: this.getABNLegalText()
            };

            return abnForm;

        } catch (error) {
            console.error('❌ Error generating ABN form:', error);
            throw new Error(`Failed to generate ABN form: ${error.message}`);
        }
    }

    /**
     * Process ABN signature
     * @param {number} orderId - Lab order ID
     * @param {object} signatureData - Signature data
     * @returns {object} Processed signature result
     */
    async processABNSignature(orderId, signatureData) {
        try {
            const connection = await this.initConnection();
            
            // Validate signature data
            if (!signatureData.signature || !signatureData.selectedOption || !signatureData.patientName) {
                throw new Error('Signature, selected option, and patient name are required');
            }

            // Ensure ABN storage directory exists
            await this.ensureABNStorageDirectory();

            // Save signature image
            const signatureFileName = `abn-signature-${orderId}-${Date.now()}.png`;
            const signaturePath = path.join(this.abnStoragePath, signatureFileName);
            
            // Convert base64 signature to file
            const signatureBuffer = Buffer.from(signatureData.signature.replace(/^data:image\/png;base64,/, ''), 'base64');
            await fs.writeFile(signaturePath, signatureBuffer);

            // Update order with ABN information
            await connection.execute(`
                UPDATE lab_orders 
                SET 
                    abn_signed = TRUE,
                    abn_signature_path = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [signaturePath, orderId]);

            // Log ABN signature event
            await this.logABNEvent(orderId, 'abn_signed', {
                selected_option: signatureData.selectedOption,
                patient_name: signatureData.patientName,
                signature_path: signaturePath,
                ip_address: signatureData.ipAddress,
                user_agent: signatureData.userAgent,
                signed_at: new Date().toISOString()
            });

            return {
                success: true,
                signaturePath,
                selectedOption: signatureData.selectedOption,
                signedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error processing ABN signature:', error);
            throw new Error(`Failed to process ABN signature: ${error.message}`);
        }
    }

    /**
     * Get ABN status for an order
     * @param {number} orderId - Lab order ID
     * @returns {object} ABN status
     */
    async getABNStatus(orderId) {
        try {
            const connection = await this.initConnection();
            
            const [orders] = await connection.execute(`
                SELECT abn_signed, abn_signature_path
                FROM lab_orders
                WHERE id = ?
            `, [orderId]);

            if (orders.length === 0) {
                throw new Error('Lab order not found');
            }

            const order = orders[0];

            // Get ABN events
            const [events] = await connection.execute(`
                SELECT event_type, event_detail, created_at
                FROM lab_events
                WHERE lab_order_id = ? AND event_type LIKE 'abn_%'
                ORDER BY created_at DESC
            `, [orderId]);

            return {
                abnSigned: order.abn_signed,
                signaturePath: order.abn_signature_path,
                events: events.map(event => ({
                    ...event,
                    event_detail: event.event_detail ? JSON.parse(event.event_detail) : null
                }))
            };

        } catch (error) {
            console.error('❌ Error getting ABN status:', error);
            throw new Error('Failed to get ABN status');
        }
    }

    /**
     * Validate ABN compliance for order
     * @param {number} orderId - Lab order ID
     * @returns {object} Compliance status
     */
    async validateABNCompliance(orderId) {
        try {
            const abnStatus = await this.getABNStatus(orderId);
            const abnRequirement = await this.checkOrderABNRequirement(orderId);

            const compliance = {
                isCompliant: true,
                issues: [],
                abnRequired: abnRequirement.abnRequired,
                abnSigned: abnStatus.abnSigned
            };

            if (abnRequirement.abnRequired && !abnStatus.abnSigned) {
                compliance.isCompliant = false;
                compliance.issues.push('ABN signature required but not obtained');
            }

            if (abnStatus.abnSigned && !abnRequirement.abnRequired) {
                compliance.issues.push('ABN signed but not required (informational)');
            }

            return compliance;

        } catch (error) {
            console.error('❌ Error validating ABN compliance:', error);
            throw new Error('Failed to validate ABN compliance');
        }
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    /**
     * Get patient insurance information
     */
    async getPatientInsurance(patientId) {
        const connection = await this.initConnection();
        
        const [insurance] = await connection.execute(`
            SELECT 
                insurance_type,
                payer_name,
                insurance_policy_number,
                insurance_group_number
            FROM patient_insurances
            WHERE fk_userid = ?
            ORDER BY 
                CASE 
                    WHEN insurance_type = 'primary' THEN 1 
                    WHEN insurance_type = 'secondary' THEN 2 
                    ELSE 3 
                END
        `, [patientId]);

        return insurance.length > 0 ? insurance[0] : null;
    }

    /**
     * Get facility ABN policies
     */
    async getFacilityABNPolicies(facilityId) {
        // Mock implementation - in production, this would query facility-specific ABN policies
        return [
            {
                test_code: 'GENETIC%',
                payer_type: 'medicare',
                requires_abn: true,
                reason: 'Genetic testing may not be covered by Medicare'
            },
            {
                test_code: 'MOLECULAR%',
                payer_type: 'medicare',
                requires_abn: true,
                reason: 'Molecular testing may not be covered by Medicare'
            }
        ];
    }

    /**
     * Check individual test ABN requirement
     */
    async checkTestABNRequirement(test, patientInsurance, facilityPolicies) {
        let abnRequired = false;
        let reason = null;

        // Check against facility policies
        for (const policy of facilityPolicies) {
            if (test.lab_test_code.match(new RegExp(policy.test_code.replace('%', '.*'), 'i'))) {
                if (patientInsurance && patientInsurance.payer_name.toLowerCase().includes('medicare')) {
                    abnRequired = true;
                    reason = policy.reason;
                    break;
                }
            }
        }

        // Additional checks for high-cost tests
        const highCostKeywords = ['PANEL', 'COMPREHENSIVE', 'EXTENDED'];
        if (highCostKeywords.some(keyword => test.display_name.toUpperCase().includes(keyword))) {
            abnRequired = true;
            reason = reason || 'High-cost test may not be covered by insurance';
        }

        return {
            testCode: test.lab_test_code,
            testName: test.display_name,
            abnRequired,
            reason
        };
    }

    /**
     * Check ABN requirement for existing order
     */
    async checkOrderABNRequirement(orderId) {
        const connection = await this.initConnection();
        
        const [orders] = await connection.execute(`
            SELECT patient_id, lab_facility_id
            FROM lab_orders
            WHERE id = ?
        `, [orderId]);

        if (orders.length === 0) {
            throw new Error('Lab order not found');
        }

        const order = orders[0];

        const [tests] = await connection.execute(`
            SELECT 
                lot.lab_test_code,
                lc.display_name
            FROM lab_order_tests lot
            JOIN lab_compendium lc ON lot.compendium_id = lc.id
            WHERE lot.lab_order_id = ?
        `, [orderId]);

        return await this.checkABNRequirement(order.patient_id, tests, order.lab_facility_id);
    }

    /**
     * Get estimated test cost
     */
    getEstimatedTestCost(testCode) {
        // Mock implementation - in production, this would query actual pricing
        const costMap = {
            'CBC': 25.00,
            'HBA1C': 35.00,
            'LIPID': 45.00,
            'TSH': 30.00,
            'CREAT': 20.00
        };

        return costMap[testCode] || 50.00; // Default cost
    }

    /**
     * Calculate total estimated cost
     */
    calculateTotalEstimatedCost(tests) {
        return tests.reduce((total, test) => {
            return total + this.getEstimatedTestCost(test.lab_test_code);
        }, 0);
    }

    /**
     * Get ABN legal text
     */
    getABNLegalText() {
        return `
This is an Advance Beneficiary Notice (ABN). Medicare or your insurance may not pay for the test(s) listed above. 
Medicare or your insurance does not pay for everything, even some care that you or your health care provider have 
good reason to think you need. We expect Medicare or your insurance may not pay for the test(s) listed above.

Before you make a decision about your options, you should read this entire notice carefully.
• Ask us to explain, if you don't understand why Medicare or your insurance may not pay.
• Ask us how much these test(s) will cost you (estimated costs are listed above), in case you have to pay for them yourself or through other insurance.

PLEASE CHOOSE ONE OPTION. CHECK ONE BOX. SIGN & DATE YOUR CHOICE.

By signing this form, you acknowledge that you have read and understand this notice, and you agree to be responsible for payment if Medicare or your insurance does not pay.
        `.trim();
    }

    /**
     * Ensure ABN storage directory exists
     */
    async ensureABNStorageDirectory() {
        try {
            await fs.access(this.abnStoragePath);
        } catch (error) {
            // Directory doesn't exist, create it
            await fs.mkdir(this.abnStoragePath, { recursive: true });
        }
    }

    /**
     * Log ABN-related event
     */
    async logABNEvent(orderId, eventType, eventDetail) {
        try {
            const connection = await this.initConnection();
            
            await connection.execute(`
                INSERT INTO lab_events 
                (lab_order_id, event_type, event_detail)
                VALUES (?, ?, ?)
            `, [
                orderId,
                eventType,
                JSON.stringify(eventDetail)
            ]);

        } catch (error) {
            console.error('❌ Error logging ABN event:', error);
            // Don't throw error for logging failures
        }
    }

    /**
     * Close database connection
     */
    async closeConnection() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }
}

module.exports = new ABNService();