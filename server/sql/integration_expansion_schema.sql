-- Integration Expansion Schema
-- EHR systems and medical device integrations

-- EHR Integrations Table
CREATE TABLE IF NOT EXISTS ehr_integrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    
    -- EHR System Details
    ehr_system ENUM('epic', 'cerner', 'allscripts', 'athenahealth', 'nextgen', 'fhir_generic', 'custom') NOT NULL,
    ehr_name VARCHAR(255),
    endpoint_url VARCHAR(500) NOT NULL,
    
    -- Authentication
    authentication_type ENUM('oauth2', 'api_key', 'basic_auth', 'certificate') DEFAULT 'oauth2',
    client_id VARCHAR(255),
    client_secret VARCHAR(255),
    api_key VARCHAR(255),
    token_endpoint VARCHAR(500),
    
    -- API Configuration
    api_version VARCHAR(20) DEFAULT 'R4',
    supported_resources JSON, -- FHIR resources supported
    rate_limit_per_minute INT DEFAULT 60,
    
    -- Integration Settings
    configuration_data JSON,
    sync_enabled BOOLEAN DEFAULT TRUE,
    auto_sync_encounters BOOLEAN DEFAULT TRUE,
    auto_sync_patients BOOLEAN DEFAULT FALSE,
    
    -- Status and Testing
    is_active BOOLEAN DEFAULT TRUE,
    last_test_date DATETIME,
    test_status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    test_result JSON,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_provider_ehr (provider_id, ehr_system),
    INDEX idx_ehr_system (ehr_system, is_active),
    INDEX idx_test_status (test_status, last_test_date)
);

-- EHR Sync Log Table
CREATE TABLE IF NOT EXISTS ehr_sync_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT,
    patient_id INT,
    provider_id INT NOT NULL,
    ehr_system VARCHAR(50) NOT NULL,
    
    -- Sync Details
    sync_type ENUM('encounter', 'patient', 'observation', 'medication', 'allergy', 'condition') NOT NULL,
    sync_direction ENUM('to_ehr', 'from_ehr', 'bidirectional') DEFAULT 'to_ehr',
    sync_status ENUM('success', 'failed', 'partial', 'pending') NOT NULL,
    
    -- Resource Information
    local_resource_id VARCHAR(100),
    ehr_resource_id VARCHAR(100),
    resource_type VARCHAR(50),
    
    -- Sync Data
    sync_data JSON,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    -- Timing
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_retry_at TIMESTAMP NULL,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_sync (session_id, sync_type),
    INDEX idx_patient_sync (patient_id, sync_type),
    INDEX idx_provider_sync (provider_id, synced_at),
    INDEX idx_sync_status (sync_status, synced_at),
    INDEX idx_retry_queue (next_retry_at, sync_status)
);

-- Medical Device Integrations Table
CREATE TABLE IF NOT EXISTS medical_device_integrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    
    -- Device Information
    device_type ENUM(
        'blood_pressure_monitor', 'pulse_oximeter', 'digital_stethoscope',
        'digital_thermometer', 'glucometer', 'peak_flow_meter', 'scale',
        'ecg_monitor', 'spirometer', 'otoscope', 'dermatoscope', 'ophthalmoscope'
    ) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    firmware_version VARCHAR(50),
    
    -- Connectivity
    connection_type ENUM('bluetooth', 'wifi', 'usb', 'serial', 'api', 'cloud') NOT NULL,
    api_endpoint VARCHAR(500),
    authentication_data JSON,
    
    -- Data Configuration
    data_format ENUM('json', 'xml', 'hl7', 'csv', 'proprietary') DEFAULT 'json',
    measurement_units JSON, -- Supported units for each measurement type
    calibration_data JSON,
    
    -- Integration Settings
    auto_sync_enabled BOOLEAN DEFAULT TRUE,
    real_time_monitoring BOOLEAN DEFAULT FALSE,
    alert_thresholds JSON,
    
    -- Device Status
    is_active BOOLEAN DEFAULT TRUE,
    last_communication TIMESTAMP,
    battery_level INT,
    connection_status ENUM('connected', 'disconnected', 'error') DEFAULT 'disconnected',
    
    -- Maintenance
    last_calibration_date DATE,
    next_maintenance_date DATE,
    warranty_expiration DATE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_provider_devices (provider_id, device_type),
    INDEX idx_device_type (device_type, is_active),
    INDEX idx_connection_status (connection_status, last_communication),
    INDEX idx_maintenance_due (next_maintenance_date, is_active)
);

