const mysql = require('mysql2/promise');
const { createLabIntegrationTables, validateTablesCreated, insertSampleData } = require('./migrations/002_create_lab_integration_tables.js');
const { labEncryption } = require('./utils/labEncryption.js');

/**
 * Lab Integration Database and Encryption Test Suite
 * Tests database schema creation, data integrity, and encryption functionality
 */

async function testDatabaseConnection() {
    console.log('🔌 Testing database connection...');
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ovhi_test'
    });
    
    console.log('✅ Database connection established');
    return connection;
}

async function testSchemaCreation(connection) {
    console.log('\n📋 Testing Lab Integration Schema Creation...');
    
    try {
        // Create tables
        await createLabIntegrationTables(connection);
        
        // Validate tables were created
        await validateTablesCreated(connection);
        
        // Insert sample data
        await insertSampleData(connection);
        
        console.log('✅ Schema creation test passed');
        return true;
    } catch (error) {
        console.error('❌ Schema creation test failed:', error);
        return false;
    }
}

async function testDataIntegrity(connection) {
    console.log('\n🔍 Testing Data Integrity and Constraints...');
    
    try {
        // Test foreign key constraints
        console.log('Testing foreign key constraints...');
        
        // This should fail due to foreign key constraint
        try {
            await connection.execute(`
                INSERT INTO lab_compendium (lab_facility_id, lab_test_code, display_name) 
                VALUES (99999, 'TEST', 'Non-existent facility test')
            `);
            console.error('❌ Foreign key constraint test failed - insert should have been rejected');
            return false;
        } catch (error) {
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                console.log('✅ Foreign key constraint working correctly');
            } else {
                throw error;
            }
        }
        
        // Test unique constraints
        console.log('Testing unique constraints...');
        
        // Get a facility ID
        const [facilities] = await connection.execute('SELECT id FROM lab_facilities LIMIT 1');
        if (facilities.length === 0) {
            throw new Error('No lab facilities found for testing');
        }
        
        const facilityId = facilities[0].id;
        
        // Try to insert duplicate lab test code for same facility
        try {
            await connection.execute(`
                INSERT INTO lab_compendium (lab_facility_id, lab_test_code, display_name) 
                VALUES (?, 'CBC', 'Duplicate CBC Test')
            `, [facilityId]);
            
            await connection.execute(`
                INSERT INTO lab_compendium (lab_facility_id, lab_test_code, display_name) 
                VALUES (?, 'CBC', 'Another Duplicate CBC Test')
            `, [facilityId]);
            
            console.error('❌ Unique constraint test failed - duplicate insert should have been rejected');
            return false;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                console.log('✅ Unique constraint working correctly');
            } else {
                throw error;
            }
        }
        
        // Test enum constraints
        console.log('Testing enum constraints...');
        
        try {
            await connection.execute(`
                INSERT INTO lab_facilities (name, transport_type) 
                VALUES ('Invalid Transport Test', 'invalid_transport')
            `);
            console.error('❌ Enum constraint test failed - invalid enum should have been rejected');
            return false;
        } catch (error) {
            if (error.code === 'ER_DATA_TOO_LONG' || error.message.includes('enum')) {
                console.log('✅ Enum constraint working correctly');
            } else {
                throw error;
            }
        }
        
        console.log('✅ Data integrity tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ Data integrity test failed:', error);
        return false;
    }
}

