const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

/**
 * Secondary Insurance and Coordination of Benefits (COB) Service
 * Handles secondary claims processing and revenue recovery
 */

class SecondaryInsuranceService {

  /**
   * Process secondary claims after primary payment
   */
  async processSecondaryClaims(primaryClaimId, primaryPaymentAmount) {
    try {
      // Get primary claim details
      const primaryClaim = await this.getPrimaryClaimDetails(primaryClaimId);
      if (!primaryClaim) {
        throw new Error('Primary claim not found');
      }

      // Get secondary insurance for patient
      const secondaryInsurance = await this.getSecondaryInsurance(primaryClaim.patient_id);
      if (!secondaryInsurance || secondaryInsurance.length === 0) {
        return {
          success: true,
          message: 'No secondary insurance found',
          secondaryClaims: []
        };
      }

      const secondaryClaims = [];

      // Process each secondary insurance
      for (const insurance of secondaryInsurance) {
        const secondaryClaim = await this.createSecondaryClaim(
          primaryClaim, 
          insurance, 
          primaryPaymentAmount
        );
        
        if (secondaryClaim) {
          secondaryClaims.push(secondaryClaim);
        }
      }

      return {
        success: true,
        message: `Created ${secondaryClaims.length} secondary claims`,
        secondaryClaims
      };

    } catch (error) {
      console.error('Secondary claims processing failed:', error);
      throw error;
    }
  }

  /**
   * Get primary claim details
   */
  async getPrimaryClaimDetails(claimId) {
    const [claims] = await db.query(`
      SELECT 
        cb.*,
        cc.code as cpt_code,
        cc.description as service_description,
        cc.price as unit_price,
        pi.payer_id as primary_payer_id,
        p.payer_name as primary_payer_name
      FROM cpt_billing cb
      JOIN cpt_codes cc ON cb.cpt_code_id = cc.id
      LEFT JOIN rcm_patient_insurance pi ON cb.patient_id = pi.patient_id 
        AND pi.coverage_type = 'primary' AND pi.is_active = TRUE
      LEFT JOIN rcm_payers p ON pi.payer_id = p.id
      WHERE cb.id = ?
    `, [claimId]);

    return claims[0] || null;
  }

  /**
   * Get secondary insurance for patient
   */
  async getSecondaryInsurance(patientId) {
    const [insurance] = await db.query(`
      SELECT 
        pi.*,
        p.payer_name,
        p.payer_id,
        p.payer_type
      FROM rcm_patient_insurance pi
      JOIN rcm_payers p ON pi.payer_id = p.id
      WHERE pi.patient_id = ? 
      AND pi.coverage_type IN ('secondary', 'tertiary')
      AND pi.is_active = TRUE 
      AND (pi.termination_date IS NULL OR pi.termination_date > CURDATE())
      ORDER BY 
        CASE pi.coverage_type 
          WHEN 'secondary' THEN 1 
          WHEN 'tertiary' THEN 2 
        END,
        pi.effective_date DESC
    `, [patientId]);

    return insurance;
  }

