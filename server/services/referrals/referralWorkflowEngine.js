const db = require('../../config/db');
const referralService = require('./referralService');

/**
 * Referral Workflow Engine
 * Manages complex referral workflows, business rules, and automated actions
 */

class ReferralWorkflowEngine {
  constructor() {
    this.workflowRules = new Map();
    this.automatedActions = new Map();
    this.initializeWorkflowRules();
  }

  /**
   * Initialize workflow rules and automated actions
   */
  initializeWorkflowRules() {
    // Status transition rules
    this.workflowRules.set('status_transitions', {
      'draft': {
        allowed: ['pending', 'cancelled'],
        conditions: {
          'pending': (referral) => this.validateReferralComplete(referral),
          'cancelled': () => true
        }
      },
      'pending': {
        allowed: ['sent', 'cancelled'],
        conditions: {
          'sent': (referral) => this.validateReadyToSend(referral),
          'cancelled': () => true
        }
      },
      'sent': {
        allowed: ['scheduled', 'cancelled', 'expired'],
        conditions: {
          'scheduled': (referral) => this.validateSchedulingInfo(referral),
          'cancelled': () => true,
          'expired': (referral) => this.checkExpirationConditions(referral)
        }
      },
      'scheduled': {
        allowed: ['completed', 'cancelled'],
        conditions: {
          'completed': (referral) => this.validateCompletionRequirements(referral),
          'cancelled': () => true
        }
      },
      'completed': {
        allowed: [],
        conditions: {}
      },
      'cancelled': {
        allowed: ['draft'], // Allow reactivation
        conditions: {
          'draft': (referral) => this.validateReactivation(referral)
        }
      },
      'expired': {
        allowed: ['sent', 'cancelled'],
        conditions: {
          'sent': (referral) => this.validateResend(referral),
          'cancelled': () => true
        }
      }
    });

    // Automated actions for status changes
    this.automatedActions.set('status_actions', {
      'pending': [
        this.checkAuthorizationRequirements,
        this.validateInsuranceEligibility,
        this.assignToWorkQueue
      ],
      'sent': [
        this.generateReferralLetter,
        this.sendNotifications,
        this.scheduleFollowUp,
        this.updateSpecialistMetrics
      ],
      'scheduled': [
        this.sendAppointmentConfirmation,
        this.createCalendarEvent,
        this.notifyProvider
      ],
      'completed': [
        this.requestOutcomeReport,
        this.updateQualityMetrics,
        this.processFollowUpActions,
        this.updateSpecialistRatings
      ],
      'cancelled': [
        this.notifyCancellation,
        this.updateMetrics,
        this.processRefunds
      ],
      'expired': [
        this.notifyExpiration,
        this.suggestAlternatives,
        this.updateMetrics
      ]
    });

    // Business rules for different scenarios
    this.workflowRules.set('urgency_rules', {
      'stat': {
        maxProcessingTime: 2, // hours
        requiredApprovals: ['attending_physician'],
        autoEscalation: true,
        priorityLevel: 1
      },
      'urgent': {
        maxProcessingTime: 24, // hours
        requiredApprovals: [],
        autoEscalation: true,
        priorityLevel: 2
      },
      'routine': {
        maxProcessingTime: 72, // hours
        requiredApprovals: [],
        autoEscalation: false,
        priorityLevel: 3
      }
    });

    // Authorization workflow rules
    this.workflowRules.set('authorization_rules', {
      'always_required': ['surgery', 'mri', 'ct_scan', 'specialist_procedure'],
      'insurance_dependent': ['physical_therapy', 'mental_health', 'specialist_consultation'],
      'never_required': ['emergency', 'preventive_care'],
      'auto_approve_conditions': {
        'routine_follow_up': true,
        'same_specialist_90_days': true,
        'preventive_screening': true
      }
    });
  }

  /**
   * Process referral through workflow engine
   */
  async processReferralWorkflow(referralId, action, actionData = {}, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current referral state
      const referral = await referralService.getReferralById(referralId, connection);
      if (!referral) {
        throw new Error('Referral not found');
      }

      // Process the action
      let result;
      switch (action) {
        case 'status_change':
          result = await this.processStatusChange(referral, actionData.newStatus, actionData, userId, connection);
          break;
        case 'authorization_update':
          result = await this.processAuthorizationUpdate(referral, actionData, userId, connection);
          break;
        case 'schedule_appointment':
          result = await this.processAppointmentScheduling(referral, actionData, userId, connection);
          break;
        case 'complete_referral':
          result = await this.processReferralCompletion(referral, actionData, userId, connection);
          break;
        case 'escalate':
          result = await this.processEscalation(referral, actionData, userId, connection);
          break;
        default:
          throw new Error(`Unknown workflow action: ${action}`);
      }

      await connection.commit();
      return result;

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Workflow processing error:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Process status change with workflow validation
   */
  async processStatusChange(referral, newStatus, actionData, userId, connection) {
    // Validate transition
    const transitionRules = this.workflowRules.get('status_transitions')[referral.status];
    if (!transitionRules || !transitionRules.allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${referral.status} to ${newStatus}`);
    }

    // Check conditions
    const condition = transitionRules.conditions[newStatus];
    if (condition && !await condition(referral)) {
      throw new Error(`Conditions not met for status change to ${newStatus}`);
    }

    // Apply business rules based on urgency
    await this.applyUrgencyRules(referral, newStatus);

    // Update status
    await connection.execute(`
      UPDATE referrals SET status = ?, updated_at = NOW() WHERE id = ?
    `, [newStatus, referral.id]);

    // Execute automated actions
    await this.executeAutomatedActions(referral, newStatus, actionData, userId, connection);

    // Log workflow event
    await this.logWorkflowEvent(referral.id, 'STATUS_CHANGE', {
      oldStatus: referral.status,
      newStatus: newStatus,
      actionData: actionData
    }, userId);

    return {
      success: true,
      newStatus: newStatus,
      message: `Referral status changed to ${newStatus}`
    };
  }

  /**
   * Process authorization workflow
   */
  async processAuthorizationUpdate(referral, actionData, userId, connection) {
    const { authorizationStatus, authorizationNumber, approvedVisits, expiryDate } = actionData;

    // Update authorization
    await connection.execute(`
      UPDATE referral_authorizations 
      SET status = ?, authorization_number = ?, approved_visits = ?, expiry_date = ?, updated_at = NOW()
      WHERE referral_id = ?
    `, [authorizationStatus, authorizationNumber, approvedVisits, expiryDate, referral.id]);

    // Update referral authorization status
    await connection.execute(`
      UPDATE referrals SET authorization_status = ? WHERE id = ?
    `, [authorizationStatus, referral.id]);

    // Handle authorization-specific actions
    if (authorizationStatus === 'approved') {
      // Auto-advance to next status if conditions are met
      if (referral.status === 'pending') {
        await this.processStatusChange(referral, 'sent', actionData, userId, connection);
      }
    } else if (authorizationStatus === 'denied') {
      // Handle denial workflow
      await this.processAuthorizationDenial(referral, actionData, userId, connection);
    }

    return {
      success: true,
      authorizationStatus: authorizationStatus,
      message: `Authorization ${authorizationStatus}`
    };
  }

  /**
   * Process appointment scheduling
   */
  async processAppointmentScheduling(referral, actionData, userId, connection) {
    const { scheduledDate, appointmentTime, confirmationNumber } = actionData;

    // Update referral with scheduling info
    await connection.execute(`
      UPDATE referrals 
      SET scheduled_date = ?, status = 'scheduled', scheduled_at = NOW()
      WHERE id = ?
    `, [scheduledDate, referral.id]);

    // Create appointment record (if integrated with scheduling system)
    await this.createAppointmentRecord(referral, actionData, connection);

    // Execute scheduling actions
    await this.executeAutomatedActions(referral, 'scheduled', actionData, userId, connection);

    return {
      success: true,
      scheduledDate: scheduledDate,
      message: 'Appointment scheduled successfully'
    };
  }

  /**
   * Process referral completion
   */
  async processReferralCompletion(referral, actionData, userId, connection) {
    const { outcomeNotes, followUpRequired, nextAppointment } = actionData;

    // Update referral completion
    await connection.execute(`
      UPDATE referrals 
      SET status = 'completed', completed_at = NOW(), outcome_notes = ?, outcome_received = TRUE
      WHERE id = ?
    `, [outcomeNotes, referral.id]);

    // Process follow-up requirements
    if (followUpRequired && nextAppointment) {
      await this.createFollowUpReferral(referral, nextAppointment, userId, connection);
    }

    // Execute completion actions
    await this.executeAutomatedActions(referral, 'completed', actionData, userId, connection);

    return {
      success: true,
      message: 'Referral completed successfully'
    };
  }

  /**
   * Process escalation workflow
   */
  async processEscalation(referral, actionData, userId, connection) {
    const { escalationReason, escalationLevel, assignedTo } = actionData;

    // Create escalation record
    await connection.execute(`
      INSERT INTO referral_escalations (
        referral_id, escalation_reason, escalation_level, escalated_by,
        assigned_to, created_at, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), 'active')
    `, [referral.id, escalationReason, escalationLevel, userId, assignedTo]);

    // Update referral priority
    await connection.execute(`
      UPDATE referrals SET urgency_level = 'urgent' WHERE id = ? AND urgency_level = 'routine'
    `, [referral.id]);

    // Send escalation notifications
    await this.sendEscalationNotifications(referral, actionData);

    return {
      success: true,
      message: 'Referral escalated successfully'
    };
  }

  /**
   * Execute automated actions for status changes
   */
  async executeAutomatedActions(referral, status, actionData, userId, connection) {
    const actions = this.automatedActions.get('status_actions')[status];
    if (!actions) return;

    for (const action of actions) {
      try {
        await action.call(this, referral, actionData, userId, connection);
      } catch (error) {
        console.error(`Automated action failed for ${status}:`, error);
        // Log but don't fail the main workflow
        await this.logWorkflowEvent(referral.id, 'AUTOMATED_ACTION_FAILED', {
          action: action.name,
          error: error.message
        }, userId);
      }
    }
  }

  /**
   * Apply urgency-based business rules
   */
  async applyUrgencyRules(referral, newStatus) {
    const urgencyRules = this.workflowRules.get('urgency_rules')[referral.urgency_level];
    if (!urgencyRules) return;

    // Check processing time limits
    if (urgencyRules.maxProcessingTime) {
      const createdTime = new Date(referral.created_at);
      const currentTime = new Date();
      const hoursElapsed = (currentTime - createdTime) / (1000 * 60 * 60);

      if (hoursElapsed > urgencyRules.maxProcessingTime && newStatus !== 'completed') {
        if (urgencyRules.autoEscalation) {
          await this.autoEscalate(referral, 'TIME_LIMIT_EXCEEDED');
        }
      }
    }
  }

  // Validation Methods

  /**
   * Validate referral is complete for processing
   */
  validateReferralComplete(referral) {
    return !!(
      referral.patient_id &&
      referral.provider_id &&
      referral.specialty_type &&
      referral.referral_reason &&
      (!referral.authorization_required || referral.authorization_status === 'approved')
    );
  }

  /**
   * Validate referral is ready to send
   */
  validateReadyToSend(referral) {
    return !!(
      this.validateReferralComplete(referral) &&
      (referral.specialist_id || referral.specialty_type) &&
      (!referral.authorization_required || referral.authorization_status === 'approved')
    );
  }

  /**
   * Validate scheduling information
   */
  validateSchedulingInfo(referral) {
    // This would integrate with scheduling system validation
    return true; // Simplified for now
  }

  /**
   * Validate completion requirements
   */
  validateCompletionRequirements(referral) {
    return !!(referral.scheduled_date && referral.status === 'scheduled');
  }

  /**
   * Check expiration conditions
   */
  checkExpirationConditions(referral) {
    const sentTime = new Date(referral.sent_at);
    const currentTime = new Date();
    const daysElapsed = (currentTime - sentTime) / (1000 * 60 * 60 * 24);
    
    return daysElapsed > 30; // 30 days without scheduling
  }

  /**
   * Validate reactivation conditions
   */
  validateReactivation(referral) {
    return referral.status === 'cancelled';
  }

  /**
   * Validate resend conditions
   */
  validateResend(referral) {
    return referral.status === 'expired';
  }

  // Automated Action Methods

  /**
   * Check authorization requirements
   */
  async checkAuthorizationRequirements(referral, actionData, userId, connection) {
    const authRules = this.workflowRules.get('authorization_rules');
    
    // Check if authorization is always required for this specialty
    if (authRules.always_required.includes(referral.specialty_type.toLowerCase())) {
      await connection.execute(`
        UPDATE referrals SET authorization_required = TRUE WHERE id = ?
      `, [referral.id]);
    }
  }

  /**
   * Validate insurance eligibility
   */
  async validateInsuranceEligibility(referral, actionData, userId, connection) {
    // This would integrate with insurance eligibility service
    console.log(`Validating insurance eligibility for referral ${referral.id}`);
  }

  /**
   * Assign to work queue
   */
  async assignToWorkQueue(referral, actionData, userId, connection) {
    const urgencyRules = this.workflowRules.get('urgency_rules')[referral.urgency_level];
    const queueName = `referral_queue_priority_${urgencyRules.priorityLevel}`;
    
    // Add to work queue (would integrate with queue system)
    console.log(`Assigned referral ${referral.id} to queue: ${queueName}`);
  }

  /**
   * Generate referral letter
   */
  async generateReferralLetter(referral, actionData, userId, connection) {
    try {
      const letterResult = await referralService.generateReferralLetter(referral.id);
      
      if (letterResult.success) {
        await connection.execute(`
          UPDATE referrals SET letter_generated = TRUE WHERE id = ?
        `, [referral.id]);
      }
    } catch (error) {
      console.error('Error generating referral letter:', error);
    }
  }

  /**
   * Send notifications
   */
  async sendNotifications(referral, actionData, userId, connection) {
    // This would integrate with notification service
    console.log(`Sending notifications for referral ${referral.id}`);
  }

  /**
   * Schedule follow-up
   */
  async scheduleFollowUp(referral, actionData, userId, connection) {
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 14); // 2 weeks follow-up
    
    // Create follow-up task (would integrate with task system)
    console.log(`Scheduled follow-up for referral ${referral.id} on ${followUpDate}`);
  }

  /**
   * Update specialist metrics
   */
  async updateSpecialistMetrics(referral, actionData, userId, connection) {
    if (referral.specialist_id) {
      const today = new Date().toISOString().split('T')[0];
      
      await connection.execute(`
        INSERT INTO referral_specialist_metrics (
          specialist_id, metric_date, referrals_received
        ) VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE referrals_received = referrals_received + 1
      `, [referral.specialist_id, today]);
    }
  }

  /**
   * Send appointment confirmation
   */
  async sendAppointmentConfirmation(referral, actionData, userId, connection) {
    // This would integrate with communication service
    console.log(`Sending appointment confirmation for referral ${referral.id}`);
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(referral, actionData, userId, connection) {
    // This would integrate with calendar system
    console.log(`Creating calendar event for referral ${referral.id}`);
  }

  /**
   * Notify provider
   */
  async notifyProvider(referral, actionData, userId, connection) {
    // This would integrate with notification system
    console.log(`Notifying provider for referral ${referral.id}`);
  }

  /**
   * Request outcome report
   */
  async requestOutcomeReport(referral, actionData, userId, connection) {
    // This would send request to specialist for outcome report
    console.log(`Requesting outcome report for referral ${referral.id}`);
  }

  /**
   * Update quality metrics
   */
  async updateQualityMetrics(referral, actionData, userId, connection) {
    const createdTime = new Date(referral.created_at);
    const completedTime = new Date();
    const totalDays = Math.ceil((completedTime - createdTime) / (1000 * 60 * 60 * 24));
    
    await connection.execute(`
      INSERT INTO referral_quality_metrics (
        referral_id, total_cycle_days, appointment_kept, outcome_received
      ) VALUES (?, ?, TRUE, TRUE)
    `, [referral.id, totalDays]);
  }

  /**
   * Process follow-up actions
   */
  async processFollowUpActions(referral, actionData, userId, connection) {
    if (referral.follow_up_required) {
      // Create follow-up tasks or appointments
      console.log(`Processing follow-up actions for referral ${referral.id}`);
    }
  }

  /**
   * Update specialist ratings
   */
  async updateSpecialistRatings(referral, actionData, userId, connection) {
    if (referral.specialist_id && actionData.patientSatisfactionScore) {
      await connection.execute(`
        UPDATE referral_specialists 
        SET patient_satisfaction_score = (
          (patient_satisfaction_score * completed_referrals + ?) / (completed_referrals + 1)
        )
        WHERE id = ?
      `, [actionData.patientSatisfactionScore, referral.specialist_id]);
    }
  }

  /**
   * Notify cancellation
   */
  async notifyCancellation(referral, actionData, userId, connection) {
    console.log(`Notifying cancellation for referral ${referral.id}`);
  }

  /**
   * Update metrics
   */
  async updateMetrics(referral, actionData, userId, connection) {
    console.log(`Updating metrics for referral ${referral.id}`);
  }

  /**
   * Process refunds
   */
  async processRefunds(referral, actionData, userId, connection) {
    console.log(`Processing refunds for referral ${referral.id}`);
  }

  /**
   * Notify expiration
   */
  async notifyExpiration(referral, actionData, userId, connection) {
    console.log(`Notifying expiration for referral ${referral.id}`);
  }

  /**
   * Suggest alternatives
   */
  async suggestAlternatives(referral, actionData, userId, connection) {
    console.log(`Suggesting alternatives for referral ${referral.id}`);
  }

  // Helper Methods

  /**
   * Auto-escalate referral
   */
  async autoEscalate(referral, reason) {
    console.log(`Auto-escalating referral ${referral.id} for reason: ${reason}`);
  }

  /**
   * Create appointment record
   */
  async createAppointmentRecord(referral, actionData, connection) {
    // This would integrate with appointment system
    console.log(`Creating appointment record for referral ${referral.id}`);
  }

  /**
   * Create follow-up referral
   */
  async createFollowUpReferral(referral, nextAppointment, userId, connection) {
    // This would create a new referral for follow-up
    console.log(`Creating follow-up referral for ${referral.id}`);
  }

  /**
   * Send escalation notifications
   */
  async sendEscalationNotifications(referral, actionData) {
    console.log(`Sending escalation notifications for referral ${referral.id}`);
  }

  /**
   * Process authorization denial
   */
  async processAuthorizationDenial(referral, actionData, userId, connection) {
    // Handle denial workflow - appeals, alternatives, etc.
    console.log(`Processing authorization denial for referral ${referral.id}`);
  }

  /**
   * Log workflow event
   */
  async logWorkflowEvent(referralId, eventType, eventData, userId) {
    try {
      await db.execute(`
        INSERT INTO referral_workflow_events (
          referral_id, event_type, event_data, created_by, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [referralId, eventType, JSON.stringify(eventData), userId]);
    } catch (error) {
      console.error('Error logging workflow event:', error);
    }
  }
}

module.exports = new ReferralWorkflowEngine();