const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * Referral Management System Database Migration
 * Creates all tables and initial data for comprehensive referral management
 */

async function up(connection) {
  console.log('Starting Referral Management System migration...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, '../sql/referral_management_schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          // Log warning for non-critical errors (like duplicate entries)
          if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`⚠ Statement ${i + 1}: ${error.message} (skipped)`);
          } else {
            console.error(`✗ Error in statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    // Verify table creation
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name LIKE 'referral%'
      ORDER BY table_name
    `);
    
    console.log('✓ Referral Management tables created:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Create initial sequence for referral numbers
    await connection.execute(`
      INSERT IGNORE INTO document_sequences (document_type, prefix, current_number, suffix, number_length)
      VALUES ('referral', 'REF', 1000, '', 6)
    `);
    
    console.log('✓ Referral Management System migration completed successfully!');
    
    return {
      success: true,
      tablesCreated: tables.length,
      message: 'Referral Management System installed successfully'
    };
    
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  }
}

async function down(connection) {
  console.log('Rolling back Referral Management System migration...');
  
  try {
    // List of tables to drop in reverse dependency order
    const tablesToDrop = [
      'referral_sync_logs',
      'referral_external_integrations',
      'referral_compliance_tracking',
      'referral_audit_logs',
      'referral_quality_metrics',
      'referral_analytics_cache',
      'referral_notification_preferences',
      'referral_communications',
      'referral_authorization_events',
      'referral_authorizations',
      'referral_status_history',
      'referral_attachments',
      'referrals',
      'referral_template_variables',
      'referral_templates',
      'referral_specialist_metrics',
      'referral_specialists'
    ];
    
    for (const table of tablesToDrop) {
      try {
        await connection.execute(`DROP TABLE IF EXISTS ${table}`);
        console.log(`✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`⚠ Could not drop table ${table}: ${error.message}`);
      }
    }
    
    // Remove referral document sequence
    await connection.execute(`
      DELETE FROM document_sequences WHERE document_type = 'referral'
    `);
    
    console.log('✓ Referral Management System rollback completed');
    
    return {
      success: true,
      message: 'Referral Management System removed successfully'
    };
    
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    throw error;
  }
}

module.exports = {
  up,
  down,
  description: 'Create comprehensive referral management system tables and initial data'
};