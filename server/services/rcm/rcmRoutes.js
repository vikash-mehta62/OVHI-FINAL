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

// Import integration management service
const IntegrationManagementService = require('./integrationManagementService');
const integrationManagementService = new IntegrationManagementService();

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
// router.post('/claims/validate',
//   sanitizationMiddleware,
//   ValidationMiddleware.validateCreateClaim,
//   rcmController.validateClaim
// );
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

// CMS Validation endpoints
router.post('/claims/:claimId/validate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.validateClaim
);
router.post('/claims/validate',
  sanitizationMiddleware,
  rcmController.validateClaimData
);
router.post('/cms/npi/validate',
  sanitizationMiddleware,
  rcmController.validateNPI
);
router.post('/cms/ncci/check',
  sanitizationMiddleware,
  rcmController.checkNCCIEdits
);
router.get('/cms/validation-rules',
  rcmController.getCMSValidationRules
);
router.post('/claims/batch-validate',
  sanitizationMiddleware,
  rcmController.batchValidateClaims
);
router.get('/validation/statistics',
  rcmController.getValidationStatistics
);
router.post('/cms/taxonomy/validate',
  sanitizationMiddleware,
  rcmController.validateTaxonomyCode
);

// Advanced CMS Validation endpoints
router.post('/claims/:claimId/validate/advanced',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.performAdvancedValidation
);
router.get('/claims/:claimId/validation/history',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getValidationHistory
);
router.post('/claims/batch-validate/advanced',
  sanitizationMiddleware,
  rcmController.batchAdvancedValidation
);
router.get('/validation/advanced/statistics',
  rcmController.getAdvancedValidationStatistics
);
router.post('/cms/medical-necessity/validate',
  sanitizationMiddleware,
  rcmController.validateMedicalNecessity
);
router.post('/cms/timely-filing/validate',
  sanitizationMiddleware,
  rcmController.validateTimelyFiling
);
router.post('/cms/provider-enrollment/validate',
  sanitizationMiddleware,
  rcmController.validateProviderEnrollment
);
router.post('/cms/frequency-limits/validate',
  sanitizationMiddleware,
  rcmController.validateFrequencyLimits
);
router.post('/cms/payer-compliance/validate',
  sanitizationMiddleware,
  rcmController.validatePayerCompliance
);
router.post('/cms/claim-completeness/validate',
  sanitizationMiddleware,
  rcmController.validateClaimCompleteness
);

// Compliance Monitoring endpoints
router.get('/compliance/dashboard',
  cacheMiddleware({
    namespace: 'compliance',
    ttl: 300, // 5 minutes
    varyBy: ['user-id']
  }),
  rcmController.getComplianceDashboard
);
router.get('/compliance/monitor',
  cacheMiddleware({
    namespace: 'compliance',
    ttl: 180, // 3 minutes
    varyBy: ['user-id']
  }),
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceMonitor
);
router.get('/compliance/metrics',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceMetrics
);
router.get('/compliance/alerts',
  rcmController.getComplianceAlerts
);
router.post('/compliance/alerts/bulk-acknowledge',
  sanitizationMiddleware,
  rcmController.bulkAcknowledgeAlerts
);
router.get('/compliance/trends',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceTrends
);
router.get('/compliance/risk-assessment',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getRiskAssessment
);
router.get('/compliance/reports',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.generateComplianceReport
);
router.post('/compliance/reports/export',
  sanitizationMiddleware,
  rcmController.exportComplianceReport
);
router.post('/compliance/reports/schedule',
  sanitizationMiddleware,
  rcmController.scheduleComplianceReport
);
router.post('/compliance/alerts/:alertId/acknowledge',
  ValidationMiddleware.validatePositiveIntegerParam('alertId'),
  sanitizationMiddleware,
  rcmController.acknowledgeComplianceAlert
);
router.get('/compliance/statistics',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceStatistics
);
router.get('/compliance/analytics',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceAnalytics
);

// Audit Trail endpoints for regulatory reviews
router.get('/compliance/audit-trail',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceAuditTrail
);
router.get('/compliance/audit-trail/:claimId',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getClaimAuditTrail
);
router.post('/compliance/audit-trail/export',
  sanitizationMiddleware,
  rcmController.exportAuditTrail
);
router.get('/compliance/regulatory-reviews',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getRegulatoryReviews
);
router.post('/compliance/regulatory-reviews',
  sanitizationMiddleware,
  rcmController.createRegulatoryReview
);
router.put('/compliance/regulatory-reviews/:reviewId',
  ValidationMiddleware.validatePositiveIntegerParam('reviewId'),
  sanitizationMiddleware,
  rcmController.updateRegulatoryReview
);

