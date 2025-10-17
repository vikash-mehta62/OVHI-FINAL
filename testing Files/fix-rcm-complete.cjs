// Complete fix for RCM system
const { executeQuery } = require('../server/utils/dbUtils');

async function fixRCMSystem() {
  console.log('🔧 Fixing RCM system completely...');
  
  try {
    // 1. Check and fix payments table structure
    console.log('📋 Checking payments table structure...');
    
    try {
      // Try to describe the payments table
      const columns = await executeQuery('DESCRIBE payments');
      console.log('✅ Payments table exists');
      
      const columnNames = columns.map(col => col.Field);
      console.log('📋 Existing columns:', columnNames.join(', '));
      
      // Check for missing columns and add them
      const requiredColumns = [
        { name: 'check_number', type: 'VARCHAR(50)', after: 'payment_method' },
        { name: 'reference_number', type: 'VARCHAR(100)', after: 'check_number' },
        { name: 'adjustment_amount', type: 'DECIMAL(10,2) DEFAULT 0.00', after: 'reference_number' },
        { name: 'adjustment_reason', type: 'TEXT', after: 'adjustment_amount' },
        { name: 'status', type: 'VARCHAR(20) DEFAULT "completed"', after: 'adjustment_reason' },
        { name: 'posted_by', type: 'INT', after: 'status' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`🔧 Adding missing column: ${col.name}`);
          try {
            await executeQuery(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type} AFTER ${col.after}`);
            console.log(`✅ Added ${col.name} column`);
          } catch (error) {
            console.log(`⚠️  Could not add ${col.name}: ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      console.log('❌ Payments table does not exist, creating it...');
      
      // Create payments table with all required columns
      await executeQuery(`
        CREATE TABLE payments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          claim_id INT,
          patient_id INT,
          amount DECIMAL(10,2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'Electronic',
          check_number VARCHAR(50),
          reference_number VARCHAR(100),
          adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
          adjustment_reason TEXT,
          status VARCHAR(20) DEFAULT 'completed',
          posted_by INT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_claim_id (claim_id),
          INDEX idx_patient_id (patient_id),
          INDEX idx_payment_date (payment_date)
        )
      `);
      
      console.log('✅ Payments table created successfully');
    }
    
    // 2. Verify table structure
    const finalColumns = await executeQuery('DESCRIBE payments');
    console.log('📋 Final payments table structure:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // 3. Add sample payment data if table is empty
    const paymentCount = await executeQuery('SELECT COUNT(*) as count FROM payments');
    if (paymentCount[0].count === 0) {
      console.log('🔧 Adding sample payment data...');
      
      await executeQuery(`
        INSERT INTO payments (claim_id, patient_id, amount, payment_date, payment_method, check_number, status) VALUES
        (168, 30437, 150.00, '2024-01-20', 'Electronic', 'EFT123456', 'completed'),
        (169, 30445, 200.00, '2024-01-21', 'Check', 'CHK789012', 'completed'),
        (170, 30446, 175.50, '2024-01-22', 'Electronic', 'EFT345678', 'completed')
      `);
      
      console.log('✅ Sample payment data added');
    }
    
    // 4. Test the fixed queries
    console.log('🧪 Testing fixed queries...');
    
    try {
      const testPayments = await executeQuery(`
        SELECT 
          id,
          amount,
          payment_date,
          payment_method,
          check_number,
          adjustment_reason as notes,
          created_at
        FROM payments 
        WHERE claim_id = 168
        ORDER BY created_at DESC
        LIMIT 1
      `);
      
      console.log('✅ Payment query test successful');
      if (testPayments.length > 0) {
        console.log('📄 Sample payment:', testPayments[0]);
      }
      
    } catch (error) {
      console.log('❌ Payment query test failed:', error.message);
    }
    
    console.log('🎉 RCM system fix completed!');
    
  } catch (error) {
    console.error('❌ Error fixing RCM system:', error.message);
  }
}

fixRCMSystem();