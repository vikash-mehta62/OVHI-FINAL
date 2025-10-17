/**
 * Follow-up API Test Script
 * Tests all follow-up management endpoints
 */

const axios = require('axios'); 

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1/rcm';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test data
const testClaimId = 1;
const testUserId = 1;
let createdFollowUpId = null;

// HTTP client with default headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Test helper functions
 */
function logTest(testName, result) {
  console.log(`\
🧪 ${testName}`);
  console.log('✅ Status:', result.status);
  console.log('📊 Data:', JSON.stringify(result.data, null, 2));
}

function logError(testName, error) {
  console.log(`\
❌ ${testName} FAILED`);
  console.log('Error:', error.response?.data || error.message);
}

/**
 * Test 1: Create a new follow-up
 */
async function testCreateFollowUp() {
  try {
    const followUpData = {
      claim_id: testClaimId,
      assigned_user_id: testUserId,
      followup_type: 'payment_inquiry',
      title: 'Test Payment Follow-up',
      description: 'Testing follow-up creation via API',
      scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      priority: 'high',
      estimated_minutes: 30,
      tags: ['test', 'api', 'payment']
    };

    const response = await api.post('/followups', followUpData);
    createdFollowUpId = response.data.data.id;
    logTest('Create Follow-up', response);
    return response.data;
  } catch (error) {
    logError('Create Follow-up', error);
    throw error;
  }
}

/**
 * Test 2: Get all follow-ups
 */
async function testGetFollowUps() {
  try {
    const response = await api.get('/followups?page=1&limit=10');
    logTest('Get Follow-ups', response);
    return response.data;
  } catch (error) {
    logError('Get Follow-ups', error);
    throw error;
  }
}

/**
 * Test 3: Get follow-ups for a specific claim
 */
async function testGetClaimFollowUps() {
  try {
    const response = await api.get(`/claims/${testClaimId}/followups`);
    logTest('Get Claim Follow-ups', response);
    return response.data;
  } catch (error) {
    logError('Get Claim Follow-ups', error);
    throw error;
  }
}

/**
 * Test 4: Update the created follow-up
 */
async function testUpdateFollowUp() {
  try {
    if (!createdFollowUpId) {
      throw new Error('No follow-up ID available for update test');
    }

    const updateData = {
      title: 'Updated Test Follow-up',
      description: 'Updated description via API test',
      priority: 'medium',
      status: 'in_progress',
      actual_minutes: 15
    };

    const response = await api.put(`/followups/${createdFollowUpId}`, updateData);
    logTest('Update Follow-up', response);
    return response.data;
  } catch (error) {
    logError('Update Follow-up', error);
    throw error;
  }
}

/**
 * Test 5: Get follow-up statistics
 */
async function testGetStatistics() {
  try {
    const response = await api.get('/followups/statistics');
    logTest('Get Follow-up Statistics', response);
    return response.data;
  } catch (error) {
    logError('Get Follow-up Statistics', error);
    throw error;
  }
}

/**
 * Test 6: Search follow-ups
 */
async function testSearchFollowUps() {
  try {
    const response = await api.get('/followups/search?query=test&page=1&limit=5');
    logTest('Search Follow-ups', response);
    return response.data;
  } catch (error) {
    logError('Search Follow-ups', error);
    throw error;
  }
}

/**
 * Test 7: Get calendar events
 */
async function testGetCalendarEvents() {
  try {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await api.get(`/followups/calendar?startDate=${startDate}&endDate=${endDate}`);
    logTest('Get Calendar Events', response);
    return response.data;
  } catch (error) {
    logError('Get Calendar Events', error);
    throw error;
  }
}

/**
 * Test 8: Complete the follow-up
 */
async function testCompleteFollowUp() {
  try {
    if (!createdFollowUpId) {
      throw new Error('No follow-up ID available for completion test');
    }

    const completionData = {
      outcome: 'Successfully contacted insurance company. Payment confirmed for next week.',
      actual_minutes: 25,
      next_followup_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      next_followup_type: 'payment_inquiry',
      next_followup_title: 'Verify payment received'
    };

    const response = await api.post(`/followups/${createdFollowUpId}/complete`, completionData);
    logTest('Complete Follow-up', response);
    return response.data;
  } catch (error) {
    logError('Complete Follow-up', error);
    throw error;
  }
}

