const mysql = require('mysql2/promise');

async function createPayments() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Creating payment records...');
    
    // Get a valid user ID for posted_by
    const [users] = await connection.execute('SELECT user_id FROM users LIMIT 1');
    const postedBy = users[0]?.user_id || null;
    
    if (!postedBy) {
      console.log('❌ No users found to use as posted_by');
      return;
    }
    
    console.log(`✅ Using user ${postedBy} as posted_by`);
    
    // Get paid and partial claims
    const [paidClaims] = await connection.execute(`
      SELECT id, patient_id, total_amount 
      FROM billings 
      WHERE status IN ('paid', 'partial') AND claim_number LIKE 'CLM-2024-%'
    `);
    
    console.log(`📋 Found ${paidClaims.length} claims to create payments for`);
    
    for (const claim of paidClaims) {
      const paymentAmount = claim.total_amount;
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      
      await connection.execute(`
        INSERT INTO payments (
          claim_id, patient_id, amount, payment_date, payment_method, 
          reference_number, status, posted_by, created_at
        ) VALUES (?, ?, ?, DATE_SUB(CURDATE(), INTERVAL ? DAY), 'Electronic', ?, 'completed', ?, NOW())
      `, [
        claim.id, claim.patient_id, paymentAmount, daysAgo,
        `REF-${claim.id.toString().padStart(6, '0')}`, postedBy
      ]);
    }
    
    console.log(`✅ Created ${paidClaims.length} payment records`);
    
    // Show summary
    const [paymentSummary] = await connection.execute(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount
      FROM payments
    `);
    
    console.log(`\n💰 Payment Summary:`);
    console.log(`   Total payments: ${paymentSummary[0].total_payments}`);
    console.log(`   Total amount: $${parseFloat(paymentSummary[0].total_amount).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

createPayments();