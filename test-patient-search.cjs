// Test patient search functionality
const billingService = require('./server/services/billing/billingService');

async function testPatientSearch() {
    try {
        console.log('🔍 Testing patient search functionality...');
        
        // Test search with a common name
        const searchResults = await billingService.searchPatient('John');
        console.log('✅ Search results:', searchResults);
        
        if (searchResults.length > 0) {
            console.log('✅ Patient search is working correctly!');
            console.log('Sample patient:', searchResults[0]);
        } else {
            console.log('⚠️ No patients found with search term "John"');
        }
        
        // Test getting all patients
        console.log('\n📋 Testing get all patients...');
        const allPatients = await billingService.getPatients();
        console.log('✅ All patients count:', allPatients.length);
        
        if (allPatients.length > 0) {
            console.log('Sample patient from getPatients:', allPatients[0]);
        }
        
    } catch (error) {
        console.error('❌ Error testing patient search:', error.message);
    }
}

testPatientSearch();