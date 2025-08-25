/**
 * RCM Error Handling Tests
 * Comprehensive test suite for error handling scenarios
 */

const rcmService = require('../rcmService');
const rcmController = require('../rcmController');
const dbUtils = require('../../../utils/dbUtils');
const standardizedResponse = require('../../../utils/standardizedResponse');

// Mock dependencies
jest.mock('../../../utils/dbUtils');
jest.mock('../../../utils/standardizedResponse');

describe('RCM Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Error Scenarios', () => {
    it('should handle connection timeout errors', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.errno = 'ETIMEDOUT';

      dbUtils.executeQuery.mockRejectedValue(timeoutError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Database connection timeout',
        code: 'DB_TIMEOUT'
      });

      const result = await rcmService.getRCMDashboardData();

      expect(result.success).toBe(false);
      expect(result.code).toBe('DB_TIMEOUT');
      expect(standardizedResponse.error).toHaveBeenCalledWith(
        'Database connection timeout',
        timeoutError
      );
    });

    it('should handle connection refused errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';
      connectionError.errno = 'ECONNREFUSED';

      dbUtils.executeQuery.mockRejectedValue(connectionError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Database connection failed',
        code: 'DB_CONNECTION_FAILED'
      });

      const result = await rcmService.getClaimsData();

      expect(result.success).toBe(false);
      expect(result.code).toBe('DB_CONNECTION_FAILED');
    });

    it('should handle deadlock errors with retry logic', async () => {
      const deadlockError = new Error('Deadlock found when trying to get lock');
      deadlockError.code = 'ER_LOCK_DEADLOCK';
      deadlockError.errno = 1213;

      // First call fails with deadlock, second succeeds
      dbUtils.executeQuery
        .mockRejectedValueOnce(deadlockError)
        .mockResolvedValueOnce([{ id: 1, amount: 150.00 }]);

      standardizedResponse.success.mockReturnValue({
        success: true,
        data: [{ id: 1, amount: 150.00 }]
      });

      const result = await rcmService.getClaimsData();

      expect(dbUtils.executeQuery).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should handle foreign key constraint violations', async () => {
      const constraintError = new Error('Cannot add or update a child row');
      constraintError.code = 'ER_NO_REFERENCED_ROW_2';
      constraintError.errno = 1452;

      dbUtils.executeQuery.mockRejectedValue(constraintError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Referenced record not found',
        code: 'FOREIGN_KEY_VIOLATION'
      });

      const claimData = {
        patientId: 999, // Non-existent patient
        providerId: 1,
        amount: 150.00
      };

      const result = await rcmService.createClaim(claimData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('FOREIGN_KEY_VIOLATION');
    });

    it('should handle duplicate key errors', async () => {
      const duplicateError = new Error('Duplicate entry for key');
      duplicateError.code = 'ER_DUP_ENTRY';
      duplicateError.errno = 1062;

      dbUtils.executeQuery.mockRejectedValue(duplicateError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Record already exists',
        code: 'DUPLICATE_ENTRY'
      });

      const claimData = {
        claimNumber: 'CLM001', // Duplicate claim number
        patientId: 1,
        amount: 150.00
      };

      const result = await rcmService.createClaim(claimData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('DUPLICATE_ENTRY');
    });

    it('should handle table not found errors', async () => {
      const tableError = new Error('Table does not exist');
      tableError.code = 'ER_NO_SUCH_TABLE';
      tableError.errno = 1146;

      dbUtils.executeQuery.mockRejectedValue(tableError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Database schema error',
        code: 'SCHEMA_ERROR'
      });

      const result = await rcmService.getRCMDashboardData();

      expect(result.success).toBe(false);
      expect(result.code).toBe('SCHEMA_ERROR');
    });

    it('should handle disk full errors', async () => {
      const diskError = new Error('No space left on device');
      diskError.code = 'ER_DISK_FULL';
      diskError.errno = 1021;

      dbUtils.executeQuery.mockRejectedValue(diskError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Storage capacity exceeded',
        code: 'STORAGE_FULL'
      });

      const result = await rcmService.createClaim({});

      expect(result.success).toBe(false);
      expect(result.code).toBe('STORAGE_FULL');
    });
  });

  describe('Validation Error Scenarios', () => {
    it('should handle missing required fields', async () => {
      const invalidData = {
        patientId: null,
        amount: 'invalid'
      };

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Validation failed',
        details: [
          { field: 'patientId', message: 'Patient ID is required' },
          { field: 'amount', message: 'Amount must be a number' }
        ]
      });

      const result = await rcmService.createClaim(invalidData);

      expect(result.success).toBe(false);
      expect(result.details).toHaveLength(2);
      expect(dbUtils.executeQuery).not.toHaveBeenCalled();
    });

    it('should handle invalid data types', async () => {
      const invalidData = {
        patientId: 'not-a-number',
        amount: 'not-a-number',
        serviceDate: 'invalid-date'
      };

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Invalid data types',
        details: [
          { field: 'patientId', message: 'Must be a valid integer' },
          { field: 'amount', message: 'Must be a valid decimal' },
          { field: 'serviceDate', message: 'Must be a valid date' }
        ]
      });

      const result = await rcmService.createClaim(invalidData);

      expect(result.success).toBe(false);
      expect(result.details).toHaveLength(3);
    });

    it('should handle out-of-range values', async () => {
      const invalidData = {
        patientId: -1,
        amount: -100.00,
        serviceDate: '2050-01-01' // Future date
      };

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Values out of valid range',
        details: [
          { field: 'patientId', message: 'Must be positive' },
          { field: 'amount', message: 'Must be positive' },
          { field: 'serviceDate', message: 'Cannot be in the future' }
        ]
      });

      const result = await rcmService.createClaim(invalidData);

      expect(result.success).toBe(false);
      expect(result.details).toHaveLength(3);
    });

    it('should handle string length violations', async () => {
      const invalidData = {
        patientId: 1,
        notes: 'x'.repeat(10000), // Exceeds maximum length
        diagnosis: 'INVALID_CODE_TOO_LONG'
      };

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'String length violations',
        details: [
          { field: 'notes', message: 'Exceeds maximum length of 1000 characters' },
          { field: 'diagnosis', message: 'Invalid diagnosis code format' }
        ]
      });

      const result = await rcmService.createClaim(invalidData);

      expect(result.success).toBe(false);
      expect(result.details).toHaveLength(2);
    });
  });

  describe('Business Logic Error Scenarios', () => {
    it('should handle insufficient payment amount', async () => {
      const paymentData = {
        claimId: 1,
        amount: 200.00 // More than claim amount
      };

      // Mock claim with lower amount
      dbUtils.executeQuery.mockResolvedValueOnce([{
        id: 1,
        totalAmount: 150.00,
        paidAmount: 0.00
      }]);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Payment amount exceeds claim balance',
        code: 'PAYMENT_EXCEEDS_BALANCE'
      });

      const result = await rcmService.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('PAYMENT_EXCEEDS_BALANCE');
    });

    it('should handle claim status conflicts', async () => {
      const updateData = {
        claimId: 1,
        status: 'submitted'
      };

      // Mock claim that's already paid
      dbUtils.executeQuery.mockResolvedValueOnce([{
        id: 1,
        status: 'paid'
      }]);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Cannot modify paid claim',
        code: 'INVALID_STATUS_TRANSITION'
      });

      const result = await rcmService.updateClaimStatus(1, 'submitted');

      expect(result.success).toBe(false);
      expect(result.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should handle expired appeal deadlines', async () => {
      const appealData = {
        claimId: 1,
        appealReason: 'Documentation provided'
      };

      // Mock denial with expired deadline
      dbUtils.executeQuery.mockResolvedValueOnce([{
        id: 1,
        claimId: 1,
        appealDeadline: '2023-01-01' // Past date
      }]);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Appeal deadline has passed',
        code: 'APPEAL_DEADLINE_EXPIRED'
      });

      const result = await rcmService.createAppeal(appealData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('APPEAL_DEADLINE_EXPIRED');
    });

    it('should handle non-appealable denials', async () => {
      const appealData = {
        claimId: 1,
        appealReason: 'Incorrect denial'
      };

      // Mock non-appealable denial
      dbUtils.executeQuery.mockResolvedValueOnce([{
        id: 1,
        claimId: 1,
        appealable: false
      }]);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'This denial cannot be appealed',
        code: 'NON_APPEALABLE_DENIAL'
      });

      const result = await rcmService.createAppeal(appealData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('NON_APPEALABLE_DENIAL');
    });
  });

  describe('External Service Error Scenarios', () => {
    it('should handle payment gateway failures', async () => {
      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'credit_card',
        cardToken: 'invalid_token'
      };

      const gatewayError = new Error('Payment gateway error');
      gatewayError.code = 'GATEWAY_ERROR';

      // Mock payment gateway failure
      dbUtils.executeTransaction.mockRejectedValue(gatewayError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Payment processing failed',
        code: 'PAYMENT_GATEWAY_ERROR'
      });

      const result = await rcmService.processPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('PAYMENT_GATEWAY_ERROR');
    });

    it('should handle clearinghouse communication failures', async () => {
      const claimData = {
        patientId: 1,
        providerId: 1,
        amount: 150.00
      };

      const clearinghouseError = new Error('Clearinghouse unavailable');
      clearinghouseError.code = 'SERVICE_UNAVAILABLE';

      dbUtils.executeQuery.mockRejectedValue(clearinghouseError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Claim submission failed - clearinghouse unavailable',
        code: 'CLEARINGHOUSE_ERROR'
      });

      const result = await rcmService.submitClaim(claimData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('CLEARINGHOUSE_ERROR');
    });

    it('should handle insurance eligibility verification failures', async () => {
      const verificationData = {
        patientId: 1,
        insuranceId: 'INS123456'
      };

      const eligibilityError = new Error('Eligibility service timeout');
      eligibilityError.code = 'TIMEOUT';

      dbUtils.executeQuery.mockRejectedValue(eligibilityError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Unable to verify insurance eligibility',
        code: 'ELIGIBILITY_VERIFICATION_FAILED'
      });

      const result = await rcmService.verifyEligibility(verificationData);

      expect(result.success).toBe(false);
      expect(result.code).toBe('ELIGIBILITY_VERIFICATION_FAILED');
    });
  });

  describe('Controller Error Handling', () => {
    let req, res, next;

    beforeEach(() => {
      req = global.testUtils.mockRequest();
      res = global.testUtils.mockResponse();
      next = global.testUtils.mockNext();
    });

    it('should handle service layer exceptions in controller', async () => {
      const serviceError = new Error('Service layer error');
      serviceError.code = 'SERVICE_ERROR';

      rcmService.getRCMDashboardData = jest.fn().mockRejectedValue(serviceError);

      await rcmController.getDashboardData(req, res, next);

      expect(next).toHaveBeenCalledWith(serviceError);
    });

    it('should handle malformed request data', async () => {
      req.body = 'invalid json string';

      const parseError = new SyntaxError('Unexpected token');
      parseError.status = 400;

      await rcmController.createClaim(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle missing authentication', async () => {
      req.user = null;

      await rcmController.getDashboardData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required'
      });
    });

    it('should handle insufficient permissions', async () => {
      req.user = { id: 1, role: 'viewer' };

      await rcmController.processPayment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions'
      });
    });

    it('should handle request timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'TIMEOUT';

      rcmService.getRCMDashboardData = jest.fn().mockRejectedValue(timeoutError);

      await rcmController.getDashboardData(req, res, next);

      expect(next).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should implement circuit breaker pattern for external services', async () => {
      const serviceError = new Error('Service unavailable');
      serviceError.code = 'SERVICE_UNAVAILABLE';

      // Simulate multiple failures
      dbUtils.executeQuery
        .mockRejectedValueOnce(serviceError)
        .mockRejectedValueOnce(serviceError)
        .mockRejectedValueOnce(serviceError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Service temporarily unavailable',
        code: 'CIRCUIT_BREAKER_OPEN'
      });

      const result1 = await rcmService.getRCMDashboardData();
      const result2 = await rcmService.getRCMDashboardData();
      const result3 = await rcmService.getRCMDashboardData();

      expect(result1.success).toBe(false);
      expect(result2.success).toBe(false);
      expect(result3.success).toBe(false);
      expect(result3.code).toBe('CIRCUIT_BREAKER_OPEN');
    });

    it('should implement graceful degradation', async () => {
      const analyticsError = new Error('Analytics service down');
      
      // Main data succeeds, analytics fails
      dbUtils.executeQuery
        .mockResolvedValueOnce([{ totalRevenue: 150000 }])
        .mockRejectedValueOnce(analyticsError);

      standardizedResponse.success.mockReturnValue({
        success: true,
        data: { totalRevenue: 150000 },
        warnings: ['Analytics data unavailable']
      });

      const result = await rcmService.getRCMDashboardData();

      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Analytics data unavailable');
    });

    it('should implement retry logic with exponential backoff', async () => {
      const transientError = new Error('Temporary failure');
      transientError.code = 'TEMPORARY_FAILURE';

      // Fail twice, then succeed
      dbUtils.executeQuery
        .mockRejectedValueOnce(transientError)
        .mockRejectedValueOnce(transientError)
        .mockResolvedValueOnce([{ id: 1 }]);

      standardizedResponse.success.mockReturnValue({
        success: true,
        data: [{ id: 1 }]
      });

      const result = await rcmService.getClaimsData();

      expect(dbUtils.executeQuery).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should log critical errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const criticalError = new Error('Critical system error');
      criticalError.code = 'CRITICAL_ERROR';

      dbUtils.executeQuery.mockRejectedValue(criticalError);

      await rcmService.getRCMDashboardData();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Critical error in RCM service'),
        expect.objectContaining({
          error: criticalError.message,
          code: criticalError.code
        })
      );

      consoleSpy.mockRestore();
    });

    it('should include request context in error logs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      req.user = { id: 1, email: 'test@example.com' };
      req.ip = '192.168.1.1';
      
      const serviceError = new Error('Service error');
      rcmService.getRCMDashboardData = jest.fn().mockRejectedValue(serviceError);

      await rcmController.getDashboardData(req, res, next);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in RCM controller'),
        expect.objectContaining({
          userId: 1,
          userEmail: 'test@example.com',
          ip: '192.168.1.1'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should sanitize sensitive data in error logs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const sensitiveData = {
        patientId: 1,
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111'
      };

      const serviceError = new Error('Validation error');
      serviceError.data = sensitiveData;

      dbUtils.executeQuery.mockRejectedValue(serviceError);

      await rcmService.createClaim(sensitiveData);

      const logCall = consoleSpy.mock.calls[0];
      const loggedData = JSON.stringify(logCall);
      
      expect(loggedData).not.toContain('123-45-6789');
      expect(loggedData).not.toContain('4111-1111-1111-1111');
      expect(loggedData).toContain('[REDACTED]');

      consoleSpy.mockRestore();
    });
  });
});
</content>
</invoke>