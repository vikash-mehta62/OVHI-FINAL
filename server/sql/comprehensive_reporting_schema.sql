-- Comprehensive Reporting System Schema
-- This schema supports CMS-specific reporting, performance analytics, denial analysis,
-- payer performance benchmarking, and custom report building capabilities

-- Report templates table for predefined reports
CREATE TABLE IF NOT EXISTS report_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category ENUM('compliance', 'analytics', 'denials', 'payers', 'custom') NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  configuration JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_report_type (report_type),
  INDEX idx_is_active (is_active)
);

-- Generated reports table for storing report instances
CREATE TABLE IF NOT EXISTS generated_reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(100) NOT NULL,
  status ENUM('generating', 'completed', 'failed', 'expired') DEFAULT 'generating',
  filters JSON,
  data_summary JSON,
  file_path VARCHAR(500),
  file_size BIGINT,
  record_count INT,
  generation_time_ms INT,
  generated_by VARCHAR(50),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  error_message TEXT,
  
  INDEX idx_template_id (template_id),
  INDEX idx_report_type (report_type),
  INDEX idx_status (status),
  INDEX idx_generated_by (generated_by),
  INDEX idx_generated_at (generated_at),
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL
);

-- Custom report configurations for user-built reports
CREATE TABLE IF NOT EXISTS custom_report_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data_source VARCHAR(100) NOT NULL,
  selected_columns JSON NOT NULL,
  filters JSON,
  group_by JSON,
  order_by JSON,
  aggregations JSON,
  limit_rows INT DEFAULT 1000,
  is_saved BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_data_source (data_source),
  INDEX idx_created_by (created_by),
  INDEX idx_is_saved (is_saved),
  INDEX idx_is_public (is_public)
);

-- Report schedules for automated report generation
CREATE TABLE IF NOT EXISTS report_schedules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  template_id INT,
  custom_config_id INT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  schedule_type ENUM('daily', 'weekly', 'monthly', 'quarterly') NOT NULL,
  schedule_config JSON, -- day of week, day of month, etc.
  filters JSON,
  export_format ENUM('csv', 'excel', 'pdf', 'json') DEFAULT 'csv',
  email_recipients JSON,
  is_active BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP NULL,
  next_run TIMESTAMP NULL,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_template_id (template_id),
  INDEX idx_custom_config_id (custom_config_id),
  INDEX idx_schedule_type (schedule_type),
  INDEX idx_is_active (is_active),
  INDEX idx_next_run (next_run),
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_config_id) REFERENCES custom_report_configs(id) ON DELETE CASCADE
);

-- Report sharing and permissions
CREATE TABLE IF NOT EXISTS report_shares (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT,
  custom_config_id INT,
  shared_with VARCHAR(50) NOT NULL, -- user_id or role
  share_type ENUM('user', 'role', 'public') NOT NULL,
  permissions JSON, -- view, edit, export, etc.
  expires_at TIMESTAMP NULL,
  shared_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_report_id (report_id),
  INDEX idx_custom_config_id (custom_config_id),
  INDEX idx_shared_with (shared_with),
  INDEX idx_share_type (share_type),
  FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_config_id) REFERENCES custom_report_configs(id) ON DELETE CASCADE
);

-- Report execution logs for performance monitoring
CREATE TABLE IF NOT EXISTS report_execution_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_type VARCHAR(100) NOT NULL,
  template_id INT,
  custom_config_id INT,
  execution_time_ms INT NOT NULL,
  record_count INT,
  file_size BIGINT,
  status ENUM('success', 'failure', 'timeout') NOT NULL,
  error_message TEXT,
  filters_used JSON,
  executed_by VARCHAR(50),
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_report_type (report_type),
  INDEX idx_template_id (template_id),
  INDEX idx_status (status),
  INDEX idx_executed_at (executed_at),
  INDEX idx_execution_time (execution_time_ms)
);

