const express = require('express');
const router = express.Router();
const documentNumberingCtrl = require('./documentNumberingCtrl');
const { verifyToken } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(verifyToken);

/**
 * @swagger
 * /api/v1/settings/document-numbering/sequences:
 *   get:
 *     summary: Get all document sequences for an organization
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Document sequences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       document_type:
 *                         type: string
 *                       prefix:
 *                         type: string
 *                       current_number:
 *                         type: integer
 *                       number_length:
 *                         type: integer
 *                       suffix:
 *                         type: string
 *                       format_template:
 *                         type: string
 *                       reset_frequency:
 *                         type: string
 *                       is_active:
 *                         type: boolean
 */
router.get('/sequences', documentNumberingCtrl.getDocumentSequences);

/**
 * @swagger
 * /api/v1/settings/document-numbering/sequences/{id}:
 *   put:
 *     summary: Update document sequence configuration
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prefix:
 *                 type: string
 *               current_number:
 *                 type: integer
 *               number_length:
 *                 type: integer
 *               suffix:
 *                 type: string
 *               format_template:
 *                 type: string
 *               reset_frequency:
 *                 type: string
 *                 enum: [never, yearly, monthly, daily]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document sequence updated successfully
 */
router.put('/sequences/:id', documentNumberingCtrl.updateDocumentSequence);

/**
 * @swagger
 * /api/v1/settings/document-numbering/generate:
 *   post:
 *     summary: Generate next document number
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentType
 *             properties:
 *               documentType:
 *                 type: string
 *                 enum: [invoice, statement, claim_batch, receipt, superbill, referral, lab_requisition, prescription, encounter]
 *               documentId:
 *                 type: integer
 *               organizationId:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Document number generated successfully
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
 *                     documentNumber:
 *                       type: string
 *                     documentType:
 *                       type: string
 *                     organizationId:
 *                       type: integer
 */
router.post('/generate', documentNumberingCtrl.generateDocumentNumber);

/**
 * @swagger
 * /api/v1/settings/document-numbering/preview:
 *   get:
 *     summary: Preview next document number without incrementing
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: documentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [invoice, statement, claim_batch, receipt, superbill, referral, lab_requisition, prescription, encounter]
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Document number preview generated successfully
 */
router.get('/preview', documentNumberingCtrl.previewDocumentNumber);

/**
 * @swagger
 * /api/v1/settings/document-numbering/history:
 *   get:
 *     summary: Get document number generation history
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: documentType
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Document number history retrieved successfully
 */
router.get('/history', documentNumberingCtrl.getDocumentNumberHistory);

/**
 * @swagger
 * /api/v1/settings/document-numbering/sequences/{id}/reset:
 *   post:
 *     summary: Reset document sequence to a new starting number
 *     tags: [Document Numbering]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newStartNumber:
 *                 type: integer
 *                 default: 1
 *     responses:
 *       200:
 *         description: Document sequence reset successfully
 */
router.post('/sequences/:id/reset', documentNumberingCtrl.resetDocumentSequence);

module.exports = router;