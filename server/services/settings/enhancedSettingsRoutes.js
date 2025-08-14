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

// Import new enhanced route modules
const notificationRoutes = require('./notificationRoutes');
const privacyRoutes = require('./privacyRoutes');
const appearanceRoutes = require('./appearanceRoutes');

// Enhanced routes with full functionality
router.use('/notifications-enhanced', notificationRoutes);
router.use('/privacy-enhanced', privacyRoutes);
router.use('/appearance-enhanced', appearanceRoutes);

// Legacy routes for backward compatibility
router.post('/notifications', updateNotificationSettings);
router.get('/notifications', getNotificationSettings);
router.post('/privacy', updatePrivacySettings);
router.get('/privacy', getPrivacySettings);
router.post('/appearance', updateAppearanceSettings);
router.get('/appearance', getAppearanceSettings);

// Security Settings (keep existing)
router.post('/security', updateSecuritySettings);
router.get('/security', getSecuritySettings);

// Export/Import
router.get('/export', exportSettings);

module.exports = router;