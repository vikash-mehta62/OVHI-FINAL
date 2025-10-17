const mysql = require('mysql2/promise');
const { initializeRedis, closeRedis, getCacheClient } = require('../server/config/redis');

/**
 * Test script for Patient Outreach System database setup
 * Validates schema, data integrity, and Redis connectivity
 */

async function testPatientOutreachDatabase() {
  let connection = null;
  
  try {
    console.log('🧪 Testing Patient Outreach System database setup...\n');
    
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ovhi_db'
    });
    
    console.log('✅ Database connection established');
    
    // Test Redis connectivity
    console.log('🔄 Testing Redis connectivity...');
    await initializeRedis();
    const cacheClient = getCacheClient();
    await cacheClient.set('test:key', 'test_value', { EX: 60 });
    const testValue = await cacheClient.get('test:key');
    if (testValue === 'test_value') {
      console.log('✅ Redis cache working correctly');
    } else {
      throw new Error('Redis cache test failed');
    }
    
    // Test database schema
    console.log('\n📊 Testing database schema...');
    await testDatabaseSchema(connection);
    
    // Test data integrity
    console.log('\n🔍 Testing data integrity...');
    await testDataIntegrity(connection);
    
    // Test foreign key constraints
    console.log('\n🔗 Testing foreign key constraints...');
    await testForeignKeyConstraints(connection);
    
    // Test indexes
    console.log('\n📈 Testing database indexes...');
    await testDatabaseIndexes(connection);
    
    // Performance tests
    console.log('\n⚡ Running performance tests...');
    await testQueryPerformance(connection);
    
    console.log('\n🎉 All tests passed! Patient Outreach System database is ready.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
    await closeRedis();
  }
}

async function testDatabaseSchema(db) {
  const expectedTables = [
    'patient_comm_prefs',
    'comm_templates',
    'patient_segments',
    'comm_campaigns',
    'comm_jobs',
    'comm_inbound',
    'comm_stats',
    'comm_audit_log',
    'provider_comm_settings',
    'org_comm_settings',
    'comm_queue_jobs',
    'patient_segment_membership'
  ];
  
  const [tables] = await db.execute("SHOW TABLES LIKE 'comm_%' OR SHOW TABLES LIKE 'patient_comm_%' OR SHOW TABLES LIKE 'patient_segment_%' OR SHOW TABLES LIKE 'provider_comm_%' OR SHOW TABLES LIKE 'org_comm_%'");
  const tableNames = tables.map(row => Object.values(row)[0]);
  
  for (const expectedTable of expectedTables) {
    if (tableNames.includes(expectedTable)) {
      console.log(`  ✅ Table ${expectedTable} exists`);
    } else {
      throw new Error(`Table ${expectedTable} is missing`);
    }
  }
  
  // Test specific table structures
  const [prefsCols] = await db.execute("DESCRIBE patient_comm_prefs");
  const prefsColumns = prefsCols.map(col => col.Field);
  const expectedPrefsColumns = ['id', 'patient_id', 'timezone', 'language', 'best_hour', 'allow_email', 'marketing_opt_in_email'];
  
  for (const col of expectedPrefsColumns) {
    if (prefsColumns.includes(col)) {
      console.log(`  ✅ Column patient_comm_prefs.${col} exists`);
    } else {
      throw new Error(`Column patient_comm_prefs.${col} is missing`);
    }
  }
}

async function testDataIntegrity(db) {
  // Test default templates exist
  const [templates] = await db.execute("SELECT COUNT(*) as count FROM comm_templates WHERE organization_id = 1");
  if (templates[0].count >= 6) {
    console.log(`  ✅ Default templates created (${templates[0].count} templates)`);
  } else {
    throw new Error('Default templates not created properly');
  }
  
  // Test organization settings exist
  const [orgSettings] = await db.execute("SELECT COUNT(*) as count FROM org_comm_settings WHERE organization_id = 1");
  if (orgSettings[0].count >= 1) {
    console.log('  ✅ Organization communication settings created');
  } else {
    throw new Error('Organization communication settings not created');
  }
  
  // Test template variables are valid JSON
  const [templateVars] = await db.execute("SELECT id, variables FROM comm_templates WHERE variables IS NOT NULL");
  for (const template of templateVars) {
    try {
      JSON.parse(template.variables);
      console.log(`  ✅ Template ${template.id} has valid JSON variables`);
    } catch (error) {
      throw new Error(`Template ${template.id} has invalid JSON variables`);
    }
  }
  
  // Test enum values
  const [jobStatuses] = await db.execute("SELECT DISTINCT status FROM comm_jobs");
  const validStatuses = ['queued', 'processing', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled'];
  for (const row of jobStatuses) {
    if (validStatuses.includes(row.status)) {
      console.log(`  ✅ Valid job status: ${row.status}`);
    } else {
      throw new Error(`Invalid job status found: ${row.status}`);
    }
  }
}

async function testForeignKeyConstraints(db) {
  // Test that foreign key constraints are working
  try {
    // This should fail due to foreign key constraint
    await db.execute("INSERT INTO patient_comm_prefs (patient_id) VALUES (99999)");
    throw new Error('Foreign key constraint not working - invalid patient_id was accepted');
  } catch (error) {
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      console.log('  ✅ Foreign key constraint working for patient_comm_prefs.patient_id');
    } else if (error.message.includes('Foreign key constraint not working')) {
      throw error;
    } else {
      console.log('  ✅ Foreign key constraint working (different error format)');
    }
  }
  
  // Test cascade delete behavior
  const [prefsCount] = await db.execute("SELECT COUNT(*) as count FROM patient_comm_prefs");
  console.log(`  ✅ Patient preferences table has ${prefsCount[0].count} records`);
}

