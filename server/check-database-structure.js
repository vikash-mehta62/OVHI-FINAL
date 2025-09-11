/**
 * Check Database Structure Script
 * This script checks the current database structure
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function checkDatabaseStructure() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check all tables
    console.log('🔍 Checking all tables...');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    // Check users table structure
    console.log('\n🔍 Checking users table structure...');
    try {
      const [userColumns] = await connection.execute('DESCRIBE users');
      console.log('👥 Users table columns:');
      userColumns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Get sample users
      const [sampleUsers] = await connection.execute('SELECT * FROM users LIMIT 5');
      console.log(`\n👥 Sample users (${sampleUsers.length} found):`);
      sampleUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.user_id || user.id} - ${JSON.stringify(user)}`);
      });
      
    } catch (error) {
      console.log('❌ Users table not found or error:', error.message);
    }

    // Check user_profiles table structure
    console.log('\n🔍 Checking user_profiles table structure...');
    try {
      const [profileColumns] = await connection.execute('DESCRIBE user_profiles');
      console.log('👤 User_profiles table columns:');
      profileColumns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Get sample profiles
      const [sampleProfiles] = await connection.execute('SELECT * FROM user_profiles LIMIT 5');
      console.log(`\n👤 Sample user profiles (${sampleProfiles.length} found):`);
      sampleProfiles.forEach((profile, index) => {
        console.log(`   ${index + 1}. ID: ${profile.fk_userid} - ${profile.firstname} ${profile.lastname}`);
      });
      
    } catch (error) {
      console.log('❌ User_profiles table not found or error:', error.message);
    }

    // Check billings table structure
    console.log('\n🔍 Checking billings table structure...');
    try {
      const [billingColumns] = await connection.execute('DESCRIBE billings');
      console.log('💰 Billings table columns:');
      billingColumns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      
      // Get sample billings
      const [sampleBillings] = await connection.execute('SELECT * FROM billings LIMIT 3');
      console.log(`\n💰 Sample billings (${sampleBillings.length} found):`);
      sampleBillings.forEach((billing, index) => {
        console.log(`   ${index + 1}. ID: ${billing.id} - Patient: ${billing.patient_id} - Amount: $${billing.total_amount}`);
      });
      
    } catch (error) {
      console.log('❌ Billings table not found or error:', error.message);
    }

    console.log('\n🎯 Database structure analysis complete!');

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

// Run the check
if (require.main === module) {
  checkDatabaseStructure();
}

module.exports = { checkDatabaseStructure };