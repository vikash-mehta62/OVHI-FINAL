-- =====================================================
-- COMPREHENSIVE REFERRAL MANAGEMENT SYSTEM SCHEMA
-- Production-ready referral workflow with complete lifecycle management
-- =====================================================

-- =====================================================
-- SPECIALIST DIRECTORY & NETWORK MANAGEMENT
-- =====================================================

-- Specialists Table
CREATE TABLE IF NOT EXISTS referral_specialists (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    title VARCHAR(100),
    specialty_primary VARCHAR(100) NOT NULL,
    specialties_secondary JSON,
    practice_name VARCHAR(200),
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(200),
    website VARCHAR(300),
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    npi_number VARCHAR(20),
    license_numbers JSON,
    insurance_networks JSON,
    availability_hours JSON,
    accepts_new_patients BOOLEAN DEFAULT TRUE,
    preferred_referral_method ENUM('fax', 'email', 'portal', 'phone') DEFAULT 'fax',
    average_response_time INT DEFAULT 0, -- in hours
    patient_satisfaction_score DECIMAL(3,2) DEFAULT 0.00,
    total_referrals_received INT DEFAULT 0,
    completed_referrals INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_specialty_specialists (specialty_primary),
    INDEX idx_location_specialists (city, state, zip_code),
    INDEX idx_active_specialists (is_active),
    INDEX idx_npi_specialists (npi_number),
    INDEX idx_name_specialists (name)
);

-- Specialist Performance Metrics Table
CREATE TABLE IF NOT EXISTS referral_specialist_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    specialist_id VARCHAR(50) NOT NULL,
    metric_date DATE NOT NULL,
    referrals_received INT DEFAULT 0,
    referrals_scheduled INT DEFAULT 0,
    referrals_completed INT DEFAULT 0,
    average_scheduling_time INT DEFAULT 0, -- in days
    patient_satisfaction_total DECIMAL(5,2) DEFAULT 0.00,
    patient_satisfaction_count INT DEFAULT 0,
    response_time_total INT DEFAULT 0, -- in hours
    response_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (specialist_id) REFERENCES referral_specialists(id) ON DELETE CASCADE,
    INDEX idx_specialist_metrics (specialist_id, metric_date),
    INDEX idx_metric_date (metric_date),
    UNIQUE KEY unique_specialist_metric (specialist_id, metric_date)
);

-- =====================================================
-- REFERRAL TEMPLATES & DOCUMENT MANAGEMENT
-- =====================================================

-- Referral Templates Table
CREATE TABLE IF NOT EXISTS referral_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    template_type ENUM('letter', 'form', 'summary', 'authorization') DEFAULT 'letter',
    content_template LONGTEXT NOT NULL,
    variables JSON, -- Available template variables
    formatting_options JSON,
    letterhead_config JSON,
    signature_config JSON,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(50),
    version VARCHAR(10) DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_specialty_templates (specialty),
    INDEX idx_active_templates (is_active),
    INDEX idx_template_type (template_type),
    INDEX idx_created_by (created_by)
);

-- Template Variables Table
CREATE TABLE IF NOT EXISTS referral_template_variables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_id VARCHAR(50) NOT NULL,
    variable_name VARCHAR(100) NOT NULL,
    variable_type ENUM('text', 'date', 'number', 'boolean', 'list', 'patient_data', 'provider_data') NOT NULL,
    default_value TEXT,
    is_required BOOLEAN DEFAULT FALSE,
    validation_rules JSON,
    display_order INT DEFAULT 0,
    
    FOREIGN KEY (template_id) REFERENCES referral_templates(id) ON DELETE CASCADE,
    INDEX idx_template_variables (template_id),
    UNIQUE KEY unique_template_variable (template_id, variable_name)
);

-- =====================================================
-- CORE REFERRAL MANAGEMENT
-- =====================================================

