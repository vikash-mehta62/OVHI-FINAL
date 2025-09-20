const mysql = require('mysql2/promise');
const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function debugPaymentsIssues() {
    console.log('🔍 Debugging Payments API Issues\n');

    // 1. Check database connection and data
    console.log('1️⃣ Checking Database Connection and Data...');
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'varn-health'
        });

        console.log('✅ Database connected');

        // Check if payments table exists
        const [tables] = await connection.execute("SHOW TABLES LIKE 'payments'");
        if (tables.length === 0) {
            console.log('❌ Payments table does not exist!');
            console.log('   Run: node setup-payments-table.cjs');
            return;
        }
        console.log('✅ Payments table exists');

        // Check payments data
        const [payments] = await connection.execute('SELECT COUNT(*) as count FROM payments');
        console.log(`📊 Payments count: ${payments[0].count}`);

        // Check bills data
        const [bills] = await connection.execute('SELECT COUNT(*) as count FROM bills');
        console.log(`📊 Bills count: ${bills[0].count}`);

        // Check users_mappings data
        const [mappings] = await connection.execute('SELECT COUNT(*) as count FROM users_mappings');
        console.log(`📊 User mappings count: ${mappings[0].count}`);

        // Check user_profiles data
        const [profiles] = await connection.execute('SELECT COUNT(*) as count FROM user_profiles');
        console.log(`📊 User profiles count: ${profiles[0].count}`);

        // Test the exact query used in getPayments
        console.log('\n2️⃣ Testing getPayments Query...');
        try {
            const testQuery = `
                SELECT 
                    p.*,
                    CONCAT(up.firstname, " ", up.lastname) as patient_name,
                    up.work_email as patient_email,
                    b.total_amount as bill_total_amount
                FROM payments p
                JOIN bills b ON p.bill_id = b.id
                JOIN user_profiles up ON b.patient_id = up.fk_userid
                JOIN users_mappings um ON um.user_id = b.patient_id
                WHERE um.fk_physician_id = ?
                ORDER BY p.payment_date DESC
            `;
            
            // Try with a test physician ID (assuming ID 1 exists)
            const [testResults] = await connection.execute(testQuery, [1]);
            console.log(`✅ Query executed successfully, found ${testResults.length} payments`);
            
            if (testResults.length > 0) {
                console.log('📋 Sample payment:', {
                    id: testResults[0].id,
                    patient_name: testResults[0].patient_name,
                    amount: testResults[0].amount,
                    status: testResults[0].status
                });
            }
        } catch (queryError) {
            console.log('❌ Query failed:', queryError.message);
            console.log('   This might be the issue with getPayments');
        }

        // Test createPayment query
        console.log('\n3️⃣ Testing createPayment Query...');
        try {
            // Get a sample bill
            const [sampleBills] = await connection.execute(`
                SELECT b.id, b.patient_id, um.fk_physician_id
                FROM bills b
                JOIN users_mappings um ON um.user_id = b.patient_id
                LIMIT 1
            `);
            
            if (sampleBills.length > 0) {
                const bill = sampleBills[0];
                console.log(`✅ Found sample bill: ${bill.id} for patient ${bill.patient_id}`);
                
                // Test the validation query
                const [validationResult] = await connection.execute(`
                    SELECT b.*, um.fk_physician_id
                    FROM bills b
                    JOIN users_mappings um ON um.user_id = b.patient_id
                    WHERE b.id = ? AND um.fk_physician_id = ?
                `, [bill.id, bill.fk_physician_id]);
                
                if (validationResult.length > 0) {
                    console.log('✅ Bill validation query works');
                } else {
                    console.log('❌ Bill validation query failed');
                }
            } else {
                console.log('❌ No bills found with proper user mappings');
            }
        } catch (createError) {
            console.log('❌ CreatePayment validation failed:', createError.message);
        }

        await connection.end();

    } catch (dbError) {
        console.log('❌ Database error:', dbError.message);
        return;
    }

    // 4. Check API endpoints
    console.log('\n4️⃣ Checking API Endpoints...');
    try {
        // Test if server is running
        const healthCheck = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`).catch(() => null);
        if (!healthCheck) {
            console.log('❌ Server is not running on port 8000');
            console.log('   Start server: cd server && npm start');
            return;
        }
        console.log('✅ Server is running');

        // Test payments endpoint without auth (should fail with 401)
        try {
            await axios.get(`${API_BASE_URL}/billings/payments`);
            console.log('❌ Payments endpoint accessible without auth (security issue)');
        } catch (error) {
            if (error.response?.status === 401) {
                console.log('✅ Payments endpoint properly requires authentication');
            } else {
                console.log(`⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
            }
        }

    } catch (apiError) {
        console.log('❌ API test failed:', apiError.message);
    }

    // 5. Check route registration
    console.log('\n5️⃣ Checking Route Registration...');
    console.log('   Check if billingRoutes.js is properly imported in the main server file');
    console.log('   Verify the route path: /api/v1/billings/payments');
    
    console.log('\n📋 Common Issues and Solutions:');
    console.log('1. Missing user authentication token');
    console.log('2. User not properly mapped to patients in users_mappings table');
    console.log('3. Bills not associated with the logged-in physician');
    console.log('4. Missing foreign key relationships');
    console.log('5. Server not restarted after adding new routes');
    
    console.log('\n🔧 Debugging Steps:');
    console.log('1. Login to get a valid JWT token');
    console.log('2. Check if the logged-in user has patients mapped');
    console.log('3. Verify bills exist for those patients');
    console.log('4. Test with a valid token in the Authorization header');
}

debugPaymentsIssues().catch(console.error);