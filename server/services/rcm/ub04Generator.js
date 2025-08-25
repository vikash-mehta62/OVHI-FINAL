/**
 * UB-04 Form Generator Service
 * Generates compliant UB-04 forms for institutional claims
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

class UB04Generator {
  constructor() {
    this.name = 'UB04Generator';
    this.historyService = new ClaimHistoryService();
    
    // UB-04 form dimensions (in points, 72 points = 1 inch)
    this.formWidth = 612; // 8.5 inches
    this.formHeight = 792; // 11 inches
    
    // Font specifications per UB-04 requirements
    this.fonts = {
      primary: 'Courier', // Monospace font required
      size: 10,
      smallSize: 8
    };
    
    // Form locator positions based on UB-04 specifications
    this.formLocators = this.initializeFormLocators();
    
    // Validation rules for UB-04 fields
    this.validationRules = this.initializeValidationRules();
    
    // Revenue codes and descriptions
    this.revenueCodes = this.initializeRevenueCodes();
    
    // Condition codes
    this.conditionCodes = this.initializeConditionCodes();
    
    // Occurrence codes
    this.occurrenceCodes = this.initializeOccurrenceCodes();
    
    // Bill type codes
    this.billTypeCodes = this.initializeBillTypeCodes();
  }

  /**
   * Initialize UB-04 form locator positions
   * Form locators are numbered 1-81 on the UB-04
   */
  initializeFormLocators() {
    return {
      // Header Information
      '1_provider_name': { x: 50, y: 80, width: 300, height: 20 },
      '2_provider_address': { x: 50, y: 100, width: 300, height: 40 },
      '3_patient_control_number': { x: 400, y: 80, width: 150, height: 20 },
      '4_type_of_bill': { x: 400, y: 100, width: 80, height: 20 },
      '5_federal_tax_number': { x: 480, y: 100, width: 100, height: 20 },
      
      // Patient Information
      '8_patient_name': { x: 50, y: 140, width: 200, height: 20 },
      '9_patient_address': { x: 260, y: 140, width: 200, height: 40 },
      '10_patient_birth_date': { x: 470, y: 140, width: 80, height: 20 },
      '11_patient_sex': { x: 550, y: 140, width: 30, height: 20 },
      '12_admission_date': { x: 50, y: 180, width: 80, height: 20 },
      '13_admission_hour': { x: 140, y: 180, width: 40, height: 20 },
      '14_type_of_admission': { x: 190, y: 180, width: 40, height: 20 },
      '15_source_of_admission': { x: 240, y: 180, width: 40, height: 20 },
      '16_discharge_hour': { x: 290, y: 180, width: 40, height: 20 },
      '17_patient_status': { x: 340, y: 180, width: 40, height: 20 },
      
      // Condition Codes (18-28)
      '18_condition_codes': { x: 50, y: 200, width: 500, height: 40 },
      
      // Occurrence Codes and Dates (31-34)
      '31_occurrence_codes': { x: 50, y: 250, width: 500, height: 60 },
      
      // Value Codes and Amounts (39-41)
      '39_value_codes': { x: 50, y: 320, width: 500, height: 60 },
      
      // Revenue Codes and Service Details (42-49)
      '42_revenue_code_1': { x: 50, y: 390, width: 60, height: 20 },
      '43_revenue_description_1': { x: 120, y: 390, width: 150, height: 20 },
      '44_hcpcs_rates_1': { x: 280, y: 390, width: 80, height: 20 },
      '45_service_date_1': { x: 370, y: 390, width: 60, height: 20 },
      '46_service_units_1': { x: 440, y: 390, width: 40, height: 20 },
      '47_total_charges_1': { x: 490, y: 390, width: 70, height: 20 },
      '48_non_covered_charges_1': { x: 570, y: 390, width: 70, height: 20 },
      
      // Totals
      '55_estimated_amount_due': { x: 400, y: 650, width: 100, height: 20 },
      '56_total_charges': { x: 510, y: 650, width: 100, height: 20 },
      
      // Payer Information
      '50_payer_name_1': { x: 50, y: 680, width: 200, height: 20 },
      '51_health_plan_id_1': { x: 260, y: 680, width: 100, height: 20 },
      '52_release_of_information_1': { x: 370, y: 680, width: 80, height: 20 },
      '53_assignment_of_benefits_1': { x: 460, y: 680, width: 80, height: 20 },
      '54_prior_payments_1': { x: 550, y: 680, width: 80, height: 20 },
      
      // Provider Information
      '76_attending_physician_npi': { x: 50, y: 720, width: 120, height: 20 },
      '77_operating_physician_npi': { x: 180, y: 720, width: 120, height: 20 },
      '78_other_physician_npi': { x: 310, y: 720, width: 120, height: 20 },
      
      // Remarks and Additional Information
      '80_remarks': { x: 50, y: 750, width: 500, height: 30 },
      '81_code_code': { x: 560, y: 750, width: 50, height: 30 }
    };
  }

  /**
   * Initialize validation rules for UB-04 fields
   */
  initializeValidationRules() {
    return {
      '1_provider_name': {
        required: true,
        maxLength: 60
      },
      '3_patient_control_number': {
        required: true,
        maxLength: 20,
        pattern: /^[A-Za-z0-9\-]+$/
      },
      '4_type_of_bill': {
        required: true,
        length: 4,
        pattern: /^\d{4}$/
      },
      '5_federal_tax_number': {
        required: true,
        pattern: /^\d{2}-\d{7}$/
      },
      '8_patient_name': {
        required: true,
        maxLength: 25,
        format: 'LAST,FIRST MI'
      },
      '10_patient_birth_date': {
        required: true,
        format: 'MMDDYYYY',
        pattern: /^\d{8}$/
      },
      '11_patient_sex': {
        required: true,
        allowedValues: ['M', 'F', 'U']
      },
      '12_admission_date': {
        required: true,
        format: 'MMDDYYYY',
        pattern: /^\d{8}$/
      },
      '42_revenue_codes': {
        required: true,
        minLines: 1,
        maxLines: 22
      },
      '76_attending_physician_npi': {
        required: true,
        length: 10,
        pattern: /^\d{10}$/
      }
    };
  }

  /**
   * Initialize revenue codes
   */
  initializeRevenueCodes() {
    return {
      '0100': 'All Inclusive Rate',
      '0110': 'Room and Board - Private',
      '0120': 'Room and Board - Semi-Private',
      '0130': 'Room and Board - Ward',
      '0140': 'Room and Board - ICU',
      '0150': 'Room and Board - Coronary Care',
      '0160': 'Room and Board - Other Intensive Care',
      '0170': 'Room and Board - Nursery',
      '0200': 'Intensive Care Unit',
      '0210': 'Coronary Care Unit',
      '0300': 'Laboratory',
      '0320': 'Radiology - Diagnostic',
      '0330': 'Radiology - Therapeutic',
      '0340': 'Nuclear Medicine',
      '0350': 'CT Scan',
      '0360': 'Operating Room Services',
      '0370': 'Anesthesia',
      '0380': 'Blood',
      '0390': 'Blood Storage and Processing',
      '0400': 'Other Imaging Services',
      '0410': 'Respiratory Services',
      '0420': 'Physical Therapy',
      '0430': 'Occupational Therapy',
      '0440': 'Speech-Language Pathology',
      '0450': 'Emergency Room',
      '0460': 'Pulmonary Function',
      '0470': 'Audiology',
      '0480': 'Cardiology',
      '0490': 'Ambulatory Surgical Care',
      '0500': 'Outpatient Services',
      '0510': 'Clinic',
      '0520': 'Freestanding Clinic',
      '0530': 'Osteopathic Services',
      '0540': 'Ambulance',
      '0550': 'Skilled Nursing',
      '0560': 'Medical Social Services',
      '0570': 'Home Health Services',
      '0580': 'Specialized Services',
      '0590': 'Other Therapeutic Services',
      '0600': 'Oxygen',
      '0610': 'MRI',
      '0620': 'Medical/Surgical Supplies',
      '0630': 'Pharmacy',
      '0640': 'Home IV Therapy Services',
      '0650': 'Hospice Services',
      '0660': 'Respite Care',
      '0670': 'Outpatient Special Residence Charges',
      '0680': 'Trauma Response',
      '0690': 'Transportation Services',
      '0700': 'Cast Room',
      '0710': 'Recovery Room',
      '0720': 'Labor Room/Delivery',
      '0730': 'EKG/ECG',
      '0740': 'EEG',
      '0750': 'Gastrointestinal Services',
      '0760': 'Treatment or Observation Room',
      '0770': 'Preventive Care Services',
      '0780': 'Telemedicine',
      '0790': 'Extra-Corporeal Shock Wave Therapy',
      '0800': 'Inpatient Renal Dialysis',
      '0810': 'Organ Acquisition',
      '0820': 'Hemodialysis - Outpatient or Home',
      '0830': 'Peritoneal Dialysis - Outpatient or Home',
      '0840': 'Continuous Ambulatory Peritoneal Dialysis',
      '0850': 'Continuous Cycling Peritoneal Dialysis',
      '0860': 'Miscellaneous Dialysis',
      '0870': 'Peritoneal Dialysis - Composite or Other Rate',
      '0880': 'Miscellaneous Donor Bank',
      '0890': 'Reserved for National Assignment',
      '0900': 'Psychiatric/Psychological Treatments',
      '0910': 'Psychiatric/Psychological Services',
      '0911': 'Rehabilitation Services',
      '0914': 'Rehabilitation Services - Individual',
      '0915': 'Rehabilitation Services - Group',
      '0916': 'Rehabilitation Services - Other',
      '0917': 'Rehabilitation Services - Evaluation',
      '0918': 'Rehabilitation Services - Testing',
      '0919': 'Rehabilitation Services - Other',
      '0920': 'Other Diagnostic Services',
      '0921': 'Peripheral Vascular Lab',
      '0922': 'Electromyography',
      '0923': 'Pap Smear',
      '0924': 'Allergy Test',
      '0925': 'Pregnancy Test',
      '0929': 'Other Diagnostic Service',
      '0940': 'Other Therapeutic Services - Extension of 0569',
      '0941': 'Recreational Therapy',
      '0942': 'Education/Training',
      '0943': 'Cardiac Rehabilitation',
      '0944': 'Drug Rehabilitation',
      '0945': 'Alcohol Rehabilitation',
      '0946': 'Complex Medical Equipment - Routine',
      '0947': 'Complex Medical Equipment - Ancillary',
      '0948': 'Pulmonary Rehabilitation',
      '0949': 'Other Therapeutic Services',
      '0950': 'Other Therapeutic Services - Extension of 0949',
      '0951': 'Athletic Training',
      '0952': 'Kinesiotherapy',
      '0959': 'Other Therapeutic Services - Other Extension',
      '0960': 'Professional Fees',
      '0961': 'Professional Fees - Psychiatric',
      '0962': 'Professional Fees - Ophthalmology',
      '0963': 'Professional Fees - Anesthesiologist (MD)',
      '0964': 'Professional Fees - Anesthetist (CRNA)',
      '0969': 'Professional Fees - Other',
      '0971': 'Professional Fees - Laboratory',
      '0972': 'Professional Fees - Radiology - Diagnostic',
      '0973': 'Professional Fees - Radiology - Therapeutic',
      '0974': 'Professional Fees - Radiology - Nuclear Medicine',
      '0975': 'Professional Fees - Operating Room',
      '0976': 'Professional Fees - Respiratory Therapy',
      '0977': 'Professional Fees - Physical Therapy',
      '0978': 'Professional Fees - Occupational Therapy',
      '0979': 'Professional Fees - Speech Pathology',
      '0980': 'Professional Fees - Emergency Room',
      '0981': 'Professional Fees - Outpatient Services',
      '0982': 'Professional Fees - Clinic',
      '0983': 'Professional Fees - Medical Social Services',
      '0984': 'Professional Fees - EKG',
      '0985': 'Professional Fees - EEG',
      '0986': 'Professional Fees - Hospital Visit',
      '0987': 'Professional Fees - Consultation',
      '0988': 'Professional Fees - Private Duty Nursing',
      '0989': 'Professional Fees - Other',
      '0990': 'Behavioral Health Treatments/Services',
      '0991': 'Behavioral Health Treatments/Services - Alcohol/Drug Services',
      '0992': 'Behavioral Health Treatments/Services - Psychiatric/Psychological Services',
      '0993': 'Behavioral Health Treatments/Services - Detoxification Services',
      '0994': 'Behavioral Health Treatments/Services - Rehabilitation Services',
      '0995': 'Behavioral Health Treatments/Services - Residential Services',
      '0996': 'Behavioral Health Treatments/Services - Partial Hospitalization - Less Intensive',
      '0997': 'Behavioral Health Treatments/Services - Partial Hospitalization - Intensive',
      '0998': 'Behavioral Health Treatments/Services - Alternative Residential Services',
      '0999': 'Behavioral Health Treatments/Services - Other'
    };
  }

  /**
   * Initialize condition codes
   */
  initializeConditionCodes() {
    return {
      '01': 'Military service related',
      '02': 'Condition is employment related',
      '03': 'Patient covered by insurance not reflected here',
      '04': 'Information only bill',
      '05': 'Lien has been filed',
      '06': 'ESRD patient in first 18 months of entitlement covered by EGHP',
      '07': 'Treatment of non-terminal condition for hospice patient',
      '08': 'Beneficiary would not provide information concerning other insurance coverage',
      '09': 'Neither patient nor spouse is employed',
      '10': 'Patient and/or spouse is employed but no EGHP exists',
      '11': 'Disabled beneficiary but no LGHP',
      '20': 'Beneficiary requested billing',
      '21': 'Billing for Denial Notice',
      '31': 'Patient is student (full time-day)',
      '32': 'Patient is student (cooperative/work study program)',
      '33': 'Patient is student (full time-night)',
      '34': 'Patient is student (Part time)',
      '40': 'Same day transfer',
      '41': 'Partial hospitalization',
      '42': 'Continuing care not related to inpatient admission',
      '43': 'Continuing care not provided within prescribed post-discharge window',
      '44': 'Inpatient admission changed to outpatient',
      '45': 'Ambiguous gender category',
      '46': 'Non-availability statement on file',
      '55': 'Skilled Nursing Facility bed not available',
      '56': 'Medical appropriateness',
      '57': 'SNF readmission',
      '60': 'Day outlier',
      '61': 'Cost outlier',
      '67': 'Beneficiary elects not to use lifetime reserve (LTR) days',
      '68': 'Beneficiary elects to use lifetime reserve (LTR) days',
      '70': 'Self-administered EPO',
      '71': 'Full care in unit',
      '72': 'Self-care in unit',
      '73': 'Self-care training',
      '74': 'Home',
      '75': 'Home - 100% reimbursement',
      '76': 'Back-up in-facility dialysis',
      '77': 'Provider accepts payment by primary payer as payment in full',
      '78': 'New coverage not implemented by HMO',
      '79': 'Comprehensive Outpatient Rehabilitation Facility (CORF) services provided off-site'
    };
  }

  /**
   * Initialize occurrence codes
   */
  initializeOccurrenceCodes() {
    return {
      '01': 'Accident/medical coverage',
      '02': 'No fault insurance involved-including auto accident/other',
      '03': 'Accident/tort liability',
      '04': 'Accident/employment related',
      '05': 'Accident/no medical or liability coverage',
      '06': 'Crime victim',
      '09': 'Start of infertility treatment cycle',
      '10': 'Last menstrual period',
      '11': 'Onset of symptoms/illness',
      '12': 'Date of onset for chronically dependent individual',
      '17': 'Date outpatient occupational therapy plan established or last reviewed',
      '18': 'Date of retirement patient/beneficiary',
      '19': 'Date of retirement spouse',
      '20': 'Guarantee of payment date',
      '21': 'UR notice received',
      '22': 'Date active care ended',
      '24': 'Date insurance denied',
      '25': 'Date benefits terminated by primary payer',
      '26': 'Date SNF bed became available',
      '27': 'Date of hospice certification or re-certification',
      '28': 'Date comprehensive outpatient rehabilitation plan established or last reviewed',
      '29': 'Date outpatient physical therapy plan established or last reviewed',
      '30': 'Date outpatient speech pathology plan established or last reviewed',
      '31': 'Date beneficiary notified of intent to bill (accommodations)',
      '32': 'Date beneficiary notified of intent to bill (procedures or treatments)',
      '33': 'First day of the Medicare coordination period for ESRD beneficiaries covered under EGHP',
      '34': 'Date of election of extended care services',
      '35': 'Date treatment started for P.T.',
      '36': 'Date of inpatient hospital discharge for covered transplant patients',
      '37': 'Date of inpatient hospital discharge for non-covered transplant patient',
      '40': 'Scheduled date of admission',
      '41': 'Date of first test for pre-admission testing',
      '42': 'Date of discharge',
      '43': 'Scheduled date of canceled surgery',
      '44': 'Date treatment started for O.T.',
      '45': 'Date treatment started for S.T.',
      '46': 'Date treatment started for cardiac rehab.',
      '50': 'Date lien released',
      '51': 'Date of most recent HIV test',
      '52': 'Date of most recent low hemoglobin',
      '53': 'Date of most recent serum creatinine',
      '54': 'Date of most recent hematocrit',
      '55': 'Date of most recent evidence of recombinant erythropoietin (EPO) administration',
      '56': 'Date of most recent parathyroid hormone level',
      '57': 'Date of most recent serum albumin',
      '58': 'Date of most recent hemoglobin A1C',
      '59': 'Date of most recent eye exam',
      '60': 'Date of most recent diabetic foot exam',
      '61': 'Date of most recent influenza vaccination',
      '62': 'Date of most recent pneumococcal vaccination',
      '70': 'Qualifying stay dates for SNF use only',
      '71': 'Prior stay dates',
      '72': 'First/last visit',
      '73': 'Benefit eligibility period',
      '74': 'Non-covered level of care',
      '75': 'SNF level of care',
      '76': 'Patient liability',
      'A1': 'Birthdate - insured A',
      'A2': 'Effective date - insured A policy',
      'A3': 'Benefits exhausted payer A',
      'A4': 'Split bill date',
      'B1': 'Birthdate - insured B',
      'B2': 'Effective date - insured B policy',
      'B3': 'Benefits exhausted payer B',
      'C1': 'Birthdate - insured C',
      'C2': 'Effective date - insured C policy',
      'C3': 'Benefits exhausted payer C',
      'P1': 'Diagnosis and/or treatment started',
      'P2': 'Cerebrovascular accident onset',
      'P3': 'Neurological deficit - onset'
    };
  }

  /**
   * Initialize bill type codes
   */
  initializeBillTypeCodes() {
    return {
      // First digit: Type of Facility
      '1': 'Hospital',
      '2': 'Skilled Nursing Facility',
      '3': 'Home Health Agency',
      '4': 'Religious Non-Medical Health Care Institution',
      '5': 'Reserved for National Assignment',
      '6': 'Intermediate Care Facility',
      '7': 'Clinic or Hospital-Based Renal Dialysis Facility',
      '8': 'Special Facility or ASC',
      '9': 'Reserved for National Assignment',
      
      // Second digit: Bill Classification
      '1x': 'Inpatient (including Medicare Part A)',
      '2x': 'Inpatient (Medicare Part B only)',
      '3x': 'Outpatient',
      '4x': 'Other (for other types of bills)',
      
      // Third digit: Frequency
      'x1': 'Admit thru Discharge Claim',
      'x2': 'Interim - First Claim',
      'x3': 'Interim - Continuing Claim',
      'x4': 'Interim - Last Claim',
      'x5': 'Late Charge(s) Only Claim',
      'x7': 'Replacement of Prior Claim',
      'x8': 'Void/Cancel of Prior Claim',
      'x9': 'Final Claim for HH PPS Episode'
    };
  }

  /**
   * Generate UB-04 form for an institutional claim
   * @param {number} claimId - Claim ID
   * @param {Object} options - Generation options
   * @returns {Buffer} PDF buffer
   */
  async generateForm(claimId, options = {}) {
    try {
      // Get institutional claim data
      const claimData = await this.getInstitutionalClaimData(claimId);
      
      // Validate claim data
      const validationResult = this.validateClaimData(claimData);
      if (!validationResult.isValid) {
        throw createValidationError('Institutional claim data validation failed', {
          errors: validationResult.errors
        });
      }

      // Transform claim data to UB-04 format
      const formData = this.transformClaimData(claimData);
      
      // Generate PDF
      const pdfBuffer = await this.createPDF(formData, options);
      
      // Log form generation
      await this.logFormGeneration(claimId, {
        success: true,
        formType: 'UB-04',
        options,
        generatedBy: options.userId
      });
      
      return pdfBuffer;
    } catch (error) {
      // Log generation error
      await this.logFormGeneration(claimId, {
        success: false,
        error: error.message,
        formType: 'UB-04',
        options
      });
      
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to generate UB-04 form', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get institutional claim data with all required information
   * @param {number} claimId - Claim ID
   * @returns {Object} Complete institutional claim data
   */
  async getInstitutionalClaimData(claimId) {
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
        i.relationship_to_patient as primary_relationship,
        
        f.name as facility_name,
        f.npi_number as facility_npi,
        f.address as facility_address,
        f.city as facility_city,
        f.state as facility_state,
        f.zip_code as facility_zip,
        f.phone as facility_phone,
        f.tax_id as facility_tax_id,
        f.facility_type,
        
        pr.first_name as attending_physician_first_name,
        pr.last_name as attending_physician_last_name,
        pr.npi_number as attending_physician_npi
        
      FROM billings b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN patient_insurance i ON p.id = i.patient_id AND i.is_primary = 1
      LEFT JOIN facilities f ON b.facility_id = f.id
      LEFT JOIN providers pr ON b.attending_physician_id = pr.id
      WHERE b.id = ? AND b.claim_type = 'institutional'
    `;

    const claimData = await executeQuerySingle(query, [claimId]);
    
    if (!claimData) {
      throw createNotFoundError('Institutional claim not found');
    }

    // Get diagnosis codes with POA indicators
    const diagnosisQuery = `
      SELECT 
        diagnosis_code, 
        diagnosis_description, 
        poa_indicator,
        diagnosis_type,
        sequence_number
      FROM institutional_claim_diagnoses 
      WHERE claim_id = ? 
      ORDER BY sequence_number
    `;
    
    const diagnosisCodes = await executeQuery(diagnosisQuery, [claimId]);

    // Get revenue code lines
    const revenueQuery = `
      SELECT 
        revenue_code,
        revenue_description,
        hcpcs_code,
        service_date,
        service_units,
        total_charges,
        non_covered_charges,
        line_number
      FROM institutional_claim_revenue_lines 
      WHERE claim_id = ? 
      ORDER BY line_number
    `;
    
    const revenueLines = await executeQuery(revenueQuery, [claimId]);

    // Get condition codes
    const conditionQuery = `
      SELECT condition_code, condition_description
      FROM institutional_claim_conditions 
      WHERE claim_id = ?
      ORDER BY sequence_number
    `;
    
    const conditionCodes = await executeQuery(conditionQuery, [claimId]);

    // Get occurrence codes
    const occurrenceQuery = `
      SELECT occurrence_code, occurrence_date, occurrence_description
      FROM institutional_claim_occurrences 
      WHERE claim_id = ?
      ORDER BY sequence_number
    `;
    
    const occurrenceCodes = await executeQuery(occurrenceQuery, [claimId]);

    // Get value codes
    const valueQuery = `
      SELECT value_code, value_amount, value_description
      FROM institutional_claim_values 
      WHERE claim_id = ?
      ORDER BY sequence_number
    `;
    
    const valueCodes = await executeQuery(valueQuery, [claimId]);

    return {
      ...claimData,
      diagnosis_codes: diagnosisCodes,
      revenue_lines: revenueLines,
      condition_codes: conditionCodes,
      occurrence_codes: occurrenceCodes,
      value_codes: valueCodes
    };
  }

  /**
   * Validate institutional claim data against UB-04 requirements
   * @param {Object} claimData - Claim data to validate
   * @returns {Object} Validation result
   */
  validateClaimData(claimData) {
    const errors = [];
    const warnings = [];

    // Required facility information
    if (!claimData.facility_name) {
      errors.push('Facility name is required');
    }

    if (!claimData.facility_npi) {
      errors.push('Facility NPI is required');
    } else if (!/^\d{10}$/.test(claimData.facility_npi)) {
      errors.push('Facility NPI must be 10 digits');
    }

    if (!claimData.facility_tax_id) {
      errors.push('Facility tax ID is required');
    }

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

    // Validate diagnosis codes
    if (!claimData.diagnosis_codes || claimData.diagnosis_codes.length === 0) {
      errors.push('At least one diagnosis code is required');
    } else {
      // Check for principal diagnosis
      const principalDiagnosis = claimData.diagnosis_codes.find(d => d.diagnosis_type === 'principal');
      if (!principalDiagnosis) {
        errors.push('Principal diagnosis is required');
      }

      // Validate POA indicators
      claimData.diagnosis_codes.forEach((diagnosis, index) => {
        if (!diagnosis.poa_indicator) {
          warnings.push(`Diagnosis ${index + 1}: POA indicator is recommended`);
        }
      });
    }

    // Validate revenue code lines
    if (!claimData.revenue_lines || claimData.revenue_lines.length === 0) {
      errors.push('At least one revenue code line is required');
    } else if (claimData.revenue_lines.length > 22) {
      errors.push('Maximum 22 revenue code lines allowed on UB-04');
    }

    // Validate each revenue line
    claimData.revenue_lines?.forEach((line, index) => {
      if (!line.revenue_code) {
        errors.push(`Revenue line ${index + 1}: Revenue code is required`);
      } else if (!/^\d{4}$/.test(line.revenue_code)) {
        errors.push(`Revenue line ${index + 1}: Revenue code must be 4 digits`);
      }

      if (!line.total_charges || line.total_charges <= 0) {
        errors.push(`Revenue line ${index + 1}: Valid charge amount is required`);
      }

      if (line.service_units && line.service_units <= 0) {
        warnings.push(`Revenue line ${index + 1}: Valid service units recommended`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Transform claim data to UB-04 format
   * @param {Object} claimData - Raw claim data
   * @returns {Object} Formatted form data
   */
  transformClaimData(claimData) {
    const formData = {};

    // Form Locator 1 - Provider Name
    formData['1_provider_name'] = claimData.facility_name;

    // Form Locator 2 - Provider Address
    formData['2_provider_address'] = `${claimData.facility_address}\n${claimData.facility_city}, ${claimData.facility_state} ${claimData.facility_zip}`;

    // Form Locator 3 - Patient Control Number
    formData['3_patient_control_number'] = claimData.patient_control_number || claimData.id;

    // Form Locator 4 - Type of Bill
    formData['4_type_of_bill'] = claimData.bill_type || '0111'; // Default to hospital inpatient

    // Form Locator 5 - Federal Tax Number
    formData['5_federal_tax_number'] = claimData.facility_tax_id;

    // Form Locator 8 - Patient Name
    formData['8_patient_name'] = this.formatPatientName(
      claimData.patient_last_name,
      claimData.patient_first_name,
      claimData.patient_middle_initial
    );

    // Form Locator 9 - Patient Address
    formData['9_patient_address'] = `${claimData.patient_address}\n${claimData.patient_city}, ${claimData.patient_state} ${claimData.patient_zip}`;

    // Form Locator 10 - Patient Birth Date
    formData['10_patient_birth_date'] = this.formatDate(claimData.patient_dob, 'MMDDYYYY');

    // Form Locator 11 - Patient Sex
    formData['11_patient_sex'] = claimData.patient_gender?.toUpperCase().charAt(0) || 'U';

    // Form Locator 12 - Admission Date
    formData['12_admission_date'] = this.formatDate(claimData.admission_date, 'MMDDYYYY');

    // Form Locator 17 - Patient Status
    formData['17_patient_status'] = claimData.patient_status || '01';

    // Form Locator 18-28 - Condition Codes
    if (claimData.condition_codes && claimData.condition_codes.length > 0) {
      claimData.condition_codes.forEach((condition, index) => {
        if (index < 11) { // Maximum 11 condition codes
          formData[`18_condition_code_${index + 1}`] = condition.condition_code;
        }
      });
    }

    // Form Locator 31-34 - Occurrence Codes and Dates
    if (claimData.occurrence_codes && claimData.occurrence_codes.length > 0) {
      claimData.occurrence_codes.forEach((occurrence, index) => {
        if (index < 8) { // Maximum 8 occurrence codes
          formData[`31_occurrence_code_${index + 1}`] = occurrence.occurrence_code;
          formData[`31_occurrence_date_${index + 1}`] = this.formatDate(occurrence.occurrence_date, 'MMDDYYYY');
        }
      });
    }

    // Form Locator 39-41 - Value Codes and Amounts
    if (claimData.value_codes && claimData.value_codes.length > 0) {
      claimData.value_codes.forEach((value, index) => {
        if (index < 12) { // Maximum 12 value codes
          formData[`39_value_code_${index + 1}`] = value.value_code;
          formData[`39_value_amount_${index + 1}`] = this.formatCurrency(value.value_amount, false);
        }
      });
    }

    // Form Locator 42-49 - Revenue Code Lines
    if (claimData.revenue_lines && claimData.revenue_lines.length > 0) {
      claimData.revenue_lines.forEach((line, index) => {
        if (index < 22) { // Maximum 22 revenue lines
          const lineNum = index + 1;
          formData[`42_revenue_code_${lineNum}`] = line.revenue_code;
          formData[`43_revenue_description_${lineNum}`] = this.revenueCodes[line.revenue_code] || line.revenue_description;
          formData[`44_hcpcs_rates_${lineNum}`] = line.hcpcs_code || '';
          formData[`45_service_date_${lineNum}`] = this.formatDate(line.service_date, 'MMDDYYYY');
          formData[`46_service_units_${lineNum}`] = line.service_units || '';
          formData[`47_total_charges_${lineNum}`] = this.formatCurrency(line.total_charges, false);
          formData[`48_non_covered_charges_${lineNum}`] = this.formatCurrency(line.non_covered_charges || 0, false);
        }
      });
    }

    // Form Locator 50-54 - Payer Information
    formData['50_payer_name_1'] = claimData.primary_insurance_name;
    formData['51_health_plan_id_1'] = claimData.primary_policy_number;
    formData['52_release_of_information_1'] = 'Y'; // Assuming yes
    formData['53_assignment_of_benefits_1'] = 'Y'; // Assuming yes
    formData['54_prior_payments_1'] = this.formatCurrency(claimData.amount_paid || 0, false);

    // Form Locator 55-56 - Totals
    formData['55_estimated_amount_due'] = this.formatCurrency(claimData.total_amount - (claimData.amount_paid || 0), false);
    formData['56_total_charges'] = this.formatCurrency(claimData.total_amount, false);

    // Form Locator 76 - Attending Physician NPI
    formData['76_attending_physician_npi'] = claimData.attending_physician_npi;

    // Form Locator 80 - Remarks
    formData['80_remarks'] = claimData.remarks || '';

    return formData;
  }

  /**
   * Create PDF document with UB-04 form
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

        // Draw form background (optional)
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
   * Draw UB-04 form background
   * @param {PDFDocument} doc - PDF document
   */
  drawFormBackground(doc) {
    // Draw form title
    doc.fontSize(14)
       .text('UNIFORM BILLING FORM UB-04', 50, 30, { align: 'center' });
    
    doc.fontSize(10)
       .text('APPROVED OMB NO. 0938-0997', 50, 50, { align: 'center' });

    // Draw form sections
    this.drawFormSections(doc);
    
    // Add field labels
    doc.fontSize(8);
    this.addFieldLabels(doc);
  }

  /**
   * Draw form sections
   * @param {PDFDocument} doc - PDF document
   */
  drawFormSections(doc) {
    // Header section
    doc.rect(40, 70, 520, 60).stroke();
    
    // Patient information section
    doc.rect(40, 130, 520, 60).stroke();
    
    // Condition codes section
    doc.rect(40, 190, 520, 50).stroke();
    
    // Occurrence codes section
    doc.rect(40, 240, 520, 70).stroke();
    
    // Value codes section
    doc.rect(40, 310, 520, 70).stroke();
    
    // Revenue codes section
    doc.rect(40, 380, 520, 270).stroke();
    
    // Payer information section
    doc.rect(40, 650, 520, 60).stroke();
    
    // Provider information section
    doc.rect(40, 710, 520, 70).stroke();
  }

  /**
   * Add field labels to the form
   * @param {PDFDocument} doc - PDF document
   */
  addFieldLabels(doc) {
    const labels = {
      '1. PROVIDER NAME': { x: 50, y: 75 },
      '3. PATIENT CONTROL #': { x: 400, y: 75 },
      '4. TYPE OF BILL': { x: 400, y: 95 },
      '5. FED. TAX #': { x: 480, y: 95 },
      '8. PATIENT NAME': { x: 50, y: 135 },
      '9. PATIENT ADDRESS': { x: 260, y: 135 },
      '10. BIRTHDATE': { x: 470, y: 135 },
      '11. SEX': { x: 550, y: 135 },
      '12. ADMISSION DATE': { x: 50, y: 175 },
      '17. PATIENT STATUS': { x: 340, y: 175 },
      '18-28. CONDITION CODES': { x: 50, y: 195 },
      '31-34. OCCURRENCE CODES & DATES': { x: 50, y: 245 },
      '39-41. VALUE CODES & AMOUNTS': { x: 50, y: 315 },
      '42. REV CD': { x: 50, y: 385 },
      '43. DESCRIPTION': { x: 120, y: 385 },
      '44. HCPCS/RATES': { x: 280, y: 385 },
      '45. SERV DATE': { x: 370, y: 385 },
      '46. SERV UNITS': { x: 440, y: 385 },
      '47. TOTAL CHARGES': { x: 490, y: 385 },
      '48. NON-COVERED CHARGES': { x: 570, y: 385 },
      '50. PAYER NAME': { x: 50, y: 655 },
      '51. HEALTH PLAN ID': { x: 260, y: 655 },
      '55. EST. AMOUNT DUE': { x: 400, y: 655 },
      '56. TOTAL CHARGES': { x: 510, y: 655 },
      '76. ATTENDING PHYSICIAN NPI': { x: 50, y: 715 },
      '80. REMARKS': { x: 50, y: 745 }
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
      const position = this.formLocators[fieldName];
      if (position && value) {
        const displayValue = this.formatFieldValue(fieldName, value);
        doc.text(displayValue, position.x, position.y, {
          width: position.width,
          height: position.height,
          ellipsis: true
        });
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
      return this.formatDate(value, 'MMDDYYYY');
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
   * Get maximum field length based on UB-04 specifications
   * @param {string} fieldName - Field name
   * @returns {number} Maximum length
   */
  getMaxFieldLength(fieldName) {
    const lengthMap = {
      '1_provider_name': 60,
      '3_patient_control_number': 20,
      '4_type_of_bill': 4,
      '5_federal_tax_number': 15,
      '8_patient_name': 25,
      '10_patient_birth_date': 8,
      '11_patient_sex': 1,
      '12_admission_date': 8,
      '76_attending_physician_npi': 10
    };

    return lengthMap[fieldName] || 50;
  }

  /**
   * Helper methods for data transformation
   */
  
  formatPatientName(lastName, firstName, middleInitial) {
    let name = `${lastName || ''}, ${firstName || ''}`;
    if (middleInitial) {
      name += ` ${middleInitial}`;
    }
    return name.toUpperCase();
  }

  formatDate(date, format = 'MMDDYYYY') {
    if (!date) return '';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    
    switch (format) {
      case 'MMDDYYYY':
        return `${month}${day}${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      default:
        return `${month}${day}${year}`;
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
      const claimData = await this.getInstitutionalClaimData(claimId);
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
      const claimData = await this.getInstitutionalClaimData(claimId);
      const formData = this.transformClaimData(claimData);
      const validation = this.validateClaimData(claimData);
      
      return {
        formData,
        validation,
        claimData: {
          facilityName: formData['1_provider_name'],
          patientName: formData['8_patient_name'],
          totalAmount: formData['56_total_charges'],
          revenueLines: claimData.revenue_lines.length,
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

module.exports = UB04Generator;