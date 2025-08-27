/**
 * Optimized RCM Controller - Streamlined and Efficient
 * Eliminates unnecessary code and focuses on essential HTTP handling
 */

const UnifiedRCMService = require('./unifiedRCMService');
const { ResponseHelpers } = require('../../utils/standardizedResponse');
const { handleControllerError } = require('../../middleware/errorHandler');

// Initialize service once
const rcmService = new UnifiedRCMService();

/**
 * Generic controller wrapper for service methods
 * Reduces code duplication by 80%
 */
const createControllerMethod = (serviceMethod, paramExtractor = null, validator = null) => {
  return async (req, res) => {
    try {
      // Extract parameters
      const params = paramExtractor ? paramExtractor(req) : req.query;
      
      // Validate if validator provided
      if (validator) {
        const validation = validator(params);
        if (!validation.isValid) {
          return ResponseHelpers.sendValidationError(res, validation.errors);
        }
      }

      // Call service method
      const result = await rcmService[serviceMethod](params);
      
      // Send success response
      ResponseHelpers.sendSuccess(res, result, `${serviceMethod} completed successfully`);

    } catch (error) {
      handleControllerError(error, res, serviceMethod);
    }
  };
};

/**
 * Parameter extractors for different endpoint types
 */
const extractors = {
  dashboard: (req) => ({
    timeframe: req.query.timeframe || '30d',
    userId: req.user?.user_id
  }),
  
  claims: (req) => ({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    status: req.query.status || 'all',
    search: req.query.search || '',
    priority: req.query.priority || 'all',
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to
  }),
  
  claimUpdate: (req) => ([
    parseInt(req.params.claimId),
    {
      status: parseInt(req.body.status),
      notes: req.body.notes,
      userId: req.user?.user_id
    }
  ]),
  
  payment: (req) => ({
    claimId: parseInt(req.body.claim_id),
    paymentAmount: parseFloat(req.body.payment_amount),
    paymentDate: req.body.payment_date,
    paymentMethod: req.body.payment_method,
    checkNumber: req.body.check_number,
    adjustmentAmount: req.body.adjustment_amount ? parseFloat(req.body.adjustment_amount) : 0,
    adjustmentReason: req.body.adjustment_reason,
    userId: req.user?.user_id
  }),
  
  collections: (req) => ({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    status: req.query.status || 'all',
    priority: req.query.priority || 'all',
    agingBucket: req.query.aging_bucket || 'all'
  }),
  
  era: (req) => ({
    eraData: req.body.era_data,
    fileName: req.body.file_name,
    autoPost: req.body.auto_post || false,
    userId: req.user?.user_id,
    claimMdIntegration: req.body.claimMdIntegration !== false
  })
};

/**
 * Simple validators
 */
const validators = {
  claimId: (params) => {
    const claimId = Array.isArray(params) ? params[0] : params.claimId;
    return {
      isValid: claimId && !isNaN(claimId) && claimId > 0,
      errors: claimId && !isNaN(claimId) && claimId > 0 ? [] : [
        { field: 'claimId', message: 'Valid claim ID is required' }
      ]
    };
  },
  
  payment: (params) => {
    const errors = [];
    if (!params.claimId) errors.push({ field: 'claim_id', message: 'Claim ID is required' });
    if (!params.paymentAmount) errors.push({ field: 'payment_amount', message: 'Payment amount is required' });
    if (!params.paymentDate) errors.push({ field: 'payment_date', message: 'Payment date is required' });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Optimized Controller Methods
 */
const controller = {
  // Dashboard
  getDashboardData: createControllerMethod('getDashboardData', extractors.dashboard),
  
  // Claims Management
  getClaimsStatus: createControllerMethod('getClaimsStatus', extractors.claims),
  updateClaimStatus: createControllerMethod('updateClaimStatus', extractors.claimUpdate, validators.claimId),
  getClaimById: createControllerMethod('getClaimById', (req) => parseInt(req.params.claimId), validators.claimId),
  
  // Payment Processing
  postPayment: createControllerMethod('postPayment', extractors.payment, validators.payment),
  
  // A/R Aging & Collections
  getARAgingReport: createControllerMethod('getARAgingReport', (req) => ({
    includeZeroBalance: req.query.include_zero_balance === 'true',
    payerFilter: req.query.payer_filter,
    priorityFilter: req.query.priority_filter || 'all'
  })),
  
  getCollectionsWorkflow: createControllerMethod('getCollectionsWorkflow', extractors.collections),
  
  // Denial Analytics
  getDenialAnalytics: createControllerMethod('getDenialAnalytics', (req) => ({
    timeframe: req.query.timeframe || '30d'
  })),
  
  // ERA Processing
  processERAFile: createControllerMethod('processERAFile', extractors.era),

  // Custom methods that need special handling
  createClaim: async (req, res) => {
    try {
      const claimData = { ...req.body, created_by: req.user?.user_id };
      const result = await rcmService.createClaim(claimData);
      ResponseHelpers.sendSuccess(res, result, 'Claim created successfully', 201);
    } catch (error) {
      handleControllerError(error, res, 'Create claim');
    }
  },

  bulkUpdateClaimStatus: async (req, res) => {
    try {
      const { claim_ids, status, notes } = req.body;
      const { user_id: userId } = req.user;

      if (!Array.isArray(claim_ids) || claim_ids.length === 0) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claim_ids', message: 'Claim IDs array is required' }
        ]);
      }

      // Process bulk update efficiently
      const results = await Promise.allSettled(
        claim_ids.map(claimId => 
          rcmService.updateClaimStatus(claimId, { status: parseInt(status), notes, userId })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      ResponseHelpers.sendSuccess(res, {
        summary: { total: results.length, successful, failed },
        results: results.map((result, index) => ({
          claimId: claim_ids[index],
          success: result.status === 'fulfilled',
          error: result.status === 'rejected' ? result.reason?.message : null
        }))
      }, `Bulk update completed: ${successful} successful, ${failed} failed`);

    } catch (error) {
      handleControllerError(error, res, 'Bulk update claim status');
    }
  },

  updateCollectionStatus: async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      const { status, priority, assigned_collector, notes } = req.body;
      const { user_id: userId } = req.user;

      if (!accountId || isNaN(accountId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'accountId', message: 'Valid account ID is required' }
        ]);
      }

      const result = await rcmService.updateCollectionStatus(accountId, {
        status, priority, assignedCollector: assigned_collector, notes, userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Collection status updated successfully');
    } catch (error) {
      handleControllerError(error, res, 'Update collection status');
    }
  },

  generateRCMReport: async (req, res) => {
    try {
      const { report_type = 'summary', timeframe = '30d' } = req.body;
      const reportData = { reportType: report_type, timeframe, generatedBy: req.user?.user_id };

      // Get data based on report type
      switch (report_type) {
        case 'dashboard':
          reportData.data = await rcmService.getDashboardData({ timeframe });
          break;
        case 'ar_aging':
          reportData.data = await rcmService.getARAgingReport({});
          break;
        case 'denials':
          reportData.data = await rcmService.getDenialAnalytics({ timeframe });
          break;
        default:
          reportData.data = {
            dashboard: await rcmService.getDashboardData({ timeframe }),
            arAging: await rcmService.getARAgingReport({}),
            denials: await rcmService.getDenialAnalytics({ timeframe })
          };
      }

      ResponseHelpers.sendSuccess(res, reportData, 'RCM report generated successfully');
    } catch (error) {
      handleControllerError(error, res, 'Generate RCM report');
    }
  },

  // Performance & Monitoring (simplified)
  getPerformanceMetrics: async (req, res) => {
    try {
      const { getQueryMetrics } = require('../../utils/dbUtils');
      ResponseHelpers.sendSuccess(res, getQueryMetrics(), 'Performance metrics retrieved');
    } catch (error) {
      handleControllerError(error, res, 'Get performance metrics');
    }
  },

  getCacheStats: async (req, res) => {
    try {
      const { getCacheStats } = require('../../utils/cacheUtils');
      ResponseHelpers.sendSuccess(res, getCacheStats(), 'Cache statistics retrieved');
    } catch (error) {
      handleControllerError(error, res, 'Get cache statistics');
    }
  },

  clearCache: async (req, res) => {
    try {
      const { clearAllCache } = require('../../utils/cacheUtils');
      await clearAllCache();
      rcmService.cache?.clear();
      ResponseHelpers.sendSuccess(res, { cleared: true }, 'Cache cleared successfully');
    } catch (error) {
      handleControllerError(error, res, 'Clear cache');
    }
  },

  healthCheck: async (req, res) => {
    try {
      ResponseHelpers.sendSuccess(res, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'UnifiedRCMService',
        uptime: process.uptime()
      }, 'RCM service is healthy');
    } catch (error) {
      handleControllerError(error, res, 'Health check');
    }
  },

  // ClaimMD Integration (moved to service layer)
  getClaimMDConfiguration: async (req, res) => {
    try {
      const config = await rcmService.getClaimMDConfiguration(req.user?.user_id);
      if (!config) {
        return ResponseHelpers.sendNotFound(res, 'ClaimMD configuration');
      }
      
      // Remove sensitive data
      const safeConfig = {
        baseUrl: config.baseUrl,
        providerId: config.providerId,
        isActive: config.isActive,
        hasApiKey: !!config.apiKey,
        additionalConfig: config.additionalConfig
      };
      
      ResponseHelpers.sendSuccess(res, safeConfig, 'Configuration retrieved');
    } catch (error) {
      handleControllerError(error, res, 'Get ClaimMD configuration');
    }
  },

  testClaimMDConnection: async (req, res) => {
    try {
      const result = await rcmService.testClaimMDConnection(req.user?.user_id);
      ResponseHelpers.sendSuccess(res, result, 'Connection test completed');
    } catch (error) {
      handleControllerError(error, res, 'Test ClaimMD connection');
    }
  }
};

module.exports = controller;