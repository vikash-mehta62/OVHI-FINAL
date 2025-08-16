const express = require('express');
const router = express.Router();
const {
  getPatientMedicalRecords,
  addPatientMedicalRecord,
  updatePatientMedicalRecord,
  deletePatientMedicalRecord
} = require('./patientMedicalRecordsCtrl');

// Medical Records Routes
router.get('/:id/medical-records', getPatientMedicalRecords);
router.post('/:id/medical-records', addPatientMedicalRecord);
router.put('/:id/medical-records/:recordId', updatePatientMedicalRecord);
router.delete('/:id/medical-records/:recordId', deletePatientMedicalRecord);

module.exports = router;