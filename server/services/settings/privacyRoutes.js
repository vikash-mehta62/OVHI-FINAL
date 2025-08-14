const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getPrivacySettings,
  updatePrivacySettings,
  requestDataExport,
  requestAccountDeletion,
  getPrivacyAuditLog,
  getComplianceStatus
} = require('./privacyCtrl');

// Validation middleware
const validatePrivacySettings = [
  body('data_sharing_consent').optional().isBoolean(),
  body('analytics_tracking').optional().isBoolean(),
  body('marketing_consent').optional().isBoolean(),
  body('third_party_sharing').optional().isBoolean(),
  body('data_retention_period').optional().isInt({ min: 2555 }), // Minimum 7 years for HIPAA
  body('auto_delete_inactive').optional().isBoolean(),
  body('export_data_format').optional().isIn(['json', 'csv', 'xml']),
  body('audit_log_retention').optional().isInt({ min: 2555 }),
  body('session_timeout').optional().isInt({ min: 5, max: 480 }), // 5 minutes to 8 hours
  body('two_factor_enabled').optional().isBoolean(),
  body('login_notifications').optional().isBoolean(),
  body('data_encryption_level').optional().isIn(['aes128', 'aes256']),
  body('backup_frequency').optional().isIn(['daily', 'weekly', 'monthly'])
];

const validateDataExport = [
  body('format').optional().isIn(['json', 'csv', 'xml']).withMessage('Invalid export format')
];

const validateAccountDeletion = [
  body('reason').optional().isString().isLength({ max: 500 }),
  body('confirmation').equals('DELETE_MY_ACCOUNT').withMessage('Confirmation required')
];

// Routes
router.get('/', getPrivacySettings);
router.put('/', validatePrivacySettings, updatePrivacySettings);
router.post('/export', validateDataExport, requestDataExport);
router.post('/delete-account', validateAccountDeletion, requestAccountDeletion);
router.get('/audit-log', getPrivacyAuditLog);
router.get('/compliance', getComplianceStatus);

module.exports = router;