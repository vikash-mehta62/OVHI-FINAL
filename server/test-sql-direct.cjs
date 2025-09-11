const mysql = require('mysql2/promise');

async function testSQL() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Testing direct SQL execution...');
    
    // First, clear existing data
    await connection.execute("DELETE FROM billings WHERE claim_number LIKE 'CLM-2024-%'");
    console.log('✅ Cleared existing claims');
    
    // Insert a few test claims directly
    const testClaims = [
      [101, 1, 'CLM-2024-001', '99213', 'F32.9', 150.00, 'DATE_SUB(CURDATE(), INTERVAL 2 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)', 1, 'Test claim 1', 'Blue Cross'],
      [102, 1, 'CLM-2024-002', '99214', 'F41.1', 200.00, 'DATE_SUB(CURDATE(), INTERVAL 3 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 2 DAY)', 2, 'Test claim 2', 'Aetna'],
      [103, 1, 'CLM-2024-003', '99215', 'F43.10', 250.00, 'DATE_SUB(CURDATE(), INTERVAL 4 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 3 DAY)', 0, 'Test claim 3', 'UnitedHealthcare'],
      [104, 1, 'CLM-2024-004', '99203', 'F90.9', 180.00, 'DATE_SUB(CURDATE(), INTERVAL 5 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 4 DAY)', 2, 'Test claim 4', 'Cigna'],
      [105, 1, 'CLM-2024-005', '90834', 'F84.0', 120.00, 'DATE_SUB(CURDATE(), INTERVAL 6 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 5 DAY)', 3, 'Test claim 5', 'Humana']
    ];
    
    for (let i = 0; i < testClaims.length; i++) {
      const claim = testClaims[i];
      await connection.execute(`
        INSERT INTO billings (patient_id, provider_id, claim_number, procedure_code, diagnosis_code, total_amount, service_date, submission_date, status, notes, payer_name, created) 
        VALUES (?, ?, ?, ?, ?, ?, ${claim[6]}, ${claim[7]}, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [claim[0], claim[1], claim[2], claim[3], claim[4], claim[5], claim[8], claim[9], claim[10], i + 1]);
      console.log(`✅ Inserted claim ${i + 1}: ${claim[2]}`);
    }
    
    // Check results
    const [results] = await connection.execute('SELECT COUNT(*) as total FROM billings WHERE claim_number LIKE "CLM-2024-%"');
    console.log(`\n📊 Total claims inserted: ${results[0].total}`);
    
    // Show the claims
    const [claims] = await connection.execute(`
      SELECT claim_number, patient_id, total_amount, status 
      FROM billings 
      WHERE claim_number LIKE 'CLM-2024-%' 
      ORDER BY id DESC
    `);
    
    console.log('\n📋 Inserted claims:');
    claims.forEach(claim => {
      console.log(`  ${claim.claim_number} - Patient ${claim.patient_id} - $${parseFloat(claim.total_amount).toFixed(2)} - Status ${claim.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

testSQL();