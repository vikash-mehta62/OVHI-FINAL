-- Enhanced Patient Profile Schema
-- Implements critical gaps identified in the Patient Profile audit
-- Version: 1.0.0
-- Date: 2025-08-16T12:41:09.333Z

-- =====================================================
-- ENHANCED USER PROFILES TABLE
-- =====================================================

-- Add new columns to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS suffix VARCHAR(10),
ADD COLUMN IF NOT EXISTS pronouns VARCHAR(20),
ADD COLUMN IF NOT EXISTS language_preference VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS preferred_communication ENUM('phone', 'email', 'sms', 'portal') DEFAULT 'phone',
ADD COLUMN IF NOT EXISTS disability_status TEXT,
ADD COLUMN IF NOT EXISTS accessibility_needs TEXT,
ADD COLUMN IF NOT EXISTS marital_status ENUM('single', 'married', 'divorced', 'widowed', 'separated', 'domestic_partner'),
ADD COLUMN IF NOT EXISTS race VARCHAR(100),
ADD COLUMN IF NOT EXISTS interpreter_needed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wheelchair_access BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_relationship VARCHAR(100),
ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS emergency_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS driver_license VARCHAR(50),
ADD COLUMN IF NOT EXISTS passport_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS ssn_encrypted VARBINARY(255),
ADD COLUMN IF NOT EXISTS ssn_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS data_classification ENUM('public', 'internal', 'confidential', 'restricted') DEFAULT 'confidential',
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS access_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for performance
ALTER TABLE user_profiles 
ADD INDEX IF NOT EXISTS idx_ssn_hash (ssn_hash),
ADD INDEX IF NOT EXISTS idx_last_accessed (last_accessed),
ADD INDEX IF NOT EXISTS idx_data_classification (data_classification),
ADD INDEX IF NOT EXISTS idx_language_preference (language_preference),
ADD INDEX IF NOT EXISTS idx_preferred_communication (preferred_communication);

-- =====================================================
-- ENHANCED INSURANCE MANAGEMENT
-- =====================================================

-- Create enhanced patient insurances table
CREATE TABLE IF NOT EXISTS patient_insurances_enhanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    payer_id INT,
    coverage_priority ENUM('primary', 'secondary', 'tertiary') NOT NULL,
    member_id VARCHAR(50) NOT NULL,
    group_number VARCHAR(50),
    policy_holder_name VARCHAR(255),
    policy_holder_dob DATE,
    relationship_to_patient ENUM('self', 'spouse', 'child', 'parent', 'other') DEFAULT 'self',
    effective_date DATE NOT NULL,
    termination_date DATE,
    
    -- Benefit information
    copay_amount DECIMAL(10,2) DEFAULT 0.00,
    coinsurance_percentage DECIMAL(5,2) DEFAULT 0.00,
    deductible_amount DECIMAL(10,2) DEFAULT 0.00,
    deductible_met DECIMAL(10,2) DEFAULT 0.00,
    out_of_pocket_max DECIMAL(10,2) DEFAULT 0.00,
    out_of_pocket_met DECIMAL(10,2) DEFAULT 0.00,
    
    -- Card images and documents
    card_front_image VARCHAR(500),
    card_back_image VARCHAR(500),
    
    -- Status and validation
    is_active BOOLEAN DEFAULT TRUE,
    eligibility_verified BOOLEAN DEFAULT FALSE,
    last_eligibility_check DATETIME,
    eligibility_response JSON,
    benefit_limitations JSON,
    prior_auth_required BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE CASCADE,
    UNIQUE KEY unique_patient_priority (patient_id, coverage_priority, is_active),
    INDEX idx_patient_insurance (patient_id, is_active),
    INDEX idx_eligibility_check (last_eligibility_check),
    INDEX idx_coverage_priority (coverage_priority)
);

-- Insurance hierarchy enforcement trigger
DELIMITER //
CREATE TRIGGER IF NOT EXISTS enforce_insurance_hierarchy 
BEFORE INSERT ON patient_insurances_enhanced
FOR EACH ROW
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE patient_insurances_enhanced 
        SET is_active = FALSE 
        WHERE patient_id = NEW.patient_id 
        AND coverage_priority = NEW.coverage_priority 
        AND is_active = TRUE
        AND id != NEW.id;
    END IF;
