const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const {
  getSpecialtyConfiguration,
  updateSpecialtyConfiguration,
  getAutoAssignedTemplates,
  createCustomTemplate,
  getAITemplateRecommendations,
  getSpecialtyTemplateAnalytics
} = require('./autoSpecialtyCtrl');

// Validation middleware
const validateSpecialtyConfig = [
  body('specialty').isString().isLength({ min: 1, max: 100 }).withMessage('Specialty is required'),
  body('auto_template_assignment').optional().isBoolean(),
  body('default_templates').optional().isArray(),
  body('custom_templates').optional().isArray(),
  body('ai_suggestions_enabled').optional().isBoolean(),
  body('template_preferences').optional().isObject(),
  body('ai_settings').optional().isObject()
];

const validateCustomTemplate = [
  body('template_name').isString().isLength({ min: 1, max: 255 }).withMessage('Template name is required'),
  body('specialty').isString().isLength({ min: 1, max: 100 }).withMessage('Specialty is required'),
  body('visit_type').isString().isLength({ min: 1, max: 100 }).withMessage('Visit type is required'),
  body('soap_structure').isObject().withMessage('SOAP structure must be an object'),
  body('billing_codes').optional().isObject(),
  body('custom_fields').optional().isObject(),
  body('is_default').optional().isBoolean(),
  body('ai_enhanced').optional().isBoolean(),
  body('tags').optional().isArray()
];

const validateTemplateQuery = [
  query('visit_type').optional().isString(),
  query('chief_complaint').optional().isString(),
  query('patient_context').optional().isString()
];

const validateAIRecommendations = [
  query('specialty').isString().withMessage('Specialty is required'),
  query('visit_type').optional().isString(),
  query('chief_complaint').optional().isString(),
  query('patient_age').optional().isInt({ min: 0, max: 150 }),
  query('patient_gender').optional().isIn(['M', 'F', 'Other']),
  query('patient_history').optional().isString()
];

const validateAnalyticsQuery = [
  query('specialty').isString().withMessage('Specialty is required'),
  query('timeframe').optional().isIn(['7d', '30d', '90d']).withMessage('Invalid timeframe')
];

// Routes
router.get('/config', getSpecialtyConfiguration);
router.put('/config', validateSpecialtyConfig, updateSpecialtyConfiguration);
router.get('/auto-assigned', validateTemplateQuery, getAutoAssignedTemplates);
router.post('/custom-template', validateCustomTemplate, createCustomTemplate);
router.get('/ai-recommendations', validateAIRecommendations, getAITemplateRecommendations);
router.get('/analytics', validateAnalyticsQuery, getSpecialtyTemplateAnalytics);

module.exports = router;