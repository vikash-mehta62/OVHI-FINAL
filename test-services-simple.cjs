const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function testServicesModule() {
  try {
    console.log('🧪 Testing Services Management Module...');

    // Test 1: Get all services (without authentication first)
    console.log('\n1️⃣ Testing GET /services (without auth)');
    try {
      const response = await axios.get(`${BASE_URL}/services`);
      console.log('❌ Should have failed without auth');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly requires authentication');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    // Test 2: Check if services endpoint exists
    console.log('\n2️⃣ Testing services endpoint availability');
    try {
      const response = await axios.get(`${BASE_URL}/services`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('✅ Services endpoint exists and requires valid auth');
      } else {
        console.log('❌ Unexpected response:', error.response?.status, error.response?.data);
      }
    }

    console.log('\n🎉 Services module basic tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Login to the frontend at http://localhost:8080');
    console.log('   2. Navigate to /provider/services');
    console.log('   3. Test CRUD operations in the UI');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testServicesModule();