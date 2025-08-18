const db = require('../../config/db');

/**
 * Referral Validation Service
 * Comprehensive validation for referral data, business rules, and compliance
 */

class ReferralValidationService {
  constructor() {
    this.validationRules = new Map();
    this.complianceChecks = new Map();
    this.initializeValidationRules();
  }

  /**
   * Initialize validation rules and compliance checks
   */
  initializeValidationRules() {
    // Field validation rules
    this.validationRules.set('required_fields', {
      'draft': ['patient_id', 'provider_id', 'specialty_type', 'referral_reason'],
      'pending': ['patient_id', 'provider_id', 'specialty_type', 'referral_reason', 'clinical_notes'],
      'sent': ['patient_id', 'provider_id', 'specialty_type', 'referral_reason', 'clinical_notes', 'specialist_id'],
      'scheduled': ['patient_id', 'provider_id', 'specialty_type', 'referral_reason', 'clinical_notes', 'specialist_id', 'scheduled_date'],
      'completed': ['patient_id', 'provider_id', 'specialty_type', 'referral_reason', 'clinical_notes', 'specialist_id', 'scheduled_date', 'completed_date']
    });

    // Data format validation rules
    this.validationRules.set('format_rules', {
      'patient_id': /^[A-Z0-9_]{3,50}$/,
      'provider_id': /^[A-Z0-9_]{3,50}$/,
      'specialist_id': /^[A-Z0-9_]{3,50}$/,
      'referral_number': /^REF\d{6,}$/,
      'urgency_level': ['routine', 'urgent', 'stat'],
      'appointment_type': ['consultation', 'treatment', 'second_opinion', 'procedure'],
      'status': ['draft', 'pending', 'sent', 'scheduled', 'completed', 'cancelled', 'expired']
    });

    // Business rule validation
    this.validationRules.set('business_rules', {
      'max_referrals_per_patient_per_day': 5,
      'max_urgent_referrals_per_provider_per_day': 10,
      'max_stat_referrals_per_provider_per_day': 3,
      'required_authorization_specialties': [
        'surgery', 'orthopedic_surgery', 'neurosurgery', 'cardiac_surgery',
        'mri', 'ct_scan', 'pet_scan', 'nuclear_medicine'
      ],
      'same_specialty_cooldown_hours': 24,
      'max_clinical_notes_length': 5000,
      'min_clinical_notes_length': 50
    });

    // Compliance validation rules
    this.complianceChecks.set('hipaa_compliance', {
      'required_patient_consent': true,
      'phi_handling_validation': true,
      'audit_trail_required': true,
      'access_logging_required': true
    });

    this.complianceChecks.set('clinical_compliance', {
      'icd_code_validation': true,
      'cpt_code_validation': true,
      'medical_necessity_documentation': true,
      'provider_credentials_check': true
    });
  }

  /**
   * Comprehensive referral validation
   */
  async validateReferral(referralData, validationType = 'create') {
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      complianceIssues: []
    };

