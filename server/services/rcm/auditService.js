const db = require('../../config/db');
const crypto = require('crypto');

/**
 * Comprehensive Audit Trail Service
 * HIPAA-compliant audit logging for all RCM activities
 */

class AuditService {

  constructor() {
    this.sensitiveFields = [
      'ssn', 'social_security_number', 'dob', 'date_of_birth',
      'phone', 'email', 'address', 'member_id', 'policy_number',
      'credit_card', 'bank_account', 'routing_number'
    ];
  }

  /**
   * Log comprehensive audit entry
   */
  async logAudit({
    userId,
    action,
    entityType,
    entityId,
    patientId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    reason = null,
    riskLevel = 'LOW',
    additionalData = {}
  }) {
    try {
      // Sanitize sensitive data
      const sanitizedOldValues = this.sanitizeSensitiveData(oldValues);
      const sanitizedNewValues = this.sanitizeSensitiveData(newValues);

      // Generate audit hash for integrity
      const auditHash = this.generateAuditHash({
        userId, action, entityType, entityId, patientId,
        oldValues: sanitizedOldValues, newValues: sanitizedNewValues
      });

      // Insert audit record
      const [result] = await db.query(`
        INSERT INTO rcm_audit_comprehensive (
          user_id, action, entity_type, entity_id, patient_id,
          old_values, new_values, ip_address, user_agent, session_id,
          reason, risk_level, audit_hash, additional_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        userId, action, entityType, entityId, patientId,
        JSON.stringify(sanitizedOldValues), JSON.stringify(sanitizedNewValues),
        ipAddress, userAgent, sessionId, reason, riskLevel, auditHash,
        JSON.stringify(additionalData)
      ]);

      // Log high-risk activities separately
      if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
        await this.logHighRiskActivity({
          auditId: result.insertId,
          userId, action, entityType, entityId, patientId,
          riskLevel, reason, ipAddress
        });
      }

      // Check for suspicious patterns
      await this.checkSuspiciousActivity(userId, action, ipAddress);

      return {
        success: true,
        auditId: result.insertId,
        auditHash
      };

    } catch (error) {
      console.error('Audit logging failed:', error);
      // Critical: Audit failures should be logged to separate system
      await this.logAuditFailure(error, { userId, action, entityType, entityId });
      throw error;
    }
  }

  /**
   * Log patient data access (HIPAA requirement)
   */
  async logPatientAccess({
    userId,
    patientId,
    accessType,
    dataAccessed,
    purpose,
    ipAddress,
    userAgent,
    sessionId
  }) {
    return await this.logAudit({
      userId,
      action: `PATIENT_${accessType}`,
      entityType: 'patient',
      entityId: patientId,
      patientId,
      ipAddress,
      userAgent,
      sessionId,
      reason: purpose,
      riskLevel: this.calculateAccessRiskLevel(accessType, dataAccessed),
      additionalData: {
        dataAccessed,
        purpose,
        accessTimestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log financial transaction
   */
  async logFinancialTransaction({
    userId,
    transactionType,
    amount,
    patientId,
    claimId,
    paymentId,
    ipAddress,
    userAgent,
    sessionId,
    reason
  }) {
    const riskLevel = this.calculateFinancialRiskLevel(transactionType, amount);

    return await this.logAudit({
      userId,
      action: `FINANCIAL_${transactionType}`,
      entityType: 'financial_transaction',
      entityId: paymentId || claimId,
      patientId,
      ipAddress,
      userAgent,
      sessionId,
      reason,
      riskLevel,
      additionalData: {
        transactionType,
        amount,
        claimId,
        paymentId,
        transactionTimestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log system configuration changes
   */
  async logConfigurationChange({
    userId,
    configType,
    configKey,
    oldValue,
    newValue,
    ipAddress,
    userAgent,
    reason
  }) {
    return await this.logAudit({
      userId,
      action: 'CONFIGURATION_CHANGE',
      entityType: 'system_configuration',
      entityId: null,
      oldValues: { [configKey]: oldValue },
      newValues: { [configKey]: newValue },
      ipAddress,
      userAgent,
      reason,
      riskLevel: 'MEDIUM',
      additionalData: {
        configType,
        configKey,
        changeTimestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log authentication events
   */
  async logAuthenticationEvent({
    userId,
    eventType,
    success,
    ipAddress,
    userAgent,
    failureReason = null
  }) {
    const riskLevel = success ? 'LOW' : 'MEDIUM';

    return await this.logAudit({
      userId,
      action: `AUTH_${eventType}`,
      entityType: 'authentication',
      entityId: userId,
      ipAddress,
      userAgent,
      reason: failureReason,
      riskLevel,
      additionalData: {
        eventType,
        success,
        failureReason,
        authTimestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Sanitize sensitive data for audit logs
   */
  sanitizeSensitiveData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    for (const [key, value] of Object.entries(sanitized)) {
      if (this.isSensitiveField(key)) {
        sanitized[key] = this.maskSensitiveValue(value, key);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeSensitiveData(value);
      }
    }

    return sanitized;
  }

  /**
   * Check if field contains sensitive data
   */
  isSensitiveField(fieldName) {
    const lowerField = fieldName.toLowerCase();
    return this.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive) || 
      lowerField.includes('password') ||
      lowerField.includes('token') ||
      lowerField.includes('secret')
    );
  }

  /**
   * Mask sensitive values
   */
  maskSensitiveValue(value, fieldType) {
    if (!value) return value;

    const str = String(value);
    
    if (fieldType.toLowerCase().includes('ssn')) {
      return `***-**-${str.slice(-4)}`;
    } else if (fieldType.toLowerCase().includes('phone')) {
      return `***-***-${str.slice(-4)}`;
    } else if (fieldType.toLowerCase().includes('email')) {
      const [local, domain] = str.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    } else if (fieldType.toLowerCase().includes('card')) {
      return `****-****-****-${str.slice(-4)}`;
    } else {
      return str.length > 4 ? `***${str.slice(-4)}` : '***';
    }
  }

  /**
   * Generate audit hash for integrity verification
   */
  generateAuditHash(auditData) {
    const hashInput = JSON.stringify(auditData) + process.env.AUDIT_SALT || 'default_salt';
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Calculate access risk level
   */
  calculateAccessRiskLevel(accessType, dataAccessed) {
    if (accessType === 'BULK_EXPORT' || accessType === 'ADMIN_ACCESS') {
      return 'HIGH';
    }
    
    if (dataAccessed?.includes('financial') || dataAccessed?.includes('payment')) {
      return 'MEDIUM';
    }
    
    if (accessType === 'VIEW' && dataAccessed?.length === 1) {
      return 'LOW';
    }
    
    return 'MEDIUM';
  }

  /**
   * Calculate financial transaction risk level
   */
  calculateFinancialRiskLevel(transactionType, amount) {
    const numAmount = parseFloat(amount) || 0;
    
    if (transactionType === 'REFUND' || transactionType === 'ADJUSTMENT') {
      return 'HIGH';
    }
    
    if (numAmount > 10000) {
      return 'HIGH';
    } else if (numAmount > 1000) {
      return 'MEDIUM';
    }
    
    return 'LOW';
  }

  /**
   * Log high-risk activities to separate table
   */
  async logHighRiskActivity({
    auditId, userId, action, entityType, entityId, patientId,
    riskLevel, reason, ipAddress
  }) {
    await db.query(`
      INSERT INTO rcm_high_risk_audit (
        audit_id, user_id, action, entity_type, entity_id, patient_id,
        risk_level, reason, ip_address, flagged_at, requires_review
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), TRUE)
    `, [auditId, userId, action, entityType, entityId, patientId, riskLevel, reason, ipAddress]);

    // Send alert for critical activities
    if (riskLevel === 'CRITICAL') {
      await this.sendCriticalActivityAlert({
        userId, action, entityType, entityId, patientId, reason, ipAddress
      });
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(userId, action, ipAddress) {
    // Check for rapid successive actions
    const [recentActions] = await db.query(`
      SELECT COUNT(*) as action_count
      FROM rcm_audit_comprehensive
      WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `, [userId]);

    if (recentActions[0].action_count > 50) {
      await this.flagSuspiciousActivity({
        userId, 
        suspicionType: 'RAPID_ACTIONS',
        details: `${recentActions[0].action_count} actions in 5 minutes`,
        ipAddress
      });
    }

    // Check for unusual IP addresses
    const [ipHistory] = await db.query(`
      SELECT COUNT(DISTINCT ip_address) as ip_count
      FROM rcm_audit_comprehensive
      WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [userId]);

    if (ipHistory[0].ip_count > 5) {
      await this.flagSuspiciousActivity({
        userId,
        suspicionType: 'MULTIPLE_IPS',
        details: `${ipHistory[0].ip_count} different IP addresses in 24 hours`,
        ipAddress
      });
    }
  }

