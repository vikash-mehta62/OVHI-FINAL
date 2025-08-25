/**
 * Refactored RCM Controller
 * Uses service pattern with standardized request/response handling
 */

const ConsolidatedRCMService = require('./consolidatedRCMService');
const ClaimHistoryService = require('./claimHistoryService');
const CMSValidationService = require('./cmsValidationService');
const CommentService = require('./commentService');
const FollowUpService = require('./followUpService');
const CMS1500Generator = require('./cms1500Generator');
const UB04Generator = require('./ub04Generator');
const {
    executeQuery,
    executeQuerySingle,
    executeQueryWithPagination
} = require('../../utils/dbUtils');
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

// Create rcmController object to hold all functions
const rcmController = {};

// Initialize consolidated service
const rcmService = new ConsolidatedRCMService();
const historyService = new ClaimHistoryService();

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

    // Create new claim
    createClaim: {
        serviceMethod: 'createClaim',
        options: {
            extractParams: (req) => ({
                ...req.body,
                created_by: req.user?.user_id
            }),
            validateInput: InputValidators.validateClaimUpdate, // Use existing validator
            successMessage: 'Claim created successfully',
            successStatus: StatusCodes.CREATED
        }
    },

    // Update existing claim
    updateClaim: {
        serviceMethod: 'updateClaim',
        options: {
            extractParams: (req) => ([
                parseInt(req.params.claimId),
                {
                    ...req.body,
                    updated_by: req.user?.user_id
                }
            ]),
            validateInput: InputValidators.validateClaimUpdate,
            successMessage: 'Claim updated successfully',
            successStatus: StatusCodes.OK
        }
    },

    // Get claim by ID
    getClaimById: {
        serviceMethod: 'getClaimById',
        options: {
            extractParams: (req) => ([parseInt(req.params.claimId)]),
            successMessage: 'Claim details retrieved successfully',
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

// Controller methods are defined below using the rcmController object

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

/**
 * Get claim history
 */
rcmController.getClaimHistory = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            page = 1,
            limit = 50,
            actionType,
            userId,
            dateFrom,
            dateTo,
            search
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const historyData = await historyService.getClaimHistory(claimId, {
            page: parseInt(page),
            limit: parseInt(limit),
            actionType,
            userId: userId ? parseInt(userId) : undefined,
            dateFrom,
            dateTo,
            search
        });

        ResponseHelpers.sendSuccess(res, historyData, 'Claim history retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get claim history');
    }
};

/**
 * Export claim history
 */
rcmController.exportClaimHistory = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            format = 'json',
            dateFrom,
            dateTo,
            includeMetadata = true
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const exportData = await historyService.exportHistory(claimId, {
            format,
            dateFrom,
            dateTo,
            includeMetadata: includeMetadata === 'true'
        });

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="claim-${claimId}-history.csv"`);
            res.send(exportData);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="claim-${claimId}-history.json"`);
            res.json(exportData);
        }
    } catch (error) {
        handleControllerError(error, res, 'Export claim history');
    }
};

/**
 * Batch validate multiple claims
 */
rcmController.batchValidateClaims = async (req, res) => {
    try {
        const { claimIds, options = {} } = req.body;

        if (!Array.isArray(claimIds) || claimIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Claim IDs array is required' }
            ]);
        }

        if (claimIds.length > 50) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Maximum 50 claims can be validated at once' }
            ]);
        }

        const results = [];
        const errors = [];

        for (const claimId of claimIds) {
            try {
                const claim = await rcmService.getClaimById(claimId);
                if (!claim) {
                    errors.push({ claimId, error: 'Claim not found' });
                    continue;
                }

                const validationResult = await cmsValidationService.validateClaim(claim, options);
                results.push({ claimId, validation: validationResult });
            } catch (error) {
                errors.push({ claimId, error: error.message });
            }
        }

        const summary = {
            total: claimIds.length,
            validated: results.length,
            errors: errors.length,
            compliant: results.filter(r => r.validation.status === 'valid').length,
            warnings: results.filter(r => r.validation.status === 'warning').length,
            invalid: results.filter(r => r.validation.status === 'invalid').length
        };

        ResponseHelpers.sendSuccess(res, {
            summary,
            results,
            errors
        }, 'Batch validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Batch validate claims');
    }
};

/**
 * Get validation statistics
 */
rcmController.getValidationStatistics = async (req, res) => {
    try {
        const {
            dateFrom,
            dateTo,
            userId
        } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (dateFrom) {
            whereConditions.push('DATE(updated) >= ?');
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereConditions.push('DATE(updated) <= ?');
            queryParams.push(dateTo);
        }

        if (userId) {
            whereConditions.push('updated_by = ?');
            queryParams.push(userId);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const statsQuery = `
            SELECT 
                COUNT(*) as total_claims,
                SUM(CASE WHEN cms_validation_status = 'valid' THEN 1 ELSE 0 END) as valid_claims,
                SUM(CASE WHEN cms_validation_status = 'warning' THEN 1 ELSE 0 END) as warning_claims,
                SUM(CASE WHEN cms_validation_status = 'invalid' THEN 1 ELSE 0 END) as invalid_claims,
                SUM(CASE WHEN cms_validation_status = 'pending' THEN 1 ELSE 0 END) as pending_claims,
                AVG(CASE WHEN cms_validation_status IN ('valid', 'warning') THEN 1 ELSE 0 END) * 100 as compliance_rate,
                SUM(CASE WHEN medical_necessity_verified = TRUE THEN 1 ELSE 0 END) as medical_necessity_verified,
                SUM(CASE WHEN ncci_status = 'clean' THEN 1 ELSE 0 END) as ncci_clean
            FROM billings
            ${whereClause}
        `;

        const stats = await executeQuerySingle(statsQuery, queryParams);

        // Get top validation errors
        const errorQuery = `
            SELECT 
                JSON_UNQUOTE(JSON_EXTRACT(validation_errors, '$.errors[0].code')) as error_code,
                JSON_UNQUOTE(JSON_EXTRACT(validation_errors, '$.errors[0].message')) as error_message,
                COUNT(*) as error_count
            FROM billings 
            ${whereClause} AND validation_errors IS NOT NULL
            GROUP BY error_code, error_message
            ORDER BY error_count DESC
            LIMIT 10
        `;

        const topErrors = await executeQuery(errorQuery, queryParams);

        ResponseHelpers.sendSuccess(res, {
            statistics: {
                ...stats,
                compliance_rate: parseFloat(stats.compliance_rate || 0).toFixed(2)
            },
            topErrors
        }, 'Validation statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get validation statistics');
    }
};

/**
 * Validate taxonomy code
 */
rcmController.validateTaxonomyCode = async (req, res) => {
    try {
        const { taxonomyCode } = req.body;

        if (!taxonomyCode) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'taxonomyCode', message: 'Taxonomy code is required' }
            ]);
        }

        const validationResult = {
            taxonomyCode,
            isValid: false,
            errors: [],
            warnings: []
        };

        // Validate taxonomy format (10 characters: XXXXXXXXXX)
        if (!/^[0-9]{10}$/.test(taxonomyCode)) {
            validationResult.errors.push({
                code: 'TAXONOMY_FORMAT',
                message: 'Taxonomy code must be exactly 10 digits'
            });
        } else {
            // Check against known taxonomy codes (simplified validation)
            const validTaxonomyCodes = await cmsValidationService.getValidTaxonomyCodes();
            if (validTaxonomyCodes.length > 0 && !validTaxonomyCodes.includes(taxonomyCode)) {
                validationResult.warnings.push({
                    code: 'TAXONOMY_UNKNOWN',
                    message: 'Taxonomy code not found in current NUCC taxonomy list'
                });
            }

            if (validationResult.errors.length === 0) {
                validationResult.isValid = true;
            }
        }

        ResponseHelpers.sendSuccess(res, validationResult, 'Taxonomy code validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate taxonomy code');
    }
};

/**
 * Get recent activity across all claims
 */
rcmController.getRecentActivity = async (req, res) => {
    try {
        const {
            limit = 50,
            userId,
            actionTypes,
            hours = 24
        } = req.query;

        const options = {
            limit: parseInt(limit),
            hours: parseInt(hours)
        };

        if (userId) {
            options.userId = parseInt(userId);
        }

        if (actionTypes) {
            options.actionTypes = actionTypes.split(',');
        }

        const activities = await historyService.getRecentActivity(options);

        ResponseHelpers.sendSuccess(res, {
            activities,
            total: activities.length,
            timeframe: `${hours} hours`
        }, 'Recent activity retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get recent activity');
    }
};

/**
 * Get claim history statistics
 */
