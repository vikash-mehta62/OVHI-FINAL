const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * Lab Integration System Database Migration
 * Creates all tables required for lab ordering, result processing, and provider workflow
 */

async function createLabIntegrationTables(connection) {
    console.log('🧪 Creating Lab Integration System tables...');
    
    try {
        // Read the schema file
        const schemaPath = path.join(__dirname, '../sql/lab_integration_schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        // Split the schema into individual statements
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                    console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
                } catch (error) {
                    // Skip if table already exists
                    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                        console.log(`⚠️  Table already exists: ${statement.substring(0, 50)}...`);
                        continue;
                    }
                    throw error;
                }
            }
        }
        
        console.log('✅ Lab Integration System tables created successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Error creating Lab Integration System tables:', error);
        throw error;
    }
}

async function validateTablesCreated(connection) {
    console.log('🔍 Validating Lab Integration System tables...');
    
    const expectedTables = [
        'lab_facilities',
        'lab_compendium', 
        'lab_orders',
        'lab_order_tests',
        'lab_results',
        'lab_observations',
        'lab_events',
        'lab_critical_escalations',
        'lab_transmission_log',
        'lab_billing_items',
        'lab_system_config'
    ];
    
    try {
        for (const tableName of expectedTables) {
            const [rows] = await connection.execute(
                'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
                [tableName]
            );
            
            if (rows[0].count === 0) {
                throw new Error(`Table ${tableName} was not created`);
            }
            console.log(`✅ Table ${tableName} exists`);
        }
        
        // Validate indexes
        console.log('🔍 Validating indexes...');
        const [indexes] = await connection.execute(`
            SELECT table_name, index_name, column_name 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name LIKE 'lab_%' 
            ORDER BY table_name, index_name
        `);
        
        console.log(`✅ Found ${indexes.length} indexes on lab tables`);
        
        // Validate foreign keys
        console.log('🔍 Validating foreign key constraints...');
        const [foreignKeys] = await connection.execute(`
            SELECT table_name, constraint_name, referenced_table_name 
            FROM information_schema.key_column_usage 
            WHERE table_schema = DATABASE() 
            AND referenced_table_name IS NOT NULL 
            AND table_name LIKE 'lab_%'
        `);
        
        console.log(`✅ Found ${foreignKeys.length} foreign key constraints`);
        
        console.log('✅ All Lab Integration System tables validated successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Table validation failed:', error);
        throw error;
    }
}

async function insertSampleData(connection) {
    console.log('📊 Inserting sample lab integration data...');
    
    try {
        // Insert sample lab facility
        await connection.execute(`
            INSERT IGNORE INTO lab_facilities (name, clia_number, transport_type, endpoint_url, auth_config, contact_info) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'Quest Diagnostics',
            '05D0987654',
            'fhir',
            'https://api.questdiagnostics.com/fhir/R4',
            JSON.stringify({
                type: 'oauth2',
                client_id: 'quest_client_id',
                client_secret: 'quest_client_secret',
                token_url: 'https://api.questdiagnostics.com/oauth/token'
            }),
            JSON.stringify({
                phone: '1-800-QUEST-1',
                fax: '1-800-555-0199',
                email: 'orders@questdiagnostics.com',
                address: '500 Plaza Drive, Secaucus, NJ 07094'
            })
        ]);
        
        // Insert sample lab facility for HL7
        await connection.execute(`
            INSERT IGNORE INTO lab_facilities (name, clia_number, transport_type, endpoint_url, auth_config, contact_info) 
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'LabCorp',
            '33D1234567',
            'hl7',
            'mllp://hl7.labcorp.com:6661',
            JSON.stringify({
                type: 'certificate',
                cert_path: '/certs/labcorp.pem',
                key_path: '/certs/labcorp.key'
            }),
            JSON.stringify({
                phone: '1-800-LABCORP',
                fax: '1-800-555-0188',
                email: 'orders@labcorp.com',
                address: '531 South Spring Street, Burlington, NC 27215'
            })
        ]);
        
        // Get the facility IDs
        const [questFacility] = await connection.execute(
            'SELECT id FROM lab_facilities WHERE name = ?', 
            ['Quest Diagnostics']
        );
        
        const [labcorpFacility] = await connection.execute(
            'SELECT id FROM lab_facilities WHERE name = ?', 
            ['LabCorp']
        );
        
        if (questFacility.length > 0) {
            const questId = questFacility[0].id;
            
            // Insert sample compendium items for Quest
            const questTests = [
                {
                    lab_test_code: 'CBC',
                    loinc_code: '58410-2',
                    display_name: 'Complete Blood Count with Differential',
                    specimen_type: 'Whole Blood',
                    units: 'Various',
                    reference_range: 'Age and gender specific',
                    collection_instructions: 'Collect in EDTA tube',
                    patient_prep_instructions: 'No fasting required'
                },
                {
                    lab_test_code: 'HBA1C',
                    loinc_code: '33747-0',
                    display_name: 'Hemoglobin A1c',
                    specimen_type: 'Whole Blood',
                    units: '%',
                    reference_range: '<5.7%',
                    collection_instructions: 'Collect in EDTA tube',
                    patient_prep_instructions: 'No fasting required'
                },
                {
                    lab_test_code: 'LIPID',
                    loinc_code: '57698-3',
                    display_name: 'Lipid Panel',
                    specimen_type: 'Serum',
                    units: 'mg/dL',
                    reference_range: 'Various by component',
                    collection_instructions: 'Collect in SST tube',
                    patient_prep_instructions: '9-12 hour fasting required'
                }
            ];
            
            for (const test of questTests) {
                await connection.execute(`
                    INSERT IGNORE INTO lab_compendium 
                    (lab_facility_id, lab_test_code, loinc_code, display_name, specimen_type, units, reference_range, collection_instructions, patient_prep_instructions)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    questId,
                    test.lab_test_code,
                    test.loinc_code,
                    test.display_name,
                    test.specimen_type,
                    test.units,
                    test.reference_range,
                    test.collection_instructions,
                    test.patient_prep_instructions
                ]);
            }
        }
        
        if (labcorpFacility.length > 0) {
            const labcorpId = labcorpFacility[0].id;
            
            // Insert sample compendium items for LabCorp
            const labcorpTests = [
                {
                    lab_test_code: 'TSH',
                    loinc_code: '33747-0',
                    display_name: 'Thyroid Stimulating Hormone',
                    specimen_type: 'Serum',
                    units: 'mIU/L',
                    reference_range: '0.40-4.50 mIU/L',
                    collection_instructions: 'Collect in SST tube',
                    patient_prep_instructions: 'No special preparation required'
                },
                {
                    lab_test_code: 'CREAT',
                    loinc_code: '2160-0',
                    display_name: 'Creatinine, Serum',
                    specimen_type: 'Serum',
                    units: 'mg/dL',
                    reference_range: '0.60-1.30 mg/dL',
                    collection_instructions: 'Collect in SST tube',
                    patient_prep_instructions: 'No special preparation required'
                }
            ];
            
            for (const test of labcorpTests) {
                await connection.execute(`
                    INSERT IGNORE INTO lab_compendium 
                    (lab_facility_id, lab_test_code, loinc_code, display_name, specimen_type, units, reference_range, collection_instructions, patient_prep_instructions)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    labcorpId,
                    test.lab_test_code,
                    test.loinc_code,
                    test.display_name,
                    test.specimen_type,
                    test.units,
                    test.reference_range,
                    test.collection_instructions,
                    test.patient_prep_instructions
                ]);
            }
        }
        
        console.log('✅ Sample lab integration data inserted successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Error inserting sample data:', error);
        throw error;
    }
}

module.exports = {
    createLabIntegrationTables,
    validateTablesCreated,
    insertSampleData
};