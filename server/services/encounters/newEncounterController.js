const connection = require("../../config/db");
const Joi = require("joi");
const logAudit = require("../../utils/logAudit");

// Joi Validation Schemas
const encounterValidationSchemas = {
    // Create encounter validation
    createEncounter: Joi.object({
        patient_id: Joi.number().integer().positive().required(),
        encounter_date: Joi.date().iso().default(() => new Date()),
        duration_minutes: Joi.number().integer().min(1).max(480).default(30),
        type: Joi.string().valid('routine', 'acute', 'follow-up', 'consultation', 'emergency', 'telehealth').required(),
        reason_for_visit: Joi.string().max(500).optional().allow(null, ''),
        template_type: Joi.string().max(100).optional().allow(null, ''),
        category: Joi.string().max(100).optional().allow(null, ''),
        complexity: Joi.string().valid('low', 'moderate', 'high').default('moderate'),
        status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show').default('scheduled'),
        completed_at: Joi.date().iso().optional().allow(null),
        claim_id: Joi.number().integer().positive().optional().allow(null),
        subjective: Joi.string().max(2000).optional().allow(null, ''),
        objective: Joi.string().max(2000).optional().allow(null, ''),
        assessment: Joi.array().items(Joi.string().max(200)).optional().allow(null),
        plan: Joi.array().items(Joi.string().max(200)).optional().allow(null),
        vitals: Joi.object({
            blood_pressure: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).optional(),
            heart_rate: Joi.number().integer().min(30).max(200).optional(),
            temperature: Joi.number().min(90).max(110).optional(),
            respiratory_rate: Joi.number().integer().min(8).max(40).optional(),
            oxygen_saturation: Joi.number().min(70).max(100).optional(),
            weight: Joi.number().min(0).max(1000).optional(),
            height: Joi.number().min(0).max(300).optional(),
            bmi: Joi.number().min(10).max(80).optional()
        }).optional().allow(null),
        diagnosis_codes: Joi.array().items(Joi.string().max(20)).optional().allow(null),
        procedure_codes: Joi.array().items(Joi.string().max(20)).optional().allow(null)
    }),

    // Update encounter validation
    updateEncounter: Joi.object({
        patient_id: Joi.number().integer().positive().optional(),
        provider_id: Joi.number().integer().positive().optional(),
        encounter_date: Joi.date().iso().optional(),
        duration_minutes: Joi.number().integer().min(1).max(480).optional(),
        type: Joi.string().valid('routine', 'acute', 'follow-up', 'consultation', 'emergency', 'telehealth').optional(),
        reason_for_visit: Joi.string().max(500).optional().allow(null, ''),
        template_type: Joi.string().max(100).optional().allow(null, ''),
        category: Joi.string().max(100).optional().allow(null, ''),
        complexity: Joi.string().valid('low', 'moderate', 'high').optional(),
        status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show').optional(),
        completed_at: Joi.date().iso().optional().allow(null),
        claim_id: Joi.number().integer().positive().optional().allow(null),
        subjective: Joi.string().max(2000).optional().allow(null, ''),
        objective: Joi.string().max(2000).optional().allow(null, ''),
        assessment: Joi.array().items(Joi.string().max(200)).optional().allow(null),
        plan: Joi.array().items(Joi.string().max(200)).optional().allow(null),
        vitals: Joi.object({
            blood_pressure: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).optional(),
            heart_rate: Joi.number().integer().min(30).max(200).optional(),
            temperature: Joi.number().min(90).max(110).optional(),
            respiratory_rate: Joi.number().integer().min(8).max(40).optional(),
            oxygen_saturation: Joi.number().min(70).max(100).optional(),
            weight: Joi.number().min(0).max(1000).optional(),
            height: Joi.number().min(0).max(300).optional(),
            bmi: Joi.number().min(10).max(80).optional()
        }).optional().allow(null),
        diagnosis_codes: Joi.array().items(Joi.string().max(20)).optional().allow(null),
        procedure_codes: Joi.array().items(Joi.string().max(20)).optional().allow(null)
    }),

    // Query parameters validation
    encounterQuery: Joi.object({
        patient_id: Joi.number().integer().positive().optional(),
        provider_id: Joi.number().integer().positive().optional(),
        status: Joi.string().valid('scheduled', 'in-progress', 'completed', 'cancelled', 'no-show').optional(),
        type: Joi.string().valid('routine', 'acute', 'follow-up', 'consultation', 'emergency', 'telehealth').optional(),
        date_from: Joi.date().iso().optional(),
        date_to: Joi.date().iso().optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }),

    // ID parameter validation
    encounterId: Joi.object({
        encounter_id: Joi.number().integer().positive().required()
    })
};