rcmController.getClaimHistoryStats = async (req, res) => {
    try {
        const {
            dateFrom,
            dateTo,
            claimId
        } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (claimId) {
            whereConditions.push('claim_id = ?');
            queryParams.push(claimId);
        }

        if (dateFrom) {
            whereConditions.push('DATE(timestamp) >= ?');
            queryParams.push(dateFrom);
        }

        if (dateTo) {
            whereConditions.push('DATE(timestamp) <= ?');
            queryParams.push(dateTo);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get overall statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT claim_id) as unique_claims,
                COUNT(DISTINCT user_id) as unique_users,
                MIN(timestamp) as earliest_entry,
                MAX(timestamp) as latest_entry
            FROM claim_history
            ${whereClause}
        `;

        const stats = await executeQuerySingle(statsQuery, queryParams);

        // Get action type breakdown
        const actionBreakdownQuery = `
            SELECT 
                action_type,
                COUNT(*) as count,
                COUNT(DISTINCT claim_id) as unique_claims
            FROM claim_history
            ${whereClause}
            GROUP BY action_type
            ORDER BY count DESC
        `;

        const actionBreakdown = await executeQuery(actionBreakdownQuery, queryParams);

        // Get daily activity (last 30 days)
        const dailyActivityQuery = `
            SELECT 
                DATE(timestamp) as activity_date,
                COUNT(*) as entry_count,
                COUNT(DISTINCT claim_id) as claim_count
            FROM claim_history
            WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ${whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : ''}
            GROUP BY DATE(timestamp)
            ORDER BY activity_date DESC
        `;

        const dailyActivity = await executeQuery(dailyActivityQuery, queryParams);

        ResponseHelpers.sendSuccess(res, {
            statistics: stats,
            actionBreakdown,
            dailyActivity
        }, 'History statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get claim history statistics');
    }
};

/**
 * Helper function to log detailed claim changes
 */
async function logClaimChanges(originalClaim, updatedData, userId, req) {
    try {
        const fieldsToTrack = [
            'patient_name', 'service_date', 'procedure_code', 'diagnosis_code',
            'total_amount', 'unit_price', 'code_units', 'status', 'payer_name',
            'npi_number', 'taxonomy_code', 'place_of_service', 'notes'
        ];

        for (const field of fieldsToTrack) {
            if (updatedData[field] !== undefined && originalClaim[field] !== updatedData[field]) {
                await historyService.logHistory({
                    claimId: originalClaim.id,
                    actionType: 'updated',
                    fieldName: field,
                    oldValue: originalClaim[field]?.toString() || null,
                    newValue: updatedData[field]?.toString() || null,
                    userId,
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    sessionId: req.sessionID,
                    notes: `Field ${field} updated`,
                    metadata: {
                        field_type: typeof updatedData[field],
                        update_source: 'manual_edit',
                        timestamp: new Date().toISOString()
                    }
                });
            }
        }

        // Log overall update
        await historyService.logHistory({
            claimId: originalClaim.id,
            actionType: 'updated',
            userId,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            notes: 'Claim updated via API',
            metadata: {
                updated_fields: fieldsToTrack.filter(field =>
                    updatedData[field] !== undefined && originalClaim[field] !== updatedData[field]
                ),
                update_source: 'api',
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error logging claim changes:', error);
        // Don't throw error to avoid breaking the main operation
    }
}

/**
 * Helper function to log claim submission
 */
async function logClaimSubmission(claimId, userId, req, submissionData = {}) {
    try {
        await historyService.logSubmission(claimId, userId, {
            ...submissionData,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error logging claim submission:', error);
    }
}

/**
 * Helper function to log payment posting
 */
async function logPaymentPosting(claimId, userId, req, paymentData = {}) {
    try {
        await historyService.logHistory({
            claimId,
            actionType: 'paid',
            fieldName: 'payment_amount',
            newValue: paymentData.amount?.toString(),
            userId,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.sessionID,
            notes: `Payment posted: ${paymentData.amount ? `$${paymentData.amount}` : 'Amount not specified'}`,
            metadata: {
                payment_method: paymentData.method,
                payment_date: paymentData.date,
                check_number: paymentData.checkNumber,
                adjustment_amount: paymentData.adjustmentAmount,
                adjustment_reason: paymentData.adjustmentReason,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error logging payment posting:', error);
    }
}

/**
 * Enhanced update claim status with detailed logging
 */
rcmController.updateClaimStatusEnhanced = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const { status, reason, notes } = req.body;
        const userId = req.user?.user_id;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        // Get current claim
        const currentClaim = await rcmService.getClaimById(claimId);
        if (!currentClaim) {
            return ResponseHelpers.sendNotFoundError(res, 'Claim not found');
        }

        const oldStatus = currentClaim.status;

        // Update status
        const result = await rcmService.updateClaimStatus(claimId, { status, notes, userId });

        // Log status change with detailed information
        await historyService.logStatusChange(claimId, oldStatus, status, userId, reason, {
            previous_status_name: getStatusName(oldStatus),
            new_status_name: getStatusName(status),
            change_reason: reason,
            user_notes: notes,
            ip_address: req.ip || req.connection?.remoteAddress,
            user_agent: req.get('User-Agent'),
            session_id: req.sessionID,
            timestamp: new Date().toISOString()
        });

        ResponseHelpers.sendSuccess(res, result, 'Claim status updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update claim status');
    }
};

/**
 * Enhanced post payment with detailed logging
 */
rcmController.postPaymentEnhanced = async (req, res) => {
    try {
        const {
            claimId,
            paymentAmount,
            paymentDate,
            paymentMethod,
            checkNumber,
            adjustmentAmount,
            adjustmentReason
        } = req.body;
        const userId = req.user?.user_id;

        // Post the payment
        const result = await rcmService.postPayment({
            claimId,
            paymentAmount,
            paymentDate,
            paymentMethod,
            checkNumber,
            adjustmentAmount,
            adjustmentReason,
            userId
        });

        // Log payment posting
        await logPaymentPosting(claimId, userId, req, {
            amount: paymentAmount,
            date: paymentDate,
            method: paymentMethod,
            checkNumber,
            adjustmentAmount,
            adjustmentReason
        });

        ResponseHelpers.sendSuccess(res, result, 'Payment posted successfully');
    } catch (error) {
        handleControllerError(error, res, 'Post payment');
    }
};

/**
 * Get status name from status code
 */
function getStatusName(statusCode) {
    const statusNames = {
        0: 'Draft',
        1: 'Submitted',
        2: 'Paid',
        3: 'Denied',
        4: 'Appealed'
    };
    return statusNames[statusCode] || `Status ${statusCode}`;
}

// Initialize services
const commentService = new CommentService();
const followUpService = new FollowUpService();
const cms1500Generator = new CMS1500Generator();
const ub04Generator = new UB04Generator();

/**
 * Get comments for a claim
 */
rcmController.getClaimComments = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            page = 1,
            limit = 20,
            type: commentType,
            priority,
            status = 'active',
            search,
            showPrivate = true
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const result = await commentService.getClaimComments(claimId, {
            page: parseInt(page),
            limit: parseInt(limit),
            commentType,
            priority,
            status,
            search,
            showPrivate: showPrivate === 'true',
            userId: req.user?.user_id
        });

        ResponseHelpers.sendSuccess(res, result, 'Comments retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get claim comments');
    }
};

/**
 * Create a new comment
 */
rcmController.createComment = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            comment_text,
            comment_type = 'internal',
            parent_comment_id,
            is_private = false,
            priority = 'medium',
            mentions = []
        } = req.body;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        if (!comment_text || !comment_text.trim()) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'comment_text', message: 'Comment text is required' }
            ]);
        }

        const commentData = {
            claimId,
            parentCommentId: parent_comment_id ? parseInt(parent_comment_id) : null,
            userId: req.user?.user_id,
            commentText: comment_text.trim(),
            commentType: comment_type,
            isPrivate: is_private === true || is_private === 'true',
            priority,
            mentions: Array.isArray(mentions) ? mentions : []
        };

        const files = req.files || [];
        const result = await commentService.createComment(commentData, files);

        ResponseHelpers.sendSuccess(res, result, 'Comment created successfully');
    } catch (error) {
        handleControllerError(error, res, 'Create comment');
    }
};

/**
 * Update a comment
 */
rcmController.updateComment = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const { comment_text, priority, status } = req.body;

        if (!commentId || isNaN(commentId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'commentId', message: 'Valid comment ID is required' }
            ]);
        }

        const updateData = {};
        if (comment_text !== undefined) updateData.commentText = comment_text.trim();
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;

        const result = await commentService.updateComment(commentId, updateData, req.user?.user_id);

        ResponseHelpers.sendSuccess(res, result, 'Comment updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update comment');
    }
};

/**
 * Delete a comment
 */
rcmController.deleteComment = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);

        if (!commentId || isNaN(commentId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'commentId', message: 'Valid comment ID is required' }
            ]);
        }

        await commentService.deleteComment(commentId, req.user?.user_id);

        ResponseHelpers.sendSuccess(res, { deleted: true }, 'Comment deleted successfully');
    } catch (error) {
        handleControllerError(error, res, 'Delete comment');
    }
};

/**
 * Get comment replies
 */
rcmController.getCommentReplies = async (req, res) => {
    try {
        const commentId = parseInt(req.params.commentId);
        const { showPrivate = true } = req.query;

        if (!commentId || isNaN(commentId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'commentId', message: 'Valid comment ID is required' }
            ]);
        }

        const replies = await commentService.getCommentReplies(commentId, {
            showPrivate: showPrivate === 'true',
            userId: req.user?.user_id
        });

        ResponseHelpers.sendSuccess(res, { replies }, 'Replies retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get comment replies');
    }
};

/**
 * Search comments
 */
rcmController.searchComments = async (req, res) => {
    try {
        const {
            query,
            claimId,
            userId,
            commentType,
            priority,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20
        } = req.query;

        if (!query) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'query', message: 'Search query is required' }
            ]);
        }

        const searchOptions = {
            query,
            claimId: claimId ? parseInt(claimId) : null,
            userId: userId ? parseInt(userId) : null,
            commentType,
            priority,
            dateFrom,
            dateTo,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const result = await commentService.searchComments(searchOptions);

        ResponseHelpers.sendSuccess(res, result, 'Comment search completed');
    } catch (error) {
        handleControllerError(error, res, 'Search comments');
    }
};

/**
 * Get comment statistics
 */
rcmController.getCommentStatistics = async (req, res) => {
    try {
        const { claimId } = req.query;

        const result = await commentService.getCommentStatistics(
            claimId ? parseInt(claimId) : null
        );

        ResponseHelpers.sendSuccess(res, result, 'Comment statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get comment statistics');
    }
};

/**
 * Get follow-ups for a claim or user
 */
rcmController.getFollowUps = async (req, res) => {
    try {
        const {
            claimId,
            assignedUser,
            createdBy,
            type: followupType,
            status,
            priority,
            dateFrom,
            dateTo,
            search,
            page = 1,
            limit = 20,
            sortBy = 'scheduled_date',
            sortOrder = 'ASC'
        } = req.query;

        const options = {
            claimId: claimId ? parseInt(claimId) : null,
            assignedUserId: assignedUser ? parseInt(assignedUser) : null,
            createdBy: createdBy ? parseInt(createdBy) : null,
            followupType,
            status,
            priority,
            dateFrom,
            dateTo,
            search,
            page: parseInt(page),
            limit: parseInt(limit),
            sortBy,
            sortOrder
        };

        const result = await followUpService.getFollowUps(options);

        ResponseHelpers.sendSuccess(res, result, 'Follow-ups retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get follow-ups');
    }
};

/**
 * Get follow-ups for a specific claim
 */
rcmController.getClaimFollowUps = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            status,
            priority,
            assignedUser,
            page = 1,
            limit = 20
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const options = {
            claimId,
            status,
            priority,
            assignedUserId: assignedUser ? parseInt(assignedUser) : null,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const result = await followUpService.getFollowUps(options);

        ResponseHelpers.sendSuccess(res, result, 'Claim follow-ups retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get claim follow-ups');
    }
};

/**
 * Create a new follow-up
 */
rcmController.createFollowUp = async (req, res) => {
    try {
        const {
            claim_id,
            assigned_user_id,
            followup_type,
            title,
            description,
            scheduled_date,
            due_date,
            priority,
            estimated_minutes,
            tags
        } = req.body;

        if (!claim_id || !assigned_user_id || !followup_type || !title || !scheduled_date) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'required_fields', message: 'Claim ID, assigned user, type, title, and scheduled date are required' }
            ]);
        }

        const followUpData = {
            claimId: parseInt(claim_id),
            assignedUserId: parseInt(assigned_user_id),
            createdBy: req.user?.user_id,
            followupType: followup_type,
            title: title.trim(),
            description: description?.trim(),
            scheduledDate: scheduled_date,
            dueDate: due_date,
            priority,
            estimatedMinutes: estimated_minutes ? parseInt(estimated_minutes) : null,
            tags: Array.isArray(tags) ? tags : []
        };

        const result = await followUpService.createFollowUp(followUpData);

        ResponseHelpers.sendSuccess(res, result, 'Follow-up created successfully');
    } catch (error) {
        handleControllerError(error, res, 'Create follow-up');
    }
};

/**
 * Update a follow-up
 */
rcmController.updateFollowUp = async (req, res) => {
    try {
        const followUpId = parseInt(req.params.followUpId);
        const {
            title,
            description,
            scheduled_date,
            due_date,
            priority,
            status,
            assigned_user_id,
            estimated_minutes,
            actual_minutes,
            tags
        } = req.body;

        if (!followUpId || isNaN(followUpId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'followUpId', message: 'Valid follow-up ID is required' }
            ]);
        }

        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description?.trim();
        if (scheduled_date !== undefined) updateData.scheduledDate = scheduled_date;
        if (due_date !== undefined) updateData.dueDate = due_date;
        if (priority !== undefined) updateData.priority = priority;
        if (status !== undefined) updateData.status = status;
        if (assigned_user_id !== undefined) updateData.assignedUserId = parseInt(assigned_user_id);
        if (estimated_minutes !== undefined) updateData.estimatedMinutes = parseInt(estimated_minutes);
        if (actual_minutes !== undefined) updateData.actualMinutes = parseInt(actual_minutes);
        if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

        const result = await followUpService.updateFollowUp(followUpId, updateData, req.user?.user_id);

        ResponseHelpers.sendSuccess(res, result, 'Follow-up updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update follow-up');
    }
};

/**
 * Complete a follow-up
 */
rcmController.completeFollowUp = async (req, res) => {
    try {
        const followUpId = parseInt(req.params.followUpId);
        const {
            outcome,
            actual_minutes,
            next_followup_date,
            next_followup_type,
            next_followup_title
        } = req.body;

        if (!followUpId || isNaN(followUpId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'followUpId', message: 'Valid follow-up ID is required' }
            ]);
        }

        if (!outcome || !outcome.trim()) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'outcome', message: 'Outcome is required to complete follow-up' }
            ]);
        }

        const completionData = {
            outcome: outcome.trim(),
            actualMinutes: actual_minutes ? parseInt(actual_minutes) : null,
            nextFollowupDate: next_followup_date,
            nextFollowupType: next_followup_type,
            nextFollowupTitle: next_followup_title?.trim()
        };

        const result = await followUpService.completeFollowUp(followUpId, completionData, req.user?.user_id);

        ResponseHelpers.sendSuccess(res, result, 'Follow-up completed successfully');
    } catch (error) {
        handleControllerError(error, res, 'Complete follow-up');
    }
};

/**
 * Delete a follow-up
 */
rcmController.deleteFollowUp = async (req, res) => {
    try {
        const followUpId = parseInt(req.params.followUpId);

        if (!followUpId || isNaN(followUpId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'followUpId', message: 'Valid follow-up ID is required' }
            ]);
        }

        await followUpService.deleteFollowUp(followUpId, req.user?.user_id);

        ResponseHelpers.sendSuccess(res, { deleted: true }, 'Follow-up deleted successfully');
    } catch (error) {
        handleControllerError(error, res, 'Delete follow-up');
    }
};

/**
 * Get follow-up statistics
 */
rcmController.getFollowUpStatistics = async (req, res) => {
    try {
        const {
            claimId,
            assignedUser,
            dateFrom,
            dateTo
        } = req.query;

        const options = {
            claimId: claimId ? parseInt(claimId) : null,
            assignedUserId: assignedUser ? parseInt(assignedUser) : null,
            dateFrom,
            dateTo
        };

        const result = await followUpService.getFollowUpStatistics(options);

        ResponseHelpers.sendSuccess(res, result, 'Follow-up statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get follow-up statistics');
    }
};

/**
 * Get calendar events for follow-ups
 */
rcmController.getFollowUpCalendarEvents = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            assignedUser,
            claimId
        } = req.query;

        const options = {
            startDate,
            endDate,
            assignedUserId: assignedUser ? parseInt(assignedUser) : null,
            claimId: claimId ? parseInt(claimId) : null
        };

        const events = await followUpService.getCalendarEvents(options);

        ResponseHelpers.sendSuccess(res, { events }, 'Calendar events retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get calendar events');
    }
};

/**
 * Search follow-ups
 */
rcmController.searchFollowUps = async (req, res) => {
    try {
        const {
            query,
            claimId,
            assignedUser,
            followupType,
            priority,
            status,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20
        } = req.query;

        if (!query) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'query', message: 'Search query is required' }
            ]);
        }

        const searchOptions = {
            query,
            claimId: claimId ? parseInt(claimId) : null,
            assignedUserId: assignedUser ? parseInt(assignedUser) : null,
            followupType,
            priority,
            status,
            dateFrom,
            dateTo,
            page: parseInt(page),
            limit: parseInt(limit)
        };

        const result = await followUpService.searchFollowUps(searchOptions);

        ResponseHelpers.sendSuccess(res, result, 'Follow-up search completed');
    } catch (error) {
        handleControllerError(error, res, 'Search follow-ups');
    }
};

/**
 * Process overdue follow-ups (admin endpoint)
 */
rcmController.processOverdueFollowUps = async (req, res) => {
    try {
        const result = await followUpService.processOverdueFollowUps();

        ResponseHelpers.sendSuccess(res, result, 'Overdue follow-ups processed successfully');
    } catch (error) {
        handleControllerError(error, res, 'Process overdue follow-ups');
    }
};

/**
 * Send follow-up reminders (admin endpoint)
 */
rcmController.sendFollowUpReminders = async (req, res) => {
    try {
        const result = await followUpService.sendReminders();

        ResponseHelpers.sendSuccess(res, result, 'Follow-up reminders sent successfully');
    } catch (error) {
        handleControllerError(error, res, 'Send follow-up reminders');
    }
};

/**
 * Generate CMS-1500 form for a claim
 */
rcmController.generateCMS1500Form = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            format = 'pdf',
            includeFormBackground = true,
            isDraft = false
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const options = {
            format,
            includeFormBackground: includeFormBackground === 'true',
            isDraft: isDraft === 'true',
            userId: req.user?.user_id
        };

        const result = await cms1500Generator.generateForm(claimId, options);

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=CMS1500-${claimId}.pdf`);
            res.send(result);
        } else {
            ResponseHelpers.sendSuccess(res, result, 'CMS-1500 form generated successfully');
        }
    } catch (error) {
        handleControllerError(error, res, 'Generate CMS-1500 form');
    }
};

