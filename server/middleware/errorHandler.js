/**
 * Standardized Error Handling Middleware for RCM Module
 * Provides consistent error responses and logging across all RCM endpoints
 */

/**
 * Custom Application Error class for operational errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Predefined error types for common RCM scenarios
 */
const ErrorTypes = {
  // Validation Errors (400)
  VALIDATION_ERROR: (message, details = null) => 
    new AppError(message, 400, 'VALIDATION_ERROR', details),
  
  INVALID_CLAIM_DATA: (message, details = null) => 
    new AppError(message, 400, 'INVALID_CLAIM_DATA', details),
  
  MISSING_REQUIRED_FIELDS: (fields) => 
    new AppError(`Missing required fields: ${fields.join(', ')}`, 400, 'MISSING_REQUIRED_FIELDS', { fields }),
  
  // Authentication/Authorization Errors (401/403)
  UNAUTHORIZED: (message = 'Authentication required') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
  
  FORBIDDEN: (message = 'Insufficient permissions') => 
    new AppError(message, 403, 'FORBIDDEN'),
  
  // Not Found Errors (404)
  CLAIM_NOT_FOUND: (claimId) => 
    new AppError(`Claim with ID ${claimId} not found`, 404, 'CLAIM_NOT_FOUND', { claimId }),
  
  PATIENT_NOT_FOUND: (patientId) => 
    new AppError(`Patient with ID ${patientId} not found`, 404, 'PATIENT_NOT_FOUND', { patientId }),
  
  RESOURCE_NOT_FOUND: (resource, id) => 
    new AppError(`${resource} with ID ${id} not found`, 404, 'RESOURCE_NOT_FOUND', { resource, id }),
  
  // Business Logic Errors (422)
  CLAIM_ALREADY_PROCESSED: (claimId) => 
    new AppError(`Claim ${claimId} has already been processed`, 422, 'CLAIM_ALREADY_PROCESSED', { claimId }),
  
  INVALID_STATUS_TRANSITION: (fromStatus, toStatus) => 
    new AppError(`Invalid status transition from ${fromStatus} to ${toStatus}`, 422, 'INVALID_STATUS_TRANSITION', { fromStatus, toStatus }),
  
  INSUFFICIENT_BALANCE: (required, available) => 
    new AppError(`Insufficient balance. Required: ${required}, Available: ${available}`, 422, 'INSUFFICIENT_BALANCE', { required, available }),
  
  // External Service Errors (502/503)
  EXTERNAL_SERVICE_ERROR: (service, message) => 
    new AppError(`External service error (${service}): ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service }),
  
  CLAIMMD_ERROR: (message) => 
    new AppError(`ClaimMD integration error: ${message}`, 502, 'CLAIMMD_ERROR'),
  
  // Database Errors (500)
  DATABASE_ERROR: (message, query = null) => 
    new AppError(`Database operation failed: ${message}`, 500, 'DATABASE_ERROR', { query }),
  
  // Generic Server Errors (500)
  INTERNAL_ERROR: (message = 'An unexpected error occurred') => 
    new AppError(message, 500, 'INTERNAL_ERROR')
};

/**
 * Standard controller error handler wrapper
 * Catches errors and formats them consistently
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {Object} req - Express request object (optional, for logging)
 */
const handleControllerError = (error, res, req = null) => {
  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500,
    isOperational: error.isOperational || false,
    url: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.user_id,
    ip: req?.ip,
    userAgent: req?.['User-Agent']
  };

  // Log based on error severity
  if (error.isOperational) {
    // Operational errors (expected) - log as warning
    console.warn('Operational error:', JSON.stringify(errorLog, null, 2));
  } else {
    // Programming errors (unexpected) - log as error
    console.error('Unexpected error:', JSON.stringify(errorLog, null, 2));
  }

  // Determine response based on error type
  if (error.isOperational) {
    // Send detailed error for operational errors
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp
      }
    });
  }

  // For programming errors, send generic message in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'An unexpected error occurred' : error.message,
      timestamp: new Date().toISOString(),
      ...(isProduction ? {} : { 
        stack: error.stack,
        details: error.details 
      })
    }
  });
};

/**
 * Express error handling middleware
 * Should be used as the last middleware in the chain
 */
const errorMiddleware = (error, req, res, next) => {
  handleControllerError(error, res, req);
};

/**
 * Async wrapper for route handlers
 * Automatically catches async errors and passes them to error handler
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} metadata - Additional metadata
 */
const sendSuccessResponse = (res, data = null, message = 'Operation successful', statusCode = 200, metadata = {}) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  if (data !== null) {
    response.data = data;
  }

  res.status(statusCode).json(response);
};

/**
 * Validation error formatter
 * Converts Joi validation errors to standardized format
 * @param {Object} joiError - Joi validation error
 * @returns {AppError} Formatted validation error
 */
const formatValidationError = (joiError) => {
  const details = joiError.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));

  return ErrorTypes.VALIDATION_ERROR(
    'Validation failed',
    {
      errors: details,
      errorCount: details.length
    }
  );
};

/**
 * Database error formatter
 * Converts database errors to standardized format
 * @param {Error} dbError - Database error
 * @param {string} query - SQL query that failed (optional)
 * @returns {AppError} Formatted database error
 */
const formatDatabaseError = (dbError, query = null) => {
  // Common database error patterns
  if (dbError.code === 'ER_DUP_ENTRY') {
    return new AppError('Duplicate entry detected', 409, 'DUPLICATE_ENTRY', {
      field: dbError.sqlMessage?.match(/for key '(.+?)'/)?.[1]
    });
  }

  if (dbError.code === 'ER_NO_REFERENCED_ROW_2') {
    return new AppError('Referenced record not found', 400, 'FOREIGN_KEY_CONSTRAINT', {
      constraint: dbError.sqlMessage
    });
  }

  if (dbError.code === 'ER_ROW_IS_REFERENCED_2') {
    return new AppError('Cannot delete record - it is referenced by other records', 409, 'REFERENCE_CONSTRAINT');
  }

  if (dbError.code === 'ECONNREFUSED') {
    return new AppError('Database connection failed', 503, 'DATABASE_UNAVAILABLE');
  }

  // Generic database error
  return ErrorTypes.DATABASE_ERROR(dbError.message, query);
};

/**
 * Rate limiting error handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleRateLimitError = (req, res) => {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
      retryAfter: '60 seconds'
    }
  });
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleNotFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Helper functions for creating specific error types
 * These functions provide a convenient way to create standardized errors
 */
const createDatabaseError = (message, query = null) => {
  return ErrorTypes.DATABASE_ERROR(message, query);
};

const createNotFoundError = (resource, id = null) => {
  if (id) {
    return ErrorTypes.RESOURCE_NOT_FOUND(resource, id);
  }
  return new AppError(`${resource} not found`, 404, 'NOT_FOUND');
};

const createValidationError = (message, details = null) => {
  return ErrorTypes.VALIDATION_ERROR(message, details);
};

module.exports = {
  AppError,
  ErrorTypes,
  handleControllerError,
  errorMiddleware,
  asyncHandler,
  sendSuccessResponse,
  formatValidationError,
  formatDatabaseError,
  handleRateLimitError,
  handleNotFound,
  createDatabaseError,
  createNotFoundError,
  createValidationError
};