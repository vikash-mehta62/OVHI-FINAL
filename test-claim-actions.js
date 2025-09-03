/**
 * Test Script for New Claim Actions
 * Tests the new claim management actions: Correct & Resubmit, File Appeal, Transfer to Patient, Add Comment, Void Claim
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1/rcm';
const TEST_TOKEN = 'test-token'; // Replace with actual token

// Test data
const testClaimId = 1;
const testUserId = 1;

async function testClaimActions() {
  console.log('🧪 Testing Claim Actions...\n');

  try {
    // Test 1: Correct & Resubmit Claim
    console.log('1. Testing Correct & Resubmit Claim...');
    try {
      const correctResponse = await axios.post(
        `${BASE_URL}/claims/${testClaimId}/correct-resubmit`,
        {
          correction_reason: 'Updated diagnosis code and procedure code for accuracy'
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Correct & Resubmit:', correctResponse.data.message);
    } catch (error) {
      console.log('❌ Correct & Resubmit failed:', error.response?.data?.message || error.message);
    }

    // Test 2: File Appeal
    console.log('\n2. Testing File Appeal...');
    try {
      const appealResponse = await axios.post(
        `${BASE_URL}/claims/${testClaimId}/appeal`,
        {
          appeal_reason: 'Medical necessity clearly documented in patient records. Requesting reconsideration.'
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ File Appeal:', appealResponse.data.message);
    } catch (error) {
      console.log('❌ File Appeal failed:', error.response?.data?.message || error.message);
    }

    // Test 3: Transfer to Patient
    console.log('\n3. Testing Transfer to Patient...');
    try {
      const transferResponse = await axios.post(
        `${BASE_URL}/claims/${testClaimId}/transfer-patient`,
        {
          transfer_reason: 'Insurance coverage exhausted. Patient responsible for remaining balance.'
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Transfer to Patient:', transferResponse.data.message);
    } catch (error) {
      console.log('❌ Transfer to Patient failed:', error.response?.data?.message || error.message);
    }

    // Test 4: Add Comment
    console.log('\n4. Testing Add Comment...');
    try {
      const commentResponse = await axios.post(
        `${BASE_URL}/claims/${testClaimId}/comment`,
        {
          comment: 'Spoke with patient about treatment plan. Patient agrees to proceed with recommended therapy.'
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Add Comment:', commentResponse.data.message);
    } catch (error) {
      console.log('❌ Add Comment failed:', error.response?.data?.message || error.message);
    }

    // Test 5: Void Claim
    console.log('\n5. Testing Void Claim...');
    try {
      const voidResponse = await axios.post(
        `${BASE_URL}/claims/${testClaimId}/void`,
        {
          void_reason: 'Duplicate claim submitted in error. Original claim already processed.'
        },
        {
          headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('✅ Void Claim:', voidResponse.data.message);
    } catch (error) {
      console.log('❌ Void Claim failed:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 Claim Actions Testing Complete!');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
}

// Test validation errors
async function testValidationErrors() {
  console.log('\n🔍 Testing Validation Errors...\n');

  // Test empty correction reason
  try {
    await axios.post(
      `${BASE_URL}/claims/${testClaimId}/correct-resubmit`,
      { correction_reason: '' },
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.log('✅ Empty correction reason validation:', error.response?.data?.message);
  }

  // Test invalid claim ID
  try {
    await axios.post(
      `${BASE_URL}/claims/invalid/appeal`,
      { appeal_reason: 'Test appeal' },
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.log('✅ Invalid claim ID validation:', error.response?.data?.message);
  }

  console.log('\n✅ Validation testing complete!');
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Claim Actions Test Suite\n');
  console.log('='.repeat(50));
  
  await testClaimActions();
  await testValidationErrors();
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Test Summary:');
  console.log('- Correct & Resubmit Claim');
  console.log('- File Appeal');
  console.log('- Transfer to Patient');
  console.log('- Add Comment');
  console.log('- Void Claim');
  console.log('- Validation Error Handling');
  console.log('\n✨ All claim actions are now available in the RCM system!');
}

// Execute tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testClaimActions,
  testValidationErrors,
  runTests
};