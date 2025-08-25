const express = require('express');
const router = express.Router();
const PerformanceOptimizationService = require('./performanceOptimizationService');
const PerformanceMonitoringService = require('./performanceMonitoringService');
const BatchProcessingService = require('./batchProcessingService');
const CachingService = require('./cachingService');

// Initialize services
const perfOptimization = new PerformanceOptimizationService();
const perfMonitoring = new PerformanceMonitoringService();
const batchProcessing = new BatchProcessingService();
const caching = new CachingService();

// Start caching cleanup interval
caching.startCleanupInterval();

// Performance Monitoring Routes

// Get performance summary
router.get('/performance/summary', async (req, res) => {
  try {
    const timeRange = parseInt(req.query.timeRange) || 3600000; // 1 hour default
    const summary = perfMonitoring.getPerformanceSummary(timeRange);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting performance summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance summary',
      error: error.message
    });
  }
});

// Get performance metrics
router.get('/performance/metrics', async (req, res) => {
  try {
    const { type, timeRange } = req.query;
    const range = timeRange ? parseInt(timeRange) : null;
    
    const metrics = perfMonitoring.getMetrics(type, range);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance metrics',
      error: error.message
    });
  }
});

// Get current performance status
router.get('/performance/status', async (req, res) => {
  try {
    const healthCheck = await perfMonitoring.healthCheck();
    
    res.json({
      success: true,
      data: healthCheck
    });
  } catch (error) {
    console.error('Error getting performance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get performance status',
      error: error.message
    });
  }
});

// Start performance monitoring
router.post('/performance/monitoring/start', async (req, res) => {
  try {
    perfMonitoring.startMonitoring();
    
    res.json({
      success: true,
      message: 'Performance monitoring started'
    });
  } catch (error) {
    console.error('Error starting performance monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start performance monitoring',
      error: error.message
    });
  }
});

// Stop performance monitoring
router.post('/performance/monitoring/stop', async (req, res) => {
  try {
    perfMonitoring.stopMonitoring();
    
    res.json({
      success: true,
      message: 'Performance monitoring stopped'
    });
  } catch (error) {
    console.error('Error stopping performance monitoring:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop performance monitoring',
      error: error.message
    });
  }
});

// Get active alerts
router.get('/performance/alerts', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const metrics = perfMonitoring.getMetrics();
    
    let alerts = metrics.alerts || [];
    if (status === 'active') {
      alerts = alerts.filter(alert => !alert.acknowledged);
    }
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get alerts',
      error: error.message
    });
  }
});

// Acknowledge alert
router.post('/performance/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    
    // In a real implementation, you would update the alert in the database
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Alert acknowledged'
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: error.message
    });
  }
});

// Export performance metrics
router.get('/performance/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const exportData = perfMonitoring.exportMetrics(format);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=performance-metrics-${new Date().toISOString().split('T')[0]}.json`);
    res.send(exportData);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export metrics',
      error: error.message
    });
  }
});

// Track API request (middleware)
router.use('/track-request', (req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const endpoint = req.originalUrl;
    const method = req.method;
    const statusCode = res.statusCode;
    
    perfMonitoring.trackApiRequest(endpoint, method, responseTime, statusCode);
  });
  
  next();
});

// Database Optimization Routes

// Get database performance metrics
router.get('/database/performance', async (req, res) => {
  try {
    const metrics = perfOptimization.getPerformanceMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting database performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database performance',
      error: error.message
    });
  }
});

// Analyze and suggest database optimizations
router.get('/database/analyze', async (req, res) => {
  try {
    const analysis = await perfOptimization.analyzeAndOptimizeIndexes();
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error analyzing database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze database',
      error: error.message
    });
  }
});

// Get connection pool statistics
router.get('/database/pool-stats', async (req, res) => {
  try {
    const stats = perfOptimization.getConnectionPoolStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting pool stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get connection pool stats',
      error: error.message
    });
  }
});

