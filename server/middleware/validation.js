/**
 * Input Validation Middleware for RCM Module
 * Provides comprehensive validation schemas and middleware for RCM endpoints
 */

const Joi = require('joi');
const { createValidationError, createError } = require('./errorHandler');

/**
 * Common validation patterns
 */
const ValidationPatterns = {
  // IDs
  positiveInteger: Joi.number().integer().positive(),
  optionalPositiveInteger: Joi.number().integer().positive().optional(),
  
  // Strings
  nonEmptyString: Joi.string().trim().min(1),
  optionalString: Joi.string().trim().optional().allow(''),
  
  // Dates
  dateString: Joi.string().isoDate(),
  optionalDateString: Joi.string().isoDate().optional(),
  
  // Money amounts
  monetaryAmount: Joi.number().precision(2).positive(),
  optionalMonetaryAmount: Joi.number().precision(2).positive().optional(),
  
  // Status codes
  claimStatus: Joi.number().integer().valid(0, 1, 2, 3, 4),
  collectionStatus: Joi.string().valid('new', 'follow_up', 'collections', 'payment_plan', 'resolved', 'write_off'),
  
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Search
  searchQuery: Joi.string().trim().min(1).max(100).optional(),
  
  // Phone numbers
  phoneNumber: Joi.string().pattern(/^\+?[\d\s\-\(\)]{10,15}$/).optional(),
  
  // Email
  email: Joi.string().email().optional(),
  
  // CPT codes
  cptCode: Joi.string().pattern(/^\d{5}$/).required(),
  
  // ICD codes  
  icdCode: Joi.string().pattern(/^[A-Z]\d{2}(\.\d{1,3})?$/).optional()
};

/**
 * RCM-specific validation schemas
 */
