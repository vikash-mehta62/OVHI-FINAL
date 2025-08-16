-- Remote Patient Monitoring (RPM) Database Schema
-- This schema supports comprehensive RPM functionality including device management,
-- patient enrollment, readings tracking, and alert management

-- RPM Patient Enrollments Table
-- Tracks which patients are enrolled in RPM programs with which providers
CREATE TABLE IF NOT EXISTS rpm_patient_enrollments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    enrollment_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'completed', 'suspended') DEFAULT 'active',
    program_type ENUM('ccm', 'pcm', 'rpm', 'rtm') DEFAULT 'rpm',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    INDEX idx_patient_provider (patient_id, provider_id),
    INDEX idx_status (status),
    INDEX idx_enrollment_date (enrollment_date)
);

-- RPM Devices Table
-- Stores information about monitoring devices assigned to patients
CREATE TABLE IF NOT EXISTS rpm_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    device_type ENUM(
        'blood_pressure', 
        'glucose', 
        'weight', 
        'pulse_ox', 
        'ecg',
        'thermometer',
        'peak_flow',
        'activity_tracker'
    ) NOT NULL,
    device_model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    manufacturer VARCHAR(100),
    status ENUM('active', 'inactive', 'maintenance', 'retired') DEFAULT 'active',
    last_reading_at TIMESTAMP NULL,
    battery_level INT DEFAULT 100,
    firmware_version VARCHAR(50),
    assigned_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    INDEX idx_patient_device (patient_id, device_type),
    INDEX idx_serial_number (serial_number),
    INDEX idx_status (status),
    INDEX idx_last_reading (last_reading_at)
);

-- RPM Readings Table
-- Stores all readings collected from RPM devices
CREATE TABLE IF NOT EXISTS rpm_readings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    patient_id INT NOT NULL,
    reading_type VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    reading_timestamp TIMESTAMP NOT NULL,
    is_alert BOOLEAN DEFAULT FALSE,
    quality_score INT DEFAULT 100, -- Data quality indicator (0-100)
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (device_id) REFERENCES rpm_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    INDEX idx_patient_readings (patient_id, reading_timestamp),
    INDEX idx_device_readings (device_id, reading_timestamp),
    INDEX idx_reading_type (reading_type),
    INDEX idx_alert_readings (is_alert, reading_timestamp),
    INDEX idx_timestamp (reading_timestamp)
);

-- RPM Alerts Table
-- Manages alerts generated from abnormal readings
CREATE TABLE IF NOT EXISTS rpm_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    device_id INT,
    reading_id INT,
    alert_type VARCHAR(50) NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    message TEXT NOT NULL,
    status ENUM('active', 'acknowledged', 'resolved', 'dismissed') DEFAULT 'active',
    acknowledged_by INT,
    acknowledged_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES rpm_devices(id) ON DELETE SET NULL,
    FOREIGN KEY (reading_id) REFERENCES rpm_readings(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    INDEX idx_patient_alerts (patient_id, status),
    INDEX idx_severity_status (severity, status),
    INDEX idx_created_at (created_at),
    INDEX idx_alert_type (alert_type)
);

-- RPM Care Plans Table
-- Defines monitoring protocols and thresholds for patients
CREATE TABLE IF NOT EXISTS rpm_care_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    conditions TEXT, -- JSON array of conditions being monitored
    monitoring_frequency VARCHAR(50), -- e.g., "daily", "twice_daily", "weekly"
    alert_thresholds TEXT, -- JSON object with thresholds for each reading type
    goals TEXT, -- JSON object with patient goals
    status ENUM('active', 'inactive', 'completed') DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    INDEX idx_patient_plan (patient_id, status),
    INDEX idx_provider_plan (provider_id, status)
);

-- RPM Interventions Table
-- Tracks clinical interventions based on RPM data
CREATE TABLE IF NOT EXISTS rpm_interventions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    alert_id INT,
    intervention_type ENUM(
        'medication_adjustment',
        'lifestyle_recommendation',
        'appointment_scheduled',
        'emergency_referral',
        'patient_education',
        'device_adjustment'
    ) NOT NULL,
    description TEXT NOT NULL,
    outcome TEXT,
    status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned',
    scheduled_date DATE,
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES rpm_alerts(id) ON DELETE SET NULL,
    INDEX idx_patient_interventions (patient_id, status),
    INDEX idx_provider_interventions (provider_id, status),
    INDEX idx_scheduled_date (scheduled_date)
);

