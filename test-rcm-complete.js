#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:8000/api/v1';
let authToken = '';

console.log('🧪 RCM System Complete Test Suite'.cyan.bold);
console.log('====================================='.cyan);

// Test configuration
const testConfig = {
  provider: {
    email: 'provider@test.com',
    password: 'password123'
  },
  patient: {
    id: 101,
    name: 'John Smith'
  },
  payment: {
    amount: 150.00,
    billing_id: 1
  }
};

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...'.yellow);

  const result = await makeRequest('POST', '/auth/login', testConfig.provider);

  if (result.success && result.data.token) {
    authToken = result.data.token;
    console.log('✅ Authentication successful'.green);
    return true;
  } else {
    console.log('❌ Authentication failed:'.red, result.error);
    return false;
  }
}

async function testRCMDashboard() {
  console.log('\n📊 Testing RCM Dashboard...'.yellow);

  const result = await makeRequest('GET', '/rcm/dashboard?timeframe=30d');

  if (result.success) {
    const data = result.data.data;
    console.log('✅ Dashboard data retrieved'.green);
    console.log(`   Total Revenue: $${data.kpis.totalRevenue}`.cyan);
    console.log(`   Collection Rate: ${data.kpis.collectionRate}%`.cyan);
    console.log(`   Denial Rate: ${data.kpis.denialRate}%`.cyan);
    console.log(`   Days in A/R: ${data.kpis.daysInAR}`.cyan);
    console.log(`   Total Claims: ${data.kpis.totalClaims}`.cyan);
    return true;
  } else {
    console.log('❌ Dashboard test failed:'.red, result.error);
    return false;
  }
}

async function testClaimsManagement() {
  console.log('\n📋 Testing Claims Management...'.yellow);

  // Test claims list
  const claimsResult = await makeRequest('GET', '/rcm/claims?page=1&limit=5');

  if (claimsResult.success) {
    const claims = claimsResult.data.data;
    console.log('✅ Claims list retrieved'.green);
    console.log(`   Found ${claims.length} claims`.cyan);

    if (claims.length > 0) {
      const claim = claims[0];
      console.log(`   Sample claim: ${claim.patient_name} - $${claim.total_amount}`.cyan);

      // Test claim details
      const detailsResult = await makeRequest('GET', `/rcm/claims/${claim.claim_id}/details`);
      if (detailsResult.success) {
        console.log('✅ Claim details retrieved'.green);
      } else {
        console.log('⚠️  Claim details failed:'.yellow, detailsResult.error);
      }
    }
    return true;
  } else {
    console.log('❌ Claims test failed:'.red, claimsResult.error);
    return false;
  }
}

async function testARAging() {
  console.log('\n📅 Testing A/R Aging...'.yellow);

  const result = await makeRequest('GET', '/rcm/ar-aging');

  if (result.success) {
    const data = result.data.data;
    console.log('✅ A/R Aging data retrieved'.green);
    console.log(`   Total A/R: $${data.totalAR}`.cyan);
    console.log(`   A/R Buckets: ${data.arBuckets.length}`.cyan);
    console.log(`   A/R Accounts: ${data.arAccounts.length}`.cyan);

    // Display aging buckets
    data.arBuckets.forEach(bucket => {
      console.log(`   ${bucket.range}: $${bucket.amount} (${bucket.percentage}%)`.cyan);
    });

    return true;
  } else {
    console.log('❌ A/R Aging test failed:'.red, result.error);
    return false;
  }
}

async function testDenialAnalytics() {
  console.log('\n🚫 Testing Denial Analytics...'.yellow);

  const result = await makeRequest('GET', '/rcm/denial-analytics?timeframe=30d');

  if (result.success) {
    const data = result.data.data;
    console.log('✅ Denial analytics retrieved'.green);
    console.log(`   Denial trends: ${data.denialTrends.length} months`.cyan);
    console.log(`   Denial reasons: ${data.denialReasons.length} categories`.cyan);

    if (data.denialTrends.length > 0) {
      const latest = data.denialTrends[data.denialTrends.length - 1];
      console.log(`   Latest denial rate: ${latest.rate}%`.cyan);
    }

    return true;
  } else {
    console.log('❌ Denial analytics test failed:'.red, result.error);
    return false;
  }
}

