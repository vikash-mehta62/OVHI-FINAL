const express = require('express');
const router = express.Router();
const {
  getSmartTemplateRecommendations,
  createSmartTemplate,
  getTemplatesBySpecialty,
  cloneTemplate,
  rateTemplate,
  getTemplateAnalytics
} = require('./smartTemplateCtrl');

// Smart template recommendations
router.get('/recommendations', getSmartTemplateRecommendations);

// Template management
router.post('/create', createSmartTemplate);
router.get('/specialty', getTemplatesBySpecialty);
router.post('/:templateId/clone', cloneTemplate);

// Template feedback and analytics
router.post('/:templateId/rate', rateTemplate);
router.get('/:templateId/analytics', getTemplateAnalytics);

module.exports = router;