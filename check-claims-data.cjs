const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'varn-health'
});

async function checkClaimsData() {
  console.log('🔄 Checking claims data...');
  
  try {
    // Check billings table
    const billings = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM billings', (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });
    
    console.log(`📊 Billings table: ${billings} records`);
    
    // Check user_profiles table
    const profiles = await new Promise((resolve, reject) => {
      connection.query('SELECT COUNT(*) as count FROM user_profiles', (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });
    
    console.log(`👥 User profiles: ${profiles} records`);
    
    // Check the JOIN query
    const joinResult = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT 
          b.id,
          b.patient_id,
          CONCAT(p.firstname, ' ', p.lastname) as patient_name,
          b.procedure_code,
          b.total_amount,
          b.service_date,
          b.status
        FROM billings b
        INNER JOIN user_profiles p ON b.patient_id = p.fk_userid
        LIMIT 5
      `, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('🔍 Sample claims with patient data:');
    joinResult.forEach((claim, index) => {
      console.log(`  ${index + 1}. Claim ${claim.id}: ${claim.patient_name} - $${claim.total_amount}`);
    });
    
    // Check if there are any billings without matching profiles
    const orphanBillings = await new Promise((resolve, reject) => {
      connection.query(`
        SELECT b.id, b.patient_id 
        FROM billings b 
        LEFT JOIN user_profiles p ON b.patient_id = p.fk_userid 
        WHERE p.fk_userid IS NULL
        LIMIT 5
      `, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    if (orphanBillings.length > 0) {
      console.log('⚠️  Found billings without matching user profiles:');
      orphanBillings.forEach(billing => {
        console.log(`  Billing ID ${billing.id} - Patient ID ${billing.patient_id}`);
      });
    } else {
      console.log('✅ All billings have matching user profiles');
    }
    
  } catch (error) {
    console.error('❌ Error checking claims data:', error.message);
  } finally {
    connection.end();
  }
}

checkClaimsData();