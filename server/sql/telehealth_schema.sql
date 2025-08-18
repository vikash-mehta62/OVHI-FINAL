-- Telehealth System Database Schema
-- Comprehensive schema for telehealth sessions, recordings, and compliance

-- Telehealth Sessions Table
CREATE TABLE IF NOT EXISTS telehealth_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    appointment_id INT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    session_type ENUM('video', 'audio', 'phone') DEFAULT 'video',
    session_status ENUM('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    
    -- RingCentral Integration
    ringcentral_meeting_id VARCHAR(255),
    ringcentral_join_url TEXT,
    ringcentral_host_url TEXT,
    ringcentral_password VARCHAR(100),
    
    -- Session Details
    scheduled_start_time DATETIME NOT NULL,
    actual_start_time DATETIME,
    end_time DATETIME,
    duration_minutes INT DEFAULT 0,
    
    -- Technical Details
    connection_quality JSON, -- Store quality metrics
    network_issues JSON, -- Store any network problems
    device_info JSON, -- Store device/browser info
    
    -- Clinical Information
    chief_complaint TEXT,
    consultation_notes LONGTEXT,
    diagnosis_codes JSON,
    treatment_plan TEXT,
    prescriptions_issued JSON,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    
    -- Compliance & Documentation
    consent_obtained BOOLEAN DEFAULT FALSE,
    consent_timestamp DATETIME,
    hipaa_compliant BOOLEAN DEFAULT TRUE,
    recording_consent BOOLEAN DEFAULT FALSE,
    
    -- Billing Integration
    billing_code VARCHAR(10), -- CPT code for telehealth
    billing_amount DECIMAL(10,2),
    billing_status ENUM('pending', 'billed', 'paid') DEFAULT 'pending',
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    
    INDEX idx_session_id (session_id),
    INDEX idx_patient_sessions (patient_id, session_status),
    INDEX idx_provider_sessions (provider_id, session_status),
    INDEX idx_session_date (scheduled_start_time),
    INDEX idx_session_status (session_status, scheduled_start_time)
);

-- Session Participants Table (for group sessions)
CREATE TABLE IF NOT EXISTS telehealth_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    participant_id INT NOT NULL,
    participant_type ENUM('patient', 'provider', 'caregiver', 'interpreter', 'observer') NOT NULL,
    join_time DATETIME,
    leave_time DATETIME,
    connection_duration INT DEFAULT 0, -- in minutes
    audio_enabled BOOLEAN DEFAULT TRUE,
    video_enabled BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_participants (session_id),
    INDEX idx_participant_sessions (participant_id)
);

-- Session Recordings Table
CREATE TABLE IF NOT EXISTS telehealth_recordings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    recording_type ENUM('video', 'audio', 'screen_share', 'transcript') NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    duration_seconds INT,
    
    -- RingCentral Recording Info
    ringcentral_recording_id VARCHAR(255),
    ringcentral_download_url TEXT,
    
    -- Security & Compliance
    encrypted BOOLEAN DEFAULT TRUE,
    encryption_key_id VARCHAR(100),
    retention_period_days INT DEFAULT 2555, -- 7 years default
    auto_delete_date DATE,
    
    -- Access Control
    access_level ENUM('provider_only', 'patient_provider', 'authorized_users') DEFAULT 'provider_only',
    download_count INT DEFAULT 0,
    last_accessed DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    
    INDEX idx_session_recordings (session_id),
    INDEX idx_recording_type (recording_type),
    INDEX idx_auto_delete (auto_delete_date)
);

-- Session Transcripts Table
CREATE TABLE IF NOT EXISTS telehealth_transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    speaker_type ENUM('patient', 'provider', 'system') NOT NULL,
    speaker_id INT,
    transcript_text LONGTEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- AI transcription confidence
    timestamp_start TIME,
    timestamp_end TIME,
    
    -- AI Processing
    processed_by_ai BOOLEAN DEFAULT FALSE,
    ai_summary TEXT,
    key_points JSON,
    medical_terms_extracted JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_session_transcripts (session_id, timestamp_start),
    INDEX idx_speaker_transcripts (speaker_id)
);

-- Telehealth Equipment/Devices Table
CREATE TABLE IF NOT EXISTS telehealth_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_name VARCHAR(255) NOT NULL,
    device_type ENUM('camera', 'microphone', 'speaker', 'stethoscope', 'otoscope', 'dermatoscope', 'blood_pressure', 'pulse_oximeter') NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Integration Details
    api_endpoint VARCHAR(500),
    driver_version VARCHAR(50),
    compatibility_info JSON,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_calibration DATE,
    next_maintenance_date DATE,
    
    -- Assignment
    assigned_to_provider INT,
    location_id INT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assigned_to_provider) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_device_type (device_type),
    INDEX idx_assigned_provider (assigned_to_provider),
    INDEX idx_device_status (is_active)
);

-- Session Device Usage Table
CREATE TABLE IF NOT EXISTS telehealth_session_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    device_id INT NOT NULL,
    used_by_provider INT NOT NULL,
    usage_start_time DATETIME,
    usage_end_time DATETIME,
    readings_captured JSON, -- Store device readings
    notes TEXT,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES telehealth_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by_provider) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_devices (session_id),
    INDEX idx_device_usage (device_id, usage_start_time)
);

