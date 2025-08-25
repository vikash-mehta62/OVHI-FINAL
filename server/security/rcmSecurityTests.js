/**
 * RCM Security Testing Suite
 * Comprehensive security tests for the RCM module
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1`;

/**
 * Security Test Suite Configuration
 */
const SecurityTestConfig = {
  testTimeout: 30000, // 30 seconds
  maxRetries: 3,
  testUser: {
    email: 'security.test@example.com',
    password: 'SecureTestPassword123!',
    role: 'billing_clerk'
  },
  maliciousPayloads: {
    sqlInjection: [
      "'; DROP TABLE claims; --",
      "1' OR '1'='1",
      "admin'--",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM patients; --"
    ],
    xss: [
      "<script>alert('XSS')</script>",
      "javascript:alert('XSS')",
      "<img src=x onerror=alert('XSS')>",
      "<svg onload=alert('XSS')>",
      "';alert('XSS');//"
    ],
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ],
    oversizedData: {
      longString: 'A'.repeat(10000),
      deepObject: generateDeepObject(100),
      largeArray: new Array(1000).fill('test')
    }
  }
};

/**
 * Generate deep nested object for testing
 */
function generateDeepObject(depth) {
  let obj = { value: 'test' };
  for (let i = 0; i < depth; i++) {
    obj = { nested: obj };
  }
  return obj;
}

/**
 * Security Test Results
 */
class SecurityTestResults {
  constructor() {
    this.tests = [];
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }
  
  addTest(name, status, details = {}) {
    this.tests.push({
      name,
      status, // 'PASS', 'FAIL', 'WARNING'
      details,
      timestamp: new Date().toISOString()
    });
    
    this.summary.total++;
    if (status === 'PASS') this.summary.passed++;
    else if (status === 'FAIL') this.summary.failed++;
    else if (status === 'WARNING') this.summary.warnings++;
  }
  
  getReport() {
    return {
      summary: this.summary,
      tests: this.tests,
      generatedAt: new Date().toISOString()
    };
  }
}

/**
 * Main Security Test Runner
 */
class RCMSecurityTester {
  constructor() {
    this.results = new SecurityTestResults();
    this.authToken = null;
  }
  
  /**
   * Run all security tests
   */
  async runAllTests() {
    console.log('🔒 Starting RCM Security Test Suite...\n');
    
    try {
      // Authentication tests
      await this.testAuthentication();
      
      // Authorization tests
      await this.testAuthorization();
      
      // Input validation tests
      await this.testInputValidation();
      
      // Rate limiting tests
      await this.testRateLimiting();
      
      // SQL injection tests
      await this.testSQLInjection();
      
      // XSS protection tests
      await this.testXSSProtection();
      
      // Security headers tests
      await this.testSecurityHeaders();
      
      // Session management tests
      await this.testSessionManagement();
      
      // Data exposure tests
      await this.testDataExposure();
      
      // Error handling tests
      await this.testErrorHandling();
      
    } catch (error) {
      console.error('Security test suite error:', error);
      this.results.addTest('Test Suite Execution', 'FAIL', { error: error.message });
    }
    
    return this.results.getReport();
  }
  
  /**
   * Test authentication mechanisms
   */
  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    // Test 1: Access without token
    try {
      const response = await axios.get(`${API_BASE}/rcm/dashboard`);
      this.results.addTest('Unauthenticated Access', 'FAIL', {
        message: 'Endpoint accessible without authentication',
        statusCode: response.status
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.addTest('Unauthenticated Access', 'PASS', {
          message: 'Properly rejected unauthenticated request',
          statusCode: 401
        });
      } else {
        this.results.addTest('Unauthenticated Access', 'WARNING', {
          message: 'Unexpected response to unauthenticated request',
          statusCode: error.response?.status
        });
      }
    }
    
    // Test 2: Invalid token format
    try {
      const response = await axios.get(`${API_BASE}/rcm/dashboard`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      this.results.addTest('Invalid Token Format', 'FAIL', {
        message: 'Accepted invalid token format',
        statusCode: response.status
      });
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.addTest('Invalid Token Format', 'PASS', {
          message: 'Properly rejected invalid token',
          statusCode: 401
        });
      }
    }
    
    // Test 3: Malformed Authorization header
    const malformedHeaders = [
      'Basic invalid',
      'Bearer',
      'Token abc123',
      'invalid-format'
    ];
    
    for (const header of malformedHeaders) {
      try {
        await axios.get(`${API_BASE}/rcm/dashboard`, {
          headers: { 'Authorization': header }
        });
        this.results.addTest(`Malformed Header: ${header}`, 'FAIL', {
          message: 'Accepted malformed authorization header'
        });
      } catch (error) {
        if (error.response?.status === 401) {
          this.results.addTest(`Malformed Header: ${header}`, 'PASS', {
            message: 'Properly rejected malformed header'
          });
        }
      }
    }
  }
  
  /**
   * Test authorization and role-based access
   */
  async testAuthorization() {
    console.log('🛡️ Testing Authorization...');
    
    // This would require a valid token with different roles
    // For now, we'll test the structure
    this.results.addTest('Role-Based Access Control', 'WARNING', {
      message: 'Requires valid test tokens with different roles to fully test'
    });
  }
  
