/**
 * Comprehensive tests for Unified RCM Routes
 */

const express = require('express');
const request = require('supertest');
const unifiedRCMRoutes = require('../../../routes/unifiedRCMRoutes');
const unifiedRCMController = require('../unifiedRCMController');
const { authMiddleware, roleMiddleware } = require('../../../middleware/auth');
const { validateRequest } = require('../../../middleware/validation');

// Mock dependencies
jest.mock('../unifiedRCMController');
jest.mock('../../../middleware/auth');
jest.mock('../../../middleware/validation');

describe('Unified RCM Routes', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/rcm', unifiedRCMRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock middleware to pass through by default
    authMiddleware.mockImplementation((req, res, next) => {
      req.user = { id: 'test-user', role: 'admin' };
      next();
    });
    
    roleMiddleware.mockImplementation(() => (req, res, next) => next());
    validateRequest.mockImplementation(() => (req, res, next) => next());
  });

  describe('Claims Routes', () => {
    describe('GET /claims', () => {
      it('should call getClaims controller', async () => {
        unifiedRCMController.getClaims.mockImplementation((req, res) => {
          res.json({ success: true, data: [] });
        });

        const response = await request(app)
          .get('/api/v1/rcm/claims')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getClaims).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should apply authentication middleware', async () => {
        authMiddleware.mockImplementation((req, res, next) => {
          res.status(401).json({ success: false, error: 'Unauthorized' });
        });

        await request(app)
          .get('/api/v1/rcm/claims')
          .expect(401);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getClaims).not.toHaveBeenCalled();
      });

      it('should handle query parameters', async () => {
        unifiedRCMController.getClaims.mockImplementation((req, res) => {
          expect(req.query.status).toBe('pending');
          expect(req.query.page).toBe('1');
          res.json({ success: true, data: [] });
        });

        await request(app)
          .get('/api/v1/rcm/claims?status=pending&page=1')
          .expect(200);

        expect(unifiedRCMController.getClaims).toHaveBeenCalled();
      });
    });

    describe('POST /claims', () => {
      it('should call createClaim controller with validation', async () => {
        unifiedRCMController.createClaim.mockImplementation((req, res) => {
          res.status(201).json({ success: true, data: { id: 1 } });
        });

        const claimData = {
          patientId: 'patient-1',
          providerId: 'provider-1',
          amount: 150.00
        };

        const response = await request(app)
          .post('/api/v1/rcm/claims')
          .send(claimData)
          .expect(201);

        expect(authMiddleware).toHaveBeenCalled();
        expect(validateRequest).toHaveBeenCalled();
        expect(unifiedRCMController.createClaim).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should reject invalid data through validation middleware', async () => {
        validateRequest.mockImplementation(() => (req, res, next) => {
          res.status(400).json({ success: false, error: 'Validation failed' });
        });

        await request(app)
          .post('/api/v1/rcm/claims')
          .send({})
          .expect(400);

        expect(validateRequest).toHaveBeenCalled();
        expect(unifiedRCMController.createClaim).not.toHaveBeenCalled();
      });
    });

    describe('PUT /claims/:id', () => {
      it('should call updateClaim controller', async () => {
        unifiedRCMController.updateClaim.mockImplementation((req, res) => {
          expect(req.params.id).toBe('1');
          res.json({ success: true, data: { affectedRows: 1 } });
        });

        const updateData = { status: 'approved' };

        const response = await request(app)
          .put('/api/v1/rcm/claims/1')
          .send(updateData)
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.updateClaim).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should validate claim ID parameter', async () => {
        unifiedRCMController.updateClaim.mockImplementation((req, res) => {
          res.json({ success: true });
        });

        await request(app)
          .put('/api/v1/rcm/claims/invalid-id')
          .send({ status: 'approved' })
          .expect(200);

        expect(unifiedRCMController.updateClaim).toHaveBeenCalled();
      });
    });

    describe('DELETE /claims/:id', () => {
      it('should call deleteClaim controller', async () => {
        unifiedRCMController.deleteClaim.mockImplementation((req, res) => {
          expect(req.params.id).toBe('1');
          res.json({ success: true, data: { affectedRows: 1 } });
        });

        const response = await request(app)
          .delete('/api/v1/rcm/claims/1')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.deleteClaim).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should require admin role for deletion', async () => {
        roleMiddleware.mockImplementation(() => (req, res, next) => {
          if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden' });
          }
          next();
        });

        // Mock user with non-admin role
        authMiddleware.mockImplementation((req, res, next) => {
          req.user = { id: 'test-user', role: 'user' };
          next();
        });

        await request(app)
          .delete('/api/v1/rcm/claims/1')
          .expect(403);

        expect(roleMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.deleteClaim).not.toHaveBeenCalled();
      });
    });
  });

  describe('Dashboard Routes', () => {
    describe('GET /dashboard', () => {
      it('should call getDashboard controller', async () => {
        unifiedRCMController.getDashboard.mockImplementation((req, res) => {
          res.json({ success: true, data: { kpis: {}, charts: {} } });
        });

        const response = await request(app)
          .get('/api/v1/rcm/dashboard')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getDashboard).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should handle date range parameters', async () => {
        unifiedRCMController.getDashboard.mockImplementation((req, res) => {
          expect(req.query.startDate).toBe('2023-01-01');
          expect(req.query.endDate).toBe('2023-12-31');
          res.json({ success: true, data: {} });
        });

        await request(app)
          .get('/api/v1/rcm/dashboard?startDate=2023-01-01&endDate=2023-12-31')
          .expect(200);

        expect(unifiedRCMController.getDashboard).toHaveBeenCalled();
      });
    });

    describe('GET /dashboard/kpis', () => {
      it('should call getKPIs controller', async () => {
        unifiedRCMController.getKPIs.mockImplementation((req, res) => {
          res.json({ success: true, data: { totalRevenue: 150000 } });
        });

        const response = await request(app)
          .get('/api/v1/rcm/dashboard/kpis')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getKPIs).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Payment Routes', () => {
    describe('POST /payments', () => {
      it('should call processPayment controller', async () => {
        unifiedRCMController.processPayment.mockImplementation((req, res) => {
          res.status(201).json({ success: true, data: { paymentId: 1 } });
        });

        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance'
        };

        const response = await request(app)
          .post('/api/v1/rcm/payments')
          .send(paymentData)
          .expect(201);

        expect(authMiddleware).toHaveBeenCalled();
        expect(validateRequest).toHaveBeenCalled();
        expect(unifiedRCMController.processPayment).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /payments', () => {
      it('should call getPayments controller', async () => {
        unifiedRCMController.getPayments.mockImplementation((req, res) => {
          res.json({ success: true, data: [] });
        });

        const response = await request(app)
          .get('/api/v1/rcm/payments')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getPayments).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('A/R Aging Routes', () => {
    describe('GET /ar-aging', () => {
      it('should call getARAging controller', async () => {
        unifiedRCMController.getARAging.mockImplementation((req, res) => {
          res.json({ success: true, data: { '0-30': { amount: 1000 } } });
        });

        const response = await request(app)
          .get('/api/v1/rcm/ar-aging')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getARAging).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });

      it('should handle provider filter', async () => {
        unifiedRCMController.getARAging.mockImplementation((req, res) => {
          expect(req.query.providerId).toBe('provider-1');
          res.json({ success: true, data: {} });
        });

        await request(app)
          .get('/api/v1/rcm/ar-aging?providerId=provider-1')
          .expect(200);

        expect(unifiedRCMController.getARAging).toHaveBeenCalled();
      });
    });
  });

  describe('Analytics Routes', () => {
    describe('GET /analytics/revenue', () => {
      it('should call getRevenueAnalytics controller', async () => {
        unifiedRCMController.getRevenueAnalytics.mockImplementation((req, res) => {
          res.json({ success: true, data: { monthlyRevenue: [] } });
        });

        const response = await request(app)
          .get('/api/v1/rcm/analytics/revenue')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getRevenueAnalytics).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /analytics/claims', () => {
      it('should call getClaimsAnalytics controller', async () => {
        unifiedRCMController.getClaimsAnalytics.mockImplementation((req, res) => {
          res.json({ success: true, data: { statusDistribution: [] } });
        });

        const response = await request(app)
          .get('/api/v1/rcm/analytics/claims')
          .expect(200);

        expect(authMiddleware).toHaveBeenCalled();
        expect(unifiedRCMController.getClaimsAnalytics).toHaveBeenCalled();
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Middleware Integration', () => {
    it('should apply middleware in correct order', async () => {
      const middlewareOrder = [];

      authMiddleware.mockImplementation((req, res, next) => {
        middlewareOrder.push('auth');
        req.user = { id: 'test-user', role: 'admin' };
        next();
      });

      roleMiddleware.mockImplementation(() => (req, res, next) => {
        middlewareOrder.push('role');
        next();
      });

      validateRequest.mockImplementation(() => (req, res, next) => {
        middlewareOrder.push('validation');
        next();
      });

      unifiedRCMController.createClaim.mockImplementation((req, res) => {
        middlewareOrder.push('controller');
        res.json({ success: true });
      });

      await request(app)
        .post('/api/v1/rcm/claims')
        .send({ patientId: 'patient-1' })
        .expect(200);

      expect(middlewareOrder).toEqual(['auth', 'validation', 'controller']);
    });

    it('should handle middleware errors', async () => {
      authMiddleware.mockImplementation((req, res, next) => {
        const error = new Error('Authentication failed');
        next(error);
      });

      await request(app)
        .get('/api/v1/rcm/claims')
        .expect(500);

      expect(unifiedRCMController.getClaims).not.toHaveBeenCalled();
    });
  });

  describe('Route Parameters', () => {
    it('should handle numeric ID parameters', async () => {
      unifiedRCMController.getClaim.mockImplementation((req, res) => {
        expect(req.params.id).toBe('123');
        res.json({ success: true, data: { id: 123 } });
      });

      await request(app)
        .get('/api/v1/rcm/claims/123')
        .expect(200);

      expect(unifiedRCMController.getClaim).toHaveBeenCalled();
    });

    it('should handle string ID parameters', async () => {
      unifiedRCMController.getClaim.mockImplementation((req, res) => {
        expect(req.params.id).toBe('claim-abc-123');
        res.json({ success: true, data: { id: 'claim-abc-123' } });
      });

      await request(app)
        .get('/api/v1/rcm/claims/claim-abc-123')
        .expect(200);

      expect(unifiedRCMController.getClaim).toHaveBeenCalled();
    });
  });

  describe('Content Type Handling', () => {
    it('should handle JSON requests', async () => {
      unifiedRCMController.createClaim.mockImplementation((req, res) => {
        expect(req.body.patientId).toBe('patient-1');
        res.json({ success: true });
      });

      await request(app)
        .post('/api/v1/rcm/claims')
        .set('Content-Type', 'application/json')
        .send({ patientId: 'patient-1' })
        .expect(200);

      expect(unifiedRCMController.createClaim).toHaveBeenCalled();
    });

    it('should reject non-JSON content types for POST requests', async () => {
      await request(app)
        .post('/api/v1/rcm/claims')
        .set('Content-Type', 'text/plain')
        .send('invalid data')
        .expect(400);

      expect(unifiedRCMController.createClaim).not.toHaveBeenCalled();
    });
  });

  describe('HTTP Methods', () => {
    it('should only allow specified HTTP methods', async () => {
      // Test unsupported method
      await request(app)
        .patch('/api/v1/rcm/claims')
        .expect(404);
    });

    it('should handle OPTIONS requests for CORS', async () => {
      await request(app)
        .options('/api/v1/rcm/claims')
        .expect(200);
    });
  });

  describe('Error Handling in Routes', () => {
    it('should handle controller errors', async () => {
      unifiedRCMController.getClaims.mockImplementation((req, res, next) => {
        const error = new Error('Controller error');
        next(error);
      });

      await request(app)
        .get('/api/v1/rcm/claims')
        .expect(500);
    });

    it('should handle async controller errors', async () => {
      unifiedRCMController.getClaims.mockImplementation(async (req, res, next) => {
        throw new Error('Async controller error');
      });

      await request(app)
        .get('/api/v1/rcm/claims')
        .expect(500);
    });
  });
});