
import express from "express";
import {
    createClaim,
    getClaims,
    getClaimById,
    deleteClaim,
    changeClaimStatus,
    addCptCode,
    addSignature,
    addActivityNote,
} from "./claimsController.js";

const router = express.Router();




router.post("/", createClaim);
router.get("/", getClaims);
router.get("/:id", getClaimById);
router.delete("/:id", deleteClaim);




router.post("/:id/status", changeClaimStatus);
router.post("/:id/cpt", addCptCode);
router.post("/:id/signatures", addSignature);
router.post("/:id/activity", addActivityNote);

export default router;
