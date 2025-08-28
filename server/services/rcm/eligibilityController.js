/**
 * Eligibility and Claim Validation Controller
 * Handles eligibility verification and claim validation requests
 */

const { standardizedResponse } = require('../../utils/standardizedResponse');
const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');
const { auditLog } = require('../../utils/dbUtils');

class EligibilityController {
  /**
   * Check patient eligibility with insurance
   */
  async checkEligibility(req, res) {
    try {
      const {
        patientId,
        memberId,
        firstName,
        lastName,
        dateOfBirth,
        serviceDate,
        insuranceId
      } = req.body;

      const { user_id: userId } = req.user || {};

      // Validate required fields with proper empty string checking
      if (!patientId || (typeof patientId === 'string' && patientId.trim() === '')) {
        return standardizedResponse(res, 400, false, 'Patient ID is required and cannot be empty');
      }
      
      if (!memberId || (typeof memberId === 'string' && memberId.trim() === '')) {
        return standardizedResponse(res, 400, false, 'Member ID is required and cannot be empty');
      }

      // Log the eligibility check request
      await auditLog('ELIGIBILITY_CHECK', {
        userId,
        patientId,
        memberId,
        serviceDate
      });

      // Simulate eligibility check (in real implementation, this would call insurance API)
      const eligibilityResult = await this.performEligibilityCheck({
        patientId,
        memberId,
        firstName,
        lastName,
        dateOfBirth,
        serviceDate,
        insuranceId
      });

      // Store eligibility check result
      await executeQuery(`
        INSERT INTO eligibility_checks (
          patient_id, member_id, service_date, status, coverage_percentage,
          deductible, copay, out_of_pocket_max, effective_date, expiration_date,
          plan_type, in_network, prior_auth_required, checked_by, checked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        patientId,
        memberId,
        serviceDate,
        eligibilityResult.status,
        eligibilityResult.coveragePercentage,
        eligibilityResult.deductible,
        eligibilityResult.copay,
        eligibilityResult.outOfPocketMax,
        eligibilityResult.effectiveDate,
        eligibilityResult.expirationDate,
        eligibilityResult.planType,
        eligibilityResult.inNetwork,
        eligibilityResult.priorAuthRequired,
        userId
      ]);

      return standardizedResponse(res, 200, true, 'Eligibility check completed successfully', eligibilityResult);
    } catch (error) {
      console.error('Eligibility check error:', error);
      return standardizedResponse(res, 500, false, 'Failed to check eligibility', null, error.message);
    }
  }

  /**
   * Verify eligibility in real-time
   */
  async verifyEligibility(req, res) {
    try {
      const { patientId, serviceDate } = req.body;
      const { user_id: userId } = req.user || {};

      if (!patientId || (typeof patientId === 'string' && patientId.trim() === '')) {
        return standardizedResponse(res, 400, false, 'Patient ID is required and cannot be empty');
      }

      // Get patient information
      const patient = await executeQuerySingle(`
        SELECT p.*, pi.member_id, pi.insurance_name, pi.group_number
        FROM patients p
        LEFT JOIN patient_insurance pi ON p.id = pi.patient_id
        WHERE p.id = ? AND pi.is_primary = 1
      `, [patientId]);

      if (!patient) {
        return standardizedResponse(res, 404, false, 'Patient not found or no primary insurance');
      }

      // Perform real-time verification
      const verificationResult = await this.performRealTimeVerification({
        patient,
        serviceDate
      });

      await auditLog('ELIGIBILITY_VERIFY', {
        userId,
        patientId,
        serviceDate,
        result: verificationResult.status
      });

      return standardizedResponse(res, 200, true, 'Eligibility verification completed', verificationResult);
    } catch (error) {
      console.error('Eligibility verification error:', error);
      return standardizedResponse(res, 500, false, 'Failed to verify eligibility', null, error.message);
    }
  }

  /**
   * Get eligibility check history
   */
  async getEligibilityHistory(req, res) {
    try {
      // Get patientId from validated fields or query params
      const patientId = req.validatedFields?.patientId || req.query.patientId || req.params.patientId;
      const { limit = 10, offset = 0 } = req.query;

      if (!patientId) {
        return standardizedResponse(res, 400, false, 'Patient ID is required');
      }

      const history = await executeQuery(`
        SELECT 
          ec.*,
          p.first_name,
          p.last_name,
          u.name as checked_by_name
        FROM eligibility_checks ec
        LEFT JOIN patients p ON ec.patient_id = p.id
        LEFT JOIN users u ON ec.checked_by = u.id
        WHERE ec.patient_id = ?
        ORDER BY ec.checked_at DESC
        LIMIT ? OFFSET ?
      `, [patientId, parseInt(limit), parseInt(offset)]);

      const total = await executeQuerySingle(`
        SELECT COUNT(*) as count FROM eligibility_checks WHERE patient_id = ?
      `, [patientId]);

      return standardizedResponse(res, 200, true, 'Eligibility history retrieved successfully', {
        history,
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    } catch (error) {
      console.error('Get eligibility history error:', error);
      return standardizedResponse(res, 500, false, 'Failed to get eligibility history', null, error.message);
    }
  }

  /**
   * Validate claim data
   */
  async validateClaim(req, res) {
    try {
      const {
        patientId,
        serviceDate,
        procedureCodes,
        diagnosisCodes,
        providerId,
        placeOfService,
        units,
        charges
      } = req.body;

      const { user_id: userId } = req.user || {};

      if (!patientId || (typeof patientId === 'string' && patientId.trim() === '')) {
        return standardizedResponse(res, 400, false, 'Patient ID is required and cannot be empty');
      }
      
      if (!procedureCodes || !Array.isArray(procedureCodes) || procedureCodes.length === 0) {
        return standardizedResponse(res, 400, false, 'Procedure codes are required and must be a non-empty array');
      }

      // Perform claim validation
      const validationResult = await this.performClaimValidation({
        patientId,
        serviceDate,
        procedureCodes,
        diagnosisCodes,
        providerId,
        placeOfService,
        units,
        charges
      });

      await auditLog('CLAIM_VALIDATE', {
        userId,
        patientId,
        procedureCodes,
        validationResult: validationResult.isValid
      });

      return standardizedResponse(res, 200, true, 'Claim validation completed', validationResult);
    } catch (error) {
      console.error('Claim validation error:', error);
      return standardizedResponse(res, 500, false, 'Failed to validate claim', null, error.message);
    }
  }

  /**
   * Scrub claim for errors
   */
  async scrubClaim(req, res) {
    try {
      const claimData = req.body;
      const { user_id: userId } = req.user || {};

      // Perform comprehensive claim scrubbing
      const scrubResult = await this.performClaimScrubbing(claimData);

      await auditLog('CLAIM_SCRUB', {
        userId,
        patientId: claimData.patientId,
        errorsFound: scrubResult.errors?.length || 0,
        warningsFound: scrubResult.warnings?.length || 0
      });

      return standardizedResponse(res, 200, true, 'Claim scrubbing completed', scrubResult);
    } catch (error) {
      console.error('Claim scrub error:', error);
      return standardizedResponse(res, 500, false, 'Failed to scrub claim', null, error.message);
    }
  }

  /**
   * Get claim estimate
   */
  async getClaimEstimate(req, res) {
    try {
      const estimateData = req.body;
      const { user_id: userId } = req.user || {};

      // Calculate claim estimate
      const estimate = await this.calculateClaimEstimate(estimateData);

      await auditLog('CLAIM_ESTIMATE', {
        userId,
        patientId: estimateData.patientId,
        estimatedAmount: estimate.estimatedReimbursement
      });

      return standardizedResponse(res, 200, true, 'Claim estimate calculated', estimate);
    } catch (error) {
      console.error('Claim estimate error:', error);
      return standardizedResponse(res, 500, false, 'Failed to calculate claim estimate', null, error.message);
    }
  }

  /**
   * Check benefits and coverage
   */
  async checkBenefits(req, res) {
    try {
      const { patientId, serviceDate, procedureCodes } = req.body;
      const { user_id: userId } = req.user || {};

      // Handle empty or missing patientId
      if (!patientId || (typeof patientId === 'string' && patientId.trim() === '')) {
        return standardizedResponse(res, 400, false, 'Patient ID is required and cannot be empty');
      }

      // Get patient insurance information
      const insurance = await executeQuerySingle(`
        SELECT * FROM patient_insurance 
        WHERE patient_id = ? AND is_primary = 1
      `, [patientId]);

      if (!insurance) {
        return standardizedResponse(res, 404, false, 'No primary insurance found for patient');
      }

      // Check benefits
      const benefits = await this.checkPatientBenefits({
        patientId,
        insurance,
        serviceDate,
        procedureCodes
      });

      await auditLog('BENEFITS_CHECK', {
        userId,
        patientId,
        serviceDate
      });

      return standardizedResponse(res, 200, true, 'Benefits check completed', benefits);
    } catch (error) {
      console.error('Benefits check error:', error);
      return standardizedResponse(res, 500, false, 'Failed to check benefits', null, error.message);
    }
  }

  /**
   * Get copay estimate
   */
  async getCopayEstimate(req, res) {
    try {
      const copayData = req.body;
      const { user_id: userId } = req.user || {};

      // Calculate copay estimate
      const copayEstimate = await this.calculateCopayEstimate(copayData);

      await auditLog('COPAY_ESTIMATE', {
        userId,
        patientId: copayData.patientId,
        estimatedCopay: copayEstimate.estimatedCopay
      });

      return standardizedResponse(res, 200, true, 'Copay estimate calculated', copayEstimate);
    } catch (error) {
      console.error('Copay estimate error:', error);
      return standardizedResponse(res, 500, false, 'Failed to calculate copay estimate', null, error.message);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Perform eligibility check (simulated)
   */
  async performEligibilityCheck(data) {
    // In a real implementation, this would call insurance APIs
    // For now, we'll simulate the response
    
    const statuses = ['active', 'inactive', 'pending'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      status: randomStatus,
      coveragePercentage: randomStatus === 'active' ? 80 : 0,
      deductible: randomStatus === 'active' ? 1000 : 0,
      copay: randomStatus === 'active' ? 25 : 0,
      outOfPocketMax: randomStatus === 'active' ? 5000 : 0,
      effectiveDate: '2024-01-01',
      expirationDate: '2024-12-31',
      planType: 'PPO',
      inNetwork: true,
      priorAuthRequired: false,
      memberId: data.memberId,
      groupNumber: 'GRP001',
      planName: 'Health Plan Premium'
    };
  }

  /**
   * Perform real-time verification
   */
  async performRealTimeVerification(data) {
    // Simulate real-time API call
    return {
      status: 'active',
      verified: true,
      verificationDate: new Date().toISOString(),
      coveragePercentage: 80,
      deductible: 1000,
      copay: 25,
      planType: 'PPO',
      inNetwork: true
    };
  }

  /**
   * Perform claim validation
   */
  async performClaimValidation(data) {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Basic validation rules
    if (!data.diagnosisCodes || data.diagnosisCodes.length === 0) {
      warnings.push({
        code: 'MISSING_DIAGNOSIS',
        message: 'No diagnosis codes provided',
        severity: 'warning'
      });
    }

    if (data.charges && parseFloat(data.charges) <= 0) {
      errors.push({
        code: 'INVALID_CHARGES',
        message: 'Charges must be greater than zero',
        severity: 'error'
      });
    }

    // Check procedure codes format
    for (const code of data.procedureCodes) {
      if (!/^\d{5}$/.test(code)) {
        errors.push({
          code: 'INVALID_CPT',
          message: `Invalid CPT code format: ${code}`,
          severity: 'error'
        });
      }
    }

    const isValid = errors.length === 0;
    const confidence = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));

    return {
      isValid,
      confidence,
      errors,
      warnings,
      suggestions,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * Perform claim scrubbing
   */
  async performClaimScrubbing(data) {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Comprehensive scrubbing rules
    if (!data.patientId) {
      errors.push({ code: 'MISSING_PATIENT', message: 'Patient ID is required' });
    }

    if (!data.serviceDate) {
      errors.push({ code: 'MISSING_SERVICE_DATE', message: 'Service date is required' });
    }

    if (data.serviceDate && new Date(data.serviceDate) > new Date()) {
      warnings.push({ code: 'FUTURE_SERVICE_DATE', message: 'Service date is in the future' });
    }

    if (!data.procedureCodes || data.procedureCodes.length === 0) {
      errors.push({ code: 'MISSING_PROCEDURES', message: 'At least one procedure code is required' });
    }

    return {
      errors,
      warnings,
      suggestions,
      scrubbedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate claim estimate
   */
  async calculateClaimEstimate(data) {
    // Simulate estimate calculation
    const baseAmount = parseFloat(data.charges) || 100;
    const coveragePercentage = 80;
    const deductible = 1000;
    const copay = 25;

    const estimatedReimbursement = (baseAmount * coveragePercentage / 100) - copay;
    const patientResponsibility = baseAmount - estimatedReimbursement;

    return {
      totalCharges: baseAmount,
      estimatedReimbursement: Math.max(0, estimatedReimbursement),
      patientResponsibility,
      copay,
      deductible,
      coveragePercentage,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Check patient benefits
   */
  async checkPatientBenefits(data) {
    return {
      planType: 'PPO',
      inNetwork: true,
      priorAuthRequired: false,
      benefits: [
        {
          serviceType: 'Office Visit',
          coveragePercentage: 80,
          copay: 25,
          deductible: 1000
        },
        {
          serviceType: 'Specialist Visit',
          coveragePercentage: 70,
          copay: 50,
          deductible: 1000
        }
      ],
      deductibleInfo: {
        total: 1000,
        met: 250,
        remaining: 750
      },
      outOfPocketMax: {
        total: 5000,
        met: 500,
        remaining: 4500
      }
    };
  }

  /**
   * Calculate copay estimate
   */
  async calculateCopayEstimate(data) {
    return {
      estimatedCopay: 25,
      deductibleApplies: true,
      coinsuranceRate: 20,
      calculatedAt: new Date().toISOString()
    };
  }
}

module.exports = new EligibilityController();