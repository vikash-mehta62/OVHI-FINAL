-- Patient Intake Enhancements Database Schema
-- This schema adds support for file uploads, progress tracking, and enhanced intake features

-- 1. Patient Documents Table
-- Stores uploaded documents (insurance cards, ID, medical records)
CREATE TABLE IF NOT EXISTS patient_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    document_type ENUM(
        'insurance_card_primary_front',
        'insurance_card_primary_back', 
        'insurance_card_secondary_front',
        'insurance_card_secondary_back',
        'identification_drivers_license',
        'identification_passport',
        'identification_state_id',
        'medical_record_lab_result',
        'medical_record_referral',
        'medical_record_imaging',
        'medical_record_other'
    ) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL, -- in bytes
    mime_type VARCHAR(100) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT, -- user who uploaded (patient or staff)
    verification_status ENUM('pending', 'verified', 'rejected', 'expired') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_patient_documents (patient_id, document_type),
    INDEX idx_upload_date (upload_date),
    INDEX idx_verification_status (verification_status)
);

-- 2. Intake Progress Tracking Table
-- Tracks patient intake form completion progress
CREATE TABLE IF NOT EXISTS intake_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    intake_session_id VARCHAR(100) NOT NULL UNIQUE, -- UUID for the intake session
    patient_email VARCHAR(255) NOT NULL,
    provider_id INT NOT NULL,
    progress_data JSON, -- Stores form data as JSON
    completed_sections JSON, -- Tracks which sections are completed
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    last_saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- 7 days from creation
    status ENUM('in_progress', 'completed', 'expired', 'abandoned') DEFAULT 'in_progress',
    ip_address VARCHAR(45), -- For audit trail
    user_agent TEXT, -- For audit trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_session_id (intake_session_id),
    INDEX idx_patient_email (patient_email),
    INDEX idx_provider_progress (provider_id, status),
    INDEX idx_expires_at (expires_at)
);

-- 3. Enhanced Patient Allergies Table
-- More detailed allergy information from intake form
CREATE TABLE IF NOT EXISTS patient_allergies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    allergen_name VARCHAR(255) NOT NULL,
    allergy_category ENUM('food', 'medication', 'environmental', 'biological', 'other') NOT NULL,
    reaction_description TEXT,
    severity ENUM('mild', 'moderate', 'severe', 'life_threatening') DEFAULT 'mild',
    onset_date DATE NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_allergies (patient_id, is_active),
    INDEX idx_allergy_category (allergy_category),
    INDEX idx_severity (severity)
);

-- 4. Enhanced Patient Medications Table
-- Detailed medication information from intake form
CREATE TABLE IF NOT EXISTS patient_medications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    route VARCHAR(50), -- oral, injection, topical, etc.
    start_date DATE,
    end_date DATE NULL,
    refills_remaining INT DEFAULT 0,
    prescribing_provider VARCHAR(255),
    pharmacy_name VARCHAR(255),
    status ENUM('active', 'discontinued', 'completed', 'on_hold') DEFAULT 'active',
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_medications (patient_id, status),
    INDEX idx_medication_name (medication_name),
    INDEX idx_status (status)
);

-- 5. Patient Diagnoses Table
-- Detailed diagnosis information from intake form
CREATE TABLE IF NOT EXISTS patient_diagnoses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    diagnosis_date DATE NOT NULL,
    icd10_code VARCHAR(10),
    diagnosis_description TEXT NOT NULL,
    diagnosis_type ENUM('primary', 'secondary', 'chronic', 'acute', 'resolved') DEFAULT 'primary',
    status ENUM('active', 'resolved', 'chronic', 'in_remission') DEFAULT 'active',
    diagnosing_provider VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    
    INDEX idx_patient_diagnoses (patient_id, status),
    INDEX idx_icd10_code (icd10_code),
    INDEX idx_diagnosis_date (diagnosis_date)
);

-- 6. Patient Clinical Notes Table
-- Clinical notes and observations from intake form
CREATE TABLE IF NOT EXISTS patient_clinical_notes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    note_type ENUM('chief_complaint', 'history', 'social_history', 'family_history', 'review_of_systems', 'other') NOT NULL,
    note_content TEXT NOT NULL,
    duration VARCHAR(100), -- For symptoms: "2 weeks", "chronic", etc.
    severity ENUM('mild', 'moderate', 'severe') NULL,
    created_by INT, -- Provider or system
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_patient_notes (patient_id, note_type),
    INDEX idx_created_at (created_at)
);

-- 7. Intake Email Logs Table
-- Track intake email sending for audit and follow-up
CREATE TABLE IF NOT EXISTS intake_email_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    patient_email VARCHAR(255) NOT NULL,
    intake_url VARCHAR(500) NOT NULL,
    email_subject VARCHAR(255),
    email_status ENUM('sent', 'delivered', 'opened', 'clicked', 'failed') DEFAULT 'sent',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    opened_at TIMESTAMP NULL,
    clicked_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL, -- When intake was completed
    follow_up_needed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_provider_emails (provider_id, sent_at),
    INDEX idx_patient_email (patient_email),
    INDEX idx_email_status (email_status),
    INDEX idx_follow_up (follow_up_needed)
);

-- 8. Add new columns to existing user_profiles table for enhanced intake data
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50) DEFAULT 'English',
ADD COLUMN IF NOT EXISTS marital_status ENUM('single', 'married', 'divorced', 'widowed', 'separated', 'domestic_partner') NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,2) NULL,
ADD COLUMN IF NOT EXISTS weight_lbs DECIMAL(5,2) NULL,
ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,1) NULL,
ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(20) NULL,
ADD COLUMN IF NOT EXISTS heart_rate INT NULL,
ADD COLUMN IF NOT EXISTS temperature DECIMAL(4,1) NULL,
ADD COLUMN IF NOT EXISTS intake_completed_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS intake_completion_percentage DECIMAL(5,2) DEFAULT 0.00;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_intake ON user_profiles(intake_completed_at, intake_completion_percentage);
CREATE INDEX IF NOT EXISTS idx_user_profiles_vitals ON user_profiles(height_cm, weight_lbs, bmi);

