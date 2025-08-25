const express = require('express');
const router = express.Router();

// Import collections routes
const collectionsRoutes = require('./collectionsRoutes');

// Import validation middleware
const { ValidationMiddleware, sanitizationMiddleware, sqlInjectionPreventionMiddleware } = require('../../middleware/validation');
const { asyncHandler } = require('../../middleware/errorHandler');

// Import caching middleware
const { cacheMiddleware } = require('../../utils/cacheUtils');

// Import refactored controller (new service-based pattern)
const rcmController = require('./rcmController');

// Import legacy controller for backward compatibility
const {
  getPaymentPostingData,
  processERAFile,
  getRevenueForecasting,
  getCollectionsWorkflow,
  updateCollectionStatus,
  getRCMAnalytics,
  getPayerPerformance,
  getDenialTrends,
  getARAccountDetails,
  initiateAutomatedFollowUp,
  setupPaymentPlan,
  getClaimMDStatus,
  syncClaimMDData
} = require('./rcmCtrl');

// Import enhanced controllers
const {
  validateClaim,
  getClaimSuggestions,
  getAutoCorrections
} = require('./claimValidationCtrl');

const {
  generatePatientStatement,
  getPatientStatements,
  sendPatientStatement
} = require('./patientStatementCtrl');

const {
  processERAFile2,
  getERAFiles,
  getERAPaymentDetails,
  manualPostERAPayment,
  getOfficePayments,
  recordOfficePayment
} = require('./eraProcessingCtrl');

// Dashboard and Analytics
router.get('/dashboard',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 300, // 5 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getDashboardData
);
router.get('/analytics',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 600, // 10 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getRCMAnalytics)
);
router.get('/revenue-forecasting',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getRevenueForecasting)
);
router.get('/payer-performance',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getPayerPerformance)
);

// Claims Management
router.get('/claims',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 180, // 3 minutes
    varyBy: ['user-id'],
    keyGenerator: (req) => `claims:${JSON.stringify(req.query)}:${req.user?.user_id}`
  }),
  sqlInjectionPreventionMiddleware,
  ValidationMiddleware.validateGetClaimsQuery,
  rcmController.getClaimsStatus
);
router.post('/claims',
  sanitizationMiddleware,
  ValidationMiddleware.validateCreateClaim,
  rcmController.createClaim
);
router.get('/claims/:claimId',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getClaimById
);
router.put('/claims/:claimId',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  ValidationMiddleware.validateUpdateClaim,
  rcmController.updateClaim
);
router.get('/claims/:claimId/history',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getClaimHistory
);
router.get('/claims/:claimId/history/export',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.exportClaimHistory
);
router.post('/claims/validate',
  sanitizationMiddleware,
  ValidationMiddleware.validateCreateClaim,
  rcmController.validateClaim
);
router.post('/claims/bulk-update',
  sanitizationMiddleware,
  ValidationMiddleware.validateBulkUpdateClaimStatus,
  rcmController.bulkUpdateClaimStatus
);
router.put('/claims/:claimId/status',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  ValidationMiddleware.validateUpdateClaimStatus,
  rcmController.updateClaimStatus
);

// ClaimMD Integration
router.get('/claimmd/status/:trackingId',
  ValidationMiddleware.validatePositiveIntegerParam('trackingId'),
  asyncHandler(getClaimMDStatus)
);
router.post('/claimmd/sync',
  sanitizationMiddleware,
  asyncHandler(syncClaimMDData)
);

// A/R Aging and Collections
router.get('/ar-aging',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 900, // 15 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetARAgingQuery,
  rcmController.getARAgingReport
);
router.get('/ar-aging/:accountId',
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  asyncHandler(getARAccountDetails)
);
router.post('/ar-aging/:accountId/follow-up',
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  sanitizationMiddleware,
  asyncHandler(initiateAutomatedFollowUp)
);
router.post('/ar-aging/:accountId/payment-plan',
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  sanitizationMiddleware,
  ValidationMiddleware.validateCreatePaymentPlan,
  asyncHandler(setupPaymentPlan)
);

// Collections Workflow
router.get('/collections',
  ValidationMiddleware.validateGetCollectionsQuery,
  rcmController.getCollectionsWorkflow
);
router.put('/collections/:accountId/status',
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  sanitizationMiddleware,
  rcmController.updateCollectionStatus
);

// Denials Management
router.get('/denials/analytics',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 600, // 10 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getDenialAnalytics
);
router.get('/denials/trends',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getDenialTrends)
);

// Payment Posting and ERA
router.get('/payments',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getPaymentPostingData
);
router.post('/payments/era/process',
  sanitizationMiddleware,
  ValidationMiddleware.validateProcessERA,
  rcmController.processERAFile
);
router.post('/payments/post',
  sanitizationMiddleware,
  rcmController.postPayment
);

// Reports
router.post('/reports/generate',
  sanitizationMiddleware,
  rcmController.generateRCMReport
);

// Enhanced Features - Claim Validation and Suggestions
router.get('/claims/:claimId/validate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  asyncHandler(validateClaim)
);
router.get('/patients/:patientId/claim-suggestions',
  ValidationMiddleware.validatePositiveIntegerParam('patientId'),
  asyncHandler(getClaimSuggestions)
);
router.get('/auto-corrections',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getAutoCorrections)
);

// Patient Statements
router.post('/patients/:patientId/statements/generate',
  ValidationMiddleware.validatePositiveIntegerParam('patientId'),
  sanitizationMiddleware,
  ValidationMiddleware.validateGeneratePatientStatement,
  asyncHandler(generatePatientStatement)
);
router.get('/statements',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getPatientStatements)
);
router.post('/statements/:statementId/send',
  ValidationMiddleware.validatePositiveIntegerParam('statementId'),
  sanitizationMiddleware,
  asyncHandler(sendPatientStatement)
);

// ERA Processing
router.post('/era/process',
  sanitizationMiddleware,
  ValidationMiddleware.validateProcessERA,
  asyncHandler(processERAFile2)
);
router.get('/era/files',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getERAFiles)
);
router.get('/era/:era_id/details',
  ValidationMiddleware.validatePositiveIntegerParam('era_id'),
  asyncHandler(getERAPaymentDetails)
);
router.post('/era/payments/:era_detail_id/post',
  ValidationMiddleware.validatePositiveIntegerParam('era_detail_id'),
  sanitizationMiddleware,
  asyncHandler(manualPostERAPayment)
);

// Office Payments
router.get('/payments/office',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getOfficePayments)
);
router.post('/payments/office/record',
  sanitizationMiddleware,
  asyncHandler(recordOfficePayment)
);

// Collections Management
router.use('/collections', collectionsRoutes);

// Performance Monitoring and Analytics
router.get('/performance/stats',
  rcmController.getQueryPerformanceStats
);
router.get('/performance/metrics',
  rcmController.getPerformanceMetrics
);
router.post('/performance/reset',
  rcmController.resetPerformanceMetrics
);

// Cache Management
router.get('/cache/stats',
  rcmController.getCacheStats
);
router.post('/cache/clear',
  rcmController.clearCache
);
router.post('/cache/invalidate',
  rcmController.invalidateCache
);

module.exports = router;