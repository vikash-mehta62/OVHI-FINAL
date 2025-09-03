/**
 * Unified RCM Routes - Production Ready
 * Single route file that handles all RCM endpoints
 * Eliminates duplicate route implementations
 */

const express = require('express');
const router = express.Router();

// Import unified controller
const {
  getDashboardData,
  getClaimsStatus,
  createClaim,
  updateClaimStatus,
  bulkUpdateClaimStatus,
  getClaimById,
  getDetailedClaimById,
  correctAndResubmitClaim,
  fileAppeal,
  transferToPatient,
  addClaimComment,
  voidClaim,
  postPayment,
  getPaymentPostingData,
  getARAgingReport,
  getCollectionsWorkflow,
  updateCollectionStatus,
  getDenialAnalytics,
  generateRCMReport,
  processERAFile,
  checkClaimMDERAStatus,
  getClaimMDConfiguration,
  updateClaimMDConfiguration,
  testClaimMDConnection,
  getPerformanceMetrics,
  clearCache,
  getCacheStats,
  healthCheck
} = require('../services/rcm/unifiedRCMController');

// Import eligibility controller
const eligibilityController = require('../services/rcm/eligibilityController');

// Import validation middleware
const { ValidationMiddleware, sanitizationMiddleware, sqlInjectionPreventionMiddleware } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

// Import caching middleware
const { cacheMiddleware } = require('../utils/cacheUtils');

// Import authentication middleware
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// =====================================================
// DASHBOARD AND ANALYTICS ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/dashboard:
 *   get:
 *     summary: Get RCM dashboard data
 *     tags: [RCM Dashboard]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for data
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
router.get('/dashboard',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 300, // 5 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getDashboardData)
);

// =====================================================
// CLAIMS MANAGEMENT ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/claims:
 *   get:
 *     summary: Get claims with filtering and pagination
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, 0, 1, 2, 3, 4]
 *         description: Claim status filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Claims retrieved successfully
 */
router.get('/claims',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 180, // 3 minutes
    varyBy: ['user-id'],
    keyGenerator: (req) => `claims:${JSON.stringify(req.query)}:${req.user?.user_id}`
  }),
  sqlInjectionPreventionMiddleware,
  ValidationMiddleware.validateGetClaimsQuery,
  asyncHandler(getClaimsStatus)
);

/**
 * @swagger
 * /api/v1/rcm/claims:
 *   post:
 *     summary: Create new claim
 *     tags: [RCM Claims]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - procedure_code
 *               - total_amount
 *               - service_date
 *             properties:
 *               patient_id:
 *                 type: integer
 *               procedure_code:
 *                 type: string
 *               total_amount:
 *                 type: number
 *               service_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Claim created successfully
 */
router.post('/claims',
  sanitizationMiddleware,
  ValidationMiddleware.validateCreateClaim,
  asyncHandler(createClaim)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}:
 *   get:
 *     summary: Get claim by ID
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Claim details retrieved successfully
 *       404:
 *         description: Claim not found
 */
