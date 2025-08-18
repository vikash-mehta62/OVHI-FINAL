const express = require('express');
const router = express.Router();
const referralService = require('../services/referrals/referralService');
const referralValidationService = require('../services/referrals/referralValidationService');
const referralWorkflowEngine = require('../services/referrals/referralWorkflowEngine');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { validateRequest, sanitizeInput } = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiting for referral operations
const referralRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many referral requests from this IP'
});

// Apply rate limiting and authentication to all routes
router.use(referralRateLimit);
router.use(authenticateToken);

/**
 * @swagger
 * /api/referrals:
 *   post:
 *     summary: Create a new referral
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - providerId
 *               - specialtyType
 *               - referralReason
 *             properties:
 *               patientId:
 *                 type: string
 *               providerId:
 *                 type: string
 *               encounterId:
 *                 type: string
 *               specialistId:
 *                 type: string
 *               specialtyType:
 *                 type: string
 *               referralReason:
 *                 type: string
 *               clinicalNotes:
 *                 type: string
 *               urgencyLevel:
 *                 type: string
 *                 enum: [routine, urgent, stat]
 *               appointmentType:
 *                 type: string
 *                 enum: [consultation, treatment, second_opinion, procedure]
 *               authorizationRequired:
 *                 type: boolean
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Referral created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', 
  authorizeRoles(['provider', 'admin']),
  validateRequest([
    'patientId', 'providerId', 'specialtyType', 'referralReason'
  ]),
  sanitizeInput,
  async (req, res) => {
    try {
      // Add request metadata
      const referralData = {
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      // Validate referral data
      const validation = await referralValidationService.validateReferral(referralData, 'create');
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Referral validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Create referral
      const result = await referralService.createReferral(referralData, req.user.id);

      res.status(201).json({
        success: true,
        data: result.referral,
        message: result.message
      });

    } catch (error) {
      console.error('Error creating referral:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create referral',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals:
 *   get:
 *     summary: Get referrals with filtering and pagination
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: patientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: specialtyType
 *         schema:
 *           type: string
 *       - in: query
 *         name: urgencyLevel
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: Referrals retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req, res) => {
  try {
    const filters = {
      providerId: req.query.providerId,
      patientId: req.query.patientId,
      status: req.query.status ? req.query.status.split(',') : null,
      specialtyType: req.query.specialtyType,
      urgencyLevel: req.query.urgencyLevel,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      searchTerm: req.query.search
    };

    const pagination = {
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'created_at',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    // Determine which referrals to fetch based on user role
    let result;
    if (req.user.role === 'admin') {
      // Admin can see all referrals with filters
      result = await referralService.getReferralsByProvider(
        filters.providerId || null, 
        filters, 
        pagination
      );
    } else if (req.user.role === 'provider') {
      // Providers can only see their own referrals
      result = await referralService.getReferralsByProvider(
        req.user.id, 
        filters, 
        pagination
      );
    } else if (req.user.role === 'patient') {
      // Patients can only see their own referrals
      result = await referralService.getReferralsByPatient(
        req.user.id, 
        { ...filters, limit: pagination.limit, offset: pagination.offset }
      );
    } else {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view referrals'
      });
    }

    res.json({
      success: true,
      data: result.referrals || result,
      pagination: result.pagination,
      filters: filters
    });

  } catch (error) {
    console.error('Error getting referrals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve referrals',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/referrals/{id}:
 *   get:
 *     summary: Get referral by ID
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Referral retrieved successfully
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:id', async (req, res) => {
  try {
    const referral = await referralService.getReferralById(req.params.id);
    
    if (!referral) {
      return res.status(404).json({
        success: false,
        message: 'Referral not found'
      });
    }

    // Check access permissions
    const hasAccess = req.user.role === 'admin' || 
                     referral.provider_id === req.user.id || 
                     referral.patient_id === req.user.id ||
                     (req.user.role === 'specialist' && referral.specialist_id === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this referral'
      });
    }

    res.json({
      success: true,
      data: referral
    });

  } catch (error) {
    console.error('Error getting referral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve referral',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/referrals/{id}/status:
 *   put:
 *     summary: Update referral status
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, pending, sent, scheduled, completed, cancelled, expired]
 *               notes:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date-time
 *               completedDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:id/status', 
  authorizeRoles(['provider', 'admin', 'specialist']),
  async (req, res) => {
    try {
      const { status, notes, scheduledDate, completedDate } = req.body;

      // Validate workflow action
      const validation = await referralValidationService.validateForWorkflowAction(
        req.params.id, 
        'status_change'
      );

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Status change validation failed',
          errors: validation.errors
        });
      }

      const options = {
        scheduledDate,
        completedDate,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      };

      const result = await referralService.updateReferralStatus(
        req.params.id, 
        status, 
        notes, 
        req.user.id, 
        options
      );

      res.json({
        success: true,
        data: result.referral,
        message: result.message
      });

    } catch (error) {
      console.error('Error updating referral status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update referral status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/{id}/workflow:
 *   post:
 *     summary: Execute workflow action on referral
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [status_change, authorization_update, schedule_appointment, complete_referral, escalate]
 *               actionData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workflow action executed successfully
 *       400:
 *         description: Invalid workflow action
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:id/workflow', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      const { action, actionData } = req.body;

      const result = await referralWorkflowEngine.processReferralWorkflow(
        req.params.id,
        action,
        actionData,
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: 'Workflow action executed successfully'
      });

    } catch (error) {
      console.error('Error executing workflow action:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute workflow action',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/{id}/authorization:
 *   post:
 *     summary: Process authorization for referral
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Authorization processed successfully
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:id/authorization', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      const result = await referralService.processAuthorization(req.params.id, req.user.id);

      res.json({
        success: true,
        data: result,
        message: result.message
      });

    } catch (error) {
      console.error('Error processing authorization:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process authorization',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/{id}/letter:
 *   post:
 *     summary: Generate referral letter
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Letter generated successfully
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:id/letter', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      const { templateId } = req.body;

      const result = await referralService.generateReferralLetter(
        req.params.id, 
        templateId
      );

      res.json({
        success: true,
        data: result,
        message: 'Referral letter generated successfully'
      });

    } catch (error) {
      console.error('Error generating referral letter:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate referral letter',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/{id}/attachments:
 *   post:
 *     summary: Add attachments to referral
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - attachments
 *             properties:
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     filePath:
 *                       type: string
 *                     fileType:
 *                       type: string
 *                     fileSize:
 *                       type: integer
 *                     attachmentType:
 *                       type: string
 *                     description:
 *                       type: string
 *     responses:
 *       200:
 *         description: Attachments added successfully
 *       404:
 *         description: Referral not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:id/attachments', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      const { attachments } = req.body;

      const result = await referralService.addAttachments(
        req.params.id, 
        attachments, 
        req.user.id
      );

      res.json({
        success: true,
        data: result,
        message: 'Attachments added successfully'
      });

    } catch (error) {
      console.error('Error adding attachments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add attachments',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/validate:
 *   post:
 *     summary: Validate referral data
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               referralData:
 *                 type: object
 *               validationType:
 *                 type: string
 *                 enum: [create, update, workflow]
 *     responses:
 *       200:
 *         description: Validation completed
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/validate', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      const { referralData, validationType = 'create' } = req.body;

      const validation = await referralValidationService.validateReferral(
        referralData, 
        validationType
      );

      res.json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Error validating referral:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate referral',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

/**
 * @swagger
 * /api/referrals/stats:
 *   get:
 *     summary: Get referral statistics
 *     tags: [Referrals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', 
  authorizeRoles(['provider', 'admin']),
  async (req, res) => {
    try {
      // This would integrate with analytics service
      // For now, return basic stats
      const stats = {
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        averageCompletionTime: 0
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting referral statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

module.exports = router;