const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'varn-health'
});

async function checkPaymentsTable() {
  console.log('🔍 Checking payments table...');
  
  try {
    // Check if payments table exists
    const tables = await new Promise((resolve, reject) => {
      connection.query("SHOW TABLES LIKE 'payments'", (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    if (tables.length === 0) {
      console.log('❌ Payments table does not exist!');
      return;
    }
    
    console.log('✅ Payments table exists');
    
    // Get table structure
    const structure = await new Promise((resolve, reject) => {
      connection.query('DESCRIBE payments', (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('📋 Payments table structure:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null} ${col.Key} ${col.Default} ${col.Extra}`);
    });
    
    // Check if check_number column exists
    const hasCheckNumber = structure.some(col => col.Field === 'check_number');
    console.log(`\n🔍 check_number column exists: ${hasCheckNumber}`);
    
    if (!hasCheckNumber) {
      console.log('⚠️  check_number column is missing! This is causing the error.');
      
      // Add the missing column
      console.log('🔧 Adding check_number column...');
      await new Promise((resolve, reject) => {
        connection.query('ALTER TABLE payments ADD COLUMN check_number VARCHAR(50) AFTER payment_method', (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      console.log('✅ check_number column added successfully!');
    }
    
    // Check sample data
    const sampleData = await new Promise((resolve, reject) => {
      connection.query('SELECT * FROM payments LIMIT 3', (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('\n📊 Sample payments data:');
    sampleData.forEach((payment, index) => {
      console.log(`  ${index + 1}. ID: ${payment.id}, Claim: ${payment.claim_id}, Amount: $${payment.amount}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    connection.end();
  }
}

checkPaymentsTable();