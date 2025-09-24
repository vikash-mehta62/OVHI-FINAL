const express = require('express');
const router = express.Router();
const { createEncounterTemplate, getEncounterTemplates, getEncounterTemplateById, updateTemplateById, deleteTemplateById, getAllEncounters, createEncounter, getEncounterById, deleteEncounterById, updateEncounterById, addEncounterTemplate, getProviderEncounterTemplates, updateProviderEncounterTemplate, getEncounterTemplatesByType} = require('./encounterController');

const {
      createNewEncounter,
    getNewEncounters,
    getNewEncounterById,
    updateNewEncounter,
    deleteNewEncounter,
    completeEncounter,
    getEncounterStats,
    getEncountersByPatientId,
    searchEncounters
} = require('./newEncounterController')


// ===== EXISTING ROUTES (Legacy) =====
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
// router.get('/template/getByType', getEncounterTemplatesByType);

// ===== NEW ROUTES (Enhanced with Joi Validation) =====
// Encounter management routes
router.post('/ehr/encounters', createNewEncounter);                   // Create new encounter
router.get('/ehr/encounters', getNewEncounters);                      // Get encounters with filtering & pagination
router.get('/ehr/encounters/stats', getEncounterStats);               // Get encounter statistics
router.get('/ehr/encounters/search', searchEncounters);               // Search encounters
router.get('/ehr/encounters/patient/:patientId', getEncountersByPatientId); // Get encounters by patient ID
router.get('/ehr/encounters/:encounter_id', getNewEncounterById);     // Get encounter by ID
router.put('/ehr/encounters/:encounter_id', updateNewEncounter);      // Update encounter
router.delete('/ehr/encounters/:encounter_id', deleteNewEncounter);   // Delete encounter
router.patch('/ehr/encounters/:encounter_id/complete', completeEncounter); // Complete encounter    
router.patch('/ehr/encounters/:encounter_id/complete', completeEncounter);


module.exports = router;
