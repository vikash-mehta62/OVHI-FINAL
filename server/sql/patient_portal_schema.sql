-- Patient Portal Complete Database Schema
-- This schema supports all patient-facing functionality

-- =====================================================
-- PATIENT MEDICAL RECORDS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_medical_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    record_type ENUM('diagnosis', 'procedure', 'note', 'document', 'lab_result', 'imaging') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    provider_id INT,
    date_recorded DATE NOT NULL,
    document_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_patient_date (patient_id, date_recorded),
    INDEX idx_patient_type (patient_id, record_type),
    INDEX idx_active (is_active)
);

-- =====================================================
-- PATIENT MEDICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_medications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    prescribing_provider_id INT,
    start_date DATE,
    end_date DATE,
    status ENUM('active', 'discontinued', 'completed') DEFAULT 'active',
    refills_remaining INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (prescribing_provider_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_patient_status (patient_id, status),
    INDEX idx_patient_date (patient_id, start_date)
);

-- =====================================================
-- MEDICATION REFILL REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS medication_refill_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    medication_id INT NOT NULL,
    prescribing_provider_id INT,
    notes TEXT,
    status ENUM('pending', 'approved', 'denied', 'completed') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    processed_by INT,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (medication_id) REFERENCES patient_medications(id) ON DELETE CASCADE,
    FOREIGN KEY (prescribing_provider_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_patient_status (patient_id, status),
    INDEX idx_provider_status (prescribing_provider_id, status)
);

-- =====================================================
-- PATIENT VITALS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_vitals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    measurement_date DATETIME NOT NULL,
    blood_pressure_systolic INT,
    blood_pressure_diastolic INT,
    heart_rate INT,
    temperature DECIMAL(4,1),
    weight DECIMAL(5,1),
    height DECIMAL(5,1),
    oxygen_saturation INT,
    recorded_by_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_patient_date (patient_id, measurement_date),
    INDEX idx_measurement_date (measurement_date)
);

-- =====================================================
-- PATIENT ALLERGIES
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_allergies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    allergy_name VARCHAR(255) NOT NULL,
    allergy_type ENUM('drug', 'food', 'environmental', 'other') NOT NULL,
    severity ENUM('mild', 'moderate', 'severe', 'life_threatening') DEFAULT 'moderate',
    reaction_description TEXT,
    onset_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_type (patient_id, allergy_type),
    INDEX idx_patient_active (patient_id, is_active)
);

-- =====================================================
-- PATIENT TEST RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_test_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    test_name VARCHAR(255) NOT NULL,
    test_type ENUM('lab', 'imaging', 'diagnostic', 'other') NOT NULL,
    test_date DATE NOT NULL,
    ordering_provider_id INT,
    performing_lab VARCHAR(255),
    results_text TEXT,
    results_json JSON,
    reference_ranges JSON,
    abnormal_flags JSON,
    status ENUM('pending', 'preliminary', 'final', 'corrected') DEFAULT 'final',
    document_url VARCHAR(500),
    is_critical BOOLEAN DEFAULT FALSE,
    reviewed_by_patient BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (ordering_provider_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    
    INDEX idx_patient_date (patient_id, test_date),
    INDEX idx_patient_type (patient_id, test_type),
    INDEX idx_critical (is_critical),
    INDEX idx_status (status)
);

-- =====================================================
-- PATIENT APPOINTMENTS (Enhanced)
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_appointments_enhanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    duration_minutes INT DEFAULT 30,
    appointment_type VARCHAR(100),
    status ENUM('scheduled', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    reason_for_visit TEXT,
    location_id INT,
    telehealth_link VARCHAR(500),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_date (patient_id, appointment_date),
    INDEX idx_provider_date (provider_id, appointment_date),
    INDEX idx_status (status),
    INDEX idx_appointment_date (appointment_date)
);

