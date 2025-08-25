/**
 * Advanced CMS Validation Service
 * Implements sophisticated validation features for medical necessity, timely filing,
 * provider enrollment, claim completeness, and frequency/quantity limits
 */

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
const ClaimHistoryService = require('./claimHistoryService');

class AdvancedCMSValidationService {
  constructor() {
    this.name = 'AdvancedCMSValidationService';
    this.historyService = new ClaimHistoryService();
    
    // Medical necessity rules
    this.medicalNecessityRules = this.initializeMedicalNecessityRules();
    
    // Timely filing limits by payer
    this.timelyFilingLimits = this.initializeTimelyFilingLimits();
    
    // Frequency and quantity limits
    this.frequencyLimits = this.initializeFrequencyLimits();
    
    // Provider enrollment statuses
    this.providerEnrollmentStatuses = this.initializeProviderEnrollmentStatuses();
    
    // Payer-specific rules
    this.payerSpecificRules = this.initializePayerSpecificRules();
  }

  /**
   * Initialize medical necessity rules
   */
  initializeMedicalNecessityRules() {
    return {
      // Diagnosis-Procedure combinations that require medical necessity review
      'high_risk_combinations': [
        {
          diagnosis_pattern: '^Z51\\.(0|1)', // Chemotherapy/Radiation
          procedure_codes: ['96413', '96415', '77301', '77338'],
          requirement: 'Oncology treatment plan required',
          severity: 'high'
        },
        {
          diagnosis_pattern: '^M79\\.[0-9]', // Soft tissue disorders
          procedure_codes: ['20610', '20611', '76942'],
          requirement: 'Conservative treatment documentation required',
          severity: 'medium'
        },
        {
          diagnosis_pattern: '^S72\\.[0-9]', // Femur fractures
          procedure_codes: ['27245', '27246', '27248'],
          requirement: 'Surgical necessity documentation required',
          severity: 'high'
        },
        {
          diagnosis_pattern: '^G93\\.1', // Anoxic brain damage
          procedure_codes: ['99291', '99292'],
          requirement: 'Critical care documentation required',
          severity: 'high'
        },
        {
          diagnosis_pattern: '^I25\\.[0-9]', // Chronic ischemic heart disease
          procedure_codes: ['93458', '93459', '93460'],
          requirement: 'Cardiac catheterization medical necessity',
          severity: 'high'
        }
      ],
      
      // Procedures requiring prior authorization
      'prior_auth_required': [
        '27447', // Total knee arthroplasty
        '27130', // Total hip arthroplasty
        '63047', // Laminectomy
        '64483', // Epidural injection
        '93458', // Cardiac catheterization
        '70553', // MRI brain with contrast
        '72148', // MRI lumbar spine
        '73721', // MRI knee
        '97110', // Physical therapy (certain conditions)
        '90834', // Psychotherapy (certain conditions)
        '99213', // Office visit (certain high-frequency cases)
      ],
      
      // Age-specific restrictions
      'age_restrictions': [
        {
          procedure_code: '99401', // Preventive counseling
          min_age: 18,
          max_age: 64,
          requirement: 'Adult preventive care guidelines'
        },
        {
          procedure_code: '90715', // Tdap vaccine
          min_age: 7,
          max_age: null,
          requirement: 'Age-appropriate vaccination'
        },
        {
          procedure_code: '77067', // Mammography
          min_age: 40,
          max_age: null,
          requirement: 'Age-appropriate screening'
        },
        {
          procedure_code: '82270', // Fecal occult blood test
          min_age: 50,
          max_age: 75,
          requirement: 'Colorectal cancer screening guidelines'
        }
      ],
      
      // Gender-specific procedures
      'gender_restrictions': [
        {
          procedure_codes: ['57454', '58150', '58180'], // Gynecological procedures
          required_gender: 'F',
          requirement: 'Female-specific procedure'
        },
        {
          procedure_codes: ['54150', '54160', '54161'], // Male genital procedures
          required_gender: 'M',
          requirement: 'Male-specific procedure'
        },
        {
          procedure_codes: ['77067', '77063'], // Mammography
          required_gender: 'F',
          requirement: 'Female breast imaging'
        }
      ]
    };
  }

  /**
   * Initialize timely filing limits by payer type
   */
  initializeTimelyFilingLimits() {
    return {
      'Medicare': {
        limit_days: 365,
        description: 'Medicare claims must be filed within 1 year of service date',
        exceptions: [
          'Good cause delay',
          'Administrative necessity',
          'Retroactive eligibility'
        ]
      },
      'Medicaid': {
        limit_days: 365,
        description: 'Medicaid claims must be filed within 1 year of service date',
        exceptions: [
          'Retroactive eligibility',
          'Third party liability',
          'Administrative delay'
        ]
      },
      'Commercial': {
        limit_days: 180,
        description: 'Commercial claims typically must be filed within 180 days',
        exceptions: [
          'Contract-specific terms',
          'Coordination of benefits delay'
        ]
      },
      'TRICARE': {
        limit_days: 365,
        description: 'TRICARE claims must be filed within 1 year of service date',
        exceptions: [
          'Good cause delay',
          'Government processing delay'
        ]
      },
      'Workers_Compensation': {
        limit_days: 90,
        description: 'Workers Comp claims must be filed within 90 days',
        exceptions: [
          'Late discovery of work-related injury',
          'Employer notification delay'
        ]
      }
    };
  }

