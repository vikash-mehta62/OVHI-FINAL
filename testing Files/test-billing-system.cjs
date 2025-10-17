const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1/billings';

// Helper function to get auth headers (for testing)
const getTestAuthHeaders = () => {
  // Valid JWT token generated for testing
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3RfdXNlciIsInJvbGVpZCI6MSwiaWF0IjoxNzU4MTE3Njk0LCJleHAiOjE3NTgyMDQwOTR9.g15EZbcMCAtFy-m8JH7fe7J2sreSHkXl1JVybm3dGuM';
  return {
    'Authorization': `Bearer ${testToken}`,
    'Content-Type': 'application/json'
  };
};

async function testBillingSystem() {
  console.log('🧪 Testing Patient Billing & Invoice Module...\n');
  
  try {
    // Test 1: Get all services
    console.log('1. Testing GET /services');
    const servicesResponse = await axios.get(`${API_BASE_URL}/services`, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Found ${servicesResponse.data.data.length} services`);
    
    // Test 2: Get all patients
    console.log('\n2. Testing GET /patients');
    const patientsResponse = await axios.get(`${API_BASE_URL}/patients`, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Found ${patientsResponse.data.data.length} patients`);
    
    // Test 3: Create a new bill
    console.log('\n3. Testing POST /bills');
    const billData = {
      patient_id: 1,
      notes: 'Test bill for API testing',
      items: [
        { service_id: 1, quantity: 1 },
        { service_id: 2, quantity: 1 }
      ]
    };
    
    const billResponse = await axios.post(`${API_BASE_URL}/bills`, billData, {
      headers: getTestAuthHeaders()
    });
    const createdBill = billResponse.data.data;
    console.log(`✅ Created bill ID: ${createdBill.id}, Total: $${createdBill.total_amount}`);
    
    // Test 4: Get bill by ID
    console.log('\n4. Testing GET /bills/:id');
    const billDetailResponse = await axios.get(`${API_BASE_URL}/bills/${createdBill.id}`, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Retrieved bill with ${billDetailResponse.data.data.items.length} items`);
    
    // Test 5: Generate invoice from bill
    console.log('\n5. Testing POST /invoices/:bill_id/generate');
    const invoiceResponse = await axios.post(`${API_BASE_URL}/invoices/${createdBill.id}/generate`, {}, {
      headers: getTestAuthHeaders()
    });
    const createdInvoice = invoiceResponse.data.data;
    console.log(`✅ Generated invoice: ${createdInvoice.invoice_number}, Status: ${createdInvoice.status}`);
    
    // Test 6: Get invoice by ID
    console.log('\n6. Testing GET /invoices/:id');
    const invoiceDetailResponse = await axios.get(`${API_BASE_URL}/invoices/${createdInvoice.id}`, {
      headers: getTestAuthHeaders()
    });
    const invoice = invoiceDetailResponse.data.data;
    console.log(`✅ Retrieved invoice with ${invoice.items.length} items and ${invoice.payments.length} payments`);
    
    // Test 7: Record a payment
    console.log('\n7. Testing POST /payments');
    const paymentData = {
      invoice_id: createdInvoice.id,
      amount_paid: 100.00,
      payment_method: 'card',
      transaction_id: 'test_txn_123',
      notes: 'Partial payment for testing'
    };
    
    const paymentResponse = await axios.post(`${API_BASE_URL}/payments`, paymentData, {
      headers: getTestAuthHeaders()
    });
    const updatedInvoice = paymentResponse.data.data;
    console.log(`✅ Recorded payment: $${paymentData.amount_paid}, New balance: $${updatedInvoice.amount_due}`);
    
    // Test 8: Get all invoices
    console.log('\n8. Testing GET /invoices');
    const allInvoicesResponse = await axios.get(`${API_BASE_URL}/invoices`, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Retrieved ${allInvoicesResponse.data.data.length} total invoices`);
    
    // Test 9: Get invoices with filters
    console.log('\n9. Testing GET /invoices with filters');
    const pendingInvoicesResponse = await axios.get(`${API_BASE_URL}/invoices?status=pending`, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Found ${pendingInvoicesResponse.data.data.length} pending invoices`);
    
    // Test 10: Update invoice status
    console.log('\n10. Testing PATCH /invoices/:id/status');
    const statusUpdateResponse = await axios.patch(`${API_BASE_URL}/invoices/${createdInvoice.id}/status`, {
      status: 'overdue'
    }, {
      headers: getTestAuthHeaders()
    });
    console.log(`✅ Updated invoice status to: ${statusUpdateResponse.data.data.status}`);
    
    console.log('\n🎉 All tests passed! Billing system is working correctly.');
    
    // Display summary
    console.log('\n📊 Test Summary:');
    console.log(`- Created bill ID: ${createdBill.id}`);
    console.log(`- Generated invoice: ${createdInvoice.invoice_number}`);
    console.log(`- Recorded payment: $${paymentData.amount_paid}`);
    console.log(`- Final invoice status: ${statusUpdateResponse.data.data.status}`);
    console.log('\n🔗 All endpoints tested with /api/v1/billings/ prefix');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testBillingSystem().catch(console.error);
}

module.exports = { testBillingSystem };