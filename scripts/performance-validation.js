#!/usr/bin/env node

/**
 * RCM Performance Validation Script
 * 
 * This script validates performance improvements by running benchmarks
 * against the refactored RCM module and comparing with baseline metrics.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  authToken: process.env.AUTH_TOKEN || '',
  iterations: parseInt(process.env.ITERATIONS) || 10,
  concurrency: parseInt(process.env.CONCURRENCY) || 5,
  timeout: parseInt(process.env.TIMEOUT) || 30000
};

// Performance targets
const PERFORMANCE_TARGETS = {
  dashboard: { target: 300, baseline: 450 },
  claims: { target: 250, baseline: 380 },
  payments: { target: 320, baseline: 520 },
  reports: { target: 750, baseline: 1200 }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

class PerformanceValidator {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async makeRequest(url, options = {}) {
    const startTime = Date.now();
    try {
      const response = await axios({
        url: `${CONFIG.baseUrl}${url}`,
        timeout: CONFIG.timeout,
        headers: {
          'Authorization': `Bearer ${CONFIG.authToken}`,
          'Content-Type': 'application/json'
        },
        ...options
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        responseTime,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: false,
        responseTime,
        error: error.message,
        status: error.response?.status || 0
      };
    }
  }

  async runBenchmark(name, url, options = {}) {
    this.log(`\n📊 Running benchmark: ${name}`, 'blue');
    this.log(`URL: ${url}`);
    this.log(`Iterations: ${CONFIG.iterations}`);
    
    const results = [];
    const errors = [];
    
    // Sequential requests for accurate timing
    for (let i = 0; i < CONFIG.iterations; i++) {
      process.stdout.write(`\rProgress: ${i + 1}/${CONFIG.iterations}`);
      
      const result = await this.makeRequest(url, options);
      results.push(result);
      
      if (!result.success) {
        errors.push(result);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(); // New line after progress
    
    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const responseTimes = successfulResults.map(r => r.responseTime);
    
    if (responseTimes.length === 0) {
      this.log(`❌ All requests failed for ${name}`, 'red');
      return null;
    }
    
    const stats = {
      name,
      url,
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      failedRequests: errors.length,
      successRate: (successfulResults.length / results.length) * 100,
      responseTimes: {
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50: this.percentile(responseTimes, 50),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99)
      },
      errors: errors.slice(0, 5) // Keep first 5 errors for analysis
    };
    
    this.results[name] = stats;
    this.displayBenchmarkResults(stats);
    
    return stats;
  }

  async runConcurrentBenchmark(name, url, options = {}) {
    this.log(`\n🚀 Running concurrent benchmark: ${name}`, 'blue');
    this.log(`URL: ${url}`);
    this.log(`Concurrent requests: ${CONFIG.concurrency}`);
    
    const startTime = Date.now();
    const promises = [];
    
    // Create concurrent requests
    for (let i = 0; i < CONFIG.concurrency; i++) {
      promises.push(this.makeRequest(url, options));
    }
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Calculate statistics
    const successfulResults = results.filter(r => r.success);
    const responseTimes = successfulResults.map(r => r.responseTime);
    const errors = results.filter(r => !r.success);
    
    const stats = {
      name: `${name} (Concurrent)`,
      url,
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      failedRequests: errors.length,
      successRate: (successfulResults.length / results.length) * 100,
      totalTime,
      throughput: (successfulResults.length / totalTime) * 1000, // requests per second
      responseTimes: responseTimes.length > 0 ? {
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes),
        avg: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p50: this.percentile(responseTimes, 50),
        p95: this.percentile(responseTimes, 95),
        p99: this.percentile(responseTimes, 99)
      } : null,
      errors: errors.slice(0, 3)
    };
    
    this.results[`${name}_concurrent`] = stats;
    this.displayConcurrentResults(stats);
    
    return stats;
  }

  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }

  displayBenchmarkResults(stats) {
    const target = PERFORMANCE_TARGETS[stats.name.toLowerCase()];
    const avgTime = Math.round(stats.responseTimes.avg);
    
    this.log(`\n📈 Results for ${stats.name}:`);
    this.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
    this.log(`  Response Times:`);
    this.log(`    Average: ${avgTime}ms`);
    this.log(`    Min: ${stats.responseTimes.min}ms`);
    this.log(`    Max: ${stats.responseTimes.max}ms`);
    this.log(`    P95: ${stats.responseTimes.p95}ms`);
    this.log(`    P99: ${stats.responseTimes.p99}ms`);
    
    if (target) {
      const improvement = ((target.baseline - avgTime) / target.baseline * 100).toFixed(1);
      const targetMet = avgTime <= target.target;
      
      this.log(`  Performance:`);
      this.log(`    Baseline: ${target.baseline}ms`);
      this.log(`    Target: ${target.target}ms`);
      this.log(`    Improvement: ${improvement}%`, improvement > 0 ? 'green' : 'red');
      this.log(`    Target Met: ${targetMet ? 'YES' : 'NO'}`, targetMet ? 'green' : 'red');
    }
    
    if (stats.failedRequests > 0) {
      this.log(`  ⚠️  Failed Requests: ${stats.failedRequests}`, 'yellow');
    }
  }

  displayConcurrentResults(stats) {
    this.log(`\n🚀 Concurrent Results for ${stats.name}:`);
    this.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
    this.log(`  Total Time: ${stats.totalTime}ms`);
    this.log(`  Throughput: ${stats.throughput.toFixed(2)} req/s`);
    
    if (stats.responseTimes) {
      this.log(`  Response Times:`);
      this.log(`    Average: ${Math.round(stats.responseTimes.avg)}ms`);
      this.log(`    P95: ${stats.responseTimes.p95}ms`);
      this.log(`    P99: ${stats.responseTimes.p99}ms`);
    }
    
    if (stats.failedRequests > 0) {
      this.log(`  ⚠️  Failed Requests: ${stats.failedRequests}`, 'yellow');
    }
  }

  async validateSystemHealth() {
    this.log('\n🏥 Validating System Health...', 'blue');
    
    const healthChecks = [
      { name: 'Application Health', url: '/api/v1/monitoring/health' },
      { name: 'Database Health', url: '/api/v1/monitoring/db-health' },
      { name: 'Redis Health', url: '/api/v1/monitoring/redis-health' }
    ];
    
    const results = {};
    
    for (const check of healthChecks) {
      const result = await this.makeRequest(check.url);
      results[check.name] = result;
      
      const status = result.success ? '✅' : '❌';
      const color = result.success ? 'green' : 'red';
      this.log(`  ${status} ${check.name}: ${result.success ? 'OK' : result.error}`, color);
    }
    
    return results;
  }

  async runPerformanceValidation() {
    this.log('🚀 Starting RCM Performance Validation', 'blue');
    this.log(`Base URL: ${CONFIG.baseUrl}`);
    this.log(`Iterations: ${CONFIG.iterations}`);
    this.log(`Concurrency: ${CONFIG.concurrency}`);
    
    // Validate system health first
    const healthResults = await this.validateSystemHealth();
    const allHealthy = Object.values(healthResults).every(r => r.success);
    
    if (!allHealthy) {
      this.log('\n❌ System health check failed. Aborting performance validation.', 'red');
      return false;
    }
    
    // Run performance benchmarks
    const benchmarks = [
      { name: 'dashboard', url: '/api/v1/rcm/dashboard' },
      { name: 'claims', url: '/api/v1/rcm/claims?page=1&limit=20' },
      { name: 'payments', url: '/api/v1/rcm/payments?page=1&limit=20' },
      { name: 'reports', url: '/api/v1/rcm/reports/revenue?period=month' }
    ];
    
    // Sequential benchmarks
    for (const benchmark of benchmarks) {
      await this.runBenchmark(benchmark.name, benchmark.url);
    }
    
    // Concurrent benchmarks for critical endpoints
    await this.runConcurrentBenchmark('dashboard', '/api/v1/rcm/dashboard');
    await this.runConcurrentBenchmark('claims', '/api/v1/rcm/claims?page=1&limit=20');
    
    // Generate summary report
    this.generateSummaryReport();
    
    return true;
  }

  generateSummaryReport() {
    this.log('\n📊 Performance Validation Summary', 'blue');
    this.log('=' .repeat(50));
    
    const sequentialResults = Object.values(this.results).filter(r => !r.name.includes('Concurrent'));
    let targetsMet = 0;
    let totalTargets = 0;
    
    sequentialResults.forEach(result => {
      const target = PERFORMANCE_TARGETS[result.name.toLowerCase()];
      if (target) {
        totalTargets++;
        const avgTime = Math.round(result.responseTimes.avg);
        const targetMet = avgTime <= target.target;
        const improvement = ((target.baseline - avgTime) / target.baseline * 100).toFixed(1);
        
        if (targetMet) targetsMet++;
        
        this.log(`\n${result.name.toUpperCase()}:`);
        this.log(`  Current: ${avgTime}ms | Target: ${target.target}ms | Baseline: ${target.baseline}ms`);
        this.log(`  Improvement: ${improvement}% | Target Met: ${targetMet ? 'YES' : 'NO'}`, 
                 targetMet ? 'green' : 'red');
      }
    });
    
    const overallSuccess = (targetsMet / totalTargets) * 100;
    this.log(`\n🎯 Overall Performance Score: ${overallSuccess.toFixed(1)}% (${targetsMet}/${totalTargets} targets met)`);
    
    if (overallSuccess >= 80) {
      this.log('✅ Performance validation PASSED', 'green');
    } else {
      this.log('❌ Performance validation FAILED', 'red');
    }
    
    // Save detailed results
    this.saveResults();
  }

  saveResults() {
    const reportData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      targets: PERFORMANCE_TARGETS,
      results: this.results,
      summary: this.generateSummaryData()
    };
    
    const reportPath = path.join(__dirname, '..', 'reports', `performance-validation-${Date.now()}.json`);
    
    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    this.log(`\n💾 Detailed results saved to: ${reportPath}`, 'blue');
  }

  generateSummaryData() {
    const sequentialResults = Object.values(this.results).filter(r => !r.name.includes('Concurrent'));
    
    return {
      totalEndpoints: sequentialResults.length,
      averageResponseTime: Math.round(
        sequentialResults.reduce((sum, r) => sum + r.responseTimes.avg, 0) / sequentialResults.length
      ),
      overallSuccessRate: (
        sequentialResults.reduce((sum, r) => sum + r.successRate, 0) / sequentialResults.length
      ).toFixed(1),
      targetsMet: sequentialResults.filter(r => {
        const target = PERFORMANCE_TARGETS[r.name.toLowerCase()];
        return target && r.responseTimes.avg <= target.target;
      }).length,
      totalTargets: sequentialResults.filter(r => 
        PERFORMANCE_TARGETS[r.name.toLowerCase()]
      ).length
    };
  }
}

// Main execution
async function main() {
  const validator = new PerformanceValidator();
  
  try {
    const success = await validator.runPerformanceValidation();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Performance validation failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PerformanceValidator;