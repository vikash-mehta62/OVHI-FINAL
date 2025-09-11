/**
 * Insert Claims with Existing Users Script
 * This script uses existing users to create claims data
 */

const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'varn-health'
};

async function insertClaimsWithExistingUsers() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database successfully');

    // Get existing users with their profiles
    console.log('🔍 Getting existing users with profiles...');
    const [usersWithProfiles] = await connection.execute(`
      SELECT 
        u.user_id,
        up.firstname,
        up.lastname,
        up.work_email,
        u.fk_roleid
      FROM users u
      LEFT JOIN user_profiles up ON u.user_id = up.fk_userid
      WHERE up.firstname IS NOT NULL 
      AND up.lastname IS NOT NULL
      ORDER BY u.user_id
      LIMIT 20
    `);
    
    console.log(`✅ Found ${usersWithProfiles.length} users with profiles`);
    
    if (usersWithProfiles.length === 0) {
      console.log('❌ No users with profiles found. Cannot create claims.');
      return;
    }

    console.log('\n👥 Available Users:');
    usersWithProfiles.forEach((user, index) => {
      console.log(`   ${index + 1}. ID: ${user.user_id} - ${user.firstname} ${user.lastname} (${user.work_email || 'No email'})`);
    });

    // Claims template data
    const claimsTemplate = [
      {
        claim_number: 'CLM-2024-001',
        procedure_code: '99213',
        diagnosis_code: 'F32.9',
        total_amount: 150.00,
        service_date: '2024-12-08',
        submission_date: '2024-12-09',
        status: 'submitted',
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
        status: 'paid',
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
        status: 'draft',
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
        status: 'paid',
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
        status: 'denied',
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
        status: 'submitted',
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
        status: 'paid',
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
        status: 'submitted',
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
        status: 'denied',
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
        status: 'paid',
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
        status: 'submitted',
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
        status: 'submitted',
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
        status: 'denied',
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
        status: 'submitted',
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
        status: 'submitted',
        notes: 'Autism extended therapy - collections candidate',
        payer_name: 'Blue Cross Blue Shield'
      }
    ];

    // Insert claims data
    console.log('\n🔄 Inserting claims data...');
    
    let insertedCount = 0;
    for (let i = 0; i < claimsTemplate.length && i < usersWithProfiles.length; i++) {
      const claim = claimsTemplate[i];
      const user = usersWithProfiles[i % usersWithProfiles.length]; // Cycle through users
      
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
        console.log(`✅ Inserted claim: ${claim.claim_number} for ${user.firstname} ${user.lastname}`);
      } catch (error) {
        console.log(`⚠️ Skipped claim ${claim.claim_number}: ${error.message}`);
      }
    }

    console.log(`\n✅ Successfully inserted ${insertedCount} claims`);

    // Verify the data
    const [billingCount] = await connection.execute('SELECT COUNT(*) as count FROM billings');
    console.log(`📊 Total claims in database: ${billingCount[0].count}`);

    // Show sample data with patient names
    const [sampleClaims] = await connection.execute(`
      SELECT 
        b.claim_number,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        b.procedure_code,
        b.total_amount,
        b.service_date,
        b.status,
        b.payer_name
      FROM billings b
      LEFT JOIN user_profiles up ON b.patient_id = up.fk_userid
      ORDER BY b.created DESC
      LIMIT 10
    `);
    
    console.log(`\n📋 Sample Claims:`);
    sampleClaims.forEach(claim => {
      console.log(`   ${claim.claim_number} - ${claim.patient_name} - ${claim.procedure_code} - $${parseFloat(claim.total_amount).toFixed(2)} - ${claim.status} - ${claim.payer_name}`);
    });

    // Show claims by status
    const [statusCounts] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_amount
      FROM billings 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log(`\n📊 Claims by Status:`);
    statusCounts.forEach(row => {
      console.log(`   ${row.status}: ${row.count} claims, $${parseFloat(row.total_amount).toFixed(2)}`);
    });

    console.log('\n🎉 Claims data insertion completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   • Used ${usersWithProfiles.length} existing users from database`);
    console.log(`   • Inserted ${insertedCount} sample claims with various statuses`);
    console.log('   • Claims span different time periods for A/R aging testing');
    console.log('   • Multiple payers and procedure codes included');
    console.log('   • Ready for RCM system testing');
    console.log('\n🔗 You can now test the claims management system!');

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
  insertClaimsWithExistingUsers();
}

module.exports = { insertClaimsWithExistingUsers };