// Helper function to format encounter data for database
const formatEncounterForDB = (data) => {
    const formatted = { ...data };

    // Convert arrays to JSON strings for database storage
    if (formatted.assessment && Array.isArray(formatted.assessment)) {
        formatted.assessment = JSON.stringify(formatted.assessment);
    }
    if (formatted.plan && Array.isArray(formatted.plan)) {
        formatted.plan = JSON.stringify(formatted.plan);
    }
    if (formatted.vitals && typeof formatted.vitals === 'object') {
        formatted.vitals = JSON.stringify(formatted.vitals);
    }
    if (formatted.diagnosis_codes && Array.isArray(formatted.diagnosis_codes)) {
        formatted.diagnosis_codes = JSON.stringify(formatted.diagnosis_codes);
    }
    if (formatted.procedure_codes && Array.isArray(formatted.procedure_codes)) {
        formatted.procedure_codes = JSON.stringify(formatted.procedure_codes);
    }

    return formatted;
};

// Helper function to format encounter data from database
const formatEncounterFromDB = (data) => {
    if (!data) return null;

    const formatted = { ...data };

    // Parse JSON strings back to objects/arrays
    try {
        if (formatted.assessment && typeof formatted.assessment === 'string') {
            formatted.assessment = JSON.parse(formatted.assessment);
        }
        if (formatted.plan && typeof formatted.plan === 'string') {
            formatted.plan = JSON.parse(formatted.plan);
        }
        if (formatted.vitals && typeof formatted.vitals === 'string') {
            formatted.vitals = JSON.parse(formatted.vitals);
        }
        if (formatted.diagnosis_codes && typeof formatted.diagnosis_codes === 'string') {
            formatted.diagnosis_codes = JSON.parse(formatted.diagnosis_codes);
        }
        if (formatted.procedure_codes && typeof formatted.procedure_codes === 'string') {
            formatted.procedure_codes = JSON.parse(formatted.procedure_codes);
        }
    } catch (error) {
        console.error('Error parsing JSON fields:', error);
    }

    return formatted;
};

// Create new encounter
const createNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const incomingData = { ...req.body, ...req.query,...req.params };
        
        // Validate request data
        const { error, value } = encounterValidationSchemas.createEncounter.validate(incomingData);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
        }

        // Set provider_id from authenticated user if not provided
        const { user_id, roleid } = req.user;
        if (!value.provider_id) {
            value.provider_id = user_id;
        }

        // Format data for database
        const encounterData = formatEncounterForDB(value);

        // Build dynamic query
        const fields = Object.keys(encounterData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(encounterData);

        const query = `
      INSERT INTO encounters (${fields.join(', ')}, created_at, updated_at) 
      VALUES (${placeholders}, NOW(), NOW())
    `;

        const [result] = await connection.query(query, values);

        // Log audit
        await logAudit(req, 'CREATE', 'ENCOUNTER', result.insertId,
            `New encounter created for patient ${value.patient_id}`);

        res.status(201).json({
            success: true,
            message: 'Encounter created successfully',
            data: {
                encounter_id: result.insertId,
                ...value
            }
        });

    } catch (error) {
        console.error('Create encounter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create encounter',
            error: error.message
        });
    }
};

// Get encounters with filtering and pagination
const getNewEncounters = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.body, ...req.query };
        
        // Validate query parameters
        const { error, value } = encounterValidationSchemas.encounterQuery.validate(values);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
        }

        const { page, limit, ...filters } = value;
        const offset = (page - 1) * limit;
        const { user_id, roleid } = req.user;

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];

        // Role-based access control (following patient controller pattern)
        if (roleid !== 1) { // Not admin (assuming 1 is admin role)
            whereConditions.push('provider_id = ?');
            queryParams.push(user_id);
        }

        // Add filters
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                if (key === 'date_from') {
                    whereConditions.push('encounter_date >= ?');
                    queryParams.push(val);
                } else if (key === 'date_to') {
                    whereConditions.push('encounter_date <= ?');
                    queryParams.push(val);
                } else {
                    whereConditions.push(`${key} = ?`);
                    queryParams.push(val);
                }
            }
        });


        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get total count
 
        const countQuery = `SELECT COUNT(*) as total FROM encounters ${whereClause}`;
        const [countResult] = await connection.query(countQuery, queryParams);
        const total = countResult[0].total;

        // Get encounters (following patient controller pattern)
        const fixedWhereClause = whereClause.replace(/\bstatus\b/g, 'e.status');

        const query = `
      SELECT e.*, 
             -- Patient Information
             up.firstname as patient_first_name, 
             up.lastname as patient_last_name, 
             up.middlename as patient_middle_name,
             up.dob as patient_date_of_birth, 
             up.phone as patient_phone, 
             up.work_email as patient_email,
             
             -- Provider Information
             CONCAT(up2.firstname," ",up2.lastname) as provider_name,
             up2.phone as provider_phone,
             up2.work_email as provider_email
             
      FROM encounters e
      LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
      LEFT JOIN user_profiles up2 ON up2.fk_userid = e.provider_id
      ${fixedWhereClause}
      ORDER BY e.encounter_date DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `;

        const [encounters] = await connection.query(query, [...queryParams, limit, offset]);

        // Format encounters
        const formattedEncounters = encounters.map(formatEncounterFromDB);

        res.status(200).json({
            success: true,
            data: formattedEncounters,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get encounters error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve encounters',
            error: error.message
        });
    }
};

// Get encounter by ID
const getNewEncounterById = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };
        
        // Validate encounter ID
        const { error, value } = encounterValidationSchemas.encounterId.validate(values);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encounter ID',
                details: error.details.map(detail => detail.message)
            });
        }

        const { encounter_id } = value;

        const query = `
      SELECT e.*, 
             -- Patient Information (following patient controller pattern)
             up.firstname as patient_first_name, 
             up.lastname as patient_last_name, 
             up.middlename as patient_middle_name,
             up.dob as patient_date_of_birth, 
             up.phone as patient_phone, 
             up.work_email as patient_email,
             up.gender as patient_gender,
             up.address_line as patient_address1,
             up.address_line_2 as patient_address2,
             up.city as patient_city,
             up.state as patient_state,
             up.zip as patient_zip,
             
             -- Provider Information (following patient controller pattern)
             CONCAT(up2.firstname," ",up2.lastname) as provider_name,
             up2.phone as provider_phone,
             up2.work_email as provider_email,
             up2.address_line as provider_address1,
             up2.city as provider_city,
             up2.state as provider_state,
             
             -- Practice Information
             pp.practice_name,
             pp.address_line1 as practice_address1,
             pp.practice_phone,
             pp.practice_email
             
      FROM encounters e
      LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
      LEFT JOIN users_mappings um ON um.user_id = e.patient_id
      LEFT JOIN user_profiles up2 ON up2.fk_userid = e.provider_id
      LEFT JOIN provider_practices pp ON pp.provider_id = e.provider_id
      WHERE e.encounter_id = ?
    `;

        const [encounters] = await connection.query(query, [encounter_id]);

        if (encounters.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        const encounter = formatEncounterFromDB(encounters[0]);

        res.status(200).json({
            success: true,
            data: encounter
        });

    } catch (error) {
        console.error('Get encounter by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve encounter',
            error: error.message
        });
    }
};

