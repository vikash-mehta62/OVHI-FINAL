/**
 * Audit Trail Service
 * Comprehensive audit logging for compliance and regulatory requirements
 */

const ClaimHistoryService = require('./claimHistoryService');
const {
  executeQuery,
  executeQuerySingle
} = require('../../utils/dbUtils');
const {
  createDatabaseError
} = require('../../middleware/errorHandler');

class AuditTrailService {
  constructor() {
    this.name = 'AuditTrailService';
    this.historyService = new ClaimHistoryService();
  }

  /**
   * Log comprehensive audit entry
   * @param {Object} auditData - Audit entry data
   */
  async logAuditEntry(auditData) {
    try {
      const {
        entityType = 'claim',
        entityId,
        action,
        userId,
        userEmail,
        ipAddress,
        userAgent,
        sessionId,
        changes = {},
        metadata = {},
        complianceLevel = 'standard',
        riskLevel = 'low'
      } = auditData;

      // Log to compliance_logs table for regulatory audit trail
      const complianceLogQuery = `
        INSERT INTO compliance_logs (
          claim_id, log_type, compliance_status, details, user_id, system_generated, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      await executeQuery(complianceLogQuery, [
        entityType === 'claim' ? entityId : null,
        'audit_trail',
        this.getComplianceStatus(complianceLevel),
        JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          action,
          user_email: userEmail,
          ip_address: ipAddress,
          user_agent: userAgent,
          session_id: sessionId,
          changes,
          metadata,
          risk_level: riskLevel,
          timestamp: new Date().toISOString()
        }),
        userId,
        false
      ]);

      // If it's a claim-related action, also log to claim history
      if (entityType === 'claim' && entityId) {
        await this.historyService.logHistory({
          claimId: entityId,
          actionType: this.mapActionToHistoryType(action),
          userId,
          ipAddress,
          userAgent,
          sessionId,
          notes: this.generateAuditNotes(action, changes),
          metadata: {
            audit_level: complianceLevel,
            risk_level: riskLevel,
            changes,
            ...metadata
          }
        });
      }

      return true;
    } catch (error) {
      console.error('Error logging audit entry:', error);
      throw createDatabaseError('Failed to log audit entry', {
        originalError: error.message,
        auditData
      });
    }
  }

  /**
   * Log user access to sensitive data
   */
  async logDataAccess(accessData) {
    const {
      userId,
      userEmail,
      entityType,
      entityId,
      accessType = 'view',
      ipAddress,
      userAgent,
      sessionId,
      dataFields = [],
      justification
    } = accessData;

    return await this.logAuditEntry({
      entityType,
      entityId,
      action: `data_${accessType}`,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      sessionId,
      metadata: {
        accessed_fields: dataFields,
        access_justification: justification,
        data_sensitivity: this.assessDataSensitivity(dataFields)
      },
      complianceLevel: 'high',
      riskLevel: this.assessAccessRisk(accessType, dataFields)
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(securityData) {
    const {
      eventType,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      sessionId,
      severity = 'medium',
      details = {},
      entityType,
      entityId
    } = securityData;

    return await this.logAuditEntry({
      entityType: entityType || 'security',
      entityId: entityId || null,
      action: `security_${eventType}`,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      sessionId,
      metadata: {
        event_type: eventType,
        severity,
        security_details: details
      },
      complianceLevel: 'critical',
      riskLevel: severity
    });
  }

  /**
   * Log compliance violations
   */
  async logComplianceViolation(violationData) {
    const {
      violationType,
      description,
      userId,
      userEmail,
      ipAddress,
      userAgent,
      entityType,
      entityId,
      regulatoryReference,
      remedialAction
    } = violationData;

    return await this.logAuditEntry({
      entityType,
      entityId,
      action: 'compliance_violation',
      userId,
      userEmail,
      ipAddress,
      userAgent,
      metadata: {
        violation_type: violationType,
        description,
        regulatory_reference: regulatoryReference,
        remedial_action: remedialAction,
        violation_severity: this.assessViolationSeverity(violationType)
      },
      complianceLevel: 'critical',
      riskLevel: 'high'
    });
  }

  /**
   * Generate audit report for compliance
   */
  async generateAuditReport(reportOptions = {}) {
    try {
      const {
        startDate,
        endDate,
        entityType,
        entityId,
        userId,
        actionTypes = [],
        complianceLevel,
        riskLevel,
        includeDetails = true
      } = reportOptions;

      let whereConditions = [];
      let queryParams = [];

      if (startDate) {
        whereConditions.push('created_at >= ?');
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push('created_at <= ?');
        queryParams.push(endDate);
      }

      if (entityType) {
        whereConditions.push('JSON_EXTRACT(details, "$.entity_type") = ?');
        queryParams.push(entityType);
      }

      if (entityId) {
        whereConditions.push('JSON_EXTRACT(details, "$.entity_id") = ?');
        queryParams.push(entityId);
      }

      if (userId) {
        whereConditions.push('user_id = ?');
        queryParams.push(userId);
      }

      if (complianceLevel) {
        whereConditions.push('compliance_status = ?');
        queryParams.push(this.getComplianceStatus(complianceLevel));
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const reportQuery = `
        SELECT 
          id,
          claim_id,
          log_type,
          compliance_status,
          details,
          user_id,
          created_at
        FROM compliance_logs
        ${whereClause}
        ORDER BY created_at DESC
      `;

      const auditEntries = await executeQuery(reportQuery, queryParams);

      // Generate summary statistics
      const summaryQuery = `
        SELECT 
          compliance_status,
          COUNT(*) as entry_count,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(created_at) as earliest_entry,
          MAX(created_at) as latest_entry
        FROM compliance_logs
        ${whereClause}
        GROUP BY compliance_status
      `;

      const summary = await executeQuery(summaryQuery, queryParams);

      return {
        report_metadata: {
          generated_at: new Date().toISOString(),
          report_period: { start_date: startDate, end_date: endDate },
          total_entries: auditEntries.length,
          filters_applied: reportOptions
        },
        summary_statistics: summary,
        audit_entries: includeDetails ? auditEntries.map(entry => ({
          ...entry,
          details: JSON.parse(entry.details)
        })) : [],
        compliance_assessment: this.assessComplianceStatus(auditEntries)
      };
    } catch (error) {
      throw createDatabaseError('Failed to generate audit report', {
        originalError: error.message,
        reportOptions
      });
    }
  }

  /**
   * Get compliance status for regulatory requirements
   */
  async getComplianceStatus(timeframe = '30d') {
    try {
      const days = parseInt(timeframe.replace('d', ''));
      
      const complianceQuery = `
        SELECT 
          compliance_status,
          COUNT(*) as count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM compliance_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY compliance_status
      `;

      const complianceData = await executeQuery(complianceQuery, [days]);

      // Check for critical violations
      const violationsQuery = `
        SELECT COUNT(*) as violation_count
        FROM compliance_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND compliance_status = 'non_compliant'
        AND JSON_EXTRACT(details, '$.risk_level') = 'high'
      `;

      const violations = await executeQuerySingle(violationsQuery, [days]);

      return {
        timeframe: `${days} days`,
        compliance_breakdown: complianceData,
        critical_violations: violations.violation_count,
        overall_status: this.calculateOverallComplianceStatus(complianceData, violations.violation_count),
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to get compliance status', {
        originalError: error.message,
        timeframe
      });
    }
  }

  /**
   * Helper methods
   */

  getComplianceStatus(level) {
    const statusMap = {
      'standard': 'compliant',
      'high': 'review_required',
      'critical': 'non_compliant'
    };
    return statusMap[level] || 'compliant';
  }

  mapActionToHistoryType(action) {
    const actionMap = {
      'create': 'created',
      'update': 'updated',
      'delete': 'deleted',
      'submit': 'submitted',
      'approve': 'approved',
      'deny': 'denied',
      'data_view': 'viewed',
      'data_export': 'exported',
      'security_login': 'login',
      'security_logout': 'logout',
      'compliance_violation': 'violation'
    };
    return actionMap[action] || 'updated';
  }

  generateAuditNotes(action, changes) {
    if (Object.keys(changes).length === 0) {
      return `Action performed: ${action}`;
    }

    const changedFields = Object.keys(changes);
    return `${action} - Modified fields: ${changedFields.join(', ')}`;
  }

  assessDataSensitivity(fields) {
    const sensitiveFields = [
      'ssn', 'social_security_number', 'patient_id', 'medical_record_number',
      'diagnosis', 'procedure', 'payment_info', 'insurance_info'
    ];
    
    const hasSensitiveData = fields.some(field => 
      sensitiveFields.some(sensitive => field.toLowerCase().includes(sensitive))
    );
    
    return hasSensitiveData ? 'high' : 'standard';
  }

  assessAccessRisk(accessType, fields) {
    if (accessType === 'export' || accessType === 'bulk_access') {
      return 'high';
    }
    
    if (this.assessDataSensitivity(fields) === 'high') {
      return 'medium';
    }
    
    return 'low';
  }

  assessViolationSeverity(violationType) {
    const highSeverityTypes = [
      'unauthorized_access', 'data_breach', 'hipaa_violation',
      'cms_compliance_failure', 'security_breach'
    ];
    
    return highSeverityTypes.includes(violationType) ? 'high' : 'medium';
  }

  assessComplianceStatus(auditEntries) {
    const totalEntries = auditEntries.length;
    if (totalEntries === 0) {
      return { status: 'unknown', message: 'No audit entries found' };
    }

    const nonCompliantEntries = auditEntries.filter(entry => 
      JSON.parse(entry.details).risk_level === 'high'
    ).length;

    const complianceRate = ((totalEntries - nonCompliantEntries) / totalEntries) * 100;

    if (complianceRate >= 95) {
      return { status: 'excellent', rate: complianceRate, message: 'Excellent compliance' };
    } else if (complianceRate >= 85) {
      return { status: 'good', rate: complianceRate, message: 'Good compliance' };
    } else if (complianceRate >= 70) {
      return { status: 'needs_improvement', rate: complianceRate, message: 'Compliance needs improvement' };
    } else {
      return { status: 'poor', rate: complianceRate, message: 'Poor compliance - immediate attention required' };
    }
  }

  calculateOverallComplianceStatus(complianceData, criticalViolations) {
    if (criticalViolations > 0) {
      return 'critical_issues';
    }

    const nonCompliantPercentage = complianceData.find(item => 
      item.compliance_status === 'non_compliant'
    )?.percentage || 0;

    if (nonCompliantPercentage > 10) {
      return 'needs_attention';
    } else if (nonCompliantPercentage > 5) {
      return 'monitor';
    } else {
      return 'compliant';
    }
  }
}

module.exports = AuditTrailService;