  /**
   * Flag suspicious activity
   */
  async flagSuspiciousActivity({ userId, suspicionType, details, ipAddress }) {
    await db.query(`
      INSERT INTO rcm_suspicious_activity (
        user_id, suspicion_type, details, ip_address, flagged_at, status
      ) VALUES (?, ?, ?, ?, NOW(), 'PENDING_REVIEW')
    `, [userId, suspicionType, details, ipAddress]);

    // Send security alert
    await this.sendSecurityAlert({
      userId, suspicionType, details, ipAddress
    });
  }

  /**
   * Get audit trail for entity
   */
  async getAuditTrail(entityType, entityId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      userId = null,
      actions = null,
      limit = 100,
      offset = 0
    } = options;

    let query = `
      SELECT 
        a.*,
        u.firstname,
        u.lastname,
        u.email
      FROM rcm_audit_comprehensive a
      LEFT JOIN user_profiles u ON a.user_id = u.fk_userid
      WHERE a.entity_type = ? AND a.entity_id = ?
    `;
    
    const params = [entityType, entityId];

    if (startDate) {
      query += ` AND a.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.created_at <= ?`;
      params.push(endDate);
    }

    if (userId) {
      query += ` AND a.user_id = ?`;
      params.push(userId);
    }

    if (actions && actions.length > 0) {
      query += ` AND a.action IN (${actions.map(() => '?').join(',')})`;
      params.push(...actions);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [auditTrail] = await db.query(query, params);
    return auditTrail;
  }