  /**
   * Test input validation
   */
  async testInputValidation() {
    console.log('🔍 Testing Input Validation...');
    
    const testEndpoint = `${API_BASE}/rcm/claims`;
    
    // Test oversized payloads
    try {
      await axios.post(testEndpoint, {
        patient_name: SecurityTestConfig.maliciousPayloads.oversizedData.longString,
        procedure_code: '12345',
        total_amount: 100
      }, {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      
      this.results.addTest('Oversized Input Handling', 'FAIL', {
        message: 'Accepted oversized input without validation'
      });
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 413) {
        this.results.addTest('Oversized Input Handling', 'PASS', {
          message: 'Properly rejected oversized input',
          statusCode: error.response.status
        });
      } else if (error.response?.status === 401) {
        this.results.addTest('Oversized Input Handling', 'WARNING', {
          message: 'Cannot test without valid authentication'
        });
      }
    }
    
    // Test invalid data types
    const invalidPayloads = [
      { patient_name: 123, procedure_code: 'invalid', total_amount: 'not-a-number' },
      { patient_name: null, procedure_code: null, total_amount: null },
      { patient_name: [], procedure_code: {}, total_amount: [] }
    ];
    
    for (const payload of invalidPayloads) {
      try {
        await axios.post(testEndpoint, payload, {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        
        this.results.addTest('Invalid Data Type Validation', 'FAIL', {
          message: 'Accepted invalid data types',
          payload: JSON.stringify(payload)
        });
      } catch (error) {
        if (error.response?.status === 400) {
          this.results.addTest('Invalid Data Type Validation', 'PASS', {
            message: 'Properly rejected invalid data types'
          });
        } else if (error.response?.status === 401) {
          this.results.addTest('Invalid Data Type Validation', 'WARNING', {
            message: 'Cannot test without valid authentication'
          });
        }
      }
    }
  }
  
  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing Rate Limiting...');
    
    const testEndpoint = `${API_BASE}/rcm/dashboard`;
    const requests = [];
    
    // Send multiple rapid requests
    for (let i = 0; i < 10; i++) {
      requests.push(
        axios.get(testEndpoint, {
          headers: { 'Authorization': 'Bearer test-token' }
        }).catch(error => error.response)
      );
    }
    
    try {
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(
        response => response?.status === 429
      );
      
      if (rateLimitedResponses.length > 0) {
        this.results.addTest('Rate Limiting', 'PASS', {
          message: 'Rate limiting is active',
          rateLimitedRequests: rateLimitedResponses.length
        });
      } else {
        this.results.addTest('Rate Limiting', 'WARNING', {
          message: 'No rate limiting detected in rapid requests'
        });
      }
    } catch (error) {
      this.results.addTest('Rate Limiting', 'WARNING', {
        message: 'Could not test rate limiting',
        error: error.message
      });
    }
  }
  
  /**
   * Test SQL injection protection
   */
  async testSQLInjection() {
    console.log('💉 Testing SQL Injection Protection...');
    
    const testEndpoints = [
      `${API_BASE}/rcm/claims`,
      `${API_BASE}/rcm/dashboard`
    ];
    
    for (const endpoint of testEndpoints) {
      for (const payload of SecurityTestConfig.maliciousPayloads.sqlInjection) {
        try {
          // Test in query parameters
          await axios.get(`${endpoint}?search=${encodeURIComponent(payload)}`, {
            headers: { 'Authorization': 'Bearer test-token' }
          });
          
          this.results.addTest('SQL Injection in Query', 'FAIL', {
            message: 'Potential SQL injection vulnerability',
            payload: payload,
            endpoint: endpoint
          });
        } catch (error) {
          if (error.response?.status === 400) {
            this.results.addTest('SQL Injection in Query', 'PASS', {
              message: 'SQL injection attempt blocked',
              payload: payload
            });
          } else if (error.response?.status === 401) {
            this.results.addTest('SQL Injection in Query', 'WARNING', {
              message: 'Cannot test without valid authentication'
            });
          }
        }
        
        // Test in POST body
        try {
          await axios.post(endpoint, {
            patient_name: payload,
            procedure_code: '12345',
            total_amount: 100
          }, {
            headers: { 'Authorization': 'Bearer test-token' }
          });
          
          this.results.addTest('SQL Injection in Body', 'FAIL', {
            message: 'Potential SQL injection vulnerability in request body',
            payload: payload
          });
        } catch (error) {
          if (error.response?.status === 400) {
            this.results.addTest('SQL Injection in Body', 'PASS', {
              message: 'SQL injection attempt in body blocked'
            });
          }
        }
      }
    }
  }
  
  /**
   * Test XSS protection
   */
  async testXSSProtection() {
    console.log('🚫 Testing XSS Protection...');
    
    for (const payload of SecurityTestConfig.maliciousPayloads.xss) {
      try {
        const response = await axios.post(`${API_BASE}/rcm/claims`, {
          patient_name: payload,
          procedure_code: '12345',
          total_amount: 100
        }, {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        
        // Check if XSS payload is reflected in response
        const responseText = JSON.stringify(response.data);
        if (responseText.includes('<script>') || responseText.includes('javascript:')) {
          this.results.addTest('XSS Protection', 'FAIL', {
            message: 'XSS payload reflected in response',
            payload: payload
          });
        } else {
          this.results.addTest('XSS Protection', 'PASS', {
            message: 'XSS payload properly sanitized'
          });
        }
      } catch (error) {
        if (error.response?.status === 400) {
          this.results.addTest('XSS Protection', 'PASS', {
            message: 'XSS payload rejected by validation'
          });
        } else if (error.response?.status === 401) {
          this.results.addTest('XSS Protection', 'WARNING', {
            message: 'Cannot test without valid authentication'
          });
        }
      }
    }
  }
  
  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('📋 Testing Security Headers...');
    
    try {
      const response = await axios.get(`${API_BASE}/rcm/dashboard`, {
        headers: { 'Authorization': 'Bearer test-token' }
      }).catch(error => error.response);
      
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];
      
      for (const header of requiredHeaders) {
        if (response?.headers[header]) {
          this.results.addTest(`Security Header: ${header}`, 'PASS', {
            value: response.headers[header]
          });
        } else {
          this.results.addTest(`Security Header: ${header}`, 'FAIL', {
            message: 'Required security header missing'
          });
        }
      }
    } catch (error) {
      this.results.addTest('Security Headers Test', 'WARNING', {
        message: 'Could not test security headers',
        error: error.message
      });
    }
  }
  
  /**
   * Test session management
   */
  async testSessionManagement() {
    console.log('🔑 Testing Session Management...');
    
    // This would require implementing session testing logic
    this.results.addTest('Session Management', 'WARNING', {
      message: 'Session management tests require implementation'
    });
  }
  
  /**
   * Test data exposure
   */
  async testDataExposure() {
    console.log('🔍 Testing Data Exposure...');
    
    try {
      const response = await axios.get(`${API_BASE}/rcm/dashboard`, {
        headers: { 'Authorization': 'Bearer test-token' }
      }).catch(error => error.response);
      
      if (response?.data) {
        const responseText = JSON.stringify(response.data);
        
        // Check for sensitive data patterns
        const sensitivePatterns = [
          /password/i,
          /secret/i,
          /private_key/i,
          /api_key/i,
          /token/i,
          /ssn/i,
          /social_security/i
        ];
        
        let exposedData = false;
        for (const pattern of sensitivePatterns) {
          if (pattern.test(responseText)) {
            exposedData = true;
            this.results.addTest('Sensitive Data Exposure', 'WARNING', {
              message: 'Potential sensitive data in response',
              pattern: pattern.toString()
            });
          }
        }
        
        if (!exposedData) {
          this.results.addTest('Sensitive Data Exposure', 'PASS', {
            message: 'No obvious sensitive data patterns detected'
          });
        }
      }
    } catch (error) {
      this.results.addTest('Data Exposure Test', 'WARNING', {
        message: 'Could not test data exposure'
      });
    }
  }
  
  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('❌ Testing Error Handling...');
    
    try {
      // Test 404 error
      const response = await axios.get(`${API_BASE}/rcm/nonexistent-endpoint`, {
        headers: { 'Authorization': 'Bearer test-token' }
      }).catch(error => error.response);
      
      if (response?.status === 404) {
        const errorData = response.data;
        
        // Check if error exposes internal information
        const errorText = JSON.stringify(errorData);
        const internalPatterns = [
          /stack trace/i,
          /file path/i,
          /database/i,
          /sql/i,
          /internal server/i
        ];
        
        let exposesInternal = false;
        for (const pattern of internalPatterns) {
          if (pattern.test(errorText)) {
            exposesInternal = true;
            break;
          }
        }
        
        if (exposesInternal) {
          this.results.addTest('Error Information Disclosure', 'FAIL', {
            message: 'Error response may expose internal information'
          });
        } else {
          this.results.addTest('Error Information Disclosure', 'PASS', {
            message: 'Error response does not expose internal information'
          });
        }
      }
    } catch (error) {
      this.results.addTest('Error Handling Test', 'WARNING', {
        message: 'Could not test error handling'
      });
    }
  }
}

/**
 * Run security tests
 */
async function runSecurityTests() {
  const tester = new RCMSecurityTester();
  const report = await tester.runAllTests();
  
  console.log('\n📊 Security Test Report:');
  console.log('========================');
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⚠️ Warnings: ${report.summary.warnings}`);
  
  if (report.summary.failed > 0) {
    console.log('\n❌ Failed Tests:');
    report.tests
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        console.log(`- ${test.name}: ${test.details.message}`);
      });
  }
  
  if (report.summary.warnings > 0) {
    console.log('\n⚠️ Warnings:');
    report.tests
      .filter(test => test.status === 'WARNING')
      .forEach(test => {
        console.log(`- ${test.name}: ${test.details.message}`);
      });
  }
  
  return report;
}

module.exports = {
  RCMSecurityTester,
  runSecurityTests,
  SecurityTestConfig
};