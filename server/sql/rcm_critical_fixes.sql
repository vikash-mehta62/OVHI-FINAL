-- Critical RCM Fixes - Database Schema
-- Addresses eligibility verification, secondary insurance, and audit compliance

-- =====================================================
-- REAL-TIME ELIGIBILITY TABLES
-- =====================================================

-- Enhanced eligibility requests table
CREATE TABLE IF NOT EXISTS rcm_eligibility_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    insurance_id INT NOT NULL,
    provider_id INT NOT NULL,
    request_date DATE NOT NULL,
    service_date DATE,
    request_type ENUM('general', 'specific_service', 'prior_auth') DEFAULT 'general',
    service_codes JSON,
    eligibility_status ENUM('eligible', 'not_eligible', 'pending', 'error', 'requires_auth') DEFAULT 'pending',
    
    -- Benefit information
    benefits_summary JSON,
    copay_info JSON,
    deductible_info JSON,
    coinsurance_info JSON,
    out_of_pocket_info JSON,
    
    -- Authorization requirements
    prior_auth_required BOOLEAN DEFAULT FALSE,
    prior_auth_number VARCHAR(50),
    auth_expiration_date DATE,
    
    -- Response details
    payer_response_code VARCHAR(10),
    payer_response_message TEXT,
    clearinghouse_response JSON,
    edi_270_request LONGTEXT,
    edi_271_response LONGTEXT,
    
    -- Risk assessment
    denial_risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    risk_factors JSON,
    
    -- Processing info
    processing_time_ms INT DEFAULT 0,
    clearinghouse_used VARCHAR(50),
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_eligibility (patient_id, request_date),
    INDEX idx_eligibility_status (eligibility_status, request_date),
    INDEX idx_service_date (service_date),
    INDEX idx_risk_level (denial_risk_level),
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    FOREIGN KEY (insurance_id) REFERENCES rcm_patient_insurance(id),
    FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Eligibility cache for performance
CREATE TABLE IF NOT EXISTS rcm_eligibility_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    insurance_id INT NOT NULL,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    eligibility_data JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cache_key (cache_key),
    INDEX idx_patient_cache (patient_id, expires_at),
    INDEX idx_expires (expires_at)
);

-- =====================================================
-- SECONDARY INSURANCE & COB TABLES
-- =====================================================

-- Enhanced claims table for secondary processing
ALTER TABLE rcm_claims 
ADD COLUMN IF NOT EXISTS primary_claim_id INT NULL,
ADD COLUMN IF NOT EXISTS secondary_payer_order TINYINT DEFAULT 1,
ADD COLUMN IF NOT EXISTS coordination_of_benefits JSON,
ADD COLUMN IF NOT EXISTS cob_processed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
ADD INDEX idx_primary_claim (primary_claim_id),
ADD INDEX idx_cob_processed (cob_processed, secondary_payer_order);

-- Secondary claims tracking
CREATE TABLE IF NOT EXISTS rcm_secondary_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    primary_claim_id INT NOT NULL,
    secondary_insurance_id INT NOT NULL,
    claim_id INT NOT NULL,
    
    -- COB Information
    primary_payer_name VARCHAR(100),
    primary_paid_amount DECIMAL(10,2) NOT NULL,
    primary_paid_date DATE,
    
    secondary_billed_amount DECIMAL(10,2) NOT NULL,
    secondary_paid_amount DECIMAL(10,2) DEFAULT 0.00,
    secondary_denied_amount DECIMAL(10,2) DEFAULT 0.00,
    
    -- Processing status
    processing_status ENUM('pending', 'submitted', 'paid', 'denied', 'partial') DEFAULT 'pending',
    submission_date DATE,
    payment_date DATE,
    
    -- COB calculations
    cob_method ENUM('standard', 'carve_out', 'maintenance_of_benefits') DEFAULT 'standard',
    birthday_rule_applied BOOLEAN DEFAULT FALSE,
    coordination_percentage DECIMAL(5,2) DEFAULT 100.00,
    
    -- Final patient responsibility
    final_patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
    total_insurance_payments DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (primary_claim_id) REFERENCES rcm_claims(id),
    FOREIGN KEY (secondary_insurance_id) REFERENCES rcm_patient_insurance(id),
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    INDEX idx_primary_secondary (primary_claim_id, processing_status),
    INDEX idx_secondary_status (processing_status, submission_date)
);

