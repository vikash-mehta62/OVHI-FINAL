/**
 * Test Authentication and Payment Endpoints
 * This script tests login and then payment endpoints
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function testAuthAndPayments() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Test 1: Check if users exist and have tokens
    console.log('\n📋 Checking users and tokens...');
    const [users] = await connection.execute(`
      SELECT 
        user_id,
        username,
        user_token,
        CASE WHEN user_token IS NOT NULL THEN 'Has Token' ELSE 'No Token' END as token_status
      FROM users 
      WHERE user_token IS NOT NULL
      LIMIT 5
    `);
    
    if (users.length > 0) {
      console.log('✅ Found users with tokens:');
      users.forEach(user => {
        console.log(`   User ID: ${user.user_id} - ${user.username} - ${user.token_status}`);
      });
      
      // Test with first user's token
      const testUser = users[0];
      const testToken = testUser.user_token;
      
      console.log(`\n🔑 Testing with token from user: ${testUser.username}`);
      
      // Test payment endpoints with real token
      const baseURL = 'http://localhost:8000';
      const endpoints = [
        '/api/v1/rcm/office-payments',
        '/api/v1/rcm/dashboard'
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`\n📡 Testing: ${baseURL}${endpoint}`);
          
          const response = await fetch(`${baseURL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${testToken}`
            }
          });
          
          console.log(`   Status: ${response.status} ${response.statusText}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Success: ${JSON.stringify(data).substring(0, 200)}...`);
          } else {
            const errorText = await response.text();
            console.log(`   ❌ Error: ${errorText.substring(0, 200)}...`);
          }
          
        } catch (error) {
          console.log(`   ❌ Network Error: ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ No users with tokens found');
      
      // Check if users exist at all
      const [allUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
      console.log(`   Total users in database: ${allUsers[0].count}`);
      
      if (allUsers[0].count === 0) {
        console.log('   💡 No users found. You may need to register/login first.');
      } else {
        console.log('   💡 Users exist but no tokens. You may need to login to generate tokens.');
      }
    }

    // Test 2: Check payment data
    console.log('\n📋 Checking payment data...');
    try {
      const [paymentCount] = await connection.execute('SELECT COUNT(*) as count FROM payments');
      console.log(`✅ Payments table: ${paymentCount[0].count} records`);
      
      if (paymentCount[0].count > 0) {
        const [samplePayments] = await connection.execute(`
          SELECT 
            p.id,
            p.patient_id,
            COALESCE(CONCAT(up.firstname, ' ', up.lastname), 'Unknown Patient') as patient_name,
            p.amount,
            p.payment_method,
            p.status,
            p.payment_date
          FROM payments p
          LEFT JOIN user_profiles up ON p.patient_id = up.fk_userid
          ORDER BY p.created_at DESC
          LIMIT 3
        `);
        
        console.log('📊 Sample payments:');
        samplePayments.forEach(payment => {
          console.log(`   ID: ${payment.id} - ${payment.patient_name} - $${payment.amount} - ${payment.payment_method}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Error checking payments:', error.message);
    }

    // Test 3: Check user profiles
    console.log('\n📋 Checking user profiles...');
    try {
      const [profileCount] = await connection.execute('SELECT COUNT(*) as count FROM user_profiles');
      console.log(`✅ User profiles: ${profileCount[0].count} records`);
      
      if (profileCount[0].count > 0) {
        const [sampleProfiles] = await connection.execute(`
          SELECT 
            fk_userid,
            firstname,
            lastname,
            phone
          FROM user_profiles
          WHERE firstname IS NOT NULL
          ORDER BY fk_userid
          LIMIT 3
        `);
        
        console.log('📊 Sample profiles:');
        sampleProfiles.forEach(profile => {
          console.log(`   ID: ${profile.fk_userid} - ${profile.firstname} ${profile.lastname}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Error checking user profiles:', error.message);
    }

    console.log('\n🎉 Authentication and payment test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. If you have a valid token, the PaymentHistory component should work');
    console.log('   2. If no tokens found, login to the application first');
    console.log('   3. Check browser console for debug information');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testAuthAndPayments();
}

module.exports = { testAuthAndPayments };