/**
 * Standardized Response Formats
 * Provides consistent API response structures across all RCM endpoints
 */

/**
 * Enhanced API Response class with comprehensive formatting
 */
class StandardizedAPIResponse {
  constructor(success = true, data = null, message = null, meta = null) {
    this.success = success;
    this.timestamp = new Date().toISOString();
    this.version = '1.0';
    
    if (data !== null) {
      this.data = data;
    }
    
    if (message) {
      this.message = message;
    }
    
    if (meta) {
      this.meta = meta;
    }
  }

  /**
   * Create success response
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Additional metadata
   * @returns {StandardizedAPIResponse} Success response
   */
  static success(data = null, message = null, meta = null) {
    return new StandardizedAPIResponse(true, data, message, meta);
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {*} details - Error details
   * @param {string} errorCode - Error code
   * @returns {StandardizedAPIResponse} Error response
   */
  static error(message, details = null, errorCode = null) {
    const response = new StandardizedAPIResponse(false, null, message);
    if (details) {
      response.error = {
        details,
        code: errorCode,
        timestamp: new Date().toISOString()
      };
    }
    return response;
  }

  /**
   * Create paginated response
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @param {Object} filters - Applied filters
   * @returns {StandardizedAPIResponse} Paginated response
   */
  static paginated(data, pagination, message = null, filters = null) {
    const meta = { pagination };
    if (filters) {
      meta.filters = filters;
    }
    return new StandardizedAPIResponse(true, data, message, meta);
  }

  /**
   * Create created response (201)
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   * @param {string} resourceId - ID of created resource
   * @returns {StandardizedAPIResponse} Created response
   */
  static created(data = null, message = 'Resource created successfully', resourceId = null) {
    const meta = { statusCode: 201 };
    if (resourceId) {
      meta.resourceId = resourceId;
    }
    return new StandardizedAPIResponse(true, data, message, meta);
  }

  /**
   * Create updated response
   * @param {*} data - Updated resource data
   * @param {string} message - Success message
   * @param {string} resourceId - ID of updated resource
   * @returns {StandardizedAPIResponse} Updated response
   */
  static updated(data = null, message = 'Resource updated successfully', resourceId = null) {
    const meta = { statusCode: 200 };
    if (resourceId) {
      meta.resourceId = resourceId;
    }
    return new StandardizedAPIResponse(true, data, message, meta);
  }

  /**
   * Create deleted response
   * @param {string} message - Success message
   * @param {string} resourceId - ID of deleted resource
   * @returns {StandardizedAPIResponse} Deleted response
   */
  static deleted(message = 'Resource deleted successfully', resourceId = null) {
    const meta = { statusCode: 200 };
    if (resourceId) {
      meta.resourceId = resourceId;
    }
    return new StandardizedAPIResponse(true, null, message, meta);
  }

  /**
   * Create validation error response
   * @param {Array} validationErrors - Array of validation errors
   * @param {string} message - Error message
   * @returns {StandardizedAPIResponse} Validation error response
   */
  static validationError(validationErrors, message = 'Validation failed') {
    return StandardizedAPIResponse.error(message, {
      validationErrors,
      type: 'VALIDATION_ERROR'
    }, 'VALIDATION_FAILED');
  }

  /**
   * Create not found response
   * @param {string} resource - Resource name
   * @param {string} identifier - Resource identifier
   * @returns {StandardizedAPIResponse} Not found response
   */
  static notFound(resource = 'Resource', identifier = null) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    return StandardizedAPIResponse.error(message, {
      resource,
      identifier,
      type: 'NOT_FOUND'
    }, 'RESOURCE_NOT_FOUND');
  }

  /**
   * Create unauthorized response
   * @param {string} message - Error message
   * @returns {StandardizedAPIResponse} Unauthorized response
   */
  static unauthorized(message = 'Unauthorized access') {
    return StandardizedAPIResponse.error(message, {
      type: 'UNAUTHORIZED'
    }, 'UNAUTHORIZED_ACCESS');
  }

  /**
   * Create forbidden response
   * @param {string} message - Error message
   * @returns {StandardizedAPIResponse} Forbidden response
   */
  static forbidden(message = 'Access forbidden') {
    return StandardizedAPIResponse.error(message, {
      type: 'FORBIDDEN'
    }, 'ACCESS_FORBIDDEN');
  }