// Database health check
router.get('/database/health', async (req, res) => {
  try {
    const health = await perfOptimization.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking database health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check database health',
      error: error.message
    });
  }
});

// Batch Processing Routes

// Create batch job
router.post('/batch/jobs', async (req, res) => {
  try {
    const { jobType, data, options = {} } = req.body;
    
    if (!jobType || !data) {
      return res.status(400).json({
        success: false,
        message: 'Job type and data are required'
      });
    }
    
    const jobId = await batchProcessing.createJob(jobType, data, options);
    
    res.json({
      success: true,
      data: { jobId },
      message: 'Batch job created successfully'
    });
  } catch (error) {
    console.error('Error creating batch job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create batch job',
      error: error.message
    });
  }
});

// Get batch job status
router.get('/batch/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = batchProcessing.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    console.error('Error getting batch job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch job',
      error: error.message
    });
  }
});

// Get all active batch jobs
router.get('/batch/jobs', async (req, res) => {
  try {
    const { status } = req.query;
    
    let jobs;
    if (status === 'active') {
      jobs = batchProcessing.getActiveJobs();
    } else if (status === 'queued') {
      jobs = batchProcessing.getQueuedJobs();
    } else {
      jobs = [
        ...batchProcessing.getActiveJobs(),
        ...batchProcessing.getQueuedJobs(),
        ...batchProcessing.getJobHistory(50)
      ];
    }
    
    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Error getting batch jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch jobs',
      error: error.message
    });
  }
});

// Cancel batch job
router.post('/batch/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = await batchProcessing.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(400).json({
        success: false,
        message: 'Job cannot be cancelled'
      });
    }
    
    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling batch job:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel batch job',
      error: error.message
    });
  }
});

// Get batch processing statistics
router.get('/batch/stats', async (req, res) => {
  try {
    const stats = batchProcessing.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting batch stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get batch statistics',
      error: error.message
    });
  }
});

// Batch processing health check
router.get('/batch/health', async (req, res) => {
  try {
    const health = await batchProcessing.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking batch health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check batch processing health',
      error: error.message
    });
  }
});

// Caching Routes

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = caching.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message
    });
  }
});

// Clear cache
router.post('/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;
    await caching.clear(pattern);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

// Cache health check
router.get('/cache/health', async (req, res) => {
  try {
    const health = await caching.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Error checking cache health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check cache health',
      error: error.message
    });
  }
});

// Overall System Health Check
router.get('/health', async (req, res) => {
  try {
    const [
      perfHealth,
      dbHealth,
      batchHealth,
      cacheHealth
    ] = await Promise.all([
      perfMonitoring.healthCheck(),
      perfOptimization.healthCheck(),
      batchProcessing.healthCheck(),
      caching.healthCheck()
    ]);
    
    const overallHealth = {
      status: 'healthy',
      components: {
        monitoring: perfHealth,
        database: dbHealth,
        batchProcessing: batchHealth,
        cache: cacheHealth
      },
      timestamp: new Date().toISOString()
    };
    
    // Determine overall status
    const componentStatuses = [
      perfHealth.status,
      dbHealth.status,
      batchHealth.status,
      cacheHealth.status
    ];
    
    if (componentStatuses.includes('unhealthy')) {
      overallHealth.status = 'unhealthy';
    } else if (componentStatuses.includes('degraded')) {
      overallHealth.status = 'degraded';
    }
    
    res.json({
      success: true,
      data: overallHealth
    });
  } catch (error) {
    console.error('Error checking overall health:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check system health',
      error: error.message
    });
  }
});

// Cleanup old data
router.post('/cleanup', async (req, res) => {
  try {
    const { olderThanDays = 7 } = req.body;
    const olderThan = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const metricsCleared = perfMonitoring.clearOldData(olderThan);
    
    res.json({
      success: true,
      data: {
        metricsCleared
      },
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup old data',
      error: error.message
    });
  }
});

module.exports = router;