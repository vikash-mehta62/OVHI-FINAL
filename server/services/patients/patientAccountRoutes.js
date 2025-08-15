const express = require("express");
const router = express.Router();
const {
  getPatientAccountSummary,
  getPatientClaims,
  getClaimDetails,
  addClaimComment,
  voidClaim,
  correctClaim,
  getPatientPayments,
  recordPatientPayment,
  getPatientStatements,
  generatePatientStatement,
  downloadStatement,
  resendStatement
} = require("./patientAccountCtrl");

// Account Summary Routes
router.get("/account-summary", getPatientAccountSummary);

// Claims Routes
router.get("/claims", getPatientClaims);
router.get("/claims/:claimId", getClaimDetails);
router.post("/claims/comment", addClaimComment);
router.post("/claims/void", voidClaim);
router.post("/claims/correct", correctClaim);

// Payments Routes
router.get("/payments", getPatientPayments);
router.post("/payments/record", recordPatientPayment);

// Statements Routes
router.get("/statements", getPatientStatements);
router.post("/statements/generate", generatePatientStatement);
router.get("/statements/:statementId/download", downloadStatement);
router.post("/statements/resend", resendStatement);

module.exports = router;