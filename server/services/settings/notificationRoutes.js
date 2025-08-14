const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getNotificationSettings,
  updateNotificationSettings,
  testNotification,
  getNotificationHistory,
  markNotificationRead
} = require('./notificationCtrl');

// Validation middleware
const validateNotificationSettings = [
  body('email_notifications').optional().isBoolean(),
  body('sms_notifications').optional().isBoolean(),
  body('push_notifications').optional().isBoolean(),
  body('appointment_reminders').optional().isBoolean(),
  body('billing_alerts').optional().isBoolean(),
  body('system_updates').optional().isBoolean(),
  body('marketing_emails').optional().isBoolean(),
  body('security_alerts').optional().isBoolean(),
  body('reminder_frequency').optional().isInt({ min: 1, max: 168 }), // 1 hour to 1 week
  body('quiet_hours_start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('quiet_hours_end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('notification_sound').optional().isIn(['default', 'chime', 'bell', 'none'])
];

const validateTestNotification = [
  body('type').isIn(['email', 'sms', 'push']).withMessage('Invalid notification type')
];

// Routes
router.get('/', getNotificationSettings);
router.put('/', validateNotificationSettings, updateNotificationSettings);
router.post('/test', validateTestNotification, testNotification);
router.get('/history', getNotificationHistory);
router.put('/history/:notificationId/read', markNotificationRead);

module.exports = router;