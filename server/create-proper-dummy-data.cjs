const mysql = require('mysql2/promise');

async function createProperDummyData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Creating proper dummy data...');
    
    // Get existing user IDs
    const [existingUsers] = await connection.execute('SELECT user_id FROM users ORDER BY user_id DESC LIMIT 10');
    console.log(`✅ Found ${existingUsers.length} existing users`);
    
    if (existingUsers.length < 5) {
      console.log('❌ Not enough users found. Need at least 5 users to create dummy claims.');
      return;
    }
    
    // Clear existing dummy claims
    await connection.execute("DELETE FROM billings WHERE claim_number LIKE 'CLM-2024-%'");
    console.log('✅ Cleared existing dummy claims');
    
    // Create 30 dummy claims using existing user IDs
    const statusValues = ['draft', 'submitted', 'paid', 'denied', 'pending', 'partial'];
    const procedures = ['99213', '99214', '99215', '99203', '90834', '90837', '96116', '96118', '90791'];
    const diagnoses = ['F32.9', 'F41.1', 'F43.10', 'F90.9', 'F84.0', 'F32.1', 'F41.9', 'F43.12', 'F90.1', 'F33.1'];
    const payers = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Humana', 'Medicare', 'Medicaid'];
    
    console.log('🔄 Inserting 30 dummy claims...');
    
    for (let i = 1; i <= 30; i++) {
      const userIndex = (i - 1) % existingUsers.length;
      const patientId = existingUsers[userIndex].user_id;
      const claimNumber = `CLM-2024-${i.toString().padStart(3, '0')}`;
      const procedureCode = procedures[i % procedures.length];
      const diagnosisCode = diagnoses[i % diagnoses.length];
      const totalAmount = (Math.random() * 400 + 100).toFixed(2); // $100-$500
      const payerName = payers[i % payers.length];
      
      // Determine status based on claim age
      let status;
      let daysAgo;
      if (i <= 5) {
        status = 'draft';
        daysAgo = Math.floor(Math.random() * 3) + 1; // 1-3 days ago
      } else if (i <= 15) {
        status = Math.random() > 0.5 ? 'submitted' : 'pending';
        daysAgo = Math.floor(Math.random() * 30) + 5; // 5-35 days ago
      } else if (i <= 20) {
        status = 'paid';
        daysAgo = Math.floor(Math.random() * 60) + 10; // 10-70 days ago
      } else if (i <= 25) {
        status = 'denied';
        daysAgo = Math.floor(Math.random() * 90) + 30; // 30-120 days ago
      } else {
        status = Math.random() > 0.5 ? 'partial' : 'submitted';
        daysAgo = Math.floor(Math.random() * 150) + 60; // 60-210 days ago
      }
      
      const notes = `Sample claim ${i} - ${status} status`;
      
      await connection.execute(`
        INSERT INTO billings (
          patient_id, provider_id, claim_number, procedure_code, diagnosis_code, 
          total_amount, service_date, submission_date, status, notes, payer_name, created
        ) VALUES (?, 1, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [
        patientId, claimNumber, procedureCode, diagnosisCode, totalAmount,
        daysAgo, Math.max(1, daysAgo - 1), status, notes, payerName, daysAgo
      ]);
      
      if (i % 5 === 0) {
        console.log(`✅ Inserted ${i} claims...`);
      }
    }
    
    // Create some payment records for paid claims
    console.log('🔄 Creating payment records...');
    
    const [paidClaims] = await connection.execute(`
      SELECT id, patient_id, total_amount 
      FROM billings 
      WHERE status = 'paid' AND claim_number LIKE 'CLM-2024-%'
    `);
    
    for (const claim of paidClaims) {
      await connection.execute(`
        INSERT INTO payments (
          claim_id, patient_id, amount, payment_date, payment_method, 
          reference_number, status, posted_by, created_at
        ) VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), 'Electronic', ?, 'completed', 1, NOW())
      `, [
        claim.id, claim.patient_id, claim.total_amount,
        Math.floor(Math.random() * 30) + 1, // 1-30 days ago
        `REF-${claim.id.toString().padStart(6, '0')}`
      ]);
    }
    
    console.log(`✅ Created ${paidClaims.length} payment records`);
    
    // Show summary
    const [summary] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM billings 
      WHERE claim_number LIKE 'CLM-2024-%'
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\n📊 Claims Summary:');
    summary.forEach(row => {
      console.log(`  ${row.status}: ${row.count} claims, $${parseFloat(row.total_amount).toFixed(2)}`);
    });
    
    const [paymentCount] = await connection.execute('SELECT COUNT(*) as total FROM payments');
    console.log(`\n💰 Total payments: ${paymentCount[0].total}`);
    
    console.log('\n🎉 Dummy data created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createProperDummyData();