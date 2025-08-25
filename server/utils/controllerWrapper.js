/**
 * Controller Wrapper Utilities
 * Provides standardized patterns for handling HTTP requests and responses
 */

const { handleControllerError } = require('../middleware/errorHandler');

/**
 * Standard API Response format
 */
class APIResponse {
  constructor(success = true, data = null, message = null, meta = null) {
    this.success = success;
    this.timestamp = new Date().toISOString();
    
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
   * @returns {APIResponse} Success response
   */
  static success(data = null, message = null, meta = null) {
    return new APIResponse(true, data, message, meta);
  }

  /**
   * Create error response
   * @param {string} message - Error message
   * @param {*} details - Error details
   * @returns {APIResponse} Error response
   */
  static error(message, details = null) {
    const response = new APIResponse(false, null, message);
    if (details) {
      response.error = details;
    }
    return response;
  }

  /**
   * Create paginated response
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Success message
   * @returns {APIResponse} Paginated response
   */
  static paginated(data, pagination, message = null) {
    return new APIResponse(true, data, message, { pagination });
  }
}

/**
 * Controller wrapper for standardized request/response handling
 * @param {Function} serviceMethod - Service method to call
 * @param {Object} options - Wrapper options
 * @returns {Function} Express middleware function
 */
const controllerWrapper = (serviceMethod, options = {}) => {
  const {
    successMessage = null,
    successStatus = 200,
    extractParams = null,
    validateInput = null,
    transformResponse = null
  } = options;

  return async (req, res, next) => {
    try {
      // Extract parameters from request
      let params = {};
      if (extractParams) {
        params = extractParams(req);
      } else {
        // Default parameter extraction
        params = {
          ...req.query,
          ...req.params,
          ...req.body,
          userId: req.user?.user_id
        };
      }

      // Validate input if validator provided
      if (validateInput) {
        const validation = validateInput(params);
        if (!validation.isValid) {
          return res.status(400).json(
            APIResponse.error('Validation failed', validation.errors)
          );
        }
      }

      // Call service method
      const result = await serviceMethod(params);

      // Transform response if transformer provided
      let responseData = result;
      if (transformResponse) {
        responseData = transformResponse(result);
      }

      // Handle paginated responses
      if (result && result.pagination) {
        return res.status(successStatus).json(
          APIResponse.paginated(result.data || result, result.pagination, successMessage)
        );
      }

      // Standard success response
      res.status(successStatus).json(
        APIResponse.success(responseData, successMessage)
      );

    } catch (error) {
      handleControllerError(error, res, `${serviceMethod.name || 'Service method'}`);
    }
  };
};

/**
 * Create a controller for a service class
 * @param {Object} serviceInstance - Service class instance
 * @param {Object} methodMappings - Method mappings with options
 * @returns {Object} Controller object with wrapped methods
 */
const createController = (serviceInstance, methodMappings) => {
  const controller = {};

  for (const [controllerMethod, config] of Object.entries(methodMappings)) {
    const { serviceMethod, options = {} } = config;
    
    if (typeof serviceInstance[serviceMethod] !== 'function') {
      throw new Error(`Service method '${serviceMethod}' not found`);
    }

    controller[controllerMethod] = controllerWrapper(
      serviceInstance[serviceMethod].bind(serviceInstance),
      options
    );
  }

  return controller;
};

/**
 * Parameter extraction helpers
 */
const ParamExtractors = {
  /**
   * Extract dashboard query parameters
   */
  dashboardParams: (req) => ({
    timeframe: req.query.timeframe,
    compareWith: req.query.compareWith,
    userId: req.user?.user_id
  }),

  /**
   * Extract claims query parameters
   */
  claimsParams: (req) => ({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    status: req.query.status,
    search: req.query.search,
    priority: req.query.priority,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    userId: req.user?.user_id
  }),

  /**
   * Extract claim update parameters
   */
  claimUpdateParams: (req) => ({
    claimId: parseInt(req.params.claimId),
    status: req.body.status,
    notes: req.body.notes,
    userId: req.user?.user_id
  }),

  /**
   * Extract A/R aging parameters
   */
  arAgingParams: (req) => ({
    includeZeroBalance: req.query.include_zero_balance === 'true',
    payerFilter: req.query.payer_filter,
    priorityFilter: req.query.priority_filter,
    userId: req.user?.user_id
  }),

  /**
   * Extract collections parameters
   */
  collectionsParams: (req) => ({
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10,
    patientId: req.query.patient_id ? parseInt(req.query.patient_id) : null,
    activityType: req.query.activity_type,
    outcome: req.query.outcome,
    dateFrom: req.query.date_from,
    dateTo: req.query.date_to,
    userId: req.user?.user_id
  })
};

/**
 * Response transformers
 */
const ResponseTransformers = {
  /**
   * Transform dashboard data for frontend consumption
   */
  dashboardTransformer: (data) => ({
    ...data,
    summary: {
      ...data.summary,
      totalBilled: data.summary.totalBilled,
      totalCollected: data.summary.totalCollected,
      totalAR: data.summary.totalAR
    }
  }),

  /**
   * Transform claims data
   */
  claimsTransformer: (data) => ({
    claims: data.claims,
    filters: data.filters
    // Pagination is handled separately
  }),

  /**
   * Transform single claim data
   */
  claimTransformer: (data) => ({
    ...data,
    formatted_amount: data.total_amount,
    formatted_date: data.service_date
  })
};

/**
 * Input validators
 */
const InputValidators = {
  /**
   * Validate claim update input
   */
  validateClaimUpdate: (params) => {
    const errors = [];
    
    if (!params.claimId || isNaN(params.claimId)) {
      errors.push('Valid claim ID is required');
    }
    
    if (params.status === undefined || params.status === null) {
      errors.push('Status is required');
    }
    
    if (![0, 1, 2, 3, 4].includes(parseInt(params.status))) {
      errors.push('Invalid status value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate pagination parameters
   */
  validatePagination: (params) => {
    const errors = [];
    
    if (params.page && (isNaN(params.page) || params.page < 1)) {
      errors.push('Page must be a positive integer');
    }
    
    if (params.limit && (isNaN(params.limit) || params.limit < 1 || params.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * HTTP status codes for different scenarios
 */
const StatusCodes = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

module.exports = {
  APIResponse,
  controllerWrapper,
  createController,
  ParamExtractors,
  ResponseTransformers,
  InputValidators,
  StatusCodes
};