const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'varn-health'
    });
    
    const [rows] = await conn.execute("SHOW TABLES LIKE '%claim%'");
    console.log('Claim-related tables:', rows.map(r => Object.values(r)[0]));
    
    // Check if specific tables exist
    const tablesToCheck = ['claim_comments', 'claim_audit_log', 'claim_appeals'];
    for (const table of tablesToCheck) {
      const [exists] = await conn.execute(`SHOW TABLES LIKE '${table}'`);
      console.log(`${table}: ${exists.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
    await conn.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTables();