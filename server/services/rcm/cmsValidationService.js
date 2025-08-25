/**
 * CMS Validation Service
 * Comprehensive validation engine for CMS compliance and business rules
 */

const {
  executeQuery,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  createValidationError,
  createDatabaseError
} = require('../../middleware/errorHandler');
const { formatDate } = require('../../utils/rcmUtils');

class CMSValidationService {
  constructor() {
    this.name = 'CMSValidationService';
    this.validationRules = new Map();
    this.npiCache = new Map();
    this.codeCache = new Map();
    this.loadValidationRules();
  }

  /**
   * Load validation rules from database
   * @private
   */
  async loadValidationRules() {
    try {
      const rules = await executeQuery(`
        SELECT * FROM cms_validation_rules 
        WHERE is_active = TRUE 
        AND (expiration_date IS NULL OR expiration_date > CURDATE())
        ORDER BY rule_type, id
      `);

      this.validationRules.clear();
      rules.forEach(rule => {
        if (!this.validationRules.has(rule.rule_type)) {
          this.validationRules.set(rule.rule_type, []);
        }
        this.validationRules.get(rule.rule_type).push({
          ...rule,
          conditions: JSON.parse(rule.conditions)
        });
      });

      console.log(`Loaded ${rules.length} CMS validation rules`);
    } catch (error) {
      console.error('Failed to load CMS validation rules:', error);
    }
  }

  /**
   * Validate complete claim against CMS rules
   * @param {Object} claimData - Claim data to validate
   * @returns {Object} Validation result
   */
  async validateClaim(claimData) {
    try {
      const validationResult = {
        isValid: true,
        status: 'valid',
        errors: [],
        warnings: [],
        info: [],
        ncci_status: 'clean',
        medical_necessity_verified: false,
        timely_filing_status: 'compliant'
      };

      // Run all validation checks
      await this.validateRequiredFields(claimData, validationResult);
      await this.validateNPINumber(claimData, validationResult);
      await this.validateTaxonomyCode(claimData, validationResult);
      await this.validatePlaceOfService(claimData, validationResult);
      await this.validateProcedureCode(claimData, validationResult);
      await this.validateDiagnosisCode(claimData, validationResult);
      await this.validateDateLogic(claimData, validationResult);
      await this.validateTimelyFiling(claimData, validationResult);
      await this.checkNCCIEdits(claimData, validationResult);
      await this.validateMedicalNecessity(claimData, validationResult);
      await this.validateModifiers(claimData, validationResult);
      await this.validateQuantityLimits(claimData, validationResult);

      // Determine overall status
      if (validationResult.errors.length > 0) {
        validationResult.isValid = false;
        validationResult.status = 'invalid';
      } else if (validationResult.warnings.length > 0) {
        validationResult.status = 'warning';
      }

      // Log validation result
      await this.logValidationResult(claimData, validationResult);

      return validationResult;
    } catch (error) {
      throw createDatabaseError('CMS validation failed', {
        originalError: error.message,
        claimData
      });
    }
  }

  /**
   * Validate required fields
   * @private
   */
  async validateRequiredFields(claimData, result) {
    const requiredFieldRules = this.validationRules.get('field_required') || [];
    
    for (const rule of requiredFieldRules) {
      const fieldName = rule.conditions.field;
      const fieldValue = claimData[fieldName];
      
      if (rule.conditions.required && (!fieldValue || fieldValue.toString().trim() === '')) {
        result.errors.push({
          field: fieldName,
          code: rule.id,
          message: rule.error_message,
          severity: rule.severity,
          cms_reference: rule.cms_reference,
          suggested_fix: rule.suggested_fix
        });
      }
    }
  }

  /**
   * Validate NPI number
   * @private
   */
  async validateNPINumber(claimData, result) {
    const npiNumber = claimData.npi_number;
    
    if (!npiNumber) {
      result.errors.push({
        field: 'npi_number',
        code: 'CMS_001',
        message: 'NPI number is required for all claims',
        severity: 'error',
        cms_reference: 'CMS-1500 Box 24J'
      });
      return;
    }

    // Format validation
    if (!/^\d{10}$/.test(npiNumber)) {
      result.errors.push({
        field: 'npi_number',
        code: 'CMS_002',
        message: 'NPI number must be exactly 10 digits',
        severity: 'error',
        cms_reference: 'CMS NPI Registry'
      });
      return;
    }

    // Luhn algorithm validation for NPI
    if (!this.validateNPILuhn(npiNumber)) {
      result.errors.push({
        field: 'npi_number',
        code: 'CMS_002A',
        message: 'NPI number failed checksum validation',
        severity: 'error',
        cms_reference: 'CMS NPI Registry'
      });
      return;
    }

    // Cache and verify NPI if not cached
    if (!this.npiCache.has(npiNumber)) {
      const isValid = await this.verifyNPIRegistry(npiNumber);
      this.npiCache.set(npiNumber, {
        isValid,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });
    }

    const npiInfo = this.npiCache.get(npiNumber);
    if (!npiInfo.isValid) {
      result.warnings.push({
        field: 'npi_number',
        code: 'CMS_002B',
        message: 'NPI number not found in registry or inactive',
        severity: 'warning',
        cms_reference: 'CMS NPI Registry'
      });
    }
  }

