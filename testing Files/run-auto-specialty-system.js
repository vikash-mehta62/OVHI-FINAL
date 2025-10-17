#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Auto Specialty Template System - Startup Script');
console.log('=' .repeat(60));

// Configuration
const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'ovhi_db',
  serverPort: process.env.PORT || 8000,
  frontendPort: process.env.FRONTEND_PORT || 3000
};

// Helper functions
function runCommand(command, description) {
  console.log(`\n📋 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function createEnvFile() {
  const envContent = `
# Database Configuration
DB_HOST=${config.dbHost}
DB_USER=${config.dbUser}
DB_PASSWORD=${config.dbPassword}
DB_NAME=${config.dbName}

# Server Configuration
PORT=${config.serverPort}
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here

# Auto Specialty Configuration
DEBUG_AUTO_SPECIALTY=true
AI_SUGGESTIONS_ENABLED=true

# Frontend Configuration
REACT_APP_API_BASE_URL=http://localhost:${config.serverPort}/api/v1
`;

  fs.writeFileSync('.env', envContent.trim());
  console.log('✅ Environment file created');
}

async function setupDatabase() {
  console.log('\n🗄️  Setting up database...');
  
  const schemaFiles = [
    'server/sql/auto_specialty_templates_schema.sql',
    'server/sql/enhanced_settings_schema.sql',
    'server/sql/smart_templates_schema.sql'
  ];
  
  for (const schemaFile of schemaFiles) {
    if (checkFileExists(schemaFile)) {
      console.log(`📄 Found schema file: ${schemaFile}`);
      
      // You would run this command to execute the SQL
      console.log(`💡 To setup database, run:`);
      console.log(`   mysql -u ${config.dbUser} -p ${config.dbName} < ${schemaFile}`);
    } else {
      console.log(`⚠️  Schema file not found: ${schemaFile}`);
    }
  }
}

function checkDependencies() {
  console.log('\n📦 Checking dependencies...');
  
  const requiredDeps = [
    'express',
    'express-validator',
    'mysql2',
    'jsonwebtoken',
    'bcryptjs',
    'cors',
    'dotenv'
  ];
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const installedDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const missingDeps = requiredDeps.filter(dep => !installedDeps[dep]);
  
  if (missingDeps.length > 0) {
    console.log(`⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('💡 Run: npm install ' + missingDeps.join(' '));
    return false;
  }
  
  console.log('✅ All required dependencies are installed');
  return true;
}

function checkProjectStructure() {
  console.log('\n📁 Checking project structure...');
  
  const requiredFiles = [
    'server/services/settings/autoSpecialtyCtrl.js',
    'server/services/settings/autoSpecialtyRoutes.js',
    'server/services/settings/enhancedSettingsRoutes.js',
    'src/components/settings/AutoSpecialtyTemplateSettings.tsx',
    'src/services/operations/autoSpecialtyTemplates.js'
  ];
  
  const missingFiles = requiredFiles.filter(file => !checkFileExists(file));
  
  if (missingFiles.length > 0) {
    console.log('❌ Missing required files:');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    return false;
  }
  
  console.log('✅ All required files are present');
  return true;
}

function displayStartupInstructions() {
  console.log('\n🎯 Startup Instructions:');
  console.log('=' .repeat(40));
  
  console.log('\n1️⃣  Database Setup:');
  console.log('   mysql -u root -p');
  console.log('   CREATE DATABASE IF NOT EXISTS ovhi_db;');
  console.log('   USE ovhi_db;');
  console.log('   SOURCE server/sql/auto_specialty_templates_schema.sql;');
  
  console.log('\n2️⃣  Backend Server:');
  console.log('   npm run server');
  console.log('   # Server will start on http://localhost:8000');
  
  console.log('\n3️⃣  Frontend Development:');
  console.log('   npm run dev');
  console.log('   # Frontend will start on http://localhost:3000');
  
  console.log('\n4️⃣  Test the API:');
  console.log('   # Update token in server/test-auto-specialty.js');
  console.log('   node server/test-auto-specialty.js');
  
  console.log('\n5️⃣  Access the System:');
  console.log('   # Navigate to Settings → Auto Templates');
  console.log('   # Configure your specialty and templates');
}

function displayAPIEndpoints() {
  console.log('\n🔗 Available API Endpoints:');
  console.log('=' .repeat(40));
  
  const endpoints = [
    'GET    /api/v1/settings/auto-specialty/config',
    'PUT    /api/v1/settings/auto-specialty/config',
    'GET    /api/v1/settings/auto-specialty/auto-assigned',
    'POST   /api/v1/settings/auto-specialty/custom-template',
    'GET    /api/v1/settings/auto-specialty/ai-recommendations',
    'GET    /api/v1/settings/auto-specialty/analytics'
  ];
  
  endpoints.forEach(endpoint => console.log(`   ${endpoint}`));
}

function displayFeatures() {
  console.log('\n✨ System Features:');
  console.log('=' .repeat(40));
  
  const features = [
    '🎯 Automatic template assignment based on specialty',
    '🤖 AI-powered template recommendations',
    '📝 Custom template creation and management',
    '📊 Template usage analytics and reporting',
    '⚙️  Specialty-specific configuration',
    '🔄 Real-time template suggestions',
    '📈 Performance tracking and optimization',
    '🔒 Secure and compliant template management'
  ];
  
  features.forEach(feature => console.log(`   ${feature}`));
}

// Main execution
async function main() {
  try {
    // Check project structure
    if (!checkProjectStructure()) {
      console.log('\n❌ Project structure check failed. Please ensure all files are in place.');
      return;
    }
    
    // Check dependencies
    if (!checkDependencies()) {
      console.log('\n❌ Dependency check failed. Please install missing dependencies.');
      return;
    }
    
    // Create .env file if it doesn't exist
    if (!checkFileExists('.env')) {
      console.log('\n📝 Creating environment configuration...');
      createEnvFile();
    }
    
    // Setup database instructions
    await setupDatabase();
    
    // Display startup instructions
    displayStartupInstructions();
    
    // Display API endpoints
    displayAPIEndpoints();
    
    // Display features
    displayFeatures();
    
    console.log('\n🎉 Auto Specialty Template System is ready to run!');
    console.log('📚 Check AUTO_SPECIALTY_SETUP.md for detailed setup instructions');
    
  } catch (error) {
    console.error('💥 Startup script error:', error);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, config };