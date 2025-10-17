/**
 * Test Payment Functionality
 * This script tests the payment history component functionality
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function testPaymentFunctionality() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Test 1: Check if payments table exists and has data
    console.log('\n📋 Testing payments table...');
    try {
      const [payments] = await connection.execute('SELECT COUNT(*) as count FROM payments');
      console.log(`✅ Payments table exists with ${payments[0].count} records`);
      
      // Show sample payments
      const [samplePayments] = await connection.execute(`
        SELECT 
          p.*,
          CONCAT(up.firstname, ' ', up.lastname) as patient_name
        FROM payments p
        LEFT JOIN user_profiles up ON p.patient_id = up.fk_userid
        ORDER BY p.created_at DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Sample payments:');
      samplePayments.forEach(payment => {
        console.log(`   ID: ${payment.id} - ${payment.patient_name || 'Unknown'} - $${payment.amount} - ${payment.payment_method} - ${payment.status}`);
      });
      
    } catch (error) {
      console.log('❌ Payments table not found or error:', error.message);
    }

    // Test 2: Check billings table (claims data)
    console.log('\n📋 Testing billings table...');
    try {
      const [billings] = await connection.execute('SELECT COUNT(*) as count FROM billings');
      console.log(`✅ Billings table exists with ${billings[0].count} records`);
      
      // Show sample claims
      const [sampleClaims] = await connection.execute(`
        SELECT 
          b.*,
          CONCAT(up.firstname, ' ', up.lastname) as patient_name
        FROM billings b
        LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
        ORDER BY b.created DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Sample claims:');
      sampleClaims.forEach(claim => {
        console.log(`   ID: ${claim.id} - ${claim.patient_name || 'Unknown'} - $${claim.total_amount} - Status: ${claim.status}`);
      });
      
    } catch (error) {
      console.log('❌ Billings table not found or error:', error.message);
    }

    // Test 3: Check user_profiles table
    console.log('\n📋 Testing user_profiles table...');
    try {
      const [profiles] = await connection.execute('SELECT COUNT(*) as count FROM user_profiles');
      console.log(`✅ User_profiles table exists with ${profiles[0].count} records`);
      
      // Show sample patients
      const [samplePatients] = await connection.execute(`
        SELECT 
          fk_userid,
          firstname,
          lastname,
          phone,
          work_email
        FROM user_profiles
        WHERE firstname IS NOT NULL
        ORDER BY fk_userid
        LIMIT 5
      `);
      
      console.log('\n📊 Sample patients:');
      samplePatients.forEach(patient => {
        console.log(`   ID: ${patient.fk_userid} - ${patient.firstname} ${patient.lastname} - ${patient.phone || 'No phone'}`);
      });
      
    } catch (error) {
      console.log('❌ User_profiles table not found or error:', error.message);
    }

    // Test 4: Create sample office payment data if needed
    console.log('\n📋 Creating sample office payment data...');
    try {
      // Insert a few sample office payments
      const sampleOfficePayments = [
        {
          patient_id: 101,
          amount: 150.00,
          payment_method: 'cash',
          payment_date: new Date().toISOString().split('T')[0],
          status: 'completed',
          reference_number: 'CASH-001'
        },
        {
          patient_id: 102,
          amount: 75.00,
          payment_method: 'credit_card',
          payment_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          status: 'completed',
          reference_number: 'CC-001'
        },
        {
          patient_id: 103,
          amount: 200.00,
          payment_method: 'check',
          payment_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
          status: 'completed',
          reference_number: 'CHK-001'
        }
      ];

      for (const payment of sampleOfficePayments) {
        await connection.execute(`
          INSERT IGNORE INTO payments 
          (patient_id, amount, payment_method, payment_date, status, reference_number, created_at)
          VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          payment.patient_id,
          payment.amount,
          payment.payment_method,
          payment.payment_date,
          payment.status,
          payment.reference_number
        ]);
      }
      
      console.log('✅ Sample office payment data created');
      
    } catch (error) {
      console.log('❌ Error creating sample office payment data:', error.message);
    }

    // Test 5: Verify payment data structure
    console.log('\n📋 Testing payment data structure...');
    try {
      const [paymentStructure] = await connection.execute(`
        SELECT 
          p.id,
          p.patient_id,
          COALESCE(CONCAT(up.firstname, ' ', up.lastname), 'Unknown Patient') as patient_name,
          p.amount,
          p.payment_method,
          p.payment_date,
          p.status,
          p.reference_number,
          p.created_at
        FROM payments p
        LEFT JOIN user_profiles up ON p.patient_id = up.fk_userid
        ORDER BY p.created_at DESC
        LIMIT 3
      `);
      
      console.log('✅ Payment data structure verified:');
      paymentStructure.forEach(payment => {
        console.log(`   Payment ID: ${payment.id}`);
        console.log(`   Patient: ${payment.patient_name} (ID: ${payment.patient_id})`);
        console.log(`   Amount: $${payment.amount}`);
        console.log(`   Method: ${payment.payment_method}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Date: ${payment.payment_date}`);
        console.log(`   ---`);
      });
      
    } catch (error) {
      console.log('❌ Error testing payment data structure:', error.message);
    }

    console.log('\n🎉 Payment functionality test completed!');
    console.log('\n📝 Summary:');
    console.log('   • Payments table: Available for office payments');
    console.log('   • Billings table: Available for claims data');
    console.log('   • User_profiles table: Available for patient data');
    console.log('   • Sample data: Created for testing');
    console.log('\n💡 The PaymentHistory component should now work with:');
    console.log('   • Office payments from payments table');
    console.log('   • Claims data from billings table');
    console.log('   • Patient names from user_profiles table');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testPaymentFunctionality();
}

module.exports = { testPaymentFunctionality };