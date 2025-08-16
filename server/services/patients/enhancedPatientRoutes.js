const express = require('express');
const router = express.Router();
const {
  getEnhancedPatientProfile,
  updateEnhancedPatientProfile,
  getProfileCompletenessAnalysis,
  validatePatientForBilling
} = require('./enhancedPatientCtrl');

const { verifyToken } = require('../../middleware/auth');

// Enhanced patient profile routes
router.get('/:patientId/enhanced', verifyToken, getEnhancedPatientProfile);
router.put('/:patientId/enhanced', verifyToken, updateEnhancedPatientProfile);
router.get('/:patientId/completeness', verifyToken, getProfileCompletenessAnalysis);
router.get('/:patientId/billing-validation', verifyToken, validatePatientForBilling);

module.exports = router;