  /**
   * Initialize frequency and quantity limits
   */
  initializeFrequencyLimits() {
    return {
      // Annual limits
      'annual_limits': [
        {
          procedure_code: '99213',
          max_per_year: 12,
          description: 'Office visits limited to 12 per year for routine care'
        },
        {
          procedure_code: '76700',
          max_per_year: 2,
          description: 'Abdominal ultrasound limited to 2 per year'
        },
        {
          procedure_code: '77067',
          max_per_year: 1,
          description: 'Annual mammography screening'
        },
        {
          procedure_code: '82270',
          max_per_year: 1,
          description: 'Annual fecal occult blood test'
        }
      ],
      
      // Per-day limits
      'daily_limits': [
        {
          procedure_code: '90834',
          max_per_day: 1,
          description: 'Psychotherapy limited to 1 session per day'
        },
        {
          procedure_code: '97110',
          max_per_day: 4,
          description: 'Physical therapy units limited to 4 per day'
        },
        {
          procedure_code: '99291',
          max_per_day: 1,
          description: 'Critical care limited to 1 session per day'
        }
      ],
      
      // Lifetime limits
      'lifetime_limits': [
        {
          procedure_code: '27447',
          max_lifetime: 2,
          description: 'Total knee replacement limited to 2 per lifetime per knee'
        },
        {
          procedure_code: '27130',
          max_lifetime: 2,
          description: 'Total hip replacement limited to 2 per lifetime per hip'
        }
      ],
      
      // Age-based frequency limits
      'age_based_limits': [
        {
          procedure_code: '77067',
          age_ranges: [
            { min_age: 40, max_age: 49, max_per_year: 1 },
            { min_age: 50, max_age: 74, max_per_year: 2 },
            { min_age: 75, max_age: null, max_per_year: 1 }
          ],
          description: 'Mammography frequency based on age'
        },
        {
          procedure_code: '82270',
          age_ranges: [
            { min_age: 50, max_age: 75, max_per_year: 1 }
          ],
          description: 'Colorectal screening frequency based on age'
        }
      ]
    };
  }

  /**
   * Initialize provider enrollment statuses
   */
  initializeProviderEnrollmentStatuses() {
    return {
      'active': {
        can_bill: true,
        description: 'Provider is actively enrolled and can bill'
      },
      'pending': {
        can_bill: false,
        description: 'Enrollment application is pending review'
      },
      'suspended': {
        can_bill: false,
        description: 'Provider enrollment is temporarily suspended'
      },
      'terminated': {
        can_bill: false,
        description: 'Provider enrollment has been terminated'
      },
      'deactivated': {
        can_bill: false,
        description: 'Provider has voluntarily deactivated enrollment'
      }
    };
  }

  /**
   * Initialize payer-specific rules
   */
  initializePayerSpecificRules() {
    return {
      'Medicare': {
        required_fields: [
          'patient_medicare_number',
          'provider_npi',
          'place_of_service',
          'diagnosis_codes'
        ],
        modifiers: {
          'required_combinations': [
            { procedure: '99213', modifier: '25', condition: 'Same day procedure' }
          ],
          'prohibited_combinations': [
            { procedure: '99213', modifier: '59', reason: 'Inappropriate modifier use' }
          ]
        },
        documentation_requirements: {
          'high_complexity_visits': 'Medical decision making documentation required',
          'surgical_procedures': 'Operative report required within 24 hours'
        }
      },
      'Medicaid': {
        required_fields: [
          'patient_medicaid_number',
          'provider_medicaid_id',
          'prior_authorization_number'
        ],
        prior_auth_required: [
          'Specialty referrals',
          'Durable medical equipment',
          'Non-emergency transportation'
        ]
      },
      'Commercial': {
        required_fields: [
          'patient_member_id',
          'group_number',
          'authorization_number'
        ],
        network_requirements: {
          'in_network': 'Standard copay and deductible apply',
          'out_of_network': 'Higher patient responsibility'
        }
      }
    };
  }

  /**
   * Perform comprehensive advanced validation on a claim
   * @param {number} claimId - Claim ID to validate
   * @param {Object} options - Validation options
   * @returns {Object} Comprehensive validation results
   */
  async performAdvancedValidation(claimId, options = {}) {
    try {
      // Get claim data with all related information
      const claimData = await this.getClaimDataForValidation(claimId);
      
      const validationResults = {
        claimId,
        timestamp: new Date().toISOString(),
        overall_status: 'pending',
        validation_categories: {
          medical_necessity: await this.validateMedicalNecessity(claimData),
          timely_filing: await this.validateTimelyFiling(claimData),
          provider_enrollment: await this.validateProviderEnrollment(claimData),
          frequency_limits: await this.validateFrequencyLimits(claimData),
          payer_compliance: await this.validatePayerCompliance(claimData),
          claim_completeness: await this.validateClaimCompleteness(claimData)
        },
        risk_assessment: {},
        recommendations: [],
        compliance_score: 0
      };
      
      // Calculate overall compliance score and risk assessment
      validationResults.risk_assessment = this.calculateRiskAssessment(validationResults.validation_categories);
      validationResults.compliance_score = this.calculateComplianceScore(validationResults.validation_categories);
      validationResults.recommendations = this.generateRecommendations(validationResults.validation_categories);
      
      // Determine overall status
      validationResults.overall_status = this.determineOverallStatus(validationResults.validation_categories);
      
      // Log validation results
      await this.logValidationResults(claimId, validationResults, options.userId);
      
      return validationResults;
    } catch (error) {
      throw createDatabaseError('Failed to perform advanced validation', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get comprehensive claim data for validation
   * @param {number} claimId - Claim ID
   * @returns {Object} Complete claim data
   */
  async getClaimDataForValidation(claimId) {
    const query = `
      SELECT 
        b.*,
        p.first_name, p.last_name, p.date_of_birth, p.gender,
        p.address, p.city, p.state, p.zip_code,
        i.insurance_name, i.policy_number, i.group_number,
        pr.npi_number as provider_npi, pr.taxonomy_code,
        pr.enrollment_status, pr.enrollment_date,
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

    // Get service lines with procedures and diagnoses
    const serviceQuery = `
      SELECT 
        procedure_code, modifier1, modifier2, modifier3, modifier4,
        diagnosis_pointer, service_date, units, charges,
        place_of_service
      FROM claim_service_lines 
      WHERE claim_id = ? 
      ORDER BY line_number
    `;
    
    const serviceLines = await executeQuery(serviceQuery, [claimId]);

    // Get diagnosis codes
    const diagnosisQuery = `
      SELECT diagnosis_code, diagnosis_description, pointer_position
      FROM claim_diagnoses 
      WHERE claim_id = ? 
      ORDER BY pointer_position
    `;
    
    const diagnosisCodes = await executeQuery(diagnosisQuery, [claimId]);

    // Get patient's claim history for frequency validation
    const historyQuery = `
      SELECT 
        sl.procedure_code, sl.service_date, sl.units
      FROM billings b2
      JOIN claim_service_lines sl ON b2.id = sl.claim_id
      WHERE b2.patient_id = ? 
      AND sl.service_date >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
      AND b2.id != ?
      ORDER BY sl.service_date DESC
    `;
    
    const patientHistory = await executeQuery(historyQuery, [claimData.patient_id, claimId]);

    return {
      ...claimData,
      service_lines: serviceLines,
      diagnosis_codes: diagnosisCodes,
      patient_history: patientHistory
    };
  }
  /**

   * Validate medical necessity
   * @param {Object} claimData - Claim data
   * @returns {Object} Medical necessity validation results
   */
  async validateMedicalNecessity(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      risk_level: 'low'
    };

    try {
      // Check diagnosis-procedure combinations
      for (const serviceLine of claimData.service_lines) {
        const diagnosisCode = this.getDiagnosisForPointer(claimData.diagnosis_codes, serviceLine.diagnosis_pointer);
        
        if (diagnosisCode) {
          // Check high-risk combinations
          const highRiskMatch = this.medicalNecessityRules.high_risk_combinations.find(rule => {
            const diagnosisMatch = new RegExp(rule.diagnosis_pattern).test(diagnosisCode.diagnosis_code);
            const procedureMatch = rule.procedure_codes.includes(serviceLine.procedure_code);
            return diagnosisMatch && procedureMatch;
          });

          if (highRiskMatch) {
            results.issues.push({
              type: 'medical_necessity_review',
              severity: highRiskMatch.severity,
              procedure_code: serviceLine.procedure_code,
              diagnosis_code: diagnosisCode.diagnosis_code,
              requirement: highRiskMatch.requirement,
              message: `Medical necessity review required for ${serviceLine.procedure_code} with diagnosis ${diagnosisCode.diagnosis_code}`
            });
            
            if (highRiskMatch.severity === 'high') {
              results.risk_level = 'high';
              results.status = 'review_required';
            }
          }
        }

        // Check prior authorization requirements
        if (this.medicalNecessityRules.prior_auth_required.includes(serviceLine.procedure_code)) {
          // In a real implementation, you would check if prior auth exists
          results.warnings.push({
            type: 'prior_authorization',
            procedure_code: serviceLine.procedure_code,
            message: `Prior authorization may be required for ${serviceLine.procedure_code}`
          });
        }

        // Check age restrictions
        const patientAge = this.calculateAge(claimData.date_of_birth);
        const ageRestriction = this.medicalNecessityRules.age_restrictions.find(rule => 
          rule.procedure_code === serviceLine.procedure_code
        );

        if (ageRestriction) {
          if (patientAge < ageRestriction.min_age || 
              (ageRestriction.max_age && patientAge > ageRestriction.max_age)) {
            results.issues.push({
              type: 'age_restriction',
              severity: 'medium',
              procedure_code: serviceLine.procedure_code,
              patient_age: patientAge,
              required_age_range: `${ageRestriction.min_age}-${ageRestriction.max_age || 'unlimited'}`,
              message: `Age restriction violation for ${serviceLine.procedure_code}`
            });
            results.status = 'review_required';
          }
        }

        // Check gender restrictions
        const genderRestriction = this.medicalNecessityRules.gender_restrictions.find(rule => 
          rule.procedure_codes.includes(serviceLine.procedure_code)
        );

        if (genderRestriction && claimData.gender !== genderRestriction.required_gender) {
          results.issues.push({
            type: 'gender_restriction',
            severity: 'high',
            procedure_code: serviceLine.procedure_code,
            patient_gender: claimData.gender,
            required_gender: genderRestriction.required_gender,
            message: `Gender restriction violation for ${serviceLine.procedure_code}`
          });
          results.status = 'review_required';
          results.risk_level = 'high';
        }
      }

      // Generate recommendations
      if (results.issues.length > 0) {
        results.recommendations.push('Review medical necessity documentation');
        results.recommendations.push('Verify diagnosis-procedure code relationships');
      }
      
      if (results.warnings.length > 0) {
        results.recommendations.push('Confirm prior authorization status');
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Medical necessity validation failed: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Validate timely filing requirements
   * @param {Object} claimData - Claim data
   * @returns {Object} Timely filing validation results
   */
  async validateTimelyFiling(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      filing_deadline: null,
      days_remaining: null
    };

    try {
      // Determine payer type
      const payerType = this.determinePayerType(claimData.insurance_name);
      const filingRules = this.timelyFilingLimits[payerType] || this.timelyFilingLimits['Commercial'];

      // Find the earliest service date
      const earliestServiceDate = claimData.service_lines.reduce((earliest, line) => {
        const serviceDate = new Date(line.service_date);
        return !earliest || serviceDate < earliest ? serviceDate : earliest;
      }, null);

      if (earliestServiceDate) {
        const filingDeadline = new Date(earliestServiceDate);
        filingDeadline.setDate(filingDeadline.getDate() + filingRules.limit_days);
        
        const today = new Date();
        const daysRemaining = Math.ceil((filingDeadline - today) / (1000 * 60 * 60 * 24));
        
        results.filing_deadline = filingDeadline.toISOString().split('T')[0];
        results.days_remaining = daysRemaining;

        if (daysRemaining < 0) {
          results.status = 'failed';
          results.issues.push({
            type: 'timely_filing_expired',
            severity: 'high',
            payer_type: payerType,
            service_date: earliestServiceDate.toISOString().split('T')[0],
            filing_deadline: results.filing_deadline,
            days_overdue: Math.abs(daysRemaining),
            message: `Claim is ${Math.abs(daysRemaining)} days past the ${filingRules.limit_days}-day filing deadline`
          });
        } else if (daysRemaining <= 30) {
          results.status = 'warning';
          results.warnings.push({
            type: 'timely_filing_approaching',
            payer_type: payerType,
            days_remaining: daysRemaining,
            filing_deadline: results.filing_deadline,
            message: `Filing deadline approaching in ${daysRemaining} days`
          });
        }

        // Add recommendations based on status
        if (results.status === 'failed') {
          results.recommendations.push('Check for applicable exceptions to timely filing');
          results.recommendations.push('Document any good cause for late filing');
          results.recommendations.push('Consider appeal process if claim is denied');
        } else if (results.status === 'warning') {
          results.recommendations.push('Submit claim immediately to meet filing deadline');
          results.recommendations.push('Verify all required documentation is complete');
        }
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Timely filing validation failed: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Validate provider enrollment status
   * @param {Object} claimData - Claim data
   * @returns {Object} Provider enrollment validation results
   */
  async validateProviderEnrollment(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      enrollment_status: null,
      enrollment_date: null
    };

    try {
      const enrollmentStatus = claimData.enrollment_status || 'unknown';
      const enrollmentInfo = this.providerEnrollmentStatuses[enrollmentStatus];
      
      results.enrollment_status = enrollmentStatus;
      results.enrollment_date = claimData.enrollment_date;

      if (!enrollmentInfo) {
        results.status = 'review_required';
        results.issues.push({
          type: 'unknown_enrollment_status',
          severity: 'medium',
          provider_npi: claimData.provider_npi,
          message: 'Provider enrollment status is unknown or not verified'
        });
      } else if (!enrollmentInfo.can_bill) {
        results.status = 'failed';
        results.issues.push({
          type: 'enrollment_inactive',
          severity: 'high',
          provider_npi: claimData.provider_npi,
          enrollment_status: enrollmentStatus,
          message: `Provider cannot bill - enrollment status: ${enrollmentStatus}`
        });
      }

      // Check enrollment date vs service date
      if (claimData.enrollment_date && claimData.service_lines.length > 0) {
        const enrollmentDate = new Date(claimData.enrollment_date);
        const hasServicesBeforeEnrollment = claimData.service_lines.some(line => {
          const serviceDate = new Date(line.service_date);
          return serviceDate < enrollmentDate;
        });

        if (hasServicesBeforeEnrollment) {
          results.status = 'review_required';
          results.issues.push({
            type: 'service_before_enrollment',
            severity: 'high',
            provider_npi: claimData.provider_npi,
            enrollment_date: claimData.enrollment_date,
            message: 'Services provided before provider enrollment date'
          });
        }
      }

      // Generate recommendations
      if (results.issues.length > 0) {
        results.recommendations.push('Verify provider enrollment status with payer');
        results.recommendations.push('Check provider credentialing requirements');
        results.recommendations.push('Ensure services are within enrollment period');
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Provider enrollment validation failed: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Validate frequency and quantity limits
   * @param {Object} claimData - Claim data
   * @returns {Object} Frequency validation results
   */
  async validateFrequencyLimits(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      frequency_analysis: []
    };

    try {
      const patientAge = this.calculateAge(claimData.date_of_birth);
      
      for (const serviceLine of claimData.service_lines) {
        const procedureCode = serviceLine.procedure_code;
        const serviceDate = new Date(serviceLine.service_date);
        const units = serviceLine.units || 1;

        // Check daily limits
        const dailyLimit = this.frequencyLimits.daily_limits.find(limit => 
          limit.procedure_code === procedureCode
        );

        if (dailyLimit && units > dailyLimit.max_per_day) {
          results.status = 'review_required';
          results.issues.push({
            type: 'daily_limit_exceeded',
            severity: 'medium',
            procedure_code: procedureCode,
            units_billed: units,
            daily_limit: dailyLimit.max_per_day,
            message: `Daily limit exceeded for ${procedureCode}: ${units} units billed, limit is ${dailyLimit.max_per_day}`
          });
        }

        // Check annual limits using patient history
        const annualLimit = this.frequencyLimits.annual_limits.find(limit => 
          limit.procedure_code === procedureCode
        );

        if (annualLimit) {
          const yearStart = new Date(serviceDate.getFullYear(), 0, 1);
          const yearEnd = new Date(serviceDate.getFullYear(), 11, 31);
          
          const yearlyCount = claimData.patient_history.filter(history => {
            const historyDate = new Date(history.service_date);
            return history.procedure_code === procedureCode &&
                   historyDate >= yearStart && historyDate <= yearEnd;
          }).reduce((sum, history) => sum + (history.units || 1), 0);

          const totalWithCurrent = yearlyCount + units;

          if (totalWithCurrent > annualLimit.max_per_year) {
            results.status = 'review_required';
            results.issues.push({
              type: 'annual_limit_exceeded',
              severity: 'medium',
              procedure_code: procedureCode,
              current_year_count: yearlyCount,
              units_billed: units,
              annual_limit: annualLimit.max_per_year,
              message: `Annual limit exceeded for ${procedureCode}: ${totalWithCurrent} total units, limit is ${annualLimit.max_per_year}`
            });
          }

          results.frequency_analysis.push({
            procedure_code: procedureCode,
            period: 'annual',
            current_count: yearlyCount,
            units_billed: units,
            limit: annualLimit.max_per_year,
            remaining: Math.max(0, annualLimit.max_per_year - totalWithCurrent)
          });
        }

        // Check age-based limits
        const ageBasedLimit = this.frequencyLimits.age_based_limits.find(limit => 
          limit.procedure_code === procedureCode
        );

        if (ageBasedLimit) {
          const ageRange = ageBasedLimit.age_ranges.find(range => 
            patientAge >= range.min_age && (range.max_age === null || patientAge <= range.max_age)
          );

          if (ageRange) {
            const yearStart = new Date(serviceDate.getFullYear(), 0, 1);
            const yearEnd = new Date(serviceDate.getFullYear(), 11, 31);
            
            const yearlyCount = claimData.patient_history.filter(history => {
              const historyDate = new Date(history.service_date);
              return history.procedure_code === procedureCode &&
                     historyDate >= yearStart && historyDate <= yearEnd;
            }).reduce((sum, history) => sum + (history.units || 1), 0);

            const totalWithCurrent = yearlyCount + units;

            if (totalWithCurrent > ageRange.max_per_year) {
              results.status = 'review_required';
              results.issues.push({
                type: 'age_based_limit_exceeded',
                severity: 'medium',
                procedure_code: procedureCode,
                patient_age: patientAge,
                current_year_count: yearlyCount,
                units_billed: units,
                age_based_limit: ageRange.max_per_year,
                message: `Age-based annual limit exceeded for ${procedureCode}: ${totalWithCurrent} total units, limit for age ${patientAge} is ${ageRange.max_per_year}`
              });
            }
          }
        }
      }

      // Generate recommendations
      if (results.issues.length > 0) {
        results.recommendations.push('Review medical necessity for frequency limit exceptions');
        results.recommendations.push('Check payer-specific frequency guidelines');
        results.recommendations.push('Document clinical rationale for exceeding limits');
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Frequency validation failed: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Validate payer-specific compliance
   * @param {Object} claimData - Claim data
   * @returns {Object} Payer compliance validation results
   */
  async validatePayerCompliance(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      payer_type: null,
      missing_fields: [],
      modifier_issues: []
    };

    try {
      const payerType = this.determinePayerType(claimData.insurance_name);
      results.payer_type = payerType;

      const payerRules = this.payerSpecificRules[payerType];
      if (!payerRules) {
        results.warnings.push({
          type: 'unknown_payer_type',
          message: `Unknown payer type: ${payerType}. Using default validation rules.`
        });
        return results;
      }

      // Check required fields
      for (const requiredField of payerRules.required_fields) {
        if (!claimData[requiredField] || claimData[requiredField].toString().trim() === '') {
          results.missing_fields.push(requiredField);
          results.issues.push({
            type: 'missing_required_field',
            severity: 'high',
            field: requiredField,
            payer_type: payerType,
            message: `Required field missing for ${payerType}: ${requiredField}`
          });
          results.status = 'failed';
        }
      }

      // Check modifier requirements
      if (payerRules.modifiers) {
        for (const serviceLine of claimData.service_lines) {
          const modifiers = [
            serviceLine.modifier1,
            serviceLine.modifier2,
            serviceLine.modifier3,
            serviceLine.modifier4
          ].filter(mod => mod && mod.trim() !== '');

          // Check required modifier combinations
          if (payerRules.modifiers.required_combinations) {
            for (const rule of payerRules.modifiers.required_combinations) {
              if (serviceLine.procedure_code === rule.procedure && 
                  !modifiers.includes(rule.modifier)) {
                results.issues.push({
                  type: 'missing_required_modifier',
                  severity: 'medium',
                  procedure_code: serviceLine.procedure_code,
                  required_modifier: rule.modifier,
                  condition: rule.condition,
                  message: `Required modifier ${rule.modifier} missing for ${serviceLine.procedure_code} when ${rule.condition}`
                });
                results.status = 'review_required';
              }
            }
          }

          // Check prohibited modifier combinations
          if (payerRules.modifiers.prohibited_combinations) {
            for (const rule of payerRules.modifiers.prohibited_combinations) {
              if (serviceLine.procedure_code === rule.procedure && 
                  modifiers.includes(rule.modifier)) {
                results.issues.push({
                  type: 'prohibited_modifier',
                  severity: 'high',
                  procedure_code: serviceLine.procedure_code,
                  prohibited_modifier: rule.modifier,
                  reason: rule.reason,
                  message: `Prohibited modifier ${rule.modifier} used with ${serviceLine.procedure_code}: ${rule.reason}`
                });
                results.status = 'failed';
              }
            }
          }
        }
      }

      // Generate recommendations
      if (results.missing_fields.length > 0) {
        results.recommendations.push(`Complete missing required fields for ${payerType}`);
      }
      
      if (results.modifier_issues.length > 0) {
        results.recommendations.push('Review modifier usage for payer compliance');
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Payer compliance validation failed: ${error.message}`
      });
    }

    return results;
  }

  /**
   * Validate claim completeness
   * @param {Object} claimData - Claim data
   * @returns {Object} Claim completeness validation results
   */
  async validateClaimCompleteness(claimData) {
    const results = {
      status: 'pass',
      issues: [],
      warnings: [],
      recommendations: [],
      completeness_score: 0,
      missing_elements: []
    };

    try {
      const requiredElements = [
        { field: 'patient_id', name: 'Patient Information', weight: 10 },
        { field: 'provider_npi', name: 'Provider NPI', weight: 10 },
        { field: 'service_date', name: 'Service Date', weight: 10 },
        { field: 'diagnosis_codes', name: 'Diagnosis Codes', weight: 15 },
        { field: 'service_lines', name: 'Service Lines', weight: 15 },
        { field: 'place_of_service', name: 'Place of Service', weight: 5 },
        { field: 'insurance_name', name: 'Insurance Information', weight: 10 },
        { field: 'charges', name: 'Charge Information', weight: 10 },
        { field: 'taxonomy_code', name: 'Provider Taxonomy', weight: 5 },
        { field: 'facility_npi', name: 'Facility Information', weight: 5 },
        { field: 'patient_address', name: 'Patient Address', weight: 5 }
      ];

      let totalWeight = 0;
      let completedWeight = 0;

      for (const element of requiredElements) {
        totalWeight += element.weight;
        
        let isComplete = false;
        
        if (element.field === 'diagnosis_codes') {
          isComplete = claimData.diagnosis_codes && claimData.diagnosis_codes.length > 0;
        } else if (element.field === 'service_lines') {
          isComplete = claimData.service_lines && claimData.service_lines.length > 0;
        } else if (element.field === 'patient_address') {
          isComplete = claimData.address && claimData.city && claimData.state;
        } else if (element.field === 'charges') {
          isComplete = claimData.service_lines && 
                      claimData.service_lines.every(line => line.charges && line.charges > 0);
        } else {
          isComplete = claimData[element.field] && 
                      claimData[element.field].toString().trim() !== '';
        }

        if (isComplete) {
          completedWeight += element.weight;
        } else {
          results.missing_elements.push({
            field: element.field,
            name: element.name,
            weight: element.weight,
            severity: element.weight >= 10 ? 'high' : 'medium'
          });
          
          results.issues.push({
            type: 'incomplete_claim_element',
            severity: element.weight >= 10 ? 'high' : 'medium',
            field: element.field,
            element_name: element.name,
            message: `Missing or incomplete: ${element.name}`
          });
        }
      }

      results.completeness_score = Math.round((completedWeight / totalWeight) * 100);

      // Determine status based on completeness score
      if (results.completeness_score < 70) {
        results.status = 'failed';
        results.recommendations.push('Complete missing required claim elements before submission');
      } else if (results.completeness_score < 90) {
        results.status = 'review_required';
        results.recommendations.push('Review and complete missing claim elements for optimal processing');
      } else {
        results.status = 'pass';
      }

      // Add specific recommendations
      if (results.missing_elements.length > 0) {
        results.recommendations.push('Verify all required fields are populated');
        results.recommendations.push('Check data quality and accuracy');
      }

    } catch (error) {
      results.status = 'error';
      results.issues.push({
        type: 'validation_error',
        severity: 'high',
        message: `Claim completeness validation failed: ${error.message}`
      });
    }

    return results;
  }  
/**
   * Helper method to get diagnosis code for a pointer
   * @param {Array} diagnosisCodes - Array of diagnosis codes
   * @param {string} pointer - Diagnosis pointer
   * @returns {Object|null} Diagnosis code object
   */
  getDiagnosisForPointer(diagnosisCodes, pointer) {
    if (!diagnosisCodes || !pointer) return null;
    return diagnosisCodes.find(diag => diag.pointer_position === pointer);
  }

  /**
   * Calculate patient age from date of birth
   * @param {string} dateOfBirth - Date of birth
   * @returns {number} Age in years
   */
  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Determine payer type from insurance name
   * @param {string} insuranceName - Insurance name
   * @returns {string} Payer type
   */
  determinePayerType(insuranceName) {
    if (!insuranceName) return 'Commercial';
    
    const name = insuranceName.toLowerCase();
    
    if (name.includes('medicare')) return 'Medicare';
    if (name.includes('medicaid')) return 'Medicaid';
    if (name.includes('tricare') || name.includes('champus')) return 'TRICARE';
    if (name.includes('workers') || name.includes('comp')) return 'Workers_Compensation';
    
    return 'Commercial';
  }

  /**
   * Calculate risk assessment from validation categories
   * @param {Object} validationCategories - Validation results by category
   * @returns {Object} Risk assessment
   */
  calculateRiskAssessment(validationCategories) {
    const riskFactors = [];
    let overallRisk = 'low';

    for (const [category, results] of Object.entries(validationCategories)) {
      if (results.status === 'failed') {
        riskFactors.push({
          category,
          risk_level: 'high',
          reason: 'Validation failed',
          impact: 'Claim likely to be denied'
        });
        overallRisk = 'high';
      } else if (results.status === 'review_required') {
        riskFactors.push({
          category,
          risk_level: 'medium',
          reason: 'Manual review required',
          impact: 'Potential delays or denials'
        });
        if (overallRisk !== 'high') {
          overallRisk = 'medium';
        }
      } else if (results.warnings && results.warnings.length > 0) {
        riskFactors.push({
          category,
          risk_level: 'low',
          reason: 'Minor issues detected',
          impact: 'Minimal processing impact'
        });
        if (overallRisk === 'low') {
          overallRisk = 'low';
        }
      }
    }

    return {
      overall_risk: overallRisk,
      risk_factors: riskFactors,
      risk_score: this.calculateRiskScore(riskFactors)
    };
  }

  /**
   * Calculate compliance score from validation categories
   * @param {Object} validationCategories - Validation results by category
   * @returns {number} Compliance score (0-100)
   */
  calculateComplianceScore(validationCategories) {
    const categoryWeights = {
      medical_necessity: 25,
      timely_filing: 20,
      provider_enrollment: 15,
      frequency_limits: 15,
      payer_compliance: 15,
      claim_completeness: 10
    };

    let totalWeight = 0;
    let weightedScore = 0;

    for (const [category, results] of Object.entries(validationCategories)) {
      const weight = categoryWeights[category] || 10;
      totalWeight += weight;

      let categoryScore = 100;
      if (results.status === 'failed') {
        categoryScore = 0;
      } else if (results.status === 'review_required') {
        categoryScore = 50;
      } else if (results.warnings && results.warnings.length > 0) {
        categoryScore = 80;
      }

      // Special handling for completeness score
      if (category === 'claim_completeness' && results.completeness_score !== undefined) {
        categoryScore = results.completeness_score;
      }

      weightedScore += categoryScore * weight;
    }

    return Math.round(weightedScore / totalWeight);
  }

  /**
   * Generate recommendations from validation categories
   * @param {Object} validationCategories - Validation results by category
   * @returns {Array} Array of recommendations
   */
  generateRecommendations(validationCategories) {
    const recommendations = [];
    const priorityRecommendations = [];

    for (const [category, results] of Object.entries(validationCategories)) {
      if (results.recommendations && results.recommendations.length > 0) {
        if (results.status === 'failed') {
          priorityRecommendations.push(...results.recommendations);
        } else {
          recommendations.push(...results.recommendations);
        }
      }
    }

    // Remove duplicates and return priority recommendations first
    const allRecommendations = [...new Set([...priorityRecommendations, ...recommendations])];
    return allRecommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Determine overall status from validation categories
   * @param {Object} validationCategories - Validation results by category
   * @returns {string} Overall status
   */
  determineOverallStatus(validationCategories) {
    let hasFailed = false;
    let hasReviewRequired = false;
    let hasWarnings = false;

    for (const results of Object.values(validationCategories)) {
      if (results.status === 'failed') {
        hasFailed = true;
      } else if (results.status === 'review_required') {
        hasReviewRequired = true;
      } else if (results.warnings && results.warnings.length > 0) {
        hasWarnings = true;
      }
    }

    if (hasFailed) return 'failed';
    if (hasReviewRequired) return 'review_required';
    if (hasWarnings) return 'warning';
    return 'pass';
  }

  /**
   * Calculate risk score from risk factors
   * @param {Array} riskFactors - Array of risk factors
   * @returns {number} Risk score (0-100)
   */
  calculateRiskScore(riskFactors) {
    if (riskFactors.length === 0) return 0;

    const riskWeights = { high: 30, medium: 15, low: 5 };
    const totalRisk = riskFactors.reduce((sum, factor) => {
      return sum + (riskWeights[factor.risk_level] || 0);
    }, 0);

    return Math.min(100, totalRisk);
  }

  /**
   * Log validation results to database
   * @param {number} claimId - Claim ID
   * @param {Object} validationResults - Validation results
   * @param {number} userId - User ID performing validation
   */
  async logValidationResults(claimId, validationResults, userId) {
    try {
      await executeQuery(`
        INSERT INTO compliance_logs (
          claim_id, log_type, compliance_status, details, 
          user_id, created_at
        ) VALUES (?, 'advanced_cms_validation', ?, ?, ?, NOW())
      `, [
        claimId,
        validationResults.overall_status === 'pass' ? 'compliant' : 
        validationResults.overall_status === 'warning' ? 'warning' : 'non_compliant',
        JSON.stringify({
          validation_results: validationResults,
          compliance_score: validationResults.compliance_score,
          risk_assessment: validationResults.risk_assessment,
          timestamp: validationResults.timestamp
        }),
        userId || null
      ]);

      // Update claim with validation status
      await executeQuery(`
        UPDATE billings 
        SET 
          cms_validation_status = ?,
          validation_errors = ?,
          compliance_score = ?,
          last_validation_date = NOW()
        WHERE id = ?
      `, [
        validationResults.overall_status,
        JSON.stringify({
          categories: validationResults.validation_categories,
          recommendations: validationResults.recommendations
        }),
        validationResults.compliance_score,
        claimId
      ]);

    } catch (error) {
      console.error('Failed to log advanced validation results:', error);
    }
  }

  /**
   * Get validation history for a claim
   * @param {number} claimId - Claim ID
   * @returns {Array} Validation history
   */
  async getValidationHistory(claimId) {
    try {
      const history = await executeQuery(`
        SELECT 
          log_type, compliance_status, details, 
          user_id, created_at
        FROM compliance_logs 
        WHERE claim_id = ? 
        AND log_type IN ('cms_validation', 'advanced_cms_validation')
        ORDER BY created_at DESC
        LIMIT 10
      `, [claimId]);

      return history.map(entry => ({
        ...entry,
        details: JSON.parse(entry.details)
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get validation history', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Batch validate multiple claims
   * @param {Array} claimIds - Array of claim IDs
   * @param {Object} options - Validation options
   * @returns {Object} Batch validation results
   */
  async batchValidate(claimIds, options = {}) {
    try {
      const results = {
        total_claims: claimIds.length,
        completed: 0,
        failed: 0,
        validation_results: [],
        summary: {
          pass: 0,
          warning: 0,
          review_required: 0,
          failed: 0
        }
      };

      for (const claimId of claimIds) {
        try {
          const validationResult = await this.performAdvancedValidation(claimId, options);
          results.validation_results.push(validationResult);
          results.summary[validationResult.overall_status]++;
          results.completed++;
        } catch (error) {
          results.failed++;
          results.validation_results.push({
            claimId,
            error: error.message,
            overall_status: 'error'
          });
        }
      }

      return results;
    } catch (error) {
      throw createDatabaseError('Batch validation failed', {
        originalError: error.message,
        claimIds
      });
    }
  }

  /**
   * Get validation statistics
   * @param {Object} filters - Filter criteria
   * @returns {Object} Validation statistics
   */
  async getValidationStatistics(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.date_from) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.date_to);
      }

      if (filters.payer_type) {
        whereClause += ' AND JSON_EXTRACT(details, "$.validation_results.validation_categories.payer_compliance.payer_type") = ?';
        params.push(filters.payer_type);
      }

      const stats = await executeQuery(`
        SELECT 
          compliance_status,
          COUNT(*) as count,
          AVG(JSON_EXTRACT(details, '$.compliance_score')) as avg_compliance_score,
          AVG(JSON_EXTRACT(details, '$.risk_assessment.risk_score')) as avg_risk_score
        FROM compliance_logs 
        ${whereClause}
        AND log_type = 'advanced_cms_validation'
        GROUP BY compliance_status
      `, params);

      const totalValidations = await executeQuerySingle(`
        SELECT COUNT(*) as total
        FROM compliance_logs 
        ${whereClause}
        AND log_type = 'advanced_cms_validation'
      `, params);

      return {
        total_validations: totalValidations.total,
        status_breakdown: stats,
        compliance_rate: stats.find(s => s.compliance_status === 'compliant')?.count || 0 / totalValidations.total * 100
      };
    } catch (error) {
      throw createDatabaseError('Failed to get validation statistics', {
        originalError: error.message,
        filters
      });
    }
  }
}

module.exports = AdvancedCMSValidationService;