-- Enhanced Referrals Table
CREATE TABLE IF NOT EXISTS referrals (
    id VARCHAR(50) PRIMARY KEY,
    referral_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    specialist_id VARCHAR(50),
    specialty_type VARCHAR(100) NOT NULL,
    referral_reason TEXT NOT NULL,
    clinical_notes LONGTEXT,
    urgency_level ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
    appointment_type ENUM('consultation', 'treatment', 'second_opinion', 'procedure') DEFAULT 'consultation',
    status ENUM('draft', 'pending', 'sent', 'scheduled', 'completed', 'cancelled', 'expired') DEFAULT 'draft',
    
    -- Authorization Management
    authorization_required BOOLEAN DEFAULT FALSE,
    authorization_number VARCHAR(100),
    authorization_status ENUM('pending', 'approved', 'denied', 'expired', 'not_required') DEFAULT 'not_required',
    authorization_expiry_date DATE,
    
    -- Scheduling Information
    expected_duration VARCHAR(50),
    preferred_appointment_time VARCHAR(100),
    scheduled_date DATETIME,
    completed_date DATETIME,
    
    -- Communication Tracking
    letter_generated BOOLEAN DEFAULT FALSE,
    letter_sent BOOLEAN DEFAULT FALSE,
    letter_path VARCHAR(500),
    communication_method ENUM('fax', 'email', 'portal', 'mail', 'phone') DEFAULT 'fax',
    
    -- Follow-up Management
    follow_up_required BOOLEAN DEFAULT TRUE,
    follow_up_instructions TEXT,
    outcome_received BOOLEAN DEFAULT FALSE,
    outcome_notes TEXT,
    
    -- Workflow Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    scheduled_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_patient_referrals (patient_id),
    INDEX idx_provider_referrals (provider_id),
    INDEX idx_specialist_referrals (specialist_id),
    INDEX idx_status_referrals (status),
    INDEX idx_specialty_referrals (specialty_type),
    INDEX idx_urgency_referrals (urgency_level),
    INDEX idx_authorization_referrals (authorization_status),
    INDEX idx_created_date (created_at),
    INDEX idx_referral_number (referral_number)
);

-- Referral Attachments Table
CREATE TABLE IF NOT EXISTS referral_attachments (
    id VARCHAR(50) PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL,
    medical_record_id VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INT,
    attachment_type ENUM('medical_record', 'lab_result', 'imaging', 'document', 'insurance_card', 'other') DEFAULT 'document',
    description TEXT,
    uploaded_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    INDEX idx_referral_attachments (referral_id),
    INDEX idx_attachment_type (attachment_type),
    INDEX idx_uploaded_by (uploaded_by)
);

-- Referral Status History Table
CREATE TABLE IF NOT EXISTS referral_status_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id VARCHAR(50) NOT NULL,
    previous_status ENUM('draft', 'pending', 'sent', 'scheduled', 'completed', 'cancelled', 'expired'),
    new_status ENUM('draft', 'pending', 'sent', 'scheduled', 'completed', 'cancelled', 'expired') NOT NULL,
    status_reason TEXT,
    changed_by VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    INDEX idx_referral_status_history (referral_id, changed_at),
    INDEX idx_status_change (new_status, changed_at)
);

-- =====================================================
-- AUTHORIZATION & INSURANCE MANAGEMENT
-- =====================================================

-- Prior Authorization Requests Table
CREATE TABLE IF NOT EXISTS referral_authorizations (
    id VARCHAR(50) PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL,
    insurance_id VARCHAR(50),
    authorization_type ENUM('referral', 'procedure', 'specialist_visit', 'diagnostic') DEFAULT 'referral',
    request_date DATE NOT NULL,
    requested_services JSON NOT NULL,
    clinical_justification LONGTEXT,
    supporting_documents JSON,
    
    -- Authorization Details
    authorization_number VARCHAR(100),
    approval_date DATE,
    expiry_date DATE,
    approved_visits INT,
    used_visits INT DEFAULT 0,
    
    -- Status Tracking
    status ENUM('pending', 'submitted', 'approved', 'denied', 'expired', 'cancelled') DEFAULT 'pending',
    denial_reason TEXT,
    appeal_deadline DATE,
    
    -- Communication
    submitted_method ENUM('online', 'fax', 'phone', 'mail') DEFAULT 'online',
    confirmation_number VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    INDEX idx_referral_auth (referral_id),
    INDEX idx_auth_status (status, request_date),
    INDEX idx_auth_number (authorization_number),
    INDEX idx_expiry_date (expiry_date)
);