// Advanced Compliance Analytics
router.get('/compliance/performance-metrics',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getCompliancePerformanceMetrics
);
router.get('/compliance/benchmarks',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getComplianceBenchmarks
);
router.get('/compliance/predictions',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getCompliancePredictions
);
router.post('/compliance/thresholds',
  sanitizationMiddleware,
  rcmController.updateComplianceThresholds
);
router.get('/compliance/notifications',
  rcmController.getComplianceNotifications
);
router.post('/compliance/notifications/settings',
  sanitizationMiddleware,
  rcmController.updateNotificationSettings
);

// External System Integration endpoints
router.post('/integrations/eligibility/verify',
  sanitizationMiddleware,
  rcmController.verifyPatientEligibility
);
router.post('/integrations/prior-auth/submit',
  sanitizationMiddleware,
  rcmController.submitPriorAuthorization
);
router.post('/claims/:claimId/submit/clearinghouse',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  rcmController.submitClaimToClearinghouse
);
router.post('/integrations/claims/batch-submit',
  sanitizationMiddleware,
  rcmController.batchSubmitClaims
);
router.post('/integrations/payer/status-inquiry',
  sanitizationMiddleware,
  rcmController.queryPayerClaimStatus
);
router.post('/integrations/era/process',
  sanitizationMiddleware,
  rcmController.processERAFile
);
router.get('/integrations/status',
  rcmController.getIntegrationStatus
);
router.post('/integrations/:integrationId/test',
  sanitizationMiddleware,
  rcmController.testIntegrationConnection
);
router.get('/integrations/logs',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getIntegrationLogs
);
router.get('/integrations/performance',
  ValidationMiddleware.validateGetDashboardQuery,
  rcmController.getIntegrationPerformanceMetrics
);

// Additional History endpoints
router.get('/history/recent',
  rcmController.getRecentActivity
);
router.get('/history/statistics',
  rcmController.getClaimHistoryStats
);

// Enhanced endpoints with comprehensive logging
router.put('/claims/:claimId/status/enhanced',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  rcmController.updateClaimStatusEnhanced
);
router.post('/payments/post/enhanced',
  sanitizationMiddleware,
  rcmController.postPaymentEnhanced
);

// Comment endpoints
router.get('/claims/:claimId/comments',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getClaimComments
);
router.post('/claims/:claimId/comments',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  sanitizationMiddleware,
  rcmController.createComment
);
router.put('/comments/:commentId',
  ValidationMiddleware.validatePositiveIntegerParam('commentId'),
  sanitizationMiddleware,
  rcmController.updateComment
);
router.delete('/comments/:commentId',
  ValidationMiddleware.validatePositiveIntegerParam('commentId'),
  rcmController.deleteComment
);
router.get('/comments/:commentId/replies',
  ValidationMiddleware.validatePositiveIntegerParam('commentId'),
  rcmController.getCommentReplies
);
router.get('/comments/search',
  rcmController.searchComments
);
router.get('/comments/statistics',
  rcmController.getCommentStatistics
);

// Follow-up endpoints
router.get('/followups',
  rcmController.getFollowUps
);
router.get('/claims/:claimId/followups',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getClaimFollowUps
);
router.post('/followups',
  sanitizationMiddleware,
  rcmController.createFollowUp
);
router.put('/followups/:followUpId',
  ValidationMiddleware.validatePositiveIntegerParam('followUpId'),
  sanitizationMiddleware,
  rcmController.updateFollowUp
);
router.post('/followups/:followUpId/complete',
  ValidationMiddleware.validatePositiveIntegerParam('followUpId'),
  sanitizationMiddleware,
  rcmController.completeFollowUp
);
router.delete('/followups/:followUpId',
  ValidationMiddleware.validatePositiveIntegerParam('followUpId'),
  rcmController.deleteFollowUp
);
router.get('/followups/statistics',
  rcmController.getFollowUpStatistics
);
router.get('/followups/calendar',
  rcmController.getFollowUpCalendarEvents
);
router.get('/followups/search',
  rcmController.searchFollowUps
);
router.post('/admin/followups/process-overdue',
  rcmController.processOverdueFollowUps
);
router.post('/admin/followups/send-reminders',
  rcmController.sendFollowUpReminders
);

