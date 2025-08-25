/**
 * CMS-1500 Form Generator Service
 * Generates compliant CMS-1500 forms with precise field positioning
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const {
  executeQuery,
  executeQuerySingle
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const { formatDate, formatCurrency } = require('../../utils/rcmUtils');
const ClaimHistoryService = require('./claimHistoryService');

class CMS1500Generator {
  constructor() {
    this.name = 'CMS1500Generator';
    this.historyService = new ClaimHistoryService();
    
    // CMS-1500 form dimensions (in points, 72 points = 1 inch)
    this.formWidth = 612; // 8.5 inches
    this.formHeight = 792; // 11 inches
    
    // Font specifications per CMS requirements
    this.fonts = {
      primary: 'Courier', // Monospace font required
      size: 10,
      smallSize: 8
    };
    
    // Field positions based on CMS-1500 (02/12) specifications
    this.fieldPositions = this.initializeFieldPositions();
    
    // Validation rules for CMS-1500 fields
    this.validationRules = this.initializeValidationRules();
  }

  /**
   * Initialize CMS-1500 field positions
   * Coordinates are in points from top-left corner
   */
  initializeFieldPositions() {
    return {
      // Header section
      'form_type': { x: 50, y: 50, width: 200, height: 20 },
      
      // Box 1 - Type of Insurance
      '1_medicare': { x: 50, y: 120, width: 15, height: 15 },
      '1_medicaid': { x: 120, y: 120, width: 15, height: 15 },
      '1_tricare': { x: 190, y: 120, width: 15, height: 15 },
      '1_champva': { x: 260, y: 120, width: 15, height: 15 },
      '1_group_health': { x: 330, y: 120, width: 15, height: 15 },
      '1_feca': { x: 400, y: 120, width: 15, height: 15 },
      '1_other': { x: 470, y: 120, width: 15, height: 15 },
      
      // Box 1a - Insured's ID Number
      '1a_insured_id': { x: 50, y: 150, width: 200, height: 20 },
      
      // Box 2 - Patient's Name
      '2_patient_name': { x: 280, y: 150, width: 280, height: 20 },
      
      // Box 3 - Patient's Birth Date and Sex
      '3_birth_date': { x: 50, y: 180, width: 100, height: 20 },
      '3_sex_male': { x: 170, y: 180, width: 15, height: 15 },
      '3_sex_female': { x: 200, y: 180, width: 15, height: 15 },
      
      // Box 4 - Insured's Name
      '4_insured_name': { x: 280, y: 180, width: 280, height: 20 },
      
      // Box 5 - Patient's Address
      '5_patient_address': { x: 50, y: 210, width: 200, height: 20 },
      '5_patient_city': { x: 50, y: 230, width: 120, height: 20 },
      '5_patient_state': { x: 180, y: 230, width: 40, height: 20 },
      '5_patient_zip': { x: 230, y: 230, width: 80, height: 20 },
      
      // Box 6 - Patient Relationship to Insured
      '6_self': { x: 280, y: 210, width: 15, height: 15 },
      '6_spouse': { x: 320, y: 210, width: 15, height: 15 },
      '6_child': { x: 360, y: 210, width: 15, height: 15 },
      '6_other': { x: 400, y: 210, width: 15, height: 15 },
      
      // Box 7 - Insured's Address
      '7_insured_address': { x: 280, y: 240, width: 200, height: 20 },
      '7_insured_city': { x: 280, y: 260, width: 120, height: 20 },
      '7_insured_state': { x: 410, y: 260, width: 40, height: 20 },
      '7_insured_zip': { x: 460, y: 260, width: 80, height: 20 },
      
      // Box 8 - Reserved for NUCC Use
      '8_reserved': { x: 50, y: 270, width: 200, height: 20 },
      
      // Box 9 - Other Insured's Name
      '9_other_insured_name': { x: 50, y: 300, width: 200, height: 20 },
      
      // Box 9a - Other Insured's Policy or Group Number
      '9a_other_policy': { x: 50, y: 330, width: 200, height: 20 },
      
      // Box 9b - Reserved for NUCC Use
      '9b_reserved': { x: 280, y: 330, width: 200, height: 20 },
      
      // Box 9c - Reserved for NUCC Use
      '9c_reserved': { x: 50, y: 360, width: 200, height: 20 },
      
      // Box 9d - Insurance Plan Name or Program Name
      '9d_insurance_plan': { x: 280, y: 360, width: 200, height: 20 },
      
      // Box 10 - Is Patient's Condition Related to
      '10a_employment': { x: 50, y: 390, width: 15, height: 15 },
      '10b_auto_accident': { x: 120, y: 390, width: 15, height: 15 },
      '10b_state': { x: 150, y: 390, width: 30, height: 20 },
      '10c_other_accident': { x: 200, y: 390, width: 15, height: 15 },
      
      // Box 10d - Claim Codes
      '10d_claim_codes': { x: 280, y: 390, width: 200, height: 20 },
      
      // Box 11 - Insured's Policy Group or FECA Number
      '11_insured_policy': { x: 50, y: 420, width: 200, height: 20 },
      
      // Box 11a - Insured's Date of Birth and Sex
      '11a_insured_dob': { x: 280, y: 420, width: 100, height: 20 },
      '11a_insured_sex_male': { x: 390, y: 420, width: 15, height: 15 },
      '11a_insured_sex_female': { x: 420, y: 420, width: 15, height: 15 },
      
      // Box 11b - Other Claim ID
      '11b_other_claim_id': { x: 50, y: 450, width: 200, height: 20 },
      
      // Box 11c - Insurance Plan Name or Program Name
      '11c_insurance_plan': { x: 280, y: 450, width: 200, height: 20 },
      
      // Box 11d - Is There Another Health Benefit Plan
      '11d_other_plan_yes': { x: 50, y: 480, width: 15, height: 15 },
      '11d_other_plan_no': { x: 80, y: 480, width: 15, height: 15 },
      
      // Box 12 - Patient's or Authorized Person's Signature
      '12_signature': { x: 50, y: 510, width: 150, height: 20 },
      '12_date': { x: 220, y: 510, width: 80, height: 20 },
      
      // Box 13 - Insured's or Authorized Person's Signature
      '13_signature': { x: 320, y: 510, width: 150, height: 20 },
      
      // Service Lines (Boxes 14-23)
      // Line 1
      '14_date_from_1': { x: 50, y: 540, width: 60, height: 20 },
      '14_date_to_1': { x: 120, y: 540, width: 60, height: 20 },
      '15_place_of_service_1': { x: 190, y: 540, width: 30, height: 20 },
      '16_emg_1': { x: 230, y: 540, width: 20, height: 20 },
      '17_procedure_code_1': { x: 260, y: 540, width: 60, height: 20 },
      '17_modifier1_1': { x: 330, y: 540, width: 20, height: 20 },
      '17_modifier2_1': { x: 360, y: 540, width: 20, height: 20 },
      '18_diagnosis_pointer_1': { x: 390, y: 540, width: 30, height: 20 },
      '19_charges_1': { x: 430, y: 540, width: 60, height: 20 },
      '20_days_units_1': { x: 500, y: 540, width: 30, height: 20 },
      '21_epsdt_1': { x: 540, y: 540, width: 20, height: 20 },
      
      // Additional service lines (2-6) follow same pattern with y-offset
      
      // Provider Information
      '24j_rendering_provider_id': { x: 50, y: 680, width: 100, height: 20 },
      '25_federal_tax_id': { x: 200, y: 680, width: 100, height: 20 },
      '25_ssn_ein': { x: 310, y: 680, width: 15, height: 15 },
      '26_patient_account_no': { x: 350, y: 680, width: 80, height: 20 },
      '27_accept_assignment_yes': { x: 450, y: 680, width: 15, height: 15 },
      '27_accept_assignment_no': { x: 480, y: 680, width: 15, height: 15 },
      '28_total_charge': { x: 520, y: 680, width: 60, height: 20 },
      
      // Bottom section
      '29_amount_paid': { x: 50, y: 710, width: 60, height: 20 },
      '30_rsvd_for_nucc': { x: 120, y: 710, width: 60, height: 20 },
      '31_signature_date': { x: 200, y: 710, width: 100, height: 20 },
      '32_service_facility_name': { x: 320, y: 710, width: 150, height: 20 },
      '32a_service_facility_npi': { x: 480, y: 710, width: 80, height: 20 },
      
      '33_billing_provider_name': { x: 50, y: 740, width: 200, height: 20 },
      '33_billing_provider_address': { x: 50, y: 760, width: 200, height: 20 },
      '33a_billing_provider_npi': { x: 280, y: 740, width: 100, height: 20 },
      '33b_billing_provider_other_id': { x: 400, y: 740, width: 100, height: 20 }
    };
  }

  /**
   * Initialize validation rules for CMS-1500 fields
   */
  initializeValidationRules() {
    return {
      '1a_insured_id': {
        required: true,
        maxLength: 20,
        pattern: /^[A-Za-z0-9\-]+$/
      },
      '2_patient_name': {
        required: true,
        maxLength: 28,
        format: 'LAST, FIRST MI'
      },
      '3_birth_date': {
        required: true,
        format: 'MM DD YYYY',
        pattern: /^\d{2}\s\d{2}\s\d{4}$/
      },
      '5_patient_address': {
        required: true,
        maxLength: 29
      },
      '5_patient_city': {
        required: true,
        maxLength: 20
      },
      '5_patient_state': {
        required: true,
        length: 2,
        pattern: /^[A-Z]{2}$/
      },
      '5_patient_zip': {
        required: true,
        pattern: /^\d{5}(-\d{4})?$/
      },
      '11_insured_policy': {
        required: true,
        maxLength: 29
      },
      '12_signature': {
        required: true,
        allowedValues: ['SIGNATURE ON FILE', 'SOF']
      },
      '21_diagnosis_codes': {
        required: true,
        maxCodes: 12,
        format: 'ICD-10-CM'
      },
      '24_service_lines': {
        required: true,
        maxLines: 6
      },
      '25_federal_tax_id': {
        required: true,
        pattern: /^\d{2}-\d{7}$/
      },
      '33a_billing_provider_npi': {
        required: true,
        length: 10,
        pattern: /^\d{10}$/
      }
    };
  }

  /**
   * Generate CMS-1500 form for a claim
   * @param {number} claimId - Claim ID
   * @param {Object} options - Generation options
   * @returns {Buffer} PDF buffer
   */
  async generateForm(claimId, options = {}) {
    try {
      // Get claim data
      const claimData = await this.getClaimData(claimId);
      
      // Validate claim data
      const validationResult = this.validateClaimData(claimData);
      if (!validationResult.isValid) {
        throw createValidationError('Claim data validation failed', {
          errors: validationResult.errors
        });
      }

      // Transform claim data to CMS-1500 format
      const formData = this.transformClaimData(claimData);
      
      // Generate PDF
      const pdfBuffer = await this.createPDF(formData, options);
      
      // Log form generation
      await this.logFormGeneration(claimId, {
        success: true,
        formType: 'CMS-1500',
        options,
        generatedBy: options.userId
      });
      
      return pdfBuffer;
    } catch (error) {
      // Log generation error
      await this.logFormGeneration(claimId, {
        success: false,
        error: error.message,
        formType: 'CMS-1500',
        options
      });
      
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to generate CMS-1500 form', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get claim data with all required information
   * @param {number} claimId - Claim ID
   * @returns {Object} Complete claim data
   */
  async getClaimData(claimId) {
    const query = `
      SELECT 
        b.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.middle_initial as patient_middle_initial,
        p.date_of_birth as patient_dob,
        p.gender as patient_gender,
        p.address as patient_address,
        p.city as patient_city,
        p.state as patient_state,
        p.zip_code as patient_zip,
        p.phone as patient_phone,
        p.ssn as patient_ssn,
        
        i.insurance_name as primary_insurance_name,
        i.policy_number as primary_policy_number,
        i.group_number as primary_group_number,
        i.subscriber_name as primary_subscriber_name,
        i.subscriber_dob as primary_subscriber_dob,
        i.subscriber_gender as primary_subscriber_gender,
        i.subscriber_address as primary_subscriber_address,
        i.subscriber_city as primary_subscriber_city,
        i.subscriber_state as primary_subscriber_state,
        i.subscriber_zip as primary_subscriber_zip,
        i.relationship_to_patient as primary_relationship,
        
        pr.first_name as provider_first_name,
        pr.last_name as provider_last_name,
        pr.npi_number as provider_npi,
        pr.tax_id as provider_tax_id,
        pr.address as provider_address,
        pr.city as provider_city,
        pr.state as provider_state,
        pr.zip_code as provider_zip,
        pr.phone as provider_phone,
        
        f.name as facility_name,
        f.npi_number as facility_npi,
        f.address as facility_address,
        f.city as facility_city,
        f.state as facility_state,
        f.zip_code as facility_zip
        
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

    // Get diagnosis codes
    const diagnosisQuery = `
      SELECT diagnosis_code, diagnosis_description, pointer_position
      FROM claim_diagnoses 
      WHERE claim_id = ? 
      ORDER BY pointer_position
    `;
    
    const diagnosisCodes = await executeQuery(diagnosisQuery, [claimId]);

    // Get service lines
    const serviceQuery = `
      SELECT 
        service_date_from,
        service_date_to,
        place_of_service,
        emergency_indicator,
        procedure_code,
        modifier1,
        modifier2,
        modifier3,
        modifier4,
        diagnosis_pointer,
        charges,
        units,
        epsdt_family_plan,
        rendering_provider_id,
        line_number
      FROM claim_service_lines 
      WHERE claim_id = ? 
      ORDER BY line_number
    `;
    
    const serviceLines = await executeQuery(serviceQuery, [claimId]);

    return {
      ...claimData,
      diagnosis_codes: diagnosisCodes,
      service_lines: serviceLines
    };
  }

  /**
   * Validate claim data against CMS-1500 requirements
   * @param {Object} claimData - Claim data to validate
   * @returns {Object} Validation result
   */
  validateClaimData(claimData) {
    const errors = [];
    const warnings = [];

    // Required patient information
    if (!claimData.patient_first_name || !claimData.patient_last_name) {
      errors.push('Patient name is required');
    }

    if (!claimData.patient_dob) {
      errors.push('Patient date of birth is required');
    }

    if (!claimData.patient_gender) {
      errors.push('Patient gender is required');
    }

    if (!claimData.patient_address || !claimData.patient_city || 
        !claimData.patient_state || !claimData.patient_zip) {
      errors.push('Complete patient address is required');
    }

    // Required insurance information
    if (!claimData.primary_insurance_name) {
      errors.push('Primary insurance name is required');
    }

    if (!claimData.primary_policy_number) {
      errors.push('Primary insurance policy number is required');
    }

    // Required provider information
    if (!claimData.provider_npi) {
      errors.push('Provider NPI is required');
    } else if (!/^\d{10}$/.test(claimData.provider_npi)) {
      errors.push('Provider NPI must be 10 digits');
    }

    if (!claimData.provider_tax_id) {
      errors.push('Provider tax ID is required');
    }

    // Validate diagnosis codes
    if (!claimData.diagnosis_codes || claimData.diagnosis_codes.length === 0) {
      errors.push('At least one diagnosis code is required');
    } else if (claimData.diagnosis_codes.length > 12) {
      errors.push('Maximum 12 diagnosis codes allowed');
    }

    // Validate service lines
    if (!claimData.service_lines || claimData.service_lines.length === 0) {
      errors.push('At least one service line is required');
    } else if (claimData.service_lines.length > 6) {
      errors.push('Maximum 6 service lines allowed on CMS-1500');
    }

    // Validate each service line
    claimData.service_lines?.forEach((line, index) => {
      if (!line.service_date_from) {
        errors.push(`Service line ${index + 1}: Service date is required`);
      }

      if (!line.procedure_code) {
        errors.push(`Service line ${index + 1}: Procedure code is required`);
      }

      if (!line.charges || line.charges <= 0) {
        errors.push(`Service line ${index + 1}: Valid charge amount is required`);
      }

      if (!line.units || line.units <= 0) {
        errors.push(`Service line ${index + 1}: Valid unit count is required`);
      }

      if (!line.diagnosis_pointer) {
        warnings.push(`Service line ${index + 1}: Diagnosis pointer recommended`);
      }
    });

    // Additional validations
    if (claimData.patient_state && !/^[A-Z]{2}$/.test(claimData.patient_state)) {
      errors.push('Patient state must be 2-letter abbreviation');
    }

    if (claimData.patient_zip && !/^\d{5}(-\d{4})?$/.test(claimData.patient_zip)) {
      errors.push('Patient ZIP code format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform claim data to CMS-1500 format
   * @param {Object} claimData - Raw claim data
   * @returns {Object} Formatted form data
   */
  transformClaimData(claimData) {
    const formData = {};

    // Box 1 - Type of Insurance (determine from insurance type)
    const insuranceType = this.determineInsuranceType(claimData.primary_insurance_name);
    formData['1_' + insuranceType] = 'X';

    // Box 1a - Insured's ID Number
    formData['1a_insured_id'] = claimData.primary_policy_number;

    // Box 2 - Patient's Name
    formData['2_patient_name'] = this.formatPatientName(
      claimData.patient_last_name,
      claimData.patient_first_name,
      claimData.patient_middle_initial
    );

    // Box 3 - Patient's Birth Date and Sex
    formData['3_birth_date'] = this.formatDate(claimData.patient_dob, 'MM DD YYYY');
    formData['3_sex_' + (claimData.patient_gender?.toLowerCase() === 'male' ? 'male' : 'female')] = 'X';

    // Box 4 - Insured's Name
    formData['4_insured_name'] = claimData.primary_subscriber_name || formData['2_patient_name'];

    // Box 5 - Patient's Address
    formData['5_patient_address'] = claimData.patient_address;
    formData['5_patient_city'] = claimData.patient_city;
    formData['5_patient_state'] = claimData.patient_state;
    formData['5_patient_zip'] = claimData.patient_zip;

    // Box 6 - Patient Relationship to Insured
    const relationship = this.mapRelationship(claimData.primary_relationship);
    formData['6_' + relationship] = 'X';

    // Box 7 - Insured's Address (if different from patient)
    if (claimData.primary_subscriber_address) {
      formData['7_insured_address'] = claimData.primary_subscriber_address;
      formData['7_insured_city'] = claimData.primary_subscriber_city;
      formData['7_insured_state'] = claimData.primary_subscriber_state;
      formData['7_insured_zip'] = claimData.primary_subscriber_zip;
    }

    // Box 11 - Insured's Policy Group or FECA Number
    formData['11_insured_policy'] = claimData.primary_group_number || claimData.primary_policy_number;

    // Box 11a - Insured's Date of Birth and Sex
    if (claimData.primary_subscriber_dob) {
      formData['11a_insured_dob'] = this.formatDate(claimData.primary_subscriber_dob, 'MM DD YYYY');
      const subscriberGender = claimData.primary_subscriber_gender?.toLowerCase();
      if (subscriberGender) {
        formData['11a_insured_sex_' + (subscriberGender === 'male' ? 'male' : 'female')] = 'X';
      }
    }

    // Box 12 - Patient's Signature
    formData['12_signature'] = 'SIGNATURE ON FILE';
    formData['12_date'] = this.formatDate(new Date(), 'MM DD YY');

    // Box 13 - Insured's Signature
    formData['13_signature'] = 'SIGNATURE ON FILE';

    // Box 21 - Diagnosis Codes
    claimData.diagnosis_codes.forEach((diagnosis, index) => {
      if (index < 12) {
        const position = String.fromCharCode(65 + index); // A, B, C, etc.
        formData[`21_diagnosis_${position}`] = diagnosis.diagnosis_code;
      }
    });

    // Service Lines (Boxes 14-23)
    claimData.service_lines.forEach((line, index) => {
      if (index < 6) {
        const lineNum = index + 1;
        formData[`14_date_from_${lineNum}`] = this.formatDate(line.service_date_from, 'MM DD YY');
        formData[`14_date_to_${lineNum}`] = this.formatDate(line.service_date_to || line.service_date_from, 'MM DD YY');
        formData[`15_place_of_service_${lineNum}`] = line.place_of_service;
        formData[`16_emg_${lineNum}`] = line.emergency_indicator ? 'Y' : '';
        formData[`17_procedure_code_${lineNum}`] = line.procedure_code;
        formData[`17_modifier1_${lineNum}`] = line.modifier1 || '';
        formData[`17_modifier2_${lineNum}`] = line.modifier2 || '';
        formData[`18_diagnosis_pointer_${lineNum}`] = line.diagnosis_pointer;
        formData[`19_charges_${lineNum}`] = this.formatCurrency(line.charges, false);
        formData[`20_days_units_${lineNum}`] = line.units;
        formData[`21_epsdt_${lineNum}`] = line.epsdt_family_plan ? 'Y' : '';
      }
    });

    // Provider Information
    formData['25_federal_tax_id'] = claimData.provider_tax_id;
    formData['25_ssn_ein'] = 'X'; // Assuming EIN
    formData['26_patient_account_no'] = claimData.patient_account_number || claimData.id;
    formData['27_accept_assignment_yes'] = 'X'; // Assuming yes
    formData['28_total_charge'] = this.formatCurrency(claimData.total_amount, false);
    formData['29_amount_paid'] = this.formatCurrency(claimData.amount_paid || 0, false);
    formData['31_signature_date'] = this.formatDate(new Date(), 'MM DD YY');

    // Service Facility
    if (claimData.facility_name) {
      formData['32_service_facility_name'] = claimData.facility_name;
      formData['32a_service_facility_npi'] = claimData.facility_npi;
    }

    // Billing Provider
    formData['33_billing_provider_name'] = `${claimData.provider_first_name} ${claimData.provider_last_name}`;
    formData['33_billing_provider_address'] = `${claimData.provider_address}, ${claimData.provider_city}, ${claimData.provider_state} ${claimData.provider_zip}`;
    formData['33a_billing_provider_npi'] = claimData.provider_npi;

    return formData;
  }

  /**
   * Create PDF document with CMS-1500 form
   * @param {Object} formData - Formatted form data
   * @param {Object} options - PDF generation options
   * @returns {Buffer} PDF buffer
   */
  async createPDF(formData, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: {
            top: 0,
            bottom: 0,
            left: 0,
            right: 0
          }
        });

        // Collect PDF data
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Set font
        doc.font('Courier');
        doc.fontSize(this.fonts.size);

        // Draw form background (optional - can load CMS-1500 template)
        if (options.includeFormBackground) {
          this.drawFormBackground(doc);
        }

        // Fill form fields
        this.fillFormFields(doc, formData);

        // Add watermark if draft
        if (options.isDraft) {
          this.addDraftWatermark(doc);
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Draw CMS-1500 form background
   * @param {PDFDocument} doc - PDF document
   */
  drawFormBackground(doc) {
    // Draw form title
    doc.fontSize(14)
       .text('HEALTH INSURANCE CLAIM FORM', 50, 30, { align: 'center' });
    
    doc.fontSize(10)
       .text('APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12', 50, 50, { align: 'center' });

    // Draw form boxes (simplified - in production, you'd load the official form template)
    const boxStyle = {
      lineWidth: 0.5,
      strokeColor: 'black',
      fillColor: null
    };

    // Draw major section boxes
    this.drawBox(doc, 40, 100, 520, 50, 'PICA PICA', boxStyle); // Header section
    this.drawBox(doc, 40, 160, 260, 200, 'PATIENT AND INSURED INFORMATION', boxStyle);
    this.drawBox(doc, 310, 160, 250, 200, 'PATIENT\'S OR AUTHORIZED PERSON\'S SIGNATURE', boxStyle);
    this.drawBox(doc, 40, 370, 520, 200, 'PHYSICIAN OR SUPPLIER INFORMATION', boxStyle);
    
    // Add field labels
    doc.fontSize(8);
    this.addFieldLabels(doc);
  }

  /**
   * Draw a box on the PDF
   * @param {PDFDocument} doc - PDF document
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} width - Box width
   * @param {number} height - Box height
   * @param {string} label - Box label
   * @param {Object} style - Box style
   */
  drawBox(doc, x, y, width, height, label, style) {
    doc.rect(x, y, width, height)
       .stroke();
    
    if (label) {
      doc.fontSize(6)
         .text(label, x + 2, y + 2);
    }
  }

  /**
   * Add field labels to the form
   * @param {PDFDocument} doc - PDF document
   */
  addFieldLabels(doc) {
    const labels = {
      '1. TYPE OF INSURANCE': { x: 50, y: 110 },
      '1a. INSURED\'S I.D. NUMBER': { x: 50, y: 140 },
      '2. PATIENT\'S NAME': { x: 280, y: 140 },
      '3. PATIENT\'S BIRTH DATE': { x: 50, y: 170 },
      '4. INSURED\'S NAME': { x: 280, y: 170 },
      '5. PATIENT\'S ADDRESS': { x: 50, y: 200 },
      '6. PATIENT RELATIONSHIP TO INSURED': { x: 280, y: 200 },
      '7. INSURED\'S ADDRESS': { x: 280, y: 230 },
      '11. INSURED\'S POLICY GROUP OR FECA NUMBER': { x: 50, y: 410 },
      '12. PATIENT\'S OR AUTHORIZED PERSON\'S SIGNATURE': { x: 50, y: 500 },
      '21. DIAGNOSIS OR NATURE OF ILLNESS OR INJURY': { x: 50, y: 580 },
      '24. A. DATE(S) OF SERVICE': { x: 50, y: 620 },
      '25. FEDERAL TAX I.D. NUMBER': { x: 200, y: 670 },
      '31. SIGNATURE OF PHYSICIAN OR SUPPLIER': { x: 200, y: 700 },
      '32. SERVICE FACILITY LOCATION INFORMATION': { x: 320, y: 700 },
      '33. BILLING PROVIDER INFO & PH #': { x: 50, y: 730 }
    };

    Object.entries(labels).forEach(([label, position]) => {
      doc.fontSize(6)
         .text(label, position.x, position.y);
    });
  }

  /**
   * Fill form fields with data
   * @param {PDFDocument} doc - PDF document
   * @param {Object} formData - Form data
   */
  fillFormFields(doc, formData) {
    doc.fontSize(this.fonts.size);

    // Fill each field based on position mapping
    Object.entries(formData).forEach(([fieldName, value]) => {
      const position = this.fieldPositions[fieldName];
      if (position && value) {
        // Handle checkboxes
        if (value === 'X') {
          doc.fontSize(12)
             .text('X', position.x, position.y)
             .fontSize(this.fonts.size);
        } else {
          // Handle text fields
          const displayValue = this.formatFieldValue(fieldName, value);
          doc.text(displayValue, position.x, position.y, {
            width: position.width,
            height: position.height,
            ellipsis: true
          });
        }
      }
    });
  }

  /**
   * Add draft watermark to PDF
   * @param {PDFDocument} doc - PDF document
   */
  addDraftWatermark(doc) {
    doc.save();
    doc.rotate(45, { origin: [300, 400] })
       .fontSize(72)
       .fillColor('red', 0.3)
       .text('DRAFT', 200, 350)
       .restore();
  }

  /**
   * Format field value for display
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @returns {string} Formatted value
   */
  formatFieldValue(fieldName, value) {
    if (!value) return '';

    // Handle specific field formatting
    if (fieldName.includes('date')) {
      return this.formatDate(value, 'MM DD YY');
    }

    if (fieldName.includes('charge') || fieldName.includes('amount')) {
      return this.formatCurrency(value, false);
    }

    // Truncate long text to fit field width
    const maxLength = this.getMaxFieldLength(fieldName);
    if (typeof value === 'string' && value.length > maxLength) {
      return value.substring(0, maxLength);
    }

    return String(value).toUpperCase();
  }

  /**
   * Get maximum field length based on CMS specifications
   * @param {string} fieldName - Field name
   * @returns {number} Maximum length
   */
  getMaxFieldLength(fieldName) {
    const lengthMap = {
      '1a_insured_id': 20,
      '2_patient_name': 28,
      '5_patient_address': 29,
      '5_patient_city': 20,
      '5_patient_state': 2,
      '5_patient_zip': 10,
      '11_insured_policy': 29,
      '25_federal_tax_id': 15,
      '33a_billing_provider_npi': 10
    };

    return lengthMap[fieldName] || 50;
  }

  /**
   * Helper methods for data transformation
   */
  
  determineInsuranceType(insuranceName) {
    if (!insuranceName) return 'other';
    
    const name = insuranceName.toLowerCase();
    if (name.includes('medicare')) return 'medicare';
    if (name.includes('medicaid')) return 'medicaid';
    if (name.includes('tricare')) return 'tricare';
    if (name.includes('champva')) return 'champva';
    if (name.includes('feca')) return 'feca';
    return 'group_health';
  }

  formatPatientName(lastName, firstName, middleInitial) {
    let name = `${lastName || ''}, ${firstName || ''}`;
    if (middleInitial) {
      name += ` ${middleInitial}`;
    }
    return name.toUpperCase();
  }

  mapRelationship(relationship) {
    if (!relationship) return 'self';
    
    const rel = relationship.toLowerCase();
    if (rel.includes('spouse')) return 'spouse';
    if (rel.includes('child') || rel.includes('dependent')) return 'child';
    if (rel.includes('self') || rel.includes('patient')) return 'self';
    return 'other';
  }

  formatDate(date, format = 'MM DD YY') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const shortYear = String(year).slice(-2);
    
    switch (format) {
      case 'MM DD YYYY':
        return `${month} ${day} ${year}`;
      case 'MM DD YY':
        return `${month} ${day} ${shortYear}`;
      default:
        return `${month}/${day}/${year}`;
    }
  }

  formatCurrency(amount, includeDollarSign = true) {
    if (!amount) return '0.00';
    
    const num = parseFloat(amount);
    if (isNaN(num)) return '0.00';
    
    const formatted = num.toFixed(2);
    return includeDollarSign ? `$${formatted}` : formatted;
  }

  /**
   * Log form generation activity
   * @param {number} claimId - Claim ID
   * @param {Object} logData - Log data
   */
  async logFormGeneration(claimId, logData) {
    try {
      await this.historyService.addHistoryEntry(claimId, {
        action: 'form_generated',
        details: {
          formType: logData.formType,
          success: logData.success,
          error: logData.error,
          options: logData.options,
          generatedBy: logData.generatedBy,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log form generation:', error);
    }
  }

  /**
   * Validate form data before generation
   * @param {number} claimId - Claim ID
   * @returns {Object} Validation result
   */
  async validateForm(claimId) {
    try {
      const claimData = await this.getClaimData(claimId);
      return this.validateClaimData(claimData);
    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
        warnings: []
      };
    }
  }

  /**
   * Preview form data without generating PDF
   * @param {number} claimId - Claim ID
   * @returns {Object} Form preview data
   */
  async previewForm(claimId) {
    try {
      const claimData = await this.getClaimData(claimId);
      const formData = this.transformClaimData(claimData);
      const validation = this.validateClaimData(claimData);
      
      return {
        formData,
        validation,
        claimData: {
          patientName: formData['2_patient_name'],
          providerId: claimData.provider_npi,
          totalAmount: formData['28_total_charge'],
          serviceLines: claimData.service_lines.length,
          diagnosisCodes: claimData.diagnosis_codes.length
        }
      };
    } catch (error) {
      throw createDatabaseError('Failed to preview form', {
        originalError: error.message,
        claimId
      });
    }
  }
}

module.exports = CMS1500Generator;