-- Authorization Status Events Table
CREATE TABLE IF NOT EXISTS referral_authorization_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    authorization_id VARCHAR(50) NOT NULL,
    event_type ENUM('submitted', 'acknowledged', 'approved', 'denied', 'expired', 'appealed') NOT NULL,
    event_date DATETIME NOT NULL,
    event_details JSON,
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (authorization_id) REFERENCES referral_authorizations(id) ON DELETE CASCADE,
    INDEX idx_auth_events (authorization_id, event_date),
    INDEX idx_event_type (event_type, event_date)
);

-- =====================================================
-- COMMUNICATION & NOTIFICATIONS
-- =====================================================

-- Referral Communications Table
CREATE TABLE IF NOT EXISTS referral_communications (
    id VARCHAR(50) PRIMARY KEY,
    referral_id VARCHAR(50) NOT NULL,
    communication_type ENUM('letter', 'fax', 'email', 'phone', 'portal_message') NOT NULL,
    direction ENUM('outbound', 'inbound') NOT NULL,
    recipient_type ENUM('specialist', 'patient', 'insurance', 'provider') NOT NULL,
    recipient_info JSON,
    
    -- Content Details
    subject VARCHAR(500),
    content LONGTEXT,
    template_id VARCHAR(50),
    
    -- Delivery Tracking
    sent_at DATETIME,
    delivered_at DATETIME,
    read_at DATETIME,
    delivery_status ENUM('pending', 'sent', 'delivered', 'failed', 'bounced') DEFAULT 'pending',
    delivery_confirmation VARCHAR(200),
    
    -- Response Tracking
    response_required BOOLEAN DEFAULT FALSE,
    response_deadline DATETIME,
    response_received BOOLEAN DEFAULT FALSE,
    response_content LONGTEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES referral_templates(id),
    INDEX idx_referral_communications (referral_id),
    INDEX idx_communication_type (communication_type),
    INDEX idx_delivery_status (delivery_status),
    INDEX idx_response_tracking (response_required, response_deadline)
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS referral_notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(50) NOT NULL,
    user_type ENUM('provider', 'patient', 'specialist', 'admin') NOT NULL,
    notification_type ENUM('referral_created', 'referral_sent', 'referral_scheduled', 'referral_completed', 'authorization_approved', 'authorization_denied') NOT NULL,
    delivery_method ENUM('email', 'sms', 'portal', 'push') NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_notifications (user_id, user_type),
    INDEX idx_notification_type (notification_type),
    UNIQUE KEY unique_user_notification (user_id, notification_type, delivery_method)
);

-- =====================================================
-- ANALYTICS & REPORTING
-- =====================================================

-- Referral Analytics Cache Table
CREATE TABLE IF NOT EXISTS referral_analytics_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_name VARCHAR(100) NOT NULL,
    provider_id VARCHAR(50),
    specialist_id VARCHAR(50),
    specialty_type VARCHAR(100),
    date_period DATE NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    additional_data JSON,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_provider (metric_name, provider_id, date_period),
    INDEX idx_metric_specialist (metric_name, specialist_id, date_period),
    INDEX idx_metric_specialty (metric_name, specialty_type, date_period),
    INDEX idx_period_type (period_type, date_period),
    UNIQUE KEY unique_metric_cache (metric_name, provider_id, specialist_id, specialty_type, date_period, period_type)
);

-- Referral Quality Metrics Table
CREATE TABLE IF NOT EXISTS referral_quality_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id VARCHAR(50) NOT NULL,
    
    -- Timeliness Metrics
    creation_to_send_hours INT,
    send_to_schedule_days INT,
    schedule_to_completion_days INT,
    total_cycle_days INT,
    
    -- Quality Indicators
    appropriate_specialty BOOLEAN DEFAULT TRUE,
    complete_documentation BOOLEAN DEFAULT TRUE,
    authorization_obtained BOOLEAN DEFAULT TRUE,
    patient_prepared BOOLEAN DEFAULT TRUE,
    
    -- Outcome Metrics
    appointment_kept BOOLEAN,
    outcome_received BOOLEAN DEFAULT FALSE,
    follow_up_completed BOOLEAN DEFAULT FALSE,
    patient_satisfaction_score DECIMAL(3,2),
    
    -- Efficiency Metrics
    communication_attempts INT DEFAULT 0,
    rework_required BOOLEAN DEFAULT FALSE,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    INDEX idx_referral_quality (referral_id),
    INDEX idx_quality_indicators (appropriate_specialty, complete_documentation),
    INDEX idx_outcome_metrics (appointment_kept, outcome_received)
);

