/**
 * Test Payment Endpoints
 * This script tests if the payment endpoints are accessible
 */

async function testPaymentEndpoints() {
  const baseURL = 'http://localhost:8000';
  
  console.log('🔄 Testing payment endpoints...');
  
  // Test endpoints
  const endpoints = [
    '/api/v1/rcm/office-payments',
    '/api/v1/payments/history',
    '/api/v1/payments/era/queue',
    '/api/v1/rcm/dashboard'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing: ${baseURL}${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real app, you'd need a valid token
          'Authorization': 'Bearer test-token'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Success: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Error: ${errorText.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Endpoint testing completed!');
  console.log('\n💡 If you see network errors, make sure:');
  console.log('   • The server is running on port 8000');
  console.log('   • You have a valid authentication token');
  console.log('   • CORS is properly configured');
}

// Run the test
testPaymentEndpoints().catch(console.error);