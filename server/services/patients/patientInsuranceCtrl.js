const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

// Get patient insurance information
const getPatientInsurance = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const userId = req.headers['userid'];

    // Verify patient access
    const patientCheck = await db.query(
      'SELECT user_id FROM user_profiles WHERE user_id = ?',
      [patientId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get insurance information
    const insurance = await db.query(
      `SELECT 
        pi.*,
        rp.payer_name,
        rip.plan_name,
        rip.plan_type,
        rip.copay_amount,
        rip.coinsurance_percentage,
        rip.deductible_amount
      FROM patient_insurances_enhanced pi
      LEFT JOIN rcm_payers rp ON pi.payer_id = rp.id
      LEFT JOIN rcm_insurance_plans rip ON pi.plan_id = rip.id
      WHERE pi.patient_id = ? AND pi.is_active = 1
      ORDER BY pi.priority ASC`,
      [patientId]
    );

    // Get recent eligibility verifications
    const eligibilityHistory = await db.query(
      `SELECT 
        verification_date,
        status,
        coverage_status,
        effective_date,
        termination_date,
        copay_amount,
        deductible_remaining,
        out_of_pocket_remaining
      FROM insurance_eligibility_verifications 
      WHERE patient_id = ? 
      ORDER BY verification_date DESC 
      LIMIT 5`,
      [patientId]
    );

    // Process insurance data
    const processedInsurance = insurance.map(ins => ({
      id: ins.id,
      priority: ins.priority,
      payer: {
        id: ins.payer_id,
        name: ins.payer_name || 'Unknown Payer',
        type: ins.payer_type
      },
      plan: {
        id: ins.plan_id,
        name: ins.plan_name || 'Unknown Plan',
        type: ins.plan_type
      },
      memberInfo: {
        memberId: ins.member_id,
        groupNumber: ins.group_number,
        subscriberName: ins.subscriber_name,
        relationshipToSubscriber: ins.relationship_to_subscriber
      },
      coverage: {
        effectiveDate: ins.effective_date,
        terminationDate: ins.termination_date,
        copayAmount: ins.copay_amount,
        coinsurancePercentage: ins.coinsurance_percentage,
        deductibleAmount: ins.deductible_amount
      },
      cardImages: {
        front: ins.card_front_image_url,
        back: ins.card_back_image_url
      },
      lastVerified: ins.last_verification_date,
      verificationStatus: ins.verification_status,
      isActive: ins.is_active,
      createdAt: ins.created_at
    }));

    // Log access for HIPAA compliance
    await logAudit(userId, 'VIEW', 'patient_insurance', patientId, {
      insuranceCount: insurance.length
    });

    res.json({
      success: true,
      data: {
        insurance: processedInsurance,
        eligibilityHistory: eligibilityHistory,
        summary: {
          primaryInsurance: processedInsurance.find(ins => ins.priority === 1),
          secondaryInsurance: processedInsurance.find(ins => ins.priority === 2),
          totalPlans: processedInsurance.length,
          lastVerification: eligibilityHistory.length > 0 ? eligibilityHistory[0].verification_date : null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch insurance information'
    });
  }
};

// Add or update insurance information
const updatePatientInsurance = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { 
      payerId,
      planId,
      memberId,
      groupNumber,
      subscriberName,
      relationshipToSubscriber,
      effectiveDate,
      terminationDate,
      priority = 1,
      cardFrontImage,
      cardBackImage
    } = req.body;
    const userId = req.headers['userid'];

    // Validate required fields
    if (!payerId || !memberId || !subscriberName) {
      return res.status(400).json({
        success: false,
        message: 'Payer ID, member ID, and subscriber name are required'
      });
    }

    // Verify patient exists
    const patientCheck = await db.query(
      'SELECT user_id FROM user_profiles WHERE user_id = ?',
      [patientId]
    );

    if (patientCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Check if insurance with same priority already exists
    const existingInsurance = await db.query(
      'SELECT id FROM patient_insurances_enhanced WHERE patient_id = ? AND priority = ? AND is_active = 1',
      [patientId, priority]
    );

    let result;
    if (existingInsurance.length > 0) {
      // Update existing insurance
      result = await db.query(
        `UPDATE patient_insurances_enhanced 
         SET payer_id = ?, plan_id = ?, member_id = ?, group_number = ?, 
             subscriber_name = ?, relationship_to_subscriber = ?, 
             effective_date = ?, termination_date = ?,
             card_front_image_url = ?, card_back_image_url = ?
         WHERE id = ?`,
        [payerId, planId, memberId, groupNumber, subscriberName, 
         relationshipToSubscriber, effectiveDate, terminationDate,
         cardFrontImage, cardBackImage, existingInsurance[0].id]
      );

      await logAudit(userId, 'UPDATE', 'patient_insurance', existingInsurance[0].id, {
        patientId,
        priority,
        changes: { payerId, planId, memberId }
      });

    } else {
      // Insert new insurance
      result = await db.query(
        `INSERT INTO patient_insurances_enhanced 
         (patient_id, payer_id, plan_id, member_id, group_number, 
          subscriber_name, relationship_to_subscriber, effective_date, 
          termination_date, priority, card_front_image_url, card_back_image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, payerId, planId, memberId, groupNumber, subscriberName, 
         relationshipToSubscriber, effectiveDate, terminationDate, priority,
         cardFrontImage, cardBackImage]
      );

      await logAudit(userId, 'CREATE', 'patient_insurance', result.insertId, {
        patientId,
        priority,
        payerId,
        memberId
      });
    }

    res.json({
      success: true,
      message: 'Insurance information updated successfully',
      data: {
        patientId,
        priority,
        memberId,
        subscriberName
      }
    });

  } catch (error) {
    console.error('Error updating patient insurance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insurance information'
    });
  }
};

// Verify insurance eligibility
const verifyInsuranceEligibility = async (req, res) => {
  try {
    const { id: patientId } = req.params;
    const { insuranceId } = req.body;
    const userId = req.headers['userid'];

    // Get insurance information
    const insurance = await db.query(
      `SELECT pi.*, rp.payer_name 
       FROM patient_insurances_enhanced pi
       LEFT JOIN rcm_payers rp ON pi.payer_id = rp.id
       WHERE pi.id = ? AND pi.patient_id = ?`,
      [insuranceId, patientId]
    );

    if (insurance.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Insurance not found'
      });
    }

    // In a real implementation, this would call the payer's eligibility API
    // For now, we'll simulate the verification
    const verificationResult = {
      status: 'verified',
      coverageStatus: 'active',
      effectiveDate: insurance[0].effective_date,
      terminationDate: insurance[0].termination_date,
      copayAmount: 25.00,
      deductibleAmount: 1000.00,
      deductibleRemaining: 750.00,
      outOfPocketMax: 5000.00,
      outOfPocketRemaining: 4200.00,
      verificationDate: new Date().toISOString(),
      benefits: [
        { service: 'Office Visit', coverage: '80%', copay: 25.00 },
        { service: 'Specialist Visit', coverage: '70%', copay: 50.00 },
        { service: 'Emergency Room', coverage: '80%', copay: 200.00 },
        { service: 'Prescription Drugs', coverage: '75%', copay: 10.00 }
      ]
    };

    // Store verification result
    await db.query(
      `INSERT INTO insurance_eligibility_verifications 
       (patient_id, insurance_id, verification_date, status, coverage_status,
        effective_date, termination_date, copay_amount, deductible_remaining, 
        out_of_pocket_remaining, benefits_json) 
       VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, insuranceId, verificationResult.status, verificationResult.coverageStatus,
       verificationResult.effectiveDate, verificationResult.terminationDate,
       verificationResult.copayAmount, verificationResult.deductibleRemaining,
       verificationResult.outOfPocketRemaining, JSON.stringify(verificationResult.benefits)]
    );

    // Update insurance verification status
    await db.query(
      'UPDATE patient_insurances_enhanced SET last_verification_date = NOW(), verification_status = ? WHERE id = ?',
      [verificationResult.status, insuranceId]
    );

    // Log the verification
    await logAudit(userId, 'VERIFY', 'insurance_eligibility', insuranceId, {
      patientId,
      verificationStatus: verificationResult.status,
      coverageStatus: verificationResult.coverageStatus
    });

    res.json({
      success: true,
      message: 'Insurance eligibility verified successfully',
      data: verificationResult
    });

  } catch (error) {
    console.error('Error verifying insurance eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify insurance eligibility'
    });
  }
};

module.exports = {
  getPatientInsurance,
  updatePatientInsurance,
  verifyInsuranceEligibility
};