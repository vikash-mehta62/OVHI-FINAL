/**
 * Secure RCM Routes with Enhanced Security Measures
 * Implements comprehensive security controls for RCM endpoints
 */

const express = require('express');
const router = express.Router();

// Import security middleware
const {
  RCMRateLimits,
  requirePermission,
  enhancedSecurityHeaders,
  auditLogger,
  enhancedSanitization
} = require('../../security/rcmSecurityAudit');

// Import validation middleware
const { 
  ValidationMiddleware, 
  sanitizationMiddleware, 
  sqlInjectionPreventionMiddleware 
} = require('../../middleware/validation');

// Import error handling
const { asyncHandler } = require('../../middleware/errorHandler');

// Import caching middleware
const { cacheMiddleware } = require('../../utils/cacheUtils');

// Import controllers
const rcmController = require('./rcmController');

// Apply global security middleware to all RCM routes
router.use(enhancedSecurityHeaders);
router.use(RCMRateLimits.general);

/**
 * Dashboard and Analytics Routes
 */
router.get('/dashboard',
  requirePermission('rcm:dashboard:view'),
  auditLogger('RCM_DASHBOARD_VIEW'),
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 300, // 5 minutes
    varyBy: ['user-id', 'user-role']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(rcmController.getDashboardData)
);

router.get('/analytics',
  requirePermission('rcm:dashboard:view'),
  auditLogger('RCM_ANALYTICS_VIEW'),
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 600, // 10 minutes
    varyBy: ['user-id', 'user-role']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(rcmController.getDashboardData)
);

/**
 * Claims Management Routes
 */
router.get('/claims',
  requirePermission('rcm:claims:view'),
  auditLogger('RCM_CLAIMS_LIST'),
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 180, // 3 minutes
    varyBy: ['user-id', 'user-role'],
    keyGenerator: (req) => `claims:${JSON.stringify(req.query)}:${req.user?.user_id}:${req.user?.role}`
  }),
  sqlInjectionPreventionMiddleware,
  ValidationMiddleware.validateGetClaimsQuery,
  asyncHandler(rcmController.getClaimsStatus)
);

router.post('/claims',
  RCMRateLimits.sensitive,
  requirePermission('rcm:claims:create'),
  auditLogger('RCM_CLAIM_CREATE'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateCreateClaim,
  asyncHandler(rcmController.createClaim)
);

router.get('/claims/:claimId',
  requirePermission('rcm:claims:view'),
  auditLogger('RCM_CLAIM_VIEW'),
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  asyncHandler(rcmController.getClaimById)
);

router.put('/claims/:claimId',
  RCMRateLimits.sensitive,
  requirePermission('rcm:claims:update'),
  auditLogger('RCM_CLAIM_UPDATE'),
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateUpdateClaim,
  asyncHandler(rcmController.updateClaim)
);

router.put('/claims/:claimId/status',
  RCMRateLimits.sensitive,
  requirePermission('rcm:claims:update'),
  auditLogger('RCM_CLAIM_STATUS_UPDATE'),
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateUpdateClaimStatus,
  asyncHandler(rcmController.updateClaimStatus)
);

router.post('/claims/bulk-update',
  RCMRateLimits.bulk,
  requirePermission('rcm:claims:bulk_update'),
  auditLogger('RCM_CLAIMS_BULK_UPDATE'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateBulkUpdateClaimStatus,
  asyncHandler(rcmController.bulkUpdateClaimStatus)
);

/**
 * A/R Aging and Collections Routes
 */
router.get('/ar-aging',
  requirePermission('rcm:ar_aging:view'),
  auditLogger('RCM_AR_AGING_VIEW'),
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 900, // 15 minutes
    varyBy: ['user-id', 'user-role']
  }),
  ValidationMiddleware.validateGetARAgingQuery,
  asyncHandler(rcmController.getARAgingReport)
);

router.get('/collections',
  requirePermission('rcm:collections:view'),
  auditLogger('RCM_COLLECTIONS_VIEW'),
  ValidationMiddleware.validateGetCollectionsQuery,
  asyncHandler(rcmController.getCollectionsWorkflow)
);

router.put('/collections/:accountId/status',
  RCMRateLimits.sensitive,
  requirePermission('rcm:collections:update'),
  auditLogger('RCM_COLLECTION_STATUS_UPDATE'),
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  sanitizationMiddleware,
  enhancedSanitization,
  asyncHandler(rcmController.updateCollectionStatus)
);

/**
 * Payment Processing Routes
 */
