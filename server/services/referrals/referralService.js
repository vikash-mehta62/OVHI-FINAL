const db = require('../../config/db');
const crypto = require('crypto');

/**
 * Comprehensive Referral Management Service
 * Core business logic for referral lifecycle management
 */

class ReferralService {
  constructor() {
    this.validStatuses = ['draft', 'pending', 'sent', 'scheduled', 'completed', 'cancelled', 'expired'];
    this.validUrgencyLevels = ['routine', 'urgent', 'stat'];
    this.validAppointmentTypes = ['consultation', 'treatment', 'second_opinion', 'procedure'];
  }

  /**
   * Create a new referral
   */
  async createReferral(referralData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Generate unique referral ID and number
      const referralId = this.generateReferralId();
      const referralNumber = await this.generateReferralNumber(connection);

      // Validate required fields
      this.validateReferralData(referralData);

      // Get specialist information if provided
      let specialistInfo = null;
      if (referralData.specialistId) {
        specialistInfo = await this.getSpecialistById(referralData.specialistId, connection);
        if (!specialistInfo) {
          throw new Error('Invalid specialist ID provided');
        }
      }

      // Create referral record
      const [result] = await connection.execute(`
        INSERT INTO referrals (
          id, referral_number, patient_id, provider_id, encounter_id,
          specialist_id, specialty_type, referral_reason, clinical_notes,
          urgency_level, appointment_type, status, authorization_required,
          expected_duration, preferred_appointment_time, follow_up_required,
          follow_up_instructions, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        referralId,
        referralNumber,
        referralData.patientId,
        referralData.providerId,
        referralData.encounterId || null,
        referralData.specialistId || null,
        referralData.specialtyType,
        referralData.referralReason,
        referralData.clinicalNotes || null,
        referralData.urgencyLevel || 'routine',
        referralData.appointmentType || 'consultation',
        'draft',
        referralData.authorizationRequired || false,
        referralData.expectedDuration || null,
        referralData.preferredAppointmentTime || null,
        referralData.followUpRequired !== false,
        referralData.followUpInstructions || null
      ]);

      // Add initial status history
      await this.addStatusHistory(referralId, null, 'draft', 'Referral created', userId, connection);

      // Handle attachments if provided
      if (referralData.attachments && referralData.attachments.length > 0) {
        await this.addAttachments(referralId, referralData.attachments, userId, connection);
      }

      // Check if authorization is required and create request
      if (referralData.authorizationRequired) {
        await this.createAuthorizationRequest(referralId, referralData, userId, connection);
      }

      await connection.commit();

      // Get complete referral data
      const referral = await this.getReferralById(referralId);

      // Log audit trail
      await this.logReferralAudit({
        userId,
        action: 'REFERRAL_CREATED',
        referralId,
        newValues: referral,
        ipAddress: referralData.ipAddress,
        userAgent: referralData.userAgent
      });

      return {
        success: true,
        referral,
        message: 'Referral created successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error creating referral:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update referral status with workflow validation
   */
  async updateReferralStatus(referralId, newStatus, notes, userId, options = {}) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current referral
      const currentReferral = await this.getReferralById(referralId, connection);
      if (!currentReferral) {
        throw new Error('Referral not found');
      }

      // Validate status transition
      this.validateStatusTransition(currentReferral.status, newStatus);

      // Update referral status
      const updateFields = ['status = ?', 'updated_at = NOW()'];
      const updateValues = [newStatus];

      // Add timestamp fields based on status
      if (newStatus === 'sent') {
        updateFields.push('sent_at = NOW()');
      } else if (newStatus === 'scheduled') {
        updateFields.push('scheduled_at = NOW()');
        if (options.scheduledDate) {
          updateFields.push('scheduled_date = ?');
          updateValues.push(options.scheduledDate);
        }
      } else if (newStatus === 'completed') {
        updateFields.push('completed_at = NOW()');
        if (options.completedDate) {
          updateFields.push('completed_date = ?');
          updateValues.push(options.completedDate);
        }
      }

      updateValues.push(referralId);

      await connection.execute(`
        UPDATE referrals 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      // Add status history
      await this.addStatusHistory(
        referralId, 
        currentReferral.status, 
        newStatus, 
        notes || `Status changed to ${newStatus}`, 
        userId, 
        connection
      );

      // Handle status-specific actions
      await this.handleStatusChangeActions(referralId, currentReferral.status, newStatus, options, connection);

      await connection.commit();

      // Get updated referral
      const updatedReferral = await this.getReferralById(referralId);

      // Log audit trail
      await this.logReferralAudit({
        userId,
        action: 'REFERRAL_STATUS_UPDATED',
        referralId,
        oldValues: { status: currentReferral.status },
        newValues: { status: newStatus },
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      });

      return {
        success: true,
        referral: updatedReferral,
        message: `Referral status updated to ${newStatus}`
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error updating referral status:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get referrals by provider with filtering and pagination
   */
  async getReferralsByProvider(providerId, filters = {}, pagination = {}) {
    try {
      const {
        status = null,
        specialtyType = null,
        urgencyLevel = null,
        patientId = null,
        startDate = null,
        endDate = null,
        searchTerm = null
      } = filters;

      const {
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = pagination;

      let query = `
        SELECT 
          r.*,
          s.name as specialist_name,
          s.practice_name,
          s.phone as specialist_phone,
          s.email as specialist_email,
          (SELECT COUNT(*) FROM referral_attachments WHERE referral_id = r.id) as attachment_count,
          (SELECT COUNT(*) FROM referral_status_history WHERE referral_id = r.id) as status_change_count
        FROM referrals r
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.provider_id = ?
      `;

      const params = [providerId];

      // Apply filters
      if (status) {
        if (Array.isArray(status)) {
          query += ` AND r.status IN (${status.map(() => '?').join(',')})`;
          params.push(...status);
        } else {
          query += ` AND r.status = ?`;
          params.push(status);
        }
      }

      if (specialtyType) {
        query += ` AND r.specialty_type = ?`;
        params.push(specialtyType);
      }

      if (urgencyLevel) {
        query += ` AND r.urgency_level = ?`;
        params.push(urgencyLevel);
      }

      if (patientId) {
        query += ` AND r.patient_id = ?`;
        params.push(patientId);
      }

      if (startDate) {
        query += ` AND r.created_at >= ?`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND r.created_at <= ?`;
        params.push(endDate);
      }

      if (searchTerm) {
        query += ` AND (r.referral_reason LIKE ? OR r.clinical_notes LIKE ? OR s.name LIKE ?)`;
        const searchPattern = `%${searchTerm}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Add sorting and pagination
      const validSortFields = ['created_at', 'updated_at', 'status', 'urgency_level', 'specialty_type'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      query += ` ORDER BY r.${sortField} ${order} LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [referrals] = await db.execute(query, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM referrals r
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.provider_id = ?
      `;

      const countParams = [providerId];
      
      // Apply same filters to count query
      if (status) {
        if (Array.isArray(status)) {
          countQuery += ` AND r.status IN (${status.map(() => '?').join(',')})`;
          countParams.push(...status);
        } else {
          countQuery += ` AND r.status = ?`;
          countParams.push(status);
        }
      }

      if (specialtyType) {
        countQuery += ` AND r.specialty_type = ?`;
        countParams.push(specialtyType);
      }

      if (urgencyLevel) {
        countQuery += ` AND r.urgency_level = ?`;
        countParams.push(urgencyLevel);
      }

      if (patientId) {
        countQuery += ` AND r.patient_id = ?`;
        countParams.push(patientId);
      }

      if (startDate) {
        countQuery += ` AND r.created_at >= ?`;
        countParams.push(startDate);
      }

      if (endDate) {
        countQuery += ` AND r.created_at <= ?`;
        countParams.push(endDate);
      }

      if (searchTerm) {
        countQuery += ` AND (r.referral_reason LIKE ? OR r.clinical_notes LIKE ? OR s.name LIKE ?)`;
        const searchPattern = `%${searchTerm}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }

      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;

      return {
        referrals,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };

    } catch (error) {
      console.error('Error getting referrals by provider:', error);
      throw error;
    }
  }

  /**
   * Get referrals by patient
   */
  async getReferralsByPatient(patientId, filters = {}) {
    try {
      const {
        status = null,
        limit = 20,
        offset = 0
      } = filters;

      let query = `
        SELECT 
          r.*,
          s.name as specialist_name,
          s.practice_name,
          s.phone as specialist_phone,
          s.email as specialist_email
        FROM referrals r
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.patient_id = ?
      `;

      const params = [patientId];

      if (status) {
        query += ` AND r.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [referrals] = await db.execute(query, params);
      return referrals;

    } catch (error) {
      console.error('Error getting referrals by patient:', error);
      throw error;
    }
  }

  /**
   * Get single referral by ID with complete details
   */
  async getReferralById(referralId, connection = null) {
    try {
      const conn = connection || db;

      const [referrals] = await conn.execute(`
        SELECT 
          r.*,
          s.name as specialist_name,
          s.practice_name,
          s.phone as specialist_phone,
          s.fax as specialist_fax,
          s.email as specialist_email,
          s.address_line1,
          s.address_line2,
          s.city,
          s.state,
          s.zip_code
        FROM referrals r
        LEFT JOIN referral_specialists s ON r.specialist_id = s.id
        WHERE r.id = ?
      `, [referralId]);

      if (referrals.length === 0) {
        return null;
      }

      const referral = referrals[0];

      // Get attachments
      const [attachments] = await conn.execute(`
        SELECT * FROM referral_attachments WHERE referral_id = ? ORDER BY created_at
      `, [referralId]);

      // Get status history
      const [statusHistory] = await conn.execute(`
        SELECT * FROM referral_status_history WHERE referral_id = ? ORDER BY changed_at DESC
      `, [referralId]);

      // Get authorization info if exists
      const [authorizations] = await conn.execute(`
        SELECT * FROM referral_authorizations WHERE referral_id = ? ORDER BY created_at DESC LIMIT 1
      `, [referralId]);

      return {
        ...referral,
        attachments,
        statusHistory,
        authorization: authorizations[0] || null
      };

    } catch (error) {
      console.error('Error getting referral by ID:', error);
      throw error;
    }
  }

  /**
   * Add attachments to referral
   */
  async addAttachments(referralId, attachments, userId, connection = null) {
    try {
      const conn = connection || db;

      for (const attachment of attachments) {
        const attachmentId = this.generateAttachmentId();
        
        await conn.execute(`
          INSERT INTO referral_attachments (
            id, referral_id, medical_record_id, file_name, file_path,
            file_type, file_size, attachment_type, description, uploaded_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          attachmentId,
          referralId,
          attachment.medicalRecordId || null,
          attachment.fileName,
          attachment.filePath,
          attachment.fileType,
          attachment.fileSize,
          attachment.attachmentType || 'document',
          attachment.description || null,
          userId
        ]);
      }

      return true;
    } catch (error) {
      console.error('Error adding attachments:', error);
      throw error;
    }
  }

  /**
   * Process authorization workflow
   */
  async processAuthorization(referralId, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const referral = await this.getReferralById(referralId, connection);
      if (!referral) {
        throw new Error('Referral not found');
      }

      if (!referral.authorization_required) {
        throw new Error('Authorization not required for this referral');
      }

      // Check if authorization already exists
      const [existingAuth] = await connection.execute(`
        SELECT * FROM referral_authorizations WHERE referral_id = ? AND status != 'cancelled'
      `, [referralId]);

      if (existingAuth.length > 0) {
        throw new Error('Authorization request already exists');
      }

      // Create authorization request
      const authId = this.generateAuthorizationId();
      await connection.execute(`
        INSERT INTO referral_authorizations (
          id, referral_id, authorization_type, request_date, requested_services,
          clinical_justification, status, submitted_method
        ) VALUES (?, ?, 'referral', CURDATE(), ?, ?, 'pending', 'online')
      `, [
        authId,
        referralId,
        JSON.stringify([referral.specialty_type]),
        referral.clinical_notes
      ]);

      // Update referral authorization status
      await connection.execute(`
        UPDATE referrals SET authorization_status = 'pending' WHERE id = ?
      `, [referralId]);

      await connection.commit();

      // Log audit trail
      await this.logReferralAudit({
        userId,
        action: 'AUTHORIZATION_REQUESTED',
        referralId,
        newValues: { authorizationId: authId, status: 'pending' }
      });

      return {
        success: true,
        authorizationId: authId,
        message: 'Authorization request submitted'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error processing authorization:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generate referral letter content
   */
  async generateReferralLetter(referralId, templateId = null) {
    try {
      const referral = await this.getReferralById(referralId);
      if (!referral) {
        throw new Error('Referral not found');
      }

      // Get template
      let template;
      if (templateId) {
        template = await this.getTemplateById(templateId);
      } else {
        template = await this.getDefaultTemplate(referral.specialty_type);
      }

      if (!template) {
        throw new Error('No suitable template found');
      }

      // Generate letter content
      const letterContent = await this.populateTemplate(template, referral);

      return {
        success: true,
        content: letterContent,
        template: template,
        referral: referral
      };

    } catch (error) {
      console.error('Error generating referral letter:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validate referral data
   */
  validateReferralData(data) {
    const required = ['patientId', 'providerId', 'specialtyType', 'referralReason'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.urgencyLevel && !this.validUrgencyLevels.includes(data.urgencyLevel)) {
      throw new Error('Invalid urgency level');
    }

    if (data.appointmentType && !this.validAppointmentTypes.includes(data.appointmentType)) {
      throw new Error('Invalid appointment type');
    }
  }

  /**
   * Validate status transitions
   */
  validateStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      'draft': ['pending', 'cancelled'],
      'pending': ['sent', 'cancelled'],
      'sent': ['scheduled', 'cancelled', 'expired'],
      'scheduled': ['completed', 'cancelled'],
      'completed': [], // Terminal state
      'cancelled': [], // Terminal state
      'expired': ['sent'] // Can resend
    };

    if (!this.validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }
  }

  /**
   * Add status history record
   */
  async addStatusHistory(referralId, previousStatus, newStatus, reason, userId, connection) {
    await connection.execute(`
      INSERT INTO referral_status_history (
        referral_id, previous_status, new_status, status_reason, changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [referralId, previousStatus, newStatus, reason, userId]);
  }

  /**
   * Handle status change actions
   */
  async handleStatusChangeActions(referralId, oldStatus, newStatus, options, connection) {
    // Status-specific business logic
    if (newStatus === 'sent') {
      // Mark letter as sent
      await connection.execute(`
        UPDATE referrals SET letter_sent = TRUE WHERE id = ?
      `, [referralId]);
    }

    if (newStatus === 'completed') {
      // Update specialist metrics
      await this.updateSpecialistMetrics(referralId, connection);
    }

    // Add more status-specific actions as needed
  }

  /**
   * Update specialist performance metrics
   */
  async updateSpecialistMetrics(referralId, connection) {
    const [referral] = await connection.execute(`
      SELECT specialist_id, created_at, completed_at FROM referrals WHERE id = ?
    `, [referralId]);

    if (referral.length > 0 && referral[0].specialist_id) {
      const specialistId = referral[0].specialist_id;
      
      // Update completion count
      await connection.execute(`
        UPDATE referral_specialists 
        SET completed_referrals = completed_referrals + 1
        WHERE id = ?
      `, [specialistId]);

      // Update daily metrics
      const today = new Date().toISOString().split('T')[0];
      await connection.execute(`
        INSERT INTO referral_specialist_metrics (
          specialist_id, metric_date, referrals_completed
        ) VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE referrals_completed = referrals_completed + 1
      `, [specialistId, today]);
    }
  }

  /**
   * Generate unique referral ID
   */
  generateReferralId() {
    return `REF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate unique attachment ID
   */
  generateAttachmentId() {
    return `ATT_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate unique authorization ID
   */
  generateAuthorizationId() {
    return `AUTH_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Generate sequential referral number
   */
  async generateReferralNumber(connection) {
    const [result] = await connection.execute(`
      UPDATE document_sequences 
      SET current_number = current_number + 1 
      WHERE document_type = 'referral'
    `);

    const [sequence] = await connection.execute(`
      SELECT * FROM document_sequences WHERE document_type = 'referral'
    `);

    if (sequence.length === 0) {
      throw new Error('Referral sequence not configured');
    }

    const seq = sequence[0];
    return `${seq.prefix}${String(seq.current_number).padStart(seq.number_length, '0')}${seq.suffix}`;
  }

  /**
   * Get specialist by ID
   */
  async getSpecialistById(specialistId, connection = null) {
    const conn = connection || db;
    const [specialists] = await conn.execute(`
      SELECT * FROM referral_specialists WHERE id = ? AND is_active = TRUE
    `, [specialistId]);

    return specialists[0] || null;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId) {
    const [templates] = await db.execute(`
      SELECT * FROM referral_templates WHERE id = ? AND is_active = TRUE
    `, [templateId]);

    return templates[0] || null;
  }

  /**
   * Get default template for specialty
   */
  async getDefaultTemplate(specialty) {
    const [templates] = await db.execute(`
      SELECT * FROM referral_templates 
      WHERE specialty = ? AND is_default = TRUE AND is_active = TRUE
      LIMIT 1
    `, [specialty]);

    if (templates.length === 0) {
      // Fallback to general template
      const [generalTemplates] = await db.execute(`
        SELECT * FROM referral_templates 
        WHERE specialty = 'General' AND is_default = TRUE AND is_active = TRUE
        LIMIT 1
      `);
      return generalTemplates[0] || null;
    }

    return templates[0];
  }

  /**
   * Populate template with referral data
   */
  async populateTemplate(template, referral) {
    let content = template.content_template;
    
    // Replace template variables
    const variables = JSON.parse(template.variables || '[]');
    
    for (const variable of variables) {
      const placeholder = `{{${variable}}}`;
      let value = '';

      // Map variables to referral data
      switch (variable) {
        case 'patient_name':
          value = `${referral.patient_firstname || ''} ${referral.patient_lastname || ''}`.trim();
          break;
        case 'patient_dob':
          value = referral.patient_dob || '';
          break;
        case 'specialist_name':
          value = referral.specialist_name || '';
          break;
        case 'specialty':
          value = referral.specialty_type || '';
          break;
        case 'referral_reason':
          value = referral.referral_reason || '';
          break;
        case 'clinical_notes':
          value = referral.clinical_notes || '';
          break;
        case 'provider_name':
          value = referral.provider_name || '';
          break;
        case 'provider_title':
          value = referral.provider_title || '';
          break;
        default:
          // Keep placeholder if no mapping found
          continue;
      }

      content = content.replace(new RegExp(placeholder, 'g'), value);
    }

    return content;
  }

  /**
   * Log referral audit trail
   */
  async logReferralAudit(auditData) {
    try {
      await db.execute(`
        INSERT INTO referral_audit_logs (
          referral_id, user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, 'referral', ?, ?, ?, ?, ?, NOW())
      `, [
        auditData.referralId,
        auditData.userId,
        auditData.action,
        auditData.referralId,
        JSON.stringify(auditData.oldValues || {}),
        JSON.stringify(auditData.newValues || {}),
        auditData.ipAddress || null,
        auditData.userAgent || null
      ]);
    } catch (error) {
      console.error('Error logging referral audit:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Create authorization request
   */
  async createAuthorizationRequest(referralId, referralData, userId, connection) {
    const authId = this.generateAuthorizationId();
    
    await connection.execute(`
      INSERT INTO referral_authorizations (
        id, referral_id, authorization_type, request_date, requested_services,
        clinical_justification, status
      ) VALUES (?, ?, 'referral', CURDATE(), ?, ?, 'pending')
    `, [
      authId,
      referralId,
      JSON.stringify([referralData.specialtyType]),
      referralData.clinicalNotes || referralData.referralReason
    ]);

    return authId;
  }
}

module.exports = new ReferralService();