const axios = require('axios');

// Test payment creation with status
async function testPaymentWithStatus() {
    try {
        // First, let's get a bill to test with
        const billsResponse = await axios.get('http://localhost:8000/api/billings/get-all-bills?limit=1', {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN_HERE' // You'll need to replace this
            }
        });

        if (billsResponse.data.data.length === 0) {
            console.log('No bills found to test with');
            return;
        }

        const bill = billsResponse.data.data[0];
        console.log('Testing with bill:', bill.id);

        // Test payment creation with status
        const paymentData = {
            bill_id: bill.id,
            amount: 50.00,
            payment_method: 'card',
            transaction_id: 'test_txn_' + Date.now(),
            notes: 'Test payment with status',
            status: 'completed'
        };

        console.log('Creating payment with data:', paymentData);

        const paymentResponse = await axios.post('http://localhost:8000/api/billings/payments/create', paymentData, {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN_HERE', // You'll need to replace this
                'Content-Type': 'application/json'
            }
        });

        console.log('Payment created successfully:', paymentResponse.data);

    } catch (error) {
        console.error('Error testing payment:', error.response?.data || error.message);
    }
}

// Run the test
testPaymentWithStatus();