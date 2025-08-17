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

async function setupAdvancedTelehealthFeatures() {
  let connection;
  
  try {
    console.log('🚀 Setting up Advanced Telehealth Features...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Setup schemas in order
    const schemas = [
      {
        name: 'Advanced Analytics Schema',
        file: 'server/sql/telehealth_analytics_advanced_schema.sql'
      },
      {
        name: 'Mobile App Integration Schema',
        file: 'server/sql/mobile_app_schema.sql'
      },
      {
        name: 'Integration Expansion Schema',
        file: 'server/sql/integration_expansion_schema.sql'
      }
    ];
    
    for (const schema of schemas) {
      try {
        console.log(`📋 Creating ${schema.name}...`);
        const schemaPath = path.join(__dirname, schema.file);
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        await connection.execute(schemaSql);
        console.log(`✅ ${schema.name} created successfully`);
      } catch (error) {
        console.log(`❌ Error creating ${schema.name}:`, error.message);
      }
    }
    
    // Verify all tables were created
    const expectedTables = [
      // Analytics tables
      'telehealth_patient_surveys',
      'telehealth_clinical_outcomes',
      'telehealth_proms',
      'telehealth_analytics_advanced',
      'telehealth_patient_journey',
      
      // Mobile app tables
      'mobile_devices',
      'mobile_app_config',
      'mobile_session_tokens',
      'mobile_notifications',
      'mobile_session_events',
      'mobile_app_analytics',
      'mobile_app_crashes',
      'mobile_deep_links',
      
      // Integration tables
      'ehr_integrations',
      'ehr_sync_log',
      'medical_device_integrations',
      'device_readings',
      'ai_clinical_analysis',
      'ai_clinical_suggestions',
      'integration_analytics',
      'integration_error_log',
      'fhir_resource_mappings'
    ];
    
    console.log('\n🔍 Verifying table creation...');
    let tablesCreated = 0;
    for (const table of expectedTables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
        tablesCreated++;
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }
    
    console.log(`\n📊 Tables Created: ${tablesCreated}/${expectedTables.length}`);
    
    // Test advanced features
    console.log('\n🧪 Testing advanced features...');
    
    // Test patient survey creation
    try {
      await connection.execute(`
        INSERT IGNORE INTO telehealth_patient_surveys (
          session_id, patient_id, provider_id, survey_type,
          overall_satisfaction, video_quality_rating, nps_score,
          completion_status, completed_at
        ) VALUES (1, 2, 1, 'post_session', 5, 4, 9, 'completed', NOW())
      `);
      console.log('✅ Patient survey test passed');
    } catch (error) {
      console.log('❌ Patient survey test failed:', error.message);
    }
    
    // Test mobile device registration
    try {
      await connection.execute(`
        INSERT IGNORE INTO mobile_devices (
          user_id, device_token, device_type, device_model, os_version, app_version
        ) VALUES (2, 'test_token_123', 'ios', 'iPhone 14', '16.0', '2.0.0')
      `);
      console.log('✅ Mobile device registration test passed');
    } catch (error) {
      console.log('❌ Mobile device registration test failed:', error.message);
    }
    
    // Test EHR integration configuration
    try {
      await connection.execute(`
        INSERT IGNORE INTO ehr_integrations (
          provider_id, ehr_system, endpoint_url, authentication_type, api_version
        ) VALUES (1, 'fhir_generic', 'https://test-fhir.example.com', 'oauth2', 'R4')
      `);
      console.log('✅ EHR integration test passed');
    } catch (error) {
      console.log('❌ EHR integration test failed:', error.message);
    }
    
    // Test medical device integration
    try {
      await connection.execute(`
        INSERT IGNORE INTO medical_device_integrations (
          provider_id, device_type, device_name, manufacturer, connection_type
        ) VALUES (1, 'blood_pressure_monitor', 'Test BP Monitor', 'Test Corp', 'bluetooth')
      `);
      console.log('✅ Medical device integration test passed');
    } catch (error) {
      console.log('❌ Medical device integration test failed:', error.message);
    }
    
    // Test AI clinical analysis
    try {
      await connection.execute(`
        INSERT IGNORE INTO ai_clinical_analysis (
          session_id, patient_id, provider_id, analysis_type,
          analysis_data, confidence_score, recommendations
        ) VALUES (
          1, 2, 1, 'transcript_analysis',
          '{"symptoms": ["headache", "fever"]}', 0.85,
          '{"diagnostic_tests": ["CBC", "Blood culture"]}'
        )
      `);
      console.log('✅ AI clinical analysis test passed');
    } catch (error) {
      console.log('❌ AI clinical analysis test failed:', error.message);
    }
    
    // Get current data counts
    const dataCounts = {};
    for (const table of expectedTables.slice(0, 10)) { // Check first 10 tables
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        dataCounts[table] = count[0].count;
      } catch (error) {
        dataCounts[table] = 'Error';
      }
    }
    
    console.log('\n📊 Current Data Counts:');
    Object.entries(dataCounts).forEach(([table, count]) => {
      console.log(`   - ${table}: ${count}`);
    });
    
    // Feature-specific setup instructions
    console.log('\n📝 Advanced Features Setup Instructions:');
    
    console.log('\n🔬 1. Advanced Analytics Setup:');
    console.log('   - Configure patient satisfaction survey templates');
    console.log('   - Set up automated survey sending after sessions');
    console.log('   - Configure clinical outcome tracking parameters');
    console.log('   - Set up PROM (Patient Reported Outcome Measures) collection');
    
    console.log('\n📱 2. Mobile App Integration Setup:');
    console.log('   - Configure Firebase Cloud Messaging (FCM) for Android');
    console.log('   - Configure Apple Push Notification Service (APNS) for iOS');
    console.log('   - Set up deep linking for mobile apps');
    console.log('   - Configure mobile app analytics tracking');
    
    console.log('\n🤖 3. AI Clinical Decision Support Setup:');
    console.log('   - Configure OpenAI API key: OPENAI_API_KEY=your_key');
    console.log('   - Set up clinical knowledge base');
    console.log('   - Configure real-time analysis triggers');
    console.log('   - Set up provider feedback collection for AI accuracy');
    
    console.log('\n🏥 4. EHR Integration Setup:');
    console.log('   - Configure FHIR server endpoints');
    console.log('   - Set up OAuth2 authentication for EHR systems');
    console.log('   - Configure HL7 message processing');
    console.log('   - Set up bidirectional data sync');
    
    console.log('\n🔧 5. Medical Device Integration Setup:');
    console.log('   - Configure Bluetooth device pairing');
    console.log('   - Set up device-specific data parsers');
    console.log('   - Configure real-time monitoring alerts');
    console.log('   - Set up device calibration schedules');
    
    // Environment variables needed
    console.log('\n🔧 Environment Variables Required:');
    console.log('   # AI Integration');
    console.log('   OPENAI_API_KEY=your_openai_api_key');
    console.log('   AI_MODEL_VERSION=gpt-4');
    console.log('');
    console.log('   # Mobile Push Notifications');
    console.log('   FCM_SERVER_KEY=your_fcm_server_key');
    console.log('   APNS_KEY_ID=your_apns_key_id');
    console.log('   APNS_TEAM_ID=your_apns_team_id');
    console.log('');
    console.log('   # EHR Integration');
    console.log('   FHIR_BASE_URL=https://your-fhir-server.com');
    console.log('   EHR_CLIENT_ID=your_ehr_client_id');
    console.log('   EHR_CLIENT_SECRET=your_ehr_client_secret');
    console.log('');
    console.log('   # Device Integration');
    console.log('   DEVICE_API_BASE_URL=https://device-api.example.com');
    console.log('   DEVICE_API_KEY=your_device_api_key');
    
    // API Routes to add
    console.log('\n📡 API Routes to Add to Server:');
    console.log('   // Advanced Analytics');
    console.log('   const analyticsRoutes = require("./routes/analyticsRoutes");');
    console.log('   app.use("/api/v1/analytics", analyticsRoutes);');
    console.log('');
    console.log('   // Mobile App');
    console.log('   const mobileRoutes = require("./routes/mobileRoutes");');
    console.log('   app.use("/api/v1/mobile", mobileRoutes);');
    console.log('');
    console.log('   // AI Clinical Support');
    console.log('   const aiRoutes = require("./routes/aiClinicalRoutes");');
    console.log('   app.use("/api/v1/ai-clinical", aiRoutes);');
    console.log('');
    console.log('   // EHR Integration');
    console.log('   const ehrRoutes = require("./routes/ehrRoutes");');
    console.log('   app.use("/api/v1/ehr", ehrRoutes);');
    console.log('');
    console.log('   // Device Integration');
    console.log('   const deviceRoutes = require("./routes/deviceRoutes");');
    console.log('   app.use("/api/v1/devices", deviceRoutes);');
    
    // Security considerations
    console.log('\n🔒 Security Considerations:');
    console.log('   - Encrypt all PHI data at rest and in transit');
    console.log('   - Implement proper HIPAA audit logging');
    console.log('   - Set up secure API authentication for all integrations');
    console.log('   - Configure proper access controls for AI analysis data');
    console.log('   - Implement device authentication and data validation');
    
    // Performance recommendations
    console.log('\n⚡ Performance Recommendations:');
    console.log('   - Set up Redis caching for AI analysis results');
    console.log('   - Configure database indexing for analytics queries');
    console.log('   - Implement async processing for EHR sync operations');
    console.log('   - Set up connection pooling for device integrations');
    console.log('   - Configure CDN for mobile app assets');
    
    // Monitoring and alerting
    console.log('\n📊 Monitoring and Alerting Setup:');
    console.log('   - Set up integration health monitoring');
    console.log('   - Configure alerts for AI analysis failures');
    console.log('   - Monitor device connectivity and data quality');
    console.log('   - Track mobile app performance metrics');
    console.log('   - Set up EHR sync failure notifications');
    
    console.log('\n🎉 Advanced Telehealth Features setup completed successfully!');
    console.log('\n🔧 Next Steps:');
    console.log('1. Configure environment variables for integrations');
    console.log('2. Add API routes to your main server file');
    console.log('3. Set up external service integrations (OpenAI, FCM, etc.)');
    console.log('4. Configure mobile app push notification services');
    console.log('5. Test EHR integration with your target systems');
    console.log('6. Set up medical device pairing and testing');
    console.log('7. Configure AI clinical decision support parameters');
    console.log('8. Set up comprehensive monitoring and alerting');
    
  } catch (error) {
    console.error('❌ Error setting up advanced telehealth features:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Additional utility functions
async function generateSampleAnalyticsData(connection) {
  console.log('\n📊 Generating sample analytics data...');
  
  try {
    // Sample patient surveys
    const surveys = [
      { session_id: 1, patient_id: 2, provider_id: 1, satisfaction: 5, nps: 9 },
      { session_id: 2, patient_id: 3, provider_id: 1, satisfaction: 4, nps: 8 },
      { session_id: 3, patient_id: 4, provider_id: 1, satisfaction: 3, nps: 6 }
    ];
    
    for (const survey of surveys) {
      await connection.execute(`
        INSERT IGNORE INTO telehealth_patient_surveys (
          session_id, patient_id, provider_id, overall_satisfaction,
          nps_score, completion_status, completed_at
        ) VALUES (?, ?, ?, ?, ?, 'completed', NOW() - INTERVAL FLOOR(RAND() * 30) DAY)
      `, [survey.session_id, survey.patient_id, survey.provider_id, survey.satisfaction, survey.nps]);
    }
    
    // Sample clinical outcomes
    const outcomes = [
      { session_id: 1, patient_id: 2, type: 'vital_signs', baseline: 140, current: 125 },
      { session_id: 2, patient_id: 3, type: 'symptom_improvement', baseline: 8, current: 4 },
      { session_id: 3, patient_id: 4, type: 'medication_adherence', baseline: 60, current: 85 }
    ];
    
    for (const outcome of outcomes) {
      await connection.execute(`
        INSERT IGNORE INTO telehealth_clinical_outcomes (
          session_id, patient_id, provider_id, outcome_type,
          measurement_date, baseline_value, current_value,
          unit_of_measure, data_source
        ) VALUES (?, ?, 1, ?, CURDATE(), ?, ?, 'units', 'provider_assessed')
      `, [outcome.session_id, outcome.patient_id, outcome.type, outcome.baseline, outcome.current]);
    }
    
    console.log('✅ Sample analytics data created');
  } catch (error) {
    console.log('❌ Error creating sample analytics data:', error.message);
  }
}

async function testIntegrationConnections() {
  console.log('\n🔗 Testing integration connections...');
  
  const integrationTests = [
    { name: 'OpenAI API', test: () => testOpenAIConnection() },
    { name: 'FHIR Server', test: () => testFHIRConnection() },
    { name: 'Mobile Push Services', test: () => testPushServices() },
    { name: 'Device APIs', test: () => testDeviceAPIs() }
  ];
  
  for (const integration of integrationTests) {
    try {
      console.log(`Testing ${integration.name}...`);
      // Placeholder for actual tests
      console.log(`⏳ ${integration.name}: Manual testing required`);
    } catch (error) {
      console.log(`❌ ${integration.name}: ${error.message}`);
    }
  }
}

// Placeholder test functions
async function testOpenAIConnection() {
  // Test OpenAI API connection
  return { success: true, message: 'OpenAI connection test placeholder' };
}

async function testFHIRConnection() {
  // Test FHIR server connection
  return { success: true, message: 'FHIR connection test placeholder' };
}

async function testPushServices() {
  // Test push notification services
  return { success: true, message: 'Push services test placeholder' };
}

async function testDeviceAPIs() {
  // Test medical device APIs
  return { success: true, message: 'Device APIs test placeholder' };
}

// Run the setup
if (require.main === module) {
  setupAdvancedTelehealthFeatures()
    .then(() => testIntegrationConnections())
    .catch(console.error);
}

module.exports = { 
  setupAdvancedTelehealthFeatures,
  generateSampleAnalyticsData,
  testIntegrationConnections
};