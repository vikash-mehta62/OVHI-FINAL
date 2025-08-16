-- Analytics and Custom Reports Schema
-- This file contains the database schema for analytics and custom reporting functionality

-- Custom Reports Table
CREATE TABLE IF NOT EXISTS custom_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_run TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_name (name),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Analytics Cache Table (for performance optimization)
CREATE TABLE IF NOT EXISTS analytics_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    data JSON NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cache_key (cache_key),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Analytics Insights Table (for AI-generated insights)
CREATE TABLE IF NOT EXISTS analytics_insights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    insight_type ENUM('revenue_opportunity', 'patient_flow', 'denial_pattern', 'efficiency', 'quality', 'cost_reduction') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    impact_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    estimated_value DECIMAL(10,2) NULL,
    confidence_score DECIMAL(3,2) DEFAULT 0.50,
    status ENUM('new', 'acknowledged', 'in_progress', 'completed', 'dismissed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_insight_type (insight_type),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_impact_level (impact_level),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Analytics Metrics History Table (for trend analysis)
CREATE TABLE IF NOT EXISTS analytics_metrics_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_date DATE NOT NULL,
    timeframe ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') DEFAULT 'daily',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_metric_date (user_id, metric_name, metric_date),
    INDEX idx_metric_name (metric_name),
    INDEX idx_metric_date (metric_date),
    INDEX idx_timeframe (timeframe),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_metric_date (user_id, metric_name, metric_date, timeframe)
);

-- Dashboard Widgets Configuration Table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    widget_config JSON NOT NULL,
    position_x INT DEFAULT 0,
    position_y INT DEFAULT 0,
    width INT DEFAULT 1,
    height INT DEFAULT 1,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_widget_type (widget_type),
    INDEX idx_position (position_x, position_y),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Report Schedules Table (for automated report generation)
CREATE TABLE IF NOT EXISTS report_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    report_id INT NOT NULL,
    schedule_type ENUM('daily', 'weekly', 'monthly', 'quarterly') NOT NULL,
    schedule_config JSON NOT NULL, -- Contains cron expression, recipients, etc.
    is_active BOOLEAN DEFAULT TRUE,
    last_run TIMESTAMP NULL,
    next_run TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_report_id (report_id),
    INDEX idx_next_run (next_run),
    INDEX idx_is_active (is_active),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES custom_reports(id) ON DELETE CASCADE
);

-- Analytics Alerts Table (for threshold-based alerts)
CREATE TABLE IF NOT EXISTS analytics_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    alert_name VARCHAR(255) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    condition_type ENUM('greater_than', 'less_than', 'equals', 'between', 'percent_change') NOT NULL,
    threshold_value DECIMAL(15,4) NOT NULL,
    threshold_value_2 DECIMAL(15,4) NULL, -- For 'between' conditions
    alert_frequency ENUM('immediate', 'daily', 'weekly') DEFAULT 'daily',
    notification_methods JSON NOT NULL, -- email, sms, in-app
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_metric_name (metric_name),
    INDEX idx_is_active (is_active),
    INDEX idx_last_triggered (last_triggered),
    
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Sample Data for Testing

-- Insert sample custom reports
INSERT IGNORE INTO custom_reports (user_id, name, description, config) VALUES
(1, 'Monthly Revenue Report', 'Comprehensive monthly revenue analysis', 
 '{"fields": ["provider_name", "cpt_code", "billed_amount", "paid_amount"], "chartType": "bar", "timeframe": "30d"}'),
(1, 'Patient Demographics Analysis', 'Patient age and gender distribution', 
 '{"fields": ["patient_age", "patient_gender", "insurance_type"], "chartType": "pie", "timeframe": "90d"}'),
(1, 'Appointment Efficiency Report', 'Appointment scheduling and completion analysis', 
 '{"fields": ["appointment_date", "appointment_status", "provider_name"], "chartType": "line", "timeframe": "30d"}');

-- Insert sample analytics insights
INSERT IGNORE INTO analytics_insights (user_id, insight_type, title, description, recommendation, impact_level, estimated_value, confidence_score) VALUES
(1, 'revenue_opportunity', 'Collection Rate Optimization', 'CPT code 99214 shows 8% below average collection rate', 'Implement automated follow-up for this procedure code', 'high', 12000.00, 0.85),
(1, 'patient_flow', 'Appointment Scheduling Optimization', 'Peak wait times occur between 10-11 AM', 'Redistribute appointment scheduling throughout the day', 'medium', NULL, 0.92),
(1, 'denial_pattern', 'Documentation Improvement Needed', 'Diagnosis code M79.3 has 15% higher denial rate', 'Review documentation requirements for this condition', 'medium', 5000.00, 0.78);

