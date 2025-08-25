-- CMS Compliant Claims Enhancement Database Schema
-- This script creates the necessary tables and modifications for CMS compliance

-- Add CMS-specific fields to existing billings table
ALTER TABLE billings 
ADD COLUMN npi_number VARCHAR(10) AFTER procedure_code,
ADD COLUMN taxonomy_code VARCHAR(10) AFTER npi_number,
ADD COLUMN place_of_service VARCHAR(2) AFTER taxonomy_code,
ADD COLUMN type_of_bill VARCHAR(4) AFTER place_of_service,
ADD COLUMN cms_validation_status ENUM('pending', 'valid', 'invalid', 'warning') DEFAULT 'pending' AFTER status,
ADD COLUMN validation_errors JSON AFTER cms_validation_status,
ADD COLUMN ncci_status ENUM('clean', 'edit', 'override') DEFAULT 'clean' AFTER validation_errors,
ADD COLUMN medical_necessity_verified BOOLEAN DEFAULT FALSE AFTER ncci_status,
ADD COLUMN timely_filing_date DATE AFTER medical_necessity_verified,
ADD COLUMN cms1500_generated BOOLEAN DEFAULT FALSE AFTER timely_filing_date,
ADD COLUMN ub04_generated BOOLEAN DEFAULT FALSE AFTER cms1500_generated,
ADD COLUMN last_form_generation DATETIME AFTER ub04_generated;

-- Create indexes for CMS fields
CREATE INDEX idx_billings_npi ON billings(npi_number);
CREATE INDEX idx_billings_cms_validation ON billings(cms_validation_status);
CREATE INDEX idx_billings_timely_filing ON billings(timely_filing_date);

-- Claim History Table - Comprehensive audit trail
CREATE TABLE claim_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    action_type ENUM(
        'created', 'updated', 'submitted', 'resubmitted', 'paid', 'denied', 
        'appealed', 'voided', 'corrected', 'status_changed', 'validated',
        'form_generated', 'comment_added', 'followup_scheduled'
    ) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    user_id INT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(255),
    notes TEXT,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_timestamp (claim_id, timestamp),
    INDEX idx_action_type (action_type),
    INDEX idx_user_timestamp (user_id, timestamp)
);

-- Claim Comments Table - Threaded conversation system
CREATE TABLE claim_comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    parent_comment_id INT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type ENUM('internal', 'external', 'follow_up', 'resolution', 'appeal', 'denial') DEFAULT 'internal',
    is_private BOOLEAN DEFAULT FALSE,
    is_system_generated BOOLEAN DEFAULT FALSE,
    attachments JSON,
    mentions JSON,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('active', 'resolved', 'archived') DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES claim_comments(id) ON DELETE CASCADE,
    INDEX idx_claim_created (claim_id, created_at),
    INDEX idx_user_comments (user_id, created_at),
    INDEX idx_comment_type (comment_type, status)
);

-- Claim Follow-ups Table - Task scheduling and management
CREATE TABLE claim_followups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    assigned_user_id INT NOT NULL,
    created_by INT NOT NULL,
    followup_type ENUM(
        'payment_inquiry', 'denial_appeal', 'prior_auth', 'patient_contact',
        'insurance_verification', 'medical_records', 'corrected_claim',
        'timely_filing', 'collections', 'write_off_review'
    ) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_date DATETIME NOT NULL,
    due_date DATETIME,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled', 'overdue') DEFAULT 'pending',
    outcome TEXT,
    next_followup_date DATETIME,
    reminder_sent BOOLEAN DEFAULT FALSE,
    escalation_level INT DEFAULT 0,
    estimated_minutes INT,
    actual_minutes INT,
    tags JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_assigned_user (assigned_user_id, status),
    INDEX idx_claim_followup (claim_id, status),
    INDEX idx_due_date (due_date, status)
);

-- CMS Validation Rules Table - Dynamic rule management
CREATE TABLE cms_validation_rules (
    id VARCHAR(50) PRIMARY KEY,
    rule_name VARCHAR(255) NOT NULL,
    rule_type ENUM(
        'field_required', 'code_validation', 'date_logic', 'ncci_edit',
        'medical_necessity', 'provider_validation', 'modifier_check',
        'frequency_limit', 'quantity_limit', 'timely_filing'
    ) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('error', 'warning', 'info') NOT NULL,
    conditions JSON NOT NULL,
    error_message TEXT NOT NULL,
    cms_reference VARCHAR(255),
    suggested_fix TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_rule_type (rule_type, is_active),
    INDEX idx_effective_date (effective_date, expiration_date)
);