-- COB rules and calculations
CREATE TABLE IF NOT EXISTS rcm_cob_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    primary_payer_id INT,
    secondary_payer_id INT,
    rule_type ENUM('coordination_method', 'birthday_rule', 'gender_rule', 'dependent_rule') NOT NULL,
    rule_value VARCHAR(100) NOT NULL,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_payer_rules (primary_payer_id, secondary_payer_id),
    INDEX idx_rule_type (rule_type, is_active),
    FOREIGN KEY (primary_payer_id) REFERENCES rcm_payers(id),
    FOREIGN KEY (secondary_payer_id) REFERENCES rcm_payers(id)
);

-- =====================================================
-- COMPREHENSIVE AUDIT TABLES
-- =====================================================

-- Main audit table with HIPAA compliance
CREATE TABLE IF NOT EXISTS rcm_audit_comprehensive (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Core audit information
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    patient_id INT,
    
    -- Data changes
    old_values JSON,
    new_values JSON,
    
    -- Session and security info
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Risk and compliance
    risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    reason TEXT,
    audit_hash VARCHAR(64) NOT NULL,
    
    -- Additional context
    additional_data JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_audit (user_id, created_at),
    INDEX idx_patient_audit (patient_id, created_at),
    INDEX idx_entity_audit (entity_type, entity_id, created_at),
    INDEX idx_action_audit (action, created_at),
    INDEX idx_risk_level (risk_level, created_at),
    INDEX idx_audit_hash (audit_hash),
    
    -- Partitioning by month for performance (optional)
    PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
        PARTITION p202401 VALUES LESS THAN (202402),
        PARTITION p202402 VALUES LESS THAN (202403),
        PARTITION p202403 VALUES LESS THAN (202404),
        PARTITION p202404 VALUES LESS THAN (202405),
        PARTITION p202405 VALUES LESS THAN (202406),
        PARTITION p202406 VALUES LESS THAN (202407),
        PARTITION p202407 VALUES LESS THAN (202408),
        PARTITION p202408 VALUES LESS THAN (202409),
        PARTITION p202409 VALUES LESS THAN (202410),
        PARTITION p202410 VALUES LESS THAN (202411),
        PARTITION p202411 VALUES LESS THAN (202412),
        PARTITION p202412 VALUES LESS THAN (202501),
        PARTITION p_future VALUES LESS THAN MAXVALUE
    )
);

-- High-risk activities separate tracking
CREATE TABLE IF NOT EXISTS rcm_high_risk_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    audit_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    patient_id INT,
    risk_level ENUM('HIGH', 'CRITICAL') NOT NULL,
    reason TEXT,
    ip_address VARCHAR(45),
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    reviewed_by INT NULL,
    review_notes TEXT,
    requires_review BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (audit_id) REFERENCES rcm_audit_comprehensive(id),
    INDEX idx_high_risk_user (user_id, flagged_at),
    INDEX idx_requires_review (requires_review, flagged_at),
    INDEX idx_risk_level (risk_level, flagged_at)
);

-- Suspicious activity tracking
CREATE TABLE IF NOT EXISTS rcm_suspicious_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    suspicion_type ENUM('RAPID_ACTIONS', 'MULTIPLE_IPS', 'UNUSUAL_HOURS', 'BULK_ACCESS', 'FAILED_LOGINS') NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(45),
    flagged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('PENDING_REVIEW', 'REVIEWED', 'FALSE_POSITIVE', 'CONFIRMED_THREAT') DEFAULT 'PENDING_REVIEW',
    reviewed_by INT NULL,
    review_notes TEXT,
    
    INDEX idx_suspicious_user (user_id, flagged_at),
    INDEX idx_suspicion_type (suspicion_type, status),
    INDEX idx_status (status, flagged_at)
);

-- Security alerts
CREATE TABLE IF NOT EXISTS rcm_security_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_type ENUM('CRITICAL_ACTIVITY', 'SUSPICIOUS_ACTIVITY', 'SYSTEM_BREACH', 'DATA_EXPORT') NOT NULL,
    user_id INT,
    details JSON NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    status ENUM('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by INT NULL,
    resolved_at TIMESTAMP NULL,
    
    INDEX idx_alert_type (alert_type, status),
    INDEX idx_severity (severity, status),
    INDEX idx_status (status, created_at)
);

-- Audit failures tracking (critical system monitoring)
CREATE TABLE IF NOT EXISTS rcm_audit_failures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    error_message TEXT NOT NULL,
    audit_data JSON,
    failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'HIGH',
    resolved BOOLEAN DEFAULT FALSE,
    
    INDEX idx_failed_at (failed_at),
    INDEX idx_severity (severity, resolved)
);

-- =====================================================
-- EDI TRANSACTION TABLES
-- =====================================================

-- EDI transaction tracking
CREATE TABLE IF NOT EXISTS rcm_edi_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_type ENUM('270', '271', '837', '835', '999', '277CA', 'TA1') NOT NULL,
    direction ENUM('inbound', 'outbound') NOT NULL,
    
    -- Transaction identification
    control_number VARCHAR(20),
    interchange_control_number VARCHAR(20),
    functional_group_control_number VARCHAR(20),
    
    -- Content and processing
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    raw_content LONGTEXT,
    parsed_content JSON,
    
    -- Processing status
    processing_status ENUM('received', 'parsing', 'parsed', 'processing', 'processed', 'error', 'rejected') DEFAULT 'received',
    error_message TEXT,
    validation_errors JSON,
    
    -- Business context
    provider_id INT,
    payer_id INT,
    claim_count INT DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    
    -- Timestamps
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    INDEX idx_transaction_type (transaction_type, processing_status),
    INDEX idx_control_number (control_number),
    INDEX idx_provider_edi (provider_id, transaction_type),
    INDEX idx_processing_status (processing_status, received_at)
);

-- =====================================================
-- DENIAL RISK PREVENTION
-- =====================================================

-- Pre-submission claim validation
CREATE TABLE IF NOT EXISTS rcm_claim_validations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Validation results
    overall_score INT NOT NULL DEFAULT 0,
    max_score INT NOT NULL DEFAULT 100,
    approval_probability DECIMAL(5,2) DEFAULT 0.00,
    denial_risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    
    -- Detailed validation results
    eligibility_check JSON,
    coding_validation JSON,
    payer_rules_check JSON,
    prior_auth_check JSON,
    frequency_limits_check JSON,
    
    -- Issues and recommendations
    validation_issues JSON,
    recommendations JSON,
    auto_corrections JSON,
    
    -- Processing
    validation_status ENUM('pending', 'completed', 'error') DEFAULT 'pending',
    processing_time_ms INT DEFAULT 0,
    
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    INDEX idx_claim_validation (claim_id, validation_date),
    INDEX idx_risk_level (denial_risk_level, validation_date),
    INDEX idx_approval_probability (approval_probability)
);

-- Real-time payer rules
CREATE TABLE IF NOT EXISTS rcm_payer_rules_realtime (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payer_id INT NOT NULL,
    rule_type ENUM('coverage', 'prior_auth', 'frequency', 'age_limit', 'gender_limit', 'diagnosis_required') NOT NULL,
    
    -- Rule definition
    cpt_code VARCHAR(10),
    diagnosis_code VARCHAR(20),
    modifier_codes JSON,
    
    -- Rule parameters
    rule_parameters JSON,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    
    -- Rule logic
    validation_logic TEXT,
    error_message TEXT,
    severity ENUM('warning', 'error', 'info') DEFAULT 'error',
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    INDEX idx_payer_rules (payer_id, rule_type, is_active),
    INDEX idx_cpt_rules (cpt_code, payer_id),
    INDEX idx_diagnosis_rules (diagnosis_code, payer_id),
    INDEX idx_effective_date (effective_date, expiration_date)
);

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample COB rules
INSERT IGNORE INTO rcm_cob_rules (primary_payer_id, secondary_payer_id, rule_type, rule_value, effective_date) VALUES
(1, 2, 'coordination_method', 'standard', '2024-01-01'),
(1, 3, 'birthday_rule', 'primary_older_birthday', '2024-01-01'),
(2, 3, 'coordination_method', 'carve_out', '2024-01-01');