-- Insert sample metrics history (last 30 days)
INSERT IGNORE INTO analytics_metrics_history (user_id, metric_name, metric_value, metric_date, timeframe) VALUES
(1, 'total_revenue', 75000.00, CURDATE() - INTERVAL 30 DAY, 'daily'),
(1, 'total_revenue', 78000.00, CURDATE() - INTERVAL 29 DAY, 'daily'),
(1, 'total_revenue', 82000.00, CURDATE() - INTERVAL 28 DAY, 'daily'),
(1, 'collection_rate', 92.5, CURDATE() - INTERVAL 30 DAY, 'daily'),
(1, 'collection_rate', 93.2, CURDATE() - INTERVAL 29 DAY, 'daily'),
(1, 'collection_rate', 94.1, CURDATE() - INTERVAL 28 DAY, 'daily'),
(1, 'patient_satisfaction', 4.6, CURDATE() - INTERVAL 30 DAY, 'daily'),
(1, 'patient_satisfaction', 4.7, CURDATE() - INTERVAL 29 DAY, 'daily'),
(1, 'patient_satisfaction', 4.8, CURDATE() - INTERVAL 28 DAY, 'daily');

-- Insert sample dashboard widgets
INSERT IGNORE INTO dashboard_widgets (user_id, widget_type, widget_config, position_x, position_y, width, height) VALUES
(1, 'revenue_kpi', '{"title": "Total Revenue", "timeframe": "30d", "showTrend": true}', 0, 0, 1, 1),
(1, 'collection_rate', '{"title": "Collection Rate", "target": 95, "showTarget": true}', 1, 0, 1, 1),
(1, 'patient_satisfaction', '{"title": "Patient Satisfaction", "scale": 5, "showAverage": true}', 2, 0, 1, 1),
(1, 'appointment_chart', '{"title": "Appointments Trend", "chartType": "line", "timeframe": "7d"}', 0, 1, 2, 1);

-- Insert sample analytics alerts
INSERT IGNORE INTO analytics_alerts (user_id, alert_name, metric_name, condition_type, threshold_value, notification_methods) VALUES
(1, 'Low Collection Rate Alert', 'collection_rate', 'less_than', 90.0, '["email", "in_app"]'),
(1, 'High Denial Rate Alert', 'denial_rate', 'greater_than', 10.0, '["email", "sms"]'),
(1, 'Revenue Drop Alert', 'total_revenue', 'percent_change', -15.0, '["email", "in_app"]');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_metrics_history_composite ON analytics_metrics_history(user_id, metric_name, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_insights_status_impact ON analytics_insights(status, impact_level);

-- Create views for common analytics queries

-- Revenue Analytics View
CREATE OR REPLACE VIEW v_revenue_analytics AS
SELECT 
    um.provider_id,
    DATE(cb.created_at) as date,
    COUNT(*) as total_claims,
    SUM(cb.amount) as total_billed,
    SUM(CASE WHEN cb.status = 2 THEN cb.amount ELSE 0 END) as total_collected,
    SUM(CASE WHEN cb.status = 3 THEN cb.amount ELSE 0 END) as total_denied,
    (SUM(CASE WHEN cb.status = 2 THEN cb.amount ELSE 0 END) / SUM(cb.amount) * 100) as collection_rate,
    (COUNT(CASE WHEN cb.status = 3 THEN 1 END) / COUNT(*) * 100) as denial_rate
FROM cpt_billing cb
JOIN users_mappings um ON cb.patient_id = um.patient_id
GROUP BY um.provider_id, DATE(cb.created_at);

-- Patient Analytics View
CREATE OR REPLACE VIEW v_patient_analytics AS
SELECT 
    um.provider_id,
    DATE(p.created_at) as date,
    COUNT(*) as new_patients,
    COUNT(CASE WHEN p.gender = 'M' THEN 1 END) as male_patients,
    COUNT(CASE WHEN p.gender = 'F' THEN 1 END) as female_patients,
    AVG(TIMESTAMPDIFF(YEAR, p.dob, CURDATE())) as avg_age,
    COUNT(CASE WHEN p.insurance_type = 'Medicare' THEN 1 END) as medicare_patients,
    COUNT(CASE WHEN p.insurance_type = 'Medicaid' THEN 1 END) as medicaid_patients,
    COUNT(CASE WHEN p.insurance_type = 'Private' THEN 1 END) as private_patients
FROM user_profiles p
JOIN users_mappings um ON p.user_id = um.patient_id
GROUP BY um.provider_id, DATE(p.created_at);

-- Appointment Analytics View
CREATE OR REPLACE VIEW v_appointment_analytics AS
SELECT 
    um.provider_id,
    DATE(a.appointment_date) as date,
    COUNT(*) as total_appointments,
    COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
    COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
    COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_show_appointments,
    (COUNT(CASE WHEN a.status = 'completed' THEN 1 END) / COUNT(*) * 100) as completion_rate,
    (COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) / COUNT(*) * 100) as no_show_rate
FROM appointments a
JOIN users_mappings um ON a.patient_id = um.patient_id
GROUP BY um.provider_id, DATE(a.appointment_date);