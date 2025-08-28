/**
 * Comprehensive RCM Routes Test Suite
 * Tests all endpoints in /api/v1/rcm/* routes
 * 
 * Usage: node test-rcm-routes-comprehensive.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/rcm`;

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  retries: 3,
  verbose: true
};

// Test data
const TEST_DATA = {
  validClaim: {
    patient_id: 1,
    procedure_code: '99213',
    total_amount: 150.00,
    service_date: '2024-01-15',
    diagnosis_code: 'Z00.00',
    provider_id: 1
  },
  validPayment: {
    claim_id: 1,
    payment_amount: 120.00,
    payment_date: '2024-01-20',
    payment_method: 'insurance',
    check_number: 'CHK123456'
  },
  validEligibility: {
    patientId: '1',
    memberId: 'MEM123456',
    serviceDate: '2024-01-15'
  },
  validBenefits: {
    patientId: '1',
    memberId: 'MEM123456',
    serviceType: 'office_visit'
  }
};

// Authentication token (will be set after login)
let authToken = null;

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

/**
 * Utility Functions
 */
function log(message, type = 'info') {
  if (!TEST_CONFIG.verbose && type === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[type] || 'ℹ️';
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function recordTest(testName, success, details = {}) {
  testResults.total++;
  if (success) {
    testResults.passed++;
    log(`${testName} - PASSED`, 'success');
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, ...details });
    log(`${testName} - FAILED: ${details.error || 'Unknown error'}`, 'error');
  }
  
  testResults.details.push({
    test: testName,
    success,
    timestamp: new Date().toISOString(),
    ...details
  });
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    timeout: TEST_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
      ...headers
    }
  };
  
  if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
    config.data = data;
  } else if (data && method.toLowerCase() === 'get') {
    config.params = data;
  }
  
  return axios(config);
}

/**
 * Authentication Setup
 */
async function setupAuthentication() {
  try {
    log('Setting up authentication...', 'info');
    
    // Try to get a test token or create a test user
    const loginData = {
      email: 'test@ovhi.com',
      password: 'testpassword123'
    };
    
    const response = await axios.post(`${BASE_URL}/api/v1/auth/login`, loginData);
    
    if (response.data && response.data.token) {
      authToken = response.data.token;
      log('Authentication successful', 'success');
      return true;
    } else {
      log('Authentication failed - no token received', 'warning');
      return false;
    }
  } catch (error) {
    log(`Authentication setup failed: ${error.message}`, 'warning');
    log('Proceeding without authentication (some tests may fail)', 'warning');
    return false;
  }
}

/**
 * Test Suite Functions
 */

// Dashboard and Analytics Tests
async function testDashboardRoutes() {
  log('Testing Dashboard Routes...', 'info');
  
  // Test dashboard data
  try {
    const response = await makeRequest('GET', '/dashboard', { timeframe: '30d' });
    recordTest('GET /dashboard', response.status === 200, {
      status: response.status,
      hasData: !!response.data
    });
  } catch (error) {
    recordTest('GET /dashboard', false, { error: error.message });
  }
  
  // Test dashboard with different timeframes
  const timeframes = ['7d', '30d', '90d', '1y'];
  for (const timeframe of timeframes) {
    try {
      const response = await makeRequest('GET', '/dashboard', { timeframe });
      recordTest(`GET /dashboard (${timeframe})`, response.status === 200, {
        status: response.status,
        timeframe
      });
    } catch (error) {
      recordTest(`GET /dashboard (${timeframe})`, false, { error: error.message });
    }
  }
}

