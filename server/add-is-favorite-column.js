const connection = require('./config/db');

async function addIsFavoriteColumn() {
  try {
    console.log('🔄 Starting migration: Adding is_favorite column to patient_diagnoses table...');

    // Check if column already exists
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'patient_diagnoses' 
        AND COLUMN_NAME = 'is_favorite'
    `);

    if (columns.length > 0) {
      console.log('✅ Column is_favorite already exists in patient_diagnoses table');
      process.exit(0);
    }

    // Add the column
    await connection.query(`
      ALTER TABLE patient_diagnoses 
      ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE AFTER status
    `);
    console.log('✅ Column is_favorite added successfully');

    // Update existing records
    await connection.query(`
      UPDATE patient_diagnoses 
      SET is_favorite = FALSE 
      WHERE is_favorite IS NULL
    `);
    console.log('✅ Existing records updated with default value');

    // Add index
    await connection.query(`
      CREATE INDEX idx_patient_diagnoses_is_favorite 
      ON patient_diagnoses(patient_id, is_favorite)
    `);
    console.log('✅ Index created successfully');

    console.log('🎉 Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    if (error.code === 'ER_DUP_KEYNAME') {
      console.log('ℹ️ Index already exists, skipping...');
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    } else {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }
}

addIsFavoriteColumn();
