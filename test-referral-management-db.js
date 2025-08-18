#!/usr/bin/env node

/**
 * Referral Management System Database Test Script
 * Validates database schema, tests CRUD operations, and verifies system functionality
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ovhi_healthcare'
};

class ReferralManagementTester {
  constructor() {
    this.connection = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async connect() {
    try {
      this.connection = await mysql.createConnection(dbConfig);
      console.log('✓ Database connection established');
      return true;
    } catch (error) {
      console.error('✗ Database connection failed:', error.message);
      return false;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('✓ Database connection closed');
    }
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      this.testResults.passed++;
    } catch (error) {
      console.error(`❌ ${testName} - FAILED:`, error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
    }
  }

  async testTableStructure() {
    const expectedTables = [
      'referral_specialists',
      'referral_specialist_metrics',
      'referral_templates',
      'referral_template_variables',
      'referrals',
      'referral_attachments',
      'referral_status_history',
      'referral_authorizations',
      'referral_authorization_events',
      'referral_communications',
      'referral_notification_preferences',
      'referral_analytics_cache',
      'referral_quality_metrics',
      'referral_audit_logs',
      'referral_compliance_tracking',
      'referral_external_integrations',
      'referral_sync_logs'
    ];

    const [tables] = await this.connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE 'referral%'
    `);

    const existingTables = tables.map(t => t.table_name);
    
    for (const expectedTable of expectedTables) {
      if (!existingTables.includes(expectedTable)) {
        throw new Error(`Missing table: ${expectedTable}`);
      }
    }

    console.log(`  ✓ All ${expectedTables.length} tables exist`);
  }

  async testSampleData() {
    // Test specialists
    const [specialists] = await this.connection.execute('SELECT COUNT(*) as count FROM referral_specialists');
    if (specialists[0].count === 0) {
      throw new Error('No sample specialists found');
    }
    console.log(`  ✓ ${specialists[0].count} sample specialists loaded`);

    // Test templates
    const [templates] = await this.connection.execute('SELECT COUNT(*) as count FROM referral_templates');
    if (templates[0].count === 0) {
      throw new Error('No sample templates found');
    }
    console.log(`  ✓ ${templates[0].count} sample templates loaded`);
  }

  async testReferralCRUD() {
    const testReferralId = `TEST_REF_${Date.now()}`;
    const testReferralNumber = `REF${String(Date.now()).slice(-6)}`;

    // Create
    await this.connection.execute(`
      INSERT INTO referrals (
        id, referral_number, patient_id, provider_id, specialist_id,
        specialty_type, referral_reason, clinical_notes, urgency_level, status
      ) VALUES (?, ?, 'TEST_PATIENT', 'TEST_PROVIDER', 'SPEC001',
        'Cardiology', 'Test referral', 'Test clinical notes', 'routine', 'draft')
    `, [testReferralId, testReferralNumber]);
    console.log('  ✓ Referral created successfully');

    // Read
    const [referrals] = await this.connection.execute(
      'SELECT * FROM referrals WHERE id = ?', [testReferralId]
    );
    if (referrals.length === 0) {
      throw new Error('Created referral not found');
    }
    console.log('  ✓ Referral retrieved successfully');

    // Update
    await this.connection.execute(
      'UPDATE referrals SET status = ? WHERE id = ?', ['sent', testReferralId]
    );
    
    const [updatedReferrals] = await this.connection.execute(
      'SELECT status FROM referrals WHERE id = ?', [testReferralId]
    );
    if (updatedReferrals[0].status !== 'sent') {
      throw new Error('Referral update failed');
    }
    console.log('  ✓ Referral updated successfully');

    // Delete
    await this.connection.execute('DELETE FROM referrals WHERE id = ?', [testReferralId]);
    console.log('  ✓ Referral deleted successfully');
  }

  async testStatusHistory() {
    const testReferralId = `TEST_REF_HISTORY_${Date.now()}`;
    const testReferralNumber = `REF${String(Date.now()).slice(-6)}`;

    // Create referral
    await this.connection.execute(`
      INSERT INTO referrals (
        id, referral_number, patient_id, provider_id, specialty_type,
        referral_reason, status
      ) VALUES (?, ?, 'TEST_PATIENT', 'TEST_PROVIDER', 'Cardiology',
        'Test referral', 'draft')
    `, [testReferralId, testReferralNumber]);

    // Add status history
    await this.connection.execute(`
      INSERT INTO referral_status_history (
        referral_id, previous_status, new_status, status_reason, changed_by
      ) VALUES (?, 'draft', 'sent', 'Referral letter sent to specialist', 'TEST_USER')
    `, [testReferralId]);

    const [history] = await this.connection.execute(
      'SELECT * FROM referral_status_history WHERE referral_id = ?', [testReferralId]
    );

    if (history.length === 0) {
      throw new Error('Status history not created');
    }

    console.log('  ✓ Status history tracking works');

    // Cleanup
    await this.connection.execute('DELETE FROM referrals WHERE id = ?', [testReferralId]);
  }

  async testAttachments() {
    const testReferralId = `TEST_REF_ATTACH_${Date.now()}`;
    const testReferralNumber = `REF${String(Date.now()).slice(-6)}`;
    const testAttachmentId = `ATTACH_${Date.now()}`;

    // Create referral
    await this.connection.execute(`
      INSERT INTO referrals (
        id, referral_number, patient_id, provider_id, specialty_type,
        referral_reason, status
      ) VALUES (?, ?, 'TEST_PATIENT', 'TEST_PROVIDER', 'Cardiology',
        'Test referral', 'draft')
    `, [testReferralId, testReferralNumber]);

    // Add attachment
    await this.connection.execute(`
      INSERT INTO referral_attachments (
        id, referral_id, file_name, file_path, file_type, attachment_type
      ) VALUES (?, ?, 'test_lab_result.pdf', '/uploads/test.pdf', 'application/pdf', 'lab_result')
    `, [testAttachmentId, testReferralId]);

    const [attachments] = await this.connection.execute(
      'SELECT * FROM referral_attachments WHERE referral_id = ?', [testReferralId]
    );

    if (attachments.length === 0) {
      throw new Error('Attachment not created');
    }

    console.log('  ✓ Attachment management works');

    // Cleanup
    await this.connection.execute('DELETE FROM referrals WHERE id = ?', [testReferralId]);
  }

  async testAuthorizations() {
    const testAuthId = `AUTH_${Date.now()}`;
    const testReferralId = `TEST_REF_AUTH_${Date.now()}`;
    const testReferralNumber = `REF${String(Date.now()).slice(-6)}`;

    // Create referral
    await this.connection.execute(`
      INSERT INTO referrals (
        id, referral_number, patient_id, provider_id, specialty_type,
        referral_reason, status, authorization_required
      ) VALUES (?, ?, 'TEST_PATIENT', 'TEST_PROVIDER', 'Cardiology',
        'Test referral', 'draft', TRUE)
    `, [testReferralId, testReferralNumber]);

    // Create authorization
    await this.connection.execute(`
      INSERT INTO referral_authorizations (
        id, referral_id, authorization_type, request_date, requested_services,
        clinical_justification, status
      ) VALUES (?, ?, 'referral', CURDATE(), '["consultation"]',
        'Patient requires cardiology evaluation', 'pending')
    `, [testAuthId, testReferralId]);

    const [auths] = await this.connection.execute(
      'SELECT * FROM referral_authorizations WHERE referral_id = ?', [testReferralId]
    );

    if (auths.length === 0) {
      throw new Error('Authorization not created');
    }

    console.log('  ✓ Authorization management works');

    // Cleanup
    await this.connection.execute('DELETE FROM referrals WHERE id = ?', [testReferralId]);
  }

  async testIndexes() {
    const [indexes] = await this.connection.execute(`
      SELECT DISTINCT table_name, index_name 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE 'referral%'
      AND index_name != 'PRIMARY'
    `);

    if (indexes.length === 0) {
      throw new Error('No indexes found on referral tables');
    }

    console.log(`  ✓ ${indexes.length} indexes created for performance`);
  }

  async testForeignKeys() {
    const [foreignKeys] = await this.connection.execute(`
      SELECT table_name, constraint_name, referenced_table_name
      FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE()
      AND table_name LIKE 'referral%'
      AND referenced_table_name IS NOT NULL
    `);

    if (foreignKeys.length === 0) {
      throw new Error('No foreign key constraints found');
    }

    console.log(`  ✓ ${foreignKeys.length} foreign key constraints established`);
  }

  async runAllTests() {
    console.log('🏥 Referral Management System Database Tests');
    console.log('===========================================\n');

    if (!(await this.connect())) {
      return false;
    }

    await this.runTest('Table Structure', () => this.testTableStructure());
    await this.runTest('Sample Data', () => this.testSampleData());
    await this.runTest('Referral CRUD Operations', () => this.testReferralCRUD());
    await this.runTest('Status History Tracking', () => this.testStatusHistory());
    await this.runTest('Attachment Management', () => this.testAttachments());
    await this.runTest('Authorization Management', () => this.testAuthorizations());
    await this.runTest('Database Indexes', () => this.testIndexes());
    await this.runTest('Foreign Key Constraints', () => this.testForeignKeys());

    await this.disconnect();

    // Print results
    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);

    if (this.testResults.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.error}`);
      });
      return false;
    }

    console.log('\n🎉 All tests passed! Referral Management System is ready to use.');
    return true;
  }
}

// Handle command line execution
if (require.main === module) {
  const tester = new ReferralManagementTester();
  
  tester.runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = ReferralManagementTester;