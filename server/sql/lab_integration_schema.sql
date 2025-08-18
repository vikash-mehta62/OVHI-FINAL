-- Lab Integration System Database Schema
-- Comprehensive lab ordering, result processing, and provider workflow management

-- Lab Facilities Configuration
CREATE TABLE lab_facilities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    clia_number VARCHAR(20),
    transport_type ENUM('fax', 'sftp', 'mllp', 'fhir') NOT NULL,
    endpoint_url VARCHAR(500),
    auth_config JSON COMMENT 'OAuth2/API key configuration',
    contact_info JSON COMMENT 'Phone, fax, email, address',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_transport (transport_type),
    INDEX idx_name (name)
);

-- Lab Test Compendium
CREATE TABLE lab_compendium (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_facility_id INT NOT NULL,
    lab_test_code VARCHAR(50) NOT NULL,
    loinc_code VARCHAR(20),
    display_name VARCHAR(255) NOT NULL,
    specimen_type VARCHAR(100),
    units VARCHAR(50),
    reference_range VARCHAR(200),
    collection_instructions TEXT,
    patient_prep_instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_facility_id) REFERENCES lab_facilities(id) ON DELETE CASCADE,
    INDEX idx_lab_code (lab_facility_id, lab_test_code),
    INDEX idx_loinc (loinc_code),
    INDEX idx_active (is_active),
    INDEX idx_display_name (display_name),
    UNIQUE KEY unique_lab_test (lab_facility_id, lab_test_code)
);

-- Lab Orders
CREATE TABLE lab_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    encounter_id INT,
    lab_facility_id INT NOT NULL,
    status ENUM('draft', 'signed', 'sent', 'ack', 'in_progress', 'partial', 'final', 'corrected', 'canceled') DEFAULT 'draft',
    priority ENUM('routine', 'urgent', 'stat') DEFAULT 'routine',
    icd10_codes JSON COMMENT 'Array of ICD-10 codes for medical necessity',
    abn_signed BOOLEAN DEFAULT FALSE,
    abn_signature_path VARCHAR(500),
    requester_provider_id INT NOT NULL,
    service_location_id INT,
    clinical_notes TEXT,
    collection_datetime TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    ack_at TIMESTAMP NULL,
    final_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid) ON DELETE RESTRICT,
    FOREIGN KEY (lab_facility_id) REFERENCES lab_facilities(id) ON DELETE RESTRICT,
    INDEX idx_patient (patient_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number),
    INDEX idx_provider (requester_provider_id),
    INDEX idx_created (created_at),
    INDEX idx_facility (lab_facility_id),
    INDEX idx_collection_date (collection_datetime)
);

-- Lab Order Tests (Junction table for order-test relationships)
CREATE TABLE lab_order_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_order_id INT NOT NULL,
    compendium_id INT NOT NULL,
    lab_test_code VARCHAR(50) NOT NULL,
    loinc_code VARCHAR(20),
    test_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (compendium_id) REFERENCES lab_compendium(id) ON DELETE RESTRICT,
    INDEX idx_order (lab_order_id),
    INDEX idx_compendium (compendium_id),
    INDEX idx_loinc (loinc_code),
    UNIQUE KEY unique_order_test (lab_order_id, compendium_id)
);

-- Lab Results
CREATE TABLE lab_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_order_id INT NOT NULL,
    external_report_id VARCHAR(100),
    status ENUM('preliminary', 'final', 'corrected', 'canceled') DEFAULT 'preliminary',
    pdf_path VARCHAR(500),
    raw_payload_encrypted LONGTEXT COMMENT 'Encrypted full FHIR/HL7 payload',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    released_to_portal BOOLEAN DEFAULT FALSE,
    released_at TIMESTAMP NULL,
    clinical_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (lab_order_id),
    INDEX idx_external_id (external_report_id),
    INDEX idx_status (status),
    INDEX idx_received (received_at),
    INDEX idx_reviewed (reviewed_by, reviewed_at),
    INDEX idx_portal_release (released_to_portal, released_at)
);

-- Lab Observations (Discrete Values)
CREATE TABLE lab_observations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_result_id INT NOT NULL,
    loinc_code VARCHAR(20),
    test_name VARCHAR(255) NOT NULL,
    value_text VARCHAR(500),
    value_numeric DECIMAL(15,6),
    units VARCHAR(50),
    reference_range VARCHAR(200),
    abnormal_flag ENUM('normal', 'high', 'low', 'critical_high', 'critical_low', 'abnormal') DEFAULT 'normal',
    observation_status ENUM('preliminary', 'final', 'corrected', 'canceled') DEFAULT 'preliminary',
    observation_datetime TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_result_id) REFERENCES lab_results(id) ON DELETE CASCADE,
    INDEX idx_result (lab_result_id),
    INDEX idx_loinc (loinc_code),
    INDEX idx_abnormal (abnormal_flag),
    INDEX idx_status (observation_status),
    INDEX idx_patient_loinc_trend (lab_result_id, loinc_code, observation_datetime),
    INDEX idx_critical_results (abnormal_flag, created_at) -- For critical result monitoring
);

-- Lab Events (Comprehensive Audit Trail)
CREATE TABLE lab_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_order_id INT NOT NULL,
    event_type ENUM('order_created', 'order_signed', 'order_sent', 'order_ack', 'result_received', 'result_reviewed', 'result_released', 'critical_alert', 'transmission_failed', 'error') NOT NULL,
    event_detail JSON COMMENT 'Detailed event information',
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (lab_order_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id),
    INDEX idx_critical_events (event_type, created_at) -- For monitoring critical events
);

-- Critical Result Escalations
CREATE TABLE lab_critical_escalations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_observation_id INT NOT NULL,
    escalation_level INT DEFAULT 1,
    notified_provider_id INT,
    notification_method ENUM('email', 'sms', 'phone', 'in_app') NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP NULL,
    acknowledged_by INT,
    retry_count INT DEFAULT 0,
    next_retry_at TIMESTAMP,
    escalation_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_observation_id) REFERENCES lab_observations(id) ON DELETE CASCADE,
    INDEX idx_observation (lab_observation_id),
    INDEX idx_acknowledged (acknowledged),
    INDEX idx_retry (next_retry_at),
    INDEX idx_provider (notified_provider_id),
    INDEX idx_escalation_monitoring (acknowledged, escalation_level, created_at)
);

-- Lab Transmission Log (For tracking all transmission attempts)
CREATE TABLE lab_transmission_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_order_id INT NOT NULL,
    transmission_type ENUM('fax', 'fhir', 'hl7', 'sftp') NOT NULL,
    transmission_status ENUM('pending', 'sent', 'delivered', 'failed', 'retry') NOT NULL,
    endpoint_info JSON COMMENT 'Destination endpoint details',
    transmission_id VARCHAR(100) COMMENT 'External system transmission ID',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (lab_order_id),
    INDEX idx_status (transmission_status),
    INDEX idx_type (transmission_type),
    INDEX idx_retry_monitoring (transmission_status, retry_count, created_at),
    INDEX idx_transmission_id (transmission_id)
);

-- Lab Billing Integration (Links to RCM system)
CREATE TABLE lab_billing_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_order_id INT NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    description VARCHAR(255),
    units INT DEFAULT 1,
    charge_amount DECIMAL(10,2),
    billing_status ENUM('pending', 'billed', 'paid', 'denied') DEFAULT 'pending',
    billing_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (lab_order_id),
    INDEX idx_cpt (cpt_code),
    INDEX idx_billing_status (billing_status),
    INDEX idx_billing_date (billing_date)
);

-- Lab Configuration Settings
CREATE TABLE lab_system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSON NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (config_key),
    INDEX idx_active (is_active)
);

-- Insert default configuration values
INSERT INTO lab_system_config (config_key, config_value, description) VALUES
('critical_escalation_rules', '[]', 'Critical result escalation configuration'),
('encryption_settings', '{"algorithm": "AES-256-GCM", "key_rotation_days": 90}', 'Data encryption configuration'),
('audit_retention_days', '3650', 'Audit log retention period in days (10 years)'),
('result_retention_days', '2555', 'Lab result retention period in days (7 years)'),
('phi_redaction_patterns', '["ssn", "phone", "email", "address"]', 'PHI redaction patterns for logs'),
('notification_settings', '{"retry_attempts": 3, "retry_delay_minutes": [5, 15, 30]}', 'Notification retry configuration');

-- Create indexes for performance optimization
CREATE INDEX idx_lab_orders_comprehensive ON lab_orders (patient_id, status, created_at);
CREATE INDEX idx_lab_results_comprehensive ON lab_results (lab_order_id, status, received_at);
CREATE INDEX idx_lab_observations_trending ON lab_observations (loinc_code, observation_datetime, value_numeric);
CREATE INDEX idx_lab_events_audit ON lab_events (event_type, user_id, created_at);

-- Add comments for documentation
ALTER TABLE lab_facilities COMMENT = 'Configuration for external lab facilities and their integration methods';
ALTER TABLE lab_compendium COMMENT = 'Test catalog with LOINC mappings and specimen requirements';
ALTER TABLE lab_orders COMMENT = 'Lab orders with status tracking and medical necessity documentation';
ALTER TABLE lab_order_tests COMMENT = 'Junction table linking orders to specific tests';
ALTER TABLE lab_results COMMENT = 'Lab results with encrypted payload storage and review tracking';
ALTER TABLE lab_observations COMMENT = 'Discrete lab values with abnormal flag detection';
ALTER TABLE lab_events COMMENT = 'Comprehensive audit trail for all lab system activities';
ALTER TABLE lab_critical_escalations COMMENT = 'Critical result escalation tracking and acknowledgment';
ALTER TABLE lab_transmission_log COMMENT = 'Transmission attempt logging for all delivery methods';
ALTER TABLE lab_billing_items COMMENT = 'Lab billing integration with RCM system';
ALTER TABLE lab_system_config COMMENT = 'System-wide configuration settings for lab integration';