-- External System Integrations Schema
-- Database schema for external system integrations including CMS, clearinghouses, and payers

-- Integration Logs Table
CREATE TABLE IF NOT EXISTS integration_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    integration_id VARCHAR(50) NOT NULL,
    activity_type ENUM('eligibility_verification', 'prior_authorization', 'claim_submission', 'status_inquiry', 'era_processing', 'health_check') NOT NULL,
    request_data JSON,
    response_data JSON,
    details JSON,
    status ENUM('success', 'failure', 'pending', 'timeout') DEFAULT 'pending',
    response_time_ms INT,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_integration_activity (integration_id, activity_type),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
);

-- Prior Authorizations Table
CREATE TABLE IF NOT EXISTS prior_authorizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT,
    authorization_number VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('pending', 'approved', 'denied', 'expired') DEFAULT 'pending',
    approved_services JSON,
    denied_services JSON,
    effective_date DATE,
    expiration_date DATE,
    units_approved INT,
    notes TEXT,
    reviewer_name VARCHAR(255),
    review_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_status (status),
    INDEX idx_auth_number (authorization_number),
    INDEX idx_expiration_date (expiration_date)
);

-- Eligibility Verifications Table
CREATE TABLE IF NOT EXISTS eligibility_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    payer_id VARCHAR(50),
    verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    eligible BOOLEAN DEFAULT FALSE,
    coverage_status ENUM('active', 'inactive', 'terminated', 'unknown') DEFAULT 'unknown',
    effective_date DATE,
    termination_date DATE,
    copay_amount DECIMAL(10,2),
    deductible_amount DECIMAL(10,2),
    deductible_remaining DECIMAL(10,2),
    out_of_pocket_max DECIMAL(10,2),
    out_of_pocket_remaining DECIMAL(10,2),
    benefits JSON,
    limitations JSON,
    messages JSON,
    verification_source VARCHAR(100),
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_payer (patient_id, payer_id),
    INDEX idx_verification_date (verification_date),
    INDEX idx_expires_at (expires_at),
    INDEX idx_eligible (eligible)
);

-- Claim Submissions Table
CREATE TABLE IF NOT EXISTS claim_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    submission_id VARCHAR(100) UNIQUE NOT NULL,
    clearinghouse_id VARCHAR(50),
    tracking_number VARCHAR(100),
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('submitted', 'accepted', 'rejected', 'processing', 'completed') DEFAULT 'submitted',
    format ENUM('X12_837', 'CMS_1500', 'UB_04') DEFAULT 'X12_837',
    test_mode BOOLEAN DEFAULT FALSE,
    priority ENUM('normal', 'high', 'urgent') DEFAULT 'normal',
    validation_errors JSON,
    warnings JSON,
    expected_processing_date DATETIME,
    actual_processing_date DATETIME,
    payer_id VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_status (status),
    INDEX idx_submission_date (submission_date),
    INDEX idx_clearinghouse (clearinghouse_id)
);

-- Payer Status Inquiries Table
CREATE TABLE IF NOT EXISTS payer_status_inquiries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    payer_claim_number VARCHAR(100),
    inquiry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    claim_status VARCHAR(50),
    status_date DATETIME,
    payment_amount DECIMAL(10,2),
    payment_date DATE,
    denial_reason TEXT,
    denial_code VARCHAR(20),
    messages JSON,
    next_action VARCHAR(255),
    response_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_payer_claim_number (payer_claim_number),
    INDEX idx_inquiry_date (inquiry_date),
    INDEX idx_status_date (status_date)
);

-- ERA Processing Table
CREATE TABLE IF NOT EXISTS era_processing (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_id VARCHAR(100) UNIQUE NOT NULL,
    payer_name VARCHAR(255),
    payer_id VARCHAR(50),
    check_number VARCHAR(50),
    check_date DATE,
    total_payments DECIMAL(12,2),
    claims_processed INT DEFAULT 0,
    file_content LONGTEXT,
    format ENUM('X12_835', 'CSV', 'XML') DEFAULT 'X12_835',
    processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    auto_post_payments BOOLEAN DEFAULT FALSE,
    create_adjustments BOOLEAN DEFAULT TRUE,
    update_claim_status BOOLEAN DEFAULT TRUE,
    processing_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_date DATETIME,
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_era_id (era_id),
    INDEX idx_payer_id (payer_id),
    INDEX idx_check_date (check_date),
    INDEX idx_processing_status (processing_status),
    INDEX idx_processing_date (processing_date)
);

