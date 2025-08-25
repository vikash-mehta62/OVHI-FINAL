/**
 * Refactored RCM Controller
 * Uses service pattern with standardized request/response handling
 */

const ConsolidatedRCMService = require('./consolidatedRCMService');
const {
    createController,
    ParamExtractors,
    ResponseTransformers,
    InputValidators,
    StatusCodes,
    APIResponse
} = require('../../utils/controllerWrapper');
const {
    formatCurrency,
    formatDate,
    calculateDaysInAR,
    getAgingBucket,
    getCollectabilityScore,
    getClaimRecommendations
} = require('../../utils/rcmUtils');
const { handleControllerError } = require('../../middleware/errorHandler');
const {
    StandardizedAPIResponse,
    ResponseStatusCodes,
    ResponseHelpers,
    ResponseFormatter
} = require('../../utils/standardizedResponse');
const {
    compressResponse,
    getCacheStats
} = require('../../utils/cacheUtils');

// Initialize consolidated service
const rcmService = new ConsolidatedRCMService();

/**
 * Controller method mappings with service methods and options
 */
const controllerMappings = {
    // Dashboard endpoints
    getDashboardData: {
        serviceMethod: 'getDashboardData',
        options: {
            extractParams: ParamExtractors.dashboardParams,
            transformResponse: ResponseTransformers.dashboardTransformer,
            successMessage: 'Dashboard data retrieved successfully'
        }
    },

    // Claims management endpoints
    getClaimsStatus: {
        serviceMethod: 'getClaimsStatus',
        options: {
            extractParams: ParamExtractors.claimsParams,
            transformResponse: ResponseTransformers.claimsTransformer,
            validateInput: InputValidators.validatePagination,
            successMessage: 'Claims retrieved successfully'
        }
    },

    updateClaimStatus: {
        serviceMethod: 'updateClaimStatus',
        options: {
            extractParams: ParamExtractors.claimUpdateParams,
            transformResponse: ResponseTransformers.claimTransformer,
            validateInput: InputValidators.validateClaimUpdate,
            successMessage: 'Claim status updated successfully',
            successStatus: StatusCodes.OK
        }
    },

    // A/R Aging endpoints
    getARAgingReport: {
        serviceMethod: 'getARAgingReport',
        options: {
            extractParams: ParamExtractors.arAgingParams,
            successMessage: 'A/R aging report generated successfully'
        }
    },

    // Denial analytics endpoints
    getDenialAnalytics: {
        serviceMethod: 'getDenialAnalytics',
        options: {
            extractParams: ParamExtractors.dashboardParams,
            successMessage: 'Denial analytics retrieved successfully'
        }
    },

    // ERA Processing endpoints
    processERAFile: {
        serviceMethod: 'processERAFile',
        options: {
            extractParams: (req) => ({
                eraData: req.body.era_data,
                fileName: req.body.file_name,
                autoPost: req.body.auto_post || false,
                userId: req.user?.user_id
            }),
            successMessage: 'ERA file processed successfully'
        }
    },

    // Payment Posting endpoints
    postPayment: {
        serviceMethod: 'postPayment',
        options: {
            extractParams: (req) => ({
                claimId: req.body.claim_id,
                paymentAmount: req.body.payment_amount,
                paymentDate: req.body.payment_date,
                paymentMethod: req.body.payment_method,
                checkNumber: req.body.check_number,
                adjustmentAmount: req.body.adjustment_amount,
                adjustmentReason: req.body.adjustment_reason,
                userId: req.user?.user_id
            }),
            successMessage: 'Payment posted successfully'
        }
    },

    getPaymentPostingData: {
        serviceMethod: 'getPaymentPostingData',
        options: {
            extractParams: (req) => ({
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                dateFrom: req.query.date_from,
                dateTo: req.query.date_to,
                paymentMethod: req.query.payment_method,
                status: req.query.status
            }),
            successMessage: 'Payment posting data retrieved successfully'
        }
    },

    // Collections endpoints
    getCollectionsWorkflow: {
        serviceMethod: 'getCollectionsWorkflow',
        options: {
            extractParams: ParamExtractors.collectionsParams,
            successMessage: 'Collections workflow retrieved successfully'
        }
    },

    updateCollectionStatus: {
        serviceMethod: 'updateCollectionStatus',
        options: {
            extractParams: (req) => ({
                accountId: parseInt(req.params.accountId),
                status: req.body.status,
                priority: req.body.priority,
                assignedCollector: req.body.assigned_collector,
                notes: req.body.notes,
                userId: req.user?.user_id
            }),
            successMessage: 'Collection status updated successfully'
        }
    }
};

// Create controller with standardized patterns
const rcmController = createController(rcmService, controllerMappings);

/**
 * Additional controller methods that need custom logic
 */

/**
 * Bulk update claim status
 */
