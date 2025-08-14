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

module.exports = router;