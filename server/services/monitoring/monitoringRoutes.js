/**
 * Monitoring Routes for RCM System
 * Provides endpoints for system monitoring and health checks
 */

const express = require('express');
const { MonitoringService } = require('./monitoringService');
const { authMiddleware, roleMiddleware } = require('../../middleware/auth');
const { performanceMonitor } = require('../../utils/performanceMonitor');
const { errorTracker } = require('../../utils/errorTracker');
const { auditLogger } = require('../../utils/auditLogger');

const router = express.Router();
const monitoringService = new MonitoringService();

/**
 * Middleware to track API performance
 */
const trackPerformance = (req, res, next) => {
  const operationId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  performanceMonitor.startOperation(operationId, 'api_request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  
  req.operationId = operationId;
  
  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    performanceMonitor.endOperation(operationId, {
      statusCode: res.statusCode,
      success: res.statusCode < 400
    });
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * GET /api/v1/monitoring/dashboard
 * Get comprehensive monitoring dashboard data
 */
router.get('/dashboard', 
  authMiddleware, 
  roleMiddleware(['admin', 'monitor']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const dashboardData = await monitoringService.getDashboardData();
      
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getDashboard',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/health
 * Get system health status
 */
router.get('/health',
  trackPerformance,
  async (req, res, next) => {
    try {
      const healthStatus = await monitoringService.getHealthStatus();
      const systemMetrics = await monitoringService.getSystemMetrics();
      
      const overallHealthy = Object.values(healthStatus)
        .every(status => status.status === 'healthy');
      
      res.status(overallHealthy ? 200 : 503).json({
        success: true,
        data: {
          status: overallHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          healthScore: systemMetrics.healthScore,
          components: healthStatus,
          uptime: systemMetrics.uptime
        }
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getHealth',
        url: req.originalUrl,
        method: req.method
      });
      
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }
);

/**
 * GET /api/v1/monitoring/metrics
 * Get performance metrics
 */
router.get('/metrics',
  authMiddleware,
  roleMiddleware(['admin', 'monitor']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { type, days = 7 } = req.query;
      
      let metrics;
      if (type) {
        metrics = performanceMonitor.getMetrics(type, parseInt(days));
      } else {
        metrics = performanceMonitor.generateReport(null, parseInt(days));
      }
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getMetrics',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/errors
 * Get error statistics and recent errors
 */
router.get('/errors',
  authMiddleware,
  roleMiddleware(['admin', 'monitor']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { 
        startDate, 
        endDate, 
        category, 
        severity, 
        component,
        limit = 50 
      } = req.query;
      
      const [statistics, recentAlerts] = await Promise.all([
        errorTracker.getErrorStatistics({
          startDate,
          endDate,
          category,
          severity,
          component
        }),
        errorTracker.getRecentAlerts(parseInt(limit))
      ]);
      
      res.json({
        success: true,
        data: {
          statistics,
          recentAlerts
        }
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getErrors',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/audit
 * Get audit log statistics
 */
router.get('/audit',
  authMiddleware,
  roleMiddleware(['admin']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { startDate, endDate } = req.query;
      
      const auditStats = await auditLogger.getStatistics({
        startDate,
        endDate
      });
      
      res.json({
        success: true,
        data: auditStats
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getAudit',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/performance/slow
 * Get slow operations
 */
router.get('/performance/slow',
  authMiddleware,
  roleMiddleware(['admin', 'monitor']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { threshold = 1000, limit = 10 } = req.query;
      
      const slowOperations = performanceMonitor.getSlowOperations(
        parseInt(threshold),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: {
          threshold: parseInt(threshold),
          operations: slowOperations
        }
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getSlowOperations',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/performance/memory
 * Get high memory usage operations
 */
router.get('/performance/memory',
  authMiddleware,
  roleMiddleware(['admin', 'monitor']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { threshold = 50 * 1024 * 1024, limit = 10 } = req.query;
      
      const highMemoryOps = performanceMonitor.getHighMemoryOperations(
        parseInt(threshold),
        parseInt(limit)
      );
      
      res.json({
        success: true,
        data: {
          threshold: parseInt(threshold),
          operations: highMemoryOps
        }
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getHighMemoryOperations',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/config
 * Get monitoring configuration
 */
router.get('/config',
  authMiddleware,
  roleMiddleware(['admin']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const config = monitoringService.getMonitoringConfig();
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getConfig',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * PUT /api/v1/monitoring/config
 * Update monitoring configuration
 */
router.put('/config',
  authMiddleware,
  roleMiddleware(['admin']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const updatedConfig = await monitoringService.updateMonitoringConfig(req.body);
      
      await auditLogger.logSystemEvent('MONITORING_CONFIG_UPDATED', {
        component: 'MonitoringController',
        userId: req.user.id,
        changes: req.body
      });
      
      res.json({
        success: true,
        data: updatedConfig,
        message: 'Monitoring configuration updated successfully'
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'updateConfig',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * POST /api/v1/monitoring/test-alert
 * Test alert system (admin only)
 */
router.post('/test-alert',
  authMiddleware,
  roleMiddleware(['admin']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const { level = 'info', message = 'Test alert' } = req.body;
      
      // Create a test error to trigger alert
      const testError = new Error(message);
      await errorTracker.trackError(testError, {
        component: 'MonitoringController',
        operation: 'testAlert',
        userId: req.user.id,
        severity: level.toUpperCase()
      });
      
      await auditLogger.logSystemEvent('TEST_ALERT_TRIGGERED', {
        component: 'MonitoringController',
        userId: req.user.id,
        level,
        message
      });
      
      res.json({
        success: true,
        message: 'Test alert triggered successfully'
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'testAlert',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

/**
 * GET /api/v1/monitoring/system-info
 * Get detailed system information
 */
router.get('/system-info',
  authMiddleware,
  roleMiddleware(['admin']),
  trackPerformance,
  async (req, res, next) => {
    try {
      const systemMetrics = performanceMonitor.getSystemMetrics();
      
      res.json({
        success: true,
        data: {
          system: systemMetrics.systemInfo,
          process: {
            pid: process.pid,
            version: process.version,
            platform: process.platform,
            arch: process.arch,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage()
          },
          environment: {
            nodeEnv: process.env.NODE_ENV,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            locale: Intl.DateTimeFormat().resolvedOptions().locale
          }
        }
      });
    } catch (error) {
      await errorTracker.trackError(error, {
        component: 'MonitoringController',
        operation: 'getSystemInfo',
        userId: req.user?.id,
        url: req.originalUrl,
        method: req.method
      });
      next(error);
    }
  }
);

module.exports = router;