rcmController.bulkUpdateClaimStatus = async (req, res) => {
    try {
        const { claim_ids, status, notes } = req.body;
        const { user_id } = req.user;

        // Validate input using standardized responses
        if (!Array.isArray(claim_ids) || claim_ids.length === 0) {
            return ResponseHelpers.sendValidationError(res,
                [{ field: 'claim_ids', message: 'Claim IDs array is required' }]
            );
        }

        if (![0, 1, 2, 3, 4].includes(parseInt(status))) {
            return ResponseHelpers.sendValidationError(res,
                [{ field: 'status', message: 'Invalid status value' }]
            );
        }

        // Process bulk update
        const results = [];
        for (const claimId of claim_ids) {
            try {
                const result = await rcmService.updateClaimStatus(claimId, {
                    status,
                    notes,
                    userId: user_id
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
        }, `Bulk update completed: ${successCount} successful, ${failureCount} failed`, ResponseStatusCodes.SUCCESS);

    } catch (error) {
        handleControllerError(error, res, 'Bulk update claim status');
    }
};

/**
 * Get claim details with recommendations
 */
rcmController.getClaimDetails = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res,
                [{ field: 'claimId', message: 'Valid claim ID is required' }]
            );
        }

        // Get claim details from service
        const claim = await rcmService.getClaimById(claimId);

        if (!claim) {
            return ResponseHelpers.sendNotFound(res, 'Claim', claimId);
        }

        // Add recommendations and formatting using standardized formatter
        const enrichedClaim = {
            ...claim,
            total_amount: formatCurrency(claim.total_amount),
            service_date: formatDate(claim.service_date),
            days_in_ar: calculateDaysInAR(claim.service_date),
            aging_bucket: getAgingBucket(calculateDaysInAR(claim.service_date)),
            collectability_score: getCollectabilityScore(calculateDaysInAR(claim.service_date)),
            recommendations: getClaimRecommendations(claim)
        };

        const formattedClaim = ResponseFormatter.claim(enrichedClaim);
        ResponseHelpers.sendSuccess(res, formattedClaim, 'Claim details retrieved successfully');

    } catch (error) {
        handleControllerError(error, res, 'Get claim details');
    }
};

/**
 * Generate RCM report
 */
rcmController.generateRCMReport = async (req, res) => {
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
                reportData.data = await rcmService.getDashboardData({ timeframe });
                break;
            case 'ar_aging':
                reportData.data = await rcmService.getARAgingReport({});
                break;
            case 'denials':
                reportData.data = await rcmService.getDenialAnalytics({ timeframe });
                break;
            default:
                // Combined summary report
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
};

/**
 * Get query performance statistics
 */
rcmController.getQueryPerformanceStats = async (req, res) => {
    try {
        const performanceStats = await optimizedRCMService.getQueryPerformanceStats();
        ResponseHelpers.sendSuccess(res, performanceStats, 'Performance statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get performance statistics');
    }
};

/**
 * Get performance metrics from database utilities
 */
rcmController.getPerformanceMetrics = async (req, res) => {
    try {
        const { getQueryMetrics } = require('../../utils/dbUtils');
        const metrics = getQueryMetrics();
        
        ResponseHelpers.sendSuccess(res, metrics, 'Performance metrics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get performance metrics');
    }
};

/**
 * Reset performance metrics
 */
rcmController.resetPerformanceMetrics = async (req, res) => {
    try {
        const { resetQueryMetrics } = require('../../utils/dbUtils');
        resetQueryMetrics();
        
        // Also clear service cache
        optimizedRCMService.clearCache();
        
        ResponseHelpers.sendSuccess(res, { reset: true }, 'Performance metrics reset successfully');
    } catch (error) {
        handleControllerError(error, res, 'Reset performance metrics');
    }
};

/**
 * Get cache statistics
 */
rcmController.getCacheStats = async (req, res) => {
    try {
        const cacheStats = getCacheStats();
        
        ResponseHelpers.sendSuccess(res, cacheStats, 'Cache statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get cache statistics');
    }
};

/**
 * Clear cache
 */
rcmController.clearCache = async (req, res) => {
    try {
        const { clearAllCache } = require('../../utils/cacheUtils');
        const OptimizedRCMService = require('./optimizedRCMService');
        
        // Clear Redis/memory cache
        await clearAllCache();
        
        // Clear service-level cache
        const rcmService = new OptimizedRCMService();
        rcmService.clearCache();
        
        ResponseHelpers.sendSuccess(res, { cleared: true }, 'All caches cleared successfully');
    } catch (error) {
        handleControllerError(error, res, 'Clear cache');
    }
};

/**
 * Invalidate specific cache patterns
 */
rcmController.invalidateCache = async (req, res) => {
    try {
        const { patterns = [] } = req.body;
        const { invalidateCache } = require('../../utils/cacheUtils');
        
        if (!Array.isArray(patterns) || patterns.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'patterns', message: 'Patterns array is required' }
            ]);
        }
        
        const success = await invalidateCache('rcm', patterns);
        
        ResponseHelpers.sendSuccess(res, { 
            invalidated: success,
            patterns 
        }, 'Cache patterns invalidated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Invalidate cache');
    }
};

module.exports = rcmController;