END//
DELIMITER ;

-- =====================================================
-- COMPREHENSIVE AUDIT LOGGING
-- =====================================================

-- HIPAA compliant audit log table
CREATE TABLE IF NOT EXISTS hipaa_audit_log (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    patient_id INT,
    action_type ENUM('create', 'read', 'update', 'delete', 'export', 'print', 'login', 'logout', 'access_denied') NOT NULL,
    table_name VARCHAR(100),
    field_name VARCHAR(100),
    old_value_hash VARCHAR(64),
    new_value_hash VARCHAR(64),
    access_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    phi_accessed BOOLEAN DEFAULT FALSE,
    access_granted BOOLEAN DEFAULT TRUE,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'low',
    timestamp TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP(6),
    
    INDEX idx_user_audit (user_id, timestamp),
    INDEX idx_patient_audit (patient_id, timestamp),
    INDEX idx_action_audit (action_type, timestamp),
    INDEX idx_session_audit (session_id, timestamp),
    INDEX idx_phi_access (phi_accessed, timestamp),
    INDEX idx_risk_level (risk_level, timestamp)
);

-- Patient access tracking trigger
DELIMITER //
CREATE TRIGGER IF NOT EXISTS track_patient_access
AFTER UPDATE ON user_profiles
FOR EACH ROW
BEGIN
    IF NEW.last_accessed != OLD.last_accessed OR OLD.last_accessed IS NULL THEN
        UPDATE user_profiles 
        SET access_count = COALESCE(access_count, 0) + 1 
        WHERE fk_userid = NEW.fk_userid;
        
        INSERT INTO hipaa_audit_log (
            user_id, patient_id, action_type, table_name, 
            phi_accessed, timestamp
        ) VALUES (
            COALESCE(@current_user_id, 0), 
            NEW.fk_userid, 
            'read', 
            'user_profiles',
            TRUE,
            NOW(6)
        );
    END IF;
END//
DELIMITER ;

-- =====================================================
-- DOCUMENT MANAGEMENT SYSTEM
-- =====================================================

-- Patient documents table with version control
CREATE TABLE IF NOT EXISTS patient_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    document_category ENUM('identification', 'insurance', 'consent', 'clinical', 'administrative', 'legal') NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    
    -- File information
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    
    -- Version control
    version_number INT DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    parent_document_id INT,
    
    -- Digital signature
    digital_signature LONGTEXT,
    signature_method VARCHAR(50),
    signature_date DATETIME,
    signed_by INT,
    signature_valid BOOLEAN DEFAULT FALSE,
    
    -- Security and access
    access_level ENUM('public', 'internal', 'confidential', 'restricted') DEFAULT 'confidential',
    encryption_status ENUM('none', 'encrypted', 'signed', 'both') DEFAULT 'none',
    
    -- Metadata
    tags JSON,
    description TEXT,
    keywords TEXT,
    
    -- Lifecycle management
    retention_period INT, -- in years
    destruction_date DATE,
    legal_hold BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP,
    access_count INT DEFAULT 0,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE CASCADE,
    FOREIGN KEY (parent_document_id) REFERENCES patient_documents(id),
    INDEX idx_patient_docs (patient_id, document_category),
    INDEX idx_current_version (is_current_version),
    INDEX idx_file_hash (file_hash),
    INDEX idx_retention (destruction_date, legal_hold),
    INDEX idx_access_level (access_level)
);

-- Document versions tracking
CREATE TABLE IF NOT EXISTS document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    change_reason TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES patient_documents(id) ON DELETE CASCADE,
    UNIQUE KEY unique_doc_version (document_id, version_number)
);

-- =====================================================
-- CONSENT MANAGEMENT SYSTEM
-- =====================================================