/**
 * Generate UB-04 form for a claim
 */
rcmController.generateUB04Form = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            format = 'pdf',
            includeFormBackground = true,
            isDraft = false
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const options = {
            format,
            includeFormBackground: includeFormBackground === 'true',
            isDraft: isDraft === 'true',
            userId: req.user?.user_id
        };

        const result = await ub04Generator.generateForm(claimId, options);

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=UB04-${claimId}.pdf`);
            res.send(result);
        } else {
            ResponseHelpers.sendSuccess(res, result, 'UB-04 form generated successfully');
        }
    } catch (error) {
        handleControllerError(error, res, 'Generate UB-04 form');
    }
};

// Add missing controller methods that are used in routes

// Create claim method
rcmController.createClaim = async (req, res) => {
    try {
        const claimData = req.body;

        const query = `
      INSERT INTO billings (
        patient_id,
        provider_id,
        service_date,
        diagnosis_code,
        procedure_code,
        total_amount,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

        const params = [
            claimData.patient_id,
            claimData.provider_id,
            claimData.service_date,
            claimData.diagnosis_code,
            claimData.procedure_code,
            claimData.total_amount
        ];

        const result = await executeQuery(query, params);
        const claimId = result.insertId;

        // Add history entry
        await historyService.addHistoryEntry(claimId, {
            action: 'claim_created',
            details: { status: 'pending' },
            userId: req.user?.id
        });

        res.status(201).json({
            success: true,
            data: { id: claimId },
            message: 'Claim created successfully'
        });
    } catch (error) {
        console.error('Error creating claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create claim',
            error: error.message
        });
    }
};