  /**
   * Create conflict response
   * @param {string} message - Error message
   * @param {*} conflictDetails - Conflict details
   * @returns {StandardizedAPIResponse} Conflict response
   */
  static conflict(message = 'Resource conflict', conflictDetails = null) {
    return StandardizedAPIResponse.error(message, {
      conflictDetails,
      type: 'CONFLICT'
    }, 'RESOURCE_CONFLICT');
  }

  /**
   * Create rate limit response
   * @param {string} message - Error message
   * @param {Object} rateLimitInfo - Rate limit information
   * @returns {StandardizedAPIResponse} Rate limit response
   */
  static rateLimit(message = 'Rate limit exceeded', rateLimitInfo = null) {
    return StandardizedAPIResponse.error(message, {
      rateLimitInfo,
      type: 'RATE_LIMIT'
    }, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * HTTP Status Code mappings for different response types
 */
const ResponseStatusCodes = {
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Pagination metadata structure
 */
class PaginationMeta {
  constructor(page, limit, total, totalPages = null) {
    this.currentPage = parseInt(page);
    this.limit = parseInt(limit);
    this.totalRecords = parseInt(total);
    this.totalPages = totalPages || Math.ceil(total / limit);
    this.hasNextPage = this.currentPage < this.totalPages;
    this.hasPreviousPage = this.currentPage > 1;
    this.nextPage = this.hasNextPage ? this.currentPage + 1 : null;
    this.previousPage = this.hasPreviousPage ? this.currentPage - 1 : null;
  }

  /**
   * Create pagination metadata from query parameters and total count
   * @param {Object} query - Query parameters
   * @param {number} total - Total record count
   * @returns {PaginationMeta} Pagination metadata
   */
  static fromQuery(query, total) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    return new PaginationMeta(page, limit, total);
  }
}

/**
 * Response formatter for different data types
 */
class ResponseFormatter {
  /**
   * Format dashboard response
   * @param {Object} data - Dashboard data
   * @returns {Object} Formatted dashboard data
   */
  static dashboard(data) {
    return {
      summary: {
        totalClaims: data.summary?.totalClaims || 0,
        totalBilled: data.summary?.totalBilled || 0,
        totalCollected: data.summary?.totalCollected || 0,
        totalAR: data.summary?.totalAR || 0,
        collectionRate: data.summary?.collectionRate || 0,
        denialRate: data.summary?.denialRate || 0
      },
      claimsBreakdown: data.claimsBreakdown || {},
      arAging: data.arAging || {},
      denialAnalytics: data.denialAnalytics || {},
      recentActivity: data.recentActivity || [],
      timeframe: data.timeframe || '30d',
      generatedAt: data.generatedAt || new Date().toISOString()
    };
  }

  /**
   * Format claims list response
   * @param {Array} claims - Claims data
   * @param {Object} filters - Applied filters
   * @returns {Object} Formatted claims data
   */
  static claimsList(claims, filters = {}) {
    return {
      claims: claims.map(claim => ({
        id: claim.id,
        patientId: claim.patientId,
        patientName: claim.patientName,
        procedureCode: claim.procedureCode,
        totalAmount: claim.totalAmount,
        paidAmount: claim.paidAmount || 0,
        outstandingAmount: claim.outstandingAmount || 0,
        serviceDate: claim.serviceDate,
        status: claim.status,
        statusText: claim.statusText,
        daysInAR: claim.daysInAR || 0,
        agingBucket: claim.agingBucket,
        collectabilityScore: claim.collectabilityScore,
        recommendations: claim.recommendations || []
      })),
      appliedFilters: filters
    };
  }

  /**
   * Format single claim response
   * @param {Object} claim - Claim data
   * @returns {Object} Formatted claim data
   */
  static claim(claim) {
    return {
      id: claim.id,
      patientId: claim.patientId,
      patientName: claim.patientName,
      patientEmail: claim.patientEmail,
      patientPhone: claim.patientPhone,
      procedureCode: claim.procedureCode,
      totalAmount: claim.totalAmount,
      paidAmount: claim.paidAmount || 0,
      outstandingAmount: claim.outstandingAmount || 0,
      serviceDate: claim.serviceDate,
      status: claim.status,
      statusText: claim.statusText,
      daysInAR: claim.daysInAR || 0,
      agingBucket: claim.agingBucket,
      collectabilityScore: claim.collectabilityScore,
      recommendations: claim.recommendations || [],
      paymentHistory: claim.paymentHistory || [],
      notes: claim.notes || []
    };
  }

  /**
   * Format A/R aging response
   * @param {Object} data - A/R aging data
   * @returns {Object} Formatted A/R aging data
   */
  static arAging(data) {
    return {
      agingBuckets: data.agingBuckets || {},
      totals: data.totals || {},
      accounts: data.accounts || [],
      appliedFilters: data.filters || {},
      generatedAt: data.generatedAt || new Date().toISOString()
    };
  }

  /**
   * Format collections workflow response
   * @param {Array} accounts - Patient accounts
   * @param {Object} filters - Applied filters
   * @returns {Object} Formatted collections data
   */
  static collections(accounts, filters = {}) {
    return {
      accounts: accounts.map(account => ({
        id: account.id,
        patientId: account.patientId,
        patientName: account.patientName,
        totalBalance: account.totalBalance,
        aging: {
          current30: account.aging30 || 0,
          days31To60: account.aging60 || 0,
          days61To90: account.aging90 || 0,
          days120Plus: account.aging120Plus || 0
        },
        lastPaymentDate: account.lastPaymentDate,
        lastStatementDate: account.lastStatementDate,
        collectionStatus: account.collectionStatus,
        priority: account.priority,
        assignedCollector: account.assignedCollector,
        contactAttempts: account.contactAttempts || 0,
        paymentPlanActive: account.paymentPlanActive || false,
        insurancePending: account.insurancePending || 0
      })),
      appliedFilters: filters
    };
  }

  /**
   * Format payment posting response
   * @param {Array} payments - Payment data
   * @param {Object} filters - Applied filters
   * @returns {Object} Formatted payment data
   */
  static payments(payments, filters = {}) {
    return {
      payments: payments.map(payment => ({
        id: payment.id,
        claimId: payment.claimId,
        patientId: payment.patientId,
        patientName: payment.patientName,
        paymentAmount: payment.paymentAmount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        checkNumber: payment.checkNumber,
        adjustmentAmount: payment.adjustmentAmount || 0,
        adjustmentReason: payment.adjustmentReason,
        postedDate: payment.postedDate,
        postedBy: payment.postedBy,
        claimAmount: payment.claimAmount,
        procedureCode: payment.procedureCode
      })),
      appliedFilters: filters
    };
  }

  /**
   * Format ERA processing response
   * @param {Object} data - ERA processing data
   * @returns {Object} Formatted ERA data
   */
  static eraProcessing(data) {
    return {
      eraId: data.eraId,
      fileName: data.fileName,
      totalPayments: data.totalPayments,
      totalAdjustments: data.totalAdjustments,
      processedCount: data.processedCount,
      autoPostedCount: data.autoPostedCount,
      payments: data.payments || [],
      processingStatus: 'completed',
      processedAt: new Date().toISOString()
    };
  }
}

/**
 * Response helper functions
 */
const ResponseHelpers = {
  /**
   * Send standardized success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   * @param {Object} meta - Additional metadata
   */
  sendSuccess: (res, data = null, message = null, statusCode = 200, meta = null) => {
    res.status(statusCode).json(StandardizedAPIResponse.success(data, message, meta));
  },

  /**
   * Send standardized error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {*} details - Error details
   * @param {string} errorCode - Error code
   */
  sendError: (res, message, statusCode = 500, details = null, errorCode = null) => {
    res.status(statusCode).json(StandardizedAPIResponse.error(message, details, errorCode));
  },

  /**
   * Send standardized paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination metadata
   * @param {string} message - Success message
   * @param {Object} filters - Applied filters
   */
  sendPaginated: (res, data, pagination, message = null, filters = null) => {
    res.status(200).json(StandardizedAPIResponse.paginated(data, pagination, message, filters));
  },

  /**
   * Send standardized created response
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   * @param {string} resourceId - ID of created resource
   */
  sendCreated: (res, data = null, message = 'Resource created successfully', resourceId = null) => {
    res.status(201).json(StandardizedAPIResponse.created(data, message, resourceId));
  },

  /**
   * Send standardized validation error response
   * @param {Object} res - Express response object
   * @param {Array} validationErrors - Validation errors
   * @param {string} message - Error message
   */
  sendValidationError: (res, validationErrors, message = 'Validation failed') => {
    res.status(400).json(StandardizedAPIResponse.validationError(validationErrors, message));
  },

  /**
   * Send standardized not found response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   * @param {string} identifier - Resource identifier
   */
  sendNotFound: (res, resource = 'Resource', identifier = null) => {
    res.status(404).json(StandardizedAPIResponse.notFound(resource, identifier));
  }
};

module.exports = {
  StandardizedAPIResponse,
  ResponseStatusCodes,
  PaginationMeta,
  ResponseFormatter,
  ResponseHelpers
};