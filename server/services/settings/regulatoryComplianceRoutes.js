const express = require('express');
const router = express.Router();
const regulatoryComplianceCtrl = require('./regulatoryComplianceCtrl');
const { verifyToken } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/settings/regulatory/clia:
 *   get:
 *     summary: Get CLIA certificates for an organization
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: CLIA certificates retrieved successfully
 *   post:
 *     summary: Add or update CLIA certificate
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clia_number
 *               - laboratory_name
 *               - effective_date
 *               - expiry_date
 *             properties:
 *               id:
 *                 type: integer
 *               clia_number:
 *                 type: string
 *                 pattern: '^[0-9]{2}[A-Z][0-9]{7}$'
 *                 example: '12D3456789'
 *               certificate_type:
 *                 type: string
 *                 enum: [waived, moderate_complexity, high_complexity, provider_performed]
 *               laboratory_name:
 *                 type: string
 *               laboratory_director:
 *                 type: string
 *               director_license_number:
 *                 type: string
 *               director_license_state:
 *                 type: string
 *               effective_date:
 *                 type: string
 *                 format: date
 *               expiry_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [active, expired, suspended, revoked]
 *               laboratory_address:
 *                 type: string
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: CLIA certificate saved successfully
 */
router.get('/clia', regulatoryComplianceCtrl.getCLIACertificates);
router.post('/clia', regulatoryComplianceCtrl.saveCLIACertificate);

/**
 * @swagger
 * /api/v1/settings/regulatory/dea:
 *   get:
 *     summary: Get DEA registrations for a provider
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: DEA registrations retrieved successfully
 *   post:
 *     summary: Add or update DEA registration
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_id
 *               - dea_number
 *               - expiry_date
 *             properties:
 *               id:
 *                 type: integer
 *               provider_id:
 *                 type: integer
 *               dea_number:
 *                 type: string
 *                 pattern: '^[A-Z]{2}[0-9]{7}$'
 *                 example: 'AB1234563'
 *               registration_type:
 *                 type: string
 *                 enum: [practitioner, mid-level, researcher, manufacturer]
 *               schedule_authority:
 *                 type: string
 *                 example: '2,3,4,5'
 *               business_activity:
 *                 type: string
 *               expiry_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [active, expired, suspended, revoked]
 *               registered_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: DEA registration saved successfully
 */
router.get('/dea', regulatoryComplianceCtrl.getDEARegistrations);
router.post('/dea', regulatoryComplianceCtrl.saveDEARegistration);

/**
 * @swagger
 * /api/v1/settings/regulatory/licenses:
 *   get:
 *     summary: Get state licenses for a provider
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: providerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: State licenses retrieved successfully
 *   post:
 *     summary: Add or update state license
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider_id
 *               - state_code
 *               - license_number
 *             properties:
 *               id:
 *                 type: integer
 *               provider_id:
 *                 type: integer
 *               state_code:
 *                 type: string
 *                 maxLength: 2
 *                 example: 'CA'
 *               license_number:
 *                 type: string
 *               license_type:
 *                 type: string
 *                 default: 'Medical License'
 *               issue_date:
 *                 type: string
 *                 format: date
 *               expiry_date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [active, expired, suspended, revoked]
 *               issuing_board:
 *                 type: string
 *     responses:
 *       200:
 *         description: State license saved successfully
 */
router.get('/licenses', regulatoryComplianceCtrl.getStateLicenses);
router.post('/licenses', regulatoryComplianceCtrl.saveStateLicense);

/**
 * @swagger
 * /api/v1/settings/regulatory/alerts:
 *   get:
 *     summary: Get compliance alerts
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [provider, organization]
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: alertType
 *         schema:
 *           type: string
 *           enum: [license_expiry, dea_expiry, clia_expiry, board_cert_expiry]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, acknowledged, resolved]
 *           default: pending
 *     responses:
 *       200:
 *         description: Compliance alerts retrieved successfully
 *   post:
 *     summary: Generate compliance alerts
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compliance alerts generated successfully
 */
router.get('/alerts', regulatoryComplianceCtrl.getComplianceAlerts);
router.post('/alerts/generate', regulatoryComplianceCtrl.generateComplianceAlerts);

/**
 * @swagger
 * /api/v1/settings/regulatory/validate:
 *   post:
 *     summary: Validate regulatory numbers (CLIA, DEA)
 *     tags: [Regulatory Compliance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - number
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [clia, dea]
 *               number:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     message:
 *                       type: string
 *                     number:
 *                       type: string
 *                     type:
 *                       type: string
 */
router.post('/validate', regulatoryComplianceCtrl.validateRegulatoryNumber);

module.exports = router;