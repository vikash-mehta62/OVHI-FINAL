const mysql = require('mysql2/promise');
const { createLabIntegrationTables, validateTablesCreated, insertSampleData } = require('./migrations/002_create_lab_integration_tables.js');
const { labEncryption } = require('./utils/labEncryption.js');

/**
 * Lab Integration System Setup Script
 * Initializes the complete lab integration system with database schema,
 * sample data, and configuration validation
 */

async function setupLabIntegrationSystem() {
    console.log('🧪 Lab Integration System Setup');
    console.log('================================\n');
    
    let connection;
    
    try {
        // Database connection
        console.log('🔌 Connecting to database...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ovhi'
        });
        console.log('✅ Database connected successfully\n');
        
        // Create lab integration tables
        console.log('📋 Setting up Lab Integration database schema...');
        await createLabIntegrationTables(connection);
        console.log('✅ Database schema created\n');
        
        // Validate table creation
        console.log('🔍 Validating database schema...');
        await validateTablesCreated(connection);
        console.log('✅ Database schema validated\n');
        
        // Insert sample data
        console.log('📊 Inserting sample lab data...');
        await insertSampleData(connection);
        console.log('✅ Sample data inserted\n');
        
        // Validate encryption configuration
        console.log('🔐 Validating encryption configuration...');
        const encryptionValid = labEncryption.validateConfiguration();
        if (!encryptionValid) {
            throw new Error('Encryption configuration validation failed');
        }
        console.log('✅ Encryption configuration validated\n');
        
        // Display system information
        await displaySystemInfo(connection);
        
        // Display next steps
        displayNextSteps();
        
        console.log('🎉 Lab Integration System setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function displaySystemInfo(connection) {
    console.log('📊 Lab Integration System Information:');
    console.log('=====================================\n');
    
    try {
        // Count facilities
        const [facilities] = await connection.execute('SELECT COUNT(*) as count FROM lab_facilities');
        console.log(`🏥 Lab Facilities: ${facilities[0].count}`);
        
        // Count compendium items
        const [compendium] = await connection.execute('SELECT COUNT(*) as count FROM lab_compendium');
        console.log(`🧪 Test Compendium Items: ${compendium[0].count}`);
        
        // List available facilities
        const [facilityList] = await connection.execute(`
            SELECT name, transport_type, clia_number 
            FROM lab_facilities 
            WHERE is_active = TRUE
        `);
        
        console.log('\n🏥 Available Lab Facilities:');
        facilityList.forEach(facility => {
            console.log(`   • ${facility.name} (${facility.transport_type.toUpperCase()}) - CLIA: ${facility.clia_number}`);
        });
        
        // List available tests
        const [testList] = await connection.execute(`
            SELECT lc.display_name, lc.loinc_code, lf.name as facility_name
            FROM lab_compendium lc
            JOIN lab_facilities lf ON lc.lab_facility_id = lf.id
            WHERE lc.is_active = TRUE
            ORDER BY lf.name, lc.display_name
        `);
        
        console.log('\n🧪 Available Tests:');
        let currentFacility = '';
        testList.forEach(test => {
            if (test.facility_name !== currentFacility) {
                currentFacility = test.facility_name;
                console.log(`\n   ${currentFacility}:`);
            }
            console.log(`     • ${test.display_name} (${test.loinc_code})`);
        });
        
        // System configuration
        const [config] = await connection.execute('SELECT * FROM lab_system_config WHERE is_active = TRUE');
        console.log(`\n⚙️  System Configuration Items: ${config.length}`);
        
        console.log('\n');
        
    } catch (error) {
        console.error('❌ Error displaying system info:', error);
    }
}

function displayNextSteps() {
    console.log('🚀 Next Steps:');
    console.log('==============\n');
    
    console.log('1. 🔧 Configure Lab Facilities:');
    console.log('   • Update auth_config with real credentials');
    console.log('   • Verify endpoint URLs and connectivity');
    console.log('   • Test transmission methods\n');
    
    console.log('2. 🧪 Expand Test Compendium:');
    console.log('   • Add facility-specific test catalogs');
    console.log('   • Verify LOINC code mappings');
    console.log('   • Update reference ranges\n');
    
    console.log('3. 🔐 Security Configuration:');
    console.log('   • Set LAB_ENCRYPTION_KEY environment variable');
    console.log('   • Configure SSL certificates for HL7 connections');
    console.log('   • Set up audit log retention policies\n');
    
    console.log('4. 🔗 Integration Setup:');
    console.log('   • Configure Mirth Connect channels (if using HL7)');
    console.log('   • Set up e-fax provider credentials');
    console.log('   • Test FHIR endpoint connectivity\n');
    
    console.log('5. 📋 Implementation Tasks:');
    console.log('   • Run: node test-lab-integration-db.cjs (validate setup)');
    console.log('   • Continue with task 2: Lab facility management services');
    console.log('   • Implement lab order creation functionality\n');
    
    console.log('📚 Documentation:');
    console.log('   • Requirements: .kiro/specs/lab-integration-system/requirements.md');
    console.log('   • Design: .kiro/specs/lab-integration-system/design.md');
    console.log('   • Tasks: .kiro/specs/lab-integration-system/tasks.md\n');
}

async function checkPrerequisites() {
    console.log('🔍 Checking prerequisites...\n');
    
    // Check environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
        console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
        console.log('   Using default values for development setup\n');
    }
    
    // Check for encryption key
    if (!process.env.LAB_ENCRYPTION_KEY) {
        console.warn('⚠️  LAB_ENCRYPTION_KEY not set - will generate temporary key');
        console.log('   Set this environment variable for production use\n');
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 14) {
        console.error('❌ Node.js version 14 or higher required. Current version:', nodeVersion);
        process.exit(1);
    }
    
    console.log('✅ Prerequisites check completed\n');
}

// Main execution
async function main() {
    try {
        await checkPrerequisites();
        await setupLabIntegrationSystem();
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    setupLabIntegrationSystem,
    displaySystemInfo,
    displayNextSteps,
    checkPrerequisites
};