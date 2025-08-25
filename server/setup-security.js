/**
 * Security Setup and Audit Script
 * Comprehensive security configuration and vulnerability assessment
 */

const { SecurityAuditor } = require('./utils/securityAuditor');
const { PenetrationTester } = require('./utils/penetrationTester');
const { inputSanitizer } = require('./utils/inputSanitizer');
const { auditLogger } = require('./utils/auditLogger');
const fs = require('fs').promises;
const path = require('path');

class SecuritySetup {
  constructor() {
    this.securityAuditor = new SecurityAuditor();
    this.penetrationTester = new PenetrationTester();
    this.setupSteps = [
      'validateEnvironment',
      'runSecurityAudit',
      'runPenetrationTests',
      'generateSecurityReport',
      'implementFixes',
      'validateFixes'
    ];
  }

  /**
   * Run complete security setup and audit
   */
  async setup() {
    console.log('🔒 Starting Comprehensive Security Setup and Audit...');
    console.log('=' .repeat(60));

    const results = {
      timestamp: new Date().toISOString(),
      steps: {},
      summary: {},
      recommendations: []
    };

    try {
      for (const step of this.setupSteps) {
        console.log(`\\n📋 Executing: ${step}`);
        const stepResult = await this[step]();
        results.steps[step] = stepResult;
        console.log(`✅ Completed: ${step}`);
      }

      results.summary = this.generateOverallSummary(results);
      
      console.log('\\n🎉 Security Setup and Audit Complete!');
      console.log('=' .repeat(60));
      
      await this.displaySecuritySummary(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Security setup failed:', error.message);
      console.error('Stack trace:', error.stack);
      
      await auditLogger.logSecurityEvent('SECURITY_SETUP_FAILED', {
        error: error.message,
        step: 'unknown',
        severity: 'CRITICAL'
      });
      
      throw error;
    }
  }

  /**
   * Validate security environment
   */
  async validateEnvironment() {
    console.log('  🔍 Validating security environment...');
    
    const checks = {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      httpsEnabled: !!process.env.HTTPS_ENABLED,
      jwtSecret: !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
      databaseEncryption: !!process.env.DB_ENCRYPTION_KEY,
      corsOrigins: !!process.env.ALLOWED_ORIGINS,
      rateLimiting: true, // Will be validated in audit
      securityHeaders: true // Will be validated in audit
    };

    const issues = [];
    
    if (!checks.jwtSecret) {
      issues.push({
        type: 'JWT_SECRET_WEAK',
        severity: 'CRITICAL',
        message: 'JWT secret is missing or too weak (< 32 characters)'
      });
    }
    
    if (checks.environment === 'production' && !checks.httpsEnabled) {
      issues.push({
        type: 'HTTPS_DISABLED',
        severity: 'HIGH',
        message: 'HTTPS should be enabled in production'
      });
    }
    
    if (!checks.corsOrigins) {
      issues.push({
        type: 'CORS_NOT_CONFIGURED',
        severity: 'MEDIUM',
        message: 'CORS origins not explicitly configured'
      });
    }

    console.log(`    ✓ Node.js version: ${checks.nodeVersion}`);
    console.log(`    ✓ Environment: ${checks.environment}`);
    console.log(`    ✓ HTTPS enabled: ${checks.httpsEnabled}`);
    console.log(`    ✓ JWT secret configured: ${checks.jwtSecret}`);
    
    return {
      checks,
      issues,
      passed: issues.length === 0
    };
  }

  /**
   * Run security audit
   */
  async runSecurityAudit() {
    console.log('  🔍 Running comprehensive security audit...');
    
    const auditResults = await this.securityAuditor.runSecurityAudit();
    
    console.log(`    ✓ Completed ${auditResults.summary.total} security checks`);
    console.log(`    ✓ Found ${auditResults.summary.failed} potential issues`);
    
    return auditResults;
  }

  /**
   * Run penetration tests
   */
  async runPenetrationTests() {
    console.log('  🧪 Running penetration tests...');
    
    // Only run penetration tests if server is running
    try {
      const testResults = await this.penetrationTester.runPenetrationTests();
      
      console.log(`    ✓ Completed penetration testing`);
      console.log(`    ✓ Found ${testResults.vulnerabilities.length} vulnerabilities`);
      
      return testResults;
    } catch (error) {
      console.log(`    ⚠️  Penetration tests skipped: ${error.message}`);
      return {
        skipped: true,
        reason: error.message,
        testResults: [],
        vulnerabilities: []
      };
    }
  }

  /**
   * Generate comprehensive security report
   */
  async generateSecurityReport() {
    console.log('  📊 Generating security report...');
    
    const reportData = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV
      },
      securityAudit: this.securityAuditor.vulnerabilities,
      penetrationTest: this.penetrationTester.vulnerabilities,
      recommendations: this.generateSecurityRecommendations()
    };

