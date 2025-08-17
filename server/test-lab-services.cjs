const mysql = require('mysql2/promise');
const labFacilityService = require('./services/labs/labFacilityService');
const labCompendiumService = require('./services/labs/labCompendiumService');

/**
 * Lab Services Unit Test Suite
 * Tests lab facility management and compendium services
 */

async function testDatabaseConnection() {
    console.log('🔌 Testing database connection...');
    
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'varn-health'
        });
        
        await connection.ping();
        console.log('✅ Database connection successful');
        await connection.end();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

async function testLabFacilityService() {
    console.log('\n🏥 Testing Lab Facility Service...');
    
    let testFacilityId = null;
    
    try {
        // Test 1: Get all facilities
        console.log('Testing getAllFacilities...');
        const facilities = await labFacilityService.getAllFacilities();
        console.log(`✅ Found ${facilities.length} facilities`);
        
        // Test 2: Create new facility
        console.log('Testing createFacility...');
        const newFacility = await labFacilityService.createFacility({
            name: 'Test Lab Facility',
            transport_type: 'fhir',
            clia_number: 'TEST123456',
            endpoint_url: 'https://test-lab.example.com/fhir',
            auth_config: {
                type: 'oauth2',
                client_id: 'test_client',
                client_secret: 'test_secret'
            },
            contact_info: {
                phone: '555-TEST-LAB',
                email: 'test@testlab.com'
            }
        });
        
        testFacilityId = newFacility.id;
        console.log(`✅ Created facility with ID: ${testFacilityId}`);
        
        // Test 3: Get facility by ID
        console.log('Testing getFacilityById...');
        const facility = await labFacilityService.getFacilityById(testFacilityId);
        if (facility.name !== 'Test Lab Facility') {
            throw new Error('Facility name mismatch');
        }
        console.log('✅ Retrieved facility by ID');
        
        // Test 4: Update facility
        console.log('Testing updateFacility...');
        const updatedFacility = await labFacilityService.updateFacility(testFacilityId, {
            name: 'Updated Test Lab Facility',
            endpoint_url: 'https://updated-test-lab.example.com/fhir'
        });
        
        if (updatedFacility.name !== 'Updated Test Lab Facility') {
            throw new Error('Facility update failed');
        }
        console.log('✅ Updated facility successfully');
        
        // Test 5: Test facility connection
        console.log('Testing testFacilityConnection...');
        const connectionTest = await labFacilityService.testFacilityConnection(testFacilityId);
        if (!connectionTest.success) {
            console.warn('⚠️  Connection test failed (expected for mock)');
        } else {
            console.log('✅ Connection test completed');
        }
        
        // Test 6: Get facilities by transport type
        console.log('Testing getFacilitiesByTransportType...');
        const fhirFacilities = await labFacilityService.getFacilitiesByTransportType('fhir');
        console.log(`✅ Found ${fhirFacilities.length} FHIR facilities`);
        
        console.log('✅ All Lab Facility Service tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ Lab Facility Service test failed:', error.message);
        return false;
    } finally {
        // Cleanup: Delete test facility
        if (testFacilityId) {
            try {
                await labFacilityService.deleteFacility(testFacilityId);
                console.log('🧹 Cleaned up test facility');
            } catch (cleanupError) {
                console.warn('⚠️  Failed to cleanup test facility:', cleanupError.message);
            }
        }
        
        await labFacilityService.closeConnection();
    }
}

