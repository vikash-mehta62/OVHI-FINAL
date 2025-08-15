-- Auto Specialty Templates Database Schema
-- Run this SQL to create the required tables for automatic specialty-based template assignment

-- Specialty template configuration for each provider
CREATE TABLE IF NOT EXISTS specialty_template_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  auto_template_assignment BOOLEAN DEFAULT TRUE,
  default_templates JSON, -- Array of template IDs that are default for this specialty
  custom_templates JSON, -- Array of custom template IDs created by this user
  ai_suggestions_enabled BOOLEAN DEFAULT TRUE,
  template_preferences JSON, -- Visit types, required fields, billing integration settings
  ai_settings JSON, -- AI enhancement preferences
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_specialty (user_id, specialty),
  INDEX idx_specialty (specialty),
  INDEX idx_auto_assignment (auto_template_assignment)
);

-- User template assignments (tracks which templates are auto-assigned to users)
CREATE TABLE IF NOT EXISTS user_template_assignments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  template_id INT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  is_auto_assigned BOOLEAN DEFAULT FALSE,
  assignment_reason VARCHAR(255), -- Why this template was assigned (specialty match, AI recommendation, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_template (user_id, template_id),
  INDEX idx_user_specialty (user_id, specialty),
  INDEX idx_auto_assigned (is_auto_assigned)
);

-- Enhanced encounter templates table (extends existing if needed)
-- Add columns to existing encounter_templates table if they don't exist
ALTER TABLE encounter_templates 
ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT FALSE AFTER is_private,
ADD COLUMN IF NOT EXISTS auto_assign_rules JSON AFTER is_universal,
ADD COLUMN IF NOT EXISTS specialty_score DECIMAL(3,2) DEFAULT 0.00 AFTER auto_assign_rules,
ADD COLUMN IF NOT EXISTS context_tags JSON AFTER specialty_score,
ADD COLUMN IF NOT EXISTS ai_enhanced BOOLEAN DEFAULT FALSE AFTER context_tags,
ADD COLUMN IF NOT EXISTS cloned_from INT NULL AFTER ai_enhanced,
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1 AFTER cloned_from;

-- Template usage tracking (enhanced)
CREATE TABLE IF NOT EXISTS encounter_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  provider_id INT NOT NULL,
  patient_id INT,
  encounter_id INT,
  usage_context JSON, -- Visit type, chief complaint, patient demographics, etc.
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  completion_time_seconds INT,
  modifications_made JSON, -- What parts of the template were modified
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_template_usage (template_id, last_used),
  INDEX idx_provider_usage (provider_id, last_used),
  INDEX idx_rating (rating)
);

-- Template analytics and performance metrics
CREATE TABLE IF NOT EXISTS template_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  visit_type VARCHAR(100),
  total_uses INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  avg_completion_time INT DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage of successful uses
  modification_rate DECIMAL(5,2) DEFAULT 0.00, -- How often template is modified
  created_by INT,
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
  UNIQUE KEY unique_template_analytics (template_id),
  INDEX idx_specialty_analytics (specialty, avg_rating),
  INDEX idx_performance (success_rate, avg_rating)
);

-- AI recommendations log
CREATE TABLE IF NOT EXISTS ai_template_recommendations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  visit_type VARCHAR(100),
  chief_complaint TEXT,
  patient_context JSON,
  recommended_templates JSON, -- Array of template IDs with confidence scores
  recommendation_reason TEXT,
  user_action VARCHAR(50), -- accepted, rejected, modified
  feedback_rating INT CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_recommendations (user_id, created_at),
  INDEX idx_specialty_recommendations (specialty, created_at),
  INDEX idx_user_action (user_action)
);

-- Template version history (for tracking changes)
CREATE TABLE IF NOT EXISTS template_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  version_number INT NOT NULL,
  template_data JSON NOT NULL, -- Complete template data at this version
  change_summary TEXT,
  changed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_template_version (template_id, version_number),
  INDEX idx_template_versions (template_id, version_number DESC)
);

-- Specialty-specific template categories
CREATE TABLE IF NOT EXISTS specialty_template_categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  specialty VARCHAR(100) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  category_description TEXT,
  default_visit_types JSON,
  required_fields JSON,
  suggested_billing_codes JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_specialty_category (specialty, category_name),
  INDEX idx_specialty_categories (specialty, is_active)
);

-- Insert default specialty configurations
INSERT IGNORE INTO specialty_template_categories (specialty, category_name, category_description, default_visit_types, required_fields, suggested_billing_codes) VALUES
('Primary Care', 'Preventive Care', 'Annual physicals and preventive care visits', 
 '["Annual/Preventive", "Wellness Visit", "Physical Exam"]',
 '["vital_signs", "review_of_systems", "physical_exam", "health_maintenance"]',
 '["99396", "99397", "99385", "99386"]'),

('Primary Care', 'Acute Care', 'Sick visits and acute medical problems',
 '["Sick Visit", "Acute Care", "Urgent"]',
 '["chief_complaint", "history_present_illness", "physical_exam", "assessment_plan"]',
 '["99213", "99214", "99212"]'),

('Cardiology', 'Consultation', 'New patient cardiology consultations',
 '["New Consultation", "Referral"]',
 '["chief_complaint", "cardiac_history", "cardiac_exam", "diagnostic_plan"]',
 '["99243", "99244", "99245"]'),

('Cardiology', 'Follow-up', 'Established patient cardiology follow-ups',
 '["Follow-up", "Established Patient"]',
 '["interval_history", "cardiac_exam", "medication_review", "plan"]',
 '["99213", "99214", "99215"]'),

('Mental Health', 'Initial Evaluation', 'Initial psychiatric evaluations',
 '["Initial Evaluation", "New Patient"]',
 '["psychiatric_history", "mental_status_exam", "risk_assessment", "treatment_plan"]',
 '["90791", "90792"]'),

('Mental Health', 'Therapy Session', 'Individual therapy sessions',
 '["Therapy Session", "Psychotherapy"]',
 '["session_notes", "therapeutic_interventions", "progress_assessment", "homework"]',
 '["90834", "90837", "90847"]'),

('Neurology', 'Consultation', 'Neurological consultations',
 '["New Consultation", "Referral"]',
 '["neurological_history", "neurological_exam", "cognitive_assessment", "diagnostic_plan"]',
 '["99243", "99244", "99245"]'),

('Urgent Care', 'Acute Visit', 'Urgent care acute visits',
 '["Acute Visit", "Walk-in", "Urgent"]',
 '["chief_complaint", "focused_history", "focused_exam", "disposition"]',
 '["99213", "99214", "99282", "99283"]'),

('Dermatology', 'Skin Examination', 'Comprehensive skin examinations',
 '["Skin Exam", "Screening", "New Patient"]',
 '["skin_history", "full_body_exam", "lesion_assessment", "recommendations"]',
 '["99213", "99214", "11100", "11101"]');