-- Report bookmarks for user favorites
CREATE TABLE IF NOT EXISTS report_bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id VARCHAR(50) NOT NULL,
  report_type VARCHAR(100),
  template_id INT,
  custom_config_id INT,
  bookmark_name VARCHAR(255),
  filters JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_report_type (report_type),
  UNIQUE KEY unique_user_bookmark (user_id, template_id, custom_config_id),
  FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_config_id) REFERENCES custom_report_configs(id) ON DELETE CASCADE
);

-- Data source metadata for custom report builder
CREATE TABLE IF NOT EXISTS report_data_sources (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  columns_metadata JSON NOT NULL,
  relationships JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_category (category),
  INDEX idx_is_active (is_active)
);

-- Report comments and annotations
CREATE TABLE IF NOT EXISTS report_comments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT,
  custom_config_id INT,
  comment_text TEXT NOT NULL,
  comment_type ENUM('note', 'insight', 'recommendation', 'issue') DEFAULT 'note',
  is_public BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_report_id (report_id),
  INDEX idx_custom_config_id (custom_config_id),
  INDEX idx_comment_type (comment_type),
  INDEX idx_created_by (created_by),
  FOREIGN KEY (report_id) REFERENCES generated_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (custom_config_id) REFERENCES custom_report_configs(id) ON DELETE CASCADE
);

-- Report performance metrics for optimization
CREATE TABLE IF NOT EXISTS report_performance_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_type VARCHAR(100) NOT NULL,
  avg_execution_time_ms DECIMAL(10,2),
  min_execution_time_ms INT,
  max_execution_time_ms INT,
  avg_record_count DECIMAL(10,2),
  total_executions INT,
  success_rate DECIMAL(5,2),
  last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_report_type (report_type),
  INDEX idx_report_type (report_type)
);

-- Insert default report templates
INSERT IGNORE INTO report_templates (name, description, category, report_type, configuration) VALUES
('CMS Compliance Report', 'Comprehensive CMS compliance metrics and validation results', 'compliance', 'cms_compliance', '{"defaultFilters": {"dateRange": "30d"}, "sections": ["summary", "validationBreakdown", "topIssues", "providerRanking"]}'),
('Performance Analytics Report', 'KPI tracking and performance metrics analysis', 'analytics', 'performance_analytics', '{"defaultFilters": {"dateRange": "30d"}, "sections": ["kpiMetrics", "monthlyTrends", "providerPerformance", "topProcedures"]}'),
('Denial Analysis Report', 'Detailed denial trends and analysis', 'denials', 'denial_analysis', '{"defaultFilters": {"dateRange": "30d"}, "sections": ["summary", "denialReasons", "denialTrends", "payerDenials", "providerDenials"]}'),
('Payer Performance Report', 'Payer benchmarking and performance metrics', 'payers', 'payer_performance', '{"defaultFilters": {"dateRange": "30d"}, "sections": ["payerSummary", "paymentSpeed", "reliabilityMetrics", "contractPerformance"]}'),
('Custom Report Builder', 'Build custom reports with flexible configuration', 'custom', 'custom_report', '{"allowedDataSources": ["billings", "patients", "providers", "payers"], "maxRecords": 10000}');

-- Insert default data sources
INSERT IGNORE INTO report_data_sources (id, name, table_name, description, category, columns_metadata) VALUES
('billings', 'Claims/Billings', 'billings', 'Main claims and billing data', 'financial', 
'[
  {"name": "id", "type": "int", "description": "Claim ID", "nullable": false},
  {"name": "patient_id", "type": "int", "description": "Patient ID", "nullable": false},
  {"name": "provider_id", "type": "int", "description": "Provider ID", "nullable": false},
  {"name": "payer_id", "type": "int", "description": "Payer ID", "nullable": true},
  {"name": "amount", "type": "decimal", "description": "Claim amount", "nullable": false},
  {"name": "status", "type": "string", "description": "Claim status", "nullable": false},
  {"name": "created_at", "type": "datetime", "description": "Creation date", "nullable": false},
  {"name": "cpt_code", "type": "string", "description": "CPT code", "nullable": true},
  {"name": "icd_code", "type": "string", "description": "ICD code", "nullable": true}
]'),
('patients', 'Patients', 'patients', 'Patient demographic data', 'clinical', 
'[
  {"name": "id", "type": "int", "description": "Patient ID", "nullable": false},
  {"name": "name", "type": "string", "description": "Patient name", "nullable": false},
  {"name": "dob", "type": "date", "description": "Date of birth", "nullable": false},
  {"name": "gender", "type": "string", "description": "Gender", "nullable": true},
  {"name": "insurance_id", "type": "string", "description": "Insurance ID", "nullable": true}
]'),
('providers', 'Providers', 'providers', 'Healthcare provider data', 'administrative', 
'[
  {"name": "id", "type": "int", "description": "Provider ID", "nullable": false},
  {"name": "name", "type": "string", "description": "Provider name", "nullable": false},
  {"name": "npi", "type": "string", "description": "NPI number", "nullable": false},
  {"name": "specialty", "type": "string", "description": "Medical specialty", "nullable": true},
  {"name": "taxonomy_code", "type": "string", "description": "Taxonomy code", "nullable": true}
]');

-- Sample report execution logs
INSERT IGNORE INTO report_execution_logs (report_type, execution_time_ms, record_count, file_size, status, executed_by) VALUES
('cms_compliance', 2340, 1250, 524288, 'success', 'admin'),
('performance_analytics', 1890, 890, 389120, 'success', 'admin'),
('denial_analysis', 3120, 456, 234567, 'success', 'user123'),
('payer_performance', 2780, 234, 156789, 'success', 'admin'),
('custom_report', 1560, 678, 345678, 'success', 'user456');

-- Update performance metrics based on execution logs
INSERT IGNORE INTO report_performance_metrics (report_type, avg_execution_time_ms, min_execution_time_ms, max_execution_time_ms, avg_record_count, total_executions, success_rate)
SELECT 
  report_type,
  AVG(execution_time_ms) as avg_execution_time_ms,
  MIN(execution_time_ms) as min_execution_time_ms,
  MAX(execution_time_ms) as max_execution_time_ms,
  AVG(record_count) as avg_record_count,
  COUNT(*) as total_executions,
  (SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as success_rate
FROM report_execution_logs
GROUP BY report_type;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_composite ON generated_reports(report_type, status, generated_at);
CREATE INDEX IF NOT EXISTS idx_schedules_composite ON report_schedules(is_active, next_run);
CREATE INDEX IF NOT EXISTS idx_execution_logs_composite ON report_execution_logs(report_type, executed_at, status);
CREATE INDEX IF NOT EXISTS idx_bookmarks_composite ON report_bookmarks(user_id, report_type);

-- Create views for common reporting queries
CREATE OR REPLACE VIEW report_dashboard_view AS
SELECT 
  rt.id,
  rt.name,
  rt.description,
  rt.category,
  rt.report_type,
  COUNT(gr.id) as total_generated,
  MAX(gr.generated_at) as last_generated,
  AVG(gr.generation_time_ms) as avg_generation_time,
  rpm.success_rate
FROM report_templates rt
LEFT JOIN generated_reports gr ON rt.id = gr.template_id AND gr.generated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN report_performance_metrics rpm ON rt.report_type = rpm.report_type
WHERE rt.is_active = TRUE
GROUP BY rt.id, rt.name, rt.description, rt.category, rt.report_type, rpm.success_rate;

CREATE OR REPLACE VIEW report_usage_summary AS
SELECT 
  DATE(executed_at) as execution_date,
  report_type,
  COUNT(*) as execution_count,
  AVG(execution_time_ms) as avg_execution_time,
  SUM(record_count) as total_records_processed,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) * 100 as success_rate
FROM report_execution_logs
WHERE executed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(executed_at), report_type
ORDER BY execution_date DESC, report_type;