-- Smart Encounter Templates Database Schema
-- Enhanced schema for intelligent template management

-- Enhanced encounter templates table
CREATE TABLE IF NOT EXISTS encounter_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_name VARCHAR(255) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  visit_type VARCHAR(100) NOT NULL,
  procedure_type VARCHAR(100),
  care_management_type VARCHAR(100),
  soap_structure JSON NOT NULL,
  billing_codes JSON,
  custom_fields JSON,
  created_by INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  is_private BOOLEAN DEFAULT FALSE,
  share_with_practice BOOLEAN DEFAULT FALSE,
  is_universal BOOLEAN DEFAULT FALSE, -- Templates available to all specialties
  tags JSON, -- Array of tags for better searchability
  ai_enhanced BOOLEAN DEFAULT FALSE,
  cloned_from INT, -- Reference to original template if cloned
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (cloned_from) REFERENCES encounter_templates(id) ON DELETE SET NULL,
  INDEX idx_specialty_visit (specialty, visit_type),
  INDEX idx_created_by (created_by),
  INDEX idx_active_public (is_active, is_private),
  FULLTEXT idx_search (template_name, tags)
);

-- Template usage tracking and ratings
CREATE TABLE IF NOT EXISTS encounter_usage (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  provider_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  usage_context JSON, -- Context when template was used
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_template (template_id, provider_id),
  INDEX idx_template_rating (template_id, rating),
  INDEX idx_provider_usage (provider_id, last_used)
);

-- Template analytics and insights
CREATE TABLE IF NOT EXISTS template_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  created_by INT NOT NULL,
  specialty VARCHAR(100),
  visit_type VARCHAR(100),
  usage_count INT DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0.00,
  last_analytics_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_specialty_analytics (specialty, avg_rating),
  INDEX idx_usage_analytics (usage_count, avg_rating)
);

-- Practice-specific template settings
CREATE TABLE IF NOT EXISTS practice_template_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  practice_id INT NOT NULL,
  provider_id INT NOT NULL,
  preferred_specialties JSON, -- Array of preferred specialties
  template_preferences JSON, -- User preferences for template suggestions
  ai_assistance_enabled BOOLEAN DEFAULT TRUE,
  auto_suggest_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_practice_provider (practice_id, provider_id)
);

-- Template categories and specialties
CREATE TABLE IF NOT EXISTS template_specialties (
  id INT PRIMARY KEY AUTO_INCREMENT,
  specialty_name VARCHAR(100) NOT NULL UNIQUE,
  specialty_code VARCHAR(20) NOT NULL UNIQUE,
  parent_specialty_id INT,
  description TEXT,
  common_visit_types JSON, -- Array of common visit types for this specialty
  common_procedures JSON, -- Array of common procedures
  billing_guidelines JSON, -- Specialty-specific billing guidelines
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_specialty_id) REFERENCES template_specialties(id) ON DELETE SET NULL,
  INDEX idx_specialty_active (specialty_name, is_active)
);

-- Template sharing and collaboration
CREATE TABLE IF NOT EXISTS template_sharing (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_with INT, -- Specific user, NULL for practice-wide
  practice_id INT, -- Practice-wide sharing
  permission_level ENUM('view', 'clone', 'edit') DEFAULT 'view',
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (shared_with) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_shared_with (shared_with, is_active),
  INDEX idx_practice_sharing (practice_id, is_active)
);

-- Template version history
CREATE TABLE IF NOT EXISTS template_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  version_number INT NOT NULL,
  soap_structure JSON NOT NULL,
  billing_codes JSON,
  custom_fields JSON,
  change_summary TEXT,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_template_version (template_id, version_number),
  INDEX idx_template_versions (template_id, version_number DESC)
);

-- AI suggestions and improvements
CREATE TABLE IF NOT EXISTS template_ai_suggestions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT NOT NULL,
  suggestion_type ENUM('content', 'billing', 'workflow', 'compliance') NOT NULL,
  suggestion_data JSON NOT NULL,
  confidence_score DECIMAL(3,2), -- AI confidence in suggestion (0.00-1.00)
  status ENUM('pending', 'accepted', 'rejected', 'implemented') DEFAULT 'pending',
  created_by_ai BOOLEAN DEFAULT TRUE,
  reviewed_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  FOREIGN KEY (template_id) REFERENCES encounter_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(user_id) ON DELETE SET NULL,
  INDEX idx_template_suggestions (template_id, status),
  INDEX idx_suggestion_type (suggestion_type, confidence_score)
);

