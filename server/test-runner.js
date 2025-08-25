/**
 * Comprehensive Test Runner for RCM Backend
 * Runs all test suites with proper configuration and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testSuites = {
      unit: {
        name: 'Unit Tests',
        pattern: '**/__tests__/**/*.test.js',
        exclude: ['**/integration/**', '**/performance/**'],
        timeout: 10000
      },
      integration: {
        name: 'Integration Tests',
        pattern: '**/__tests__/integration/**/*.test.js',
        timeout: 30000
      },
      performance: {
        name: 'Performance Tests',
        pattern: '**/__tests__/performance/**/*.test.js',
        timeout: 60000
      },
      middleware: {
        name: 'Middleware Tests',
        pattern: '**/middleware/__tests__/**/*.test.js',
        timeout: 10000
      },
      services: {
        name: 'Service Tests',
        pattern: '**/services/**/__tests__/**/*.test.js',
        timeout: 15000
      },
      utils: {
        name: 'Utility Tests',
        pattern: '**/utils/__tests__/**/*.test.js',
        timeout: 10000
      }
    };

    this.results = {};
  }

  async runTestSuite(suiteName, options = {}) {
    const suite = this.testSuites[suiteName];
    if (!suite) {
      throw new Error(`Test suite '${suiteName}' not found`);
    }

    console.log(`\\n🧪 Running ${suite.name}...`);
    console.log(`Pattern: ${suite.pattern}`);
    console.log(`Timeout: ${suite.timeout}ms`);

    const jestConfig = {
      testMatch: [suite.pattern],
      testTimeout: suite.timeout,
      verbose: options.verbose || false,
      collectCoverage: options.coverage || false,
      coverageDirectory: `coverage/${suiteName}`,
      coverageReporters: ['text', 'lcov', 'html'],
      ...options.jestConfig
    };

    if (suite.exclude) {
      jestConfig.testPathIgnorePatterns = suite.exclude;
    }

    const configPath = path.join(__dirname, `jest.${suiteName}.config.js`);
    
    // Write temporary Jest config
    fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(jestConfig, null, 2)};`);

    try {
      const startTime = Date.now();
      
      const command = `npx jest --config=${configPath} ${options.watch ? '--watch' : ''}`;
      
      if (options.dryRun) {
        console.log(`Would run: ${command}`);
        return { success: true, duration: 0, tests: 0 };
      }

      const output = execSync(command, { 
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit'
      });

      const duration = Date.now() - startTime;
      
      // Parse Jest output for test results
      const testResults = this.parseJestOutput(output);
      
      this.results[suiteName] = {
        success: true,
        duration,
        ...testResults
      };

      console.log(`✅ ${suite.name} completed in ${duration}ms`);
      
      return this.results[suiteName];

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results[suiteName] = {
        success: false,
        duration,
        error: error.message,
        tests: 0,
        passed: 0,
        failed: 0
      };

      console.log(`❌ ${suite.name} failed after ${duration}ms`);
      
      if (!options.continueOnError) {
        throw error;
      }
      
      return this.results[suiteName];

    } finally {
      // Clean up temporary config
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
    }
  }

  async runAllTests(options = {}) {
    console.log('🚀 Starting comprehensive backend test suite...');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    const startTime = Date.now();
    const suiteNames = Object.keys(this.testSuites);
    
    if (options.parallel) {
      // Run test suites in parallel (except performance tests)
      const parallelSuites = suiteNames.filter(name => name !== 'performance');
      const performanceSuite = suiteNames.filter(name => name === 'performance');

      console.log(`\\n📦 Running ${parallelSuites.length} test suites in parallel...`);
      
      const parallelPromises = parallelSuites.map(suiteName => 
        this.runTestSuite(suiteName, { ...options, silent: true })
          .catch(error => ({ success: false, error: error.message }))
      );

      await Promise.all(parallelPromises);

      // Run performance tests separately
      if (performanceSuite.length > 0 && !options.skipPerformance) {
        console.log('\\n⚡ Running performance tests...');
        await this.runTestSuite('performance', options);
      }

    } else {
      // Run test suites sequentially
      for (const suiteName of suiteNames) {
        if (suiteName === 'performance' && options.skipPerformance) {
          console.log(`⏭️  Skipping ${this.testSuites[suiteName].name}`);
          continue;
        }

        await this.runTestSuite(suiteName, options);
      }
    }

    const totalDuration = Date.now() - startTime;
    
    this.generateReport(totalDuration);
    
    return this.results;
  }

  parseJestOutput(output) {
    // Basic Jest output parsing
    const lines = output.split('\\n');
    
    let tests = 0;
    let passed = 0;
    let failed = 0;
    let coverage = null;

    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\\d+) passed|failed|total/g);
        if (match) {
          tests = parseInt(match.find(m => m.includes('total'))?.replace(/\\D/g, '') || '0');
          passed = parseInt(match.find(m => m.includes('passed'))?.replace(/\\D/g, '') || '0');
          failed = parseInt(match.find(m => m.includes('failed'))?.replace(/\\D/g, '') || '0');
        }
      }
      
      if (line.includes('Coverage:') || line.includes('All files')) {
        const coverageMatch = line.match(/(\\d+\\.?\\d*)%/);
        if (coverageMatch) {
          coverage = parseFloat(coverageMatch[1]);
        }
      }
    }

    return { tests, passed, failed, coverage };
  }

  generateReport(totalDuration) {
    console.log('\\n📊 Test Results Summary');
    console.log('=' .repeat(50));

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let successfulSuites = 0;

    for (const [suiteName, result] of Object.entries(this.results)) {
      const suite = this.testSuites[suiteName];
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      
      console.log(`${status} ${suite.name}: ${result.tests || 0} tests (${duration})`);
      
      if (result.success) {
        successfulSuites++;
        totalTests += result.tests || 0;
        totalPassed += result.passed || 0;
        totalFailed += result.failed || 0;
      } else {
        console.log(`   Error: ${result.error}`);
      }

      if (result.coverage) {
        console.log(`   Coverage: ${result.coverage}%`);
      }
    }

    console.log('=' .repeat(50));
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Successful Suites: ${successfulSuites}/${Object.keys(this.testSuites).length}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${totalPassed}`);
    console.log(`Failed: ${totalFailed}`);
    
    if (totalTests > 0) {
      const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
      console.log(`Success Rate: ${successRate}%`);
    }

    // Generate detailed report file
    this.generateDetailedReport();
  }

  generateDetailedReport() {
    const reportPath = path.join(__dirname, 'test-results.json');
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      results: this.results,
      summary: this.calculateSummary()
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\\n📄 Detailed report saved to: ${reportPath}`);
  }

  calculateSummary() {
    const suites = Object.values(this.results);
    
    return {
      totalSuites: suites.length,
      successfulSuites: suites.filter(s => s.success).length,
      totalTests: suites.reduce((sum, s) => sum + (s.tests || 0), 0),
      totalPassed: suites.reduce((sum, s) => sum + (s.passed || 0), 0),
      totalFailed: suites.reduce((sum, s) => sum + (s.failed || 0), 0),
      totalDuration: suites.reduce((sum, s) => sum + s.duration, 0),
      averageCoverage: this.calculateAverageCoverage(suites)
    };
  }

  calculateAverageCoverage(suites) {
    const suitesWithCoverage = suites.filter(s => s.coverage != null);
    if (suitesWithCoverage.length === 0) return null;
    
    const totalCoverage = suitesWithCoverage.reduce((sum, s) => sum + s.coverage, 0);
    return (totalCoverage / suitesWithCoverage.length).toFixed(1);
  }
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    coverage: args.includes('--coverage'),
    verbose: args.includes('--verbose'),
    watch: args.includes('--watch'),
    parallel: args.includes('--parallel'),
    skipPerformance: args.includes('--skip-performance'),
    continueOnError: args.includes('--continue-on-error'),
    dryRun: args.includes('--dry-run')
  };

  const runner = new TestRunner();

  // Check if specific suite is requested
  const suiteArg = args.find(arg => !arg.startsWith('--'));
  
  if (suiteArg && runner.testSuites[suiteArg]) {
    runner.runTestSuite(suiteArg, options)
      .then(result => {
        process.exit(result.success ? 0 : 1);
      })
      .catch(error => {
        console.error('Test runner error:', error.message);
        process.exit(1);
      });
  } else {
    runner.runAllTests(options)
      .then(results => {
        const hasFailures = Object.values(results).some(r => !r.success);
        process.exit(hasFailures ? 1 : 0);
      })
      .catch(error => {
        console.error('Test runner error:', error.message);
        process.exit(1);
      });
  }
}

module.exports = TestRunner;