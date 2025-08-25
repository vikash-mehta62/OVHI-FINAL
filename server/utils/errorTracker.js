/**
 * Error Tracking and Alerting System
 * Monitors, categorizes, and alerts on application errors
 */

const { EventEmitter } = require('events');
const { dbUtils } = require('./dbUtils');
const { auditLogger } = require('./auditLogger');

class ErrorTracker extends EventEmitter {
  constructor() {
    super();
    this.errorCounts = new Map();
    this.alertThresholds = {
      critical: { count: 5, timeWindow: 300000 }, // 5 errors in 5 minutes
      warning: { count: 10, timeWindow: 600000 }, // 10 errors in 10 minutes
      info: { count: 20, timeWindow: 1800000 }    // 20 errors in 30 minutes
    };
    this.alertCooldowns = new Map();
    this.errorPatterns = new Map();
    
    // Clean up old error counts every hour
    setInterval(() => this.cleanupOldErrors(), 3600000);
  }

  /**
   * Track an error occurrence
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   */
  async trackError(error, context = {}) {
    const errorInfo = this.analyzeError(error, context);
    
    // Store error in database
    await this.storeError(errorInfo);
    
    // Update error counts for alerting
    this.updateErrorCounts(errorInfo);
    
    // Check for patterns
    this.analyzeErrorPatterns(errorInfo);
    
    // Check if alerts should be triggered
    await this.checkAlerts(errorInfo);
    
    // Log to audit system
    await auditLogger.logSystemEvent('ERROR_OCCURRED', {
      severity: errorInfo.severity,
      component: errorInfo.component,
      errorMessage: errorInfo.message,
      stackTrace: errorInfo.stackTrace,
      ...context
    });

    this.emit('errorTracked', errorInfo);
    
    return errorInfo.id;
  }

  /**
   * Analyze error and extract relevant information
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  analyzeError(error, context) {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Determine error category and severity
    const category = this.categorizeError(error, context);
    const severity = this.determineSeverity(error, context, category);
    
    // Extract stack trace information
    const stackTrace = error.stack || '';
    const stackLines = stackTrace.split('\\n');
    const firstStackLine = stackLines.find(line => line.includes('.js:')) || '';
    const fileMatch = firstStackLine.match(/([^/\\\\]+\\.js):(\\d+):(\\d+)/);
    
    return {
      id: errorId,
      timestamp,
      message: error.message || 'Unknown error',
      name: error.name || 'Error',
      code: error.code || null,
      category,
      severity,
      stackTrace,
      file: fileMatch ? fileMatch[1] : null,
      line: fileMatch ? parseInt(fileMatch[2]) : null,
      column: fileMatch ? parseInt(fileMatch[3]) : null,
      component: context.component || this.extractComponent(stackTrace),
      operation: context.operation || null,
      userId: context.userId || null,
      requestId: context.requestId || null,
      userAgent: context.userAgent || null,
      ipAddress: context.ipAddress || null,
      url: context.url || null,
      method: context.method || null,
      statusCode: context.statusCode || null,
      responseTime: context.responseTime || null,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      metadata: context.metadata || {}
    };
  }

  /**
   * Categorize error based on type and context
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  categorizeError(error, context) {
    // Database errors
    if (error.code && (error.code.startsWith('ER_') || error.code === 'ECONNREFUSED')) {
      return 'DATABASE';
    }
    
    // Authentication errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return 'AUTHENTICATION';
    }
    
    // Validation errors
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return 'VALIDATION';
    }
    
    // Network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return 'NETWORK';
    }
    
    // File system errors
    if (error.code && error.code.startsWith('E') && error.path) {
      return 'FILESYSTEM';
    }
    
    // Business logic errors
    if (context.component && context.component.includes('service')) {
      return 'BUSINESS_LOGIC';
    }
    
    // API errors
    if (context.url || context.method) {
      return 'API';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Determine error severity
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   * @param {string} category - Error category
   */
  determineSeverity(error, context, category) {
    // Critical errors
    if (category === 'DATABASE' && error.code === 'ECONNREFUSED') {
      return 'CRITICAL';
    }
    
    if (context.statusCode >= 500) {
      return 'CRITICAL';
    }
    
    if (error.message.toLowerCase().includes('out of memory')) {
      return 'CRITICAL';
    }
    
    // High severity errors
    if (category === 'AUTHENTICATION' && context.statusCode === 401) {
      return 'HIGH';
    }
    
    if (category === 'DATABASE' && error.code && error.code.startsWith('ER_')) {
      return 'HIGH';
    }
    
    if (context.statusCode >= 400 && context.statusCode < 500) {
      return 'MEDIUM';
    }
    
    // Default to low severity
    return 'LOW';
  }