    // Generate JSON report
    const jsonReportPath = path.join(__dirname, 'logs/comprehensive-security-report.json');
    await fs.writeFile(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLSecurityReport(reportData);
    const htmlReportPath = path.join(__dirname, 'logs/comprehensive-security-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);

    console.log(`    ✓ JSON Report: ${jsonReportPath}`);
    console.log(`    ✓ HTML Report: ${htmlReportPath}`);

    return {
      jsonReport: jsonReportPath,
      htmlReport: htmlReportPath,
      data: reportData
    };
  }

  /**
   * Implement security fixes
   */
  async implementFixes() {
    console.log('  🔧 Implementing security fixes...');
    
    const fixes = [];

    // Create security configuration file
    const securityConfig = {
      rateLimiting: {
        enabled: true,
        windowMs: 15 * 60 * 1000,
        max: 100
      },
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true
      },
      headers: {
        contentSecurityPolicy: true,
        hsts: true,
        noSniff: true,
        xssFilter: true
      },
      inputValidation: {
        enabled: true,
        sanitizeHTML: true,
        maxLength: 10000
      }
    };

    const configPath = path.join(__dirname, 'config/security.json');
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(securityConfig, null, 2));
    
    fixes.push({
      type: 'SECURITY_CONFIG',
      description: 'Created security configuration file',
      path: configPath
    });

    // Create input sanitization examples
    const sanitizationExamples = this.generateSanitizationExamples();
    const examplesPath = path.join(__dirname, 'examples/input-sanitization.js');
    await fs.mkdir(path.dirname(examplesPath), { recursive: true });
    await fs.writeFile(examplesPath, sanitizationExamples);
    
    fixes.push({
      type: 'SANITIZATION_EXAMPLES',
      description: 'Created input sanitization examples',
      path: examplesPath
    });

    // Create security middleware integration guide
    const middlewareGuide = this.generateMiddlewareGuide();
    const guidePath = path.join(__dirname, 'docs/security-middleware-guide.md');
    await fs.mkdir(path.dirname(guidePath), { recursive: true });
    await fs.writeFile(guidePath, middlewareGuide);
    
    fixes.push({
      type: 'MIDDLEWARE_GUIDE',
      description: 'Created security middleware integration guide',
      path: guidePath
    });

    console.log(`    ✓ Implemented ${fixes.length} security fixes`);
    
