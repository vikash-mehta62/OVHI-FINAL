const mysql = require('mysql2/promise');

async function checkDatabase() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔍 Checking database...');
    
    // Check total claims
    const [totalClaims] = await connection.execute('SELECT COUNT(*) as total FROM billings');
    console.log(`Total claims: ${totalClaims[0].total}`);
    
    // Check claims by status
    const [statusBreakdown] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM billings 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\nClaims by status:');
    statusBreakdown.forEach(row => {
      const statusName = {
        0: 'Draft',
        1: 'Submitted', 
        2: 'Paid',
        3: 'Denied',
        4: 'Appealed'
      }[row.status] || 'Unknown';
      console.log(`  ${statusName}: ${row.count} claims, $${parseFloat(row.total_amount).toFixed(2)}`);
    });
    
    // Check recent claims
    const [recentClaims] = await connection.execute(`
      SELECT claim_number, patient_id, total_amount, status, service_date
      FROM billings 
      ORDER BY id DESC 
      LIMIT 10
    `);
    
    console.log('\nRecent claims:');
    recentClaims.forEach(claim => {
      console.log(`  ${claim.claim_number} - Patient ${claim.patient_id} - $${parseFloat(claim.total_amount).toFixed(2)} - Status ${claim.status}`);
    });
    
    // Check payments
    const [payments] = await connection.execute('SELECT COUNT(*) as total FROM payments');
    console.log(`\nTotal payments: ${payments[0].total}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();