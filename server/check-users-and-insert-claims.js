/**
 * Check Users and Insert Claims Script
 * This script checks existing users and inserts claims for them
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function checkUsersAndInsertClaims() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Check existing users
    console.log('🔍 Checking existing users...');
    const [users] = await connection.execute(`
      SELECT user_id, first_name, last_name, email, role 
      FROM users 
      WHERE role IN ('patient', 'user') 
      ORDER BY user_id 
      LIMIT 20
    `);
    
    console.log(`✅ Found ${users.length} users in database`);
    
    if (users.length === 0) {
      console.log('❌ No users found. Creating some dummy users first...');
      
      // Create some dummy users
      const dummyUsers = [
        { first_name: 'John', last_name: 'Smith', email: 'john.smith@email.com', role: 'patient' },
        { first_name: 'Sarah', last_name: 'Johnson', email: 'sarah.johnson@email.com', role: 'patient' },
        { first_name: 'Michael', last_name: 'Brown', email: 'michael.brown@email.com', role: 'patient' },
        { first_name: 'Emily', last_name: 'Davis', email: 'emily.davis@email.com', role: 'patient' },
        { first_name: 'David', last_name: 'Wilson', email: 'david.wilson@email.com', role: 'patient' },
        { first_name: 'Lisa', last_name: 'Anderson', email: 'lisa.anderson@email.com', role: 'patient' },
        { first_name: 'Robert', last_name: 'Taylor', email: 'robert.taylor@email.com', role: 'patient' },
        { first_name: 'Jennifer', last_name: 'Martinez', email: 'jennifer.martinez@email.com', role: 'patient' },
        { first_name: 'Christopher', last_name: 'Garcia', email: 'christopher.garcia@email.com', role: 'patient' },
        { first_name: 'Amanda', last_name: 'Rodriguez', email: 'amanda.rodriguez@email.com', role: 'patient' }
      ];
      
      for (const user of dummyUsers) {
        try {
          await connection.execute(`
            INSERT INTO users (first_name, last_name, email, role, password, created_at) 
            VALUES (?, ?, ?, ?, 'dummy_password', NOW())
          `, [user.first_name, user.last_name, user.email, user.role]);
          console.log(`✅ Created user: ${user.first_name} ${user.last_name}`);
        } catch (error) {
          console.log(`⚠️ Skipped user ${user.email}: ${error.message}`);
        }
      }
      
      // Re-fetch users
      const [newUsers] = await connection.execute(`
        SELECT user_id, first_name, last_name, email, role 
        FROM users 
        WHERE role IN ('patient', 'user') 
        ORDER BY user_id 
        LIMIT 20
      `);
      users.push(...newUsers);
    }

    console.log('\n👥 Available Users:');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.user_id} - ${user.first_name} ${user.last_name} (${user.email})`);
    });

    // Now insert claims using existing user IDs
    console.log('\n🔄 Inserting claims data...');
    
    const claimsTemplate = [
      {
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
    for (let i = 0; i < claimsTemplate.length && i < users.length; i++) {
      const claim = claimsTemplate[i];
      const user = users[i % users.length]; // Cycle through users if we have more claims than users
      
      try {
        await connection.execute(`
          INSERT INTO billings 
          (patient_id, provider_id, claim_number, procedure_code, diagnosis_code, total_amount, service_date, submission_date, status, notes, payer_name) 
          VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.user_id,
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
        console.log(`✅ Inserted claim: ${claim.claim_number} for ${user.first_name} ${user.last_name}`);
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
        CONCAT(u.first_name, ' ', u.last_name) as patient_name,
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
      LEFT JOIN users u ON b.patient_id = u.user_id
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
    console.log(`   • Used ${users.length} existing users from database`);
    console.log(`   • Inserted ${insertedCount} sample claims with various statuses`);
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
  checkUsersAndInsertClaims();
}

module.exports = { checkUsersAndInsertClaims };