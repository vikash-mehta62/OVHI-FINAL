const express = require('express');
const router = express.Router();
const { createEncounterTemplate, getEncounterTemplates, getEncounterTemplateById, updateTemplateById, deleteTemplateById, getAllEncounters, createEncounter, getEncounterById, deleteEncounterById,updateEncounterById,addEncounterTemplate,getProviderEncounterTemplates,updateProviderEncounterTemplate, createClaimFromEncounter, submitClaim } = require('./encounterController');


router.post('/template/create', createEncounterTemplate);
router.post('/template/provider/create', addEncounterTemplate);
router.get('/template/get', getEncounterTemplates);
router.get('/template/get/:templateId', getEncounterTemplateById);
router.get('/template/provider/get', getProviderEncounterTemplates);
router.get('/template/provider/get/:templateId', getProviderEncounterTemplates);
router.post('/template/update/:template_id', updateTemplateById);
router.delete('/template/delete/:template_id', deleteTemplateById);
router.get('/get', getAllEncounters);
router.post('/create', createEncounter);
router.get('/get/:encounter_id', getEncounterById);
router.post('/update/:encounterId', updateEncounterById);
router.delete('/delete/:encounterId', deleteEncounterById);
router.post('/template/provider/update', updateProviderEncounterTemplate);

// Encounter to Claim workflow routes
router.post('/create-claim', createClaimFromEncounter);
router.post('/submit-claim/:claimId', submitClaim);

module.exports = router;