// Update encounter
const updateNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const paramValues = { ...req.params, ...req.query };
        const bodyValues = { ...req.body, ...req.query };
        
        // Validate encounter ID
        const { error: idError, value: idValue } = encounterValidationSchemas.encounterId.validate(paramValues);
        if (idError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encounter ID',
                details: idError.details.map(detail => detail.message)
            });
        }

        // Validate request body
        const { error, value } = encounterValidationSchemas.updateEncounter.validate(bodyValues);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
        }

        const { encounter_id } = idValue;
        const { user_id, roleid } = req.user;

        // Check if encounter exists and user has permission
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE encounter_id = ?',
            [encounter_id]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Check permission (following patient controller pattern)
        if (roleid !== 1 && existingEncounter[0].provider_id !== user_id) { // Not admin and not owner
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this encounter'
            });
        }

        // Format data for database
        const encounterData = formatEncounterForDB(value);

        // Build dynamic update query
        const fields = Object.keys(encounterData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(encounterData), encounter_id];

        const query = `
      UPDATE encounters 
      SET ${setClause}, updated_at = NOW()
      WHERE encounter_id = ?
    `;

        await connection.query(query, values);

        // Log audit
        await logAudit(req, 'UPDATE', 'ENCOUNTER', encounter_id,
            `Encounter updated for patient ${existingEncounter[0].patient_id}`);

        res.status(200).json({
            success: true,
            message: 'Encounter updated successfully'
        });

    } catch (error) {
        console.error('Update encounter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update encounter',
            error: error.message
        });
    }
};

// Delete encounter
const deleteNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };
        
        // Validate encounter ID
        const { error, value } = encounterValidationSchemas.encounterId.validate(values);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encounter ID',
                details: error.details.map(detail => detail.message)
            });
        }

        const { encounter_id } = value;
        const { user_id, roleid } = req.user;

        // Check if encounter exists and user has permission
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE encounter_id = ?',
            [encounter_id]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Check permission (following patient controller pattern)
        if (roleid !== 1 && existingEncounter[0].provider_id !== user_id) { // Not admin and not owner
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this encounter'
            });
        }

        // Soft delete or hard delete based on business rules
        // For now, we'll do hard delete
        await connection.query('DELETE FROM encounters WHERE encounter_id = ?', [encounter_id]);

        // Log audit
        await logAudit(req, 'DELETE', 'ENCOUNTER', encounter_id,
            `Encounter deleted for patient ${existingEncounter[0].patient_id}`);

        res.status(200).json({
            success: true,
            message: 'Encounter deleted successfully'
        });

    } catch (error) {
        console.error('Delete encounter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete encounter',
            error: error.message
        });
    }
};

// Complete encounter (change status to completed)
const completeEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };
        
        // Validate encounter ID
        const { error, value } = encounterValidationSchemas.encounterId.validate(values);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid encounter ID',
                details: error.details.map(detail => detail.message)
            });
        }

        const { encounter_id } = value;
        const { user_id, roleid } = req.user;

        // Check if encounter exists and user has permission
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE encounter_id = ?',
            [encounter_id]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Check permission (following patient controller pattern)
        if (roleid !== 1 && existingEncounter[0].provider_id !== user_id) { // Not admin and not owner
            return res.status(403).json({
                success: false,
                message: 'Not authorized to complete this encounter'
            });
        }

        // Update status to completed
        await connection.query(
            'UPDATE encounters SET status = ?, completed_at = NOW(), updated_at = NOW() WHERE encounter_id = ?',
            ['completed', encounter_id]
        );

        // Log audit
        await logAudit(req, 'UPDATE', 'ENCOUNTER', encounter_id,
            `Encounter completed for patient ${existingEncounter[0].patient_id}`);

        res.status(200).json({
            success: true,
            message: 'Encounter completed successfully'
        });

    } catch (error) {
        console.error('Complete encounter error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete encounter',
            error: error.message
        });
    }
};

// Get encounter statistics
const getEncounterStats = async (req, res) => {
    try {
        // Following patient controller pattern for role-based access
        const { user_id, roleid } = req.user;
        
        let whereClause = '';
        let queryParams = [];

        // Role-based filtering (following patient controller pattern)
        if (roleid !== 1) { // Not admin
            whereClause = 'WHERE provider_id = ?';
            queryParams.push(user_id);
        }

        const statsQuery = `
      SELECT 
        COUNT(*) as total_encounters,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_encounters,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_encounters,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END) as in_progress_encounters,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_encounters,
        COUNT(CASE WHEN DATE(encounter_date) = CURDATE() THEN 1 END) as today_encounters,
        COUNT(CASE WHEN WEEK(encounter_date) = WEEK(CURDATE()) AND YEAR(encounter_date) = YEAR(CURDATE()) THEN 1 END) as this_week_encounters,
        COUNT(CASE WHEN MONTH(encounter_date) = MONTH(CURDATE()) AND YEAR(encounter_date) = YEAR(CURDATE()) THEN 1 END) as this_month_encounters,
        AVG(duration_minutes) as avg_duration
      FROM encounters 
      ${whereClause}
    `;

        const [stats] = await connection.query(statsQuery, queryParams);

        res.status(200).json({
            success: true,
            data: stats[0]
        });

    } catch (error) {
        console.error('Get encounter stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve encounter statistics',
            error: error.message
        });
    }
};