-- =====================================================
-- AUDIT & COMPLIANCE
-- =====================================================

-- Referral Audit Logs Table
CREATE TABLE IF NOT EXISTS referral_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id VARCHAR(50),
    user_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
    INDEX idx_referral_audit (referral_id),
    INDEX idx_user_action (user_id, action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- Compliance Tracking Table
CREATE TABLE IF NOT EXISTS referral_compliance_tracking (
    id INT PRIMARY KEY AUTO_INCREMENT,
    referral_id VARCHAR(50) NOT NULL,
    compliance_type ENUM('hipaa', 'authorization', 'documentation', 'timeliness', 'communication') NOT NULL,
    compliance_status ENUM('compliant', 'non_compliant', 'pending_review') NOT NULL,
    compliance_details JSON,
    reviewed_by VARCHAR(50),
    reviewed_at TIMESTAMP,
    corrective_action TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
    INDEX idx_referral_compliance (referral_id),
    INDEX idx_compliance_type (compliance_type, compliance_status),
    INDEX idx_reviewed_by (reviewed_by, reviewed_at)
);

-- =====================================================
-- INTEGRATION & EXTERNAL SYSTEMS
-- =====================================================

-- External System Integrations Table
CREATE TABLE IF NOT EXISTS referral_external_integrations (
    id VARCHAR(50) PRIMARY KEY,
    integration_name VARCHAR(100) NOT NULL,
    integration_type ENUM('ehr', 'scheduling', 'fax_gateway', 'email_service', 'insurance_api') NOT NULL,
    endpoint_url VARCHAR(500),
    authentication_config JSON,
    mapping_config JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    sync_status ENUM('success', 'error', 'pending') DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_integration_type (integration_type),
    INDEX idx_active_integrations (is_active),
    INDEX idx_sync_status (sync_status, last_sync_at)
);

-- External System Sync Logs Table
CREATE TABLE IF NOT EXISTS referral_sync_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    integration_id VARCHAR(50) NOT NULL,
    referral_id VARCHAR(50),
    sync_type ENUM('create', 'update', 'status_change', 'document_send') NOT NULL,
    sync_direction ENUM('outbound', 'inbound') NOT NULL,
    request_data JSON,
    response_data JSON,
    sync_status ENUM('success', 'error', 'retry') NOT NULL,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (integration_id) REFERENCES referral_external_integrations(id),
    FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE SET NULL,
    INDEX idx_integration_sync (integration_id, created_at),
    INDEX idx_referral_sync (referral_id),
    INDEX idx_sync_status (sync_status, created_at)
);

-- =====================================================
-- SAMPLE DATA & CONFIGURATION
-- =====================================================

-- Insert default specialist specialties
INSERT IGNORE INTO referral_specialists (id, name, specialty_primary, practice_name, phone, fax, email, city, state, is_active) VALUES
('SPEC001', 'Dr. Sarah Cardiologist', 'Cardiology', 'Heart Center Medical Group', '555-0101', '555-0102', 'scardiologist@heartcenter.com', 'New York', 'NY', TRUE),
('SPEC002', 'Dr. Michael Endocrine', 'Endocrinology', 'Diabetes & Hormone Clinic', '555-0201', '555-0202', 'mendocrine@diabetesclinic.com', 'New York', 'NY', TRUE),
('SPEC003', 'Dr. Jennifer Orthopedic', 'Orthopedics', 'Bone & Joint Institute', '555-0301', '555-0302', 'jorthopedic@boneinstitute.com', 'New York', 'NY', TRUE),
('SPEC004', 'Dr. Robert Neurologist', 'Neurology', 'Brain & Spine Center', '555-0401', '555-0402', 'rneurologist@braincenter.com', 'New York', 'NY', TRUE),
('SPEC005', 'Dr. Lisa Dermatologist', 'Dermatology', 'Skin Health Associates', '555-0501', '555-0502', 'ldermatologist@skinhealth.com', 'New York', 'NY', TRUE);