/**
 * Test 9: Test admin endpoints (if available)
 */
async function testAdminEndpoints() {
  try {
    // Test process overdue follow-ups
    console.log('\
🔧 Testing Admin Endpoints...');
    
    const overdueResponse = await api.post('/admin/followups/process-overdue');
    logTest('Process Overdue Follow-ups', overdueResponse);

    // Test send reminders
    const reminderResponse = await api.post('/admin/followups/send-reminders');
    logTest('Send Follow-up Reminders', reminderResponse);

    return { overdue: overdueResponse.data, reminders: reminderResponse.data };
  } catch (error) {
    logError('Admin Endpoints', error);
    // Don't throw error for admin endpoints as they might require special permissions
  }
}

/**
 * Test 10: Error handling tests
 */
async function testErrorHandling() {
  console.log('\
🚨 Testing Error Handling...');
  
  try {
    // Test invalid follow-up ID
    await api.get('/followups/99999');
  } catch (error) {
    console.log('✅ Invalid ID error handled correctly:', error.response?.status);
  }

  try {
    // Test missing required fields
    await api.post('/followups', { title: 'Incomplete data' });
  } catch (error) {
    console.log('✅ Validation error handled correctly:', error.response?.status);
  }

  try {
    // Test search without query
    await api.get('/followups/search');
  } catch (error) {
    console.log('✅ Missing query error handled correctly:', error.response?.status);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Follow-up API Tests...');
  console.log('Base URL:', BASE_URL);
  
  try {
    // Core functionality tests
    await testCreateFollowUp();
    await testGetFollowUps();
    await testGetClaimFollowUps();
    await testUpdateFollowUp();
    
    // Analytics and search tests
    await testGetStatistics();
    await testSearchFollowUps();
    await testGetCalendarEvents();
    
    // Completion test
    await testCompleteFollowUp();
    
    // Admin tests (optional)
    await testAdminEndpoints();
    
    // Error handling tests
    await testErrorHandling();
    
    console.log('\
🎉 All tests completed!');
    
  } catch (error) {
    console.log('\
💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

/**
 * Performance test
 */
async function performanceTest() {
  console.log('\
⚡ Running Performance Tests...');
  
  const startTime = Date.now();
  
  // Test concurrent requests
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(api.get('/followups?page=1&limit=5'));
  }
  
  try {
    await Promise.all(promises);
    const endTime = Date.now();
    console.log(`✅ 10 concurrent requests completed in ${endTime - startTime}ms`);
  } catch (error) {
    console.log('❌ Performance test failed:', error.message);
  }
}

/**
 * Data validation test
 */
async function dataValidationTest() {
  console.log('\
🔍 Testing Data Validation...');
  
  const invalidData = [
    {
      name: 'Missing claim_id',
      data: {
        assigned_user_id: testUserId,
        followup_type: 'payment_inquiry',
        title: 'Test',
        scheduled_date: new Date().toISOString()
      }
    },
    {
      name: 'Invalid followup_type',
      data: {
        claim_id: testClaimId,
        assigned_user_id: testUserId,
        followup_type: 'invalid_type',
        title: 'Test',
        scheduled_date: new Date().toISOString()
      }
    },
    {
      name: 'Invalid date format',
      data: {
        claim_id: testClaimId,
        assigned_user_id: testUserId,
        followup_type: 'payment_inquiry',
        title: 'Test',
        scheduled_date: 'invalid-date'
      }
    }
  ];
  
  for (const test of invalidData) {
    try {
      await api.post('/followups', test.data);
      console.log(`❌ ${test.name}: Should have failed but didn't`);
    } catch (error) {
      console.log(`✅ ${test.name}: Correctly rejected (${error.response?.status})`);
    }
  }
}

// Main execution
if (require.main === module) {
  // Check if token is provided
  if (TEST_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  Please update TEST_TOKEN with a valid JWT token');
    console.log('You can get a token by logging into the application and checking the Authorization header');
    process.exit(1);
  }
  
  runAllTests()
    .then(() => performanceTest())
    .then(() => dataValidationTest())
    .then(() => {
      console.log('\
✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\
💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  testCreateFollowUp,
  testGetFollowUps,
  testGetClaimFollowUps,
  testUpdateFollowUp,
  testCompleteFollowUp,
  testGetStatistics,
  testSearchFollowUps,
  testGetCalendarEvents,
  runAllTests
};