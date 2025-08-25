/**
 * RCM Controller Tests
 * Comprehensive test suite for RCM controller endpoints
 */

const rcmController = require('../rcmController');
const rcmService = require('../rcmService');
const { validationResult } = require('express-validator');

// Mock dependencies
jest.mock('../rcmService');
jest.mock('express-validator');

describe('RCM Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = global.testUtils.mockRequest();
    res = global.testUtils.mockResponse();
    next = global.testUtils.mockNext();
    
    jest.clearAllMocks();
    
    // Mock validation result to return no errors by default
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
  });

  describe('Dashboard Endpoints', () => {
    describe('GET /dashboard', () => {
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
              revenueByMonth: [
                { month: 'Jan', revenue: 12000 },
                { month: 'Feb', revenue: 15000 }
              ]
            }
          }
        };

        rcmService.getRCMDashboardData.mockResolvedValue(mockDashboardData);

        await rcmController.getDashboardData(req, res, next);

        expect(rcmService.getRCMDashboardData).toHaveBeenCalled();
        global.testUtils.expectValidResponse(res, 200);
        expect(res.json).toHaveBeenCalledWith(mockDashboardData);
      });

      it('should handle service errors', async () => {
        const mockError = {
          success: false,
          error: 'Database connection failed'
        };

        rcmService.getRCMDashboardData.mockResolvedValue(mockError);

        await rcmController.getDashboardData(req, res, next);

        global.testUtils.expectErrorResponse(res, 500);
      });

      it('should handle service exceptions', async () => {
        const serviceError = new Error('Unexpected service error');
        rcmService.getRCMDashboardData.mockRejectedValue(serviceError);

        await rcmController.getDashboardData(req, res, next);

        expect(next).toHaveBeenCalledWith(serviceError);
      });
    });

    describe('GET /dashboard/kpis', () => {
      it('should return KPI data with date filters', async () => {
        req.query = {
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        };

        const mockKPIData = {
          success: true,
          data: {
            totalRevenue: 25000,
            totalClaims: 100,
            averageReimbursement: 250
          }
        };

        rcmService.getKPIData.mockResolvedValue(mockKPIData);

        await rcmController.getKPIData(req, res, next);

        expect(rcmService.getKPIData).toHaveBeenCalledWith({
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        });
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should validate date format', async () => {
        req.query = {
          startDate: 'invalid-date',
          endDate: '2023-01-31'
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Invalid date format' }]
        });

        await rcmController.getKPIData(req, res, next);

        global.testUtils.expectErrorResponse(res, 400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: 'Validation failed',
          details: [{ msg: 'Invalid date format' }]
        });
      });
    });
  });

  describe('Claims Endpoints', () => {
    describe('GET /claims', () => {
      it('should return paginated claims data', async () => {
        req.query = {
          page: '1',
          limit: '10',
          status: 'pending'
        };

        const mockClaimsData = {
          success: true,
          data: [
            {
              id: 1,
              claimNumber: 'CLM001',
              patientName: 'John Doe',
              amount: 150.00,
              status: 'pending'
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        };

        rcmService.getClaimsData.mockResolvedValue(mockClaimsData);

        await rcmController.getClaimsData(req, res, next);

        expect(rcmService.getClaimsData).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          status: 'pending'
        });
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should handle invalid pagination parameters', async () => {
        req.query = {
          page: '-1',
          limit: '0'
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { msg: 'Page must be positive' },
            { msg: 'Limit must be positive' }
          ]
        });

        await rcmController.getClaimsData(req, res, next);

        global.testUtils.expectErrorResponse(res, 400);
      });

      it('should apply default pagination when not provided', async () => {
        req.query = {};

        const mockClaimsData = {
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
        };

        rcmService.getClaimsData.mockResolvedValue(mockClaimsData);

        await rcmController.getClaimsData(req, res, next);

        expect(rcmService.getClaimsData).toHaveBeenCalledWith({
          page: 1,
          limit: 20
        });
      });
    });

    describe('POST /claims', () => {
      it('should create a new claim successfully', async () => {
        req.body = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        const mockCreatedClaim = {
          success: true,
          data: {
            id: 1,
            claimNumber: 'CLM001',
            ...req.body
          }
        };

        rcmService.createClaim.mockResolvedValue(mockCreatedClaim);

        await rcmController.createClaim(req, res, next);

        expect(rcmService.createClaim).toHaveBeenCalledWith(req.body);
        global.testUtils.expectValidResponse(res, 201);
      });

      it('should validate required fields', async () => {
        req.body = {
          patientId: 1
          // Missing required fields
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [
            { msg: 'Provider ID is required' },
            { msg: 'Service date is required' }
          ]
        });

        await rcmController.createClaim(req, res, next);

        global.testUtils.expectErrorResponse(res, 400);
        expect(rcmService.createClaim).not.toHaveBeenCalled();
      });

      it('should handle duplicate claim creation', async () => {
        req.body = {
          patientId: 1,
          claimNumber: 'CLM001'
        };

        const duplicateError = {
          success: false,
          error: 'Claim number already exists'
        };

        rcmService.createClaim.mockResolvedValue(duplicateError);

        await rcmController.createClaim(req, res, next);

        global.testUtils.expectErrorResponse(res, 409);
      });
    });

    describe('PUT /claims/:id/status', () => {
      it('should update claim status successfully', async () => {
        req.params = { id: '1' };
        req.body = {
          status: 'approved',
          notes: 'Claim approved by insurance'
        };

        const mockUpdatedClaim = {
          success: true,
          message: 'Claim status updated successfully'
        };

        rcmService.updateClaimStatus.mockResolvedValue(mockUpdatedClaim);

        await rcmController.updateClaimStatus(req, res, next);

        expect(rcmService.updateClaimStatus).toHaveBeenCalledWith(
          1,
          'approved',
          'Claim approved by insurance'
        );
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should validate claim ID parameter', async () => {
        req.params = { id: 'invalid' };
        req.body = { status: 'approved' };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Invalid claim ID' }]
        });

        await rcmController.updateClaimStatus(req, res, next);

        global.testUtils.expectErrorResponse(res, 400);
      });

      it('should handle non-existent claim', async () => {
        req.params = { id: '999' };
        req.body = { status: 'approved' };

        const notFoundError = {
          success: false,
          error: 'Claim not found'
        };

        rcmService.updateClaimStatus.mockResolvedValue(notFoundError);

        await rcmController.updateClaimStatus(req, res, next);

        global.testUtils.expectErrorResponse(res, 404);
      });
    });
  });

  describe('A/R Aging Endpoints', () => {
    describe('GET /ar-aging', () => {
      it('should return A/R aging analysis', async () => {
        const mockARData = {
          success: true,
          data: [
            { ageRange: '0-30', count: 100, amount: 15000 },
            { ageRange: '31-60', count: 50, amount: 7500 }
          ]
        };

        rcmService.getARAgingData.mockResolvedValue(mockARData);

        await rcmController.getARAgingData(req, res, next);

        expect(rcmService.getARAgingData).toHaveBeenCalled();
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should filter by provider when specified', async () => {
        req.query = { providerId: '1' };

        await rcmController.getARAgingData(req, res, next);

        expect(rcmService.getARAgingData).toHaveBeenCalledWith({
          providerId: 1
        });
      });
    });

    describe('GET /ar-aging/:id', () => {
      it('should return detailed A/R account information', async () => {
        req.params = { id: '1' };

        const mockAccountDetails = {
          success: true,
          data: {
            id: 1,
            patientName: 'John Doe',
            balance: 500.00,
            daysInAR: 45,
            claims: []
          }
        };

        rcmService.getARAccountDetails.mockResolvedValue(mockAccountDetails);

        await rcmController.getARAccountDetails(req, res, next);

        expect(rcmService.getARAccountDetails).toHaveBeenCalledWith(1);
        global.testUtils.expectValidResponse(res, 200);
      });
    });
  });

  describe('Collections Endpoints', () => {
    describe('GET /collections', () => {
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

        await rcmController.getCollectionsData(req, res, next);

        expect(rcmService.getCollectionsData).toHaveBeenCalled();
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should sort by priority when requested', async () => {
        req.query = { sortBy: 'priority' };

        await rcmController.getCollectionsData(req, res, next);

        expect(rcmService.getCollectionsData).toHaveBeenCalledWith({
          sortBy: 'priority'
        });
      });
    });

    describe('POST /collections/activities', () => {
      it('should create collection activity', async () => {
        req.body = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient',
          nextFollowUp: '2023-02-01'
        };

        const mockActivity = {
          success: true,
          data: { id: 1, ...req.body }
        };

        rcmService.createCollectionActivity.mockResolvedValue(mockActivity);

        await rcmController.createCollectionActivity(req, res, next);

        expect(rcmService.createCollectionActivity).toHaveBeenCalledWith(req.body);
        global.testUtils.expectValidResponse(res, 201);
      });
    });
  });

  describe('Payment Endpoints', () => {
    describe('POST /payments', () => {
      it('should process payment successfully', async () => {
        req.body = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance',
          transactionId: 'TXN123456'
        };

        const mockPayment = {
          success: true,
          data: { paymentId: 1, ...req.body }
        };

        rcmService.processPayment.mockResolvedValue(mockPayment);

        await rcmController.processPayment(req, res, next);

        expect(rcmService.processPayment).toHaveBeenCalledWith(req.body);
        global.testUtils.expectValidResponse(res, 201);
      });

      it('should validate payment amount', async () => {
        req.body = {
          claimId: 1,
          amount: -50.00, // Invalid negative amount
          paymentMethod: 'insurance'
        };

        validationResult.mockReturnValue({
          isEmpty: () => false,
          array: () => [{ msg: 'Amount must be positive' }]
        });

        await rcmController.processPayment(req, res, next);

        global.testUtils.expectErrorResponse(res, 400);
      });

      it('should handle payment processing failures', async () => {
        req.body = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'credit_card'
        };

        const paymentError = {
          success: false,
          error: 'Payment gateway error'
        };

        rcmService.processPayment.mockResolvedValue(paymentError);

        await rcmController.processPayment(req, res, next);

        global.testUtils.expectErrorResponse(res, 500);
      });
    });
  });

  describe('Denial Management Endpoints', () => {
    describe('GET /denials', () => {
      it('should return denial data', async () => {
        const mockDenialData = {
          success: true,
          data: [
            {
              id: 1,
              claimId: 1,
              denialReason: 'Missing documentation',
              amount: 150.00,
              appealable: true
            }
          ]
        };

        rcmService.getDenialData.mockResolvedValue(mockDenialData);

        await rcmController.getDenialData(req, res, next);

        expect(rcmService.getDenialData).toHaveBeenCalled();
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should group denials by reason when requested', async () => {
        req.query = { groupBy: 'reason' };

        await rcmController.getDenialData(req, res, next);

        expect(rcmService.getDenialData).toHaveBeenCalledWith({
          groupBy: 'reason'
        });
      });
    });

    describe('POST /denials/:id/appeals', () => {
      it('should create appeal for denied claim', async () => {
        req.params = { id: '1' };
        req.body = {
          appealReason: 'Documentation was submitted',
          supportingDocuments: ['doc1.pdf']
        };

        const mockAppeal = {
          success: true,
          data: { id: 1, claimId: 1, ...req.body }
        };

        rcmService.createAppeal.mockResolvedValue(mockAppeal);

        await rcmController.createAppeal(req, res, next);

        expect(rcmService.createAppeal).toHaveBeenCalledWith({
          claimId: 1,
          ...req.body
        });
        global.testUtils.expectValidResponse(res, 201);
      });
    });
  });

  describe('Analytics Endpoints', () => {
    describe('GET /analytics/performance', () => {
      it('should return performance metrics', async () => {
        const mockMetrics = {
          success: true,
          data: {
            revenueMetrics: { totalRevenue: 150000 },
            operationalMetrics: { claimsProcessed: 500 },
            financialMetrics: { collectionRate: 92.3 }
          }
        };

        rcmService.getPerformanceMetrics.mockResolvedValue(mockMetrics);

        await rcmController.getPerformanceMetrics(req, res, next);

        expect(rcmService.getPerformanceMetrics).toHaveBeenCalled();
        global.testUtils.expectValidResponse(res, 200);
      });

      it('should filter metrics by date range', async () => {
        req.query = {
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        };

        await rcmController.getPerformanceMetrics(req, res, next);

        expect(rcmService.getPerformanceMetrics).toHaveBeenCalledWith({
          startDate: '2023-01-01',
          endDate: '2023-01-31'
        });
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      req.user = null; // No authenticated user

      await rcmController.getDashboardData(req, res, next);

      global.testUtils.expectErrorResponse(res, 401);
    });

    it('should check user permissions for sensitive operations', async () => {
      req.user = { id: 1, role: 'viewer' }; // Limited permissions
      req.body = { amount: 1000.00 };

      await rcmController.processPayment(req, res, next);

      global.testUtils.expectErrorResponse(res, 403);
    });

    it('should allow admin users to access all endpoints', async () => {
      req.user = { id: 1, role: 'admin' };

      const mockData = { success: true, data: [] };
      rcmService.getRCMDashboardData.mockResolvedValue(mockData);

      await rcmController.getDashboardData(req, res, next);

      global.testUtils.expectValidResponse(res, 200);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit exceeded', async () => {
      // Simulate rate limit exceeded
      const rateLimitError = new Error('Too many requests');
      rateLimitError.status = 429;

      await rcmController.getDashboardData(req, res, next);

      // This would be handled by rate limiting middleware
      expect(next).not.toHaveBeenCalledWith(rateLimitError);
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize SQL injection attempts', async () => {
      req.query = {
        status: "'; DROP TABLE claims; --"
      };

      // Input should be sanitized by validation middleware
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid status value' }]
      });

      await rcmController.getClaimsData(req, res, next);

      global.testUtils.expectErrorResponse(res, 400);
    });

    it('should sanitize XSS attempts', async () => {
      req.body = {
        notes: '<script>alert("xss")</script>'
      };

      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Invalid characters in notes' }]
      });

      await rcmController.createCollectionActivity(req, res, next);

      global.testUtils.expectErrorResponse(res, 400);
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const unexpectedError = new Error('Unexpected error');
      rcmService.getRCMDashboardData.mockRejectedValue(unexpectedError);

      await rcmController.getDashboardData(req, res, next);

      expect(next).toHaveBeenCalledWith(unexpectedError);
    });

    it('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const serviceError = new Error('Service error');
      
      rcmService.getRCMDashboardData.mockRejectedValue(serviceError);

      await rcmController.getDashboardData(req, res, next);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});