-- Form Templates Table - CMS-1500 and UB-04 templates
CREATE TABLE form_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    form_type ENUM('CMS1500', 'UB04') NOT NULL,
    template_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    field_mappings JSON NOT NULL,
    layout_specifications JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    effective_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_form_version (form_type, version),
    INDEX idx_form_type_active (form_type, is_active)
);

-- Compliance Logs Table - Regulatory audit trails
CREATE TABLE compliance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT,
    log_type ENUM(
        'cms_validation', 'timely_filing_check', 'ncci_edit', 'medical_necessity',
        'provider_verification', 'form_generation', 'submission_attempt',
        'compliance_review', 'audit_trail'
    ) NOT NULL,
    compliance_status ENUM('compliant', 'non_compliant', 'warning', 'review_required') NOT NULL,
    details JSON NOT NULL,
    cms_reference VARCHAR(255),
    user_id INT,
    system_generated BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE SET NULL,
    INDEX idx_claim_compliance (claim_id, compliance_status),
    INDEX idx_log_type_date (log_type, created_at),
    INDEX idx_compliance_status (compliance_status, created_at)
);

-- Revenue Codes Table - For UB-04 institutional claims
CREATE TABLE revenue_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    revenue_code VARCHAR(4) NOT NULL,
    revenue_description VARCHAR(255),
    hcpcs_code VARCHAR(10),
    service_date DATE,
    service_units DECIMAL(10,2),
    total_charges DECIMAL(10,2),
    non_covered_charges DECIMAL(10,2),
    line_number INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_revenue (claim_id, line_number)
);

-- Condition Codes Table - For UB-04 institutional claims
CREATE TABLE condition_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    condition_code VARCHAR(2) NOT NULL,
    condition_description VARCHAR(255),
    sequence_number INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_condition (claim_id, sequence_number)
);

-- Occurrence Codes Table - For UB-04 institutional claims
CREATE TABLE occurrence_codes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    occurrence_code VARCHAR(2) NOT NULL,
    occurrence_date DATE NOT NULL,
    occurrence_description VARCHAR(255),
    sequence_number INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_occurrence (claim_id, sequence_number)
);

-- Form Generation History Table - Track all form generations
CREATE TABLE form_generation_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    form_type ENUM('CMS1500', 'UB04') NOT NULL,
    template_version VARCHAR(50) NOT NULL,
    generated_by INT NOT NULL,
    generation_status ENUM('success', 'failed', 'warning') NOT NULL,
    file_path VARCHAR(500),
    file_size INT,
    validation_errors JSON,
    generation_time_ms INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_form_type (claim_id, form_type),
    INDEX idx_generation_date (created_at),
    INDEX idx_generated_by (generated_by, created_at)
);

-- Insert default CMS validation rules
INSERT INTO cms_validation_rules (id, rule_name, rule_type, description, severity, conditions, error_message, cms_reference, effective_date) VALUES
('CMS_001', 'NPI Number Required', 'field_required', 'NPI number is required for all claims', 'error', '{"field": "npi_number", "required": true}', 'NPI number is required for claim submission', 'CMS-1500 Box 24J', '2024-01-01'),
('CMS_002', 'Valid NPI Format', 'code_validation', 'NPI must be 10 digits', 'error', '{"field": "npi_number", "pattern": "^[0-9]{10}$"}', 'NPI number must be exactly 10 digits', 'CMS NPI Registry', '2024-01-01'),
('CMS_003', 'Taxonomy Code Required', 'field_required', 'Provider taxonomy code is required', 'error', '{"field": "taxonomy_code", "required": true}', 'Provider taxonomy code is required', 'CMS-1500 Box 24I', '2024-01-01'),
('CMS_004', 'Place of Service Required', 'field_required', 'Place of service is required for all claims', 'error', '{"field": "place_of_service", "required": true}', 'Place of service code is required', 'CMS-1500 Box 24B', '2024-01-01'),
('CMS_005', 'Service Date Logic', 'date_logic', 'Service date cannot be in the future', 'error', '{"field": "service_date", "max_date": "today"}', 'Service date cannot be in the future', 'CMS Guidelines', '2024-01-01'),
('CMS_006', 'Timely Filing Check', 'timely_filing', 'Claims must be filed within timely filing limits', 'warning', '{"service_date_field": "service_date", "filing_limit_days": 365}', 'Claim may exceed timely filing limits', 'CMS Timely Filing Rules', '2024-01-01');