module.exports = {
    createNewEncounter,
    getNewEncounters,
    getNewEncounterById,
    updateNewEncounter,
    deleteNewEncounter,
    completeEncounter,
    getEncounterStats,
    encounterValidationSchemas
};
// Additional helper function following patient controller pattern
const getEncountersByPatientId = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };
        const { user_id, roleid } = req.user;
        
        // Role-based patient ID determination (following patient controller pattern)
        let patientId;
        if (roleid === 6) { // Provider
            patientId = values.patientId;
            if (!patientId) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'patientId is required for provider' 
                });
            }
        } else if (roleid === 7) { // Patient
            patientId = user_id;
        } else {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized role' 
            });
        }

        const query = `
            SELECT e.*, 
                   -- Patient Information (following patient controller pattern)
                   up.firstname as patient_first_name, 
                   up.lastname as patient_last_name, 
                   up.middlename as patient_middle_name,
                   up.dob as patient_date_of_birth, 
                   up.phone as patient_phone, 
                   up.work_email as patient_email,
                   
                   -- Provider Information
                   CONCAT(up2.firstname," ",up2.lastname) as provider_name,
                   up2.phone as provider_phone,
                   up2.work_email as provider_email
                   
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            LEFT JOIN user_profiles up2 ON up2.fk_userid = e.provider_id
            WHERE e.patient_id = ?
            ORDER BY e.encounter_date DESC, e.created_at DESC
        `;

        const [encounters] = await connection.query(query, [patientId]);

        // Format encounters
        const formattedEncounters = encounters.map(formatEncounterFromDB);

        res.status(200).json({
            success: true,
            message: "Patient encounters fetched successfully",
            data: formattedEncounters
        });

    } catch (error) {
        console.error('Get encounters by patient ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve patient encounters',
            error: error.message
        });
    }
};

// Search encounters function following patient controller pattern
const searchEncounters = async (req, res) => {
    try {
        const { user_id, roleid } = req.user;
        const { searchterm } = req.query;
        
        if (!searchterm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        let whereClause = `WHERE (up.firstname LIKE '%${searchterm}%' 
                          OR up.lastname LIKE '%${searchterm}%' 
                          OR up.middlename LIKE '%${searchterm}%'
                          OR e.reason_for_visit LIKE '%${searchterm}%'
                          OR e.subjective LIKE '%${searchterm}%'
                          OR e.objective LIKE '%${searchterm}%')`;
        
        // Role-based filtering
        if (roleid !== 1) { // Not admin
            whereClause += ` AND e.provider_id = ${user_id}`;
        }

        const query = `
            SELECT e.encounter_id, e.encounter_date, e.type, e.status, e.reason_for_visit,
                   CONCAT(up.firstname," ",up.lastname) as patient_name,
                   up.fk_userid as patient_id,
                   CONCAT(up2.firstname," ",up2.lastname) as provider_name
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            LEFT JOIN user_profiles up2 ON up2.fk_userid = e.provider_id
            ${whereClause}
            ORDER BY e.encounter_date DESC
            LIMIT 50
        `;

        const [encounters] = await connection.query(query);

        res.status(200).json({
            success: true,
            message: "Encounters search completed",
            data: encounters
        });

    } catch (error) {
        console.error('Search encounters error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search encounters',
            error: error.message
        });
    }
};

module.exports = {
    createNewEncounter,
    getNewEncounters,
    getNewEncounterById,
    updateNewEncounter,
    deleteNewEncounter,
    completeEncounter,
    getEncounterStats,
    getEncountersByPatientId,  // New function following patient controller pattern
    searchEncounters,          // New function following patient controller pattern
    encounterValidationSchemas
};