-- =====================================================
-- INSURANCE ELIGIBILITY VERIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS insurance_eligibility_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    insurance_id INT NOT NULL,
    verification_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('verified', 'pending', 'failed', 'expired') NOT NULL,
    coverage_status ENUM('active', 'inactive', 'terminated', 'suspended') NOT NULL,
    effective_date DATE,
    termination_date DATE,
    copay_amount DECIMAL(10,2),
    deductible_amount DECIMAL(10,2),
    deductible_remaining DECIMAL(10,2),
    out_of_pocket_max DECIMAL(10,2),
    out_of_pocket_remaining DECIMAL(10,2),
    benefits_json JSON,
    response_data JSON,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_date (patient_id, verification_date),
    INDEX idx_status (status)
);

-- =====================================================
-- PATIENT COMMUNICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_communications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT,
    communication_type ENUM('message', 'appointment_reminder', 'test_result', 'prescription', 'general') NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('sent', 'delivered', 'read', 'replied') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    reply_to_id INT,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES user_profiles(user_id) ON DELETE SET NULL,
    FOREIGN KEY (reply_to_id) REFERENCES patient_communications(id) ON DELETE SET NULL,
    
    INDEX idx_patient_date (patient_id, sent_at),
    INDEX idx_patient_status (patient_id, status),
    INDEX idx_provider_date (provider_id, sent_at)
);

-- =====================================================
-- PATIENT PORTAL PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS patient_portal_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    appointment_reminders BOOLEAN DEFAULT TRUE,
    test_result_notifications BOOLEAN DEFAULT TRUE,
    prescription_notifications BOOLEAN DEFAULT TRUE,
    marketing_communications BOOLEAN DEFAULT FALSE,
    preferred_communication_method ENUM('email', 'sms', 'phone', 'portal') DEFAULT 'email',
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- =====================================================
-- SAMPLE DATA FOR DEVELOPMENT
-- =====================================================

-- Insert sample medical records
INSERT IGNORE INTO patient_medical_records (patient_id, record_type, title, description, date_recorded) VALUES
(1, 'diagnosis', 'Hypertension', 'Essential hypertension, well controlled with medication', '2024-01-15'),
(1, 'procedure', 'Annual Physical Exam', 'Comprehensive annual physical examination', '2024-02-01'),
(1, 'lab_result', 'Complete Blood Count', 'CBC results within normal limits', '2024-02-15');

-- Insert sample medications
INSERT IGNORE INTO patient_medications (patient_id, medication_name, dosage, frequency, status, refills_remaining) VALUES
(1, 'Lisinopril', '10mg', 'Once daily', 'active', 5),
(1, 'Metformin', '500mg', 'Twice daily', 'active', 3),
(1, 'Aspirin', '81mg', 'Once daily', 'active', 6);

-- Insert sample vitals
INSERT IGNORE INTO patient_vitals (patient_id, measurement_date, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, temperature, weight) VALUES
(1, '2024-08-15 09:00:00', 120, 80, 72, 98.6, 175.5),
(1, '2024-08-01 10:30:00', 118, 78, 68, 98.4, 174.8),
(1, '2024-07-15 14:15:00', 125, 82, 75, 98.7, 176.2);

-- Insert sample allergies
INSERT IGNORE INTO patient_allergies (patient_id, allergy_name, allergy_type, severity, reaction_description) VALUES
(1, 'Penicillin', 'drug', 'severe', 'Causes severe rash and difficulty breathing'),
(1, 'Shellfish', 'food', 'moderate', 'Causes hives and swelling');

-- Insert sample test results
INSERT IGNORE INTO patient_test_results (patient_id, test_name, test_type, test_date, results_text, status) VALUES
(1, 'Lipid Panel', 'lab', '2024-08-10', 'Total cholesterol: 180 mg/dL, LDL: 100 mg/dL, HDL: 55 mg/dL, Triglycerides: 125 mg/dL', 'final'),
(1, 'HbA1c', 'lab', '2024-08-10', 'Hemoglobin A1c: 6.2%', 'final');

-- Insert sample portal preferences
INSERT IGNORE INTO patient_portal_preferences (patient_id) VALUES (1);