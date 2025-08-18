const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

/**
 * MIPS Quality Measures Controller
 * Handles quality measure selection, performance tracking, and scoring
 */

// Get available quality measures for a provider's specialty
const getAvailableQualityMeasures = async (req, res) => {
  try {
    const { specialty, performanceYear, collectionType } = req.query;

    let query = `
      SELECT 
        qm.*,
        CASE 
          WHEN pm.measure_id IS NOT NULL THEN pm.selection_status
          ELSE 'available'
        END as current_status
      FROM mips_quality_measures qm
      LEFT JOIN mips_provider_measures pm ON qm.measure_id = pm.measure_id 
        AND pm.provider_id = ? AND pm.performance_year = ?
      WHERE qm.performance_year = ? 
      AND qm.is_active = TRUE
    `;

    const params = [req.headers.userid, performanceYear || new Date().getFullYear(), performanceYear || new Date().getFullYear()];

    // Filter by specialty if provided
    if (specialty) {
      query += ` AND (qm.specialty_set LIKE ? OR qm.specialty_set = 'all_specialties')`;
      params.push(`%${specialty}%`);
    }

    // Filter by collection type if provided
    if (collectionType) {
      query += ` AND qm.collection_type = ?`;
      params.push(collectionType);
    }

    query += ` ORDER BY qm.high_priority DESC, qm.outcome_measure DESC, qm.measure_id`;

    const [measures] = await db.query(query, params);

    // Categorize measures
    const categorizedMeasures = {
      recommended: [],
      outcome: [],
      highPriority: [],
      specialty: [],
      other: []
    };

    measures.forEach(measure => {
      const measureData = {
        measureId: measure.measure_id,
        title: measure.measure_title,
        type: measure.measure_type,
        collectionType: measure.collection_type,
        specialtySet: measure.specialty_set,
        isHighPriority: measure.high_priority,
        isOutcome: measure.outcome_measure,
        description: measure.measure_description,
        numeratorDescription: measure.numerator_description,
        denominatorDescription: measure.denominator_description,
        exclusionsDescription: measure.exclusions_description,
        minimumCases: measure.minimum_case_requirement,
        benchmarkData: measure.benchmark_data,
        cptCodes: measure.cpt_codes,
        icd10Codes: measure.icd10_codes,
        currentStatus: measure.current_status
      };

      // Categorize based on characteristics
      if (measure.high_priority && measure.outcome_measure) {
        categorizedMeasures.recommended.push(measureData);
      } else if (measure.outcome_measure) {
        categorizedMeasures.outcome.push(measureData);
      } else if (measure.high_priority) {
        categorizedMeasures.highPriority.push(measureData);
      } else if (specialty && measure.specialty_set.includes(specialty)) {
        categorizedMeasures.specialty.push(measureData);
      } else {
        categorizedMeasures.other.push(measureData);
      }
    });

    res.json({
      success: true,
      data: {
        totalMeasures: measures.length,
        categories: categorizedMeasures,
        recommendations: generateMeasureRecommendations(categorizedMeasures, specialty)
      }
    });

  } catch (error) {
    console.error('Error fetching quality measures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quality measures'
    });
  }
};

// Select quality measures for a provider
const selectQualityMeasures = async (req, res) => {
  try {
    const { providerId, performanceYear, selectedMeasures } = req.body;

    if (!providerId || !performanceYear || !Array.isArray(selectedMeasures)) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, performance year, and selected measures array are required'
      });
    }

    // Validate measure selection meets MIPS requirements
    const validation = await validateMeasureSelection(selectedMeasures, performanceYear);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Measure selection does not meet MIPS requirements',
        errors: validation.errors
      });
    }

    // Clear existing selections for the performance year
    await db.query(
      'DELETE FROM mips_provider_measures WHERE provider_id = ? AND performance_year = ?',
      [providerId, performanceYear]
    );

    // Insert new selections
    const insertPromises = selectedMeasures.map(async (measure) => {
      const insertQuery = `
        INSERT INTO mips_provider_measures (
          provider_id, performance_year, measure_id, selection_status,
          selection_reason, data_completeness_expected, performance_rate_target,
          submission_method
        ) VALUES (?, ?, ?, 'selected', ?, ?, ?, ?)
      `;

      return db.query(insertQuery, [
        providerId,
        performanceYear,
        measure.measureId,
        measure.selectionReason || 'Provider selected measure',
        measure.expectedCompleteness || 70,
        measure.targetRate || 50,
        measure.submissionMethod || 'ecqm'
      ]);
    });

    await Promise.all(insertPromises);

    // Log the selection
    await logAudit(
      providerId,
      'MIPS_MEASURES_SELECTED',
      'mips_provider_measures',
      null,
      `Selected ${selectedMeasures.length} quality measures for ${performanceYear}`
    );

    // Generate data collection plan
    const dataCollectionPlan = await generateDataCollectionPlan(providerId, performanceYear);

    res.json({
      success: true,
      message: 'Quality measures selected successfully',
      data: {
        selectedCount: selectedMeasures.length,
        validation: validation,
        dataCollectionPlan: dataCollectionPlan
      }
    });

  } catch (error) {
    console.error('Error selecting quality measures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select quality measures'
    });
  }
};

// Get quality performance data for a provider
const getQualityPerformance = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;

    const query = `
      SELECT 
        pm.measure_id,
        qm.measure_title,
        qm.measure_type,
        qm.collection_type,
        qm.high_priority,
        qm.outcome_measure,
        qm.minimum_case_requirement,
        qp.numerator_count,
        qp.denominator_count,
        qp.exclusion_count,
        qp.performance_rate,
        qp.performance_score,
        qp.benchmark_percentile,
        qp.data_completeness,
        qp.case_minimum_met,
        qp.submission_status,
        qp.validation_errors,
        qp.last_calculated_at,
        pm.performance_rate_target,
        pm.data_completeness_expected
      FROM mips_provider_measures pm
      JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
      LEFT JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
      WHERE pm.provider_id = ?
      ${performanceYear ? 'AND pm.performance_year = ?' : ''}
      AND pm.selection_status = 'selected'
      ORDER BY qm.high_priority DESC, qm.outcome_measure DESC, pm.measure_id
    `;

    const params = performanceYear ? [providerId, performanceYear] : [providerId];
    const [performance] = await db.query(query, params);

    // Calculate overall quality score
    const qualityScore = calculateQualityScore(performance);

    // Identify performance gaps
    const performanceGaps = identifyPerformanceGaps(performance);

    res.json({
      success: true,
      data: {
        measures: performance.map(measure => ({
          measureId: measure.measure_id,
          title: measure.measure_title,
          type: measure.measure_type,
          collectionType: measure.collection_type,
          isHighPriority: measure.high_priority,
          isOutcome: measure.outcome_measure,
          minimumCases: measure.minimum_case_requirement,
          performance: {
            numerator: measure.numerator_count || 0,
            denominator: measure.denominator_count || 0,
            exclusions: measure.exclusion_count || 0,
            rate: measure.performance_rate || 0,
            score: measure.performance_score || 0,
            benchmarkPercentile: measure.benchmark_percentile,
            dataCompleteness: measure.data_completeness || 0,
            caseMinimumMet: measure.case_minimum_met || false
          },
          targets: {
            performanceRate: measure.performance_rate_target,
            dataCompleteness: measure.data_completeness_expected
          },
          submission: {
            status: measure.submission_status || 'draft',
            validationErrors: measure.validation_errors,
            lastCalculated: measure.last_calculated_at
          }
        })),
        summary: {
          totalMeasures: performance.length,
          qualityScore: qualityScore,
          measuresWithMinimumCases: performance.filter(m => m.case_minimum_met).length,
          averagePerformanceRate: performance.length > 0 
            ? performance.reduce((sum, m) => sum + (m.performance_rate || 0), 0) / performance.length 
            : 0,
          averageDataCompleteness: performance.length > 0
            ? performance.reduce((sum, m) => sum + (m.data_completeness || 0), 0) / performance.length
            : 0
        },
        gaps: performanceGaps
      }
    });

  } catch (error) {
    console.error('Error fetching quality performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quality performance'
    });
  }
};

// Calculate quality performance for measures
const calculateQualityPerformance = async (req, res) => {
  try {
    const { providerId, performanceYear, measureId } = req.body;

    if (!providerId || !performanceYear) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID and performance year are required'
      });
    }

    // Get selected measures or specific measure
    let measureFilter = '';
    let params = [providerId, performanceYear];
    
    if (measureId) {
      measureFilter = 'AND pm.measure_id = ?';
      params.push(measureId);
    }

    const measuresQuery = `
      SELECT pm.*, qm.cpt_codes, qm.icd10_codes, qm.minimum_case_requirement
      FROM mips_provider_measures pm
      JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
      WHERE pm.provider_id = ? AND pm.performance_year = ? 
      AND pm.selection_status = 'selected' ${measureFilter}
    `;

    const [measures] = await db.query(measuresQuery, params);

    const calculationResults = [];

    for (const measure of measures) {
      try {
        // Calculate performance based on EHR data
        const performance = await calculateMeasurePerformance(
          providerId, 
          performanceYear, 
          measure
        );

        // Update or insert performance record
        const upsertQuery = `
          INSERT INTO mips_quality_performance (
            provider_measure_id, reporting_period_start, reporting_period_end,
            numerator_count, denominator_count, exclusion_count,
            performance_rate, performance_score, data_completeness,
            case_minimum_met, last_calculated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          ON DUPLICATE KEY UPDATE
            numerator_count = VALUES(numerator_count),
            denominator_count = VALUES(denominator_count),
            exclusion_count = VALUES(exclusion_count),
            performance_rate = VALUES(performance_rate),
            performance_score = VALUES(performance_score),
            data_completeness = VALUES(data_completeness),
            case_minimum_met = VALUES(case_minimum_met),
            last_calculated_at = NOW()
        `;

        await db.query(upsertQuery, [
          measure.id,
          `${performanceYear}-01-01`,
          `${performanceYear}-12-31`,
          performance.numerator,
          performance.denominator,
          performance.exclusions,
          performance.rate,
          performance.score,
          performance.dataCompleteness,
          performance.caseMinimumMet
        ]);

        calculationResults.push({
          measureId: measure.measure_id,
          performance: performance,
          status: 'calculated'
        });

      } catch (measureError) {
        console.error(`Error calculating measure ${measure.measure_id}:`, measureError);
        calculationResults.push({
          measureId: measure.measure_id,
          error: measureError.message,
          status: 'error'
        });
      }
    }

    // Log calculation
    await logAudit(
      providerId,
      'MIPS_PERFORMANCE_CALCULATED',
      'mips_quality_performance',
      null,
      `Calculated performance for ${measures.length} measures in ${performanceYear}`
    );

    res.json({
      success: true,
      message: 'Quality performance calculated successfully',
      data: {
        calculatedMeasures: calculationResults.length,
        results: calculationResults
      }
    });

  } catch (error) {
    console.error('Error calculating quality performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate quality performance'
    });
  }
};

// Helper function to validate measure selection
const validateMeasureSelection = async (selectedMeasures, performanceYear) => {
  const errors = [];
  let isValid = true;

  // Check minimum number of measures (6 required)
  if (selectedMeasures.length < 6) {
    errors.push('Minimum 6 quality measures required for MIPS reporting');
    isValid = false;
  }

  // Get measure details for validation
  const measureIds = selectedMeasures.map(m => m.measureId);
  const [measures] = await db.query(
    'SELECT * FROM mips_quality_measures WHERE measure_id IN (?) AND performance_year = ?',
    [measureIds, performanceYear]
  );

  // Check for at least one outcome measure (if available)
  const outcomeMeasures = measures.filter(m => m.outcome_measure);
  const selectedOutcome = selectedMeasures.some(sm => 
    outcomeMeasures.some(om => om.measure_id === sm.measureId)
  );

  if (outcomeMeasures.length > 0 && !selectedOutcome) {
    errors.push('At least one outcome measure should be selected when available');
    // This is a warning, not a hard requirement
  }

  // Check for high-priority measures
  const highPriorityMeasures = measures.filter(m => m.high_priority);
  const selectedHighPriority = selectedMeasures.filter(sm =>
    highPriorityMeasures.some(hm => hm.measure_id === sm.measureId)
  ).length;

  return {
    isValid,
    errors,
    warnings: [],
    recommendations: {
      outcomeMeasures: outcomeMeasures.length,
      selectedOutcome: selectedOutcome ? 1 : 0,
      highPriorityMeasures: highPriorityMeasures.length,
      selectedHighPriority: selectedHighPriority
    }
  };
};

// Helper function to calculate measure performance from EHR data
const calculateMeasurePerformance = async (providerId, performanceYear, measure) => {
  // This is a simplified calculation - in production, this would involve
  // complex queries based on the specific measure logic
  
  const cptCodes = measure.cpt_codes || [];
  const icd10Codes = measure.icd10_codes || [];

  // Sample calculation for demonstration
  const performanceQuery = `
    SELECT 
      COUNT(DISTINCT e.patient_id) as total_eligible,
      COUNT(DISTINCT CASE 
        WHEN e.status = 'completed' AND e.quality_measures_met LIKE '%${measure.measure_id}%' 
        THEN e.patient_id 
      END) as numerator_count
    FROM encounters e
    WHERE e.provider_id = ?
    AND YEAR(e.encounter_date) = ?
    AND e.status IN ('completed', 'billed')
  `;

  const [results] = await db.query(performanceQuery, [providerId, performanceYear]);
  const data = results[0] || { total_eligible: 0, numerator_count: 0 };

  const denominator = data.total_eligible;
  const numerator = data.numerator_count;
  const exclusions = 0; // Would be calculated based on measure-specific exclusion criteria
  
  const rate = denominator > 0 ? (numerator / denominator) * 100 : 0;
  const dataCompleteness = denominator > 0 ? 100 : 0; // Simplified
  const caseMinimumMet = denominator >= (measure.minimum_case_requirement || 20);
  
  // Score calculation based on benchmarks (simplified)
  let score = 0;
  if (caseMinimumMet && dataCompleteness >= 70) {
    if (rate >= 90) score = 10;
    else if (rate >= 80) score = 8;
    else if (rate >= 70) score = 6;
    else if (rate >= 60) score = 4;
    else if (rate >= 50) score = 2;
    else score = 1;
  }

  return {
    numerator,
    denominator,
    exclusions,
    rate: Math.round(rate * 100) / 100,
    score,
    dataCompleteness: Math.round(dataCompleteness * 100) / 100,
    caseMinimumMet
  };
};

