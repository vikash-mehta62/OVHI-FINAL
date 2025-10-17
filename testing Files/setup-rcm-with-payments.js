#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Setting up RCM System with Sample Data and Payment Gateway');
console.log('===========================================================');

async function setupRCMSystem() {
  let connection;
  
  try {
    // Database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ovhi_db',
      multipleStatements: true
    });

    console.log('✅ Connected to database');

    // 1. Install sample data
    console.log('\n📊 Installing RCM sample data...');
    const sampleDataSQL = await fs.readFile(path.join(__dirname, 'server/sql/rcm_sample_data.sql'), 'utf8');
    await connection.execute(sampleDataSQL);
    console.log('✅ Sample data installed successfully');

    // 2. Verify data installation
    console.log('\n🔍 Verifying installation...');
    
    const [cptCodes] = await connection.execute('SELECT COUNT(*) as count FROM cpt_codes');
    console.log(`✅ CPT Codes: ${cptCodes[0].count} records`);
    
    const [billingRecords] = await connection.execute('SELECT COUNT(*) as count FROM cpt_billing');
    console.log(`✅ Billing Records: ${billingRecords[0].count} records`);
    
    const [patientClaims] = await connection.execute('SELECT COUNT(*) as count FROM patient_claims');
    console.log(`✅ Patient Claims: ${patientClaims[0].count} records`);
    
    const [paymentGateways] = await connection.execute('SELECT COUNT(*) as count FROM payment_gateways');
    console.log(`✅ Payment Gateways: ${paymentGateways[0].count} configured`);
    
    const [payments] = await connection.execute('SELECT COUNT(*) as count FROM patient_payments');
    console.log(`✅ Sample Payments: ${payments[0].count} records`);

    // 3. Display sample data summary
    console.log('\n📋 Sample Data Summary:');
    console.log('========================');
    
    // Revenue summary
    const [revenueSummary] = await connection.execute(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN status = 3 THEN 1 END) as denied_claims,
        COUNT(CASE WHEN status = 1 THEN 1 END) as pending_claims,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed,
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as total_collected
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
    `);

    const summary = revenueSummary[0];
    console.log(`💰 Total Billed: $${parseFloat(summary.total_billed).toFixed(2)}`);
    console.log(`💵 Total Collected: $${parseFloat(summary.total_collected).toFixed(2)}`);
    console.log(`📊 Collection Rate: ${summary.total_billed > 0 ? ((summary.total_collected / summary.total_billed) * 100).toFixed(1) : 0}%`);
    console.log(`📈 Total Claims: ${summary.total_claims}`);
    console.log(`✅ Paid Claims: ${summary.paid_claims}`);
    console.log(`❌ Denied Claims: ${summary.denied_claims}`);
    console.log(`⏳ Pending Claims: ${summary.pending_claims}`);

    // A/R Aging
    const [arAging] = await connection.execute(`
      SELECT 
        CASE 
          WHEN DATEDIFF(CURDATE(), cb.created) <= 30 THEN '0-30 days'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 60 THEN '31-60 days'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 90 THEN '61-90 days'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 120 THEN '91-120 days'
          ELSE '120+ days'
        END as age_bucket,
        COUNT(*) as count,
        COALESCE(SUM(cc.price * cb.code_units), 0) as amount
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      WHERE cb.status != 2
      GROUP BY age_bucket
      ORDER BY 
        CASE age_bucket
          WHEN '0-30 days' THEN 1
          WHEN '31-60 days' THEN 2
          WHEN '61-90 days' THEN 3
          WHEN '91-120 days' THEN 4
          ELSE 5
        END
    `);

    console.log('\n📅 A/R Aging Breakdown:');
    arAging.forEach(bucket => {
      console.log(`   ${bucket.age_bucket}: ${bucket.count} claims, $${parseFloat(bucket.amount).toFixed(2)}`);
    });

    // Payment summary
    const [paymentSummary] = await connection.execute(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(fee_amount), 0) as total_fees,
        COALESCE(SUM(net_amount), 0) as net_amount
      FROM patient_payments 
      WHERE status = 'completed'
    `);

    const paySum = paymentSummary[0];
    console.log('\n💳 Payment Processing Summary:');
    console.log(`   Total Payments: ${paySum.total_payments}`);
    console.log(`   Gross Revenue: $${parseFloat(paySum.total_amount).toFixed(2)}`);
    console.log(`   Processing Fees: $${parseFloat(paySum.total_fees).toFixed(2)}`);
    console.log(`   Net Revenue: $${parseFloat(paySum.net_amount).toFixed(2)}`);

    console.log('\n🎯 Next Steps:');
    console.log('==============');
    console.log('1. Start the backend server: cd server && npm run dev');
    console.log('2. Start the frontend server: npm run dev');
    console.log('3. Navigate to: http://localhost:8080/provider/rcm');
    console.log('4. Configure payment gateway in Settings > Payment Gateways');
    console.log('5. Test payment processing with sample data');

    console.log('\n📚 Sample Patients Available:');
    const [patients] = await connection.execute(`
      SELECT 
        up.fk_userid as patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as name,
        COUNT(cb.id) as total_claims,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed
      FROM user_profiles up
      LEFT JOIN cpt_billing cb ON cb.patient_id = up.fk_userid
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      WHERE up.fk_userid BETWEEN 101 AND 110
      GROUP BY up.fk_userid, up.firstname, up.lastname
      ORDER BY up.fk_userid
    `);

    patients.forEach(patient => {
      console.log(`   Patient ${patient.patient_id}: ${patient.name} - ${patient.total_claims} claims, $${parseFloat(patient.total_billed).toFixed(2)}`);
    });

    console.log('\n🔧 Payment Gateway Configuration:');
    console.log('   - Stripe (Test): Configured and ready');
    console.log('   - Square (Test): Available for setup');
    console.log('   - Add your API keys in Payment Gateway Settings');

    console.log('\n✅ RCM System setup complete!');
    console.log('   Your RCM system now includes:');
    console.log('   • Complete billing and claims management');
    console.log('   • A/R aging and collections workflow');
    console.log('   • Payment processing with credit cards');
    console.log('   • Revenue analytics and forecasting');
    console.log('   • Sample data for testing and understanding');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MySQL is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Verify database exists: CREATE DATABASE ovhi_db;');
    console.error('4. Run: npm install mysql2');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Install required packages
async function installDependencies() {
  console.log('📦 Installing required packages...');
  
  const { spawn } = require('child_process');
  
  // Backend dependencies
  const backendPackages = [
    'stripe',
    'express-validator'
  ];
  
  // Frontend dependencies  
  const frontendPackages = [
    '@stripe/stripe-js',
    '@stripe/react-stripe-js'
  ];

  try {
    // Install backend packages
    console.log('Installing backend packages...');
    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', ...backendPackages], { 
        cwd: path.join(__dirname, 'server'),
        stdio: 'inherit' 
      });
      npm.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
    });

    // Install frontend packages
    console.log('Installing frontend packages...');
    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', ...frontendPackages], { 
        cwd: __dirname,
        stdio: 'inherit' 
      });
      npm.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
    });

    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    console.log('Please run manually:');
    console.log('cd server && npm install stripe express-validator');
    console.log('npm install @stripe/stripe-js @stripe/react-stripe-js');
  }
}

// Main execution
async function main() {
  try {
    await installDependencies();
    await setupRCMSystem();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupRCMSystem };