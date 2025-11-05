-- Add is_favorite column to patient_diagnoses table
-- Migration: add-is-favorite-to-patient-diagnoses
-- Date: 2025-11-04

ALTER TABLE patient_diagnoses 
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE AFTER status;

-- Update existing records to set is_favorite to FALSE if NULL
UPDATE patient_diagnoses 
SET is_favorite = FALSE 
WHERE is_favorite IS NULL;

-- Optional: Add index for faster queries on favorite diagnoses
CREATE INDEX idx_patient_diagnoses_is_favorite ON patient_diagnoses(patient_id, is_favorite);

SELECT 'Migration completed: is_favorite column added to patient_diagnoses table' AS status;
