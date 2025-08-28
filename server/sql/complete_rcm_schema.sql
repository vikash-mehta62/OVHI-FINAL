-- Complete RCM System Database Schema
-- This schema includes all tables needed for the comprehensive RCM system

-- A/R Accounts table
CREATE TABLE IF NOT EXISTS ar_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id VARCHAR(50) NOT NULL,
    provider_id INT NOT NULL,
    account_number VARCHAR(100) NOT NULL UNIQUE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    days_outstanding INT NOT NULL DEFAULT 0,
    last_payment_date DATE,
    last_contact_date DATE,
    payer_name VARCHAR(255),
    status ENUM('active', 'follow_up', 'collections', 'write_off', 'paid') DEFAULT 'active',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    aging_bucket ENUM('0-30', '31-60', '61-90', '91-120', '120+') NOT NULL,
    contact_attempts INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    INDEX idx_aging_bucket (aging_bucket),
    INDEX idx_days_outstanding (days_outstanding)
);

-- A/R Follow-ups table
CREATE TABLE IF NOT EXISTS ar_follow_ups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    contact_method ENUM('phone', 'email', 'letter', 'in_person') NOT NULL,
    outcome ENUM('payment_promised', 'payment_plan', 'no_contact', 'dispute', 'hardship') NOT NULL,
    notes TEXT,
    next_follow_up_date DATE,
    promised_payment_date DATE,
    promised_amount DECIMAL(10,2),
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES ar_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_performed_at (performed_at)
);

-- A/R Status History table
CREATE TABLE IF NOT EXISTS ar_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    reason TEXT,
    changed_by INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES ar_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_changed_at (changed_at)
);

-- Collection Letters table
CREATE TABLE IF NOT EXISTS ar_collection_letters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    letter_type ENUM('standard', 'final_notice', 'payment_plan') DEFAULT 'standard',
    generated_by INT NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    delivery_method ENUM('mail', 'email') DEFAULT 'mail',
    FOREIGN KEY (account_id) REFERENCES ar_accounts(id) ON DELETE CASCADE,
    INDEX idx_account_id (account_id),
    INDEX idx_generated_at (generated_at)
);

-- Patient Statements table
CREATE TABLE IF NOT EXISTS patient_statements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    statement_number VARCHAR(100) NOT NULL UNIQUE,
    patient_id VARCHAR(50) NOT NULL,
    provider_id INT NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    previous_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    new_charges DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payments DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    adjustments DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    current_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'sent', 'viewed', 'paid', 'overdue') DEFAULT 'draft',
    delivery_method ENUM('mail', 'email', 'portal') DEFAULT 'mail',
    template_id INT,
    last_sent_date DATE,
    viewed_date DATE,
    payment_date DATE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    INDEX idx_statement_date (statement_date)
);

-- Statement Services table
CREATE TABLE IF NOT EXISTS statement_services (
    id INT PRIMARY KEY AUTO_INCREMENT,
    statement_id INT NOT NULL,
    service_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    provider_name VARCHAR(255),
    FOREIGN KEY (statement_id) REFERENCES patient_statements(id) ON DELETE CASCADE,
    INDEX idx_statement_id (statement_id)
);

-- Statement Templates table
CREATE TABLE IF NOT EXISTS statement_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    header_text TEXT,
    footer_text TEXT,
    payment_instructions TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    provider_id INT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_is_default (is_default)
);

-- Enhanced Claims table (if not exists)
CREATE TABLE IF NOT EXISTS claims (
    claim_id VARCHAR(50) PRIMARY KEY,
    claim_number VARCHAR(100) NOT NULL UNIQUE,
    patient_id VARCHAR(50) NOT NULL,
    provider_id INT NOT NULL,
    encounter_id INT,
    service_date DATE NOT NULL,
    submission_date DATE,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payer_name VARCHAR(255),
    status ENUM('draft', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'appealed') DEFAULT 'draft',
    validation_score INT DEFAULT 0,
    estimated_reimbursement DECIMAL(12,2) DEFAULT 0.00,
    validation_issues JSON,
    days_in_process INT DEFAULT 0,
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    INDEX idx_service_date (service_date),
    INDEX idx_payer_name (payer_name)
);

-- RCM Dashboard Metrics table
CREATE TABLE IF NOT EXISTS rcm_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    metric_date DATE NOT NULL,
    total_claims INT DEFAULT 0,
    submitted_claims INT DEFAULT 0,
    paid_claims INT DEFAULT 0,
    denied_claims INT DEFAULT 0,
    total_charges DECIMAL(15,2) DEFAULT 0.00,
    total_payments DECIMAL(15,2) DEFAULT 0.00,
    total_adjustments DECIMAL(15,2) DEFAULT 0.00,
    net_collection_rate DECIMAL(5,2) DEFAULT 0.00,
    days_in_ar DECIMAL(5,2) DEFAULT 0.00,
    clean_claim_rate DECIMAL(5,2) DEFAULT 0.00,
    denial_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_provider_date (provider_id, metric_date),
    INDEX idx_provider_id (provider_id),
    INDEX idx_metric_date (metric_date)
);

-- RCM Workflow Tasks table
CREATE TABLE IF NOT EXISTS rcm_workflow_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    task_type ENUM('follow_up', 'denial_review', 'payment_posting', 'eligibility_check', 'claim_review') NOT NULL,
    entity_type ENUM('claim', 'patient', 'account', 'statement') NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    assigned_to INT,
    due_date DATE,
    completed_at TIMESTAMP NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_task_type (task_type),
    INDEX idx_status (status),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_due_date (due_date)
);

-- RCM Alerts table
CREATE TABLE IF NOT EXISTS rcm_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    alert_type ENUM('high_ar', 'low_collection_rate', 'high_denial_rate', 'overdue_claims', 'system_issue') NOT NULL,
    severity ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    is_dismissed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    dismissed_at TIMESTAMP NULL,
    INDEX idx_provider_id (provider_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_severity (severity),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for A/R accounts
INSERT IGNORE INTO ar_accounts (patient_id, provider_id, account_number, balance, days_outstanding, payer_name, status, priority, aging_bucket, contact_attempts) VALUES
('PAT001', 1, 'ACC001', 1250.00, 45, 'Blue Cross Blue Shield', 'follow_up', 'medium', '31-60', 2),
('PAT002', 1, 'ACC002', 850.00, 15, 'Aetna', 'active', 'low', '0-30', 1),
('PAT003', 1, 'ACC003', 2100.00, 95, 'Medicare', 'collections', 'high', '91-120', 5),
('PAT004', 1, 'ACC004', 450.00, 135, 'Self Pay', 'write_off', 'low', '120+', 8);

-- Insert sample statement templates
INSERT IGNORE INTO statement_templates (name, description, header_text, footer_text, payment_instructions, is_default, provider_id, created_by) VALUES
('Standard Statement', 'Default patient statement template', 'Thank you for choosing our healthcare services.', 'Please remit payment within 30 days of statement date.', 'Payment can be made online, by phone, or by mail.', TRUE, 1, 1),
('Friendly Reminder', 'Gentle reminder template for overdue accounts', 'We hope you are doing well. This is a friendly reminder about your account balance.', 'If you have any questions about your bill, please contact our billing department.', 'Multiple payment options are available for your convenience.', FALSE, 1, 1);

-- Insert sample claims data
INSERT IGNORE INTO claims (claim_id, claim_number, patient_id, provider_id, service_date, total_amount, payer_name, status, validation_score, priority) VALUES
('CLM-2024-001', 'CLM-2024-001', 'PAT001', 1, '2024-01-15', 450.00, 'Blue Cross Blue Shield', 'submitted', 95, 'medium'),
('CLM-2024-002', 'CLM-2024-002', 'PAT002', 1, '2024-01-14', 280.00, 'Aetna', 'paid', 98, 'low'),
('CLM-2024-003', 'CLM-2024-003', 'PAT003', 1, '2024-01-12', 650.00, 'Medicare', 'denied', 78, 'high'),
('CLM-2024-004', 'CLM-2024-004', 'PAT004', 1, '2024-01-18', 320.00, 'Cigna', 'accepted', 92, 'medium');

-- Create views for reporting
CREATE OR REPLACE VIEW rcm_dashboard_summary AS
SELECT 
    c.provider_id,
    COUNT(DISTINCT c.claim_id) as total_claims,
    COUNT(DISTINCT CASE WHEN c.status = 'submitted' THEN c.claim_id END) as submitted_claims,
    COUNT(DISTINCT CASE WHEN c.status = 'paid' THEN c.claim_id END) as paid_claims,
    COUNT(DISTINCT CASE WHEN c.status = 'denied' THEN c.claim_id END) as denied_claims,
    SUM(c.total_amount) as total_charges,
    SUM(c.paid_amount) as total_payments,
    SUM(ar.balance) as total_ar,
    AVG(ar.days_outstanding) as avg_days_in_ar,
    COUNT(DISTINCT ps.id) as total_statements
FROM claims c
LEFT JOIN ar_accounts ar ON c.patient_id = ar.patient_id AND c.provider_id = ar.provider_id
LEFT JOIN patient_statements ps ON c.patient_id = ps.patient_id AND c.provider_id = ps.provider_id
WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY c.provider_id;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_provider_status ON claims(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_accounts_provider_bucket ON ar_accounts(provider_id, aging_bucket);
CREATE INDEX IF NOT EXISTS idx_statements_provider_status ON patient_statements(provider_id, status);

-- Create triggers for automatic aging bucket calculation
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_aging_bucket_before_insert
BEFORE INSERT ON ar_accounts
FOR EACH ROW
BEGIN
    SET NEW.aging_bucket = CASE
        WHEN NEW.days_outstanding <= 30 THEN '0-30'
        WHEN NEW.days_outstanding <= 60 THEN '31-60'
        WHEN NEW.days_outstanding <= 90 THEN '61-90'
        WHEN NEW.days_outstanding <= 120 THEN '91-120'
        ELSE '120+'
    END;
END//

CREATE TRIGGER IF NOT EXISTS update_aging_bucket_before_update
BEFORE UPDATE ON ar_accounts
FOR EACH ROW
BEGIN
    SET NEW.aging_bucket = CASE
        WHEN NEW.days_outstanding <= 30 THEN '0-30'
        WHEN NEW.days_outstanding <= 60 THEN '31-60'
        WHEN NEW.days_outstanding <= 90 THEN '61-90'
        WHEN NEW.days_outstanding <= 120 THEN '91-120'
        ELSE '120+'
    END;
END//

CREATE TRIGGER IF NOT EXISTS update_claim_balance_before_update
BEFORE UPDATE ON claims
FOR EACH ROW
BEGIN
    SET NEW.balance_amount = NEW.total_amount - NEW.paid_amount;
END//
DELIMITER ;