-- Insert default specialties
INSERT IGNORE INTO template_specialties (specialty_name, specialty_code, description, common_visit_types, common_procedures) VALUES
('Primary Care', 'PC', 'General primary care medicine', 
 '["New Patient", "Established Patient", "Annual Physical", "Sick Visit", "Follow-up"]',
 '["Routine Examination", "Immunizations", "Health Screening", "Chronic Disease Management"]'),
 
('Cardiology', 'CARD', 'Cardiovascular medicine and surgery',
 '["Consultation", "Follow-up", "Procedure", "Emergency"]',
 '["Echocardiogram", "Stress Test", "Cardiac Catheterization", "EKG"]'),
 
('Mental Health', 'MH', 'Psychiatry and behavioral health',
 '["Initial Evaluation", "Therapy Session", "Medication Management", "Crisis Intervention"]',
 '["Psychiatric Evaluation", "Psychotherapy", "Medication Review"]'),
 
('Neurology', 'NEURO', 'Neurological disorders and conditions',
 '["Consultation", "Follow-up", "Diagnostic", "Treatment"]',
 '["EEG", "EMG", "Neurological Examination", "Cognitive Assessment"]'),
 
('Urgent Care', 'UC', 'Immediate care for non-emergency conditions',
 '["Acute Illness", "Minor Injury", "Diagnostic", "Treatment"]',
 '["Wound Care", "X-ray", "Lab Tests", "Minor Procedures"]'),
 
('Endocrinology', 'ENDO', 'Hormone and metabolic disorders',
 '["Consultation", "Follow-up", "Diabetes Management", "Hormone Therapy"]',
 '["Glucose Monitoring", "Hormone Testing", "Diabetes Education"]'),
 
('Orthopedics', 'ORTHO', 'Musculoskeletal system disorders',
 '["Consultation", "Follow-up", "Pre-op", "Post-op"]',
 '["Joint Injection", "Casting", "Physical Therapy", "Surgery"]'),
 
('Dermatology', 'DERM', 'Skin, hair, and nail conditions',
 '["Consultation", "Follow-up", "Screening", "Procedure"]',
 '["Skin Biopsy", "Lesion Removal", "Skin Cancer Screening"]'),
 
('Pediatrics', 'PEDS', 'Medical care for infants, children, and adolescents',
 '["Well Child", "Sick Visit", "Immunizations", "Development Check"]',
 '["Growth Assessment", "Developmental Screening", "Immunizations"]'),
 
('OB/GYN', 'OBGYN', 'Women\'s reproductive health',
 '["Annual Exam", "Prenatal", "Postpartum", "Consultation"]',
 '["Pap Smear", "Ultrasound", "Prenatal Care", "Contraception Counseling"]');

-- Insert sample universal templates
INSERT IGNORE INTO encounter_templates (
  template_name, specialty, visit_type, soap_structure, billing_codes, 
  created_by, is_universal, is_private, ai_enhanced
) VALUES 
(
  'General New Patient Visit',
  'General',
  'New Patient',
  '{
    "subjective": "Chief complaint:\\nHistory of present illness:\\nReview of systems:\\nPast medical history:\\nMedications:\\nAllergies:\\nSocial history:\\nFamily history:",
    "objective": "Vital signs:\\nGeneral appearance:\\nPhysical examination:",
    "assessment": "Assessment and clinical impression:",
    "plan": "Treatment plan:\\nFollow-up instructions:\\nPatient education:"
  }',
  '{
    "primaryCpt": "99203",
    "secondaryCpts": [],
    "icd10Codes": []
  }',
  1, -- System user
  TRUE,
  FALSE,
  TRUE
),
(
  'General Follow-up Visit',
  'General', 
  'Follow-up',
  '{
    "subjective": "Interval history:\\nCurrent symptoms:\\nMedication compliance:\\nReview of systems:",
    "objective": "Vital signs:\\nPhysical examination:\\nRelevant findings:",
    "assessment": "Current status:\\nResponse to treatment:",
    "plan": "Continue current treatment:\\nModifications:\\nNext appointment:"
  }',
  '{
    "primaryCpt": "99213",
    "secondaryCpts": [],
    "icd10Codes": []
  }',
  1,
  TRUE,
  FALSE,
  TRUE
);

-- Create indexes for better performance
CREATE INDEX idx_templates_search ON encounter_templates(specialty, visit_type, is_active, is_private);
CREATE INDEX idx_usage_stats ON encounter_usage(template_id, last_used, rating);
CREATE INDEX idx_analytics_performance ON template_analytics(specialty, avg_rating, usage_count);