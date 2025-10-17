#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

console.log('🔍 RCM System Debug Tool');
console.log('=' .repeat(50));

// Configuration
const config = {
  backendUrl: 'http://localhost:8000',
  frontendUrl: 'http://localhost:8080',
  testToken: 'your-jwt-token-here' // Replace with actual token
};

// Helper function to make API requests
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 5000
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    };
  }
}

// Test backend server connectivity
async function testBackendConnectivity() {
  console.log('\n🔧 Testing Backend Connectivity...');
  
  const result = await makeRequest('GET', `${config.backendUrl}/api/v1/ping`);
  
  if (result.success) {
    console.log('✅ Backend server is running');
    return true;
  } else {
    console.log('❌ Backend server is not accessible');
    console.log('   Error:', result.error);
    console.log('   💡 Start backend: cd server && npm run dev');
    return false;
  }
}

// Test RCM routes specifically
async function testRCMRoutes() {
  console.log('\n🏥 Testing RCM Routes...');
  
  const routes = [
    '/api/v1/rcm/dashboard',
    '/api/v1/rcm/claims',
    '/api/v1/rcm/ar-aging',
    '/api/v1/rcm/denials/analytics',
    '/api/v1/rcm/payments',
    '/api/v1/rcm/revenue-forecasting',
    '/api/v1/rcm/collections'
  ];

  let passedTests = 0;
  
  for (const route of routes) {
    const result = await makeRequest('GET', `${config.backendUrl}${route}`);
    
    if (result.success) {
      console.log(`✅ ${route} - Working`);
      passedTests++;
    } else if (result.status === 401) {
      console.log(`🔐 ${route} - Requires Authentication (Expected)`);
      passedTests++;
    } else if (result.status === 404) {
      console.log(`❌ ${route} - Route Not Found`);
    } else {
      console.log(`⚠️  ${route} - Error: ${result.error}`);
    }
  }
  
  console.log(`\n📊 RCM Routes Test: ${passedTests}/${routes.length} passed`);
  return passedTests === routes.length;
}

// Check file structure
function checkFileStructure() {
  console.log('\n📁 Checking File Structure...');
  
  const requiredFiles = [
    'server/services/rcm/rcmCtrl.js',
    'server/services/rcm/rcmRoutes.js',
    'server/services/index.js',
    'src/pages/RCMManagement.tsx',
    'src/components/rcm/RCMDashboard.tsx',
    'src/services/operations/rcm.js',
    'src/services/apis.js',
    'src/App.tsx'
  ];
  
  let missingFiles = [];
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`✅ ${file}`);
    } else {
      console.log(`❌ ${file} - Missing`);
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length === 0) {
    console.log('\n✅ All required files are present');
    return true;
  } else {
    console.log(`\n❌ Missing ${missingFiles.length} required files`);
    return false;
  }
}

// Main debug function
async function debugRCMSystem() {
  console.log('Starting comprehensive RCM system diagnosis...\n');
  
  const results = {
    backend: false,
    routes: false,
    files: false
  };
  
  // Run all tests
  results.files = checkFileStructure();
  results.backend = await testBackendConnectivity();
  
  if (results.backend) {
    results.routes = await testRCMRoutes();
  }
  
  // Summary
  console.log('\n📋 System Status Summary:');
  console.log('=' .repeat(30));
  console.log(`Backend Server: ${results.backend ? '✅ Running' : '❌ Not Running'}`);
  console.log(`RCM Routes: ${results.routes ? '✅ Working' : '❌ Issues Found'}`);
  console.log(`File Structure: ${results.files ? '✅ Complete' : '❌ Missing Files'}`);
  
  // Generate recommendations
  console.log('\n🔧 Fix Recommendations:');
  console.log('=' .repeat(30));
  
  if (!results.backend) {
    console.log('❌ Backend Server Issues:');
    console.log('   1. cd server');
    console.log('   2. npm install');
    console.log('   3. npm run dev');
    console.log('   4. Check if port 8000 is available');
    console.log('');
  }
  
  if (!results.routes && results.backend) {
    console.log('❌ RCM Routes Issues:');
    console.log('   1. Check server/services/index.js contains:');
    console.log('      router.use("/rcm", verifyToken, rcmRoutes);');
    console.log('   2. Verify database connection');
    console.log('   3. Check authentication middleware');
    console.log('');
  }
  
  if (!results.files) {
    console.log('❌ Missing Files:');
    console.log('   1. Ensure all RCM components are created');
    console.log('   2. Run: node fix-rcm-system.js');
    console.log('');
  }
  
  console.log('🎯 Quick Test Steps:');
  console.log('1. Start backend: cd server && npm run dev');
  console.log('2. Start frontend: npm run dev');
  console.log('3. Navigate to: http://localhost:8080/provider/rcm');
  console.log('4. Login with provider credentials (role = 6)');
  
  return results;
}

// Run the debug tool
debugRCMSystem().then((results) => {
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 System diagnosis complete - everything looks good!');
  } else {
    console.log('\n⚠️  System diagnosis complete - issues found above');
  }
});

module.exports = { debugRCMSystem, config };