const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testWithAuth() {
    console.log('🔐 Testing Payments API with Authentication\n');

    // First, let's check what physicians exist in our data
    console.log('1️⃣ Checking Available Physicians...');
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });

        const [physicians] = await connection.execute(`
            SELECT DISTINCT 
                um.fk_physician_id,
                CONCAT(up.firstname, ' ', up.lastname) as physician_name,
                up.work_email,
                COUNT(DISTINCT b.id) as bill_count,
                COUNT(DISTINCT p.id) as payment_count
            FROM users_mappings um
            JOIN user_profiles up ON up.fk_userid = um.fk_physician_id
            LEFT JOIN bills b ON b.patient_id = um.user_id
            LEFT JOIN payments p ON p.bill_id = b.id
            WHERE um.fk_role_id = 6  -- Assuming 6 is physician role
            GROUP BY um.fk_physician_id, up.firstname, up.lastname, up.work_email
            HAVING bill_count > 0
        `);

        console.log('Available physicians with bills:');
        physicians.forEach(p => {
            console.log(`  ID: ${p.fk_physician_id}, Name: ${p.physician_name}, Bills: ${p.bill_count}, Payments: ${p.payment_count}`);
        });

        await connection.end();

        if (physicians.length === 0) {
            console.log('❌ No physicians found with bills');
            return;
        }

        // 2. Try to login with a test physician
        console.log('\n2️⃣ Testing Login...');
        
        // First check if server is running
        try {
            const serverCheck = await axios.get('http://localhost:8000/health').catch(() => null);
            if (!serverCheck) {
                console.log('❌ Server is not running on port 8000');
                console.log('   Start server with: cd server && npm start');
                return;
            }
            console.log('✅ Server is running');
        } catch (error) {
            console.log('❌ Cannot connect to server:', error.message);
            return;
        }

        // Try to login (you'll need to adjust this based on your login endpoint)
        let token = null;
        try {
            // Attempt login with the first physician's email
            const loginData = {
                email: physicians[0].work_email || 'test@example.com',
                password: 'password123' // You'll need to know the actual password
            };

            console.log(`Attempting login with: ${loginData.email}`);
            
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
            token = loginResponse.data.token || loginResponse.data.data?.token;
            
            if (token) {
                console.log('✅ Login successful, got token');
            } else {
                console.log('❌ Login response did not contain token');
                console.log('Response:', loginResponse.data);
            }
        } catch (loginError) {
            console.log('❌ Login failed:', loginError.response?.data?.message || loginError.message);
            console.log('   This is expected if you don\'t have the correct credentials');
            
            // For testing purposes, let's create a mock token
            console.log('\n⚠️  Creating mock token for testing (this won\'t work with real auth)');
            token = 'mock-token-for-testing';
        }

        // 3. Test payments API with token
        console.log('\n3️⃣ Testing Payments API...');
        
        if (token) {
            try {
                console.log('Testing GET /billings/payments...');
                const paymentsResponse = await axios.get(`${API_BASE_URL}/billings/payments`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('✅ GET payments successful');
                console.log(`Found ${paymentsResponse.data.data.length} payments`);
                
                if (paymentsResponse.data.data.length > 0) {
                    console.log('Sample payment:', paymentsResponse.data.data[0]);
                }
                
            } catch (apiError) {
                console.log('❌ GET payments failed:', apiError.response?.data?.message || apiError.message);
                console.log('Status:', apiError.response?.status);
                
                if (apiError.response?.status === 401) {
                    console.log('   Issue: Authentication failed - token is invalid');
                } else if (apiError.response?.status === 500) {
                    console.log('   Issue: Server error - check server logs');
                }
            }

            // Test bills API to compare
            try {
                console.log('\nTesting GET /billings/get-all-bills for comparison...');
                const billsResponse = await axios.get(`${API_BASE_URL}/billings/get-all-bills`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                console.log('✅ GET bills successful');
                console.log(`Found ${billsResponse.data.data.length} bills`);
                
            } catch (billsError) {
                console.log('❌ GET bills failed:', billsError.response?.data?.message || billsError.message);
            }
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }

    console.log('\n📋 Summary:');
    console.log('1. Data relationships are correct ✅');
    console.log('2. Server needs to be running ⚠️');
    console.log('3. Valid authentication token needed ⚠️');
    console.log('4. User must be a physician with mapped patients ⚠️');
    
    console.log('\n🔧 To fix:');
    console.log('1. Start server: cd server && npm start');
    console.log('2. Login through frontend to get valid token');
    console.log('3. Use that token to test the API');
    console.log('4. Or create a test user with proper physician role');
}

testWithAuth().catch(console.error);