// CMS-1500 Form Generation endpoints
router.get('/claims/:claimId/cms1500/generate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.generateCMS1500Form
);
router.get('/claims/:claimId/cms1500/preview',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.previewCMS1500Form
);
router.post('/forms/cms1500/batch',
  sanitizationMiddleware,
  rcmController.batchGenerateCMS1500Forms
);
router.get('/claims/:claimId/cms1500/validate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.validateCMS1500Data
);
router.get('/claims/:claimId/cms1500/history',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getCMS1500History
);

// UB-04 Form Generation endpoints
router.get('/claims/:claimId/ub04/generate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.generateUB04Form
);
router.get('/claims/:claimId/ub04/preview',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.previewUB04Form
);
router.post('/forms/ub04/batch',
  sanitizationMiddleware,
  rcmController.batchGenerateUB04Forms
);
router.get('/claims/:claimId/ub04/validate',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.validateUB04Data
);
router.get('/claims/:claimId/ub04/history',
  ValidationMiddleware.validatePositiveIntegerParam('claimId'),
  rcmController.getUB04History
);
router.post('/ub04/validate-revenue-code',
  sanitizationMiddleware,
  rcmController.validateRevenueCode
);
router.post('/ub04/validate-bill-type',
  sanitizationMiddleware,
  rcmController.validateBillType
);
// Integration Management endpoints
router.get('/integrations',
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.getAllIntegrations();
    res.json(result);
  })
);

router.get('/integrations/metrics',
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.getIntegrationMetrics();
    res.json(result);
  })
);

router.get('/integrations/:integrationId/config',
  ValidationMiddleware.validatePositiveIntegerParam('integrationId'),
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.getIntegrationConfiguration(req.params.integrationId);
    res.json(result);
  })
);

router.put('/integrations/:integrationId/config',
  ValidationMiddleware.validatePositiveIntegerParam('integrationId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const config = { ...req.body.config, updatedBy: req.user?.user_id };
    const result = await integrationManagementService.updateIntegrationConfiguration(req.params.integrationId, config);
    res.json(result);
  })
);

router.post('/integrations/:integrationId/test',
  ValidationMiddleware.validatePositiveIntegerParam('integrationId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.testIntegrationConnection(req.params.integrationId, req.body.config);
    res.json(result);
  })
);

router.get('/integrations/health',
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.getIntegrationHealth(req.query.id);
    res.json(result);
  })
);

router.get('/integrations/performance',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const result = await integrationManagementService.getPerformanceMetrics(req.query.id, req.query.range);
    res.json(result);
  })
);

router.get('/integrations/audit',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const filters = {
      integrationId: req.query.integrationId,
      actionType: req.query.actionType,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      userId: req.query.userId,
      search: req.query.search
    };
    
    const pagination = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50
    };
    
    const result = await integrationManagementService.getAuditTrail(filters, pagination);
    res.json(result);
  })
);

router.get('/integrations/audit/export',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const filters = {
      integrationId: req.query.integrationId,
      actionType: req.query.actionType,
      status: req.query.status,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      userId: req.query.userId,
      search: req.query.search
    };
    
    const result = await integrationManagementService.exportMonitoringData(req.query.format, filters);
    
    if (result.success) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="integration-audit.csv"');
      res.send(result.data);
    } else {
      res.status(500).json(result);
    }
  })
);

router.get('/integrations/monitoring/export',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const filters = {
      integrationId: req.query.id,
      timeRange: req.query.range
    };
    
    const result = await integrationManagementService.exportMonitoringData('csv', filters);
    
    if (result.success) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="integration-monitoring.csv"');
      res.send(result.data);
    } else {
      res.status(500).json(result);
    }
  })
);
// Comprehensive Reporting endpoints
const ComprehensiveReportingService = require('./comprehensiveReportingService');
const comprehensiveReportingService = new ComprehensiveReportingService();

router.get('/reports/templates',
  asyncHandler(async (req, res) => {
    const result = await comprehensiveReportingService.getReportTemplates();
    res.json(result);
  })
);

router.post('/reports/generate/:reportType',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const filters = req.body;
    
    let result;
    switch (reportType) {
      case 'cms_compliance':
        result = await comprehensiveReportingService.generateCMSComplianceReport(filters);
        break;
      case 'performance_analytics':
        result = await comprehensiveReportingService.generatePerformanceAnalyticsReport(filters);
        break;
      case 'denial_analysis':
        result = await comprehensiveReportingService.generateDenialAnalysisReport(filters);
        break;
      case 'payer_performance':
        result = await comprehensiveReportingService.generatePayerPerformanceReport(filters);
        break;
      default:
        result = { success: false, error: 'Unknown report type' };
    }
    
    res.json(result);
  })
);