router.get('/payments',
  requirePermission('rcm:payments:view'),
  auditLogger('RCM_PAYMENTS_VIEW'),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(rcmController.getPaymentPostingData)
);

router.post('/payments/post',
  RCMRateLimits.sensitive,
  requirePermission('rcm:payments:post'),
  auditLogger('RCM_PAYMENT_POST'),
  sanitizationMiddleware,
  enhancedSanitization,
  asyncHandler(rcmController.postPayment)
);

router.post('/payments/era/process',
  RCMRateLimits.sensitive,
  requirePermission('rcm:payments:process_era'),
  auditLogger('RCM_ERA_PROCESS'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateProcessERA,
  asyncHandler(rcmController.processERAFile)
);

/**
 * Denial Analytics Routes
 */
router.get('/denials/analytics',
  requirePermission('rcm:dashboard:view'),
  auditLogger('RCM_DENIALS_ANALYTICS'),
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 600, // 10 minutes
    varyBy: ['user-id', 'user-role']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(rcmController.getDenialAnalytics)
);

/**
 * Patient Statements Routes
 */
router.get('/statements',
  requirePermission('rcm:dashboard:view'),
  auditLogger('RCM_STATEMENTS_VIEW'),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(rcmController.getStatements)
);

router.post('/patients/:patientId/statements/generate',
  RCMRateLimits.sensitive,
  requirePermission('rcm:claims:view'),
  auditLogger('RCM_STATEMENT_GENERATE'),
  ValidationMiddleware.validatePositiveIntegerParam('patientId'),
  sanitizationMiddleware,
  enhancedSanitization,
  ValidationMiddleware.validateGeneratePatientStatement,
  asyncHandler(rcmController.generatePatientStatement)
);

/**
 * Reports Routes
 */
router.post('/reports/generate',
  RCMRateLimits.reports,
  requirePermission('rcm:reports:generate'),
  auditLogger('RCM_REPORT_GENERATE'),
  sanitizationMiddleware,
  enhancedSanitization,
  asyncHandler(rcmController.generateRCMReport)
);

/**
 * Administrative Routes (High Security)
 */
router.get('/performance/stats',
  requirePermission('rcm:admin:performance_metrics'),
  auditLogger('RCM_PERFORMANCE_STATS'),
  asyncHandler(rcmController.getQueryPerformanceStats)
);

router.get('/performance/metrics',
  requirePermission('rcm:admin:performance_metrics'),
  auditLogger('RCM_PERFORMANCE_METRICS'),
  asyncHandler(rcmController.getPerformanceMetrics)
);

router.post('/performance/reset',
  RCMRateLimits.sensitive,
  requirePermission('rcm:admin:performance_metrics'),
  auditLogger('RCM_PERFORMANCE_RESET'),
  asyncHandler(rcmController.resetPerformanceMetrics)
);

router.get('/cache/stats',
  requirePermission('rcm:admin:cache_clear'),
  auditLogger('RCM_CACHE_STATS'),
  asyncHandler(rcmController.getCacheStats)
);

router.post('/cache/clear',
  RCMRateLimits.sensitive,
  requirePermission('rcm:admin:cache_clear'),
  auditLogger('RCM_CACHE_CLEAR'),
  asyncHandler(rcmController.clearCache)
);

router.post('/cache/invalidate',
  RCMRateLimits.sensitive,
  requirePermission('rcm:admin:cache_clear'),
  auditLogger('RCM_CACHE_INVALIDATE'),
  sanitizationMiddleware,
  asyncHandler(rcmController.invalidateCache)
);

/**
 * Security Testing Route (Development Only)
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/security/audit',
    requirePermission('rcm:admin:performance_metrics'),
    auditLogger('RCM_SECURITY_AUDIT'),
    (req, res) => {
      const { SecurityAuditReport } = require('../../security/rcmSecurityAudit');
      res.json({
        success: true,
        data: SecurityAuditReport,
        message: 'Security audit report retrieved successfully'
      });
    }
  );
}

/**
 * Error handling middleware for RCM routes
 */
router.use((error, req, res, next) => {
  // Log security-related errors
  if (error.code === 'PERMISSION_DENIED' || error.code === 'RATE_LIMIT_EXCEEDED') {
    console.warn('Security event:', {
      error: error.code,
      userId: req.user?.user_id,
      ip: req.ip,
      url: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  
  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.isOperational ? error.message : 'An internal error occurred',
        timestamp: new Date().toISOString()
      }
    });
  } else {
    // In development, provide more details
    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;