-- Insert sample payer rules for validation
INSERT IGNORE INTO rcm_payer_rules_realtime (payer_id, rule_type, cpt_code, rule_parameters, effective_date, validation_logic, error_message) VALUES
(1, 'prior_auth', '90837', '{"required": true, "advance_days": 3}', '2024-01-01', 'prior_auth_required = true', 'Prior authorization required for extended therapy sessions'),
(1, 'frequency', '99213', '{"max_per_day": 1, "max_per_week": 5}', '2024-01-01', 'frequency_check', 'Frequency limit exceeded for office visits'),
(2, 'age_limit', '90791', '{"min_age": 18}', '2024-01-01', 'patient_age >= 18', 'Psychiatric evaluation requires patient to be 18 or older'),
(3, 'diagnosis_required', '90834', '{"required_diagnosis_patterns": ["F32", "F33", "F41"]}', '2024-01-01', 'diagnosis_match', 'Psychotherapy requires appropriate mental health diagnosis');

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_rcm_claims_composite ON rcm_claims(patient_id, payer_id, claim_status, submission_date);
CREATE INDEX IF NOT EXISTS idx_eligibility_composite ON rcm_eligibility_requests(patient_id, service_date, eligibility_status);
CREATE INDEX IF NOT EXISTS idx_audit_comprehensive_composite ON rcm_audit_comprehensive(user_id, patient_id, created_at, risk_level);

-- Create views for common queries
CREATE OR REPLACE VIEW rcm_eligibility_summary AS
SELECT 
    er.patient_id,
    CONCAT(up.firstname, ' ', up.lastname) as patient_name,
    er.eligibility_status,
    er.denial_risk_level,
    er.prior_auth_required,
    er.request_date,
    p.payer_name,
    er.benefits_summary
FROM rcm_eligibility_requests er
JOIN user_profiles up ON er.patient_id = up.fk_userid
JOIN rcm_patient_insurance pi ON er.insurance_id = pi.id
JOIN rcm_payers p ON pi.payer_id = p.id
WHERE er.request_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);

CREATE OR REPLACE VIEW rcm_secondary_opportunities AS
SELECT 
    cb.id as primary_claim_id,
    cb.patient_id,
    CONCAT(up.firstname, ' ', up.lastname) as patient_name,
    cb.total_charges,
    COALESCE(cb.paid_amount, 0) as primary_paid,
    cb.total_charges - COALESCE(cb.paid_amount, 0) as remaining_balance,
    COUNT(pi.id) as secondary_insurance_count,
    GROUP_CONCAT(p.payer_name) as secondary_payers
FROM cpt_billing cb
JOIN user_profiles up ON cb.patient_id = up.fk_userid
LEFT JOIN rcm_patient_insurance pi ON cb.patient_id = pi.patient_id 
    AND pi.coverage_type IN ('secondary', 'tertiary') 
    AND pi.is_active = TRUE
LEFT JOIN rcm_payers p ON pi.payer_id = p.id
LEFT JOIN rcm_secondary_claims sc ON cb.id = sc.primary_claim_id
WHERE cb.status = 2  -- Paid by primary
AND cb.total_charges > COALESCE(cb.paid_amount, 0)
AND pi.id IS NOT NULL
AND sc.id IS NULL  -- No secondary claim created yet
GROUP BY cb.id, cb.patient_id, up.firstname, up.lastname, cb.total_charges, cb.paid_amount
HAVING secondary_insurance_count > 0;

-- Summary
SELECT 'Critical RCM Fixes Schema Installation Complete!' as Status,
       'Eligibility verification, secondary insurance, and audit compliance ready' as Message;