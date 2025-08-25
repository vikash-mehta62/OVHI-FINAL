-- Monitoring and Logging Database Schema
-- Creates tables for audit logs, error tracking, and performance monitoring

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    category ENUM('AUTHENTICATION', 'DATA_ACCESS', 'FINANCIAL', 'SYSTEM', 'SECURITY', 'COMPLIANCE') NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id VARCHAR(50),
    resource VARCHAR(100),
    resource_id VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    metadata JSON,
    checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_timestamp (timestamp),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_category (category),
    INDEX idx_audit_action (action),
    INDEX idx_audit_resource (resource),
    INDEX idx_audit_success (success)
);

-- Error Logs Table
CREATE TABLE IF NOT EXISTS error_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    message TEXT NOT NULL,
    name VARCHAR(100),
    code VARCHAR(50),
    category ENUM('DATABASE', 'AUTHENTICATION', 'VALIDATION', 'NETWORK', 'FILESYSTEM', 'BUSINESS_LOGIC', 'API', 'UNKNOWN') NOT NULL,
    severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL,
    stack_trace TEXT,
    file VARCHAR(255),
    line_number INT,
    column_number INT,
    component VARCHAR(100),
    operation VARCHAR(100),
    user_id VARCHAR(50),
    request_id VARCHAR(50),
    user_agent TEXT,
    ip_address VARCHAR(45),
    url VARCHAR(500),
    method VARCHAR(10),
    status_code INT,
    response_time INT,
    memory_usage JSON,
    cpu_usage JSON,
    environment VARCHAR(20),
    node_version VARCHAR(20),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_error_timestamp (timestamp),
    INDEX idx_error_category (category),
    INDEX idx_error_severity (severity),
    INDEX idx_error_component (component),
    INDEX idx_error_user (user_id),
    INDEX idx_error_status (status_code),
    INDEX idx_error_environment (environment)
);

-- Error Alerts Table
CREATE TABLE IF NOT EXISTS error_alerts (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    level ENUM('info', 'warning', 'critical') NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    error_count INT NOT NULL,
    time_window INT NOT NULL,
    component VARCHAR(100),
    message TEXT NOT NULL,
    recent_error_data JSON,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(50),
    acknowledged_at DATETIME,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by VARCHAR(50),
    resolved_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_alert_timestamp (timestamp),
    INDEX idx_alert_level (level),
    INDEX idx_alert_category (category),
    INDEX idx_alert_acknowledged (acknowledged),
    INDEX idx_alert_resolved (resolved)
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    operation_id VARCHAR(50) NOT NULL,
    execution_time DECIMAL(10,3) NOT NULL, -- milliseconds
    memory_delta JSON,
    metadata JSON,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_perf_timestamp (timestamp),
    INDEX idx_perf_type (operation_type),
    INDEX idx_perf_execution_time (execution_time),
    INDEX idx_perf_success (success)
);

-- System Health Checks Table
CREATE TABLE IF NOT EXISTS health_checks (
    id VARCHAR(50) PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    component VARCHAR(50) NOT NULL,
    status ENUM('healthy', 'unhealthy', 'error') NOT NULL,
    response_time INT, -- milliseconds
    message TEXT,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_health_timestamp (timestamp),
    INDEX idx_health_component (component),
    INDEX idx_health_status (status)
);

-- Monitoring Configuration Table
CREATE TABLE IF NOT EXISTS monitoring_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    description TEXT,
    updated_by VARCHAR(50),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_config_key (config_key)
);

-- Insert default monitoring configuration
INSERT INTO monitoring_config (config_key, config_value, description) VALUES
('performance_thresholds', JSON_OBJECT(
    'responseTime', JSON_OBJECT('good', 100, 'warning', 500, 'critical', 2000),
    'errorRate', JSON_OBJECT('good', 1, 'warning', 3, 'critical', 5),
    'memoryUsage', JSON_OBJECT('good', 60, 'warning', 80, 'critical', 90)
), 'Performance monitoring thresholds'),
('alert_settings', JSON_OBJECT(
    'enabled', true,
    'channels', JSON_ARRAY('console', 'database'),
    'cooldownPeriod', 300000
), 'Alert system configuration'),
('retention_policy', JSON_OBJECT(
    'detailed', 7,
    'summary', 30,
    'archived', 365
), 'Data retention policy in days')
ON DUPLICATE KEY UPDATE 
    config_value = VALUES(config_value),
    updated_at = CURRENT_TIMESTAMP;

-- Create views for common monitoring queries

-- Recent Errors View
CREATE OR REPLACE VIEW recent_errors AS
SELECT 
    id,
    timestamp,
    message,
    category,
    severity,
    component,
    user_id,
    status_code,
    response_time
FROM error_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;

-- Error Summary View
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    DATE(timestamp) as date,
    category,
    severity,
    COUNT(*) as error_count,
    AVG(response_time) as avg_response_time
FROM error_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(timestamp), category, severity
ORDER BY date DESC, error_count DESC;

-- Performance Summary View
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    DATE(timestamp) as date,
    operation_type,
    COUNT(*) as operation_count,
    AVG(execution_time) as avg_execution_time,
    MIN(execution_time) as min_execution_time,
    MAX(execution_time) as max_execution_time,
    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_operations
FROM performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(timestamp), operation_type
ORDER BY date DESC, operation_count DESC;

-- Audit Activity View
CREATE OR REPLACE VIEW audit_activity AS
SELECT 
    DATE(timestamp) as date,
    category,
    action,
    COUNT(*) as activity_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN success = FALSE THEN 1 END) as failed_attempts
FROM audit_logs 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(timestamp), category, action
ORDER BY date DESC, activity_count DESC;

-- System Health Status View
CREATE OR REPLACE VIEW system_health_status AS
SELECT 
    component,
    status,
    AVG(response_time) as avg_response_time,
    COUNT(*) as check_count,
    MAX(timestamp) as last_check,
    COUNT(CASE WHEN status = 'healthy' THEN 1 END) / COUNT(*) * 100 as health_percentage
FROM health_checks 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY component, status
ORDER BY component, health_percentage DESC;

-- Create stored procedures for common operations

DELIMITER //

-- Procedure to clean up old monitoring data
CREATE PROCEDURE CleanupMonitoringData(IN days_to_keep INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Clean up old audit logs
    DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up old error logs
    DELETE FROM error_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up old performance metrics
    DELETE FROM performance_metrics WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up old health checks
    DELETE FROM health_checks WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Clean up resolved alerts older than retention period
    DELETE FROM error_alerts 
    WHERE resolved = TRUE 
      AND resolved_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    COMMIT;
    
    SELECT 
        'Cleanup completed' as status,
        ROW_COUNT() as rows_affected,
        NOW() as completed_at;
END //

-- Procedure to get system health summary
CREATE PROCEDURE GetSystemHealthSummary()
BEGIN
    SELECT 
        'System Health Summary' as report_type,
        NOW() as generated_at,
        (SELECT COUNT(*) FROM error_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as errors_24h,
        (SELECT COUNT(*) FROM error_logs WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR) AND severity = 'CRITICAL') as critical_errors_24h,
        (SELECT COUNT(*) FROM error_alerts WHERE acknowledged = FALSE) as unacknowledged_alerts,
        (SELECT AVG(execution_time) FROM performance_metrics WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as avg_response_time_1h,
        (SELECT COUNT(DISTINCT component) FROM health_checks WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND status = 'healthy') as healthy_components,
        (SELECT COUNT(DISTINCT component) FROM health_checks WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)) as total_components;
END //

-- Procedure to archive old data
CREATE PROCEDURE ArchiveOldData(IN archive_days INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Create archive tables if they don't exist
    CREATE TABLE IF NOT EXISTS audit_logs_archive LIKE audit_logs;
    CREATE TABLE IF NOT EXISTS error_logs_archive LIKE error_logs;
    CREATE TABLE IF NOT EXISTS performance_metrics_archive LIKE performance_metrics;
    
    -- Archive old audit logs
    INSERT INTO audit_logs_archive 
    SELECT * FROM audit_logs 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    
    -- Archive old error logs
    INSERT INTO error_logs_archive 
    SELECT * FROM error_logs 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    
    -- Archive old performance metrics
    INSERT INTO performance_metrics_archive 
    SELECT * FROM performance_metrics 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    
    -- Delete archived data from main tables
    DELETE FROM audit_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    DELETE FROM error_logs WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    DELETE FROM performance_metrics WHERE timestamp < DATE_SUB(NOW(), INTERVAL archive_days DAY);
    
    COMMIT;
    
    SELECT 
        'Archive completed' as status,
        ROW_COUNT() as rows_archived,
        NOW() as completed_at;
END //

DELIMITER ;

-- Create events for automated maintenance (if event scheduler is enabled)
-- SET GLOBAL event_scheduler = ON;

-- Daily cleanup event
CREATE EVENT IF NOT EXISTS daily_monitoring_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL CleanupMonitoringData(30);

-- Weekly archival event
CREATE EVENT IF NOT EXISTS weekly_monitoring_archive
ON SCHEDULE EVERY 1 WEEK
STARTS CURRENT_TIMESTAMP
DO
  CALL ArchiveOldData(90);