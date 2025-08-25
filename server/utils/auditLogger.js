/**
 * Audit Logging System for RCM Operations
 * Tracks sensitive operations, user actions, and system events
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { dbUtils } = require('./dbUtils');

class AuditLogger {
  constructor() {
    this.logDirectory = path.join(__dirname, '../logs/audit');
    this.ensureLogDirectory();
    this.logQueue = [];
    this.isProcessing = false;
    
    // Process log queue every 5 seconds
    setInterval(() => this.processLogQueue(), 5000);
  }

  /**
   * Ensure audit log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  /**
   * Log a sensitive operation
   * @param {Object} logEntry - Audit log entry
   */
  async logOperation(logEntry) {
    const auditEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      ...logEntry,
      checksum: null
    };

    // Generate checksum for integrity verification
    auditEntry.checksum = this.generateChecksum(auditEntry);

    // Add to queue for processing
    this.logQueue.push(auditEntry);

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('AUDIT:', JSON.stringify(auditEntry, null, 2));
    }

    return auditEntry.id;
  }

  /**
   * Log user authentication events
   * @param {string} userId - User ID
   * @param {string} action - Authentication action (login, logout, failed_login)
   * @param {Object} metadata - Additional metadata
   */
  async logAuth(userId, action, metadata = {}) {
    return this.logOperation({
      category: 'AUTHENTICATION',
      action,
      userId,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      sessionId: metadata.sessionId,
      success: metadata.success !== false,
      failureReason: metadata.failureReason,
      metadata
    });
  }

  /**
   * Log data access events
   * @param {string} userId - User ID performing the access
   * @param {string} resource - Resource being accessed
   * @param {string} action - Action performed (read, create, update, delete)
   * @param {Object} metadata - Additional metadata
   */
  async logDataAccess(userId, resource, action, metadata = {}) {
    return this.logOperation({
      category: 'DATA_ACCESS',
      action,
      userId,
      resource,
      resourceId: metadata.resourceId,
      resourceType: metadata.resourceType,
      dataClassification: metadata.dataClassification || 'SENSITIVE',
      success: metadata.success !== false,
      errorMessage: metadata.errorMessage,
      changedFields: metadata.changedFields,
      oldValues: metadata.oldValues,
      newValues: metadata.newValues,
      metadata
    });
  }

  /**
   * Log financial operations
   * @param {string} userId - User ID performing the operation
   * @param {string} action - Financial action
   * @param {Object} metadata - Financial operation metadata
   */
  async logFinancialOperation(userId, action, metadata = {}) {
    return this.logOperation({
      category: 'FINANCIAL',
      action,
      userId,
      claimId: metadata.claimId,
      patientId: metadata.patientId,
      amount: metadata.amount,
      currency: metadata.currency || 'USD',
      paymentMethod: metadata.paymentMethod,
      transactionId: metadata.transactionId,
      success: metadata.success !== false,
      errorMessage: metadata.errorMessage,
      metadata
    });
  }

  /**
   * Log system events
   * @param {string} event - System event type
   * @param {Object} metadata - Event metadata
   */
  async logSystemEvent(event, metadata = {}) {
    return this.logOperation({
      category: 'SYSTEM',
      action: event,
      userId: 'SYSTEM',
      severity: metadata.severity || 'INFO',
      component: metadata.component,
      errorMessage: metadata.errorMessage,
      stackTrace: metadata.stackTrace,
      metadata
    });
  }

  /**
   * Log security events
   * @param {string} event - Security event type
   * @param {Object} metadata - Security event metadata
   */
  async logSecurityEvent(event, metadata = {}) {
    return this.logOperation({
      category: 'SECURITY',
      action: event,
      userId: metadata.userId || 'UNKNOWN',
      severity: metadata.severity || 'WARNING',
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      threat: metadata.threat,
      blocked: metadata.blocked || false,
      metadata
    });
  }

  /**
   * Log compliance events
   * @param {string} event - Compliance event type
   * @param {Object} metadata - Compliance metadata
   */
  async logComplianceEvent(event, metadata = {}) {
    return this.logOperation({
      category: 'COMPLIANCE',
      action: event,
      userId: metadata.userId,
      regulation: metadata.regulation, // HIPAA, SOX, etc.
      requirement: metadata.requirement,
      status: metadata.status, // COMPLIANT, NON_COMPLIANT, PENDING
      evidence: metadata.evidence,
      metadata
    });
  }

  /**
   * Process the log queue
   */
  async processLogQueue() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const logsToProcess = [...this.logQueue];
      this.logQueue = [];

      // Write to file
      await this.writeToFile(logsToProcess);

      // Write to database
      await this.writeToDatabase(logsToProcess);

    } catch (error) {
      console.error('Error processing audit logs:', error);
      // Re-add failed logs to queue
      this.logQueue.unshift(...logsToProcess);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Write audit logs to file
   * @param {Array} logs - Array of log entries
   */
  async writeToFile(logs) {
    const today = new Date().toISOString().split('T')[0];
    const filename = `audit-${today}.log`;
    const filepath = path.join(this.logDirectory, filename);

    const logLines = logs.map(log => JSON.stringify(log)).join('\\n') + '\\n';

    try {
      await fs.appendFile(filepath, logLines, 'utf8');
    } catch (error) {
      console.error('Failed to write audit logs to file:', error);
      throw error;
    }
  }

  /**
   * Write audit logs to database
   * @param {Array} logs - Array of log entries
   */
  async writeToDatabase(logs) {
    if (logs.length === 0) return;

    const query = `
      INSERT INTO audit_logs (
        id, timestamp, category, action, user_id, resource, resource_id,
        ip_address, user_agent, success, error_message, metadata, checksum
      ) VALUES ?
    `;

    const values = logs.map(log => [
      log.id,
      log.timestamp,
      log.category,
      log.action,
      log.userId,
      log.resource || null,
      log.resourceId || null,
      log.ipAddress || null,
      log.userAgent || null,
      log.success !== false,
      log.errorMessage || null,
      JSON.stringify(log.metadata || {}),
      log.checksum
    ]);

    try {
      await dbUtils.executeQuery(query, [values]);
    } catch (error) {
      console.error('Failed to write audit logs to database:', error);
      // Don't throw here to avoid losing file logs
    }
  }

  /**
   * Generate unique log ID
   */
  generateLogId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Generate checksum for log integrity
   * @param {Object} logEntry - Log entry without checksum
   */
  generateChecksum(logEntry) {
    const { checksum, ...entryWithoutChecksum } = logEntry;
    const content = JSON.stringify(entryWithoutChecksum, Object.keys(entryWithoutChecksum).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify log integrity
   * @param {Object} logEntry - Log entry with checksum
   */
  verifyIntegrity(logEntry) {
    const expectedChecksum = this.generateChecksum(logEntry);
    return logEntry.checksum === expectedChecksum;
  }

  /**
   * Search audit logs
   * @param {Object} criteria - Search criteria
   */
  async searchLogs(criteria = {}) {
    const {
      startDate,
      endDate,
      userId,
      category,
      action,
      resource,
      success,
      limit = 100,
      offset = 0
    } = criteria;

    let query = `
      SELECT * FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (resource) {
      query += ' AND resource = ?';
      params.push(resource);
    }

    if (success !== undefined) {
      query += ' AND success = ?';
      params.push(success);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const results = await dbUtils.executeQuery(query, params);
      
      // Parse metadata JSON
      return results.map(log => ({
        ...log,
        metadata: JSON.parse(log.metadata || '{}')
      }));
    } catch (error) {
      console.error('Error searching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   * @param {Object} criteria - Filter criteria
   */
  async getStatistics(criteria = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString()
    } = criteria;

    const queries = {
      totalLogs: `
        SELECT COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ?
      `,
      logsByCategory: `
        SELECT category, COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY category
      `,
      logsByAction: `
        SELECT action, COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `,
      failedOperations: `
        SELECT COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ? AND success = false
      `,
      topUsers: `
        SELECT user_id, COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ? AND user_id != 'SYSTEM'
        GROUP BY user_id
        ORDER BY count DESC
        LIMIT 10
      `,
      dailyActivity: `
        SELECT DATE(timestamp) as date, COUNT(*) as count FROM audit_logs 
        WHERE timestamp BETWEEN ? AND ?
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `
    };

    try {
      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        results[key] = await dbUtils.executeQuery(query, [startDate, endDate]);
      }

      return {
        period: { startDate, endDate },
        totalLogs: results.totalLogs[0]?.count || 0,
        failedOperations: results.failedOperations[0]?.count || 0,
        logsByCategory: results.logsByCategory,
        logsByAction: results.logsByAction,
        topUsers: results.topUsers,
        dailyActivity: results.dailyActivity,
        successRate: results.totalLogs[0]?.count > 0 
          ? ((results.totalLogs[0].count - results.failedOperations[0].count) / results.totalLogs[0].count * 100).toFixed(2)
          : 100
      };
    } catch (error) {
      console.error('Error getting audit statistics:', error);
      throw error;
    }
  }

  /**
   * Export audit logs for compliance
   * @param {Object} criteria - Export criteria
   */
  async exportLogs(criteria = {}) {
    const logs = await this.searchLogs({
      ...criteria,
      limit: 10000 // Large limit for export
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      criteria,
      totalRecords: logs.length,
      logs: logs.map(log => ({
        ...log,
        integrityVerified: this.verifyIntegrity(log)
      }))
    };

    return exportData;
  }

  /**
   * Archive old audit logs
   * @param {number} daysToKeep - Number of days to keep in active storage
   */
  async archiveLogs(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      // First, export logs to archive file
      const logsToArchive = await this.searchLogs({
        endDate: cutoffDate.toISOString(),
        limit: 50000
      });

      if (logsToArchive.length > 0) {
        const archiveFilename = `audit-archive-${cutoffDate.toISOString().split('T')[0]}.json`;
        const archivePath = path.join(this.logDirectory, 'archive', archiveFilename);
        
        await fs.mkdir(path.dirname(archivePath), { recursive: true });
        await fs.writeFile(archivePath, JSON.stringify(logsToArchive, null, 2));

        // Then delete from database
        const deleteQuery = 'DELETE FROM audit_logs WHERE timestamp < ?';
        const result = await dbUtils.executeQuery(deleteQuery, [cutoffDate.toISOString()]);

        console.log(`Archived ${logsToArchive.length} audit logs to ${archiveFilename}`);
        console.log(`Deleted ${result.affectedRows} records from database`);

        return {
          archived: logsToArchive.length,
          deleted: result.affectedRows,
          archiveFile: archiveFilename
        };
      }

      return { archived: 0, deleted: 0 };
    } catch (error) {
      console.error('Error archiving audit logs:', error);
      throw error;
    }
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

module.exports = {
  AuditLogger,
  auditLogger
};