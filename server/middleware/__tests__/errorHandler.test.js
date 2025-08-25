/**
 * Error Handler Middleware Tests
 * Comprehensive tests for error handling middleware
 */

const errorHandler = require('../errorHandler');

describe('Error Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
    
    // Mock console methods to avoid test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Standard Error Handling', () => {
    it('should handle generic errors', () => {
      const error = new Error('Generic error message');
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        message: 'Generic error message',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle errors with custom status codes', () => {
      const error = new Error('Not found');
      error.status = 404;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found',
        message: 'Not found',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle errors with custom error codes', () => {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      error.status = 400;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Bad Request',
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Database Error Handling', () => {
    it('should handle MySQL connection errors', () => {
      const error = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      error.errno = 1045;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
        message: 'Unable to connect to database',
        code: 'DATABASE_CONNECTION_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle MySQL duplicate entry errors', () => {
      const error = new Error("Duplicate entry 'CLM001' for key 'claim_number'");
      error.code = 'ER_DUP_ENTRY';
      error.errno = 1062;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Duplicate entry',
        message: 'Record already exists',
        code: 'DUPLICATE_ENTRY',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle MySQL foreign key constraint errors', () => {
      const error = new Error('Cannot add or update a child row: a foreign key constraint fails');
      error.code = 'ER_NO_REFERENCED_ROW_2';
      error.errno = 1452;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid reference',
        message: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_CONSTRAINT',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle MySQL timeout errors', () => {
      const error = new Error('Query timeout');
      error.code = 'ETIMEDOUT';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout',
        message: 'Operation timed out',
        code: 'TIMEOUT_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle MySQL deadlock errors', () => {
      const error = new Error('Deadlock found when trying to get lock');
      error.code = 'ER_LOCK_DEADLOCK';
      error.errno = 1213;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Resource conflict',
        message: 'Please try again',
        code: 'DEADLOCK_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle express-validator errors', () => {
      const error = new Error('Validation failed');
      error.type = 'validation';
      error.errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'amount', message: 'Amount must be positive' }
      ];
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'amount', message: 'Amount must be positive' }
        ],
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle Joi validation errors', () => {
      const error = new Error('Validation error');
      error.isJoi = true;
      error.details = [
        { path: ['patientId'], message: 'Patient ID is required' },
        { path: ['amount'], message: 'Amount must be a number' }
      ];
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: [
          { field: 'patientId', message: 'Patient ID is required' },
          { field: 'amount', message: 'Amount must be a number' }
        ],
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle JWT authentication errors', () => {
      const error = new Error('jwt malformed');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired token',
        code: 'AUTH_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle JWT expiration errors', () => {
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      error.expiredAt = new Date();
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token expired',
        message: 'Please log in again',
        code: 'TOKEN_EXPIRED',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle authorization errors', () => {
      const error = new Error('Insufficient permissions');
      error.name = 'AuthorizationError';
      error.status = 403;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        message: 'Insufficient permissions',
        code: 'AUTHORIZATION_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Payment Processing Errors', () => {
    it('should handle Stripe payment errors', () => {
      const error = new Error('Your card was declined');
      error.type = 'StripeCardError';
      error.code = 'card_declined';
      error.decline_code = 'generic_decline';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Payment failed',
        message: 'Your card was declined',
        code: 'PAYMENT_DECLINED',
        details: {
          decline_code: 'generic_decline'
        },
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle payment gateway timeout errors', () => {
      const error = new Error('Payment gateway timeout');
      error.type = 'PaymentGatewayError';
      error.code = 'gateway_timeout';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Payment gateway timeout',
        message: 'Payment processing timed out',
        code: 'PAYMENT_TIMEOUT',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('File Upload Errors', () => {
    it('should handle multer file size errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';
      error.field = 'document';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'File too large',
        message: 'File size exceeds limit',
        code: 'FILE_SIZE_ERROR',
        field: 'document',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });

    it('should handle multer file type errors', () => {
      const error = new Error('Invalid file type');
      error.code = 'INVALID_FILE_TYPE';
      error.field = 'document';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid file type',
        message: 'File type not allowed',
        code: 'FILE_TYPE_ERROR',
        field: 'document',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Rate Limiting Errors', () => {
    it('should handle rate limit exceeded errors', () => {
      const error = new Error('Too many requests');
      error.status = 429;
      error.type = 'RateLimitError';
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });

  describe('Development vs Production Behavior', () => {
    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Development error');
      error.stack = 'Error: Development error\n    at test.js:1:1';
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.any(String)
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not include stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Production error');
      error.stack = 'Error: Production error\n    at test.js:1:1';
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          stack: expect.any(String)
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Logging', () => {
    it('should log errors with appropriate level', () => {
      const error = new Error('Test error');
      error.status = 500;
      
      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Error:'),
        expect.objectContaining({
          message: 'Test error',
          status: 500,
          requestId: expect.any(String)
        })
      );
    });

    it('should log client errors with lower priority', () => {
      const error = new Error('Client error');
      error.status = 400;
      
      errorHandler(error, req, res, next);

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Client Error:'),
        expect.objectContaining({
          message: 'Client error',
          status: 400
        })
      );
    });

    it('should include request context in logs', () => {
      req.method = 'POST';
      req.url = '/api/rcm/claims';
      req.user = { id: 1, email: 'test@example.com' };
      req.ip = '127.0.0.1';
      
      const error = new Error('Context error');
      
      errorHandler(error, req, res, next);

      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          request: {
            method: 'POST',
            url: '/api/rcm/claims',
            user: { id: 1, email: 'test@example.com' },
            ip: '127.0.0.1'
          }
        })
      );
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      errorHandler(error1, req, res, next);
      const requestId1 = res.json.mock.calls[0][0].requestId;
      
      // Reset mocks for second call
      res.json.mockClear();
      
      errorHandler(error2, req, res, next);
      const requestId2 = res.json.mock.calls[0][0].requestId;
      
      expect(requestId1).not.toBe(requestId2);
      expect(requestId1).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(requestId2).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    });

    it('should use existing request ID if present', () => {
      req.requestId = 'existing-request-id';
      
      const error = new Error('Test error');
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'existing-request-id'
        })
      );
    });
  });

  describe('Error Sanitization', () => {
    it('should sanitize sensitive information from error messages', () => {
      const error = new Error('Database error: password=secret123 user=admin');
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.not.stringContaining('secret123')
        })
      );
    });

    it('should sanitize SQL queries from error messages', () => {
      const error = new Error('SQL Error: SELECT * FROM users WHERE password = "secret"');
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.not.stringContaining('SELECT * FROM users')
        })
      );
    });
  });

  describe('Custom Error Types', () => {
    it('should handle custom RCM errors', () => {
      const error = new Error('Claim processing failed');
      error.type = 'RCMError';
      error.code = 'CLAIM_PROCESSING_ERROR';
      error.status = 422;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Claim processing failed',
        message: 'Claim processing failed',
        code: 'CLAIM_PROCESSING_ERROR',
        timestamp: expect.any(String),
        requestId: expect.any(String)
      });
    });
  });
});