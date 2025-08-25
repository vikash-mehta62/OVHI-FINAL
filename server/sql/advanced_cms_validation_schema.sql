-- Advanced CMS Validation Schema
-- Database schema updates to support advanced CMS validation features

-- Add CMS validation fields to billings table
ALTER TABLE billings 
ADD COLUMN IF NOT EXISTS cms_validation_status ENUM('pending', 'valid', 'invalid', 'warning', 'review_required') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_errors JSON,
ADD COLUMN IF NOT EXISTS compliance_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_validation_date DATETIME,
ADD COLUMN IF NOT EXISTS medical_necessity_status ENUM('verified', 'requires_review', 'not_established') DEFAULT 'requires_review',
ADD COLUMN IF NOT EXISTS timely_filing_status ENUM('compliant', 'due_soon', 'overdue') DEFAULT 'compliant',
ADD COLUMN IF NOT EXISTS provider_enrollment_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS frequency_limits_checked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payer_compliance_verified BOOLEAN DEFAULT FALSE;

-- Create compliance_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS compliance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT,
    log_type ENUM('cms_validation', 'advanced_cms_validation', 'medical_necessity', 'timely_filing', 'provider_enrollment') NOT NULL,
    compliance_status ENUM('compliant', 'warning', 'non_compliant') NOT NULL,
    details JSON,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_log_type (claim_id, log_type),
    INDEX idx_created_at (created_at),
    INDEX idx_compliance_status (compliance_status)
);

-- Create cms_validation_rules table if it doesn't exist
CREATE TABLE IF NOT EXISTS cms_validation_rules (
    id VARCHAR(50) PRIMARY KEY,
    rule_type ENUM('field_required', 'code_validation', 'date_logic', 'ncci_edit', 'medical_necessity', 'frequency_limit') NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('error', 'warning', 'info') DEFAULT 'error',
    conditions JSON,
    error_message TEXT,
    cms_reference VARCHAR(255),
    suggested_fix TEXT,
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type),
    INDEX idx_active_effective (is_active, effective_date),
    INDEX idx_severity (severity)
);

-- Create medical_necessity_rules table
CREATE TABLE IF NOT EXISTS medical_necessity_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    diagnosis_pattern VARCHAR(255) NOT NULL,
    procedure_codes JSON NOT NULL,
    requirement TEXT,
    severity ENUM('low', 'medium', 'high') DEFAULT 'medium',
    rule_type ENUM('high_risk_combination', 'prior_auth_required', 'age_restriction', 'gender_restriction') NOT NULL,
    conditions JSON,
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type),
    INDEX idx_active (is_active),
    INDEX idx_severity (severity)
);

-- Create frequency_limits table
CREATE TABLE IF NOT EXISTS frequency_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    procedure_code VARCHAR(10) NOT NULL,
    limit_type ENUM('daily', 'annual', 'lifetime', 'age_based') NOT NULL,
    max_units INT NOT NULL,
    time_period VARCHAR(50),
    age_min INT,
    age_max INT,
    description TEXT,
    payer_type VARCHAR(50),
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_procedure_type (procedure_code, limit_type),
    INDEX idx_active (is_active),
    INDEX idx_payer_type (payer_type)
);

-- Create provider_enrollment_status table
CREATE TABLE IF NOT EXISTS provider_enrollment_status (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    npi_number VARCHAR(10) NOT NULL,
    payer_name VARCHAR(255) NOT NULL,
    enrollment_status ENUM('active', 'pending', 'suspended', 'terminated', 'deactivated') NOT NULL,
    enrollment_date DATE,
    termination_date DATE,
    last_verified_date DATETIME,
    verification_source VARCHAR(255),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_payer (provider_id, payer_name),
    INDEX idx_npi_payer (npi_number, payer_name),
    INDEX idx_status (enrollment_status),
    INDEX idx_last_verified (last_verified_date)
);

-- Create payer_specific_rules table
CREATE TABLE IF NOT EXISTS payer_specific_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payer_type VARCHAR(50) NOT NULL,
    rule_category ENUM('required_fields', 'modifiers', 'documentation', 'prior_auth') NOT NULL,
    rule_data JSON NOT NULL,
    description TEXT,
    effective_date DATE,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_payer_category (payer_type, rule_category),
    INDEX idx_active (is_active)
);

