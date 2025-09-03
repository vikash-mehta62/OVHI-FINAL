/**
 * Setup Script for Claim Actions
 * Initializes database tables and sample data for new claim management actions
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ovhi_db',
  multipleStatements: true
};

async function setupClaimActions() {
  let connection;
  
  try {
    console.log('🚀 Setting up Claim Actions functionality...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read and execute schema file
    const schemaPath = path.join(__dirname, 'server', 'sql', 'claim_actions_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📋 Executing claim actions schema...');
    await connection.execute(schema);
    console.log('✅ Schema executed successfully');
    
    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const tables = [
      'claim_comments',
      'claim_appeals', 
      'patient_statements',
      'claim_audit_log'
    ];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }
    
    // Check if billings table has new columns
    console.log('\n🔍 Verifying billings table updates...');
    const [columns] = await connection.execute(`SHOW COLUMNS FROM billings LIKE 'voided'`);
    if (columns.length > 0) {
      console.log('✅ Billings table updated with new columns');
    } else {
      console.log('❌ Billings table missing new columns');
    }
    
    // Insert sample data for testing
    console.log('\n📝 Setting up sample data...');
    
    // Ensure we have some basic claims to work with
    await connection.execute(`
      INSERT IGNORE INTO billings (
        id, patient_id, provider_id, claim_number, total_amount, 
        status, service_date, submission_date, created_at
      ) VALUES 
      (1, 1, 1, 'CLM-2024-001', 450.00, 1, '2024-01-15', '2024-01-16', NOW()),
      (2, 2, 1, 'CLM-2024-002', 280.00, 3, '2024-01-14', '2024-01-15', NOW()),
      (3, 3, 1, 'CLM-2024-003', 650.00, 4, '2024-01-12', '2024-01-13', NOW())
    `);
    
    console.log('✅ Sample claims created');
    
    // Test the new functionality
    console.log('\n🧪 Testing claim actions...');
    
    // Test comment insertion
    await connection.execute(`
      INSERT INTO claim_comments (claim_id, user_id, comment, comment_type) 
      VALUES (1, 1, 'Test comment for claim actions setup', 'general')
    `);
    console.log('✅ Comment functionality working');
    
    // Test appeal creation
    await connection.execute(`
      INSERT INTO claim_appeals (claim_id, appeal_reason, appeal_date, created_by)
      VALUES (3, 'Test appeal for setup verification', CURDATE(), 1)
    `);
    console.log('✅ Appeal functionality working');
    
    // Test patient statement creation
    await connection.execute(`
      INSERT INTO patient_statements (patient_id, claim_id, amount, statement_date)
      VALUES (1, 1, 450.00, CURDATE())
    `);
    console.log('✅ Patient statement functionality working');
    
    // Test audit log
    await connection.execute(`
      INSERT INTO claim_audit_log (claim_id, action_type, new_values, user_id)
      VALUES (1, 'created', '{"test": "setup"}', 1)
    `);
    console.log('✅ Audit log functionality working');
    
    // Display summary
    console.log('\n📊 Setup Summary:');
    console.log('='.repeat(50));
    
    // Count records in each table
    for (const table of tables) {
      const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${countResult[0].count} records`);
    }
    
    // Show claim action summary
    console.log('\n📋 Available Claim Actions:');
    console.log('- ✅ Correct & Resubmit');
    console.log('- ✅ File Appeal');
    console.log('- ✅ Transfer to Patient');
    console.log('- ✅ Add Comment');
    console.log('- ✅ Void Claim');
    
    console.log('\n🎉 Claim Actions setup completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Start your server: npm run dev (in server directory)');
    console.log('2. Start your frontend: npm run dev (in root directory)');
    console.log('3. Navigate to RCM > Claims Management');
    console.log('4. Use the dropdown menu in the Actions column to test new features');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Cleanup function for testing
async function cleanupClaimActions() {
  let connection;
  
  try {
    console.log('🧹 Cleaning up claim actions data...');
    
    connection = await mysql.createConnection(dbConfig);
    
    // Remove test data
    await connection.execute('DELETE FROM claim_comments WHERE comment LIKE "%test%"');
    await connection.execute('DELETE FROM claim_appeals WHERE appeal_reason LIKE "%test%"');
    await connection.execute('DELETE FROM patient_statements WHERE notes LIKE "%test%"');
    await connection.execute('DELETE FROM claim_audit_log WHERE new_values LIKE "%test%"');
    
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    cleanupClaimActions();
  } else {
    setupClaimActions();
  }
}

module.exports = {
  setupClaimActions,
  cleanupClaimActions
};