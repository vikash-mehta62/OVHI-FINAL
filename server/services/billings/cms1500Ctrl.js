const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Submit CMS-1500 claim
const submitCMS1500Claim = async (req, res) => {
  try {
    const {
      patientInfo,
      insuranceInfo,
      providerInfo,
      serviceLines,
      diagnosisCodes,
      claimInfo
    } = req.body;
    const providerId = req.headers['userid'];

    // Validate required fields
    const validationErrors = validateCMS1500Data(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors: validationErrors
      });
    }

    // Generate claim number
    const claimNumber = await generateClaimNumber();

    // Insert claim into database
    const claimResult = await db.query(
      `INSERT INTO cms1500_claims 
       (claim_number, patient_id, provider_id, payer_id, total_charges, 
        patient_info, insurance_info, provider_info, service_lines, 
        diagnosis_codes, claim_info, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        claimNumber,
        patientInfo.patientId,
        providerId,
        insuranceInfo.payerId,
        calculateTotalCharges(serviceLines),
        JSON.stringify(patientInfo),
        JSON.stringify(insuranceInfo),
        JSON.stringify(providerInfo),
        JSON.stringify(serviceLines),
        JSON.stringify(diagnosisCodes),
        JSON.stringify(claimInfo)
      ]
    );

    const claimId = claimResult.insertId;

    // Generate PDF form
    const pdfPath = await generateCMS1500PDF(claimId, req.body);

    // Submit to clearinghouse (simulated)
    const submissionResult = await submitToClearinghouse(claimId, req.body);

    // Update claim with submission details
    await db.query(
      `UPDATE cms1500_claims 
       SET submission_id = ?, clearinghouse_response = ?, 
           pdf_path = ?, status = ?, submitted_at = NOW()
       WHERE id = ?`,
      [
        submissionResult.submissionId,
        JSON.stringify(submissionResult.response),
        pdfPath,
        submissionResult.status,
        claimId
      ]
    );

    // Log the submission
    await logAudit(providerId, 'SUBMIT', 'cms1500_claim', claimId, {
      claimNumber,
      patientId: patientInfo.patientId,
      totalCharges: calculateTotalCharges(serviceLines),
      submissionId: submissionResult.submissionId
    });

    res.status(201).json({
      success: true,
      message: 'CMS-1500 claim submitted successfully',
      data: {
        claimId,
        claimNumber,
        submissionId: submissionResult.submissionId,
        status: submissionResult.status,
        totalCharges: calculateTotalCharges(serviceLines),
        pdfUrl: `/api/v1/billing/cms1500/${claimId}/pdf`
      }
    });

  } catch (error) {
    console.error('Error submitting CMS-1500 claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit CMS-1500 claim'
    });
  }
};

// Get CMS-1500 form template
const getCMS1500Template = async (req, res) => {
  try {
    const template = {
      patientInfo: {
        required: ['lastName', 'firstName', 'dateOfBirth', 'gender', 'address'],
        optional: ['middleInitial', 'suffix', 'phone']
      },
      insuranceInfo: {
        required: ['payerName', 'payerId', 'memberId', 'groupNumber'],
        optional: ['planName', 'relationshipToInsured']
      },
      providerInfo: {
        required: ['npi', 'name', 'address', 'taxId'],
        optional: ['phone', 'facilityName']
      },
      serviceLines: {
        required: ['serviceDate', 'cptCode', 'charges', 'units'],
        optional: ['modifier', 'diagnosisPointer', 'placeOfService']
      },
      diagnosisCodes: {
        required: ['code', 'description'],
        maxCount: 12
      },
      validation: {
        cptCodeFormat: /^\d{5}$/,
        icdCodeFormat: /^[A-Z]\d{2}(\.\d{1,3})?$/,
        npiFormat: /^\d{10}$/,
        dateFormat: 'MM/DD/YYYY'
      }
    };

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error getting CMS-1500 template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CMS-1500 template'
    });
  }
};

// Get claim status
const getCMS1500ClaimStatus = async (req, res) => {
  try {
    const { claimId } = req.params;
    const providerId = req.headers['userid'];

    const claim = await db.query(
      `SELECT c.*, p.first_name, p.last_name 
       FROM cms1500_claims c
       LEFT JOIN user_profiles p ON c.patient_id = p.user_id
       WHERE c.id = ? AND c.provider_id = ?`,
      [claimId, providerId]
    );

    if (claim.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    const claimData = claim[0];

    // Get status updates
    const statusUpdates = await db.query(
      'SELECT * FROM claim_status_updates WHERE claim_id = ? ORDER BY created_at DESC',
      [claimId]
    );

    res.json({
      success: true,
      data: {
        claimId: claimData.id,
        claimNumber: claimData.claim_number,
        patientName: `${claimData.first_name} ${claimData.last_name}`,
        status: claimData.status,
        totalCharges: claimData.total_charges,
        submittedAt: claimData.submitted_at,
        submissionId: claimData.submission_id,
        statusUpdates: statusUpdates,
        pdfAvailable: !!claimData.pdf_path
      }
    });

  } catch (error) {
    console.error('Error getting claim status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get claim status'
    });
  }
};

// Correct rejected claim
const correctCMS1500Claim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const corrections = req.body;
    const providerId = req.headers['userid'];

    // Verify claim exists and belongs to provider
    const claim = await db.query(
      'SELECT * FROM cms1500_claims WHERE id = ? AND provider_id = ?',
      [claimId, providerId]
    );

    if (claim.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Create corrected claim
    const originalClaim = claim[0];
    const correctedData = {
      ...JSON.parse(originalClaim.patient_info),
      ...JSON.parse(originalClaim.insurance_info),
      ...JSON.parse(originalClaim.provider_info),
      serviceLines: JSON.parse(originalClaim.service_lines),
      diagnosisCodes: JSON.parse(originalClaim.diagnosis_codes),
      claimInfo: JSON.parse(originalClaim.claim_info),
      ...corrections
    };

    // Validate corrected data
    const validationErrors = validateCMS1500Data(correctedData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors in corrections',
        errors: validationErrors
      });
    }

    // Generate new claim number for corrected claim
    const newClaimNumber = await generateClaimNumber();

    // Insert corrected claim
    const correctedClaimResult = await db.query(
      `INSERT INTO cms1500_claims 
       (claim_number, patient_id, provider_id, payer_id, total_charges, 
        patient_info, insurance_info, provider_info, service_lines, 
        diagnosis_codes, claim_info, status, original_claim_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        newClaimNumber,
        correctedData.patientInfo.patientId,
        providerId,
        correctedData.insuranceInfo.payerId,
        calculateTotalCharges(correctedData.serviceLines),
        JSON.stringify(correctedData.patientInfo),
        JSON.stringify(correctedData.insuranceInfo),
        JSON.stringify(correctedData.providerInfo),
        JSON.stringify(correctedData.serviceLines),
        JSON.stringify(correctedData.diagnosisCodes),
        JSON.stringify(correctedData.claimInfo),
        claimId
      ]
    );

    // Mark original claim as corrected
    await db.query(
      'UPDATE cms1500_claims SET status = "corrected" WHERE id = ?',
      [claimId]
    );

    // Log the correction
    await logAudit(providerId, 'CORRECT', 'cms1500_claim', correctedClaimResult.insertId, {
      originalClaimId: claimId,
      originalClaimNumber: originalClaim.claim_number,
      newClaimNumber,
      corrections: Object.keys(corrections)
    });

    res.json({
      success: true,
      message: 'Claim corrected and resubmitted successfully',
      data: {
        originalClaimId: claimId,
        correctedClaimId: correctedClaimResult.insertId,
        newClaimNumber
      }
    });

  } catch (error) {
    console.error('Error correcting CMS-1500 claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to correct CMS-1500 claim'
    });
  }
};

// Helper functions
const validateCMS1500Data = (data) => {
  const errors = [];

  // Validate patient info
  if (!data.patientInfo) {
    errors.push('Patient information is required');
  } else {
    if (!data.patientInfo.lastName) errors.push('Patient last name is required');
    if (!data.patientInfo.firstName) errors.push('Patient first name is required');
    if (!data.patientInfo.dateOfBirth) errors.push('Patient date of birth is required');
    if (!data.patientInfo.gender) errors.push('Patient gender is required');
  }

  // Validate insurance info
  if (!data.insuranceInfo) {
    errors.push('Insurance information is required');
  } else {
    if (!data.insuranceInfo.payerName) errors.push('Payer name is required');
    if (!data.insuranceInfo.memberId) errors.push('Member ID is required');
  }

  // Validate provider info
  if (!data.providerInfo) {
    errors.push('Provider information is required');
  } else {
    if (!data.providerInfo.npi) errors.push('Provider NPI is required');
    if (!data.providerInfo.name) errors.push('Provider name is required');
    if (data.providerInfo.npi && !/^\d{10}$/.test(data.providerInfo.npi)) {
      errors.push('NPI must be 10 digits');
    }
  }

  // Validate service lines
  if (!data.serviceLines || data.serviceLines.length === 0) {
    errors.push('At least one service line is required');
  } else {
    data.serviceLines.forEach((line, index) => {
      if (!line.serviceDate) errors.push(`Service date is required for line ${index + 1}`);
      if (!line.cptCode) errors.push(`CPT code is required for line ${index + 1}`);
      if (!line.charges) errors.push(`Charges are required for line ${index + 1}`);
      if (line.cptCode && !/^\d{5}$/.test(line.cptCode)) {
        errors.push(`Invalid CPT code format for line ${index + 1}`);
      }
    });
  }

  // Validate diagnosis codes
  if (!data.diagnosisCodes || data.diagnosisCodes.length === 0) {
    errors.push('At least one diagnosis code is required');
  }

  return errors;
};

const generateClaimNumber = async () => {
  const prefix = 'CMS';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

const calculateTotalCharges = (serviceLines) => {
  return serviceLines.reduce((total, line) => total + parseFloat(line.charges || 0), 0);
};

const generateCMS1500PDF = async (claimId, claimData) => {
  // This would generate an actual CMS-1500 PDF form
  // For now, return a placeholder path
  return `/claims/cms1500_${claimId}.pdf`;
};

const submitToClearinghouse = async (claimId, claimData) => {
  // This would submit to actual clearinghouse
  // For now, simulate the submission
  return {
    submissionId: `SUB${Date.now()}`,
    status: 'submitted',
    response: {
      message: 'Claim submitted successfully',
      trackingNumber: `TRK${Date.now()}`,
      estimatedProcessingTime: '3-5 business days'
    }
  };
};

module.exports = {
  submitCMS1500Claim,
  getCMS1500Template,
  getCMS1500ClaimStatus,
  correctCMS1500Claim
};