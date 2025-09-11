const mysql = require('mysql2/promise');

async function fixClaimsData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Fixing claims data with correct patient IDs...');
    
    // Clear existing test claims
    await connection.execute("DELETE FROM billings WHERE claim_number LIKE 'CLM-2024-%'");
    await connection.execute("DELETE FROM payments WHERE reference_number LIKE 'REF-%' OR reference_number LIKE 'PART-%'");
    
    // Get actual patient IDs that exist in users table
    const [patients] = await connection.execute(`
      SELECT u.user_id, up.firstname, up.lastname 
      FROM users u
      LEFT JOIN user_profiles up ON u.user_id = up.fk_userid
      WHERE up.firstname IS NOT NULL
      ORDER BY u.user_id 
      LIMIT 15
    `);
    
    console.log(`Found ${patients.length} patients to create claims for`);
    
    // Create claims for each patient
    const claimsData = [];
    const procedureCodes = ['99213', '99214', '99215', '90834', '90837', '96116'];
    const diagnosisCodes = ['F32.9', 'F41.1', 'F43.10', 'F90.9', 'F84.0'];
    const payers = ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna', 'Humana', 'Medicare', 'Medicaid'];
    const statuses = ['draft', 'submitted', 'paid', 'denied', 'pending']; // Valid enum values
    
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      
      // Create 2 claims per patient for 30 total
      for (let j = 0; j < 2; j++) {
        const claimNumber = `CLM-2024-${String(i * 2 + j + 1).padStart(3, '0')}`;
        const procedureCode = procedureCodes[Math.floor(Math.random() * procedureCodes.length)];
        const diagnosisCode = diagnosisCodes[Math.floor(Math.random() * diagnosisCodes.length)];
        const totalAmount = Math.round((100 + Math.random() * 300) * 100) / 100;
        const serviceDaysAgo = Math.floor(1 + Math.random() * 120);
        const submissionDaysAgo = Math.floor(1 + Math.random() * 90);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const payer = payers[Math.floor(Math.random() * payers.length)];
        const createdDaysAgo = Math.floor(1 + Math.random() * 30);
        
        claimsData.push([
          patient.user_id,
          1, // provider_id
          claimNumber,
          procedureCode,
          diagnosisCode,
          totalAmount,
          serviceDaysAgo,
          submissionDaysAgo,
          status,
          `Medical service for ${patient.firstname} ${patient.lastname}`,
          payer,
          createdDaysAgo
        ]);
      }
    }
    
    // Insert claims
    const insertClaimQuery = `
      INSERT INTO billings (
        patient_id, provider_id, claim_number, procedure_code, diagnosis_code, 
        total_amount, service_date, submission_date, status, notes, payer_name, created
      ) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), DATE_SUB(CURDATE(), INTERVAL ? DAY), ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
    `;
    
    for (const claim of claimsData) {
      await connection.execute(insertClaimQuery, claim);
    }
    
    console.log(`✅ Inserted ${claimsData.length} claims`);
    
    // Create payments for paid claims (status = 2)
    const [paidClaims] = await connection.execute(`
      SELECT id, patient_id, total_amount 
      FROM billings 
      WHERE status = 2 AND claim_number LIKE 'CLM-2024-%'
    `);
    
    console.log(`Creating payments for ${paidClaims.length} paid claims`);
    
    for (const claim of paidClaims) {
      // Get a valid user ID for posted_by
      const [validUser] = await connection.execute('SELECT user_id FROM users LIMIT 1');
      const postedBy = validUser[0].user_id;
      
      await connection.execute(`
        INSERT INTO payments (
          claim_id, patient_id, amount, payment_date, payment_method, 
          reference_number, status, posted_by
        ) VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'Electronic', ?, 'completed', ?)
      `, [
        claim.id,
        claim.patient_id,
        claim.total_amount,
        `REF-${String(claim.id).padStart(3, '0')}`,
        postedBy
      ]);
    }
    
    // Create some partial payments
    const [submittedClaims] = await connection.execute(`
      SELECT id, patient_id, total_amount 
      FROM billings 
      WHERE status = 1 AND claim_number LIKE 'CLM-2024-%'
      LIMIT 3
    `);
    
    // Get a valid user ID for posted_by
    const [validUser2] = await connection.execute('SELECT user_id FROM users LIMIT 1');
    const postedBy2 = validUser2[0].user_id;
    
    for (const claim of submittedClaims) {
      const partialAmount = Math.round(claim.total_amount * 0.5 * 100) / 100;
      await connection.execute(`
        INSERT INTO payments (
          claim_id, patient_id, amount, payment_date, payment_method, 
          reference_number, status, posted_by
        ) VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'Electronic', ?, 'completed', ?)
      `, [
        claim.id,
        claim.patient_id,
        partialAmount,
        `PART-${String(claim.id).padStart(3, '0')}`,
        postedBy2
      ]);
    }
    
    // Verify results
    const [finalStats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_claims,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as draft_claims,
        SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as submitted_claims,
        SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as paid_claims,
        SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as denied_claims,
        SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as appealed_claims,
        SUM(total_amount) as total_amount
      FROM billings WHERE claim_number LIKE 'CLM-2024-%'
    `);
    
    const [paymentStats] = await connection.execute(`
      SELECT COUNT(*) as total_payments, SUM(amount) as total_paid
      FROM payments WHERE reference_number LIKE 'REF-%' OR reference_number LIKE 'PART-%'
    `);
    
    console.log('\n✅ Claims data fixed successfully!');
    console.log('\n📊 Final Statistics:');
    console.log(`Total Claims: ${finalStats[0].total_claims}`);
    console.log(`Draft: ${finalStats[0].draft_claims}`);
    console.log(`Submitted: ${finalStats[0].submitted_claims}`);
    console.log(`Paid: ${finalStats[0].paid_claims}`);
    console.log(`Denied: ${finalStats[0].denied_claims}`);
    console.log(`Appealed: ${finalStats[0].appealed_claims}`);
    console.log(`Total Amount: $${parseFloat(finalStats[0].total_amount).toFixed(2)}`);
    console.log(`Total Payments: ${paymentStats[0].total_payments}`);
    console.log(`Total Paid: $${parseFloat(paymentStats[0].total_paid || 0).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixClaimsData();