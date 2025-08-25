/**
 * Monitoring System Setup Script
 * Initializes monitoring infrastructure and creates necessary database tables
 */

const fs = require('fs').promises;
const path = require('path');
const { dbUtils } = require('./utils/dbUtils');
const { performanceMonitor } = require('./utils/performanceMonitor');
const { errorTracker } = require('./utils/errorTracker');
const { auditLogger } = require('./utils/auditLogger');

class MonitoringSetup {
  constructor() {
    this.setupSteps = [
      'createDirectories',
      'createDatabaseTables',
      'insertDefaultConfig',
      'setupEventListeners',
      'validateSetup'
    ];
  }

  /**
   * Run complete monitoring setup
   */
  async setup() {
    console.log('🚀 Starting RCM Monitoring System Setup...');
    console.log('=' .repeat(50));

    try {
      for (const step of this.setupSteps) {
        console.log(`\\n📋 Executing: ${step}`);
        await this[step]();
        console.log(`✅ Completed: ${step}`);
      }

      console.log('\\n🎉 Monitoring System Setup Complete!');
      console.log('=' .repeat(50));
      
      await this.displaySetupSummary();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }

  /**
   * Create necessary directories
   */
  async createDirectories() {
    const directories = [
      'logs',
      'logs/audit',
      'logs/audit/archive',
      'logs/error',
      'logs/performance'
    ];

    for (const dir of directories) {
      const dirPath = path.join(__dirname, dir);
      try {
        await fs.mkdir(dirPath, { recursive: true });
        console.log(`  📁 Created directory: ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
        console.log(`  📁 Directory exists: ${dir}`);
      }
    }
  }

  /**
   * Create database tables for monitoring
   */
  async createDatabaseTables() {
    const schemaPath = path.join(__dirname, 'sql', 'monitoring_schema.sql');
    
    try {
      const schema = await fs.readFile(schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`  📊 Executing ${statements.length} database statements...`);

      for (const statement of statements) {
        try {
          await dbUtils.executeQuery(statement);
        } catch (error) {
          // Log but don't fail on duplicate table errors
          if (!error.message.includes('already exists')) {
            console.warn(`  ⚠️  Warning: ${error.message}`);
          }
        }
      }

      console.log('  📊 Database tables created successfully');
      
    } catch (error) {
      console.error('  ❌ Failed to create database tables:', error.message);
      throw error;
    }
  }

  /**
   * Insert default monitoring configuration
   */
  async insertDefaultConfig() {
    const defaultConfigs = [
      {
        key: 'performance_thresholds',
        value: {
          responseTime: { good: 100, warning: 500, critical: 2000 },
          errorRate: { good: 1, warning: 3, critical: 5 },
          memoryUsage: { good: 60, warning: 80, critical: 90 }
        },
        description: 'Performance monitoring thresholds'
      },
      {
        key: 'alert_settings',
        value: {
          enabled: true,
          channels: ['console', 'database'],
          cooldownPeriod: 300000
        },
        description: 'Alert system configuration'
      },
      {
        key: 'retention_policy',
        value: {
          detailed: 7,
          summary: 30,
          archived: 365
        },
        description: 'Data retention policy in days'
      },
      {
        key: 'health_check_intervals',
        value: {
          database: 30000,
          memory: 60000,
          disk: 300000,
          api: 30000
        },
        description: 'Health check intervals in milliseconds'
      }
    ];

    for (const config of defaultConfigs) {
      try {
        const query = `
          INSERT INTO monitoring_config (config_key, config_value, description)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            config_value = VALUES(config_value),
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await dbUtils.executeQuery(query, [
          config.key,
          JSON.stringify(config.value),
          config.description
        ]);
        
        console.log(`  ⚙️  Configured: ${config.key}`);
        
      } catch (error) {
        console.warn(`  ⚠️  Warning: Failed to insert config ${config.key}:`, error.message);
      }
    }
  }

  /**
   * Setup event listeners for monitoring components
   */
  async setupEventListeners() {
    // Performance monitor event listeners
    performanceMonitor.on('operationEnd', (metrics) => {
      if (metrics.executionTime > 2000) {
        console.log(`⚡ Slow operation detected: ${metrics.type} took ${metrics.executionTime}ms`);
      }
    });

    performanceMonitor.on('systemMetrics', (metrics) => {
      if (metrics.errorRate > 5) {
        console.warn(`⚠️  High error rate detected: ${metrics.errorRate.toFixed(2)}%`);
      }
    });

    performanceMonitor.on('alerts', (alerts) => {
      alerts.forEach(alert => {
        console.warn(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
      });
    });

    // Error tracker event listeners
    errorTracker.on('errorTracked', (errorInfo) => {
      if (errorInfo.severity === 'CRITICAL') {
        console.error(`🔥 CRITICAL ERROR: ${errorInfo.message} in ${errorInfo.component}`);
      }
    });

    errorTracker.on('alert', (alert) => {
      console.error(`🚨 ERROR ALERT [${alert.level.toUpperCase()}]: ${alert.message}`);
    });

    errorTracker.on('errorPattern', (pattern) => {
      console.warn(`🔄 Error pattern detected: ${pattern.pattern} (${pattern.count} occurrences)`);
    });

    console.log('  🎧 Event listeners configured');
  }

  /**
   * Validate monitoring setup
   */
  async validateSetup() {
    const validations = [
      this.validateDatabaseTables(),
      this.validateDirectories(),
      this.validateConfiguration(),
      this.validateComponents()
    ];

    const results = await Promise.allSettled(validations);
    
    let allValid = true;
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`  ❌ Validation ${index + 1} failed:`, result.reason);
        allValid = false;
      } else {
        console.log(`  ✅ Validation ${index + 1} passed`);
      }
    });

    if (!allValid) {
      throw new Error('Setup validation failed');
    }
  }

  /**
   * Validate database tables exist
   */
  async validateDatabaseTables() {
    const requiredTables = [
      'audit_logs',
      'error_logs',
      'error_alerts',
      'performance_metrics',
      'health_checks',
      'monitoring_config'
    ];

    for (const table of requiredTables) {
      const result = await dbUtils.executeQuery(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = ?',
        [table]
      );
      
      if (result[0].count === 0) {
        throw new Error(`Required table '${table}' not found`);
      }
    }
  }

  /**
   * Validate directories exist
   */
  async validateDirectories() {
    const requiredDirs = [
      'logs',
      'logs/audit',
      'logs/error'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, dir);
      try {
        await fs.access(dirPath);
      } catch (error) {
        throw new Error(`Required directory '${dir}' not accessible`);
      }
    }
  }

  /**
   * Validate configuration
   */
  async validateConfiguration() {
    const requiredConfigs = [
      'performance_thresholds',
      'alert_settings',
      'retention_policy'
    ];

    for (const configKey of requiredConfigs) {
      const result = await dbUtils.executeQuery(
        'SELECT config_value FROM monitoring_config WHERE config_key = ?',
        [configKey]
      );
      
      if (result.length === 0) {
        throw new Error(`Required configuration '${configKey}' not found`);
      }
      
      try {
        JSON.parse(result[0].config_value);
      } catch (error) {
        throw new Error(`Invalid JSON in configuration '${configKey}'`);
      }
    }
  }

  /**
   * Validate monitoring components
   */
  async validateComponents() {
    // Test performance monitor
    const testOpId = performanceMonitor.startOperation('test', 'validation', {});
    performanceMonitor.endOperation(testOpId, { success: true });

    // Test error tracker
    const testError = new Error('Test error for validation');
    await errorTracker.trackError(testError, { component: 'ValidationTest' });

    // Test audit logger
    await auditLogger.logSystemEvent('MONITORING_VALIDATION', {
      component: 'MonitoringSetup',
      message: 'Validation test completed'
    });
  }

  /**
   * Display setup summary
   */
  async displaySetupSummary() {
    console.log('\\n📊 Setup Summary:');
    console.log('-' .repeat(30));

    // Database tables
    const tableCount = await dbUtils.executeQuery(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_name IN ('audit_logs', 'error_logs', 'error_alerts', 'performance_metrics', 'health_checks', 'monitoring_config')`
    );
    console.log(`📋 Database Tables: ${tableCount[0].count}/6 created`);

    // Configuration entries
    const configCount = await dbUtils.executeQuery(
      'SELECT COUNT(*) as count FROM monitoring_config'
    );
    console.log(`⚙️  Configuration Entries: ${configCount[0].count} loaded`);

    // Log directories
    const logDirs = ['logs', 'logs/audit', 'logs/error'];
    let dirCount = 0;
    for (const dir of logDirs) {
      try {
        await fs.access(path.join(__dirname, dir));
        dirCount++;
      } catch (error) {
        // Directory doesn't exist
      }
    }
    console.log(`📁 Log Directories: ${dirCount}/${logDirs.length} created`);

    // System info
    const systemMetrics = performanceMonitor.getSystemMetrics();
    console.log(`💻 System Status: ${systemMetrics.status}`);
    console.log(`🎯 Health Score: ${systemMetrics.healthScore}/100`);

    console.log('\\n🔗 Monitoring Endpoints:');
    console.log('  GET  /api/v1/monitoring/dashboard  - Main dashboard');
    console.log('  GET  /api/v1/monitoring/health     - Health check');
    console.log('  GET  /api/v1/monitoring/metrics    - Performance metrics');
    console.log('  GET  /api/v1/monitoring/errors     - Error statistics');

    console.log('\\n📝 Next Steps:');
    console.log('  1. Start your application server');
    console.log('  2. Access monitoring dashboard');
    console.log('  3. Configure alert thresholds as needed');
    console.log('  4. Set up automated cleanup jobs');
  }

  /**
   * Test monitoring system
   */
  async test() {
    console.log('🧪 Testing Monitoring System...');
    console.log('=' .repeat(40));

    try {
      // Test performance monitoring
      console.log('\\n⚡ Testing Performance Monitoring...');
      const opId = performanceMonitor.startOperation('test_operation', 'test', {
        testData: 'performance test'
      });
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = performanceMonitor.endOperation(opId, { success: true });
      console.log(`  ✅ Operation tracked: ${metrics.executionTime}ms`);

      // Test error tracking
      console.log('\\n🔥 Testing Error Tracking...');
      const testError = new Error('Test error for monitoring validation');
      const errorId = await errorTracker.trackError(testError, {
        component: 'MonitoringTest',
        operation: 'testErrorTracking',
        severity: 'LOW'
      });
      console.log(`  ✅ Error tracked: ${errorId}`);

      // Test audit logging
      console.log('\\n📋 Testing Audit Logging...');
      const auditId = await auditLogger.logSystemEvent('MONITORING_TEST', {
        component: 'MonitoringSetup',
        message: 'Test audit log entry',
        testData: { timestamp: new Date().toISOString() }
      });
      console.log(`  ✅ Audit logged: ${auditId}`);

      // Test database queries
      console.log('\\n📊 Testing Database Queries...');
      const recentErrors = await dbUtils.executeQuery(
        'SELECT COUNT(*) as count FROM error_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
      );
      console.log(`  ✅ Recent errors query: ${recentErrors[0].count} errors found`);

      const recentAudits = await dbUtils.executeQuery(
        'SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)'
      );
      console.log(`  ✅ Recent audits query: ${recentAudits[0].count} audits found`);

      console.log('\\n🎉 All tests passed! Monitoring system is working correctly.');

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const setup = new MonitoringSetup();

  if (args.includes('--test')) {
    setup.test()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    setup.setup()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = MonitoringSetup;