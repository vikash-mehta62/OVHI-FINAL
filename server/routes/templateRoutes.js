const express = require('express');
const router = express.Router();
const templateService = require('../services/referrals/templateService');
const templateEditorService = require('../services/referrals/templateEditorService');
const documentGenerationEngine = require('../services/referrals/documentGenerationEngine');

/**
 * Template and Document Generation API Routes
 * RESTful endpoints for template management and document generation
 */

// =====================================================
// TEMPLATE MANAGEMENT ROUTES
// =====================================================

/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: Create new template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - specialty
 *               - contentTemplate
 *             properties:
 *               name:
 *                 type: string
 *               specialty:
 *                 type: string
 *               templateType:
 *                 type: string
 *                 enum: [letter, form, summary, authorization]
 *               contentTemplate:
 *                 type: string
 *               formattingOptions:
 *                 type: object
 *               letterheadConfig:
 *                 type: object
 *               signatureConfig:
 *                 type: object
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid template data
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const templateData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await templateService.createTemplate(templateData, userId);
    
    res.status(201).json({
      success: true,
      data: result.template,
      message: result.message
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(error.message.includes('Missing required') ? 400 : 500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Get templates with filtering
 *     tags: [Templates]
 *     parameters:
 *       - in: query
 *         name: specialty
 *         schema:
 *           type: string
 *         description: Filter by specialty
 *       - in: query
 *         name: templateType
 *         schema:
 *           type: string
 *         description: Filter by template type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of templates to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Number of templates to skip
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { specialty, templateType, isActive, limit = 50, offset = 0 } = req.query;
    
    let templates;
    if (specialty) {
      templates = await templateService.getTemplatesBySpecialty(specialty, true);
    } else {
      // Get all templates with filtering
      const query = `
        SELECT * FROM referral_templates 
        WHERE 1=1
        ${templateType ? 'AND template_type = ?' : ''}
        ${isActive !== undefined ? 'AND is_active = ?' : ''}
        ORDER BY is_default DESC, name ASC
        LIMIT ? OFFSET ?
      `;
      
      const params = [];
      if (templateType) params.push(templateType);
      if (isActive !== undefined) params.push(isActive === 'true');
      params.push(parseInt(limit), parseInt(offset));
      
      const db = require('../config/db');
      const [results] = await db.execute(query, params);
      templates = results.map(template => ({
        ...template,
        variables: JSON.parse(template.variables || '[]'),
        formatting_options: JSON.parse(template.formatting_options || '{}'),
        letterhead_config: JSON.parse(template.letterhead_config || '{}'),
        signature_config: JSON.parse(template.signature_config || '{}')
      }));
    }

    res.json({
      success: true,
      data: templates,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: Get template by ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}:
 *   put:
 *     summary: Update template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const updateData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await templateService.updateTemplate(req.params.id, updateData, userId);
    
    res.json({
      success: true,
      data: result.template,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}/validate:
 *   post:
 *     summary: Validate template content
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentTemplate:
 *                 type: string
 *               specialty:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation completed
 *       500:
 *         description: Server error
 */
router.post('/:id/validate', async (req, res) => {
  try {
    const { contentTemplate, specialty = 'General' } = req.body;
    
    const validationResult = await templateService.validateTemplate(contentTemplate, specialty);
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Error validating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}/preview:
 *   post:
 *     summary: Preview template with sample data
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.post('/:id/preview', async (req, res) => {
  try {
    const { sampleData } = req.body;
    
    const previewResult = await templateService.previewTemplate(req.params.id, sampleData);
    
    res.json({
      success: true,
      data: previewResult
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}/clone:
 *   post:
 *     summary: Clone template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               specialty:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template cloned successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.post('/:id/clone', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const cloneData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await templateService.cloneTemplate(req.params.id, cloneData, userId);
    
    res.status(201).json({
      success: true,
      data: result.template,
      message: result.message
    });
  } catch (error) {
    console.error('Error cloning template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}/deactivate:
 *   post:
 *     summary: Deactivate template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template deactivated successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.post('/:id/deactivate', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { reason } = req.body;

    const result = await templateService.deactivateTemplate(req.params.id, reason, userId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deactivating template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/{id}/usage:
 *   get:
 *     summary: Get template usage statistics
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
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
 *         description: Usage statistics retrieved successfully
 *       404:
 *         description: Template not found
 *       500:
 *         description: Server error
 */
router.get('/:id/usage', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const usage = await templateService.getTemplateUsageStatistics(req.params.id, dateRange);
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    console.error('Error getting template usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// TEMPLATE EDITOR ROUTES
// =====================================================

/**
 * @swagger
 * /api/templates/editor/sessions:
 *   post:
 *     summary: Create template editor session
 *     tags: [Template Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: string
 *               autoSave:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Editor session created successfully
 *       500:
 *         description: Server error
 */
router.post('/editor/sessions', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { templateId, autoSave } = req.body;

    const result = await templateEditorService.createEditorSession(userId, templateId, { autoSave });
    
    res.status(201).json({
      success: true,
      data: result.session,
      sessionId: result.sessionId,
      message: result.message
    });
  } catch (error) {
    console.error('Error creating editor session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/editor/sessions/{sessionId}/content:
 *   put:
 *     summary: Update template content in editor session
 *     tags: [Template Editor]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               validate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Content updated successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.put('/editor/sessions/:sessionId/content', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { content, validate } = req.body;

    const result = await templateEditorService.updateSessionContent(
      req.params.sessionId, 
      content, 
      userId, 
      { validate }
    );
    
    res.json({
      success: true,
      data: result.session,
      validation: result.validation,
      message: result.message
    });
  } catch (error) {
    console.error('Error updating session content:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/editor/sessions/{sessionId}/validate:
 *   post:
 *     summary: Validate template content in editor session
 *     tags: [Template Editor]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Validation completed
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post('/editor/sessions/:sessionId/validate', async (req, res) => {
  try {
    const validationResult = await templateEditorService.validateSessionContent(req.params.sessionId);
    
    res.json({
      success: true,
      data: validationResult
    });
  } catch (error) {
    console.error('Error validating session content:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/editor/sessions/{sessionId}/preview:
 *   post:
 *     summary: Preview template from editor session
 *     tags: [Template Editor]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preview generated successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post('/editor/sessions/:sessionId/preview', async (req, res) => {
  try {
    const { sampleData } = req.body;
    
    const previewResult = await templateEditorService.previewTemplate(req.params.sessionId, sampleData);
    
    res.json({
      success: true,
      data: previewResult.preview,
      sessionId: previewResult.sessionId
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/editor/sessions/{sessionId}/save:
 *   post:
 *     summary: Save template from editor session
 *     tags: [Template Editor]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               specialty:
 *                 type: string
 *               templateType:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Template saved successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.post('/editor/sessions/:sessionId/save', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const saveData = {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const result = await templateEditorService.saveTemplate(req.params.sessionId, saveData, userId);
    
    res.json({
      success: true,
      data: result.template,
      session: result.session,
      message: result.message
    });
  } catch (error) {
    console.error('Error saving template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/templates/editor/sessions/{sessionId}:
 *   delete:
 *     summary: Close editor session
 *     tags: [Template Editor]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Session closed successfully
 *       404:
 *         description: Session not found
 *       500:
 *         description: Server error
 */
router.delete('/editor/sessions/:sessionId', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { force } = req.query;

    const result = await templateEditorService.closeEditorSession(
      req.params.sessionId, 
      userId, 
      { force: force === 'true' }
    );
    
    res.json({
      success: result.success,
      hasUnsavedChanges: result.hasUnsavedChanges,
      message: result.message
    });
  } catch (error) {
    console.error('Error closing editor session:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// DOCUMENT GENERATION ROUTES
// =====================================================

/**
 * @swagger
 * /api/documents/generate:
 *   post:
 *     summary: Generate document from template
 *     tags: [Document Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referralId
 *               - templateId
 *             properties:
 *               referralId:
 *                 type: string
 *               templateId:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [pdf, html, text, docx]
 *               includeAttachments:
 *                 type: boolean
 *               digitalSignature:
 *                 type: boolean
 *               letterhead:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document generated successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { referralId, templateId, format = 'pdf', ...options } = req.body;

    if (!referralId || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'referralId and templateId are required'
      });
    }

    const result = await documentGenerationEngine.generateDocument(
      referralId, 
      templateId, 
      { ...options, format, userId }
    );
    
    res.json({
      success: true,
      data: result.document,
      metadata: result.metadata
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/documents/batch-generate:
 *   post:
 *     summary: Generate documents for multiple referrals
 *     tags: [Document Generation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referralIds
 *               - templateId
 *             properties:
 *               referralIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               templateId:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [pdf, html, text, docx]
 *     responses:
 *       200:
 *         description: Batch generation completed
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const userId = req.user?.id || req.headers['x-user-id'];
    const { referralIds, templateId, format = 'pdf', ...options } = req.body;

    if (!referralIds || !Array.isArray(referralIds) || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'referralIds (array) and templateId are required'
      });
    }

    const result = await documentGenerationEngine.batchGenerateDocuments(
      referralIds, 
      templateId, 
      { ...options, format, userId }
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in batch document generation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/documents/statistics:
 *   get:
 *     summary: Get document generation statistics
 *     tags: [Document Generation]
 *     parameters:
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
 *       500:
 *         description: Server error
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate) dateRange.startDate = startDate;
    if (endDate) dateRange.endDate = endDate;

    const statistics = await documentGenerationEngine.getGenerationStatistics(dateRange);
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Error getting generation statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =====================================================
// SPECIALTY ROUTES
// =====================================================

/**
 * @swagger
 * /api/templates/specialties:
 *   get:
 *     summary: Get available specialties
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Specialties retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/specialties', async (req, res) => {
  try {
    const db = require('../config/db');
    const [specialties] = await db.execute(`
      SELECT 
        specialty,
        COUNT(*) as template_count,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_count,
        COUNT(CASE WHEN is_default = TRUE THEN 1 END) as default_count
      FROM referral_templates 
      GROUP BY specialty
      ORDER BY template_count DESC
    `);

    res.json({
      success: true,
      data: specialties
    });
  } catch (error) {
    console.error('Error getting specialties:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;