const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'ovhi_db',
  multipleStatements: true
};

async function setupCollectionsSystem() {
  let connection;
  
  try {
    console.log('🚀 Setting up Collections Management System...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read and execute collections schema
    const schemaPath = path.join(__dirname, 'sql', 'collections_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📋 Executing collections schema...');
    await connection.execute(schemaSQL);
    console.log('✅ Collections schema created successfully');
    
    // Verify tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'ovhi_db' 
      AND TABLE_NAME IN (
        'payment_plans', 
        'collection_activities', 
        'payment_plan_payments',
        'collection_letter_templates',
        'collection_rules',
        'collection_tasks'
      )
    `);
    
    console.log('📊 Created tables:', tables.map(t => t.TABLE_NAME).join(', '));
    
    // Check if patient_accounts table has collections columns
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'ovhi_db' 
      AND TABLE_NAME = 'patient_accounts'
      AND COLUMN_NAME IN ('collection_status', 'priority', 'assigned_collector', 'contact_attempts')
    `);
    
    console.log('📋 Patient accounts collections columns:', columns.map(c => c.COLUMN_NAME).join(', '));
    
    // Test collections data
    console.log('🧪 Testing collections data...');
    
    // Check payment plans
    const [paymentPlans] = await connection.execute('SELECT COUNT(*) as count FROM payment_plans');
    console.log(`💳 Payment plans: ${paymentPlans[0].count}`);
    
    // Check collection activities
    const [activities] = await connection.execute('SELECT COUNT(*) as count FROM collection_activities');
    console.log(`📞 Collection activities: ${activities[0].count}`);
    
    // Check collection templates
    const [templates] = await connection.execute('SELECT COUNT(*) as count FROM collection_letter_templates');
    console.log(`📄 Letter templates: ${templates[0].count}`);
    
    // Check collection rules
    const [rules] = await connection.execute('SELECT COUNT(*) as count FROM collection_rules');
    console.log(`⚙️ Collection rules: ${rules[0].count}`);
    
    // Test collections summary view
    const [summary] = await connection.execute('SELECT * FROM collections_summary LIMIT 5');
    console.log('📈 Collections summary sample:', summary.length > 0 ? 'Available' : 'No data');
    
    // Test payment plan summary view
    const [planSummary] = await connection.execute('SELECT * FROM payment_plan_summary');
    console.log('💰 Payment plan summary:', planSummary.length > 0 ? 'Available' : 'No data');
    
    console.log('\n🎉 Collections Management System setup completed successfully!');
    console.log('\n📋 System includes:');
    console.log('   • Patient account collections tracking');
    console.log('   • Payment plan management');
    console.log('   • Collection activity logging');
    console.log('   • Automated collection workflows');
    console.log('   • Collection letter templates');
    console.log('   • Collections analytics and reporting');
    
    console.log('\n🔗 API Endpoints available:');
    console.log('   • GET /api/v1/rcm/collections/accounts - Patient accounts');
    console.log('   • GET /api/v1/rcm/collections/payment-plans - Payment plans');
    console.log('   • POST /api/v1/rcm/collections/payment-plans - Create payment plan');
    console.log('   • GET /api/v1/rcm/collections/activities - Collection activities');
    console.log('   • POST /api/v1/rcm/collections/activities - Log activity');
    console.log('   • GET /api/v1/rcm/collections/analytics - Collections analytics');
    
    console.log('\n🎯 Next steps:');
    console.log('   1. Start the server: npm run dev (in server directory)');
    console.log('   2. Start the frontend: npm run dev (in root directory)');
    console.log('   3. Navigate to Collections Management in the RCM module');
    console.log('   4. Test payment plan creation and activity logging');
    
  } catch (error) {
    console.error('❌ Error setting up collections system:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Test collections API endpoints
async function testCollectionsAPI() {
  console.log('\n🧪 Testing Collections API endpoints...');
  
  try {
    // Test if server is running
    const fetch = (await import('node-fetch')).default;
    const baseURL = 'http://localhost:5000/api/v1/rcm/collections';
    
    // Test accounts endpoint
    try {
      const accountsResponse = await fetch(`${baseURL}/accounts`);
      console.log(`📊 Accounts endpoint: ${accountsResponse.status === 401 ? 'Protected (needs auth)' : accountsResponse.status}`);
    } catch (error) {
      console.log('📊 Accounts endpoint: Server not running');
    }
    
    // Test payment plans endpoint
    try {
      const plansResponse = await fetch(`${baseURL}/payment-plans`);
      console.log(`💳 Payment plans endpoint: ${plansResponse.status === 401 ? 'Protected (needs auth)' : plansResponse.status}`);
    } catch (error) {
      console.log('💳 Payment plans endpoint: Server not running');
    }
    
    // Test activities endpoint
    try {
      const activitiesResponse = await fetch(`${baseURL}/activities`);
      console.log(`📞 Activities endpoint: ${activitiesResponse.status === 401 ? 'Protected (needs auth)' : activitiesResponse.status}`);
    } catch (error) {
      console.log('📞 Activities endpoint: Server not running');
    }
    
  } catch (error) {
    console.log('⚠️ API testing requires server to be running');
  }
}

// Run setup
if (require.main === module) {
  setupCollectionsSystem()
    .then(() => testCollectionsAPI())
    .then(() => {
      console.log('\n✅ Collections system setup and testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupCollectionsSystem };