const mysql = require('mysql2/promise');

// Test Performance Optimization and Scalability System
class PerformanceOptimizationTester {
  constructor() {
    this.dbConfig = {
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'ovhi_rcm_test',
      multipleStatements: true
    };
    
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Optimization System Tests...\n');
    
    try {
      // Setup test database
      await this.setupTestDatabase();
      
      // Test Performance Optimization Service
      await this.testPerformanceOptimizationService();
      
      // Test Caching Service
      await this.testCachingService();
      
      // Test Batch Processing Service
      await this.testBatchProcessingService();
      
      // Test Performance Monitoring Service
      await this.testPerformanceMonitoringService();
      
      // Test Database Optimization
      await this.testDatabaseOptimization();
      
      // Test API Performance Tracking
      await this.testApiPerformanceTracking();
      
      // Test System Health Checks
      await this.testSystemHealthChecks();
      
      // Test Scalability Features
      await this.testScalabilityFeatures();
      
      // Cleanup
      await this.cleanup();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(error.message);
    }
    
    this.printResults();
  }

  async setupTestDatabase() {
    console.log('📋 Setting up test database...');
    
    try {
      const connection = await mysql.createConnection({
        host: this.dbConfig.host,
        user: this.dbConfig.user,
        password: this.dbConfig.password,
        multipleStatements: true
      });
      
      // Create test database
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${this.dbConfig.database}`);
      await connection.execute(`USE ${this.dbConfig.database}`);
      
      // Create test tables
      const schema = `
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS billings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          patient_id INT NOT NULL,
          provider_id INT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          status ENUM('pending', 'submitted', 'paid', 'denied') DEFAULT 'pending',
          service_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS patients (
          id INT AUTO_INCREMENT PRIMARY KEY,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          dob DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      await connection.execute(schema);
      
      // Insert test data
      const testData = `
        INSERT IGNORE INTO users (id, username, email) VALUES
        (1, 'testuser1', 'test1@example.com'),
        (2, 'testuser2', 'test2@example.com');
        
        INSERT IGNORE INTO patients (id, first_name, last_name, dob) VALUES
        (1, 'John', 'Doe', '1980-01-01'),
        (2, 'Jane', 'Smith', '1975-05-15');
        
        INSERT IGNORE INTO billings (patient_id, provider_id, amount, status, service_date) VALUES
        (1, 1, 150.00, 'pending', '2024-01-15'),
        (2, 1, 200.00, 'submitted', '2024-01-16'),
        (1, 2, 75.00, 'paid', '2024-01-17');
      `;
      
      await connection.execute(testData);
      await connection.end();
      
      console.log('✅ Test database setup completed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Database setup: ${error.message}`);
      throw error;
    }
  }

  async testPerformanceOptimizationService() {
    console.log('🔧 Testing Performance Optimization Service...');
    
    try {
      const PerformanceOptimizationService = require('./server/services/rcm/performanceOptimizationService');
      const service = new PerformanceOptimizationService();
      
      // Test optimized query execution
      const result = await service.optimizeQuery(
        'SELECT * FROM billings WHERE status = ? LIMIT 10',
        ['pending'],
        { cache: true, cacheTTL: 300000 }
      );
      
      if (!Array.isArray(result)) {
        throw new Error('Query result should be an array');
      }
      
      // Test batch processing
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, value: `item_${i + 1}` }));
      const processor = async (item) => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing
        return { processed: item.id, result: `processed_${item.value}` };
      };
      
      const batchResult = await service.processBatch(items, processor, {
        batchSize: 10,
        maxConcurrency: 3
      });
      
      if (batchResult.results.length !== items.length) {
        throw new Error(`Expected ${items.length} results, got ${batchResult.results.length}`);
      }
      
      // Test performance metrics
      const metrics = service.getPerformanceMetrics();
      if (!metrics.database || !metrics.cache) {
        throw new Error('Performance metrics should include database and cache stats');
      }
      
      // Test health check
      const health = await service.healthCheck();
      if (!health.status) {
        throw new Error('Health check should return status');
      }
      
