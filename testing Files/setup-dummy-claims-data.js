/**
 * Setup Dummy Claims Data Script
 * This script creates sample claims data for testing the RCM system
 */

import mysql from 'mysql2/promise';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health',
  multipleStatements: true
};

async function setupDummyClaimsData() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Read the SQL file
    console.log('📖 Reading SQL file...');
    const sqlFilePath = path.join(__dirname, 'server', 'sql', 'add_dummy_claims_data.sql');
    const sqlContent = await fs.readFile(sqlFilePath, 'utf8');
    console.log('✅ SQL file loaded successfully');

    // Execute the SQL commands
    console.log('🔄 Executing SQL commands...');
    const [results] = await connection.execute(sqlContent);
    console.log('✅ SQL commands executed successfully');

    // Display results
    if (Array.isArray(results)) {
      const summaryResults = results.filter(result => 
        Array.isArray(result) && result.length > 0 && result[0].Status
      );
      
      if (summaryResults.length > 0) {
        console.log('\n📊 Setup Summary:');
        summaryResults.forEach(resultSet => {
          if (resultSet.length > 0) {
            console.log(resultSet[0]);
          }
        });
      }
    }

    // Verify the data was inserted
    console.log('\n🔍 Verifying data insertion...');
    
    // Check billings table
    const [billingRows] = await connection.execute('SELECT COUNT(*) as count FROM billings');
    console.log(`✅ Billings table: ${billingRows[0].count} records`);
    
    // Check user_profiles table
    const [profileRows] = await connection.execute('SELECT COUNT(*) as count FROM user_profiles');
    console.log(`✅ User profiles table: ${profileRows[0].count} records`);
    
    // Check payments table
    const [paymentRows] = await connection.execute('SELECT COUNT(*) as count FROM payments');
    console.log(`✅ Payments table: ${paymentRows[0].count} records`);

    // Show sample claims by status
    console.log('\n📋 Claims by Status:');
    const [statusRows] = await connection.execute(`
      SELECT 
        CASE 
          WHEN status = 0 THEN 'Draft'
          WHEN status = 1 THEN 'Submitted'
          WHEN status = 2 THEN 'Paid'
          WHEN status = 3 THEN 'Denied'
          WHEN status = 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as Status,
        COUNT(*) as Count,
        SUM(total_amount) as Total_Amount
      FROM billings 
      GROUP BY status 
      ORDER BY status
    `);
    
    statusRows.forEach(row => {
      console.log(`  ${row.Status}: ${row.Count} claims, $${parseFloat(row.Total_Amount).toFixed(2)}`);
    });

    // Show recent claims
    console.log('\n📅 Recent Claims (Last 7 days):');
    const [recentRows] = await connection.execute(`
      SELECT 
        claim_number,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        procedure_code,
        total_amount,
        service_date,
        CASE 
          WHEN status = 0 THEN 'Draft'
          WHEN status = 1 THEN 'Submitted'
          WHEN status = 2 THEN 'Paid'
          WHEN status = 3 THEN 'Denied'
          WHEN status = 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as status_text
      FROM billings b
      LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
      WHERE b.service_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ORDER BY b.service_date DESC
      LIMIT 10
    `);
    
    recentRows.forEach(row => {
      console.log(`  ${row.claim_number} - ${row.patient_name} - ${row.procedure_code} - $${parseFloat(row.total_amount).toFixed(2)} - ${row.status_text}`);
    });

    console.log('\n🎉 Dummy claims data setup completed successfully!');
    console.log('\n📝 What was created:');
    console.log('   • 15 patient profiles with contact information');
    console.log('   • 30 claims with various statuses and dates');
    console.log('   • Claims spanning different aging buckets (0-30, 31-60, 61-90, 120+ days)');
    console.log('   • Sample payment records for paid claims');
    console.log('   • Mix of payers: BCBS, Aetna, UnitedHealthcare, Cigna, Humana, Medicare, Medicaid');
    console.log('   • Various procedure codes: 99213, 99214, 99215, 90834, 90837, 96116, etc.');
    console.log('   • Different claim statuses: Draft, Submitted, Paid, Denied, Appealed');
    
    console.log('\n🔗 You can now test the claims management system with real-looking data!');

  } catch (error) {
    console.error('❌ Error setting up dummy claims data:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure MySQL server is running and connection details are correct');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Check your database credentials');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Make sure the database exists');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
if (require.main === module) {
  setupDummyClaimsData();
}

module.exports = { setupDummyClaimsData };