  /**
   * Create secondary claim
   */
  async createSecondaryClaim(primaryClaim, secondaryInsurance, primaryPaymentAmount) {
    try {
      // Calculate secondary claim amount
      const secondaryAmount = this.calculateSecondaryAmount(
        primaryClaim, 
        primaryPaymentAmount, 
        secondaryInsurance
      );

      if (secondaryAmount <= 0) {
        return null; // No balance to claim from secondary
      }

      // Create secondary claim record
      const [claimResult] = await db.query(`
        INSERT INTO rcm_claims (
          claim_number, patient_id, provider_id, payer_id, encounter_id,
          claim_type, frequency_code, total_charge_amount, 
          claim_status, primary_claim_id, secondary_payer_order
        ) VALUES (?, ?, ?, ?, ?, 'secondary', '7', ?, 'ready', ?, ?)
      `, [
        this.generateSecondaryClaimNumber(primaryClaim.id),
        primaryClaim.patient_id,
        primaryClaim.provider_id || 1, // Default provider
        secondaryInsurance.payer_id,
        primaryClaim.encounter_id,
        secondaryAmount,
        primaryClaim.id,
        secondaryInsurance.coverage_type === 'secondary' ? 2 : 3
      ]);

      const secondaryClaimId = claimResult.insertId;

      // Create claim line items
      await this.createSecondaryClaimLines(
        secondaryClaimId, 
        primaryClaim, 
        secondaryAmount,
        primaryPaymentAmount
      );

      // Generate COB information
      const cobInfo = await this.generateCOBInformation(
        primaryClaim, 
        primaryPaymentAmount, 
        secondaryInsurance
      );

      // Update claim with COB data
      await db.query(`
        UPDATE rcm_claims 
        SET coordination_of_benefits = ?
        WHERE id = ?
      `, [JSON.stringify(cobInfo), secondaryClaimId]);

      // Log secondary claim creation
      await logAudit(null, 'SECONDARY_CLAIM_CREATED', 'rcm_claims', secondaryClaimId,
        `Secondary claim created for primary claim ${primaryClaim.id}`);

      return {
        claimId: secondaryClaimId,
        claimNumber: this.generateSecondaryClaimNumber(primaryClaim.id),
        payerName: secondaryInsurance.payer_name,
        claimAmount: secondaryAmount,
        cobInformation: cobInfo
      };

    } catch (error) {
      console.error('Error creating secondary claim:', error);
      throw error;
    }
  }

  /**
   * Calculate secondary claim amount based on COB rules
   */
  calculateSecondaryAmount(primaryClaim, primaryPaymentAmount, secondaryInsurance) {
    const totalCharges = parseFloat(primaryClaim.total_charges || 0);
    const primaryPayment = parseFloat(primaryPaymentAmount || 0);
    
    // Basic COB calculation
    let secondaryAmount = totalCharges - primaryPayment;

    // Apply secondary insurance rules
    if (secondaryInsurance.coinsurance_percentage) {
      const coinsuranceAmount = totalCharges * (secondaryInsurance.coinsurance_percentage / 100);
      secondaryAmount = Math.min(secondaryAmount, coinsuranceAmount);
    }

    // Apply copay if applicable
    if (secondaryInsurance.copay_amount) {
      secondaryAmount = Math.max(0, secondaryAmount - secondaryInsurance.copay_amount);
    }

    // Apply deductible
    if (secondaryInsurance.deductible_amount && secondaryInsurance.deductible_met < secondaryInsurance.deductible_amount) {
      const remainingDeductible = secondaryInsurance.deductible_amount - secondaryInsurance.deductible_met;
      const deductibleApplied = Math.min(secondaryAmount, remainingDeductible);
      secondaryAmount -= deductibleApplied;
    }

    return Math.max(0, secondaryAmount);
  }

  /**
   * Create secondary claim line items
   */
  async createSecondaryClaimLines(secondaryClaimId, primaryClaim, secondaryAmount, primaryPaymentAmount) {
    await db.query(`
      INSERT INTO rcm_claim_lines (
        claim_id, line_number, cpt_code, units, charge_amount,
        service_date, primary_payment_amount, secondary_claim_amount
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?)
    `, [
      secondaryClaimId,
      primaryClaim.cpt_code,
      primaryClaim.code_units || 1,
      secondaryAmount,
      primaryClaim.created,
      primaryPaymentAmount,
      secondaryAmount
    ]);
  }

