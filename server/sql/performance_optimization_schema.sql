-- Performance Optimization and Monitoring Schema
-- This schema supports performance monitoring, caching, and batch processing

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type ENUM('system', 'application', 'database', 'api') NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_metrics_type_time (metric_type, timestamp),
    INDEX idx_metrics_name_time (metric_name, timestamp)
);

-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity ENUM('info', 'warning', 'error', 'critical') NOT NULL,
    message TEXT NOT NULL,
    metric_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    status ENUM('active', 'acknowledged', 'resolved') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    acknowledged_by INT NULL,
    resolved_by INT NULL,
    metadata JSON,
    INDEX idx_alerts_type_status (alert_type, status),
    INDEX idx_alerts_severity_created (severity, created_at),
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Batch jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
    id VARCHAR(100) PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    status ENUM('queued', 'processing', 'completed', 'failed', 'cancelled', 'retrying') NOT NULL,
    priority INT DEFAULT 0,
    total_items INT NOT NULL,
    processed_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    progress DECIMAL(5,2) DEFAULT 0,
    batch_size INT DEFAULT 100,
    max_retries INT DEFAULT 3,
    current_retries INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_by INT,
    error_message TEXT,
    job_data JSON,
    results JSON,
    INDEX idx_jobs_status_created (status, created_at),
    INDEX idx_jobs_type_status (job_type, status),
    INDEX idx_jobs_priority (priority DESC),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Cache statistics table
CREATE TABLE IF NOT EXISTS cache_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_type ENUM('memory', 'redis') NOT NULL,
    hit_count BIGINT DEFAULT 0,
    miss_count BIGINT DEFAULT 0,
    set_count BIGINT DEFAULT 0,
    delete_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    cache_size INT DEFAULT 0,
    hit_rate DECIMAL(5,2) DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cache_type_time (cache_type, recorded_at)
);

-- Database performance statistics
CREATE TABLE IF NOT EXISTS database_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_queries BIGINT DEFAULT 0,
    slow_queries BIGINT DEFAULT 0,
    avg_query_time DECIMAL(8,2) DEFAULT 0,
    p95_query_time DECIMAL(8,2) DEFAULT 0,
    connection_pool_size INT DEFAULT 0,
    active_connections INT DEFAULT 0,
    queued_connections INT DEFAULT 0,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_db_perf_time (recorded_at)
);

-- API performance tracking
CREATE TABLE IF NOT EXISTS api_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') NOT NULL,
    response_time INT NOT NULL, -- milliseconds
    status_code INT NOT NULL,
    user_id INT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_size INT,
    response_size INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_endpoint_time (endpoint, timestamp),
    INDEX idx_api_method_time (method, timestamp),
    INDEX idx_api_status_time (status_code, timestamp),
    INDEX idx_api_response_time (response_time),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance optimization recommendations
CREATE TABLE IF NOT EXISTS performance_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recommendation_type ENUM('index', 'query', 'cache', 'configuration') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_level ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    implementation_effort ENUM('low', 'medium', 'high') NOT NULL,
    sql_statement TEXT,
    estimated_improvement VARCHAR(100),
    status ENUM('pending', 'implemented', 'rejected', 'testing') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    implemented_at TIMESTAMP NULL,
    implemented_by INT NULL,
    notes TEXT,
    INDEX idx_recommendations_type_status (recommendation_type, status),
    INDEX idx_recommendations_impact (impact_level),
    FOREIGN KEY (implemented_by) REFERENCES users(id) ON DELETE SET NULL
);

-- System configuration for performance tuning
CREATE TABLE IF NOT EXISTS performance_configuration (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type ENUM('string', 'number', 'boolean', 'json') NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    INDEX idx_config_category (category),
    INDEX idx_config_active (is_active),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for existing tables to improve performance
-- Add indexes to billings table for better performance
ALTER TABLE billings 
ADD INDEX IF NOT EXISTS idx_billings_status_created (status, created_at),
ADD INDEX IF NOT EXISTS idx_billings_provider_service_date (provider_id, service_date),
ADD INDEX IF NOT EXISTS idx_billings_patient_status (patient_id, status);

-- Add indexes to patients table
ALTER TABLE patients 
ADD INDEX IF NOT EXISTS idx_patients_dob_lastname (dob, last_name),
ADD INDEX IF NOT EXISTS idx_patients_created_at (created_at);

-- Add indexes to cms_validation_results table if it exists
CREATE TABLE IF NOT EXISTS cms_validation_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    validation_status ENUM('pending', 'valid', 'invalid', 'warning') NOT NULL,
    validation_errors JSON,
    validation_warnings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_validation_claim_status (claim_id, validation_status),
    INDEX idx_validation_status_created (validation_status, created_at),
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE
);

