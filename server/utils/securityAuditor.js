/**
 * Security Auditor for RCM System
 * Comprehensive security scanning and vulnerability assessment
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { dbUtils } = require('./dbUtils');
const { auditLogger } = require('./auditLogger');

class SecurityAuditor {
  constructor() {
    this.vulnerabilities = [];
    this.securityChecks = new Map();
    this.registerSecurityChecks();
  }

  /**
   * Register all security checks
   */
  registerSecurityChecks() {
    this.securityChecks.set('sql_injection', this.checkSQLInjection.bind(this));
    this.securityChecks.set('xss_vulnerabilities', this.checkXSSVulnerabilities.bind(this));
    this.securityChecks.set('authentication_security', this.checkAuthenticationSecurity.bind(this));
    this.securityChecks.set('input_validation', this.checkInputValidation.bind(this));
    this.securityChecks.set('rate_limiting', this.checkRateLimiting.bind(this));
    this.securityChecks.set('cors_configuration', this.checkCORSConfiguration.bind(this));
    this.securityChecks.set('sensitive_data_exposure', this.checkSensitiveDataExposure.bind(this));
    this.securityChecks.set('security_headers', this.checkSecurityHeaders.bind(this));
    this.securityChecks.set('file_upload_security', this.checkFileUploadSecurity.bind(this));
    this.securityChecks.set('dependency_vulnerabilities', this.checkDependencyVulnerabilities.bind(this));
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit() {
    console.log('🔒 Starting Comprehensive Security Audit...');
    console.log('=' .repeat(50));

    this.vulnerabilities = [];
    const auditResults = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      vulnerabilities: []
    };

    // Run all security checks
    for (const [checkName, checkFunction] of this.securityChecks.entries()) {
      console.log(`\\n🔍 Running: ${checkName.replace('_', ' ').toUpperCase()}`);
      
      try {
        const result = await checkFunction();
        auditResults.checks[checkName] = result;
        auditResults.summary.total++;
        
        if (result.passed) {
          auditResults.summary.passed++;
          console.log(`  ✅ PASSED: ${result.message}`);
        } else {
          auditResults.summary.failed++;
          console.log(`  ❌ FAILED: ${result.message}`);
          
          // Count by severity
          auditResults.summary[result.severity.toLowerCase()]++;
          
          // Add to vulnerabilities list
          auditResults.vulnerabilities.push({
            check: checkName,
            severity: result.severity,
            message: result.message,
            details: result.details,
            recommendations: result.recommendations
          });
        }
        
      } catch (error) {
        console.error(`  💥 ERROR: ${error.message}`);
        auditResults.checks[checkName] = {
          passed: false,
          severity: 'HIGH',
          message: `Security check failed: ${error.message}`,
          error: error.stack
        };
        auditResults.summary.failed++;
        auditResults.summary.high++;
      }
    }

    // Generate audit report
    await this.generateAuditReport(auditResults);
    
    // Log audit completion
    await auditLogger.logSecurityEvent('SECURITY_AUDIT_COMPLETED', {
      totalChecks: auditResults.summary.total,
      passed: auditResults.summary.passed,
      failed: auditResults.summary.failed,
      criticalIssues: auditResults.summary.critical,
      severity: auditResults.summary.critical > 0 ? 'CRITICAL' : 
               auditResults.summary.high > 0 ? 'HIGH' : 'INFO'
    });

    return auditResults;
  }

  /**
   * Check for SQL injection vulnerabilities
   */
  async checkSQLInjection() {
    const vulnerabilities = [];
    
    // Check for dynamic query construction
    const codeFiles = await this.getCodeFiles(['js', 'ts']);
    
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for dangerous patterns
      const dangerousPatterns = [
        /query\s*\+\s*['"]/g,  // String concatenation in queries
        /\$\{.*\}.*query/g,    // Template literals in queries
        /executeQuery\([^?]*['"]\s*\+/g, // Direct concatenation in executeQuery
        /SELECT.*\+.*FROM/gi,  // Dynamic SELECT statements
        /WHERE.*\+.*=/gi       // Dynamic WHERE clauses
      ];
      
      for (const pattern of dangerousPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          vulnerabilities.push({
            file: path.relative(process.cwd(), file),
            pattern: pattern.toString(),
            matches: matches.length,
            lines: this.findLineNumbers(content, pattern)
          });
        }
      }
    }
    
    return {
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'HIGH' : 'LOW',
      message: vulnerabilities.length === 0 
        ? 'No SQL injection vulnerabilities detected'
        : `Found ${vulnerabilities.length} potential SQL injection vulnerabilities`,
      details: vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Use parameterized queries with ? placeholders',
        'Validate and sanitize all user inputs',
        'Use ORM or query builder with built-in protection',
        'Implement input validation middleware'
      ] : []
    };
  }

  /**
   * Check for XSS vulnerabilities
   */
  async checkXSSVulnerabilities() {
    const vulnerabilities = [];
    
    // Check backend response handling
    const codeFiles = await this.getCodeFiles(['js', 'ts']);
    
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for dangerous patterns
      const xssPatterns = [
        /res\.send\([^)]*req\.(body|query|params)/g, // Direct user input in response
        /innerHTML\s*=\s*[^;]*req\./g,              // Direct DOM manipulation
        /document\.write\([^)]*req\./g,             // Document.write with user input
        /eval\([^)]*req\./g,                        // Eval with user input
        /dangerouslySetInnerHTML/g                  // React dangerous HTML
      ];
      
      for (const pattern of xssPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          vulnerabilities.push({
            file: path.relative(process.cwd(), file),
            pattern: pattern.toString(),
            matches: matches.length,
            lines: this.findLineNumbers(content, pattern)
          });
        }
      }
    }
    
    return {
      passed: vulnerabilities.length === 0,
      severity: vulnerabilities.length > 0 ? 'HIGH' : 'LOW',
      message: vulnerabilities.length === 0 
        ? 'No XSS vulnerabilities detected'
        : `Found ${vulnerabilities.length} potential XSS vulnerabilities`,
      details: vulnerabilities,
      recommendations: vulnerabilities.length > 0 ? [
        'Sanitize all user inputs before output',
        'Use Content Security Policy (CSP) headers',
        'Encode output data appropriately',
        'Validate input on both client and server side'
      ] : []
    };
  }

  /**
   * Check authentication security
   */
  async checkAuthenticationSecurity() {
    const issues = [];
    
    // Check JWT configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
      issues.push({
        type: 'weak_jwt_secret',
        message: 'JWT secret is too weak or missing',
        severity: 'CRITICAL'
      });
    }
    
    // Check for hardcoded secrets
    const codeFiles = await this.getCodeFiles(['js', 'ts']);
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Look for hardcoded secrets
      const secretPatterns = [
        /jwt\.sign\([^,]*,\s*['"][^'"]{8,}['"]/g,
        /password\s*[:=]\s*['"][^'"]+['"]/g,
        /secret\s*[:=]\s*['"][^'"]+['"]/g,
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi
      ];
      
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          issues.push({
            type: 'hardcoded_secret',
            file: path.relative(process.cwd(), file),
            message: 'Potential hardcoded secret found'
          });
        }
      }
    }
    
    // Check password policies
    const hasPasswordValidation = await this.checkForPasswordValidation();
    if (!hasPasswordValidation) {
      issues.push({
        type: 'weak_password_policy',
        message: 'No strong password validation found',
        severity: 'MEDIUM'
      });
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.some(i => i.severity === 'CRITICAL') ? 'CRITICAL' : 
               issues.some(i => i.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      message: issues.length === 0 
        ? 'Authentication security checks passed'
        : `Found ${issues.length} authentication security issues`,
      details: issues,
      recommendations: [
        'Use strong JWT secrets (32+ characters)',
        'Store secrets in environment variables',
        'Implement strong password policies',
        'Add account lockout mechanisms',
        'Use secure session management'
      ]
    };
  }

  /**
   * Check input validation
   */
  async checkInputValidation() {
    const issues = [];
    
    // Check for validation middleware usage
    const routeFiles = await this.getRouteFiles();
    
    for (const file of routeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check if routes have validation
      const routePattern = /router\.(get|post|put|delete|patch)\s*\([^,]+,([^)]+)\)/g;
      const matches = [...content.matchAll(routePattern)];
      
      for (const match of matches) {
        const middlewareChain = match[2];
        
        // Check if validation middleware is present
        if (!middlewareChain.includes('validate') && 
            !middlewareChain.includes('validation') &&
            !middlewareChain.includes('sanitize')) {
          issues.push({
            file: path.relative(process.cwd(), file),
            route: match[0],
            message: 'Route missing input validation middleware'
          });
        }
      }
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 10 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
      message: issues.length === 0 
        ? 'Input validation checks passed'
        : `Found ${issues.length} routes without proper validation`,
      details: issues,
      recommendations: [
        'Add validation middleware to all routes',
        'Use schema validation (Joi, Yup, etc.)',
        'Sanitize inputs to prevent injection attacks',
        'Validate data types and formats',
        'Implement whitelist validation'
      ]
    };
  }

  /**
   * Check rate limiting implementation
   */
  async checkRateLimiting() {
    const issues = [];
    
    // Check for rate limiting middleware
    const appFiles = await this.getAppFiles();
    let hasGlobalRateLimit = false;
    
    for (const file of appFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      if (content.includes('rateLimit') || content.includes('rate-limit')) {
        hasGlobalRateLimit = true;
      }
    }
    
    if (!hasGlobalRateLimit) {
      issues.push({
        type: 'missing_global_rate_limit',
        message: 'No global rate limiting found',
        severity: 'MEDIUM'
      });
    }
    
    // Check for API-specific rate limits
    const routeFiles = await this.getRouteFiles();
    let protectedRoutes = 0;
    let totalRoutes = 0;
    
    for (const file of routeFiles) {
      const content = await fs.readFile(file, 'utf8');
      const routes = content.match(/router\.(get|post|put|delete|patch)/g) || [];
      totalRoutes += routes.length;
      
      if (content.includes('rateLimit') || content.includes('rate-limit')) {
        protectedRoutes += routes.length;
      }
    }
    
    const protectionRate = totalRoutes > 0 ? (protectedRoutes / totalRoutes) * 100 : 0;
    
    if (protectionRate < 50) {
      issues.push({
        type: 'insufficient_rate_limiting',
        message: `Only ${protectionRate.toFixed(1)}% of routes have rate limiting`,
        severity: 'MEDIUM'
      });
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 0 ? 'MEDIUM' : 'LOW',
      message: issues.length === 0 
        ? 'Rate limiting checks passed'
        : `Found ${issues.length} rate limiting issues`,
      details: issues,
      recommendations: [
        'Implement global rate limiting',
        'Add specific limits for sensitive endpoints',
        'Use distributed rate limiting for scalability',
        'Monitor and alert on rate limit violations',
        'Implement progressive delays for repeated violations'
      ]
    };
  }

  /**
   * Check CORS configuration
   */
  async checkCORSConfiguration() {
    const issues = [];
    
    const appFiles = await this.getAppFiles();
    let corsConfig = null;
    
    for (const file of appFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for CORS configuration
      if (content.includes('cors(')) {
        const corsMatch = content.match(/cors\\(([^)]+)\\)/);
        if (corsMatch) {
          corsConfig = corsMatch[1];
        }
      }
    }
    
    if (!corsConfig) {
      issues.push({
        type: 'missing_cors',
        message: 'No CORS configuration found',
        severity: 'MEDIUM'
      });
    } else {
      // Check for overly permissive CORS
      if (corsConfig.includes('*') || corsConfig.includes('origin: true')) {
        issues.push({
          type: 'permissive_cors',
          message: 'CORS configuration is too permissive',
          severity: 'HIGH'
        });
      }
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.some(i => i.severity === 'HIGH') ? 'HIGH' : 'MEDIUM',
      message: issues.length === 0 
        ? 'CORS configuration is secure'
        : `Found ${issues.length} CORS security issues`,
      details: issues,
      recommendations: [
        'Configure specific allowed origins',
        'Avoid using wildcard (*) origins in production',
        'Set appropriate CORS headers',
        'Validate origin headers',
        'Use credentials: true only when necessary'
      ]
    };
  }

  /**
   * Check for sensitive data exposure
   */
  async checkSensitiveDataExposure() {
    const issues = [];
    
    const codeFiles = await this.getCodeFiles(['js', 'ts']);
    
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for sensitive data in logs
      const sensitivePatterns = [
        /console\.log\([^)]*password[^)]*\)/gi,
        /console\.log\([^)]*token[^)]*\)/gi,
        /console\.log\([^)]*secret[^)]*\)/gi,
        /console\.log\([^)]*ssn[^)]*\)/gi,
        /console\.log\([^)]*credit[^)]*\)/gi,
        /res\.json\([^)]*password[^)]*\)/gi,
        /res\.send\([^)]*password[^)]*\)/gi
      ];
      
      for (const pattern of sensitivePatterns) {
        const matches = content.match(pattern);
        if (matches) {
          issues.push({
            file: path.relative(process.cwd(), file),
            type: 'sensitive_data_logging',
            matches: matches.length,
            pattern: pattern.toString()
          });
        }
      }
      
      // Check for hardcoded sensitive data
      const hardcodedPatterns = [
        /ssn\s*[:=]\s*['"]\\d{3}-\\d{2}-\\d{4}['"]/gi,
        /credit.*card\s*[:=]\s*['"]\\d{4}[^'"]*['"]/gi,
        /password\s*[:=]\s*['"][^'"]{6,}['"]/gi
      ];
      
      for (const pattern of hardcodedPatterns) {
        if (pattern.test(content)) {
          issues.push({
            file: path.relative(process.cwd(), file),
            type: 'hardcoded_sensitive_data',
            pattern: pattern.toString()
          });
        }
      }
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 0 ? 'HIGH' : 'LOW',
      message: issues.length === 0 
        ? 'No sensitive data exposure detected'
        : `Found ${issues.length} potential sensitive data exposures`,
      details: issues,
      recommendations: [
        'Remove sensitive data from logs',
        'Use data masking for sensitive information',
        'Implement proper data sanitization',
        'Store sensitive data securely encrypted',
        'Use environment variables for secrets'
      ]
    };
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    const issues = [];
    const requiredHeaders = [
      'helmet',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Content-Security-Policy'
    ];
    
    const appFiles = await this.getAppFiles();
    const foundHeaders = new Set();
    
    for (const file of appFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      for (const header of requiredHeaders) {
        if (content.includes(header)) {
          foundHeaders.add(header);
        }
      }
    }
    
    for (const header of requiredHeaders) {
      if (!foundHeaders.has(header)) {
        issues.push({
          type: 'missing_security_header',
          header,
          message: `Missing security header: ${header}`
        });
      }
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 3 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
      message: issues.length === 0 
        ? 'All security headers are configured'
        : `Missing ${issues.length} security headers`,
      details: issues,
      recommendations: [
        'Use helmet.js for security headers',
        'Configure Content Security Policy',
        'Set X-Frame-Options to prevent clickjacking',
        'Enable HSTS for HTTPS enforcement',
        'Set X-Content-Type-Options to nosniff'
      ]
    };
  }

  /**
   * Check file upload security
   */
  async checkFileUploadSecurity() {
    const issues = [];
    
    const codeFiles = await this.getCodeFiles(['js', 'ts']);
    
    for (const file of codeFiles) {
      const content = await fs.readFile(file, 'utf8');
      
      // Check for file upload handling
      if (content.includes('multer') || content.includes('fileupload')) {
        // Check for file type validation
        if (!content.includes('fileFilter') && !content.includes('mimetype')) {
          issues.push({
            file: path.relative(process.cwd(), file),
            type: 'missing_file_validation',
            message: 'File upload without type validation'
          });
        }
        
        // Check for file size limits
        if (!content.includes('limits') && !content.includes('maxSize')) {
          issues.push({
            file: path.relative(process.cwd(), file),
            type: 'missing_size_limits',
            message: 'File upload without size limits'
          });
        }
      }
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 0 ? 'MEDIUM' : 'LOW',
      message: issues.length === 0 
        ? 'File upload security checks passed'
        : `Found ${issues.length} file upload security issues`,
      details: issues,
      recommendations: [
        'Validate file types and extensions',
        'Set file size limits',
        'Scan uploaded files for malware',
        'Store files outside web root',
        'Use secure file naming conventions'
      ]
    };
  }

  /**
   * Check dependency vulnerabilities
   */
  async checkDependencyVulnerabilities() {
    const issues = [];
    
    try {
      // Check package.json for known vulnerable packages
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      // List of known vulnerable packages (simplified check)
      const vulnerablePackages = [
        'lodash@4.17.15',
        'moment@2.24.0',
        'axios@0.18.0',
        'express@4.16.0'
      ];
      
      const allDependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      for (const [pkg, version] of Object.entries(allDependencies)) {
        const pkgVersion = `${pkg}@${version}`;
        if (vulnerablePackages.some(vuln => pkgVersion.includes(vuln.split('@')[0]))) {
          issues.push({
            package: pkg,
            version,
            type: 'vulnerable_dependency',
            message: `Potentially vulnerable package: ${pkg}@${version}`
          });
        }
      }
      
    } catch (error) {
      issues.push({
        type: 'dependency_check_failed',
        message: `Failed to check dependencies: ${error.message}`
      });
    }
    
    return {
      passed: issues.length === 0,
      severity: issues.length > 5 ? 'HIGH' : issues.length > 0 ? 'MEDIUM' : 'LOW',
      message: issues.length === 0 
        ? 'No vulnerable dependencies detected'
        : `Found ${issues.length} potentially vulnerable dependencies`,
      details: issues,
      recommendations: [
        'Run npm audit to check for vulnerabilities',
        'Update dependencies to latest secure versions',
        'Use npm audit fix to automatically fix issues',
        'Monitor dependencies for security updates',
        'Consider using tools like Snyk for continuous monitoring'
      ]
    };
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport(auditResults) {
    const reportPath = path.join(__dirname, '../logs/security-audit-report.json');
    const htmlReportPath = path.join(__dirname, '../logs/security-audit-report.html');
    
    // Generate JSON report
    await fs.writeFile(reportPath, JSON.stringify(auditResults, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(auditResults);
    await fs.writeFile(htmlReportPath, htmlReport);
    
    console.log(`\\n📊 Security Audit Report Generated:`);
    console.log(`  📄 JSON Report: ${reportPath}`);
    console.log(`  🌐 HTML Report: ${htmlReportPath}`);
    
    // Display summary
    this.displayAuditSummary(auditResults);
  }

  /**
   * Display audit summary
   */
  displayAuditSummary(auditResults) {
    const { summary } = auditResults;
    
    console.log('\\n📋 Security Audit Summary:');
    console.log('=' .repeat(40));
    console.log(`Total Checks: ${summary.total}`);
    console.log(`Passed: ${summary.passed} ✅`);
    console.log(`Failed: ${summary.failed} ❌`);
    console.log('\\nVulnerabilities by Severity:');
    console.log(`  Critical: ${summary.critical} 🔥`);
    console.log(`  High: ${summary.high} ⚠️`);
    console.log(`  Medium: ${summary.medium} ⚡`);
    console.log(`  Low: ${summary.low} ℹ️`);
    
    const overallScore = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
    console.log(`\\n🎯 Overall Security Score: ${overallScore.toFixed(1)}%`);
    
    if (summary.critical > 0) {
      console.log('\\n🚨 CRITICAL ISSUES FOUND - IMMEDIATE ACTION REQUIRED');
    } else if (summary.high > 0) {
      console.log('\\n⚠️  HIGH PRIORITY ISSUES FOUND - ACTION RECOMMENDED');
    } else if (summary.medium > 0) {
      console.log('\\n⚡ MEDIUM PRIORITY ISSUES FOUND - REVIEW RECOMMENDED');
    } else {
      console.log('\\n✅ NO CRITICAL SECURITY ISSUES FOUND');
    }
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport(auditResults) {
    const { summary, vulnerabilities, timestamp } = auditResults;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RCM Security Audit Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .critical { color: #dc3545; background-color: #f8d7da; }
        .high { color: #fd7e14; background-color: #fff3cd; }
        .medium { color: #ffc107; background-color: #fff3cd; }
        .low { color: #17a2b8; background-color: #d1ecf1; }
        .vulnerability { margin: 15px 0; padding: 15px; border-left: 4px solid #ddd; background: #f8f9fa; }
        .vulnerability h4 { margin: 0 0 10px 0; }
        .recommendations { margin-top: 10px; }
        .recommendations ul { margin: 5px 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 RCM Security Audit Report</h1>
            <p>Generated on: ${new Date(timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Checks</h3>
                <div class="value">${summary.total}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value passed">${summary.passed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value failed">${summary.failed}</div>
            </div>
            <div class="metric critical">
                <h3>Critical</h3>
                <div class="value">${summary.critical}</div>
            </div>
            <div class="metric high">
                <h3>High</h3>
                <div class="value">${summary.high}</div>
            </div>
            <div class="metric medium">
                <h3>Medium</h3>
                <div class="value">${summary.medium}</div>
            </div>
            <div class="metric low">
                <h3>Low</h3>
                <div class="value">${summary.low}</div>
            </div>
        </div>
        
        <h2>Vulnerabilities Found</h2>
        ${vulnerabilities.map(vuln => `
            <div class="vulnerability ${vuln.severity.toLowerCase()}">
                <h4>${vuln.check.replace(/_/g, ' ').toUpperCase()} - ${vuln.severity}</h4>
                <p><strong>Message:</strong> ${vuln.message}</p>
                ${vuln.details && vuln.details.length > 0 ? `
                    <p><strong>Details:</strong></p>
                    <pre>${JSON.stringify(vuln.details, null, 2)}</pre>
                ` : ''}
                ${vuln.recommendations && vuln.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <strong>Recommendations:</strong>
                        <ul>
                            ${vuln.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
        
        <div style="margin-top: 30px; padding: 20px; background: #e9ecef; border-radius: 5px;">
            <h3>Overall Security Score: ${summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : 0}%</h3>
            <p>This report provides an overview of security vulnerabilities found in the RCM system. 
            Please address critical and high-priority issues immediately.</p>
        </div>
    </div>
</body>
</html>`;
  }

  // Helper methods
  async getCodeFiles(extensions) {
    const files = [];
    const searchDirs = ['server', 'src'];
    
    for (const dir of searchDirs) {
      try {
        await this.findFiles(dir, extensions, files);
      } catch (error) {
        // Directory might not exist
      }
    }
    
    return files;
  }

  async findFiles(dir, extensions, files) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        await this.findFiles(fullPath, extensions, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  async getRouteFiles() {
    const files = [];
    await this.findFiles('server', ['js'], files);
    return files.filter(file => 
      file.includes('route') || 
      file.includes('Route') || 
      file.endsWith('Routes.js')
    );
  }

  async getAppFiles() {
    const files = [];
    await this.findFiles('server', ['js'], files);
    return files.filter(file => 
      file.includes('app.js') || 
      file.includes('index.js') || 
      file.includes('server.js')
    );
  }

  findLineNumbers(content, pattern) {
    const lines = content.split('\\n');
    const matchingLines = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matchingLines.push(index + 1);
      }
    });
    
    return matchingLines;
  }

  async checkForPasswordValidation() {
    const files = await this.getCodeFiles(['js', 'ts']);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      
      if (content.includes('password') && 
          (content.includes('length') || content.includes('regex') || content.includes('validate'))) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = {
  SecurityAuditor
};