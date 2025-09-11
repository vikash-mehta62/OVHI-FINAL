/**
 * Enhanced RCM Routes
 * Routes for advanced RCM features
 */

const express = require('express');
const router = express.Router();

// Import enhanced controller
const {
    // ERA Processing
    processERAFile,
    getERAProcessingStatus,
    generateVarianceReport,
    
    // Revenue Forecasting
    generateRevenueForecast,
    
    // Patient Portal
    authenticatePatient,
    getPatientAccountSummary,
    processPatientPayment,
    setupPatientPaymentPlan,
    sendPatientMessage,
    getPatientStatements,
    downloadPatientStatement,
    
    // Performance Monitoring
    getPerformanceMetrics,
    createPerformanceAlert,
    
    // Advanced Reporting
    generateBusinessIntelligenceReport,
    createCustomReport,
    exportReport,
    generateScheduledReports,
    
    // Health Check
    enhancedHealthCheck
} = require('../services/rcm/enhancedRCMController');

// Import validation middleware
const { ValidationMiddleware, sanitizationMiddleware } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// =====================================================
// ERA PROCESSING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/era/process:
 *   post:
 *     summary: Process ERA file with advanced matching
 *     tags: [Enhanced RCM - ERA]
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
 *               file_format:
 *                 type: string
 *                 enum: [X12_835, CSV, EXCEL, JSON]
 *               auto_post:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: ERA file processed successfully
 */
