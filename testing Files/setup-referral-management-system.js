#!/usr/bin/env node

/**
 * Referral Management System Setup Script
 * Initializes the comprehensive referral management system with database schema,
 * sample data, and configuration
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ovhi_healthcare',
  multipleStatements: true
};

async function setupReferralManagementSystem() {
  let connection;
  
  try {
    console.log('🏥 OVHI Referral Management System Setup');
    console.log('=====================================\n');
    
    // Connect to database
    console.log('📊 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Database connected successfully\n');
    
    // Check if document_sequences table exists (required for referral numbering)
    console.log('🔍 Checking system dependencies...');
    const [sequenceTable] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'document_sequences'
    `);
    
    if (sequenceTable[0].count === 0) {
      console.log('⚠ Document sequences table not found. Creating...');
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS document_sequences (
          id INT PRIMARY KEY AUTO_INCREMENT,
          document_type VARCHAR(50) UNIQUE NOT NULL,
          prefix VARCHAR(10) DEFAULT '',
          current_number INT DEFAULT 1000,
          suffix VARCHAR(10) DEFAULT '',
          number_length INT DEFAULT 6,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Document sequences table created');
    }
    
    // Run the migration
    console.log('🚀 Running referral management migration...');
    const migration = require('../server/migrations/003_create_referral_management_tables.js');
    const result = await migration.up(connection);
    
    if (result.success) {
      console.log(`✓ Migration completed: ${result.tablesCreated} tables created\n`);
    }
    
    // Verify installation
    console.log('🔍 Verifying installation...');
    
    // Check tables
    const [tables] = await connection.execute(`
      SELECT table_name, table_rows 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE 'referral%'
      ORDER BY table_name
    `);
    
    console.log('📋 Referral Management Tables:');
    tables.forEach(table => {
      console.log(`  ✓ ${table.table_name} (${table.table_rows || 0} rows)`);
    });
    
    // Check sample data
    const [specialists] = await connection.execute('SELECT COUNT(*) as count FROM referral_specialists');
    const [templates] = await connection.execute('SELECT COUNT(*) as count FROM referral_templates');
    
    console.log('\n📊 Sample Data Verification:');
    console.log(`  ✓ Specialists: ${specialists[0].count} records`);
    console.log(`  ✓ Templates: ${templates[0].count} records`);
    
    // Test referral number generation
    console.log('\n🧪 Testing referral number generation...');
    const [sequence] = await connection.execute(`
      SELECT * FROM document_sequences WHERE document_type = 'referral'
    `);
    
    if (sequence.length > 0) {
      console.log(`  ✓ Referral numbering: ${sequence[0].prefix}${String(sequence[0].current_number).padStart(sequence[0].number_length, '0')}`);
    }
    
    // Create test referral (optional)
    if (process.argv.includes('--with-test-data')) {
      console.log('\n🧪 Creating test referral...');
      
      const testReferralId = `REF_TEST_${Date.now()}`;
      await connection.execute(`
        INSERT INTO referrals (
          id, referral_number, patient_id, provider_id, specialist_id,
          specialty_type, referral_reason, clinical_notes, urgency_level,
          status, authorization_required
        ) VALUES (?, ?, 'TEST_PATIENT', 'TEST_PROVIDER', 'SPEC001',
          'Cardiology', 'Chest pain evaluation', 'Patient reports intermittent chest pain with exertion', 'routine',
          'draft', FALSE)
      `, [testReferralId, `REF${String(Date.now()).slice(-6)}`]);
      
      console.log('  ✓ Test referral created successfully');
    }
    
    console.log('\n🎉 Referral Management System Setup Complete!');
    console.log('===============================================');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Start your application server');
    console.log('2. Access the referral management dashboard');
    console.log('3. Configure specialist directory');
    console.log('4. Customize referral templates');
    console.log('');
    console.log('For testing with sample data, run:');
    console.log('node setup-referral-management-system.js --with-test-data');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Handle command line execution
if (require.main === module) {
  setupReferralManagementSystem()
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = {
  setupReferralManagementSystem,
  dbConfig
};