-- Insert default referral templates
INSERT IGNORE INTO referral_templates (id, name, specialty, template_type, content_template, variables, is_default, is_active) VALUES
('TMPL001', 'General Referral Letter', 'General', 'letter', 
'Dear {{specialist_name}},\n\nI am referring {{patient_name}} (DOB: {{patient_dob}}) for {{specialty}} consultation.\n\nReason for referral: {{referral_reason}}\n\nClinical Summary:\n{{clinical_notes}}\n\nPlease evaluate and provide recommendations.\n\nThank you,\n{{provider_name}}, {{provider_title}}', 
'["specialist_name", "patient_name", "patient_dob", "specialty", "referral_reason", "clinical_notes", "provider_name", "provider_title"]', 
TRUE, TRUE),

('TMPL002', 'Cardiology Referral', 'Cardiology', 'letter',
'Dear {{specialist_name}},\n\nI am referring {{patient_name}} (DOB: {{patient_dob}}) for cardiology evaluation.\n\nChief Complaint: {{referral_reason}}\n\nCardiovascular History:\n{{clinical_notes}}\n\nCurrent Medications: {{medications}}\n\nVital Signs: BP {{blood_pressure}}, HR {{heart_rate}}\n\nPlease evaluate for {{specific_concern}} and provide treatment recommendations.\n\nThank you,\n{{provider_name}}, {{provider_title}}',
'["specialist_name", "patient_name", "patient_dob", "referral_reason", "clinical_notes", "medications", "blood_pressure", "heart_rate", "specific_concern", "provider_name", "provider_title"]',
FALSE, TRUE),

('TMPL003', 'Urgent Referral', 'General', 'letter',
'URGENT REFERRAL\n\nDear {{specialist_name}},\n\nI am urgently referring {{patient_name}} (DOB: {{patient_dob}}) for immediate {{specialty}} evaluation.\n\nUrgent Concern: {{referral_reason}}\n\nClinical Findings:\n{{clinical_notes}}\n\nThis patient requires urgent attention. Please contact me at {{provider_phone}} if you need additional information.\n\nThank you,\n{{provider_name}}, {{provider_title}}',
'["specialist_name", "patient_name", "patient_dob", "specialty", "referral_reason", "clinical_notes", "provider_phone", "provider_name", "provider_title"]',
FALSE, TRUE);

-- Insert default notification preferences
INSERT IGNORE INTO referral_notification_preferences (user_id, user_type, notification_type, delivery_method, is_enabled) VALUES
('DEFAULT_PROVIDER', 'provider', 'referral_created', 'email', TRUE),
('DEFAULT_PROVIDER', 'provider', 'referral_scheduled', 'email', TRUE),
('DEFAULT_PROVIDER', 'provider', 'referral_completed', 'email', TRUE),
('DEFAULT_PATIENT', 'patient', 'referral_sent', 'portal', TRUE),
('DEFAULT_PATIENT', 'patient', 'referral_scheduled', 'email', TRUE),
('DEFAULT_SPECIALIST', 'specialist', 'referral_created', 'fax', TRUE);

-- Create performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_referrals_composite ON referrals(patient_id, provider_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_referrals_workflow ON referrals(status, urgency_level, created_at);
CREATE INDEX IF NOT EXISTS idx_specialist_performance ON referral_specialist_metrics(specialist_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_authorization_tracking ON referral_authorizations(status, expiry_date);
CREATE INDEX IF NOT EXISTS idx_communication_delivery ON referral_communications(delivery_status, sent_at);

-- Summary
SELECT 'Comprehensive Referral Management Schema Installation Successful!' as Status,
       'All tables, indexes, sample data, and templates created successfully' as Message,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name LIKE 'referral%') as TablesCreated;