const express = require("express");
const {
    createClaim,
    getClaims,
    getClaimById,
    deleteClaim,
    changeClaimStatus,
    addCptCode,
    addSignature,
    addActivityNote,
} = require("./claimsController.js");

const router = express.Router();

router.post("/", createClaim);
router.get("/", getClaims);
router.get("/:id", getClaimById);
router.delete("/:id", deleteClaim);

router.post("/:id/status", changeClaimStatus);
router.post("/:id/cpt", addCptCode);
router.post("/:id/signatures", addSignature);
router.post("/:id/activity", addActivityNote);

module.exports = router;
