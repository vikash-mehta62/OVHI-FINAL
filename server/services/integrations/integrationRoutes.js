const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const {
  getIntegrations,
  saveIntegration,
  testIntegration,
  syncIntegration,
  deleteIntegration,
  getIntegrationAuditLog,
  getIntegrationTypes
} = require('./integrationCtrl');

// Validation middleware
const validateIntegration = [
  body('integration_type').isIn(['ehr', 'lab', 'pharmacy', 'imaging', 'billing', 'telehealth']).withMessage('Invalid integration type'),
  body('integration_name').isLength({ min: 1, max: 100 }).withMessage('Integration name is required'),
  body('configuration').isObject().withMessage('Configuration must be an object'),
  body('sync_frequency').optional().isIn(['hourly', 'daily', 'weekly', 'monthly']).withMessage('Invalid sync frequency'),
  body('auto_sync').optional().isBoolean()
];

const validateIntegrationId = [
  param('integration_id').isInt({ min: 1 }).withMessage('Invalid integration ID')
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// Routes
router.get('/', getIntegrations);
router.post('/', validateIntegration, saveIntegration);
router.get('/types', getIntegrationTypes);
router.post('/:integration_id/test', validateIntegrationId, testIntegration);
router.post('/:integration_id/sync', validateIntegrationId, syncIntegration);
router.delete('/:integration_id', validateIntegrationId, deleteIntegration);
router.get('/audit-log', validatePagination, getIntegrationAuditLog);

module.exports = router;