// Get claim by ID method
rcmController.getClaimById = async (req, res) => {
    try {
        const { claimId } = req.params;

        const query = `
      SELECT 
        b.*,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name,
        p.date_of_birth as patient_dob,
        p.gender as patient_gender,
        p.address as patient_address,
        p.city as patient_city,
        p.state as patient_state,
        p.zip_code as patient_zip,
        pr.first_name as provider_first_name,
        pr.last_name as provider_last_name,
        pr.npi_number as provider_npi
      FROM billings b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN providers pr ON b.provider_id = pr.id
      WHERE b.id = ?
    `;

        const claim = await executeQuerySingle(query, [claimId]);

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        res.json({
            success: true,
            data: claim
        });
    } catch (error) {
        console.error('Error getting claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get claim',
            error: error.message
        });
    }
};

// Update claim method
rcmController.updateClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const updateData = req.body;

        // Get current claim for history
        const currentClaim = await executeQuerySingle('SELECT * FROM billings WHERE id = ?', [claimId]);
        if (!currentClaim) {
            return res.status(404).json({
                success: false,
                message: 'Claim not found'
            });
        }

        const query = `
      UPDATE billings SET
        patient_id = COALESCE(?, patient_id),
        provider_id = COALESCE(?, provider_id),
        service_date = COALESCE(?, service_date),
        diagnosis_code = COALESCE(?, diagnosis_code),
        procedure_code = COALESCE(?, procedure_code),
        total_amount = COALESCE(?, total_amount),
        status = COALESCE(?, status),
        updated_at = NOW()
      WHERE id = ?
    `;

        const params = [
            updateData.patient_id,
            updateData.provider_id,
            updateData.service_date,
            updateData.diagnosis_code,
            updateData.procedure_code,
            updateData.total_amount,
            updateData.status,
            claimId
        ];

        await executeQuery(query, params);

        // Track status change if applicable
        if (updateData.status && updateData.status !== currentClaim.status) {
            await historyService.trackStatusChange(
                claimId,
                currentClaim.status,
                updateData.status,
                req.user?.id
            );
        }

        res.json({
            success: true,
            message: 'Claim updated successfully'
        });
    } catch (error) {
        console.error('Error updating claim:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update claim',
            error: error.message
        });
    }
};

rcmController.getDashboardData = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Dashboard data endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard data',
            error: error.message
        });
    }
};

rcmController.getClaimsStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Claims status endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting claims status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get claims status',
            error: error.message
        });
    }
};

rcmController.getClaimHistory = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Claim history endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting claim history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get claim history',
            error: error.message
        });
    }
};

rcmController.exportClaimHistory = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Export claim history endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error exporting claim history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to export claim history',
            error: error.message
        });
    }
};

rcmController.bulkUpdateClaimStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Bulk update claim status endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error bulk updating claim status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to bulk update claim status',
            error: error.message
        });
    }
};

rcmController.updateClaimStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Update claim status endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update claim status',
            error: error.message
        });
    }
};

rcmController.getARAgingReport = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'AR aging report endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting AR aging report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AR aging report',
            error: error.message
        });
    }
};

rcmController.getCollectionsWorkflow = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Collections workflow endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting collections workflow:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get collections workflow',
            error: error.message
        });
    }
};

rcmController.updateCollectionStatus = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Update collection status endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error updating collection status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update collection status',
            error: error.message
        });
    }
};

rcmController.getDenialAnalytics = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Denial analytics endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting denial analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get denial analytics',
            error: error.message
        });
    }
};

rcmController.getPaymentPostingData = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Payment posting data endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error getting payment posting data:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get payment posting data',
            error: error.message
        });
    }
};

rcmController.processERAFile = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Process ERA file endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error processing ERA file:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process ERA file',
            error: error.message
        });
    }
};

rcmController.postPayment = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Post payment endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error posting payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to post payment',
            error: error.message
        });
    }
};

rcmController.generateRCMReport = async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                message: 'Generate RCM report endpoint - implementation pending'
            }
        });
    } catch (error) {
        console.error('Error generating RCM report:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate RCM report',
            error: error.message
        });
    }
};

// Add all other missing methods with similar pattern
const missingMethods = [
    'getQueryPerformanceStats', 'resetPerformanceMetrics', 'invalidateCache',
    'validateClaim', 'validateClaimData', 'validateNPI', 'checkNCCIEdits',
    'getCMSValidationRules', 'batchValidateClaims', 'getValidationStatistics',
    'validateTaxonomyCode', 'getValidationHistory', 'batchAdvancedValidation',
    'getAdvancedValidationStatistics', 'validateMedicalNecessity', 'validateTimelyFiling',
    'validateProviderEnrollment', 'validateFrequencyLimits', 'validatePayerCompliance',
    'validateClaimCompleteness', 'getComplianceDashboard', 'getComplianceMonitor',
    'getComplianceMetrics', 'getComplianceAlerts', 'bulkAcknowledgeAlerts',
    'getComplianceTrends', 'getRiskAssessment', 'generateComplianceReport'
];

missingMethods.forEach(methodName => {
    rcmController[methodName] = async (req, res) => {
        try {
            res.json({
                success: true,
                data: {
                    message: `${methodName} endpoint - implementation pending`
                }
            });
        } catch (error) {
            console.error(`Error in ${methodName}:`, error);
            res.status(500).json({
                success: false,
                message: `Failed to execute ${methodName}`,
                error: error.message
            });
        }
    };
});

module.exports = rcmController;

/**
 * Preview CMS-1500 form data
 */
rcmController.previewCMS1500Form = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const previewData = await cms1500Generator.previewForm(claimId);

        ResponseHelpers.sendSuccess(res, previewData, 'CMS-1500 form preview generated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Preview CMS-1500 form');
    }
};

/**
 * Batch generate CMS-1500 forms
 */
rcmController.batchGenerateCMS1500Forms = async (req, res) => {
    try {
        const { claimIds, options = {} } = req.body;

        if (!Array.isArray(claimIds) || claimIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Array of claim IDs is required' }
            ]);
        }

        if (claimIds.length > 50) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Maximum 50 claims can be processed at once' }
            ]);
        }

        const generationOptions = {
            ...options,
            userId: req.user?.user_id
        };

        const results = await cms1500Generator.batchGenerate(claimIds, generationOptions);

        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            totalSize: results.reduce((sum, r) => sum + (r.size || 0), 0)
        };

        ResponseHelpers.sendSuccess(res, {
            summary,
            results: results.map(r => ({
                claimId: r.claimId,
                success: r.success,
                error: r.error,
                size: r.size
            }))
        }, 'Batch CMS-1500 generation completed');
    } catch (error) {
        handleControllerError(error, res, 'Batch generate CMS-1500 forms');
    }
};

/**
 * Validate claim data for CMS-1500 form generation
 */