async function testPaymentGateways() {
  console.log('\n💳 Testing Payment Gateways...'.yellow);

  // Get existing gateways
  const gatewaysResult = await makeRequest('GET', '/payments/gateways');

  if (gatewaysResult.success) {
    const gateways = gatewaysResult.data.data;
    console.log('✅ Payment gateways retrieved'.green);
    console.log(`   Found ${gateways.length} configured gateways`.cyan);

    gateways.forEach(gateway => {
      console.log(`   ${gateway.gateway_name} (${gateway.gateway_type}) - ${gateway.is_active ? 'Active' : 'Inactive'}`.cyan);
    });

    return true;
  } else {
    console.log('❌ Payment gateways test failed:'.red, gatewaysResult.error);
    return false;
  }
}

async function testPaymentIntent() {
  console.log('\n💰 Testing Payment Intent Creation...'.yellow);

  const paymentData = {
    patient_id: testConfig.patient.id,
    billing_id: testConfig.payment.billing_id,
    amount: testConfig.payment.amount,
    description: 'Test payment for office visit'
  };

  const result = await makeRequest('POST', '/payments/intent', paymentData);

  if (result.success) {
    const data = result.data.data;
    console.log('✅ Payment intent created'.green);
    console.log(`   Payment ID: ${data.payment_id}`.cyan);
    console.log(`   Amount: $${data.amount}`.cyan);
    console.log(`   Currency: ${data.currency}`.cyan);
    console.log(`   Client Secret: ${data.client_secret ? 'Generated' : 'Missing'}`.cyan);
    return data.payment_id;
  } else {
    console.log('❌ Payment intent test failed:'.red, result.error);
    return null;
  }
}

async function testPaymentHistory() {
  console.log('\n📜 Testing Payment History...'.yellow);

  const result = await makeRequest('GET', '/payments/history?page=1&limit=5');

  if (result.success) {
    const payments = result.data.data;
    console.log('✅ Payment history retrieved'.green);
    console.log(`   Found ${payments.length} payments`.cyan);

    payments.forEach(payment => {
      console.log(`   ${payment.patient_name}: $${payment.amount} - ${payment.status}`.cyan);
    });

    return true;
  } else {
    console.log('❌ Payment history test failed:'.red, result.error);
    return false;
  }
}

async function testPaymentAnalytics() {
  console.log('\n📈 Testing Payment Analytics...'.yellow);

  const result = await makeRequest('GET', '/payments/analytics?timeframe=30d');

  if (result.success) {
    const data = result.data.data;
    console.log('✅ Payment analytics retrieved'.green);
    console.log(`   Total Payments: ${data.summary.total_payments}`.cyan);
    console.log(`   Successful Payments: ${data.summary.successful_payments}`.cyan);
    console.log(`   Total Revenue: $${data.summary.total_revenue}`.cyan);
    console.log(`   Net Revenue: $${data.summary.net_revenue}`.cyan);
    console.log(`   Success Rate: ${data.summary.success_rate}%`.cyan);

    return true;
  } else {
    console.log('❌ Payment analytics test failed:'.red, result.error);
    return false;
  }
}

async function testRevenueForecasting() {
  console.log('\n🔮 Testing Revenue Forecasting...'.yellow);

  const result = await makeRequest('GET', '/rcm/revenue-forecasting');

  if (result.success) {
    const data = result.data.data;
    console.log('✅ Revenue forecasting retrieved'.green);
    console.log(`   Historical data points: ${data.historical.length}`.cyan);
    console.log(`   Forecast periods: ${data.forecast.length}`.cyan);
    console.log(`   Average monthly revenue: $${data.metrics.avgMonthlyRevenue}`.cyan);
    console.log(`   Growth rate: ${data.metrics.growthRate}`.cyan);

    return true;
  } else {
    console.log('❌ Revenue forecasting test failed:'.red, result.error);
    return false;
  }
}