-- Patient consents with digital signatures
CREATE TABLE IF NOT EXISTS patient_consents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    consent_type ENUM('hipaa', 'treatment', 'financial', 'research', 'marketing', 'portal_access', 'telehealth') NOT NULL,
    consent_status ENUM('granted', 'denied', 'withdrawn', 'expired') DEFAULT 'granted',
    consent_date DATETIME NOT NULL,
    expiration_date DATETIME,
    
    -- Digital signature information
    digital_signature LONGTEXT,
    signature_method ENUM('electronic', 'digital_pad', 'wet_signature', 'verbal') DEFAULT 'electronic',
    signature_date DATETIME,
    witness_signature LONGTEXT,
    witness_name VARCHAR(255),
    
    -- Consent details
    consent_form_version VARCHAR(50),
    consent_text LONGTEXT,
    language_used VARCHAR(50) DEFAULT 'English',
    
    -- Audit information
    ip_address VARCHAR(45),
    user_agent TEXT,
    obtained_by INT,
    notes TEXT,
    
    -- System fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE CASCADE,
    INDEX idx_patient_consents (patient_id, consent_type),
    INDEX idx_consent_status (consent_status, expiration_date),
    INDEX idx_consent_date (consent_date)
);

-- =====================================================
-- CLINICAL DATA ENHANCEMENTS
-- =====================================================

-- Enhanced problem list management
CREATE TABLE IF NOT EXISTS patient_problem_list (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    problem_code VARCHAR(20),
    problem_description TEXT NOT NULL,
    icd10_code VARCHAR(10),
    snomed_code VARCHAR(20),
    onset_date DATE,
    status ENUM('active', 'inactive', 'resolved', 'chronic') DEFAULT 'active',
    severity ENUM('mild', 'moderate', 'severe', 'critical'),
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    -- Clinical context
    body_system VARCHAR(100),
    clinical_status VARCHAR(50),
    verification_status ENUM('confirmed', 'provisional', 'differential', 'ruled_out') DEFAULT 'confirmed',
    
    -- Provider information
    diagnosed_by INT,
    last_reviewed_by INT,
    last_reviewed_date DATE,
    
    -- Notes and comments
    clinical_notes TEXT,
    patient_reported BOOLEAN DEFAULT FALSE,
    
    -- Audit fields
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE CASCADE,
    INDEX idx_patient_problems (patient_id, status),
    INDEX idx_problem_code (problem_code),
    INDEX idx_icd10_code (icd10_code),
    INDEX idx_onset_date (onset_date)
);

-- Risk assessments and scores
CREATE TABLE IF NOT EXISTS patient_risk_assessments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    assessment_type ENUM('hcc_raf', 'fall_risk', 'readmission_risk', 'mortality_risk', 'frailty_index', 'medication_adherence') NOT NULL,
    score_value DECIMAL(10,4) NOT NULL,
    score_category VARCHAR(50),
    assessment_date DATE NOT NULL,
    valid_through_date DATE,
    
    -- Assessment details
    assessment_tool VARCHAR(100),
    calculated_by VARCHAR(100),
    calculation_method TEXT,
    contributing_factors JSON,
    
    -- Clinical context
    assessed_by INT,
    review_required BOOLEAN DEFAULT FALSE,
    next_assessment_due DATE,
    
    -- Notes and recommendations
    clinical_notes TEXT,
    recommendations TEXT,
    action_items JSON,
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE CASCADE,
    INDEX idx_patient_assessments (patient_id, assessment_type, assessment_date),
    INDEX idx_assessment_due (next_assessment_due),
    INDEX idx_score_value (score_value, assessment_type)
);

-- =====================================================
-- ENHANCED EXISTING TABLES
-- =====================================================

-- Enhance allergies table
ALTER TABLE allergies 
ADD COLUMN IF NOT EXISTS severity ENUM('mild', 'moderate', 'severe', 'life-threatening') DEFAULT 'mild',
ADD COLUMN IF NOT EXISTS onset_date DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS verified_by INT,
ADD COLUMN IF NOT EXISTS verification_date DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Enhance patient_medication table
ALTER TABLE patient_medication 
ADD COLUMN IF NOT EXISTS route VARCHAR(50) DEFAULT 'oral',
ADD COLUMN IF NOT EXISTS indication TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS ndc_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS lot_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- =====================================================
-- COMPLIANCE AND REPORTING VIEWS
-- =====================================================

-- Patient profile completeness scoring view
CREATE OR REPLACE VIEW patient_profile_completeness AS
SELECT 
    up.fk_userid AS patient_id,
    CONCAT(up.firstname, ' ', COALESCE(up.middlename, ''), ' ', up.lastname) AS patient_name,
    
    -- Demographics completeness (40 points max)
    (CASE WHEN up.firstname IS NOT NULL AND up.firstname != '' THEN 5 ELSE 0 END +
     CASE WHEN up.lastname IS NOT NULL AND up.lastname != '' THEN 5 ELSE 0 END +
     CASE WHEN up.dob IS NOT NULL THEN 5 ELSE 0 END +
     CASE WHEN up.gender IS NOT NULL AND up.gender != '' THEN 5 ELSE 0 END +
     CASE WHEN up.ethnicity IS NOT NULL AND up.ethnicity != '' THEN 3 ELSE 0 END +
     CASE WHEN up.race IS NOT NULL AND up.race != '' THEN 3 ELSE 0 END +
     CASE WHEN up.language_preference IS NOT NULL THEN 2 ELSE 0 END +
     CASE WHEN up.marital_status IS NOT NULL THEN 2 ELSE 0 END +
     CASE WHEN up.pronouns IS NOT NULL THEN 2 ELSE 0 END +
     CASE WHEN up.suffix IS NOT NULL THEN 1 ELSE 0 END +
     CASE WHEN up.middlename IS NOT NULL AND up.middlename != '' THEN 1 ELSE 0 END +
     CASE WHEN up.disability_status IS NOT NULL THEN 3 ELSE 0 END +
     CASE WHEN up.accessibility_needs IS NOT NULL THEN 2 ELSE 0 END) AS demographics_score,
    
    -- Contact completeness (30 points max)
    (CASE WHEN up.work_email IS NOT NULL AND up.work_email != '' THEN 5 ELSE 0 END +
     CASE WHEN up.phone IS NOT NULL AND up.phone != '' THEN 5 ELSE 0 END +
     CASE WHEN up.address_line IS NOT NULL AND up.address_line != '' THEN 5 ELSE 0 END +
     CASE WHEN up.city IS NOT NULL AND up.city != '' THEN 3 ELSE 0 END +
     CASE WHEN up.state IS NOT NULL AND up.state != '' THEN 3 ELSE 0 END +
     CASE WHEN up.zip IS NOT NULL AND up.zip != '' THEN 3 ELSE 0 END +
     CASE WHEN up.emergency_contact IS NOT NULL AND up.emergency_contact != '' THEN 3 ELSE 0 END +
     CASE WHEN up.emergency_phone IS NOT NULL AND up.emergency_phone != '' THEN 2 ELSE 0 END +
     CASE WHEN up.alternate_phone IS NOT NULL THEN 1 ELSE 0 END) AS contact_score,
    
    -- Clinical completeness (20 points max)
    (CASE WHEN (SELECT COUNT(*) FROM allergies WHERE patient_id = up.fk_userid) > 0 THEN 5 ELSE 0 END +
     CASE WHEN (SELECT COUNT(*) FROM patient_medication WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 5 ELSE 0 END +
     CASE WHEN (SELECT COUNT(*) FROM patient_diagnoses WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 5 ELSE 0 END +
     CASE WHEN (SELECT COUNT(*) FROM patient_problem_list WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 3 ELSE 0 END +
     CASE WHEN (SELECT COUNT(*) FROM patient_risk_assessments WHERE patient_id = up.fk_userid) > 0 THEN 2 ELSE 0 END) AS clinical_score,
    
    -- Financial completeness (10 points max)
    (CASE WHEN (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = up.fk_userid AND is_active = 1) > 0 THEN 5 ELSE 0 END +
     CASE WHEN up.ssn_encrypted IS NOT NULL THEN 3 ELSE 0 END +
     CASE WHEN (SELECT COUNT(*) FROM patient_consents WHERE patient_id = up.fk_userid AND consent_type = 'financial') > 0 THEN 2 ELSE 0 END) AS financial_score,
    
    -- Calculate total completeness percentage
    ROUND(((CASE WHEN up.firstname IS NOT NULL AND up.firstname != '' THEN 5 ELSE 0 END +
            CASE WHEN up.lastname IS NOT NULL AND up.lastname != '' THEN 5 ELSE 0 END +
            CASE WHEN up.dob IS NOT NULL THEN 5 ELSE 0 END +
            CASE WHEN up.gender IS NOT NULL AND up.gender != '' THEN 5 ELSE 0 END +
            CASE WHEN up.ethnicity IS NOT NULL AND up.ethnicity != '' THEN 3 ELSE 0 END +
            CASE WHEN up.race IS NOT NULL AND up.race != '' THEN 3 ELSE 0 END +
            CASE WHEN up.language_preference IS NOT NULL THEN 2 ELSE 0 END +
            CASE WHEN up.marital_status IS NOT NULL THEN 2 ELSE 0 END +
            CASE WHEN up.pronouns IS NOT NULL THEN 2 ELSE 0 END +
            CASE WHEN up.suffix IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN up.middlename IS NOT NULL AND up.middlename != '' THEN 1 ELSE 0 END +
            CASE WHEN up.disability_status IS NOT NULL THEN 3 ELSE 0 END +
            CASE WHEN up.accessibility_needs IS NOT NULL THEN 2 ELSE 0 END +
            CASE WHEN up.work_email IS NOT NULL AND up.work_email != '' THEN 5 ELSE 0 END +
            CASE WHEN up.phone IS NOT NULL AND up.phone != '' THEN 5 ELSE 0 END +
            CASE WHEN up.address_line IS NOT NULL AND up.address_line != '' THEN 5 ELSE 0 END +
            CASE WHEN up.city IS NOT NULL AND up.city != '' THEN 3 ELSE 0 END +
            CASE WHEN up.state IS NOT NULL AND up.state != '' THEN 3 ELSE 0 END +
            CASE WHEN up.zip IS NOT NULL AND up.zip != '' THEN 3 ELSE 0 END +
            CASE WHEN up.emergency_contact IS NOT NULL AND up.emergency_contact != '' THEN 3 ELSE 0 END +
            CASE WHEN up.emergency_phone IS NOT NULL AND up.emergency_phone != '' THEN 2 ELSE 0 END +
            CASE WHEN up.alternate_phone IS NOT NULL THEN 1 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM allergies WHERE patient_id = up.fk_userid) > 0 THEN 5 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_medication WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 5 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_diagnoses WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 5 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_problem_list WHERE patient_id = up.fk_userid AND status = 'active') > 0 THEN 3 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_risk_assessments WHERE patient_id = up.fk_userid) > 0 THEN 2 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_insurances WHERE fk_userid = up.fk_userid AND is_active = 1) > 0 THEN 5 ELSE 0 END +
            CASE WHEN up.ssn_encrypted IS NOT NULL THEN 3 ELSE 0 END +
            CASE WHEN (SELECT COUNT(*) FROM patient_consents WHERE patient_id = up.fk_userid AND consent_type = 'financial') > 0 THEN 2 ELSE 0 END) / 100) * 100, 0) AS completeness_percentage,
    
    up.created,
    up.updated_at,
    up.last_accessed,
    up.access_count
