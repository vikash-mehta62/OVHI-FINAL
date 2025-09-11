import axios from 'axios';

async function testDetailedClaimAPI() {
  try {
    console.log('🧪 Testing Detailed Claim API...\n');
    
    // Test without auth first to see the endpoint
    try {
      const response = await axios.get('http://localhost:8000/api/v1/rcm/claims/1/detailed');
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Error Response:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
    }
    
    // Test basic claim endpoint
    try {
      console.log('\n🔍 Testing basic claim endpoint...');
      const response = await axios.get('http://localhost:8000/api/v1/rcm/claims/1');
      console.log('✅ Basic Claim Response:', response.data);
    } catch (error) {
      console.log('❌ Basic Claim Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDetailedClaimAPI();