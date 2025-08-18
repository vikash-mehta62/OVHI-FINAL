const mysql = require('mysql2/promise');
const { labEncryption } = require('../../utils/labEncryption');

/**
 * Lab Order Management Service
 * Handles lab order creation, validation, status management, and medical necessity
 */

class LabOrderService {
    constructor() {
        this.connection = null;
        this.validStatuses = [
            'draft', 'signed', 'sent', 'ack', 'in_progress', 
            'partial', 'final', 'corrected', 'canceled'
        ];
        this.validPriorities = ['routine', 'urgent', 'stat'];
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
     * Create new lab order
     * @param {object} orderData - Order data
     * @returns {object} Created order
     */
    async createOrder(orderData) {
        try {
            const connection = await this.initConnection();
            
            // Validate required fields
            const { patient_id, lab_facility_id, requester_provider_id, tests } = orderData;
            if (!patient_id || !lab_facility_id || !requester_provider_id || !tests || tests.length === 0) {
                throw new Error('Patient ID, lab facility ID, requester provider ID, and tests are required');
            }

            // Validate lab facility exists and is active
            await this.validateLabFacility(lab_facility_id);

            // Validate patient exists
            await this.validatePatient(patient_id);

            // Validate provider exists
            await this.validateProvider(requester_provider_id);

            // Validate tests and get compendium details
            const validatedTests = await this.validateTests(tests, lab_facility_id);

            // Validate ICD-10 codes
            const icd10Codes = await this.validateICD10Codes(orderData.icd10_codes || []);

            // Check ABN requirements
            const abnRequired = await this.checkABNRequirement(lab_facility_id, icd10Codes, validatedTests);

            // Generate unique order number
            const orderNumber = labEncryption.generateOrderNumber();

            // Validate priority
            const priority = orderData.priority || 'routine';
            if (!this.validPriorities.includes(priority)) {
                throw new Error(`Invalid priority. Must be one of: ${this.validPriorities.join(', ')}`);
            }

            // Start transaction
            await connection.beginTransaction();

            try {
                // Insert lab order
                const [orderResult] = await connection.execute(`
                    INSERT INTO lab_orders 
                    (order_number, patient_id, encounter_id, lab_facility_id, status, priority, 
                     icd10_codes, abn_signed, requester_provider_id, service_location_id, 
                     clinical_notes, collection_datetime)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    orderNumber,
                    patient_id,
                    orderData.encounter_id || null,
                    lab_facility_id,
                    'draft',
                    priority,
                    JSON.stringify(icd10Codes),
                    orderData.abn_signed || false,
                    requester_provider_id,
                    orderData.service_location_id || null,
                    orderData.clinical_notes || null,
                    orderData.collection_datetime || null
                ]);

                const orderId = orderResult.insertId;

                // Insert order tests
                for (const test of validatedTests) {
                    await connection.execute(`
                        INSERT INTO lab_order_tests 
                        (lab_order_id, compendium_id, lab_test_code, loinc_code, test_notes)
                        VALUES (?, ?, ?, ?, ?)
                    `, [
                        orderId,
                        test.compendium_id,
                        test.lab_test_code,
                        test.loinc_code,
                        test.test_notes || null
                    ]);
                }

                // Log order creation event
                await this.logOrderEvent(orderId, 'order_created', {
                    order_number: orderNumber,
                    patient_id,
                    lab_facility_id,
                    test_count: validatedTests.length,
                    abn_required: abnRequired,
                    priority
                }, orderData.created_by);

                await connection.commit();

                // Return created order
                return await this.getOrderById(orderId);

            } catch (error) {
                await connection.rollback();
                throw error;
            }

        } catch (error) {
            console.error('❌ Error creating lab order:', error);
            throw new Error(`Failed to create lab order: ${error.message}`);
        }
    }

    /**
     * Get lab order by ID
     * @param {number} orderId - Order ID
     * @returns {object} Order details
     */
    async getOrderById(orderId) {
        try {
            const connection = await this.initConnection();
            
            // Get order details
            const [orders] = await connection.execute(`
                SELECT 
                    lo.*,
                    lf.name as lab_facility_name,
                    lf.transport_type,
                    lf.clia_number
                FROM lab_orders lo
                JOIN lab_facilities lf ON lo.lab_facility_id = lf.id
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
                    lc.specimen_type,
                    lc.units,
                    lc.reference_range,
                    lc.collection_instructions,
                    lc.patient_prep_instructions
                FROM lab_order_tests lot
                JOIN lab_compendium lc ON lot.compendium_id = lc.id
                WHERE lot.lab_order_id = ?
                ORDER BY lc.display_name
            `, [orderId]);

            // Parse JSON fields
            order.icd10_codes = order.icd10_codes ? JSON.parse(order.icd10_codes) : [];
            order.tests = tests;

            return order;

        } catch (error) {
            console.error('❌ Error fetching lab order:', error);
            throw new Error(`Failed to fetch lab order: ${error.message}`);
        }
    }

    /**
     * Update lab order
     * @param {number} orderId - Order ID
     * @param {object} updateData - Data to update
     * @returns {object} Updated order
     */
    async updateOrder(orderId, updateData) {
        try {
            const connection = await this.initConnection();
            
            // Get current order
            const currentOrder = await this.getOrderById(orderId);

            // Check if order can be updated
            if (!this.canUpdateOrder(currentOrder.status)) {
                throw new Error(`Cannot update order in ${currentOrder.status} status`);
            }

            // Prepare update fields
            const updateFields = [];
            const updateValues = [];

            if (updateData.priority !== undefined) {
                if (!this.validPriorities.includes(updateData.priority)) {
                    throw new Error(`Invalid priority. Must be one of: ${this.validPriorities.join(', ')}`);
                }
                updateFields.push('priority = ?');
                updateValues.push(updateData.priority);
            }

            if (updateData.clinical_notes !== undefined) {
                updateFields.push('clinical_notes = ?');
                updateValues.push(updateData.clinical_notes);
            }

            if (updateData.collection_datetime !== undefined) {
                updateFields.push('collection_datetime = ?');
                updateValues.push(updateData.collection_datetime);
            }

            if (updateData.abn_signed !== undefined) {
                updateFields.push('abn_signed = ?');
                updateValues.push(updateData.abn_signed);
            }

            if (updateData.abn_signature_path !== undefined) {
                updateFields.push('abn_signature_path = ?');
                updateValues.push(updateData.abn_signature_path);
            }

            if (updateData.icd10_codes !== undefined) {
                const validatedICD10 = await this.validateICD10Codes(updateData.icd10_codes);
                updateFields.push('icd10_codes = ?');
                updateValues.push(JSON.stringify(validatedICD10));
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            // Add updated_at timestamp
            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            updateValues.push(orderId);

            await connection.execute(`
                UPDATE lab_orders 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            // Log update event
            await this.logOrderEvent(orderId, 'order_updated', {
                updated_fields: Object.keys(updateData),
                previous_status: currentOrder.status
            }, updateData.updated_by);

            return await this.getOrderById(orderId);

        } catch (error) {
            console.error('❌ Error updating lab order:', error);
            throw new Error(`Failed to update lab order: ${error.message}`);
        }
    }

    /**
     * Update order status
     * @param {number} orderId - Order ID
     * @param {string} newStatus - New status
     * @param {object} metadata - Additional metadata
     * @returns {object} Updated order
     */
    async updateOrderStatus(orderId, newStatus, metadata = {}) {
        try {
            const connection = await this.initConnection();
            
            // Validate status
            if (!this.validStatuses.includes(newStatus)) {
                throw new Error(`Invalid status. Must be one of: ${this.validStatuses.join(', ')}`);
            }

            // Get current order
            const currentOrder = await this.getOrderById(orderId);

            // Validate status transition
            if (!this.isValidStatusTransition(currentOrder.status, newStatus)) {
                throw new Error(`Invalid status transition from ${currentOrder.status} to ${newStatus}`);
            }

            // Prepare status-specific updates
            const updateFields = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
            const updateValues = [newStatus];

            // Add timestamp fields based on status
            switch (newStatus) {
                case 'sent':
                    updateFields.push('sent_at = CURRENT_TIMESTAMP');
                    break;
                case 'ack':
                    updateFields.push('ack_at = CURRENT_TIMESTAMP');
                    break;
                case 'final':
                case 'corrected':
                    updateFields.push('final_at = CURRENT_TIMESTAMP');
                    break;
            }

            updateValues.push(orderId);

            await connection.execute(`
                UPDATE lab_orders 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            // Log status change event
            await this.logOrderEvent(orderId, this.getEventTypeForStatus(newStatus), {
                previous_status: currentOrder.status,
                new_status: newStatus,
                ...metadata
            }, metadata.updated_by);

            return await this.getOrderById(orderId);

        } catch (error) {
            console.error('❌ Error updating order status:', error);
            throw new Error(`Failed to update order status: ${error.message}`);
        }
    }

    /**
     * Get orders for a patient
     * @param {number} patientId - Patient ID
     * @param {object} filters - Optional filters
     * @returns {Array} Patient orders
     */
    async getOrdersByPatient(patientId, filters = {}) {
        try {
            const connection = await this.initConnection();
            
            let query = `
                SELECT 
                    lo.id,
                    lo.order_number,
                    lo.status,
                    lo.priority,
                    lo.created_at,
                    lo.sent_at,
                    lo.final_at,
                    lf.name as lab_facility_name,
                    lf.transport_type,
                    COUNT(lot.id) as test_count
                FROM lab_orders lo
                JOIN lab_facilities lf ON lo.lab_facility_id = lf.id
                LEFT JOIN lab_order_tests lot ON lo.id = lot.lab_order_id
                WHERE lo.patient_id = ?
            `;
            
            const queryParams = [patientId];

            // Apply filters
            if (filters.status) {
                query += ` AND lo.status = ?`;
                queryParams.push(filters.status);
            }

            if (filters.lab_facility_id) {
                query += ` AND lo.lab_facility_id = ?`;
                queryParams.push(filters.lab_facility_id);
            }

            if (filters.date_from) {
                query += ` AND lo.created_at >= ?`;
                queryParams.push(filters.date_from);
            }

            if (filters.date_to) {
                query += ` AND lo.created_at <= ?`;
                queryParams.push(filters.date_to);
            }

            query += ` GROUP BY lo.id ORDER BY lo.created_at DESC`;

            // Add pagination
            if (filters.limit) {
                query += ` LIMIT ?`;
                queryParams.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    query += ` OFFSET ?`;
                    queryParams.push(parseInt(filters.offset));
                }
            }

            const [orders] = await connection.execute(query, queryParams);
            return orders;

        } catch (error) {
            console.error('❌ Error fetching patient orders:', error);
            throw new Error('Failed to fetch patient orders');
        }
    }

    /**
     * Get orders by provider
     * @param {number} providerId - Provider ID
     * @param {object} filters - Optional filters
     * @returns {Array} Provider orders
     */
    async getOrdersByProvider(providerId, filters = {}) {
        try {
            const connection = await this.initConnection();
            
            let query = `
                SELECT 
                    lo.id,
                    lo.order_number,
                    lo.patient_id,
                    lo.status,
                    lo.priority,
                    lo.created_at,
                    lo.sent_at,
                    lo.final_at,
                    lf.name as lab_facility_name,
                    COUNT(lot.id) as test_count
                FROM lab_orders lo
                JOIN lab_facilities lf ON lo.lab_facility_id = lf.id
                LEFT JOIN lab_order_tests lot ON lo.id = lot.lab_order_id
                WHERE lo.requester_provider_id = ?
            `;
            
            const queryParams = [providerId];

            // Apply filters (same as patient orders)
            if (filters.status) {
                query += ` AND lo.status = ?`;
                queryParams.push(filters.status);
            }

            if (filters.lab_facility_id) {
                query += ` AND lo.lab_facility_id = ?`;
                queryParams.push(filters.lab_facility_id);
            }

            if (filters.date_from) {
                query += ` AND lo.created_at >= ?`;
                queryParams.push(filters.date_from);
            }

            if (filters.date_to) {
                query += ` AND lo.created_at <= ?`;
                queryParams.push(filters.date_to);
            }

            query += ` GROUP BY lo.id ORDER BY lo.created_at DESC`;

            if (filters.limit) {
                query += ` LIMIT ?`;
                queryParams.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    query += ` OFFSET ?`;
                    queryParams.push(parseInt(filters.offset));
                }
            }

            const [orders] = await connection.execute(query, queryParams);
            return orders;

        } catch (error) {
            console.error('❌ Error fetching provider orders:', error);
            throw new Error('Failed to fetch provider orders');
        }
    }

    /**
     * Cancel lab order
     * @param {number} orderId - Order ID
     * @param {string} reason - Cancellation reason
     * @param {number} canceledBy - User ID who canceled
     * @returns {object} Canceled order
     */
    async cancelOrder(orderId, reason, canceledBy) {
        try {
            const currentOrder = await this.getOrderById(orderId);

            // Check if order can be canceled
            if (!this.canCancelOrder(currentOrder.status)) {
                throw new Error(`Cannot cancel order in ${currentOrder.status} status`);
            }

            return await this.updateOrderStatus(orderId, 'canceled', {
                reason,
                updated_by: canceledBy
            });

        } catch (error) {
            console.error('❌ Error canceling lab order:', error);
            throw new Error(`Failed to cancel lab order: ${error.message}`);
        }
    }

    /**
     * Get order timeline/events
     * @param {number} orderId - Order ID
     * @returns {Array} Order events
     */
    async getOrderTimeline(orderId) {
        try {
            const connection = await this.initConnection();
            
            const [events] = await connection.execute(`
                SELECT 
                    event_type,
                    event_detail,
                    user_id,
                    created_at
                FROM lab_events
                WHERE lab_order_id = ?
                ORDER BY created_at ASC
            `, [orderId]);

            return events.map(event => ({
                ...event,
                event_detail: event.event_detail ? JSON.parse(event.event_detail) : null
            }));

        } catch (error) {
            console.error('❌ Error fetching order timeline:', error);
            throw new Error('Failed to fetch order timeline');
        }
    }

    // ============================================================================
    // VALIDATION METHODS
    // ============================================================================

    /**
     * Validate lab facility exists and is active
     */
    async validateLabFacility(facilityId) {
        const connection = await this.initConnection();
        
        const [facilities] = await connection.execute(
            'SELECT id FROM lab_facilities WHERE id = ? AND is_active = TRUE',
            [facilityId]
        );

        if (facilities.length === 0) {
            throw new Error('Lab facility not found or inactive');
        }
    }

    /**
     * Validate patient exists
     */
    async validatePatient(patientId) {
        const connection = await this.initConnection();
        
        const [patients] = await connection.execute(
            'SELECT fk_userid FROM user_profiles WHERE fk_userid = ?',
            [patientId]
        );

        if (patients.length === 0) {
            throw new Error('Patient not found');
        }
    }

    /**
     * Validate provider exists
     */
    async validateProvider(providerId) {
        // For now, assume provider validation is handled elsewhere
        // In production, this would check a providers table
        if (!providerId || providerId <= 0) {
            throw new Error('Invalid provider ID');
        }
    }

    /**
     * Validate tests and get compendium details
     */
    async validateTests(tests, facilityId) {
        const connection = await this.initConnection();
        const validatedTests = [];

        for (const test of tests) {
            if (!test.compendium_id) {
                throw new Error('Compendium ID is required for each test');
            }

            const [compendiumItems] = await connection.execute(`
                SELECT id, lab_test_code, loinc_code, display_name
                FROM lab_compendium 
                WHERE id = ? AND lab_facility_id = ? AND is_active = TRUE
            `, [test.compendium_id, facilityId]);

            if (compendiumItems.length === 0) {
                throw new Error(`Invalid compendium item ID: ${test.compendium_id}`);
            }

            const item = compendiumItems[0];
            validatedTests.push({
                compendium_id: item.id,
                lab_test_code: item.lab_test_code,
                loinc_code: item.loinc_code,
                display_name: item.display_name,
                test_notes: test.test_notes || null
            });
        }

        return validatedTests;
    }

    /**
     * Validate ICD-10 codes
     */
    async validateICD10Codes(icd10Codes) {
        if (!Array.isArray(icd10Codes)) {
            throw new Error('ICD-10 codes must be an array');
        }

        const validatedCodes = [];
        for (const code of icd10Codes) {
            if (typeof code === 'string') {
                // Simple string format
                if (!this.isValidICD10Format(code)) {
                    throw new Error(`Invalid ICD-10 code format: ${code}`);
                }
                validatedCodes.push({
                    code: code.trim().toUpperCase(),
                    description: null
                });
            } else if (typeof code === 'object' && code.code) {
                // Object format with code and description
                if (!this.isValidICD10Format(code.code)) {
                    throw new Error(`Invalid ICD-10 code format: ${code.code}`);
                }
                validatedCodes.push({
                    code: code.code.trim().toUpperCase(),
                    description: code.description || null
                });
            } else {
                throw new Error('Invalid ICD-10 code format');
            }
        }

        return validatedCodes;
    }

    /**
     * Check if ABN (Advance Beneficiary Notice) is required
     */
    async checkABNRequirement(facilityId, icd10Codes, tests) {
        // Mock implementation - in production, this would check:
        // 1. Payer rules for specific tests
        // 2. Lab facility requirements
        // 3. Test-specific coverage policies
        
        // For now, require ABN for certain high-cost tests or specific diagnoses
        const highCostTests = ['GENETIC', 'MOLECULAR', 'PANEL'];
        const requiresABN = tests.some(test => 
            highCostTests.some(keyword => 
                test.lab_test_code.includes(keyword) || 
                test.display_name.toUpperCase().includes(keyword)
            )
        );

        return requiresABN;
    }

    /**
     * Validate ICD-10 code format
     */
    isValidICD10Format(code) {
        // Basic ICD-10 format validation
        // Real implementation would be more comprehensive
        const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,4})?$/;
        return icd10Pattern.test(code);
    }

    // ============================================================================
    // STATUS MANAGEMENT METHODS
    // ============================================================================

    /**
     * Check if order can be updated
     */
    canUpdateOrder(status) {
        return ['draft', 'signed'].includes(status);
    }

    /**
     * Check if order can be canceled
     */
    canCancelOrder(status) {
        return !['final', 'corrected', 'canceled'].includes(status);
    }

    /**
     * Validate status transition
     */
    isValidStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            'draft': ['signed', 'canceled'],
            'signed': ['sent', 'canceled'],
            'sent': ['ack', 'canceled'],
            'ack': ['in_progress', 'canceled'],
            'in_progress': ['partial', 'final', 'canceled'],
            'partial': ['final', 'corrected', 'canceled'],
            'final': ['corrected'],
            'corrected': [],
            'canceled': []
        };

        return validTransitions[currentStatus]?.includes(newStatus) || false;
    }

    /**
     * Get event type for status change
     */
    getEventTypeForStatus(status) {
        const eventMap = {
            'signed': 'order_signed',
            'sent': 'order_sent',
            'ack': 'order_ack',
            'final': 'result_received',
            'corrected': 'result_received',
            'canceled': 'order_canceled'
        };

        return eventMap[status] || 'status_changed';
    }

    /**
     * Log order event
     */
    async logOrderEvent(orderId, eventType, eventDetail, userId = null) {
        try {
            const connection = await this.initConnection();
            
            await connection.execute(`
                INSERT INTO lab_events 
                (lab_order_id, event_type, event_detail, user_id)
                VALUES (?, ?, ?, ?)
            `, [
                orderId,
                eventType,
                JSON.stringify(eventDetail),
                userId
            ]);

        } catch (error) {
            console.error('❌ Error logging order event:', error);
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

module.exports = new LabOrderService();