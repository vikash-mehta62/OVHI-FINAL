// Test detailed claim API specifically

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJpc2hpbWFoZXNod2FyaTA0MEBnbWFpbC5jb20iLCJ1c2VyX2lkIjozMDQ0Niwicm9sZWlkIjo2LCJpYXQiOjE3NTc0OTA2MjJ9.C6j-nEq6jv8U2Zy_hmiwo3MtjKPXOlb3TgIwkYOp-aQ';

async function testDetailedClaim() {
  console.log('🔄 Testing detailed claim API...');
  
  try {
    const response = await fetch('http://localhost:8000/api/v1/rcm/claims/191/detailed', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response Body:', responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ Detailed Claim API Success!');
      console.log('Claim ID:', data.data?.id);
      console.log('Patient Name:', data.data?.patientName);
      console.log('Total Amount:', data.data?.totalAmount);
    } else {
      console.log('❌ Detailed Claim API Failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error Details:', errorData);
      } catch (e) {
        console.log('Raw Error:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Error testing detailed claim API:', error.message);
  }
}

testDetailedClaim();