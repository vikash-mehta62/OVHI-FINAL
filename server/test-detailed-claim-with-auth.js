const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'j5111d0f0sdfdfd00f0df';

async function testDetailedClaimAPI() {
  try {
    console.log('🧪 Testing Detailed Claim API with Auth...\n');
    
    // Create a valid JWT token
    const token = jwt.sign(
      {
        userId: 1,
        email: 'test@example.com',
        role: 'provider'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('🔑 Generated token:', token.substring(0, 50) + '...\n');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test detailed claim endpoint
    try {
      console.log('🔍 Testing detailed claim endpoint...');
      const response = await axios.get('http://localhost:8000/api/v1/rcm/claims/168/detailed', { headers });
      console.log('✅ Detailed Claim Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Detailed Claim Error:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
    }
    
    // Test basic claim endpoint for comparison
    try {
      console.log('\n🔍 Testing basic claim endpoint...');
      const response = await axios.get('http://localhost:8000/api/v1/rcm/claims/168', { headers });
      console.log('✅ Basic Claim Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Basic Claim Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testDetailedClaimAPI();