router.get('/claims/:claimId',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  asyncHandler(getClaimById)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/detailed:
 *   get:
 *     summary: Get detailed claim information with history and comments
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     responses:
 *       200:
 *         description: Detailed claim information retrieved successfully
 *       404:
 *         description: Claim not found
 */
router.get('/claims/:claimId/detailed',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  asyncHandler(getDetailedClaimById)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/status:
 *   put:
 *     summary: Update claim status
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3, 4]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Claim status updated successfully
 */
router.put('/claims/:claimId/status',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  ValidationMiddleware.validateUpdateClaimStatus,
  asyncHandler(updateClaimStatus)
);

/**
 * @swagger
 * /api/v1/rcm/claims/bulk-update:
 *   post:
 *     summary: Bulk update claim status
 *     tags: [RCM Claims]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - claim_ids
 *               - status
 *             properties:
 *               claim_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               status:
 *                 type: integer
 *                 enum: [0, 1, 2, 3, 4]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bulk update completed
 */
router.post('/claims/bulk-update',
  sanitizationMiddleware,
  ValidationMiddleware.validateBulkUpdateClaimStatus,
  asyncHandler(bulkUpdateClaimStatus)
);

// =====================================================
// CLAIM ACTION ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/correct-resubmit:
 *   post:
 *     summary: Correct and resubmit claim
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correction_reason
 *             properties:
 *               correction_reason:
 *                 type: string
 *                 description: Reason for correction
 *     responses:
 *       200:
 *         description: Claim corrected and resubmitted successfully
 */
router.post('/claims/:claimId/correct-resubmit',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  asyncHandler(correctAndResubmitClaim)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/appeal:
 *   post:
 *     summary: File appeal for claim
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appeal_reason
 *             properties:
 *               appeal_reason:
 *                 type: string
 *                 description: Reason for appeal
 *     responses:
 *       200:
 *         description: Appeal filed successfully
 */
router.post('/claims/:claimId/appeal',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  asyncHandler(fileAppeal)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/transfer-patient:
 *   post:
 *     summary: Transfer claim to patient responsibility
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transfer_reason
 *             properties:
 *               transfer_reason:
 *                 type: string
 *                 description: Reason for transfer
 *     responses:
 *       200:
 *         description: Claim transferred to patient successfully
 */
router.post('/claims/:claimId/transfer-patient',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  asyncHandler(transferToPatient)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/comment:
 *   post:
 *     summary: Add comment to claim
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - comment
 *             properties:
 *               comment:
 *                 type: string
 *                 description: Comment text
 *     responses:
 *       200:
 *         description: Comment added successfully
 */
router.post('/claims/:claimId/comment',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  asyncHandler(addClaimComment)
);

/**
 * @swagger
 * /api/v1/rcm/claims/{claimId}/void:
 *   post:
 *     summary: Void claim
 *     tags: [RCM Claims]
 *     parameters:
 *       - in: path
 *         name: claimId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Claim ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - void_reason
 *             properties:
 *               void_reason:
 *                 type: string
 *                 description: Reason for voiding
 *     responses:
 *       200:
 *         description: Claim voided successfully
 */
router.post('/claims/:claimId/void',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  asyncHandler(voidClaim)
);

// =====================================================
// PAYMENT PROCESSING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/payments:
 *   get:
 *     summary: Get payment posting data
 *     tags: [RCM Payments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Payment data retrieved successfully
 */
router.get('/payments',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getPaymentPostingData)
);

/**
 * @swagger
 * /api/v1/rcm/payments/post:
 *   post:
 *     summary: Post payment
 *     tags: [RCM Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - claim_id
 *               - payment_amount
 *               - payment_date
 *             properties:
 *               claim_id:
 *                 type: integer
 *               payment_amount:
 *                 type: number
 *               payment_date:
 *                 type: string
 *                 format: date
 *               payment_method:
 *                 type: string
 *               check_number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment posted successfully
 */
router.post('/payments/post',
  sanitizationMiddleware,
  ValidationMiddleware.validatePostPayment,
  asyncHandler(postPayment)
);

// =====================================================
// A/R AGING AND COLLECTIONS ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/ar-aging:
 *   get:
 *     summary: Get A/R aging report
 *     tags: [RCM A/R Aging]
 *     parameters:
 *       - in: query
 *         name: include_zero_balance
 *         schema:
 *           type: boolean
 *         description: Include zero balance accounts
 *       - in: query
 *         name: payer_filter
 *         schema:
 *           type: string
 *         description: Filter by payer
 *     responses:
 *       200:
 *         description: A/R aging report generated successfully
 */
router.get('/ar-aging',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 900, // 15 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetARAgingQuery,
  asyncHandler(getARAgingReport)
);

/**
 * @swagger
 * /api/v1/rcm/collections:
 *   get:
 *     summary: Get collections workflow
 *     tags: [RCM Collections]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Collection status filter
 *     responses:
 *       200:
 *         description: Collections workflow retrieved successfully
 */
router.get('/collections',
  ValidationMiddleware.validateGetCollectionsQuery,
  asyncHandler(getCollectionsWorkflow)
);

/**
 * @swagger
 * /api/v1/rcm/collections/{accountId}/status:
 *   put:
 *     summary: Update collection status
 *     tags: [RCM Collections]
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Account ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               assigned_collector:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Collection status updated successfully
 */
router.put('/collections/:accountId/status',
  ValidationMiddleware.validatePositiveIntegerParam('accountId'),
  sanitizationMiddleware,
  asyncHandler(updateCollectionStatus)
);

// =====================================================
// DENIAL ANALYTICS ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/denials/analytics:
 *   get:
 *     summary: Get denial analytics
 *     tags: [RCM Denials]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y]
 *         description: Time period for data
 *     responses:
 *       200:
 *         description: Denial analytics retrieved successfully
 */
router.get('/denials/analytics',
  cacheMiddleware({
    namespace: 'rcm',
    ttl: 600, // 10 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(getDenialAnalytics)
);

// =====================================================
// REPORTING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/reports/generate:
 *   post:
 *     summary: Generate RCM report
 *     tags: [RCM Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               report_type:
 *                 type: string
 *                 enum: [summary, dashboard, ar_aging, denials]
 *               timeframe:
 *                 type: string
 *                 enum: [7d, 30d, 90d, 1y]
 *               format:
 *                 type: string
 *                 enum: [json, csv, excel, pdf]
 *     responses:
 *       200:
 *         description: Report generated successfully
 */
router.post('/reports/generate',
  sanitizationMiddleware,
  asyncHandler(generateRCMReport)
);

// =====================================================
// ERA PROCESSING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/era/process:
 *   post:
 *     summary: Process ERA file
 *     tags: [RCM ERA]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - era_data
 *               - file_name
 *             properties:
 *               era_data:
 *                 type: string
 *               file_name:
 *                 type: string
 *               auto_post:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: ERA file processed successfully
 */
router.post('/era/process',
  sanitizationMiddleware,
  ValidationMiddleware.validateProcessERA,
  asyncHandler(processERAFile)
);

// =====================================================
// CLAIMMD INTEGRATION ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/claimmd/era/{referenceId}/status:
 *   get:
 *     summary: Check ClaimMD ERA processing status
 *     tags: [RCM ClaimMD]
 *     parameters:
 *       - in: path
 *         name: referenceId
 *         required: true
 *         schema:
 *           type: string
 *         description: ClaimMD reference ID
 *     responses:
 *       200:
 *         description: ERA status retrieved successfully
 *       404:
 *         description: Reference ID not found
 */
router.get('/claimmd/era/:referenceId/status',
  ValidationMiddleware.validateRequiredParam('referenceId'),
  asyncHandler(checkClaimMDERAStatus)
);

/**
 * @swagger
 * /api/v1/rcm/claimmd/configuration:
 *   get:
 *     summary: Get ClaimMD configuration
 *     tags: [RCM ClaimMD]
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *       404:
 *         description: Configuration not found
 */
router.get('/claimmd/configuration',
  asyncHandler(getClaimMDConfiguration)
);

/**
 * @swagger
 * /api/v1/rcm/claimmd/configuration:
 *   put:
 *     summary: Update ClaimMD configuration
 *     tags: [RCM ClaimMD]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - api_key
 *               - provider_id
 *             properties:
 *               api_key:
 *                 type: string
 *                 description: ClaimMD API key
 *               base_url:
 *                 type: string
 *                 description: ClaimMD base URL
 *               provider_id:
 *                 type: string
 *                 description: ClaimMD provider ID
 *               is_active:
 *                 type: boolean
 *                 description: Whether integration is active
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/claimmd/configuration',
  sanitizationMiddleware,
  ValidationMiddleware.validateClaimMDConfiguration,
  asyncHandler(updateClaimMDConfiguration)
);

/**
 * @swagger
 * /api/v1/rcm/claimmd/test-connection:
 *   post:
 *     summary: Test ClaimMD API connection
 *     tags: [RCM ClaimMD]
 *     responses:
 *       200:
 *         description: Connection test successful
 *       400:
 *         description: Connection test failed
 */
router.post('/claimmd/test-connection',
  asyncHandler(testClaimMDConnection)
);

// =====================================================
// PERFORMANCE AND MONITORING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/performance/metrics:
 *   get:
 *     summary: Get performance metrics
 *     tags: [RCM Performance]
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/performance/metrics',
  requireRole(['admin', 'manager']),
  asyncHandler(getPerformanceMetrics)
);

/**
 * @swagger
 * /api/v1/rcm/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     tags: [RCM Performance]
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully
 */
router.get('/cache/stats',
  requireRole(['admin', 'manager']),
  asyncHandler(getCacheStats)
);

/**
 * @swagger
 * /api/v1/rcm/cache/clear:
 *   post:
 *     summary: Clear cache
 *     tags: [RCM Performance]
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.post('/cache/clear',
  requireRole(['admin']),
  asyncHandler(clearCache)
);

// =====================================================
// HEALTH CHECK ROUTE
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/health:
 *   get:
 *     summary: Health check
 *     tags: [RCM Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health',
  asyncHandler(healthCheck)
);

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

// Global error handler for RCM routes
router.use((error, req, res, next) => {
  console.error('RCM Route Error:', error);

  // Handle specific error types
  if (error.isOperational) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }

  // Handle database errors
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry detected'
    });
  }

  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// =====================================================
// ELIGIBILITY AND VALIDATION ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/eligibility/check:
 *   post:
 *     summary: Check patient eligibility
 *     tags: [RCM Eligibility]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - memberId
 *             properties:
 *               patientId:
 *                 type: string
 *               memberId:
 *                 type: string
 *               serviceDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Eligibility check completed
 */
router.post('/eligibility/check',
  sanitizationMiddleware,
  ValidationMiddleware.validateEligibilityCheck,
  asyncHandler(eligibilityController.checkEligibility)
);

/**
 * @swagger
 * /api/v1/rcm/eligibility/verify:
 *   post:
 *     summary: Verify patient eligibility in real-time
 *     tags: [RCM Eligibility]
 */
router.post('/eligibility/verify',
  sanitizationMiddleware,
  ValidationMiddleware.validateEligibilityVerify,
  asyncHandler(eligibilityController.verifyEligibility)
);

/**
 * @swagger
 * /api/v1/rcm/eligibility/history:
 *   get:
 *     summary: Get eligibility check history
 *     tags: [RCM Eligibility]
 */
router.get('/eligibility/history',
  ValidationMiddleware.validateEligibilityHistoryQuery,
  asyncHandler(eligibilityController.getEligibilityHistory)
);

/**
 * @swagger
 * /api/v1/rcm/claims/validate:
 *   post:
 *     summary: Validate claim data
 *     tags: [RCM Claims]
 */
router.post('/claims/validate',
  sanitizationMiddleware,
  ValidationMiddleware.validateClaimValidation,
  asyncHandler(eligibilityController.validateClaim)
);

/**
 * @swagger
 * /api/v1/rcm/claims/scrub:
 *   post:
 *     summary: Scrub claim for errors
 *     tags: [RCM Claims]
 */
router.post('/claims/scrub',
  sanitizationMiddleware,
  ValidationMiddleware.validateRequiredParam('patientId'),
  asyncHandler(eligibilityController.scrubClaim)
);

/**
 * @swagger
 * /api/v1/rcm/claims/estimate:
 *   post:
 *     summary: Get claim reimbursement estimate
 *     tags: [RCM Claims]
 */
router.post('/claims/estimate',
  sanitizationMiddleware,
  ValidationMiddleware.validateRequiredParam('patientId'),
  asyncHandler(eligibilityController.getClaimEstimate)
);

/**
 * @swagger
 * /api/v1/rcm/benefits/check:
 *   post:
 *     summary: Check patient benefits and coverage
 *     tags: [RCM Benefits]
 */
router.post('/benefits/check',
  sanitizationMiddleware,
  ValidationMiddleware.validateBenefitsCheck,
  asyncHandler(eligibilityController.checkBenefits)
);

/**
 * @swagger
 * /api/v1/rcm/copay/estimate:
 *   post:
 *     summary: Get copay estimate
 *     tags: [RCM Copay]
 */
router.post('/copay/estimate',
  sanitizationMiddleware,
  ValidationMiddleware.validateRequiredParam('patientId'),
  asyncHandler(eligibilityController.getCopayEstimate)
);

module.exports = router;