/**
 * Claim History Service
 * Handles comprehensive audit trail and history tracking for claims
 */

const {
  executeQuery,
  executeQuerySingle,
  executeQueryWithPagination,
  auditLog
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const { formatDate } = require('../../utils/rcmUtils');

class ClaimHistoryService {
  constructor() {
    this.name = 'ClaimHistoryService';
  }

  /**
   * Log a history entry for a claim
   * @param {Object} historyData - History entry data
   * @returns {Object} Created history entry
   */
  async logHistory(historyData) {
    try {
      const {
        claimId,
        actionType,
        fieldName,
        oldValue,
        newValue,
        userId,
        ipAddress,
        userAgent,
        sessionId,
        notes,
        metadata
      } = historyData;

      const insertQuery = `
        INSERT INTO claim_history (
          claim_id, action_type, field_name, old_value, new_value,
          user_id, ip_address, user_agent, session_id, notes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(insertQuery, [
        claimId,
        actionType,
        fieldName || null,
        oldValue || null,
        newValue || null,
        userId,
        ipAddress || null,
        userAgent || null,
        sessionId || null,
        notes || null,
        metadata ? JSON.stringify(metadata) : null
      ]);

      return await this.getHistoryEntry(result.insertId);
    } catch (error) {
      throw createDatabaseError('Failed to log claim history', {
        originalError: error.message,
        historyData
      });
    }
  }

  /**
   * Get complete history for a claim
   * @param {number} claimId - Claim ID
   * @param {Object} options - Query options
   * @returns {Object} Claim history with pagination
   */
  async getClaimHistory(claimId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        actionType,
        userId,
        dateFrom,
        dateTo,
        includeMetadata = true
      } = options;

      // Verify claim exists
      const claimExists = await executeQuerySingle(
        'SELECT id FROM billings WHERE id = ?',
        [claimId]
      );

      if (!claimExists) {
        throw createNotFoundError('Claim not found');
      }

      let whereConditions = ['ch.claim_id = ?'];
      let queryParams = [claimId];

      // Add filters
      if (actionType) {
        whereConditions.push('ch.action_type = ?');
        queryParams.push(actionType);
      }

      if (userId) {
        whereConditions.push('ch.user_id = ?');
        queryParams.push(userId);
      }

      if (dateFrom) {
        whereConditions.push('DATE(ch.timestamp) >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('DATE(ch.timestamp) <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          ch.*,
          u.first_name,
          u.last_name,
          u.email as user_email
        FROM claim_history ch
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ch.timestamp DESC
      `;

      // Create count query for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM claim_history ch
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ${whereClause}
      `;

      const result = await executeQueryWithPagination(query, countQuery, queryParams, { page, limit });

      // Format history entries
      const formattedHistory = result.data.map(entry => ({
        ...entry,
        timestamp: formatDate(entry.timestamp),
        user_name: entry.first_name && entry.last_name 
          ? `${entry.first_name} ${entry.last_name}` 
          : 'System',
        metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
        formatted_action: this.formatActionType(entry.action_type),
        change_summary: this.generateChangeSummary(entry)
      }));

      return {
        history: formattedHistory,
        pagination: result.pagination,
        summary: await this.getHistorySummary(claimId)
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to fetch claim history', {
        originalError: error.message,
        claimId,
        options
      });
    }
  }

  /**
   * Get a single history entry
   * @param {number} historyId - History entry ID
   * @returns {Object} History entry
   */
  async getHistoryEntry(historyId) {
    try {
      const query = `
        SELECT 
          ch.*,
          u.first_name,
          u.last_name,
          u.email as user_email
        FROM claim_history ch
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.id = ?
      `;

      const entry = await executeQuerySingle(query, [historyId]);

      if (!entry) {
        throw createNotFoundError('History entry not found');
      }

      return {
        ...entry,
        timestamp: formatDate(entry.timestamp),
        user_name: entry.first_name && entry.last_name 
          ? `${entry.first_name} ${entry.last_name}` 
          : 'System',
        metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
        formatted_action: this.formatActionType(entry.action_type),
        change_summary: this.generateChangeSummary(entry)
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to fetch history entry', {
        originalError: error.message,
        historyId
      });
    }
  }

  /**
   * Get history summary statistics
   * @param {number} claimId - Claim ID
   * @returns {Object} History summary
   */
  async getHistorySummary(claimId) {
    try {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(timestamp) as first_entry,
          MAX(timestamp) as last_entry,
          action_type,
          COUNT(*) as action_count
        FROM claim_history 
        WHERE claim_id = ?
        GROUP BY action_type
        ORDER BY action_count DESC
      `;

      const actionSummary = await executeQuery(summaryQuery, [claimId]);

      const totalQuery = `
        SELECT 
          COUNT(*) as total_entries,
          COUNT(DISTINCT user_id) as unique_users,
          MIN(timestamp) as first_entry,
          MAX(timestamp) as last_entry
        FROM claim_history 
        WHERE claim_id = ?
      `;

      const totals = await executeQuerySingle(totalQuery, [claimId]);

      return {
        total_entries: totals.total_entries || 0,
        unique_users: totals.unique_users || 0,
        first_entry: totals.first_entry ? formatDate(totals.first_entry) : null,
        last_entry: totals.last_entry ? formatDate(totals.last_entry) : null,
        action_breakdown: actionSummary.map(action => ({
          action_type: action.action_type,
          count: action.action_count,
          formatted_action: this.formatActionType(action.action_type)
        }))
      };
    } catch (error) {
      throw createDatabaseError('Failed to generate history summary', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Export claim history
   * @param {number} claimId - Claim ID
   * @param {Object} options - Export options
   * @returns {Object} Export data
   */
  async exportHistory(claimId, options = {}) {
    try {
      const {
        format = 'json',
        includeMetadata = true,
        dateFrom,
        dateTo
      } = options;

      const history = await this.getClaimHistory(claimId, {
        page: 1,
        limit: 10000, // Large limit for export
        dateFrom,
        dateTo,
        includeMetadata
      });

      const exportData = {
        claim_id: claimId,
        export_date: new Date().toISOString(),
        total_entries: history.pagination.total,
        summary: history.summary,
        history: history.history
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData.history);
      }

      return exportData;
    } catch (error) {
      throw createDatabaseError('Failed to export claim history', {
        originalError: error.message,
        claimId,
        options
      });
    }
  }

  /**
   * Log claim status change
   * @param {number} claimId - Claim ID
   * @param {number} oldStatus - Previous status
   * @param {number} newStatus - New status
   * @param {number} userId - User making the change
   * @param {string} reason - Reason for status change
   * @param {Object} metadata - Additional metadata
   */
  async logStatusChange(claimId, oldStatus, newStatus, userId, reason, metadata = {}) {
    const statusNames = {
      0: 'Draft',
      1: 'Submitted',
      2: 'Paid',
      3: 'Denied',
      4: 'Appealed'
    };

    return await this.logHistory({
      claimId,
      actionType: 'status_changed',
      fieldName: 'status',
      oldValue: statusNames[oldStatus] || oldStatus.toString(),
      newValue: statusNames[newStatus] || newStatus.toString(),
      userId,
      notes: reason || `Status changed from ${statusNames[oldStatus]} to ${statusNames[newStatus]}`,
      metadata: {
        old_status_code: oldStatus,
        new_status_code: newStatus,
        ...metadata
      }
    });
  }

  /**
   * Log claim submission
   * @param {number} claimId - Claim ID
   * @param {number} userId - User submitting
   * @param {Object} submissionData - Submission details
   */
  async logSubmission(claimId, userId, submissionData = {}) {
    return await this.logHistory({
      claimId,
      actionType: submissionData.isResubmission ? 'resubmitted' : 'submitted',
      userId,
      notes: submissionData.isResubmission ? 'Claim resubmitted' : 'Claim submitted',
      metadata: {
        clearinghouse: submissionData.clearinghouse,
        batch_id: submissionData.batchId,
        submission_id: submissionData.submissionId,
        payer: submissionData.payer
      }
    });
  }

  /**
   * Log form generation
   * @param {number} claimId - Claim ID
   * @param {string} formType - Form type (CMS1500, UB04)
   * @param {number} userId - User generating form
   * @param {Object} generationData - Generation details
   */
  async logFormGeneration(claimId, formType, userId, generationData = {}) {
    return await this.logHistory({
      claimId,
      actionType: 'form_generated',
      fieldName: formType.toLowerCase() + '_generated',
      newValue: 'true',
      userId,
      notes: `${formType} form generated`,
      metadata: {
        form_type: formType,
        template_version: generationData.templateVersion,
        file_path: generationData.filePath,
        generation_time_ms: generationData.generationTime
      }
    });
  }

  /**
   * Format action type for display
   * @private
   */
  formatActionType(actionType) {
    const actionMap = {
      'created': 'Claim Created',
      'updated': 'Claim Updated',
      'submitted': 'Claim Submitted',
      'resubmitted': 'Claim Resubmitted',
      'paid': 'Payment Received',
      'denied': 'Claim Denied',
      'appealed': 'Appeal Filed',
      'voided': 'Claim Voided',
      'corrected': 'Claim Corrected',
      'status_changed': 'Status Changed',
      'validated': 'CMS Validation',
      'form_generated': 'Form Generated',
      'comment_added': 'Comment Added',
      'followup_scheduled': 'Follow-up Scheduled'
    };

    return actionMap[actionType] || actionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Generate change summary for history entry
   * @private
   */
  generateChangeSummary(entry) {
    if (entry.field_name && entry.old_value && entry.new_value) {
      return `Changed ${entry.field_name} from "${entry.old_value}" to "${entry.new_value}"`;
    }
    
    if (entry.notes) {
      return entry.notes;
    }

    return this.formatActionType(entry.action_type);
  }

  /**
   * Convert history to CSV format
   * @private
   */
  convertToCSV(history) {
    const headers = [
      'Timestamp', 'Action', 'Field', 'Old Value', 'New Value', 
      'User', 'Notes', 'IP Address'
    ];

    const rows = history.map(entry => [
      entry.timestamp,
      entry.formatted_action,
      entry.field_name || '',
      entry.old_value || '',
      entry.new_value || '',
      entry.user_name,
      entry.notes || '',
      entry.ip_address || ''
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Get recent activity across all claims
   * @param {Object} options - Query options
   * @returns {Array} Recent activity entries
   */
  async getRecentActivity(options = {}) {
    try {
      const {
        limit = 50,
        userId,
        actionTypes = [],
        hours = 24
      } = options;

      let whereConditions = ['ch.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)'];
      let queryParams = [hours];

      if (userId) {
        whereConditions.push('ch.user_id = ?');
        queryParams.push(userId);
      }

      if (actionTypes.length > 0) {
        whereConditions.push(`ch.action_type IN (${actionTypes.map(() => '?').join(',')})`);
        queryParams.push(...actionTypes);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          ch.*,
          b.patient_id,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          u.first_name as user_first_name,
          u.last_name as user_last_name
        FROM claim_history ch
        LEFT JOIN billings b ON ch.claim_id = b.id
        LEFT JOIN patients p ON b.patient_id = p.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ${whereClause}
        ORDER BY ch.timestamp DESC
        LIMIT ?
      `;

      queryParams.push(limit);

      const activities = await executeQuery(query, queryParams);

      return activities.map(activity => ({
        ...activity,
        timestamp: formatDate(activity.timestamp),
        user_name: activity.user_first_name && activity.user_last_name 
          ? `${activity.user_first_name} ${activity.user_last_name}` 
          : 'System',
        formatted_action: this.formatActionType(activity.action_type),
        change_summary: this.generateChangeSummary(activity)
      }));
    } catch (error) {
      throw createDatabaseError('Failed to fetch recent activity', {
        originalError: error.message,
        options
      });
    }
  }
}

module.exports = ClaimHistoryService;