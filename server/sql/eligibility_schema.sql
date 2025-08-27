-- Eligibility and Validation Database Schema
-- This schema supports eligibility checking and claim validation functionality

-- Create eligibility_checks table
CREATE TABLE IF NOT EXISTS eligibility_checks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    member_id VARCHAR(100) NOT NULL,
    service_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'pending', 'expired', 'unknown') DEFAULT 'unknown',
    coverage_percentage DECIMAL(5,2) DEFAULT 0,
    deductible DECIMAL(10,2) DEFAULT 0,
    copay DECIMAL(10,2) DEFAULT 0,
    out_of_pocket_max DECIMAL(10,2) DEFAULT 0,
    effective_date DATE,
    expiration_date DATE,
    plan_type VARCHAR(50),
    plan_name VARCHAR(200),
    group_number VARCHAR(100),
    in_network BOOLEAN DEFAULT TRUE,
    prior_auth_required BOOLEAN DEFAULT FALSE,
    checked_by INT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_member_id (member_id),
    INDEX idx_service_date (service_date),
    INDEX idx_status (status),
    INDEX idx_checked_at (checked_at)
);

-- Create claim_validations table
CREATE TABLE IF NOT EXISTS claim_validations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    procedure_codes JSON,
    diagnosis_codes JSON,
    provider_id VARCHAR(50),
    place_of_service VARCHAR(10),
    units INT DEFAULT 1,
    charges DECIMAL(10,2),
    is_valid BOOLEAN DEFAULT FALSE,
    confidence_score INT DEFAULT 0,
    errors JSON,
    warnings JSON,
    suggestions JSON,
    validated_by INT,
    validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_service_date (service_date),
    INDEX idx_is_valid (is_valid),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_validated_at (validated_at)
);

-- Create benefits_checks table
CREATE TABLE IF NOT EXISTS benefits_checks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    insurance_id VARCHAR(50),
    service_date DATE NOT NULL,
    procedure_codes JSON,
    plan_type VARCHAR(50),
    in_network BOOLEAN DEFAULT TRUE,
    prior_auth_required BOOLEAN DEFAULT FALSE,
    benefits JSON,
    deductible_info JSON,
    out_of_pocket_info JSON,
    checked_by INT,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_service_date (service_date),
    INDEX idx_plan_type (plan_type),
    INDEX idx_checked_at (checked_at)
);

-- Create copay_estimates table
CREATE TABLE IF NOT EXISTS copay_estimates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    procedure_codes JSON,
    estimated_copay DECIMAL(10,2) DEFAULT 0,
    deductible_applies BOOLEAN DEFAULT TRUE,
    coinsurance_rate DECIMAL(5,2) DEFAULT 0,
    calculation_details JSON,
    estimated_by INT,
    estimated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_service_date (service_date),
    INDEX idx_estimated_at (estimated_at)
);

-- Create claim_estimates table
CREATE TABLE IF NOT EXISTS claim_estimates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    procedure_codes JSON,
    diagnosis_codes JSON,
    total_charges DECIMAL(10,2) DEFAULT 0,
    estimated_reimbursement DECIMAL(10,2) DEFAULT 0,
    patient_responsibility DECIMAL(10,2) DEFAULT 0,
    copay DECIMAL(10,2) DEFAULT 0,
    deductible DECIMAL(10,2) DEFAULT 0,
    coverage_percentage DECIMAL(5,2) DEFAULT 0,
    calculation_details JSON,
    estimated_by INT,
    estimated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_service_date (service_date),
    INDEX idx_estimated_reimbursement (estimated_reimbursement),
    INDEX idx_estimated_at (estimated_at)
);

-- Create prior_authorizations table
CREATE TABLE IF NOT EXISTS prior_authorizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    member_id VARCHAR(100),
    procedure_codes JSON,
    diagnosis_codes JSON,
    service_date DATE,
    auth_number VARCHAR(100),
    status ENUM('pending', 'approved', 'denied', 'expired') DEFAULT 'pending',
    requested_date DATE,
    approval_date DATE,
    expiration_date DATE,
    notes TEXT,
    submitted_by INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_auth_number (auth_number),
    INDEX idx_status (status),
    INDEX idx_service_date (service_date),
    INDEX idx_submitted_at (submitted_at)
);

