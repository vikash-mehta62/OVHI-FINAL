/**
 * RCM Integration Tests
 * End-to-end integration tests for RCM API endpoints
 */

const request = require('supertest');
const express = require('express');
const rcmRoutes = require('../rcmRoutes');
const dbUtils = require('../../../utils/dbUtils');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/rcm', rcmRoutes);

// Mock database
jest.mock('../../../utils/dbUtils');

describe('RCM Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Endpoints Integration', () => {
    describe('GET /api/rcm/dashboard', () => {
      it('should return complete dashboard data', async () => {
        // Mock database responses
        const mockKPIData = {
          totalRevenue: 150000,
          totalClaims: 500,
          pendingClaims: 50,
          deniedClaims: 25,
          averageReimbursement: 300,
          collectionRate: 85.5
        };

        const mockChartData = [
          { month: 'Jan', revenue: 12000 },
          { month: 'Feb', revenue: 15000 }
        ];

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockKPIData])
          .mockResolvedValueOnce(mockChartData);

        const response = await request(app)
          .get('/api/rcm/dashboard')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('kpis');
        expect(response.body.data).toHaveProperty('charts');
        expect(response.body.data.kpis.totalRevenue).toBe(150000);
      });

      it('should handle database connection errors', async () => {
        dbUtils.executeQuery.mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .get('/api/rcm/dashboard')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('Claims Management Integration', () => {
    describe('GET /api/rcm/claims', () => {
      it('should return paginated claims with filters', async () => {
        const mockClaims = [
          {
            id: 1,
            claimNumber: 'CLM001',
            patientName: 'John Doe',
            amount: 150.00,
            status: 'pending',
            serviceDate: '2023-01-15'
          }
        ];

        const mockCount = [{ total: 1 }];

        dbUtils.executeQuery
          .mockResolvedValueOnce(mockClaims)
          .mockResolvedValueOnce(mockCount);

        const response = await request(app)
          .get('/api/rcm/claims')
          .query({
            page: 1,
            limit: 10,
            status: 'pending'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.total).toBe(1);
      });

      it('should validate pagination parameters', async () => {
        const response = await request(app)
          .get('/api/rcm/claims')
          .query({
            page: -1,
            limit: 0
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('validation');
      });
    });

    describe('POST /api/rcm/claims', () => {
      it('should create a new claim successfully', async () => {
        const claimData = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        dbUtils.executeQuery.mockResolvedValue({ insertId: 1 });

        const response = await request(app)
          .post('/api/rcm/claims')
          .send(claimData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
      });

      it('should validate required fields', async () => {
        const invalidClaimData = {
          patientId: 1
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/rcm/claims')
          .send(invalidClaimData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('validation');
      });

      it('should handle duplicate claim numbers', async () => {
        const claimData = {
          patientId: 1,
          providerId: 1,
          claimNumber: 'CLM001',
          serviceDate: '2023-01-15'
        };

        const duplicateError = new Error('Duplicate entry');
        duplicateError.code = 'ER_DUP_ENTRY';
        
        dbUtils.executeQuery.mockRejectedValue(duplicateError);

        const response = await request(app)
          .post('/api/rcm/claims')
          .send(claimData)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('already exists');
      });
    });

    describe('PUT /api/rcm/claims/:id/status', () => {
      it('should update claim status', async () => {
        dbUtils.executeQuery.mockResolvedValue({ affectedRows: 1 });

        const response = await request(app)
          .put('/api/rcm/claims/1/status')
          .send({
            status: 'approved',
            notes: 'Claim approved'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should handle non-existent claim', async () => {
        dbUtils.executeQuery.mockResolvedValue({ affectedRows: 0 });

        const response = await request(app)
          .put('/api/rcm/claims/999/status')
          .send({
            status: 'approved'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });
  });

  describe('Payment Processing Integration', () => {
    describe('POST /api/rcm/payments', () => {
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

        const response = await request(app)
          .post('/api/rcm/payments')
          .send(paymentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.paymentId).toBe(1);
      });

      it('should validate payment amount', async () => {
        const invalidPaymentData = {
          claimId: 1,
          amount: -50.00,
          paymentMethod: 'insurance'
        };

        const response = await request(app)
          .post('/api/rcm/payments')
          .send(invalidPaymentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('validation');
      });

      it('should handle payment processing failures', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'credit_card'
        };

        dbUtils.executeTransaction.mockRejectedValue(new Error('Payment gateway error'));

        const response = await request(app)
          .post('/api/rcm/payments')
          .send(paymentData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Payment processing failed');
      });
    });
  });

  describe('A/R Aging Integration', () => {
    describe('GET /api/rcm/ar-aging', () => {
      it('should return A/R aging analysis', async () => {
        const mockARData = [
          { ageRange: '0-30', count: 100, amount: 15000 },
          { ageRange: '31-60', count: 50, amount: 7500 },
          { ageRange: '61-90', count: 25, amount: 3750 },
          { ageRange: '90+', count: 10, amount: 1500 }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockARData);

        const response = await request(app)
          .get('/api/rcm/ar-aging')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(4);
        expect(response.body.data[0].ageRange).toBe('0-30');
      });

      it('should filter by provider', async () => {
        dbUtils.executeQuery.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/rcm/ar-aging')
          .query({ providerId: 1 })
          .expect(200);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE providerId = ?'),
          expect.arrayContaining([1])
        );
      });
    });

    describe('GET /api/rcm/ar-aging/:id', () => {
      it('should return detailed A/R account', async () => {
        const mockAccount = {
          id: 1,
          patientName: 'John Doe',
          balance: 500.00,
          daysInAR: 45
        };

        const mockClaims = [
          { id: 1, amount: 150.00, status: 'pending' }
        ];

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockAccount])
          .mockResolvedValueOnce(mockClaims);

        const response = await request(app)
          .get('/api/rcm/ar-aging/1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
        expect(response.body.data.claims).toHaveLength(1);
      });
    });
  });

  describe('Collections Integration', () => {
    describe('GET /api/rcm/collections', () => {
      it('should return collections data', async () => {
        const mockCollections = [
          {
            id: 1,
            patientName: 'John Doe',
            balance: 500.00,
            daysOverdue: 60,
            status: 'active'
          }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockCollections);

        const response = await request(app)
          .get('/api/rcm/collections')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
      });

      it('should sort by priority', async () => {
        dbUtils.executeQuery.mockResolvedValue([]);

        const response = await request(app)
          .get('/api/rcm/collections')
          .query({ sortBy: 'priority' })
          .expect(200);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('ORDER BY (balance * daysOverdue) DESC'),
          expect.any(Array)
        );
      });
    });

    describe('POST /api/rcm/collections/activities', () => {
      it('should create collection activity', async () => {
        const activityData = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient',
          nextFollowUp: '2023-02-01'
        };

        dbUtils.executeQuery.mockResolvedValue({ insertId: 1 });

        const response = await request(app)
          .post('/api/rcm/collections/activities')
          .send(activityData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
      });
    });
  });

  describe('Denial Management Integration', () => {
    describe('GET /api/rcm/denials', () => {
      it('should return denial data', async () => {
        const mockDenials = [
          {
            id: 1,
            claimId: 1,
            denialReason: 'Missing documentation',
            amount: 150.00,
            appealable: true
          }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockDenials);

        const response = await request(app)
          .get('/api/rcm/denials')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].appealable).toBe(true);
      });

      it('should group denials by reason', async () => {
        const mockDenialSummary = [
          { reason: 'Missing documentation', count: 10, amount: 1500.00 }
        ];

        dbUtils.executeQuery.mockResolvedValue(mockDenialSummary);

        const response = await request(app)
          .get('/api/rcm/denials')
          .query({ groupBy: 'reason' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
      });
    });

    describe('POST /api/rcm/denials/:id/appeals', () => {
      it('should create appeal', async () => {
        const appealData = {
          appealReason: 'Documentation was submitted',
          supportingDocuments: ['doc1.pdf']
        };

        dbUtils.executeQuery.mockResolvedValue({ insertId: 1 });

        const response = await request(app)
          .post('/api/rcm/denials/1/appeals')
          .send(appealData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(1);
      });
    });
  });

  describe('Analytics Integration', () => {
    describe('GET /api/rcm/analytics/performance', () => {
      it('should return performance metrics', async () => {
        const mockMetrics = {
          revenueMetrics: { totalRevenue: 150000 },
          operationalMetrics: { claimsProcessed: 500 },
          financialMetrics: { collectionRate: 92.3 }
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([mockMetrics.revenueMetrics])
          .mockResolvedValueOnce([mockMetrics.operationalMetrics])
          .mockResolvedValueOnce([mockMetrics.financialMetrics]);

        const response = await request(app)
          .get('/api/rcm/analytics/performance')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('revenueMetrics');
        expect(response.body.data).toHaveProperty('operationalMetrics');
        expect(response.body.data).toHaveProperty('financialMetrics');
      });

      it('should filter by date range', async () => {
        dbUtils.executeQuery.mockResolvedValue([{}]);

        const response = await request(app)
          .get('/api/rcm/analytics/performance')
          .query({
            startDate: '2023-01-01',
            endDate: '2023-01-31'
          })
          .expect(200);

        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE serviceDate BETWEEN ? AND ?'),
          expect.arrayContaining(['2023-01-01', '2023-01-31'])
        );
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/rcm/claims')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing content-type', async () => {
      const response = await request(app)
        .post('/api/rcm/claims')
        .send({ patientId: 1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.code = 'ETIMEDOUT';
      
      dbUtils.executeQuery.mockRejectedValue(timeoutError);

      const response = await request(app)
        .get('/api/rcm/dashboard')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('timeout');
    });
  });

  describe('Security Integration', () => {
    it('should sanitize SQL injection attempts', async () => {
      const response = await request(app)
        .get('/api/rcm/claims')
        .query({
          status: "'; DROP TABLE claims; --"
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should sanitize XSS attempts', async () => {
      const response = await request(app)
        .post('/api/rcm/collections/activities')
        .send({
          accountId: 1,
          activityType: 'phone_call',
          notes: '<script>alert("xss")</script>'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should handle oversized payloads', async () => {
      const largePayload = {
        notes: 'x'.repeat(10000) // Very large string
      };

      const response = await request(app)
        .post('/api/rcm/collections/activities')
        .send(largePayload)
        .expect(413);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests', async () => {
      dbUtils.executeQuery.mockResolvedValue([{ id: 1 }]);

      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/rcm/dashboard')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle large result sets with pagination', async () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${i + 1}`,
        amount: 150.00
      }));

      const mockCount = [{ total: 1000 }];

      dbUtils.executeQuery
        .mockResolvedValueOnce(largeMockData.slice(0, 50))
        .mockResolvedValueOnce(mockCount);

      const response = await request(app)
        .get('/api/rcm/claims')
        .query({ page: 1, limit: 50 })
        .expect(200);

      expect(response.body.data).toHaveLength(50);
      expect(response.body.pagination.total).toBe(1000);
      expect(response.body.pagination.totalPages).toBe(20);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain referential integrity', async () => {
      // Test creating a claim with non-existent patient
      const claimData = {
        patientId: 999999, // Non-existent patient
        providerId: 1,
        serviceDate: '2023-01-15'
      };

      const foreignKeyError = new Error('Foreign key constraint fails');
      foreignKeyError.code = 'ER_NO_REFERENCED_ROW_2';
      
      dbUtils.executeQuery.mockRejectedValue(foreignKeyError);

      const response = await request(app)
        .post('/api/rcm/claims')
        .send(claimData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid patient');
    });

    it('should handle transaction rollbacks', async () => {
      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      const transactionError = new Error('Transaction failed');
      dbUtils.executeTransaction.mockRejectedValue(transactionError);

      const response = await request(app)
        .post('/api/rcm/payments')
        .send(paymentData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Payment processing failed');
    });
  });
});