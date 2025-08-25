/**
 * Performance Monitoring Utility for RCM Operations
 * Tracks execution time, memory usage, and system metrics
 */

const os = require('os');
const { EventEmitter } = require('events');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.activeOperations = new Map();
    this.systemMetrics = {
      startTime: Date.now(),
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      peakMemoryUsage: 0
    };
    
    // Start system monitoring
    this.startSystemMonitoring();
  }

  /**
   * Start monitoring an operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {string} operationType - Type of operation (query, transaction, api_call, etc.)
   * @param {Object} metadata - Additional metadata about the operation
   */
  startOperation(operationId, operationType, metadata = {}) {
    const startTime = process.hrtime.bigint();
    const memoryUsage = process.memoryUsage();
    
    this.activeOperations.set(operationId, {
      id: operationId,
      type: operationType,
      startTime,
      startMemory: memoryUsage,
      metadata,
      timestamp: new Date().toISOString()
    });

    this.emit('operationStart', {
      operationId,
      operationType,
      metadata,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * End monitoring an operation and record metrics
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} result - Operation result metadata
   */
  endOperation(operationId, result = {}) {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      console.warn(`Performance Monitor: Operation ${operationId} not found`);
      return null;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const executionTime = Number(endTime - operation.startTime) / 1000000; // Convert to milliseconds
    
    const metrics = {
      operationId,
      type: operation.type,
      executionTime,
      memoryDelta: {
        heapUsed: endMemory.heapUsed - operation.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - operation.startMemory.heapTotal,
        external: endMemory.external - operation.startMemory.external
      },
      timestamp: operation.timestamp,
      endTimestamp: new Date().toISOString(),
      metadata: operation.metadata,
      result
    };

    // Store metrics
    this.recordMetrics(metrics);
    
    // Clean up active operation
    this.activeOperations.delete(operationId);

    this.emit('operationEnd', metrics);
    
    return metrics;
  }

  /**
   * Record metrics for analysis
   * @param {Object} metrics - Operation metrics
   */
  recordMetrics(metrics) {
    const key = `${metrics.type}_${new Date().toISOString().split('T')[0]}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        type: metrics.type,
        date: key.split('_')[1],
        operations: [],
        summary: {
          count: 0,
          totalTime: 0,
          averageTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errors: 0,
          memoryPeak: 0
        }
      });
    }

    const dayMetrics = this.metrics.get(key);
    dayMetrics.operations.push(metrics);
    
    // Update summary
    const summary = dayMetrics.summary;
    summary.count++;
    summary.totalTime += metrics.executionTime;
    summary.averageTime = summary.totalTime / summary.count;
    summary.minTime = Math.min(summary.minTime, metrics.executionTime);
    summary.maxTime = Math.max(summary.maxTime, metrics.executionTime);
    
    if (metrics.result && metrics.result.error) {
      summary.errors++;
    }
    
    const memoryUsed = Math.abs(metrics.memoryDelta.heapUsed);
    summary.memoryPeak = Math.max(summary.memoryPeak, memoryUsed);

    // Update system metrics
    this.updateSystemMetrics(metrics);
  }

  /**
   * Update overall system metrics
   * @param {Object} metrics - Operation metrics
   */
  updateSystemMetrics(metrics) {
    this.systemMetrics.totalRequests++;
    
    if (metrics.result && metrics.result.error) {
      this.systemMetrics.totalErrors++;
    }

    // Update average response time (rolling average)
    const currentAvg = this.systemMetrics.averageResponseTime;
    const newAvg = (currentAvg * (this.systemMetrics.totalRequests - 1) + metrics.executionTime) / this.systemMetrics.totalRequests;
    this.systemMetrics.averageResponseTime = newAvg;

    // Update peak memory usage
    const currentMemory = process.memoryUsage().heapUsed;
    this.systemMetrics.peakMemoryUsage = Math.max(this.systemMetrics.peakMemoryUsage, currentMemory);
  }

  /**
   * Get performance metrics for a specific operation type
   * @param {string} operationType - Type of operation
   * @param {number} days - Number of days to look back (default: 7)
   */
  getMetrics(operationType, days = 7) {
    const results = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const key = `${operationType}_${dateKey}`;
      
      if (this.metrics.has(key)) {
        results.push(this.metrics.get(key));
      }
    }
    
    return results;
  }

  /**
   * Get system-wide performance summary
   */
  getSystemMetrics() {
    const uptime = Date.now() - this.systemMetrics.startTime;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      ...this.systemMetrics,
      uptime,
      currentMemory: memoryUsage,
      cpuUsage,
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length
      },
      activeOperations: this.activeOperations.size,
      errorRate: this.systemMetrics.totalRequests > 0 
        ? (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests) * 100 
        : 0
    };
  }

  /**
   * Get slow operations (above threshold)
   * @param {number} threshold - Threshold in milliseconds (default: 1000)
   * @param {number} limit - Maximum number of results (default: 10)
   */
  getSlowOperations(threshold = 1000, limit = 10) {
    const slowOps = [];
    
    for (const dayMetrics of this.metrics.values()) {
      for (const operation of dayMetrics.operations) {
        if (operation.executionTime > threshold) {
          slowOps.push(operation);
        }
      }
    }
    
    // Sort by execution time (descending) and limit results
    return slowOps
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  /**
   * Get operations with high memory usage
   * @param {number} threshold - Memory threshold in bytes (default: 50MB)
   * @param {number} limit - Maximum number of results (default: 10)
   */
  getHighMemoryOperations(threshold = 50 * 1024 * 1024, limit = 10) {
    const highMemoryOps = [];
    
    for (const dayMetrics of this.metrics.values()) {
      for (const operation of dayMetrics.operations) {
        const memoryUsed = Math.abs(operation.memoryDelta.heapUsed);
        if (memoryUsed > threshold) {
          highMemoryOps.push({
            ...operation,
            memoryUsed
          });
        }
      }
    }
    
    return highMemoryOps
      .sort((a, b) => b.memoryUsed - a.memoryUsed)
      .slice(0, limit);
  }

  /**
   * Start system monitoring interval
   */
  startSystemMonitoring() {
    // Monitor system metrics every 30 seconds
    setInterval(() => {
      const metrics = this.getSystemMetrics();
      this.emit('systemMetrics', metrics);
      
      // Check for alerts
      this.checkAlerts(metrics);
    }, 30000);
  }

  /**
   * Check for performance alerts
   * @param {Object} metrics - Current system metrics
   */
  checkAlerts(metrics) {
    const alerts = [];
    
    // High error rate alert
    if (metrics.errorRate > 5) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'warning',
        message: `Error rate is ${metrics.errorRate.toFixed(2)}%`,
        threshold: 5,
        current: metrics.errorRate
      });
    }
    
    // High memory usage alert
    const memoryUsagePercent = (metrics.currentMemory.heapUsed / metrics.systemInfo.totalMemory) * 100;
    if (memoryUsagePercent > 80) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'critical',
        message: `Memory usage is ${memoryUsagePercent.toFixed(2)}%`,
        threshold: 80,
        current: memoryUsagePercent
      });
    }
    
    // Slow average response time alert
    if (metrics.averageResponseTime > 2000) {
      alerts.push({
        type: 'SLOW_RESPONSE_TIME',
        severity: 'warning',
        message: `Average response time is ${metrics.averageResponseTime.toFixed(2)}ms`,
        threshold: 2000,
        current: metrics.averageResponseTime
      });
    }
    
    // High CPU load alert
    const avgLoad = metrics.systemInfo.loadAverage[0];
    const cpuThreshold = metrics.systemInfo.cpuCount * 0.8;
    if (avgLoad > cpuThreshold) {
      alerts.push({
        type: 'HIGH_CPU_LOAD',
        severity: 'warning',
        message: `CPU load average is ${avgLoad.toFixed(2)}`,
        threshold: cpuThreshold,
        current: avgLoad
      });
    }
    
    if (alerts.length > 0) {
      this.emit('alerts', alerts);
    }
  }

  /**
   * Generate performance report
   * @param {string} operationType - Optional operation type filter
   * @param {number} days - Number of days to include (default: 7)
   */
  generateReport(operationType = null, days = 7) {
    const report = {
      generatedAt: new Date().toISOString(),
      period: `${days} days`,
      systemMetrics: this.getSystemMetrics(),
      operationMetrics: {},
      slowOperations: this.getSlowOperations(),
      highMemoryOperations: this.getHighMemoryOperations(),
      recommendations: []
    };
    
    // Get metrics for specific operation type or all types
    if (operationType) {
      report.operationMetrics[operationType] = this.getMetrics(operationType, days);
    } else {
      const operationTypes = new Set();
      for (const key of this.metrics.keys()) {
        const type = key.split('_')[0];
        operationTypes.add(type);
      }
      
      for (const type of operationTypes) {
        report.operationMetrics[type] = this.getMetrics(type, days);
      }
    }
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);
    
    return report;
  }

  /**
   * Generate performance recommendations based on metrics
   * @param {Object} report - Performance report data
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    // Check for slow operations
    if (report.slowOperations.length > 0) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'high',
        title: 'Optimize Slow Operations',
        description: `Found ${report.slowOperations.length} operations taking longer than 1 second`,
        actions: [
          'Review database queries for optimization opportunities',
          'Add database indexes for frequently queried columns',
          'Consider caching for repeated operations',
          'Implement pagination for large result sets'
        ]
      });
    }
    
    // Check for high memory operations
    if (report.highMemoryOperations.length > 0) {
      recommendations.push({
        type: 'MEMORY',
        priority: 'medium',
        title: 'Optimize Memory Usage',
        description: `Found ${report.highMemoryOperations.length} operations using excessive memory`,
        actions: [
          'Implement streaming for large data processing',
          'Add memory cleanup after operations',
          'Consider breaking large operations into smaller chunks',
          'Review object creation and disposal patterns'
        ]
      });
    }
    
    // Check error rate
    if (report.systemMetrics.errorRate > 2) {
      recommendations.push({
        type: 'RELIABILITY',
        priority: 'high',
        title: 'Reduce Error Rate',
        description: `Current error rate is ${report.systemMetrics.errorRate.toFixed(2)}%`,
        actions: [
          'Review error logs for common failure patterns',
          'Implement better input validation',
          'Add retry mechanisms for transient failures',
          'Improve error handling and recovery'
        ]
      });
    }
    
    return recommendations;
  }

  /**
   * Clear old metrics to prevent memory leaks
   * @param {number} daysToKeep - Number of days of metrics to keep (default: 30)
   */
  cleanupOldMetrics(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    
    let removedCount = 0;
    for (const [key, metrics] of this.metrics.entries()) {
      if (metrics.date < cutoffString) {
        this.metrics.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`Performance Monitor: Cleaned up ${removedCount} old metric entries`);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Cleanup old metrics daily
setInterval(() => {
  performanceMonitor.cleanupOldMetrics();
}, 24 * 60 * 60 * 1000); // 24 hours

module.exports = {
  PerformanceMonitor,
  performanceMonitor
};