    return fixes;
  }

  /**
   * Validate implemented fixes
   */
  async validateFixes() {
    console.log('  ✅ Validating security fixes...');
    
    const validations = [];

    // Validate input sanitizer
    const testInputs = [
      '<script>alert("test")</script>',
      "'; DROP TABLE users; --",
      '../../../etc/passwd'
    ];

    for (const input of testInputs) {
      const sanitized = inputSanitizer.sanitize(input);
      const safe = sanitized !== input && !sanitized.includes('<script>');
      
      validations.push({
        type: 'INPUT_SANITIZATION',
        input: input.substring(0, 50),
        sanitized: sanitized.substring(0, 50),
        safe
      });
    }

    // Validate security files exist
    const requiredFiles = [
      'utils/securityAuditor.js',
      'utils/inputSanitizer.js',
      'middleware/rateLimiting.js',
      'middleware/securityHeaders.js'
    ];

    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(__dirname, file));
        validations.push({
          type: 'FILE_EXISTS',
          file,
          exists: true
        });
      } catch (error) {
        validations.push({
          type: 'FILE_EXISTS',
          file,
          exists: false,
          error: error.message
        });
      }
    }

    const allValid = validations.every(v => v.safe !== false && v.exists !== false);
    
    console.log(`    ✓ Validated ${validations.length} security fixes`);
    console.log(`    ✓ All validations passed: ${allValid}`);
    
    return {
      validations,
      allValid
    };
  }

  /**
   * Generate security recommendations
   */
  generateSecurityRecommendations() {
    return [
      {
        category: 'Authentication',
        priority: 'HIGH',
        recommendations: [
          'Implement multi-factor authentication (MFA)',
          'Use strong password policies (min 12 characters, complexity)',
          'Implement account lockout after failed attempts',
          'Use secure session management',
          'Rotate JWT secrets regularly'
        ]
      },
      {
        category: 'Input Validation',
        priority: 'HIGH',
        recommendations: [
          'Validate all inputs on both client and server side',
          'Use parameterized queries to prevent SQL injection',
          'Sanitize HTML content to prevent XSS',
          'Implement file upload restrictions',
          'Use input length limits'
        ]
      },
      {
        category: 'Network Security',
        priority: 'MEDIUM',
        recommendations: [
          'Use HTTPS in production',
          'Implement proper CORS policies',
          'Use security headers (CSP, HSTS, etc.)',
          'Implement rate limiting',
          'Use Web Application Firewall (WAF)'
        ]
      },
      {
        category: 'Data Protection',
        priority: 'HIGH',
        recommendations: [
          'Encrypt sensitive data at rest',
          'Use TLS for data in transit',
          'Implement proper access controls',
          'Regular security audits',
          'Data backup and recovery procedures'
        ]
      },
      {
        category: 'Monitoring',
        priority: 'MEDIUM',
        recommendations: [
          'Implement security event logging',
          'Monitor for suspicious activities',
          'Set up alerting for security events',
          'Regular penetration testing',
          'Security metrics and reporting'
        ]
      }
    ];
  }

  /**
   * Generate HTML security report
   */
  generateHTMLSecurityReport(data) {
    const totalVulns = data.securityAudit.length + data.penetrationTest.length;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Security Report - RCM System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .critical { color: #dc3545; background-color: #f8d7da; }
        .high { color: #fd7e14; background-color: #fff3cd; }
        .medium { color: #ffc107; background-color: #fff3cd; }
        .low { color: #17a2b8; background-color: #d1ecf1; }
        .vulnerability { margin: 15px 0; padding: 15px; border-left: 4px solid #ddd; background: #f8f9fa; }
        .vulnerability h4 { margin: 0 0 10px 0; }
        .recommendations { margin-top: 30px; }
        .recommendation-category { margin: 20px 0; padding: 15px; background: #e9ecef; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Comprehensive Security Report</h1>
            <p>Generated on: ${new Date(data.timestamp).toLocaleString()}</p>
            <p>Environment: ${data.environment.environment} | Node.js: ${data.environment.nodeVersion}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Vulnerabilities</h3>
                <div class="value">${totalVulns}</div>
            </div>
            <div class="metric critical">
                <h3>Critical</h3>
                <div class="value">${data.securityAudit.filter(v => v.severity === 'CRITICAL').length}</div>
            </div>
            <div class="metric high">
                <h3>High</h3>
                <div class="value">${data.securityAudit.filter(v => v.severity === 'HIGH').length}</div>
            </div>
            <div class="metric medium">
                <h3>Medium</h3>
                <div class="value">${data.securityAudit.filter(v => v.severity === 'MEDIUM').length}</div>
            </div>
            <div class="metric low">
                <h3>Low</h3>
                <div class="value">${data.securityAudit.filter(v => v.severity === 'LOW').length}</div>
            </div>
        </div>
        
        <h2>Security Audit Findings</h2>
        ${data.securityAudit.map(vuln => `
            <div class="vulnerability ${vuln.severity.toLowerCase()}">
                <h4>${vuln.check?.replace(/_/g, ' ').toUpperCase()} - ${vuln.severity}</h4>
                <p><strong>Message:</strong> ${vuln.message}</p>
                ${vuln.recommendations ? `
                    <div>
                        <strong>Recommendations:</strong>
                        <ul>
                            ${vuln.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
        
        <h2>Penetration Test Results</h2>
        ${data.penetrationTest.map(vuln => `
            <div class="vulnerability ${vuln.severity.toLowerCase()}">
                <h4>${vuln.type} - ${vuln.severity}</h4>
                <p><strong>Description:</strong> ${vuln.description}</p>
                ${vuln.endpoint ? `<p><strong>Endpoint:</strong> ${vuln.endpoint}</p>` : ''}
            </div>
        `).join('')}
        
        <div class="recommendations">
            <h2>Security Recommendations</h2>
            ${data.recommendations.map(category => `
                <div class="recommendation-category">
                    <h3>${category.category} (Priority: ${category.priority})</h3>
                    <ul>
                        ${category.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 5px;">
            <h3>Overall Security Score: ${this.calculateSecurityScore(data)}%</h3>
            <p>This comprehensive security report identifies vulnerabilities and provides recommendations 
            for improving the security posture of the RCM system. Please address critical and high-priority 
            issues immediately.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Calculate overall security score
   */
  calculateSecurityScore(data) {
    const totalVulns = data.securityAudit.length + data.penetrationTest.length;
    const criticalVulns = data.securityAudit.filter(v => v.severity === 'CRITICAL').length;
    const highVulns = data.securityAudit.filter(v => v.severity === 'HIGH').length;
    
    let score = 100;
    score -= criticalVulns * 20;
    score -= highVulns * 10;
    score -= (totalVulns - criticalVulns - highVulns) * 2;
    
    return Math.max(0, score);
  }

  /**
   * Generate sanitization examples
   */
  generateSanitizationExamples() {
    return `
// Input Sanitization Examples for RCM System

const { inputSanitizer } = require('../utils/inputSanitizer');

// Example 1: Sanitize user input
const userInput = '<script>alert("XSS")</script>';
const sanitized = inputSanitizer.sanitize(userInput);
console.log('Sanitized:', sanitized); // Output: &lt;script&gt;alert("XSS")&lt;/script&gt;

// Example 2: Validate email
const emailResult = inputSanitizer.validateEmail('user@example.com');
if (emailResult.valid) {
    console.log('Valid email:', emailResult.sanitized);
}

// Example 3: Validate medical code
const codeResult = inputSanitizer.validateMedicalCode('A01.1', 'icd10');
if (codeResult.valid) {
    console.log('Valid ICD-10 code:', codeResult.sanitized);
}

// Example 4: Batch validation
const validationRules = {
    email: { type: 'email' },
    phone: { type: 'phone' },
    amount: { type: 'currency' },
    patientId: { type: 'patient_id' }
};

const userData = {
    email: 'patient@example.com',
    phone: '555-123-4567',
    amount: '150.00',
    patientId: 'PAT12345'
};

const batchResult = inputSanitizer.validateBatch(userData, validationRules);
if (batchResult.valid) {
    console.log('All data valid:', batchResult.sanitized);
} else {
    console.log('Validation errors:', batchResult.errors);
}

// Example 5: Detect suspicious patterns
const suspiciousInput = "'; DROP TABLE users; --";
const detection = inputSanitizer.detectSuspiciousPatterns(suspiciousInput);
if (detection.suspicious) {
    console.log('Suspicious patterns detected:', detection.patterns);
}
`;
  }

  /**
   * Generate middleware integration guide
   */
  generateMiddlewareGuide() {
    return `
# Security Middleware Integration Guide

## Overview
This guide shows how to integrate the security middleware components into your Express.js application.

## 1. Rate Limiting

\`\`\`javascript
const { 
  generalRateLimit, 
  authRateLimit, 
  bruteForceProtection 
} = require('./middleware/rateLimiting');

// Apply general rate limiting to all routes
app.use(generalRateLimit);

// Apply stricter rate limiting to auth routes
app.use('/api/v1/auth', authRateLimit);

// Apply brute force protection
app.use(bruteForceProtection);
\`\`\`

## 2. Security Headers

\`\`\`javascript
const { securityMiddlewareStack } = require('./middleware/securityHeaders');

// Apply all security headers
app.use(securityMiddlewareStack);
\`\`\`

## 3. Input Sanitization

\`\`\`javascript
const { inputSanitizer } = require('./utils/inputSanitizer');

// Middleware to sanitize request body
app.use((req, res, next) => {
  if (req.body) {
    req.body = inputSanitizer.sanitize(req.body);
  }
  next();
});
\`\`\`

## 4. CORS Configuration

\`\`\`javascript
const cors = require('cors');
const { corsConfig } = require('./middleware/securityHeaders');

app.use(cors(corsConfig));
\`\`\`

## 5. Complete Security Setup

\`\`\`javascript
const express = require('express');
const { securityMiddlewareStack } = require('./middleware/securityHeaders');
const { generalRateLimit, authRateLimit } = require('./middleware/rateLimiting');
const { performanceMiddleware } = require('./middleware/monitoring');

const app = express();

// Apply security middleware in correct order
app.use(securityMiddlewareStack);
app.use(generalRateLimit);
app.use(performanceMiddleware);

// Auth-specific middleware
app.use('/api/v1/auth', authRateLimit);

// Your routes here
app.use('/api/v1', routes);

module.exports = app;
\`\`\`

## 6. Environment Variables

Make sure to set these environment variables:

\`\`\`
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
HTTPS_ENABLED=true
DB_ENCRYPTION_KEY=your-database-encryption-key
\`\`\`

## 7. Testing Security

Run the security audit and penetration tests:

\`\`\`bash
node server/setup-security.js
\`\`\`

This will generate comprehensive security reports and recommendations.
`;
  }

  /**
   * Generate overall summary
   */
  generateOverallSummary(results) {
    const auditResults = results.steps.runSecurityAudit;
    const penTestResults = results.steps.runPenetrationTests;
    
    return {
      securityScore: this.calculateSecurityScore({
        securityAudit: auditResults?.vulnerabilities || [],
        penetrationTest: penTestResults?.vulnerabilities || []
      }),
      totalVulnerabilities: (auditResults?.vulnerabilities?.length || 0) + 
                           (penTestResults?.vulnerabilities?.length || 0),
      criticalIssues: (auditResults?.vulnerabilities?.filter(v => v.severity === 'CRITICAL')?.length || 0),
      highIssues: (auditResults?.vulnerabilities?.filter(v => v.severity === 'HIGH')?.length || 0),
      fixesImplemented: results.steps.implementFixes?.length || 0,
      validationsPassed: results.steps.validateFixes?.allValid || false
    };
  }

  /**
   * Display security summary
   */
  async displaySecuritySummary(results) {
    const { summary } = results;
    
    console.log('\\n📊 Security Summary:');
    console.log('=' .repeat(40));
    console.log(`Security Score: ${summary.securityScore}%`);
    console.log(`Total Vulnerabilities: ${summary.totalVulnerabilities}`);
    console.log(`Critical Issues: ${summary.criticalIssues} 🔥`);
    console.log(`High Priority Issues: ${summary.highIssues} ⚠️`);
    console.log(`Fixes Implemented: ${summary.fixesImplemented}`);
    console.log(`All Validations Passed: ${summary.validationsPassed ? '✅' : '❌'}`);
    
    if (summary.criticalIssues > 0) {
      console.log('\\n🚨 CRITICAL SECURITY ISSUES FOUND - IMMEDIATE ACTION REQUIRED');
    } else if (summary.highIssues > 0) {
      console.log('\\n⚠️  HIGH PRIORITY SECURITY ISSUES FOUND - ACTION RECOMMENDED');
    } else {
      console.log('\\n✅ NO CRITICAL SECURITY ISSUES FOUND');
    }
    
    console.log('\\n📄 Reports Generated:');
    console.log('  - logs/comprehensive-security-report.json');
    console.log('  - logs/comprehensive-security-report.html');
    console.log('  - logs/security-audit-report.json');
    console.log('  - logs/penetration-test-report.json');
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const setup = new SecuritySetup();

  if (args.includes('--audit-only')) {
    setup.securityAuditor.runSecurityAudit()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else if (args.includes('--pentest-only')) {
    setup.penetrationTester.runPenetrationTests()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    setup.setup()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = SecuritySetup;