-- Insert default form templates
INSERT INTO form_templates (form_type, template_name, version, field_mappings, layout_specifications, effective_date) VALUES
('CMS1500', 'Standard CMS-1500 Form', '02/12', '{}', '{"page_size": "letter", "margins": {"top": 0.5, "bottom": 0.5, "left": 0.5, "right": 0.5}}', '2024-01-01'),
('UB04', 'Standard UB-04 Form', '2014', '{}', '{"page_size": "letter", "margins": {"top": 0.5, "bottom": 0.5, "left": 0.5, "right": 0.5}}', '2024-01-01');

-- Create triggers for automatic history logging
DELIMITER //

CREATE TRIGGER billings_history_insert 
AFTER INSERT ON billings
FOR EACH ROW
BEGIN
    INSERT INTO claim_history (claim_id, action_type, user_id, notes, metadata)
    VALUES (NEW.id, 'created', COALESCE(NEW.created_by, 1), 'Claim created', JSON_OBJECT('claim_id', NEW.id));
END//

CREATE TRIGGER billings_history_update 
AFTER UPDATE ON billings
FOR EACH ROW
BEGIN
    DECLARE field_changes JSON DEFAULT JSON_OBJECT();
    
    -- Track status changes
    IF OLD.status != NEW.status THEN
        SET field_changes = JSON_SET(field_changes, '$.status', JSON_OBJECT('old', OLD.status, 'new', NEW.status));
        INSERT INTO claim_history (claim_id, action_type, field_name, old_value, new_value, user_id, notes)
        VALUES (NEW.id, 'status_changed', 'status', OLD.status, NEW.status, COALESCE(NEW.updated_by, 1), 'Status changed');
    END IF;
    
    -- Track amount changes
    IF OLD.total_amount != NEW.total_amount THEN
        SET field_changes = JSON_SET(field_changes, '$.total_amount', JSON_OBJECT('old', OLD.total_amount, 'new', NEW.total_amount));
        INSERT INTO claim_history (claim_id, action_type, field_name, old_value, new_value, user_id, notes)
        VALUES (NEW.id, 'updated', 'total_amount', OLD.total_amount, NEW.total_amount, COALESCE(NEW.updated_by, 1), 'Amount updated');
    END IF;
    
    -- Track CMS validation status changes
    IF OLD.cms_validation_status != NEW.cms_validation_status THEN
        INSERT INTO claim_history (claim_id, action_type, field_name, old_value, new_value, user_id, notes)
        VALUES (NEW.id, 'validated', 'cms_validation_status', OLD.cms_validation_status, NEW.cms_validation_status, COALESCE(NEW.updated_by, 1), 'CMS validation status updated');
    END IF;
    
    -- General update log if any changes occurred
    IF JSON_LENGTH(field_changes) > 0 THEN
        INSERT INTO claim_history (claim_id, action_type, user_id, notes, metadata)
        VALUES (NEW.id, 'updated', COALESCE(NEW.updated_by, 1), 'Claim updated', field_changes);
    END IF;
END//

DELIMITER ;

-- Create views for common queries
CREATE VIEW claim_summary_with_cms AS
SELECT 
    b.*,
    CASE 
        WHEN b.cms_validation_status = 'valid' THEN 'CMS Compliant'
        WHEN b.cms_validation_status = 'invalid' THEN 'CMS Non-Compliant'
        WHEN b.cms_validation_status = 'warning' THEN 'CMS Warning'
        ELSE 'Pending Validation'
    END as cms_compliance_status,
    DATEDIFF(CURDATE(), b.service_date) as days_since_service,
    CASE 
        WHEN b.timely_filing_date IS NOT NULL AND CURDATE() > b.timely_filing_date THEN 'Overdue'
        WHEN b.timely_filing_date IS NOT NULL AND DATEDIFF(b.timely_filing_date, CURDATE()) <= 30 THEN 'Due Soon'
        ELSE 'On Time'
    END as timely_filing_status,
    (SELECT COUNT(*) FROM claim_comments cc WHERE cc.claim_id = b.id AND cc.status = 'active') as active_comments,
    (SELECT COUNT(*) FROM claim_followups cf WHERE cf.claim_id = b.id AND cf.status IN ('pending', 'in_progress')) as pending_followups
FROM billings b;

-- Create indexes for performance optimization
CREATE INDEX idx_claim_history_composite ON claim_history(claim_id, action_type, timestamp);
CREATE INDEX idx_claim_comments_composite ON claim_comments(claim_id, comment_type, created_at);
CREATE INDEX idx_claim_followups_composite ON claim_followups(assigned_user_id, status, scheduled_date);
CREATE INDEX idx_billings_cms_composite ON billings(cms_validation_status, ncci_status, timely_filing_date);