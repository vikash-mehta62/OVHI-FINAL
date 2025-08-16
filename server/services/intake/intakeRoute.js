const express = require("express");
const router = express.Router();
const { sendIntake, registerPatient } = require("./intakeForm");
const { 
  upload, 
  uploadIntakeDocuments, 
  getPatientDocuments, 
  deletePatientDocument,
  saveIntakeProgress,
  getIntakeProgress 
} = require("./fileUploadCtrl");

// Original intake routes
router.post("/send", sendIntake);
router.post("/register/patient", registerPatient);

// New file upload routes
router.post("/upload-documents", upload.array('documents', 10), uploadIntakeDocuments);
router.get("/documents/:patientId", getPatientDocuments);
router.delete("/documents/:documentId", deletePatientDocument);

// Progress tracking routes
router.post("/progress", saveIntakeProgress);
router.get("/progress/:sessionId", getIntakeProgress);

module.exports = router;
