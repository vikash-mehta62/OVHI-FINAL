const connection = require('./config/db');

async function verifyColumn() {
  try {
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'patient_diagnoses' 
        AND COLUMN_NAME = 'is_favorite'
    `);

    if (columns.length > 0) {
      console.log('✅ is_favorite column exists in patient_diagnoses table');
      console.log('Column details:', columns[0]);
      
      // Get count of diagnoses
      const [count] = await connection.query(`
        SELECT COUNT(*) as total FROM patient_diagnoses
      `);
      console.log(`Total diagnoses in table: ${count[0].total}`);
    } else {
      console.log('❌ is_favorite column NOT found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verifyColumn();
