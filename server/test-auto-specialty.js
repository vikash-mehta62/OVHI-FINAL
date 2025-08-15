const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:8000/api/v1/settings/auto-specialty';
const TEST_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Test data
const testSpecialtyConfig = {
  specialty: 'Primary Care',
  auto_template_assignment: true,
  default_templates: ['1', '2'],
  custom_templates: [],
  ai_suggestions_enabled: true,
  template_preferences: {
    visit_types: ['New Patient', 'Established Patient', 'Annual/Preventive'],
    required_fields: ['chief_complaint', 'history_present_illness', 'physical_exam'],
    billing_integration: true
  },
  ai_settings: {
    content_suggestions: true,
    billing_code_suggestions: true,
    contextual_recommendations: true,
    learning_enabled: true
  }
};

const testCustomTemplate = {
  template_name: 'Test Custom Template',
  specialty: 'Primary Care',
  visit_type: 'Established Patient',
  soap_structure: {
    subjective: 'Patient reports feeling well with no acute complaints',
    objective: 'Vital signs stable, physical examination unremarkable',
    assessment: 'Patient appears healthy with no acute issues',
    plan: 'Continue current medications, return in 6 months for routine follow-up'
  },
  billing_codes: {
    primary_cpt: '99213',
    secondary_cpts: [],
    icd10_codes: ['Z00.00']
  },
  is_default: false,
  ai_enhanced: true,
  tags: ['routine', 'follow-up', 'primary-care']
};

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

// Test functions
async function testGetSpecialtyConfiguration() {
  console.log('\n🧪 Testing: Get Specialty Configuration');
  const result = await makeRequest('GET', '/config');
  
  if (result?.success) {
    console.log('✅ Success:', result.data);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

async function testUpdateSpecialtyConfiguration() {
  console.log('\n🧪 Testing: Update Specialty Configuration');
  const result = await makeRequest('PUT', '/config', testSpecialtyConfig);
  
  if (result?.success) {
    console.log('✅ Success:', result.message);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

async function testGetAutoAssignedTemplates() {
  console.log('\n🧪 Testing: Get Auto-Assigned Templates');
  const params = new URLSearchParams({
    visit_type: 'Established Patient',
    chief_complaint: 'routine checkup',
    patient_context: JSON.stringify({ age: 45, gender: 'M' })
  });
  
  const result = await makeRequest('GET', `/auto-assigned?${params}`);
  
  if (result?.success) {
    console.log('✅ Success:', result.data);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

async function testCreateCustomTemplate() {
  console.log('\n🧪 Testing: Create Custom Template');
  const result = await makeRequest('POST', '/custom-template', testCustomTemplate);
  
  if (result?.success) {
    console.log('✅ Success:', result.message);
    console.log('Template ID:', result.data.template_id);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

async function testGetAIRecommendations() {
  console.log('\n🧪 Testing: Get AI Template Recommendations');
  const params = new URLSearchParams({
    specialty: 'Primary Care',
    visit_type: 'Sick Visit',
    chief_complaint: 'headache',
    patient_age: '35',
    patient_gender: 'F'
  });
  
  const result = await makeRequest('GET', `/ai-recommendations?${params}`);
  
  if (result?.success) {
    console.log('✅ Success:', result.data);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

async function testGetSpecialtyAnalytics() {
  console.log('\n🧪 Testing: Get Specialty Template Analytics');
  const params = new URLSearchParams({
    specialty: 'Primary Care',
    timeframe: '30d'
  });
  
  const result = await makeRequest('GET', `/analytics?${params}`);
  
  if (result?.success) {
    console.log('✅ Success:', result.data);
  } else {
    console.log('❌ Failed:', result);
  }
  
  return result;
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Auto Specialty Template API Tests');
  console.log('='.repeat(50));
  
  // Update the token before running tests
  if (TEST_TOKEN === 'your-jwt-token-here') {
    console.log('❌ Please update TEST_TOKEN with a valid JWT token');
    return;
  }
  
  try {
    // Run all tests
    await testGetSpecialtyConfiguration();
    await testUpdateSpecialtyConfiguration();
    await testGetAutoAssignedTemplates();
    await testCreateCustomTemplate();
    await testGetAIRecommendations();
    await testGetSpecialtyAnalytics();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('💥 Test runner error:', error);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testGetSpecialtyConfiguration,
  testUpdateSpecialtyConfiguration,
  testGetAutoAssignedTemplates,
  testCreateCustomTemplate,
  testGetAIRecommendations,
  testGetSpecialtyAnalytics
};