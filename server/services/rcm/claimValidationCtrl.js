const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");

// Claim Validation and Scoring System
const validateClaim = async (req, res) => {
  try {
    const { claim_id } = req.params;
    const { user_id } = req.user;

    // Get claim details with diagnosis and CPT codes
    const [claimData] = await connection.query(`
      SELECT 
        cb.id as claim_id,
        cb.patient_id,
        cb.cpt_code_id,
        cb.code_units,
        cb.created as service_date,
        cc.code as cpt_code,
        cc.description as cpt_description,
        cc.price,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.dob,
        up.gender,
        pc.payer_name,
        pc.policy_number
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id
      WHERE cb.id = ? AND um.fk_physician_id = ?
    `, [claim_id, user_id]);

    if (claimData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    const claim = claimData[0];

    // Get patient diagnoses
    const [diagnoses] = await connection.query(`
      SELECT diagnosis_code, diagnosis_description, created_at
      FROM patient_diagnoses 
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `, [claim.patient_id]);

    // Perform validation checks
    const validationResults = await performClaimValidation(claim, diagnoses);

    res.status(200).json({
      success: true,
      data: {
        claim,
        diagnoses,
        validation: validationResults
      }
    });

  } catch (error) {
    console.error("Error validating claim:", error);
    res.status(500).json({
      success: false,
      message: "Error validating claim"
    });
  }
};

// Comprehensive claim validation logic
async function performClaimValidation(claim, diagnoses) {
  const validationResults = {
    score: 0,
    maxScore: 100,
    issues: [],
    suggestions: [],
    warnings: [],
    approvalProbability: 0
  };

  // 1. CPT Code Validation (20 points)
  const cptValidation = await validateCPTCode(claim);
  validationResults.score += cptValidation.score;
  validationResults.issues.push(...cptValidation.issues);
  validationResults.suggestions.push(...cptValidation.suggestions);

  // 2. Diagnosis Code Validation (25 points)
  const diagnosisValidation = await validateDiagnosisCodes(claim, diagnoses);
  validationResults.score += diagnosisValidation.score;
  validationResults.issues.push(...diagnosisValidation.issues);
  validationResults.suggestions.push(...diagnosisValidation.suggestions);

  // 3. Medical Necessity Check (20 points)
  const necessityValidation = await validateMedicalNecessity(claim, diagnoses);
  validationResults.score += necessityValidation.score;
  validationResults.issues.push(...necessityValidation.issues);
  validationResults.suggestions.push(...necessityValidation.suggestions);

  // 4. Patient Demographics (15 points)
  const demographicsValidation = validatePatientDemographics(claim);
  validationResults.score += demographicsValidation.score;
  validationResults.issues.push(...demographicsValidation.issues);
  validationResults.suggestions.push(...demographicsValidation.suggestions);

  // 5. Insurance Information (10 points)
  const insuranceValidation = validateInsuranceInfo(claim);
  validationResults.score += insuranceValidation.score;
  validationResults.issues.push(...insuranceValidation.issues);
  validationResults.suggestions.push(...insuranceValidation.suggestions);

  // 6. Service Date Validation (10 points)
  const dateValidation = validateServiceDate(claim);
  validationResults.score += dateValidation.score;
  validationResults.issues.push(...dateValidation.issues);
  validationResults.suggestions.push(...dateValidation.suggestions);

  // Calculate approval probability
  validationResults.approvalProbability = Math.round((validationResults.score / validationResults.maxScore) * 100);

  // Add overall recommendations
  if (validationResults.score >= 90) {
    validationResults.warnings.push({
      type: 'success',
      message: 'Excellent claim quality - high approval probability',
      priority: 'low'
    });
  } else if (validationResults.score >= 75) {
    validationResults.warnings.push({
      type: 'warning',
      message: 'Good claim quality - minor improvements recommended',
      priority: 'medium'
    });
  } else {
    validationResults.warnings.push({
      type: 'error',
      message: 'Claim quality needs improvement - high denial risk',
      priority: 'high'
    });
  }

  return validationResults;
}

// CPT Code validation
async function validateCPTCode(claim) {
  const result = { score: 0, issues: [], suggestions: [] };

  // Check if CPT code exists and is valid
  const [cptCheck] = await connection.query(`
    SELECT code, description, category, price, is_active
    FROM cpt_codes 
    WHERE id = ?
  `, [claim.cpt_code_id]);

  if (cptCheck.length === 0) {
    result.issues.push({
      type: 'error',
      field: 'cpt_code',
      message: 'CPT code not found in system',
      severity: 'high'
    });
    return result;
  }

  const cptCode = cptCheck[0];

  // Check if CPT code is active
  if (!cptCode.is_active) {
    result.issues.push({
      type: 'error',
      field: 'cpt_code',
      message: 'CPT code is inactive or deprecated',
      severity: 'high'
    });
    result.suggestions.push({
      type: 'correction',
      field: 'cpt_code',
      message: 'Use current active CPT code',
      action: 'update_cpt_code'
    });
  } else {
    result.score += 15;
  }

  // Check units
  if (claim.code_units <= 0) {
    result.issues.push({
      type: 'error',
      field: 'units',
      message: 'Invalid units quantity',
      severity: 'medium'
    });
    result.suggestions.push({
      type: 'correction',
      field: 'units',
      message: 'Set valid units quantity (minimum 1)',
      action: 'update_units'
    });
  } else {
    result.score += 5;
  }

  return result;
}

// Diagnosis code validation
async function validateDiagnosisCodes(claim, diagnoses) {
  const result = { score: 0, issues: [], suggestions: [] };

  if (diagnoses.length === 0) {
    result.issues.push({
      type: 'error',
      field: 'diagnosis',
      message: 'No diagnosis codes found for patient',
      severity: 'high'
    });
    result.suggestions.push({
      type: 'correction',
      field: 'diagnosis',
      message: 'Add at least one primary diagnosis code',
      action: 'add_diagnosis'
    });
    return result;
  }

  // Check for primary diagnosis
  const primaryDiagnosis = diagnoses[0];
  if (primaryDiagnosis) {
    result.score += 15;

    // Validate ICD-10 format
    const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,3})?$/;
    if (!icd10Pattern.test(primaryDiagnosis.diagnosis_code)) {
      result.issues.push({
        type: 'warning',
        field: 'diagnosis_format',
        message: 'Diagnosis code may not be in valid ICD-10 format',
        severity: 'medium'
      });
      result.suggestions.push({
        type: 'correction',
        field: 'diagnosis_format',
        message: 'Verify ICD-10 code format (e.g., F32.9)',
        action: 'validate_icd10'
      });
    } else {
      result.score += 10;
    }
  }

  return result;
}

