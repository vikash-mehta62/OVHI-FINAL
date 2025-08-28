const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getARAgingReport,
  getARStats,
  recordFollowUp,
  updateAccountStatus,
  generateCollectionLetters,
  getAccountDetails
} = require('./arAgingController');

// Validation middleware
const validateFollowUp = [
  body('contactMethod').isIn(['phone', 'email', 'letter', 'in_person'])
    .withMessage('Invalid contact method'),
  body('outcome').isIn(['payment_promised', 'payment_plan', 'no_contact', 'dispute', 'hardship'])
    .withMessage('Invalid outcome'),
  body('notes').isString().withMessage('Notes are required'),
  body('nextFollowUpDate').optional().isISO8601().withMessage('Invalid next follow-up date'),
  body('promisedPaymentDate').optional().isISO8601().withMessage('Invalid promised payment date'),
  body('promisedAmount').optional().isFloat({ min: 0 }).withMessage('Invalid promised amount')
];

const validateStatusUpdate = [
  body('status').isIn(['active', 'follow_up', 'collections', 'write_off', 'paid'])
    .withMessage('Invalid status'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

const validateCollectionLetters = [
  body('accountIds').isArray({ min: 1 }).withMessage('At least one account ID is required'),
  body('accountIds.*').isInt({ min: 1 }).withMessage('Each account ID must be a valid integer'),
  body('letterType').optional().isIn(['standard', 'final_notice', 'payment_plan'])
    .withMessage('Invalid letter type')
];

// Routes

// GET /api/v1/rcm/ar-aging - Get A/R aging report
router.get('/ar-aging', getARAgingReport);

// GET /api/v1/rcm/ar-aging/stats - Get A/R aging statistics
router.get('/ar-aging/stats', getARStats);

// GET /api/v1/rcm/ar-aging/:accountId - Get account details
router.get('/ar-aging/:accountId', getAccountDetails);

// POST /api/v1/rcm/ar-aging/:accountId/follow-up - Record follow-up activity
router.post('/ar-aging/:accountId/follow-up', validateFollowUp, recordFollowUp);

// PUT /api/v1/rcm/ar-aging/:accountId/status - Update account status
router.put('/ar-aging/:accountId/status', validateStatusUpdate, updateAccountStatus);

// POST /api/v1/rcm/ar-aging/collection-letters - Generate collection letters
router.post('/ar-aging/collection-letters', validateCollectionLetters, generateCollectionLetters);

module.exports = router;