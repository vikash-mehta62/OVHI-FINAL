-- Analytics and Integrations Database Schema
-- Run this SQL to create the required tables for analytics and integration management

-- Report generation log
CREATE TABLE IF NOT EXISTS report_generation_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  parameters JSON,
  record_count INT DEFAULT 0,
  file_path VARCHAR(500),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  download_count INT DEFAULT 0,
  INDEX idx_user_reports (user_id, generated_at),
  INDEX idx_report_type (report_type),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- User integrations
CREATE TABLE IF NOT EXISTS user_integrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  integration_name VARCHAR(100) NOT NULL,
  configuration JSON NOT NULL,
  status ENUM('active', 'inactive', 'error', 'testing') DEFAULT 'inactive',
  sync_frequency ENUM('hourly', 'daily', 'weekly', 'monthly') DEFAULT 'daily',
  auto_sync BOOLEAN DEFAULT TRUE,
  last_sync TIMESTAMP NULL,
  sync_status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  error_count INT DEFAULT 0,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_integrations (user_id, integration_type),
  INDEX idx_status (status),
  INDEX idx_sync_schedule (auto_sync, sync_frequency, last_sync),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_integration (user_id, integration_type, integration_name)
);

-- Integration audit log
CREATE TABLE IF NOT EXISTS integration_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  integration_id INT,
  action VARCHAR(50) NOT NULL,
  details JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_audit (user_id, created_at),
  INDEX idx_integration_audit (integration_id, created_at),
  INDEX idx_action (action),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES user_integrations(id) ON DELETE SET NULL
);

-- Integration sync history
CREATE TABLE IF NOT EXISTS integration_sync_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id INT NOT NULL,
  sync_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sync_completed_at TIMESTAMP NULL,
  status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
  records_processed INT DEFAULT 0,
  records_created INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  error_details JSON,
  sync_duration_seconds INT,
  INDEX idx_integration_sync (integration_id, sync_started_at),
  INDEX idx_sync_status (status),
  FOREIGN KEY (integration_id) REFERENCES user_integrations(id) ON DELETE CASCADE
);

-- Analytics cache for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  cache_key VARCHAR(255) NOT NULL,
  cache_data JSON NOT NULL,
  timeframe VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_user_cache (user_id, cache_key),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_cache (user_id, cache_key, timeframe)
);

-- Patient risk scores (for advanced analytics)
CREATE TABLE IF NOT EXISTS patient_risk_scores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  risk_category VARCHAR(50) NOT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  risk_factors JSON,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_patient_risk (patient_id, risk_category),
  INDEX idx_provider_risk (provider_id, risk_category),
  INDEX idx_risk_score (risk_score),
  INDEX idx_expires_at (expires_at),
  FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Practice benchmarks
CREATE TABLE IF NOT EXISTS practice_benchmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  specialty VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  percentile_25 DECIMAL(10,2),
  percentile_50 DECIMAL(10,2),
  percentile_75 DECIMAL(10,2),
  percentile_90 DECIMAL(10,2),
  sample_size INT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_specialty_metric (specialty, metric_name),
  INDEX idx_period (period_start, period_end),
  UNIQUE KEY unique_benchmark (specialty, metric_name, period_start, period_end)
);

-- Quality measures tracking
CREATE TABLE IF NOT EXISTS quality_measures (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  measure_code VARCHAR(50) NOT NULL,
  measure_name VARCHAR(255) NOT NULL,
  numerator INT DEFAULT 0,
  denominator INT DEFAULT 0,
  performance_rate DECIMAL(5,2),
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_measures (provider_id, reporting_period_start),
  INDEX idx_measure_code (measure_code),
  INDEX idx_performance_rate (performance_rate),
  FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_provider_measure (provider_id, measure_code, reporting_period_start, reporting_period_end)
);

-- Integration webhooks
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  integration_id INT NOT NULL,
  webhook_url VARCHAR(500) NOT NULL,
  webhook_secret VARCHAR(255),
  events JSON NOT NULL,
  status ENUM('active', 'inactive', 'failed') DEFAULT 'active',
  last_triggered TIMESTAMP NULL,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_integration_webhooks (integration_id),
  INDEX idx_webhook_status (status),
  FOREIGN KEY (integration_id) REFERENCES user_integrations(id) ON DELETE CASCADE
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  integration_id INT,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  request_size_bytes INT,
  response_size_bytes INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_api (user_id, created_at),
  INDEX idx_integration_api (integration_id, created_at),
  INDEX idx_endpoint (endpoint),
  INDEX idx_status_code (status_code),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (integration_id) REFERENCES user_integrations(id) ON DELETE SET NULL
);

-- Scheduled tasks for automation
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  schedule_expression VARCHAR(100) NOT NULL, -- Cron expression
  task_config JSON,
  status ENUM('active', 'inactive', 'running', 'failed') DEFAULT 'active',
  last_run TIMESTAMP NULL,
  next_run TIMESTAMP NULL,
  run_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_tasks (user_id, status),
  INDEX idx_next_run (next_run, status),
  INDEX idx_task_type (task_type),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Task execution history
CREATE TABLE IF NOT EXISTS task_execution_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  task_id INT NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  status ENUM('running', 'completed', 'failed', 'cancelled') DEFAULT 'running',
  result JSON,
  error_message TEXT,
  execution_time_seconds INT,
  INDEX idx_task_history (task_id, started_at),
  INDEX idx_execution_status (status),
  FOREIGN KEY (task_id) REFERENCES scheduled_tasks(id) ON DELETE CASCADE
);

-- Insert default benchmarks for common specialties
INSERT IGNORE INTO practice_benchmarks (specialty, metric_name, metric_value, percentile_25, percentile_50, percentile_75, percentile_90, sample_size, period_start, period_end) VALUES
('Family Medicine', 'Patient Satisfaction Score', 4.2, 3.8, 4.2, 4.6, 4.8, 1000, '2024-01-01', '2024-12-31'),
('Family Medicine', 'Average Revenue Per Patient', 450.00, 350.00, 450.00, 550.00, 650.00, 1000, '2024-01-01', '2024-12-31'),
('Family Medicine', 'No Show Rate', 15.5, 10.0, 15.5, 20.0, 25.0, 1000, '2024-01-01', '2024-12-31'),
('Internal Medicine', 'Patient Satisfaction Score', 4.1, 3.7, 4.1, 4.5, 4.7, 800, '2024-01-01', '2024-12-31'),
('Internal Medicine', 'Average Revenue Per Patient', 520.00, 420.00, 520.00, 620.00, 720.00, 800, '2024-01-01', '2024-12-31'),
('Cardiology', 'Patient Satisfaction Score', 4.3, 3.9, 4.3, 4.7, 4.9, 500, '2024-01-01', '2024-12-31'),
('Cardiology', 'Average Revenue Per Patient', 850.00, 650.00, 850.00, 1050.00, 1250.00, 500, '2024-01-01', '2024-12-31'),
('Dermatology', 'Patient Satisfaction Score', 4.4, 4.0, 4.4, 4.8, 4.9, 400, '2024-01-01', '2024-12-31'),
('Dermatology', 'Average Revenue Per Patient', 380.00, 280.00, 380.00, 480.00, 580.00, 400, '2024-01-01', '2024-12-31');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_provider_date ON appointments(provider_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_cpt_billing_provider_status ON cpt_billing(provider_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_patient_diagnoses_provider ON patient_diagnoses(provider_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_mappings_provider ON users_mappings(provider_id, patient_id);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW provider_dashboard_summary AS
SELECT 
  um.provider_id,
  COUNT(DISTINCT um.patient_id) as total_patients,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT CASE WHEN a.appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN a.id END) as appointments_last_30_days,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.appointment_date >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN a.id END) as completed_appointments_last_30_days,
  SUM(CASE WHEN cb.status = 2 AND cb.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN cb.amount ELSE 0 END) as revenue_last_30_days,
  COUNT(CASE WHEN cb.status = 2 AND cb.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as paid_claims_last_30_days,
  COUNT(CASE WHEN cb.status = 3 AND cb.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as denied_claims_last_30_days
FROM users_mappings um
LEFT JOIN appointments a ON um.patient_id = a.patient_id
LEFT JOIN cpt_billing cb ON um.patient_id = cb.patient_id
GROUP BY um.provider_id;

-- Create stored procedures for common analytics
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetProviderAnalytics(
  IN p_provider_id INT,
  IN p_start_date DATE,
  IN p_end_date DATE
)
BEGIN
  SELECT 
    'summary' as section,
    COUNT(DISTINCT um.patient_id) as total_patients,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completed_appointments,
    SUM(CASE WHEN cb.status = 2 THEN cb.amount ELSE 0 END) as total_revenue,
    AVG(CASE WHEN cb.status = 2 THEN cb.amount END) as avg_revenue_per_claim
  FROM users_mappings um
  LEFT JOIN appointments a ON um.patient_id = a.patient_id 
    AND a.appointment_date BETWEEN p_start_date AND p_end_date
  LEFT JOIN cpt_billing cb ON um.patient_id = cb.patient_id 
    AND cb.created_at BETWEEN p_start_date AND p_end_date
  WHERE um.provider_id = p_provider_id;
END //

DELIMITER ;

-- Clean up old cache entries (run periodically)
-- DELETE FROM analytics_cache WHERE expires_at < NOW();
-- DELETE FROM report_generation_log WHERE expires_at < NOW() AND expires_at IS NOT NULL;