-- Device Readings Table
CREATE TABLE IF NOT EXISTS device_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    session_id INT,
    patient_id INT,
    
    -- Reading Details
    reading_type VARCHAR(100) NOT NULL, -- e.g., 'systolic_bp', 'heart_rate', 'temperature'
    reading_value DECIMAL(10,4) NOT NULL,
    unit_of_measure VARCHAR(20) NOT NULL,
    
    -- Quality and Validation
    reading_quality ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
    is_validated BOOLEAN DEFAULT FALSE,
    validation_notes TEXT,
    
    -- Timing
    reading_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    device_timestamp TIMESTAMP, -- Timestamp from the device itself
    
    -- Context
    measurement_context ENUM('resting', 'post_exercise', 'pre_medication', 'post_medication', 'other') DEFAULT 'resting',
    patient_position ENUM('sitting', 'standing', 'lying', 'unknown') DEFAULT 'sitting',
    
    -- Raw Data
    raw_data JSON, -- Original data from device
    processed_data JSON, -- Processed/calculated values
    
    -- Alerts
    alert_triggered BOOLEAN DEFAULT FALSE,
    alert_level ENUM('info', 'warning', 'critical') NULL,
    alert_message TEXT,
    
    FOREIGN KEY (device_id) REFERENCES medical_device_integrations(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_device_readings (device_id, reading_timestamp),
    INDEX idx_session_readings (session_id, reading_type),
    INDEX idx_patient_readings (patient_id, reading_type, reading_timestamp),
    INDEX idx_reading_type (reading_type, reading_timestamp),
    INDEX idx_alerts (alert_triggered, alert_level, reading_timestamp)
);

-- AI Clinical Analysis Table
CREATE TABLE IF NOT EXISTS ai_clinical_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    
    -- Analysis Details
    analysis_type ENUM('transcript_analysis', 'symptom_analysis', 'risk_assessment', 'drug_interaction', 'clinical_decision_support') NOT NULL,
    analysis_data JSON NOT NULL,
    
    -- AI Model Information
    ai_model_name VARCHAR(100),
    ai_model_version VARCHAR(20),
    confidence_score DECIMAL(3,2),
    
    -- Results
    recommendations JSON,
    alerts JSON,
    differential_diagnosis JSON,
    
    -- Clinical Context
    symptoms_analyzed JSON,
    conditions_considered JSON,
    medications_reviewed JSON,
    
    -- Validation
    provider_reviewed BOOLEAN DEFAULT FALSE,
    provider_feedback TEXT,
    accuracy_rating INT CHECK (accuracy_rating BETWEEN 1 AND 5),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_analysis (session_id, analysis_type),
    INDEX idx_patient_analysis (patient_id, analysis_type, created_at),
    INDEX idx_provider_analysis (provider_id, created_at),
    INDEX idx_confidence_score (confidence_score, analysis_type),
    INDEX idx_provider_review (provider_reviewed, created_at)
);

