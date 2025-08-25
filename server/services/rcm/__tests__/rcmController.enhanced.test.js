/**
 * Enhanced RCM Controller Tests
 * Comprehensive test suite for RCM controller with edge cases and error scenarios
 */

const rcmController = require('../rcmCtrl');
const rcmService = require('../rcmService');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../rcmService');
jest.mock('express-validator');

describe('Enhanced RCM Controller Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'admin' },
      headers: {},
      ip: '127.0.0.1'
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('Dashboard Controller', () => {
    describe('getRCMDashboardData', () => {
      it('should return dashboard data successfully', async () => {
        const mockDashboardData = {
          success: true,
          data: {
            kpis: {
              totalRevenue: 150000,
              totalClaims: 500,
              pendingClaims: 50
            },
            charts: {
              revenueByMonth: [{ month: 'Jan', revenue: 12000 }]
            }
          }
        };

        rcmService.getRCMDashboardData.mockResolvedValue(mockDashboardData);

        await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

        expect(rcmService.getRCMDashboardData).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(mockDashboardData);
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should handle service errors', async () => {
        const serviceError = new Error('Database connection failed');
        rcmService.getRCMDashboardData.mockRejectedValue(serviceError);

        await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(serviceError);
        expect(mockRes.json).not.toHaveBeenCalled();
      });

      it('should handle date range filters', async () => {
        mockReq.query = {
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        };

        const mockData = { success: true, data: {} };
        rcmService.getRCMDashboardData.mockResolvedValue(mockData);

        await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

        expect(rcmService.getRCMDashboardData).toHaveBeenCalledWith({
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        });
      });

      it('should handle provider filtering', async () => {
        mockReq.query = { providerId: '1' };
        const mockData = { success: true, data: {} };
        rcmService.getRCMDashboardData.mockResolvedValue(mockData);

        await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

        expect(rcmService.getRCMDashboardData).toHaveBeenCalledWith({
          providerId: '1'
        });
      });

      it('should handle empty query parameters', async () => {
        mockReq.query = {};
        const mockData = { success: true, data: {} };
        rcmService.getRCMDashboardData.mockResolvedValue(mockData);

        await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

        expect(rcmService.getRCMDashboardData).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Claims Controller', () => {
    describe('getClaimsData', () => {
      it('should return paginated claims data', async () => {
        mockReq.query = {
          page: '1',
          limit: '20',
          status: 'pending'
        };

        const mockClaimsData = {
          success: true,
          data: [
            { id: 1, claimNumber: 'CLM001', status: 'pending' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        };

        rcmService.getClaimsData.mockResolvedValue(mockClaimsData);

        await rcmController.getClaimsData(mockReq, mockRes, mockNext);

        expect(rcmService.getClaimsData).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          status: 'pending'
        });
        expect(mockRes.json).toHaveBeenCalledWith(mockClaimsData);
      });

      it('should handle validation errors', async () => {
        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { param: 'page', msg: 'Page must be a positive integer' }
          ]
        });

        await rcmController.getClaimsData(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Validation failed',
          details: [
            { param: 'page', msg: 'Page must be a positive integer' }
          ]
        });
      });

      it('should handle complex filtering', async () => {
        mockReq.query = {
          status: 'pending',
          patientId: '1',
          providerId: '2',
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          search: 'John Doe'
        };

        const mockData = { success: true, data: [] };
        rcmService.getClaimsData.mockResolvedValue(mockData);

        await rcmController.getClaimsData(mockReq, mockRes, mockNext);

        expect(rcmService.getClaimsData).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          status: 'pending',
          patientId: 1,
          providerId: 2,
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          search: 'John Doe'
        });
      });

      it('should handle service timeout errors', async () => {
        const timeoutError = new Error('Query timeout');
        timeoutError.code = 'ETIMEDOUT';
        rcmService.getClaimsData.mockRejectedValue(timeoutError);

        await rcmController.getClaimsData(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith(timeoutError);
      });
    });

    describe('createClaim', () => {
      it('should create claim successfully', async () => {
        mockReq.body = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        const mockResult = {
          success: true,
          data: { id: 1, claimNumber: 'CLM001' }
        };

        rcmService.createClaim.mockResolvedValue(mockResult);

        await rcmController.createClaim(mockReq, mockRes, mockNext);

        expect(rcmService.createClaim).toHaveBeenCalledWith({
          ...mockReq.body,
          createdBy: mockReq.user.id
        });
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });

      it('should handle validation errors', async () => {
        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { param: 'patientId', msg: 'Patient ID is required' }
          ]
        });

        await rcmController.createClaim(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(rcmService.createClaim).not.toHaveBeenCalled();
      });

      it('should handle duplicate claim errors', async () => {
        mockReq.body = {
          patientId: 1,
          claimNumber: 'CLM001'
        };

        const duplicateError = {
          success: false,
          error: 'Claim number already exists',
          code: 'DUPLICATE_ENTRY'
        };

        rcmService.createClaim.mockResolvedValue(duplicateError);

        await rcmController.createClaim(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(409);
        expect(mockRes.json).toHaveBeenCalledWith(duplicateError);
      });

      it('should handle business rule violations', async () => {
        mockReq.body = {
          patientId: 1,
          serviceDate: '2025-01-15' // Future date
        };

        const businessError = {
          success: false,
          error: 'Service date cannot be in the future',
          code: 'BUSINESS_RULE_VIOLATION'
        };

        rcmService.createClaim.mockResolvedValue(businessError);

        await rcmController.createClaim(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(businessError);
      });

      it('should add audit information', async () => {
        mockReq.body = { patientId: 1 };
        mockReq.ip = '192.168.1.100';
        mockReq.headers['user-agent'] = 'Test Browser';

        const mockResult = { success: true, data: { id: 1 } };
        rcmService.createClaim.mockResolvedValue(mockResult);

        await rcmController.createClaim(mockReq, mockRes, mockNext);

        expect(rcmService.createClaim).toHaveBeenCalledWith({
          patientId: 1,
          createdBy: mockReq.user.id,
          auditInfo: {
            ip: '192.168.1.100',
            userAgent: 'Test Browser',
            timestamp: expect.any(Date)
          }
        });
      });
    });

    describe('updateClaimStatus', () => {
      it('should update claim status successfully', async () => {
        mockReq.params = { id: '1' };
        mockReq.body = {
          status: 'approved',
          notes: 'Claim approved by insurance'
        };

        const mockResult = {
          success: true,
          message: 'Claim status updated successfully'
        };

        rcmService.updateClaimStatus.mockResolvedValue(mockResult);

        await rcmController.updateClaimStatus(mockReq, mockRes, mockNext);

        expect(rcmService.updateClaimStatus).toHaveBeenCalledWith(
          '1',
          'approved',
          'Claim approved by insurance',
          mockReq.user.id
        );
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });

      it('should handle non-existent claim', async () => {
        mockReq.params = { id: '999' };
        mockReq.body = { status: 'approved' };

        const notFoundError = {
          success: false,
          error: 'Claim not found',
          code: 'NOT_FOUND'
        };

        rcmService.updateClaimStatus.mockResolvedValue(notFoundError);

        await rcmController.updateClaimStatus(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith(notFoundError);
      });

      it('should validate status transitions', async () => {
        mockReq.params = { id: '1' };
        mockReq.body = { status: 'invalid_status' };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { param: 'status', msg: 'Invalid status value' }
          ]
        });

        await rcmController.updateClaimStatus(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(rcmService.updateClaimStatus).not.toHaveBeenCalled();
      });
    });

    describe('deleteClaim', () => {
      it('should delete claim successfully', async () => {
        mockReq.params = { id: '1' };

        const mockResult = {
          success: true,
          message: 'Claim deleted successfully'
        };

        rcmService.deleteClaim.mockResolvedValue(mockResult);

        await rcmController.deleteClaim(mockReq, mockRes, mockNext);

        expect(rcmService.deleteClaim).toHaveBeenCalledWith('1', mockReq.user.id);
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });

      it('should handle authorization errors', async () => {
        mockReq.params = { id: '1' };
        mockReq.user = { id: 2, role: 'user' }; // Different user

        const authError = {
          success: false,
          error: 'Insufficient permissions',
          code: 'AUTHORIZATION_ERROR'
        };

        rcmService.deleteClaim.mockResolvedValue(authError);

        await rcmController.deleteClaim(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(authError);
      });
    });
  });

  describe('Payment Controller', () => {
    describe('processPayment', () => {
      it('should process payment successfully', async () => {
        mockReq.body = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance',
          transactionId: 'TXN123456'
        };

        const mockResult = {
          success: true,
          data: {
            paymentId: 1,
            claimId: 1,
            amount: 150.00,
            status: 'completed'
          }
        };

        rcmService.processPayment.mockResolvedValue(mockResult);

        await rcmController.processPayment(mockReq, mockRes, mockNext);

        expect(rcmService.processPayment).toHaveBeenCalledWith({
          ...mockReq.body,
          processedBy: mockReq.user.id
        });
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });

      it('should handle payment processing failures', async () => {
        mockReq.body = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'credit_card'
        };

        const paymentError = {
          success: false,
          error: 'Payment gateway error',
          code: 'PAYMENT_FAILED'
        };

        rcmService.processPayment.mockResolvedValue(paymentError);

        await rcmController.processPayment(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith(paymentError);
      });

      it('should validate payment amounts', async () => {
        mockReq.body = {
          claimId: 1,
          amount: -50.00 // Negative amount
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { param: 'amount', msg: 'Amount must be positive' }
          ]
        });

        await rcmController.processPayment(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(rcmService.processPayment).not.toHaveBeenCalled();
      });

      it('should handle overpayment scenarios', async () => {
        mockReq.body = {
          claimId: 1,
          amount: 200.00 // Overpayment
        };

        const overpaymentError = {
          success: false,
          error: 'Payment amount exceeds claim balance',
          code: 'OVERPAYMENT'
        };

        rcmService.processPayment.mockResolvedValue(overpaymentError);

        await rcmController.processPayment(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(422);
        expect(mockRes.json).toHaveBeenCalledWith(overpaymentError);
      });
    });
  });

  describe('A/R Aging Controller', () => {
    describe('getARAgingData', () => {
      it('should return A/R aging data', async () => {
        const mockARData = {
          success: true,
          data: [
            { ageRange: '0-30', count: 100, amount: 15000 },
            { ageRange: '31-60', count: 50, amount: 7500 }
          ]
        };

        rcmService.getARAgingData.mockResolvedValue(mockARData);

        await rcmController.getARAgingData(mockReq, mockRes, mockNext);

        expect(rcmService.getARAgingData).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(mockARData);
      });

      it('should handle provider filtering', async () => {
        mockReq.query = { providerId: '1' };
        const mockData = { success: true, data: [] };
        rcmService.getARAgingData.mockResolvedValue(mockData);

        await rcmController.getARAgingData(mockReq, mockRes, mockNext);

        expect(rcmService.getARAgingData).toHaveBeenCalledWith({
          providerId: '1'
        });
      });

      it('should handle grouping options', async () => {
        mockReq.query = { groupBy: 'provider' };
        const mockData = { success: true, data: [] };
        rcmService.getARAgingData.mockResolvedValue(mockData);

        await rcmController.getARAgingData(mockReq, mockRes, mockNext);

        expect(rcmService.getARAgingData).toHaveBeenCalledWith({
          groupBy: 'provider'
        });
      });
    });
  });

  describe('Collections Controller', () => {
    describe('getCollectionsData', () => {
      it('should return collections data', async () => {
        const mockCollectionsData = {
          success: true,
          data: [
            {
              id: 1,
              patientName: 'John Doe',
              balance: 500.00,
              daysOverdue: 60,
              status: 'active'
            }
          ]
        };

        rcmService.getCollectionsData.mockResolvedValue(mockCollectionsData);

        await rcmController.getCollectionsData(mockReq, mockRes, mockNext);

        expect(rcmService.getCollectionsData).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(mockCollectionsData);
      });

      it('should handle priority sorting', async () => {
        mockReq.query = { sortBy: 'priority' };
        const mockData = { success: true, data: [] };
        rcmService.getCollectionsData.mockResolvedValue(mockData);

        await rcmController.getCollectionsData(mockReq, mockRes, mockNext);

        expect(rcmService.getCollectionsData).toHaveBeenCalledWith({
          sortBy: 'priority'
        });
      });
    });

    describe('createCollectionActivity', () => {
      it('should create collection activity', async () => {
        mockReq.body = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient',
          nextFollowUp: '2023-02-01'
        };

        const mockResult = {
          success: true,
          data: { id: 1, ...mockReq.body }
        };

        rcmService.createCollectionActivity.mockResolvedValue(mockResult);

        await rcmController.createCollectionActivity(mockReq, mockRes, mockNext);

        expect(rcmService.createCollectionActivity).toHaveBeenCalledWith({
          ...mockReq.body,
          createdBy: mockReq.user.id
        });
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(mockResult);
      });

      it('should validate activity types', async () => {
        mockReq.body = {
          accountId: 1,
          activityType: 'invalid_type'
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { param: 'activityType', msg: 'Invalid activity type' }
          ]
        });

        await rcmController.createCollectionActivity(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(rcmService.createCollectionActivity).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      rcmService.getRCMDashboardData.mockRejectedValue(unexpectedError);

      await rcmController.getRCMDashboardData(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(unexpectedError);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      dbError.code = 'ECONNREFUSED';
      rcmService.getClaimsData.mockRejectedValue(dbError);

      await rcmController.getClaimsData(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      rcmService.processPayment.mockRejectedValue(timeoutError);

      await rcmController.processPayment(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(timeoutError);
    });
  });

  describe('Security Tests', () => {
    it('should sanitize input data', async () => {
      mockReq.body = {
        patientId: 1,
        notes: '<script>alert("xss")</script>'
      };

      const mockResult = { success: true, data: { id: 1 } };
      rcmService.createClaim.mockResolvedValue(mockResult);

      await rcmController.createClaim(mockReq, mockRes, mockNext);

      expect(rcmService.createClaim).toHaveBeenCalledWith({
        patientId: 1,
        notes: expect.not.stringContaining('<script>'),
        createdBy: mockReq.user.id
      });
    });

    it('should validate user permissions', async () => {
      mockReq.user = { id: 1, role: 'viewer' }; // Limited permissions
      mockReq.body = { patientId: 1 };

      const authError = {
        success: false,
        error: 'Insufficient permissions',
        code: 'AUTHORIZATION_ERROR'
      };

      rcmService.createClaim.mockResolvedValue(authError);

      await rcmController.createClaim(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle SQL injection attempts', async () => {
      mockReq.query = {
        search: "'; DROP TABLE claims; --"
      };

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [
          { param: 'search', msg: 'Invalid search query' }
        ]
      });

      await rcmController.getClaimsData(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(rcmService.getClaimsData).not.toHaveBeenCalled();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
      const mockData = { success: true, data: [] };
      rcmService.getRCMDashboardData.mockResolvedValue(mockData);

      const requests = Array.from({ length: 10 }, () =>
        rcmController.getRCMDashboardData(mockReq, mockRes, mockNext)
      );

      await Promise.all(requests);

      expect(rcmService.getRCMDashboardData).toHaveBeenCalledTimes(10);
      expect(mockRes.json).toHaveBeenCalledTimes(10);
    });

    it('should handle large datasets', async () => {
      mockReq.query = { limit: '1000' };
      const largeDataset = {
        success: true,
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i + 1 }))
      };

      rcmService.getClaimsData.mockResolvedValue(largeDataset);

      await rcmController.getClaimsData(mockReq, mockRes, mockNext);

      expect(rcmService.getClaimsData).toHaveBeenCalledWith({
        page: 1,
        limit: 1000
      });
      expect(mockRes.json).toHaveBeenCalledWith(largeDataset);
    });
  });

  describe('Audit Logging', () => {
    it('should log sensitive operations', async () => {
      mockReq.body = { patientId: 1, amount: 150.00 };
      const mockResult = { success: true, data: { id: 1 } };
      rcmService.createClaim.mockResolvedValue(mockResult);

      await rcmController.createClaim(mockReq, mockRes, mockNext);

      expect(rcmService.createClaim).toHaveBeenCalledWith(
        expect.objectContaining({
          auditInfo: expect.objectContaining({
            ip: mockReq.ip,
            timestamp: expect.any(Date)
          })
        })
      );
    });

    it('should log failed operations', async () => {
      const serviceError = new Error('Operation failed');
      rcmService.createClaim.mockRejectedValue(serviceError);

      await rcmController.createClaim(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(serviceError);
    });
  });
});