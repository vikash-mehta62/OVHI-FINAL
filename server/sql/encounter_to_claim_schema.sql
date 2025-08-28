-- Encounter to Claim Workflow Schema
-- This schema supports the complete encounter-to-claim workflow

-- Encounters table (if not exists)
CREATE TABLE IF NOT EXISTS encounters (
    encounter_id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    date_of_service DATE NOT NULL,
    place_of_service VARCHAR(10) NOT NULL,
    chief_complaint TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_id (patient_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_date_of_service (date_of_service)
);

-- Claims table (enhanced for encounter workflow)
CREATE TABLE IF NOT EXISTS claims (
    claim_id VARCHAR(50) PRIMARY KEY,
    encounter_id INT,
    patient_id VARCHAR(50) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    date_of_service DATE NOT NULL,
    place_of_service VARCHAR(10) NOT NULL,
    total_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    validation_score INT DEFAULT 0,
    estimated_reimbursement DECIMAL(10,2) DEFAULT 0.00,
    validation_issues JSON,
    status ENUM('draft', 'validated', 'submitted', 'paid', 'denied', 'rejected') DEFAULT 'draft',
    submitted_at TIMESTAMP NULL,
    submitted_by INT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (encounter_id) REFERENCES encounters(encounter_id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_status (status),
    INDEX idx_date_of_service (date_of_service)
);

-- Claim diagnosis codes
CREATE TABLE IF NOT EXISTS claim_diagnosis_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id VARCHAR(50) NOT NULL,
    icd_code VARCHAR(20) NOT NULL,
    description TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_icd_code (icd_code)
);

-- Claim procedure codes
CREATE TABLE IF NOT EXISTS claim_procedure_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id VARCHAR(50) NOT NULL,
    cpt_code VARCHAR(20) NOT NULL,
    description TEXT,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    modifier VARCHAR(10) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_cpt_code (cpt_code)
);

-- Encounter templates (enhanced)
CREATE TABLE IF NOT EXISTS encounter_templates (
    template_id INT PRIMARY KEY AUTO_INCREMENT,
    template_name VARCHAR(255) NOT NULL,
    encounter_type VARCHAR(100),
    default_reason TEXT,
    default_notes TEXT,
    default_diagnosis_codes JSON,
    default_procedure_codes JSON,
    soap_structure JSON,
    billing_codes JSON,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_by (created_by),
    INDEX idx_encounter_type (encounter_type)
);

-- Provider encounter templates (if not exists)
CREATE TABLE IF NOT EXISTS providers_encounter_template (
    template_id INT PRIMARY KEY AUTO_INCREMENT,
    encounter_name VARCHAR(255) NOT NULL,
    encounter_type VARCHAR(100),
    visit_type VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    soap_structure JSON,
    billing_codes JSON,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_by (created_by),
    INDEX idx_encounter_type (encounter_type)
);

-- Claim validation rules
CREATE TABLE IF NOT EXISTS claim_validation_rules (
    rule_id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(255) NOT NULL,
    rule_type ENUM('error', 'warning', 'info') DEFAULT 'warning',
    condition_json JSON NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Claim audit trail
CREATE TABLE IF NOT EXISTS claim_audit_trail (
    audit_id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changes JSON,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_performed_at (performed_at)
);

-- Insert sample validation rules
INSERT IGNORE INTO claim_validation_rules (rule_name, rule_type, condition_json, message) VALUES
('Missing Diagnosis Code', 'error', '{"field": "diagnosis_codes", "condition": "empty"}', 'At least one diagnosis code is required'),
('Missing Procedure Code', 'error', '{"field": "procedure_codes", "condition": "empty"}', 'At least one procedure code is required'),
('Empty Subjective', 'warning', '{"field": "subjective", "condition": "empty"}', 'Subjective section should not be empty'),
('Empty Objective', 'warning', '{"field": "objective", "condition": "empty"}', 'Objective section should not be empty'),
('High Charge Amount', 'warning', '{"field": "total_charges", "condition": ">", "value": 1000}', 'High charge amount detected - please verify'),
('Missing Place of Service', 'error', '{"field": "place_of_service", "condition": "empty"}', 'Place of service is required');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_encounters_patient_date ON encounters(patient_id, date_of_service);
CREATE INDEX IF NOT EXISTS idx_claims_status_date ON claims(status, date_of_service);
CREATE INDEX IF NOT EXISTS idx_claims_validation_score ON claims(validation_score);

-- Create views for reporting
CREATE OR REPLACE VIEW encounter_claim_summary AS
SELECT 
    e.encounter_id,
    e.patient_id,
    e.provider_id,
    e.date_of_service,
    e.chief_complaint,
    c.claim_id,
    c.status as claim_status,
    c.total_charges,
    c.validation_score,
    c.estimated_reimbursement,
    COUNT(DISTINCT cd.id) as diagnosis_count,
    COUNT(DISTINCT cp.id) as procedure_count
FROM encounters e
LEFT JOIN claims c ON e.encounter_id = c.encounter_id
LEFT JOIN claim_diagnosis_codes cd ON c.claim_id = cd.claim_id
LEFT JOIN claim_procedure_codes cp ON c.claim_id = cp.claim_id
GROUP BY e.encounter_id, c.claim_id;

-- Create view for claim validation summary
CREATE OR REPLACE VIEW claim_validation_summary AS
SELECT 
    c.claim_id,
    c.patient_id,
    c.provider_id,
    c.status,
    c.validation_score,
    c.total_charges,
    c.estimated_reimbursement,
    JSON_LENGTH(c.validation_issues) as issue_count,
    CASE 
        WHEN c.validation_score >= 95 THEN 'Excellent'
        WHEN c.validation_score >= 85 THEN 'Good'
        WHEN c.validation_score >= 70 THEN 'Fair'
        ELSE 'Poor'
    END as validation_grade,
    c.created_at,
    c.submitted_at
FROM claims c;