  /**
   * Extract component name from stack trace
   * @param {string} stackTrace - Error stack trace
   */
  extractComponent(stackTrace) {
    const lines = stackTrace.split('\\n');
    for (const line of lines) {
      const match = line.match(/at\\s+(?:.*\\s+)?\\(?(.*[\\\\/]([^/\\\\]+)\\.js):/);
      if (match && !match[1].includes('node_modules')) {
        return match[2];
      }
    }
    return 'unknown';
  }

  /**
   * Store error in database
   * @param {Object} errorInfo - Analyzed error information
   */
  async storeError(errorInfo) {
    const query = `
      INSERT INTO error_logs (
        id, timestamp, message, name, code, category, severity,
        stack_trace, file, line_number, column_number, component,
        operation, user_id, request_id, user_agent, ip_address,
        url, method, status_code, response_time, memory_usage,
        cpu_usage, environment, node_version, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      errorInfo.id,
      errorInfo.timestamp,
      errorInfo.message,
      errorInfo.name,
      errorInfo.code,
      errorInfo.category,
      errorInfo.severity,
      errorInfo.stackTrace,
      errorInfo.file,
      errorInfo.line,
      errorInfo.column,
      errorInfo.component,
      errorInfo.operation,
      errorInfo.userId,
      errorInfo.requestId,
      errorInfo.userAgent,
      errorInfo.ipAddress,
      errorInfo.url,
      errorInfo.method,
      errorInfo.statusCode,
      errorInfo.responseTime,
      JSON.stringify(errorInfo.memoryUsage),
      JSON.stringify(errorInfo.cpuUsage),
      errorInfo.environment,
      errorInfo.nodeVersion,
      JSON.stringify(errorInfo.metadata)
    ];

    try {
      await dbUtils.executeQuery(query, values);
    } catch (dbError) {
      console.error('Failed to store error in database:', dbError);
      // Don't throw here to avoid recursive errors
    }
  }

  /**
   * Update error counts for alerting
   * @param {Object} errorInfo - Error information
   */
  updateErrorCounts(errorInfo) {
    const now = Date.now();
    const key = `${errorInfo.category}_${errorInfo.severity}`;
    
    if (!this.errorCounts.has(key)) {
      this.errorCounts.set(key, []);
    }
    
    const counts = this.errorCounts.get(key);
    counts.push(now);
    
    // Remove old entries outside time windows
    const maxWindow = Math.max(...Object.values(this.alertThresholds).map(t => t.timeWindow));
    this.errorCounts.set(key, counts.filter(timestamp => now - timestamp <= maxWindow));
  }

  /**
   * Analyze error patterns
   * @param {Object} errorInfo - Error information
   */
  analyzeErrorPatterns(errorInfo) {
    const patternKey = `${errorInfo.component}_${errorInfo.file}_${errorInfo.line}`;
    
    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        count: 0,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        messages: new Set(),
        users: new Set()
      });
    }
    
    const pattern = this.errorPatterns.get(patternKey);
    pattern.count++;
    pattern.lastSeen = errorInfo.timestamp;
    pattern.messages.add(errorInfo.message);
    
    if (errorInfo.userId) {
      pattern.users.add(errorInfo.userId);
    }
    
    // Check for recurring patterns
    if (pattern.count >= 5) {
      this.emit('errorPattern', {
        pattern: patternKey,
        ...pattern,
        messages: Array.from(pattern.messages),
        users: Array.from(pattern.users)
      });
    }
  }

  /**
   * Check if alerts should be triggered
   * @param {Object} errorInfo - Error information
   */
  async checkAlerts(errorInfo) {
    const key = `${errorInfo.category}_${errorInfo.severity}`;
    const counts = this.errorCounts.get(key) || [];
    const now = Date.now();
    
    for (const [level, threshold] of Object.entries(this.alertThresholds)) {
      const recentErrors = counts.filter(timestamp => now - timestamp <= threshold.timeWindow);
      
      if (recentErrors.length >= threshold.count) {
        const cooldownKey = `${key}_${level}`;
        const lastAlert = this.alertCooldowns.get(cooldownKey) || 0;
        
        // Check cooldown (don't spam alerts)
        if (now - lastAlert > threshold.timeWindow) {
          await this.triggerAlert(level, errorInfo, recentErrors.length, threshold);
          this.alertCooldowns.set(cooldownKey, now);
        }
      }
    }
  }

  /**
   * Trigger an alert
   * @param {string} level - Alert level
   * @param {Object} errorInfo - Error information
   * @param {number} count - Number of recent errors
   * @param {Object} threshold - Threshold configuration
   */
  async triggerAlert(level, errorInfo, count, threshold) {
    const alert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      level,
      category: errorInfo.category,
      severity: errorInfo.severity,
      count,
      timeWindow: threshold.timeWindow,
      component: errorInfo.component,
      message: `${count} ${errorInfo.category} errors (${errorInfo.severity}) in ${threshold.timeWindow / 1000} seconds`,
      recentError: {
        message: errorInfo.message,
        file: errorInfo.file,
        line: errorInfo.line
      }
    };

    // Store alert
    await this.storeAlert(alert);
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Log alert
    console.error(`ALERT [${level.toUpperCase()}]: ${alert.message}`);
    
    return alert;
  }

  /**
   * Store alert in database
   * @param {Object} alert - Alert information
   */
  async storeAlert(alert) {
    const query = `
      INSERT INTO error_alerts (
        id, timestamp, level, category, severity, error_count,
        time_window, component, message, recent_error_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      alert.id,
      alert.timestamp,
      alert.level,
      alert.category,
      alert.severity,
      alert.count,
      alert.timeWindow,
      alert.component,
      alert.message,
      JSON.stringify(alert.recentError)
    ];

    try {
      await dbUtils.executeQuery(query, values);
    } catch (error) {
      console.error('Failed to store alert:', error);
    }
  }

  /**
   * Get error statistics
   * @param {Object} criteria - Filter criteria
   */
  async getErrorStatistics(criteria = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      category,
      severity,
      component
    } = criteria;

    let whereClause = 'WHERE timestamp BETWEEN ? AND ?';
    const params = [startDate, endDate];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (severity) {
      whereClause += ' AND severity = ?';
      params.push(severity);
    }

    if (component) {
      whereClause += ' AND component = ?';
      params.push(component);
    }

    const queries = {
      totalErrors: `SELECT COUNT(*) as count FROM error_logs ${whereClause}`,
      errorsByCategory: `
        SELECT category, COUNT(*) as count FROM error_logs ${whereClause}
        GROUP BY category ORDER BY count DESC
      `,
      errorsBySeverity: `
        SELECT severity, COUNT(*) as count FROM error_logs ${whereClause}
        GROUP BY severity ORDER BY count DESC
      `,
      errorsByComponent: `
        SELECT component, COUNT(*) as count FROM error_logs ${whereClause}
        GROUP BY component ORDER BY count DESC LIMIT 10
      `,
      topErrors: `
        SELECT message, COUNT(*) as count FROM error_logs ${whereClause}
        GROUP BY message ORDER BY count DESC LIMIT 10
      `,
      hourlyDistribution: `
        SELECT HOUR(timestamp) as hour, COUNT(*) as count FROM error_logs ${whereClause}
        GROUP BY HOUR(timestamp) ORDER BY hour
      `
    };

    try {
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        results[key] = await dbUtils.executeQuery(query, params);
      }

      return {
        period: { startDate, endDate },
        totalErrors: results.totalErrors[0]?.count || 0,
        errorsByCategory: results.errorsByCategory,
        errorsBySeverity: results.errorsBySeverity,
        errorsByComponent: results.errorsByComponent,
        topErrors: results.topErrors,
        hourlyDistribution: results.hourlyDistribution
      };
    } catch (error) {
      console.error('Error getting error statistics:', error);
      throw error;
    }
  }

  /**
   * Get recent alerts
   * @param {number} limit - Maximum number of alerts to return
   */
  async getRecentAlerts(limit = 50) {
    const query = `
      SELECT * FROM error_alerts 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;

    try {
      const alerts = await dbUtils.executeQuery(query, [limit]);
      return alerts.map(alert => ({
        ...alert,
        recent_error_data: JSON.parse(alert.recent_error_data || '{}')
      }));
    } catch (error) {
      console.error('Error getting recent alerts:', error);
      throw error;
    }
  }

  /**
   * Clean up old error counts
   */
  cleanupOldErrors() {
    const now = Date.now();
    const maxWindow = Math.max(...Object.values(this.alertThresholds).map(t => t.timeWindow));
    
    for (const [key, counts] of this.errorCounts.entries()) {
      const filteredCounts = counts.filter(timestamp => now - timestamp <= maxWindow);
      if (filteredCounts.length === 0) {
        this.errorCounts.delete(key);
      } else {
        this.errorCounts.set(key, filteredCounts);
      }
    }
    
    // Clean up old patterns
    const cutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    for (const [key, pattern] of this.errorPatterns.entries()) {
      if (new Date(pattern.lastSeen).getTime() < cutoff) {
        this.errorPatterns.delete(key);
      }
    }
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `err_${timestamp}_${random}`;
  }

  /**
   * Generate unique alert ID
   */
  generateAlertId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `alert_${timestamp}_${random}`;
  }
}

// Create singleton instance
const errorTracker = new ErrorTracker();

module.exports = {
  ErrorTracker,
  errorTracker
};