  /**
   * Validate taxonomy code
   * @private
   */
  async validateTaxonomyCode(claimData, result) {
    const taxonomyCode = claimData.taxonomy_code;
    
    if (!taxonomyCode) {
      result.errors.push({
        field: 'taxonomy_code',
        code: 'CMS_003',
        message: 'Provider taxonomy code is required',
        severity: 'error',
        cms_reference: 'CMS-1500 Box 24I'
      });
      return;
    }

    // Validate taxonomy code format (10 characters, alphanumeric)
    if (!/^[0-9A-Z]{10}$/.test(taxonomyCode)) {
      result.errors.push({
        field: 'taxonomy_code',
        code: 'CMS_003A',
        message: 'Taxonomy code must be 10 alphanumeric characters',
        severity: 'error',
        cms_reference: 'NUCC Taxonomy'
      });
      return;
    }

    // Validate against known taxonomy codes
    const isValidTaxonomy = await this.validateTaxonomyRegistry(taxonomyCode);
    if (!isValidTaxonomy) {
      result.warnings.push({
        field: 'taxonomy_code',
        code: 'CMS_003B',
        message: 'Taxonomy code not found in registry',
        severity: 'warning',
        cms_reference: 'NUCC Taxonomy'
      });
    }
  }

  /**
   * Validate place of service
   * @private
   */
  async validatePlaceOfService(claimData, result) {
    const placeOfService = claimData.place_of_service;
    
    if (!placeOfService) {
      result.errors.push({
        field: 'place_of_service',
        code: 'CMS_004',
        message: 'Place of service code is required',
        severity: 'error',
        cms_reference: 'CMS-1500 Box 24B'
      });
      return;
    }

    // Validate POS code format (2 digits)
    if (!/^\d{2}$/.test(placeOfService)) {
      result.errors.push({
        field: 'place_of_service',
        code: 'CMS_004A',
        message: 'Place of service must be 2 digits',
        severity: 'error',
        cms_reference: 'CMS Place of Service Codes'
      });
      return;
    }

    // Validate against CMS POS codes
    const validPOSCodes = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '31', '32', '33', '34',
      '41', '42', '49', '50', '51', '52', '53', '54', '55', '56',
      '57', '58', '60', '61', '62', '65', '71', '72', '81', '99'
    ];

