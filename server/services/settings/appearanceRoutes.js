const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAppearanceSettings,
  updateAppearanceSettings,
  getAppearanceOptions,
  resetAppearanceSettings,
  exportAppearanceSettings,
  importAppearanceSettings
} = require('./appearanceCtrl');

// Validation middleware
const validateAppearanceSettings = [
  body('theme').optional().isIn(['light', 'dark', 'auto']),
  body('color_scheme').optional().isIn(['blue', 'green', 'purple', 'orange', 'red']),
  body('font_size').optional().isIn(['small', 'medium', 'large', 'extra-large']),
  body('font_family').optional().isIn(['system', 'arial', 'helvetica', 'georgia', 'times']),
  body('language').optional().isIn(['en', 'es', 'fr', 'de', 'it', 'pt']),
  body('timezone').optional().isString(),
  body('date_format').optional().isIn(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MMM DD, YYYY']),
  body('time_format').optional().isIn(['12h', '24h']),
  body('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD']),
  body('sidebar_collapsed').optional().isBoolean(),
  body('compact_mode').optional().isBoolean(),
  body('high_contrast').optional().isBoolean(),
  body('animations_enabled').optional().isBoolean(),
  body('sound_enabled').optional().isBoolean(),
  body('dashboard_layout').optional().isIn(['grid', 'list', 'cards']),
  body('items_per_page').optional().isInt({ min: 10, max: 100 })
];

const validateImportSettings = [
  body('settings').isObject().withMessage('Settings must be an object')
];

// Routes
router.get('/', getAppearanceSettings);
router.put('/', validateAppearanceSettings, updateAppearanceSettings);
router.get('/options', getAppearanceOptions);
router.post('/reset', resetAppearanceSettings);
router.get('/export', exportAppearanceSettings);
router.post('/import', validateImportSettings, importAppearanceSettings);

module.exports = router;