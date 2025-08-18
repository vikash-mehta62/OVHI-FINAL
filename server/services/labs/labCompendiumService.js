const mysql = require('mysql2/promise');

/**
 * Lab Compendium Management Service
 * Handles test catalog management with LOINC mappings and specimen requirements
 */

class LabCompendiumService {
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
     * Get compendium for a specific lab facility
     * @param {number} labFacilityId - Lab facility ID
     * @param {object} filters - Optional filters
     * @returns {object} Lab facility and its test compendium
     */
    async getCompendiumByFacility(labFacilityId, filters = {}) {
        try {
            const connection = await this.initConnection();
            
            // Get lab facility info
            const [facilities] = await connection.execute(`
                SELECT id, name, clia_number, transport_type, contact_info
                FROM lab_facilities 
                WHERE id = ? AND is_active = TRUE
            `, [labFacilityId]);

            if (facilities.length === 0) {
                throw new Error('Lab facility not found');
            }

            const facility = facilities[0];
            
            // Build compendium query with filters
            let compendiumQuery = `
                SELECT 
                    id,
                    lab_test_code,
                    loinc_code,
                    display_name,
                    specimen_type,
                    units,
                    reference_range,
                    collection_instructions,
                    patient_prep_instructions,
                    is_active,
                    created_at,
                    updated_at
                FROM lab_compendium 
                WHERE lab_facility_id = ? AND is_active = TRUE
            `;
            
            const queryParams = [labFacilityId];

            // Apply filters
            if (filters.search) {
                compendiumQuery += ` AND (display_name LIKE ? OR lab_test_code LIKE ? OR loinc_code LIKE ?)`;
                const searchTerm = `%${filters.search}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            if (filters.specimen_type) {
                compendiumQuery += ` AND specimen_type = ?`;
                queryParams.push(filters.specimen_type);
            }

            if (filters.loinc_code) {
                compendiumQuery += ` AND loinc_code = ?`;
                queryParams.push(filters.loinc_code);
            }

            // Add ordering
            compendiumQuery += ` ORDER BY display_name`;

            // Add pagination if specified
            if (filters.limit) {
                compendiumQuery += ` LIMIT ?`;
                queryParams.push(parseInt(filters.limit));
                
                if (filters.offset) {
                    compendiumQuery += ` OFFSET ?`;
                    queryParams.push(parseInt(filters.offset));
                }
            }

            const [tests] = await connection.execute(compendiumQuery, queryParams);

            // Get total count for pagination
            let totalCount = tests.length;
            if (filters.limit) {
                const [countResult] = await connection.execute(`
                    SELECT COUNT(*) as total 
                    FROM lab_compendium 
                    WHERE lab_facility_id = ? AND is_active = TRUE
                `, [labFacilityId]);
                totalCount = countResult[0].total;
            }

            return {
                success: true,
                data: {
                    labFacility: {
                        id: facility.id,
                        name: facility.name,
                        cliaNumber: facility.clia_number,
                        transportType: facility.transport_type,
                        contactInfo: facility.contact_info ? JSON.parse(facility.contact_info) : null
                    },
                    tests: tests,
                    pagination: {
                        total: totalCount,
                        limit: filters.limit || totalCount,
                        offset: filters.offset || 0
                    }
                }
            };

        } catch (error) {
            console.error('❌ Error fetching lab compendium:', error);
            throw new Error(`Failed to fetch lab compendium: ${error.message}`);
        }
    }

    /**
     * Get compendium item by ID
     * @param {number} compendiumId - Compendium item ID
     * @returns {object} Compendium item details
     */
    async getCompendiumItemById(compendiumId) {
        try {
            const connection = await this.initConnection();
            
            const [items] = await connection.execute(`
                SELECT 
                    lc.*,
                    lf.name as facility_name,
                    lf.transport_type
                FROM lab_compendium lc
                JOIN lab_facilities lf ON lc.lab_facility_id = lf.id
                WHERE lc.id = ? AND lc.is_active = TRUE
            `, [compendiumId]);

            if (items.length === 0) {
                throw new Error('Compendium item not found');
            }

            return items[0];

        } catch (error) {
            console.error('❌ Error fetching compendium item:', error);
            throw new Error('Failed to fetch compendium item');
        }
    }

    /**
     * Create new compendium item
     * @param {object} itemData - Compendium item data
     * @returns {object} Created item
     */
    async createCompendiumItem(itemData) {
        try {
            const connection = await this.initConnection();
            
            // Validate required fields
            const { lab_facility_id, lab_test_code, display_name } = itemData;
            if (!lab_facility_id || !lab_test_code || !display_name) {
                throw new Error('Lab facility ID, test code, and display name are required');
            }

            // Check if facility exists
            const [facilities] = await connection.execute(
                'SELECT id FROM lab_facilities WHERE id = ? AND is_active = TRUE',
                [lab_facility_id]
            );

            if (facilities.length === 0) {
                throw new Error('Lab facility not found');
            }

            // Check for duplicate test code within facility
            const [existing] = await connection.execute(`
                SELECT id FROM lab_compendium 
                WHERE lab_facility_id = ? AND lab_test_code = ? AND is_active = TRUE
            `, [lab_facility_id, lab_test_code]);

            if (existing.length > 0) {
                throw new Error('Test code already exists for this facility');
            }

            // Validate LOINC code format if provided
            if (itemData.loinc_code && !this.isValidLoincCode(itemData.loinc_code)) {
                throw new Error('Invalid LOINC code format');
            }

            const [result] = await connection.execute(`
                INSERT INTO lab_compendium 
                (lab_facility_id, lab_test_code, loinc_code, display_name, specimen_type, 
                 units, reference_range, collection_instructions, patient_prep_instructions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                lab_facility_id,
                lab_test_code.trim().toUpperCase(),
                itemData.loinc_code?.trim() || null,
                display_name.trim(),
                itemData.specimen_type?.trim() || null,
                itemData.units?.trim() || null,
                itemData.reference_range?.trim() || null,
                itemData.collection_instructions?.trim() || null,
                itemData.patient_prep_instructions?.trim() || null
            ]);

            return await this.getCompendiumItemById(result.insertId);

        } catch (error) {
            console.error('❌ Error creating compendium item:', error);
            throw new Error(`Failed to create compendium item: ${error.message}`);
        }
    }

