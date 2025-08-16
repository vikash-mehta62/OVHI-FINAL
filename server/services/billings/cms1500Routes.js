const express = require('express');
const router = express.Router();
const {
  submitCMS1500Claim,
  getCMS1500Template,
  getCMS1500ClaimStatus,
  correctCMS1500Claim
} = require('./cms1500Ctrl');

// CMS-1500 Routes
router.post('/cms1500/submit', submitCMS1500Claim);
router.get('/cms1500/template', getCMS1500Template);
router.get('/cms1500/:claimId/status', getCMS1500ClaimStatus);
router.put('/cms1500/:claimId/correct', correctCMS1500Claim);

module.exports = router;