FROM user_profiles up
WHERE up.fk_userid IS NOT NULL;

-- HIPAA compliance monitoring view
CREATE OR REPLACE VIEW hipaa_compliance_summary AS
SELECT 
    DATE(timestamp) as audit_date,
    COUNT(*) as total_access_events,
    COUNT(CASE WHEN phi_accessed = TRUE THEN 1 END) as phi_access_events,
    COUNT(CASE WHEN access_granted = FALSE THEN 1 END) as denied_access_events,
    COUNT(CASE WHEN risk_level = 'high' OR risk_level = 'critical' THEN 1 END) as high_risk_events,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT patient_id) as unique_patients_accessed
FROM hipaa_audit_log
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(timestamp)
ORDER BY audit_date DESC;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample consent types for existing patients
INSERT IGNORE INTO patient_consents (patient_id, consent_type, consent_status, consent_date, consent_form_version, obtained_by)
SELECT 
    fk_userid,
    'hipaa',
    'granted',
    NOW(),
    '2024.1',
    1
FROM user_profiles 
WHERE fk_userid IS NOT NULL
LIMIT 10;

-- Summary
SELECT 'Enhanced Patient Profile Schema Created Successfully!' as Status,
       'All tables, triggers, views, and sample data have been generated' as Message,
       NOW() as Timestamp;
