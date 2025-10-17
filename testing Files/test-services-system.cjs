const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test user credentials (you may need to adjust these)
const testCredentials = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, testCredentials);
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testServicesAPI() {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log('\n🧪 Testing Services API...');

    // Test 1: Get all services
    console.log('\n1️⃣ Testing GET /services');
    const servicesResponse = await axios.get(`${BASE_URL}/services`, { headers });
    console.log(`✅ Retrieved ${servicesResponse.data.services.length} services`);

    // Test 2: Get service categories
    console.log('\n2️⃣ Testing GET /services/meta/categories');
    const categoriesResponse = await axios.get(`${BASE_URL}/services/meta/categories`, { headers });
    console.log(`✅ Retrieved ${categoriesResponse.data.categories.length} categories:`, categoriesResponse.data.categories);

    // Test 3: Create a new service
    console.log('\n3️⃣ Testing POST /services (Create)');
    const newService = {
      service_name: 'Test Service API',
      service_code: 'TEST001',
      description: 'This is a test service created via API',
      unit_price: 99.99,
      category: 'Testing',
      is_active: true
    };

    const createResponse = await axios.post(`${BASE_URL}/services`, newService, { headers });
    console.log('✅ Service created successfully:', createResponse.data.message);
    const createdServiceId = createResponse.data.serviceId;

    // Test 4: Get service by ID
    console.log('\n4️⃣ Testing GET /services/:id');
    const serviceResponse = await axios.get(`${BASE_URL}/services/${createdServiceId}`, { headers });
    console.log('✅ Retrieved service:', serviceResponse.data.service.service_name);

    // Test 5: Update service
    console.log('\n5️⃣ Testing PUT /services/:id (Update)');
    const updatedService = {
      ...newService,
      service_name: 'Updated Test Service API',
      unit_price: 149.99
    };

    const updateResponse = await axios.put(`${BASE_URL}/services/${createdServiceId}`, updatedService, { headers });
    console.log('✅ Service updated successfully:', updateResponse.data.message);

    // Test 6: Toggle service status
    console.log('\n6️⃣ Testing PATCH /services/:id/toggle-status');
    const toggleResponse = await axios.patch(`${BASE_URL}/services/${createdServiceId}/toggle-status`, {}, { headers });
    console.log('✅ Service status toggled:', toggleResponse.data.message);

    // Test 7: Get services by category
    console.log('\n7️⃣ Testing GET /services/category/:category');
    const categoryResponse = await axios.get(`${BASE_URL}/services/category/Testing`, { headers });
    console.log(`✅ Retrieved ${categoryResponse.data.services.length} services in Testing category`);

    // Test 8: Delete service
    console.log('\n8️⃣ Testing DELETE /services/:id');
    const deleteResponse = await axios.delete(`${BASE_URL}/services/${createdServiceId}`, { headers });
    console.log('✅ Service deleted successfully:', deleteResponse.data.message);

    console.log('\n🎉 All Services API tests passed!');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testServicesSystem() {
  try {
    console.log('🧪 Testing Services Management System...');
    
    // Login first
    const loginSuccess = await login();
    if (!loginSuccess) {
      throw new Error('Login failed - cannot proceed with API tests');
    }

    // Test the services API
    await testServicesAPI();

    console.log('\n✅ Services system testing completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Services system testing failed:', error.message);
    throw error;
  }
}

// Run the tests
if (require.main === module) {
  testServicesSystem()
    .then(() => {
      console.log('\n🎯 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testServicesSystem };