    /**
     * Update compendium item
     * @param {number} compendiumId - Compendium item ID
     * @param {object} updateData - Data to update
     * @returns {object} Updated item
     */
    async updateCompendiumItem(compendiumId, updateData) {
        try {
            const connection = await this.initConnection();
            
            // Check if item exists
            await this.getCompendiumItemById(compendiumId);

            // Prepare update fields
            const updateFields = [];
            const updateValues = [];

            if (updateData.lab_test_code !== undefined) {
                // Check for duplicate test code within facility
                const [existing] = await connection.execute(`
                    SELECT lc.id, lc.lab_facility_id 
                    FROM lab_compendium lc
                    WHERE lc.id = ?
                `, [compendiumId]);

                const [duplicates] = await connection.execute(`
                    SELECT id FROM lab_compendium 
                    WHERE lab_facility_id = ? AND lab_test_code = ? AND id != ? AND is_active = TRUE
                `, [existing[0].lab_facility_id, updateData.lab_test_code, compendiumId]);

                if (duplicates.length > 0) {
                    throw new Error('Test code already exists for this facility');
                }

                updateFields.push('lab_test_code = ?');
                updateValues.push(updateData.lab_test_code.trim().toUpperCase());
            }

            if (updateData.loinc_code !== undefined) {
                if (updateData.loinc_code && !this.isValidLoincCode(updateData.loinc_code)) {
                    throw new Error('Invalid LOINC code format');
                }
                updateFields.push('loinc_code = ?');
                updateValues.push(updateData.loinc_code?.trim() || null);
            }

            if (updateData.display_name !== undefined) {
                updateFields.push('display_name = ?');
                updateValues.push(updateData.display_name.trim());
            }

            if (updateData.specimen_type !== undefined) {
                updateFields.push('specimen_type = ?');
                updateValues.push(updateData.specimen_type?.trim() || null);
            }

            if (updateData.units !== undefined) {
                updateFields.push('units = ?');
                updateValues.push(updateData.units?.trim() || null);
            }

            if (updateData.reference_range !== undefined) {
                updateFields.push('reference_range = ?');
                updateValues.push(updateData.reference_range?.trim() || null);
            }

            if (updateData.collection_instructions !== undefined) {
                updateFields.push('collection_instructions = ?');
                updateValues.push(updateData.collection_instructions?.trim() || null);
            }

            if (updateData.patient_prep_instructions !== undefined) {
                updateFields.push('patient_prep_instructions = ?');
                updateValues.push(updateData.patient_prep_instructions?.trim() || null);
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
            updateValues.push(compendiumId);

            await connection.execute(`
                UPDATE lab_compendium 
                SET ${updateFields.join(', ')}
                WHERE id = ?
            `, updateValues);

            return await this.getCompendiumItemById(compendiumId);

        } catch (error) {
            console.error('❌ Error updating compendium item:', error);
            throw new Error(`Failed to update compendium item: ${error.message}`);
        }
    }

    /**
     * Delete (deactivate) compendium item
     * @param {number} compendiumId - Compendium item ID
     * @returns {boolean} Success status
     */
    async deleteCompendiumItem(compendiumId) {
        try {
            const connection = await this.initConnection();
            
            // Check if item exists
            await this.getCompendiumItemById(compendiumId);

            // Check if item is used in active orders
            const [activeOrders] = await connection.execute(`
                SELECT COUNT(*) as count 
                FROM lab_order_tests lot
                JOIN lab_orders lo ON lot.lab_order_id = lo.id
                WHERE lot.compendium_id = ? AND lo.status NOT IN ('canceled', 'final')
            `, [compendiumId]);

            if (activeOrders[0].count > 0) {
                throw new Error('Cannot delete compendium item used in active orders');
            }

            // Soft delete by setting is_active to false
            await connection.execute(`
                UPDATE lab_compendium 
                SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [compendiumId]);

            return true;

        } catch (error) {
            console.error('❌ Error deleting compendium item:', error);
            throw new Error(`Failed to delete compendium item: ${error.message}`);
        }
    }

    /**
     * Search compendium across all facilities
     * @param {string} searchTerm - Search term
     * @param {object} filters - Additional filters
     * @returns {Array} Search results
     */
    async searchCompendium(searchTerm, filters = {}) {
        try {
            const connection = await this.initConnection();
            
            let query = `
                SELECT 
                    lc.id,
                    lc.lab_test_code,
                    lc.loinc_code,
                    lc.display_name,
                    lc.specimen_type,
                    lc.units,
                    lc.reference_range,
                    lf.id as facility_id,
                    lf.name as facility_name,
                    lf.transport_type
                FROM lab_compendium lc
                JOIN lab_facilities lf ON lc.lab_facility_id = lf.id
                WHERE lc.is_active = TRUE AND lf.is_active = TRUE
                AND (lc.display_name LIKE ? OR lc.lab_test_code LIKE ? OR lc.loinc_code LIKE ?)
            `;
            
            const queryParams = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

            if (filters.facility_id) {
                query += ` AND lf.id = ?`;
                queryParams.push(filters.facility_id);
            }

            if (filters.transport_type) {
                query += ` AND lf.transport_type = ?`;
                queryParams.push(filters.transport_type);
            }

            if (filters.specimen_type) {
                query += ` AND lc.specimen_type = ?`;
                queryParams.push(filters.specimen_type);
            }

            query += ` ORDER BY lc.display_name LIMIT 50`;

            const [results] = await connection.execute(query, queryParams);
            return results;

        } catch (error) {
            console.error('❌ Error searching compendium:', error);
            throw new Error('Failed to search compendium');
        }
    }

    /**
     * Get unique specimen types across all facilities
     * @returns {Array} List of specimen types
     */
    async getSpecimenTypes() {
        try {
            const connection = await this.initConnection();
            
            const [types] = await connection.execute(`
                SELECT DISTINCT specimen_type 
                FROM lab_compendium 
                WHERE specimen_type IS NOT NULL AND is_active = TRUE
                ORDER BY specimen_type
            `);

            return types.map(row => row.specimen_type);

        } catch (error) {
            console.error('❌ Error fetching specimen types:', error);
            throw new Error('Failed to fetch specimen types');
        }
    }

    /**
     * Bulk import compendium items
     * @param {number} labFacilityId - Lab facility ID
     * @param {Array} items - Array of compendium items
     * @returns {object} Import results
     */
    async bulkImportCompendium(labFacilityId, items) {
        try {
            const connection = await this.initConnection();
            
            // Validate facility exists
            const [facilities] = await connection.execute(
                'SELECT id FROM lab_facilities WHERE id = ? AND is_active = TRUE',
                [labFacilityId]
            );

            if (facilities.length === 0) {
                throw new Error('Lab facility not found');
            }

            const results = {
                total: items.length,
                imported: 0,
                skipped: 0,
                errors: []
            };

            // Start transaction
            await connection.beginTransaction();

            try {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    
                    try {
                        // Validate required fields
                        if (!item.lab_test_code || !item.display_name) {
                            results.errors.push({
                                row: i + 1,
                                error: 'Missing required fields: lab_test_code and display_name'
                            });
                            results.skipped++;
                            continue;
                        }

                        // Check for duplicates
                        const [existing] = await connection.execute(`
                            SELECT id FROM lab_compendium 
                            WHERE lab_facility_id = ? AND lab_test_code = ? AND is_active = TRUE
                        `, [labFacilityId, item.lab_test_code]);

                        if (existing.length > 0) {
                            results.errors.push({
                                row: i + 1,
                                error: `Test code ${item.lab_test_code} already exists`
                            });
                            results.skipped++;
                            continue;
                        }

                        // Validate LOINC code if provided
                        if (item.loinc_code && !this.isValidLoincCode(item.loinc_code)) {
                            results.errors.push({
                                row: i + 1,
                                error: `Invalid LOINC code: ${item.loinc_code}`
                            });
                            results.skipped++;
                            continue;
                        }

                        // Insert item
                        await connection.execute(`
                            INSERT INTO lab_compendium 
                            (lab_facility_id, lab_test_code, loinc_code, display_name, specimen_type, 
                             units, reference_range, collection_instructions, patient_prep_instructions)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            labFacilityId,
                            item.lab_test_code.trim().toUpperCase(),
                            item.loinc_code?.trim() || null,
                            item.display_name.trim(),
                            item.specimen_type?.trim() || null,
                            item.units?.trim() || null,
                            item.reference_range?.trim() || null,
                            item.collection_instructions?.trim() || null,
                            item.patient_prep_instructions?.trim() || null
                        ]);

                        results.imported++;

                    } catch (itemError) {
                        results.errors.push({
                            row: i + 1,
                            error: itemError.message
                        });
                        results.skipped++;
                    }
                }

                await connection.commit();
                return results;

            } catch (error) {
                await connection.rollback();
                throw error;
            }

        } catch (error) {
            console.error('❌ Error bulk importing compendium:', error);
            throw new Error(`Failed to bulk import compendium: ${error.message}`);
        }
    }

    /**
     * Validate LOINC code format
     * @param {string} loincCode - LOINC code to validate
     * @returns {boolean} True if valid
     */
    isValidLoincCode(loincCode) {
        // LOINC codes are typically 5-7 digits followed by a dash and a check digit
        const loincPattern = /^\d{4,7}-\d$/;
        return loincPattern.test(loincCode);
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

module.exports = new LabCompendiumService();