const EventEmitter = require('events');
const os = require('os');

class PerformanceMonitoringService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      monitoringInterval: 30000, // 30 seconds
      alertThresholds: {
        cpuUsage: 80, // percentage
        memoryUsage: 85, // percentage
        responseTime: 2000, // milliseconds
        errorRate: 5, // percentage
        diskUsage: 90, // percentage
        connectionPoolUsage: 80 // percentage
      },
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      maxDataPoints: 2880 // 24 hours at 30-second intervals
    };
    
    this.metrics = {
      system: [],
      application: [],
      database: [],
      api: [],
      alerts: []
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.alertCooldowns = new Map();
  }

  // Start monitoring
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
    
    console.log('Performance monitoring started');
    this.emit('monitoringStarted');
  }

  // Stop monitoring
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Performance monitoring stopped');
    this.emit('monitoringStopped');
  }

  // Collect all metrics
  async collectMetrics() {
    const timestamp = new Date();
    
    try {
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      this.addMetric('system', { ...systemMetrics, timestamp });
      
      // Collect application metrics
      const appMetrics = await this.collectApplicationMetrics();
      this.addMetric('application', { ...appMetrics, timestamp });
      
      // Collect database metrics
      const dbMetrics = await this.collectDatabaseMetrics();
      this.addMetric('database', { ...dbMetrics, timestamp });
      
      // Check for alerts
      this.checkAlerts(systemMetrics, appMetrics, dbMetrics);
      
    } catch (error) {
      console.error('Error collecting metrics:', error.message);
      this.emit('metricsError', error);
    }
  }

  // System metrics collection
  async collectSystemMetrics() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const cpuUsage = 100 - ~~(100 * idle / total);\n    
    return {\n      cpu: {\n        usage: cpuUsage,\n        cores: cpus.length,\n        model: cpus[0].model\n      },\n      memory: {\n        total: Math.round(totalMem / 1024 / 1024), // MB\n        used: Math.round(usedMem / 1024 / 1024), // MB\n        free: Math.round(freeMem / 1024 / 1024), // MB\n        usage: Math.round((usedMem / totalMem) * 100) // percentage\n      },\n      system: {\n        platform: os.platform(),\n        arch: os.arch(),\n        uptime: os.uptime(),\n        loadAverage: os.loadavg()\n      }\n    };\n  }\n\n  // Application metrics collection\n  async collectApplicationMetrics() {\n    const memUsage = process.memoryUsage();\n    \n    return {\n      process: {\n        pid: process.pid,\n        uptime: process.uptime(),\n        memory: {\n          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB\n          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB\n          external: Math.round(memUsage.external / 1024 / 1024), // MB\n          rss: Math.round(memUsage.rss / 1024 / 1024) // MB\n        }\n      },\n      eventLoop: {\n        delay: await this.measureEventLoopDelay()\n      }\n    };\n  }\n\n  // Database metrics collection\n  async collectDatabaseMetrics() {\n    try {\n      // Get performance optimization service if available\n      const PerformanceOptimizationService = require('./performanceOptimizationService');\n      const perfService = new PerformanceOptimizationService();\n      \n      const poolStats = perfService.getConnectionPoolStats();\n      const perfMetrics = perfService.getPerformanceMetrics();\n      \n      return {\n        connectionPool: {\n          total: poolStats.totalConnections,\n          used: poolStats.usedConnections,\n          free: poolStats.freeConnections,\n          queued: poolStats.queuedRequests,\n          usage: poolStats.totalConnections > 0 \n            ? Math.round((poolStats.usedConnections / poolStats.totalConnections) * 100) \n            : 0\n        },\n        queries: {\n          total: perfMetrics.database.totalQueries,\n          avgTime: perfMetrics.database.avgQueryTime,\n          p95Time: perfMetrics.database.p95QueryTime,\n          slowQueries: perfMetrics.database.slowQueries,\n          slowQueryRate: perfMetrics.database.slowQueryRate\n        },\n        cache: {\n          hitRate: perfMetrics.cache.hitRate,\n          size: perfMetrics.cache.size,\n          hits: perfMetrics.cache.hits,\n          misses: perfMetrics.cache.misses\n        }\n      };\n    } catch (error) {\n      return {\n        connectionPool: { error: 'Unable to collect pool stats' },\n        queries: { error: 'Unable to collect query stats' },\n        cache: { error: 'Unable to collect cache stats' }\n      };\n    }\n  }\n\n  // Measure event loop delay\n  measureEventLoopDelay() {\n    return new Promise((resolve) => {\n      const start = process.hrtime.bigint();\n      setImmediate(() => {\n        const delta = process.hrtime.bigint() - start;\n        resolve(Number(delta / 1000000n)); // Convert to milliseconds\n      });\n    });\n  }\n\n  // Add metric to collection\n  addMetric(type, metric) {\n    if (!this.metrics[type]) {\n      this.metrics[type] = [];\n    }\n    \n    this.metrics[type].push(metric);\n    \n    // Keep only recent metrics\n    if (this.metrics[type].length > this.config.maxDataPoints) {\n      this.metrics[type] = this.metrics[type].slice(-this.config.maxDataPoints);\n    }\n    \n    // Clean old metrics\n    const cutoff = Date.now() - this.config.retentionPeriod;\n    this.metrics[type] = this.metrics[type].filter(m => m.timestamp.getTime() > cutoff);\n  }\n\n  // Alert checking\n  checkAlerts(systemMetrics, appMetrics, dbMetrics) {\n    const alerts = [];\n    \n    // CPU usage alert\n    if (systemMetrics.cpu.usage > this.config.alertThresholds.cpuUsage) {\n      alerts.push({\n        type: 'cpu_high',\n        severity: 'warning',\n        message: `High CPU usage: ${systemMetrics.cpu.usage}%`,\n        value: systemMetrics.cpu.usage,\n        threshold: this.config.alertThresholds.cpuUsage\n      });\n    }\n    \n    // Memory usage alert\n    if (systemMetrics.memory.usage > this.config.alertThresholds.memoryUsage) {\n      alerts.push({\n        type: 'memory_high',\n        severity: 'warning',\n        message: `High memory usage: ${systemMetrics.memory.usage}%`,\n        value: systemMetrics.memory.usage,\n        threshold: this.config.alertThresholds.memoryUsage\n      });\n    }\n    \n    // Database connection pool alert\n    if (dbMetrics.connectionPool && dbMetrics.connectionPool.usage > this.config.alertThresholds.connectionPoolUsage) {\n      alerts.push({\n        type: 'db_pool_high',\n        severity: 'warning',\n        message: `High database connection pool usage: ${dbMetrics.connectionPool.usage}%`,\n        value: dbMetrics.connectionPool.usage,\n        threshold: this.config.alertThresholds.connectionPoolUsage\n      });\n    }\n    \n    // Process alerts\n    alerts.forEach(alert => this.processAlert(alert));\n  }\n\n  // Process and emit alerts\n  processAlert(alert) {\n    const alertKey = `${alert.type}_${alert.severity}`;\n    const now = Date.now();\n    const cooldownPeriod = 300000; // 5 minutes\n    \n    // Check cooldown\n    if (this.alertCooldowns.has(alertKey)) {\n      const lastAlert = this.alertCooldowns.get(alertKey);\n      if (now - lastAlert < cooldownPeriod) {\n        return; // Skip alert due to cooldown\n      }\n    }\n    \n    // Add timestamp and emit\n    alert.timestamp = new Date();\n    alert.id = `alert_${now}_${Math.random().toString(36).substr(2, 9)}`;\n    \n    this.metrics.alerts.push(alert);\n    this.alertCooldowns.set(alertKey, now);\n    \n    console.warn(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);\n    this.emit('alert', alert);\n    \n    // Keep only recent alerts\n    if (this.metrics.alerts.length > 1000) {\n      this.metrics.alerts = this.metrics.alerts.slice(-1000);\n    }\n  }\n\n  // API endpoint metrics tracking\n  trackApiRequest(endpoint, method, responseTime, statusCode) {\n    const metric = {\n      endpoint,\n      method,\n      responseTime,\n      statusCode,\n      timestamp: new Date(),\n      isError: statusCode >= 400\n    };\n    \n    this.addMetric('api', metric);\n    \n    // Check response time alert\n    if (responseTime > this.config.alertThresholds.responseTime) {\n      this.processAlert({\n        type: 'response_time_high',\n        severity: 'warning',\n        message: `Slow API response: ${endpoint} took ${responseTime}ms`,\n        value: responseTime,\n        threshold: this.config.alertThresholds.responseTime,\n        endpoint,\n        method\n      });\n    }\n  }\n\n  // Get metrics\n  getMetrics(type = null, timeRange = null) {\n    if (type && this.metrics[type]) {\n      let metrics = [...this.metrics[type]];\n      \n      if (timeRange) {\n        const cutoff = Date.now() - timeRange;\n        metrics = metrics.filter(m => m.timestamp.getTime() > cutoff);\n      }\n      \n      return metrics;\n    }\n    \n    if (timeRange) {\n      const cutoff = Date.now() - timeRange;\n      const filtered = {};\n      \n      for (const [key, values] of Object.entries(this.metrics)) {\n        filtered[key] = values.filter(m => m.timestamp.getTime() > cutoff);\n      }\n      \n      return filtered;\n    }\n    \n    return this.metrics;\n  }\n\n  // Get current status\n  getCurrentStatus() {\n    const latest = {};\n    \n    for (const [type, metrics] of Object.entries(this.metrics)) {\n      if (metrics.length > 0) {\n        latest[type] = metrics[metrics.length - 1];\n      }\n    }\n    \n    return latest;\n  }\n\n  // Get performance summary\n  getPerformanceSummary(timeRange = 3600000) { // 1 hour default\n    const cutoff = Date.now() - timeRange;\n    const summary = {\n      system: { healthy: true, issues: [] },\n      application: { healthy: true, issues: [] },\n      database: { healthy: true, issues: [] },\n      api: { healthy: true, issues: [] },\n      alerts: { count: 0, recent: [] }\n    };\n    \n    // Analyze system metrics\n    const systemMetrics = this.metrics.system.filter(m => m.timestamp.getTime() > cutoff);\n    if (systemMetrics.length > 0) {\n      const avgCpu = systemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / systemMetrics.length;\n      const avgMemory = systemMetrics.reduce((sum, m) => sum + m.memory.usage, 0) / systemMetrics.length;\n      \n      summary.system.avgCpuUsage = Math.round(avgCpu);\n      summary.system.avgMemoryUsage = Math.round(avgMemory);\n      \n      if (avgCpu > this.config.alertThresholds.cpuUsage) {\n        summary.system.healthy = false;\n        summary.system.issues.push('High CPU usage');\n      }\n      \n      if (avgMemory > this.config.alertThresholds.memoryUsage) {\n        summary.system.healthy = false;\n        summary.system.issues.push('High memory usage');\n      }\n    }\n    \n    // Analyze API metrics\n    const apiMetrics = this.metrics.api.filter(m => m.timestamp.getTime() > cutoff);\n    if (apiMetrics.length > 0) {\n      const avgResponseTime = apiMetrics.reduce((sum, m) => sum + m.responseTime, 0) / apiMetrics.length;\n      const errorRate = (apiMetrics.filter(m => m.isError).length / apiMetrics.length) * 100;\n      \n      summary.api.avgResponseTime = Math.round(avgResponseTime);\n      summary.api.errorRate = Math.round(errorRate * 100) / 100;\n      summary.api.totalRequests = apiMetrics.length;\n      \n      if (avgResponseTime > this.config.alertThresholds.responseTime) {\n        summary.api.healthy = false;\n        summary.api.issues.push('Slow response times');\n      }\n      \n      if (errorRate > this.config.alertThresholds.errorRate) {\n        summary.api.healthy = false;\n        summary.api.issues.push('High error rate');\n      }\n    }\n    \n    // Recent alerts\n    const recentAlerts = this.metrics.alerts.filter(a => a.timestamp.getTime() > cutoff);\n    summary.alerts.count = recentAlerts.length;\n    summary.alerts.recent = recentAlerts.slice(-10); // Last 10 alerts\n    \n    return summary;\n  }\n\n  // Health check\n  async healthCheck() {\n    const status = this.getCurrentStatus();\n    const summary = this.getPerformanceSummary();\n    \n    const isHealthy = summary.system.healthy && \n                     summary.application.healthy && \n                     summary.database.healthy && \n                     summary.api.healthy;\n    \n    return {\n      status: isHealthy ? 'healthy' : 'degraded',\n      monitoring: this.isMonitoring,\n      summary,\n      current: status,\n      timestamp: new Date().toISOString()\n    };\n  }\n\n  // Export metrics for external monitoring\n  exportMetrics(format = 'json') {\n    const data = {\n      timestamp: new Date().toISOString(),\n      config: this.config,\n      metrics: this.metrics,\n      summary: this.getPerformanceSummary()\n    };\n    \n    if (format === 'json') {\n      return JSON.stringify(data, null, 2);\n    }\n    \n    // Add other formats as needed (CSV, Prometheus, etc.)\n    return data;\n  }\n\n  // Clear old data\n  clearOldData(olderThan = null) {\n    const cutoff = olderThan || (Date.now() - this.config.retentionPeriod);\n    let totalCleared = 0;\n    \n    for (const [type, metrics] of Object.entries(this.metrics)) {\n      const originalLength = metrics.length;\n      this.metrics[type] = metrics.filter(m => m.timestamp.getTime() > cutoff);\n      totalCleared += originalLength - this.metrics[type].length;\n    }\n    \n    console.log(`Cleared ${totalCleared} old metric data points`);\n    return totalCleared;\n  }\n}\n\nmodule.exports = PerformanceMonitoringService;