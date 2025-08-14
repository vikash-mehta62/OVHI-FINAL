// Simple test script to verify RCM endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test data - you'll need to replace with actual token and user data
const TEST_TOKEN = 'your-jwt-token-here';

async function testRCMEndpoints() {
  console.log('🧪 Testing RCM Endpoints...\n');

  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: Dashboard Data
    console.log('1. Testing Dashboard Data...');
    const dashboardResponse = await axios.get(`${BASE_URL}/rcm/dashboard`, { headers });
    console.log('✅ Dashboard:', dashboardResponse.data);
    console.log('');

    // Test 2: Claims Status
    console.log('2. Testing Claims Status...');
    const claimsResponse = await axios.get(`${BASE_URL}/rcm/claims?page=1&limit=5`, { headers });
    console.log('✅ Claims:', claimsResponse.data);
    console.log('');

    // Test 3: A/R Aging
    console.log('3. Testing A/R Aging...');
    const arResponse = await axios.get(`${BASE_URL}/rcm/ar-aging`, { headers });
    console.log('✅ A/R Aging:', arResponse.data);
    console.log('');

    // Test 4: Denial Analytics
    console.log('4. Testing Denial Analytics...');
    const denialResponse = await axios.get(`${BASE_URL}/rcm/denials/analytics`, { headers });
    console.log('✅ Denial Analytics:', denialResponse.data);
    console.log('');

    console.log('🎉 All RCM endpoints are working!');

  } catch (error) {
    console.error('❌ Error testing RCM endpoints:', error.response?.data || error.message);
  }
}

// Run the test
if (require.main === module) {
  console.log('To run this test:');
  console.log('1. Start your server: npm run dev');
  console.log('2. Replace TEST_TOKEN with a valid JWT token');
  console.log('3. Run: node test-rcm.js');
  console.log('');
  
  // Uncomment the line below and add a valid token to run the test
  // testRCMEndpoints();
}

module.exports = { testRCMEndpoints };