async function testCollectionsWorkflow() {
  console.log('\n🔄 Testing Collections Workflow...'.yellow);

  const result = await makeRequest('GET', '/rcm/collections-workflow');

  if (result.success) {
    const accounts = result.data.data;
    console.log('✅ Collections workflow retrieved'.green);
    console.log(`   Active collection accounts: ${accounts.length}`.cyan);

    if (accounts.length > 0) {
      const account = accounts[0];
      console.log(`   Sample account: ${account.patient_name} - $${account.balance} (${account.days_outstanding} days)`.cyan);
    }

    return true;
  } else {
    console.log('❌ Collections workflow test failed:'.red, result.error);
    return false;
  }
}

async function runCompleteTest() {
  console.log('Starting comprehensive RCM system test...\n');

  const tests = [
    { name: 'Authentication', fn: testAuthentication, critical: true },
    { name: 'RCM Dashboard', fn: testRCMDashboard, critical: true },
    { name: 'Claims Management', fn: testClaimsManagement, critical: true },
    { name: 'A/R Aging', fn: testARAging, critical: true },
    { name: 'Denial Analytics', fn: testDenialAnalytics, critical: false },
    { name: 'Payment Gateways', fn: testPaymentGateways, critical: true },
    { name: 'Payment Intent', fn: testPaymentIntent, critical: true },
    { name: 'Payment History', fn: testPaymentHistory, critical: true },
    { name: 'Payment Analytics', fn: testPaymentAnalytics, critical: true },
    { name: 'Revenue Forecasting', fn: testRevenueForecasting, critical: false },
    { name: 'Collections Workflow', fn: testCollectionsWorkflow, critical: false }
  ];

  let passed = 0;
  let failed = 0;
  let criticalFailed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        if (test.critical) criticalFailed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} test crashed:`.red, error.message);
      failed++;
      if (test.critical) criticalFailed++;
    }
  }

  // Summary
  console.log('\n🎯 Test Summary'.cyan.bold);
  console.log('================'.cyan);
  console.log(`✅ Passed: ${passed}`.green);
  console.log(`❌ Failed: ${failed}`.red);
  console.log(`🔥 Critical failures: ${criticalFailed}`.red);

  if (criticalFailed === 0) {
    console.log('\n🎉 RCM System is working correctly!'.green.bold);
    console.log('✅ All critical components are functional'.green);
    console.log('✅ Payment processing is ready'.green);
    console.log('✅ Revenue cycle management is operational'.green);
  } else {
    console.log('\n⚠️  RCM System has critical issues!'.red.bold);
    console.log('❌ Some core features are not working'.red);
    console.log('🔧 Please check server logs and configuration'.yellow);
  }

  console.log('\n📋 Next Steps:'.cyan.bold);
  console.log('1. Configure payment gateway with real API keys');
  console.log('2. Test payment processing with test cards');
  console.log('3. Review sample data and customize as needed');
  console.log('4. Set up webhook endpoints for payment confirmations');
  console.log('5. Configure automated collections workflows');

  return criticalFailed === 0;
}

// Check if server is running
async function checkServerHealth() {
  console.log('🏥 Checking server health...'.yellow);

  try {
    const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`);
    console.log('✅ Server is running'.green);
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible'.red);
    console.log('💡 Make sure to start the server: cd server && npm run dev'.yellow);
    return false;
  }
}

// Main execution
async function main() {
  const serverHealthy = await checkServerHealth();

  if (!serverHealthy) {
    console.log('\n🚨 Cannot run tests - server is not running'.red.bold);
    console.log('Please start the server first:'.yellow);
    console.log('1. cd server'.cyan);
    console.log('2. npm run dev'.cyan);
    process.exit(1);
  }

  const success = await runCompleteTest();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test suite crashed:'.red, error.message);
    process.exit(1);
  });
}

module.exports = { runCompleteTest };