  /**
   * Generate Coordination of Benefits information
   */
  async generateCOBInformation(primaryClaim, primaryPaymentAmount, secondaryInsurance) {
    return {
      primaryPayer: {
        payerName: primaryClaim.primary_payer_name,
        payerId: primaryClaim.primary_payer_id,
        paidAmount: primaryPaymentAmount,
        paidDate: new Date().toISOString().split('T')[0]
      },
      secondaryPayer: {
        payerName: secondaryInsurance.payer_name,
        payerId: secondaryInsurance.payer_id,
        memberId: secondaryInsurance.member_id,
        groupNumber: secondaryInsurance.group_number,
        coverageType: secondaryInsurance.coverage_type
      },
      serviceInformation: {
        serviceDate: primaryClaim.created,
        cptCode: primaryClaim.cpt_code,
        totalCharges: primaryClaim.total_charges,
        primaryPayment: primaryPaymentAmount,
        patientResponsibility: this.calculatePatientResponsibility(primaryClaim, primaryPaymentAmount)
      },
      cobRules: {
        coordinationMethod: 'standard',
        allowDuplication: false,
        birthdayRule: secondaryInsurance.coverage_type === 'secondary'
      }
    };
  }

  /**
   * Calculate patient responsibility after all insurance
   */
  calculatePatientResponsibility(primaryClaim, primaryPaymentAmount) {
    const totalCharges = parseFloat(primaryClaim.total_charges || 0);
    const primaryPayment = parseFloat(primaryPaymentAmount || 0);
    
    // This would be updated after secondary processing
    return Math.max(0, totalCharges - primaryPayment);
  }

  /**
   * Process secondary claim payment
   */
  async processSecondaryPayment(secondaryClaimId, paymentAmount, paymentDate) {
    try {
      // Get secondary claim details
      const [secondaryClaim] = await db.query(`
        SELECT * FROM rcm_claims WHERE id = ?
      `, [secondaryClaimId]);

      if (!secondaryClaim.length) {
        throw new Error('Secondary claim not found');
      }

      const claim = secondaryClaim[0];

      // Update claim status
      await db.query(`
        UPDATE rcm_claims 
        SET claim_status = 'paid', 
            total_paid_amount = ?,
            payment_date = ?
        WHERE id = ?
      `, [paymentAmount, paymentDate, secondaryClaimId]);

      // Update claim lines
      await db.query(`
        UPDATE rcm_claim_lines 
        SET paid_amount = ?, 
            line_status = 'paid'
        WHERE claim_id = ?
      `, [paymentAmount, secondaryClaimId]);

      // Calculate final patient responsibility
      const finalPatientResponsibility = await this.calculateFinalPatientBalance(
        claim.primary_claim_id, 
        paymentAmount
      );

      // Update primary claim with final patient responsibility
      await db.query(`
        UPDATE cpt_billing 
        SET patient_responsibility = ?
        WHERE id = ?
      `, [finalPatientResponsibility, claim.primary_claim_id]);

      // Log secondary payment
      await logAudit(null, 'SECONDARY_PAYMENT_PROCESSED', 'rcm_claims', secondaryClaimId,
        `Secondary payment processed: $${paymentAmount}`);

      return {
        success: true,
        secondaryPayment: paymentAmount,
        finalPatientResponsibility,
        totalRecovered: await this.calculateTotalRecovered(claim.primary_claim_id)
      };

    } catch (error) {
      console.error('Error processing secondary payment:', error);
      throw error;
    }
  }

  /**
   * Calculate final patient balance after all insurance payments
   */
  async calculateFinalPatientBalance(primaryClaimId, secondaryPaymentAmount) {
    const [claimData] = await db.query(`
      SELECT 
        cb.total_charges,
        COALESCE(SUM(rcm.total_paid_amount), 0) as total_insurance_payments
      FROM cpt_billing cb
      LEFT JOIN rcm_claims rcm ON (rcm.primary_claim_id = cb.id OR rcm.id = cb.id)
      WHERE cb.id = ?
      GROUP BY cb.id, cb.total_charges
    `, [primaryClaimId]);

    if (!claimData.length) return 0;

    const totalCharges = parseFloat(claimData[0].total_charges || 0);
    const totalInsurancePayments = parseFloat(claimData[0].total_insurance_payments || 0) + parseFloat(secondaryPaymentAmount || 0);

    return Math.max(0, totalCharges - totalInsurancePayments);
  }

  /**
   * Calculate total amount recovered from all insurance
   */
  async calculateTotalRecovered(primaryClaimId) {
    const [recovery] = await db.query(`
      SELECT 
        COALESCE(SUM(total_paid_amount), 0) as total_recovered
      FROM rcm_claims 
      WHERE primary_claim_id = ? OR id = ?
    `, [primaryClaimId, primaryClaimId]);

    return parseFloat(recovery[0]?.total_recovered || 0);
  }

  /**
   * Get secondary claims status for reporting
   */
  async getSecondaryClaimsReport(providerId, dateFrom, dateTo) {
    const [report] = await db.query(`
      SELECT 
        COUNT(*) as total_secondary_claims,
        COUNT(CASE WHEN claim_status = 'paid' THEN 1 END) as paid_claims,
        COUNT(CASE WHEN claim_status = 'denied' THEN 1 END) as denied_claims,
        COALESCE(SUM(total_charge_amount), 0) as total_billed_secondary,
        COALESCE(SUM(total_paid_amount), 0) as total_collected_secondary,
        COALESCE(AVG(DATEDIFF(payment_date, submission_date)), 0) as avg_payment_days
      FROM rcm_claims 
      WHERE provider_id = ? 
      AND claim_type = 'secondary'
      AND submission_date BETWEEN ? AND ?
    `, [providerId, dateFrom, dateTo]);

    return report[0] || {};
  }

  /**
   * Identify secondary insurance opportunities
   */
  async identifySecondaryOpportunities(providerId) {
    const [opportunities] = await db.query(`
      SELECT 
        cb.id as claim_id,
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        cb.total_charges,
        cb.created as service_date,
        COUNT(pi.id) as secondary_insurance_count,
        CASE 
          WHEN COUNT(rcm.id) = 0 THEN 'No secondary claim created'
          WHEN COUNT(rcm.id) > 0 AND MAX(rcm.claim_status) = 'ready' THEN 'Secondary claim pending'
          ELSE 'Secondary claim processed'
        END as opportunity_status
      FROM cpt_billing cb
      JOIN user_profiles up ON cb.patient_id = up.fk_userid
      LEFT JOIN rcm_patient_insurance pi ON cb.patient_id = pi.patient_id 
        AND pi.coverage_type IN ('secondary', 'tertiary') 
        AND pi.is_active = TRUE
      LEFT JOIN rcm_claims rcm ON cb.id = rcm.primary_claim_id
      WHERE cb.status = 2  -- Paid by primary
      AND cb.total_charges > 0
      AND pi.id IS NOT NULL  -- Has secondary insurance
      GROUP BY cb.id, cb.patient_id, up.firstname, up.lastname, cb.total_charges, cb.created
      HAVING secondary_insurance_count > 0
      ORDER BY cb.total_charges DESC
      LIMIT 50
    `, []);

    return opportunities;
  }

  /**
   * Utility methods
   */
  generateSecondaryClaimNumber(primaryClaimId) {
    const timestamp = Date.now().toString().slice(-6);
    return `SEC-${primaryClaimId}-${timestamp}`;
  }

  /**
   * Validate secondary insurance eligibility
   */
  async validateSecondaryEligibility(patientId, secondaryInsuranceId) {
    // This would integrate with eligibility service
    // For now, return basic validation
    const [insurance] = await db.query(`
      SELECT * FROM rcm_patient_insurance 
      WHERE id = ? AND patient_id = ? AND is_active = TRUE
    `, [secondaryInsuranceId, patientId]);

    return {
      isValid: insurance.length > 0,
      insurance: insurance[0] || null,
      issues: insurance.length === 0 ? ['Secondary insurance not found or inactive'] : []
    };
  }
}

module.exports = new SecondaryInsuranceService();