-- Insert default performance configuration
INSERT IGNORE INTO performance_configuration (config_key, config_value, config_type, description, category) VALUES
('monitoring_interval', '30000', 'number', 'Performance monitoring interval in milliseconds', 'monitoring'),
('cpu_alert_threshold', '80', 'number', 'CPU usage alert threshold percentage', 'alerts'),
('memory_alert_threshold', '85', 'number', 'Memory usage alert threshold percentage', 'alerts'),
('response_time_threshold', '2000', 'number', 'API response time alert threshold in milliseconds', 'alerts'),
('error_rate_threshold', '5', 'number', 'Error rate alert threshold percentage', 'alerts'),
('cache_ttl_default', '300', 'number', 'Default cache TTL in seconds', 'cache'),
('batch_size_default', '100', 'number', 'Default batch processing size', 'batch'),
('max_concurrent_jobs', '5', 'number', 'Maximum concurrent batch jobs', 'batch'),
('connection_pool_size', '20', 'number', 'Database connection pool size', 'database'),
('slow_query_threshold', '1000', 'number', 'Slow query threshold in milliseconds', 'database');

-- Create views for performance reporting
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    DATE(timestamp) as date,
    metric_type,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM performance_metrics 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(timestamp), metric_type, metric_name
ORDER BY date DESC, metric_type, metric_name;

CREATE OR REPLACE VIEW api_performance_summary AS
SELECT 
    endpoint,
    method,
    DATE(timestamp) as date,
    COUNT(*) as request_count,
    AVG(response_time) as avg_response_time,
    MIN(response_time) as min_response_time,
    MAX(response_time) as max_response_time,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    (COUNT(CASE WHEN status_code >= 400 THEN 1 END) / COUNT(*)) * 100 as error_rate
FROM api_performance 
WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY endpoint, method, DATE(timestamp)
ORDER BY date DESC, request_count DESC;

CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    id,
    alert_type,
    severity,
    message,
    metric_value,
    threshold_value,
    created_at,
    TIMESTAMPDIFF(MINUTE, created_at, NOW()) as minutes_active
FROM system_alerts 
WHERE status = 'active'
ORDER BY severity DESC, created_at DESC;

-- Stored procedures for performance optimization
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetPerformanceMetrics(
    IN p_metric_type VARCHAR(50),
    IN p_hours_back INT
)
BEGIN
    SELECT 
        metric_name,
        metric_value,
        unit,
        timestamp,
        metadata
    FROM performance_metrics 
    WHERE (p_metric_type IS NULL OR metric_type = p_metric_type)
    AND timestamp >= DATE_SUB(NOW(), INTERVAL p_hours_back HOUR)
    ORDER BY timestamp DESC;
END //

CREATE PROCEDURE IF NOT EXISTS GetSlowQueries(
    IN p_limit INT
)
BEGIN
    SELECT 
        endpoint,
        method,
        AVG(response_time) as avg_response_time,
        COUNT(*) as request_count,
        MAX(response_time) as max_response_time
    FROM api_performance 
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    AND response_time > 1000
    GROUP BY endpoint, method
    ORDER BY avg_response_time DESC
    LIMIT p_limit;
END //

CREATE PROCEDURE IF NOT EXISTS CleanupOldMetrics(
    IN p_days_to_keep INT
)
BEGIN
    DECLARE deleted_count INT DEFAULT 0;
    
    DELETE FROM performance_metrics 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL p_days_to_keep DAY);
    
    SET deleted_count = ROW_COUNT();
    
    DELETE FROM api_performance 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL p_days_to_keep DAY);
    
    SET deleted_count = deleted_count + ROW_COUNT();
    
    SELECT deleted_count as total_deleted;
END //

DELIMITER ;

-- Create triggers for automatic cleanup
DELIMITER //

CREATE TRIGGER IF NOT EXISTS cleanup_old_performance_metrics
AFTER INSERT ON performance_metrics
FOR EACH ROW
BEGIN
    -- Clean up metrics older than 7 days (configurable)
    IF (RAND() < 0.01) THEN -- 1% chance to run cleanup
        DELETE FROM performance_metrics 
        WHERE timestamp < DATE_SUB(NOW(), INTERVAL 7 DAY);
    END IF;
END //

DELIMITER ;