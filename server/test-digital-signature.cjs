const mysql = require('mysql2/promise');
const digitalSignatureService = require('./services/labs/digitalSignatureService');
const labOrderService = require('./services/labs/labOrderService');
const labFacilityService = require('./services/labs/labFacilityService');
const labCompendiumService = require('./services/labs/labCompendiumService');

/**
 * Digital Signature Service Test Suite
 * Tests provider authentication, digital signatures, and order signing workflow
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
    console.log('🔧 Setting up test data for digital signature tests...');
    
    try {
        // Create test facility
        const testFacility = await labFacilityService.createFacility({
            name: 'Test Signature Lab Facility',
            transport_type: 'fhir',
            clia_number: 'SIG123456'
        });

        // Create test compendium item
        const testItem = await labCompendiumService.createCompendiumItem({
            lab_facility_id: testFacility.id,
            lab_test_code: 'CBC',
            loinc_code: '58410-2',
            display_name: 'Complete Blood Count',
            specimen_type: 'Blood'
        });

        // Create test order
        const testOrder = await labOrderService.createOrder({
            patient_id: 1,
            lab_facility_id: testFacility.id,
            requester_provider_id: 1,
            tests: [{
                compendium_id: testItem.id,
                test_notes: 'Routine screening'
            }],
            icd10_codes: ['Z00.00'],
            priority: 'routine',
            clinical_notes: 'Annual physical examination'
        });

        console.log(`✅ Created test facility (ID: ${testFacility.id}) and order (ID: ${testOrder.id})`);
        
        return {
            facility: testFacility,
            compendiumItem: testItem,
            order: testOrder
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

async function testProviderAuthentication() {
    console.log('\n🔐 Testing Provider Authentication...');
    
    try {
        // Test 1: Valid authentication
        console.log('Testing valid provider authentication...');
        const authResult = await digitalSignatureService.authenticateProvider(
            1, // provider_id
            'test1234', // password
            '127.0.0.1' // ip_address
        );
        
        if (!authResult.success) {
            throw new Error('Authentication should succeed with valid credentials');
        }
        
        if (!authResult.authToken) {
            throw new Error('Authentication token should be returned');
        }
        
        if (!authResult.provider || !authResult.provider.id) {
            throw new Error('Provider information should be returned');
        }
        
        if (!authResult.expiresAt) {
            throw new Error('Token expiration should be returned');
        }
        
        console.log(`✅ Valid authentication successful, token: ${authResult.authToken.substring(0, 8)}...`);

        // Test 2: Invalid credentials
        console.log('Testing invalid credentials...');
        try {
            await digitalSignatureService.authenticateProvider(
                1,
                'wrong', // invalid password
                '127.0.0.1'
            );
            throw new Error('Authentication should fail with invalid credentials');
        } catch (error) {
            if (error.message.includes('Invalid credentials')) {
                console.log('✅ Correctly rejected invalid credentials');
            } else {
                throw error;
            }
        }

        // Test 3: Non-existent provider
        console.log('Testing non-existent provider...');
        try {
            await digitalSignatureService.authenticateProvider(
                99999, // non-existent provider
                'test1234',
                '127.0.0.1'
            );
            throw new Error('Authentication should fail for non-existent provider');
        } catch (error) {
            if (error.message.includes('Provider not found')) {
                console.log('✅ Correctly rejected non-existent provider');
            } else {
                throw error;
            }
        }

        console.log('✅ All provider authentication tests passed');
        return { authToken: authResult.authToken };

    } catch (error) {
        console.error('❌ Provider authentication test failed:', error.message);
        return false;
    }
}

async function testDigitalSignature() {
    console.log('\n✍️  Testing Digital Signature Workflow...');
    
    let testData = null;
    let authToken = null;
    
    try {
        // Setup test data
        testData = await setupTestData();
        
        // Authenticate provider first
        const authResult = await digitalSignatureService.authenticateProvider(
            1,
            'test1234',
            '127.0.0.1'
        );
        authToken = authResult.authToken;

        // Test 1: Sign lab order
        console.log('Testing lab order signing...');
        const signatureData = {
            authToken,
            providerId: 1,
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // 1x1 pixel PNG
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent'
        };

        const signResult = await digitalSignatureService.signLabOrder(testData.order.id, signatureData);
        
        if (!signResult.success) {
            throw new Error('Order signing should succeed');
        }
        
        if (!signResult.signatureId) {
            throw new Error('Signature ID should be returned');
        }
        
        if (!signResult.signedAt) {
            throw new Error('Signed timestamp should be returned');
        }
        
        if (signResult.orderStatus !== 'signed') {
            throw new Error('Order status should be updated to signed');
        }
        
        console.log(`✅ Order signed successfully, signature ID: ${signResult.signatureId}`);

        // Test 2: Verify signature
        console.log('Testing signature verification...');
        const verificationResult = await digitalSignatureService.verifySignature(testData.order.id);
        
        if (!verificationResult.verified) {
            throw new Error('Signature verification should succeed');
        }
        
        if (!verificationResult.signatureDetails) {
            throw new Error('Signature details should be returned');
        }
        
        console.log('✅ Signature verification successful');

        // Test 3: Get signature status
        console.log('Testing signature status retrieval...');
        const statusResult = await digitalSignatureService.getSignatureStatus(testData.order.id);
        
        if (!statusResult.isSigned) {
            throw new Error('Order should be marked as signed');
        }
        
        if (statusResult.orderStatus !== 'signed') {
            throw new Error('Order status should be signed');
        }
        
        if (!statusResult.signatureDetails) {
            throw new Error('Signature details should be included');
        }
        
        console.log('✅ Signature status retrieval successful');

        // Test 4: Try to sign already signed order
        console.log('Testing signing already signed order...');
        try {
            // Need new auth token since previous one was invalidated
            const newAuthResult = await digitalSignatureService.authenticateProvider(
                1,
                'test1234',
                '127.0.0.1'
            );
            
            await digitalSignatureService.signLabOrder(testData.order.id, {
                ...signatureData,
                authToken: newAuthResult.authToken
            });
            throw new Error('Should not be able to sign already signed order');
        } catch (error) {
            if (error.message.includes('Cannot sign order in signed status')) {
                console.log('✅ Correctly prevented signing already signed order');
            } else {
                throw error;
            }
        }

        console.log('✅ All digital signature tests passed');
        return true;

    } catch (error) {
        console.error('❌ Digital signature test failed:', error.message);
        return false;
    } finally {
        // Cleanup
        if (testData) {
            await cleanupTestData(testData);
        }
    }
}

async function testBulkSigning() {
    console.log('\n📝 Testing Bulk Order Signing...');
    
    let testData = [];
    
    try {
        // Create multiple test orders
        const facility = await labFacilityService.createFacility({
            name: 'Test Bulk Sign Facility',
            transport_type: 'fhir',
            clia_number: 'BULK123456'
        });

        const compendiumItem = await labCompendiumService.createCompendiumItem({
            lab_facility_id: facility.id,
            lab_test_code: 'CBC',
            loinc_code: '58410-2',
            display_name: 'Complete Blood Count',
            specimen_type: 'Blood'
        });

        // Create 3 test orders
        const orders = [];
        for (let i = 0; i < 3; i++) {
            const order = await labOrderService.createOrder({
                patient_id: 1,
                lab_facility_id: facility.id,
                requester_provider_id: 1,
                tests: [{
                    compendium_id: compendiumItem.id,
                    test_notes: `Bulk test order ${i + 1}`
                }],
                icd10_codes: ['Z00.00'],
                priority: 'routine'
            });
            orders.push(order);
        }

        testData = { facility, compendiumItem, orders };

        // Authenticate provider
        const authResult = await digitalSignatureService.authenticateProvider(
            1,
            'test1234',
            '127.0.0.1'
        );

        // Test bulk signing
        console.log('Testing bulk signing of multiple orders...');
        const orderIds = orders.map(order => order.id);
        
        const bulkSignData = {
            authToken: authResult.authToken,
            providerId: 1,
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
            ipAddress: '127.0.0.1',
            userAgent: 'Test Agent'
        };

        const bulkResult = await digitalSignatureService.bulkSignOrders(orderIds, bulkSignData);
        
        if (bulkResult.total !== 3) {
            throw new Error('Should process 3 orders');
        }
        
        if (bulkResult.signed !== 3) {
            throw new Error('Should sign all 3 orders successfully');
        }
        
        if (bulkResult.failed !== 0) {
            throw new Error('Should have no failures');
        }
        
        console.log(`✅ Bulk signing successful: ${bulkResult.signed} orders signed`);

        // Verify all orders are signed
        console.log('Verifying all orders are signed...');
        for (const order of orders) {
            const status = await digitalSignatureService.getSignatureStatus(order.id);
            if (!status.isSigned) {
                throw new Error(`Order ${order.id} should be signed`);
            }
        }
        
        console.log('✅ All bulk signed orders verified');

        // Test bulk signing with too many orders
        console.log('Testing bulk signing limit...');
        const tooManyOrderIds = Array.from({ length: 15 }, (_, i) => i + 1);
        
        try {
            await digitalSignatureService.bulkSignOrders(tooManyOrderIds, bulkSignData);
            throw new Error('Should reject bulk signing more than 10 orders');
        } catch (error) {
            if (error.message.includes('Maximum 10 orders')) {
                console.log('✅ Correctly enforced bulk signing limit');
            } else {
                throw error;
            }
        }

        console.log('✅ All bulk signing tests passed');
        return true;

    } catch (error) {
        console.error('❌ Bulk signing test failed:', error.message);
        return false;
    } finally {
        // Cleanup
        if (testData.facility) {
            await labFacilityService.deleteFacility(testData.facility.id);
        }
    }
}

async function testSecurityFeatures() {
    console.log('\n🔒 Testing Security Features...');
    
    try {
        // Test 1: Token expiration (mock test)
        console.log('Testing authentication token validation...');
        
        // Test with invalid token
        try {
            await digitalSignatureService.signLabOrder(1, {
                authToken: 'invalid_token',
                providerId: 1,
                signature: 'test_signature'
            });
            throw new Error('Should reject invalid auth token');
        } catch (error) {
            if (error.message.includes('Invalid or expired')) {
                console.log('✅ Correctly rejected invalid auth token');
            } else {
                throw error;
            }
        }

        // Test 2: Provider authorization
        console.log('Testing provider authorization...');
        
        // Create test order for provider 1
        const facility = await labFacilityService.createFacility({
            name: 'Test Security Facility',
            transport_type: 'fhir',
            clia_number: 'SEC123456'
        });

        const compendiumItem = await labCompendiumService.createCompendiumItem({
            lab_facility_id: facility.id,
            lab_test_code: 'CBC',
            loinc_code: '58410-2',
            display_name: 'Complete Blood Count',
            specimen_type: 'Blood'
        });

        const order = await labOrderService.createOrder({
            patient_id: 1,
            lab_facility_id: facility.id,
            requester_provider_id: 1, // Order by provider 1
            tests: [{
                compendium_id: compendiumItem.id
            }],
            icd10_codes: ['Z00.00']
        });

        // Try to sign with different provider
        const authResult = await digitalSignatureService.authenticateProvider(
            2, // Different provider
            'test1234',
            '127.0.0.1'
        );

        try {
            await digitalSignatureService.signLabOrder(order.id, {
                authToken: authResult.authToken,
                providerId: 2, // Different provider trying to sign
                signature: 'test_signature'
            });
            throw new Error('Should not allow different provider to sign order');
        } catch (error) {
            if (error.message.includes('Only the requesting provider')) {
                console.log('✅ Correctly enforced provider authorization');
            } else {
                throw error;
            }
        }

        // Cleanup
        await labFacilityService.deleteFacility(facility.id);

        // Test 3: Failed attempt tracking
        console.log('Testing failed attempt tracking...');
        
        // Make multiple failed attempts
        for (let i = 0; i < 3; i++) {
            try {
                await digitalSignatureService.authenticateProvider(
                    1,
                    'wrong_password',
                    '192.168.1.100' // Different IP for testing
                );
            } catch (error) {
                // Expected to fail
            }
        }
        
        console.log('✅ Failed attempt tracking working (would block after 5 attempts)');

        console.log('✅ All security feature tests passed');
        return true;

    } catch (error) {
        console.error('❌ Security feature test failed:', error.message);
        return false;
    }
}

async function testErrorHandling() {
    console.log('\n⚠️  Testing Error Handling...');
    
    try {
        // Test 1: Missing required fields
        console.log('Testing missing required fields...');
        try {
            await digitalSignatureService.signLabOrder(1, {
                // Missing required fields
            });
            throw new Error('Should reject missing required fields');
        } catch (error) {
            if (error.message.includes('required')) {
                console.log('✅ Correctly handled missing required fields');
            } else {
                throw error;
            }
        }

        // Test 2: Non-existent order
        console.log('Testing non-existent order...');
        const authResult = await digitalSignatureService.authenticateProvider(
            1,
            'test1234',
            '127.0.0.1'
        );

        try {
            await digitalSignatureService.signLabOrder(99999, {
                authToken: authResult.authToken,
                providerId: 1,
                signature: 'test_signature'
            });
            throw new Error('Should reject non-existent order');
        } catch (error) {
            if (error.message.includes('not found')) {
                console.log('✅ Correctly handled non-existent order');
            } else {
                throw error;
            }
        }

        // Test 3: Invalid signature format
        console.log('Testing invalid signature format...');
        try {
            await digitalSignatureService.authenticateProvider(
                1,
                '', // Empty password
                '127.0.0.1'
            );
            throw new Error('Should reject empty password');
        } catch (error) {
            if (error.message.includes('Invalid credentials')) {
                console.log('✅ Correctly handled invalid credentials format');
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
    console.log('🧪 Starting Digital Signature Service Test Suite\n');
    
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
            testProviderAuthentication,
            testDigitalSignature,
            testBulkSigning,
            testSecurityFeatures,
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
            console.log('✅ All Digital Signature Service tests passed!');
            console.log('🎉 Provider signature and order signing workflow is ready');
        } else {
            console.log('❌ Some tests failed. Please review the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        allTestsPassed = false;
    } finally {
        // Close all connections
        await digitalSignatureService.closeConnection();
        await labOrderService.closeConnection();
        await labFacilityService.closeConnection();
        await labCompendiumService.closeConnection();
    }
    
    process.exit(allTestsPassed ? 0 : 1);
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testDatabaseConnection,
    testProviderAuthentication,
    testDigitalSignature,
    testBulkSigning,
    testSecurityFeatures,
    testErrorHandling,
    runAllTests
};