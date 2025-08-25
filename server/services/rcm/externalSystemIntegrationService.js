/**
 * External System Integration Service
 * Handles integrations with CMS systems, clearinghouses, payers, and other external systems
 */

const axios = require('axios');
const {
  executeQuery,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const { formatDate } = require('../../utils/rcmUtils');

class ExternalSystemIntegrationService {
  constructor() {
    this.name = 'ExternalSystemIntegrationService';
    
    // Integration configurations
    this.integrations = {
      cms: {
        eligibility_url: process.env.CMS_ELIGIBILITY_URL || 'https://api.cms.gov/eligibility',
        api_key: process.env.CMS_API_KEY,
        timeout: 30000,
        retry_attempts: 3
      },
      clearinghouse: {
        submission_url: process.env.CLEARINGHOUSE_URL || 'https://api.clearinghouse.com/submit',
        api_key: process.env.CLEARINGHOUSE_API_KEY,
        timeout: 60000,
        retry_attempts: 2
      },
      prior_auth: {
        url: process.env.PRIOR_AUTH_URL || 'https://api.priorauth.com',
        api_key: process.env.PRIOR_AUTH_API_KEY,
        timeout: 45000,
        retry_attempts: 3
      },
      era_processor: {
        url: process.env.ERA_PROCESSOR_URL || 'https://api.era.com',
        api_key: process.env.ERA_PROCESSOR_API_KEY,
        timeout: 30000,
        retry_attempts: 2
      }
    };
    
    // Connection status tracking
    this.connectionStatus = new Map();
    
    // Initialize connection monitoring
    this.initializeConnectionMonitoring();
  }

  /**
   * Verify patient eligibility with CMS systems
   * @param {Object} patientData - Patient information
   * @param {Object} options - Verification options
   * @returns {Object} Eligibility verification result
   */
  async verifyEligibility(patientData, options = {}) {
    try {
      const integrationId = 'cms_eligibility';
      
      // Validate required patient data
      this.validatePatientData(patientData);
      
      // Prepare eligibility request
      const eligibilityRequest = {
        patient: {
          member_id: patientData.member_id,
          first_name: patientData.first_name,
          last_name: patientData.last_name,
          date_of_birth: patientData.date_of_birth,
          gender: patientData.gender
        },
        payer: {
          payer_id: patientData.payer_id,
          payer_name: patientData.payer_name
        },
        provider: {
          npi: patientData.provider_npi,
          taxonomy: patientData.provider_taxonomy
        },
        service_date: options.service_date || new Date().toISOString().split('T')[0]
      };
      
      // Make eligibility verification request
      const response = await this.makeIntegrationRequest(
        integrationId,
        'POST',
        '/verify',
        eligibilityRequest
      );
      
      // Process and store eligibility response
      const eligibilityResult = this.processEligibilityResponse(response.data);
      
      // Log eligibility verification
      await this.logIntegrationActivity(integrationId, 'eligibility_verification', {
        patient_id: patientData.patient_id,
        request: eligibilityRequest,
        response: eligibilityResult,
        status: eligibilityResult.eligible ? 'success' : 'eligible_with_issues'
      });
      
      return eligibilityResult;
    } catch (error) {
      throw createDatabaseError('Eligibility verification failed', {
        originalError: error.message,
        patientData
      });
    }
  }

  /**
   * Submit prior authorization request
   * @param {Object} authRequest - Prior authorization request data
   * @returns {Object} Prior authorization result
   */
  async submitPriorAuthorization(authRequest) {
    try {
      const integrationId = 'prior_auth';
      
      // Validate authorization request
      this.validatePriorAuthRequest(authRequest);
      
      // Prepare prior auth request
      const priorAuthData = {
        patient: authRequest.patient,
        provider: authRequest.provider,
        services: authRequest.services,
        diagnosis: authRequest.diagnosis,
        clinical_information: authRequest.clinical_information,
        urgency: authRequest.urgency || 'routine'
      };
      
      // Submit prior authorization
      const response = await this.makeIntegrationRequest(
        integrationId,
        'POST',
        '/authorize',
        priorAuthData
      );
      
      // Process authorization response
      const authResult = this.processPriorAuthResponse(response.data);
      
      // Store authorization result
      await this.storePriorAuthResult(authRequest.claim_id, authResult);
      
      // Log prior authorization activity
      await this.logIntegrationActivity(integrationId, 'prior_authorization', {
        claim_id: authRequest.claim_id,
        auth_number: authResult.authorization_number,
        status: authResult.status,
        response: authResult
      });
      
      return authResult;
    } catch (error) {
      throw createDatabaseError('Prior authorization submission failed', {
        originalError: error.message,
        authRequest
      });
    }
  }

  /**
   * Submit claim to clearinghouse
   * @param {number} claimId - Claim ID to submit
   * @param {Object} options - Submission options
   * @returns {Object} Submission result
   */
  async submitClaimToClearinghouse(claimId, options = {}) {
    try {
      const integrationId = 'clearinghouse';
      
      // Get claim data for submission
      const claimData = await this.getClaimDataForSubmission(claimId);
      
      // Validate claim data
      this.validateClaimForSubmission(claimData);
      
      // Prepare claim submission
      const submissionData = {
        claim: this.formatClaimForSubmission(claimData),
        submission_options: {
          format: options.format || 'X12_837',
          test_mode: options.test_mode || false,
          priority: options.priority || 'normal'
        }
      };
      
      // Submit claim to clearinghouse
      const response = await this.makeIntegrationRequest(
        integrationId,
        'POST',
        '/submit',
        submissionData
      );
      
      // Process submission response
      const submissionResult = this.processSubmissionResponse(response.data);
      
      // Update claim with submission information
      await this.updateClaimSubmissionStatus(claimId, submissionResult);
      
      // Log claim submission
      await this.logIntegrationActivity(integrationId, 'claim_submission', {
        claim_id: claimId,
        submission_id: submissionResult.submission_id,
        status: submissionResult.status,
        response: submissionResult
      });
      
      return submissionResult;
    } catch (error) {
      throw createDatabaseError('Claim submission to clearinghouse failed', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Query payer for claim status
   * @param {Object} statusRequest - Status inquiry request
   * @returns {Object} Claim status result
   */
  async queryPayerClaimStatus(statusRequest) {
    try {
      const integrationId = 'payer_inquiry';
      
      // Prepare status inquiry
      const inquiryData = {
        claim_id: statusRequest.claim_id,
        payer_claim_number: statusRequest.payer_claim_number,
        patient: statusRequest.patient,
        provider: statusRequest.provider,
        service_date: statusRequest.service_date
      };
      
      // Query payer system
      const response = await this.makeIntegrationRequest(
        integrationId,
        'POST',
        '/status',
        inquiryData
      );
      
      // Process status response
      const statusResult = this.processStatusResponse(response.data);
      
      // Update claim status if changed
      if (statusResult.status_changed) {
        await this.updateClaimStatus(statusRequest.claim_id, statusResult);
      }
      
      // Log status inquiry
      await this.logIntegrationActivity(integrationId, 'status_inquiry', {
        claim_id: statusRequest.claim_id,
        payer_claim_number: statusRequest.payer_claim_number,
        status: statusResult.claim_status,
        response: statusResult
      });
      
      return statusResult;
    } catch (error) {
      throw createDatabaseError('Payer status inquiry failed', {
        originalError: error.message,
        statusRequest
      });
    }
  }

  /**
   * Process ERA/EOB files
   * @param {Object} eraData - ERA file data
   * @returns {Object} Processing result
   */
  async processERAFile(eraData) {
    try {
      const integrationId = 'era_processor';
      
      // Validate ERA data
      this.validateERAData(eraData);
      
      // Process ERA file
      const processingData = {
        era_file: eraData.file_content,
        format: eraData.format || 'X12_835',
        payer_id: eraData.payer_id,
        processing_options: {
          auto_post_payments: eraData.auto_post || false,
          create_adjustments: eraData.create_adjustments || true,
          update_claim_status: eraData.update_status || true
        }
      };
      
      // Submit for processing
      const response = await this.makeIntegrationRequest(
        integrationId,
        'POST',
        '/process',
        processingData
      );
      
      // Process ERA response
      const processingResult = this.processERAResponse(response.data);
      
      // Apply payments and adjustments
      await this.applyERAPayments(processingResult);
      
      // Log ERA processing
      await this.logIntegrationActivity(integrationId, 'era_processing', {
        era_id: processingResult.era_id,
        claims_processed: processingResult.claims_processed,
        total_payments: processingResult.total_payments,
        response: processingResult
      });
      
      return processingResult;
    } catch (error) {
      throw createDatabaseError('ERA processing failed', {
        originalError: error.message,
        eraData
      });
    }
  }

  /**
   * Make integration request with retry logic
   * @param {string} integrationId - Integration identifier
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Object} Response data
   */
  async makeIntegrationRequest(integrationId, method, endpoint, data = null) {
    const integration = this.integrations[integrationId];
    if (!integration) {
      throw new Error(`Integration ${integrationId} not configured`);
    }
    
    const maxRetries = integration.retry_attempts;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = {
          method,
          url: `${integration.url || integration.submission_url}${endpoint}`,
          timeout: integration.timeout,
          headers: {
            'Authorization': `Bearer ${integration.api_key}`,
            'Content-Type': 'application/json',
            'X-Integration-Source': 'OVHI-RCM'
          }
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
          config.data = data;
        }
        
        const response = await axios(config);
        
        // Update connection status on success
        this.updateConnectionStatus(integrationId, 'connected', null);
        
        return response;
      } catch (error) {
        lastError = error;
        
        // Update connection status on error
        this.updateConnectionStatus(integrationId, 'error', error.message);
        
        // Don't retry on certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw new Error(`Authentication failed for ${integrationId}: ${error.message}`);
        }
        
        if (attempt === maxRetries) {
          throw new Error(`Integration ${integrationId} failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
    
    throw lastError;
  }

  /**
   * Initialize connection monitoring
   */
  initializeConnectionMonitoring() {
    // Set up periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform health checks on all integrations
   */
  async performHealthChecks() {
    for (const integrationId of Object.keys(this.integrations)) {
      try {
        await this.checkIntegrationHealth(integrationId);
      } catch (error) {
        console.error(`Health check failed for ${integrationId}:`, error.message);
      }
    }
  }

  /**
   * Check health of specific integration
   * @param {string} integrationId - Integration to check
   */
  async checkIntegrationHealth(integrationId) {
    try {
      const response = await this.makeIntegrationRequest(integrationId, 'GET', '/health');
      
      this.updateConnectionStatus(integrationId, 'healthy', null, {
        response_time: response.headers['x-response-time'],
        last_check: new Date().toISOString()
      });
    } catch (error) {
      this.updateConnectionStatus(integrationId, 'unhealthy', error.message);
    }
  }

  /**
   * Update connection status
   * @param {string} integrationId - Integration identifier
   * @param {string} status - Connection status
   * @param {string} error - Error message if any
   * @param {Object} metadata - Additional metadata
   */
  updateConnectionStatus(integrationId, status, error = null, metadata = {}) {
    this.connectionStatus.set(integrationId, {
      status,
      error,
      last_updated: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Get connection status for all integrations
   * @returns {Object} Connection status summary
   */
  getConnectionStatus() {
    const status = {};
    for (const [integrationId, connectionInfo] of this.connectionStatus.entries()) {
      status[integrationId] = connectionInfo;
    }
    return status;
  }  
/**
   * Validation and helper methods
   */

  /**
   * Validate patient data for eligibility verification
   * @param {Object} patientData - Patient data to validate
   */
  validatePatientData(patientData) {
    const required = ['member_id', 'first_name', 'last_name', 'date_of_birth'];
    for (const field of required) {
      if (!patientData[field]) {
        throw createValidationError(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate prior authorization request
   * @param {Object} authRequest - Authorization request to validate
   */
  validatePriorAuthRequest(authRequest) {
    const required = ['patient', 'provider', 'services', 'diagnosis'];
    for (const field of required) {
      if (!authRequest[field]) {
        throw createValidationError(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate claim data for submission
   * @param {Object} claimData - Claim data to validate
   */
  validateClaimForSubmission(claimData) {
    if (!claimData.patient || !claimData.provider || !claimData.service_lines) {
      throw createValidationError('Incomplete claim data for submission');
    }
    
    if (claimData.service_lines.length === 0) {
      throw createValidationError('Claim must have at least one service line');
    }
  }

  /**
   * Validate ERA data
   * @param {Object} eraData - ERA data to validate
   */
  validateERAData(eraData) {
    if (!eraData.file_content) {
      throw createValidationError('ERA file content is required');
    }
    
    if (!eraData.payer_id) {
      throw createValidationError('Payer ID is required for ERA processing');
    }
  }

  /**
   * Process eligibility verification response
   * @param {Object} responseData - Raw eligibility response
   * @returns {Object} Processed eligibility result
   */
  processEligibilityResponse(responseData) {
    return {
      eligible: responseData.eligible || false,
      coverage_status: responseData.coverage_status || 'unknown',
      effective_date: responseData.effective_date,
      termination_date: responseData.termination_date,
      copay_amount: responseData.copay_amount,
      deductible_amount: responseData.deductible_amount,
      deductible_remaining: responseData.deductible_remaining,
      out_of_pocket_max: responseData.out_of_pocket_max,
      out_of_pocket_remaining: responseData.out_of_pocket_remaining,
      benefits: responseData.benefits || [],
      limitations: responseData.limitations || [],
      messages: responseData.messages || [],
      verification_date: new Date().toISOString()
    };
  }

  /**
   * Process prior authorization response
   * @param {Object} responseData - Raw prior auth response
   * @returns {Object} Processed authorization result
   */
  processPriorAuthResponse(responseData) {
    return {
      authorization_number: responseData.auth_number,
      status: responseData.status || 'pending',
      approved_services: responseData.approved_services || [],
      denied_services: responseData.denied_services || [],
      effective_date: responseData.effective_date,
      expiration_date: responseData.expiration_date,
      units_approved: responseData.units_approved,
      notes: responseData.notes || '',
      reviewer_name: responseData.reviewer_name,
      review_date: responseData.review_date || new Date().toISOString()
    };
  }

  /**
   * Process claim submission response
   * @param {Object} responseData - Raw submission response
   * @returns {Object} Processed submission result
   */
  processSubmissionResponse(responseData) {
    return {
      submission_id: responseData.submission_id,
      status: responseData.status || 'submitted',
      tracking_number: responseData.tracking_number,
      submission_date: responseData.submission_date || new Date().toISOString(),
      expected_processing_date: responseData.expected_processing_date,
      validation_errors: responseData.validation_errors || [],
      warnings: responseData.warnings || [],
      payer_id: responseData.payer_id,
      clearinghouse_id: responseData.clearinghouse_id
    };
  }

  /**
   * Process claim status response
   * @param {Object} responseData - Raw status response
   * @returns {Object} Processed status result
   */
  processStatusResponse(responseData) {
    return {
      claim_status: responseData.status,
      payer_claim_number: responseData.payer_claim_number,
      status_date: responseData.status_date,
      payment_amount: responseData.payment_amount,
      payment_date: responseData.payment_date,
      denial_reason: responseData.denial_reason,
      denial_code: responseData.denial_code,
      status_changed: responseData.status_changed || false,
      messages: responseData.messages || [],
      next_action: responseData.next_action
    };
  }

  /**
   * Process ERA response
   * @param {Object} responseData - Raw ERA response
   * @returns {Object} Processed ERA result
   */
  processERAResponse(responseData) {
    return {
      era_id: responseData.era_id,
      payer_name: responseData.payer_name,
      payer_id: responseData.payer_id,
      check_number: responseData.check_number,
      check_date: responseData.check_date,
      total_payments: responseData.total_payments,
      claims_processed: responseData.claims_processed,
      payments: responseData.payments || [],
      adjustments: responseData.adjustments || [],
      processing_date: new Date().toISOString()
    };
  }

  /**
   * Get claim data for submission
   * @param {number} claimId - Claim ID
   * @returns {Object} Claim data formatted for submission
   */
  async getClaimDataForSubmission(claimId) {
    const query = `
      SELECT 
        b.*,
        p.first_name, p.last_name, p.date_of_birth, p.gender,
        p.address, p.city, p.state, p.zip_code,
        i.insurance_name, i.policy_number, i.group_number,
        pr.npi_number as provider_npi, pr.taxonomy_code,
        f.name as facility_name, f.npi_number as facility_npi
      FROM billings b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN patient_insurance i ON p.id = i.patient_id AND i.is_primary = 1
      LEFT JOIN providers pr ON b.provider_id = pr.id
      LEFT JOIN facilities f ON b.facility_id = f.id
      WHERE b.id = ?
    `;

    const claimData = await executeQuerySingle(query, [claimId]);
    
    if (!claimData) {
      throw createNotFoundError('Claim not found');
    }

    // Get service lines
    const serviceLines = await executeQuery(`
      SELECT *
      FROM claim_service_lines 
      WHERE claim_id = ? 
      ORDER BY line_number
    `, [claimId]);

    // Get diagnosis codes
    const diagnosisCodes = await executeQuery(`
      SELECT *
      FROM claim_diagnoses 
      WHERE claim_id = ? 
      ORDER BY pointer_position
    `, [claimId]);

    return {
      ...claimData,
      service_lines: serviceLines,
      diagnosis_codes: diagnosisCodes
    };
  }

  /**
   * Format claim data for submission
   * @param {Object} claimData - Raw claim data
   * @returns {Object} Formatted claim data
   */
  formatClaimForSubmission(claimData) {
    return {
      claim_id: claimData.id,
      patient: {
        member_id: claimData.policy_number,
        first_name: claimData.first_name,
        last_name: claimData.last_name,
        date_of_birth: claimData.date_of_birth,
        gender: claimData.gender,
        address: {
          street: claimData.address,
          city: claimData.city,
          state: claimData.state,
          zip: claimData.zip_code
        }
      },
      provider: {
        npi: claimData.provider_npi,
        taxonomy: claimData.taxonomy_code,
        name: `${claimData.provider_first_name} ${claimData.provider_last_name}`
      },
      payer: {
        name: claimData.insurance_name,
        id: claimData.payer_id
      },
      service_lines: claimData.service_lines.map(line => ({
        line_number: line.line_number,
        procedure_code: line.procedure_code,
        modifiers: [line.modifier1, line.modifier2, line.modifier3, line.modifier4].filter(Boolean),
        diagnosis_pointers: line.diagnosis_pointer ? [line.diagnosis_pointer] : [],
        service_date: line.service_date,
        units: line.units,
        charges: line.charges,
        place_of_service: line.place_of_service
      })),
      diagnosis_codes: claimData.diagnosis_codes.map(diag => ({
        code: diag.diagnosis_code,
        description: diag.diagnosis_description,
        pointer: diag.pointer_position
      }))
    };
  }

  /**
   * Store prior authorization result
   * @param {number} claimId - Claim ID
   * @param {Object} authResult - Authorization result
   */
  async storePriorAuthResult(claimId, authResult) {
    await executeQuery(`
      INSERT INTO prior_authorizations (
        claim_id, authorization_number, status, approved_services,
        effective_date, expiration_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      approved_services = VALUES(approved_services),
      updated_at = NOW()
    `, [
      claimId,
      authResult.authorization_number,
      authResult.status,
      JSON.stringify(authResult.approved_services),
      authResult.effective_date,
      authResult.expiration_date
    ]);
  }

  /**
   * Update claim submission status
   * @param {number} claimId - Claim ID
   * @param {Object} submissionResult - Submission result
   */
  async updateClaimSubmissionStatus(claimId, submissionResult) {
    await executeQuery(`
      UPDATE billings 
      SET 
        submission_status = ?,
        submission_id = ?,
        tracking_number = ?,
        submitted_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [
      submissionResult.status,
      submissionResult.submission_id,
      submissionResult.tracking_number,
      claimId
    ]);
  }

  /**
   * Update claim status from payer inquiry
   * @param {number} claimId - Claim ID
   * @param {Object} statusResult - Status result
   */
  async updateClaimStatus(claimId, statusResult) {
    await executeQuery(`
      UPDATE billings 
      SET 
        claim_status = ?,
        payer_claim_number = ?,
        status_date = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      statusResult.claim_status,
      statusResult.payer_claim_number,
      statusResult.status_date,
      claimId
    ]);
  }

  /**
   * Apply ERA payments and adjustments
   * @param {Object} eraResult - ERA processing result
   */
  async applyERAPayments(eraResult) {
    for (const payment of eraResult.payments) {
      await executeQuery(`
        INSERT INTO payments (
          claim_id, era_id, payment_amount, payment_date,
          check_number, payer_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        payment.claim_id,
        eraResult.era_id,
        payment.amount,
        payment.date,
        eraResult.check_number,
        eraResult.payer_id
      ]);
    }
    
    for (const adjustment of eraResult.adjustments) {
      await executeQuery(`
        INSERT INTO claim_adjustments (
          claim_id, era_id, adjustment_type, adjustment_amount,
          reason_code, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        adjustment.claim_id,
        eraResult.era_id,
        adjustment.type,
        adjustment.amount,
        adjustment.reason_code
      ]);
    }
  }

  /**
   * Log integration activity
   * @param {string} integrationId - Integration identifier
   * @param {string} activity - Activity type
   * @param {Object} details - Activity details
   */
  async logIntegrationActivity(integrationId, activity, details) {
    try {
      await executeQuery(`
        INSERT INTO integration_logs (
          integration_id, activity_type, details, created_at
        ) VALUES (?, ?, ?, NOW())
      `, [
        integrationId,
        activity,
        JSON.stringify(details)
      ]);
    } catch (error) {
      console.error('Failed to log integration activity:', error);
    }
  }

  /**
   * Utility method for delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ExternalSystemIntegrationService;