async function testEncryptionFunctionality() {
    console.log('\n🔐 Testing Lab Encryption Functionality...');
    
    try {
        // Test basic encryption/decryption
        console.log('Testing basic encryption/decryption...');
        
        const testData = {
            resourceType: 'DiagnosticReport',
            status: 'final',
            subject: { reference: 'Patient/123' },
            result: [
                {
                    resourceType: 'Observation',
                    code: { coding: [{ system: 'http://loinc.org', code: '33747-0' }] },
                    valueQuantity: { value: 7.2, unit: '%' }
                }
            ]
        };
        
        const encrypted = labEncryption.encrypt(testData);
        const decrypted = JSON.parse(labEncryption.decrypt(encrypted));
        
        if (JSON.stringify(testData) !== JSON.stringify(decrypted)) {
            throw new Error('Encryption/decryption mismatch');
        }
        
        console.log('✅ Basic encryption/decryption working');
        
        // Test lab payload encryption with metadata
        console.log('Testing lab payload encryption...');
        
        const encryptedPayload = labEncryption.encryptLabPayload(testData);
        const decryptedPayload = labEncryption.decryptLabPayload(encryptedPayload);
        
        if (JSON.stringify(testData) !== JSON.stringify(decryptedPayload)) {
            throw new Error('Lab payload encryption/decryption mismatch');
        }
        
        console.log('✅ Lab payload encryption working');
        
        // Test PHI redaction
        console.log('Testing PHI redaction...');
        
        const phiData = {
            patient: {
                name: 'John Doe',
                ssn: '123-45-6789',
                phone: '555-123-4567',
                email: 'john.doe@example.com',
                address: '123 Main St'
            },
            result: {
                value: 7.2,
                unit: '%'
            }
        };
        
        const redactedData = labEncryption.redactPHI(phiData);
        
        if (redactedData.patient.name !== '[REDACTED]' || 
            redactedData.patient.ssn !== '[REDACTED]' ||
            redactedData.result.value !== 7.2) {
            throw new Error('PHI redaction not working correctly');
        }
        
        console.log('✅ PHI redaction working');
        
        // Test order number generation
        console.log('Testing order number generation...');
        
        const orderNumber1 = labEncryption.generateOrderNumber();
        const orderNumber2 = labEncryption.generateOrderNumber();
        
        if (!orderNumber1.startsWith('LAB-') || orderNumber1 === orderNumber2) {
            throw new Error('Order number generation not working correctly');
        }
        
        console.log('✅ Order number generation working');
        
        // Test configuration validation
        console.log('Testing encryption configuration validation...');
        
        const isValid = labEncryption.validateConfiguration();
        if (!isValid) {
            throw new Error('Encryption configuration validation failed');
        }
        
        console.log('✅ Encryption configuration validation working');
        
        console.log('✅ All encryption tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ Encryption test failed:', error);
        return false;
    }
}

async function testIndexPerformance(connection) {
    console.log('\n⚡ Testing Index Performance...');
    
    try {
        // Test query performance with indexes
        const queries = [
            {
                name: 'Patient orders lookup',
                query: 'SELECT * FROM lab_orders WHERE patient_id = ? ORDER BY created_at DESC',
                params: [1]
            },
            {
                name: 'Order status filtering',
                query: 'SELECT * FROM lab_orders WHERE status = ? AND created_at >= ?',
                params: ['draft', new Date(Date.now() - 24 * 60 * 60 * 1000)]
            },
            {
                name: 'LOINC code lookup',
                query: 'SELECT * FROM lab_compendium WHERE loinc_code = ?',
                params: ['33747-0']
            },
            {
                name: 'Critical results monitoring',
                query: 'SELECT * FROM lab_observations WHERE abnormal_flag IN (?, ?) AND created_at >= ?',
                params: ['critical_high', 'critical_low', new Date(Date.now() - 60 * 60 * 1000)]
            }
        ];
        
        for (const queryTest of queries) {
            const startTime = Date.now();
            await connection.execute(queryTest.query, queryTest.params);
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`✅ ${queryTest.name}: ${duration}ms`);
            
            if (duration > 1000) {
                console.warn(`⚠️  Query took longer than expected: ${duration}ms`);
            }
        }
        
        console.log('✅ Index performance tests completed');
        return true;
        
    } catch (error) {
        console.error('❌ Index performance test failed:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('🧪 Starting Lab Integration Database Tests\n');
    
    let connection;
    let allTestsPassed = true;
    
    try {
        // Connect to database
        connection = await testDatabaseConnection();
        
        // Run all tests
        const tests = [
            () => testSchemaCreation(connection),
            () => testDataIntegrity(connection),
            () => testEncryptionFunctionality(),
            () => testIndexPerformance(connection)
        ];
        
        for (const test of tests) {
            const result = await test();
            if (!result) {
                allTestsPassed = false;
            }
        }
        
        // Summary
        console.log('\n📊 Test Summary:');
        if (allTestsPassed) {
            console.log('✅ All Lab Integration tests passed!');
            console.log('🎉 Database schema and encryption utilities are ready for production');
        } else {
            console.log('❌ Some tests failed. Please review the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        allTestsPassed = false;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
    
    process.exit(allTestsPassed ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testDatabaseConnection,
    testSchemaCreation,
    testDataIntegrity,
    testEncryptionFunctionality,
    testIndexPerformance,
    runAllTests
};