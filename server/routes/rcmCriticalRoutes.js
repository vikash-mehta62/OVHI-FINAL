const express = require('express');
const router = express.Router();
const eligibilityService = require('../services/rcm/eligibilityService');
const secondaryInsuranceService = require('../services/rcm/secondaryInsuranceService');
const auditService = require('../services/rcm/auditService');
const { body, param, query } = require('express-validator');
const { validationResult } = require('express-validator');

/**
 * Critical RCM Routes - Eligibility, Secondary Insurance, and Audit
 */

// =====================================================
// REAL-TIME ELIGIBILITY ROUTES
// =====================================================

// Check real-time eligibility
router.post('/eligibility/check', [
  body('patientId').isInt({ min: 1 }).withMessage('Valid patient ID required'),
  body('serviceDate').isISO8601().withMessage('Valid service date required'),
  body('serviceTypes').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { patientId, serviceDate, serviceTypes = [] } = req.body;
    const { user_id: providerId } = req.user;

    // Log eligibility check attempt
    await auditService.logAudit({
      userId: providerId,
      action: 'ELIGIBILITY_CHECK_INITIATED',
      entityType: 'eligibility_request',
      entityId: null,
      patientId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Real-time eligibility verification',
      riskLevel: 'LOW',
      additionalData: { serviceDate, serviceTypes }
    });

    const result = await eligibilityService.checkEligibility(
      patientId, 
      providerId, 
      serviceDate, 
      serviceTypes
    );

    // Log eligibility result
    await auditService.logAudit({
      userId: providerId,
      action: 'ELIGIBILITY_CHECK_COMPLETED',
      entityType: 'eligibility_request',
      entityId: result.eligibilityId,
      patientId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Eligibility verification completed',
      riskLevel: result.riskLevel === 'HIGH' ? 'HIGH' : 'LOW',
      additionalData: { 
        eligibilityStatus: result.result?.eligibilityStatus,
        issuesCount: result.issues?.length || 0,
        riskLevel: result.riskLevel
      }
    });

    res.json({
      success: result.success,
      data: result.success ? {
        eligibilityId: result.eligibilityId,
        eligibilityStatus: result.result.eligibilityStatus,
        benefitInformation: result.result.benefitInformation,
        priorAuthRequired: result.result.priorAuthRequired,
        issues: result.issues,
        riskLevel: result.riskLevel,
        recommendations: generateEligibilityRecommendations(result)
      } : null,
      error: result.error
    });

  } catch (error) {
    console.error('Eligibility check error:', error);
    
    // Log error
    await auditService.logAudit({
      userId: req.user?.user_id,
      action: 'ELIGIBILITY_CHECK_ERROR',
      entityType: 'eligibility_request',
      entityId: null,
      patientId: req.body.patientId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: `Eligibility check failed: ${error.message}`,
      riskLevel: 'MEDIUM'
    });

    res.status(500).json({
      success: false,
      message: 'Eligibility verification failed'
    });
  }
});

// Get eligibility history
router.get('/eligibility/history/:patientId', [
  param('patientId').isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 10 } = req.query;
    const { user_id: providerId } = req.user;

    // Log patient data access
    await auditService.logPatientAccess({
      userId: providerId,
      patientId: parseInt(patientId),
      accessType: 'ELIGIBILITY_HISTORY_VIEW',
      dataAccessed: ['eligibility_history'],
      purpose: 'Review patient eligibility history',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });

    const history = await eligibilityService.getEligibilityHistory(patientId, limit);

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching eligibility history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch eligibility history'
    });
  }
});

// =====================================================
// SECONDARY INSURANCE ROUTES
// =====================================================

