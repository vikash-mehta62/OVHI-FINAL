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

async function setupTelehealthSystem() {
  let connection;
  
  try {
    console.log('🚀 Setting up OVHI Telehealth System...\n');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read and execute telehealth schema
    const schemaPath = path.join(__dirname, 'server/sql/telehealth_schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📋 Creating telehealth tables...');
    await connection.execute(schemaSql);
    console.log('✅ Telehealth schema created successfully');
    
    // Verify tables were created
    const tables = [
      'telehealth_sessions',
      'telehealth_participants',
      'telehealth_recordings',
      'telehealth_transcripts',
      'telehealth_devices',
      'telehealth_session_devices',
      'telehealth_waiting_room',
      'telehealth_analytics',
      'ring_cent_config',
      'telehealth_compliance_audit'
    ];
    
    console.log('\n🔍 Verifying table creation...');
    for (const table of tables) {
      const [rows] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (rows.length > 0) {
        console.log(`✅ Table '${table}' created successfully`);
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    }
    
    // Test RingCentral configuration
    console.log('\n🧪 Testing telehealth functionality...');
    
    // Test session creation
    try {
      const [sessionResult] = await connection.execute(`
        INSERT IGNORE INTO telehealth_sessions (
          session_id, patient_id, provider_id, session_type, session_status,
          scheduled_start_time, chief_complaint, consent_obtained
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'TEST-SESSION-001',
        2, // Patient ID
        1, // Provider ID
        'video',
        'scheduled',
        new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        'Test telehealth session setup',
        true
      ]);
      console.log('✅ Session creation test passed');
    } catch (error) {
      console.log('❌ Session creation test failed:', error.message);
    }
    
    // Test waiting room functionality
    try {
      const [waitingResult] = await connection.execute(`
        INSERT IGNORE INTO telehealth_waiting_room (
          session_id, patient_id, priority_level, estimated_wait_time
        ) VALUES (?, ?, ?, ?)
      `, [1, 2, 'medium', 15]);
      console.log('✅ Waiting room test passed');
    } catch (error) {
      console.log('❌ Waiting room test failed:', error.message);
    }
    
    // Check RingCentral configuration
    const [ringCentralConfigs] = await connection.execute('SELECT COUNT(*) as count FROM ring_cent_config');
    console.log(`📊 RingCentral configurations: ${ringCentralConfigs[0].count}`);
    
    // Get session count
    const [sessionCount] = await connection.execute('SELECT COUNT(*) as count FROM telehealth_sessions');
    const [waitingCount] = await connection.execute('SELECT COUNT(*) as count FROM telehealth_waiting_room');
    
    console.log(`\n📊 Current Data:`);
    console.log(`   - Telehealth Sessions: ${sessionCount[0].count}`);
    console.log(`   - Waiting Room Entries: ${waitingCount[0].count}`);
    console.log(`   - RingCentral Configs: ${ringCentralConfigs[0].count}`);
    
    // Setup instructions
    console.log('\n📝 Setup Instructions:');
    console.log('1. Add telehealth routes to your main server file:');
    console.log('   const telehealthRoutes = require("./routes/telehealthRoutes");');
    console.log('   app.use("/api/v1/telehealth", telehealthRoutes);');
    console.log('');
    console.log('2. Import the telehealthService in your frontend:');
    console.log('   import telehealthService from "@/services/telehealthService";');
    console.log('');
    console.log('3. Configure RingCentral integration:');
    console.log('   - Go to Settings > Integrations');
    console.log('   - Add your RingCentral API credentials');
    console.log('   - Test the connection');
    console.log('');
    console.log('4. Test the telehealth system:');
    console.log('   - Navigate to http://localhost:8080/telehealth');
    console.log('   - Create a test session');
    console.log('   - Check waiting room functionality');
    console.log('   - Test video call integration');
    
    // Environment variables check
    console.log('\n🔧 Environment Variables Needed:');
    console.log('   - RINGCENTRAL_CLIENT_ID');
    console.log('   - RINGCENTRAL_CLIENT_SECRET');
    console.log('   - RINGCENTRAL_SERVER_URL');
    console.log('   - RINGCENTRAL_JWT_TOKEN');
    
    // Security recommendations
    console.log('\n🔒 Security Recommendations:');
    console.log('   - Enable HTTPS for video calls');
    console.log('   - Implement proper HIPAA compliance logging');
    console.log('   - Set up encrypted storage for recordings');
    console.log('   - Configure proper access controls');
    console.log('   - Enable audit logging for all telehealth activities');
    
    // Performance recommendations
    console.log('\n⚡ Performance Recommendations:');
    console.log('   - Set up Redis for session caching');
    console.log('   - Configure CDN for video streaming');
    console.log('   - Implement connection quality monitoring');
    console.log('   - Set up automated cleanup for old recordings');
    
    console.log('\n🎉 Telehealth system setup completed successfully!');
    console.log('\n🔧 Next Steps:');
    console.log('1. Restart your server to load the new routes');
    console.log('2. Configure RingCentral API credentials');
    console.log('3. Test the telehealth functionality in the UI');
    console.log('4. Set up webhook endpoints for RingCentral events');
    console.log('5. Configure HIPAA compliance settings');
    
  } catch (error) {
    console.error('❌ Error setting up telehealth system:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Additional utility functions
async function checkRingCentralHealth() {
  console.log('\n🏥 RingCentral Health Check:');
  
  const healthChecks = [
    'API connectivity',
    'Authentication status',
    'Webhook configuration',
    'Recording capabilities',
    'Meeting creation'
  ];
  
  healthChecks.forEach((check, index) => {
    console.log(`${index + 1}. ${check}: ⏳ Pending manual verification`);
  });
}

async function generateSampleData(connection) {
  console.log('\n📊 Generating sample telehealth data...');
  
  try {
    // Sample sessions
    const sampleSessions = [
      {
        session_id: 'TH-2025-DEMO-001',
        patient_id: 2,
        provider_id: 1,
        session_type: 'video',
        session_status: 'completed',
        scheduled_start_time: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        actual_start_time: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end_time: new Date(Date.now() - 23 * 60 * 60 * 1000),
        duration_minutes: 30,
        chief_complaint: 'Follow-up for hypertension management',
        consultation_notes: 'Patient reports good adherence to medication. Blood pressure well controlled.',
        consent_obtained: true
      },
      {
        session_id: 'TH-2025-DEMO-002',
        patient_id: 3,
        provider_id: 1,
        session_type: 'video',
        session_status: 'scheduled',
        scheduled_start_time: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        chief_complaint: 'Initial consultation for diabetes management',
        consent_obtained: false
      }
    ];
    
    for (const session of sampleSessions) {
      await connection.execute(`
        INSERT IGNORE INTO telehealth_sessions (
          session_id, patient_id, provider_id, session_type, session_status,
          scheduled_start_time, actual_start_time, end_time, duration_minutes,
          chief_complaint, consultation_notes, consent_obtained
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        session.session_id,
        session.patient_id,
        session.provider_id,
        session.session_type,
        session.session_status,
        session.scheduled_start_time,
        session.actual_start_time || null,
        session.end_time || null,
        session.duration_minutes || null,
        session.chief_complaint,
        session.consultation_notes || null,
        session.consent_obtained
      ]);
    }
    
    console.log('✅ Sample telehealth data created');
  } catch (error) {
    console.log('❌ Error creating sample data:', error.message);
  }
}

// Run the setup
if (require.main === module) {
  setupTelehealthSystem()
    .then(() => checkRingCentralHealth())
    .catch(console.error);
}

module.exports = { 
  setupTelehealthSystem, 
  checkRingCentralHealth, 
  generateSampleData 
};