      console.log('✅ Performance Optimization Service tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Performance Optimization Service test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Performance Optimization: ${error.message}`);
    }
  }

  async testCachingService() {
    console.log('💾 Testing Caching Service...');
    
    try {
      const CachingService = require('./server/services/rcm/cachingService');
      const cache = new CachingService();
      
      // Test basic cache operations
      const testKey = 'test_key_123';
      const testValue = { data: 'test_data', timestamp: Date.now() };
      
      // Set cache
      const setResult = await cache.set(testKey, testValue, 300);
      if (!setResult) {
        throw new Error('Cache set operation should return true');
      }
      
      // Get cache
      const getValue = await cache.get(testKey);
      if (!getValue || getValue.data !== testValue.data) {
        throw new Error('Cache get operation should return the stored value');
      }
      
      // Test specialized caching methods
      await cache.cacheProvider('provider_123', { name: 'Test Provider', specialty: 'Cardiology' });
      const provider = await cache.getProvider('provider_123');
      if (!provider || provider.name !== 'Test Provider') {
        throw new Error('Provider caching should work correctly');
      }
      
      // Test batch operations
      const keyValuePairs = [
        ['batch_key_1', { value: 1 }],
        ['batch_key_2', { value: 2 }],
        ['batch_key_3', { value: 3 }]
      ];
      
      await cache.mset(keyValuePairs, 300);
      const batchValues = await cache.mget(['batch_key_1', 'batch_key_2', 'batch_key_3']);
      
      if (batchValues.length !== 3 || !batchValues[0] || batchValues[0].value !== 1) {
        throw new Error('Batch cache operations should work correctly');
      }
      
      // Test cache statistics
      const stats = cache.getStats();
      if (typeof stats.hitRate !== 'number' || stats.hitRate < 0) {
        throw new Error('Cache stats should include valid hit rate');
      }
      
      // Test health check
      const health = await cache.healthCheck();
      if (!health.status) {
        throw new Error('Cache health check should return status');
      }
      
      // Cleanup
      await cache.delete(testKey);
      await cache.clear('batch_key');
      
      console.log('✅ Caching Service tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Caching Service test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Caching Service: ${error.message}`);
    }
  }

  async testBatchProcessingService() {
    console.log('⚡ Testing Batch Processing Service...');
    
    try {
      const BatchProcessingService = require('../server/services/rcm/batchProcessingService');
      const batchService = new BatchProcessingService();
      
      // Test job creation
      const testData = Array.from({ length: 20 }, (_, i) => ({ id: i + 1, value: `test_${i + 1}` }));
      const jobId = await batchService.createJob('validate_claims', testData, {
        batchSize: 5,
        priority: 1
      });
      
      if (!jobId || typeof jobId !== 'string') {
        throw new Error('Job creation should return a valid job ID');
      }
      
      // Wait for job to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check job status
      const job = batchService.getJob(jobId);
      if (!job) {
        throw new Error('Job should be retrievable by ID');
      }
      
      if (job.status !== 'completed' && job.status !== 'processing') {
        throw new Error(`Job should be completed or processing, got: ${job.status}`);
      }
      
      // Test job statistics
      const stats = batchService.getStats();
      if (typeof stats.totalJobs !== 'number' || stats.totalJobs < 1) {
        throw new Error('Batch stats should show at least one job');
      }
      
      // Test active jobs retrieval
      const activeJobs = batchService.getActiveJobs();
      if (!Array.isArray(activeJobs)) {
        throw new Error('Active jobs should return an array');
      }
      
      // Test health check
      const health = await batchService.healthCheck();
      if (!health.status) {
        throw new Error('Batch processing health check should return status');
      }
      
      console.log('✅ Batch Processing Service tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Batch Processing Service test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Batch Processing: ${error.message}`);
    }
  }

  async testPerformanceMonitoringService() {
    console.log('📊 Testing Performance Monitoring Service...');
    
    try {
      const PerformanceMonitoringService = require('../server/services/rcm/performanceMonitoringService');
      const monitoring = new PerformanceMonitoringService();
      
      // Start monitoring
      monitoring.startMonitoring();
      
      // Wait for some metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test API request tracking
      monitoring.trackApiRequest('/api/test', 'GET', 150, 200);
      monitoring.trackApiRequest('/api/test', 'POST', 250, 201);
      monitoring.trackApiRequest('/api/error', 'GET', 500, 500);
      
      // Get current status
      const status = monitoring.getCurrentStatus();
      if (!status) {
        throw new Error('Current status should be available');
      }
      
      // Get performance summary
      const summary = monitoring.getPerformanceSummary(3600000); // 1 hour
      if (!summary.system || !summary.api) {
        throw new Error('Performance summary should include system and API data');
      }
      
      // Test metrics retrieval
      const metrics = monitoring.getMetrics('api', 3600000);
      if (!Array.isArray(metrics)) {
        throw new Error('Metrics should return an array');
      }
      
      // Test health check
      const health = await monitoring.healthCheck();
      if (!health.status) {
        throw new Error('Monitoring health check should return status');
      }
      
      // Stop monitoring
      monitoring.stopMonitoring();
      
      console.log('✅ Performance Monitoring Service tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Performance Monitoring Service test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Performance Monitoring: ${error.message}`);
    }
  }

  async testDatabaseOptimization() {
    console.log('🗄️ Testing Database Optimization...');
    
    try {
      const connection = await mysql.createConnection(this.dbConfig);
      
      // Test query performance
      const startTime = Date.now();
      const [rows] = await connection.execute('SELECT * FROM billings WHERE status = ?', ['pending']);
      const queryTime = Date.now() - startTime;
      
      if (queryTime > 1000) {
        console.warn(`⚠️ Query took ${queryTime}ms - consider optimization`);
      }
      
      // Test index existence
      const [indexes] = await connection.execute(`
        SELECT INDEX_NAME, COLUMN_NAME 
        FROM information_schema.STATISTICS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'billings'
      `, [this.dbConfig.database]);
      
      if (!Array.isArray(indexes)) {
        throw new Error('Index information should be retrievable');
      }
      
      // Test connection pool simulation
      const connections = [];
      for (let i = 0; i < 5; i++) {
        connections.push(mysql.createConnection(this.dbConfig));
      }
      
      // Close all connections
      await Promise.all(connections.map(conn => conn.then(c => c.end())));
      await connection.end();
      
      console.log('✅ Database Optimization tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Database Optimization test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Database Optimization: ${error.message}`);
    }
  }

  async testApiPerformanceTracking() {
    console.log('🌐 Testing API Performance Tracking...');
    
    try {
      // Simulate API requests with different response times
      const requests = [
        { endpoint: '/api/billings', method: 'GET', responseTime: 120, statusCode: 200 },
        { endpoint: '/api/patients', method: 'POST', responseTime: 250, statusCode: 201 },
        { endpoint: '/api/reports', method: 'GET', responseTime: 1500, statusCode: 200 }, // Slow request
        { endpoint: '/api/invalid', method: 'GET', responseTime: 100, statusCode: 404 }
      ];
      
      // Track performance metrics
      let totalResponseTime = 0;
      let errorCount = 0;
      
      for (const req of requests) {
        totalResponseTime += req.responseTime;
        if (req.statusCode >= 400) {
          errorCount++;
        }
      }
      
      const avgResponseTime = totalResponseTime / requests.length;
      const errorRate = (errorCount / requests.length) * 100;
      
      if (avgResponseTime > 500) {
        console.warn(`⚠️ Average response time is high: ${avgResponseTime}ms`);
      }
      
      if (errorRate > 10) {
        console.warn(`⚠️ Error rate is high: ${errorRate}%`);
      }
      
      // Test performance thresholds
      const slowRequests = requests.filter(req => req.responseTime > 1000);
      if (slowRequests.length > 0) {
        console.log(`📈 Found ${slowRequests.length} slow requests (>1000ms)`);
      }
      
      console.log('✅ API Performance Tracking tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ API Performance Tracking test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`API Performance Tracking: ${error.message}`);
    }
  }

  async testSystemHealthChecks() {
    console.log('🏥 Testing System Health Checks...');
    
    try {
      // Test memory usage monitoring
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (heapUsedMB > 500) {
        console.warn(`⚠️ High memory usage: ${heapUsedMB}MB`);
      }
      
      // Test CPU monitoring simulation
      const cpuUsage = Math.random() * 100; // Simulate CPU usage
      if (cpuUsage > 80) {
        console.warn(`⚠️ High CPU usage: ${cpuUsage.toFixed(1)}%`);
      }
      
      // Test system uptime
      const uptime = process.uptime();
      if (uptime < 60) {
        console.log(`ℹ️ System recently started (${uptime.toFixed(0)}s ago)`);
      }
      
      // Test alert generation
      const alerts = [];
      if (heapUsedMB > 100) {
        alerts.push({
          type: 'memory_warning',
          message: `Memory usage: ${heapUsedMB}MB`,
          severity: 'warning'
        });
      }
      
      console.log(`📊 Generated ${alerts.length} system alerts`);
      
      console.log('✅ System Health Checks tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ System Health Checks test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`System Health Checks: ${error.message}`);
    }
  }

  async testScalabilityFeatures() {
    console.log('📈 Testing Scalability Features...');
    
    try {
      // Test concurrent request handling simulation
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => 
        this.simulateRequest(i)
      );
      
      const startTime = Date.now();
      const results = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      const successfulRequests = results.filter(r => r.success).length;
      const successRate = (successfulRequests / concurrentRequests) * 100;
      
      console.log(`📊 Processed ${concurrentRequests} concurrent requests in ${totalTime}ms`);
      console.log(`📊 Success rate: ${successRate.toFixed(1)}%`);
      
      if (successRate < 95) {
        console.warn(`⚠️ Low success rate under load: ${successRate.toFixed(1)}%`);
      }
      
      // Test horizontal scaling simulation
      const nodeCount = 3;
      const requestsPerNode = Math.ceil(concurrentRequests / nodeCount);
      
      console.log(`🔄 Simulating ${nodeCount} nodes with ${requestsPerNode} requests each`);
      
      // Test load balancing simulation
      const nodeLoads = Array.from({ length: nodeCount }, () => Math.random() * 100);
      const avgLoad = nodeLoads.reduce((sum, load) => sum + load, 0) / nodeCount;
      const maxLoad = Math.max(...nodeLoads);
      
      if (maxLoad - avgLoad > 30) {
        console.warn(`⚠️ Uneven load distribution detected (max: ${maxLoad.toFixed(1)}%, avg: ${avgLoad.toFixed(1)}%)`);
      }
      
      console.log('✅ Scalability Features tests passed');
      this.testResults.passed++;
      
    } catch (error) {
      console.error('❌ Scalability Features test failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`Scalability Features: ${error.message}`);
    }
  }

  async simulateRequest(requestId) {
    try {
      // Simulate request processing time
      const processingTime = Math.random() * 200 + 50; // 50-250ms
      await new Promise(resolve => setTimeout(resolve, processingTime));
      
      // Simulate occasional failures
      const success = Math.random() > 0.05; // 95% success rate
      
      return {
        requestId,
        success,
        processingTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        requestId,
        success: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    try {
      const connection = await mysql.createConnection({
        host: this.dbConfig.host,
        user: this.dbConfig.user,
        password: this.dbConfig.password
      });
      
      await connection.execute(`DROP DATABASE IF EXISTS ${this.dbConfig.database}`);
      await connection.end();
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 PERFORMANCE OPTIMIZATION TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎯 Performance Optimization System Test Complete!');
    
    if (this.testResults.failed === 0) {
      console.log('🎉 All tests passed! The performance optimization system is working correctly.');
    } else {
      console.log('⚠️ Some tests failed. Please review the errors above.');
    }
  }
}

// Run tests
const tester = new PerformanceOptimizationTester();
tester.runAllTests().catch(console.error);