-- Insert default encounter templates for each specialty
INSERT IGNORE INTO encounter_templates (
  template_name, specialty, visit_type, procedure_type, 
  soap_structure, billing_codes, created_by, is_active, 
  is_private, is_universal, ai_enhanced, created_at
) VALUES
-- Primary Care Templates
('Annual Physical Exam', 'Primary Care', 'Annual/Preventive', 'Preventive Care',
 '{"subjective": "Review of systems, current medications, allergies, social history, family history", "objective": "Vital signs, complete physical examination, age-appropriate screening", "assessment": "Overall health assessment, risk factor identification", "plan": "Preventive care recommendations, immunizations, follow-up scheduling"}',
 '{"primary_cpt": "99396", "secondary_cpts": [], "icd10_codes": ["Z00.00"]}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

('Sick Visit - Acute', 'Primary Care', 'Sick Visit', 'Acute Care',
 '{"subjective": "Chief complaint, history of present illness, associated symptoms, pertinent review of systems", "objective": "Vital signs, focused physical examination based on chief complaint", "assessment": "Clinical impression and differential diagnosis", "plan": "Treatment plan, medications, patient education, follow-up instructions"}',
 '{"primary_cpt": "99213", "secondary_cpts": [], "icd10_codes": []}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

-- Cardiology Templates
('Cardiac Consultation', 'Cardiology', 'New Consultation', 'Consultation',
 '{"subjective": "Cardiac history, chest pain characteristics, dyspnea, palpitations, syncope, family history", "objective": "Vital signs, cardiac examination, peripheral vascular exam, relevant diagnostic results", "assessment": "Cardiac risk assessment, differential diagnosis", "plan": "Diagnostic workup, treatment recommendations, lifestyle modifications, follow-up"}',
 '{"primary_cpt": "99244", "secondary_cpts": [], "icd10_codes": []}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

-- Mental Health Templates
('Initial Psychiatric Evaluation', 'Mental Health', 'Initial Evaluation', 'Evaluation',
 '{"subjective": "Chief complaint, psychiatric history, substance use history, social history, family psychiatric history", "objective": "Mental status examination, appearance, behavior, speech, mood, affect, thought process", "assessment": "Psychiatric diagnosis, risk assessment, functional assessment", "plan": "Treatment plan, medication recommendations, therapy referrals, safety planning"}',
 '{"primary_cpt": "90791", "secondary_cpts": [], "icd10_codes": []}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

-- Neurology Templates
('Headache Evaluation', 'Neurology', 'New Consultation', 'Consultation',
 '{"subjective": "Headache characteristics, triggers, associated symptoms, neurological history", "objective": "Neurological examination, cranial nerves, motor, sensory, reflexes, coordination", "assessment": "Headache classification, differential diagnosis", "plan": "Diagnostic workup, treatment plan, lifestyle modifications, follow-up"}',
 '{"primary_cpt": "99244", "secondary_cpts": [], "icd10_codes": ["G44.1"]}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

-- Urgent Care Templates
('Minor Injury Assessment', 'Urgent Care', 'Acute Visit', 'Injury Assessment',
 '{"subjective": "Mechanism of injury, pain level, functional limitations, tetanus status", "objective": "Vital signs, focused examination of injured area, range of motion, neurovascular assessment", "assessment": "Injury assessment, complications evaluation", "plan": "Treatment plan, wound care, pain management, activity restrictions, follow-up"}',
 '{"primary_cpt": "99283", "secondary_cpts": [], "icd10_codes": []}',
 1, TRUE, FALSE, TRUE, TRUE, NOW()),

-- Dermatology Templates
('Skin Cancer Screening', 'Dermatology', 'Screening', 'Screening',
 '{"subjective": "Skin cancer history, family history, sun exposure, changes in moles or lesions", "objective": "Complete skin examination, documentation of lesions, dermoscopy findings", "assessment": "Skin cancer risk assessment, lesion evaluation", "plan": "Biopsy recommendations, sun protection counseling, follow-up scheduling"}',
 '{"primary_cpt": "99214", "secondary_cpts": ["11100"], "icd10_codes": ["Z12.83"]}',
 1, TRUE, FALSE, TRUE, TRUE, NOW());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_templates_specialty_active ON encounter_templates(specialty, is_active);
CREATE INDEX IF NOT EXISTS idx_templates_visit_type ON encounter_templates(visit_type);
CREATE INDEX IF NOT EXISTS idx_templates_ai_enhanced ON encounter_templates(ai_enhanced);
CREATE INDEX IF NOT EXISTS idx_templates_universal ON encounter_templates(is_universal);

-- Create triggers to update analytics when templates are used
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_template_analytics_after_usage
AFTER INSERT ON encounter_usage
FOR EACH ROW
BEGIN
  INSERT INTO template_analytics (template_id, specialty, visit_type, total_uses, unique_users, created_by)
  SELECT 
    NEW.template_id,
    et.specialty,
    et.visit_type,
    1,
    1,
    et.created_by
  FROM encounter_templates et
  WHERE et.id = NEW.template_id
  ON DUPLICATE KEY UPDATE
    total_uses = total_uses + 1,
    unique_users = (
      SELECT COUNT(DISTINCT provider_id) 
      FROM encounter_usage 
      WHERE template_id = NEW.template_id
    ),
    avg_rating = (
      SELECT AVG(rating) 
      FROM encounter_usage 
      WHERE template_id = NEW.template_id AND rating IS NOT NULL
    ),
    avg_completion_time = (
      SELECT AVG(completion_time_seconds) 
      FROM encounter_usage 
      WHERE template_id = NEW.template_id AND completion_time_seconds IS NOT NULL
    ),
    last_calculated = NOW(),
    updated_at = NOW();
END //

DELIMITER ;

-- Insert default specialty configurations for existing users
INSERT IGNORE INTO specialty_template_config (user_id, specialty, auto_template_assignment, ai_suggestions_enabled, template_preferences, ai_settings)
SELECT 
  up.fk_userid,
  up.specialty,
  TRUE,
  TRUE,
  JSON_OBJECT(
    'visit_types', JSON_ARRAY('New Patient', 'Established Patient', 'Follow-up'),
    'required_fields', JSON_ARRAY('chief_complaint', 'history_present_illness', 'physical_exam'),
    'billing_integration', TRUE
  ),
  JSON_OBJECT(
    'content_suggestions', TRUE,
    'billing_code_suggestions', TRUE,
    'contextual_recommendations', TRUE,
    'learning_enabled', TRUE
  )
FROM user_profiles up
WHERE up.specialty IS NOT NULL AND up.specialty != '';