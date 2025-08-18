const express = require('express');
const router = express.Router();
const specialistService = require('../services/referrals/specialistService');
const specialistDirectoryManager = require('../services/referrals/specialistDirectoryManager');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, sanitizeInput } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for specialist operations
const specialistRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many specialist requests from this IP'
});

// Apply rate limiting and authentication to all routes
router.use(specialistRateLimit);
router.use(authenticateToken);

/**
 * @swagger
 * /api/specialists:
 *   post:
 *     summary: Add new specialist to directory
 *     tags: [Specialists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - specialt