const ValidationSchemas = {
  // Claim validation
  createClaim: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.required(),
    patient_name: Joi.string().min(1).max(255).required(),
    procedure_code: ValidationPatterns.cptCode.required(),
    procedure_description: Joi.string().max(500).optional(),
    diagnosis_code: ValidationPatterns.icdCode.required(),
    diagnosis_description: Joi.string().max(500).optional(),
    total_amount: ValidationPatterns.monetaryAmount.required(),
    unit_price: ValidationPatterns.monetaryAmount.optional(),
    code_units: ValidationPatterns.positiveInteger.optional().default(1),
    service_date: ValidationPatterns.dateString.required(),
    payer_name: Joi.string().max(255).optional(),
    policy_number: Joi.string().max(100).optional(),
    group_number: Joi.string().max(100).optional(),
    notes: ValidationPatterns.optionalString,
    status: ValidationPatterns.claimStatus.optional().default(0)
  }),

  updateClaim: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.optional(),
    patient_name: Joi.string().min(1).max(255).optional(),
    procedure_code: ValidationPatterns.cptCode.optional(),
    procedure_description: Joi.string().max(500).optional(),
    diagnosis_code: ValidationPatterns.icdCode.optional(),
    diagnosis_description: Joi.string().max(500).optional(),
    total_amount: ValidationPatterns.monetaryAmount.optional(),
    unit_price: ValidationPatterns.monetaryAmount.optional(),
    code_units: ValidationPatterns.positiveInteger.optional(),
    service_date: ValidationPatterns.dateString.optional(),
    payer_name: Joi.string().max(255).optional(),
    policy_number: Joi.string().max(100).optional(),
    group_number: Joi.string().max(100).optional(),
    notes: ValidationPatterns.optionalString,
    status: ValidationPatterns.claimStatus.optional()
  }),

  updateClaimStatus: Joi.object({
    status: ValidationPatterns.claimStatus.required(),
    notes: ValidationPatterns.optionalString
  }),

  // Eligibility validation schemas
  eligibilityCheck: Joi.object({
    patientId: ValidationPatterns.positiveInteger.required(),
    memberId: ValidationPatterns.nonEmptyString.required(),
    firstName: ValidationPatterns.optionalString,
    lastName: ValidationPatterns.optionalString,
    dateOfBirth: ValidationPatterns.optionalDateString,
    serviceDate: ValidationPatterns.optionalDateString,
    insuranceId: ValidationPatterns.optionalPositiveInteger
  }),

  eligibilityVerify: Joi.object({
    patientId: ValidationPatterns.positiveInteger.required(),
    serviceDate: ValidationPatterns.optionalDateString
  }),

  eligibilityHistoryQuery: Joi.object({
    patientId: ValidationPatterns.positiveInteger.required(),
    limit: ValidationPatterns.page.optional().default(10),
    offset: ValidationPatterns.page.optional().default(0)
  }),

  claimValidation: Joi.object({
    patientId: ValidationPatterns.positiveInteger.required(),
    serviceDate: ValidationPatterns.optionalDateString,
    procedureCodes: Joi.array().items(ValidationPatterns.cptCode).min(1).required(),
    diagnosisCodes: Joi.array().items(ValidationPatterns.icdCode).optional(),
    providerId: ValidationPatterns.optionalPositiveInteger,
    placeOfService: ValidationPatterns.optionalString,
    units: ValidationPatterns.optionalPositiveInteger,
    charges: ValidationPatterns.optionalMonetaryAmount
  }),

  benefitsCheck: Joi.object({
    patientId: ValidationPatterns.positiveInteger.required(),
    serviceDate: ValidationPatterns.optionalDateString,
    procedureCodes: Joi.array().items(ValidationPatterns.cptCode).optional()
  }),

  // Claims query parameters
  getClaimsQuery: Joi.object({
    page: ValidationPatterns.page,
    limit: ValidationPatterns.limit,
    status: Joi.alternatives().try(
      Joi.string().valid('all'),
      ValidationPatterns.claimStatus
    ).default('all'),
    search: ValidationPatterns.searchQuery,
    priority: Joi.string().valid('all', 'urgent', 'normal', 'recent').default('all'),
    date_from: ValidationPatterns.optionalDateString,
    date_to: ValidationPatterns.optionalDateString
  }),

  // Patient account validation
  createPatientAccount: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.required(),
    total_balance: ValidationPatterns.monetaryAmount.required(),
    aging_0_30: ValidationPatterns.optionalMonetaryAmount.default(0),
    aging_31_60: ValidationPatterns.optionalMonetaryAmount.default(0),
    aging_61_90: ValidationPatterns.optionalMonetaryAmount.default(0),
    aging_91_plus: ValidationPatterns.optionalMonetaryAmount.default(0),
    collection_status: ValidationPatterns.collectionStatus.default('new'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    assigned_collector: ValidationPatterns.optionalString,
    notes: ValidationPatterns.optionalString
  }),

  updatePatientAccount: Joi.object({
    total_balance: ValidationPatterns.optionalMonetaryAmount,
    aging_0_30: ValidationPatterns.optionalMonetaryAmount,
    aging_31_60: ValidationPatterns.optionalMonetaryAmount,
    aging_61_90: ValidationPatterns.optionalMonetaryAmount,
    aging_91_plus: ValidationPatterns.optionalMonetaryAmount,
    collection_status: ValidationPatterns.collectionStatus.optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    assigned_collector: ValidationPatterns.optionalString,
    notes: ValidationPatterns.optionalString
  }),

  // Payment plan validation
  createPaymentPlan: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.required(),
    total_amount: ValidationPatterns.monetaryAmount.required(),
    monthly_payment: ValidationPatterns.monetaryAmount.required(),
    start_date: ValidationPatterns.dateString.required(),
    auto_pay_enabled: Joi.boolean().default(false),
    notes: ValidationPatterns.optionalString
  }).custom((value, helpers) => {
    // Custom validation: monthly payment should not exceed total amount
    if (value.monthly_payment > value.total_amount) {
      return helpers.error('custom.monthlyPaymentTooHigh');
    }
    return value;
  }).messages({
    'custom.monthlyPaymentTooHigh': 'Monthly payment cannot exceed total amount'
  }),

  updatePaymentPlan: Joi.object({
    monthly_payment: ValidationPatterns.optionalMonetaryAmount,
    next_payment_date: ValidationPatterns.optionalDateString,
    auto_pay_enabled: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled').optional(),
    notes: ValidationPatterns.optionalString
  }),

  // Collection activity validation
  logCollectionActivity: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.required(),
    activity_type: Joi.string().valid(
      'phone_call', 'email_sent', 'letter_sent', 'payment_received', 
      'payment_plan_setup', 'follow_up_scheduled', 'account_review'
    ).required(),
    description: ValidationPatterns.nonEmptyString.required(),
    outcome: Joi.string().valid(
      'successful', 'no_response', 'busy', 'disconnected', 
      'payment_promised', 'dispute_raised', 'hardship_claimed'
    ).optional(),
    next_action: Joi.string().valid(
      'follow_up_call', 'send_statement', 'schedule_payment', 
      'escalate_to_collections', 'write_off', 'legal_action'
    ).optional(),
    next_action_date: ValidationPatterns.optionalDateString,
    notes: ValidationPatterns.optionalString
  }),

  // ERA processing validation
  processERA: Joi.object({
    file_name: ValidationPatterns.nonEmptyString.required(),
    file_size: ValidationPatterns.positiveInteger.required(),
    era_data: Joi.object().required(), // ERA data structure
    auto_post: Joi.boolean().default(true)
  }),

  // Dashboard query parameters
  getDashboardQuery: Joi.object({
    timeframe: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    compare_with: Joi.string().valid('previous', 'last_year').default('previous')
  }),

  // A/R aging query parameters
  getARAgingQuery: Joi.object({
    include_zero_balance: Joi.boolean().default(false),
    payer_filter: ValidationPatterns.optionalString,
    priority_filter: Joi.string().valid('all', 'high', 'medium', 'low').default('all')
  }),

  // Bulk operations
  bulkUpdateClaimStatus: Joi.object({
    claim_ids: Joi.array().items(ValidationPatterns.positiveInteger).min(1).max(100).required(),
    status: ValidationPatterns.claimStatus.required(),
    notes: ValidationPatterns.optionalString
  }),

  // Patient statement generation
  generatePatientStatement: Joi.object({
    patient_id: ValidationPatterns.positiveInteger.required(),
    include_paid: Joi.boolean().default(false),
    statement_date: ValidationPatterns.optionalDateString,
    delivery_method: Joi.string().valid('email', 'mail', 'portal').default('email')
  })
};

