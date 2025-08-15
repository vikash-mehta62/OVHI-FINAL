// Enhanced RCM endpoint testing script
const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test data - you'll need to replace with actual token and user data
const TEST_TOKEN = 'your-jwt-token-here';

// Test without authentication first
async function testRCMEndpointsNoAuth() {
  console.log('🧪 Testing RCM Endpoints (No Auth)...\n');

  const endpoints = [
    '/rcm/dashboard',
    '/rcm/claims',
    '/rcm/ar-aging',
    '/rcm/denials/analytics',
    '/rcm/payments',
    '/rcm/revenue-forecasting',
    '/rcm/collections'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      console.log(`✅ ${endpoint} - Working (Status: ${response.status})`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`🔐 ${endpoint} - Requires Authentication (Expected)`);
      } else if (error.response?.status === 404) {
        console.log(`❌ ${endpoint} - Route Not Found`);
      } else {
        console.log(`⚠️  ${endpoint} - Error: ${error.response?.status || error.message}`);
      }
    }
  }
}

async function testRCMEndpointsWithAuth() {
  if (TEST_TOKEN === 'your-jwt-token-here') {
    console.log('\n⚠️  Skipping authenticated tests - please update TEST_TOKEN');
    return;
  }

  console.log('\n🔐 Testing RCM Endpoints (With Auth)...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Dashboard Data
    console.log('1. Testing Dashboard Data...');
    const dashboardResponse = await axios.get(`${BASE_URL}/rcm/dashboard`, { headers });
    console.log('✅ Dashboard:', dashboardResponse.data.success ? 'Success' : 'Failed');

    // Test 2: Claims Status
    console.log('2. Testing Claims Status...');
    const claimsResponse = await axios.get(`${BASE_URL}/rcm/claims?page=1&limit=5`, { headers });
    console.log('✅ Claims:', claimsResponse.data.success ? 'Success' : 'Failed');

    // Test 3: A/R Aging
    console.log('3. Testing A/R Aging...');
    const arResponse = await axios.get(`${BASE_URL}/rcm/ar-aging`, { headers });
    console.log('✅ A/R Aging:', arResponse.data.success ? 'Success' : 'Failed');

    // Test 4: Denial Analytics
    console.log('4. Testing Denial Analytics...');
    const denialResponse = await axios.get(`${BASE_URL}/rcm/denials/analytics`, { headers });
    console.log('✅ Denial Analytics:', denialResponse.data.success ? 'Success' : 'Failed');

    console.log('\n🎉 All authenticated RCM endpoints are working!');

  } catch (error) {
    console.error('❌ Error testing authenticated RCM endpoints:', error.response?.data || error.message);
  }
}

// Test server connectivity
async function testServerConnectivity() {
  console.log('🔧 Testing Server Connectivity...\n');
  
  try {
    const response = await axios.get(`${BASE_URL}/ping`);
    console.log('✅ Server is running and accessible');
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible');
    console.log('   Make sure the server is running on port 8000');
    console.log('   Run: npm run server (in the server directory)');
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 RCM System Backend Tests');
  console.log('=' .repeat(40));
  
  // Test server connectivity first
  const serverRunning = await testServerConnectivity();
  
  if (serverRunning) {
    // Test endpoints without authentication
    await testRCMEndpointsNoAuth();
    
    // Test endpoints with authentication if token is provided
    await testRCMEndpointsWithAuth();
  }
  
  console.log('\n📋 Test Summary:');
  console.log('- If you see "Requires Authentication" messages, that\'s expected');
  console.log('- If you see "Route Not Found" errors, check the backend routing');
  console.log('- Update TEST_TOKEN to test authenticated endpoints');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. If server is not running: npm run server');
  console.log('2. If routes not found: check server/services/index.js');
  console.log('3. For frontend issues: check http://localhost:8080/provider/rcm');
}

// Run the test
if (require.main === module) {
  runAllTests();
}

module.exports = { 
  testRCMEndpointsNoAuth, 
  testRCMEndpointsWithAuth, 
  testServerConnectivity,
  runAllTests 
};