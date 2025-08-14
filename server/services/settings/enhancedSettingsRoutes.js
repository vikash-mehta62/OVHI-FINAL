const express = require('express');
const router = express.Router();
const {
  updateNotificationSettings,
  getNotificationSettings,
  updatePrivacySettings,
  getPrivacySettings,
  updateAppearanceSettings,
  getAppearanceSettings,
  updateSecuritySettings,
  getSecuritySettings,
  exportSettings
} = require('./enhancedSettingsCtrl');

// Notification Settings
router.post('/notifications', updateNotificationSettings);
router.get('/notifications', getNotificationSettings);

// Privacy Settings
router.post('/privacy', updatePrivacySettings);
router.get('/privacy', getPrivacySettings);

// Appearance Settings
router.post('/appearance', updateAppearanceSettings);
router.get('/appearance', getAppearanceSettings);

// Security Settings
router.post('/security', updateSecuritySettings);
router.get('/security', getSecuritySettings);

// Export/Import
router.get('/export', exportSettings);

module.exports = router;