const mysql = require('mysql2/promise');
const labOrderService = require('./services/labs/labOrderService');
const abnService = require('./services/labs/abnService');
const labFacilityService = require('./services/labs/labFacilityService');
const labCompendiumService = require('./services/labs/labCompendiumService');

/**
 * Lab Order and ABN Services Test Suite
 * Tests lab order creation, management, and ABN functionality
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

async function setupTestData() {
    console.log('🔧 Setting up test data...');
    
    try {
        // Create test facility
        const testFacility = await labFacilityService.createFacility({
            name: 'Test Order Lab Facility',
            transport_type: 'fhir',
            clia_number: 'ORDER123456'
        });

        // Create test compendium items
        const testItems = [
            {
                lab_facility_id: testFacility.id,
                lab_test_code: 'CBC',
                loinc_code: '58410-2',
                display_name: 'Complete Blood Count',
                specimen_type: 'Blood'
            },
            {
                lab_facility_id: testFacility.id,
                lab_test_code: 'HBA1C',
                loinc_code: '33747-0',
                display_name: 'Hemoglobin A1c',
                specimen_type: 'Blood'
            }
        ];

        const compendiumItems = [];
        for (const item of testItems) {
            const created = await labCompendiumService.createCompendiumItem(item);
            compendiumItems.push(created);
        }

        console.log(`✅ Created test facility (ID: ${testFacility.id}) and ${compendiumItems.length} test items`);
        
        return {
            facility: testFacility,
            compendiumItems
        };

    } catch (error) {
        console.error('❌ Error setting up test data:', error);
        throw error;
    }
}

async function cleanupTestData(testData) {
    console.log('🧹 Cleaning up test data...');
    
    try {
        if (testData.facility) {
            await labFacilityService.deleteFacility(testData.facility.id);
            console.log('✅ Cleaned up test facility');
        }
    } catch (error) {
        console.warn('⚠️  Failed to cleanup test data:', error.message);
    }
}

async function testLabOrderService() {
    console.log('\n📋 Testing Lab Order Service...');
    
    let testData = null;
    let testOrderId = null;
    
    try {
        // Setup test data
        testData = await setupTestData();
        
        // Test 1: Create lab order
        console.log('Testing createOrder...');
        const orderData = {
            patient_id: 1, // Assuming patient ID 1 exists
            lab_facility_id: testData.facility.id,
            requester_provider_id: 1, // Assuming provider ID 1 exists
            tests: [
                {
                    compendium_id: testData.compendiumItems[0].id,
                    test_notes: 'Routine annual screening'
                },
                {
                    compendium_id: testData.compendiumItems[1].id
                }
            ],
            icd10_codes: [
                'Z00.00', // General examination
                {
                    code: 'E11.9',
                    description: 'Type 2 diabetes mellitus without complications'
                }
            ],
            priority: 'routine',
            clinical_notes: 'Annual physical examination',
            created_by: 1
        };

        const createdOrder = await labOrderService.createOrder(orderData);
        testOrderId = createdOrder.id;
        
        if (!createdOrder.order_number.startsWith('LAB-')) {
            throw new Error('Order number format incorrect');
        }
        
        if (createdOrder.status !== 'draft') {
            throw new Error('Initial order status should be draft');
        }
        
        if (createdOrder.tests.length !== 2) {
            throw new Error('Order should have 2 tests');
        }
        
        console.log(`✅ Created order with ID: ${testOrderId}`);

        // Test 2: Get order by ID
        console.log('Testing getOrderById...');
        const retrievedOrder = await labOrderService.getOrderById(testOrderId);
        
        if (retrievedOrder.id !== testOrderId) {
            throw new Error('Retrieved order ID mismatch');
        }
        
        if (retrievedOrder.icd10_codes.length !== 2) {
            throw new Error('ICD-10 codes not properly stored');
        }
        
        console.log('✅ Retrieved order by ID');

        // Test 3: Update order
        console.log('Testing updateOrder...');
        const updatedOrder = await labOrderService.updateOrder(testOrderId, {
            priority: 'urgent',
            clinical_notes: 'Updated: Urgent due to symptoms',
            updated_by: 1
        });
        
        if (updatedOrder.priority !== 'urgent') {
            throw new Error('Order priority not updated');
        }
        
        console.log('✅ Updated order successfully');

        // Test 4: Update order status
        console.log('Testing updateOrderStatus...');
        const signedOrder = await labOrderService.updateOrderStatus(testOrderId, 'signed', {
            updated_by: 1
        });
        
        if (signedOrder.status !== 'signed') {
            throw new Error('Order status not updated');
        }
        
        console.log('✅ Updated order status to signed');

        // Test 5: Get order timeline
        console.log('Testing getOrderTimeline...');
        const timeline = await labOrderService.getOrderTimeline(testOrderId);
        
        if (timeline.length === 0) {
            throw new Error('Order timeline should have events');
        }
        
        const hasCreatedEvent = timeline.some(event => event.event_type === 'order_created');
        const hasSignedEvent = timeline.some(event => event.event_type === 'order_signed');
        
        if (!hasCreatedEvent || !hasSignedEvent) {
            throw new Error('Timeline missing expected events');
        }
        
        console.log(`✅ Retrieved order timeline with ${timeline.length} events`);

        // Test 6: Get orders by patient
        console.log('Testing getOrdersByPatient...');
        const patientOrders = await labOrderService.getOrdersByPatient(1);
        
        if (patientOrders.length === 0) {
            throw new Error('Should find at least one order for patient');
        }
        
        const foundOrder = patientOrders.find(order => order.id === testOrderId);
        if (!foundOrder) {
            throw new Error('Created order not found in patient orders');
        }
        
        console.log(`✅ Found ${patientOrders.length} orders for patient`);

        // Test 7: Get orders by provider
        console.log('Testing getOrdersByProvider...');
        const providerOrders = await labOrderService.getOrdersByProvider(1);
        
        const foundProviderOrder = providerOrders.find(order => order.id === testOrderId);
        if (!foundProviderOrder) {
            throw new Error('Created order not found in provider orders');
        }
        
        console.log(`✅ Found ${providerOrders.length} orders for provider`);

        // Test 8: Cancel order
        console.log('Testing cancelOrder...');
        const canceledOrder = await labOrderService.cancelOrder(testOrderId, 'Test cancellation', 1);
        
        if (canceledOrder.status !== 'canceled') {
            throw new Error('Order not properly canceled');
        }
        
        console.log('✅ Canceled order successfully');

        console.log('✅ All Lab Order Service tests passed');
        return true;

    } catch (error) {
        console.error('❌ Lab Order Service test failed:', error.message);
        return false;
    } finally {
        // Cleanup
        if (testData) {
            await cleanupTestData(testData);
        }
        await labOrderService.closeConnection();
    }
}

async function testABNService() {
    console.log('\n📝 Testing ABN Service...');
    
    let testData = null;
    let testOrderId = null;
    
    try {
        // Setup test data
        testData = await setupTestData();
        
        // Create a test order first
        const orderData = {
            patient_id: 1,
            lab_facility_id: testData.facility.id,
            requester_provider_id: 1,
            tests: [
                {
                    compendium_id: testData.compendiumItems[0].id
                }
            ],
            icd10_codes: ['Z00.00']
        };

        const createdOrder = await labOrderService.createOrder(orderData);
        testOrderId = createdOrder.id;

        // Test 1: Check ABN requirement
        console.log('Testing checkABNRequirement...');
        const abnRequirement = await abnService.checkABNRequirement(
            1, // patient_id
            createdOrder.tests,
            testData.facility.id
        );
        
        if (typeof abnRequirement.abnRequired !== 'boolean') {
            throw new Error('ABN requirement should return boolean');
        }
        
        if (!Array.isArray(abnRequirement.testRequirements)) {
            throw new Error('Test requirements should be an array');
        }
        
        console.log(`✅ ABN requirement check completed (required: ${abnRequirement.abnRequired})`);

        // Test 2: Generate ABN form
        console.log('Testing generateABNForm...');
        const abnForm = await abnService.generateABNForm(testOrderId, abnRequirement);
        
        if (!abnForm.formId || !abnForm.orderNumber) {
            throw new Error('ABN form missing required fields');
        }
        
        if (!abnForm.patientInfo || !abnForm.facilityInfo) {
            throw new Error('ABN form missing patient or facility info');
        }
        
        if (!Array.isArray(abnForm.tests) || abnForm.tests.length === 0) {
            throw new Error('ABN form should include tests');
        }
        
        console.log(`✅ Generated ABN form with ID: ${abnForm.formId}`);

        // Test 3: Get ABN status (before signing)
        console.log('Testing getABNStatus (before signing)...');
        const abnStatusBefore = await abnService.getABNStatus(testOrderId);
        
        if (abnStatusBefore.abnSigned !== false) {
            throw new Error('ABN should not be signed initially');
        }
        
        console.log('✅ Retrieved ABN status (not signed)');

        // Test 4: Process ABN signature
        console.log('Testing processABNSignature...');
        const signatureData = {
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
            selectedOption: 'A',
            patientName: 'Test Patient',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent'
        };

        const signatureResult = await abnService.processABNSignature(testOrderId, signatureData);
        
        if (!signatureResult.success) {
            throw new Error('ABN signature processing failed');
        }
        
        if (!signatureResult.signaturePath) {
            throw new Error('Signature path not returned');
        }
        
        console.log('✅ Processed ABN signature successfully');

        // Test 5: Get ABN status (after signing)
        console.log('Testing getABNStatus (after signing)...');
        const abnStatusAfter = await abnService.getABNStatus(testOrderId);
        
        if (abnStatusAfter.abnSigned !== true) {
            throw new Error('ABN should be signed after processing');
        }
        
        if (!abnStatusAfter.signaturePath) {
            throw new Error('Signature path should be stored');
        }
        
        console.log('✅ Retrieved ABN status (signed)');

        // Test 6: Validate ABN compliance
        console.log('Testing validateABNCompliance...');
        const compliance = await abnService.validateABNCompliance(testOrderId);
        
        if (typeof compliance.isCompliant !== 'boolean') {
            throw new Error('Compliance status should be boolean');
        }
        
        if (!Array.isArray(compliance.issues)) {
            throw new Error('Compliance issues should be an array');
        }
        
        console.log(`✅ ABN compliance validated (compliant: ${compliance.isCompliant})`);

        console.log('✅ All ABN Service tests passed');
        return true;

    } catch (error) {
        console.error('❌ ABN Service test failed:', error.message);
        return false;
    } finally {
        // Cleanup
        if (testData) {
            await cleanupTestData(testData);
        }
        await abnService.closeConnection();
        await labOrderService.closeConnection();
    }
}

async function testValidationLogic() {
    console.log('\n🔍 Testing Validation Logic...');
    
    try {
        // Test 1: Invalid ICD-10 format
        console.log('Testing ICD-10 validation...');
        try {
            await labOrderService.createOrder({
                patient_id: 1,
                lab_facility_id: 1,
                requester_provider_id: 1,
                tests: [{ compendium_id: 1 }],
                icd10_codes: ['INVALID_CODE']
            });
            throw new Error('Should have rejected invalid ICD-10 code');
        } catch (error) {
            if (error.message.includes('Invalid ICD-10 code format')) {
                console.log('✅ Correctly rejected invalid ICD-10 code');
            } else {
                throw error;
            }
        }

        // Test 2: Invalid priority
        console.log('Testing priority validation...');
        try {
            await labOrderService.createOrder({
                patient_id: 1,
                lab_facility_id: 1,
                requester_provider_id: 1,
                tests: [{ compendium_id: 1 }],
                priority: 'invalid_priority'
            });
            throw new Error('Should have rejected invalid priority');
        } catch (error) {
            if (error.message.includes('Invalid priority')) {
                console.log('✅ Correctly rejected invalid priority');
            } else {
                throw error;
            }
        }

        // Test 3: Invalid status transition
        console.log('Testing status transition validation...');
        const isValidTransition = labOrderService.isValidStatusTransition('final', 'draft');
        if (isValidTransition) {
            throw new Error('Should not allow transition from final to draft');
        }
        console.log('✅ Correctly rejected invalid status transition');

        // Test 4: Missing required fields
        console.log('Testing required field validation...');
        try {
            await labOrderService.createOrder({
                patient_id: 1
                // Missing required fields
            });
            throw new Error('Should have rejected missing required fields');
        } catch (error) {
            if (error.message.includes('required')) {
                console.log('✅ Correctly rejected missing required fields');
            } else {
                throw error;
            }
        }

        console.log('✅ All validation logic tests passed');
        return true;

    } catch (error) {
        console.error('❌ Validation logic test failed:', error.message);
        return false;
    }
}

async function testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    try {
        // Test 1: Non-existent order ID
        console.log('Testing non-existent order ID...');
        try {
            await labOrderService.getOrderById(99999);
            throw new Error('Should have thrown error for non-existent order');
        } catch (error) {
            if (error.message.includes('not found')) {
                console.log('✅ Correctly handled non-existent order ID');
            } else {
                throw error;
            }
        }

        // Test 2: Non-existent facility ID
        console.log('Testing non-existent facility ID...');
        try {
            await labOrderService.createOrder({
                patient_id: 1,
                lab_facility_id: 99999,
                requester_provider_id: 1,
                tests: [{ compendium_id: 1 }]
            });
            throw new Error('Should have thrown error for non-existent facility');
        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('inactive')) {
                console.log('✅ Correctly handled non-existent facility ID');
            } else {
                throw error;
            }
        }

        // Test 3: Invalid ABN signature data
        console.log('Testing invalid ABN signature data...');
        try {
            await abnService.processABNSignature(1, {
                // Missing required fields
            });
            throw new Error('Should have thrown error for invalid signature data');
        } catch (error) {
            if (error.message.includes('required')) {
                console.log('✅ Correctly handled invalid ABN signature data');
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
    console.log('🧪 Starting Lab Order and ABN Services Test Suite\n');
    
    let allTestsPassed = true;
    
    try {
        // Test database connection first
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            console.log('⚠️  Skipping service tests due to database connection failure');
            return false;
        }
        
        // Run all tests
        const tests = [
            testLabOrderService,
            testABNService,
            testValidationLogic,
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
            console.log('✅ All Lab Order and ABN Services tests passed!');
            console.log('🎉 Lab order creation and management functionality is ready');
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
    testLabOrderService,
    testABNService,
    testValidationLogic,
    testErrorHandling,
    runAllTests
};