router.post('/reports/custom',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const reportConfig = req.body;
    const result = await comprehensiveReportingService.buildCustomReport(reportConfig);
    res.json(result);
  })
);

router.post('/reports/export/:reportType',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { reportType } = req.params;
    const { format = 'csv' } = req.query;
    const filters = req.body;
    
    // Generate report data first
    let reportResult;
    switch (reportType) {
      case 'cms_compliance':
        reportResult = await comprehensiveReportingService.generateCMSComplianceReport(filters);
        break;
      case 'performance_analytics':
        reportResult = await comprehensiveReportingService.generatePerformanceAnalyticsReport(filters);
        break;
      case 'denial_analysis':
        reportResult = await comprehensiveReportingService.generateDenialAnalysisReport(filters);
        break;
      case 'payer_performance':
        reportResult = await comprehensiveReportingService.generatePayerPerformanceReport(filters);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Unknown report type' });
    }
    
    if (!reportResult.success) {
      return res.status(500).json(reportResult);
    }
    
    // Export the data
    const exportResult = await comprehensiveReportingService.exportReportData(
      reportType, 
      reportResult.report, 
      format
    );
    
    if (exportResult.success) {
      res.setHeader('Content-Type', exportResult.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      res.send(exportResult.data);
    } else {
      res.status(500).json(exportResult);
    }
  })
);

router.get('/reports/metrics',
  asyncHandler(async (req, res) => {
    // Mock metrics for now - would be implemented with actual data
    const metrics = {
      totalReports: 156,
      scheduledReports: 12,
      reportsThisMonth: 23,
      avgGenerationTime: 4.2
    };
    
    res.json({ success: true, metrics });
  })
);

router.get('/reports/data-sources',
  asyncHandler(async (req, res) => {
    // Mock data sources for custom report builder
    const dataSources = [
      {
        id: 'billings',
        name: 'Claims/Billings',
        table: 'billings',
        description: 'Main claims and billing data',
        columns: [
          { name: 'id', type: 'int', description: 'Claim ID', nullable: false },
          { name: 'patient_id', type: 'int', description: 'Patient ID', nullable: false },
          { name: 'provider_id', type: 'int', description: 'Provider ID', nullable: false },
          { name: 'payer_id', type: 'int', description: 'Payer ID', nullable: true },
          { name: 'amount', type: 'decimal', description: 'Claim amount', nullable: false },
          { name: 'status', type: 'string', description: 'Claim status', nullable: false },
          { name: 'created_at', type: 'datetime', description: 'Creation date', nullable: false },
          { name: 'cpt_code', type: 'string', description: 'CPT code', nullable: true },
          { name: 'icd_code', type: 'string', description: 'ICD code', nullable: true }
        ]
      },
      {
        id: 'patients',
        name: 'Patients',
        table: 'patients',
        description: 'Patient demographic data',
        columns: [
          { name: 'id', type: 'int', description: 'Patient ID', nullable: false },
          { name: 'name', type: 'string', description: 'Patient name', nullable: false },
          { name: 'dob', type: 'date', description: 'Date of birth', nullable: false },
          { name: 'gender', type: 'string', description: 'Gender', nullable: true },
          { name: 'insurance_id', type: 'string', description: 'Insurance ID', nullable: true }
        ]
      },
      {
        id: 'providers',
        name: 'Providers',
        table: 'providers',
        description: 'Healthcare provider data',
        columns: [
          { name: 'id', type: 'int', description: 'Provider ID', nullable: false },
          { name: 'name', type: 'string', description: 'Provider name', nullable: false },
          { name: 'npi', type: 'string', description: 'NPI number', nullable: false },
          { name: 'specialty', type: 'string', description: 'Medical specialty', nullable: true },
          { name: 'taxonomy_code', type: 'string', description: 'Taxonomy code', nullable: true }
        ]
      }
    ];
    
    res.json({ success: true, dataSources });
  })
);