rcmController.validateCMS1500Data = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        // Get claim data and validate
        const claimData = await cms1500Generator.getClaimData(claimId);
        const validationResult = cms1500Generator.validateClaimData(claimData);

        ResponseHelpers.sendSuccess(res, {
            claimId,
            validation: validationResult,
            canGenerate: validationResult.isValid,
            requiredFields: validationResult.errors.length,
            warnings: validationResult.warnings.length
        }, 'CMS-1500 validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate CMS-1500 data');
    }
};

/**
 * Get CMS-1500 form generation history
 */
rcmController.getCMS1500History = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            page = 1,
            limit = 20
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const historyData = await historyService.getClaimHistory(claimId, {
            page: parseInt(page),
            limit: parseInt(limit),
            actionType: 'form_generated'
        });

        ResponseHelpers.sendSuccess(res, historyData, 'CMS-1500 generation history retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get CMS-1500 history');
    }
};

/**
 * Generate UB-04 form for an institutional claim
 */
rcmController.generateUB04Form = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            format = 'pdf',
            includeFormBackground = true,
            isDraft = false
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const options = {
            includeFormBackground: includeFormBackground === 'true',
            isDraft: isDraft === 'true',
            userId: req.user?.user_id
        };

        const pdfBuffer = await ub04Generator.generateForm(claimId, options);

        // Set response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=\"UB04-${claimId}.pdf\"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        handleControllerError(error, res, 'Generate UB-04 form');
    }
};

/**
 * Preview UB-04 form data
 */
rcmController.previewUB04Form = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const previewData = await ub04Generator.previewForm(claimId);

        ResponseHelpers.sendSuccess(res, previewData, 'UB-04 form preview generated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Preview UB-04 form');
    }
};

/**
 * Batch generate UB-04 forms
 */
rcmController.batchGenerateUB04Forms = async (req, res) => {
    try {
        const { claimIds, options = {} } = req.body;

        if (!Array.isArray(claimIds) || claimIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Array of claim IDs is required' }
            ]);
        }

        if (claimIds.length > 50) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Maximum 50 claims can be processed at once' }
            ]);
        }

        const generationOptions = {
            ...options,
            userId: req.user?.user_id
        };

        const results = await ub04Generator.batchGenerate(claimIds, generationOptions);

        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            totalSize: results.reduce((sum, r) => sum + (r.size || 0), 0)
        };

        ResponseHelpers.sendSuccess(res, {
            summary,
            results: results.map(r => ({
                claimId: r.claimId,
                success: r.success,
                error: r.error,
                size: r.size
            }))
        }, 'Batch UB-04 generation completed');
    } catch (error) {
        handleControllerError(error, res, 'Batch generate UB-04 forms');
    }
};

/**
 * Validate institutional claim data for UB-04 form generation
 */
rcmController.validateUB04Data = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        // Get claim data and validate
        const claimData = await ub04Generator.getInstitutionalClaimData(claimId);
        const validationResult = ub04Generator.validateClaimData(claimData);

        ResponseHelpers.sendSuccess(res, {
            claimId,
            validation: validationResult,
            canGenerate: validationResult.isValid,
            requiredFields: validationResult.errors.length,
            warnings: validationResult.warnings.length,
            revenueLineCount: claimData.revenue_lines?.length || 0,
            diagnosisCount: claimData.diagnosis_codes?.length || 0
        }, 'UB-04 validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate UB-04 data');
    }
};

/**
 * Get UB-04 form generation history
 */
rcmController.getUB04History = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const {
            page = 1,
            limit = 20
        } = req.query;

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const historyData = await historyService.getClaimHistory(claimId, {
            page: parseInt(page),
            limit: parseInt(limit),
            actionType: 'form_generated',
            formType: 'UB-04'
        });

        ResponseHelpers.sendSuccess(res, historyData, 'UB-04 generation history retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get UB-04 history');
    }
};

/**
 * Validate revenue code
 */
rcmController.validateRevenueCode = async (req, res) => {
    try {
        const { revenueCode } = req.body;

        if (!revenueCode) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'revenueCode', message: 'Revenue code is required' }
            ]);
        }

        const isValid = ub04Generator.validateRevenueCode(revenueCode);
        const description = ub04Generator.revenueCodes[revenueCode];

        ResponseHelpers.sendSuccess(res, {
            revenueCode,
            isValid,
            description: description || null,
            category: this.getRevenueCodeCategory(revenueCode)
        }, 'Revenue code validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate revenue code');
    }
};

/**
 * Validate bill type
 */
rcmController.validateBillType = async (req, res) => {
    try {
        const { billType } = req.body;

        if (!billType) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'billType', message: 'Bill type is required' }
            ]);
        }

        const validationResult = ub04Generator.validateBillType(billType);

        ResponseHelpers.sendSuccess(res, {
            billType,
            ...validationResult
        }, 'Bill type validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate bill type');
    }
};

/**
 * Get revenue code category
 * @ private
 */
const getRevenueCodeCategory = (revenueCode) => {
    const code = revenueCode.substring(0, 2);
    const categories = {
        '01': 'All Inclusive Rate',
        '02': 'Room and Board',
        '03': 'Laboratory',
        '04': 'Radiology',
        '05': 'Nuclear Medicine',
        '06': 'Operating Room',
        '07': 'Anesthesia',
        '08': 'Blood',
        '09': 'Blood Storage'
    };
    return categories[code] || 'Other';
}

// Initialize Advanced CMS Validation Service
const AdvancedCMSValidationService = require('./advancedCMSValidationService');
const advancedValidationService = new AdvancedCMSValidationService();

/**
 * Perform advanced CMS validation on a claim
 */
rcmController.performAdvancedValidation = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const options = {
            userId: req.user?.user_id,
            includeRecommendations: req.query.includeRecommendations !== 'false',
            detailedAnalysis: req.query.detailedAnalysis === 'true'
        };

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const validationResults = await advancedValidationService.performAdvancedValidation(claimId, options);

        ResponseHelpers.sendSuccess(res, validationResults, 'Advanced CMS validation completed successfully');
    } catch (error) {
        handleControllerError(error, res, 'Perform advanced CMS validation');
    }
};

/**
 * Get validation history for a claim
 */
rcmController.getValidationHistory = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const history = await advancedValidationService.getValidationHistory(claimId);

        ResponseHelpers.sendSuccess(res, {
            claimId,
            history,
            totalEntries: history.length
        }, 'Validation history retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get validation history');
    }
};

/**
 * Batch advanced validation for multiple claims
 */
rcmController.batchAdvancedValidation = async (req, res) => {
    try {
        const { claimIds, options = {} } = req.body;

        if (!Array.isArray(claimIds) || claimIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Array of claim IDs is required' }
            ]);
        }

        if (claimIds.length > 100) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Maximum 100 claims can be validated at once' }
            ]);
        }

        const validationOptions = {
            ...options,
            userId: req.user?.user_id
        };

        const results = await advancedValidationService.batchValidate(claimIds, validationOptions);

        ResponseHelpers.sendSuccess(res, results, 'Batch advanced validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Batch advanced validation');
    }
};

/**
 * Get advanced validation statistics
 */
rcmController.getAdvancedValidationStatistics = async (req, res) => {
    try {
        const filters = {
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            payer_type: req.query.payer_type,
            provider_id: req.query.provider_id
        };

        const statistics = await advancedValidationService.getValidationStatistics(filters);

        ResponseHelpers.sendSuccess(res, statistics, 'Advanced validation statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get advanced validation statistics');
    }
};

/**
 * Validate medical necessity for claim data
 */
rcmController.validateMedicalNecessity = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        // Create a temporary claim data object for validation
        const tempClaimData = {
            ...claimData,
            service_lines: claimData.service_lines || [],
            diagnosis_codes: claimData.diagnosis_codes || []
        };

        const validationResult = await advancedValidationService.validateMedicalNecessity(tempClaimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'medical_necessity',
            result: validationResult
        }, 'Medical necessity validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate medical necessity');
    }
};

/**
 * Validate timely filing requirements
 */
rcmController.validateTimelyFiling = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        const validationResult = await advancedValidationService.validateTimelyFiling(claimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'timely_filing',
            result: validationResult
        }, 'Timely filing validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate timely filing');
    }
};

/**
 * Validate provider enrollment status
 */
rcmController.validateProviderEnrollment = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        const validationResult = await advancedValidationService.validateProviderEnrollment(claimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'provider_enrollment',
            result: validationResult
        }, 'Provider enrollment validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate provider enrollment');
    }
};

/**
 * Validate frequency and quantity limits
 */
rcmController.validateFrequencyLimits = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        const validationResult = await advancedValidationService.validateFrequencyLimits(claimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'frequency_limits',
            result: validationResult
        }, 'Frequency limits validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate frequency limits');
    }
};

/**
 * Validate payer-specific compliance
 */
rcmController.validatePayerCompliance = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        const validationResult = await advancedValidationService.validatePayerCompliance(claimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'payer_compliance',
            result: validationResult
        }, 'Payer compliance validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate payer compliance');
    }
};

/**
 * Validate claim completeness
 */