/**
 * Create validation middleware for a specific schema
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false, // Return all validation errors
        stripUnknown: true, // Remove unknown fields
        convert: true // Convert types (e.g., string to number)
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));
        
        const validationError = createValidationError(
          'Request validation failed',
          validationErrors
        );
        
        return res.status(validationError.statusCode).json({
          success: false,
          error: {
            code: validationError.code,
            message: validationError.message,
            details: validationError.details,
            timestamp: validationError.timestamp
          }
        });
      }

      // Replace the original data with validated and sanitized data
      req[source] = value;
      next();

    } catch (err) {
      console.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_MIDDLEWARE_ERROR',
          message: 'An error occurred during validation',
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

/**
 * Sanitization functions
 */
const Sanitizers = {
  /**
   * Sanitize string input to prevent XSS
   * @param {string} input - Input string
   * @returns {string} Sanitized string
   */
  sanitizeString: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  },

  /**
   * Comprehensive SQL injection prevention
   * @param {string} input - Input string
   * @returns {string} Sanitized string
   */
  sanitizeSQL: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/['";\\]/g, '') // Remove SQL injection characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove SQL block comments start
      .replace(/\*\//g, '') // Remove SQL block comments end
      .replace(/\bUNION\b/gi, '') // Remove UNION statements
      .replace(/\bSELECT\b/gi, '') // Remove SELECT statements
      .replace(/\bINSERT\b/gi, '') // Remove INSERT statements
      .replace(/\bUPDATE\b/gi, '') // Remove UPDATE statements
      .replace(/\bDELETE\b/gi, '') // Remove DELETE statements
      .replace(/\bDROP\b/gi, '') // Remove DROP statements
      .replace(/\bCREATE\b/gi, '') // Remove CREATE statements
      .replace(/\bALTER\b/gi, '') // Remove ALTER statements
      .replace(/\bEXEC\b/gi, '') // Remove EXEC statements
      .replace(/\bEXECUTE\b/gi, '') // Remove EXECUTE statements
      .replace(/\bSP_\b/gi, '') // Remove stored procedure calls
      .replace(/\bXP_\b/gi, '') // Remove extended stored procedures
      .replace(/\bSCRIPT\b/gi, '') // Remove SCRIPT references
      .replace(/\bSHUTDOWN\b/gi, ''); // Remove SHUTDOWN commands
  },

  /**
   * Sanitize numeric input
   * @param {*} input - Input value
   * @returns {number|null} Sanitized number or null
   */
  sanitizeNumber: (input) => {
    const num = parseFloat(input);
    return isNaN(num) ? null : num;
  },

  /**
   * Sanitize file path to prevent directory traversal
   * @param {string} input - File path input
   * @returns {string} Sanitized path
   */
  sanitizeFilePath: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/\.\./g, '') // Remove directory traversal attempts
      .replace(/[<>:"|?*]/g, '') // Remove invalid file characters
      .replace(/^\/+/, '') // Remove leading slashes
      .trim();
  },

  /**
   * Sanitize email input
   * @param {string} input - Email input
   * @returns {string} Sanitized email
   */
  sanitizeEmail: (input) => {
    if (typeof input !== 'string') return input;
    
    return input
      .toLowerCase()
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, ''); // Remove javascript: protocol
  }
};