router.post('/reports/preview',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const reportConfig = req.body;
    
    // Limit preview to 10 records
    const previewConfig = { ...reportConfig, limit: 10 };
    const result = await comprehensiveReportingService.buildCustomReport(previewConfig);
    
    res.json(result);
  })
);
// Enhanced Reporting Dashboard endpoints
router.get('/reports/dashboard/metrics',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { range = '30d' } = req.query;
    
    // Mock dashboard metrics - would be implemented with actual data
    const metrics = {
      totalReports: 156,
      scheduledReports: 12,
      reportsThisMonth: 23,
      avgGenerationTime: 4.2,
      totalRevenue: 2450000,
      complianceRate: 96.5,
      denialRate: 4.2,
      collectionRate: 94.8
    };
    
    res.json({ success: true, metrics });
  })
);

router.get('/reports/dashboard/charts',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { metric = 'revenue', range = '30d' } = req.query;
    
    // Mock chart data - would be implemented with actual data
    const data = [
      { name: 'Jan', value: 245000, change: 5.2, trend: 'up' },
      { name: 'Feb', value: 267000, change: 8.9, trend: 'up' },
      { name: 'Mar', value: 289000, change: 8.2, trend: 'up' },
      { name: 'Apr', value: 278000, change: -3.8, trend: 'down' },
      { name: 'May', value: 295000, change: 6.1, trend: 'up' },
      { name: 'Jun', value: 312000, change: 5.8, trend: 'up' }
    ];
    
    res.json({ success: true, data });
  })
);

router.get('/reports/dashboard/recent',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    
    // Mock recent reports - would be implemented with actual data
    const reports = [
      {
        id: '1',
        name: 'Monthly CMS Compliance Report',
        type: 'cms_compliance',
        lastGenerated: new Date().toISOString(),
        status: 'completed',
        recordCount: 1250,
        insights: ['Compliance rate improved by 2.3%', 'Reduced validation errors by 15%']
      },
      {
        id: '2',
        name: 'Performance Analytics Dashboard',
        type: 'performance_analytics',
        lastGenerated: new Date(Date.now() - 3600000).toISOString(),
        status: 'completed',
        recordCount: 890,
        insights: ['Collection rate increased to 94.8%', 'Average payment time reduced by 3 days']
      }
    ];
    
    res.json({ success: true, reports: reports.slice(0, limit) });
  })
);

// Report Scheduling endpoints
router.get('/reports/schedules',
  asyncHandler(async (req, res) => {
    // Mock scheduled reports - would be implemented with actual data
    const schedules = [];
    
    res.json({ success: true, schedules });
  })
);

router.post('/reports/schedules',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const scheduleData = req.body;
    
    // Mock schedule creation - would be implemented with actual data
    const schedule = {
      id: Date.now().toString(),
      ...scheduleData,
      createdAt: new Date().toISOString(),
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    res.json({ success: true, schedule });
  })
);

router.put('/reports/schedules/:scheduleId',
  ValidationMiddleware.validatePositiveIntegerParam('scheduleId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const updateData = req.body;
    
    // Mock schedule update - would be implemented with actual data
    res.json({ success: true, message: 'Schedule updated successfully' });
  })
);

router.delete('/reports/schedules/:scheduleId',
  ValidationMiddleware.validatePositiveIntegerParam('scheduleId'),
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    
    // Mock schedule deletion - would be implemented with actual data
    res.json({ success: true, message: 'Schedule deleted successfully' });
  })
);

router.post('/reports/schedules/:scheduleId/toggle',
  ValidationMiddleware.validatePositiveIntegerParam('scheduleId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    const { isActive } = req.body;
    
    // Mock schedule toggle - would be implemented with actual data
    res.json({ success: true, message: `Schedule ${isActive ? 'activated' : 'deactivated'} successfully` });
  })
);

router.post('/reports/schedules/:scheduleId/run',
  ValidationMiddleware.validatePositiveIntegerParam('scheduleId'),
  asyncHandler(async (req, res) => {
    const { scheduleId } = req.params;
    
    // Mock immediate report run - would be implemented with actual data
    res.json({ success: true, message: 'Report generation started' });
  })
);

// Report Sharing endpoints
router.get('/reports/:reportId/shares',
  ValidationMiddleware.validatePositiveIntegerParam('reportId'),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    
    // Mock shared reports - would be implemented with actual data
    const shares = [];
    
    res.json({ success: true, shares });
  })
);

router.post('/reports/:reportId/share',
  ValidationMiddleware.validatePositiveIntegerParam('reportId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const shareData = req.body;
    
    // Mock report sharing - would be implemented with actual data
    const share = {
      id: Date.now().toString(),
      reportId,
      ...shareData,
      createdAt: new Date().toISOString()
    };
    
    res.json({ success: true, share });
  })
);

router.delete('/reports/shares/:shareId',
  ValidationMiddleware.validatePositiveIntegerParam('shareId'),
  asyncHandler(async (req, res) => {
    const { shareId } = req.params;
    
    // Mock share revocation - would be implemented with actual data
    res.json({ success: true, message: 'Share revoked successfully' });
  })
);

router.get('/reports/:reportId/comments',
  ValidationMiddleware.validatePositiveIntegerParam('reportId'),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    
    // Mock comments - would be implemented with actual data
    const comments = [];
    
    res.json({ success: true, comments });
  })
);

router.post('/reports/:reportId/comments',
  ValidationMiddleware.validatePositiveIntegerParam('reportId'),
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const commentData = req.body;
    
    // Mock comment creation - would be implemented with actual data
    const comment = {
      id: Date.now().toString(),
      reportId,
      ...commentData,
      createdAt: new Date().toISOString()
    };
    
    res.json({ success: true, comment });
  })
);

// Executive Summary endpoints
router.get('/reports/executive/metrics',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { range = '30d', comparison = 'previous_period' } = req.query;
    
    // Mock executive metrics - would be implemented with actual data
    const metrics = {
      totalRevenue: 2450000,
      revenueGrowth: 8.5,
      collectionRate: 94.8,
      collectionRateChange: 2.3,
      denialRate: 4.2,
      denialRateChange: -1.1,
      complianceScore: 96.5,
      complianceChange: 1.8,
      avgDaysToPayment: 28,
      paymentDaysChange: -3,
      totalClaims: 15420,
      claimsGrowth: 12.3,
      topPerformingProvider: 'Dr. Smith Medical Group',
      topPerformingPayer: 'Blue Cross Blue Shield'
    };
    
    res.json({ success: true, metrics });
  })
);

router.get('/reports/executive/kpi-trends',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { range = '30d' } = req.query;
    
    // Mock KPI trends - would be implemented with actual data
    const trends = [
      {
        name: 'Revenue Collection Rate',
        current: 94.8,
        previous: 92.5,
        change: 2.5,
        trend: 'up',
        target: 95.0,
        unit: 'percentage'
      },
      {
        name: 'Average Days to Payment',
        current: 28,
        previous: 31,
        change: -9.7,
        trend: 'up',
        target: 25,
        unit: 'days'
      }
    ];
    
    res.json({ success: true, trends });
  })
);

router.get('/reports/executive/insights',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { range = '30d' } = req.query;
    
    // Mock insights - would be implemented with actual data
    const insights = [
      {
        id: '1',
        type: 'success',
        title: 'Collection Rate Improvement',
        description: 'Collection rate has improved by 2.3% this month, exceeding the target.',
        impact: 'high',
        recommendation: 'Continue current collection strategies and consider expanding successful practices.',
        metric: 'Collection Rate',
        value: 94.8
      },
      {
        id: '2',
        type: 'warning',
        title: 'Denial Rate Trending Up',
        description: 'Denial rate has increased slightly in the past week, primarily due to coding issues.',
        impact: 'medium',
        recommendation: 'Review coding practices and provide additional training to staff.',
        metric: 'Denial Rate',
        value: 4.2
      }
    ];
    
    res.json({ success: true, insights });
  })
);

router.get('/reports/executive/highlights',
  ValidationMiddleware.validateGetDashboardQuery,
  asyncHandler(async (req, res) => {
    const { range = '30d' } = req.query;
    
    // Mock performance highlights - would be implemented with actual data
    const highlights = [
      {
        category: 'Revenue',
        metric: 'Monthly Revenue',
        value: '$2.45M',
        change: 8.5,
        status: 'excellent'
      },
      {
        category: 'Compliance',
        metric: 'CMS Compliance Score',
        value: '96.5%',
        change: 1.8,
        status: 'good'
      },
      {
        category: 'Collections',
        metric: 'Collection Rate',
        value: '94.8%',
        change: 2.3,
        status: 'excellent'
      },
      {
        category: 'Denials',
        metric: 'Denial Rate',
        value: '4.2%',
        change: -1.1,
        status: 'good'
      }
    ];
    
    res.json({ success: true, highlights });
  })
);

router.post('/reports/executive/export',
  sanitizationMiddleware,
  asyncHandler(async (req, res) => {
    const { range = '30d', format = 'pdf' } = req.query;
    
    // Mock executive summary export - would be implemented with actual PDF generation
    res.json({ success: true, message: 'Executive summary export would be generated here' });
  })
);

// Export the router
module.exports = router;