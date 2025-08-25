/**
 * Legacy RCM Controller - Refactored to use Service Pattern
 * This file maintains backward compatibility while delegating to the new service-based controller
 */

const rcmController = require('./rcmController');
const { handleControllerError } = require('../../middleware/errorHandler');

// Dashboard Data - Delegated to new service-based controller
const getRCMDashboardData = rcmController.getDashboardData;

// Claims Status Tracking - Delegated to new service-based controller
const getClaimsStatus = rcmController.getClaimsStatus;

// A/R Aging Report - Delegated to new service-based controller
const getARAgingReport = rcmController.getARAgingReport;

// Denial Analytics - Delegated to new service-based controller
const getDenialAnalytics = rcmController.getDenialAnalytics;

// Update Claim Status - Delegated to new service-based controller
const updateClaimStatus = rcmController.updateClaimStatus;

// Bulk Claim Status Update - Delegated to new service-based controller
const bulkClaimStatusUpdate = rcmController.bulkUpdateClaimStatus;

// Get detailed claim information - Delegated to new service-based controller
const getClaimDetails = rcmController.getClaimDetails;

// Generate comprehensive RCM report - Delegated to new service-based controller
const generateRCMReport = rcmController.generateRCMReport;

/**
 * Legacy functions that need custom implementation or are not yet migrated
 */

// Payment Posting Data - Delegated to new service-based controller
const getPaymentPostingData = rcmController.getPaymentPostingData;

// Revenue Forecasting
const getRevenueForecasting = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'Revenue forecasting endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get revenue forecasting');
  }
};

// Collections Workflow - Delegated to new service-based controller
const getCollectionsWorkflow = rcmController.getCollectionsWorkflow;

// Process ERA (Electronic Remittance Advice) file - Delegated to new service-based controller
const processERAFile = rcmController.processERAFile;

// Update collection status for an account - Delegated to new service-based controller
const updateCollectionStatus = rcmController.updateCollectionStatus;

// Get comprehensive RCM analytics
const getRCMAnalytics = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'RCM analytics endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get RCM analytics');
  }
};

// Get payer performance analytics
const getPayerPerformance = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'Payer performance endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get payer performance');
  }
};

// Get denial trends analysis
const getDenialTrends = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'Denial trends endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get denial trends');
  }
};

// Get detailed A/R account information
const getARAccountDetails = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'A/R account details endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get A/R account details');
  }
};

// Initiate automated follow-up for A/R accounts
const initiateAutomatedFollowUp = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'Automated follow-up endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Initiate automated follow-up');
  }
};

// Setup payment plan for patient
const setupPaymentPlan = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'Payment plan setup endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Setup payment plan');
  }
};

// Get ClaimMD status for claims
const getClaimMDStatus = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'ClaimMD status endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Get ClaimMD status');
  }
};

// Sync data with ClaimMD
const syncClaimMDData = async (req, res) => {
  try {
    // This function needs custom implementation as it's not in the new service yet
    res.status(501).json({
      success: false,
      message: 'ClaimMD sync endpoint is being migrated to new service pattern'
    });
  } catch (error) {
    handleControllerError(error, res, 'Sync ClaimMD data');
  }
};

module.exports = {
  // Core RCM functions - delegated to new service-based controller
  getRCMDashboardData,
  getClaimsStatus,
  getARAgingReport,
  getDenialAnalytics,
  updateClaimStatus,
  bulkClaimStatusUpdate,
  getClaimDetails,
  generateRCMReport,
  
  // Legacy functions - to be migrated
  getPaymentPostingData,
  getRevenueForecasting,
  getCollectionsWorkflow,
  processERAFile,
  updateCollectionStatus,
  getRCMAnalytics,
  getPayerPerformance,
  getDenialTrends,
  getARAccountDetails,
  initiateAutomatedFollowUp,
  setupPaymentPlan,
  getClaimMDStatus,
  syncClaimMDData
};