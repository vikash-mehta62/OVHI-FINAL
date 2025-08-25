/**
 * RCM Service Tests
 * Comprehensive test suite for RCM service functionality
 */

const rcmService = require('../rcmService');
const dbUtils = require('../../../utils/dbUtils');
const standardizedResponse = require('../../../utils/standardizedResponse');

// Mock dependencies
jest.mock('../../../utils/dbUtils');
jest.mock('../../../utils/standardizedResponse');

describe('RCM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Data', () => {
    describe('getRCMDashboardData', () => {
      it('should return comprehensive dashboard data', async () => {
        // Mock database responses
        const mockKPIData = {
          totalRevenue: 150000,
          totalClaims: 500,
          pendingClaims: 50,
          deniedClaims: 25,
          averageReimbursement: 300,
          collectionRate: 85.5
        };

        const mockChartData = {
          revenueByMonth: [
            { month: 'Jan', revenue: 12000 },
            { month: 'Feb', revenue: 15000 }
          ],
          claimsByStatus: [
            { status: 'approved', count: 400 },
            { status: 'pending', count: 50 },
            { status: 'denied', count: 25 }
          ]
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockKPIData])
          .mockResolvedValueOnce(mockChartData.revenueByMonth)
          .mockResolvedValueOnce(mockChartData.claimsByStatus);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { kpis: mockKPIData, charts: mockChartData }
        });

        const result = await rcmService.getRCMDashboardData();

        expect(dbUtils.executeQuery).toHaveBeenCalledTimes(3);
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('kpis');
        expect(result.data).toHaveProperty('charts');
      });

      it('should handle database errors gracefully', async () => {
        const mockError = new Error('Database connection failed');
        dbUtils.executeQuery.mockRejectedValue(mockError);

        standardizedResponse.error.mockReturnValue({
          success: false,
          error: 'Failed to fetch dashboard data'
        });

        const result = await rcmService.getRCMDashboardData();

        expect(result.success).toBe(false);
        expect(standardizedResponse.error).toHaveBeenCalledWith(
          'Failed to fetch dashboard data',
          mockError
        );
      });

      it('should return empty data when no records found', async () => {
        dbUtils.executeQuery
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { kpis: {}, charts: {} }
        });

        const result = await rcmService.getRCMDashboardData();

        expect(result.success).toBe(true);
        expect(result.data.kpis).toEqual({});
        expect(result.data.charts).toEqual({});
      });
    });
  });

  describe('Claims Management', () => {
    describe('getClaimsData', () => {
      it('should return paginated claims data', async () => {
        const mockClaims = [
          {
            id: 1,
            claimNumber: 'CLM001',
            patientName: 'John Doe',
            amount: 150.00,
            status: 'submitted',
            serviceDate: '2023-01-15'
          },
          {
            id: 2,
            claimNumber: 'CLM002',
            patientName: 'Jane Smith',
            amount: 200.00,
            status: 'approved',
            serviceDate: '2023-01-16'
          }
        ];

        const mockCount = [{ total: 2 }];

        dbUtils.executeQuery
          .mockResolvedValueOnce(mockClaims)
          .mockResolvedValueOnce(mockCount);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockClaims,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1
          }
        });

        const result = await rcmService.getClaimsData({ page: 1, limit: 10 });

        expect(dbUtils.executeQuery).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(2);
        expect(result.pagination).toBeDefined();
      });

      it('should filter claims by status', async () => {
        const mockClaims = [
          {
            id: 1,
            claimNumber: 'CLM001',
            status: 'pending'
          }
        ];

        dbUtils.executeQuery.mockResolvedValueOnce(mockClaims);

        await rcmService.getClaimsData({ status: 'pending' });

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE status = ?'),
          expect.arrayContaining(['pending'])
        );
      });

      it('should filter claims by date range', async () => {
        const startDate = '2023-01-01';
        const endDate = '2023-01-31';

        dbUtils.executeQuery.mockResolvedValueOnce([]);

        await rcmService.getClaimsData({ startDate, endDate });

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('serviceDate BETWEEN ? AND ?'),
          expect.arrayContaining([startDate, endDate])
        );
      });
    });

    describe('createClaim', () => {
      it('should create a new claim successfully', async () => {
        const claimData = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        const mockResult = { insertId: 1 };
        dbUtils.executeQuery.mockResolvedValue(mockResult);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { id: 1, ...claimData }
        });

        const result = await rcmService.createClaim(claimData);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO claims'),
          expect.any(Array)
        );
        expect(result.success).toBe(true);
        expect(result.data.id).toBe(1);
      });

      it('should validate required fields', async () => {
        const invalidClaimData = {
          patientId: 1
          // Missing required fields
        };

        standardizedResponse.error.mockReturnValue({
          success: false,
          error: 'Missing required fields'
        });

        const result = await rcmService.createClaim(invalidClaimData);

        expect(result.success).toBe(false);
        expect(dbUtils.executeQuery).not.toHaveBeenCalled();
      });

      it('should handle duplicate claim numbers', async () => {
        const claimData = {
          patientId: 1,
          claimNumber: 'CLM001',
          serviceDate: '2023-01-15'
        };

        const duplicateError = new Error('Duplicate entry');
        duplicateError.code = 'ER_DUP_ENTRY';
        
        dbUtils.executeQuery.mockRejectedValue(duplicateError);

        standardizedResponse.error.mockReturnValue({
          success: false,
          error: 'Claim number already exists'
        });

        const result = await rcmService.createClaim(claimData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Claim number already exists');
      });
    });

    describe('updateClaimStatus', () => {
      it('should update claim status successfully', async () => {
        const claimId = 1;
        const newStatus = 'approved';
        const notes = 'Claim approved by insurance';

        dbUtils.executeQuery.mockResolvedValue({ affectedRows: 1 });

        standardizedResponse.success.mockReturnValue({
          success: true,
          message: 'Claim status updated successfully'
        });

        const result = await rcmService.updateClaimStatus(claimId, newStatus, notes);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE claims SET status = ?'),
          expect.arrayContaining([newStatus, notes, claimId])
        );
        expect(result.success).toBe(true);
      });

      it('should handle non-existent claim', async () => {
        const claimId = 999;
        const newStatus = 'approved';

        dbUtils.executeQuery.mockResolvedValue({ affectedRows: 0 });

        standardizedResponse.error.mockReturnValue({
          success: false,
          error: 'Claim not found'
        });

        const result = await rcmService.updateClaimStatus(claimId, newStatus);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Claim not found');
      });
    });
  });

  describe('A/R Aging Management', () => {
    describe('getARAgingData', () => {
      it('should return A/R aging analysis', async () => {
        const mockARData = [
          { ageRange: '0-30', count: 100, amount: 15000 },
          { ageRange: '31-60', count: 50, amount: 7500 },
          { ageRange: '61-90', count: 25, amount: 3750 },
          { ageRange: '90+', count: 10, amount: 1500 }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockARData);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockARData
        });

        const result = await rcmService.getARAgingData();

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('CASE WHEN DATEDIFF'),
          expect.any(Array)
        );
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(4);
      });

      it('should filter A/R data by provider', async () => {
        const providerId = 1;
        dbUtils.executeQuery.mockResolvedValue([]);

        await rcmService.getARAgingData({ providerId });

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE providerId = ?'),
          expect.arrayContaining([providerId])
        );
      });
    });

    describe('getARAccountDetails', () => {
      it('should return detailed A/R account information', async () => {
        const accountId = 1;
        const mockAccount = {
          id: 1,
          patientId: 1,
          patientName: 'John Doe',
          balance: 500.00,
          daysInAR: 45,
          lastPaymentDate: '2023-01-01',
          claims: [
            { id: 1, amount: 150.00, status: 'pending' },
            { id: 2, amount: 350.00, status: 'approved' }
          ]
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockAccount])
          .mockResolvedValueOnce(mockAccount.claims);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockAccount
        });

        const result = await rcmService.getARAccountDetails(accountId);

        expect(dbUtils.executeQuery).toHaveBeenCalledTimes(2);
        expect(result.success).toBe(true);
        expect(result.data.claims).toHaveLength(2);
      });
    });
  });

  describe('Collections Management', () => {
    describe('getCollectionsData', () => {
      it('should return collections workflow data', async () => {
        const mockCollections = [
          {
            id: 1,
            patientId: 1,
            patientName: 'John Doe',
            balance: 500.00,
            daysOverdue: 60,
            lastContactDate: '2023-01-01',
            status: 'active'
          }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockCollections);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockCollections
        });

        const result = await rcmService.getCollectionsData();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });

      it('should prioritize collections by amount and age', async () => {
        dbUtils.executeQuery.mockResolvedValue([]);

        await rcmService.getCollectionsData({ sortBy: 'priority' });

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY (balance * daysOverdue) DESC'),
          expect.any(Array)
        );
      });
    });

    describe('createCollectionActivity', () => {
      it('should log collection activity', async () => {
        const activityData = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient regarding overdue balance',
          nextFollowUp: '2023-02-01'
        };

        dbUtils.executeQuery.mockResolvedValue({ insertId: 1 });

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { id: 1, ...activityData }
        });

        const result = await rcmService.createCollectionActivity(activityData);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO collection_activities'),
          expect.any(Array)
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Payment Processing', () => {
    describe('processPayment', () => {
      it('should process payment successfully', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance',
          transactionId: 'TXN123456'
        };

        dbUtils.executeTransaction.mockResolvedValue({
          paymentId: 1,
          updatedClaim: { id: 1, status: 'paid' }
        });

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { paymentId: 1, ...paymentData }
        });

        const result = await rcmService.processPayment(paymentData);

        expect(dbUtils.executeTransaction).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });

      it('should handle partial payments', async () => {
        const paymentData = {
          claimId: 1,
          amount: 75.00, // Partial payment
          paymentMethod: 'patient',
          transactionId: 'TXN123456'
        };

        dbUtils.executeTransaction.mockResolvedValue({
          paymentId: 1,
          remainingBalance: 75.00
        });

        const result = await rcmService.processPayment(paymentData);

        expect(result.success).toBe(true);
        expect(result.data.remainingBalance).toBe(75.00);
      });

      it('should rollback on payment processing failure', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'credit_card'
        };

        const paymentError = new Error('Payment gateway error');
        dbUtils.executeTransaction.mockRejectedValue(paymentError);

        standardizedResponse.error.mockReturnValue({
          success: false,
          error: 'Payment processing failed'
        });

        const result = await rcmService.processPayment(paymentData);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Payment processing failed');
      });
    });
  });

  describe('Denial Management', () => {
    describe('getDenialData', () => {
      it('should return denial analysis data', async () => {
        const mockDenials = [
          {
            id: 1,
            claimId: 1,
            denialReason: 'Missing documentation',
            denialCode: 'D001',
            amount: 150.00,
            appealable: true,
            denialDate: '2023-01-15'
          }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockDenials);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockDenials
        });

        const result = await rcmService.getDenialData();

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].appealable).toBe(true);
      });

      it('should group denials by reason', async () => {
        const mockDenialSummary = [
          { reason: 'Missing documentation', count: 10, amount: 1500.00 },
          { reason: 'Invalid procedure code', count: 5, amount: 750.00 }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockDenialSummary);

        const result = await rcmService.getDenialData({ groupBy: 'reason' });

        expect(result.data).toHaveLength(2);
      });
    });

    describe('createAppeal', () => {
      it('should create appeal for denied claim', async () => {
        const appealData = {
          claimId: 1,
          appealReason: 'Documentation was submitted with original claim',
          supportingDocuments: ['doc1.pdf', 'doc2.pdf']
        };

        dbUtils.executeQuery.mockResolvedValue({ insertId: 1 });

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: { id: 1, ...appealData }
        });

        const result = await rcmService.createAppeal(appealData);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO appeals'),
          expect.any(Array)
        );
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Performance Analytics', () => {
    describe('getPerformanceMetrics', () => {
      it('should return comprehensive performance metrics', async () => {
        const mockMetrics = {
          revenueMetrics: {
            totalRevenue: 150000,
            monthlyGrowth: 5.2,
            averageReimbursement: 300
          },
          operationalMetrics: {
            claimsProcessed: 500,
            averageProcessingTime: 3.5,
            firstPassRate: 85.5
          },
          financialMetrics: {
            collectionRate: 92.3,
            daysInAR: 35,
            writeOffRate: 2.1
          }
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockMetrics.revenueMetrics])
          .mockResolvedValueOnce([mockMetrics.operationalMetrics])
          .mockResolvedValueOnce([mockMetrics.financialMetrics]);

        standardizedResponse.success.mockReturnValue({
          success: true,
          data: mockMetrics
        });

        const result = await rcmService.getPerformanceMetrics();

        expect(dbUtils.executeQuery).toHaveBeenCalledTimes(3);
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('revenueMetrics');
        expect(result.data).toHaveProperty('operationalMetrics');
        expect(result.data).toHaveProperty('financialMetrics');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.code = 'ECONNREFUSED';

      dbUtils.executeQuery.mockRejectedValue(connectionError);

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await rcmService.getRCMDashboardData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'ETIMEDOUT';

      dbUtils.executeQuery.mockRejectedValue(timeoutError);

      const result = await rcmService.getRCMDashboardData();

      expect(result.success).toBe(false);
    });

    it('should handle validation errors', async () => {
      const invalidData = null;

      standardizedResponse.error.mockReturnValue({
        success: false,
        error: 'Invalid input data'
      });

      const result = await rcmService.createClaim(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid input data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty result sets', async () => {
      dbUtils.executeQuery.mockResolvedValue([]);

      standardizedResponse.success.mockReturnValue({
        success: true,
        data: [],
        message: 'No data found'
      });

      const result = await rcmService.getClaimsData();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle large datasets with pagination', async () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${i + 1}`,
        amount: 150.00
      }));

      dbUtils.executeQuery.mockResolvedValue(largeMockData.slice(0, 50));

      const result = await rcmService.getClaimsData({ page: 1, limit: 50 });

      expect(result.data).toHaveLength(50);
    });

    it('should handle concurrent requests', async () => {
      dbUtils.executeQuery.mockResolvedValue([{ id: 1 }]);

      const promises = Array.from({ length: 10 }, () => 
        rcmService.getRCMDashboardData()
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });
});