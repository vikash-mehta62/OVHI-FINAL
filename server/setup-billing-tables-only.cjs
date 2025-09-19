const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration - using the same config as the server
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Update with your MySQL password
  database: 'varn-health', // Using the same database as the server
  multipleStatements: true
};

async function setupBillingTables() {
  let connection;
  
  try {
    console.log('🚀 Setting up Billing Tables in existing database...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'sql', 'billing_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await connection.execute(schema);
    console.log('✅ Database schema created successfully');
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('services', 'bills', 'invoices', 'bill_items', 'invoice_items', 'payments')
    `, [dbConfig.database]);
    
    console.log('✅ Created tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // Check if services table has data
    const [serviceCount] = await connection.execute('SELECT COUNT(*) as count FROM services');
    console.log(`✅ Services in database: ${serviceCount[0].count}`);
    
    // Check if we have patients (from existing user_profiles)
    const [patientCount] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM user_profiles up 
      LEFT JOIN users_mappings um ON um.user_id = up.fk_userid 
      WHERE um.fk_role_id = 7
    `);
    console.log(`✅ Patients available: ${patientCount[0].count}`);
    
    console.log('\n🎉 Billing tables setup completed successfully!');
    console.log('\n📋 Ready to use:');
    console.log('- Patient search via existing user_profiles');
    console.log('- Service management');
    console.log('- Bill and invoice creation');
    console.log('- Payment recording');
    
  } catch (error) {
    console.error('❌ Error setting up billing tables:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  setupBillingTables().catch(console.error);
}

module.exports = { setupBillingTables };