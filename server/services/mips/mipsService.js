const db = require('../../config/db');
const { logAudit } = require('../../utils/logAudit');

/**
 * MIPS Service - Core business logic for MIPS compliance
 * Handles eligibility, measure selection, performance calculation, and submission
 */

class MIPSService {
  
  // Calculate MIPS composite score
  async calculateCompositeScore(providerId, performanceYear) {
    try {
      // Get category weights from configuration
      const [config] = await db.query(
        'SELECT config_value FROM mips_configuration WHERE performance_year = ? AND config_key LIKE "%_weight"',
        [performanceYear]
      );

      const weights = {
        quality: 0.45,
        pi: 0.25,
        ia: 0.15,
        cost: 0.15
      };

      // Update weights from configuration if available
      config.forEach(c => {
        if (c.config_key === 'quality_category_weight') weights.quality = parseFloat(c.config_value);
        if (c.config_key === 'pi_category_weight') weights.pi = parseFloat(c.config_value);
        if (c.config_key === 'ia_category_weight') weights.ia = parseFloat(c.config_value);
        if (c.config_key === 'cost_category_weight') weights.cost = parseFloat(c.config_value);
      });

      // Calculate category scores
      const qualityScore = await this.calculateQualityScore(providerId, performanceYear);
      const piScore = await this.calculatePIScore(providerId, performanceYear);
      const iaScore = await this.calculateIAScore(providerId, performanceYear);
      const costScore = await this.calculateCostScore(providerId, performanceYear);

      // Calculate weighted composite score
      const compositeScore = (
        (qualityScore * weights.quality) +
        (piScore * weights.pi) +
        (iaScore * weights.ia) +
        (costScore * weights.cost)
      );

      // Determine payment adjustment
      const paymentAdjustment = this.calculatePaymentAdjustment(compositeScore, performanceYear);

      // Update submission record
      await db.query(`
        INSERT INTO mips_submissions (
          provider_id, performance_year, quality_score, pi_score, ia_score, cost_score,
          quality_weight, pi_weight, ia_weight, cost_weight, composite_score, payment_adjustment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          quality_score = VALUES(quality_score),
          pi_score = VALUES(pi_score),
          ia_score = VALUES(ia_score),
          cost_score = VALUES(cost_score),
          composite_score = VALUES(composite_score),
          payment_adjustment = VALUES(payment_adjustment),
          updated_at = CURRENT_TIMESTAMP
      `, [
        providerId, performanceYear, qualityScore, piScore, iaScore, costScore,
        weights.quality, weights.pi, weights.ia, weights.cost, compositeScore, paymentAdjustment
      ]);

      return {
        categoryScores: {
          quality: qualityScore,
          pi: piScore,
          ia: iaScore,
          cost: costScore
        },
        weights,
        compositeScore: Math.round(compositeScore * 100) / 100,
        paymentAdjustment: Math.round(paymentAdjustment * 100) / 100
      };

    } catch (error) {
      console.error('Error calculating composite score:', error);
      throw error;
    }
  }

  // Calculate Quality category score
  async calculateQualityScore(providerId, performanceYear) {
    try {
      const [measures] = await db.query(`
        SELECT qp.performance_score, qp.case_minimum_met, qp.data_completeness,
               qm.outcome_measure, qm.high_priority
        FROM mips_provider_measures pm
        JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
        JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
        WHERE pm.provider_id = ? AND pm.performance_year = ? 
        AND pm.selection_status = 'selected'
        AND qp.case_minimum_met = TRUE AND qp.data_completeness >= 70
      `, [providerId, performanceYear]);

      if (measures.length === 0) return 0;

      // Calculate average score with bonuses for outcome and high-priority measures
      let totalScore = 0;
      let bonusPoints = 0;

      measures.forEach(measure => {
        totalScore += measure.performance_score || 0;
        
        // Bonus points for outcome measures
        if (measure.outcome_measure && measure.performance_score >= 7) {
          bonusPoints += 2;
        }
        
        // Bonus points for high-priority measures
        if (measure.high_priority && measure.performance_score >= 7) {
          bonusPoints += 1;
        }
      });

      const averageScore = totalScore / measures.length;
      const finalScore = Math.min(100, averageScore + bonusPoints);

      return Math.round(finalScore * 100) / 100;

    } catch (error) {
      console.error('Error calculating quality score:', error);
      return 0;
    }
  }

