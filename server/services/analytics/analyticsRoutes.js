const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const {
  getDashboardAnalytics,
  getPatientAnalytics,
  getFinancialAnalytics,
  getOperationalAnalytics,
  generateCustomReport
} = require('./analyticsCtrl');

// Validation middleware
const validateReportConfig = [
  body('name').notEmpty().withMessage('Report name is required'),
  body('fields').isArray({ min: 1 }).withMessage('At least one field is required'),
  body('chartType').isIn(['table', 'bar', 'line', 'pie', 'area']).withMessage('Invalid chart type'),
  body('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('Limit must be between 1 and 10000')
];

const validateTimeframe = [
  query('timeframe').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid timeframe')
];

// Dashboard Analytics Routes

// GET /api/v1/analytics/dashboard - Get comprehensive dashboard analytics
router.get('/dashboard', validateTimeframe, getDashboardAnalytics);

// GET /api/v1/analytics/patients - Get patient analytics
router.get('/patients', validateTimeframe, getPatientAnalytics);

// GET /api/v1/analytics/financial - Get financial analytics
router.get('/financial', validateTimeframe, getFinancialAnalytics);

// GET /api/v1/analytics/operational - Get operational analytics
router.get('/operational', validateTimeframe, getOperationalAnalytics);

// Custom Reports Routes

// POST /api/v1/analytics/reports/generate - Generate a custom report
router.post('/reports/generate', validateReportConfig, generateCustomReport);

// Placeholder routes for future implementation
router.get('/metrics/advanced', validateTimeframe, (req, res) => {
  res.json({
    success: false,
    message: 'Advanced metrics feature coming soon'
  });
});

router.get('/insights/ai', (req, res) => {
  res.json({
    success: false,
    message: 'AI insights feature coming soon'
  });
});

router.get('/insights/predictive', (req, res) => {
  res.json({
    success: false,
    message: 'Predictive analytics feature coming soon'
  });
});

router.get('/realtime', (req, res) => {
  res.json({
    success: false,
    message: 'Real-time metrics feature coming soon'
  });
});

router.get('/reports', (req, res) => {
  res.json({
    success: false,
    message: 'Saved reports feature coming soon'
  });
});

router.post('/reports', validateReportConfig, (req, res) => {
  res.json({
    success: false,
    message: 'Save custom report feature coming soon'
  });
});

router.delete('/reports/:reportId', (req, res) => {
  res.json({
    success: false,
    message: 'Delete report feature coming soon'
  });
});

// Export Routes
router.get('/export/dashboard', validateTimeframe, (req, res) => {
  res.json({
    success: false,
    message: 'Export dashboard feature coming soon'
  });
});

router.post('/export/custom', validateReportConfig, (req, res) => {
  res.json({
    success: false,
    message: 'Export custom report feature coming soon'
  });
});

// Specific Analytics Routes

// GET /api/v1/analytics/revenue - Get revenue analytics (alias for financial)
router.get('/revenue', validateTimeframe, getFinancialAnalytics);

// GET /api/v1/analytics/appointments - Get appointment analytics (alias for operational)
router.get('/appointments', validateTimeframe, getOperationalAnalytics);

// GET /api/v1/analytics/providers - Get provider performance analytics (alias for dashboard)
router.get('/providers', validateTimeframe, getDashboardAnalytics);

// GET /api/v1/analytics/rcm - Get RCM analytics (alias for financial)
router.get('/rcm', validateTimeframe, getFinancialAnalytics);

module.exports = router;