-- Insert sample CMS validation rules
INSERT IGNORE INTO cms_validation_rules (id, rule_type, description, severity, conditions, error_message, cms_reference) VALUES
('CMS_001', 'field_required', 'NPI number is required', 'error', '{"field": "npi_number", "required": true}', 'NPI number is required for all claims', 'CMS-1500 Box 24J'),
('CMS_002', 'code_validation', 'NPI number format validation', 'error', '{"field": "npi_number", "pattern": "^\\d{10}$"}', 'NPI number must be exactly 10 digits', 'CMS NPI Registry'),
('CMS_003', 'field_required', 'Provider taxonomy code is required', 'error', '{"field": "taxonomy_code", "required": true}', 'Provider taxonomy code is required', 'CMS-1500 Box 24I'),
('CMS_004', 'field_required', 'Place of service code is required', 'error', '{"field": "place_of_service", "required": true}', 'Place of service code is required', 'CMS-1500 Box 24B'),
('CMS_005', 'field_required', 'Procedure code is required', 'error', '{"field": "procedure_code", "required": true}', 'Procedure code is required', 'CMS-1500 Box 24D'),
('CMS_006', 'field_required', 'Diagnosis code is required', 'error', '{"field": "diagnosis_code", "required": true}', 'Diagnosis code is required', 'CMS-1500 Box 21');

-- Insert sample medical necessity rules
INSERT IGNORE INTO medical_necessity_rules (diagnosis_pattern, procedure_codes, requirement, severity, rule_type, conditions) VALUES
('^Z51\\.(0|1)', '["96413", "96415", "77301", "77338"]', 'Oncology treatment plan required', 'high', 'high_risk_combination', '{"documentation_required": true}'),
('^M79\\.[0-9]', '["20610", "20611", "76942"]', 'Conservative treatment documentation required', 'medium', 'high_risk_combination', '{"prior_treatment_required": true}'),
('^S72\\.[0-9]', '["27245", "27246", "27248"]', 'Surgical necessity documentation required', 'high', 'high_risk_combination', '{"operative_report_required": true}');

-- Insert sample frequency limits
INSERT IGNORE INTO frequency_limits (procedure_code, limit_type, max_units, description) VALUES
('99213', 'annual', 12, 'Office visits limited to 12 per year for routine care'),
('76700', 'annual', 2, 'Abdominal ultrasound limited to 2 per year'),
('90834', 'daily', 1, 'Psychotherapy limited to 1 session per day'),
('97110', 'daily', 4, 'Physical therapy units limited to 4 per day'),
('27447', 'lifetime', 2, 'Total knee replacement limited to 2 per lifetime per knee');

-- Insert sample payer-specific rules
INSERT IGNORE INTO payer_specific_rules (payer_type, rule_category, rule_data, description) VALUES
('Medicare', 'required_fields', '["patient_medicare_number", "provider_npi", "place_of_service", "diagnosis_codes"]', 'Required fields for Medicare claims'),
('Medicaid', 'required_fields', '["patient_medicaid_number", "provider_medicaid_id", "prior_authorization_number"]', 'Required fields for Medicaid claims'),
('Commercial', 'required_fields', '["patient_member_id", "group_number", "authorization_number"]', 'Required fields for Commercial claims');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billings_cms_validation ON billings(cms_validation_status, last_validation_date);
CREATE INDEX IF NOT EXISTS idx_billings_compliance_score ON billings(compliance_score);
CREATE INDEX IF NOT EXISTS idx_billings_medical_necessity ON billings(medical_necessity_status);
CREATE INDEX IF NOT EXISTS idx_billings_timely_filing ON billings(timely_filing_status);

-- Create view for validation summary
CREATE OR REPLACE VIEW validation_summary AS
SELECT 
    b.id as claim_id,
    b.cms_validation_status,
    b.compliance_score,
    b.medical_necessity_status,
    b.timely_filing_status,
    b.provider_enrollment_verified,
    b.frequency_limits_checked,
    b.payer_compliance_verified,
    b.last_validation_date,
    p.first_name,
    p.last_name,
    pr.npi_number as provider_npi,
    i.insurance_name
FROM billings b
LEFT JOIN patients p ON b.patient_id = p.id
LEFT JOIN providers pr ON b.provider_id = pr.id
LEFT JOIN patient_insurance i ON p.id = i.patient_id AND i.is_primary = 1;

-- Create view for compliance metrics
CREATE OR REPLACE VIEW compliance_metrics AS
SELECT 
    DATE(created_at) as validation_date,
    log_type,
    compliance_status,
    COUNT(*) as validation_count,
    AVG(JSON_EXTRACT(details, '$.compliance_score')) as avg_compliance_score,
    AVG(JSON_EXTRACT(details, '$.risk_assessment.risk_score')) as avg_risk_score
FROM compliance_logs 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at), log_type, compliance_status
ORDER BY validation_date DESC, log_type;