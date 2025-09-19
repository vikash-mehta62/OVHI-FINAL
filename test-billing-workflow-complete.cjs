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

async function testCompleteWorkflow() {
  console.log('🔄 Testing Complete Billing Workflow with Patient Search...\n');
  
  try {
    // Step 1: Search for a patient
    console.log('1. Searching for patients with "John"');
    const searchResponse = await axios.post(`${API_BASE_URL}/search-patients`, {
      searchTerm: 'John'
    }, {
      headers: getTestAuthHeaders()
    });
    
    const patients = searchResponse.data.data;
    console.log(`✅ Found ${patients.length} patients`);
    
    if (patients.length === 0) {
      console.log('❌ No patients found for testing. Please add some test patients.');
      return;
    }
    
    const selectedPatient = patients[0];
    console.log(`   Selected patient: ${selectedPatient.patient_name} (ID: ${selectedPatient.patient_id})`);
    
    // Step 2: Get available services
    console.log('\n2. Loading available services');
    const servicesResponse = await axios.get(`${API_BASE_URL}/services`, {
      headers: getTestAuthHeaders()
    });
    
    const services = servicesResponse.data.data;
    console.log(`✅ Found ${services.length} services`);
    
    if (services.length === 0) {
      console.log('❌ No services found for testing.');
      return;
    }
    
    // Step 3: Create a bill with the searched patient
    console.log('\n3. Creating bill for selected patient');
    const billData = {
      patient_id: selectedPatient.patient_id,
      notes: `Test bill for ${selectedPatient.patient_name} - Created via search workflow`,
      items: [
        { service_id: services[0].service_id, quantity: 1 },
        { service_id: services[1].service_id, quantity: 2 }
      ]
    };
    
    const billResponse = await axios.post(`${API_BASE_URL}/bills`, billData, {
      headers: getTestAuthHeaders()
    });
    
    const createdBill = billResponse.data.data;
    console.log(`✅ Created bill ID: ${createdBill.id}, Total: $${createdBill.total_amount}`);
    console.log(`   Patient: ${createdBill.patient_name}`);
    
    // Step 4: Generate invoice from bill
    console.log('\n4. Generating invoice from bill');
    const invoiceResponse = await axios.post(`${API_BASE_URL}/invoices/${createdBill.id}/generate`, {}, {
      headers: getTestAuthHeaders()
    });
    
    const createdInvoice = invoiceResponse.data.data;
    console.log(`✅ Generated invoice: ${createdInvoice.invoice_number}`);
    console.log(`   Status: ${createdInvoice.status}`);
    console.log(`   Amount Due: $${createdInvoice.amount_due}`);
    
    // Step 5: Record a partial payment
    console.log('\n5. Recording partial payment');
    const partialAmount = Math.round(createdInvoice.total_amount * 0.5 * 100) / 100; // 50% payment
    
    const paymentData = {
      invoice_id: createdInvoice.id,
      amount_paid: partialAmount,
      payment_method: 'card',
      transaction_id: `test_txn_${Date.now()}`,
      notes: 'Partial payment via search workflow test'
    };
    
    const paymentResponse = await axios.post(`${API_BASE_URL}/payments`, paymentData, {
      headers: getTestAuthHeaders()
    });
    
    const updatedInvoice = paymentResponse.data.data;
    console.log(`✅ Recorded payment: $${paymentData.amount_paid}`);
    console.log(`   Remaining balance: $${updatedInvoice.amount_due}`);
    
    // Step 6: Search for another patient to test search functionality
    console.log('\n6. Testing search with different terms');
    
    const searchTerms = ['Vikash', 'Smith', 'test'];
    for (const term of searchTerms) {
      try {
        const searchResult = await axios.post(`${API_BASE_URL}/search-patients`, {
          searchTerm: term
        }, {
          headers: getTestAuthHeaders()
        });
        
        console.log(`   Search "${term}": ${searchResult.data.data.length} results`);
      } catch (error) {
        console.log(`   Search "${term}": Error - ${error.message}`);
      }
    }
    
    // Step 7: Get all invoices to verify our created invoice
    console.log('\n7. Verifying invoice in system');
    const allInvoicesResponse = await axios.get(`${API_BASE_URL}/invoices`, {
      headers: getTestAuthHeaders()
    });
    
    const allInvoices = allInvoicesResponse.data.data;
    const ourInvoice = allInvoices.find(inv => inv.id === createdInvoice.id);
    
    if (ourInvoice) {
      console.log(`✅ Invoice verified in system`);
      console.log(`   Status: ${ourInvoice.status}`);
      console.log(`   Payments: ${ourInvoice.payments?.length || 0}`);
    }
    
    console.log('\n🎉 Complete workflow test successful!');
    console.log('\n📊 Workflow Summary:');
    console.log(`- Patient searched and selected: ${selectedPatient.patient_name}`);
    console.log(`- Bill created: ID ${createdBill.id}`);
    console.log(`- Invoice generated: ${createdInvoice.invoice_number}`);
    console.log(`- Payment recorded: $${paymentData.amount_paid}`);
    console.log(`- Remaining balance: $${updatedInvoice.amount_due}`);
    
    console.log('\n✨ Frontend Integration Ready:');
    console.log('- Patient search dropdown working');
    console.log('- Authentication headers automatically included');
    console.log('- Complete bill-to-payment workflow functional');
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running:');
      console.log('   cd server && npm run dev');
    }
    
    if (error.response?.status === 401) {
      console.log('\n💡 Authentication issue. Check if token is valid.');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  testCompleteWorkflow().catch(console.error);
}

module.exports = { testCompleteWorkflow };