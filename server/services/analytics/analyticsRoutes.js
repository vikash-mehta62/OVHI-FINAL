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
const validateTimeframe = [
  query('timeframe').optional().matches(/^\d+d$/).withMessage('Timeframe must be in format "30d"')
];

const validateCustomReport = [
  body('report_type').isIn(['financial', 'operational', 'patient', 'clinical']).withMessage('Invalid report type'),
  body('date_range').optional().isObject(),
  body('date_range.start').optional().isISO8601().withMessage('Invalid start date'),
  body('date_range.end').optional().isISO8601().withMessage('Invalid end date'),
  body('filters').optional().isObject(),
  body('metrics').optional().isArray(),
  body('format').optional().isIn(['json', 'csv', 'excel']).withMessage('Invalid format')
];

// Analytics routes
router.get('/dashboard', validateTimeframe, getDashboardAnalytics);
router.get('/patients', validateTimeframe, getPatientAnalytics);
router.get('/financial', validateTimeframe, getFinancialAnalytics);
router.get('/operational', validateTimeframe, getOperationalAnalytics);
router.post('/custom-report', validateCustomReport, generateCustomReport);

module.exports = router;