// Claims Management Tests
async function testClaimsRoutes() {
  log('Testing Claims Routes...', 'info');
  
  // Test get claims
  try {
    const response = await makeRequest('GET', '/claims', {
      page: 1,
      limit: 10,
      status: 'all'
    });
    recordTest('GET /claims', response.status === 200, {
      status: response.status,
      hasData: !!response.data
    });
  } catch (error) {
    recordTest('GET /claims', false, { error: error.message });
  }
  
  // Test create claim
  try {
    const response = await makeRequest('POST', '/claims', TEST_DATA.validClaim);
    recordTest('POST /claims', [200, 201].includes(response.status), {
      status: response.status,
      claimId: response.data?.claim_id
    });
  } catch (error) {
    recordTest('POST /claims', false, { error: error.message });
  }
  
  // Test get claim by ID
  try {
    const response = await makeRequest('GET', '/claims/1');
    recordTest('GET /claims/:id', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /claims/:id', false, { error: error.message });
  }
  
  // Test update claim status
  try {
    const response = await makeRequest('PUT', '/claims/1/status', {
      status: 1,
      notes: 'Test status update'
    });
    recordTest('PUT /claims/:id/status', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('PUT /claims/:id/status', false, { error: error.message });
  }
  
  // Test bulk update
  try {
    const response = await makeRequest('POST', '/claims/bulk-update', {
      claim_ids: [1, 2, 3],
      status: 2,
      notes: 'Bulk update test'
    });
    recordTest('POST /claims/bulk-update', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claims/bulk-update', false, { error: error.message });
  }
  
  // Test claims validation
  try {
    const response = await makeRequest('POST', '/claims/validate', TEST_DATA.validClaim);
    recordTest('POST /claims/validate', [200, 400].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claims/validate', false, { error: error.message });
  }
  
  // Test claims scrub
  try {
    const response = await makeRequest('POST', '/claims/scrub', { patientId: '1' });
    recordTest('POST /claims/scrub', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claims/scrub', false, { error: error.message });
  }
  
  // Test claims estimate
  try {
    const response = await makeRequest('POST', '/claims/estimate', { patientId: '1' });
    recordTest('POST /claims/estimate', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claims/estimate', false, { error: error.message });
  }
}

// Payment Processing Tests
async function testPaymentRoutes() {
  log('Testing Payment Routes...', 'info');
  
  // Test get payments
  try {
    const response = await makeRequest('GET', '/payments', { page: 1, limit: 10 });
    recordTest('GET /payments', response.status === 200, {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /payments', false, { error: error.message });
  }
  
  // Test post payment
  try {
    const response = await makeRequest('POST', '/payments/post', TEST_DATA.validPayment);
    recordTest('POST /payments/post', [200, 201, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /payments/post', false, { error: error.message });
  }
}

// A/R Aging and Collections Tests
async function testARAndCollectionsRoutes() {
  log('Testing A/R Aging and Collections Routes...', 'info');
  
  // Test A/R aging report
  try {
    const response = await makeRequest('GET', '/ar-aging', {
      include_zero_balance: false,
      payer_filter: 'all'
    });
    recordTest('GET /ar-aging', response.status === 200, {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /ar-aging', false, { error: error.message });
  }
  
  // Test collections workflow
  try {
    const response = await makeRequest('GET', '/collections', {
      page: 1,
      status: 'active'
    });
    recordTest('GET /collections', response.status === 200, {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /collections', false, { error: error.message });
  }
  
  // Test update collection status
  try {
    const response = await makeRequest('PUT', '/collections/1/status', {
      status: 'in_progress',
      priority: 'high',
      assigned_collector: 'test_collector',
      notes: 'Test collection update'
    });
    recordTest('PUT /collections/:id/status', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('PUT /collections/:id/status', false, { error: error.message });
  }
}

// Denial Analytics Tests
async function testDenialRoutes() {
  log('Testing Denial Analytics Routes...', 'info');
  
  // Test denial analytics
  try {
    const response = await makeRequest('GET', '/denials/analytics', { timeframe: '30d' });
    recordTest('GET /denials/analytics', response.status === 200, {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /denials/analytics', false, { error: error.message });
  }
}

// Reporting Tests
async function testReportingRoutes() {
  log('Testing Reporting Routes...', 'info');
  
  // Test report generation
  const reportTypes = ['summary', 'dashboard', 'ar_aging', 'denials'];
  const formats = ['json', 'csv', 'excel', 'pdf'];
  
  for (const reportType of reportTypes) {
    for (const format of formats) {
      try {
        const response = await makeRequest('POST', '/reports/generate', {
          report_type: reportType,
          timeframe: '30d',
          format: format
        });
        recordTest(`POST /reports/generate (${reportType}-${format})`, 
          [200, 201].includes(response.status), {
          status: response.status,
          reportType,
          format
        });
      } catch (error) {
        recordTest(`POST /reports/generate (${reportType}-${format})`, false, {
          error: error.message
        });
      }
    }
  }
}

// ERA Processing Tests
async function testERARoutes() {
  log('Testing ERA Processing Routes...', 'info');
  
  // Test ERA processing
  try {
    const response = await makeRequest('POST', '/era/process', {
      era_data: 'sample_era_data',
      file_name: 'test_era.txt',
      auto_post: false
    });
    recordTest('POST /era/process', [200, 201, 400].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /era/process', false, { error: error.message });
  }
}

// ClaimMD Integration Tests
async function testClaimMDRoutes() {
  log('Testing ClaimMD Integration Routes...', 'info');
  
  // Test ClaimMD ERA status
  try {
    const response = await makeRequest('GET', '/claimmd/era/test123/status');
    recordTest('GET /claimmd/era/:id/status', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /claimmd/era/:id/status', false, { error: error.message });
  }
  
  // Test ClaimMD configuration get
  try {
    const response = await makeRequest('GET', '/claimmd/configuration');
    recordTest('GET /claimmd/configuration', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /claimmd/configuration', false, { error: error.message });
  }
  
  // Test ClaimMD configuration update
  try {
    const response = await makeRequest('PUT', '/claimmd/configuration', {
      api_key: 'test_api_key',
      provider_id: 'test_provider',
      base_url: 'https://api.claimmd.com',
      is_active: true
    });
    recordTest('PUT /claimmd/configuration', [200, 201, 400].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('PUT /claimmd/configuration', false, { error: error.message });
  }
  
  // Test ClaimMD connection
  try {
    const response = await makeRequest('POST', '/claimmd/test-connection');
    recordTest('POST /claimmd/test-connection', [200, 400].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claimmd/test-connection', false, { error: error.message });
  }
}

// Eligibility Tests
async function testEligibilityRoutes() {
  log('Testing Eligibility Routes...', 'info');
  
  // Test eligibility check
  try {
    const response = await makeRequest('POST', '/eligibility/check', TEST_DATA.validEligibility);
    recordTest('POST /eligibility/check', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /eligibility/check', false, { error: error.message });
  }
  
  // Test eligibility verify
  try {
    const response = await makeRequest('POST', '/eligibility/verify', TEST_DATA.validEligibility);
    recordTest('POST /eligibility/verify', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /eligibility/verify', false, { error: error.message });
  }
  
  // Test eligibility history
  try {
    const response = await makeRequest('GET', '/eligibility/history', {
      patientId: '1',
      page: 1,
      limit: 10
    });
    recordTest('GET /eligibility/history', [200, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /eligibility/history', false, { error: error.message });
  }
  
  // Test benefits check
  try {
    const response = await makeRequest('POST', '/benefits/check', TEST_DATA.validBenefits);
    recordTest('POST /benefits/check', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /benefits/check', false, { error: error.message });
  }
  
  // Test copay estimate
  try {
    const response = await makeRequest('POST', '/copay/estimate', { patientId: '1' });
    recordTest('POST /copay/estimate', [200, 400, 404].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /copay/estimate', false, { error: error.message });
  }
}

// Performance and Monitoring Tests
async function testPerformanceRoutes() {
  log('Testing Performance and Monitoring Routes...', 'info');
  
  // Test performance metrics
  try {
    const response = await makeRequest('GET', '/performance/metrics');
    recordTest('GET /performance/metrics', [200, 403].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /performance/metrics', false, { error: error.message });
  }
  
  // Test cache stats
  try {
    const response = await makeRequest('GET', '/cache/stats');
    recordTest('GET /cache/stats', [200, 403].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /cache/stats', false, { error: error.message });
  }
  
  // Test cache clear
  try {
    const response = await makeRequest('POST', '/cache/clear');
    recordTest('POST /cache/clear', [200, 403].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /cache/clear', false, { error: error.message });
  }
}

// Health Check Test
async function testHealthRoute() {
  log('Testing Health Check Route...', 'info');
  
  try {
    const response = await makeRequest('GET', '/health');
    recordTest('GET /health', response.status === 200, {
      status: response.status,
      responseTime: response.headers['x-response-time']
    });
  } catch (error) {
    recordTest('GET /health', false, { error: error.message });
  }
}

// Error Handling Tests
async function testErrorHandling() {
  log('Testing Error Handling...', 'info');
  
  // Test invalid endpoints
  try {
    const response = await makeRequest('GET', '/invalid-endpoint');
    recordTest('GET /invalid-endpoint', response.status === 404, {
      status: response.status
    });
  } catch (error) {
    recordTest('GET /invalid-endpoint', error.response?.status === 404, {
      status: error.response?.status
    });
  }
  
  // Test invalid data
  try {
    const response = await makeRequest('POST', '/claims', { invalid: 'data' });
    recordTest('POST /claims (invalid data)', [400, 422].includes(response.status), {
      status: response.status
    });
  } catch (error) {
    recordTest('POST /claims (invalid data)', [400, 422].includes(error.response?.status), {
      status: error.response?.status
    });
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  log('🚀 Starting Comprehensive RCM Routes Test Suite', 'info');
  log(`Testing against: ${API_BASE}`, 'info');
  
  const startTime = Date.now();
  
  try {
    // Setup authentication
    await setupAuthentication();
    
    // Run all test suites
    await testHealthRoute();
    await testDashboardRoutes();
    await testClaimsRoutes();
    await testPaymentRoutes();
    await testARAndCollectionsRoutes();
    await testDenialRoutes();
    await testReportingRoutes();
    await testERARoutes();
    await testClaimMDRoutes();
    await testEligibilityRoutes();
    await testPerformanceRoutes();
    await testErrorHandling();
    
  } catch (error) {
    log(`Test suite error: ${error.message}`, 'error');
  }
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  // Generate test report
  generateTestReport(duration);
}

/**
 * Generate Test Report
 */
function generateTestReport(duration) {
  log('\n📊 Test Results Summary', 'info');
  log('=' .repeat(50), 'info');
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'info');
  log(`Duration: ${duration.toFixed(2)} seconds`, 'info');
  
  if (testResults.failed > 0) {
    log('\n❌ Failed Tests:', 'error');
    testResults.errors.forEach(error => {
      log(`  - ${error.test}: ${error.error}`, 'error');
    });
  }
  
  // Save detailed report to file
  const reportData = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2),
      duration: duration.toFixed(2),
      timestamp: new Date().toISOString()
    },
    details: testResults.details,
    errors: testResults.errors,
    config: {
      baseUrl: API_BASE,
      timeout: TEST_CONFIG.timeout,
      retries: TEST_CONFIG.retries
    }
  };
  
  const reportFile = `rcm-routes-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
  log(`\n📄 Detailed report saved to: ${reportFile}`, 'info');
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'error');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testResults,
  TEST_CONFIG,
  TEST_DATA
};