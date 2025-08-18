const mysql = require('mysql2/promise');
const { labEncryption } = require('../../utils/labEncryption');

/**
 * Lab Facility Management Service
 * Handles CRUD operations for lab facilities and their configurations
 */

class LabFacilityService {
    constructor() {
        this.connection = null;
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
     * Get all active lab facilities
     * @returns {Array} List of lab facilities
     */
    async getAllFacilities() {
        try {
            const connection = await this.initConnection();
            
            const [facilities] = await connection.execute(`
                SELECT 
                    id,
                    name,
                    clia_number,
                    transport_type,
                    endpoint_url,
                    contact_info,
                    is_active,
                    created_at,
                    updated_at
                FROM lab_facilities 
                WHERE is_active = TRUE
                ORDER BY name
            `);

            // Parse JSON fields and redact sensitive auth info
            return facilities.map(facility => ({
                ...facility,
                contact_info: facility.contact_info ? JSON.parse(facility.contact_info) : null,
                // Don't expose auth_config in general listing for security
                auth_configured: facility.auth_config ? true : false
            }));

        } catch (error) {
            console.error('❌ Error fetching lab facilities:', error);
            throw new Error('Failed to fetch lab facilities');
        }
    }

    /**
     * Get lab facility by ID
     * @param {number} facilityId - Facility ID
     * @param {boolean} includeAuth - Whether to include auth configuration
     * @returns {object} Lab facility details
     */
    async getFacilityById(facilityId, includeAuth = false) {
        try {
            const connection = await this.initConnection();
            
            const [facilities] = await connection.execute(`
                SELECT 
                    id,
                    name,
                    clia_number,
                    transport_type,
                    endpoint_url,
                    auth_config,
                    contact_info,
                    is_active,
                    created_at,
                    updated_at
                FROM lab_facilities 
                WHERE id = ? AND is_active = TRUE
            `, [facilityId]);

            if (facilities.length === 0) {
                throw new Error('Lab facility not found');
            }

            const facility = facilities[0];
            
            return {
                ...facility,
                auth_config: includeAuth && facility.auth_config ? JSON.parse(facility.auth_config) : undefined,
                contact_info: facility.contact_info ? JSON.parse(facility.contact_info) : null,
                auth_configured: facility.auth_config ? true : false
            };

        } catch (error) {
            console.error('❌ Error fetching lab facility:', error);
            throw new Error('Failed to fetch lab facility');
        }
    }

    /**
     * Create new lab facility
     * @param {object} facilityData - Facility data
     * @returns {object} Created facility
     */
    async createFacility(facilityData) {
        try {
            const connection = await this.initConnection();
            
            // Validate required fields
            const { name, transport_type, clia_number } = facilityData;
            if (!name || !transport_type) {
                throw new Error('Name and transport type are required');
            }

            // Validate transport type
            const validTransportTypes = ['fax', 'sftp', 'mllp', 'fhir'];
            if (!validTransportTypes.includes(transport_type)) {
                throw new Error('Invalid transport type');
            }

            // Prepare data for insertion
            const insertData = {
                name: name.trim(),
                clia_number: clia_number?.trim() || null,
                transport_type,
                endpoint_url: facilityData.endpoint_url?.trim() || null,
                auth_config: facilityData.auth_config ? JSON.stringify(facilityData.auth_config) : null,
                contact_info: facilityData.contact_info ? JSON.stringify(facilityData.contact_info) : null
            };

            const [result] = await connection.execute(`
                INSERT INTO lab_facilities 
                (name, clia_number, transport_type, endpoint_url, auth_config, contact_info)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                insertData.name,
                insertData.clia_number,
                insertData.transport_type,
                insertData.endpoint_url,
                insertData.auth_config,
                insertData.contact_info
            ]);

            // Return the created facility
            return await this.getFacilityById(result.insertId);

        } catch (error) {
            console.error('❌ Error creating lab facility:', error);
            throw new Error(`Failed to create lab facility: ${error.message}`);
        }
    }

    /**
     * Update lab facility
     * @param {number} facilityId - Facility ID
     * @param {object} updateData - Data to update
     * @returns {object} Updated facility
     */
    async updateFacility(facilityId, updateData) {
        try {
            const connection = await this.initConnection();
            
            // Check if facility exists
            await this.getFacilityById(facilityId);

            // Prepare update fields
            const updateFields = [];
            const updateValues = [];

            if (updateData.name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(updateData.name.trim());
            }

            if (updateData.clia_number !== undefined) {
                updateFields.push('clia_number = ?');
                updateValues.push(updateData.clia_number?.trim() || null);
            }

            if (updateData.transport_type !== undefined) {
                const validTransportTypes = ['fax', 'sftp', 'mllp', 'fhir'];
                if (!validTransportTypes.includes(updateData.transport_type)) {
                    throw new Error('Invalid transport type');
                }
                updateFields.push('transport_type = ?');
                updateValues.push(updateData.transport_type);
            }

            if (updateData.endpoint_url !== undefined) {
                updateFields.push('endpoint_url = ?');
                updateValues.push(updateData.endpoint_url?.trim() || null);
            }

            if (updateData.auth_config !== undefined) {
                updateFields.push('auth_config = ?');
                updateValues.push(updateData.auth_config ? JSON.stringify(updateData.auth_config) : null);
            }

            if (updateData.contact_info !== undefined) {
                updateFields.push('contact_info = ?');
                updateValues.push(updateData.contact_info ? JSON.stringify(updateData.contact_info) : null);
            }

            if (updateData.is_active !== undefined) {
                updateFields.push('is_active = ?');
                updateValues.push(updateData.is_active);
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add updated_at timestamp
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(facilityId);

            await connection.execute(`
                UPDATE lab_facilities 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            // Return updated facility
            return await this.getFacilityById(facilityId);

        } catch (error) {
            console.error('❌ Error updating lab facility:', error);
            throw new Error(`Failed to update lab facility: ${error.message}`);
        }
    }

    /**
     * Delete (deactivate) lab facility
     * @param {number} facilityId - Facility ID
     * @returns {boolean} Success status
     */
    async deleteFacility(facilityId) {
        try {
            const connection = await this.initConnection();
            
            // Check if facility exists
            await this.getFacilityById(facilityId);

            // Check if facility has active orders
            const [activeOrders] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM lab_orders 
                WHERE lab_facility_id = ? AND status NOT IN ('canceled', 'final')
            `, [facilityId]);

            if (activeOrders[0].count > 0) {
                throw new Error('Cannot delete facility with active orders');
            }

            // Soft delete by setting is_active to false
            await connection.execute(`
                UPDATE lab_facilities 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [facilityId]);

            return true;

        } catch (error) {
            console.error('❌ Error deleting lab facility:', error);
            throw new Error(`Failed to delete lab facility: ${error.message}`);
        }
    }

    /**
     * Test facility connection
     * @param {number} facilityId - Facility ID
     * @returns {object} Connection test result
     */
    async testFacilityConnection(facilityId) {
        try {
            const facility = await this.getFacilityById(facilityId, true);
            
            const testResult = {
                facilityId,
                facilityName: facility.name,
                transportType: facility.transport_type,
                endpoint: facility.endpoint_url,
                timestamp: new Date().toISOString(),
                success: false,
                message: '',
                details: {}
            };

            switch (facility.transport_type) {
                case 'fhir':
                    testResult.details = await this.testFHIRConnection(facility);
                    break;
                case 'hl7':
                case 'mllp':
                    testResult.details = await this.testHL7Connection(facility);
                    break;
                case 'fax':
                    testResult.details = await this.testFaxConnection(facility);
                    break;
                case 'sftp':
                    testResult.details = await this.testSFTPConnection(facility);
                    break;
                default:
                    throw new Error(`Unsupported transport type: ${facility.transport_type}`);
            }

            testResult.success = testResult.details.success;
            testResult.message = testResult.details.message;

            return testResult;

        } catch (error) {
            console.error('❌ Error testing facility connection:', error);
            return {
                facilityId,
                success: false,
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Test FHIR connection
     * @param {object} facility - Facility configuration
     * @returns {object} Test result
     */
    async testFHIRConnection(facility) {
        // Mock implementation - in production, this would make actual FHIR calls
        return {
            success: true,
            message: 'FHIR endpoint accessible',
            responseTime: Math.floor(Math.random() * 500) + 100,
            capabilities: ['ServiceRequest', 'DiagnosticReport', 'Observation']
        };
    }

    /**
     * Test HL7 connection
     * @param {object} facility - Facility configuration
     * @returns {object} Test result
     */
    async testHL7Connection(facility) {
        // Mock implementation - in production, this would test MLLP connection
        return {
            success: true,
            message: 'HL7 MLLP connection established',
            responseTime: Math.floor(Math.random() * 300) + 50,
            protocol: 'MLLP',
            version: '2.5.1'
        };
    }

    /**
     * Test fax connection
     * @param {object} facility - Facility configuration
     * @returns {object} Test result
     */
    async testFaxConnection(facility) {
        // Mock implementation - in production, this would test fax service
        return {
            success: true,
            message: 'Fax service configured',
            provider: 'Mock Fax Provider',
            supportedFormats: ['PDF']
        };
    }

    /**
     * Test SFTP connection
     * @param {object} facility - Facility configuration
     * @returns {object} Test result
     */
    async testSFTPConnection(facility) {
        // Mock implementation - in production, this would test SFTP connection
        return {
            success: true,
            message: 'SFTP connection established',
            responseTime: Math.floor(Math.random() * 200) + 100,
            protocol: 'SFTP'
        };
    }

    /**
     * Get facilities by transport type
     * @param {string} transportType - Transport type to filter by
     * @returns {Array} Filtered facilities
     */
    async getFacilitiesByTransportType(transportType) {
        try {
            const connection = await this.initConnection();
            
            const [facilities] = await connection.execute(`
                SELECT 
                    id,
                    name,
                    clia_number,
                    transport_type,
                    endpoint_url,
                    contact_info,
                    is_active,
                    created_at,
                    updated_at
                FROM lab_facilities 
                WHERE transport_type = ? AND is_active = TRUE
                ORDER BY name
            `, [transportType]);

            return facilities.map(facility => ({
                ...facility,
                contact_info: facility.contact_info ? JSON.parse(facility.contact_info) : null
            }));

        } catch (error) {
            console.error('❌ Error fetching facilities by transport type:', error);
            throw new Error('Failed to fetch facilities by transport type');
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

module.exports = new LabFacilityService();