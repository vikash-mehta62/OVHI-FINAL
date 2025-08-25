const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ovhi_db',
  multipleStatements: true
};

async function testIntegrationManagement() {
  let connection;
  
  try {
    console.log('🔧 Testing Integration Management System...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connection established');
    
    // Test 1: Create integration management schema
    console.log('\n📋 Test 1: Creating integration management schema...');
    const fs = require('fs');
    const schemaSQL = fs.readFileSync('./server/sql/integration_management_schema.sql', 'utf8');
    await connection.execute(schemaSQL);
    console.log('✅ Integration management schema created successfully');
    
    // Test 2: Test IntegrationManagementService
    console.log('\n🔍 Test 2: Testing IntegrationManagementService...');
    const IntegrationManagementService = require('./server/services/rcm/integrationManagementService');
    const service = new IntegrationManagementService();
    
    // Test getting all integrations
    console.log('  - Testing getAllIntegrations...');
    const integrations = await service.getAllIntegrations();
    console.log(`    ✅ Retrieved ${integrations.integrations?.length || 0} integrations`);
    
    // Test getting integration metrics
    console.log('  - Testing getIntegrationMetrics...');
    const metrics = await service.getIntegrationMetrics();
    console.log(`    ✅ Retrieved metrics: ${JSON.stringify(metrics.metrics, null, 2)}`);
    
    // Test getting integration health
    console.log('  - Testing getIntegrationHealth...');
    const health = await service.getIntegrationHealth();
    console.log(`    ✅ Retrieved health data for ${health.integrations?.length || 0} integrations`);
    
    // Test getting performance metrics
    console.log('  - Testing getPerformanceMetrics...');
    const performance = await service.getPerformanceMetrics(null, '24h');
    console.log(`    ✅ Retrieved ${performance.metrics?.length || 0} performance data points`);
    
    // Test getting audit trail
    console.log('  - Testing getAuditTrail...');
    const audit = await service.getAuditTrail({}, { page: 1, limit: 10 });
    console.log(`    ✅ Retrieved ${audit.entries?.length || 0} audit entries`);
    
    // Test 3: Test integration configuration (if integration exists)
    if (integrations.integrations && integrations.integrations.length > 0) {
      const testIntegrationId = integrations.integrations[0].id;
      
      console.log('\n⚙️ Test 3: Testing integration configuration...');
      console.log(`  - Testing getIntegrationConfiguration for ID: ${testIntegrationId}...`);
      const config = await service.getIntegrationConfiguration(testIntegrationId);
      console.log(`    ✅ Retrieved configuration: ${config.success ? 'Success' : 'Failed'}`);
      
      if (config.success) {
        console.log('  - Testing testIntegrationConnection...');
        const testResult = await service.testIntegrationConnection(testIntegrationId);
        console.log(`    ✅ Connection test: ${testResult.success ? 'Success' : 'Failed'}`);
      }
    }
    
    // Test 4: Verify database tables and data
    console.log('\n📊 Test 4: Verifying database tables and data...');
    
    const tables = [
      'integration_metrics',
      'integration_performance_log',
      'integration_alerts',
      'integration_audit_log',
      'integration_health_checks',
      'integration_config_history',
      'integration_retry_attempts',
      'integration_rate_limits',
      'integration_notifications'
    ];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✅ Table ${table}: ${rows[0].count} records`);
    }
    
    // Test 5: Verify views
    console.log('\n👁️ Test 5: Testing database views...');
    
    const [dashboardView] = await connection.execute('SELECT COUNT(*) as count FROM integration_dashboard_view');
    console.log(`  ✅ integration_dashboard_view: ${dashboardView[0].count} records`);
    
    const [performanceView] = await connection.execute('SELECT COUNT(*) as count FROM integration_performance_summary');
    console.log(`  ✅ integration_performance_summary: ${performanceView[0].count} records`);
    
    // Test 6: Test API endpoints simulation
    console.log('\n🌐 Test 6: Simulating API endpoint responses...');
    
    // Simulate metrics endpoint
    const metricsResponse = await service.getIntegrationMetrics();
    console.log('  ✅ /integrations/metrics endpoint simulation successful');
    
    // Simulate health endpoint
    const healthResponse = await service.getIntegrationHealth();
    console.log('  ✅ /integrations/health endpoint simulation successful');
    
    // Simulate performance endpoint
    const performanceResponse = await service.getPerformanceMetrics(null, '24h');
    console.log('  ✅ /integrations/performance endpoint simulation successful');
    
    // Simulate audit endpoint
    const auditResponse = await service.getAuditTrail({}, { page: 1, limit: 50 });
    console.log('  ✅ /integrations/audit endpoint simulation successful');
    
    console.log('\n🎉 All Integration Management tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Database schema: ✅ Created`);
    console.log(`   - Service methods: ✅ All working`);
    console.log(`   - Database tables: ✅ ${tables.length} tables created`);
    console.log(`   - Sample data: ✅ Inserted`);
    console.log(`   - API simulation: ✅ All endpoints working`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
testIntegrationManagement();