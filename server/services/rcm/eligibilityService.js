const db = require('../../config/db');
const axios = require('axios');
const { logAudit } = require('../../utils/logAudit');

/**
 * Real-Time Eligibility Verification Service
 * Implements 270/271 EDI transactions for insurance eligibility checking
 */

class EligibilityService {
  
  constructor() {
    this.clearinghouseConfig = {
      changeHealthcare: {
        baseUrl: process.env.CHANGE_HC_BASE_URL || 'https://api.changehealthcare.com',
        apiKey: process.env.CHANGE_HC_API_KEY,
        submitterId: process.env.CHANGE_HC_SUBMITTER_ID
      },
      availity: {
        baseUrl: process.env.AVAILITY_BASE_URL || 'https://api.availity.com',
        apiKey: process.env.AVAILITY_API_KEY,
        clientId: process.env.AVAILITY_CLIENT_ID
      }
    };
  }

  /**
   * Check real-time eligibility for patient
   */
  async checkEligibility(patientId, providerId, serviceDate, serviceTypes = []) {
    try {
      // Get patient insurance information
      const patientInsurance = await this.getPatientInsurance(patientId);
      if (!patientInsurance) {
        throw new Error('No active insurance found for patient');
      }

      // Get provider information
      const providerInfo = await this.getProviderInfo(providerId);
      if (!providerInfo) {
        throw new Error('Provider information not found');
      }

      // Generate 270 EDI transaction
      const edi270 = this.generateEDI270Request({
        patient: patientInsurance,
        provider: providerInfo,
        serviceDate,
        serviceTypes
      });

      // Submit to clearinghouse
      const eligibilityResponse = await this.submitEligibilityRequest(edi270, patientInsurance.payer_name);

      // Parse 271 response
      const eligibilityResult = this.parseEDI271Response(eligibilityResponse);

      // Store eligibility result
      const eligibilityId = await this.storeEligibilityResult(patientId, providerId, eligibilityResult);

      // Check for eligibility issues
      const issues = this.identifyEligibilityIssues(eligibilityResult);

      return {
        success: true,
        eligibilityId,
        result: eligibilityResult,
        issues,
        riskLevel: this.calculateDenialRisk(eligibilityResult, issues)
      };

    } catch (error) {
      console.error('Eligibility check failed:', error);
      
      // Log failed eligibility check
      await logAudit(null, 'ELIGIBILITY_CHECK_FAILED', 'eligibility_requests', patientId, 
        `Eligibility check failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        riskLevel: 'HIGH' // Assume high risk if eligibility can't be verified
      };
    }
  }

  /**
   * Get patient insurance information
   */
  async getPatientInsurance(patientId) {
    const [insurance] = await db.query(`
      SELECT 
        pi.*,
        p.payer_name,
        p.payer_id,
        p.payer_type
      FROM rcm_patient_insurance pi
      JOIN rcm_payers p ON pi.payer_id = p.id
      WHERE pi.patient_id = ? 
      AND pi.is_active = TRUE 
      AND pi.coverage_type = 'primary'
      AND (pi.termination_date IS NULL OR pi.termination_date > CURDATE())
      ORDER BY pi.effective_date DESC
      LIMIT 1
    `, [patientId]);

    return insurance[0] || null;
  }

  /**
   * Get provider information for eligibility request
   */
  async getProviderInfo(providerId) {
    const [provider] = await db.query(`
      SELECT 
        u.id,
        up.firstname,
        up.lastname,
        po.npi,
        po.tin,
        po.taxonomy_code,
        pl.place_of_service
      FROM users u
      JOIN user_profiles up ON u.id = up.fk_userid
      LEFT JOIN rcm_provider_organizations po ON po.id = u.organization_id
      LEFT JOIN rcm_provider_locations pl ON pl.organization_id = po.id AND pl.is_billing_location = TRUE
      WHERE u.id = ?
    `, [providerId]);

    return provider[0] || null;
  }

  /**
   * Generate EDI 270 eligibility request
   */
  generateEDI270Request({ patient, provider, serviceDate, serviceTypes }) {
    const controlNumber = this.generateControlNumber();
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);

    // Simplified EDI 270 structure (in production, use proper EDI library)
    const edi270 = {
      interchangeHeader: {
        ISA: {
          authorizationQualifier: '00',
          authorizationInfo: ' '.repeat(10),
          securityQualifier: '00',
          securityInfo: ' '.repeat(10),
          senderQualifier: 'ZZ',
          senderId: provider.npi.padEnd(15),
          receiverQualifier: 'ZZ',
          receiverId: patient.payer_id.padEnd(15),
          date: timestamp.slice(0, 6),
          time: timestamp.slice(6, 10),
          standards: 'U',
          version: '00501',
          controlNumber: controlNumber.padStart(9, '0'),
          acknowledgment: '0',
          usage: 'P',
          separator: ':'
        }
      },
      functionalGroup: {
        GS: {
          functionalCode: 'HS',
          senderCode: provider.npi,
          receiverCode: patient.payer_id,
          date: timestamp.slice(0, 8),
          time: timestamp.slice(8, 12),
          controlNumber: controlNumber,
          agency: 'X',
          version: '005010X279A1'
        }
      },
      transactionSet: {
        ST: {
          transactionCode: '270',
          controlNumber: controlNumber
        },
        BHT: {
          hierarchicalStructure: '0022',
          transactionPurpose: '13',
          referenceId: controlNumber,
          date: timestamp.slice(0, 8),
          time: timestamp.slice(8, 12)
        },
        HL: [
          {
            id: '1',
            parentId: '',
            levelCode: '20',
            childCode: '1'
          },
          {
            id: '2',
            parentId: '1',
            levelCode: '21',
            childCode: '1'
          },
          {
            id: '3',
            parentId: '2',
            levelCode: '22',
            childCode: '0'
          }
        ],
        NM1: [
          {
            entityType: 'PR',
            entityTypeQualifier: '2',
            name: patient.payer_name,
            identificationCodeQualifier: 'PI',
            identificationCode: patient.payer_id
          },
          {
            entityType: '1P',
            entityTypeQualifier: '2',
            lastName: provider.lastname,
            firstName: provider.firstname,
            identificationCodeQualifier: 'XX',
            identificationCode: provider.npi
          },
          {
            entityType: 'IL',
            entityTypeQualifier: '1',
            lastName: patient.policy_holder_name?.split(' ')[1] || '',
            firstName: patient.policy_holder_name?.split(' ')[0] || '',
            identificationCodeQualifier: 'MI',
            identificationCode: patient.member_id
          }
        ],
        DTP: {
          dateQualifier: '472',
          dateFormat: 'D8',
          date: serviceDate.replace(/-/g, '')
        },
        EQ: serviceTypes.length > 0 ? serviceTypes.map(type => ({
          serviceTypeCode: type
        })) : [{ serviceTypeCode: '30' }] // Default to general health benefit
      }
    };

    return edi270;
  }

  /**
   * Submit eligibility request to clearinghouse
   */
  async submitEligibilityRequest(edi270, payerName) {
    try {
      // Determine which clearinghouse to use based on payer
      const clearinghouse = this.selectClearinghouse(payerName);
      
      if (clearinghouse === 'changeHealthcare') {
        return await this.submitToChangeHealthcare(edi270);
      } else if (clearinghouse === 'availity') {
        return await this.submitToAvaility(edi270);
      } else {
        // Fallback to mock response for testing
        return this.generateMockEligibilityResponse(edi270);
      }

    } catch (error) {
      console.error('Clearinghouse submission failed:', error);
      throw new Error(`Eligibility verification failed: ${error.message}`);
    }
  }

  /**
   * Submit to Change Healthcare
   */
  async submitToChangeHealthcare(edi270) {
    const config = this.clearinghouseConfig.changeHealthcare;
    
    const response = await axios.post(`${config.baseUrl}/eligibility/v1/check`, {
      transaction: this.convertToX12Format(edi270)
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Submitter-ID': config.submitterId
      }
    });

    return response.data;
  }

  /**
   * Submit to Availity
   */
  async submitToAvaility(edi270) {
    const config = this.clearinghouseConfig.availity;
    
    const response = await axios.post(`${config.baseUrl}/eligibility/v1/inquiries`, {
      eligibilityInquiry: this.convertToAvailityFormat(edi270)
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-ID': config.clientId
      }
    });

    return response.data;
  }

  /**
   * Generate mock eligibility response for testing
   */
  generateMockEligibilityResponse(edi270) {
    const isEligible = Math.random() > 0.2; // 80% eligible for testing
    const hasDeductible = Math.random() > 0.5;
    const hasCopay = Math.random() > 0.3;

    return {
      eligibilityStatus: isEligible ? 'active' : 'inactive',
      benefitInformation: {
        deductible: hasDeductible ? {
          individual: Math.floor(Math.random() * 5000) + 500,
          family: Math.floor(Math.random() * 10000) + 1000,
          remaining: Math.floor(Math.random() * 3000)
        } : null,
        copay: hasCopay ? {
          primaryCare: Math.floor(Math.random() * 50) + 10,
          specialist: Math.floor(Math.random() * 100) + 25,
          emergency: Math.floor(Math.random() * 500) + 100
        } : null,
        coinsurance: Math.floor(Math.random() * 30) + 10,
        outOfPocketMax: Math.floor(Math.random() * 8000) + 2000,
        outOfPocketRemaining: Math.floor(Math.random() * 5000) + 1000
      },
      coverageDetails: {
        effectiveDate: '2024-01-01',
        terminationDate: '2024-12-31',
        planName: 'Sample Health Plan',
        groupNumber: 'GRP123456'
      },
      priorAuthRequired: Math.random() > 0.8,
      messages: isEligible ? [] : ['Coverage terminated', 'Contact insurance provider']
    };
  }

  /**
   * Parse EDI 271 eligibility response
   */
  parseEDI271Response(response) {
    // In production, use proper EDI parser
    return {
      eligibilityStatus: response.eligibilityStatus || 'unknown',
      benefitInformation: response.benefitInformation || {},
      coverageDetails: response.coverageDetails || {},
      priorAuthRequired: response.priorAuthRequired || false,
      messages: response.messages || [],
      responseDate: new Date().toISOString(),
      rawResponse: JSON.stringify(response)
    };
  }

  /**
   * Store eligibility result in database
   */
  async storeEligibilityResult(patientId, providerId, eligibilityResult) {
    const [result] = await db.query(`
      INSERT INTO rcm_eligibility_requests (
        patient_id, provider_id, request_date, service_date,
        eligibility_status, benefits_summary, response_data
      ) VALUES (?, ?, CURDATE(), CURDATE(), ?, ?, ?)
    `, [
      patientId,
      providerId,
      eligibilityResult.eligibilityStatus,
      JSON.stringify(eligibilityResult.benefitInformation),
      JSON.stringify(eligibilityResult)
    ]);

    return result.insertId;
  }

  /**
   * Identify potential eligibility issues
   */
  identifyEligibilityIssues(eligibilityResult) {
    const issues = [];

    if (eligibilityResult.eligibilityStatus !== 'active') {
      issues.push({
        type: 'ELIGIBILITY_INACTIVE',
        severity: 'HIGH',
        message: 'Patient eligibility is not active',
        recommendation: 'Verify insurance information with patient'
      });
    }

    if (eligibilityResult.priorAuthRequired) {
      issues.push({
        type: 'PRIOR_AUTH_REQUIRED',
        severity: 'MEDIUM',
        message: 'Prior authorization may be required for services',
        recommendation: 'Check specific service requirements'
      });
    }

    if (eligibilityResult.benefitInformation?.deductible?.remaining > 1000) {
      issues.push({
        type: 'HIGH_DEDUCTIBLE',
        severity: 'MEDIUM',
        message: `High remaining deductible: $${eligibilityResult.benefitInformation.deductible.remaining}`,
        recommendation: 'Discuss payment options with patient'
      });
    }

    if (eligibilityResult.messages?.length > 0) {
      eligibilityResult.messages.forEach(message => {
        issues.push({
          type: 'PAYER_MESSAGE',
          severity: 'LOW',
          message: message,
          recommendation: 'Review payer message details'
        });
      });
    }

    return issues;
  }

  /**
   * Calculate denial risk based on eligibility
   */
  calculateDenialRisk(eligibilityResult, issues) {
    let riskScore = 0;

    // Base risk factors
    if (eligibilityResult.eligibilityStatus !== 'active') riskScore += 50;
    if (eligibilityResult.priorAuthRequired) riskScore += 20;
    if (issues.length > 2) riskScore += 15;
    if (eligibilityResult.messages?.length > 0) riskScore += 10;

    // Benefit-based risk
    if (eligibilityResult.benefitInformation?.deductible?.remaining > 2000) riskScore += 10;
    if (eligibilityResult.benefitInformation?.outOfPocketRemaining < 500) riskScore += 15;

    if (riskScore >= 50) return 'HIGH';
    if (riskScore >= 25) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Utility methods
   */
  generateControlNumber() {
    return Math.floor(Math.random() * 999999999) + 1;
  }

  selectClearinghouse(payerName) {
    // Logic to select appropriate clearinghouse based on payer
    const changeHealthcarePayers = ['Aetna', 'Cigna', 'UnitedHealthcare'];
    const availityPayers = ['Blue Cross Blue Shield', 'Anthem'];

    if (changeHealthcarePayers.some(payer => payerName.includes(payer))) {
      return 'changeHealthcare';
    } else if (availityPayers.some(payer => payerName.includes(payer))) {
      return 'availity';
    }

    return 'mock'; // Use mock for testing
  }

  convertToX12Format(edi270) {
    // Convert internal format to X12 string format
    // This is a simplified version - use proper EDI library in production
    return JSON.stringify(edi270);
  }

  convertToAvailityFormat(edi270) {
    // Convert to Availity-specific format
    return {
      subscriber: {
        memberId: edi270.transactionSet.NM1.find(nm1 => nm1.entityType === 'IL')?.identificationCode,
        firstName: edi270.transactionSet.NM1.find(nm1 => nm1.entityType === 'IL')?.firstName,
        lastName: edi270.transactionSet.NM1.find(nm1 => nm1.entityType === 'IL')?.lastName
      },
      provider: {
        npi: edi270.transactionSet.NM1.find(nm1 => nm1.entityType === '1P')?.identificationCode
      },
      serviceDate: edi270.transactionSet.DTP.date
    };
  }
}

module.exports = new EligibilityService();