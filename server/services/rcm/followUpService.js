/**
 * Follow-Up Service
 * Handles follow-up scheduling and management for claims
 */

const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');
const { createDatabaseError, createNotFoundError, createValidationError } = require('../../middleware/errorHandler');

class FollowUpService {
  constructor() {
    this.name = 'FollowUpService';
  }

  /**
   * Create a new follow-up task
   * @param {Object} followUpData - Follow-up data
   * @returns {Object} Created follow-up
   */
  async createFollowUp(followUpData) {
    try {
      const {
        claimId,
        assignedTo,
        followUpType,
        priority,
        dueDate,
        description,
        createdBy
      } = followUpData;

      const query = `
        INSERT INTO claim_followups (
          claim_id, assigned_to, follow_up_type, priority, 
          due_date, description, status, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NOW())
      `;

      const result = await executeQuery(query, [
        claimId, assignedTo, followUpType, priority,
        dueDate, description, createdBy
      ]);

      return await this.getFollowUpById(result.insertId);
    } catch (error) {
      throw createDatabaseError('Failed to create follow-up', {
        originalError: error.message,
        followUpData
      });
    }
  }

  /**
   * Get follow-up by ID
   * @param {number} followUpId - Follow-up ID
   * @returns {Object} Follow-up data
   */
  async getFollowUpById(followUpId) {
    try {
      const query = `
        SELECT 
          f.*,
          c.patient_id,
          c.amount as claim_amount,
          c.status as claim_status,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u1.username as assigned_to_name,
          u2.username as created_by_name
        FROM claim_followups f
        LEFT JOIN billings c ON f.claim_id = c.id
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u1 ON f.assigned_to = u1.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE f.id = ?
      `;

      const followUp = await executeQuerySingle(query, [followUpId]);
      
      if (!followUp) {
        throw createNotFoundError('Follow-up not found');
      }

      return followUp;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to get follow-up', {
        originalError: error.message,
        followUpId
      });
    }
  }

  /**
   * Get follow-ups for a claim
   * @param {number} claimId - Claim ID
   * @returns {Array} Follow-ups
   */
  async getClaimFollowUps(claimId) {
    try {
      const query = `
        SELECT 
          f.*,
          u1.username as assigned_to_name,
          u2.username as created_by_name
        FROM claim_followups f
        LEFT JOIN users u1 ON f.assigned_to = u1.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE f.claim_id = ?
        ORDER BY f.due_date ASC, f.priority DESC
      `;

      return await executeQuery(query, [claimId]);
    } catch (error) {
      throw createDatabaseError('Failed to get claim follow-ups', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get all follow-ups with filters
   * @param {Object} filters - Filter options
   * @returns {Array} Follow-ups
   */
  async getFollowUps(filters = {}) {
    try {
      let query = `
        SELECT 
          f.*,
          c.patient_id,
          c.amount as claim_amount,
          c.status as claim_status,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u1.username as assigned_to_name,
          u2.username as created_by_name
        FROM claim_followups f
        LEFT JOIN billings c ON f.claim_id = c.id
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u1 ON f.assigned_to = u1.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE 1=1
      `;

      const params = [];

      if (filters.status) {
        query += ' AND f.status = ?';
        params.push(filters.status);
      }

      if (filters.assignedTo) {
        query += ' AND f.assigned_to = ?';
        params.push(filters.assignedTo);
      }

      if (filters.followUpType) {
        query += ' AND f.follow_up_type = ?';
        params.push(filters.followUpType);
      }

      if (filters.priority) {
        query += ' AND f.priority = ?';
        params.push(filters.priority);
      }

      if (filters.dueDateFrom) {
        query += ' AND f.due_date >= ?';
        params.push(filters.dueDateFrom);
      }

      if (filters.dueDateTo) {
        query += ' AND f.due_date <= ?';
        params.push(filters.dueDateTo);
      }

      query += ' ORDER BY f.due_date ASC, f.priority DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get follow-ups', {
        originalError: error.message,
        filters
      });
    }
  }

  /**
   * Update follow-up
   * @param {number} followUpId - Follow-up ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated follow-up
   */
  async updateFollowUp(followUpId, updateData) {
    try {
      const allowedFields = [
        'assigned_to', 'follow_up_type', 'priority', 'due_date',
        'description', 'status', 'notes'
      ];

      const updates = [];
      const params = [];

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key) && updateData[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(updateData[key]);
        }
      });

      if (updates.length === 0) {
        throw createValidationError('No valid fields to update');
      }

      updates.push('updated_at = NOW()');
      params.push(followUpId);

      const query = `
        UPDATE claim_followups 
        SET ${updates.join(', ')}
        WHERE id = ?
      `;

      await executeQuery(query, params);

      return await this.getFollowUpById(followUpId);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to update follow-up', {
        originalError: error.message,
        followUpId,
        updateData
      });
    }
  }

  /**
   * Complete a follow-up task
   * @param {number} followUpId - Follow-up ID
   * @param {Object} completionData - Completion data
   * @returns {Object} Updated follow-up
   */
  async completeFollowUp(followUpId, completionData) {
    try {
      const { outcome, notes, completedBy } = completionData;

      const query = `
        UPDATE claim_followups 
        SET 
          status = 'completed',
          outcome = ?,
          notes = ?,
          completed_by = ?,
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [outcome, notes, completedBy, followUpId]);

      return await this.getFollowUpById(followUpId);
    } catch (error) {
      throw createDatabaseError('Failed to complete follow-up', {
        originalError: error.message,
        followUpId,
        completionData
      });
    }
  }

  /**
   * Delete follow-up
   * @param {number} followUpId - Follow-up ID
   * @returns {boolean} Success status
   */
  async deleteFollowUp(followUpId) {
    try {
      const query = 'DELETE FROM claim_followups WHERE id = ?';
      const result = await executeQuery(query, [followUpId]);

      if (result.affectedRows === 0) {
        throw createNotFoundError('Follow-up not found');
      }

      return true;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to delete follow-up', {
        originalError: error.message,
        followUpId
      });
    }
  }

  /**
   * Get overdue follow-ups
   * @returns {Array} Overdue follow-ups
   */
  async getOverdueFollowUps() {
    try {
      const query = `
        SELECT 
          f.*,
          c.patient_id,
          c.amount as claim_amount,
          c.status as claim_status,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u1.username as assigned_to_name,
          u2.username as created_by_name
        FROM claim_followups f
        LEFT JOIN billings c ON f.claim_id = c.id
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u1 ON f.assigned_to = u1.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE f.status IN ('pending', 'in_progress') 
        AND f.due_date < CURDATE()
        ORDER BY f.due_date ASC, f.priority DESC
      `;

      return await executeQuery(query);
    } catch (error) {
      throw createDatabaseError('Failed to get overdue follow-ups', {
        originalError: error.message
      });
    }
  }

  /**
   * Get follow-up statistics
   * @param {Object} filters - Filter options
   * @returns {Object} Statistics
   */
  async getFollowUpStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.assignedTo) {
        whereClause += ' AND assigned_to = ?';
        params.push(filters.assignedTo);
      }

      if (filters.dateFrom) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status IN ('pending', 'in_progress') AND due_date < CURDATE() THEN 1 ELSE 0 END) as overdue,
          AVG(CASE WHEN status = 'completed' THEN DATEDIFF(completed_at, created_at) END) as avg_completion_days
        FROM claim_followups 
        ${whereClause}
      `;

      const stats = await executeQuerySingle(query, params);

      // Get follow-ups by type
      const typeQuery = `
        SELECT 
          follow_up_type,
          COUNT(*) as count
        FROM claim_followups 
        ${whereClause}
        GROUP BY follow_up_type
        ORDER BY count DESC
      `;

      const typeStats = await executeQuery(typeQuery, params);

      return {
        ...stats,
        byType: typeStats
      };
    } catch (error) {
      throw createDatabaseError('Failed to get follow-up statistics', {
        originalError: error.message,
        filters
      });
    }
  }

  /**
   * Search follow-ups
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Array} Search results
   */
  async searchFollowUps(searchTerm, filters = {}) {
    try {
      let query = `
        SELECT 
          f.*,
          c.patient_id,
          c.amount as claim_amount,
          c.status as claim_status,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          u1.username as assigned_to_name,
          u2.username as created_by_name
        FROM claim_followups f
        LEFT JOIN billings c ON f.claim_id = c.id
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u1 ON f.assigned_to = u1.id
        LEFT JOIN users u2 ON f.created_by = u2.id
        WHERE (
          f.description LIKE ? OR
          f.notes LIKE ? OR
          CONCAT(p.first_name, ' ', p.last_name) LIKE ? OR
          f.follow_up_type LIKE ?
        )
      `;

      const params = [
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`,
        `%${searchTerm}%`
      ];

      if (filters.status) {
        query += ' AND f.status = ?';
        params.push(filters.status);
      }

      if (filters.assignedTo) {
        query += ' AND f.assigned_to = ?';
        params.push(filters.assignedTo);
      }

      query += ' ORDER BY f.due_date ASC, f.priority DESC LIMIT 50';

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to search follow-ups', {
        originalError: error.message,
        searchTerm,
        filters
      });
    }
  }

  /**
   * Get calendar events for follow-ups
   * @param {Object} filters - Filter options
   * @returns {Array} Calendar events
   */
  async getCalendarEvents(filters = {}) {
    try {
      let query = `
        SELECT 
          f.id,
          f.claim_id,
          f.follow_up_type as title,
          f.description,
          f.due_date as start,
          f.due_date as end,
          f.priority,
          f.status,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          u.username as assigned_to_name
        FROM claim_followups f
        LEFT JOIN billings c ON f.claim_id = c.id
        LEFT JOIN patients p ON c.patient_id = p.id
        LEFT JOIN users u ON f.assigned_to = u.id
        WHERE f.status IN ('pending', 'in_progress')
      `;

      const params = [];

      if (filters.assignedTo) {
        query += ' AND f.assigned_to = ?';
        params.push(filters.assignedTo);
      }

      if (filters.dateFrom) {
        query += ' AND f.due_date >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        query += ' AND f.due_date <= ?';
        params.push(filters.dateTo);
      }

      query += ' ORDER BY f.due_date ASC';

      return await executeQuery(query, params);
    } catch (error) {
      throw createDatabaseError('Failed to get calendar events', {
        originalError: error.message,
        filters
      });
    }
  }
}

module.exports = FollowUpService;