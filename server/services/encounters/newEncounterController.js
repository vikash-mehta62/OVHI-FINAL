const connection = require("../../config/db");
const Joi = require("joi");
const logAudit = require("../../utils/logAudit");

// Joi Validation Schemas
const encounterValidationSchemas = {
    // Create encounter validation - Updated to match new schema
    createEncounter: Joi.object({
        patient: Joi.object({
            id: Joi.alternatives().try(Joi.number(), Joi.string()).required(),
            name: Joi.string().optional(),
            age: Joi.number().optional(),
            gender: Joi.string().optional(),
            lastVisit: Joi.string().optional(),
            conditions: Joi.array().items(Joi.string()).optional(),
            allergies: Joi.array().items(Joi.string()).optional(),
            medications: Joi.array().items(Joi.string()).optional()
        }).required(),
        type: Joi.string().valid('acute', 'chronic', 'wellness').required(),
        duration: Joi.number().integer().min(1).max(480).optional(),
        template: Joi.object().optional(),
        soapNotes: Joi.object({
            subjective: Joi.string().optional().allow(''),
            objective: Joi.string().optional().allow(''),
            assessment: Joi.string().optional().allow(''),
            plan: Joi.string().optional().allow('')
        }).optional(),
        completedAt: Joi.date().iso().optional()
    }),

    // Update encounter validation - Updated to match new schema
    updateEncounter: Joi.object({
        patient: Joi.object({
            id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
            name: Joi.string().optional(),
            age: Joi.number().optional(),
            gender: Joi.string().optional(),
            lastVisit: Joi.string().optional(),
            conditions: Joi.array().items(Joi.string()).optional(),
            allergies: Joi.array().items(Joi.string()).optional(),
            medications: Joi.array().items(Joi.string()).optional()
        }).optional(),
        type: Joi.string().valid('acute', 'chronic', 'wellness').optional(),
        duration: Joi.number().integer().min(1).max(480).optional(),
        template: Joi.object().optional(),
        soapNotes: Joi.object({
            subjective: Joi.string().optional().allow(''),
            objective: Joi.string().optional().allow(''),
            assessment: Joi.string().optional().allow(''),
            plan: Joi.string().optional().allow('')
        }).optional(),
        completedAt: Joi.date().iso().optional()
    }),

    // Query parameters validation - Updated to match new schema
    encounterQuery: Joi.object({
        patient_id: Joi.number().integer().positive().optional(),
        type: Joi.string().valid('acute', 'chronic', 'wellness').optional(),
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

// Helper function to format encounter data for database - Updated for new schema
const formatEncounterForDB = (data) => {
    const formatted = {};

    // Map incoming data to database schema
    if (data.patient && data.patient.id) {
        formatted.patient_id = parseInt(data.patient.id);
    }

    if (data.type) {
        formatted.type = data.type;
    }

    if (data.duration) {
        formatted.duration_minutes = data.duration;
    }

    if (data.completedAt) {
        formatted.completed_at = new Date(data.completedAt);
    }

    // Store template as JSON
    if (data.template) {
        formatted.template = JSON.stringify(data.template);
    }

    // Store SOAP notes as JSON
    if (data.soapNotes) {
        formatted.soap_notes = JSON.stringify(data.soapNotes);
    }

    // Store raw payload for reference
    formatted.raw_payload = JSON.stringify(data);

    return formatted;
};

// Helper function to format encounter data from database - Updated for new schema
const formatEncounterFromDB = (data) => {
    if (!data) return null;

    const formatted = {
        id: data.id,
        patient: {
            id: data.patient_id.toString()
        },
        type: data.type,
        duration: data.duration_minutes,
        completedAt: data.completed_at
    };

    // Parse JSON fields back to objects
    try {
        if (data.template && typeof data.template === 'string') {
            formatted.template = JSON.parse(data.template);
        }

        if (data.soap_notes && typeof data.soap_notes === 'string') {
            formatted.soapNotes = JSON.parse(data.soap_notes);
        }

        if (data.raw_payload && typeof data.raw_payload === 'string') {
            const rawData = JSON.parse(data.raw_payload);
            // Merge patient data from raw payload if available
            if (rawData.patient) {
                formatted.patient = { ...formatted.patient, ...rawData.patient };
            }
        }
    } catch (error) {
        console.error('Error parsing JSON fields:', error);
    }

    return formatted;
};

// Create new encounter - Updated for new schema
const createNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const incomingData = { ...req.body, ...req.query, ...req.params };

        // Validate request data
        const { error, value } = encounterValidationSchemas.createEncounter.validate(incomingData);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => detail.message)
            });
        }

        // Format data for database according to new schema
        const encounterData = formatEncounterForDB(value);

        // Build dynamic query
        const fields = Object.keys(encounterData);
        const placeholders = fields.map(() => '?').join(', ');
        const values = Object.values(encounterData);

        const query = `
            INSERT INTO encounters (${fields.join(', ')}, created_at) 
            VALUES (${placeholders}, NOW())
        `;

        const [result] = await connection.query(query, values);

        // Log audit
        await logAudit(req, 'CREATE', 'ENCOUNTER', result.insertId,
            `New encounter created for patient ${value.patient.id}`);

        // Fetch the created encounter to return formatted data
        const [createdEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE id = ?',
            [result.insertId]
        );

        const formattedEncounter = formatEncounterFromDB(createdEncounter[0]);

        res.status(201).json({
            success: true,
            message: 'Encounter created successfully',
            data: {
                id: result.insertId,
                ...formattedEncounter
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

// Get encounters with filtering and pagination - Updated for new schema
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

        // Build WHERE clause
        let whereConditions = [];
        let queryParams = [];

        // Add filters
        Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                if (key === 'date_from') {
                    whereConditions.push('created_at >= ?');
                    queryParams.push(val);
                } else if (key === 'date_to') {
                    whereConditions.push('created_at <= ?');
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

        // Get encounters with patient information
        const query = `
            SELECT e.*, 
                   up.firstname as patient_first_name, 
                   up.lastname as patient_last_name, 
                   up.middlename as patient_middle_name,
                   up.dob as patient_date_of_birth, 
                   up.phone as patient_phone, 
                   up.work_email as patient_email,
                   up.gender as patient_gender
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            ${whereClause}
            ORDER BY e.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [encounters] = await connection.query(query, [...queryParams, limit, offset]);

        // Format encounters
        const formattedEncounters = encounters.map(encounter => {
            const formatted = formatEncounterFromDB(encounter);

            // Add patient details from joined data
            if (formatted && formatted.patient) {
                formatted.patient.name = `${encounter.patient_first_name || ''} ${encounter.patient_last_name || ''}`.trim();
                formatted.patient.gender = encounter.patient_gender;
                formatted.patient.phone = encounter.patient_phone;
                formatted.patient.email = encounter.patient_email;
                formatted.patient.dob = encounter.patient_date_of_birth;
            }

            return formatted;
        });

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

// Get encounter by ID - Updated for new schema
const getNewEncounterById = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };

        // Validate encounter ID
        const encounterId = values.id || values.encounter_id;
        if (!encounterId) {
            return res.status(400).json({
                success: false,
                message: 'Encounter ID is required'
            });
        }

        const query = `
            SELECT e.*, 
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
                   up.zip as patient_zip
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            WHERE e.id = ?
        `;

        const [encounters] = await connection.query(query, [encounterId]);

        if (encounters.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        const encounter = formatEncounterFromDB(encounters[0]);

        // Add patient details from joined data
        if (encounter && encounter.patient) {
            encounter.patient.name = `${encounters[0].patient_first_name || ''} ${encounters[0].patient_last_name || ''}`.trim();
            encounter.patient.gender = encounters[0].patient_gender;
            encounter.patient.phone = encounters[0].patient_phone;
            encounter.patient.email = encounters[0].patient_email;
            encounter.patient.dob = encounters[0].patient_date_of_birth;
            encounter.patient.address = {
                line1: encounters[0].patient_address1,
                line2: encounters[0].patient_address2,
                city: encounters[0].patient_city,
                state: encounters[0].patient_state,
                zip: encounters[0].patient_zip
            };
        }

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

// Update encounter - Updated for new schema
const updateNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const paramValues = { ...req.params, ...req.query };
        const bodyValues = { ...req.body, ...req.query };

        // Get encounter ID
        const encounterId = paramValues.id || paramValues.encounter_id;
        if (!encounterId) {
            return res.status(400).json({
                success: false,
                message: 'Encounter ID is required'
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

        // Check if encounter exists
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE id = ?',
            [encounterId]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Format data for database
        const encounterData = formatEncounterForDB(value);

        // Build dynamic update query
        const fields = Object.keys(encounterData);
        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = [...Object.values(encounterData), encounterId];

        const query = `UPDATE encounters SET ${setClause} WHERE id = ?`;

        await connection.query(query, values);

        // Log audit
        await logAudit(req, 'UPDATE', 'ENCOUNTER', encounterId,
            `Encounter updated for patient ${existingEncounter[0].patient_id}`);

        // Fetch updated encounter
        const [updatedEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE id = ?',
            [encounterId]
        );

        const formattedEncounter = formatEncounterFromDB(updatedEncounter[0]);

        res.status(200).json({
            success: true,
            message: 'Encounter updated successfully',
            data: formattedEncounter
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

// Delete encounter - Updated for new schema
const deleteNewEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };

        // Get encounter ID
        const encounterId = values.id || values.encounter_id;
        if (!encounterId) {
            return res.status(400).json({
                success: false,
                message: 'Encounter ID is required'
            });
        }

        // Check if encounter exists
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE id = ?',
            [encounterId]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Hard delete
        await connection.query('DELETE FROM encounters WHERE id = ?', [encounterId]);

        // Log audit
        await logAudit(req, 'DELETE', 'ENCOUNTER', encounterId,
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

// Complete encounter - Updated for new schema
const completeEncounter = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };

        // Get encounter ID
        const encounterId = values.id || values.encounter_id;
        if (!encounterId) {
            return res.status(400).json({
                success: false,
                message: 'Encounter ID is required'
            });
        }

        // Check if encounter exists
        const [existingEncounter] = await connection.query(
            'SELECT * FROM encounters WHERE id = ?',
            [encounterId]
        );

        if (existingEncounter.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Encounter not found'
            });
        }

        // Update completed_at timestamp
        await connection.query(
            'UPDATE encounters SET completed_at = NOW() WHERE id = ?',
            [encounterId]
        );

        // Log audit
        await logAudit(req, 'UPDATE', 'ENCOUNTER', encounterId,
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

// Get encounter statistics - Updated for new schema
const getEncounterStats = async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_encounters,
                COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_encounters,
                COUNT(CASE WHEN completed_at IS NULL THEN 1 END) as pending_encounters,
                COUNT(CASE WHEN type = 'acute' THEN 1 END) as acute_encounters,
                COUNT(CASE WHEN type = 'chronic' THEN 1 END) as chronic_encounters,
                COUNT(CASE WHEN type = 'wellness' THEN 1 END) as wellness_encounters,
                COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_encounters,
                COUNT(CASE WHEN WEEK(created_at) = WEEK(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as this_week_encounters,
                COUNT(CASE WHEN MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE()) THEN 1 END) as this_month_encounters,
                AVG(duration_minutes) as avg_duration
            FROM encounters
        `;

        const [stats] = await connection.query(statsQuery);

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

// Additional helper function - Updated for new schema
const getEncountersByPatientId = async (req, res) => {
    try {
        // Extract values using patient controller pattern
        const values = { ...req.params, ...req.query };

        const patientId = values.patientId || values.patient_id;
        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'patientId is required'
            });
        }

        const query = `
            SELECT e.*, 
                   up.firstname as patient_first_name, 
                   up.lastname as patient_last_name, 
                   up.middlename as patient_middle_name,
                   up.dob as patient_date_of_birth, 
                   up.phone as patient_phone, 
                   up.work_email as patient_email,
                   up.gender as patient_gender
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            WHERE e.patient_id = ?
            ORDER BY e.created_at DESC
        `;

        const [encounters] = await connection.query(query, [patientId]);

        // Format encounters
        const formattedEncounters = encounters.map(encounter => {
            const formatted = formatEncounterFromDB(encounter);

            // Add patient details from joined data
            if (formatted && formatted.patient) {
                formatted.patient.name = `${encounter.patient_first_name || ''} ${encounter.patient_last_name || ''}`.trim();
                formatted.patient.gender = encounter.patient_gender;
                formatted.patient.phone = encounter.patient_phone;
                formatted.patient.email = encounter.patient_email;
                formatted.patient.dob = encounter.patient_date_of_birth;
            }

            return formatted;
        });

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

// Search encounters function - Updated for new schema
const searchEncounters = async (req, res) => {
    try {
        const { searchterm } = req.query;

        if (!searchterm) {
            return res.status(400).json({
                success: false,
                message: 'Search term is required'
            });
        }

        const whereClause = `WHERE (up.firstname LIKE '%${searchterm}%' 
                          OR up.lastname LIKE '%${searchterm}%' 
                          OR up.middlename LIKE '%${searchterm}%'
                          OR e.type LIKE '%${searchterm}%'
                          OR JSON_EXTRACT(e.soap_notes, '$.subjective') LIKE '%${searchterm}%'
                          OR JSON_EXTRACT(e.soap_notes, '$.objective') LIKE '%${searchterm}%'
                          OR JSON_EXTRACT(e.soap_notes, '$.assessment') LIKE '%${searchterm}%'
                          OR JSON_EXTRACT(e.soap_notes, '$.plan') LIKE '%${searchterm}%')`;

        const query = `
            SELECT e.id, e.created_at, e.type, e.completed_at, e.duration_minutes,
                   CONCAT(up.firstname," ",up.lastname) as patient_name,
                   up.fk_userid as patient_id
            FROM encounters e
            LEFT JOIN user_profiles up ON e.patient_id = up.fk_userid
            ${whereClause}
            ORDER BY e.created_at DESC
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
    getEncountersByPatientId,
    searchEncounters,
    encounterValidationSchemas
};