// Process secondary claims
router.post('/secondary/process', [
  body('primaryClaimId').isInt({ min: 1 }).withMessage('Valid primary claim ID required'),
  body('primaryPaymentAmount').isFloat({ min: 0 }).withMessage('Valid payment amount required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { primaryClaimId, primaryPaymentAmount } = req.body;
    const { user_id: providerId } = req.user;

    // Log secondary processing initiation
    await auditService.logFinancialTransaction({
      userId: providerId,
      transactionType: 'SECONDARY_CLAIM_PROCESSING',
      amount: primaryPaymentAmount,
      claimId: primaryClaimId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      reason: 'Processing secondary insurance claims'
    });

    const result = await secondaryInsuranceService.processSecondaryClaims(
      primaryClaimId, 
      primaryPaymentAmount
    );

    // Log secondary processing completion
    await auditService.logFinancialTransaction({
      userId: providerId,
      transactionType: 'SECONDARY_CLAIMS_CREATED',
      amount: primaryPaymentAmount,
      claimId: primaryClaimId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      reason: `Created ${result.secondaryClaims?.length || 0} secondary claims`
    });

    res.json({
      success: result.success,
      message: result.message,
      data: {
        secondaryClaims: result.secondaryClaims,
        potentialRecovery: calculatePotentialRecovery(result.secondaryClaims),
        nextSteps: generateSecondaryNextSteps(result.secondaryClaims)
      }
    });

  } catch (error) {
    console.error('Secondary claims processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process secondary claims'
    });
  }
});

// Get secondary opportunities
router.get('/secondary/opportunities', async (req, res) => {
  try {
    const { user_id: providerId } = req.user;

    // Log access to financial opportunities
    await auditService.logAudit({
      userId: providerId,
      action: 'SECONDARY_OPPORTUNITIES_VIEW',
      entityType: 'financial_report',
      entityId: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Viewing secondary insurance opportunities',
      riskLevel: 'LOW'
    });

    const opportunities = await secondaryInsuranceService.identifySecondaryOpportunities(providerId);

    res.json({
      success: true,
      data: {
        opportunities,
        summary: {
          totalOpportunities: opportunities.length,
          potentialRevenue: opportunities.reduce((sum, opp) => sum + parseFloat(opp.total_billed || 0), 0),
          averageOpportunity: opportunities.length > 0 
            ? opportunities.reduce((sum, opp) => sum + parseFloat(opp.total_billed || 0), 0) / opportunities.length 
            : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching secondary opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch secondary opportunities'
    });
  }
});

// Process secondary payment
router.post('/secondary/:claimId/payment', [
  param('claimId').isInt({ min: 1 }),
  body('paymentAmount').isFloat({ min: 0.01 }),
  body('paymentDate').isISO8601()
], async (req, res) => {
  try {
    const { claimId } = req.params;
    const { paymentAmount, paymentDate } = req.body;
    const { user_id: providerId } = req.user;

    // Log secondary payment processing
    await auditService.logFinancialTransaction({
      userId: providerId,
      transactionType: 'SECONDARY_PAYMENT_PROCESSING',
      amount: paymentAmount,
      claimId: parseInt(claimId),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID,
      reason: 'Processing secondary insurance payment'
    });

    const result = await secondaryInsuranceService.processSecondaryPayment(
      claimId, 
      paymentAmount, 
      paymentDate
    );

    res.json({
      success: result.success,
      data: result
    });

  } catch (error) {
    console.error('Secondary payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process secondary payment'
    });
  }
});

// =====================================================
// AUDIT AND COMPLIANCE ROUTES
// =====================================================

// Get audit trail for entity
router.get('/audit/:entityType/:entityId', [
  param('entityType').isIn(['claim', 'patient', 'payment', 'eligibility']),
  param('entityId').isInt({ min: 1 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;
    const { user_id: providerId } = req.user;

    // Log audit trail access
    await auditService.logAudit({
      userId: providerId,
      action: 'AUDIT_TRAIL_ACCESS',
      entityType: 'audit_log',
      entityId: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: `Accessing audit trail for ${entityType} ${entityId}`,
      riskLevel: 'MEDIUM',
      additionalData: { entityType, entityId, dateRange: { startDate, endDate } }
    });

    const auditTrail = await auditService.getAuditTrail(entityType, entityId, {
      startDate,
      endDate,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        auditTrail,
        summary: {
          totalEntries: auditTrail.length,
          dateRange: { startDate, endDate },
          entityInfo: { entityType, entityId }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit trail'
    });
  }
});

// Get patient access history (HIPAA requirement)
router.get('/audit/patient-access/:patientId', [
  param('patientId').isInt({ min: 1 }),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;
    const { user_id: providerId } = req.user;

    // Log access to patient access history (meta-audit)
    await auditService.logPatientAccess({
      userId: providerId,
      patientId: parseInt(patientId),
      accessType: 'ACCESS_HISTORY_VIEW',
      dataAccessed: ['audit_logs', 'access_history'],
      purpose: 'HIPAA compliance - reviewing patient access history',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: req.sessionID
    });

    const accessHistory = await auditService.getPatientAccessHistory(patientId, {
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: {
        patientId: parseInt(patientId),
        accessHistory,
        summary: {
          totalAccesses: accessHistory.length,
          uniqueUsers: [...new Set(accessHistory.map(h => h.user_id))].length,
          dateRange: { startDate, endDate }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching patient access history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient access history'
    });
  }
});

// Generate compliance report
router.get('/audit/compliance-report', [
  query('startDate').isISO8601().withMessage('Valid start date required'),
  query('endDate').isISO8601().withMessage('Valid end date required')
], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { user_id: providerId } = req.user;

    // Log compliance report generation
    await auditService.logAudit({
      userId: providerId,
      action: 'COMPLIANCE_REPORT_GENERATED',
      entityType: 'compliance_report',
      entityId: null,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Generating HIPAA compliance report',
      riskLevel: 'MEDIUM',
      additionalData: { reportPeriod: { startDate, endDate } }
    });

    const complianceReport = await auditService.generateComplianceReport(startDate, endDate);

    res.json({
      success: true,
      data: {
        reportPeriod: { startDate, endDate },
        complianceReport,
        summary: generateComplianceSummary(complianceReport)
      }
    });

  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report'
    });
  }
});

// Verify audit integrity
router.post('/audit/verify/:auditId', [
  param('auditId').isInt({ min: 1 })
], async (req, res) => {
  try {
    const { auditId } = req.params;
    const { user_id: providerId } = req.user;

    // Log audit verification attempt
    await auditService.logAudit({
      userId: providerId,
      action: 'AUDIT_INTEGRITY_CHECK',
      entityType: 'audit_verification',
      entityId: parseInt(auditId),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      reason: 'Verifying audit record integrity',
      riskLevel: 'HIGH'
    });

    const verification = await auditService.verifyAuditIntegrity(auditId);

    res.json({
      success: true,
      data: {
        auditId: parseInt(auditId),
        verification,
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error verifying audit integrity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify audit integrity'
    });
  }
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateEligibilityRecommendations(eligibilityResult) {
  const recommendations = [];

  if (eligibilityResult.riskLevel === 'HIGH') {
    recommendations.push({
      type: 'URGENT',
      message: 'High denial risk detected - verify insurance information before service',
      action: 'Contact patient to verify insurance details'
    });
  }

  if (eligibilityResult.result?.priorAuthRequired) {
    recommendations.push({
      type: 'REQUIRED',
      message: 'Prior authorization required for planned services',
      action: 'Obtain prior authorization before providing services'
    });
  }

  if (eligibilityResult.issues?.length > 0) {
    recommendations.push({
      type: 'REVIEW',
      message: `${eligibilityResult.issues.length} eligibility issues identified`,
      action: 'Review and address eligibility issues before billing'
    });
  }

  return recommendations;
}

function calculatePotentialRecovery(secondaryClaims) {
  if (!secondaryClaims || secondaryClaims.length === 0) return 0;
  
  return secondaryClaims.reduce((total, claim) => {
    return total + (claim.claimAmount || 0);
  }, 0);
}

function generateSecondaryNextSteps(secondaryClaims) {
  const steps = [];

  if (secondaryClaims && secondaryClaims.length > 0) {
    steps.push({
      step: 1,
      action: 'Review secondary claims for accuracy',
      description: 'Verify all secondary claim information is correct'
    });

    steps.push({
      step: 2,
      action: 'Submit secondary claims to payers',
      description: 'Submit claims through appropriate channels'
    });

    steps.push({
      step: 3,
      action: 'Monitor secondary claim status',
      description: 'Track claims and follow up on any denials'
    });
  }

  return steps;
}

function generateComplianceSummary(complianceReport) {
  const totalActivities = complianceReport.reduce((sum, day) => sum + day.total_activities, 0);
  const totalHighRisk = complianceReport.reduce((sum, day) => sum + day.high_risk_activities, 0);
  const totalCritical = complianceReport.reduce((sum, day) => sum + day.critical_activities, 0);

  return {
    totalActivities,
    totalHighRisk,
    totalCritical,
    riskPercentage: totalActivities > 0 ? ((totalHighRisk + totalCritical) / totalActivities * 100).toFixed(2) : 0,
    complianceScore: Math.max(0, 100 - (totalCritical * 10) - (totalHighRisk * 2))
  };
}

module.exports = router;