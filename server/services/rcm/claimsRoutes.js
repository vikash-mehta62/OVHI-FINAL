const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getAllClaims,
  getClaimStats,
  submitClaim,
  bulkSubmitClaims,
  getClaimDetails,
  updateClaimStatus
} = require('./claimsController');

// Validation middleware
const validateBulkSubmit = [
  body('claimIds').isArray({ min: 1 }).withMessage('At least one claim ID is required'),
  body('claimIds.*').isString().withMessage('Each claim ID must be a string')
];

const validateStatusUpdate = [
  body('status').isIn(['draft', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'appealed'])
    .withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string')
];

// Routes

// GET /api/v1/rcm/claims - Get all claims with filtering
router.get('/claims', getAllClaims);

// GET /api/v1/rcm/claims/stats - Get claim statistics
router.get('/claims/stats', getClaimStats);

// GET /api/v1/rcm/claims/:claimId - Get claim details
router.get('/claims/:claimId', getClaimDetails);

// POST /api/v1/rcm/claims/:claimId/submit - Submit single claim
router.post('/claims/:claimId/submit', submitClaim);

// POST /api/v1/rcm/claims/bulk-submit - Bulk submit claims
router.post('/claims/bulk-submit', validateBulkSubmit, bulkSubmitClaims);

// PUT /api/v1/rcm/claims/:claimId/status - Update claim status
router.put('/claims/:claimId/status', validateStatusUpdate, updateClaimStatus);

module.exports = router;