// Medical necessity validation
async function validateMedicalNecessity(claim, diagnoses) {
  const result = { score: 0, issues: [], suggestions: [] };

  // Check if CPT and diagnosis codes are compatible
  const compatibilityCheck = await checkCPTDiagnosisCompatibility(claim.cpt_code, diagnoses);
  
  if (compatibilityCheck.compatible) {
    result.score += 20;
  } else {
    result.issues.push({
      type: 'warning',
      field: 'medical_necessity',
      message: 'CPT code may not be medically necessary for given diagnosis',
      severity: 'high'
    });
    result.suggestions.push({
      type: 'recommendation',
      field: 'medical_necessity',
      message: compatibilityCheck.suggestion,
      action: 'review_necessity'
    });
  }

  return result;
}

// Check CPT and diagnosis compatibility
async function checkCPTDiagnosisCompatibility(cptCode, diagnoses) {
  // This would typically integrate with medical coding databases
  // For now, we'll use basic rules
  
  const mentalHealthCPTs = ['90834', '90837', '90791', '90834'];
  const mentalHealthDiagnoses = ['F32', 'F33', 'F41', 'F43', 'F90', 'F84'];
  
  const evaluationCPTs = ['99213', '99214', '99215', '99203', '99204'];
  
  if (mentalHealthCPTs.includes(cptCode)) {
    const hasMentalHealthDx = diagnoses.some(dx => 
      mentalHealthDiagnoses.some(mhDx => dx.diagnosis_code.startsWith(mhDx))
    );
    
    if (hasMentalHealthDx) {
      return { compatible: true, suggestion: null };
    } else {
      return { 
        compatible: false, 
        suggestion: 'Consider adding mental health diagnosis or using appropriate E&M code' 
      };
    }
  }
  
  // Default to compatible for other codes
  return { compatible: true, suggestion: null };
}

// Patient demographics validation
function validatePatientDemographics(claim) {
  const result = { score: 0, issues: [], suggestions: [] };

  // Check patient name
  if (claim.patient_name && claim.patient_name.trim().length > 0) {
    result.score += 5;
  } else {
    result.issues.push({
      type: 'error',
      field: 'patient_name',
      message: 'Patient name is missing',
      severity: 'high'
    });
  }

  // Check date of birth
  if (claim.dob) {
    result.score += 5;
    
    // Check if patient is over 150 years old (data quality check)
    const age = Math.floor((new Date() - new Date(claim.dob)) / (365.25 * 24 * 60 * 60 * 1000));
    if (age > 150) {
      result.issues.push({
        type: 'warning',
        field: 'dob',
        message: 'Patient age seems unrealistic - please verify date of birth',
        severity: 'medium'
      });
    }
  } else {
    result.issues.push({
      type: 'error',
      field: 'dob',
      message: 'Patient date of birth is missing',
      severity: 'high'
    });
  }

  // Check gender
  if (claim.gender) {
    result.score += 5;
  } else {
    result.issues.push({
      type: 'warning',
      field: 'gender',
      message: 'Patient gender is missing',
      severity: 'low'
    });
  }

  return result;
}

// Insurance information validation
function validateInsuranceInfo(claim) {
  const result = { score: 0, issues: [], suggestions: [] };

  if (claim.payer_name) {
    result.score += 5;
  } else {
    result.issues.push({
      type: 'error',
      field: 'payer',
      message: 'Insurance payer information is missing',
      severity: 'high'
    });
    result.suggestions.push({
      type: 'correction',
      field: 'payer',
      message: 'Add insurance payer information',
      action: 'add_insurance'
    });
  }

  if (claim.policy_number) {
    result.score += 5;
  } else {
    result.issues.push({
      type: 'error',
      field: 'policy_number',
      message: 'Insurance policy number is missing',
      severity: 'high'
    });
    result.suggestions.push({
      type: 'correction',
      field: 'policy_number',
      message: 'Add insurance policy number',
      action: 'add_policy_number'
    });
  }

  return result;
}

// Service date validation
function validateServiceDate(claim) {
  const result = { score: 0, issues: [], suggestions: [] };

  if (claim.service_date) {
    const serviceDate = new Date(claim.service_date);
    const today = new Date();
    const daysDiff = Math.floor((today - serviceDate) / (24 * 60 * 60 * 1000));

    if (daysDiff < 0) {
      result.issues.push({
        type: 'error',
        field: 'service_date',
        message: 'Service date cannot be in the future',
        severity: 'high'
      });
    } else if (daysDiff > 365) {
      result.issues.push({
        type: 'warning',
        field: 'service_date',
        message: 'Service date is over 1 year old - may affect reimbursement',
        severity: 'medium'
      });
      result.score += 5;
    } else {
      result.score += 10;
    }
  } else {
    result.issues.push({
      type: 'error',
      field: 'service_date',
      message: 'Service date is missing',
      severity: 'high'
    });
  }

  return result;
}

// Get claim suggestions based on patient history and diagnosis
const getClaimSuggestions = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { user_id } = req.user;

    // Get patient diagnoses
    const [diagnoses] = await connection.query(`
      SELECT diagnosis_code, diagnosis_description
      FROM patient_diagnoses 
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `, [patient_id]);

    // Get patient's claim history
    const [claimHistory] = await connection.query(`
      SELECT cc.code, cc.description, COUNT(*) as frequency
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE cb.patient_id = ? AND um.fk_physician_id = ?
      GROUP BY cc.code, cc.description
      ORDER BY frequency DESC
      LIMIT 10
    `, [patient_id, user_id]);

    // Generate suggestions based on diagnoses
    const suggestions = await generateClaimSuggestions(diagnoses, claimHistory);

    res.status(200).json({
      success: true,
      data: {
        patient_id,
        diagnoses,
        claim_history: claimHistory,
        suggestions
      }
    });

  } catch (error) {
    console.error("Error getting claim suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Error getting claim suggestions"
    });
  }
};

// Generate intelligent claim suggestions
async function generateClaimSuggestions(diagnoses, claimHistory) {
  const suggestions = [];

  // Get common CPT codes for each diagnosis
  for (const diagnosis of diagnoses) {
    const diagnosisCode = diagnosis.diagnosis_code.substring(0, 3); // Get first 3 characters
    
    let recommendedCPTs = [];
    
    // Mental health diagnoses
    if (['F32', 'F33', 'F41', 'F43'].includes(diagnosisCode)) {
      recommendedCPTs = [
        { code: '90834', description: 'Psychotherapy, 45 minutes', reason: 'Standard therapy for depression/anxiety' },
        { code: '90837', description: 'Psychotherapy, 60 minutes', reason: 'Extended therapy for complex cases' },
        { code: '90791', description: 'Psychiatric diagnostic evaluation', reason: 'Initial assessment' }
      ];
    }
    // ADHD
    else if (diagnosisCode === 'F90') {
      recommendedCPTs = [
        { code: '96116', description: 'Neurobehavioral status exam', reason: 'ADHD assessment' },
        { code: '90834', description: 'Psychotherapy, 45 minutes', reason: 'Behavioral therapy' },
        { code: '99214', description: 'Office visit, established patient, high complexity', reason: 'Medication management' }
      ];
    }
    // Autism
    else if (diagnosisCode === 'F84') {
      recommendedCPTs = [
        { code: '96118', description: 'Neuropsychological testing', reason: 'Autism assessment' },
        { code: '90834', description: 'Psychotherapy, 45 minutes', reason: 'Behavioral intervention' }
      ];
    }
    // General medical
    else {
      recommendedCPTs = [
        { code: '99213', description: 'Office visit, established patient, moderate complexity', reason: 'Standard follow-up' },
        { code: '99214', description: 'Office visit, established patient, high complexity', reason: 'Complex case management' }
      ];
    }

    suggestions.push({
      diagnosis: diagnosis.diagnosis_code,
      diagnosis_description: diagnosis.diagnosis_description,
      recommended_cpts: recommendedCPTs,
      confidence: calculateConfidence(diagnosis, claimHistory)
    });
  }

  return suggestions;
}

// Calculate confidence score for suggestions
function calculateConfidence(diagnosis, claimHistory) {
  // Base confidence
  let confidence = 70;

  // Increase confidence if we have claim history
  if (claimHistory.length > 0) {
    confidence += 20;
  }

  // Increase confidence for common diagnoses
  const commonDiagnoses = ['F32.9', 'F41.1', 'F43.10', 'F90.9'];
  if (commonDiagnoses.includes(diagnosis.diagnosis_code)) {
    confidence += 10;
  }

  return Math.min(confidence, 95);
}

// Auto-correction suggestions
const getAutoCorrections = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get claims with potential issues
    const [problematicClaims] = await connection.query(`
      SELECT 
        cb.id as claim_id,
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        cc.code as cpt_code,
        cc.description as cpt_description,
        cb.status,
        cb.created as service_date,
        DATEDIFF(CURDATE(), cb.created) as days_old
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      WHERE um.fk_physician_id = ? 
        AND cb.status IN (0, 1, 3)
      ORDER BY cb.created DESC
      LIMIT 50
    `, [user_id]);

    const corrections = [];

    for (const claim of problematicClaims) {
      const claimCorrections = await generateAutoCorrections(claim);
      if (claimCorrections.length > 0) {
        corrections.push({
          claim_id: claim.claim_id,
          patient_name: claim.patient_name,
          cpt_code: claim.cpt_code,
          status: claim.status,
          corrections: claimCorrections
        });
      }
    }

    res.status(200).json({
      success: true,
      data: corrections
    });

  } catch (error) {
    console.error("Error getting auto corrections:", error);
    res.status(500).json({
      success: false,
      message: "Error getting auto corrections"
    });
  }
};

// Generate auto-correction suggestions
async function generateAutoCorrections(claim) {
  const corrections = [];

  // Check for old pending claims
  if (claim.status === 1 && claim.days_old > 30) {
    corrections.push({
      type: 'follow_up',
      priority: 'high',
      message: `Claim is ${claim.days_old} days old - follow up with payer`,
      action: 'follow_up_payer',
      automated: true
    });
  }

  // Check for denied claims
  if (claim.status === 3) {
    corrections.push({
      type: 'appeal',
      priority: 'medium',
      message: 'Denied claim - review for appeal opportunity',
      action: 'review_denial',
      automated: false
    });
  }

  // Check for draft claims
  if (claim.status === 0 && claim.days_old > 7) {
    corrections.push({
      type: 'submit',
      priority: 'medium',
      message: 'Draft claim ready for submission',
      action: 'submit_claim',
      automated: true
    });
  }

  return corrections;
}

module.exports = {
  validateClaim,
  getClaimSuggestions,
  getAutoCorrections
};