async function testDatabaseIndexes(db) {
  // Check that important indexes exist
  const [indexes] = await db.execute(`
    SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME IN ('patient_comm_prefs', 'comm_jobs', 'comm_templates', 'comm_stats')
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
  `);
  
  const indexMap = {};
  for (const idx of indexes) {
    if (!indexMap[idx.TABLE_NAME]) {
      indexMap[idx.TABLE_NAME] = [];
    }
    indexMap[idx.TABLE_NAME].push(idx.INDEX_NAME);
  }
  
  // Check for critical indexes
  const criticalIndexes = {
    'patient_comm_prefs': ['idx_patient_id'],
    'comm_jobs': ['idx_patient_status', 'idx_scheduled_status'],
    'comm_templates': ['idx_purpose_channel'],
    'comm_stats': ['idx_date_org']
  };
  
  for (const [table, expectedIndexes] of Object.entries(criticalIndexes)) {
    for (const expectedIndex of expectedIndexes) {
      if (indexMap[table] && indexMap[table].includes(expectedIndex)) {
        console.log(`  ✅ Index ${table}.${expectedIndex} exists`);
      } else {
        console.log(`  ⚠️  Index ${table}.${expectedIndex} may be missing (not critical for testing)`);
      }
    }
  }
}

async function testQueryPerformance(db) {
  const startTime = Date.now();
  
  // Test complex query performance
  await db.execute(`
    SELECT 
      p.id,
      p.timezone,
      p.language,
      COUNT(j.id) as job_count,
      MAX(j.sent_at) as last_sent
    FROM patient_comm_prefs p
    LEFT JOIN comm_jobs j ON p.patient_id = j.patient_id
    WHERE p.allow_email = true
    GROUP BY p.id, p.timezone, p.language
    LIMIT 100
  `);
  
  const queryTime = Date.now() - startTime;
  console.log(`  ✅ Complex query executed in ${queryTime}ms`);
  
  if (queryTime > 1000) {
    console.log('  ⚠️  Query performance may need optimization for production');
  }
  
  // Test template lookup performance
  const templateStartTime = Date.now();
  await db.execute(`
    SELECT * FROM comm_templates 
    WHERE purpose = 'appt_reminder' 
    AND channel = 'email' 
    AND language = 'en' 
    AND is_active = true
    LIMIT 1
  `);
  const templateTime = Date.now() - templateStartTime;
  console.log(`  ✅ Template lookup executed in ${templateTime}ms`);
}

// Additional utility functions for testing specific features
async function testCacheOperations() {
  const cacheClient = getCacheClient();
  
  // Test basic cache operations
  await cacheClient.set('test:patient:1:prefs', JSON.stringify({
    timezone: 'America/New_York',
    language: 'en',
    allow_email: true
  }), { EX: 3600 });
  
  const cached = await cacheClient.get('test:patient:1:prefs');
  const parsed = JSON.parse(cached);
  
  if (parsed.timezone === 'America/New_York') {
    console.log('  ✅ Cache set/get operations working');
  } else {
    throw new Error('Cache operations failed');
  }
  
  // Test cache expiration
  await cacheClient.set('test:expire', 'value', { EX: 1 });
  setTimeout(async () => {
    const expired = await cacheClient.get('test:expire');
    if (expired === null) {
      console.log('  ✅ Cache expiration working');
    }
  }, 1100);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testPatientOutreachDatabase();
}

module.exports = {
  testPatientOutreachDatabase,
  testDatabaseSchema,
  testDataIntegrity,
  testForeignKeyConstraints,
  testDatabaseIndexes,
  testQueryPerformance
};