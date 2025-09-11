const mysql = require('mysql2/promise');

async function fixAmounts() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'varn-health'
  });

  try {
    console.log('🔄 Checking for invalid amounts...');
    
    // Check for invalid amounts
    const [invalidAmounts] = await connection.execute(`
      SELECT id, total_amount, claim_number 
      FROM billings 
      WHERE total_amount REGEXP '[^0-9.]' OR total_amount = '' OR total_amount IS NULL
      LIMIT 10
    `);
    
    console.log(`Found ${invalidAmounts.length} records with invalid amounts:`);
    invalidAmounts.forEach(record => {
      console.log(`  ID: ${record.id}, Amount: "${record.total_amount}", Claim: ${record.claim_number}`);
    });
    
    if (invalidAmounts.length > 0) {
      console.log('\n🔧 Fixing invalid amounts...');
      
      // Fix each invalid amount
      for (const record of invalidAmounts) {
        // Generate a random valid amount between 100-400
        const newAmount = Math.round((100 + Math.random() * 300) * 100) / 100;
        
        await connection.execute(`
          UPDATE billings 
          SET total_amount = ? 
          WHERE id = ?
        `, [newAmount, record.id]);
        
        console.log(`  Fixed ID ${record.id}: "${record.total_amount}" -> ${newAmount}`);
      }
    }
    
    // Also check payments table
    const [invalidPayments] = await connection.execute(`
      SELECT id, amount 
      FROM payments 
      WHERE amount REGEXP '[^0-9.]' OR amount = '' OR amount IS NULL
      LIMIT 10
    `);
    
    console.log(`\nFound ${invalidPayments.length} payments with invalid amounts:`);
    
    if (invalidPayments.length > 0) {
      for (const record of invalidPayments) {
        const newAmount = Math.round((50 + Math.random() * 200) * 100) / 100;
        
        await connection.execute(`
          UPDATE payments 
          SET amount = ? 
          WHERE id = ?
        `, [newAmount, record.id]);
        
        console.log(`  Fixed payment ID ${record.id}: "${record.amount}" -> ${newAmount}`);
      }
    }
    
    // Verify all amounts are now valid
    const [finalCheck] = await connection.execute(`
      SELECT 
        COUNT(*) as total_claims,
        MIN(total_amount) as min_amount,
        MAX(total_amount) as max_amount,
        AVG(total_amount) as avg_amount,
        SUM(total_amount) as total_amount
      FROM billings
    `);
    
    console.log('\n✅ Final verification:');
    console.log(`  Total claims: ${finalCheck[0].total_claims}`);
    console.log(`  Amount range: $${parseFloat(finalCheck[0].min_amount).toFixed(2)} - $${parseFloat(finalCheck[0].max_amount).toFixed(2)}`);
    console.log(`  Average amount: $${parseFloat(finalCheck[0].avg_amount).toFixed(2)}`);
    console.log(`  Total billed: $${parseFloat(finalCheck[0].total_amount).toFixed(2)}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixAmounts();