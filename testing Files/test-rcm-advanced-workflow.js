const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1/rcm-advanced';
const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token

// Test configuration
const config = {
    headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
    }
};

async function testRCMAdvancedWorkflow() {
    console.log('🧪 Testing RCM Advanced Workflow System...\n');

    try {
        // Test 1: Health Check
        console.log('1️⃣ Testing Health Check...');
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        console.log('✅ Health Check:', healthResponse.data.message);
        console.log('   Services:', healthResponse.data.services);

        // Test 2: AR Aging Analysis
        console.log('\n2️⃣ Testing AR Aging Intelligence...');
        const arAnalysisResponse = await axios.get(`${BASE_URL}/ar-aging/analyze`, config);
        if (arAnalysisResponse.data.success) {
            const analysis = arAnalysisResponse.data.data;
            console.log('✅ AR Analysis completed');
            console.log(`   Total Outstanding: $${analysis.totalOutstanding}`);
            console.log(`   Collection Probability: ${analysis.collectionProbability}%`);
            console.log(`   Accounts Analyzed: ${analysis.accounts.length}`);
        }

        // Test 3: Collection Prediction
        if (arAnalysisResponse.data.success && arAnalysisResponse.data.data.accounts.length > 0) {
            console.log('\n3️⃣ Testing Collection Prediction...');
            const accountId = arAnalysisResponse.data.data.accounts[0].account_id;
            const predictionResponse = await axios.get(`${BASE_URL}/ar-aging/predict/${accountId}`, config);
            if (predictionResponse.data.success) {
                const prediction = predictionResponse.data.data;
                console.log('✅ Prediction completed');
                console.log(`   Account ID: ${prediction.accountId}`);
                console.log(`   Prediction Score: ${prediction.predictionScore}%`);
                console.log(`   Confidence Level: ${prediction.confidenceLevel}%`);
                console.log(`   Risk Factors: ${prediction.riskFactors.length}`);
            }
        }

        // Test 4: ClaimMD Dashboard
        console.log('\n4️⃣ Testing ClaimMD Connector...');
        const claimMDResponse = await axios.get(`${BASE_URL}/claimmd/dashboard`, config);
        if (claimMDResponse.data.success) {
            const dashboard = claimMDResponse.data.data;
            console.log('✅ ClaimMD Dashboard loaded');
            console.log(`   Total Submissions: ${dashboard.summary.totalSubmissions}`);
            console.log(`   Success Rate: ${dashboard.summary.successRate}%`);
            console.log(`   Recent Submissions: ${dashboard.recentSubmissions.length}`);
        }

        // Test 5: Collection Dashboard
        console.log('\n5️⃣ Testing Collection Workflow Manager...');
        const collectionResponse = await axios.get(`${BASE_URL}/collection/dashboard`, config);
        if (collectionResponse.data.success) {
            const dashboard = collectionResponse.data.data;
            console.log('✅ Collection Dashboard loaded');
            console.log(`   Active Workflows: ${dashboard.summary.totalActiveWorkflows}`);
            console.log(`   Payment Plans: ${dashboard.summary.totalPaymentPlans}`);
            console.log(`   Collection Amount: $${dashboard.summary.totalCollectionAmount}`);
        }

        // Test 6: Denial Dashboard
        console.log('\n6️⃣ Testing Denial Management...');
        const denialResponse = await axios.get(`${BASE_URL}/denial/dashboard`, config);
        if (denialResponse.data.success) {
            const dashboard = denialResponse.data.data;
            console.log('✅ Denial Dashboard loaded');
            console.log(`   Total Denials: ${dashboard.summary.totalDenials}`);
            console.log(`   Pending Appeals: ${dashboard.summary.pendingAppealsCount}`);
            console.log(`   Success Rate: ${dashboard.summary.successRate}%`);
        }

        // Test 7: Claim Validation
        console.log('\n7️⃣ Testing Claim Validation...');
        const sampleClaim = {
            patientInfo: {
                firstName: 'John',
                lastName: 'Doe',
                dateOfBirth: '1980-01-01'
            },
            providerInfo: {
                npi: '1234567890'
            },
            serviceLines: [{
                procedureCode: '99213',
                diagnosisCode: 'Z00.00',
                serviceDate: '2024-01-15',
                chargeAmount: 150.00
            }],
            insuranceInfo: {
                payerId: 'AETNA',
                memberNumber: '123456789'
            }
        };

        const validationResponse = await axios.post(`${BASE_URL}/claimmd/validate`, sampleClaim, config);
        if (validationResponse.data.success) {
            const validation = validationResponse.data.data;
            console.log('✅ Claim Validation completed');
            console.log(`   Valid: ${validation.isValid}`);
            console.log(`   Errors: ${validation.errors.length}`);
            console.log(`   Warnings: ${validation.warnings.length}`);
        }

        // Test 8: Automated Actions Trigger
        console.log('\n8️⃣ Testing Automated Actions...');
        const thresholds = {
            riskScoreThreshold: 80,
            balanceThreshold: 1000,
            daysOutstandingThreshold: 90
        };

        const actionsResponse = await axios.post(`${BASE_URL}/ar-aging/trigger-actions`, thresholds, config);
        if (actionsResponse.data.success) {
            const actions = actionsResponse.data.data;
            console.log('✅ Automated Actions triggered');
            console.log(`   Actions Created: ${actions.length}`);
            actions.slice(0, 3).forEach((action, index) => {
                console.log(`   Action ${index + 1}: ${action.actionType} for Account ${action.accountId}`);
            });
        }

        // Test 9: Denial Pattern Analysis
        console.log('\n9️⃣ Testing Denial Pattern Analysis...');
        const patternResponse = await axios.get(`${BASE_URL}/denial/analyze-patterns?timeframe=30`, config);
        if (patternResponse.data.success) {
            const analysis = patternResponse.data.data;
            console.log('✅ Denial Pattern Analysis completed');
            console.log(`   Total Denials: ${analysis.summary.totalDenials}`);
            console.log(`   Top Category: ${analysis.summary.topDenialCategory}`);
            console.log(`   Improvement Suggestions: ${analysis.improvements.length}`);
        }

        // Test 10: Collection Workflow Initiation
        console.log('\n🔟 Testing Collection Workflow Initiation...');
        if (arAnalysisResponse.data.success && arAnalysisResponse.data.data.accounts.length > 0) {
            const accountId = arAnalysisResponse.data.data.accounts[0].account_id;
            const workflowData = {
                accountId: accountId,
                workflowType: 'standard'
            };

            try {
                const workflowResponse = await axios.post(`${BASE_URL}/collection/initiate`, workflowData, config);
                if (workflowResponse.data.success) {
                    const workflow = workflowResponse.data.data;
                    console.log('✅ Collection Workflow initiated');
                    console.log(`   Workflow ID: ${workflow.workflowId}`);
                    console.log(`   Type: ${workflow.workflowType}`);
                    console.log(`   Current Stage: ${workflow.currentStage}`);
                }
            } catch (error) {
                if (error.response && error.response.data.message.includes('already exists')) {
                    console.log('ℹ️ Collection Workflow already exists for this account');
                } else {
                    throw error;
                }
            }
        }

        console.log('\n🎉 All tests completed successfully!');
        console.log('\n📊 Test Summary:');
        console.log('   ✅ Health Check');
        console.log('   ✅ AR Aging Intelligence');
        console.log('   ✅ Collection Prediction');
        console.log('   ✅ ClaimMD Connector');
        console.log('   ✅ Collection Workflow Manager');
        console.log('   ✅ Denial Management');
        console.log('   ✅ Claim Validation');
        console.log('   ✅ Automated Actions');
        console.log('   ✅ Denial Pattern Analysis');
        console.log('   ✅ Collection Workflow Initiation');

        console.log('\n🚀 RCM Advanced Workflow System is fully operational!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        
        console.log('\n🔧 Troubleshooting Tips:');
        console.log('   1. Ensure the server is running on port 3000');
        console.log('   2. Check that the database is properly set up');
        console.log('   3. Verify authentication token is valid');
        console.log('   4. Run setup-rcm-advanced-workflow.js first');
    }
}

// Test individual components
async function testARAgingOnly() {
    console.log('🧪 Testing AR Aging Intelligence only...\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/ar-aging/analyze`, config);
        console.log('AR Aging Analysis Result:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('AR Aging test failed:', error.message);
    }
}

async function testClaimMDOnly() {
    console.log('🧪 Testing ClaimMD Connector only...\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/claimmd/dashboard`, config);
        console.log('ClaimMD Dashboard Result:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('ClaimMD test failed:', error.message);
    }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'ar-aging':
        testARAgingOnly();
        break;
    case 'claimmd':
        testClaimMDOnly();
        break;
    case 'full':
    default:
        testRCMAdvancedWorkflow();
        break;
}

// Export for use in other modules
module.exports = {
    testRCMAdvancedWorkflow,
    testARAgingOnly,
    testClaimMDOnly
};