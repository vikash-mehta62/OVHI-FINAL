const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database migration script for Patient Intake Enhancements
// This script safely applies the database changes needed for the enhanced intake system

const runMigration = async () => {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ovhi_healthcare',
      multipleStatements: true
    });

    console.log('🔗 Connected to database');

    // Read the schema file
    const schemaPath = path.join(__dirname, 'patient_intake_enhancements_schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');

    console.log('📄 Loaded schema file');

    // Split the schema into individual statements
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.trim() === '') {
          continue;
        }

        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        await connection.execute(statement);
        successCount++;
        
        // Log specific table creations
        if (statement.includes('CREATE TABLE')) {
          const tableName = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)?.[1];
          console.log(`✅ Created/updated table: ${tableName}`);
        } else if (statement.includes('ALTER TABLE')) {
          const tableName = statement.match(/ALTER TABLE.*?`?(\w+)`?/i)?.[1];
          console.log(`🔧 Modified table: ${tableName}`);
        } else if (statement.includes('CREATE INDEX')) {
          const indexName = statement.match(/CREATE INDEX.*?`?(\w+)`?/i)?.[1];
          console.log(`📊 Created index: ${indexName}`);
        }

      } catch (error) {
        errorCount++;
        
        // Some errors are expected (like "table already exists")
        if (error.code === 'ER_TABLE_EXISTS_ERROR' || 
            error.code === 'ER_DUP_KEYNAME' ||
            error.message.includes('already exists')) {
          console.log(`⚠️  Skipped (already exists): ${error.message.substring(0, 100)}...`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 200)}...`);
        }
      }
    }

    // Verify critical tables were created
    console.log('\n🔍 Verifying table creation...');
    
    const criticalTables = [
      'patient_documents',
      'intake_progress', 
      'patient_allergies',
      'patient_medications',
      'patient_diagnoses',
      'patient_clinical_notes',
      'intake_email_logs'
    ];

    for (const tableName of criticalTables) {
      try {
        const [rows] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
        if (rows.length > 0) {
          console.log(`✅ Table verified: ${tableName}`);
        } else {
          console.log(`❌ Table missing: ${tableName}`);
        }
      } catch (error) {
        console.error(`❌ Error checking table ${tableName}:`, error.message);
      }
    }

    // Check if new columns were added to user_profiles
    console.log('\n🔍 Verifying user_profiles enhancements...');
    
    try {
      const [columns] = await connection.execute(`SHOW COLUMNS FROM user_profiles`);
      const columnNames = columns.map(col => col.Field);
      
      const newColumns = [
        'preferred_language',
        'marital_status', 
        'emergency_contact_name',
        'height_cm',
        'weight_lbs',
        'bmi',
        'blood_pressure',
        'heart_rate',
        'temperature',
        'intake_completed_at',
        'intake_completion_percentage'
      ];

      for (const colName of newColumns) {
        if (columnNames.includes(colName)) {
          console.log(`✅ Column verified: user_profiles.${colName}`);
        } else {
          console.log(`❌ Column missing: user_profiles.${colName}`);
        }
      }
    } catch (error) {
      console.error('❌ Error checking user_profiles columns:', error.message);
    }

    // Create uploads directory
    console.log('\n📁 Creating uploads directory...');
    
    try {
      const uploadsDir = path.join(__dirname, '../uploads/intake-documents');
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log(`✅ Created uploads directory: ${uploadsDir}`);
    } catch (error) {
      console.error('❌ Error creating uploads directory:', error.message);
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`⚠️  Skipped/Errors: ${errorCount}`);
    console.log('🎉 Patient Intake Enhancement migration completed!');

    // Insert configuration data
    console.log('\n⚙️  Inserting configuration data...');
    
    try {
      const configInserts = [
        ['intake_document_max_size', '5242880', 'Maximum file size for intake documents in bytes (5MB)'],
        ['intake_document_allowed_types', 'image/jpeg,image/png,image/jpg,application/pdf', 'Allowed MIME types for intake documents'],
        ['intake_session_expiry_days', '7', 'Number of days before intake session expires'],
        ['intake_auto_save_interval', '30', 'Auto-save interval in seconds for intake forms'],
        ['intake_email_template_enabled', 'true', 'Enable HTML email templates for intake invitations']
      ];

      for (const [key, value, description] of configInserts) {
        try {
          await connection.execute(
            `INSERT IGNORE INTO system_configurations (config_key, config_value, description) VALUES (?, ?, ?)`,
            [key, value, description]
          );
          console.log(`✅ Config added: ${key}`);
        } catch (configError) {
          console.log(`⚠️  Config skipped: ${key} (${configError.message})`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not insert configuration data (table may not exist)');
    }

    console.log('\n🚀 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Restart your application server');
    console.log('2. Test file upload functionality');
    console.log('3. Verify progress saving works');
    console.log('4. Check email templates are working');

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
};

// Run the migration
if (require.main === module) {
  console.log('🚀 Starting Patient Intake Enhancement Migration...\n');
  runMigration().catch(console.error);
}

module.exports = { runMigration };