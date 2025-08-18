const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

/**
 * MIPS Eligibility Controller
 * Handles provider eligibility determination and tracking
 */

// Determine MIPS eligibility for a provider
const checkMIPSEligibility = async (req, res) => {
  try {
    const { providerId, performanceYear, tin, npi, specialty } = req.body;

    if (!providerId || !performanceYear || !tin || !npi) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, performance year, TIN, and NPI are required'
      });
    }

    // Get provider's Medicare volume and patient data
    const eligibilityData = await calculateEligibilityMetrics(providerId, performanceYear);
    
    // Determine eligibility status
    const eligibilityResult = determineEligibilityStatus(eligibilityData, specialty);

    // Store or update eligibility record
    const upsertQuery = `
      INSERT INTO mips_eligibility (
        provider_id, tin, npi, performance_year, specialty_code, specialty_name,
        eligibility_status, eligibility_reason, medicare_volume_threshold,
        patient_volume_threshold, allowed_charges_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        eligibility_status = VALUES(eligibility_status),
        eligibility_reason = VALUES(eligibility_reason),
        medicare_volume_threshold = VALUES(medicare_volume_threshold),
        patient_volume_threshold = VALUES(patient_volume_threshold),
        allowed_charges_threshold = VALUES(allowed_charges_threshold),
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.query(upsertQuery, [
      providerId,
      tin,
      npi,
      performanceYear,
      eligibilityResult.specialtyCode,
      eligibilityResult.specialtyName,
      eligibilityResult.status,
      eligibilityResult.reason,
      eligibilityData.medicareVolumePercent,
      eligibilityData.patientVolume,
      eligibilityData.allowedCharges
    ]);

    // Log eligibility determination
    await logAudit(
      providerId,
      'MIPS_ELIGIBILITY_CHECK',
      'mips_eligibility',
      null,
      `MIPS eligibility determined: ${eligibilityResult.status} for year ${performanceYear}`
    );

    res.json({
      success: true,
      data: {
        eligibilityStatus: eligibilityResult.status,
        eligibilityReason: eligibilityResult.reason,
        performanceYear,
        thresholds: {
          medicareVolume: eligibilityData.medicareVolumePercent,
          patientVolume: eligibilityData.patientVolume,
          allowedCharges: eligibilityData.allowedCharges
        },
        requirements: eligibilityResult.requirements,
        nextSteps: eligibilityResult.nextSteps
      }
    });

  } catch (error) {
    console.error('Error checking MIPS eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check MIPS eligibility'
    });
  }
};

// Get eligibility status for a provider
const getEligibilityStatus = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;

    const query = `
      SELECT 
        e.*,
        COUNT(pm.id) as selected_measures,
        s.submission_status,
        s.composite_score
      FROM mips_eligibility e
      LEFT JOIN mips_provider_measures pm ON e.provider_id = pm.provider_id 
        AND e.performance_year = pm.performance_year
        AND pm.selection_status = 'selected'
      LEFT JOIN mips_submissions s ON e.provider_id = s.provider_id 
        AND e.performance_year = s.performance_year
      WHERE e.provider_id = ? 
      ${performanceYear ? 'AND e.performance_year = ?' : ''}
      GROUP BY e.id
      ORDER BY e.performance_year DESC
    `;

    const params = performanceYear ? [providerId, performanceYear] : [providerId];
    const [eligibilityRecords] = await db.query(query, params);

    res.json({
      success: true,
      data: {
        eligibilityRecords: eligibilityRecords.map(record => ({
          performanceYear: record.performance_year,
          eligibilityStatus: record.eligibility_status,
          eligibilityReason: record.eligibility_reason,
          tin: record.tin,
          npi: record.npi,
          specialty: record.specialty_name,
          selectedMeasures: record.selected_measures,
          submissionStatus: record.submission_status,
          compositeScore: record.composite_score,
          thresholds: {
            medicareVolume: record.medicare_volume_threshold,
            patientVolume: record.patient_volume_threshold,
            allowedCharges: record.allowed_charges_threshold
          }
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching eligibility status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligibility status'
    });
  }
};

// Calculate eligibility metrics from EHR data
const calculateEligibilityMetrics = async (providerId, performanceYear) => {
  try {
    // Get Medicare patient encounters for the performance year
    const medicareQuery = `
      SELECT 
        COUNT(DISTINCT e.patient_id) as medicare_patients,
        COUNT(DISTINCT CASE WHEN pi.insurance_type = 'medicare' THEN e.patient_id END) as total_medicare,
        COUNT(DISTINCT e.patient_id) as total_patients,
        SUM(CASE WHEN pi.insurance_type = 'medicare' THEN e.total_charges ELSE 0 END) as medicare_charges,
        SUM(e.total_charges) as total_charges
      FROM encounters e
      LEFT JOIN patient_insurances pi ON e.patient_id = pi.fk_userid
      WHERE e.provider_id = ?
      AND YEAR(e.encounter_date) = ?
      AND e.status = 'completed'
    `;

    const [metrics] = await db.query(medicareQuery, [providerId, performanceYear]);
    const data = metrics[0] || {};

    // Calculate percentages and thresholds
    const medicareVolumePercent = data.total_patients > 0 
      ? (data.medicare_patients / data.total_patients) * 100 
      : 0;

    const allowedCharges = data.medicare_charges || 0;
    const patientVolume = data.medicare_patients || 0;

    return {
      medicareVolumePercent: Math.round(medicareVolumePercent * 100) / 100,
      patientVolume,
      allowedCharges,
      totalPatients: data.total_patients || 0,
      totalCharges: data.total_charges || 0
    };

  } catch (error) {
    console.error('Error calculating eligibility metrics:', error);
    return {
      medicareVolumePercent: 0,
      patientVolume: 0,
      allowedCharges: 0,
      totalPatients: 0,
      totalCharges: 0
    };
  }
};

// Determine eligibility status based on CMS criteria
const determineEligibilityStatus = (metrics, specialty) => {
  const currentYear = new Date().getFullYear();
  
  // 2024 MIPS eligibility thresholds
  const thresholds = {
    medicareVolumePercent: 75.0,
    patientVolume: 200,
    allowedCharges: 90000
  };

  let status = 'not_eligible';
  let reason = '';
  let requirements = [];
  let nextSteps = [];

  // Check volume thresholds
  const meetsVolumeThreshold = metrics.medicareVolumePercent >= thresholds.medicareVolumePercent;
  const meetsPatientThreshold = metrics.patientVolume >= thresholds.patientVolume;
  const meetsChargesThreshold = metrics.allowedCharges >= thresholds.allowedCharges;

  if (meetsVolumeThreshold && (meetsPatientThreshold || meetsChargesThreshold)) {
    status = 'eligible';
    reason = 'Provider meets MIPS volume and patient/charges thresholds';
    requirements = [
      'Report on at least 6 quality measures (including 1 outcome measure if available)',
      'Attest to required Promoting Interoperability measures',
      'Complete Improvement Activities (40 points minimum)',
      'Cost category is automatically calculated by CMS'
    ];
    nextSteps = [
      'Select appropriate quality measures for your specialty',
      'Ensure EHR is certified for PI reporting',
      'Plan Improvement Activities for 90-day periods',
      'Monitor data collection throughout performance year'
    ];
  } else {
    // Determine specific reasons for ineligibility
    const failedCriteria = [];
    if (!meetsVolumeThreshold) {
      failedCriteria.push(`Medicare volume ${metrics.medicareVolumePercent}% < ${thresholds.medicareVolumePercent}%`);
    }
    if (!meetsPatientThreshold) {
      failedCriteria.push(`Patient volume ${metrics.patientVolume} < ${thresholds.patientVolume}`);
    }
    if (!meetsChargesThreshold) {
      failedCriteria.push(`Allowed charges $${metrics.allowedCharges} < $${thresholds.allowedCharges}`);
    }

    reason = `Provider does not meet MIPS thresholds: ${failedCriteria.join(', ')}`;
    
    // Check for low-volume threshold (may be exempt)
    if (metrics.patientVolume <= 200 && metrics.allowedCharges <= 90000) {
      status = 'exempt';
      reason = 'Provider qualifies for low-volume threshold exemption';
      nextSteps = [
        'No MIPS reporting required due to low volume',
        'Consider voluntary participation for bonus points',
        'Monitor volume growth for future years'
      ];
    } else {
      nextSteps = [
        'Increase Medicare patient volume to meet thresholds',
        'Consider group reporting if individual reporting not feasible',
        'Monitor quarterly metrics to track progress'
      ];
    }
  }

  // Specialty-specific considerations
  const specialtyInfo = getSpecialtyInfo(specialty);

  return {
    status,
    reason,
    requirements,
    nextSteps,
    specialtyCode: specialtyInfo.code,
    specialtyName: specialtyInfo.name,
    thresholds
  };
};

// Get specialty information and codes
const getSpecialtyInfo = (specialty) => {
  const specialtyMap = {
    'family_medicine': { code: '08', name: 'Family Medicine' },
    'internal_medicine': { code: '11', name: 'Internal Medicine' },
    'cardiology': { code: '06', name: 'Cardiology' },
    'dermatology': { code: '07', name: 'Dermatology' },
    'emergency_medicine': { code: '93', name: 'Emergency Medicine' },
    'orthopedic_surgery': { code: '20', name: 'Orthopedic Surgery' },
    'pediatrics': { code: '37', name: 'Pediatrics' },
    'psychiatry': { code: '26', name: 'Psychiatry' },
    'radiology': { code: '30', name: 'Radiology' },
    'anesthesiology': { code: '05', name: 'Anesthesiology' }
  };

  return specialtyMap[specialty] || { code: '99', name: specialty || 'General Practice' };
};

// Get MIPS timeline and deadlines
const getMIPSTimeline = async (req, res) => {
  try {
    const { performanceYear } = req.params;
    
    const timeline = generateMIPSTimeline(performanceYear);

    res.json({
      success: true,
      data: {
        performanceYear: parseInt(performanceYear),
        timeline,
        currentPhase: getCurrentPhase(timeline),
        upcomingDeadlines: getUpcomingDeadlines(timeline)
      }
    });

  } catch (error) {
    console.error('Error fetching MIPS timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MIPS timeline'
    });
  }
};

// Generate MIPS timeline for a performance year
const generateMIPSTimeline = (performanceYear) => {
  const year = parseInt(performanceYear);
  const submissionYear = year + 1;

  return {
    performancePeriod: {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      description: 'Data collection and performance measurement period'
    },
    dataCollection: {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      description: 'Continuous data collection for quality measures and PI'
    },
    improvementActivities: {
      minimumPeriod: '90 consecutive days',
      deadline: `${year}-12-31`,
      description: 'Complete IA activities for minimum 90-day periods'
    },
    submissionPeriod: {
      start: `${submissionYear}-01-02`,
      end: `${submissionYear}-03-31`,
      description: 'MIPS data submission window'
    },
    keyMilestones: [
      {
        date: `${year}-03-31`,
        milestone: 'Q1 Data Review',
        description: 'Review first quarter performance and adjust strategies'
      },
      {
        date: `${year}-06-30`,
        milestone: 'Mid-Year Assessment',
        description: 'Evaluate progress and identify data gaps'
      },
      {
        date: `${year}-09-30`,
        milestone: 'Q3 Performance Check',
        description: 'Final quarter to address any performance issues'
      },
      {
        date: `${year}-12-31`,
        milestone: 'Performance Period Ends',
        description: 'Final data collection deadline'
      },
      {
        date: `${submissionYear}-03-31`,
        milestone: 'Submission Deadline',
        description: 'Final deadline for MIPS data submission'
      }
    ]
  };
};

// Determine current phase in MIPS timeline
const getCurrentPhase = (timeline) => {
  const today = new Date();
  const currentDate = today.toISOString().split('T')[0];

  if (currentDate <= timeline.performancePeriod.end) {
    return {
      phase: 'performance_period',
      description: 'Data Collection Phase',
      daysRemaining: Math.ceil((new Date(timeline.performancePeriod.end) - today) / (1000 * 60 * 60 * 24))
    };
  } else if (currentDate <= timeline.submissionPeriod.end) {
    return {
      phase: 'submission_period',
      description: 'Data Submission Phase',
      daysRemaining: Math.ceil((new Date(timeline.submissionPeriod.end) - today) / (1000 * 60 * 60 * 24))
    };
  } else {
    return {
      phase: 'completed',
      description: 'Performance Year Completed',
      daysRemaining: 0
    };
  }
};

// Get upcoming deadlines
const getUpcomingDeadlines = (timeline) => {
  const today = new Date();
  const upcomingDeadlines = [];

  timeline.keyMilestones.forEach(milestone => {
    const milestoneDate = new Date(milestone.date);
    const daysUntil = Math.ceil((milestoneDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntil >= 0 && daysUntil <= 90) {
      upcomingDeadlines.push({
        ...milestone,
        daysUntil,
        urgency: daysUntil <= 30 ? 'high' : daysUntil <= 60 ? 'medium' : 'low'
      });
    }
  });

  return upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);
};

module.exports = {
  checkMIPSEligibility,
  getEligibilityStatus,
  getMIPSTimeline
};