const express = require('express');
const router = express.Router();

// Import all patient portal controllers
const {
  getPatientMedicalRecords,
  addPatientMedicalRecord,
  updatePatientMedicalRecord,
  deletePatientMedicalRecord
} = require('./patientMedicalRecordsCtrl');

const {
  getPatientMedications,
  addPatientMedication,
  requestMedicationRefill,
  updateMedicationStatus
} = require('./patientMedicationsCtrl');

const {
  getPatientVitals,
  addPatientVitals
} = require('./patientVitalsCtrl');

const {
  getPatientInsurance,
  updatePatientInsurance,
  verifyInsuranceEligibility
} = require('./patientInsuranceCtrl');

// Medical Records Routes
router.get('/:id/medical-records', getPatientMedicalRecords);
router.post('/:id/medical-records', addPatientMedicalRecord);
router.put('/:id/medical-records/:recordId', updatePatientMedicalRecord);
router.delete('/:id/medical-records/:recordId', deletePatientMedicalRecord);

// Medications Routes
router.get('/:id/medications', getPatientMedications);
router.post('/:id/medications', addPatientMedication);
router.post('/:id/medications/refill', requestMedicationRefill);
router.put('/:id/medications/:medicationId/status', updateMedicationStatus);

// Vitals Routes
router.get('/:id/vitals', getPatientVitals);
router.post('/:id/vitals', addPatientVitals);

// Insurance Routes
router.get('/:id/insurance', getPatientInsurance);
router.post('/:id/insurance', updatePatientInsurance);
router.post('/:id/insurance/verify', verifyInsuranceEligibility);

// Test Results Routes (placeholder for future implementation)
router.get('/:id/test-results', (req, res) => {
  res.json({
    success: true,
    data: {
      testResults: [],
      message: 'Test results feature coming soon'
    }
  });
});

// Appointments Routes (placeholder - will integrate with existing appointment system)
router.get('/:id/appointments', (req, res) => {
  res.json({
    success: true,
    data: {
      appointments: [],
      message: 'Patient appointments integration pending'
    }
  });
});

module.exports = router;