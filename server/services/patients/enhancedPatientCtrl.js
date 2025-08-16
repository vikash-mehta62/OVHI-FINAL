const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const connection = require("../../config/db");
const moment = require('moment');
const logAudit = require("../../utils/logAudit");

// Encryption utilities for PHI data
const PHI_ENCRYPTION_KEY = process.env.PHI_ENCRYPTION_KEY || 'default-key-change-in-production';
const PHI_SALT = process.env.PHI_SALT || 'default-salt-change-in-production';

const encryptPHI = (data) => {
  if (!data) return null;
  const cipher = crypto.createCipher('aes-256-cbc', PHI_ENCRYPTION_KEY);
  let encrypted = cipher.update(data.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decryptPHI = (encryptedData) => {
  if (!encryptedData) return null;
  try {
    const decipher = crypto.createDecipher('aes-256-cbc', PHI_ENCRYPTION_KEY);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
};

const hashPHI = (data) => {
  if (!data) return null;
  return crypto.createHash('sha256').update(data + PHI_SALT).digest('hex');
};

// Calculate patient profile completeness score
const calculateCompletenessScore = (patientData) => {
  const requiredFields = [
    'firstName', 'lastName', 'dob', 'gender', 'work_email', 'phone',
    'address_line', 'city', 'state', 'zip'
  ];
  
  const optionalFields = [
    'middleName', 'suffix', 'pronouns', 'ethnicity', 'race', 
    'language_preference', 'marital_status', 'emergency_contact'
  ];
  
  let score = 0;
  let totalPossible = 0;
  
  // Required fields (weight: 3 points each)
  requiredFields.forEach(field => {
    totalPossible += 3;
    if (patientData[field] && patientData[field].toString().trim()) {
      score += 3;
    }
  });
  
  // Optional fields (weight: 1 point each)
  optionalFields.forEach(field => {
    totalPossible += 1;
    if (patientData[field] && patientData[field].toString().trim()) {
      score += 1;
    }
  });
  
  // Clinical data bonus points
  if (patientData.allergies_count > 0) {
    score += 2;
    totalPossible += 2;
  }
  if (patientData.medications_count > 0) {
    score += 2;
    totalPossible += 2;
  }
  if (patientData.insurance_count > 0) {
    score += 3;
    totalPossible += 3;
  }
  
  return Math.round((score / totalPossible) * 100);
};

// Get enhanced patient profile
const getEnhancedPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { user_id, roleid } = req.user;

    // Validate access permissions
    if (roleid === 7 && user_id !== parseInt(patientId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Can only view own profile'
      });
    }

    // Get enhanced patient profile with all related data
    const [patientRows] = await connection.query(`
      SELECT 
        up.*,
        u.username,
        u.created as account_created,
        (SELECT COUNT(*) FROM allergies WHERE patient_id = up.fk_userid) as allergies_count,
        (SELECT COUNT(*) FROM patient_medication WHERE patient_id = up.fk_userid AND status = 'active') as medications_count,
        (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = up.fk_userid AND is_active = 1) as insurance_count,
        (SELECT COUNT(*) FROM patient_diagnoses WHERE patient_id = up.fk_userid AND status = 'active') as diagnoses_count
      FROM user_profiles up
      LEFT JOIN users u ON u.user_id = up.fk_userid
      WHERE up.fk_userid = ?
    `, [patientId]);

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientRows[0];

    // Decrypt sensitive data based on user role
    const canViewSensitiveData = ['admin', 'billing_staff'].includes(req.user.role) || roleid === 1;
    
    if (patient.ssn_encrypted && canViewSensitiveData) {
      patient.ssn = decryptPHI(patient.ssn_encrypted);
    }

    // Get allergies
    const [allergies] = await connection.query(`
      SELECT 
        id,
        CASE category
          WHEN 1 THEN 'food'
          WHEN 2 THEN 'medication'
          WHEN 3 THEN 'environmental'
          WHEN 4 THEN 'other'
          ELSE 'other'
        END AS category,
        allergen,
        reaction,
        severity,
        onset_date,
        notes,
        created_at
      FROM allergies
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `, [patientId]);

    // Get medications
    const [medications] = await connection.query(`
      SELECT 
        id,
        name,
        dosage,
        frequency,
        route,
        prescribed_by,
        startDate,
        endDate,
        status,
        indication,
        notes,
        refills
      FROM patient_medication
      WHERE patient_id = ?
      ORDER BY startDate DESC
    `, [patientId]);

    // Get insurance information
    const [insurances] = await connection.query(`
      SELECT 
        patient_insurance_id as id,
        insurance_policy_number as member_id,
        insurance_group_number as group_number,
        insurance_company as payer_name,
        insurance_plan as plan_name,
        insurance_relationship as relationship_to_patient,
        insurance_expiry as termination_date,
        insurance_type as coverage_type,
        effective_date,
        insured_name as policy_holder_name,
        insured_gender,
        insured_dob as policy_holder_dob,
        insured_address,
        insured_phone,
        is_active,
        eligibility_verified,
        last_eligibility_check,
        copay_amount,
        deductible_amount
      FROM patient_insurances
      WHERE fk_userid = ?
      ORDER BY 
        CASE insurance_type 
          WHEN 'primary' THEN 1 
          WHEN 'secondary' THEN 2 
          WHEN 'tertiary' THEN 3 
          ELSE 4 
        END
    `, [patientId]);

    // Get problem list (diagnoses)
    const [problemList] = await connection.query(`
      SELECT 
        id,
        icd10 as problem_code,
        diagnosis as description,
        icd10 as icd10_code,
        date as onset_date,
        status,
        type as severity,
        created_by
      FROM patient_diagnoses
      WHERE patient_id = ?
      ORDER BY date DESC
    `, [patientId]);

    // Get consents (if consent table exists)
    let consents = [];
    try {
      const [consentRows] = await connection.query(`
        SELECT 
          id,
          consent_type,
          consent_status,
          consent_date,
          expiration_date,
          digital_signature,
          witness_signature,
          notes
        FROM patient_consents
        WHERE patient_id = ?
        ORDER BY consent_date DESC
      `, [patientId]);
      consents = consentRows;
    } catch (error) {
      // Consent table might not exist yet
      console.log('Consent table not found, skipping...');
    }

    // Calculate completeness score
    const completenessScore = calculateCompletenessScore(patient);

    // Format response data
    const enhancedProfile = {
      // Core Demographics
      firstName: patient.firstname,
      middleName: patient.middlename,
      lastName: patient.lastname,
      suffix: patient.suffix,
      pronouns: patient.pronouns,
      dateOfBirth: patient.dob,
      gender: patient.gender,
      
      // Contact Information
      email: patient.work_email,
      phone: patient.phone,
      alternatePhone: patient.alternate_phone,
      address: {
        line1: patient.address_line,
        line2: patient.address_line_2,
        city: patient.city,
        state: patient.state,
        zipCode: patient.zip,
        country: patient.country || 'USA'
      },
      
      // Enhanced Demographics
      ethnicity: patient.ethnicity,
      race: patient.race,
      languagePreference: patient.language_preference || 'English',
      preferredCommunication: patient.preferred_communication || 'phone',
      maritalStatus: patient.marital_status,
      
      // Accessibility & Special Needs
      disabilityStatus: patient.disability_status,
      accessibilityNeeds: patient.accessibility_needs ? patient.accessibility_needs.split(',') : [],
      interpreterNeeded: patient.interpreter_needed || false,
      wheelchairAccess: patient.wheelchair_access || false,
      
      // Emergency Contact
      emergencyContact: {
        name: patient.emergency_contact,
        relationship: patient.emergency_relationship,
        phone: patient.emergency_phone,
        email: patient.emergency_email
      },
      
      // Identifiers (sensitive data)
      ssn: canViewSensitiveData ? patient.ssn : null,
      driverLicense: patient.driver_license,
      passport: patient.passport_number,
      
      // Related Data
      allergies: allergies,
      medications: medications,
      insurances: insurances,
      problemList: problemList,
      consents: consents,
      
      // System Fields
      profileCompleteness: completenessScore,
      lastUpdated: patient.updated_at,
      createdAt: patient.account_created,
      patientId: patient.fk_userid
    };

    // Log access for audit trail
    await logAudit(req, 'VIEW', 'ENHANCED_PATIENT_PROFILE', patientId, 
      `Enhanced patient profile accessed by user ${user_id}`);

    return res.status(200).json({
      success: true,
      message: 'Enhanced patient profile retrieved successfully',
      patient: enhancedProfile,
      completenessScore: completenessScore
    });

  } catch (error) {
    console.error('Error fetching enhanced patient profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching enhanced patient profile'
    });
  }
};