rcmController.validateClaimCompleteness = async (req, res) => {
    try {
        const { claimData } = req.body;

        if (!claimData) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimData', message: 'Claim data is required' }
            ]);
        }

        const validationResult = await advancedValidationService.validateClaimCompleteness(claimData);

        ResponseHelpers.sendSuccess(res, {
            validation_type: 'claim_completeness',
            result: validationResult
        }, 'Claim completeness validation completed');
    } catch (error) {
        handleControllerError(error, res, 'Validate claim completeness');
    }
};

// Initialize Compliance Monitoring Service
const ComplianceMonitoringService = require('./complianceMonitoringService');
const complianceService = new ComplianceMonitoringService();

/**
 * Get compliance metrics
 */
rcmController.getComplianceMetrics = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            providerId: req.query.providerId,
            payerType: req.query.payerType
        };

        const metrics = await complianceService.getComplianceMetrics(filters);

        ResponseHelpers.sendSuccess(res, metrics, 'Compliance metrics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance metrics');
    }
};

/**
 * Get compliance alerts
 */
rcmController.getComplianceAlerts = async (req, res) => {
    try {
        const filters = {
            severity: req.query.severity,
            type: req.query.type,
            limit: parseInt(req.query.limit) || 50
        };

        const alerts = await complianceService.getComplianceAlerts(filters);

        ResponseHelpers.sendSuccess(res, alerts, 'Compliance alerts retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance alerts');
    }
};

/**
 * Get compliance trends
 */
rcmController.getComplianceTrends = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            providerId: req.query.providerId,
            payerType: req.query.payerType
        };

        const trends = await complianceService.getComplianceTrends(filters);

        ResponseHelpers.sendSuccess(res, trends, 'Compliance trends retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance trends');
    }
};

/**
 * Get risk assessment
 */
rcmController.getRiskAssessment = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            providerId: req.query.providerId
        };

        const riskAssessment = await complianceService.performRiskAssessment(filters);

        ResponseHelpers.sendSuccess(res, riskAssessment, 'Risk assessment completed successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get risk assessment');
    }
};

/**
 * Generate compliance report
 */
rcmController.generateComplianceReport = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            providerId: req.query.providerId,
            payerType: req.query.payerType,
            format: req.query.format || 'json'
        };

        const report = await complianceService.generateComplianceReport(filters);

        if (filters.format === 'pdf') {
            // Generate PDF report
            const pdfBuffer = await complianceService.generateComplianceReportPDF(report);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${report.report_id}.pdf"`);
            res.setHeader('Content-Length', pdfBuffer.length);

            res.send(pdfBuffer);
        } else {
            ResponseHelpers.sendSuccess(res, report, 'Compliance report generated successfully');
        }
    } catch (error) {
        handleControllerError(error, res, 'Generate compliance report');
    }
};

/**
 * Export compliance report
 */
rcmController.exportComplianceReport = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            providerId: req.query.providerId,
            payerType: req.query.payerType
        };

        const report = await complianceService.generateComplianceReport(filters);
        const pdfBuffer = await complianceService.generateComplianceReportPDF(report);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${new Date().toISOString().split('T')[0]}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        res.send(pdfBuffer);
    } catch (error) {
        handleControllerError(error, res, 'Export compliance report');
    }
};

/**
 * Get compliance dashboard data
 */
rcmController.getComplianceDashboard = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d'
        };

        // Get all dashboard data in parallel
        const [metrics, alerts, trends, riskAssessment] = await Promise.all([
            complianceService.getComplianceMetrics(filters),
            complianceService.getComplianceAlerts({ limit: 10 }),
            complianceService.getComplianceTrends(filters),
            complianceService.performRiskAssessment(filters)
        ]);

        const dashboardData = {
            metrics,
            alerts: alerts.slice(0, 5), // Top 5 alerts for dashboard
            trends,
            risk_assessment: riskAssessment,
            last_updated: new Date().toISOString()
        };

        ResponseHelpers.sendSuccess(res, dashboardData, 'Compliance dashboard data retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance dashboard');
    }
};

/**
 * Acknowledge compliance alert
 */
rcmController.acknowledgeComplianceAlert = async (req, res) => {
    try {
        const alertId = req.params.alertId;
        const { acknowledgment_note, user_id } = req.body;

        if (!alertId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'alertId', message: 'Alert ID is required' }
            ]);
        }

        const result = await complianceService.acknowledgeAlert(alertId, {
            acknowledgment_note,
            user_id: user_id || req.user?.user_id,
            acknowledged_at: new Date().toISOString()
        });

        ResponseHelpers.sendSuccess(res, result, 'Compliance alert acknowledged successfully');
    } catch (error) {
        handleControllerError(error, res, 'Acknowledge compliance alert');
    }
};

/**
 * Get compliance statistics
 */
rcmController.getComplianceStatistics = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            groupBy: req.query.groupBy || 'day' // day, week, month
        };

        const statistics = await complianceService.getComplianceStatistics(filters);

        ResponseHelpers.sendSuccess(res, statistics, 'Compliance statistics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance statistics');
    }
};/**

 * Get compliance monitor data (real-time tracking)
 */
rcmController.getComplianceMonitor = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '24h',
            realTime: true,
            includePredictions: req.query.includePredictions === 'true'
        };

        const monitorData = await complianceService.getComplianceMonitor(filters);

        ResponseHelpers.sendSuccess(res, monitorData, 'Compliance monitor data retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance monitor');
    }
};

/**
 * Bulk acknowledge compliance alerts
 */
rcmController.bulkAcknowledgeAlerts = async (req, res) => {
    try {
        const { alertIds, acknowledgment_note } = req.body;

        if (!Array.isArray(alertIds) || alertIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'alertIds', message: 'Array of alert IDs is required' }
            ]);
        }

        const result = await complianceService.bulkAcknowledgeAlerts(alertIds, {
            acknowledgment_note,
            user_id: req.user?.user_id,
            acknowledged_at: new Date().toISOString()
        });

        ResponseHelpers.sendSuccess(res, result, 'Alerts acknowledged successfully');
    } catch (error) {
        handleControllerError(error, res, 'Bulk acknowledge alerts');
    }
};

/**
 * Schedule compliance report
 */
rcmController.scheduleComplianceReport = async (req, res) => {
    try {
        const { schedule, recipients, format, filters } = req.body;

        if (!schedule || !recipients) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'schedule', message: 'Schedule configuration is required' },
                { field: 'recipients', message: 'Recipients list is required' }
            ]);
        }

        const result = await complianceService.scheduleComplianceReport({
            schedule,
            recipients,
            format: format || 'pdf',
            filters: filters || {},
            created_by: req.user?.user_id
        });

        ResponseHelpers.sendSuccess(res, result, 'Compliance report scheduled successfully');
    } catch (error) {
        handleControllerError(error, res, 'Schedule compliance report');
    }
};

/**
 * Get compliance analytics
 */
rcmController.getComplianceAnalytics = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            groupBy: req.query.groupBy || 'day',
            includeForecasting: req.query.includeForecasting === 'true',
            providerId: req.query.providerId,
            payerType: req.query.payerType
        };

        const analytics = await complianceService.getComplianceAnalytics(filters);

        ResponseHelpers.sendSuccess(res, analytics, 'Compliance analytics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance analytics');
    }
};

/**
 * Get compliance audit trail
 */
rcmController.getComplianceAuditTrail = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            actionType: req.query.actionType,
            userId: req.query.userId,
            claimId: req.query.claimId,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const auditTrail = await complianceService.getComplianceAuditTrail(filters);

        ResponseHelpers.sendSuccess(res, auditTrail, 'Compliance audit trail retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance audit trail');
    }
};

/**
 * Get claim audit trail
 */
rcmController.getClaimAuditTrail = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const auditTrail = await complianceService.getClaimAuditTrail(claimId);

        ResponseHelpers.sendSuccess(res, auditTrail, 'Claim audit trail retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get claim audit trail');
    }
};

/**
 * Export audit trail
 */
