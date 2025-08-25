/**
 * Comprehensive Integration Tests for RCM API
 */

const request = require('supertest');
const app = require('../../app');
const { dbUtils } = require('../../utils/dbUtils');
const jwt = require('jsonwebtoken');

// Mock database for integration tests
jest.mock('../../utils/dbUtils');

describe('RCM API Integration Tests', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Setup test user and authentication
    testUser = {
      id: 'test-user-1',
      email: 'test@example.com',
      role: 'admin',
      isActive: true
    };

    // Generate test JWT token
    authToken = jwt.sign(
      { id: testUser.id, email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Mock user lookup for authentication
    dbUtils.executeQuery.mockImplementation((query, params) => {
      if (query.includes('SELECT') && query.includes('users') && params[0] === testUser.id) {
        return Promise.resolve([testUser]);
      }
      return Promise.resolve([]);
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should login successfully with valid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'password123'
        };

        const mockUser = {
          id: 'user-1',
          email: 'test@example.com',
          password: '$2b$10$hashedpassword', // Mock hashed password
          role: 'admin',
          isActive: true
        };

        // Mock password comparison and user lookup
        dbUtils.executeQuery.mockImplementation((query) => {
          if (query.includes('SELECT') && query.includes('users')) {
            return Promise.resolve([mockUser]);
          }
          return Promise.resolve([]);
        });

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('token');
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.email).toBe(loginData.email);
      });

      it('should reject invalid credentials', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        dbUtils.executeQuery.mockResolvedValue([]); // No user found

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid credentials');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });
    });
  });

  describe('Claims Management Endpoints', () => {
    describe('GET /api/v1/rcm/claims', () => {
      it('should retrieve claims with authentication', async () => {
        const mockClaims = [
          { id: 1, claimNumber: 'CLM001', status: 'pending', amount: 150.00 },
          { id: 2, claimNumber: 'CLM002', status: 'approved', amount: 200.00 }
        ];

        const mockCount = [{ total: 2 }];

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser]) // Auth lookup
          .mockResolvedValueOnce(mockClaims) // Claims data
          .mockResolvedValueOnce(mockCount); // Count query

        const response = await request(app)
          .get('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.claims).toEqual(mockClaims);
        expect(response.body.data.pagination.total).toBe(2);
      });

      it('should reject unauthenticated requests', async () => {
        const response = await request(app)
          .get('/api/v1/rcm/claims')
          .expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Access denied');
      });

      it('should handle query parameters correctly', async () => {
        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ total: 0 }]);

        const response = await request(app)
          .get('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            status: 'pending',
            patientId: 'patient-1',
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            page: 2,
            limit: 5
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(dbUtils.executeQuery).toHaveBeenCalledWith(
          expect.stringContaining('WHERE'),
          expect.arrayContaining(['pending', 'patient-1'])
        );
      });
    });

    describe('POST /api/v1/rcm/claims', () => {
      it('should create claim successfully', async () => {
        const claimData = {
          patientId: 'patient-1',
          providerId: 'provider-1',
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        const mockResult = { insertId: 1, affectedRows: 1 };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser]) // Auth
          .mockResolvedValueOnce([{ exists: 1 }]) // Patient validation
          .mockResolvedValueOnce([{ exists: 1 }]) // Provider validation
          .mockResolvedValueOnce([{ exists: 1 }]) // Code validation
          .mockResolvedValueOnce(mockResult); // Insert

        const response = await request(app)
          .post('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .send(claimData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResult);
      });

      it('should validate required fields', async () => {
        dbUtils.executeQuery.mockResolvedValueOnce([testUser]);

        const response = await request(app)
          .post('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });

      it('should reject invalid patient ID', async () => {
        const claimData = {
          patientId: 'invalid-patient',
          providerId: 'provider-1',
          amount: 150.00
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce([{ exists: 0 }]); // Invalid patient

        const response = await request(app)
          .post('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
          .send(claimData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid patient');
      });
    });

    describe('PUT /api/v1/rcm/claims/:id', () => {
      it('should update claim successfully', async () => {
        const claimId = 1;
        const updateData = { status: 'approved' };
        const mockResult = { affectedRows: 1 };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce([{ id: 1, status: 'pending' }]) // Existing claim
          .mockResolvedValueOnce(mockResult) // Update
          .mockResolvedValueOnce({ insertId: 1 }); // Audit log

        const response = await request(app)
          .put(`/api/v1/rcm/claims/${claimId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockResult);
      });

      it('should handle non-existent claims', async () => {
        const claimId = 999;
        const updateData = { status: 'approved' };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce([]); // No claim found

        const response = await request(app)
          .put(`/api/v1/rcm/claims/${claimId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });
  });

  describe('Dashboard Endpoints', () => {
    describe('GET /api/v1/rcm/dashboard', () => {
      it('should return dashboard data', async () => {
        const mockKPIs = {
          totalRevenue: 150000,
          totalClaims: 500,
          pendingClaims: 50,
          deniedClaims: 25
        };

        const mockChartData = {
          revenueByMonth: [{ month: 'Jan', revenue: 12000 }],
          claimsByStatus: [{ status: 'approved', count: 400 }]
        };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce([mockKPIs])
          .mockResolvedValueOnce(mockChartData.revenueByMonth)
          .mockResolvedValueOnce(mockChartData.claimsByStatus);

        const response = await request(app)
          .get('/api/v1/rcm/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ startDate: '2023-01-01', endDate: '2023-12-31' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('kpis');
        expect(response.body.data).toHaveProperty('charts');
      });

      it('should handle date range parameters', async () => {
        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValue([]);

        const response = await request(app)
          .get('/api/v1/rcm/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
          .query({
            startDate: '2023-01-01',
            endDate: '2023-12-31',
            providerId: 'provider-1'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Payment Processing Endpoints', () => {
    describe('POST /api/v1/rcm/payments', () => {
      it('should process payment successfully', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance',
          paymentDate: '2023-01-20'
        };

        const mockClaim = [{ id: 1, totalAmount: 150.00, paidAmount: 0 }];
        const mockPaymentResult = { insertId: 1, affectedRows: 1 };

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce(mockClaim) // Claim lookup
          .mockResolvedValueOnce(mockPaymentResult) // Payment insert
          .mockResolvedValueOnce({ affectedRows: 1 }); // Claim update

        const response = await request(app)
          .post('/api/v1/rcm/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('paymentId', 1);
      });

      it('should reject overpayments', async () => {
        const paymentData = {
          claimId: 1,
          amount: 200.00,
          paymentMethod: 'insurance'
        };

        const mockClaim = [{ id: 1, totalAmount: 150.00, paidAmount: 0 }];

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce(mockClaim);

        const response = await request(app)
          .post('/api/v1/rcm/payments')
          .set('Authorization', `Bearer ${authToken}`)
          .send(paymentData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('exceeds remaining balance');
      });
    });
  });

  describe('A/R Aging Endpoints', () => {
    describe('GET /api/v1/rcm/ar-aging', () => {
      it('should return A/R aging data', async () => {
        const mockARData = [
          { claimId: 1, balance: 100, daysOutstanding: 25 },
          { claimId: 2, balance: 200, daysOutstanding: 45 },
          { claimId: 3, balance: 150, daysOutstanding: 75 }
        ];

        dbUtils.executeQuery
          .mockResolvedValueOnce([testUser])
          .mockResolvedValueOnce(mockARData);

        const response = await request(app)
          .get('/api/v1/rcm/ar-aging')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('0-30');
        expect(response.body.data).toHaveProperty('31-60');
        expect(response.body.data).toHaveProperty('61-90');
        expect(response.body.data).toHaveProperty('90+');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      dbUtils.executeQuery
        .mockResolvedValueOnce([testUser])
        .mockRejectedValueOnce(dbError);

      const response = await request(app)
        .get('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Mock multiple rapid requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/rcm/claims')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(requests);
      
      // At least some should succeed
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large result sets efficiently', async () => {
      const largeMockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(4, '0')}`,
        status: 'pending',
        amount: 100 + i
      }));

      dbUtils.executeQuery
        .mockResolvedValueOnce([testUser])
        .mockResolvedValueOnce(largeMockData.slice(0, 50))
        .mockResolvedValueOnce([{ total: 1000 }]);

      const startTime = Date.now();
      
      const response = await request(app)
        .get('/api/v1/rcm/claims')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 50 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toHaveLength(50);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent requests', async () => {
      dbUtils.executeQuery.mockImplementation((query) => {
        if (query.includes('SELECT') && query.includes('users')) {
          return Promise.resolve([testUser]);
        }
        return Promise.resolve([]);
      });

      const concurrentRequests = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/v1/rcm/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.all(concurrentRequests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});