router.post('/era/process',
    sanitizationMiddleware,
    asyncHandler(processERAFile)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/era/{eraFileId}/status:
 *   get:
 *     summary: Get ERA processing status
 *     tags: [Enhanced RCM - ERA]
 *     parameters:
 *       - in: path
 *         name: eraFileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: ERA processing status retrieved
 */
router.get('/era/:eraFileId/status',
    ValidationMiddleware.validatePositiveIntegerParam('eraFileId'),
    asyncHandler(getERAProcessingStatus)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/era/{eraFileId}/variance-report:
 *   get:
 *     summary: Generate variance report for ERA file
 *     tags: [Enhanced RCM - ERA]
 *     parameters:
 *       - in: path
 *         name: eraFileId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Variance report generated
 */
router.get('/era/:eraFileId/variance-report',
    ValidationMiddleware.validatePositiveIntegerParam('eraFileId'),
    asyncHandler(generateVarianceReport)
);

// =====================================================
// REVENUE FORECASTING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/forecasting/revenue:
 *   post:
 *     summary: Generate ML-powered revenue forecast
 *     tags: [Enhanced RCM - Forecasting]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               forecast_period:
 *                 type: integer
 *                 default: 12
 *               model_type:
 *                 type: string
 *                 enum: [linear, seasonal, arima, ensemble]
 *                 default: ensemble
 *               include_seasonality:
 *                 type: boolean
 *                 default: true
 *               confidence_level:
 *                 type: integer
 *                 enum: [90, 95, 99]
 *                 default: 95
 *     responses:
 *       200:
 *         description: Revenue forecast generated successfully
 */
router.post('/forecasting/revenue',
    sanitizationMiddleware,
    asyncHandler(generateRevenueForecast)
);

// =====================================================
// PATIENT PORTAL ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/authenticate:
 *   post:
 *     summary: Authenticate patient for portal access
 *     tags: [Enhanced RCM - Patient Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - date_of_birth
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               patient_id:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Patient authenticated successfully
 */
router.post('/patient/authenticate',
    sanitizationMiddleware,
    asyncHandler(authenticatePatient)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/{patientId}/account:
 *   get:
 *     summary: Get comprehensive patient account summary
 *     tags: [Enhanced RCM - Patient Portal]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Account summary retrieved
 */
router.get('/patient/:patientId/account',
    ValidationMiddleware.validatePositiveIntegerParam('patientId'),
    asyncHandler(getPatientAccountSummary)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/payment:
 *   post:
 *     summary: Process patient payment
 *     tags: [Enhanced RCM - Patient Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - amount
 *               - payment_method
 *             properties:
 *               patient_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [credit_card, debit_card, ach, paypal]
 *               payment_details:
 *                 type: object
 *               claim_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *               apply_to_oldest:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Payment processed successfully
 */
router.post('/patient/payment',
    sanitizationMiddleware,
    asyncHandler(processPatientPayment)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/payment-plan:
 *   post:
 *     summary: Setup patient payment plan
 *     tags: [Enhanced RCM - Patient Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - total_amount
 *               - monthly_payment
 *               - number_of_payments
 *               - start_date
 *             properties:
 *               patient_id:
 *                 type: integer
 *               total_amount:
 *                 type: number
 *               monthly_payment:
 *                 type: number
 *               number_of_payments:
 *                 type: integer
 *               start_date:
 *                 type: string
 *                 format: date
 *               auto_pay_enabled:
 *                 type: boolean
 *               payment_method:
 *                 type: string
 *               payment_details:
 *                 type: object
 *     responses:
 *       200:
 *         description: Payment plan setup successfully
 */
router.post('/patient/payment-plan',
    sanitizationMiddleware,
    asyncHandler(setupPatientPaymentPlan)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/message:
 *   post:
 *     summary: Send secure message to billing staff
 *     tags: [Enhanced RCM - Patient Portal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - subject
 *               - message
 *             properties:
 *               patient_id:
 *                 type: integer
 *               subject:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *               category:
 *                 type: string
 *                 enum: [billing, insurance, payment, general]
 *     responses:
 *       200:
 *         description: Message sent successfully
 */
router.post('/patient/message',
    sanitizationMiddleware,
    asyncHandler(sendPatientMessage)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/{patientId}/statements:
 *   get:
 *     summary: Get patient statements
 *     tags: [Enhanced RCM - Patient Portal]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [summary, detailed]
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statements retrieved successfully
 */
router.get('/patient/:patientId/statements',
    ValidationMiddleware.validatePositiveIntegerParam('patientId'),
    asyncHandler(getPatientStatements)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/patient/{patientId}/statements/{statementId}/download:
 *   get:
 *     summary: Download patient statement
 *     tags: [Enhanced RCM - Patient Portal]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: statementId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, html]
 *           default: pdf
 *     responses:
 *       200:
 *         description: Statement downloaded successfully
 */
router.get('/patient/:patientId/statements/:statementId/download',
    ValidationMiddleware.validatePositiveIntegerParam('patientId'),
    ValidationMiddleware.validatePositiveIntegerParam('statementId'),
    asyncHandler(downloadPatientStatement)
);

// =====================================================
// PERFORMANCE MONITORING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/performance/metrics:
 *   get:
 *     summary: Get comprehensive performance metrics
 *     tags: [Enhanced RCM - Performance]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [15m, 30m, 1h, 6h, 12h, 24h, 7d]
 *           default: 1h
 *     responses:
 *       200:
 *         description: Performance metrics retrieved
 */
router.get('/performance/metrics',
    requireRole(['admin', 'manager']),
    asyncHandler(getPerformanceMetrics)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/performance/alert:
 *   post:
 *     summary: Create performance alert
 *     tags: [Enhanced RCM - Performance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - message
 *               - severity
 *             properties:
 *               type:
 *                 type: string
 *               message:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               metric_value:
 *                 type: number
 *               threshold_value:
 *                 type: number
 *     responses:
 *       200:
 *         description: Performance alert created
 */
router.post('/performance/alert',
    requireRole(['admin', 'manager']),
    sanitizationMiddleware,
    asyncHandler(createPerformanceAlert)
);

// =====================================================
// ADVANCED REPORTING ROUTES
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/reports/business-intelligence:
 *   post:
 *     summary: Generate comprehensive business intelligence report
 *     tags: [Enhanced RCM - Reporting]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               report_type:
 *                 type: string
 *                 enum: [financial, operational, compliance, analytics]
 *                 default: financial
 *               timeframe:
 *                 type: string
 *                 enum: [7d, 30d, 90d, 1y]
 *                 default: 30d
 *               include_comparisons:
 *                 type: boolean
 *                 default: true
 *               include_forecasts:
 *                 type: boolean
 *                 default: true
 *               group_by:
 *                 type: string
 *                 enum: [day, week, month, quarter]
 *                 default: month
 *               filters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Business intelligence report generated
 */
router.post('/reports/business-intelligence',
    requireRole(['admin', 'manager']),
    sanitizationMiddleware,
    asyncHandler(generateBusinessIntelligenceReport)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/reports/custom:
 *   post:
 *     summary: Create custom report
 *     tags: [Enhanced RCM - Reporting]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - data_source
 *               - metrics
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               data_source:
 *                 type: string
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *               dimensions:
 *                 type: array
 *                 items:
 *                   type: string
 *               filters:
 *                 type: object
 *               visualizations:
 *                 type: array
 *               schedule:
 *                 type: object
 *     responses:
 *       200:
 *         description: Custom report created successfully
 */
router.post('/reports/custom',
    requireRole(['admin', 'manager']),
    sanitizationMiddleware,
    asyncHandler(createCustomReport)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/reports/{reportId}/export:
 *   get:
 *     summary: Export report in specified format
 *     tags: [Enhanced RCM - Reporting]
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [pdf, excel, csv, json]
 *           default: pdf
 *     responses:
 *       200:
 *         description: Report exported successfully
 */
router.get('/reports/:reportId/export',
    requireRole(['admin', 'manager']),
    asyncHandler(exportReport)
);

/**
 * @swagger
 * /api/v1/rcm/enhanced/reports/scheduled/generate:
 *   post:
 *     summary: Generate all scheduled reports
 *     tags: [Enhanced RCM - Reporting]
 *     responses:
 *       200:
 *         description: Scheduled reports generated
 */
router.post('/reports/scheduled/generate',
    requireRole(['admin']),
    asyncHandler(generateScheduledReports)
);

// =====================================================
// HEALTH CHECK ROUTE
// =====================================================

/**
 * @swagger
 * /api/v1/rcm/enhanced/health:
 *   get:
 *     summary: Enhanced health check for all RCM services
 *     tags: [Enhanced RCM - Health]
 *     responses:
 *       200:
 *         description: Enhanced RCM services are healthy
 */
router.get('/health',
    asyncHandler(enhancedHealthCheck)
);

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

router.use((error, req, res, next) => {
    console.error('Enhanced RCM Route Error:', error);

    if (error.isOperational) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    if (error.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.details
        });
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

module.exports = router;