-- ERA Payments Table
CREATE TABLE IF NOT EXISTS era_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_id VARCHAR(100) NOT NULL,
    claim_id INT,
    payer_claim_number VARCHAR(100),
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    check_number VARCHAR(50),
    payment_method ENUM('check', 'eft', 'credit_card', 'other') DEFAULT 'check',
    reference_number VARCHAR(100),
    payment_status ENUM('pending', 'posted', 'reversed') DEFAULT 'pending',
    posted_date DATETIME,
    posted_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE SET NULL,
    INDEX idx_era_id (era_id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_payer_claim_number (payer_claim_number),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_status (payment_status)
);

-- Claim Adjustments Table
CREATE TABLE IF NOT EXISTS claim_adjustments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    era_id VARCHAR(100),
    adjustment_type ENUM('contractual', 'deductible', 'copay', 'coinsurance', 'denial', 'other') NOT NULL,
    adjustment_amount DECIMAL(10,2) NOT NULL,
    reason_code VARCHAR(20),
    reason_description TEXT,
    adjustment_date DATE,
    posted_date DATETIME,
    posted_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_era_id (era_id),
    INDEX idx_adjustment_type (adjustment_type),
    INDEX idx_adjustment_date (adjustment_date),
    INDEX idx_reason_code (reason_code)
);

-- Integration Configuration Table
CREATE TABLE IF NOT EXISTS integration_configurations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    integration_id VARCHAR(50) UNIQUE NOT NULL,
    integration_name VARCHAR(255) NOT NULL,
    integration_type ENUM('cms', 'clearinghouse', 'payer', 'prior_auth', 'era_processor') NOT NULL,
    endpoint_url VARCHAR(500),
    api_key_encrypted TEXT,
    timeout_seconds INT DEFAULT 30,
    retry_attempts INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    test_mode BOOLEAN DEFAULT FALSE,
    configuration JSON,
    last_health_check DATETIME,
    health_status ENUM('healthy', 'unhealthy', 'unknown') DEFAULT 'unknown',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_integration_type (integration_type),
    INDEX idx_is_active (is_active),
    INDEX idx_health_status (health_status)
);

-- Integration Performance Metrics Table
CREATE TABLE IF NOT EXISTS integration_performance_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    integration_id VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    total_requests INT DEFAULT 0,
    successful_requests INT DEFAULT 0,
    failed_requests INT DEFAULT 0,
    avg_response_time_ms INT DEFAULT 0,
    max_response_time_ms INT DEFAULT 0,
    min_response_time_ms INT DEFAULT 0,
    timeout_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_integration_date (integration_id, metric_date),
    INDEX idx_integration_id (integration_id),
    INDEX idx_metric_date (metric_date),
    INDEX idx_uptime_percentage (uptime_percentage)
);

-- Add integration-related fields to existing billings table
ALTER TABLE billings 
ADD COLUMN IF NOT EXISTS submission_status ENUM('pending', 'submitted', 'accepted', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submission_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS submitted_at DATETIME,
ADD COLUMN IF NOT EXISTS payer_claim_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS claim_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS status_date DATETIME;

-- Add indexes for new billing fields
CREATE INDEX IF NOT EXISTS idx_billings_submission_status ON billings(submission_status);
CREATE INDEX IF NOT EXISTS idx_billings_submission_id ON billings(submission_id);
CREATE INDEX IF NOT EXISTS idx_billings_payer_claim_number ON billings(payer_claim_number);
CREATE INDEX IF NOT EXISTS idx_billings_claim_status ON billings(claim_status);

-- Insert sample integration configurations
INSERT IGNORE INTO integration_configurations (integration_id, integration_name, integration_type, endpoint_url, timeout_seconds, retry_attempts) VALUES
('cms_eligibility', 'CMS Eligibility Verification', 'cms', 'https://api.cms.gov/eligibility', 30, 3),
('clearinghouse_primary', 'Primary Clearinghouse', 'clearinghouse', 'https://api.clearinghouse.com', 60, 2),
('prior_auth_system', 'Prior Authorization System', 'prior_auth', 'https://api.priorauth.com', 45, 3),
('era_processor', 'ERA Processing System', 'era_processor', 'https://api.era.com', 30, 2);

-- Create views for integration monitoring
CREATE OR REPLACE VIEW integration_status_summary AS
SELECT 
    ic.integration_id,
    ic.integration_name,
    ic.integration_type,
    ic.is_active,
    ic.health_status,
    ic.last_health_check,
    COALESCE(pm.total_requests, 0) as daily_requests,
    COALESCE(pm.successful_requests, 0) as daily_successful,
    COALESCE(pm.failed_requests, 0) as daily_failed,
    COALESCE(pm.avg_response_time_ms, 0) as avg_response_time,
    COALESCE(pm.uptime_percentage, 100) as uptime_percentage
FROM integration_configurations ic
LEFT JOIN integration_performance_metrics pm ON ic.integration_id = pm.integration_id 
    AND pm.metric_date = CURDATE();

-- Create view for recent integration activity
CREATE OR REPLACE VIEW recent_integration_activity AS
SELECT 
    il.integration_id,
    il.activity_type,
    il.status,
    il.response_time_ms,
    il.created_at,
    ic.integration_name,
    ic.integration_type
FROM integration_logs il
JOIN integration_configurations ic ON il.integration_id = ic.integration_id
WHERE il.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY il.created_at DESC;

-- Create stored procedure for integration health monitoring
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS UpdateIntegrationMetrics()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_integration_id VARCHAR(50);
    DECLARE v_metric_date DATE DEFAULT CURDATE();
    
    DECLARE integration_cursor CURSOR FOR 
        SELECT DISTINCT integration_id FROM integration_logs 
        WHERE DATE(created_at) = v_metric_date;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN integration_cursor;
    
    integration_loop: LOOP
        FETCH integration_cursor INTO v_integration_id;
        IF done THEN
            LEAVE integration_loop;
        END IF;
        
        INSERT INTO integration_performance_metrics (
            integration_id, metric_date, total_requests, successful_requests, 
            failed_requests, avg_response_time_ms, max_response_time_ms, 
            min_response_time_ms, timeout_count, error_count
        )
        SELECT 
            v_integration_id,
            v_metric_date,
            COUNT(*),
            COUNT(CASE WHEN status = 'success' THEN 1 END),
            COUNT(CASE WHEN status IN ('failure', 'timeout') THEN 1 END),
            AVG(COALESCE(response_time_ms, 0)),
            MAX(COALESCE(response_time_ms, 0)),
            MIN(COALESCE(response_time_ms, 0)),
            COUNT(CASE WHEN status = 'timeout' THEN 1 END),
            COUNT(CASE WHEN status = 'failure' THEN 1 END)
        FROM integration_logs 
        WHERE integration_id = v_integration_id 
        AND DATE(created_at) = v_metric_date
        ON DUPLICATE KEY UPDATE
            total_requests = VALUES(total_requests),
            successful_requests = VALUES(successful_requests),
            failed_requests = VALUES(failed_requests),
            avg_response_time_ms = VALUES(avg_response_time_ms),
            max_response_time_ms = VALUES(max_response_time_ms),
            min_response_time_ms = VALUES(min_response_time_ms),
            timeout_count = VALUES(timeout_count),
            error_count = VALUES(error_count);
    END LOOP;
    
    CLOSE integration_cursor;
END //
DELIMITER ;

-- Create event scheduler for daily metrics update (if events are enabled)
-- CREATE EVENT IF NOT EXISTS daily_integration_metrics
-- ON SCHEDULE EVERY 1 DAY
-- STARTS TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '01:00:00')
-- DO CALL UpdateIntegrationMetrics();