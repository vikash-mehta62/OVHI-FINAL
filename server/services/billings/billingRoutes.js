const express = require('express');
const router = express.Router();

const { getAllPatients, updateBillingStatus,getFormInformationForCms,sendForClaim,saveClaim } = require('./billingCtrl');

// Import CMS-1500 routes
const cms1500Routes = require('./cms1500Routes');

router.get('/patients', getAllPatients);
router.post('/update-billing-status', updateBillingStatus);

router.post("/get-form-information-for-cms",getFormInformationForCms);
router.post("/save-claim",saveClaim);
router.post("/send-for-claim",sendForClaim);

// Add CMS-1500 routes
router.use('/', cms1500Routes);

// Add medical coding routes
const {
  getDiagnosisCodes,
  getProcedureCodes,
  getCPTSuggestions,
  validateMedicalCodes
} = require('./medicalCodingCtrl');

router.get('/diagnosis-codes', getDiagnosisCodes);
router.get('/procedure-codes', getProcedureCodes);
router.get('/cpt-suggestions', getCPTSuggestions);
router.post('/validate-codes', validateMedicalCodes);
module.exports = router;