-- RPM Billing Records Table
-- Tracks billable RPM activities for reimbursement
CREATE TABLE IF NOT EXISTS rpm_billing_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    cpt_code VARCHAR(10) NOT NULL, -- e.g., 99453, 99454, 99457, 99458
    units INT DEFAULT 1,
    minutes_documented INT DEFAULT 0,
    readings_count INT DEFAULT 0,
    interventions_count INT DEFAULT 0,
    status ENUM('draft', 'ready', 'billed', 'paid') DEFAULT 'draft',
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    INDEX idx_billing_period (billing_period_start, billing_period_end),
    INDEX idx_patient_billing (patient_id, billing_period_start),
    INDEX idx_provider_billing (provider_id, billing_period_start),
    INDEX idx_cpt_code (cpt_code),
    INDEX idx_status (status)
);

-- RPM Device Calibrations Table
-- Tracks device calibration and maintenance activities
CREATE TABLE IF NOT EXISTS rpm_device_calibrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL,
    calibration_date DATE NOT NULL,
    calibration_type ENUM('initial', 'routine', 'corrective', 'replacement') NOT NULL,
    performed_by INT,
    calibration_values TEXT, -- JSON object with calibration parameters
    notes TEXT,
    next_calibration_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (device_id) REFERENCES rpm_devices(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    INDEX idx_device_calibration (device_id, calibration_date),
    INDEX idx_next_calibration (next_calibration_date)
);

-- RPM Patient Communications Table
-- Tracks communications with patients regarding their RPM program
CREATE TABLE IF NOT EXISTS rpm_patient_communications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    communication_type ENUM('phone', 'email', 'sms', 'portal_message', 'video_call') NOT NULL,
    subject VARCHAR(200),
    message TEXT,
    direction ENUM('inbound', 'outbound') NOT NULL,
    status ENUM('sent', 'delivered', 'read', 'responded', 'failed') DEFAULT 'sent',
    related_alert_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (related_alert_id) REFERENCES rpm_alerts(id) ON DELETE SET NULL,
    INDEX idx_patient_communications (patient_id, created_at),
    INDEX idx_provider_communications (provider_id, created_at),
    INDEX idx_communication_type (communication_type)
);

-- Insert sample RPM alert thresholds and configurations
INSERT IGNORE INTO rpm_care_plans (patient_id, provider_id, plan_name, conditions, monitoring_frequency, alert_thresholds, goals, start_date) VALUES
(1, 2, 'Hypertension Monitoring', '["hypertension", "cardiovascular_disease"]', 'daily', 
 '{"blood_pressure_systolic": {"high": 140, "critical": 180}, "blood_pressure_diastolic": {"high": 90, "critical": 110}, "heart_rate": {"low": 60, "high": 100, "critical_low": 50, "critical_high": 120}}',
 '{"target_bp": "130/80", "weight_stability": "±3 lbs", "medication_adherence": "100%"}',
 CURDATE());

-- Create views for common RPM queries
CREATE OR REPLACE VIEW rpm_patient_summary AS
SELECT 
    up.user_id as patient_id,
    CONCAT(up.first_name, ' ', up.last_name) as patient_name,
    up.date_of_birth,
    rpe.enrollment_date,
    rpe.status as enrollment_status,
    COUNT(DISTINCT rd.id) as device_count,
    COUNT(DISTINCT rr.id) as total_readings,
    MAX(rr.reading_timestamp) as last_reading,
    COUNT(CASE WHEN ra.status = 'active' THEN 1 END) as active_alerts,
    CASE 
        WHEN MAX(rr.reading_timestamp) >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'compliant'
        WHEN MAX(rr.reading_timestamp) >= DATE_SUB(NOW(), INTERVAL 14 DAY) THEN 'at_risk'
        ELSE 'non_compliant'
    END as compliance_status
FROM user_profiles up
INNER JOIN rpm_patient_enrollments rpe ON up.user_id = rpe.patient_id
LEFT JOIN rpm_devices rd ON up.user_id = rd.patient_id AND rd.status = 'active'
LEFT JOIN rpm_readings rr ON rd.id = rr.device_id
LEFT JOIN rpm_alerts ra ON up.user_id = ra.patient_id AND ra.status = 'active'
WHERE rpe.status = 'active'
GROUP BY up.user_id, up.first_name, up.last_name, up.date_of_birth, rpe.enrollment_date, rpe.status;

CREATE OR REPLACE VIEW rpm_alert_summary AS
SELECT 
    ra.id,
    ra.patient_id,
    CONCAT(up.first_name, ' ', up.last_name) as patient_name,
    ra.alert_type,
    ra.severity,
    ra.message,
    ra.status,
    ra.created_at,
    rd.device_type,
    rr.value as reading_value,
    rr.unit as reading_unit
FROM rpm_alerts ra
INNER JOIN user_profiles up ON ra.patient_id = up.user_id
LEFT JOIN rpm_devices rd ON ra.device_id = rd.id
LEFT JOIN rpm_readings rr ON ra.reading_id = rr.id
ORDER BY ra.created_at DESC;

-- Add indexes for performance optimization
CREATE INDEX idx_rpm_readings_composite ON rpm_readings(patient_id, reading_type, reading_timestamp);
CREATE INDEX idx_rpm_alerts_composite ON rpm_alerts(patient_id, severity, status, created_at);
CREATE INDEX idx_rpm_devices_composite ON rpm_devices(patient_id, device_type, status);

-- Add triggers for automatic timestamp updates and data validation
DELIMITER //

CREATE TRIGGER rpm_reading_alert_check 
AFTER INSERT ON rpm_readings
FOR EACH ROW
BEGIN
    DECLARE alert_threshold_high DECIMAL(10,2);
    DECLARE alert_threshold_low DECIMAL(10,2);
    DECLARE should_alert BOOLEAN DEFAULT FALSE;
    
    -- Simple threshold checking (can be enhanced with care plan thresholds)
    CASE NEW.reading_type
        WHEN 'blood_pressure_systolic' THEN
            IF NEW.value > 140 OR NEW.value < 90 THEN SET should_alert = TRUE; END IF;
        WHEN 'blood_pressure_diastolic' THEN
            IF NEW.value > 90 OR NEW.value < 60 THEN SET should_alert = TRUE; END IF;
        WHEN 'heart_rate' THEN
            IF NEW.value > 100 OR NEW.value < 60 THEN SET should_alert = TRUE; END IF;
        WHEN 'blood_glucose' THEN
            IF NEW.value > 180 OR NEW.value < 70 THEN SET should_alert = TRUE; END IF;
        WHEN 'oxygen_saturation' THEN
            IF NEW.value < 95 THEN SET should_alert = TRUE; END IF;
    END CASE;
    
    -- Update the reading's alert flag
    IF should_alert THEN
        UPDATE rpm_readings SET is_alert = TRUE WHERE id = NEW.id;
    END IF;
END//

CREATE TRIGGER rpm_device_last_reading_update
AFTER INSERT ON rpm_readings
FOR EACH ROW
BEGIN
    UPDATE rpm_devices 
    SET last_reading_at = NEW.reading_timestamp 
    WHERE id = NEW.device_id;
END//

DELIMITER ;

-- Add comments for documentation
ALTER TABLE rpm_patient_enrollments COMMENT = 'Tracks patient enrollment in RPM programs';
ALTER TABLE rpm_devices COMMENT = 'Stores RPM device information and assignments';
ALTER TABLE rpm_readings COMMENT = 'Stores all readings from RPM devices';
ALTER TABLE rpm_alerts COMMENT = 'Manages alerts generated from abnormal readings';
ALTER TABLE rpm_care_plans COMMENT = 'Defines monitoring protocols and thresholds';
ALTER TABLE rpm_interventions COMMENT = 'Tracks clinical interventions based on RPM data';
ALTER TABLE rpm_billing_records COMMENT = 'Tracks billable RPM activities for reimbursement';