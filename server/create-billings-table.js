/**
 * Create Billings Table Script
 * This script creates the billings table and inserts dummy data
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function createBillingsTable() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Create billings table
    console.log('🔄 Creating billings table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS billings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        provider_id INT DEFAULT 1,
        claim_number VARCHAR(100),
        procedure_code VARCHAR(10) NOT NULL,
        diagnosis_code VARCHAR(10),
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        service_date DATE NOT NULL,
        submission_date DATE,
        status INT DEFAULT 0 COMMENT '0=draft, 1=submitted, 2=paid, 3=denied, 4=appealed',
        notes TEXT,
        payer_name VARCHAR(255),
        created DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_patient_id (patient_id),
        INDEX idx_provider_id (provider_id),
        INDEX idx_status (status),
        INDEX idx_service_date (service_date),
        INDEX idx_created (created)
      )
    `);
    console.log('✅ Billings table created successfully');

    // Create payments table
    console.log('🔄 Creating payments table...');
    await connection.execute(`
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
        FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
        INDEX idx_claim_id (claim_id),
        INDEX idx_patient_id (patient_id),
        INDEX idx_payment_date (payment_date)
      )
    `);
    console.log('✅ Payments table created successfully');

    // Insert dummy claims data
    console.log('🔄 Inserting dummy claims data...');
    
    const claimsData = [
      // Recent claims (last 7 days)
      [101, 1, 'CLM-2024-001', '99213', 'F32.9', 150.00, 'DATE_SUB(CURDATE(), INTERVAL 2 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)', 1, 'Office visit for depression follow-up', 'Blue Cross Blue Shield'],
      [102, 1, 'CLM-2024-002', '99214', 'F41.1', 200.00, 'DATE_SUB(CURDATE(), INTERVAL 3 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 2 DAY)', 2, 'Complex anxiety management', 'Aetna'],
      [103, 1, 'CLM-2024-003', '99215', 'F43.10', 250.00, 'DATE_SUB(CURDATE(), INTERVAL 4 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 3 DAY)', 0, 'PTSD comprehensive evaluation - draft', 'UnitedHealthcare'],
      [104, 1, 'CLM-2024-004', '99203', 'F90.9', 180.00, 'DATE_SUB(CURDATE(), INTERVAL 5 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 4 DAY)', 2, 'New patient ADHD assessment', 'Cigna'],
      [105, 1, 'CLM-2024-005', '90834', 'F84.0', 120.00, 'DATE_SUB(CURDATE(), INTERVAL 6 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 5 DAY)', 3, 'Autism therapy session - denied for documentation', 'Humana'],
      [106, 1, 'CLM-2024-006', '90837', 'F32.1', 160.00, 'DATE_SUB(CURDATE(), INTERVAL 7 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 6 DAY)', 1, 'Extended therapy for moderate depression', 'Medicare'],
      
      // Claims from 1-2 weeks ago
      [107, 1, 'CLM-2024-007', '96116', 'F41.9', 300.00, 'DATE_SUB(CURDATE(), INTERVAL 10 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 9 DAY)', 2, 'Neurobehavioral status exam completed', 'Medicaid'],
      [108, 1, 'CLM-2024-008', '96118', 'F43.12', 400.00, 'DATE_SUB(CURDATE(), INTERVAL 12 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 11 DAY)', 1, 'Neuropsychological testing in progress', 'Blue Cross Blue Shield'],
      [109, 1, 'CLM-2024-009', '90791', 'F90.1', 250.00, 'DATE_SUB(CURDATE(), INTERVAL 14 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 13 DAY)', 3, 'Psychiatric evaluation - denied for prior auth', 'Aetna'],
      [110, 1, 'CLM-2024-010', '99213', 'F33.1', 150.00, 'DATE_SUB(CURDATE(), INTERVAL 16 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 15 DAY)', 2, 'Recurrent depression management', 'UnitedHealthcare'],
      
      // Older claims for A/R aging
      [111, 1, 'CLM-2024-011', '99214', 'F32.9', 200.00, 'DATE_SUB(CURDATE(), INTERVAL 35 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 34 DAY)', 1, 'Depression follow-up - pending review', 'Cigna'],
      [112, 1, 'CLM-2024-012', '90834', 'F41.1', 120.00, 'DATE_SUB(CURDATE(), INTERVAL 45 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 44 DAY)', 1, 'Anxiety therapy - awaiting approval', 'Humana'],
      [113, 1, 'CLM-2024-013', '99215', 'F43.10', 250.00, 'DATE_SUB(CURDATE(), INTERVAL 65 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 64 DAY)', 3, 'PTSD treatment - denied insufficient docs', 'Medicare'],
      [114, 1, 'CLM-2024-014', '99203', 'F90.9', 180.00, 'DATE_SUB(CURDATE(), INTERVAL 85 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 84 DAY)', 1, 'ADHD new patient - under review', 'Medicaid'],
      [115, 1, 'CLM-2024-015', '90837', 'F84.0', 160.00, 'DATE_SUB(CURDATE(), INTERVAL 125 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 124 DAY)', 1, 'Autism extended therapy - collections candidate', 'Blue Cross Blue Shield']
    ];

    for (const claim of claimsData) {
      await connection.execute(`
        INSERT IGNORE INTO billings 
        (patient_id, provider_id, claim_number, procedure_code, diagnosis_code, total_amount, service_date, submission_date, status, notes, payer_name, created) 
        VALUES (?, ?, ?, ?, ?, ?, ${claim[6]}, ${claim[7]}, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [claim[0], claim[1], claim[2], claim[3], claim[4], claim[5], claim[8], claim[9], claim[10], Math.floor(Math.random() * 30)]);
    }
    
    console.log('✅ Dummy claims data inserted successfully');

    // Insert some payment records
    console.log('🔄 Inserting payment records...');
    const paymentData = [
      [2, 102, 200.00, 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)', 'Electronic', null, 'REF-001'],
      [4, 104, 180.00, 'DATE_SUB(CURDATE(), INTERVAL 3 DAY)', 'Electronic', null, 'REF-002'],
      [7, 107, 300.00, 'DATE_SUB(CURDATE(), INTERVAL 8 DAY)', 'Check', 'CHK-001', 'REF-003'],
      [10, 110, 150.00, 'DATE_SUB(CURDATE(), INTERVAL 14 DAY)', 'Electronic', null, 'REF-004']
    ];

    for (const payment of paymentData) {
      await connection.execute(`
        INSERT IGNORE INTO payments 
        (claim_id, patient_id, amount, payment_date, payment_method, reference_number, status, posted_by) 
        VALUES (?, ?, ?, ${payment[3]}, ?, ?, 'completed', 1)
      `, [payment[0], payment[1], payment[2], payment[4], payment[6]]);
    }
    
    console.log('✅ Payment records inserted successfully');

    // Verify data
    const [billingCount] = await connection.execute('SELECT COUNT(*) as count FROM billings');
    const [paymentCount] = await connection.execute('SELECT COUNT(*) as count FROM payments');
    
    console.log(`\n✅ Verification:`);
    console.log(`   • Billings: ${billingCount[0].count} records`);
    console.log(`   • Payments: ${paymentCount[0].count} records`);

    // Show sample data
    const [sampleClaims] = await connection.execute(`
      SELECT 
        b.claim_number,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        b.procedure_code,
        b.total_amount,
        b.service_date,
        CASE 
          WHEN b.status = 0 THEN 'Draft'
          WHEN b.status = 1 THEN 'Submitted'
          WHEN b.status = 2 THEN 'Paid'
          WHEN b.status = 3 THEN 'Denied'
          WHEN b.status = 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as status_text
      FROM billings b
      LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
      ORDER BY b.created DESC
      LIMIT 5
    `);
    
    console.log(`\n📋 Sample Claims:`);
    sampleClaims.forEach(claim => {
      console.log(`   ${claim.claim_number} - ${claim.patient_name} - ${claim.procedure_code} - $${parseFloat(claim.total_amount).toFixed(2)} - ${claim.status_text}`);
    });

    console.log('\n🎉 Billings table setup completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the setup
if (require.main === module) {
  createBillingsTable();
}

module.exports = { createBillingsTable };