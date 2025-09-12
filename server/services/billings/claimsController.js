
import pool from "../config/db.js";

export const createClaim = async (req, res) => {
    try {
        const {
            claim_type,
            patient_id,
            payer_id,
            subscriber_id,
            group_number,
            relationship,
            rendering_npi,
            billing_org,
            billing_tin,
            billing_phone,
            billing_address,
            referring_npi,
            supervising_npi,
            prior_auth_number,
            occurrence_code,
            occurrence_date,
            date_of_service,
            service_to,
            place_of_service,
            icd_codes,
            total_charges,
            copay_collected,
            encounter_id
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO claims 
      (claim_type, patient_id, payer_id, subscriber_id, group_number, relationship,
       rendering_npi, billing_org, billing_tin, billing_phone, billing_address,
       referring_npi, supervising_npi, prior_auth_number, occurrence_code, occurrence_date,
       date_of_service, service_to, place_of_service, icd_codes, total_charges, copay_collected,
       encounter_id) 
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                claim_type, patient_id, payer_id, subscriber_id, group_number, relationship,
                rendering_npi, billing_org, billing_tin, billing_phone, billing_address,
                referring_npi, supervising_npi, prior_auth_number, occurrence_code, occurrence_date,
                date_of_service, service_to, place_of_service, JSON.stringify(icd_codes),
                total_charges, copay_collected, encounter_id
            ]
        );

        res.status(201).json({ claim_id: result.insertId, message: "Claim created successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create claim" });
    }
};

export const getClaims = async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM claims ORDER BY created_at DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch claims" });
    }
};

export const getClaimById = async (req, res) => {
    try {
        const { id } = req.params;

        const [claim] = await pool.query("SELECT * FROM claims WHERE claim_id = ?", [id]);
        if (claim.length === 0) return res.status(404).json({ error: "Claim not found" });

        const [cptCodes] = await pool.query("SELECT * FROM claim_cpt_codes WHERE claim_id = ?", [id]);
        const [signatures] = await pool.query("SELECT * FROM claim_signatures WHERE claim_id = ?", [id]);
        const [activityLogs] = await pool.query("SELECT * FROM claim_activity_log WHERE claim_id = ?", [id]);

        res.json({
            ...claim[0],
            cptCodes,
            signatures,
            activityLogs
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch claim" });
    }
};

export const deleteClaim = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM claims WHERE claim_id = ?", [id]);
        res.json({ message: `Claim ${id} deleted` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete claim" });
    }
};

export const changeClaimStatus = async (req, res) => {
    try {
        const { status, notes } = req.body;
        const { id } = req.params;

        const validStatuses = ["draft", "submitted", "accepted", "denied", "paid"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        await pool.query("UPDATE claims SET status = ? WHERE claim_id = ?", [status, id]);

        await pool.query(
            "INSERT INTO claim_activity_log (claim_id, activity, status, notes) VALUES (?,?,?,?)",
            [id, `Status changed to ${status}`, status, notes || ""]
        );

        res.json({ message: `Claim ${id} status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Failed to change claim status" });
    }
};

export const addCptCode = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, description, fee, units, modifiers, dx_pointers, ndc } = req.body;

        const [result] = await pool.query(
            `INSERT INTO claim_cpt_codes 
      (claim_id, code, description, fee, units, modifiers, dx_pointers, ndc) 
      VALUES (?,?,?,?,?,?,?,?)`,
            [id, code, description, fee, units, JSON.stringify(modifiers), JSON.stringify(dx_pointers), ndc]
        );

        res.status(201).json({ cpt_id: result.insertId, message: "CPT code added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add CPT code" });
    }
};

export const addSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const { provider_on_file, patient_on_file } = req.body;

        const [result] = await pool.query(
            `INSERT INTO claim_signatures (claim_id, provider_on_file, patient_on_file) VALUES (?,?,?)`,
            [id, provider_on_file || false, patient_on_file || false]
        );

        res.status(201).json({ signature_id: result.insertId, message: "Signature added" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add signature" });
    }
};

export const addActivityNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { activity, status, notes } = req.body;

        const [result] = await pool.query(
            `INSERT INTO claim_activity_log (claim_id, activity, status, notes) VALUES (?,?,?,?)`,
            [id, activity, status || "draft", notes || ""]
        );

        res.status(201).json({ log_id: result.insertId, message: "Activity logged" });
    } catch (err) {
        res.status(500).json({ error: "Failed to add activity" });
    }
};
