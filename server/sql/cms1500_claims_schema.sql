-- CMS-1500 Claims Processing Schema
-- This schema supports complete CMS-1500 form processing and submission

-- =====================================================
-- CMS-1500 CLAIMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS cms1500_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    payer_id INT,
    total_charges DECIMAL(10,2) NOT NULL,
    
    -- JSON fields for form data
    patient_info JSON NOT NULL,
    insurance_info JSON NOT NULL,
    provider_info JSON NOT NULL,
    service_lines JSON NOT NULL,
    diagnosis_codes JSON NOT NULL,
    claim_info JSON,
    
    -- Submission tracking
    status ENUM('draft', 'pending', 'submitted', 'accepted', 'rejected', 'paid', 'corrected') DEFAULT 'draft',
    submission_id VARCHAR(100),
    clearinghouse_response JSON,
    pdf_path VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    processed_at TIMESTAMP NULL,
    
    -- Correction tracking
    original_claim_id INT,
    correction_sequence INT DEFAULT 0,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (original_claim_id) REFERENCES cms1500_claims(id) ON DELETE SET NULL,
    
    INDEX idx_claim_number (claim_number),
    INDEX idx_patient_provider (patient_id, provider_id),
    INDEX idx_status (status),
    INDEX idx_submitted_date (submitted_at),
    INDEX idx_provider_status (provider_id, status)
);

-- =====================================================
-- CLAIM STATUS UPDATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_status_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    update_reason TEXT,
    updated_by INT,
    clearinghouse_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES cms1500_claims(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_claim_date (claim_id, created_at),
    INDEX idx_status (new_status)
);

-- =====================================================
-- MEDICAL CODING TABLES
-- =====================================================

-- CPT Codes Table
CREATE TABLE IF NOT EXISTS cpt_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(100),
    relative_value_units DECIMAL(6,2),
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_active (is_active)
);

-- ICD-10 Diagnosis Codes Table
CREATE TABLE IF NOT EXISTS icd10_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(100),
    is_billable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE,
    termination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_category (category),
    INDEX idx_billable (is_billable),
    INDEX idx_active (is_active)
);

-- =====================================================
-- CLEARINGHOUSE CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS clearinghouse_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    endpoint_url VARCHAR(500) NOT NULL,
    api_key_encrypted VARBINARY(255),
    username VARCHAR(100),
    password_encrypted VARBINARY(255),
    supported_formats JSON,
    is_active BOOLEAN DEFAULT TRUE,
    test_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active)
);

-- =====================================================
-- CLAIM VALIDATION RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_validation_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(100) NOT NULL,
    rule_type ENUM('required_field', 'format_validation', 'business_rule', 'payer_specific') NOT NULL,
    payer_id INT,
    field_path VARCHAR(200),
    validation_pattern VARCHAR(500),
    error_message TEXT NOT NULL,
    severity ENUM('error', 'warning', 'info') DEFAULT 'error',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id) ON DELETE CASCADE,
    
    INDEX idx_rule_type (rule_type),
    INDEX idx_payer (payer_id),
    INDEX idx_active (is_active)
);

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Insert sample CPT codes
INSERT IGNORE INTO cpt_codes (code, description, category) VALUES
('99213', 'Office or other outpatient visit for the evaluation and management of an established patient', 'Evaluation and Management'),
('99214', 'Office or other outpatient visit for the evaluation and management of an established patient', 'Evaluation and Management'),
('99215', 'Office or other outpatient visit for the evaluation and management of an established patient', 'Evaluation and Management'),
('99201', 'Office or other outpatient visit for the evaluation and management of a new patient', 'Evaluation and Management'),
('99202', 'Office or other outpatient visit for the evaluation and management of a new patient', 'Evaluation and Management'),
('36415', 'Collection of venous blood by venipuncture', 'Laboratory'),
('80053', 'Comprehensive metabolic panel', 'Laboratory'),
('85025', 'Blood count; complete (CBC), automated', 'Laboratory');

-- Insert sample ICD-10 codes
INSERT IGNORE INTO icd10_codes (code, description, category, is_billable) VALUES
('I10', 'Essential (primary) hypertension', 'Circulatory System', TRUE),
('E11.9', 'Type 2 diabetes mellitus without complications', 'Endocrine System', TRUE),
('Z00.00', 'Encounter for general adult medical examination without abnormal findings', 'Health Status', TRUE),
('M79.3', 'Panniculitis, unspecified', 'Musculoskeletal System', TRUE),
('R06.02', 'Shortness of breath', 'Symptoms and Signs', TRUE),
('K21.9', 'Gastro-esophageal reflux disease without esophagitis', 'Digestive System', TRUE);

-- Insert sample validation rules
INSERT IGNORE INTO claim_validation_rules (rule_name, rule_type, field_path, validation_pattern, error_message) VALUES
('NPI Format', 'format_validation', 'providerInfo.npi', '^\\d{10}$', 'NPI must be exactly 10 digits'),
('CPT Code Format', 'format_validation', 'serviceLines[].cptCode', '^\\d{5}$', 'CPT code must be exactly 5 digits'),
('Patient DOB Required', 'required_field', 'patientInfo.dateOfBirth', '', 'Patient date of birth is required'),
('Service Date Required', 'required_field', 'serviceLines[].serviceDate', '', 'Service date is required for all service lines'),
('Diagnosis Code Required', 'required_field', 'diagnosisCodes[].code', '', 'At least one diagnosis code is required');

-- Insert sample clearinghouse config (for development)
INSERT IGNORE INTO clearinghouse_configs (name, endpoint_url, supported_formats, test_mode) VALUES
('Test Clearinghouse', 'https://api.testclearinghouse.com/v1/claims', '["X12", "CMS1500"]', TRUE);