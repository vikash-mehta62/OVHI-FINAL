/**
 * Unified RCM Controller - Production Ready
 * Single controller that handles all RCM operations
 * Eliminates duplicate controller implementations
 */

const UnifiedRCMService = require('./unifiedRCMService');
const { ResponseHelpers } = require('../../utils/standardizedResponse');
const { handleControllerError } = require('../../middleware/errorHandler');
const { executeQuery } = require('../../utils/dbUtils');

// Initialize unified service
const rcmService = new UnifiedRCMService();

/**
 * Unified RCM Controller Class
 * Single source of truth for all RCM HTTP endpoints
 */
class UnifiedRCMController {
  constructor() {
    this.service = rcmService;
  }

  // =====================================================
  // DASHBOARD AND ANALYTICS
  // =====================================================

  /**
   * Get RCM dashboard data
   */
  async getDashboardData(req, res) {
    try {
      const { timeframe = '30d' } = req.query;
      const { user_id: userId } = req.user || {};

      const dashboardData = await this.service.getDashboardData({
        timeframe,
        userId
      });

      ResponseHelpers.sendSuccess(res, dashboardData, 'Dashboard data retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get dashboard data');
    }
  }

  // =====================================================
  // CLAIMS MANAGEMENT
  // =====================================================

  /**
   * Get claims with filtering and pagination
   */
  async getClaimsStatus(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'all',
        search = '',
        priority = 'all',
        date_from: dateFrom,
        date_to: dateTo
      } = req.query;

      const claimsData = await this.service.getClaimsStatus({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
        priority,
        dateFrom,
        dateTo
      });

      ResponseHelpers.sendSuccess(res, claimsData, 'Claims retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get claims status');
    }
  }

  /**
   * Create new claim
   */
  async createClaim(req, res) {
    try {
      const claimData = {
        ...req.body,
        created_by: req.user?.user_id
      };

      const newClaim = await this.service.createClaim(claimData);

      ResponseHelpers.sendSuccess(res, newClaim, 'Claim created successfully', ResponseStatusCodes.CREATED);

    } catch (error) {
      handleControllerError(error, res, 'Create claim');
    }
  }

  /**
   * Update claim status
   */
  async updateClaimStatus(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { status, notes } = req.body;
      const { user_id: userId } = req.user;

      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      if (![0, 1, 2, 3, 4].includes(parseInt(status))) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'status', message: 'Invalid status value' }
        ]);
      }

      const result = await this.service.updateClaimStatus(claimId, {
        status: parseInt(status),
        notes,
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Claim status updated successfully');

    } catch (error) {
      handleControllerError(error, res, 'Update claim status');
    }
  }

  /**
   * Bulk update claim status
   */
  async bulkUpdateClaimStatus(req, res) {
    try {
      const { claim_ids, status, notes } = req.body;
      const { user_id: userId } = req.user;

      // Validate input
      if (!Array.isArray(claim_ids) || claim_ids.length === 0) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claim_ids', message: 'Claim IDs array is required' }
        ]);
      }

      if (![0, 1, 2, 3, 4].includes(parseInt(status))) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'status', message: 'Invalid status value' }
        ]);
      }

      // Process bulk update
      const results = [];
      for (const claimId of claim_ids) {
        try {
          const result = await this.service.updateClaimStatus(claimId, {
            status: parseInt(status),
            notes,
            userId
          });
          results.push({ claimId, success: true, data: result });
        } catch (error) {
          results.push({
            claimId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      ResponseHelpers.sendSuccess(res, {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      }, `Bulk update completed: ${successCount} successful, ${failureCount} failed`);

    } catch (error) {
      handleControllerError(error, res, 'Bulk update claim status');
    }
  }

  /**
   * Get claim by ID
   */
  async getClaimById(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);

      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      const claim = await this.service.getClaimById(claimId);

      if (!claim) {
        return ResponseHelpers.sendNotFound(res, 'Claim', claimId);
      }

      ResponseHelpers.sendSuccess(res, claim, 'Claim details retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get claim by ID');
    }
  }

  /**
   * Get detailed claim information with history, comments, and related data
   */
  async getDetailedClaimById(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { user_id: userId } = req.user;

      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      const detailedClaim = await this.service.getDetailedClaimById(claimId, userId);

      if (!detailedClaim) {
        return ResponseHelpers.sendNotFound(res, 'Claim', claimId);
      }

      ResponseHelpers.sendSuccess(res, detailedClaim, 'Detailed claim information retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get detailed claim by ID');
    }
  }

  // =====================================================
  // CLAIM ACTIONS
  // =====================================================

  /**
   * Correct and resubmit claim
   */
  async correctAndResubmitClaim(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { correction_reason: correctionReason } = req.body;
      const { user_id: userId } = req.user;

      // Validate required fields
      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      if (!correctionReason || correctionReason.trim() === '') {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'correction_reason', message: 'Correction reason is required' }
        ]);
      }

      const result = await this.service.correctAndResubmitClaim(claimId, {
        correctionReason: correctionReason.trim(),
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Claim corrected and resubmitted successfully');

    } catch (error) {
      handleControllerError(error, res, 'Correct and resubmit claim');
    }
  }

  /**
   * File appeal for claim
   */
  async fileAppeal(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { appeal_reason: appealReason } = req.body;
      const { user_id: userId } = req.user;

      // Validate required fields
      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      if (!appealReason || appealReason.trim() === '') {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'appeal_reason', message: 'Appeal reason is required' }
        ]);
      }

      const result = await this.service.fileAppeal(claimId, {
        appealReason: appealReason.trim(),
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Appeal filed successfully');

    } catch (error) {
      handleControllerError(error, res, 'File appeal');
    }
  }

  /**
   * Transfer claim to patient responsibility
   */
  async transferToPatient(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { transfer_reason: transferReason } = req.body;
      const { user_id: userId } = req.user;

      // Validate required fields
      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      if (!transferReason || transferReason.trim() === '') {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'transfer_reason', message: 'Transfer reason is required' }
        ]);
      }

      const result = await this.service.transferToPatient(claimId, {
        transferReason: transferReason.trim(),
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Claim transferred to patient responsibility successfully');

    } catch (error) {
      handleControllerError(error, res, 'Transfer to patient');
    }
  }

  /**
   * Add comment to claim
   */
  async addClaimComment(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { comment } = req.body;
      const userId = req.user?.id || req.user?.user_id;
  
      console.log('Authenticated User:', req.user);
  
      // Validate claimId
      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }
  
      // Validate comment
      if (!comment || comment.trim() === '') {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'comment', message: 'Comment is required' }
        ]);
      }
  
      const result = await this.service.addClaimComment(claimId, {
        comment: comment.trim(),
        userId
      });
  
      return ResponseHelpers.sendSuccess(res, result, 'Comment added successfully');
  
    } catch (error) {
      console.error('Error in addClaimComment:', error);
      handleControllerError(error, res, 'Add claim comment');
    }
  }
  

  /**
   * Void claim
   */
  async voidClaim(req, res) {
    try {
      const claimId = parseInt(req.params.claimId);
      const { void_reason: voidReason } = req.body;
      const { user_id: userId } = req.user;

      // Validate required fields
      if (!claimId || isNaN(claimId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claimId', message: 'Valid claim ID is required' }
        ]);
      }

      if (!voidReason || voidReason.trim() === '') {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'void_reason', message: 'Void reason is required' }
        ]);
      }

      const result = await this.service.voidClaim(claimId, {
        voidReason: voidReason.trim(),
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Claim voided successfully');

    } catch (error) {
      handleControllerError(error, res, 'Void claim');
    }
  }

  // =====================================================
  // PAYMENT PROCESSING
  // =====================================================

  /**
   * Post payment
   */
  async postPayment(req, res) {
    try {
      const {
        claim_id: claimId,
        payment_amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        check_number: checkNumber,
        adjustment_amount: adjustmentAmount,
        adjustment_reason: adjustmentReason
      } = req.body;
      const { user_id: userId } = req.user;

      // Validate required fields
      if (!claimId || !paymentAmount || !paymentDate) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'claim_id', message: 'Claim ID is required' },
          { field: 'payment_amount', message: 'Payment amount is required' },
          { field: 'payment_date', message: 'Payment date is required' }
        ].filter(error => {
          if (error.field === 'claim_id') return !claimId;
          if (error.field === 'payment_amount') return !paymentAmount;
          if (error.field === 'payment_date') return !paymentDate;
          return false;
        }));
      }

      const result = await this.service.postPayment({
        claimId: parseInt(claimId),
        paymentAmount: parseFloat(paymentAmount),
        paymentDate,
        paymentMethod,
        checkNumber,
        adjustmentAmount: adjustmentAmount ? parseFloat(adjustmentAmount) : 0,
        adjustmentReason,
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Payment posted successfully');

    } catch (error) {
      handleControllerError(error, res, 'Post payment');
    }
  }

  /**
   * Get payment posting data
   */
  async getPaymentPostingData(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        date_from: dateFrom,
        date_to: dateTo,
        payment_method: paymentMethod = 'all',
        status = 'all'
      } = req.query;

      const paymentData = await this.service.getPaymentPostingData({
        page: parseInt(page),
        limit: parseInt(limit),
        dateFrom,
        dateTo,
        paymentMethod,
        status
      });

      ResponseHelpers.sendSuccess(res, paymentData, 'Payment posting data retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get payment posting data');
    }
  }

  /**
   * Get office payments data
   */
  async getOfficePaymentsData(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'all',
        search = '',
        date_from,
        date_to,
        payment_method = 'all'
      } = req.query;

      const officePaymentsData = await this.service.getOfficePaymentsData({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        search,
        date_from,
        date_to,
        payment_method
      });

      ResponseHelpers.sendSuccess(res, officePaymentsData, 'Office payments data retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get office payments data');
    }
  }

  // =====================================================
  // A/R AGING AND COLLECTIONS
  // =====================================================

  /**
   * Get A/R aging report
   */
  async getARAgingReport(req, res) {
    try {
      const {
        include_zero_balance: includeZeroBalance = false,
        payer_filter: payerFilter,
        priority_filter: priorityFilter = 'all'
      } = req.query;

      const arData = await this.service.getARAgingReport({
        includeZeroBalance: includeZeroBalance === 'true',
        payerFilter,
        priorityFilter
      });

      ResponseHelpers.sendSuccess(res, arData, 'A/R aging report generated successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get A/R aging report');
    }
  }

  /**
   * Get collections workflow
   */
  async getCollectionsWorkflow(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'all',
        priority = 'all',
        aging_bucket: agingBucket = 'all'
      } = req.query;

      const collectionsData = await this.service.getCollectionsWorkflow({
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        priority,
        agingBucket
      });

      ResponseHelpers.sendSuccess(res, collectionsData, 'Collections workflow retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get collections workflow');
    }
  }

  /**
   * Update collection status
   */
  async updateCollectionStatus(req, res) {
    try {
      const accountId = parseInt(req.params.accountId);
      const { status, priority, assigned_collector: assignedCollector, notes } = req.body;
      const { user_id: userId } = req.user;

      if (!accountId || isNaN(accountId)) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'accountId', message: 'Valid account ID is required' }
        ]);
      }

      const result = await this.service.updateCollectionStatus(accountId, {
        status,
        priority,
        assignedCollector,
        notes,
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'Collection status updated successfully');

    } catch (error) {
      handleControllerError(error, res, 'Update collection status');
    }
  }

  // =====================================================
  // DENIAL ANALYTICS
  // =====================================================

  /**
   * Get denial analytics
   */
  async getDenialAnalytics(req, res) {
    try {
      const { timeframe = '30d' } = req.query;

      const denialData = await this.service.getDenialAnalytics({
        timeframe
      });

      ResponseHelpers.sendSuccess(res, denialData, 'Denial analytics retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get denial analytics');
    }
  }

  // =====================================================
  // REPORTING
  // =====================================================

  /**
   * Generate comprehensive RCM report
   */
  async generateRCMReport(req, res) {
    try {
      const {
        report_type = 'summary',
        timeframe = '30d',
        format = 'json',
        include_details = false
      } = req.body;

      const reportData = {
        reportType: report_type,
        timeframe,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.user_id
      };

      // Get data based on report type
      switch (report_type) {
        case 'dashboard':
          reportData.data = await this.service.getDashboardData({ timeframe });
          break;
        case 'ar_aging':
          reportData.data = await this.service.getARAgingReport({});
          break;
        case 'denials':
          reportData.data = await this.service.getDenialAnalytics({ timeframe });
          break;
        default:
          // Combined summary report
          reportData.data = {
            dashboard: await this.service.getDashboardData({ timeframe }),
            arAging: await this.service.getARAgingReport({}),
            denials: await this.service.getDenialAnalytics({ timeframe })
          };
      }

      ResponseHelpers.sendSuccess(res, reportData, 'RCM report generated successfully');

    } catch (error) {
      handleControllerError(error, res, 'Generate RCM report');
    }
  }

  // =====================================================
  // ERA PROCESSING
  // =====================================================

  /**
   * Process ERA file
   */
  async processERAFile(req, res) {
    try {
      const {
        era_data: eraData,
        file_name: fileName,
        auto_post: autoPost = false
      } = req.body;
      const { user_id: userId } = req.user;

      if (!eraData || !fileName) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'era_data', message: 'ERA data is required' },
          { field: 'file_name', message: 'File name is required' }
        ]);
      }

      const result = await this.service.processERAFile({
        eraData,
        fileName,
        autoPost,
        userId
      });

      ResponseHelpers.sendSuccess(res, result, 'ERA file processed successfully');

    } catch (error) {
      handleControllerError(error, res, 'Process ERA file');
    }
  }

  // =====================================================
  // PERFORMANCE AND MONITORING
  // =====================================================

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(req, res) {
    try {
      const { getQueryMetrics } = require('../../utils/dbUtils');
      const metrics = getQueryMetrics();

      ResponseHelpers.sendSuccess(res, metrics, 'Performance metrics retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get performance metrics');
    }
  }

  /**
   * Clear cache
   */
  async clearCache(req, res) {
    try {
      const { clearAllCache } = require('../../utils/cacheUtils');

      // Clear Redis/memory cache
      await clearAllCache();

      // Clear service-level cache
      this.service.cache?.clear();

      ResponseHelpers.sendSuccess(res, { cleared: true }, 'All caches cleared successfully');

    } catch (error) {
      handleControllerError(error, res, 'Clear cache');
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(req, res) {
    try {
      const { getCacheStats } = require('../../utils/cacheUtils');
      const cacheStats = getCacheStats();

      ResponseHelpers.sendSuccess(res, cacheStats, 'Cache statistics retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get cache statistics');
    }
  }

  // =====================================================
  // HEALTH CHECK
  // =====================================================

  /**
   * Health check endpoint
   */
  async healthCheck(req, res) {
    try {
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'UnifiedRCMService',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      };

      ResponseHelpers.sendSuccess(res, healthData, 'RCM service is healthy');

    } catch (error) {
      handleControllerError(error, res, 'Health check');
    }
  }

  // =====================================================
  // CLAIMMD INTEGRATION
  // =====================================================

  /**
   * Check ClaimMD ERA status
   */
  async checkClaimMDERAStatus(req, res) {
    try {
      const { referenceId } = req.params;
      const { user_id: userId } = req.user;

      if (!referenceId) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'referenceId', message: 'ClaimMD reference ID is required' }
        ]);
      }

      const statusData = await this.service.checkClaimMDERAStatus(referenceId, userId);

      ResponseHelpers.sendSuccess(res, statusData, 'ClaimMD ERA status retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Check ClaimMD ERA status');
    }
  }

  /**
   * Get ClaimMD configuration
   */
  async getClaimMDConfiguration(req, res) {
    try {
      const { user_id: userId } = req.user;

      const config = await this.service.getClaimMDConfiguration(userId);

      if (!config) {
        return ResponseHelpers.sendNotFound(res, 'ClaimMD configuration', userId);
      }

      // Remove sensitive data before sending response
      const safeConfig = {
        baseUrl: config.baseUrl,
        providerId: config.providerId,
        isActive: config.isActive,
        hasApiKey: !!config.apiKey,
        additionalConfig: config.additionalConfig
      };

      ResponseHelpers.sendSuccess(res, safeConfig, 'ClaimMD configuration retrieved successfully');

    } catch (error) {
      handleControllerError(error, res, 'Get ClaimMD configuration');
    }
  }

  /**
   * Update ClaimMD configuration
   */
  async updateClaimMDConfiguration(req, res) {
    try {
      const { user_id: userId } = req.user;
      const {
        api_key: apiKey,
        base_url: baseUrl,
        provider_id: providerId,
        is_active: isActive,
        configuration_data: configurationData
      } = req.body;

      // Validate required fields
      if (!apiKey || !providerId) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'api_key', message: 'API key is required' },
          { field: 'provider_id', message: 'Provider ID is required' }
        ].filter(error => {
          if (error.field === 'api_key') return !apiKey;
          if (error.field === 'provider_id') return !providerId;
          return false;
        }));
      }

      // Update or insert configuration
      const query = `
        INSERT INTO claimmd_configurations 
        (user_id, api_key, base_url, provider_id, is_active, configuration_data, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        api_key = VALUES(api_key),
        base_url = VALUES(base_url),
        provider_id = VALUES(provider_id),
        is_active = VALUES(is_active),
        configuration_data = VALUES(configuration_data),
        updated_at = NOW()
      `;

      await executeQuery(query, [
        userId,
        apiKey,
        baseUrl || 'https://api.claim.md',
        providerId,
        isActive !== undefined ? isActive : true,
        configurationData ? JSON.stringify(configurationData) : null
      ]);

      ResponseHelpers.sendSuccess(res, { 
        updated: true,
        userId,
        providerId
      }, 'ClaimMD configuration updated successfully');

    } catch (error) {
      handleControllerError(error, res, 'Update ClaimMD configuration');
    }
  }

  /**
   * Test ClaimMD connection
   */
  async testClaimMDConnection(req, res) {
    try {
      const { user_id: userId } = req.user;

      const config = await this.service.getClaimMDConfiguration(userId);

      if (!config) {
        return ResponseHelpers.sendValidationError(res, [
          { field: 'configuration', message: 'ClaimMD configuration not found' }
        ]);
      }

      // Test connection to ClaimMD API
      const testResponse = await fetch(`${config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Provider-ID': userId.toString()
        },
        timeout: 10000 // 10 second timeout
      });

      const connectionTest = {
        success: testResponse.ok,
        status: testResponse.status,
        statusText: testResponse.statusText,
        responseTime: Date.now(),
        baseUrl: config.baseUrl,
        providerId: config.providerId
      };

      if (testResponse.ok) {
        ResponseHelpers.sendSuccess(res, connectionTest, 'ClaimMD connection test successful');
      } else {
        ResponseHelpers.sendError(res, connectionTest, 'ClaimMD connection test failed', 400);
      }

    } catch (error) {
      const connectionTest = {
        success: false,
        error: error.message,
        responseTime: Date.now()
      };

      ResponseHelpers.sendError(res, connectionTest, 'ClaimMD connection test failed', 500);
    }
  }
}

// Create and export controller instance
const unifiedRCMController = new UnifiedRCMController();

// Export individual methods for route binding
module.exports = {
  // Dashboard and Analytics
  getDashboardData: unifiedRCMController.getDashboardData.bind(unifiedRCMController),
  getDashboard: unifiedRCMController.getDashboardData.bind(unifiedRCMController), // Alias
  
  // Claims Management
  getClaimsStatus: unifiedRCMController.getClaimsStatus.bind(unifiedRCMController),
  getClaims: unifiedRCMController.getClaimsStatus.bind(unifiedRCMController), // Alias
  createClaim: unifiedRCMController.createClaim.bind(unifiedRCMController),
  updateClaimStatus: unifiedRCMController.updateClaimStatus.bind(unifiedRCMController),
  bulkUpdateClaimStatus: unifiedRCMController.bulkUpdateClaimStatus.bind(unifiedRCMController),
  getClaimById: unifiedRCMController.getClaimById.bind(unifiedRCMController),
  getDetailedClaimById: unifiedRCMController.getDetailedClaimById.bind(unifiedRCMController),

  // Claim Actions
  correctAndResubmitClaim: unifiedRCMController.correctAndResubmitClaim.bind(unifiedRCMController),
  fileAppeal: unifiedRCMController.fileAppeal.bind(unifiedRCMController),
  transferToPatient: unifiedRCMController.transferToPatient.bind(unifiedRCMController),
  addClaimComment: unifiedRCMController.addClaimComment.bind(unifiedRCMController),
  voidClaim: unifiedRCMController.voidClaim.bind(unifiedRCMController),
  
  // Payment Processing
  postPayment: unifiedRCMController.postPayment.bind(unifiedRCMController),
  getPaymentPostingData: unifiedRCMController.getPaymentPostingData.bind(unifiedRCMController),
  getPayments: unifiedRCMController.getPaymentPostingData.bind(unifiedRCMController), // Alias
  getOfficePaymentsData: unifiedRCMController.getOfficePaymentsData.bind(unifiedRCMController),
  
  // A/R Aging and Collections
  getARAgingReport: unifiedRCMController.getARAgingReport.bind(unifiedRCMController),
  getARAging: unifiedRCMController.getARAgingReport.bind(unifiedRCMController), // Alias
  getCollectionsWorkflow: unifiedRCMController.getCollectionsWorkflow.bind(unifiedRCMController),
  getCollections: unifiedRCMController.getCollectionsWorkflow.bind(unifiedRCMController), // Alias
  updateCollectionStatus: unifiedRCMController.updateCollectionStatus.bind(unifiedRCMController),
  
  // Denial Analytics
  getDenialAnalytics: unifiedRCMController.getDenialAnalytics.bind(unifiedRCMController),
  getDenialManagement: unifiedRCMController.getDenialAnalytics.bind(unifiedRCMController), // Alias
  
  // Reporting
  generateRCMReport: unifiedRCMController.generateRCMReport.bind(unifiedRCMController),
  
  // ERA Processing
  processERAFile: unifiedRCMController.processERAFile.bind(unifiedRCMController),
  
  // ClaimMD Integration
  checkClaimMDERAStatus: unifiedRCMController.checkClaimMDERAStatus.bind(unifiedRCMController),
  getClaimMDConfiguration: unifiedRCMController.getClaimMDConfiguration.bind(unifiedRCMController),
  updateClaimMDConfiguration: unifiedRCMController.updateClaimMDConfiguration.bind(unifiedRCMController),
  testClaimMDConnection: unifiedRCMController.testClaimMDConnection.bind(unifiedRCMController),
  
  // Performance and Monitoring
  getPerformanceMetrics: unifiedRCMController.getPerformanceMetrics.bind(unifiedRCMController),
  clearCache: unifiedRCMController.clearCache.bind(unifiedRCMController),
  getCacheStats: unifiedRCMController.getCacheStats.bind(unifiedRCMController),
  
  // Health Check
  healthCheck: unifiedRCMController.healthCheck.bind(unifiedRCMController),
  
  // Export the controller class for advanced usage
  UnifiedRCMController
};