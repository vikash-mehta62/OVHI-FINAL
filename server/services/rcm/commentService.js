/**
 * Comment Service
 * Handles threaded conversations, file attachments, and notifications for claims
 */

const {
  executeQuery,
  executeQuerySingle,
  executeQueryWithPagination
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const { formatDate } = require('../../utils/rcmUtils');
const ClaimHistoryService = require('./claimHistoryService');
const path = require('path');
const fs = require('fs').promises;

class CommentService {
  constructor() {
    this.name = 'CommentService';
    this.historyService = new ClaimHistoryService();
    this.allowedFileTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.txt', '.csv', '.xlsx'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @param {Array} files - Uploaded files
   * @returns {Object} Created comment
   */
  async createComment(commentData, files = []) {
    try {
      const {
        claimId,
        parentCommentId,
        userId,
        commentText,
        commentType = 'internal',
        isPrivate = false,
        priority = 'medium',
        mentions = []
      } = commentData;

      // Validate claim exists
      const claimExists = await executeQuerySingle(
        'SELECT id FROM billings WHERE id = ?',
        [claimId]
      );

      if (!claimExists) {
        throw createNotFoundError('Claim not found');
      }

      // Validate parent comment if provided
      if (parentCommentId) {
        const parentComment = await executeQuerySingle(
          'SELECT id, claim_id FROM claim_comments WHERE id = ? AND claim_id = ?',
          [parentCommentId, claimId]
        );

        if (!parentComment) {
          throw createNotFoundError('Parent comment not found');
        }
      }

      // Process file attachments
      let attachments = [];
      if (files && files.length > 0) {
        attachments = await this.processAttachments(files, claimId);
      }

      // Create comment
      const insertQuery = `
        INSERT INTO claim_comments (
          claim_id, parent_comment_id, user_id, comment_text, comment_type,
          is_private, priority, attachments, mentions, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      `;

      const result = await executeQuery(insertQuery, [
        claimId,
        parentCommentId || null,
        userId,
        commentText,
        commentType,
        isPrivate,
        priority,
        attachments.length > 0 ? JSON.stringify(attachments) : null,
        mentions.length > 0 ? JSON.stringify(mentions) : null
      ]);

      const commentId = result.insertId;

      // Log comment creation in history
      await this.historyService.logHistory({
        claimId,
        actionType: 'comment_added',
        fieldName: 'comments',
        newValue: commentText.substring(0, 100) + (commentText.length > 100 ? '...' : ''),
        userId,
        notes: `${commentType} comment added${parentCommentId ? ' as reply' : ''}`,
        metadata: {
          comment_id: commentId,
          comment_type: commentType,
          is_private: isPrivate,
          priority,
          has_attachments: attachments.length > 0,
          mentions_count: mentions.length
        }
      });

      // Send notifications for mentions
      if (mentions.length > 0) {
        await this.sendMentionNotifications(commentId, mentions, userId);
      }

      // Get the created comment with user details
      return await this.getCommentById(commentId);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to create comment', {
        originalError: error.message,
        commentData
      });
    }
  }

  /**
   * Get comments for a claim with threading
   * @param {number} claimId - Claim ID
   * @param {Object} options - Query options
   * @returns {Object} Comments with pagination
   */
  async getClaimComments(claimId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        commentType,
        priority,
        status = 'active',
        search,
        showPrivate = true,
        userId
      } = options;

      // Verify claim exists
      const claimExists = await executeQuerySingle(
        'SELECT id FROM billings WHERE id = ?',
        [claimId]
      );

      if (!claimExists) {
        throw createNotFoundError('Claim not found');
      }

      let whereConditions = ['cc.claim_id = ?', 'cc.parent_comment_id IS NULL'];
      let queryParams = [claimId];

      // Add filters
      if (commentType) {
        whereConditions.push('cc.comment_type = ?');
        queryParams.push(commentType);
      }

      if (priority) {
        whereConditions.push('cc.priority = ?');
        queryParams.push(priority);
      }

      if (status) {
        whereConditions.push('cc.status = ?');
        queryParams.push(status);
      }

      if (!showPrivate) {
        whereConditions.push('cc.is_private = FALSE');
      }

      if (search) {
        whereConditions.push('cc.comment_text LIKE ?');
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          cc.*,
          u.first_name,
          u.last_name,
          u.email as user_email,
          u.avatar_url as user_avatar
        FROM claim_comments cc
        LEFT JOIN users u ON cc.user_id = u.id
        WHERE ${whereClause}
        ORDER BY cc.created_at DESC
      `;

      const result = await executeQueryWithPagination(query, queryParams, page, limit);

      // Get replies for each comment
      const commentsWithReplies = await Promise.all(
        result.data.map(async (comment) => {
          const replies = await this.getCommentReplies(comment.id, { showPrivate, userId });
          return {
            ...this.formatComment(comment, userId),
            replies
          };
        })
      );

      return {
        comments: commentsWithReplies,
        pagination: result.pagination,
        total: result.pagination.total
      };
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to fetch claim comments', {
        originalError: error.message,
        claimId,
        options
      });
    }
  }

  /**
   * Get replies for a comment
   * @param {number} parentCommentId - Parent comment ID
   * @param {Object} options - Query options
   * @returns {Array} Reply comments
   */
  async getCommentReplies(parentCommentId, options = {}) {
    try {
      const { showPrivate = true, userId } = options;

      let whereConditions = ['cc.parent_comment_id = ?', 'cc.status = ?'];
      let queryParams = [parentCommentId, 'active'];

      if (!showPrivate) {
        whereConditions.push('cc.is_private = FALSE');
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          cc.*,
          u.first_name,
          u.last_name,
          u.email as user_email,
          u.avatar_url as user_avatar
        FROM claim_comments cc
        LEFT JOIN users u ON cc.user_id = u.id
        WHERE ${whereClause}
        ORDER BY cc.created_at ASC
      `;

      const replies = await executeQuery(query, queryParams);

      return replies.map(reply => this.formatComment(reply, userId));
    } catch (error) {
      throw createDatabaseError('Failed to fetch comment replies', {
        originalError: error.message,
        parentCommentId
      });
    }
  }

  /**
   * Update a comment
   * @param {number} commentId - Comment ID
   * @param {Object} updateData - Update data
   * @param {number} userId - User making the update
   * @returns {Object} Updated comment
   */
  async updateComment(commentId, updateData, userId) {
    try {
      const { commentText, priority, status } = updateData;

      // Get existing comment
      const existingComment = await this.getCommentById(commentId);
      if (!existingComment) {
        throw createNotFoundError('Comment not found');
      }

      // Check permissions
      if (existingComment.user_id !== userId && !this.hasAdminPermissions(userId)) {
        throw createValidationError('Not authorized to edit this comment');
      }

      // Build update query
      let updateFields = [];
      let updateParams = [];

      if (commentText !== undefined) {
        updateFields.push('comment_text = ?');
        updateParams.push(commentText);
      }

      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateParams.push(priority);
      }

      if (status !== undefined) {
        updateFields.push('status = ?');
        updateParams.push(status);
      }

      updateFields.push('updated_at = NOW()');
      updateParams.push(commentId);

      const updateQuery = `
        UPDATE claim_comments 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;

      await executeQuery(updateQuery, updateParams);

      // Log the update
      await this.historyService.logHistory({
        claimId: existingComment.claim_id,
        actionType: 'updated',
        fieldName: 'comment',
        oldValue: existingComment.comment_text.substring(0, 100),
        newValue: commentText ? commentText.substring(0, 100) : existingComment.comment_text.substring(0, 100),
        userId,
        notes: 'Comment updated',
        metadata: {
          comment_id: commentId,
          updated_fields: updateFields.filter(f => !f.includes('updated_at'))
        }
      });

      return await this.getCommentById(commentId);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to update comment', {
        originalError: error.message,
        commentId,
        updateData
      });
    }
  }

  /**
   * Delete a comment
   * @param {number} commentId - Comment ID
   * @param {number} userId - User making the deletion
   * @returns {boolean} Success status
   */
  async deleteComment(commentId, userId) {
    try {
      // Get existing comment
      const existingComment = await this.getCommentById(commentId);
      if (!existingComment) {
        throw createNotFoundError('Comment not found');
      }

      // Check permissions
      if (existingComment.user_id !== userId && !this.hasAdminPermissions(userId)) {
        throw createValidationError('Not authorized to delete this comment');
      }

      // Soft delete the comment
      await executeQuery(
        'UPDATE claim_comments SET status = ?, updated_at = NOW() WHERE id = ?',
        ['archived', commentId]
      );

      // Also archive replies
      await executeQuery(
        'UPDATE claim_comments SET status = ?, updated_at = NOW() WHERE parent_comment_id = ?',
        ['archived', commentId]
      );

      // Log the deletion
      await this.historyService.logHistory({
        claimId: existingComment.claim_id,
        actionType: 'updated',
        fieldName: 'comment',
        oldValue: existingComment.comment_text.substring(0, 100),
        newValue: '[deleted]',
        userId,
        notes: 'Comment deleted',
        metadata: {
          comment_id: commentId,
          action: 'delete'
        }
      });

      return true;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to delete comment', {
        originalError: error.message,
        commentId
      });
    }
  }

  /**
   * Get a single comment by ID
   * @param {number} commentId - Comment ID
   * @returns {Object} Comment details
   */
  async getCommentById(commentId) {
    try {
      const query = `
        SELECT 
          cc.*,
          u.first_name,
          u.last_name,
          u.email as user_email,
          u.avatar_url as user_avatar
        FROM claim_comments cc
        LEFT JOIN users u ON cc.user_id = u.id
        WHERE cc.id = ?
      `;

      const comment = await executeQuerySingle(query, [commentId]);

      if (!comment) {
        return null;
      }

      return this.formatComment(comment);
    } catch (error) {
      throw createDatabaseError('Failed to fetch comment', {
        originalError: error.message,
        commentId
      });
    }
  }

  /**
   * Process file attachments
   * @param {Array} files - Uploaded files
   * @param {number} claimId - Claim ID
   * @returns {Array} Processed attachment data
   */
  async processAttachments(files, claimId) {
    const attachments = [];
    const uploadDir = path.join(process.cwd(), 'uploads', 'comments', claimId.toString());

    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      // Validate file type
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (!this.allowedFileTypes.includes(fileExt)) {
        throw createValidationError(`File type ${fileExt} is not allowed`);
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        throw createValidationError(`File ${file.originalname} exceeds maximum size limit`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${timestamp}_${file.originalname}`;
      const filepath = path.join(uploadDir, filename);

      // Save file
      await fs.writeFile(filepath, file.buffer);

      attachments.push({
        original_name: file.originalname,
        filename: filename,
        filepath: filepath,
        size: file.size,
        mimetype: file.mimetype,
        uploaded_at: new Date().toISOString()
      });
    }

    return attachments;
  }

  /**
   * Send mention notifications
   * @param {number} commentId - Comment ID
   * @param {Array} mentions - Mentioned user emails
   * @param {number} fromUserId - User who made the mention
   */
  async sendMentionNotifications(commentId, mentions, fromUserId) {
    try {
      // Get mentioned users
      const mentionedUsers = await executeQuery(
        'SELECT id, email, first_name, last_name FROM users WHERE email IN (?)',
        [mentions]
      );

      // Get comment details
      const comment = await this.getCommentById(commentId);

      for (const user of mentionedUsers) {
        // Create notification record (you would implement a notifications table)
        // For now, we'll just log it
        console.log(`Notification: ${user.email} mentioned in comment ${commentId}`);
        
        // In a real implementation, you would:
        // 1. Insert into notifications table
        // 2. Send email notification
        // 3. Send in-app notification
        // 4. Possibly send SMS or other notifications
      }
    } catch (error) {
      console.error('Error sending mention notifications:', error);
      // Don't throw error to avoid breaking comment creation
    }
  }

  /**
   * Get comment statistics
   * @param {number} claimId - Claim ID (optional)
   * @returns {Object} Comment statistics
   */
  async getCommentStatistics(claimId = null) {
    try {
      let whereClause = '';
      let queryParams = [];

      if (claimId) {
        whereClause = 'WHERE claim_id = ?';
        queryParams.push(claimId);
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_comments,
          COUNT(DISTINCT user_id) as unique_commenters,
          COUNT(CASE WHEN comment_type = 'internal' THEN 1 END) as internal_comments,
          COUNT(CASE WHEN comment_type = 'external' THEN 1 END) as external_comments,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_comments,
          COUNT(CASE WHEN is_private = TRUE THEN 1 END) as private_comments,
          COUNT(CASE WHEN attachments IS NOT NULL THEN 1 END) as comments_with_attachments,
          AVG(CHAR_LENGTH(comment_text)) as avg_comment_length
        FROM claim_comments
        ${whereClause}
        AND status = 'active'
      `;

      const stats = await executeQuerySingle(statsQuery, queryParams);

      // Get recent activity
      const recentActivityQuery = `
        SELECT 
          DATE(created_at) as activity_date,
          COUNT(*) as comment_count
        FROM claim_comments
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        AND status = 'active'
        GROUP BY DATE(created_at)
        ORDER BY activity_date DESC
      `;

      const recentActivity = await executeQuery(recentActivityQuery, queryParams);

      return {
        statistics: stats,
        recent_activity: recentActivity
      };
    } catch (error) {
      throw createDatabaseError('Failed to get comment statistics', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Search comments
   * @param {Object} searchOptions - Search parameters
   * @returns {Object} Search results
   */
  async searchComments(searchOptions) {
    try {
      const {
        query,
        claimId,
        userId,
        commentType,
        priority,
        dateFrom,
        dateTo,
        page = 1,
        limit = 20
      } = searchOptions;

      let whereConditions = ['cc.status = ?'];
      let queryParams = ['active'];

      if (query) {
        whereConditions.push('cc.comment_text LIKE ?');
        queryParams.push(`%${query}%`);
      }

      if (claimId) {
        whereConditions.push('cc.claim_id = ?');
        queryParams.push(claimId);
      }

      if (userId) {
        whereConditions.push('cc.user_id = ?');
        queryParams.push(userId);
      }

      if (commentType) {
        whereConditions.push('cc.comment_type = ?');
        queryParams.push(commentType);
      }

      if (priority) {
        whereConditions.push('cc.priority = ?');
        queryParams.push(priority);
      }

      if (dateFrom) {
        whereConditions.push('DATE(cc.created_at) >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('DATE(cc.created_at) <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');

      const searchQuery = `
        SELECT 
          cc.*,
          u.first_name,
          u.last_name,
          u.email as user_email,
          b.patient_id,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name
        FROM claim_comments cc
        LEFT JOIN users u ON cc.user_id = u.id
        LEFT JOIN billings b ON cc.claim_id = b.id
        LEFT JOIN patients p ON b.patient_id = p.id
        WHERE ${whereClause}
        ORDER BY cc.created_at DESC
      `;

      const result = await executeQueryWithPagination(searchQuery, queryParams, page, limit);

      return {
        results: result.data.map(comment => this.formatComment(comment)),
        pagination: result.pagination
      };
    } catch (error) {
      throw createDatabaseError('Failed to search comments', {
        originalError: error.message,
        searchOptions
      });
    }
  }

  /**
   * Format comment for API response
   * @private
   */
  formatComment(comment, currentUserId = null) {
    return {
      ...comment,
      created_at: formatDate(comment.created_at),
      updated_at: formatDate(comment.updated_at),
      user_name: comment.first_name && comment.last_name 
        ? `${comment.first_name} ${comment.last_name}` 
        : 'Unknown User',
      attachments: comment.attachments ? JSON.parse(comment.attachments) : [],
      mentions: comment.mentions ? JSON.parse(comment.mentions) : [],
      can_edit: currentUserId === comment.user_id || this.hasAdminPermissions(currentUserId),
      can_delete: currentUserId === comment.user_id || this.hasAdminPermissions(currentUserId)
    };
  }

  /**
   * Check if user has admin permissions
   * @private
   */
  hasAdminPermissions(userId) {
    // In a real implementation, you would check user roles/permissions
    // For now, return false
    return false;
  }
}

module.exports = CommentService;