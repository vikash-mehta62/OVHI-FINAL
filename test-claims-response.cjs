// Test the exact claims API response structure

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InJpc2hpbWFoZXNod2FyaTA0MEBnbWFpbC5jb20iLCJ1c2VyX2lkIjozMDQ0Niwicm9sZWlkIjo2LCJpYXQiOjE3NTc0OTA2MjJ9.C6j-nEq6jv8U2Zy_hmiwo3MtjKPXOlb3TgIwkYOp-aQ';

async function testClaimsResponse() {
  console.log('🔄 Testing claims API response structure...');
  
  try {
    const response = await fetch('http://localhost:8000/api/v1/rcm/claims?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      console.log('✅ Response received');
      console.log('📋 Response structure:');
      console.log('  - success:', result.success);
      console.log('  - data exists:', !!result.data);
      
      if (result.data) {
        console.log('  - data.claims exists:', !!result.data.claims);
        console.log('  - data.claims is array:', Array.isArray(result.data.claims));
        console.log('  - claims count:', result.data.claims?.length || 0);
        
        if (result.data.claims && result.data.claims.length > 0) {
          console.log('📄 First claim structure:');
          const firstClaim = result.data.claims[0];
          console.log('  - id:', firstClaim.id);
          console.log('  - patient_name:', firstClaim.patient_name);
          console.log('  - total_amount:', firstClaim.total_amount);
          console.log('  - status:', firstClaim.status);
          console.log('  - claim_number:', firstClaim.claim_number);
        }
        
        console.log('📊 Pagination info:');
        console.log('  - pagination exists:', !!result.data.pagination);
        if (result.data.pagination) {
          console.log('  - page:', result.data.pagination.page);
          console.log('  - total:', result.data.pagination.total);
        }
      }
      
      console.log('\n🔍 Full response (first 500 chars):');
      console.log(JSON.stringify(result, null, 2).substring(0, 500) + '...');
      
    } else {
      console.log('❌ Response failed:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testClaimsResponse();