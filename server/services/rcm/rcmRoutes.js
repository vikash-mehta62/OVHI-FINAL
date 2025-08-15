const express = require('express');
const router = express.Router();

const {
  getRCMDashboardData,
  getClaimsStatus,
  updateClaimStatus,
  getARAgingReport,
  getDenialAnalytics,
  getPaymentPostingData,
  processERAFile,
  getRevenueForecasting,
  getCollectionsWorkflow,
  updateCollectionStatus,
  getRCMAnalytics,
  getClaimDetails,
  bulkClaimStatusUpdate,
  generateRCMReport,
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
router.get('/dashboard', getRCMDashboardData);
router.get('/analytics', getRCMAnalytics);
router.get('/revenue-forecasting', getRevenueForecasting);
router.get('/payer-performance', getPayerPerformance);

// Claims Management
router.get('/claims', getClaimsStatus);
router.get('/claims/:claimId', getClaimDetails);
router.post('/claims/bulk-update', bulkClaimStatusUpdate);
router.put('/claims/:claimId/status', updateClaimStatus);

// ClaimMD Integration
router.get('/claimmd/status/:trackingId', getClaimMDStatus);
router.post('/claimmd/sync', syncClaimMDData);

// A/R Aging and Collections
router.get('/ar-aging', getARAgingReport);
router.get('/ar-aging/:accountId', getARAccountDetails);
router.post('/ar-aging/:accountId/follow-up', initiateAutomatedFollowUp);
router.post('/ar-aging/:accountId/payment-plan', setupPaymentPlan);

// Collections Workflow
router.get('/collections', getCollectionsWorkflow);
router.put('/collections/:accountId/status', updateCollectionStatus);

// Denials Management
router.get('/denials/analytics', getDenialAnalytics);
router.get('/denials/trends', getDenialTrends);

// Payment Posting and ERA
router.get('/payments', getPaymentPostingData);
router.post('/payments/era/process', processERAFile);

// Reports
router.post('/reports/generate', generateRCMReport);

// Enhanced Features - Claim Validation and Suggestions
router.get('/claims/:claimId/validate', validateClaim);
router.get('/patients/:patientId/claim-suggestions', getClaimSuggestions);
router.get('/auto-corrections', getAutoCorrections);

// Patient Statements
router.post('/patients/:patientId/statements/generate', generatePatientStatement);
router.get('/statements', getPatientStatements);
router.post('/statements/:statementId/send', sendPatientStatement);

// ERA Processing
router.post('/era/process', processERAFile2);
router.get('/era/files', getERAFiles);
router.get('/era/:era_id/details', getERAPaymentDetails);
router.post('/era/payments/:era_detail_id/post', manualPostERAPayment);

// Office Payments
router.get('/payments/office', getOfficePayments);
router.post('/payments/office/record', recordOfficePayment);

module.exports = router;