const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1/billings';

// Helper function to get auth headers (for testing)
const getTestAuthHeaders = () => {
  // Valid JWT token generated for testing
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3RfdXNlciIsInJvbGVpZCI6MSwiaWF0IjoxNzU4MTE3Njk0LCJleHAiOjE3NTgyMDQwOTR9.g15EZbcMCAtFy-m8JH7fe7J2sreSHkXl1JVybm3dGuM';
  return {
    'Authorization': `Bearer ${testToken}`,
    'Content-Type': 'application/json'
  };
};

async function testBillingSearch() {
  console.log('🔍 Testing Patient Search Functionality...\n');
  
  try {
    // Test 1: Search patients with a common term
    console.log('1. Testing POST /search-patients with search term');
    const searchResponse = await axios.post(`${API_BASE_URL}/search-patients`, {
      searchTerm: 'John'
    }, {
      headers: getTestAuthHeaders()
    });
    
    console.log(`✅ Found ${searchResponse.data.data.length} patients matching 'John'`);
    if (searchResponse.data.data.length > 0) {
      console.log('   Sample result:', searchResponse.data.data[0]);
    }
    
    // Test 2: Search with empty term
    console.log('\n2. Testing search with empty term');
    const emptySearchResponse = await axios.post(`${API_BASE_URL}/search-patients`, {
      searchTerm: ''
    }, {
      headers: getTestAuthHeaders()
    });
    
    console.log(`✅ Empty search returned ${emptySearchResponse.data.data.length} results`);
    
    // Test 3: Search with non-existent term
    console.log('\n3. Testing search with non-existent term');
    const noResultsResponse = await axios.post(`${API_BASE_URL}/search-patients`, {
      searchTerm: 'NonExistentPatient123'
    }, {
      headers: getTestAuthHeaders()
    });
    
    console.log(`✅ Non-existent search returned ${noResultsResponse.data.data.length} results`);
    
    // Test 4: Get services with new structure
    console.log('\n4. Testing GET /services with new structure');
    const servicesResponse = await axios.get(`${API_BASE_URL}/services`, {
      headers: getTestAuthHeaders()
    });
    const services = servicesResponse.data.data;
    
    console.log(`✅ Found ${services.length} services`);
    if (services.length > 0) {
      const sampleService = services[0];
      console.log('   Sample service structure:');
      console.log(`   - service_id: ${sampleService.service_id}`);
      console.log(`   - name: ${sampleService.name}`);
      console.log(`   - cpt_codes: ${sampleService.cpt_codes}`);
      console.log(`   - price: $${sampleService.price}`);
    }
    
    console.log('\n🎉 All search tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication required. Make sure you have valid credentials.');
      console.log('   The search endpoint requires authentication.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testBillingSearch().catch(console.error);
}

module.exports = { testBillingSearch };