-- Create eligibility_audit_log table for tracking
CREATE TABLE IF NOT EXISTS eligibility_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    action_type VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50),
    member_id VARCHAR(100),
    user_id INT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_action_type (action_type),
    INDEX idx_patient_id (patient_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for testing
INSERT INTO eligibility_checks (
    patient_id, member_id, service_date, status, coverage_percentage,
    deductible, copay, out_of_pocket_max, effective_date, expiration_date,
    plan_type, plan_name, group_number, in_network, prior_auth_required
) VALUES 
('PAT001', 'MEM123456789', '2024-01-15', 'active', 80.00, 1000.00, 25.00, 5000.00, 
 '2024-01-01', '2024-12-31', 'PPO', 'Health Plan Premium', 'GRP001', TRUE, FALSE),
('PAT002', 'MEM987654321', '2024-01-16', 'active', 70.00, 1500.00, 35.00, 6000.00,
 '2024-01-01', '2024-12-31', 'HMO', 'Health Plan Basic', 'GRP002', TRUE, TRUE),
('PAT003', 'MEM456789123', '2024-01-17', 'inactive', 0.00, 0.00, 0.00, 0.00,
 '2023-01-01', '2023-12-31', 'PPO', 'Health Plan Premium', 'GRP001', FALSE, FALSE);

-- Insert sample claim validations
INSERT INTO claim_validations (
    patient_id, service_date, procedure_codes, diagnosis_codes,
    provider_id, place_of_service, units, charges, is_valid, confidence_score,
    errors, warnings, suggestions
) VALUES 
('PAT001', '2024-01-15', '["99213"]', '["Z00.00"]', 'PROV001', '11', 1, 150.00, 
 TRUE, 95, '[]', '[]', '[]'),
('PAT002', '2024-01-16', '["99214", "90834"]', '["F32.9", "Z71.1"]', 'PROV001', '11', 1, 250.00,
 FALSE, 60, '[{"code": "MISSING_MODIFIER", "message": "Modifier may be required for multiple procedures"}]',
 '[{"code": "HIGH_CHARGES", "message": "Charges seem high for these procedures"}]', '[]');

-- Insert sample benefits checks
INSERT INTO benefits_checks (
    patient_id, service_date, procedure_codes, plan_type, in_network,
    prior_auth_required, benefits, deductible_info, out_of_pocket_info
) VALUES 
('PAT001', '2024-01-15', '["99213"]', 'PPO', TRUE, FALSE,
 '[{"serviceType": "Office Visit", "coveragePercentage": 80, "copay": 25, "deductible": 1000}]',
 '{"total": 1000, "met": 250, "remaining": 750}',
 '{"total": 5000, "met": 500, "remaining": 4500}');

-- Create views for reporting
CREATE OR REPLACE VIEW eligibility_summary AS
SELECT 
    ec.patient_id,
    ec.member_id,
    ec.status,
    ec.coverage_percentage,
    ec.deductible,
    ec.copay,
    ec.plan_type,
    ec.checked_at,
    COUNT(*) OVER (PARTITION BY ec.patient_id) as check_count
FROM eligibility_checks ec
WHERE ec.checked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

CREATE OR REPLACE VIEW claim_validation_summary AS
SELECT 
    cv.patient_id,
    cv.service_date,
    cv.is_valid,
    cv.confidence_score,
    JSON_LENGTH(cv.errors) as error_count,
    JSON_LENGTH(cv.warnings) as warning_count,
    cv.validated_at
FROM claim_validations cv
WHERE cv.validated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetPatientEligibilityHistory(
    IN p_patient_id VARCHAR(50),
    IN p_limit INT DEFAULT 10,
    IN p_offset INT DEFAULT 0
)
BEGIN
    SELECT 
        ec.*,
        u.name as checked_by_name
    FROM eligibility_checks ec
    LEFT JOIN users u ON ec.checked_by = u.id
    WHERE ec.patient_id = p_patient_id
    ORDER BY ec.checked_at DESC
    LIMIT p_limit OFFSET p_offset;
END //

CREATE PROCEDURE GetClaimValidationStats(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT 
        DATE(validated_at) as validation_date,
        COUNT(*) as total_validations,
        SUM(CASE WHEN is_valid = TRUE THEN 1 ELSE 0 END) as valid_claims,
        AVG(confidence_score) as avg_confidence,
        COUNT(CASE WHEN JSON_LENGTH(errors) > 0 THEN 1 END) as claims_with_errors,
        COUNT(CASE WHEN JSON_LENGTH(warnings) > 0 THEN 1 END) as claims_with_warnings
    FROM claim_validations
    WHERE DATE(validated_at) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(validated_at)
    ORDER BY validation_date DESC;
END //

DELIMITER ;

-- Grant permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE ON eligibility_checks TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claim_validations TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON benefits_checks TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON copay_estimates TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claim_estimates TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON prior_authorizations TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT ON eligibility_audit_log TO 'rcm_user'@'%';

-- Create indexes for performance
CREATE INDEX idx_eligibility_patient_date ON eligibility_checks(patient_id, service_date);
CREATE INDEX idx_validation_patient_date ON claim_validations(patient_id, service_date);
CREATE INDEX idx_benefits_patient_date ON benefits_checks(patient_id, service_date);

COMMIT;