  /**
   * Get patient access history (HIPAA requirement)
   */
  async getPatientAccessHistory(patientId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      limit = 50
    } = options;

    let query = `
      SELECT 
        a.*,
        u.firstname,
        u.lastname,
        u.email,
        u.role
      FROM rcm_audit_comprehensive a
      LEFT JOIN user_profiles u ON a.user_id = u.fk_userid
      WHERE a.patient_id = ? AND a.action LIKE 'PATIENT_%'
    `;
    
    const params = [patientId];

    if (startDate) {
      query += ` AND a.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.created_at <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(limit);

    const [accessHistory] = await db.query(query, params);
    return accessHistory;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate, endDate) {
    const [report] = await db.query(`
      SELECT 
        DATE(created_at) as audit_date,
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT patient_id) as patients_accessed,
        COUNT(CASE WHEN risk_level = 'HIGH' THEN 1 END) as high_risk_activities,
        COUNT(CASE WHEN risk_level = 'CRITICAL' THEN 1 END) as critical_activities,
        COUNT(CASE WHEN action LIKE 'PATIENT_%' THEN 1 END) as patient_access_count,
        COUNT(CASE WHEN action LIKE 'FINANCIAL_%' THEN 1 END) as financial_activities
      FROM rcm_audit_comprehensive
      WHERE created_at BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY audit_date DESC
    `, [startDate, endDate]);

    return report;
  }

  /**
   * Verify audit integrity
   */
  async verifyAuditIntegrity(auditId) {
    const [audit] = await db.query(`
      SELECT * FROM rcm_audit_comprehensive WHERE id = ?
    `, [auditId]);

    if (!audit.length) {
      return { valid: false, reason: 'Audit record not found' };
    }

    const auditRecord = audit[0];
    const expectedHash = this.generateAuditHash({
      userId: auditRecord.user_id,
      action: auditRecord.action,
      entityType: auditRecord.entity_type,
      entityId: auditRecord.entity_id,
      patientId: auditRecord.patient_id,
      oldValues: JSON.parse(auditRecord.old_values || '{}'),
      newValues: JSON.parse(auditRecord.new_values || '{}')
    });

    return {
      valid: expectedHash === auditRecord.audit_hash,
      reason: expectedHash === auditRecord.audit_hash ? 'Valid' : 'Hash mismatch - possible tampering'
    };
  }

  /**
   * Log audit failure (critical system function)
   */
  async logAuditFailure(error, auditData) {
    try {
      // Log to separate failure table that doesn't depend on main audit system
      await db.query(`
        INSERT INTO rcm_audit_failures (
          error_message, audit_data, failed_at, severity
        ) VALUES (?, ?, NOW(), 'CRITICAL')
      `, [error.message, JSON.stringify(auditData)]);
    } catch (failureError) {
      // If even failure logging fails, write to file system
      console.error('CRITICAL: Audit system completely failed:', failureError);
      // In production, this should write to a separate logging system
    }
  }

  /**
   * Send critical activity alert
   */
  async sendCriticalActivityAlert(alertData) {
    // Implementation would send alerts via email, SMS, or monitoring system
    console.warn('CRITICAL ACTIVITY DETECTED:', alertData);
    
    // Store alert for dashboard
    await db.query(`
      INSERT INTO rcm_security_alerts (
        alert_type, user_id, details, created_at, status
      ) VALUES ('CRITICAL_ACTIVITY', ?, ?, NOW(), 'ACTIVE')
    `, [alertData.userId, JSON.stringify(alertData)]);
  }

  /**
   * Send security alert
   */
  async sendSecurityAlert(alertData) {
    console.warn('SECURITY ALERT:', alertData);
    
    await db.query(`
      INSERT INTO rcm_security_alerts (
        alert_type, user_id, details, created_at, status
      ) VALUES ('SUSPICIOUS_ACTIVITY', ?, ?, NOW(), 'ACTIVE')
    `, [alertData.userId, JSON.stringify(alertData)]);
  }
}

module.exports = new AuditService();