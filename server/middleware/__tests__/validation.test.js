const {
  ValidationSchemas,
  ValidationMiddleware,
  Sanitizers,
  createValidationMiddleware
} = require('../validation');

// Mock the error handler
jest.mock('../errorHandler', () => ({
  createValidationError: jest.fn((message, errors) => {
    const error = new Error(message);
    error.code = 'VALIDATION_ERROR';
    error.statusCode = 400;
    error.details = { validationErrors: errors };
    return error;
  }),
  createError: jest.fn((type, message) => {
    const error = new Error(message);
    error.code = type;
    error.statusCode = 429;
    return error;
  })
}));

const { createValidationError, createError } = require('../errorHandler');

describe('Validation Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      ip: '127.0.0.1',
      user: { user_id: 123 }
    };

    mockRes = {
      set: jest.fn()
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('ValidationSchemas', () => {
    describe('createClaim', () => {
      it('should validate valid claim data', () => {
        const validClaim = {
          patient_id: 123,
          procedure_code: '12345',
          total_amount: 100.50,
          service_date: '2024-01-15T00:00:00.000Z'
        };

        const { error, value } = ValidationSchemas.createClaim.validate(validClaim);
        expect(error).toBeUndefined();
        expect(value.patient_id).toBe(123);
        expect(value.procedure_code).toBe('12345');
      });

      it('should reject invalid claim data', () => {
        const invalidClaim = {
          patient_id: 'invalid',
          procedure_code: '123', // Too short
          total_amount: -100, // Negative
          service_date: 'invalid-date'
        };

        const { error } = ValidationSchemas.createClaim.validate(invalidClaim);
        expect(error).toBeDefined();
        expect(error.details.length).toBeGreaterThan(0);
      });

      it('should require mandatory fields', () => {
        const incompleteClaim = {
          patient_id: 123
          // Missing required fields
        };

        const { error } = ValidationSchemas.createClaim.validate(incompleteClaim);
        expect(error).toBeDefined();
        expect(error.details.some(d => d.path.includes('procedure_code'))).toBe(true);
        expect(error.details.some(d => d.path.includes('total_amount'))).toBe(true);
      });
    });

    describe('createPaymentPlan', () => {
      it('should validate valid payment plan', () => {
        const validPlan = {
          patient_id: 123,
          total_amount: 1000,
          monthly_payment: 100,
          start_date: '2024-02-01T00:00:00.000Z'
        };

        const { error, value } = ValidationSchemas.createPaymentPlan.validate(validPlan);
        expect(error).toBeUndefined();
        expect(value.auto_pay_enabled).toBe(false); // Default value
      });

      it('should reject monthly payment exceeding total amount', () => {
        const invalidPlan = {
          patient_id: 123,
          total_amount: 100,
          monthly_payment: 200, // Exceeds total
          start_date: '2024-02-01T00:00:00.000Z'
        };

        const { error } = ValidationSchemas.createPaymentPlan.validate(invalidPlan);
        expect(error).toBeDefined();
        expect(error.message).toContain('Monthly payment cannot exceed total amount');
      });
    });

    describe('getClaimsQuery', () => {
      it('should apply default values', () => {
        const query = {};

        const { error, value } = ValidationSchemas.getClaimsQuery.validate(query);
        expect(error).toBeUndefined();
        expect(value.page).toBe(1);
        expect(value.limit).toBe(10);
        expect(value.status).toBe('all');
      });

      it('should validate pagination parameters', () => {
        const query = {
          page: 0, // Invalid
          limit: 200 // Too high
        };

        const { error } = ValidationSchemas.getClaimsQuery.validate(query);
        expect(error).toBeDefined();
        expect(error.details.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ValidationMiddleware', () => {
    beforeEach(() => {
      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn().mockReturnThis();
    });

    describe('validateCreateClaim', () => {
      it('should pass valid data through', () => {
        mockReq.body = {
          patient_id: 123,
          procedure_code: '12345',
          total_amount: 100.50,
          service_date: '2024-01-15T00:00:00.000Z'
        };

        ValidationMiddleware.validateCreateClaim(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      it('should reject invalid data', () => {
        mockReq.body = {
          patient_id: 'invalid',
          procedure_code: '123'
        };

        ValidationMiddleware.validateCreateClaim(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR'
            })
          })
        );
      });

      it('should sanitize and convert data types', () => {
        mockReq.body = {
          patient_id: '123', // String that should be converted to number
          procedure_code: '12345',
          total_amount: '100.50', // String that should be converted to number
          service_date: '2024-01-15T00:00:00.000Z',
          unknown_field: 'should be removed' // Should be stripped
        };

        ValidationMiddleware.validateCreateClaim(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.patient_id).toBe(123); // Converted to number
        expect(mockReq.body.total_amount).toBe(100.50); // Converted to number
        expect(mockReq.body.unknown_field).toBeUndefined(); // Stripped
      });
    });

    describe('validateCreatePaymentPlan', () => {
      it('should validate valid payment plan', () => {
        mockReq.body = {
          patient_id: 123,
          total_amount: 1000,
          monthly_payment: 100,
          start_date: '2024-02-01T00:00:00.000Z'
        };

        ValidationMiddleware.validateCreatePaymentPlan(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.body.auto_pay_enabled).toBe(false); // Default value
      });

      it('should reject monthly payment exceeding total', () => {
        mockReq.body = {
          patient_id: 123,
          total_amount: 100,
          monthly_payment: 200, // Exceeds total
          start_date: '2024-02-01T00:00:00.000Z'
        };

        ValidationMiddleware.validateCreatePaymentPlan(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('validateGetClaimsQuery', () => {
      it('should validate query parameters', () => {
        mockReq.query = {
          page: '2',
          limit: '20',
          status: '1'
        };

        ValidationMiddleware.validateGetClaimsQuery(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.query.page).toBe(2); // Converted to number
        expect(mockReq.query.limit).toBe(20); // Converted to number
      });
    });
  });

  describe('Sanitizers', () => {
    describe('sanitizeString', () => {
      it('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello';
        const result = Sanitizers.sanitizeString(input);
        expect(result).toBe('scriptalert("xss")/scriptHello');
      });

      it('should remove javascript protocol', () => {
        const input = 'javascript:alert("xss")';
        const result = Sanitizers.sanitizeString(input);
        expect(result).toBe('alert("xss")');
      });

      it('should remove event handlers', () => {
        const input = 'onclick=alert("xss") Hello';
        const result = Sanitizers.sanitizeString(input);
        expect(result).toBe('Hello');
      });

      it('should trim whitespace', () => {
        const input = '  Hello World  ';
        const result = Sanitizers.sanitizeString(input);
        expect(result).toBe('Hello World');
      });
    });

    describe('sanitizeSQL', () => {
      it('should remove SQL injection characters', () => {
        const input = "'; DROP TABLE users; --";
        const result = Sanitizers.sanitizeSQL(input);
        expect(result).toBe(' DROP TABLE users ');
      });

      it('should remove SQL comments', () => {
        const input = 'SELECT * FROM users -- comment';
        const result = Sanitizers.sanitizeSQL(input);
        expect(result).toBe('SELECT * FROM users  comment');
      });
    });

    describe('sanitizeNumber', () => {
      it('should convert valid numbers', () => {
        expect(Sanitizers.sanitizeNumber('123')).toBe(123);
        expect(Sanitizers.sanitizeNumber('123.45')).toBe(123.45);
        expect(Sanitizers.sanitizeNumber(456)).toBe(456);
      });

      it('should return null for invalid numbers', () => {
        expect(Sanitizers.sanitizeNumber('abc')).toBeNull();
        expect(Sanitizers.sanitizeNumber('')).toBeNull();
        expect(Sanitizers.sanitizeNumber(null)).toBeNull();
      });
    });
  });

  describe('Enhanced Sanitizers', () => {
    describe('sanitizeSQL', () => {
      it('should remove SQL injection attempts', () => {
        const maliciousInputs = [
          "'; DROP TABLE users; --",
          "1' OR '1'='1",
          "UNION SELECT * FROM passwords",
          "/* comment */ SELECT",
          "EXEC sp_executesql"
        ];

        maliciousInputs.forEach(input => {
          const result = Sanitizers.sanitizeSQL(input);
          expect(result).not.toContain('DROP');
          expect(result).not.toContain('UNION');
          expect(result).not.toContain('SELECT');
          expect(result).not.toContain('EXEC');
        });
      });
    });

    describe('sanitizeFilePath', () => {
      it('should prevent directory traversal', () => {
        const maliciousPaths = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32',
          '/etc/shadow',
          'file<script>alert()</script>.txt'
        ];

        maliciousPaths.forEach(path => {
          const result = Sanitizers.sanitizeFilePath(path);
          expect(result).not.toContain('..');
          expect(result).not.toContain('<script>');
        });
      });
    });

    describe('sanitizeEmail', () => {
      it('should sanitize email inputs', () => {
        const result = Sanitizers.sanitizeEmail('Test@Example.COM<script>');
        expect(result).toBe('test@example.comscript');
      });
    });
  });

  describe('createValidationMiddleware', () => {
    it('should create middleware for custom schema', () => {
      const customSchema = require('joi').object({
        name: require('joi').string().required(),
        age: require('joi').number().integer().min(0).required()
      });

      const middleware = createValidationMiddleware(customSchema, 'body');

      mockReq.body = {
        name: 'John',
        age: 30
      };

      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle validation errors in custom middleware', () => {
      const customSchema = require('joi').object({
        name: require('joi').string().required()
      });

      const middleware = createValidationMiddleware(customSchema, 'body');

      mockReq.body = {}; // Missing required field

      mockRes.status = jest.fn().mockReturnThis();
      mockRes.json = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});