    try {
      // Basic field validation
      await this.validateRequiredFields(referralData, validationType, validationResult);
      
      // Format validation
      await this.validateDataFormats(referralData, validationResult);
      
      // Business rule validation
      await this.validateBusinessRules(referralData, validationResult);
      
      // Clinical validation
      await this.validateClinicalData(referralData, validationResult);
      
      // Authorization validation
      await this.validateAuthorizationRequirements(referralData, validationResult);
      
      // Compliance validation
      await this.validateCompliance(referralData, validationResult);
      
      // Cross-reference validation
      await this.validateCrossReferences(referralData, validationResult);

      // Set overall validity
      validationResult.isValid = validationResult.errors.length === 0;

      return validationResult;

    } catch (error) {
      console.error('Validation error:', error);
      validationResult.isValid = false;
      validationResult.errors.push(`Validation system error: ${error.message}`);
      return validationResult;
    }
  }

  /**
   * Validate required fields based on referral status
   */
  async validateRequiredFields(referralData, validationType, validationResult) {
    const status = referralData.status || 'draft';
    const requiredFields = this.validationRules.get('required_fields')[status] || [];

    for (const field of requiredFields) {
      if (!referralData[field] || (typeof referralData[field] === 'string' && referralData[field].trim() === '')) {
        validationResult.errors.push(`Required field missing: ${field}`);
      }
    }

    // Additional validation for specific types
    if (validationType === 'update' && !referralData.id) {
      validationResult.errors.push('Referral ID is required for updates');
    }

    if (referralData.urgency_level === 'stat' && !referralData.stat_justification) {
      validationResult.errors.push('STAT justification is required for STAT referrals');
    }
  }

  /**
   * Validate data formats
   */
  async validateDataFormats(referralData, validationResult) {
    const formatRules = this.validationRules.get('format_rules');

    for (const [field, rule] of Object.entries(formatRules)) {
      if (referralData[field]) {
        if (Array.isArray(rule)) {
          // Enum validation
          if (!rule.includes(referralData[field])) {
            validationResult.errors.push(`Invalid value for ${field}: ${referralData[field]}. Must be one of: ${rule.join(', ')}`);
          }
        } else if (rule instanceof RegExp) {
          // Regex validation
          if (!rule.test(referralData[field])) {
            validationResult.errors.push(`Invalid format for ${field}: ${referralData[field]}`);
          }
        }
      }
    }

    // Date validation
    if (referralData.scheduled_date) {
      const scheduledDate = new Date(referralData.scheduled_date);
      const today = new Date();
      
      if (scheduledDate < today) {
        validationResult.errors.push('Scheduled date cannot be in the past');
      }
      
      if (scheduledDate > new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000)) {
        validationResult.warnings.push('Scheduled date is more than 1 year in the future');
      }
    }

    // Clinical notes length validation
    if (referralData.clinical_notes) {
      const businessRules = this.validationRules.get('business_rules');
      const minLength = businessRules.min_clinical_notes_length;
      const maxLength = businessRules.max_clinical_notes_length;
      
      if (referralData.clinical_notes.length < minLength) {
        validationResult.warnings.push(`Clinical notes should be at least ${minLength} characters for adequate documentation`);
      }
      
      if (referralData.clinical_notes.length > maxLength) {
        validationResult.errors.push(`Clinical notes exceed maximum length of ${maxLength} characters`);
      }
    }
  }

  /**
   * Validate business rules
   */
  async validateBusinessRules(referralData, validationResult) {
    const businessRules = this.validationRules.get('business_rules');

    // Check daily referral limits
    if (referralData.patient_id) {
      const todayReferrals = await this.getTodayReferralCount('patient', referralData.patient_id);
      if (todayReferrals >= businessRules.max_referrals_per_patient_per_day) {
        validationResult.errors.push(`Patient has reached daily referral limit of ${businessRules.max_referrals_per_patient_per_day}`);
      }
    }

    if (referralData.provider_id) {
      // Check urgent referral limits
      if (referralData.urgency_level === 'urgent') {
        const todayUrgentReferrals = await this.getTodayUrgentReferralCount(referralData.provider_id);
        if (todayUrgentReferrals >= businessRules.max_urgent_referrals_per_provider_per_day) {
          validationResult.errors.push(`Provider has reached daily urgent referral limit of ${businessRules.max_urgent_referrals_per_provider_per_day}`);
        }
      }

      // Check STAT referral limits
      if (referralData.urgency_level === 'stat') {
        const todayStatReferrals = await this.getTodayStatReferralCount(referralData.provider_id);
        if (todayStatReferrals >= businessRules.max_stat_referrals_per_provider_per_day) {
          validationResult.errors.push(`Provider has reached daily STAT referral limit of ${businessRules.max_stat_referrals_per_provider_per_day}`);
        }
      }
    }

    // Check same specialty cooldown
    if (referralData.patient_id && referralData.specialty_type) {
      const recentSameSpecialty = await this.getRecentSameSpecialtyReferral(
        referralData.patient_id, 
        referralData.specialty_type, 
        businessRules.same_specialty_cooldown_hours
      );
      
      if (recentSameSpecialty) {
        validationResult.warnings.push(`Patient has a recent ${referralData.specialty_type} referral within ${businessRules.same_specialty_cooldown_hours} hours`);
      }
    }

    // Check authorization requirements
    if (businessRules.required_authorization_specialties.includes(referralData.specialty_type?.toLowerCase())) {
      if (!referralData.authorization_required) {
        validationResult.warnings.push(`Authorization is typically required for ${referralData.specialty_type} referrals`);
      }
    }
  }

  /**
   * Validate clinical data
   */
  async validateClinicalData(referralData, validationResult) {
    // Validate ICD codes if provided
    if (referralData.icd_codes) {
      for (const icdCode of referralData.icd_codes) {
        const isValidIcd = await this.validateIcdCode(icdCode);
        if (!isValidIcd) {
          validationResult.errors.push(`Invalid ICD code: ${icdCode}`);
        }
      }
    }

    // Validate CPT codes if provided
    if (referralData.cpt_codes) {
      for (const cptCode of referralData.cpt_codes) {
        const isValidCpt = await this.validateCptCode(cptCode);
        if (!isValidCpt) {
          validationResult.errors.push(`Invalid CPT code: ${cptCode}`);
        }
      }
    }

    // Validate specialty-specific requirements
    await this.validateSpecialtyRequirements(referralData, validationResult);

    // Check for medical necessity documentation
    if (referralData.specialty_type && !referralData.clinical_notes) {
      validationResult.errors.push('Clinical notes are required to document medical necessity');
    }
  }

  /**
   * Validate authorization requirements
   */
  async validateAuthorizationRequirements(referralData, validationResult) {
    if (referralData.authorization_required) {
      // Check if patient has active insurance
      const hasActiveInsurance = await this.checkActiveInsurance(referralData.patient_id);
      if (!hasActiveInsurance) {
        validationResult.errors.push('Patient must have active insurance for authorization-required referrals');
      }

      // Validate authorization data if provided
      if (referralData.authorization_number) {
        const authValidation = await this.validateAuthorizationNumber(referralData.authorization_number);
        if (!authValidation.isValid) {
          validationResult.errors.push(`Invalid authorization: ${authValidation.reason}`);
        }
      }
    }
  }

  /**
   * Validate compliance requirements
   */
  async validateCompliance(referralData, validationResult) {
    const hipaaCompliance = this.complianceChecks.get('hipaa_compliance');
    const clinicalCompliance = this.complianceChecks.get('clinical_compliance');

    // HIPAA compliance checks
    if (hipaaCompliance.required_patient_consent) {
      const hasConsent = await this.checkPatientConsent(referralData.patient_id);
      if (!hasConsent) {
        validationResult.complianceIssues.push('Patient consent for referral sharing not documented');
      }
    }

    // Clinical compliance checks
    if (clinicalCompliance.provider_credentials_check) {
      const providerValid = await this.validateProviderCredentials(referralData.provider_id);
      if (!providerValid) {
        validationResult.errors.push('Provider credentials are not valid or expired');
      }
    }

    if (clinicalCompliance.medical_necessity_documentation && !referralData.clinical_notes) {
      validationResult.complianceIssues.push('Medical necessity must be documented in clinical notes');
    }
  }

  /**
   * Validate cross-references
   */
  async validateCrossReferences(referralData, validationResult) {
    // Validate patient exists and is active
    if (referralData.patient_id) {
      const patientExists = await this.validatePatientExists(referralData.patient_id);
      if (!patientExists) {
        validationResult.errors.push('Patient not found or inactive');
      }
    }

    // Validate provider exists and is active
    if (referralData.provider_id) {
      const providerExists = await this.validateProviderExists(referralData.provider_id);
      if (!providerExists) {
        validationResult.errors.push('Provider not found or inactive');
      }
    }

    // Validate specialist exists and is active
    if (referralData.specialist_id) {
      const specialistExists = await this.validateSpecialistExists(referralData.specialist_id);
      if (!specialistExists) {
        validationResult.errors.push('Specialist not found or inactive');
      } else {
        // Check if specialist accepts the specialty type
        const acceptsSpecialty = await this.validateSpecialistSpecialty(referralData.specialist_id, referralData.specialty_type);
        if (!acceptsSpecialty) {
          validationResult.warnings.push(`Specialist may not accept ${referralData.specialty_type} referrals`);
        }
      }
    }

    // Validate encounter exists if provided
    if (referralData.encounter_id) {
      const encounterExists = await this.validateEncounterExists(referralData.encounter_id);
      if (!encounterExists) {
        validationResult.errors.push('Encounter not found');
      }
    }
  }

  /**
   * Validate specialty-specific requirements
   */
  async validateSpecialtyRequirements(referralData, validationResult) {
    const specialty = referralData.specialty_type?.toLowerCase();

    switch (specialty) {
      case 'cardiology':
        if (!referralData.clinical_notes?.includes('cardiac') && !referralData.clinical_notes?.includes('heart')) {
          validationResult.warnings.push('Cardiology referrals should include cardiac-related symptoms or findings');
        }
        break;

      case 'orthopedics':
        if (!referralData.clinical_notes?.includes('pain') && !referralData.clinical_notes?.includes('injury')) {
          validationResult.warnings.push('Orthopedic referrals should document pain or injury details');
        }
        break;

      case 'mental_health':
      case 'psychiatry':
        if (referralData.urgency_level === 'stat' && !referralData.clinical_notes?.includes('suicidal')) {
          validationResult.warnings.push('STAT mental health referrals should document crisis indicators');
        }
        break;

      case 'surgery':
        if (!referralData.authorization_required) {
          validationResult.errors.push('Surgical referrals require prior authorization');
        }
        break;
    }
  }

  // Database validation methods

  /**
   * Get today's referral count for patient or provider
   */
  async getTodayReferralCount(type, id) {
    try {
      const field = type === 'patient' ? 'patient_id' : 'provider_id';
      const [result] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE ${field} = ? AND DATE(created_at) = CURDATE()
      `, [id]);
      
      return result[0].count;
    } catch (error) {
      console.error('Error getting referral count:', error);
      return 0;
    }
  }

  /**
   * Get today's urgent referral count for provider
   */
  async getTodayUrgentReferralCount(providerId) {
    try {
      const [result] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE provider_id = ? AND urgency_level = 'urgent' AND DATE(created_at) = CURDATE()
      `, [providerId]);
      
      return result[0].count;
    } catch (error) {
      console.error('Error getting urgent referral count:', error);
      return 0;
    }
  }

  /**
   * Get today's STAT referral count for provider
   */
  async getTodayStatReferralCount(providerId) {
    try {
      const [result] = await db.execute(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE provider_id = ? AND urgency_level = 'stat' AND DATE(created_at) = CURDATE()
      `, [providerId]);
      
      return result[0].count;
    } catch (error) {
      console.error('Error getting STAT referral count:', error);
      return 0;
    }
  }

  /**
   * Get recent same specialty referral
   */
  async getRecentSameSpecialtyReferral(patientId, specialtyType, hours) {
    try {
      const [result] = await db.execute(`
        SELECT id 
        FROM referrals 
        WHERE patient_id = ? AND specialty_type = ? 
        AND created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
        LIMIT 1
      `, [patientId, specialtyType, hours]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error checking recent specialty referral:', error);
      return false;
    }
  }

  /**
   * Validate ICD code
   */
  async validateIcdCode(icdCode) {
    // This would integrate with ICD code validation service
    // For now, basic format validation
    return /^[A-Z]\d{2}(\.\d{1,3})?$/.test(icdCode);
  }

  /**
   * Validate CPT code
   */
  async validateCptCode(cptCode) {
    // This would integrate with CPT code validation service
    // For now, basic format validation
    return /^\d{5}$/.test(cptCode);
  }

  /**
   * Check active insurance
   */
  async checkActiveInsurance(patientId) {
    try {
      const [result] = await db.execute(`
        SELECT id 
        FROM rcm_patient_insurance 
        WHERE patient_id = ? AND is_active = TRUE 
        AND (termination_date IS NULL OR termination_date > CURDATE())
        LIMIT 1
      `, [patientId]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error checking active insurance:', error);
      return false;
    }
  }

  /**
   * Validate authorization number
   */
  async validateAuthorizationNumber(authNumber) {
    try {
      const [result] = await db.execute(`
        SELECT status, expiry_date 
        FROM referral_authorizations 
        WHERE authorization_number = ?
      `, [authNumber]);
      
      if (result.length === 0) {
        return { isValid: false, reason: 'Authorization number not found' };
      }
      
      const auth = result[0];
      if (auth.status !== 'approved') {
        return { isValid: false, reason: 'Authorization not approved' };
      }
      
      if (auth.expiry_date && new Date(auth.expiry_date) < new Date()) {
        return { isValid: false, reason: 'Authorization expired' };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating authorization:', error);
      return { isValid: false, reason: 'Validation error' };
    }
  }

  /**
   * Check patient consent
   */
  async checkPatientConsent(patientId) {
    // This would check patient consent records
    // For now, assume consent exists
    return true;
  }

  /**
   * Validate provider credentials
   */
  async validateProviderCredentials(providerId) {
    // This would check provider license and credentials
    // For now, assume valid
    return true;
  }

  /**
   * Validate patient exists
   */
  async validatePatientExists(patientId) {
    try {
      const [result] = await db.execute(`
        SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1
      `, [patientId]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error validating patient:', error);
      return false;
    }
  }

  /**
   * Validate provider exists
   */
  async validateProviderExists(providerId) {
    try {
      const [result] = await db.execute(`
        SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1
      `, [providerId]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error validating provider:', error);
      return false;
    }
  }

  /**
   * Validate specialist exists
   */
  async validateSpecialistExists(specialistId) {
    try {
      const [result] = await db.execute(`
        SELECT id FROM referral_specialists WHERE id = ? AND is_active = TRUE LIMIT 1
      `, [specialistId]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error validating specialist:', error);
      return false;
    }
  }

  /**
   * Validate specialist specialty
   */
  async validateSpecialistSpecialty(specialistId, specialtyType) {
    try {
      const [result] = await db.execute(`
        SELECT id FROM referral_specialists 
        WHERE id = ? AND (
          specialty_primary = ? OR 
          JSON_CONTAINS(specialties_secondary, JSON_QUOTE(?))
        ) LIMIT 1
      `, [specialistId, specialtyType, specialtyType]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error validating specialist specialty:', error);
      return false;
    }
  }

  /**
   * Validate encounter exists
   */
  async validateEncounterExists(encounterId) {
    try {
      const [result] = await db.execute(`
        SELECT id FROM rcm_encounters WHERE id = ? LIMIT 1
      `, [encounterId]);
      
      return result.length > 0;
    } catch (error) {
      console.error('Error validating encounter:', error);
      return false;
    }
  }

  /**
   * Validate referral for specific workflow action
   */
  async validateForWorkflowAction(referralId, action) {
    const referral = await this.getReferralForValidation(referralId);
    if (!referral) {
      return { isValid: false, errors: ['Referral not found'] };
    }

    const validationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    switch (action) {
      case 'send':
        if (!referral.specialist_id && !referral.specialty_type) {
          validationResult.errors.push('Specialist or specialty type required to send referral');
        }
        if (referral.authorization_required && referral.authorization_status !== 'approved') {
          validationResult.errors.push('Authorization required before sending referral');
        }
        break;

      case 'schedule':
        if (referral.status !== 'sent') {
          validationResult.errors.push('Referral must be sent before scheduling');
        }
        if (!referral.specialist_id) {
          validationResult.errors.push('Specialist required for scheduling');
        }
        break;

      case 'complete':
        if (referral.status !== 'scheduled') {
          validationResult.errors.push('Referral must be scheduled before completion');
        }
        break;

      case 'cancel':
        if (['completed', 'cancelled'].includes(referral.status)) {
          validationResult.errors.push('Cannot cancel completed or already cancelled referral');
        }
        break;
    }

    validationResult.isValid = validationResult.errors.length === 0;
    return validationResult;
  }

  /**
   * Get referral data for validation
   */
  async getReferralForValidation(referralId) {
    try {
      const [result] = await db.execute(`
        SELECT * FROM referrals WHERE id = ? LIMIT 1
      `, [referralId]);
      
      return result[0] || null;
    } catch (error) {
      console.error('Error getting referral for validation:', error);
      return null;
    }
  }
}

module.exports = new ReferralValidationService();