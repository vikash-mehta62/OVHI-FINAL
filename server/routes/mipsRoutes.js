const express = require('express');
const router = express.Router();
const mipsService = require('../services/mips/mipsService');
const { checkMIPSEligibility, getEligibilityStatus, getMIPSTimeline } = require('../services/mips/mipsEligibilityCtrl');
const { getAvailableQualityMeasures, selectQualityMeasures, getQualityPerformance, calculateQualityPerformance } = require('../services/mips/mipsQualityCtrl');
const db = require('../config/db');
const { logAudit } = require('../utils/logAudit');

/**
 * MIPS Routes - Complete MIPS compliance API endpoints
 */

// ============================================================================
// ELIGIBILITY ROUTES
// ============================================================================

// Check MIPS eligibility for a provider
router.post('/eligibility/check', checkMIPSEligibility);

// Get eligibility status
router.get('/eligibility/:providerId', getEligibilityStatus);

// Get MIPS timeline and deadlines
router.get('/timeline/:performanceYear', getMIPSTimeline);

// ============================================================================
// QUALITY MEASURES ROUTES
// ============================================================================

// Get available quality measures
router.get('/quality/measures', getAvailableQualityMeasures);

// Select quality measures for provider
router.post('/quality/measures/select', selectQualityMeasures);

// Get quality performance data
router.get('/quality/performance/:providerId', getQualityPerformance);

// Calculate quality performance
router.post('/quality/performance/calculate', calculateQualityPerformance);

// ============================================================================
// PROMOTING INTEROPERABILITY ROUTES
// ============================================================================

// Get PI measures
router.get('/pi/measures', async (req, res) => {
  try {
    const { performanceYear } = req.query;
    
    const [measures] = await db.query(`
      SELECT * FROM mips_pi_measures 
      WHERE performance_year = ? AND is_active = TRUE
      ORDER BY measure_category, required_measure DESC, measure_id
    `, [performanceYear || new Date().getFullYear()]);

    const categorizedMeasures = {
      base: measures.filter(m => m.measure_category === 'base'),
      performance: measures.filter(m => m.measure_category === 'performance'),
      bonus: measures.filter(m => m.measure_category === 'bonus')
    };

    res.json({
      success: true,
      data: {
        measures: categorizedMeasures,
        totalMeasures: measures.length,
        requiredMeasures: measures.filter(m => m.required_measure).length
      }
    });

  } catch (error) {
    console.error('Error fetching PI measures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PI measures'
    });
  }
});

// Get PI performance for provider
router.get('/pi/performance/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;

    const [performance] = await db.query(`
      SELECT pip.*, pim.measure_title, pim.measure_category, pim.required_measure,
             pim.max_points, pim.bonus_points, pim.threshold_percentage
      FROM mips_pi_performance pip
      JOIN mips_pi_measures pim ON pip.measure_id = pim.measure_id
      WHERE pip.provider_id = ? 
      ${performanceYear ? 'AND pip.performance_year = ?' : ''}
      ORDER BY pim.measure_category, pim.required_measure DESC
    `, performanceYear ? [providerId, performanceYear] : [providerId]);

    // Calculate total PI score
    const totalPoints = performance.reduce((sum, p) => sum + (p.points_earned || 0), 0);
    const maxPossiblePoints = performance.reduce((sum, p) => sum + (p.max_points || 0), 0);
    const piScore = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;

    res.json({
      success: true,
      data: {
        measures: performance,
        summary: {
          totalPoints,
          maxPossiblePoints,
          piScore: Math.round(piScore * 100) / 100,
          requiredMeasuresCompleted: performance.filter(p => p.required_measure && p.attestation_status === 'attested').length,
          totalRequiredMeasures: performance.filter(p => p.required_measure).length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching PI performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PI performance'
    });
  }
});

// Attest to PI measure
router.post('/pi/attest', async (req, res) => {
  try {
    const { providerId, performanceYear, measureId, numeratorValue, denominatorValue, evidenceDocumentation } = req.body;

    if (!providerId || !performanceYear || !measureId) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, performance year, and measure ID are required'
      });
    }

    // Get measure details
    const [measure] = await db.query(
      'SELECT * FROM mips_pi_measures WHERE measure_id = ? AND performance_year = ?',
      [measureId, performanceYear]
    );

    if (measure.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'PI measure not found'
      });
    }

    const measureData = measure[0];
    
    // Calculate performance rate and points
    const performanceRate = denominatorValue > 0 ? (numeratorValue / denominatorValue) * 100 : 0;
    let pointsEarned = 0;

    if (performanceRate >= (measureData.threshold_percentage || 0)) {
      pointsEarned = measureData.max_points || 0;
      
      // Add bonus points if applicable
      if (measureData.bonus_points && performanceRate >= 90) {
        pointsEarned += measureData.bonus_points;
      }
    }

    // Insert or update PI performance
    await db.query(`
      INSERT INTO mips_pi_performance (
        provider_id, performance_year, measure_id, numerator_value, denominator_value,
        performance_rate, points_earned, attestation_status, attestation_date, evidence_documentation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'attested', NOW(), ?)
      ON DUPLICATE KEY UPDATE
        numerator_value = VALUES(numerator_value),
        denominator_value = VALUES(denominator_value),
        performance_rate = VALUES(performance_rate),
        points_earned = VALUES(points_earned),
        attestation_status = 'attested',
        attestation_date = NOW(),
        evidence_documentation = VALUES(evidence_documentation),
        updated_at = CURRENT_TIMESTAMP
    `, [providerId, performanceYear, measureId, numeratorValue, denominatorValue, performanceRate, pointsEarned, evidenceDocumentation]);

    // Log attestation
    await logAudit(
      providerId,
      'MIPS_PI_ATTESTATION',
      'mips_pi_performance',
      null,
      `Attested to PI measure ${measureId} for ${performanceYear}`
    );

    res.json({
      success: true,
      message: 'PI measure attestation completed',
      data: {
        measureId,
        performanceRate: Math.round(performanceRate * 100) / 100,
        pointsEarned
      }
    });

  } catch (error) {
    console.error('Error attesting PI measure:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to attest PI measure'
    });
  }
});

// ============================================================================
// IMPROVEMENT ACTIVITIES ROUTES
// ============================================================================

// Get IA activities
router.get('/ia/activities', async (req, res) => {
  try {
    const { performanceYear, subcategory } = req.query;

    let query = `
      SELECT * FROM mips_improvement_activities 
      WHERE performance_year = ? AND is_active = TRUE
    `;
    const params = [performanceYear || new Date().getFullYear()];

    if (subcategory) {
      query += ' AND subcategory = ?';
      params.push(subcategory);
    }

    query += ' ORDER BY subcategory, weight DESC, activity_id';

    const [activities] = await db.query(query, params);

    // Group by subcategory
    const categorizedActivities = activities.reduce((acc, activity) => {
      if (!acc[activity.subcategory]) {
        acc[activity.subcategory] = [];
      }
      acc[activity.subcategory].push(activity);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        activities: categorizedActivities,
        totalActivities: activities.length,
        subcategories: Object.keys(categorizedActivities)
      }
    });

  } catch (error) {
    console.error('Error fetching IA activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IA activities'
    });
  }
});

// Get IA attestations for provider
router.get('/ia/attestations/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;

    const [attestations] = await db.query(`
      SELECT ia.*, ima.activity_title, ima.subcategory, ima.weight, ima.attestation_requirements
      FROM mips_ia_attestations ia
      JOIN mips_improvement_activities ima ON ia.activity_id = ima.activity_id
      WHERE ia.provider_id = ?
      ${performanceYear ? 'AND ia.performance_year = ?' : ''}
      ORDER BY ia.performance_year DESC, ima.subcategory, ia.activity_id
    `, performanceYear ? [providerId, performanceYear] : [providerId]);

    // Calculate total points
    const totalPoints = attestations
      .filter(a => a.attestation_status === 'completed')
      .reduce((sum, a) => sum + (a.points_earned || 0), 0);

    res.json({
      success: true,
      data: {
        attestations,
        summary: {
          totalPoints,
          requiredPoints: 40,
          completedActivities: attestations.filter(a => a.attestation_status === 'completed').length,
          inProgressActivities: attestations.filter(a => a.attestation_status === 'in_progress').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching IA attestations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch IA attestations'
    });
  }
});

// Attest to IA activity
router.post('/ia/attest', async (req, res) => {
  try {
    const { providerId, performanceYear, activityId, startDate, endDate, attestationStatement, supportingEvidence } = req.body;

    if (!providerId || !performanceYear || !activityId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID, performance year, activity ID, start date, and end date are required'
      });
    }

    // Get activity details
    const [activity] = await db.query(
      'SELECT * FROM mips_improvement_activities WHERE activity_id = ? AND performance_year = ?',
      [activityId, performanceYear]
    );

    if (activity.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'IA activity not found'
      });
    }

    const activityData = activity[0];
    
    // Calculate points based on weight and duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const continuous90Days = daysDiff >= 90;

    let pointsEarned = 0;
    if (continuous90Days) {
      pointsEarned = activityData.weight === 'high' ? 20 : 10;
    }

    // Insert or update IA attestation
    await db.query(`
      INSERT INTO mips_ia_attestations (
        provider_id, performance_year, activity_id, attestation_status, start_date, end_date,
        continuous_90_days, points_earned, attestation_statement, supporting_evidence, attestation_date
      ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        attestation_status = 'completed',
        start_date = VALUES(start_date),
        end_date = VALUES(end_date),
        continuous_90_days = VALUES(continuous_90_days),
        points_earned = VALUES(points_earned),
        attestation_statement = VALUES(attestation_statement),
        supporting_evidence = VALUES(supporting_evidence),
        attestation_date = NOW(),
        updated_at = CURRENT_TIMESTAMP
    `, [providerId, performanceYear, activityId, startDate, endDate, continuous90Days, pointsEarned, attestationStatement, supportingEvidence]);

    // Log attestation
    await logAudit(
      providerId,
      'MIPS_IA_ATTESTATION',
      'mips_ia_attestations',
      null,
      `Attested to IA activity ${activityId} for ${performanceYear}`
    );

    res.json({
      success: true,
      message: 'IA activity attestation completed',
      data: {
        activityId,
        pointsEarned,
        continuous90Days
      }
    });

  } catch (error) {
    console.error('Error attesting IA activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to attest IA activity'
    });
  }
});

// ============================================================================
// DASHBOARD AND SCORING ROUTES
// ============================================================================

// Get MIPS dashboard data
router.get('/dashboard/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;
    const year = performanceYear || new Date().getFullYear();

    const dashboardData = await mipsService.getDashboardData(providerId, year);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching MIPS dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch MIPS dashboard data'
    });
  }
});

// Calculate composite MIPS score
router.post('/score/calculate', async (req, res) => {
  try {
    const { providerId, performanceYear } = req.body;

    if (!providerId || !performanceYear) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID and performance year are required'
      });
    }

    const scoreData = await mipsService.calculateCompositeScore(providerId, performanceYear);

    // Log score calculation
    await logAudit(
      providerId,
      'MIPS_SCORE_CALCULATED',
      'mips_submissions',
      null,
      `MIPS composite score calculated: ${scoreData.compositeScore} for ${performanceYear}`
    );

    res.json({
      success: true,
      message: 'MIPS composite score calculated successfully',
      data: scoreData
    });

  } catch (error) {
    console.error('Error calculating MIPS score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate MIPS score'
    });
  }
});

// Identify data gaps
router.post('/gaps/identify', async (req, res) => {
  try {
    const { providerId, performanceYear } = req.body;

    if (!providerId || !performanceYear) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID and performance year are required'
      });
    }

    const gaps = await mipsService.identifyDataGaps(providerId, performanceYear);

    res.json({
      success: true,
      message: 'Data gaps identified successfully',
      data: {
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.impact === 'critical').length,
        gaps: gaps
      }
    });

  } catch (error) {
    console.error('Error identifying data gaps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to identify data gaps'
    });
  }
});

// Get data gaps for provider
router.get('/gaps/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear, status } = req.query;

    let query = `
      SELECT * FROM mips_data_gaps 
      WHERE provider_id = ?
    `;
    const params = [providerId];

    if (performanceYear) {
      query += ' AND performance_year = ?';
      params.push(performanceYear);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY impact_level DESC, due_date ASC';

    const [gaps] = await db.query(query, params);

    // Group gaps by category
    const categorizedGaps = gaps.reduce((acc, gap) => {
      if (!acc[gap.gap_category]) {
        acc[gap.gap_category] = [];
      }
      acc[gap.gap_category].push(gap);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        gaps: categorizedGaps,
        totalGaps: gaps.length,
        summary: {
          critical: gaps.filter(g => g.impact_level === 'critical').length,
          high: gaps.filter(g => g.impact_level === 'high').length,
          medium: gaps.filter(g => g.impact_level === 'medium').length,
          low: gaps.filter(g => g.impact_level === 'low').length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching data gaps:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data gaps'
    });
  }
});

// Update gap status
router.put('/gaps/:gapId', async (req, res) => {
  try {
    const { gapId } = req.params;
    const { status, resolutionNotes, assignedTo } = req.body;

    const updateFields = [];
    const params = [];

    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }

    if (resolutionNotes) {
      updateFields.push('resolution_notes = ?');
      params.push(resolutionNotes);
    }

    if (assignedTo) {
      updateFields.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (status === 'resolved') {
      updateFields.push('resolved_at = NOW()');
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(gapId);

    await db.query(
      `UPDATE mips_data_gaps SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: 'Data gap updated successfully'
    });

  } catch (error) {
    console.error('Error updating data gap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update data gap'
    });
  }
});

// ============================================================================
// SUBMISSION ROUTES
// ============================================================================

// Get submission status
router.get('/submission/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const { performanceYear } = req.query;

    const [submission] = await db.query(`
      SELECT * FROM mips_submissions 
      WHERE provider_id = ?
      ${performanceYear ? 'AND performance_year = ?' : ''}
      ORDER BY performance_year DESC
    `, performanceYear ? [providerId, performanceYear] : [providerId]);

    res.json({
      success: true,
      data: {
        submissions: submission
      }
    });

  } catch (error) {
    console.error('Error fetching submission status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission status'
    });
  }
});

// Submit MIPS data
router.post('/submission/submit', async (req, res) => {
  try {
    const { providerId, performanceYear, submissionMethod } = req.body;

    if (!providerId || !performanceYear) {
      return res.status(400).json({
        success: false,
        message: 'Provider ID and performance year are required'
      });
    }

    // Calculate final scores
    const scoreData = await mipsService.calculateCompositeScore(providerId, performanceYear);

    // Update submission status
    await db.query(`
      UPDATE mips_submissions 
      SET submission_status = 'submitted', 
          submission_date = NOW(),
          submission_method = ?,
          submitted_by = ?
      WHERE provider_id = ? AND performance_year = ?
    `, [submissionMethod || 'direct', req.headers.userid, providerId, performanceYear]);

    // Log submission
    await logAudit(
      providerId,
      'MIPS_SUBMISSION',
      'mips_submissions',
      null,
      `MIPS data submitted for ${performanceYear} - Score: ${scoreData.compositeScore}`
    );

    res.json({
      success: true,
      message: 'MIPS data submitted successfully',
      data: {
        compositeScore: scoreData.compositeScore,
        paymentAdjustment: scoreData.paymentAdjustment,
        submissionDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error submitting MIPS data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit MIPS data'
    });
  }
});

module.exports = router;