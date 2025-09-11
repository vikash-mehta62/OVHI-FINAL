const mysql = require('mysql2/promise');

async function checkStatus() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    // Check status column definition
    const [statusColumn] = await connection.execute("SHOW COLUMNS FROM billings LIKE 'status'");
    console.log('Status column definition:', statusColumn[0]);
    
    // Check actual status values in data
    const [statusValues] = await connection.execute(`
      SELECT DISTINCT status, COUNT(*) as count 
      FROM billings 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('\nActual status values in data:');
    statusValues.forEach(row => {
      console.log(`  "${row.status}": ${row.count} records`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkStatus();