-- Integration Management Schema
-- This schema supports the integration management interface with connection status,
-- configuration tools, error handling, audit trails, and performance monitoring

-- Integration metrics table for performance tracking
CREATE TABLE IF NOT EXISTS integration_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  uptime DECIMAL(5,2) DEFAULT 0.00,
  avg_response_time INT DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  error_rate DECIMAL(5,2) DEFAULT 0.00,
  error_count INT DEFAULT 0,
  throughput DECIMAL(10,2) DEFAULT 0.00,
  availability DECIMAL(5,2) DEFAULT 0.00,
  transaction_count INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_last_updated (last_updated),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration performance log for historical tracking
CREATE TABLE IF NOT EXISTS integration_performance_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  response_time INT NOT NULL,
  success_rate DECIMAL(5,2) NOT NULL,
  error_count INT DEFAULT 0,
  throughput DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration alerts for monitoring notifications
CREATE TABLE IF NOT EXISTS integration_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  type ENUM('error', 'warning', 'info') NOT NULL,
  severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  message TEXT NOT NULL,
  details JSON,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(50),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_type (type),
  INDEX idx_severity (severity),
  INDEX idx_acknowledged (acknowledged),
  INDEX idx_resolved (resolved),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration audit log for comprehensive tracking
CREATE TABLE IF NOT EXISTS integration_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  action_type ENUM('configuration', 'connection', 'transaction', 'error', 'health_check') NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON,
  status ENUM('success', 'failure', 'warning') NOT NULL,
  duration INT, -- in milliseconds
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_action_type (action_type),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration health checks table
CREATE TABLE IF NOT EXISTS integration_health_checks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  check_type VARCHAR(50) NOT NULL,
  status ENUM('healthy', 'warning', 'critical', 'offline') NOT NULL,
  response_time INT,
  error_message TEXT,
  details JSON,
  checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_check_type (check_type),
  INDEX idx_status (status),
  INDEX idx_checked_at (checked_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration configuration history for change tracking
CREATE TABLE IF NOT EXISTS integration_config_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  config_version INT NOT NULL,
  config_data JSON NOT NULL,
  changed_by VARCHAR(50) NOT NULL,
  change_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_config_version (config_version),
  INDEX idx_changed_by (changed_by),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration retry attempts for error handling
CREATE TABLE IF NOT EXISTS integration_retry_attempts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  attempt_number INT NOT NULL,
  max_attempts INT NOT NULL,
  error_message TEXT,
  retry_after TIMESTAMP,
  status ENUM('pending', 'retrying', 'failed', 'succeeded') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_status (status),
  INDEX idx_retry_after (retry_after),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration rate limiting for API management
CREATE TABLE IF NOT EXISTS integration_rate_limits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  requests_per_minute INT DEFAULT 60,
  requests_per_hour INT DEFAULT 3600,
  requests_per_day INT DEFAULT 86400,
  current_minute_count INT DEFAULT 0,
  current_hour_count INT DEFAULT 0,
  current_day_count INT DEFAULT 0,
  last_reset_minute TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reset_hour TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reset_day TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_endpoint (endpoint),
  UNIQUE KEY unique_integration_endpoint (integration_id, endpoint),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Integration notifications for alert management
CREATE TABLE IF NOT EXISTS integration_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id VARCHAR(50) NOT NULL,
  notification_type ENUM('email', 'sms', 'webhook', 'in_app') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  status ENUM('pending', 'sent', 'failed', 'delivered') NOT NULL,
  sent_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_integration_id (integration_id),
  INDEX idx_notification_type (notification_type),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (integration_id) REFERENCES external_integrations(id) ON DELETE CASCADE
);

-- Sample data for testing
INSERT IGNORE INTO integration_metrics (integration_id, uptime, avg_response_time, success_rate, error_rate, throughput, availability) VALUES
('eligibility_verify', 99.5, 250, 98.2, 1.8, 150.5, 99.8),
('clearinghouse_main', 97.8, 180, 96.5, 3.5, 200.3, 98.1),
('payer_inquiry', 95.2, 320, 94.8, 5.2, 75.2, 96.5),
('era_processor', 98.9, 150, 99.1, 0.9, 300.8, 99.2),
('prior_auth', 96.7, 280, 95.3, 4.7, 45.6, 97.1);

-- Sample performance log data
INSERT IGNORE INTO integration_performance_log (integration_id, response_time, success_rate, error_count, throughput, status) VALUES
('eligibility_verify', 245, 98.5, 2, 155.2, 'connected'),
('eligibility_verify', 255, 97.8, 3, 148.9, 'connected'),
('clearinghouse_main', 175, 96.8, 5, 205.1, 'connected'),
('clearinghouse_main', 185, 96.2, 7, 195.7, 'connected'),
('payer_inquiry', 315, 95.1, 8, 78.3, 'connected'),
('era_processor', 145, 99.3, 1, 305.2, 'connected'),
('prior_auth', 275, 95.8, 6, 48.1, 'connected');

-- Sample alerts
INSERT IGNORE INTO integration_alerts (integration_id, type, severity, message, details) VALUES
('payer_inquiry', 'warning', 'medium', 'Response time above threshold', '{"threshold": 300, "actual": 320, "endpoint": "/status"}'),
('clearinghouse_main', 'error', 'high', 'Connection timeout occurred', '{"timeout": 30000, "endpoint": "/submit"}'),
('prior_auth', 'info', 'low', 'Scheduled maintenance completed', '{"maintenance_window": "2024-01-15 02:00-04:00"}');

-- Sample audit log entries
INSERT IGNORE INTO integration_audit_log (integration_id, action, action_type, user_id, user_name, ip_address, details, status, duration) VALUES
('eligibility_verify', 'Configuration Updated', 'configuration', 'admin', 'System Administrator', '192.168.1.100', '{"field": "timeout", "old_value": 25000, "new_value": 30000}', 'success', 150),
('clearinghouse_main', 'Connection Test', 'connection', 'user123', 'John Doe', '192.168.1.101', '{"test_type": "health_check", "endpoint": "/health"}', 'success', 245),
('payer_inquiry', 'Status Inquiry', 'transaction', 'system', 'Automated System', '127.0.0.1', '{"claim_id": "CLM001", "inquiry_type": "status"}', 'failure', 5000),
('era_processor', 'Health Check', 'health_check', 'system', 'Health Monitor', '127.0.0.1', '{"check_type": "automated", "interval": 300}', 'success', 120);

-- Sample health check data
INSERT IGNORE INTO integration_health_checks (integration_id, check_type, status, response_time, details) VALUES
('eligibility_verify', 'endpoint_health', 'healthy', 245, '{"status_code": 200, "response": "OK"}'),
('clearinghouse_main', 'endpoint_health', 'healthy', 180, '{"status_code": 200, "response": "Service Available"}'),
('payer_inquiry', 'endpoint_health', 'warning', 325, '{"status_code": 200, "response": "Slow Response"}'),
('era_processor', 'endpoint_health', 'healthy', 150, '{"status_code": 200, "response": "Processing"}'),
('prior_auth', 'endpoint_health', 'critical', 0, '{"status_code": 500, "error": "Internal Server Error"}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integration_metrics_composite ON integration_metrics(integration_id, last_updated);
CREATE INDEX IF NOT EXISTS idx_performance_log_composite ON integration_performance_log(integration_id, created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_composite ON integration_alerts(integration_id, type, acknowledged);
CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON integration_audit_log(integration_id, action_type, created_at);
CREATE INDEX IF NOT EXISTS idx_health_checks_composite ON integration_health_checks(integration_id, status, checked_at);

-- Create views for common queries
CREATE OR REPLACE VIEW integration_dashboard_view AS
SELECT 
  i.id,
  i.name,
  i.type,
  i.status,
  i.enabled,
  i.last_test,
  m.uptime,
  m.avg_response_time,
  m.success_rate,
  m.error_rate,
  m.throughput,
  m.availability,
  COUNT(a.id) as alert_count,
  COUNT(CASE WHEN a.acknowledged = FALSE THEN 1 END) as unacknowledged_alerts
FROM external_integrations i
LEFT JOIN integration_metrics m ON i.id = m.integration_id
LEFT JOIN integration_alerts a ON i.id = a.integration_id AND a.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY i.id, i.name, i.type, i.status, i.enabled, i.last_test, m.uptime, m.avg_response_time, m.success_rate, m.error_rate, m.throughput, m.availability;

CREATE OR REPLACE VIEW integration_performance_summary AS
SELECT 
  integration_id,
  DATE(created_at) as date,
  AVG(response_time) as avg_response_time,
  AVG(success_rate) as avg_success_rate,
  SUM(error_count) as total_errors,
  AVG(throughput) as avg_throughput,
  COUNT(*) as measurement_count
FROM integration_performance_log
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY integration_id, DATE(created_at)
ORDER BY integration_id, date;