// Update enhanced patient profile
const updateEnhancedPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { user_id, roleid } = req.user;
    const patientData = req.body;

    // Validate access permissions
    if (roleid === 7 && user_id !== parseInt(patientId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Can only update own profile'
      });
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // Prepare encrypted sensitive data
      let ssnEncrypted = null;
      let ssnHash = null;
      
      if (patientData.ssn) {
        ssnEncrypted = encryptPHI(patientData.ssn);
        ssnHash = hashPHI(patientData.ssn);
      }

      // Update main patient profile
      const updateQuery = `
        UPDATE user_profiles SET
          firstname = ?,
          middlename = ?,
          lastname = ?,
          suffix = ?,
          pronouns = ?,
          dob = ?,
          gender = ?,
          work_email = ?,
          phone = ?,
          alternate_phone = ?,
          address_line = ?,
          address_line_2 = ?,
          city = ?,
          state = ?,
          zip = ?,
          country = ?,
          ethnicity = ?,
          race = ?,
          language_preference = ?,
          preferred_communication = ?,
          marital_status = ?,
          disability_status = ?,
          accessibility_needs = ?,
          interpreter_needed = ?,
          wheelchair_access = ?,
          emergency_contact = ?,
          emergency_relationship = ?,
          emergency_phone = ?,
          emergency_email = ?,
          ssn_encrypted = ?,
          ssn_hash = ?,
          driver_license = ?,
          passport_number = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE fk_userid = ?
      `;

      const updateValues = [
        patientData.firstName,
        patientData.middleName,
        patientData.lastName,
        patientData.suffix,
        patientData.pronouns,
        patientData.dateOfBirth,
        patientData.gender,
        patientData.email,
        patientData.phone,
        patientData.alternatePhone,
        patientData.address?.line1,
        patientData.address?.line2,
        patientData.address?.city,
        patientData.address?.state,
        patientData.address?.zipCode,
        patientData.address?.country || 'USA',
        patientData.ethnicity,
        patientData.race,
        patientData.languagePreference,
        patientData.preferredCommunication,
        patientData.maritalStatus,
        patientData.disabilityStatus,
        patientData.accessibilityNeeds?.join(','),
        patientData.interpreterNeeded,
        patientData.wheelchairAccess,
        patientData.emergencyContact?.name,
        patientData.emergencyContact?.relationship,
        patientData.emergencyContact?.phone,
        patientData.emergencyContact?.email,
        ssnEncrypted,
        ssnHash,
        patientData.driverLicense,
        patientData.passport,
        patientId
      ];

      await connection.query(updateQuery, updateValues);

      // Update username in users table if email changed
      if (patientData.email) {
        await connection.query(
          'UPDATE users SET username = ? WHERE user_id = ?',
          [patientData.email, patientId]
        );
      }

      // Calculate new completeness score
      const [updatedPatient] = await connection.query(`
        SELECT *,
          (SELECT COUNT(*) FROM allergies WHERE patient_id = ?) as allergies_count,
          (SELECT COUNT(*) FROM patient_medication WHERE patient_id = ? AND status = 'active') as medications_count,
          (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = ? AND is_active = 1) as insurance_count
        FROM user_profiles WHERE fk_userid = ?
      `, [patientId, patientId, patientId, patientId]);

      const completenessScore = calculateCompletenessScore(updatedPatient[0]);

      // Commit transaction
      await connection.commit();

      // Log update for audit trail
      await logAudit(req, 'UPDATE', 'ENHANCED_PATIENT_PROFILE', patientId, 
        `Enhanced patient profile updated by user ${user_id}`);

      return res.status(200).json({
        success: true,
        message: 'Enhanced patient profile updated successfully',
        completenessScore: completenessScore
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error updating enhanced patient profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating enhanced patient profile'
    });
  }
};

// Get patient profile completeness analysis
const getProfileCompletenessAnalysis = async (req, res) => {
  try {
    const { patientId } = req.params;

    const [patientRows] = await connection.query(`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM allergies WHERE patient_id = up.fk_userid) as allergies_count,
        (SELECT COUNT(*) FROM patient_medication WHERE patient_id = up.fk_userid AND status = 'active') as medications_count,
        (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = up.fk_userid AND is_active = 1) as insurance_count,
        (SELECT COUNT(*) FROM patient_diagnoses WHERE patient_id = up.fk_userid AND status = 'active') as diagnoses_count
      FROM user_profiles up
      WHERE up.fk_userid = ?
    `, [patientId]);

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientRows[0];
    const completenessScore = calculateCompletenessScore(patient);

    // Analyze missing fields
    const missingFields = [];
    const requiredFields = [
      { field: 'firstname', label: 'First Name', category: 'Demographics' },
      { field: 'lastname', label: 'Last Name', category: 'Demographics' },
      { field: 'dob', label: 'Date of Birth', category: 'Demographics' },
      { field: 'gender', label: 'Gender', category: 'Demographics' },
      { field: 'work_email', label: 'Email', category: 'Contact' },
      { field: 'phone', label: 'Phone', category: 'Contact' },
      { field: 'address_line', label: 'Address', category: 'Contact' },
      { field: 'city', label: 'City', category: 'Contact' },
      { field: 'state', label: 'State', category: 'Contact' },
      { field: 'zip', label: 'ZIP Code', category: 'Contact' }
    ];

    requiredFields.forEach(({ field, label, category }) => {
      if (!patient[field] || !patient[field].toString().trim()) {
        missingFields.push({ field, label, category, priority: 'high' });
      }
    });

    const optionalFields = [
      { field: 'middlename', label: 'Middle Name', category: 'Demographics' },
      { field: 'ethnicity', label: 'Ethnicity', category: 'Demographics' },
      { field: 'emergency_contact', label: 'Emergency Contact', category: 'Contact' },
      { field: 'language_preference', label: 'Language Preference', category: 'Communication' }
    ];

    optionalFields.forEach(({ field, label, category }) => {
      if (!patient[field] || !patient[field].toString().trim()) {
        missingFields.push({ field, label, category, priority: 'medium' });
      }
    });

    // Check clinical data
    if (patient.allergies_count === 0) {
      missingFields.push({ 
        field: 'allergies', 
        label: 'Allergies Information', 
        category: 'Clinical', 
        priority: 'high' 
      });
    }

    if (patient.insurance_count === 0) {
      missingFields.push({ 
        field: 'insurance', 
        label: 'Insurance Information', 
        category: 'Financial', 
        priority: 'high' 
      });
    }

    const analysis = {
      completenessScore,
      totalFields: requiredFields.length + optionalFields.length + 2, // +2 for allergies and insurance
      completedFields: requiredFields.length + optionalFields.length + 2 - missingFields.length,
      missingFields,
      recommendations: generateRecommendations(missingFields, completenessScore)
    };

    return res.status(200).json({
      success: true,
      message: 'Profile completeness analysis retrieved successfully',
      analysis
    });

  } catch (error) {
    console.error('Error analyzing profile completeness:', error);
    return res.status(500).json({
      success: false,
      message: 'Error analyzing profile completeness'
    });
  }
};

// Generate recommendations based on missing fields
const generateRecommendations = (missingFields, completenessScore) => {
  const recommendations = [];

  if (completenessScore < 50) {
    recommendations.push({
      priority: 'critical',
      message: 'Profile is significantly incomplete. Focus on required demographic and contact information first.',
      action: 'Complete basic patient information'
    });
  }

  const highPriorityMissing = missingFields.filter(f => f.priority === 'high');
  if (highPriorityMissing.length > 0) {
    recommendations.push({
      priority: 'high',
      message: `${highPriorityMissing.length} critical fields are missing.`,
      action: 'Complete required fields: ' + highPriorityMissing.map(f => f.label).join(', ')
    });
  }

  const clinicalMissing = missingFields.filter(f => f.category === 'Clinical');
  if (clinicalMissing.length > 0) {
    recommendations.push({
      priority: 'medium',
      message: 'Clinical information is incomplete.',
      action: 'Add allergy information and current medications'
    });
  }

  const insuranceMissing = missingFields.filter(f => f.category === 'Financial');
  if (insuranceMissing.length > 0) {
    recommendations.push({
      priority: 'high',
      message: 'Insurance information is missing.',
      action: 'Add primary insurance information for billing purposes'
    });
  }

  return recommendations;
};

// Validate patient data before billing
const validatePatientForBilling = async (req, res) => {
  try {
    const { patientId } = req.params;

    const [patientRows] = await connection.query(`
      SELECT 
        up.*,
        (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = up.fk_userid AND is_active = 1) as active_insurance_count
      FROM user_profiles up
      WHERE up.fk_userid = ?
    `, [patientId]);

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const patient = patientRows[0];
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      billingReadiness: 0
    };

    // Required fields for billing
    const billingRequiredFields = [
      { field: 'firstname', message: 'First name is required' },
      { field: 'lastname', message: 'Last name is required' },
      { field: 'dob', message: 'Date of birth is required' },
      { field: 'gender', message: 'Gender is required' },
      { field: 'address_line', message: 'Address is required' },
      { field: 'city', message: 'City is required' },
      { field: 'state', message: 'State is required' },
      { field: 'zip', message: 'ZIP code is required' }
    ];

    billingRequiredFields.forEach(({ field, message }) => {
      if (!patient[field] || !patient[field].toString().trim()) {
        validationResults.errors.push(message);
        validationResults.isValid = false;
      }
    });

    // Insurance validation
    if (patient.active_insurance_count === 0) {
      validationResults.errors.push('At least one active insurance is required');
      validationResults.isValid = false;
    }

    // SSN validation (if required by organization)
    if (!patient.ssn_encrypted) {
      validationResults.warnings.push('SSN is not provided - may be required for some payers');
    }

    // Calculate billing readiness score
    const totalChecks = billingRequiredFields.length + 1; // +1 for insurance
    const passedChecks = totalChecks - validationResults.errors.length;
    validationResults.billingReadiness = Math.round((passedChecks / totalChecks) * 100);

    return res.status(200).json({
      success: true,
      message: 'Patient billing validation completed',
      validation: validationResults
    });

  } catch (error) {
    console.error('Error validating patient for billing:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating patient for billing'
    });
  }
};

module.exports = {
  getEnhancedPatientProfile,
  updateEnhancedPatientProfile,
  getProfileCompletenessAnalysis,
  validatePatientForBilling
};