/**
 * General sanitization middleware with comprehensive protection
 */
const sanitizationMiddleware = (req, res, next) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }

    // Add security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    next();
  } catch (error) {
    console.error('Sanitization middleware error:', error);
    const sanitizationError = createError('SANITIZATION_ERROR', 
      'An error occurred during input sanitization');
    next(sanitizationError);
  }
};

/**
 * SQL injection prevention middleware
 */
const sqlInjectionPreventionMiddleware = (req, res, next) => {
  try {
    const checkForSQLInjection = (obj, path = '') => {
      if (typeof obj === 'string') {
        // Check for common SQL injection patterns
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/gi,
          /(--|\/\*|\*\/)/g,
          /(\bOR\b.*=.*\bOR\b)/gi,
          /(\bAND\b.*=.*\bAND\b)/gi,
          /(1=1|1=0)/g,
          /(\bSCRIPT\b)/gi
        ];

        for (const pattern of sqlPatterns) {
          if (pattern.test(obj)) {
            throw createError('VALIDATION_ERROR', 
              `Potential SQL injection detected in ${path || 'input'}`);
          }
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          checkForSQLInjection(value, path ? `${path}.${key}` : key);
        }
      }
    };

    // Check body, query, and params for SQL injection
    if (req.body) checkForSQLInjection(req.body, 'body');
    if (req.query) checkForSQLInjection(req.query, 'query');
    if (req.params) checkForSQLInjection(req.params, 'params');

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Recursively sanitize object properties with context-aware sanitization
 * @param {Object} obj - Object to sanitize
 * @param {string} context - Context for sanitization (email, file, etc.)
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, context = 'general') => {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      // Apply context-specific sanitization
      if (context === 'email' || /email/i.test(context)) {
        return Sanitizers.sanitizeEmail(obj);
      } else if (context === 'file' || /file|path/i.test(context)) {
        return Sanitizers.sanitizeFilePath(obj);
      } else if (context === 'sql' || /query|search/i.test(context)) {
        return Sanitizers.sanitizeSQL(obj);
      } else {
        return Sanitizers.sanitizeString(obj);
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, context));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = Sanitizers.sanitizeString(key);
    // Determine context based on key name
    let valueContext = context;
    if (/email/i.test(key)) valueContext = 'email';
    else if (/file|path/i.test(key)) valueContext = 'file';
    else if (/search|query/i.test(key)) valueContext = 'sql';
    
    sanitized[sanitizedKey] = sanitizeObject(value, valueContext);
  }

  return sanitized;
};

/**
 * Pre-built validation middleware for common RCM endpoints
 */
