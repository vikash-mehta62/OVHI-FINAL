const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/billing';
const TEST_PATIENT_ID = 100; // Adjust based on your test data
const TEST_SERVICE_ID = 1; // Adjust based on your test data

// Test data payloads (Postman-ready)
const testPayloads = {
    createBill: {
        patient_id: TEST_PATIENT_ID,
        items: [
            {
                service_id: TEST_SERVICE_ID,
                quantity: 1,
                unit_price: 150.00
            },
            {
                service_id: TEST_SERVICE_ID + 1,
                quantity: 2,
                unit_price: 75.50
            }
        ],
        notes: "Initial consultation and follow-up",
        created_by: 1
    },

    updateBillItems: {
        items: [
            {
                service_id: TEST_SERVICE_ID,
                quantity: 1,
                unit_price: 175.00
            },
            {
                service_id: TEST_SERVICE_ID + 1,
                quantity: 1,
                unit_price: 75.50
            },
            {
                service_id: TEST_SERVICE_ID + 2,
                quantity: 1,
                unit_price: 50.00
            }
        ]
    },

    generateInvoice: {
        due_in_days: 30
    },

    recordPartialPayment: {
        amount_paid: 150.00,
        payment_method: "card",
        transaction_id: "txn_1234567890",
        reference_number: "REF001",
        payment_gateway: "stripe",
        gateway_transaction_id: "pi_1234567890",
        notes: "Partial payment via credit card",
        created_by: 1
    },

    recordFullPayment: {
        amount_paid: 150.50, // Remaining balance
        payment_method: "cash",
        reference_number: "CASH002",
        payment_gateway: "manual",
        notes: "Final payment in cash",
        created_by: 1
    },

    updateInvoiceStatus: {
        status: "overdue"
    },

    cancelInvoice: {
        reason: "Patient requested cancellation due to insurance coverage"
    },

    voidPayment: {
        reason: "Duplicate payment - refunding to customer"
    }
};

class BillingSystemTester {
    constructor() {
        this.createdBillId = null;
        this.createdInvoiceId = null;
        this.createdPaymentId = null;
    }

    async makeRequest(method, endpoint, data = null) {
        try {
            const config = {
                method,
                url: `${BASE_URL}${endpoint}`,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                config.data = data;
            }

            const response = await axios(config);
            return response.data;
        } catch (error) {
            console.error(`❌ ${method.toUpperCase()} ${endpoint} failed:`, error.response?.data || error.message);
            throw error;
        }
    }

