const db = require('../../config/db');

// Get diagnosis codes (ICD-10)
const getDiagnosisCodes = async (req, res) => {
  try {
    const { search, category, limit = 50, billableOnly = true } = req.query;

    let query = `
      SELECT code, description, category, is_billable
      FROM icd10_codes 
      WHERE is_active = 1
    `;
    const queryParams = [];

    if (billableOnly === 'true') {
      query += ' AND is_billable = 1';
    }

    if (search) {
      query += ' AND (code LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }

    query += ' ORDER BY code ASC LIMIT ?';
    queryParams.push(parseInt(limit));

    const codes = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        codes: codes.map(code => ({
          code: code.code,
          description: code.description,
          category: code.category,
          isBillable: code.is_billable
        })),
        total: codes.length
      }
    });

  } catch (error) {
    console.error('Error fetching diagnosis codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diagnosis codes'
    });
  }
};

// Get procedure codes (CPT)
const getProcedureCodes = async (req, res) => {
  try {
    const { search, category, limit = 50 } = req.query;

    let query = `
      SELECT code, description, category, relative_value_units
      FROM cpt_codes 
      WHERE is_active = 1
    `;
    const queryParams = [];

    if (search) {
      query += ' AND (code LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }

    query += ' ORDER BY code ASC LIMIT ?';
    queryParams.push(parseInt(limit));

    const codes = await db.query(query, queryParams);

    res.json({
      success: true,
      data: {
        codes: codes.map(code => ({
          code: code.code,
          description: code.description,
          category: code.category,
          relativeValueUnits: code.relative_value_units
        })),
        total: codes.length
      }
    });

  } catch (error) {
    console.error('Error fetching procedure codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch procedure codes'
    });
  }
};

// Get smart CPT suggestions based on diagnosis
const getCPTSuggestions = async (req, res) => {
  try {
    const { diagnosisCode, encounterType, specialty } = req.query;

    // This would typically use machine learning or rule-based logic
    // For now, we'll provide common suggestions based on diagnosis
    const suggestions = await getCommonCPTForDiagnosis(diagnosisCode, encounterType, specialty);

    res.json({
      success: true,
      data: {
        suggestions,
        diagnosisCode,
        encounterType,
        specialty
      }
    });

  } catch (error) {
    console.error('Error getting CPT suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CPT suggestions'
    });
  }
};

// Validate medical codes
const validateMedicalCodes = async (req, res) => {
  try {
    const { cptCodes = [], icdCodes = [] } = req.body;
    const results = {
      validCPT: [],
      invalidCPT: [],
      validICD: [],
      invalidICD: []
    };

    // Validate CPT codes
    for (const code of cptCodes) {
      const cptResult = await db.query(
        'SELECT code, description FROM cpt_codes WHERE code = ? AND is_active = 1',
        [code]
      );
      
      if (cptResult.length > 0) {
        results.validCPT.push({
          code: code,
          description: cptResult[0].description,
          valid: true
        });
      } else {
        results.invalidCPT.push({
          code: code,
          valid: false,
          error: 'Code not found or inactive'
        });
      }
    }

    // Validate ICD codes
    for (const code of icdCodes) {
      const icdResult = await db.query(
        'SELECT code, description, is_billable FROM icd10_codes WHERE code = ? AND is_active = 1',
        [code]
      );
      
      if (icdResult.length > 0) {
        results.validICD.push({
          code: code,
          description: icdResult[0].description,
          isBillable: icdResult[0].is_billable,
          valid: true
        });
      } else {
        results.invalidICD.push({
          code: code,
          valid: false,
          error: 'Code not found or inactive'
        });
      }
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error validating medical codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate medical codes'
    });
  }
};

// Helper function to get common CPT codes for diagnosis
const getCommonCPTForDiagnosis = async (diagnosisCode, encounterType, specialty) => {
  // This is a simplified suggestion engine
  // In a real system, this would use historical data and machine learning
  
  const commonSuggestions = {
    'I10': [ // Hypertension
      { code: '99213', description: 'Office visit, established patient', probability: 0.85 },
      { code: '36415', description: 'Venipuncture', probability: 0.60 },
      { code: '80053', description: 'Comprehensive metabolic panel', probability: 0.70 }
    ],
    'E11.9': [ // Type 2 Diabetes
      { code: '99214', description: 'Office visit, established patient', probability: 0.80 },
      { code: '85025', description: 'Complete blood count', probability: 0.65 },
      { code: '83036', description: 'Hemoglobin A1C', probability: 0.90 }
    ],
    'Z00.00': [ // Annual physical
      { code: '99395', description: 'Periodic comprehensive preventive medicine', probability: 0.95 },
      { code: '85025', description: 'Complete blood count', probability: 0.70 },
      { code: '80053', description: 'Comprehensive metabolic panel', probability: 0.75 }
    ]
  };

  // Get base suggestions for diagnosis
  let suggestions = commonSuggestions[diagnosisCode] || [];

  // Modify suggestions based on encounter type
  if (encounterType === 'new_patient') {
    suggestions = suggestions.map(s => ({
      ...s,
      code: s.code.replace('99213', '99202').replace('99214', '99203')
    }));
  }

  // Add specialty-specific suggestions
  if (specialty === 'cardiology' && diagnosisCode === 'I10') {
    suggestions.push({
      code: '93000',
      description: 'Electrocardiogram, routine ECG',
      probability: 0.75
    });
  }

  return suggestions.sort((a, b) => b.probability - a.probability);
};

module.exports = {
  getDiagnosisCodes,
  getProcedureCodes,
  getCPTSuggestions,
  validateMedicalCodes
};