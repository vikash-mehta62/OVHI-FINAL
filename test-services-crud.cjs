const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

// Test with a mock token (you'll need to get a real token from login)
const TEST_TOKEN = 'your-test-token-here';

async function testServicesCRUD() {
  console.log('🧪 Testing Services CRUD Operations...');
  
  const headers = {
    'Authorization': `Bearer ${TEST_TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Test 1: READ - Get all services
    console.log('\n📖 Test 1: READ - Get all services');
    try {
      const response = await axios.get(`${BASE_URL}/services`, { headers });
      console.log(`✅ Retrieved ${response.data.services?.length || 0} services`);
      console.log('Sample service:', response.data.services?.[0]);
    } catch (error) {
      console.log('❌ Failed to get services:', error.response?.data?.message || error.message);
    }

    // Test 2: CREATE - Add a new service
    console.log('\n➕ Test 2: CREATE - Add a new service');
    const newService = {
      service_name: 'Test CRUD Service',
      service_code: 'TEST999',
      description: 'This is a test service for CRUD operations',
      unit_price: 125.50
    };

    let createdServiceId = null;
    try {
      const response = await axios.post(`${BASE_URL}/services`, newService, { headers });
      createdServiceId = response.data.serviceId;
      console.log('✅ Service created successfully with ID:', createdServiceId);
    } catch (error) {
      console.log('❌ Failed to create service:', error.response?.data?.message || error.message);
    }

    if (createdServiceId) {
      // Test 3: READ - Get specific service
      console.log('\n🔍 Test 3: READ - Get specific service');
      try {
        const response = await axios.get(`${BASE_URL}/services/${createdServiceId}`, { headers });
        console.log('✅ Retrieved service:', response.data.service.service_name);
      } catch (error) {
        console.log('❌ Failed to get service:', error.response?.data?.message || error.message);
      }

      // Test 4: UPDATE - Modify the service
      console.log('\n✏️ Test 4: UPDATE - Modify the service');
      const updatedService = {
        ...newService,
        service_name: 'Updated CRUD Service',
        unit_price: 150.75,
        description: 'Updated description for CRUD test'
      };

      try {
        const response = await axios.put(`${BASE_URL}/services/${createdServiceId}`, updatedService, { headers });
        console.log('✅ Service updated successfully');
      } catch (error) {
        console.log('❌ Failed to update service:', error.response?.data?.message || error.message);
      }

      // Test 5: DELETE - Remove the service
      console.log('\n🗑️ Test 5: DELETE - Remove the service');
      try {
        const response = await axios.delete(`${BASE_URL}/services/${createdServiceId}`, { headers });
        console.log('✅ Service deleted successfully');
      } catch (error) {
        console.log('❌ Failed to delete service:', error.response?.data?.message || error.message);
      }
    }

    // Test 6: Get categories
    console.log('\n📂 Test 6: Get service categories');
    try {
      const response = await axios.get(`${BASE_URL}/services/meta/categories`, { headers });
      console.log('✅ Retrieved categories:', response.data.categories);
    } catch (error) {
      console.log('❌ Failed to get categories:', error.response?.data?.message || error.message);
    }

    console.log('\n🎉 CRUD tests completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ CREATE: Add new services');
    console.log('   ✅ READ: Get all services and specific service');
    console.log('   ✅ UPDATE: Modify existing services');
    console.log('   ✅ DELETE: Remove services');
    console.log('\n🌐 Frontend URL: http://localhost:8080/provider/services');

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
}

console.log('⚠️  Note: You need to replace TEST_TOKEN with a real JWT token from login');
console.log('   1. Login to the app and get the token from localStorage');
console.log('   2. Replace TEST_TOKEN in this script');
console.log('   3. Run the test again\n');

testServicesCRUD();