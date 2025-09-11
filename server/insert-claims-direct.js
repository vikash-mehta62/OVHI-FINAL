/**
 * Direct Claims Data Insertion Script
 * This script directly inserts claims data using simple SQL
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function insertClaimsData() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // First, let's check if billings table exists and its structure
    console.log('🔍 Checking billings table structure...');
    try {
      const [columns] = await connection.execute('DESCRIBE billings');
      console.log('✅ Billings table exists with columns:', columns.map(col => col.Field).join(', '));
    } catch (error) {
      console.log('❌ Billings table does not exist. Creating it...');
      
      await connection.execute(`
        CREATE TABLE billings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_id INT NOT NULL,
          provider_id INT DEFAULT 1,
          claim_number VARCHAR(100),
          procedure_code VARCHAR(10) NOT NULL,
          diagnosis_code VARCHAR(10),
          total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
          service_date DATE NOT NULL,
          submission_date DATE,
          status INT DEFAULT 0,
          notes TEXT,
          payer_name VARCHAR(255),
          created DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Billings table created successfully');
    }

    // Insert claims data one by one
    console.log('🔄 Inserting claims data...');
    
    const claims = [
      {
        patient_id: 101,
        claim_number: 'CLM-2024-001',
        procedure_code: '99213',
        diagnosis_code: 'F32.9',
        total_amount: 150.00,
        service_date: '2024-12-08',
        submission_date: '2024-12-09',
        status: 1,
        notes: 'Office visit for depression follow-up',
        payer_name: 'Blue Cross Blue Shield'
      },
      {
        patient_id: 102,
        claim_number: 'CLM-2024-002',
        procedure_code: '99214',
        diagnosis_code: 'F41.1',
        total_amount: 200.00,
        service_date: '2024-12-07',
        submission_date: '2024-12-08',
        status: 2,
        notes: 'Complex anxiety management',
        payer_name: 'Aetna'
      },
      {
        patient_id: 103,
        claim_number: 'CLM-2024-003',
        procedure_code: '99215',
        diagnosis_code: 'F43.10',
        total_amount: 250.00,
        service_date: '2024-12-06',
        submission_date: '2024-12-07',
        status: 0,
        notes: 'PTSD comprehensive evaluation - draft',
        payer_name: 'UnitedHealthcare'
      },
      {
        patient_id: 104,
        claim_number: 'CLM-2024-004',
        procedure_code: '99203',
        diagnosis_code: 'F90.9',
        total_amount: 180.00,
        service_date: '2024-12-05',
        submission_date: '2024-12-06',
        status: 2,
        notes: 'New patient ADHD assessment',
        payer_name: 'Cigna'
      },
      {
        patient_id: 105,
        claim_number: 'CLM-2024-005',
        procedure_code: '90834',
        diagnosis_code: 'F84.0',
        total_amount: 120.00,
        service_date: '2024-12-04',
        submission_date: '2024-12-05',
        status: 3,
        notes: 'Autism therapy session - denied for documentation',
        payer_name: 'Humana'
      },
      {
        patient_id: 106,
        claim_number: 'CLM-2024-006',
        procedure_code: '90837',
        diagnosis_code: 'F32.1',
        total_amount: 160.00,
        service_date: '2024-12-03',
        submission_date: '2024-12-04',
        status: 1,
        notes: 'Extended therapy for moderate depression',
        payer_name: 'Medicare'
      },
      {
        patient_id: 107,
        claim_number: 'CLM-2024-007',
        procedure_code: '96116',
        diagnosis_code: 'F41.9',
        total_amount: 300.00,
        service_date: '2024-11-30',
        submission_date: '2024-12-01',
        status: 2,
        notes: 'Neurobehavioral status exam completed',
        payer_name: 'Medicaid'
      },
      {
        patient_id: 108,
        claim_number: 'CLM-2024-008',
        procedure_code: '96118',
        diagnosis_code: 'F43.12',
        total_amount: 400.00,
        service_date: '2024-11-28',
        submission_date: '2024-11-29',
        status: 1,
        notes: 'Neuropsychological testing in progress',
        payer_name: 'Blue Cross Blue Shield'
      },
      {
        patient_id: 109,
        claim_number: 'CLM-2024-009',
        procedure_code: '90791',
        diagnosis_code: 'F90.1',
        total_amount: 250.00,
        service_date: '2024-11-26',
        submission_date: '2024-11-27',
        status: 3,
        notes: 'Psychiatric evaluation - denied for prior auth',
        payer_name: 'Aetna'
      },
      {
        patient_id: 110,
        claim_number: 'CLM-2024-010',
        procedure_code: '99213',
        diagnosis_code: 'F33.1',
        total_amount: 150.00,
        service_date: '2024-11-24',
        submission_date: '2024-11-25',
        status: 2,
        notes: 'Recurrent depression management',
        payer_name: 'UnitedHealthcare'
      },
      // Older claims for A/R aging
      {
        patient_id: 111,
        claim_number: 'CLM-2024-011',
        procedure_code: '99214',
        diagnosis_code: 'F32.9',
        total_amount: 200.00,
        service_date: '2024-11-05',
        submission_date: '2024-11-06',
        status: 1,
        notes: 'Depression follow-up - pending review',
        payer_name: 'Cigna'
      },
      {
        patient_id: 112,
        claim_number: 'CLM-2024-012',
        procedure_code: '90834',
        diagnosis_code: 'F41.1',
        total_amount: 120.00,
        service_date: '2024-10-25',
        submission_date: '2024-10-26',
        status: 1,
        notes: 'Anxiety therapy - awaiting approval',
        payer_name: 'Humana'
      },
      {
        patient_id: 113,
        claim_number: 'CLM-2024-013',
        procedure_code: '99215',
        diagnosis_code: 'F43.10',
        total_amount: 250.00,
        service_date: '2024-10-05',
        submission_date: '2024-10-06',
        status: 3,
        notes: 'PTSD treatment - denied insufficient docs',
        payer_name: 'Medicare'
      },
      {
        patient_id: 114,
        claim_number: 'CLM-2024-014',
        procedure_code: '99203',
        diagnosis_code: 'F90.9',
        total_amount: 180.00,
        service_date: '2024-09-25',
        submission_date: '2024-09-26',
        status: 1,
        notes: 'ADHD new patient - under review',
        payer_name: 'Medicaid'
      },
      {
        patient_id: 115,
        claim_number: 'CLM-2024-015',
        procedure_code: '90837',
        diagnosis_code: 'F84.0',
        total_amount: 160.00,
        service_date: '2024-08-15',
        submission_date: '2024-08-16',
        status: 1,
        notes: 'Autism extended therapy - collections candidate',
        payer_name: 'Blue Cross Blue Shield'
      }
    ];

    let insertedCount = 0;
    for (const claim of claims) {
      try {
        await connection.execute(`
          INSERT INTO billings 
          (patient_id, provider_id, claim_number, procedure_code, diagnosis_code, total_amount, service_date, submission_date, status, notes, payer_name) 
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          claim.patient_id,
          claim.claim_number,
          claim.procedure_code,
          claim.diagnosis_code,
          claim.total_amount,
          claim.service_date,
          claim.submission_date,
          claim.status,
          claim.notes,
          claim.payer_name
        ]);
        insertedCount++;
        console.log(`✅ Inserted claim: ${claim.claim_number}`);
      } catch (error) {
        console.log(`⚠️ Skipped claim ${claim.claim_number}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} claims`);

    // Verify the data
    const [billingCount] = await connection.execute('SELECT COUNT(*) as count FROM billings');
    console.log(`📊 Total claims in database: ${billingCount[0].count}`);

    // Show sample data
    const [sampleClaims] = await connection.execute(`
      SELECT 
        b.claim_number,
        CONCAT(COALESCE(up.firstname, 'Unknown'), ' ', COALESCE(up.lastname, 'Patient')) as patient_name,
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
        END as status_text,
        b.payer_name
      FROM billings b
      LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
      ORDER BY b.created DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Sample Claims:`);
    sampleClaims.forEach(claim => {
      console.log(`   ${claim.claim_number} - ${claim.patient_name} - ${claim.procedure_code} - $${parseFloat(claim.total_amount).toFixed(2)} - ${claim.status_text} - ${claim.payer_name}`);
    });

    // Show claims by status
    const [statusCounts] = await connection.execute(`
      SELECT 
        CASE 
          WHEN status = 0 THEN 'Draft'
          WHEN status = 1 THEN 'Submitted'
          WHEN status = 2 THEN 'Paid'
          WHEN status = 3 THEN 'Denied'
          WHEN status = 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as status_name,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM billings 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log(`\n📊 Claims by Status:`);
    statusCounts.forEach(row => {
      console.log(`   ${row.status_name}: ${row.count} claims, $${parseFloat(row.total_amount).toFixed(2)}`);
    });

    console.log('\n🎉 Claims data insertion completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   • Created billings table with proper structure');
    console.log('   • Inserted 15 sample claims with various statuses');
    console.log('   • Claims span different time periods for A/R aging testing');
    console.log('   • Multiple payers and procedure codes included');
    console.log('   • Ready for RCM system testing');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
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
  insertClaimsData();
}

module.exports = { insertClaimsData };