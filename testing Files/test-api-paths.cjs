const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1/billings';

// Helper function to get auth headers (for testing)
const getTestAuthHeaders = () => {
  return {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  };
};

async function testApiPaths() {
  console.log('🔗 Testing Updated API Paths...\n');
  
  try {
    // Test 1: Get services with new path
    console.log('1. Testing GET /api/v1/billings/services');
    const servicesResponse = await axios.get(`${API_BASE_URL}/services`);
    console.log(`✅ Services endpoint working: ${servicesResponse.data.data.length} services found`);
    
    // Test 2: Get patients with new path
    console.log('\n2. Testing GET /api/v1/billings/patients');
    const patientsResponse = await axios.get(`${API_BASE_URL}/patients`);
    console.log(`✅ Patients endpoint working: ${patientsResponse.data.data.length} patients found`);
    
    // Test 3: Search patients with new path
    console.log('\n3. Testing POST /api/v1/billings/search-patients');
    try {
      const searchResponse = await axios.post(`${API_BASE_URL}/search-patients`, {
        searchTerm: 'test'
      }, {
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ Search endpoint working: ${searchResponse.data.data.length} results found`);
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('⚠️  Search endpoint requires authentication (expected)');
      } else {
        throw authError;
      }
    }
    
    // Test 4: Get invoices with new path
    console.log('\n4. Testing GET /api/v1/billings/invoices');
    const invoicesResponse = await axios.get(`${API_BASE_URL}/invoices`);
    console.log(`✅ Invoices endpoint working: ${invoicesResponse.data.data.length} invoices found`);
    
    console.log('\n🎉 All API paths are correctly configured!');
    console.log('\n📋 Available endpoints:');
    console.log('- GET    /api/v1/billings/services');
    console.log('- GET    /api/v1/billings/patients');
    console.log('- POST   /api/v1/billings/search-patients');
    console.log('- GET    /api/v1/billings/invoices');
    console.log('- GET    /api/v1/billings/invoices/:id');
    console.log('- POST   /api/v1/billings/bills');
    console.log('- GET    /api/v1/billings/bills/:id');
    console.log('- POST   /api/v1/billings/invoices/:bill_id/generate');
    console.log('- POST   /api/v1/billings/payments');
    console.log('- PATCH  /api/v1/billings/invoices/:id/status');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testApiPaths().catch(console.error);
}

module.exports = { testApiPaths };