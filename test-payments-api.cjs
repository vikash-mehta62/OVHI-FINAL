const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

// Mock token - you'll need to get a real token from login
const mockToken = 'your-jwt-token-here';

async function testPaymentsAPI() {
    console.log('🧪 Testing Payments API...\n');

    try {
        // Test 1: Get all payments
        console.log('1️⃣ Testing GET /billings/payments');
        try {
            const response = await axios.get(`${API_BASE_URL}/billings/payments`, {
                headers: {
                    'Authorization': `Bearer ${mockToken}`
                }
            });
            console.log('✅ GET payments successful');
            console.log(`   Found ${response.data.data.length} payments`);
        } catch (error) {
            console.log('❌ GET payments failed:', error.response?.data?.message || error.message);
        }

        // Test 2: Get all bills
        console.log('\n2️⃣ Testing GET /billings/get-all-bills');
        try {
            const response = await axios.get(`${API_BASE_URL}/billings/get-all-bills`, {
                headers: {
                    'Authorization': `Bearer ${mockToken}`
                }
            });
            console.log('✅ GET bills successful');
            console.log(`   Found ${response.data.data.length} bills`);
            
            if (response.data.data.length > 0) {
                const firstBill = response.data.data[0];
                console.log(`   First bill: #${firstBill.id} - ${firstBill.patient_name} - $${firstBill.total_amount}`);
                
                // Test 3: Create a payment for the first bill
                console.log('\n3️⃣ Testing POST /billings/payments/create');
                try {
                    const paymentData = {
                        bill_id: firstBill.id,
                        payment_method: 'card',
                        transaction_id: 'test_txn_' + Date.now(),
                        amount: 50.00,
                        notes: 'Test payment from API test'
                    };
                    
                    const paymentResponse = await axios.post(`${API_BASE_URL}/billings/payments/create`, paymentData, {
                        headers: {
                            'Authorization': `Bearer ${mockToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('✅ CREATE payment successful');
                    console.log(`   Payment ID: ${paymentResponse.data.data.id}`);
                    console.log(`   Amount: $${paymentResponse.data.data.amount}`);
                } catch (error) {
                    console.log('❌ CREATE payment failed:', error.response?.data?.message || error.message);
                }
            }
        } catch (error) {
            console.log('❌ GET bills failed:', error.response?.data?.message || error.message);
        }

        // Test 4: Test without authentication (should fail)
        console.log('\n4️⃣ Testing authentication requirement');
        try {
            await axios.get(`${API_BASE_URL}/billings/payments`);
            console.log('❌ Authentication test failed - should have been rejected');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Authentication properly required');
            } else {
                console.log('⚠️  Unexpected error:', error.response?.data?.message || error.message);
            }
        }

    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Test database connection first
async function testDatabaseConnection() {
    const mysql = require('mysql2/promise');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });
        
        console.log('✅ Database connection successful');
        
        // Check if payments table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'payments'");
        if (tables.length > 0) {
            console.log('✅ Payments table exists');
            
            // Check payments count
            const [count] = await connection.execute('SELECT COUNT(*) as count FROM payments');
            console.log(`📊 Payments in database: ${count[0].count}`);
        } else {
            console.log('❌ Payments table does not exist');
        }
        
        await connection.end();
        return true;
    } catch (error) {
        console.log('❌ Database connection failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Payment System Tests\n');
    
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
        console.log('\n❌ Cannot proceed with API tests - database connection failed');
        return;
    }
    
    console.log('\n' + '='.repeat(50));
    await testPaymentsAPI();
    
    console.log('\n🎉 Test suite completed!');
    console.log('\n📝 Note: API tests will fail without proper authentication token');
    console.log('   To get a token, login through the frontend or use a test user');
}

runTests().catch(console.error);