  // Calculate Promoting Interoperability score
  async calculatePIScore(providerId, performanceYear) {
    try {
      const [piMeasures] = await db.query(`
        SELECT pip.points_earned, pim.max_points, pim.bonus_points, pim.required_measure
        FROM mips_pi_performance pip
        JOIN mips_pi_measures pim ON pip.measure_id = pim.measure_id
        WHERE pip.provider_id = ? AND pip.performance_year = ?
        AND pip.attestation_status = 'attested'
      `, [providerId, performanceYear]);

      let totalPoints = 0;
      let maxPossiblePoints = 0;
      let requiredMeasuresMet = true;

      piMeasures.forEach(measure => {
        totalPoints += measure.points_earned || 0;
        maxPossiblePoints += measure.max_points || 0;
        
        if (measure.required_measure && (measure.points_earned || 0) === 0) {
          requiredMeasuresMet = false;
        }
      });

      // If required measures not met, score is 0
      if (!requiredMeasuresMet) return 0;

      // Calculate percentage score
      const score = maxPossiblePoints > 0 ? (totalPoints / maxPossiblePoints) * 100 : 0;
      return Math.min(100, Math.round(score * 100) / 100);

    } catch (error) {
      console.error('Error calculating PI score:', error);
      return 0;
    }
  }

  // Calculate Improvement Activities score
  async calculateIAScore(providerId, performanceYear) {
    try {
      const [iaActivities] = await db.query(`
        SELECT ia.points_earned, ima.weight
        FROM mips_ia_attestations ia
        JOIN mips_improvement_activities ima ON ia.activity_id = ima.activity_id
        WHERE ia.provider_id = ? AND ia.performance_year = ?
        AND ia.attestation_status = 'completed'
      `, [providerId, performanceYear]);

      let totalPoints = 0;
      iaActivities.forEach(activity => {
        totalPoints += activity.points_earned || 0;
      });

      // Maximum IA score is 40 points (100%)
      const score = Math.min(100, (totalPoints / 40) * 100);
      return Math.round(score * 100) / 100;

    } catch (error) {
      console.error('Error calculating IA score:', error);
      return 0;
    }
  }

  // Calculate Cost category score (usually from CMS claims data)
  async calculateCostScore(providerId, performanceYear) {
    try {
      const [costMeasures] = await db.query(`
        SELECT AVG(performance_score) as avg_cost_score
        FROM mips_cost_performance
        WHERE provider_id = ? AND performance_year = ?
      `, [providerId, performanceYear]);

      return costMeasures[0]?.avg_cost_score || 0;

    } catch (error) {
      console.error('Error calculating cost score:', error);
      return 0;
    }
  }

  // Calculate payment adjustment based on composite score
  calculatePaymentAdjustment(compositeScore, performanceYear) {
    // 2024 MIPS payment adjustment scale
    const adjustmentScale = {
      2024: {
        threshold: 75, // Performance threshold
        maxPositive: 9.0, // Maximum positive adjustment
        maxNegative: -9.0 // Maximum negative adjustment
      }
    };

    const scale = adjustmentScale[performanceYear] || adjustmentScale[2024];
    
    if (compositeScore >= scale.threshold) {
      // Positive adjustment for scores above threshold
      const adjustmentPercent = ((compositeScore - scale.threshold) / (100 - scale.threshold)) * scale.maxPositive;
      return Math.min(scale.maxPositive, adjustmentPercent);
    } else {
      // Negative adjustment for scores below threshold
      const adjustmentPercent = ((scale.threshold - compositeScore) / scale.threshold) * Math.abs(scale.maxNegative);
      return Math.max(scale.maxNegative, -adjustmentPercent);
    }
  }

  // Identify and create data gaps
  async identifyDataGaps(providerId, performanceYear) {
    try {
      // Clear existing gaps
      await db.query(
        'DELETE FROM mips_data_gaps WHERE provider_id = ? AND performance_year = ?',
        [providerId, performanceYear]
      );

      const gaps = [];

      // Check quality measure gaps
      const qualityGaps = await this.identifyQualityGaps(providerId, performanceYear);
      gaps.push(...qualityGaps);

      // Check PI gaps
      const piGaps = await this.identifyPIGaps(providerId, performanceYear);
      gaps.push(...piGaps);

      // Check IA gaps
      const iaGaps = await this.identifyIAGaps(providerId, performanceYear);
      gaps.push(...iaGaps);

      // Insert gaps into database
      for (const gap of gaps) {
        await db.query(`
          INSERT INTO mips_data_gaps (
            provider_id, performance_year, gap_category, gap_type, measure_id,
            gap_description, impact_level, remediation_task, due_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          providerId, performanceYear, gap.category, gap.type, gap.measureId,
          gap.description, gap.impact, gap.remediation, gap.dueDate
        ]);
      }

      return gaps;

    } catch (error) {
      console.error('Error identifying data gaps:', error);
      throw error;
    }
  }

  // Identify quality measure data gaps
  async identifyQualityGaps(providerId, performanceYear) {
    const gaps = [];

    const [measures] = await db.query(`
      SELECT pm.measure_id, qm.measure_title, qp.denominator_count, qp.data_completeness,
             qm.minimum_case_requirement, pm.data_completeness_expected
      FROM mips_provider_measures pm
      JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
      LEFT JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
      WHERE pm.provider_id = ? AND pm.performance_year = ? AND pm.selection_status = 'selected'
    `, [providerId, performanceYear]);

    measures.forEach(measure => {
      const denominator = measure.denominator_count || 0;
      const completeness = measure.data_completeness || 0;
      const minCases = measure.minimum_case_requirement || 20;
      const expectedCompleteness = measure.data_completeness_expected || 70;

      // Insufficient case volume
      if (denominator < minCases) {
        gaps.push({
          category: 'quality_data',
          type: 'insufficient_volume',
          measureId: measure.measure_id,
          description: `${measure.measure_title} has ${denominator}/${minCases} required cases`,
          impact: 'high',
          remediation: `Increase patient encounters or consider alternative measures`,
          dueDate: `${performanceYear}-10-31`
        });
      }

      // Low data completeness
      if (completeness < expectedCompleteness) {
        gaps.push({
          category: 'quality_data',
          type: 'incomplete_data',
          measureId: measure.measure_id,
          description: `${measure.measure_title} has ${completeness}% data completeness (target: ${expectedCompleteness}%)`,
          impact: 'medium',
          remediation: `Improve documentation and data capture processes`,
          dueDate: `${performanceYear}-11-30`
        });
      }
    });

    return gaps;
  }

  // Identify PI gaps
  async identifyPIGaps(providerId, performanceYear) {
    const gaps = [];

    const [piMeasures] = await db.query(`
      SELECT pim.measure_id, pim.measure_title, pim.required_measure,
             pip.attestation_status, pip.performance_rate, pim.threshold_percentage
      FROM mips_pi_measures pim
      LEFT JOIN mips_pi_performance pip ON pim.measure_id = pip.measure_id 
        AND pip.provider_id = ? AND pip.performance_year = ?
      WHERE pim.performance_year = ? AND pim.is_active = TRUE
    `, [providerId, performanceYear, performanceYear]);

    piMeasures.forEach(measure => {
      const attestationStatus = measure.attestation_status || 'not_started';
      const performanceRate = measure.performance_rate || 0;
      const threshold = measure.threshold_percentage || 0;

      // Missing attestation
      if (attestationStatus === 'not_started' || attestationStatus === 'in_progress') {
        gaps.push({
          category: 'pi_evidence',
          type: 'missing_data',
          measureId: measure.measure_id,
          description: `${measure.measure_title} requires attestation`,
          impact: measure.required_measure ? 'critical' : 'medium',
          remediation: `Complete attestation with supporting documentation`,
          dueDate: `${performanceYear}-12-31`
        });
      }

      // Below threshold performance
      if (attestationStatus === 'attested' && performanceRate < threshold) {
        gaps.push({
          category: 'pi_evidence',
          type: 'insufficient_performance',
          measureId: measure.measure_id,
          description: `${measure.measure_title} performance ${performanceRate}% below threshold ${threshold}%`,
          impact: 'medium',
          remediation: `Improve EHR workflows to meet performance threshold`,
          dueDate: `${performanceYear}-11-30`
        });
      }
    });

    return gaps;
  }

  // Identify IA gaps
  async identifyIAGaps(providerId, performanceYear) {
    const gaps = [];

    const [iaStatus] = await db.query(`
      SELECT SUM(ia.points_earned) as total_points
      FROM mips_ia_attestations ia
      WHERE ia.provider_id = ? AND ia.performance_year = ?
      AND ia.attestation_status = 'completed'
    `, [providerId, performanceYear]);

    const totalPoints = iaStatus[0]?.total_points || 0;
    const requiredPoints = 40;

    if (totalPoints < requiredPoints) {
      gaps.push({
        category: 'ia_documentation',
        type: 'insufficient_points',
        measureId: null,
        description: `Need ${requiredPoints - totalPoints} more IA points (current: ${totalPoints}/${requiredPoints})`,
        impact: 'high',
        remediation: `Complete additional improvement activities`,
        dueDate: `${performanceYear}-12-31`
      });
    }

    return gaps;
  }

  // Generate MIPS dashboard data
  async getDashboardData(providerId, performanceYear) {
    try {
      // Get eligibility status
      const [eligibility] = await db.query(
        'SELECT * FROM mips_eligibility WHERE provider_id = ? AND performance_year = ?',
        [providerId, performanceYear]
      );

      // Get submission status
      const [submission] = await db.query(
        'SELECT * FROM mips_submissions WHERE provider_id = ? AND performance_year = ?',
        [providerId, performanceYear]
      );

      // Get data gaps
      const [gaps] = await db.query(`
        SELECT gap_category, COUNT(*) as gap_count, 
               SUM(CASE WHEN impact_level = 'critical' THEN 1 ELSE 0 END) as critical_gaps
        FROM mips_data_gaps 
        WHERE provider_id = ? AND performance_year = ? AND status = 'open'
        GROUP BY gap_category
      `, [providerId, performanceYear]);

      // Get measure progress
      const [measureProgress] = await db.query(`
        SELECT 
          COUNT(*) as total_measures,
          COUNT(CASE WHEN qp.case_minimum_met = TRUE THEN 1 END) as measures_with_min_cases,
          AVG(qp.data_completeness) as avg_completeness,
          AVG(qp.performance_rate) as avg_performance
        FROM mips_provider_measures pm
        LEFT JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
        WHERE pm.provider_id = ? AND pm.performance_year = ? AND pm.selection_status = 'selected'
      `, [providerId, performanceYear]);

      return {
        eligibility: eligibility[0] || null,
        submission: submission[0] || null,
        gaps: gaps,
        measureProgress: measureProgress[0] || {},
        timeline: this.getTimelineStatus(performanceYear)
      };

    } catch (error) {
      console.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Get timeline status
  getTimelineStatus(performanceYear) {
    const today = new Date();
    const year = parseInt(performanceYear);
    const performanceEnd = new Date(year, 11, 31); // Dec 31
    const submissionEnd = new Date(year + 1, 2, 31); // Mar 31 next year

    let phase = 'completed';
    let daysRemaining = 0;

    if (today <= performanceEnd) {
      phase = 'performance_period';
      daysRemaining = Math.ceil((performanceEnd - today) / (1000 * 60 * 60 * 24));
    } else if (today <= submissionEnd) {
      phase = 'submission_period';
      daysRemaining = Math.ceil((submissionEnd - today) / (1000 * 60 * 60 * 24));
    }

    return {
      phase,
      daysRemaining,
      performanceEnd: performanceEnd.toISOString().split('T')[0],
      submissionEnd: submissionEnd.toISOString().split('T')[0]
    };
  }
}

module.exports = new MIPSService();