-- AI Clinical Suggestions Table
CREATE TABLE IF NOT EXISTS ai_clinical_suggestions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    provider_id INT NOT NULL,
    
    -- Suggestion Details
    suggestion_type ENUM('real_time', 'diagnostic', 'therapeutic', 'preventive', 'follow_up') NOT NULL,
    suggestions_data JSON NOT NULL,
    
    -- Trigger Information
    triggered_by JSON, -- What triggered this suggestion
    trigger_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Provider Interaction
    displayed_to_provider BOOLEAN DEFAULT FALSE,
    provider_action ENUM('accepted', 'rejected', 'modified', 'ignored') NULL,
    provider_notes TEXT,
    
    -- Effectiveness Tracking
    suggestion_followed BOOLEAN DEFAULT FALSE,
    outcome_tracked BOOLEAN DEFAULT FALSE,
    effectiveness_rating INT CHECK (effectiveness_rating BETWEEN 1 AND 5),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acted_on_at TIMESTAMP NULL,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_suggestions (session_id, suggestion_type),
    INDEX idx_provider_suggestions (provider_id, created_at),
    INDEX idx_suggestion_type (suggestion_type, created_at),
    INDEX idx_provider_action (provider_action, created_at),
    INDEX idx_effectiveness (effectiveness_rating, suggestion_followed)
);

-- Integration Analytics Table
CREATE TABLE IF NOT EXISTS integration_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_recorded DATE NOT NULL,
    provider_id INT,
    
    -- EHR Integration Metrics
    ehr_sync_attempts INT DEFAULT 0,
    ehr_sync_successes INT DEFAULT 0,
    ehr_sync_failures INT DEFAULT 0,
    avg_ehr_sync_time DECIMAL(8,2), -- in seconds
    
    -- Device Integration Metrics
    device_readings_received INT DEFAULT 0,
    device_alerts_triggered INT DEFAULT 0,
    device_connection_uptime DECIMAL(5,2), -- percentage
    
    -- AI Analysis Metrics
    ai_analyses_performed INT DEFAULT 0,
    ai_suggestions_generated INT DEFAULT 0,
    ai_suggestions_accepted INT DEFAULT 0,
    avg_ai_confidence_score DECIMAL(3,2),
    
    -- Quality Metrics
    data_quality_score DECIMAL(3,2),
    integration_reliability_score DECIMAL(3,2),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_provider_date (provider_id, date_recorded),
    INDEX idx_date_analytics (date_recorded),
    INDEX idx_provider_analytics (provider_id, date_recorded)
);

-- Integration Error Log Table
CREATE TABLE IF NOT EXISTS integration_error_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Error Context
    integration_type ENUM('ehr', 'device', 'ai', 'fhir', 'hl7') NOT NULL,
    integration_id INT, -- ID of the specific integration
    session_id INT,
    
    -- Error Details
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_category ENUM('authentication', 'network', 'data_format', 'validation', 'timeout', 'rate_limit', 'other') NOT NULL,
    
    -- Technical Details
    stack_trace LONGTEXT,
    request_data JSON,
    response_data JSON,
    
    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    resolved_by INT,
    
    -- Occurrence Tracking
    first_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_occurrence TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurrence_count INT DEFAULT 1,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_integration_errors (integration_type, integration_id),
    INDEX idx_error_category (error_category, first_occurrence),
    INDEX idx_unresolved_errors (resolved, error_category),
    INDEX idx_session_errors (session_id, integration_type)
);

-- FHIR Resource Mapping Table
CREATE TABLE IF NOT EXISTS fhir_resource_mappings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Local Resource
    local_table VARCHAR(100) NOT NULL,
    local_id INT NOT NULL,
    local_type VARCHAR(50) NOT NULL,
    
    -- FHIR Resource
    fhir_resource_type VARCHAR(50) NOT NULL,
    fhir_resource_id VARCHAR(100) NOT NULL,
    fhir_server_url VARCHAR(500) NOT NULL,
    
    -- Mapping Details
    mapping_version VARCHAR(20) DEFAULT '1.0',
    last_sync_timestamp TIMESTAMP,
    sync_status ENUM('synced', 'pending', 'failed', 'conflict') DEFAULT 'pending',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_local_resource (local_table, local_id),
    UNIQUE KEY unique_fhir_resource (fhir_server_url, fhir_resource_type, fhir_resource_id),
    
    INDEX idx_local_mapping (local_table, local_type),
    INDEX idx_fhir_mapping (fhir_resource_type, sync_status),
    INDEX idx_sync_status (sync_status, last_sync_timestamp)
);

-- Triggers for Integration Analytics
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_integration_analytics_after_sync
AFTER INSERT ON ehr_sync_log
FOR EACH ROW
BEGIN
    INSERT INTO integration_analytics (
        date_recorded, provider_id, ehr_sync_attempts,
        ehr_sync_successes, ehr_sync_failures
    ) VALUES (
        DATE(NEW.synced_at), NEW.provider_id, 1,
        CASE WHEN NEW.sync_status = 'success' THEN 1 ELSE 0 END,
        CASE WHEN NEW.sync_status = 'failed' THEN 1 ELSE 0 END
    ) ON DUPLICATE KEY UPDATE
        ehr_sync_attempts = ehr_sync_attempts + 1,
        ehr_sync_successes = ehr_sync_successes + CASE WHEN NEW.sync_status = 'success' THEN 1 ELSE 0 END,
        ehr_sync_failures = ehr_sync_failures + CASE WHEN NEW.sync_status = 'failed' THEN 1 ELSE 0 END,
        calculated_at = NOW();
END //

CREATE TRIGGER IF NOT EXISTS update_integration_analytics_after_device_reading
AFTER INSERT ON device_readings
FOR EACH ROW
BEGIN
    DECLARE provider_id_var INT;
    
    SELECT mdi.provider_id INTO provider_id_var
    FROM medical_device_integrations mdi
    WHERE mdi.id = NEW.device_id;
    
    INSERT INTO integration_analytics (
        date_recorded, provider_id, device_readings_received,
        device_alerts_triggered
    ) VALUES (
        DATE(NEW.reading_timestamp), provider_id_var, 1,
        CASE WHEN NEW.alert_triggered THEN 1 ELSE 0 END
    ) ON DUPLICATE KEY UPDATE
        device_readings_received = device_readings_received + 1,
        device_alerts_triggered = device_alerts_triggered + CASE WHEN NEW.alert_triggered THEN 1 ELSE 0 END,
        calculated_at = NOW();
END //

CREATE TRIGGER IF NOT EXISTS update_integration_analytics_after_ai_analysis
AFTER INSERT ON ai_clinical_analysis
FOR EACH ROW
BEGIN
    INSERT INTO integration_analytics (
        date_recorded, provider_id, ai_analyses_performed,
        avg_ai_confidence_score
    ) VALUES (
        DATE(NEW.created_at), NEW.provider_id, 1, NEW.confidence_score
    ) ON DUPLICATE KEY UPDATE
        ai_analyses_performed = ai_analyses_performed + 1,
        avg_ai_confidence_score = (
            (avg_ai_confidence_score * (ai_analyses_performed - 1) + NEW.confidence_score) / ai_analyses_performed
        ),
        calculated_at = NOW();
END //

DELIMITER ;

-- Sample Data for Testing
INSERT IGNORE INTO ehr_integrations (
    provider_id, ehr_system, ehr_name, endpoint_url, 
    authentication_type, api_version, is_active
) VALUES 
(1, 'fhir_generic', 'Test FHIR Server', 'http://localhost:8080/fhir', 'oauth2', 'R4', TRUE),
(1, 'epic', 'Epic MyChart', 'https://fhir.epic.com/interconnect-fhir-oauth', 'oauth2', 'R4', FALSE);

INSERT IGNORE INTO medical_device_integrations (
    provider_id, device_type, device_name, manufacturer, model,
    connection_type, is_active
) VALUES 
(1, 'blood_pressure_monitor', 'Omron BP Monitor', 'Omron', 'HEM-7156T', 'bluetooth', TRUE),
(1, 'pulse_oximeter', 'Nonin Pulse Ox', 'Nonin', '3230', 'bluetooth', TRUE);

SELECT 'Integration Expansion Schema Created Successfully!' as Status;