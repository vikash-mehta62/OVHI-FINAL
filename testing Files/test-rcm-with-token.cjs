// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:8000/api/v1';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJpc2hpbWFoZXNod2FyaTA0MEBnbWFpbC5jb20iLCJ1c2VyX2lkIjozMDQ0Niwicm9sZWlkIjo2LCJpYXQiOjE3NTc0OTA2MjJ9.C6j-nEq6jv8U2Zy_hmiwo3MtjKPXOlb3TgIwkYOp-aQ';

async function testRCMAPI() {
  console.log('🔄 Testing RCM Claims API with provided token...');
  
  try {
    // Test claims endpoint
    const response = await fetch(`${BASE_URL}/rcm/claims?page=1&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Claims API Success!');
      console.log('Claims found:', data.data?.claims?.length || 0);
      if (data.data?.claims?.length > 0) {
        console.log('First claim:', JSON.stringify(data.data.claims[0], null, 2));
      }
    } else {
      const errorData = await response.text();
      console.log('❌ Claims API Failed');
      console.log('Error Response:', errorData);
    }

  } catch (error) {
    console.error('❌ Error testing RCM API:', error.message);
  }
}

async function testSpecificClaim() {
  console.log('🔄 Testing specific claim details...');
  
  try {
    // Test specific claim endpoint that was failing
    const response = await fetch(`${BASE_URL}/rcm/claims/191/detailed`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Detailed Claim Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Detailed Claim API Success!');
      console.log('Claim details:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ Detailed Claim API Failed');
      console.log('Error Response:', errorData);
    }

  } catch (error) {
    console.error('❌ Error testing detailed claim API:', error.message);
  }
}

async function testDashboardAPI() {
  console.log('🔄 Testing RCM Dashboard API...');
  
  try {
    const response = await fetch(`${BASE_URL}/rcm/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Dashboard Response Status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dashboard API Success!');
      console.log('Dashboard Data:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await response.text();
      console.log('❌ Dashboard API Failed');
      console.log('Error Response:', errorData);
    }

  } catch (error) {
    console.error('❌ Error testing Dashboard API:', error.message);
  }
}

// Run tests
async function runTests() {
  await testRCMAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  await testDashboardAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  await testSpecificClaim();
}

runTests();