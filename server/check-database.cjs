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
      const statusName = row.status.charAt(0).toUpperCase() + row.status.slice(1);
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
    
    // Check what patient IDs exist
    const [patientIds] = await connection.execute(`
      SELECT fk_userid 
      FROM user_profiles 
      WHERE fk_userid BETWEEN 101 AND 115 
      ORDER BY fk_userid
    `);
    console.log('\nPatient IDs 101-115 that exist:');
    patientIds.forEach(p => console.log(`  ${p.fk_userid}`));
    
    // Check actual patient IDs in use
    const [actualPatients] = await connection.execute(`
      SELECT fk_userid, firstname, lastname 
      FROM user_profiles 
      ORDER BY fk_userid DESC 
      LIMIT 10
    `);
    console.log('\nActual patient IDs (latest 10):');
    actualPatients.forEach(p => console.log(`  ${p.fk_userid} - ${p.firstname} ${p.lastname}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkDatabase();