-- Compliance API Schema Extensions
-- Additional database schema to support compliance API endpoints

-- Scheduled Reports Table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schedule_id VARCHAR(50) UNIQUE NOT NULL,
    report_type ENUM('compliance', 'audit', 'performance') NOT NULL,
    schedule_config JSON NOT NULL,
    recipients JSON NOT NULL,
    format ENUM('pdf', 'csv', 'json') DEFAULT 'pdf',
    filters JSON,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_run DATETIME,
    next_run DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_schedule_type (report_type),
    INDEX idx_next_run (next_run),
    INDEX idx_active (is_active)
);

-- Regulatory Reviews Table
CREATE TABLE IF NOT EXISTS regulatory_reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    review_id VARCHAR(50) UNIQUE NOT NULL,
    review_type ENUM('audit', 'investigation', 'compliance_check', 'quality_review') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    assigned_to INT,
    reviewer_name VARCHAR(255),
    reviewer_organization VARCHAR(255),
    start_date DATE,
    due_date DATE,
    completion_date DATE,
    findings TEXT,
    recommendations TEXT,
    action_items JSON,
    documents JSON,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_review_type (review_type),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_assigned_to (assigned_to)
);

-- Compliance Threshold Updates Table
CREATE TABLE IF NOT EXISTS compliance_threshold_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    thresholds JSON NOT NULL,
    reason TEXT,
    updated_by INT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    previous_thresholds JSON,
    effective_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_updated_by (updated_by),
    INDEX idx_effective_date (effective_date)
);

-- Compliance Notifications Table
CREATE TABLE IF NOT EXISTS compliance_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    notification_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    notification_type ENUM('alert', 'reminder', 'deadline', 'threshold', 'system') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('unread', 'read', 'dismissed', 'archived') DEFAULT 'unread',
    related_entity_type ENUM('claim', 'alert', 'review', 'report') NULL,
    related_entity_id INT NULL,
    metadata JSON,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    INDEX idx_user_status (user_id, status),
    INDEX idx_notification_type (notification_type),
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);

-- Notification Settings Table
CREATE TABLE IF NOT EXISTS notification_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    settings JSON NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- Compliance Benchmarks Table
CREATE TABLE IF NOT EXISTS compliance_benchmarks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    benchmark_type ENUM('industry', 'peer', 'historical', 'regulatory') NOT NULL,
    specialty VARCHAR(100),
    region VARCHAR(100),
    organization_size ENUM('small', 'medium', 'large', 'enterprise'),
    metrics JSON NOT NULL,
    data_source VARCHAR(255),
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_benchmark_type (benchmark_type),
    INDEX idx_specialty (specialty),
    INDEX idx_effective_date (effective_date),
    INDEX idx_organization_size (organization_size)
);

-- Compliance Predictions Table
CREATE TABLE IF NOT EXISTS compliance_predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    prediction_id VARCHAR(50) UNIQUE NOT NULL,
    prediction_type ENUM('risk', 'performance', 'trends', 'anomaly') NOT NULL,
    time_horizon VARCHAR(20) NOT NULL,
    confidence_level DECIMAL(3,2) DEFAULT 0.95,
    input_data JSON NOT NULL,
    predictions JSON NOT NULL,
    model_version VARCHAR(50),
    accuracy_score DECIMAL(3,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    INDEX idx_prediction_type (prediction_type),
    INDEX idx_created_at (created_at),
    INDEX idx_expires_at (expires_at)
);

-- Alert Acknowledgments Table (enhance existing alerts)
CREATE TABLE IF NOT EXISTS alert_acknowledgments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    alert_id VARCHAR(50) NOT NULL,
    acknowledged_by INT NOT NULL,
    acknowledged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    acknowledgment_note TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATETIME,
    INDEX idx_alert_id (alert_id),
    INDEX idx_acknowledged_by (acknowledged_by),
    INDEX idx_acknowledged_at (acknowledged_at)
);

-- Compliance Performance Metrics Table
CREATE TABLE IF NOT EXISTS compliance_performance_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_date DATE NOT NULL,
    provider_id INT,
    payer_type VARCHAR(50),
    specialty VARCHAR(100),
    metrics JSON NOT NULL,
    benchmark_comparison JSON,
    performance_indicators JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_metric_date_provider (metric_date, provider_id, payer_type),
    INDEX idx_metric_date (metric_date),
    INDEX idx_provider_id (provider_id),
    INDEX idx_payer_type (payer_type),
    INDEX idx_specialty (specialty)
);

-- System Health Monitoring Table
CREATE TABLE IF NOT EXISTS system_health_monitoring (
    id INT PRIMARY KEY AUTO_INCREMENT,
    check_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    system_component ENUM('validation', 'filing', 'enrollment', 'database', 'api') NOT NULL,
    health_score INT NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    status ENUM('healthy', 'warning', 'critical', 'down') NOT NULL,
    response_time_ms INT,
    error_rate DECIMAL(5,2),
    throughput_per_minute INT,
    details JSON,
    INDEX idx_check_timestamp (check_timestamp),
    INDEX idx_system_component (system_component),
    INDEX idx_status (status)
);

-- Compliance Audit Events Table (enhanced audit trail)
CREATE TABLE IF NOT EXISTS compliance_audit_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    event_type ENUM('validation', 'submission', 'approval', 'denial', 'correction', 'review') NOT NULL,
    entity_type ENUM('claim', 'provider', 'patient', 'system') NOT NULL,
    entity_id INT NOT NULL,
    user_id INT,
    action_performed VARCHAR(255) NOT NULL,
    before_state JSON,
    after_state JSON,
    metadata JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    compliance_impact ENUM('none', 'low', 'medium', 'high', 'critical') DEFAULT 'none',
    regulatory_significance BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_compliance_impact (compliance_impact),
    INDEX idx_regulatory_significance (regulatory_significance)
);

-- Insert sample compliance benchmarks
INSERT IGNORE INTO compliance_benchmarks (benchmark_type, specialty, metrics, data_source, effective_date) VALUES
('industry', 'Family Medicine', '{"overall_compliance": 85, "first_pass_rate": 82, "denial_rate": 12, "timely_filing_rate": 94}', 'Healthcare Industry Report 2024', '2024-01-01'),
('industry', 'Internal Medicine', '{"overall_compliance": 87, "first_pass_rate": 84, "denial_rate": 10, "timely_filing_rate": 96}', 'Healthcare Industry Report 2024', '2024-01-01'),
('industry', 'Cardiology', '{"overall_compliance": 89, "first_pass_rate": 86, "denial_rate": 8, "timely_filing_rate": 97}', 'Healthcare Industry Report 2024', '2024-01-01'),
('regulatory', 'All Specialties', '{"minimum_compliance": 70, "target_compliance": 90, "excellent_compliance": 95}', 'CMS Guidelines 2024', '2024-01-01');

-- Insert sample notification settings template
INSERT IGNORE INTO notification_settings (user_id, settings) VALUES
(1, '{"email_notifications": true, "sms_notifications": false, "alert_thresholds": {"critical": true, "high": true, "medium": false, "low": false}, "report_frequency": "weekly", "digest_enabled": true}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_billings_compliance_monitoring ON billings(cms_validation_status, timely_filing_status, created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_logs_monitoring ON compliance_logs(log_type, compliance_status, created_at);

-- Create views for compliance monitoring
CREATE OR REPLACE VIEW compliance_monitoring_summary AS
SELECT 
    DATE(created_at) as monitoring_date,
    COUNT(*) as total_claims,
    COUNT(CASE WHEN cms_validation_status = 'valid' THEN 1 END) as valid_claims,
    COUNT(CASE WHEN cms_validation_status IN ('invalid', 'failed') THEN 1 END) as invalid_claims,
    COUNT(CASE WHEN cms_validation_status = 'review_required' THEN 1 END) as review_required,
    AVG(compliance_score) as avg_compliance_score,
    AVG(CASE WHEN timely_filing_status = 'compliant' THEN 100 ELSE 0 END) as timely_filing_rate,
    AVG(CASE WHEN provider_enrollment_verified = 1 THEN 100 ELSE 0 END) as enrollment_rate
FROM billings 
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
GROUP BY DATE(created_at)
ORDER BY monitoring_date DESC;

-- Create view for real-time compliance dashboard
CREATE OR REPLACE VIEW real_time_compliance_dashboard AS
SELECT 
    COUNT(*) as total_claims_today,
    COUNT(CASE WHEN cms_validation_status = 'valid' THEN 1 END) as valid_claims_today,
    COUNT(CASE WHEN cms_validation_status IN ('invalid', 'failed') THEN 1 END) as failed_claims_today,
    AVG(compliance_score) as avg_compliance_score_today,
    COUNT(CASE WHEN timely_filing_status = 'overdue' THEN 1 END) as overdue_claims,
    COUNT(CASE WHEN timely_filing_status = 'due_soon' THEN 1 END) as due_soon_claims,
    COUNT(CASE WHEN provider_enrollment_verified = 0 THEN 1 END) as unverified_providers
FROM billings 
WHERE DATE(created_at) = CURDATE();

-- Create stored procedure for compliance health check
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS GetComplianceHealthCheck()
BEGIN
    DECLARE overall_health INT DEFAULT 100;
    DECLARE validation_health INT DEFAULT 100;
    DECLARE filing_health INT DEFAULT 100;
    DECLARE enrollment_health INT DEFAULT 100;
    
    -- Calculate validation health (last 24 hours)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE LEAST(100, COUNT(CASE WHEN cms_validation_status = 'valid' THEN 1 END) * 100 / COUNT(*))
        END INTO validation_health
    FROM billings 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Calculate filing health (last 24 hours)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE LEAST(100, COUNT(CASE WHEN timely_filing_status = 'compliant' THEN 1 END) * 100 / COUNT(*))
        END INTO filing_health
    FROM billings 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Calculate enrollment health (last 24 hours)
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE LEAST(100, COUNT(CASE WHEN provider_enrollment_verified = 1 THEN 1 END) * 100 / COUNT(*))
        END INTO enrollment_health
    FROM billings 
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR);
    
    -- Calculate overall health
    SET overall_health = (validation_health + filing_health + enrollment_health) / 3;
    
    SELECT 
        overall_health,
        validation_health,
        filing_health,
        enrollment_health,
        CASE 
            WHEN overall_health >= 95 THEN 'Excellent'
            WHEN overall_health >= 85 THEN 'Good'
            WHEN overall_health >= 70 THEN 'Fair'
            ELSE 'Poor'
        END as health_status,
        NOW() as check_timestamp;
END //
DELIMITER ;