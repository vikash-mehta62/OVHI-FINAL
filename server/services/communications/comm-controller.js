import express from "express";
import db from "../config/db.js"; // your MySQL connection pool
import Joi from "joi";

const router = express.Router();

// Validation schema
const campaignSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow(null, ""),
  segment_id: Joi.number().integer().required(),
  steps: Joi.array().items(
    Joi.object({
      offset_days: Joi.number().integer().required(),
      template_id: Joi.number().integer().required(),
      channel: Joi.string().valid("sms", "email", "voice").required(),
    })
  ).required(),
  ab_variants: Joi.object({
    variants: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        subject_variants: Joi.array().items(Joi.string()).min(1).required(),
      })
    ).min(1).required(),
  }).required(),
  organization_id: Joi.number().integer().required(),
  created_by: Joi.number().integer().required(),
  status: Joi.string().valid("draft", "active", "paused", "completed").default("draft"),
  start_date: Joi.date().required()
});

// POST /api/campaigns
router.post("/", async (req, res) => {
  try {
    // Validate body
    const { error, value } = campaignSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const {
      name, description, segment_id, steps, ab_variants,
      organization_id, created_by, status, start_date
    } = value;

    const sql = `
      INSERT INTO comm_campaigns 
      (name, description, segment_id, steps, ab_variants, organization_id, created_by, status, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(sql, [
      name,
      description,
      segment_id,
      JSON.stringify(steps),       // store as JSON
      JSON.stringify(ab_variants), // store as JSON
      organization_id,
      created_by,
      status,
      start_date
    ]);

    res.status(201).json({
      message: "Campaign created successfully",
      campaign_id: result.insertId
    });

  } catch (err) {
    console.error("Error creating campaign:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