rcmController.exportAuditTrail = async (req, res) => {
    try {
        const filters = {
            timeRange: req.body.timeRange || '30d',
            actionType: req.body.actionType,
            userId: req.body.userId,
            claimId: req.body.claimId,
            format: req.body.format || 'csv'
        };

        const exportData = await complianceService.exportAuditTrail(filters);

        if (filters.format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.csv"`);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${new Date().toISOString().split('T')[0]}.json"`);
        }

        res.send(exportData);
    } catch (error) {
        handleControllerError(error, res, 'Export audit trail');
    }
};

/**
 * Get regulatory reviews
 */
rcmController.getRegulatoryReviews = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            reviewType: req.query.reviewType,
            timeRange: req.query.timeRange || '90d',
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const reviews = await complianceService.getRegulatoryReviews(filters);

        ResponseHelpers.sendSuccess(res, reviews, 'Regulatory reviews retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get regulatory reviews');
    }
};

/**
 * Create regulatory review
 */
rcmController.createRegulatoryReview = async (req, res) => {
    try {
        const reviewData = {
            ...req.body,
            created_by: req.user?.user_id,
            created_at: new Date().toISOString()
        };

        const review = await complianceService.createRegulatoryReview(reviewData);

        ResponseHelpers.sendSuccess(res, review, 'Regulatory review created successfully');
    } catch (error) {
        handleControllerError(error, res, 'Create regulatory review');
    }
};

/**
 * Update regulatory review
 */
rcmController.updateRegulatoryReview = async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const updateData = {
            ...req.body,
            updated_by: req.user?.user_id,
            updated_at: new Date().toISOString()
        };

        if (!reviewId || isNaN(reviewId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'reviewId', message: 'Valid review ID is required' }
            ]);
        }

        const review = await complianceService.updateRegulatoryReview(reviewId, updateData);

        ResponseHelpers.sendSuccess(res, review, 'Regulatory review updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update regulatory review');
    }
};

/**
 * Get compliance performance metrics
 */
rcmController.getCompliancePerformanceMetrics = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '30d',
            compareWith: req.query.compareWith, // previous period, industry benchmark
            providerId: req.query.providerId,
            payerType: req.query.payerType
        };

        const metrics = await complianceService.getCompliancePerformanceMetrics(filters);

        ResponseHelpers.sendSuccess(res, metrics, 'Compliance performance metrics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance performance metrics');
    }
};

/**
 * Get compliance benchmarks
 */
rcmController.getComplianceBenchmarks = async (req, res) => {
    try {
        const filters = {
            benchmarkType: req.query.benchmarkType || 'industry', // industry, peer, historical
            specialty: req.query.specialty,
            region: req.query.region,
            organizationSize: req.query.organizationSize
        };

        const benchmarks = await complianceService.getComplianceBenchmarks(filters);

        ResponseHelpers.sendSuccess(res, benchmarks, 'Compliance benchmarks retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance benchmarks');
    }
};

/**
 * Get compliance predictions
 */
rcmController.getCompliancePredictions = async (req, res) => {
    try {
        const filters = {
            predictionType: req.query.predictionType || 'risk', // risk, performance, trends
            timeHorizon: req.query.timeHorizon || '30d',
            confidenceLevel: parseFloat(req.query.confidenceLevel) || 0.95
        };

        const predictions = await complianceService.getCompliancePredictions(filters);

        ResponseHelpers.sendSuccess(res, predictions, 'Compliance predictions retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance predictions');
    }
};

/**
 * Update compliance thresholds
 */
rcmController.updateComplianceThresholds = async (req, res) => {
    try {
        const { thresholds, reason } = req.body;

        if (!thresholds || typeof thresholds !== 'object') {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'thresholds', message: 'Thresholds configuration is required' }
            ]);
        }

        const result = await complianceService.updateComplianceThresholds(thresholds, {
            reason,
            updated_by: req.user?.user_id,
            updated_at: new Date().toISOString()
        });

        ResponseHelpers.sendSuccess(res, result, 'Compliance thresholds updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update compliance thresholds');
    }
};

/**
 * Get compliance notifications
 */
rcmController.getComplianceNotifications = async (req, res) => {
    try {
        const filters = {
            userId: req.user?.user_id,
            status: req.query.status || 'unread',
            type: req.query.type,
            limit: parseInt(req.query.limit) || 50
        };

        const notifications = await complianceService.getComplianceNotifications(filters);

        ResponseHelpers.sendSuccess(res, notifications, 'Compliance notifications retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get compliance notifications');
    }
};

/**
 * Update notification settings
 */
rcmController.updateNotificationSettings = async (req, res) => {
    try {
        const settings = {
            ...req.body,
            user_id: req.user?.user_id,
            updated_at: new Date().toISOString()
        };

        const result = await complianceService.updateNotificationSettings(settings);

        ResponseHelpers.sendSuccess(res, result, 'Notification settings updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update notification settings');
    }
};
// Initialize External System Integration Service
const ExternalSystemIntegrationService = require('./externalSystemIntegrationService');
const integrationService = new ExternalSystemIntegrationService();

/**
 * Verify patient eligibility
 */
rcmController.verifyPatientEligibility = async (req, res) => {
    try {
        const patientData = req.body;
        const options = {
            service_date: req.body.service_date,
            check_benefits: req.body.check_benefits || true
        };

        const eligibilityResult = await integrationService.verifyEligibility(patientData, options);

        ResponseHelpers.sendSuccess(res, eligibilityResult, 'Patient eligibility verified successfully');
    } catch (error) {
        handleControllerError(error, res, 'Verify patient eligibility');
    }
};

/**
 * Submit prior authorization request
 */
rcmController.submitPriorAuthorization = async (req, res) => {
    try {
        const authRequest = req.body;

        if (!authRequest.patient || !authRequest.services) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'patient', message: 'Patient information is required' },
                { field: 'services', message: 'Services information is required' }
            ]);
        }

        const authResult = await integrationService.submitPriorAuthorization(authRequest);

        ResponseHelpers.sendSuccess(res, authResult, 'Prior authorization submitted successfully');
    } catch (error) {
        handleControllerError(error, res, 'Submit prior authorization');
    }
};

/**
 * Submit claim to clearinghouse
 */
rcmController.submitClaimToClearinghouse = async (req, res) => {
    try {
        const claimId = parseInt(req.params.claimId);
        const options = {
            format: req.body.format || 'X12_837',
            test_mode: req.body.test_mode || false,
            priority: req.body.priority || 'normal'
        };

        if (!claimId || isNaN(claimId)) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimId', message: 'Valid claim ID is required' }
            ]);
        }

        const submissionResult = await integrationService.submitClaimToClearinghouse(claimId, options);

        ResponseHelpers.sendSuccess(res, submissionResult, 'Claim submitted to clearinghouse successfully');
    } catch (error) {
        handleControllerError(error, res, 'Submit claim to clearinghouse');
    }
};

/**
 * Query payer for claim status
 */
rcmController.queryPayerClaimStatus = async (req, res) => {
    try {
        const statusRequest = req.body;

        if (!statusRequest.claim_id && !statusRequest.payer_claim_number) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claim_id', message: 'Either claim ID or payer claim number is required' }
            ]);
        }

        const statusResult = await integrationService.queryPayerClaimStatus(statusRequest);

        ResponseHelpers.sendSuccess(res, statusResult, 'Claim status retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Query payer claim status');
    }
};

/**
 * Process ERA/EOB file
 */
rcmController.processERAFile = async (req, res) => {
    try {
        const eraData = req.body;

        if (!eraData.file_content) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'file_content', message: 'ERA file content is required' }
            ]);
        }

        const processingResult = await integrationService.processERAFile(eraData);

        ResponseHelpers.sendSuccess(res, processingResult, 'ERA file processed successfully');
    } catch (error) {
        handleControllerError(error, res, 'Process ERA file');
    }
};

/**
 * Get integration connection status
 */
rcmController.getIntegrationStatus = async (req, res) => {
    try {
        const connectionStatus = integrationService.getConnectionStatus();

        const statusSummary = {
            total_integrations: Object.keys(connectionStatus).length,
            healthy_connections: Object.values(connectionStatus).filter(s => s.status === 'healthy' || s.status === 'connected').length,
            unhealthy_connections: Object.values(connectionStatus).filter(s => s.status === 'unhealthy' || s.status === 'error').length,
            connections: connectionStatus,
            last_updated: new Date().toISOString()
        };

        ResponseHelpers.sendSuccess(res, statusSummary, 'Integration status retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration status');
    }
};

/**
 * Test integration connection
 */
rcmController.testIntegrationConnection = async (req, res) => {
    try {
        const { integrationId } = req.params;

        if (!integrationId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'integrationId', message: 'Integration ID is required' }
            ]);
        }

        await integrationService.checkIntegrationHealth(integrationId);
        const connectionStatus = integrationService.getConnectionStatus();

        ResponseHelpers.sendSuccess(res, {
            integration_id: integrationId,
            status: connectionStatus[integrationId] || { status: 'unknown' },
            test_completed_at: new Date().toISOString()
        }, 'Integration connection tested successfully');
    } catch (error) {
        handleControllerError(error, res, 'Test integration connection');
    }
};

/**
 * Get integration logs
 */
rcmController.getIntegrationLogs = async (req, res) => {
    try {
        const filters = {
            integration_id: req.query.integration_id,
            activity_type: req.query.activity_type,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (filters.integration_id) {
            whereClause += ' AND integration_id = ?';
            params.push(filters.integration_id);
        }

        if (filters.activity_type) {
            whereClause += ' AND activity_type = ?';
            params.push(filters.activity_type);
        }

        if (filters.date_from) {
            whereClause += ' AND created_at >= ?';
            params.push(filters.date_from);
        }

        if (filters.date_to) {
            whereClause += ' AND created_at <= ?';
            params.push(filters.date_to);
        }

        const offset = (filters.page - 1) * filters.limit;

        const logs = await executeQuery(`
            SELECT *
            FROM integration_logs
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, filters.limit, offset]);

        const totalCount = await executeQuerySingle(`
            SELECT COUNT(*) as total
            FROM integration_logs
            ${whereClause}
        `, params);

        ResponseHelpers.sendSuccess(res, {
            logs: logs.map(log => ({
                ...log,
                details: JSON.parse(log.details || '{}')
            })),
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: totalCount.total,
                pages: Math.ceil(totalCount.total / filters.limit)
            }
        }, 'Integration logs retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration logs');
    }
};