-- 10. Create views for common intake queries
CREATE OR REPLACE VIEW intake_completion_summary AS
SELECT 
    up.user_id,
    CONCAT(up.firstname, ' ', up.lastname) as patient_name,
    up.work_email,
    up.phone,
    up.intake_completion_percentage,
    up.intake_completed_at,
    COUNT(pd.id) as documents_uploaded,
    COUNT(CASE WHEN pd.verification_status = 'verified' THEN 1 END) as documents_verified,
    ip.status as intake_status,
    ip.last_saved_at,
    ip.expires_at
FROM user_profiles up
LEFT JOIN patient_documents pd ON up.user_id = pd.patient_id AND pd.is_active = TRUE
LEFT JOIN intake_progress ip ON up.work_email = ip.patient_email
WHERE up.fk_roleid = 7 -- Patient role
GROUP BY up.user_id, up.firstname, up.lastname, up.work_email, up.phone, 
         up.intake_completion_percentage, up.intake_completed_at, 
         ip.status, ip.last_saved_at, ip.expires_at;

-- 11. Create stored procedures for common operations

DELIMITER //

-- Procedure to update intake progress
CREATE PROCEDURE UpdateIntakeProgress(
    IN p_session_id VARCHAR(100),
    IN p_progress_data JSON,
    IN p_completed_sections JSON,
    IN p_completion_percentage DECIMAL(5,2)
)
BEGIN
    UPDATE intake_progress 
    SET 
        progress_data = p_progress_data,
        completed_sections = p_completed_sections,
        completion_percentage = p_completion_percentage,
        last_saved_at = CURRENT_TIMESTAMP
    WHERE intake_session_id = p_session_id;
    
    -- If no rows affected, insert new record
    IF ROW_COUNT() = 0 THEN
        INSERT INTO intake_progress (
            intake_session_id, 
            progress_data, 
            completed_sections, 
            completion_percentage
        ) VALUES (
            p_session_id, 
            p_progress_data, 
            p_completed_sections, 
            p_completion_percentage
        );
    END IF;
END//

-- Procedure to clean up expired intake sessions
CREATE PROCEDURE CleanupExpiredIntakeSessions()
BEGIN
    UPDATE intake_progress 
    SET status = 'expired' 
    WHERE expires_at < NOW() AND status = 'in_progress';
    
    -- Optionally delete very old expired sessions (older than 30 days)
    DELETE FROM intake_progress 
    WHERE status = 'expired' 
    AND expires_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END//

DELIMITER ;

-- 12. Create triggers for automatic updates

DELIMITER //

-- Trigger to update intake completion when patient profile is updated
CREATE TRIGGER update_intake_completion 
AFTER UPDATE ON user_profiles
FOR EACH ROW
BEGIN
    IF NEW.intake_completed_at IS NOT NULL AND OLD.intake_completed_at IS NULL THEN
        -- Mark intake as completed in progress table
        UPDATE intake_progress 
        SET status = 'completed', completion_percentage = 100.00
        WHERE patient_email = NEW.work_email AND status = 'in_progress';
    END IF;
END//

-- Trigger to log document uploads
CREATE TRIGGER log_document_upload
AFTER INSERT ON patient_documents
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        user_id, 
        action, 
        table_name, 
        record_id, 
        details, 
        created_at
    ) VALUES (
        NEW.uploaded_by,
        'UPLOAD_DOCUMENT',
        'patient_documents',
        NEW.id,
        JSON_OBJECT(
            'patient_id', NEW.patient_id,
            'document_type', NEW.document_type,
            'filename', NEW.original_filename,
            'file_size', NEW.file_size
        ),
        NOW()
    );
END//

DELIMITER ;

-- 13. Insert default data and configurations

-- Insert document type configurations
INSERT IGNORE INTO system_configurations (config_key, config_value, description) VALUES
('intake_document_max_size', '5242880', 'Maximum file size for intake documents in bytes (5MB)'),
('intake_document_allowed_types', 'image/jpeg,image/png,image/jpg,application/pdf', 'Allowed MIME types for intake documents'),
('intake_session_expiry_days', '7', 'Number of days before intake session expires'),
('intake_auto_save_interval', '30', 'Auto-save interval in seconds for intake forms'),
('intake_email_template_enabled', 'true', 'Enable HTML email templates for intake invitations');

-- 14. Add comments for documentation
ALTER TABLE patient_documents COMMENT = 'Stores uploaded documents from patient intake process';
ALTER TABLE intake_progress COMMENT = 'Tracks patient intake form completion progress and auto-save data';
ALTER TABLE patient_allergies COMMENT = 'Detailed allergy information collected during intake';
ALTER TABLE patient_medications COMMENT = 'Current medications information from patient intake';
ALTER TABLE patient_diagnoses COMMENT = 'Diagnosis history collected during patient intake';
ALTER TABLE patient_clinical_notes COMMENT = 'Clinical notes and observations from intake forms';
ALTER TABLE intake_email_logs COMMENT = 'Audit log for intake invitation emails sent to patients';

-- 15. Create cleanup job (to be scheduled)
-- This should be run daily to clean up expired sessions
-- CALL CleanupExpiredIntakeSessions();

-- End of Patient Intake Enhancements Schema