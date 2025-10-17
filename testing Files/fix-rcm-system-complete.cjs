const mysql = require('mysql2');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'varn-health'
};

async function fixRCMSystem() {
  const connection = mysql.createConnection(dbConfig);
  
  console.log('🔄 Fixing RCM system database issues...');
  
  try {
    // Connect to database
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    console.log('✅ Connected to database');
    
    // Create payments table if it doesn't exist
    const createPaymentsTable = `
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_id INT,
        patient_id INT,
        amount DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'Electronic',
        check_number VARCHAR(50),
        adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
        adjustment_reason TEXT,
        reference_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'completed',
        posted_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_claim_id (claim_id),
        INDEX idx_patient_id (patient_id),
        INDEX idx_payment_date (payment_date)
      )
    `;
    
    await new Promise((resolve, reject) => {
      connection.query(createPaymentsTable, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('✅ Payments table created/verified');
    
    // Add sample claims if billings table is empty
    const checkBillings = 'SELECT COUNT(*) as count FROM billings';
    const billingsCount = await new Promise((resolve, reject) => {
      connection.query(checkBillings, (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });
    
    if (billingsCount === 0) {
      console.log('🔄 Adding sample claims data...');
      
      const sampleClaims = `
        INSERT INTO billings (
          patient_id, provider_id, procedure_code, diagnosis_code, 
          total_amount, service_date, status, created, updated
        ) VALUES 
        (101, 1, '99213', 'Z00.00', 150.00, '2024-01-15', 1, NOW(), NOW()),
        (102, 1, '99214', 'I10', 200.00, '2024-01-16', 2, NOW(), NOW()),
        (103, 1, '99215', 'E11.9', 250.00, '2024-01-17', 1, NOW(), NOW()),
        (101, 1, '99212', 'Z00.01', 125.00, '2024-01-18', 3, NOW(), NOW()),
        (102, 1, '99213', 'M79.3', 175.00, '2024-01-19', 1, NOW(), NOW())
      `;
      
      await new Promise((resolve, reject) => {
        connection.query(sampleClaims, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      console.log('✅ Sample claims added');
    }
    
    // Add sample payments
    const checkPayments = 'SELECT COUNT(*) as count FROM payments';
    const paymentsCount = await new Promise((resolve, reject) => {
      connection.query(checkPayments, (err, result) => {
        if (err) reject(err);
        else resolve(result[0].count);
      });
    });
    
    if (paymentsCount === 0) {
      console.log('🔄 Adding sample payments data...');
      
      const samplePayments = `
        INSERT INTO payments (
          claim_id, patient_id, amount, payment_date, payment_method, 
          check_number, status, created_at
        ) VALUES 
        (1, 101, 150.00, '2024-01-20', 'Electronic', 'EFT123456', 'completed', NOW()),
        (2, 102, 200.00, '2024-01-21', 'Check', 'CHK789012', 'completed', NOW())
      `;
      
      await new Promise((resolve, reject) => {
        connection.query(samplePayments, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
      
      console.log('✅ Sample payments added');
    }
    
    // Verify the setup
    const finalCheck = `
      SELECT 
        'Claims' as Type, COUNT(*) as Count FROM billings
      UNION ALL
      SELECT 
        'Payments' as Type, COUNT(*) as Count FROM payments
    `;
    
    const results = await new Promise((resolve, reject) => {
      connection.query(finalCheck, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
    
    console.log('📊 Final verification:');
    results.forEach(row => {
      console.log(`  ${row.Type}: ${row.Count}`);
    });
    
    console.log('✅ RCM system database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing RCM system:', error.message);
  } finally {
    connection.end();
  }
}

fixRCMSystem();