const ValidationMiddleware = {
  // Eligibility validations
  validateEligibilityCheck: createValidationMiddleware(ValidationSchemas.eligibilityCheck, 'body'),
  validateEligibilityVerify: createValidationMiddleware(ValidationSchemas.eligibilityVerify, 'body'),
  validateEligibilityHistoryQuery: createValidationMiddleware(ValidationSchemas.eligibilityHistoryQuery, 'query'),
  validateClaimValidation: createValidationMiddleware(ValidationSchemas.claimValidation, 'body'),
  validateBenefitsCheck: createValidationMiddleware(ValidationSchemas.benefitsCheck, 'body'),

  // Claim validations
  validateCreateClaim: createValidationMiddleware(ValidationSchemas.createClaim, 'body'),
  validateUpdateClaim: createValidationMiddleware(ValidationSchemas.updateClaim, 'body'),
  validateUpdateClaimStatus: createValidationMiddleware(ValidationSchemas.updateClaimStatus, 'body'),
  validateGetClaimsQuery: createValidationMiddleware(ValidationSchemas.getClaimsQuery, 'query'),
  
  // Patient account validations
  validateCreatePatientAccount: createValidationMiddleware(ValidationSchemas.createPatientAccount, 'body'),
  validateUpdatePatientAccount: createValidationMiddleware(ValidationSchemas.updatePatientAccount, 'body'),
  
  // Payment plan validations
  validateCreatePaymentPlan: createValidationMiddleware(ValidationSchemas.createPaymentPlan, 'body'),
  validateUpdatePaymentPlan: createValidationMiddleware(ValidationSchemas.updatePaymentPlan, 'body'),
  
  // Collection activity validations
  validateLogCollectionActivity: createValidationMiddleware(ValidationSchemas.logCollectionActivity, 'body'),
  
  // ERA processing validations
  validateProcessERA: createValidationMiddleware(ValidationSchemas.processERA, 'body'),
  
  // Dashboard validations
  validateGetDashboardQuery: createValidationMiddleware(ValidationSchemas.getDashboardQuery, 'query'),
  validateGetARAgingQuery: createValidationMiddleware(ValidationSchemas.getARAgingQuery, 'query'),
  
  // Bulk operations
  validateBulkUpdateClaimStatus: createValidationMiddleware(ValidationSchemas.bulkUpdateClaimStatus, 'body'),
  
  // Patient statement validations
  validateGeneratePatientStatement: createValidationMiddleware(ValidationSchemas.generatePatientStatement, 'body'),
  
  // Collections query validation
  validateGetCollectionsQuery: createValidationMiddleware(Joi.object({
    page: ValidationPatterns.page,
    limit: ValidationPatterns.limit,
    patient_id: ValidationPatterns.optionalPositiveInteger,
    activity_type: Joi.string().optional(),
    outcome: Joi.string().optional(),
    date_from: ValidationPatterns.optionalDateString,
    date_to: ValidationPatterns.optionalDateString
  }), 'query'),
  
  // Parameter validations
  validatePositiveIntegerParam: (paramName) => createValidationMiddleware(
    Joi.object({ [paramName]: ValidationPatterns.positiveInteger.required() }), 
    'params'
  ),

  // Payment validations
  validatePostPayment: createValidationMiddleware(Joi.object({
    claim_id: ValidationPatterns.positiveInteger.required(),
    payment_amount: ValidationPatterns.monetaryAmount.required(),
    payment_date: ValidationPatterns.dateString.required(),
    payment_method: ValidationPatterns.optionalString,
    check_number: ValidationPatterns.optionalString,
    adjustment_amount: ValidationPatterns.optionalMonetaryAmount,
    adjustment_reason: ValidationPatterns.optionalString,
    notes: ValidationPatterns.optionalString
  }), 'body'),

  // Required parameter validation
  validateRequiredParam: (paramName) => createValidationMiddleware(
    Joi.object({ [paramName]: Joi.string().required() }), 
    'params'
  ),

  // Required query parameter validation
  validateRequiredQuery: (paramName) => createValidationMiddleware(
    Joi.object({ [paramName]: Joi.string().required() }), 
    'query'
  ),

  // Flexible parameter validation (checks both params and query)
  validateRequiredField: (fieldName) => (req, res, next) => {
    const value = req.params[fieldName] || req.query[fieldName] || req.body[fieldName];
    
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${fieldName} is required`,
          details: [{
            field: fieldName,
            message: `${fieldName} is required and cannot be empty`
          }],
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Add the validated field to req for consistency
    req.validatedFields = req.validatedFields || {};
    req.validatedFields[fieldName] = value.toString().trim();
    
    next();
  },

  // ClaimMD configuration validation
  validateClaimMDConfiguration: createValidationMiddleware(Joi.object({
    api_key: ValidationPatterns.nonEmptyString.required(),
    base_url: Joi.string().uri().optional(),
    provider_id: ValidationPatterns.nonEmptyString.required(),
    is_active: Joi.boolean().optional(),
    configuration_data: Joi.object().optional()
  }), 'body')
};

// Additional validation functions for compatibility
const validateClaimData = (req, res, next) => {
  const schema = ValidationSchemas.createClaim;
  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid claim data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      }
    });
  }
  
  next();
};

module.exports = {
  ValidationPatterns,
  ValidationSchemas,
  ValidationMiddleware,
  Sanitizers,
  sanitizationMiddleware,
  sqlInjectionPreventionMiddleware,
  createValidationMiddleware,
  validateClaimData
};