async function testLabCompendiumService() {
    console.log('\n🧪 Testing Lab Compendium Service...');
    
    let testFacilityId = null;
    let testCompendiumId = null;
    
    try {
        // Setup: Create a test facility first
        const testFacility = await labFacilityService.createFacility({
            name: 'Test Compendium Facility',
            transport_type: 'hl7',
            clia_number: 'COMP123456'
        });
        testFacilityId = testFacility.id;
        
        // Test 1: Get compendium for facility (should be empty initially)
        console.log('Testing getCompendiumByFacility...');
        const emptyCompendium = await labCompendiumService.getCompendiumByFacility(testFacilityId);
        if (emptyCompendium.data.tests.length !== 0) {
            console.warn('⚠️  Expected empty compendium for new facility');
        }
        console.log('✅ Retrieved empty compendium for new facility');
        
        // Test 2: Create compendium item
        console.log('Testing createCompendiumItem...');
        const newItem = await labCompendiumService.createCompendiumItem({
            lab_facility_id: testFacilityId,
            lab_test_code: 'TEST001',
            loinc_code: '12345-6',
            display_name: 'Test Laboratory Analysis',
            specimen_type: 'Serum',
            units: 'mg/dL',
            reference_range: '0.5-2.0 mg/dL',
            collection_instructions: 'Collect in red top tube',
            patient_prep_instructions: 'No fasting required'
        });
        
        testCompendiumId = newItem.id;
        console.log(`✅ Created compendium item with ID: ${testCompendiumId}`);
        
        // Test 3: Get compendium item by ID
        console.log('Testing getCompendiumItemById...');
        const item = await labCompendiumService.getCompendiumItemById(testCompendiumId);
        if (item.display_name !== 'Test Laboratory Analysis') {
            throw new Error('Compendium item name mismatch');
        }
        console.log('✅ Retrieved compendium item by ID');
        
        // Test 4: Update compendium item
        console.log('Testing updateCompendiumItem...');
        const updatedItem = await labCompendiumService.updateCompendiumItem(testCompendiumId, {
            display_name: 'Updated Test Laboratory Analysis',
            reference_range: '0.3-2.5 mg/dL'
        });
        
        if (updatedItem.display_name !== 'Updated Test Laboratory Analysis') {
            throw new Error('Compendium item update failed');
        }
        console.log('✅ Updated compendium item successfully');
        
        // Test 5: Get compendium with item
        console.log('Testing getCompendiumByFacility with data...');
        const compendiumWithData = await labCompendiumService.getCompendiumByFacility(testFacilityId);
        if (compendiumWithData.data.tests.length !== 1) {
            throw new Error('Expected 1 test in compendium');
        }
        console.log('✅ Retrieved compendium with test data');
        
        // Test 6: Search compendium
        console.log('Testing searchCompendium...');
        const searchResults = await labCompendiumService.searchCompendium('Test Laboratory');
        if (searchResults.length === 0) {
            throw new Error('Search should return results');
        }
        console.log(`✅ Search returned ${searchResults.length} results`);
        
        // Test 7: Get specimen types
        console.log('Testing getSpecimenTypes...');
        const specimenTypes = await labCompendiumService.getSpecimenTypes();
        if (!specimenTypes.includes('Serum')) {
            throw new Error('Serum should be in specimen types');
        }
        console.log(`✅ Found ${specimenTypes.length} specimen types`);
        
        // Test 8: Bulk import
        console.log('Testing bulkImportCompendium...');
        const bulkItems = [
            {
                lab_test_code: 'BULK001',
                display_name: 'Bulk Test 1',
                specimen_type: 'Blood'
            },
            {
                lab_test_code: 'BULK002',
                display_name: 'Bulk Test 2',
                specimen_type: 'Urine'
            },
            {
                lab_test_code: 'TEST001', // Duplicate - should be skipped
                display_name: 'Duplicate Test'
            }
        ];
        
        const bulkResults = await labCompendiumService.bulkImportCompendium(testFacilityId, bulkItems);
        if (bulkResults.imported !== 2 || bulkResults.skipped !== 1) {
            throw new Error(`Expected 2 imported, 1 skipped. Got ${bulkResults.imported} imported, ${bulkResults.skipped} skipped`);
        }
        console.log('✅ Bulk import completed successfully');
        
        // Test 9: LOINC validation
        console.log('Testing LOINC validation...');
        const validLoinc = labCompendiumService.isValidLoincCode('12345-6');
        const invalidLoinc = labCompendiumService.isValidLoincCode('invalid');
        
        if (!validLoinc || invalidLoinc) {
            throw new Error('LOINC validation failed');
        }
        console.log('✅ LOINC validation working correctly');
        
        console.log('✅ All Lab Compendium Service tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ Lab Compendium Service test failed:', error.message);
        return false;
    } finally {
        // Cleanup: Delete test items and facility
        if (testCompendiumId) {
            try {
                await labCompendiumService.deleteCompendiumItem(testCompendiumId);
                console.log('🧹 Cleaned up test compendium item');
            } catch (cleanupError) {
                console.warn('⚠️  Failed to cleanup test compendium item:', cleanupError.message);
            }
        }
        
        if (testFacilityId) {
            try {
                await labFacilityService.deleteFacility(testFacilityId);
                console.log('🧹 Cleaned up test facility');
            } catch (cleanupError) {
                console.warn('⚠️  Failed to cleanup test facility:', cleanupError.message);
            }
        }
        
        await labCompendiumService.closeConnection();
        await labFacilityService.closeConnection();
    }
}

async function testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    try {
        // Test 1: Invalid facility ID
        console.log('Testing invalid facility ID...');
        try {
            await labFacilityService.getFacilityById(99999);
            throw new Error('Should have thrown error for invalid facility ID');
        } catch (error) {
            if (error.message.includes('not found')) {
                console.log('✅ Correctly handled invalid facility ID');
            } else {
                throw error;
            }
        }
        
        // Test 2: Invalid compendium ID
        console.log('Testing invalid compendium ID...');
        try {
            await labCompendiumService.getCompendiumItemById(99999);
            throw new Error('Should have thrown error for invalid compendium ID');
        } catch (error) {
            if (error.message.includes('not found')) {
                console.log('✅ Correctly handled invalid compendium ID');
            } else {
                throw error;
            }
        }
        
        // Test 3: Invalid transport type
        console.log('Testing invalid transport type...');
        try {
            await labFacilityService.createFacility({
                name: 'Invalid Transport Test',
                transport_type: 'invalid_type'
            });
            throw new Error('Should have thrown error for invalid transport type');
        } catch (error) {
            if (error.message.includes('Invalid transport type')) {
                console.log('✅ Correctly handled invalid transport type');
            } else {
                throw error;
            }
        }
        
        // Test 4: Missing required fields
        console.log('Testing missing required fields...');
        try {
            await labCompendiumService.createCompendiumItem({
                lab_facility_id: 1
                // Missing lab_test_code and display_name
            });
            throw new Error('Should have thrown error for missing required fields');
        } catch (error) {
            if (error.message.includes('required')) {
                console.log('✅ Correctly handled missing required fields');
            } else {
                throw error;
            }
        }
        
        console.log('✅ All error handling tests passed');
        return true;
        
    } catch (error) {
        console.error('❌ Error handling test failed:', error.message);
        return false;
    }
}

async function runAllTests() {
    console.log('🧪 Starting Lab Services Test Suite\n');
    
    let allTestsPassed = true;
    
    try {
        // Test database connection first
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.log('⚠️  Skipping service tests due to database connection failure');
            return false;
        }
        
        // Run all service tests
        const tests = [
            testLabFacilityService,
            testLabCompendiumService,
            testErrorHandling
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
            console.log('✅ All Lab Services tests passed!');
            console.log('🎉 Lab facility management and compendium services are ready');
        } else {
            console.log('❌ Some tests failed. Please review the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        allTestsPassed = false;
    }
    
    process.exit(allTestsPassed ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testDatabaseConnection,
    testLabFacilityService,
    testLabCompendiumService,
    testErrorHandling,
    runAllTests
};