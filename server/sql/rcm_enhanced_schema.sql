-- Enhanced RCM System Schema
-- Patient Statements, Claim Validation, and Auto-Corrections

-- Patient Statements Table
CREATE TABLE IF NOT EXISTS patient_statements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  statement_id VARCHAR(50) UNIQUE,
  statement_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('draft', 'generated', 'sent', 'paid', 'partial_paid') DEFAULT 'draft',
  send_method ENUM('email', 'mail', 'portal') NULL,
  sent_date DATETIME NULL,
  payment_received_date DATETIME NULL,
  custom_message TEXT,
  pdf_path VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_statement (patient_id, statement_date),
  INDEX idx_provider_statement (provider_id, statement_date),
  INDEX idx_statement_status (status, statement_date)
);

-- Claim Validation Results Table
CREATE TABLE IF NOT EXISTS claim_validations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  provider_id INT NOT NULL,
  validation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  overall_score INT NOT NULL DEFAULT 0,
  max_score INT NOT NULL DEFAULT 100,
  approval_probability INT NOT NULL DEFAULT 0,
  validation_results JSON,
  issues_found JSON,
  suggestions JSON,
  warnings JSON,
  status ENUM('pending', 'validated', 'corrected', 'submitted') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_claim_validation (claim_id, validation_date),
  INDEX idx_provider_validation (provider_id, validation_date),
  INDEX idx_validation_score (overall_score, approval_probability),
  FOREIGN KEY (claim_id) REFERENCES cpt_billing(id) ON DELETE CASCADE
);

-- Auto-Correction Suggestions Table
CREATE TABLE IF NOT EXISTS auto_corrections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claim_id INT NOT NULL,
  provider_id INT NOT NULL,
  correction_type ENUM('follow_up', 'appeal', 'submit', 'update', 'review') NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  message TEXT NOT NULL,
  suggested_action VARCHAR(100),
  is_automated BOOLEAN DEFAULT FALSE,
  status ENUM('pending', 'applied', 'dismissed', 'completed') DEFAULT 'pending',
  applied_date DATETIME NULL,
  applied_by INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_claim_correction (claim_id, status),
  INDEX idx_provider_correction (provider_id, priority, status),
  INDEX idx_correction_type (correction_type, priority),
  FOREIGN KEY (claim_id) REFERENCES cpt_billing(id) ON DELETE CASCADE
);

-- Claim Suggestions Table
CREATE TABLE IF NOT EXISTS claim_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  diagnosis_code VARCHAR(20) NOT NULL,
  suggested_cpt_code VARCHAR(10) NOT NULL,
  suggestion_reason TEXT,
  confidence_score INT DEFAULT 70,
  frequency_used INT DEFAULT 0,
  last_suggested DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'used', 'dismissed') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_suggestion (patient_id, diagnosis_code),
  INDEX idx_provider_suggestion (provider_id, confidence_score),
  INDEX idx_suggestion_cpt (suggested_cpt_code, confidence_score)
);

-- Enhanced CPT Codes with additional validation fields
ALTER TABLE cpt_codes 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS requires_auth BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS age_restrictions VARCHAR(50),
ADD COLUMN IF NOT EXISTS gender_restrictions ENUM('M', 'F', 'both') DEFAULT 'both',
ADD COLUMN IF NOT EXISTS frequency_limit INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS valid_from DATE,
ADD COLUMN IF NOT EXISTS valid_to DATE,
ADD COLUMN IF NOT EXISTS modifier_required BOOLEAN DEFAULT FALSE;

-- Diagnosis-CPT Compatibility Rules
CREATE TABLE IF NOT EXISTS diagnosis_cpt_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  diagnosis_pattern VARCHAR(20) NOT NULL,
  cpt_code VARCHAR(10) NOT NULL,
  compatibility_score INT DEFAULT 100,
  medical_necessity ENUM('required', 'appropriate', 'questionable', 'inappropriate') DEFAULT 'appropriate',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_diagnosis_pattern (diagnosis_pattern),
  INDEX idx_cpt_compatibility (cpt_code, compatibility_score)
);

-- Payer-specific rules
CREATE TABLE IF NOT EXISTS payer_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payer_name VARCHAR(100) NOT NULL,
  cpt_code VARCHAR(10),
  diagnosis_code VARCHAR(20),
  rule_type ENUM('coverage', 'prior_auth', 'frequency', 'age_limit', 'gender_limit') NOT NULL,
  rule_value VARCHAR(200),
  effective_date DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_payer_rules (payer_name, rule_type),
  INDEX idx_payer_cpt (payer_name, cpt_code),
  INDEX idx_payer_diagnosis (payer_name, diagnosis_code)
);

-- Statement line items for detailed billing
CREATE TABLE IF NOT EXISTS statement_line_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  statement_id INT NOT NULL,
  billing_id INT NOT NULL,
  service_date DATE NOT NULL,
  cpt_code VARCHAR(10) NOT NULL,
  service_description TEXT,
  units INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_charge DECIMAL(10,2) NOT NULL,
  insurance_payment DECIMAL(10,2) DEFAULT 0.00,
  patient_payment DECIMAL(10,2) DEFAULT 0.00,
  adjustment DECIMAL(10,2) DEFAULT 0.00,
  balance DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_statement_items (statement_id),
  INDEX idx_billing_items (billing_id),
  FOREIGN KEY (statement_id) REFERENCES patient_statements(id) ON DELETE CASCADE,
  FOREIGN KEY (billing_id) REFERENCES cpt_billing(id) ON DELETE CASCADE
);

-- Audit trail for corrections and suggestions
CREATE TABLE IF NOT EXISTS rcm_audit_trail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type ENUM('claim', 'statement', 'correction', 'suggestion') NOT NULL,
  entity_id INT NOT NULL,
  action ENUM('create', 'update', 'delete', 'validate', 'send', 'apply') NOT NULL,
  user_id INT NOT NULL,
  old_values JSON,
  new_values JSON,
  notes TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_user (user_id, created_at),
  INDEX idx_audit_action (action, created_at)
);

-- Insert sample diagnosis-CPT compatibility rules
INSERT INTO diagnosis_cpt_rules (diagnosis_pattern, cpt_code, compatibility_score, medical_necessity, notes) VALUES
-- Mental Health
('F32%', '90834', 100, 'required', 'Psychotherapy appropriate for depression'),
('F32%', '90837', 95, 'appropriate', 'Extended therapy for severe depression'),
('F32%', '90791', 100, 'required', 'Initial psychiatric evaluation'),
('F33%', '90834', 100, 'required', 'Psychotherapy for recurrent depression'),
('F41%', '90834', 100, 'required', 'Psychotherapy for anxiety disorders'),
('F43%', '90834', 95, 'appropriate', 'Psychotherapy for PTSD'),
('F90%', '96116', 100, 'required', 'Neurobehavioral assessment for ADHD'),
('F90%', '90834', 90, 'appropriate', 'Behavioral therapy for ADHD'),
('F84%', '96118', 100, 'required', 'Neuropsychological testing for autism'),

-- General Medical
('Z00%', '99213', 90, 'appropriate', 'Routine examination'),
('Z00%', '99214', 85, 'appropriate', 'Comprehensive examination'),
('I10%', '99213', 95, 'appropriate', 'Hypertension management'),
('E11%', '99214', 95, 'appropriate', 'Diabetes management'),

-- Preventive Care
('Z12%', '99213', 90, 'appropriate', 'Screening examination'),
('Z13%', '99213', 90, 'appropriate', 'Screening examination')

ON DUPLICATE KEY UPDATE 
  compatibility_score = VALUES(compatibility_score),
  medical_necessity = VALUES(medical_necessity),
  notes = VALUES(notes);

-- Insert sample payer rules
INSERT INTO payer_rules (payer_name, cpt_code, rule_type, rule_value, is_active) VALUES
('Medicare', '90837', 'frequency', 'max_2_per_week', TRUE),
('Medicare', '96118', 'prior_auth', 'required', TRUE),
('Medicaid', '90834', 'frequency', 'max_1_per_week', TRUE),
('Blue Cross Blue Shield', '96116', 'prior_auth', 'required_for_under_18', TRUE),
('Aetna', '90791', 'frequency', 'max_1_per_year', TRUE),
('UnitedHealthcare', '99215', 'prior_auth', 'required_for_new_patients', TRUE)

ON DUPLICATE KEY UPDATE 
  rule_value = VALUES(rule_value),
  is_active = VALUES(is_active);

-- Update CPT codes with enhanced validation data
UPDATE cpt_codes SET 
  is_active = TRUE,
  requires_auth = FALSE,
  gender_restrictions = 'both',
  valid_from = '2024-01-01'
WHERE id > 0;

-- Set specific requirements for certain codes
UPDATE cpt_codes SET requires_auth = TRUE WHERE code IN ('96118', '96116');
UPDATE cpt_codes SET frequency_limit = 2 WHERE code = '90837';
UPDATE cpt_codes SET frequency_limit = 1 WHERE code = '90791';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cpt_billing_patient_status ON cpt_billing(patient_id, status, created);
CREATE INDEX IF NOT EXISTS idx_cpt_billing_provider_date ON cpt_billing(created, status);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_patient_date ON patient_diagnoses(patient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_patient_claims_patient ON patient_claims(patient_id, status);

-- Summary of enhancements
SELECT 'Enhanced RCM Schema Installation Complete!' as Status,
       'Added patient statements, claim validation, auto-corrections, and intelligent suggestions' as Features;