    async testCreateBill() {
        console.log('\n🧾 Testing: Create Bill');
        console.log('Payload:', JSON.stringify(testPayloads.createBill, null, 2));
        
        const result = await this.makeRequest('POST', '/bills', testPayloads.createBill);
        this.createdBillId = result.data.id;
        
        console.log('✅ Bill created successfully');
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testGetAllBills() {
        console.log('\n📋 Testing: Get All Bills');
        
        const result = await this.makeRequest('GET', '/bills?page=1&limit=10');
        
        console.log('✅ Bills retrieved successfully');
        console.log(`Found ${result.data.length} bills`);
        return result;
    }

    async testGetBillById() {
        console.log('\n🔍 Testing: Get Bill by ID');
        
        if (!this.createdBillId) {
            throw new Error('No bill ID available. Create a bill first.');
        }

        const result = await this.makeRequest('GET', `/bills/${this.createdBillId}`);
        
        console.log('✅ Bill retrieved successfully');
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testUpdateBillItems() {
        console.log('\n✏️ Testing: Update Bill Items');
        console.log('Payload:', JSON.stringify(testPayloads.updateBillItems, null, 2));
        
        if (!this.createdBillId) {
            throw new Error('No bill ID available. Create a bill first.');
        }

        const result = await this.makeRequest('PUT', `/bills/${this.createdBillId}/items`, testPayloads.updateBillItems);
        
        console.log('✅ Bill items updated successfully');
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testGenerateInvoice() {
        console.log('\n🧾➡️📄 Testing: Generate Invoice from Bill');
        console.log('Payload:', JSON.stringify(testPayloads.generateInvoice, null, 2));
        
        if (!this.createdBillId) {
            throw new Error('No bill ID available. Create a bill first.');
        }

        const result = await this.makeRequest('POST', `/bills/${this.createdBillId}/invoice`, testPayloads.generateInvoice);
        this.createdInvoiceId = result.data.id;
        
        console.log('✅ Invoice generated successfully');
        console.log('Invoice Number:', result.data.invoice_number);
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testGetInvoiceDetails() {
        console.log('\n📄 Testing: Get Invoice Details');
        
        if (!this.createdInvoiceId) {
            throw new Error('No invoice ID available. Generate an invoice first.');
        }

        const result = await this.makeRequest('GET', `/invoices/${this.createdInvoiceId}`);
        
        console.log('✅ Invoice details retrieved successfully');
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testRecordPartialPayment() {
        console.log('\n💳 Testing: Record Partial Payment');
        console.log('Payload:', JSON.stringify(testPayloads.recordPartialPayment, null, 2));
        
        if (!this.createdInvoiceId) {
            throw new Error('No invoice ID available. Generate an invoice first.');
        }

        const result = await this.makeRequest('POST', `/invoices/${this.createdInvoiceId}/payments`, testPayloads.recordPartialPayment);
        this.createdPaymentId = result.data.payments[0]?.id;
        
        console.log('✅ Partial payment recorded successfully');
        console.log('Invoice Status:', result.data.status);
        console.log('Amount Paid:', result.data.amount_paid);
        console.log('Balance Due:', result.data.balance_due);
        return result;
    }

    async testRecordFullPayment() {
        console.log('\n💰 Testing: Record Full Payment');
        
        if (!this.createdInvoiceId) {
            throw new Error('No invoice ID available. Generate an invoice first.');
        }

        // Get current invoice to calculate remaining balance
        const invoice = await this.makeRequest('GET', `/invoices/${this.createdInvoiceId}`);
        const remainingBalance = parseFloat(invoice.data.total_amount) - parseFloat(invoice.data.amount_paid);
        
        const fullPaymentPayload = {
            ...testPayloads.recordFullPayment,
            amount_paid: remainingBalance
        };

        console.log('Payload:', JSON.stringify(fullPaymentPayload, null, 2));

        const result = await this.makeRequest('POST', `/invoices/${this.createdInvoiceId}/payments`, fullPaymentPayload);
        
        console.log('✅ Full payment recorded successfully');
        console.log('Invoice Status:', result.data.status);
        console.log('Amount Paid:', result.data.amount_paid);
        console.log('Balance Due:', result.data.balance_due);
        return result;
    }

    async testGetPaymentHistory() {
        console.log('\n📊 Testing: Get Payment History');
        
        if (!this.createdInvoiceId) {
            throw new Error('No invoice ID available. Generate an invoice first.');
        }

        const result = await this.makeRequest('GET', `/invoices/${this.createdInvoiceId}/payments`);
        
        console.log('✅ Payment history retrieved successfully');
        console.log(`Found ${result.data.length} payments`);
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testGetInvoices() {
        console.log('\n📄📋 Testing: Get All Invoices');
        
        const result = await this.makeRequest('GET', '/invoices?limit=10');
        
        console.log('✅ Invoices retrieved successfully');
        console.log(`Found ${result.data.length} invoices`);
        return result;
    }

    async testGetOverdueInvoices() {
        console.log('\n⏰ Testing: Get Overdue Invoices');
        
        const result = await this.makeRequest('GET', '/invoices?overdue_only=true');
        
        console.log('✅ Overdue invoices retrieved successfully');
        console.log(`Found ${result.data.length} overdue invoices`);
        return result;
    }

    async testAgingReport() {
        console.log('\n📈 Testing: Aging Report');
        
        const result = await this.makeRequest('GET', '/reports/aging');
        
        console.log('✅ Aging report generated successfully');
        console.log(`Found ${result.data.length} patient records`);
        console.log('Response:', JSON.stringify(result, null, 2));
        return result;
    }

    async testUtilityEndpoints() {
        console.log('\n🔧 Testing: Utility Endpoints');
        
        // Test get services
        const services = await this.makeRequest('GET', '/services');
        console.log(`✅ Services: Found ${services.data.length} services`);
        
        // Test get patients
        const patients = await this.makeRequest('GET', '/patients');
        console.log(`✅ Patients: Found ${patients.data.length} patients`);
        
        // Test search patients
        const searchResults = await this.makeRequest('GET', '/patients/search?q=john');
        console.log(`✅ Patient Search: Found ${searchResults.data.length} results`);
        
        return { services, patients, searchResults };
    }

    async runFullTestSuite() {
        console.log('🚀 Starting Enhanced Billing System Test Suite');
        console.log('='.repeat(60));

        try {
            // Test utility endpoints first
            await this.testUtilityEndpoints();

            // Test bill creation and management
            await this.testCreateBill();
            await this.testGetAllBills();
            await this.testGetBillById();
            await this.testUpdateBillItems();

            // Test invoice generation and management
            await this.testGenerateInvoice();
            await this.testGetInvoiceDetails();
            await this.testGetInvoices();

            // Test payment processing
            await this.testRecordPartialPayment();
            await this.testGetPaymentHistory();
            await this.testRecordFullPayment();

            // Test reporting
            await this.testAgingReport();
            await this.testGetOverdueInvoices();

            console.log('\n🎉 All tests completed successfully!');
            console.log('='.repeat(60));

        } catch (error) {
            console.error('\n💥 Test suite failed:', error.message);
            console.log('='.repeat(60));
            process.exit(1);
        }
    }

    // Individual test methods for specific scenarios
    async testErrorScenarios() {
        console.log('\n🧪 Testing Error Scenarios');
        
        try {
            // Test invalid bill creation
            console.log('Testing invalid bill creation...');
            await this.makeRequest('POST', '/bills', { invalid: 'data' });
        } catch (error) {
            console.log('✅ Invalid bill creation properly rejected');
        }

        try {
            // Test payment exceeding invoice total
            if (this.createdInvoiceId) {
                console.log('Testing overpayment...');
                await this.makeRequest('POST', `/invoices/${this.createdInvoiceId}/payments`, {
                    amount_paid: 99999.99,
                    payment_method: 'cash'
                });
            }
        } catch (error) {
            console.log('✅ Overpayment properly rejected');
        }

        try {
            // Test accessing non-existent invoice
            console.log('Testing non-existent invoice access...');
            await this.makeRequest('GET', '/invoices/99999');
        } catch (error) {
            console.log('✅ Non-existent invoice properly handled');
        }
    }
}

// Export test payloads for Postman
const postmanCollection = {
    info: {
        name: "Enhanced Billing System API",
        description: "Complete test collection for bills-to-invoices system"
    },
    item: [
        {
            name: "Create Bill",
            request: {
                method: "POST",
                header: [{ key: "Content-Type", value: "application/json" }],
                body: {
                    mode: "raw",
                    raw: JSON.stringify(testPayloads.createBill, null, 2)
                },
                url: {
                    raw: `${BASE_URL}/bills`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "bills"]
                }
            }
        },
        {
            name: "Get All Bills",
            request: {
                method: "GET",
                url: {
                    raw: `${BASE_URL}/bills?limit=20&offset=0`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "bills"],
                    query: [
                        { key: "limit", value: "20" },
                        { key: "offset", value: "0" }
                    ]
                }
            }
        },
        {
            name: "Generate Invoice",
            request: {
                method: "POST",
                header: [{ key: "Content-Type", value: "application/json" }],
                body: {
                    mode: "raw",
                    raw: JSON.stringify(testPayloads.generateInvoice, null, 2)
                },
                url: {
                    raw: `${BASE_URL}/bills/{{bill_id}}/invoice`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "bills", "{{bill_id}}", "invoice"]
                }
            }
        },
        {
            name: "Record Partial Payment",
            request: {
                method: "POST",
                header: [{ key: "Content-Type", value: "application/json" }],
                body: {
                    mode: "raw",
                    raw: JSON.stringify(testPayloads.recordPartialPayment, null, 2)
                },
                url: {
                    raw: `${BASE_URL}/invoices/{{invoice_id}}/payments`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "invoices", "{{invoice_id}}", "payments"]
                }
            }
        },
        {
            name: "Record Full Payment",
            request: {
                method: "POST",
                header: [{ key: "Content-Type", value: "application/json" }],
                body: {
                    mode: "raw",
                    raw: JSON.stringify(testPayloads.recordFullPayment, null, 2)
                },
                url: {
                    raw: `${BASE_URL}/invoices/{{invoice_id}}/payments`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "invoices", "{{invoice_id}}", "payments"]
                }
            }
        },
        {
            name: "Get Invoice Details",
            request: {
                method: "GET",
                url: {
                    raw: `${BASE_URL}/invoices/{{invoice_id}}`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "invoices", "{{invoice_id}}"]
                }
            }
        },
        {
            name: "Get Payment History",
            request: {
                method: "GET",
                url: {
                    raw: `${BASE_URL}/invoices/{{invoice_id}}/payments`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "invoices", "{{invoice_id}}", "payments"]
                }
            }
        },
        {
            name: "Aging Report",
            request: {
                method: "GET",
                url: {
                    raw: `${BASE_URL}/reports/aging`,
                    host: [BASE_URL.replace('http://', '').replace('https://', '')],
                    path: ["api", "reports", "aging"]
                }
            }
        }
    ]
};

// Run tests if called directly
if (require.main === module) {
    const tester = new BillingSystemTester();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    
    if (args.includes('--errors')) {
        tester.testErrorScenarios();
    } else if (args.includes('--postman')) {
        console.log('Postman Collection:');
        console.log(JSON.stringify(postmanCollection, null, 2));
    } else {
        tester.runFullTestSuite();
    }
}

module.exports = {
    BillingSystemTester,
    testPayloads,
    postmanCollection
};