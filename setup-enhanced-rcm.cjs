#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Enhanced RCM System');
console.log('==================================');
console.log('• Auto-correction suggestions');
console.log('• Patient statements');
console.log('• Claim validation & scoring');
console.log('• Intelligent CPT/diagnosis suggestions');

async function setupEnhancedRCM() {
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

    // 1. Install enhanced schema
    console.log('\n📊 Installing enhanced RCM schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'server/sql/rcm_enhanced_schema.sql'), 'utf8');
    await connection.execute(schemaSQL);
    console.log('✅ Enhanced schema installed');

    // 2. Install PDFKit for statement generation
    console.log('\n📦 Installing PDFKit dependency...');
    const { spawn } = require('child_process');
    
    await new Promise((resolve, reject) => {
      const npm = spawn('npm', ['install', 'pdfkit'], { 
        cwd: path.join(__dirname, 'server'),
        stdio: 'inherit' 
      });
      npm.on('close', (code) => code === 0 ? resolve() : reject(new Error(`npm install failed with code ${code}`)));
    });
    console.log('✅ PDFKit installed');

    // 3. Verify enhanced tables
    console.log('\n🔍 Verifying enhanced tables...');
    
    const tables = [
      'patient_statements',
      'claim_validations', 
      'auto_corrections',
      'claim_suggestions',
      'diagnosis_cpt_rules',
      'payer_rules',
      'statement_line_items',
      'rcm_audit_trail'
    ];

    for (const table of tables) {
      const [result] = await connection.execute(`SHOW TABLES LIKE '${table}'`);
      if (result.length > 0) {
        console.log(`✅ ${table} table created`);
      } else {
        console.log(`❌ ${table} table missing`);
      }
    }

    // 4. Check sample data
    console.log('\n📋 Checking sample data...');
    
    const [diagnosisRules] = await connection.execute('SELECT COUNT(*) as count FROM diagnosis_cpt_rules');
    console.log(`✅ Diagnosis-CPT rules: ${diagnosisRules[0].count} records`);
    
    const [payerRules] = await connection.execute('SELECT COUNT(*) as count FROM payer_rules');
    console.log(`✅ Payer rules: ${payerRules[0].count} records`);

    // 5. Test enhanced features
    console.log('\n🧪 Testing enhanced features...');
    
    // Test claim validation data
    const [testClaims] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM cpt_billing cb 
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id 
      WHERE cc.is_active = TRUE
    `);
    console.log(`✅ Active claims for validation: ${testClaims[0].count}`);

    // Test patient data for statements
    const [testPatients] = await connection.execute(`
      SELECT COUNT(DISTINCT cb.patient_id) as count 
      FROM cpt_billing cb 
      WHERE cb.status != 2
    `);
    console.log(`✅ Patients with outstanding balances: ${testPatients[0].count}`);

    console.log('\n🎉 Enhanced RCM Setup Complete!');
    console.log('\n📋 New Features Available:');
    console.log('• Claim Validation & Scoring');
    console.log('• Auto-Correction Suggestions');
    console.log('• Patient Statement Generation');
    console.log('• Intelligent CPT/Diagnosis Matching');
    console.log('• Medical Necessity Checking');
    console.log('• Payer-Specific Rules');

    console.log('\n🚀 Next Steps:');
    console.log('1. Start backend: cd server && npm run dev');
    console.log('2. Start frontend: npm run dev');
    console.log('3. Access enhanced RCM: http://localhost:8080/provider/rcm');
    console.log('4. Try new tabs: Validation, Auto-Fix, Statements');

    console.log('\n💡 Enhanced Features:');
    console.log('• Validation Tab: Score claims for approval probability');
    console.log('• Auto-Fix Tab: Get intelligent correction suggestions');
    console.log('• Statements Tab: Generate and send patient statements');
    console.log('• Claims Tab: Enhanced with validation and suggestions');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure MySQL is running');
    console.error('2. Check database credentials in .env file');
    console.error('3. Verify database exists: CREATE DATABASE ovhi_db;');
    console.error('4. Run basic RCM setup first: node setup-rcm-with-payments.js');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Check prerequisites
async function checkPrerequisites() {
  console.log('🔍 Checking prerequisites...');
  
  // Check if basic RCM tables exist
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ovhi_db'
    });

    const [cptCodes] = await connection.execute("SHOW TABLES LIKE 'cpt_codes'");
    const [cptBilling] = await connection.execute("SHOW TABLES LIKE 'cpt_billing'");
    
    if (cptCodes.length === 0 || cptBilling.length === 0) {
      console.log('⚠️  Basic RCM tables not found');
      console.log('Please run basic setup first: node setup-rcm-with-payments.js');
      process.exit(1);
    }
    
    console.log('✅ Prerequisites met');
    
  } catch (error) {
    console.log('⚠️  Database connection failed');
    console.log('Please ensure MySQL is running and database exists');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  try {
    await checkPrerequisites();
    await setupEnhancedRCM();
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { setupEnhancedRCM };