/**
 * Monitoring Service for RCM System
 * Provides comprehensive monitoring dashboard and metrics
 */

const { performanceMonitor } = require('../../utils/performanceMonitor');
const { auditLogger } = require('../../utils/auditLogger');
const { errorTracker } = require('../../utils/errorTracker');
const { dbUtils } = require('../../utils/dbUtils');

class MonitoringService {
  constructor() {
    this.healthChecks = new Map();
    this.registerHealthChecks();
  }

  /**
   * Register system health checks
   */
  registerHealthChecks() {
    this.healthChecks.set('database', this.checkDatabaseHealth.bind(this));
    this.healthChecks.set('memory', this.checkMemoryHealth.bind(this));
    this.healthChecks.set('disk', this.checkDiskHealth.bind(this));
    this.healthChecks.set('api', this.checkAPIHealth.bind(this));
  }

  /**
   * Get comprehensive system dashboard data
   */
  async getDashboardData() {
    try {
      const [
        systemMetrics,
        healthStatus,
        performanceMetrics,
        errorStatistics,
        auditStatistics,
        recentAlerts
      ] = await Promise.all([
        this.getSystemMetrics(),
        this.getHealthStatus(),
        this.getPerformanceMetrics(),
        this.getErrorStatistics(),
        this.getAuditStatistics(),
        this.getRecentAlerts()
      ]);

      return {
        timestamp: new Date().toISOString(),
        systemMetrics,
        healthStatus,
        performanceMetrics,
        errorStatistics,
        auditStatistics,
        recentAlerts,
        summary: this.generateSummary({
          systemMetrics,
          healthStatus,
          performanceMetrics,
          errorStatistics
        })
      };
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics() {
    const metrics = performanceMonitor.getSystemMetrics();
    
    return {
      ...metrics,
      healthScore: this.calculateHealthScore(metrics),
      status: this.determineSystemStatus(metrics)
    };
  }

  /**
   * Get health status for all components
   */
  async getHealthStatus() {
    const healthResults = {};
    
    for (const [component, checkFunction] of this.healthChecks.entries()) {
      try {
        const startTime = Date.now();
        const result = await checkFunction();
        const responseTime = Date.now() - startTime;
        
        healthResults[component] = {
          status: result.healthy ? 'healthy' : 'unhealthy',
          responseTime,
          message: result.message,
          details: result.details,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        healthResults[component] = {
          status: 'error',
          responseTime: null,
          message: error.message,
          details: null,
          lastChecked: new Date().toISOString()
        };
      }
    }
    
    return healthResults;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    const operationTypes = ['database_query', 'api_request', 'transaction', 'file_operation'];
    const metrics = {};
    
    for (const type of operationTypes) {
      metrics[type] = performanceMonitor.getMetrics(type, 1); // Last 1 day
    }
    
    return {
      operationMetrics: metrics,
      slowOperations: performanceMonitor.getSlowOperations(1000, 5),
      highMemoryOperations: performanceMonitor.getHighMemoryOperations(10 * 1024 * 1024, 5),
      performanceReport: performanceMonitor.generateReport(null, 1)
    };
  }

  /**
   * Get error statistics
   */
  async getErrorStatistics() {
    const stats = await errorTracker.getErrorStatistics({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    });
    
    return {
      ...stats,
      errorRate: this.calculateErrorRate(stats),
      criticalErrors: await this.getCriticalErrors(),
      errorTrends: await this.getErrorTrends()
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics() {
    return await auditLogger.getStatistics();
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts() {
    return await errorTracker.getRecentAlerts(10);
  }

  /**
   * Database health check
   */
  async checkDatabaseHealth() {
    try {
      const startTime = Date.now();
      await dbUtils.executeQuery('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      // Check connection pool status
      const poolStatus = await this.getConnectionPoolStatus();
      
      return {
        healthy: responseTime < 1000 && poolStatus.available > 0,
        message: responseTime < 1000 ? 'Database responding normally' : 'Database response slow',
        details: {
          responseTime,
          ...poolStatus
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Database connection failed: ${error.message}`,
        details: { error: error.code }
      };
    }
  }

  /**
   * Memory health check
   */
  async checkMemoryHealth() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usagePercent = (memoryUsage.heapUsed / totalMemory) * 100;
    
    return {
      healthy: usagePercent < 80,
      message: usagePercent < 80 ? 'Memory usage normal' : 'High memory usage detected',
      details: {
        usagePercent: usagePercent.toFixed(2),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      }
    };
  }

  /**
   * Disk health check
   */
  async checkDiskHealth() {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat('./');
      
      // Simple disk check - in production, you'd want more sophisticated disk monitoring
      return {
        healthy: true,
        message: 'Disk access normal',
        details: {
          accessible: true,
          lastModified: stats.mtime
        }
      };
    } catch (error) {
      return {
        healthy: false,
        message: `Disk access failed: ${error.message}`,
        details: { error: error.code }
      };
    }
  }

  /**
   * API health check
   */
  async checkAPIHealth() {
    const systemMetrics = performanceMonitor.getSystemMetrics();
    const avgResponseTime = systemMetrics.averageResponseTime;
    const errorRate = systemMetrics.totalRequests > 0 
      ? (systemMetrics.totalErrors / systemMetrics.totalRequests) * 100 
      : 0;
    
    return {
      healthy: avgResponseTime < 2000 && errorRate < 5,
      message: avgResponseTime < 2000 && errorRate < 5 
        ? 'API performance normal' 
        : 'API performance degraded',
      details: {
        averageResponseTime: avgResponseTime,
        errorRate: errorRate.toFixed(2),
        totalRequests: systemMetrics.totalRequests,
        totalErrors: systemMetrics.totalErrors
      }
    };
  }

  /**
   * Get connection pool status
   */
  async getConnectionPoolStatus() {
    // This would depend on your database connection pool implementation
    // For now, return mock data
    return {
      total: 10,
      available: 8,
      used: 2,
      pending: 0
    };
  }

  /**
   * Calculate system health score
   */
  calculateHealthScore(metrics) {
    let score = 100;
    
    // Deduct points for high error rate
    if (metrics.errorRate > 5) score -= 20;
    else if (metrics.errorRate > 2) score -= 10;
    
    // Deduct points for slow response time
    if (metrics.averageResponseTime > 2000) score -= 20;
    else if (metrics.averageResponseTime > 1000) score -= 10;
    
    // Deduct points for high memory usage
    const memoryPercent = (metrics.currentMemory.heapUsed / metrics.systemInfo.totalMemory) * 100;
    if (memoryPercent > 80) score -= 15;
    else if (memoryPercent > 60) score -= 5;
    
    // Deduct points for high CPU load
    const avgLoad = metrics.systemInfo.loadAverage[0];
    const cpuThreshold = metrics.systemInfo.cpuCount;
    if (avgLoad > cpuThreshold) score -= 15;
    else if (avgLoad > cpuThreshold * 0.8) score -= 5;
    
    return Math.max(0, score);
  }

  /**
   * Determine system status based on metrics
   */
  determineSystemStatus(metrics) {
    const healthScore = this.calculateHealthScore(metrics);
    
    if (healthScore >= 90) return 'excellent';
    if (healthScore >= 75) return 'good';
    if (healthScore >= 60) return 'fair';
    if (healthScore >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(errorStats) {
    const systemMetrics = performanceMonitor.getSystemMetrics();
    if (systemMetrics.totalRequests === 0) return 0;
    
    return (errorStats.totalErrors / systemMetrics.totalRequests) * 100;
  }

  /**
   * Get critical errors
   */
  async getCriticalErrors() {
    const query = `
      SELECT * FROM error_logs 
      WHERE severity = 'CRITICAL' 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY timestamp DESC 
      LIMIT 10
    `;
    
    try {
      return await dbUtils.executeQuery(query);
    } catch (error) {
      console.error('Error getting critical errors:', error);
      return [];
    }
  }

  /**
   * Get error trends
   */
  async getErrorTrends() {
    const query = `
      SELECT 
        DATE(timestamp) as date,
        severity,
        COUNT(*) as count
      FROM error_logs 
      WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(timestamp), severity
      ORDER BY date DESC, severity
    `;
    
    try {
      const results = await dbUtils.executeQuery(query);
      
      // Transform results into trend data
      const trends = {};
      results.forEach(row => {
        if (!trends[row.date]) {
          trends[row.date] = {};
        }
        trends[row.date][row.severity] = row.count;
      });
      
      return trends;
    } catch (error) {
      console.error('Error getting error trends:', error);
      return {};
    }
  }

  /**
   * Generate dashboard summary
   */
  generateSummary(data) {
    const { systemMetrics, healthStatus, performanceMetrics, errorStatistics } = data;
    
    // Count healthy components
    const healthyComponents = Object.values(healthStatus)
      .filter(status => status.status === 'healthy').length;
    const totalComponents = Object.keys(healthStatus).length;
    
    // Determine overall status
    let overallStatus = 'healthy';
    if (systemMetrics.healthScore < 60) overallStatus = 'critical';
    else if (systemMetrics.healthScore < 80) overallStatus = 'warning';
    else if (healthyComponents < totalComponents) overallStatus = 'warning';
    
    return {
      overallStatus,
      healthScore: systemMetrics.healthScore,
      healthyComponents: `${healthyComponents}/${totalComponents}`,
      uptime: this.formatUptime(systemMetrics.uptime),
      totalRequests: systemMetrics.totalRequests,
      errorRate: `${systemMetrics.errorRate.toFixed(2)}%`,
      averageResponseTime: `${systemMetrics.averageResponseTime.toFixed(0)}ms`,
      memoryUsage: `${Math.round(systemMetrics.currentMemory.heapUsed / 1024 / 1024)}MB`,
      activeOperations: systemMetrics.activeOperations,
      recentErrors: errorStatistics.totalErrors,
      slowOperations: performanceMetrics.slowOperations.length,
      alerts: data.recentAlerts ? data.recentAlerts.length : 0
    };
  }

  /**
   * Format uptime in human-readable format
   */
  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return {
      performanceThresholds: {
        responseTime: {
          good: 100,
          warning: 500,
          critical: 2000
        },
        errorRate: {
          good: 1,
          warning: 3,
          critical: 5
        },
        memoryUsage: {
          good: 60,
          warning: 80,
          critical: 90
        }
      },
      alertSettings: {
        enabled: true,
        channels: ['console', 'database'],
        cooldownPeriod: 300000 // 5 minutes
      },
      healthCheckInterval: 30000, // 30 seconds
      metricsRetention: {
        detailed: 7, // days
        summary: 30, // days
        archived: 365 // days
      }
    };
  }

  /**
   * Update monitoring configuration
   */
  async updateMonitoringConfig(newConfig) {
    // In a real implementation, you'd store this in database
    // For now, just validate and return
    const validatedConfig = this.validateMonitoringConfig(newConfig);
    
    await auditLogger.logSystemEvent('MONITORING_CONFIG_UPDATED', {
      component: 'MonitoringService',
      newConfig: validatedConfig
    });
    
    return validatedConfig;
  }

  /**
   * Validate monitoring configuration
   */
  validateMonitoringConfig(config) {
    // Basic validation - in production, use a proper schema validator
    const required = ['performanceThresholds', 'alertSettings', 'healthCheckInterval'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    return config;
  }
}

module.exports = {
  MonitoringService
};