/**
 * Batch submit claims to clearinghouse
 */
rcmController.batchSubmitClaims = async (req, res) => {
    try {
        const { claimIds, options = {} } = req.body;

        if (!Array.isArray(claimIds) || claimIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Array of claim IDs is required' }
            ]);
        }

        if (claimIds.length > 100) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'claimIds', message: 'Maximum 100 claims can be submitted at once' }
            ]);
        }

        const results = {
            total: claimIds.length,
            successful: 0,
            failed: 0,
            submissions: []
        };

        for (const claimId of claimIds) {
            try {
                const submissionResult = await integrationService.submitClaimToClearinghouse(claimId, options);
                results.submissions.push({
                    claim_id: claimId,
                    success: true,
                    submission_id: submissionResult.submission_id,
                    status: submissionResult.status
                });
                results.successful++;
            } catch (error) {
                results.submissions.push({
                    claim_id: claimId,
                    success: false,
                    error: error.message
                });
                results.failed++;
            }
        }

        ResponseHelpers.sendSuccess(res, results, 'Batch claim submission completed');
    } catch (error) {
        handleControllerError(error, res, 'Batch submit claims');
    }
};

/**
 * Get integration performance metrics
 */
rcmController.getIntegrationPerformanceMetrics = async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '24h';
        const integrationId = req.query.integrationId;

        let whereClause = 'WHERE created_at >= DATE_SUB(NOW(), INTERVAL ';
        const params = [];

        switch (timeRange) {
            case '1h':
                whereClause += '1 HOUR)';
                break;
            case '24h':
                whereClause += '1 DAY)';
                break;
            case '7d':
                whereClause += '7 DAY)';
                break;
            case '30d':
                whereClause += '30 DAY)';
                break;
            default:
                whereClause += '1 DAY)';
        }

        if (integrationId) {
            whereClause += ' AND integration_id = ?';
            params.push(integrationId);
        }

        const metrics = await executeQuery(`
            SELECT 
                integration_id,
                activity_type,
                COUNT(*) as total_requests,
                COUNT(CASE WHEN JSON_EXTRACT(details, '$.status') = 'success' THEN 1 END) as successful_requests,
                COUNT(CASE WHEN JSON_EXTRACT(details, '$.status') != 'success' THEN 1 END) as failed_requests,
                AVG(JSON_EXTRACT(details, '$.response_time')) as avg_response_time
            FROM integration_logs
            ${whereClause}
            GROUP BY integration_id, activity_type
            ORDER BY integration_id, activity_type
        `, params);

        const performanceData = {
            time_range: timeRange,
            metrics: metrics,
            summary: {
                total_requests: metrics.reduce((sum, m) => sum + m.total_requests, 0),
                successful_requests: metrics.reduce((sum, m) => sum + m.successful_requests, 0),
                failed_requests: metrics.reduce((sum, m) => sum + m.failed_requests, 0),
                success_rate: metrics.length > 0 ?
                    (metrics.reduce((sum, m) => sum + m.successful_requests, 0) /
                        metrics.reduce((sum, m) => sum + m.total_requests, 0) * 100) : 0
            }
        };

        ResponseHelpers.sendSuccess(res, performanceData, 'Integration performance metrics retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration performance metrics');
    }
};
// Initialize Integration Configuration Service
const IntegrationConfigurationService = require('./integrationConfigurationService');
const integrationConfigService = new IntegrationConfigurationService();

/**
 * Get integration management dashboard
 */
rcmController.getIntegrationDashboard = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '24h'
        };

        const dashboardData = await integrationConfigService.getIntegrationDashboard(filters);

        ResponseHelpers.sendSuccess(res, dashboardData, 'Integration dashboard data retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration dashboard');
    }
};

/**
 * Get integration configurations
 */
rcmController.getIntegrationConfigurations = async (req, res) => {
    try {
        const filters = {
            integration_type: req.query.integration_type,
            is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined
        };

        const configurations = await integrationConfigService.getIntegrationConfigurations(filters);

        ResponseHelpers.sendSuccess(res, configurations, 'Integration configurations retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration configurations');
    }
};

/**
 * Get single integration configuration
 */
rcmController.getIntegrationConfiguration = async (req, res) => {
    try {
        const integrationId = req.params.integrationId;

        if (!integrationId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'integrationId', message: 'Integration ID is required' }
            ]);
        }

        const configuration = await integrationConfigService.getIntegrationConfiguration(integrationId);

        ResponseHelpers.sendSuccess(res, configuration, 'Integration configuration retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration configuration');
    }
};

/**
 * Update integration configuration
 */
rcmController.updateIntegrationConfiguration = async (req, res) => {
    try {
        const integrationId = req.params.integrationId;
        const configData = req.body;

        if (!integrationId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'integrationId', message: 'Integration ID is required' }
            ]);
        }

        const updatedConfig = await integrationConfigService.updateIntegrationConfiguration(
            integrationId,
            configData,
            req.user?.user_id
        );

        ResponseHelpers.sendSuccess(res, updatedConfig, 'Integration configuration updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update integration configuration');
    }
};

/**
 * Test integration connection (enhanced)
 */
rcmController.testIntegrationConnectionEnhanced = async (req, res) => {
    try {
        const integrationId = req.params.integrationId;
        const options = {
            userId: req.user?.user_id,
            testType: req.body.testType || 'health_check',
            includeDetails: req.body.includeDetails || false
        };

        if (!integrationId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'integrationId', message: 'Integration ID is required' }
            ]);
        }

        const testResult = await integrationConfigService.testIntegrationConnection(integrationId, options);

        ResponseHelpers.sendSuccess(res, testResult, 'Integration connection test completed');
    } catch (error) {
        handleControllerError(error, res, 'Test integration connection');
    }
};

/**
 * Get integration audit trail
 */
rcmController.getIntegrationAuditTrail = async (req, res) => {
    try {
        const filters = {
            integration_id: req.query.integration_id,
            activity_type: req.query.activity_type,
            date_from: req.query.date_from,
            date_to: req.query.date_to,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 50
        };

        const auditTrail = await integrationConfigService.getIntegrationAuditTrail(filters);

        ResponseHelpers.sendSuccess(res, auditTrail, 'Integration audit trail retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration audit trail');
    }
};

/**
 * Export integration audit data
 */
rcmController.exportIntegrationAuditData = async (req, res) => {
    try {
        const filters = {
            integration_id: req.body.integration_id,
            activity_type: req.body.activity_type,
            date_from: req.body.date_from,
            date_to: req.body.date_to
        };
        const format = req.body.format || 'csv';

        const exportData = await integrationConfigService.exportIntegrationAuditData(filters, format);

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="integration-audit-${new Date().toISOString().split('T')[0]}.csv"`);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="integration-audit-${new Date().toISOString().split('T')[0]}.json"`);
        }

        res.send(exportData);
    } catch (error) {
        handleControllerError(error, res, 'Export integration audit data');
    }
};

/**
 * Update global integration settings
 */
rcmController.updateGlobalIntegrationSettings = async (req, res) => {
    try {
        const settings = req.body;
        const userId = req.user?.user_id;

        if (!settings || typeof settings !== 'object') {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'settings', message: 'Settings object is required' }
            ]);
        }

        const result = await integrationConfigService.updateGlobalSettings(settings, userId);

        ResponseHelpers.sendSuccess(res, result, 'Global integration settings updated successfully');
    } catch (error) {
        handleControllerError(error, res, 'Update global integration settings');
    }
};

/**
 * Get integration performance monitoring data
 */
rcmController.getIntegrationPerformanceMonitoring = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '24h',
            integrationId: req.query.integrationId,
            includeHistorical: req.query.includeHistorical === 'true'
        };

        const monitoringData = await integrationConfigService.getIntegrationPerformanceMonitoring(filters);

        ResponseHelpers.sendSuccess(res, monitoringData, 'Integration performance monitoring data retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration performance monitoring');
    }
};

/**
 * Retry failed integration requests
 */
rcmController.retryFailedIntegrationRequests = async (req, res) => {
    try {
        const { integrationId, requestIds } = req.body;

        if (!integrationId) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'integrationId', message: 'Integration ID is required' }
            ]);
        }

        if (!Array.isArray(requestIds) || requestIds.length === 0) {
            return ResponseHelpers.sendValidationError(res, [
                { field: 'requestIds', message: 'Array of request IDs is required' }
            ]);
        }

        const retryResults = await integrationConfigService.retryFailedRequests(integrationId, requestIds);

        ResponseHelpers.sendSuccess(res, retryResults, 'Failed integration requests retry completed');
    } catch (error) {
        handleControllerError(error, res, 'Retry failed integration requests');
    }
};

/**
 * Get integration error analysis
 */
rcmController.getIntegrationErrorAnalysis = async (req, res) => {
    try {
        const filters = {
            timeRange: req.query.timeRange || '7d',
            integrationId: req.query.integrationId
        };

        const errorAnalysis = await integrationConfigService.getIntegrationErrorAnalysis(filters);

        ResponseHelpers.sendSuccess(res, errorAnalysis, 'Integration error analysis retrieved successfully');
    } catch (error) {
        handleControllerError(error, res, 'Get integration error analysis');
    }
};