// Using built-in fetch in Node.js 18+

async function testRCMAPI() {
  try {
    console.log('🔄 Testing RCM Dashboard API...');
    
    // Test dashboard endpoint
    const response = await fetch('http://localhost:8000/api/v1/rcm/dashboard?timeframe=30d', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You might need to add authorization header if required
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ RCM Dashboard API Response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check for NaN values
    const jsonString = JSON.stringify(data);
    if (jsonString.includes('NaN') || jsonString.includes('null')) {
      console.log('⚠️  Found potential NaN or null values in response');
    } else {
      console.log('✅ No NaN values found in response');
    }
    
  } catch (error) {
    console.error('❌ Error testing RCM API:', error.message);
  }
}

testRCMAPI();