-- Telehealth Waiting Room Table
CREATE TABLE IF NOT EXISTS telehealth_waiting_room (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    patient_id INT NOT NULL,
    join_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    estimated_wait_time INT, -- in minutes
    priority_level ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('waiting', 'called', 'in_session', 'left') DEFAULT 'waiting',
    
    -- Patient Preparation
    pre_visit_forms_completed BOOLEAN DEFAULT FALSE,
    insurance_verified BOOLEAN DEFAULT FALSE,
    consent_forms_signed BOOLEAN DEFAULT FALSE,
    technical_check_completed BOOLEAN DEFAULT FALSE,
    
    -- Communication
    last_notification_sent DATETIME,
    notification_count INT DEFAULT 0,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_waiting_room_status (status, join_time),
    INDEX idx_patient_waiting (patient_id, status)
);

-- Telehealth Analytics Table
CREATE TABLE IF NOT EXISTS telehealth_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    date_recorded DATE NOT NULL,
    
    -- Session Metrics
    total_sessions INT DEFAULT 0,
    completed_sessions INT DEFAULT 0,
    cancelled_sessions INT DEFAULT 0,
    no_show_sessions INT DEFAULT 0,
    
    -- Quality Metrics
    avg_connection_quality DECIMAL(5,2),
    technical_issues_count INT DEFAULT 0,
    avg_session_duration DECIMAL(5,2), -- in minutes
    
    -- Patient Satisfaction
    avg_patient_rating DECIMAL(3,2),
    total_ratings_received INT DEFAULT 0,
    
    -- Financial Metrics
    total_revenue DECIMAL(10,2) DEFAULT 0.00,
    avg_revenue_per_session DECIMAL(10,2) DEFAULT 0.00,
    
    -- Efficiency Metrics
    avg_wait_time DECIMAL(5,2), -- in minutes
    sessions_per_hour DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_provider_date (provider_id, date_recorded),
    INDEX idx_analytics_date (date_recorded),
    INDEX idx_provider_analytics (provider_id, date_recorded)
);

-- Enhanced RingCentral Configuration Table
CREATE TABLE IF NOT EXISTS ring_cent_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    
    -- Basic Configuration
    client_id VARCHAR(255) NOT NULL,
    client_server VARCHAR(255),
    client_secret VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    jwt_token TEXT,
    ring_cent_pass VARCHAR(255),
    auth_type ENUM('jwt', 'oauth', 'password') DEFAULT 'jwt',
    
    -- Advanced Settings
    auto_recording BOOLEAN DEFAULT FALSE,
    recording_format ENUM('mp4', 'mp3', 'wav') DEFAULT 'mp4',
    max_participants INT DEFAULT 10,
    waiting_room_enabled BOOLEAN DEFAULT TRUE,
    
    -- Security Settings
    require_password BOOLEAN DEFAULT TRUE,
    allow_join_before_host BOOLEAN DEFAULT FALSE,
    mute_participants_on_entry BOOLEAN DEFAULT TRUE,
    
    -- Integration Settings
    webhook_url VARCHAR(500),
    api_version VARCHAR(10) DEFAULT 'v1.0',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_tested DATETIME,
    test_status ENUM('success', 'failed', 'pending') DEFAULT 'pending',
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_provider_config (provider_id),
    INDEX idx_provider_config (provider_id),
    INDEX idx_config_status (is_active, test_status)
);

-- Telehealth Compliance Audit Table
CREATE TABLE IF NOT EXISTS telehealth_compliance_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    audit_type ENUM('hipaa', 'consent', 'recording', 'prescription', 'billing') NOT NULL,
    compliance_status ENUM('compliant', 'non_compliant', 'needs_review') NOT NULL,
    audit_details JSON,
    audited_by INT,
    audit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Remediation
    remediation_required BOOLEAN DEFAULT FALSE,
    remediation_notes TEXT,
    remediation_completed BOOLEAN DEFAULT FALSE,
    remediation_date DATETIME,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (audited_by) REFERENCES users(user_id) ON DELETE SET NULL,
    
    INDEX idx_session_audit (session_id, audit_type),
    INDEX idx_compliance_status (compliance_status, audit_date),
    INDEX idx_remediation (remediation_required, remediation_completed)
);

-- Sample Data for Testing
INSERT IGNORE INTO telehealth_sessions (
    session_id, patient_id, provider_id, session_type, session_status,
    scheduled_start_time, chief_complaint, consent_obtained
) VALUES 
('TH-2025-001', 2, 1, 'video', 'completed', 
 NOW() - INTERVAL 1 DAY, 'Follow-up consultation for hypertension', TRUE),
('TH-2025-002', 3, 1, 'video', 'scheduled', 
 NOW() + INTERVAL 2 HOURS, 'Initial consultation for diabetes management', FALSE),
('TH-2025-003', 4, 1, 'audio', 'in_progress', 
 NOW() - INTERVAL 30 MINUTE, 'Medication review and adjustment', TRUE);

-- Triggers for Analytics Updates
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_telehealth_analytics
AFTER UPDATE ON telehealth_sessions
FOR EACH ROW
BEGIN
    IF NEW.session_status = 'completed' AND OLD.session_status != 'completed' THEN
        INSERT INTO telehealth_analytics (
            provider_id, date_recorded, total_sessions, completed_sessions
        ) VALUES (
            NEW.provider_id, DATE(NEW.end_time), 1, 1
        ) ON DUPLICATE KEY UPDATE
            total_sessions = total_sessions + 1,
            completed_sessions = completed_sessions + 1,
            avg_session_duration = (
                (avg_session_duration * (completed_sessions - 1) + NEW.duration_minutes) / completed_sessions
            );
    END IF;
END //
DELIMITER ;

SELECT 'Telehealth Schema Created Successfully!' as Status;