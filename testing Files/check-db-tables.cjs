const mysql = require('mysql2/promise');

async function checkTables() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'varn-health'
    });

    console.log('🔄 Checking database tables...');

    // Check if payments table exists
    const [tables] = await connection.execute("SHOW TABLES LIKE 'payments'");
    console.log('Payments table exists:', tables.length > 0);

    if (tables.length > 0) {
      // Check payments table structure
      const [columns] = await connection.execute("DESCRIBE payments");
      console.log('Payments table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type})`);
      });
    }

    // Check for alternative payment tables
    const [allTables] = await connection.execute("SHOW TABLES");
    console.log('\nAll tables in database:');
    allTables.forEach(table => {
      const tableName = Object.values(table)[0];
      if (tableName.toLowerCase().includes('payment')) {
        console.log(`  - ${tableName}`);
      }
    });

    await connection.end();
  } catch (error) {
    console.error('❌ Database check error:', error.message);
  }
}

checkTables();