// Helper function to generate measure recommendations
const generateMeasureRecommendations = (categorizedMeasures, specialty) => {
  const recommendations = [];

  // Recommend high-priority outcome measures first
  if (categorizedMeasures.recommended.length > 0) {
    recommendations.push({
      priority: 'high',
      type: 'measure_selection',
      message: `Consider selecting ${categorizedMeasures.recommended.length} high-priority outcome measures for maximum scoring potential`,
      measures: categorizedMeasures.recommended.slice(0, 3).map(m => m.measureId)
    });
  }

  // Recommend specialty-specific measures
  if (categorizedMeasures.specialty.length > 0) {
    recommendations.push({
      priority: 'medium',
      type: 'specialty_alignment',
      message: `${categorizedMeasures.specialty.length} measures are specifically designed for your specialty`,
      measures: categorizedMeasures.specialty.slice(0, 4).map(m => m.measureId)
    });
  }

  // Recommend eCQM measures for easier reporting
  const ecqmMeasures = Object.values(categorizedMeasures)
    .flat()
    .filter(m => m.collectionType === 'ecqm');
    
  if (ecqmMeasures.length >= 6) {
    recommendations.push({
      priority: 'medium',
      type: 'collection_method',
      message: 'eCQM measures available for automated data collection',
      measures: ecqmMeasures.slice(0, 6).map(m => m.measureId)
    });
  }

  return recommendations;
};

// Helper function to calculate overall quality score
const calculateQualityScore = (measures) => {
  if (measures.length === 0) return 0;

  const validMeasures = measures.filter(m => 
    m.case_minimum_met && m.data_completeness >= 70
  );

  if (validMeasures.length === 0) return 0;

  const totalScore = validMeasures.reduce((sum, m) => sum + (m.performance_score || 0), 0);
  return Math.round((totalScore / validMeasures.length) * 100) / 100;
};

// Helper function to identify performance gaps
const identifyPerformanceGaps = (measures) => {
  const gaps = [];

  measures.forEach(measure => {
    if (!measure.case_minimum_met) {
      gaps.push({
        measureId: measure.measure_id,
        type: 'insufficient_volume',
        severity: 'high',
        message: `Measure ${measure.measure_id} has insufficient case volume (${measure.denominator_count || 0}/${measure.minimum_case_requirement})`
      });
    }

    if ((measure.data_completeness || 0) < 70) {
      gaps.push({
        measureId: measure.measure_id,
        type: 'data_completeness',
        severity: 'medium',
        message: `Measure ${measure.measure_id} has low data completeness (${measure.data_completeness || 0}%)`
      });
    }

    if ((measure.performance_rate || 0) < (measure.performance_rate_target || 50)) {
      gaps.push({
        measureId: measure.measure_id,
        type: 'performance_target',
        severity: 'medium',
        message: `Measure ${measure.measure_id} below target performance rate`
      });
    }
  });

  return gaps;
};

// Helper function to generate data collection plan
const generateDataCollectionPlan = async (providerId, performanceYear) => {
  const [measures] = await db.query(`
    SELECT pm.measure_id, qm.measure_title, qm.collection_type, qm.cpt_codes, qm.icd10_codes
    FROM mips_provider_measures pm
    JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
    WHERE pm.provider_id = ? AND pm.performance_year = ? AND pm.selection_status = 'selected'
  `, [providerId, performanceYear]);

  return {
    totalMeasures: measures.length,
    collectionMethods: {
      ecqm: measures.filter(m => m.collection_type === 'ecqm').length,
      registry: measures.filter(m => m.collection_type === 'registry').length,
      claims: measures.filter(m => m.collection_type === 'claims').length
    },
    dataRequirements: measures.map(m => ({
      measureId: m.measure_id,
      title: m.measure_title,
      collectionType: m.collection_type,
      requiredCodes: {
        cpt: m.cpt_codes || [],
        icd10: m.icd10_codes || []
      }
    })),
    recommendations: [
      'Ensure all relevant CPT and ICD-10 codes are documented in encounters',
      'Configure EHR templates to capture required data elements',
      'Train staff on proper documentation for selected measures',
      'Set up monthly performance monitoring and review'
    ]
  };
};

module.exports = {
  getAvailableQualityMeasures,
  selectQualityMeasures,
  getQualityPerformance,
  calculateQualityPerformance
};