    if (!validPOSCodes.includes(placeOfService)) {
      result.errors.push({
        field: 'place_of_service',
        code: 'CMS_004B',
        message: 'Invalid place of service code',
        severity: 'error',
        cms_reference: 'CMS Place of Service Codes'
      });
    }
  }

  /**
   * Validate procedure code (CPT/HCPCS)
   * @private
   */
  async validateProcedureCode(claimData, result) {
    const procedureCode = claimData.procedure_code;
    
    if (!procedureCode) {
      result.errors.push({
        field: 'procedure_code',
        code: 'CMS_005',
        message: 'Procedure code is required',
        severity: 'error',
        cms_reference: 'CMS-1500 Box 24D'
      });
      return;
    }

    // Validate CPT code format (5 digits) or HCPCS (1 letter + 4 digits)
    if (!/^(\d{5}|[A-Z]\d{4})$/.test(procedureCode)) {
      result.errors.push({
        field: 'procedure_code',
        code: 'CMS_005A',
        message: 'Procedure code must be 5 digits (CPT) or 1 letter + 4 digits (HCPCS)',
        severity: 'error',
        cms_reference: 'CPT/HCPCS Codes'
      });
      return;
    }

    // Validate code exists and is active
    const codeInfo = await this.validateProcedureCodeRegistry(procedureCode);
    if (!codeInfo.isValid) {
      result.errors.push({
        field: 'procedure_code',
        code: 'CMS_005B',
        message: 'Procedure code not found or inactive',
        severity: 'error',
        cms_reference: 'CPT/HCPCS Registry'
      });
    } else if (codeInfo.isDeprecated) {
      result.warnings.push({
        field: 'procedure_code',
        code: 'CMS_005C',
        message: 'Procedure code is deprecated, consider using newer code',
        severity: 'warning',
        cms_reference: 'CPT/HCPCS Registry'
      });
    }
  }

  /**
   * Validate diagnosis code (ICD-10-CM)
   * @private
   */
  async validateDiagnosisCode(claimData, result) {
    const diagnosisCode = claimData.diagnosis_code;
    
    if (!diagnosisCode) {
      result.errors.push({
        field: 'diagnosis_code',
        code: 'CMS_006',
        message: 'Diagnosis code is required',
        severity: 'error',
        cms_reference: 'CMS-1500 Box 21'
      });
      return;
    }

    // Validate ICD-10-CM format
    if (!/^[A-Z]\d{2}(\.\d{1,4})?$/.test(diagnosisCode)) {
      result.errors.push({
        field: 'diagnosis_code',
        code: 'CMS_006A',
        message: 'Diagnosis code must be valid ICD-10-CM format',
        severity: 'error',
        cms_reference: 'ICD-10-CM Guidelines'
      });
      return;
    }

    // Validate code exists and is active
    const codeInfo = await this.validateDiagnosisCodeRegistry(diagnosisCode);
    if (!codeInfo.isValid) {
      result.errors.push({
        field: 'diagnosis_code',
        code: 'CMS_006B',
        message: 'Diagnosis code not found or inactive',
        severity: 'error',
        cms_reference: 'ICD-10-CM Registry'
      });
    }
  }

  /**
   * Validate date logic
   * @private
   */
  async validateDateLogic(claimData, result) {
    const serviceDate = new Date(claimData.service_date);
    const today = new Date();
    
    // Service date cannot be in future
    if (serviceDate > today) {
      result.errors.push({
        field: 'service_date',
        code: 'CMS_007',
        message: 'Service date cannot be in the future',
        severity: 'error',
        cms_reference: 'CMS Guidelines'
      });
    }

    // Service date cannot be too old (more than 3 years)
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    if (serviceDate < threeYearsAgo) {
      result.warnings.push({
        field: 'service_date',
        code: 'CMS_007A',
        message: 'Service date is more than 3 years old',
        severity: 'warning',
        cms_reference: 'CMS Guidelines'
      });
    }
  }

  /**
   * Validate timely filing requirements
   * @private
   */
  async validateTimelyFiling(claimData, result) {
    const serviceDate = new Date(claimData.service_date);
    const today = new Date();
    const daysSinceService = Math.floor((today - serviceDate) / (1000 * 60 * 60 * 24));
    
    // Standard Medicare timely filing is 12 months (365 days)
    const timelyFilingLimit = 365;
    
    if (daysSinceService > timelyFilingLimit) {
      result.errors.push({
        field: 'service_date',
        code: 'CMS_008',
        message: `Claim exceeds timely filing limit (${daysSinceService} days since service)`,
        severity: 'error',
        cms_reference: 'CMS Timely Filing Rules'
      });
      result.timely_filing_status = 'overdue';
    } else if (daysSinceService > (timelyFilingLimit - 30)) {
      result.warnings.push({
        field: 'service_date',
        code: 'CMS_008A',
        message: `Approaching timely filing limit (${daysSinceService} days since service)`,
        severity: 'warning',
        cms_reference: 'CMS Timely Filing Rules'
      });
      result.timely_filing_status = 'due_soon';
    }

    // Set timely filing date
    const timelyFilingDate = new Date(serviceDate);
    timelyFilingDate.setDate(timelyFilingDate.getDate() + timelyFilingLimit);
    result.timely_filing_date = timelyFilingDate.toISOString().split('T')[0];
  }

  /**
   * Check NCCI edits
   * @private
   */
  async checkNCCIEdits(claimData, result) {
    const procedureCode = claimData.procedure_code;
    
    // This would integrate with NCCI edit database
    // For now, implement basic checks
    
    // Check for common NCCI edit scenarios
    const ncciResult = await this.performNCCICheck(procedureCode, claimData);
    
    if (ncciResult.hasEdit) {
      if (ncciResult.canOverride) {
        result.warnings.push({
          field: 'procedure_code',
          code: 'CMS_009',
          message: `NCCI edit detected: ${ncciResult.editReason}. Override may be possible with modifier.`,
          severity: 'warning',
          cms_reference: 'NCCI Policy Manual',
          suggested_fix: `Consider adding modifier ${ncciResult.suggestedModifier}`
        });
        result.ncci_status = 'edit';
      } else {
        result.errors.push({
          field: 'procedure_code',
          code: 'CMS_009A',
          message: `NCCI edit detected: ${ncciResult.editReason}. No override allowed.`,
          severity: 'error',
          cms_reference: 'NCCI Policy Manual'
        });
        result.ncci_status = 'edit';
      }
    }
  }

  /**
   * Validate medical necessity
   * @private
   */
  async validateMedicalNecessity(claimData, result) {
    const procedureCode = claimData.procedure_code;
    const diagnosisCode = claimData.diagnosis_code;
    
    if (!procedureCode || !diagnosisCode) {
      return;
    }

    // Check diagnosis-procedure relationship
    const medicalNecessity = await this.checkMedicalNecessity(diagnosisCode, procedureCode);
    
    if (medicalNecessity.isSupported) {
      result.medical_necessity_verified = true;
      result.info.push({
        field: 'diagnosis_code',
        code: 'CMS_010',
        message: 'Medical necessity established',
        severity: 'info',
        cms_reference: 'LCD/NCD Guidelines'
      });
    } else if (medicalNecessity.requiresReview) {
      result.warnings.push({
        field: 'diagnosis_code',
        code: 'CMS_010A',
        message: 'Medical necessity may require additional documentation',
        severity: 'warning',
        cms_reference: 'LCD/NCD Guidelines'
      });
    } else {
      result.warnings.push({
        field: 'diagnosis_code',
        code: 'CMS_010B',
        message: 'Medical necessity not clearly established for this diagnosis-procedure combination',
        severity: 'warning',
        cms_reference: 'LCD/NCD Guidelines'
      });
    }
  }

  /**
   * Validate modifiers
   * @private
   */
  async validateModifiers(claimData, result) {
    const modifiers = claimData.modifiers || [];
    const procedureCode = claimData.procedure_code;
    
    if (modifiers.length === 0) {
      return;
    }

    for (const modifier of modifiers) {
      // Validate modifier format
      if (!/^[A-Z0-9]{2}$/.test(modifier)) {
        result.errors.push({
          field: 'modifiers',
          code: 'CMS_011',
          message: `Invalid modifier format: ${modifier}`,
          severity: 'error',
          cms_reference: 'CPT Modifier Guidelines'
        });
        continue;
      }

      // Check if modifier is valid for procedure
      const isValidForProcedure = await this.validateModifierForProcedure(modifier, procedureCode);
      if (!isValidForProcedure) {
        result.warnings.push({
          field: 'modifiers',
          code: 'CMS_011A',
          message: `Modifier ${modifier} may not be appropriate for procedure ${procedureCode}`,
          severity: 'warning',
          cms_reference: 'CPT Modifier Guidelines'
        });
      }
    }

    // Check for conflicting modifiers
    const conflicts = this.checkModifierConflicts(modifiers);
    if (conflicts.length > 0) {
      result.errors.push({
        field: 'modifiers',
        code: 'CMS_011B',
        message: `Conflicting modifiers: ${conflicts.join(', ')}`,
        severity: 'error',
        cms_reference: 'CPT Modifier Guidelines'
      });
    }
  }

  /**
   * Validate quantity limits
   * @private
   */
  async validateQuantityLimits(claimData, result) {
    const procedureCode = claimData.procedure_code;
    const units = claimData.code_units || 1;
    
    // Check procedure-specific quantity limits
    const limits = await this.getProcedureQuantityLimits(procedureCode);
    
    if (limits.maxUnits && units > limits.maxUnits) {
      result.warnings.push({
        field: 'code_units',
        code: 'CMS_012',
        message: `Units (${units}) exceed typical maximum (${limits.maxUnits}) for this procedure`,
        severity: 'warning',
        cms_reference: 'CMS Coverage Guidelines'
      });
    }

    if (limits.requiresDocumentation && units > limits.documentationThreshold) {
      result.info.push({
        field: 'code_units',
        code: 'CMS_012A',
        message: `High unit count may require additional documentation`,
        severity: 'info',
        cms_reference: 'CMS Coverage Guidelines'
      });
    }
  }

  /**
   * Validate NPI using Luhn algorithm
   * @private
   */
  validateNPILuhn(npi) {
    // NPI uses Luhn algorithm with prefix "80840"
    const fullNumber = '80840' + npi;
    let sum = 0;
    let alternate = false;
    
    for (let i = fullNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(fullNumber.charAt(i));
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }

  /**
   * Verify NPI in registry (mock implementation)
   * @private
   */
  async verifyNPIRegistry(npi) {
    // In production, this would call the actual NPI registry API
    // For now, return true for valid format NPIs
    return this.validateNPILuhn(npi);
  }

  /**
   * Validate taxonomy code in registry (mock implementation)
   * @private
   */
  async validateTaxonomyRegistry(taxonomyCode) {
    // In production, this would validate against NUCC taxonomy
    // For now, return true for properly formatted codes
    return /^[0-9A-Z]{10}$/.test(taxonomyCode);
  }

  /**
   * Validate procedure code in registry (mock implementation)
   * @private
   */
  async validateProcedureCodeRegistry(procedureCode) {
    // In production, this would validate against CPT/HCPCS database
    return {
      isValid: /^(\d{5}|[A-Z]\d{4})$/.test(procedureCode),
      isDeprecated: false,
      description: 'Mock procedure description'
    };
  }

  /**
   * Validate diagnosis code in registry (mock implementation)
   * @private
   */
  async validateDiagnosisCodeRegistry(diagnosisCode) {
    // In production, this would validate against ICD-10-CM database
    return {
      isValid: /^[A-Z]\d{2}(\.\d{1,4})?$/.test(diagnosisCode),
      description: 'Mock diagnosis description'
    };
  }

  /**
   * Perform NCCI check (mock implementation)
   * @private
   */
  async performNCCICheck(procedureCode, claimData) {
    // In production, this would check against NCCI edit database
    return {
      hasEdit: false,
      canOverride: false,
      editReason: '',
      suggestedModifier: ''
    };
  }

  /**
   * Check medical necessity (mock implementation)
   * @private
   */
  async checkMedicalNecessity(diagnosisCode, procedureCode) {
    // In production, this would check LCD/NCD databases
    return {
      isSupported: true,
      requiresReview: false,
      coverage: 'covered'
    };
  }

  /**
   * Validate modifier for procedure (mock implementation)
   * @private
   */
  async validateModifierForProcedure(modifier, procedureCode) {
    // In production, this would validate modifier appropriateness
    return true;
  }

  /**
   * Check modifier conflicts
   * @private
   */
  checkModifierConflicts(modifiers) {
    const conflicts = [];
    const conflictPairs = [
      ['LT', 'RT'], // Left/Right
      ['50', 'LT'], // Bilateral with Left
      ['50', 'RT'], // Bilateral with Right
    ];

    for (const [mod1, mod2] of conflictPairs) {
      if (modifiers.includes(mod1) && modifiers.includes(mod2)) {
        conflicts.push(`${mod1}/${mod2}`);
      }
    }

    return conflicts;
  }

  /**
   * Get procedure quantity limits (mock implementation)
   * @private
   */
  async getProcedureQuantityLimits(procedureCode) {
    // In production, this would look up actual limits
    return {
      maxUnits: 10,
      documentationThreshold: 5,
      requiresDocumentation: true
    };
  }

  /**
   * Log validation result
   * @private
   */
  async logValidationResult(claimData, result) {
    try {
      await executeQuery(`
        INSERT INTO compliance_logs (
          claim_id, log_type, compliance_status, details, created_at
        ) VALUES (?, 'cms_validation', ?, ?, NOW())
      `, [
        claimData.id || null,
        result.status === 'valid' ? 'compliant' : 
        result.status === 'warning' ? 'warning' : 'non_compliant',
        JSON.stringify({
          validation_result: result,
          rules_checked: Array.from(this.validationRules.keys()),
          timestamp: new Date().toISOString()
        })
      ]);
    } catch (error) {
      console.error('Failed to log validation result:', error);
    }
  }

  /**
   * Get validation summary for multiple claims
   * @param {Array} claimIds - Array of claim IDs
   * @returns {Object} Validation summary
   */
  async getValidationSummary(claimIds) {
    try {
      const summary = await executeQuery(`
        SELECT 
          cms_validation_status,
          COUNT(*) as count,
          AVG(CASE WHEN validation_errors IS NOT NULL 
              THEN JSON_LENGTH(validation_errors) ELSE 0 END) as avg_errors
        FROM billings 
        WHERE id IN (${claimIds.map(() => '?').join(',')})
        GROUP BY cms_validation_status
      `, claimIds);

      return {
        total_claims: claimIds.length,
        status_breakdown: summary,
        compliance_rate: summary.find(s => s.cms_validation_status === 'valid')?.count || 0 / claimIds.length * 100
      };
    } catch (error) {
      throw createDatabaseError('Failed to get validation summary', {
        originalError: error.message,
        claimIds
      });
    }
  }

  /**
   * Refresh validation rules cache
   */
  async refreshValidationRules() {
    await this.loadValidationRules();
    return {
      success: true,
      rules_loaded: this.validationRules.size,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = CMSValidationService;