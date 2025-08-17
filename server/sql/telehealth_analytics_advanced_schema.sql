-- Advanced Telehealth Analytics Schema
-- Patient satisfaction surveys, outcomes tracking, and advanced metrics

-- Patient Satisfaction Surveys Table
CREATE TABLE IF NOT EXISTS telehealth_patient_surveys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    
    -- Survey Metadata
    survey_type ENUM('post_session', 'follow_up', 'annual', 'custom') DEFAULT 'post_session',
    survey_version VARCHAR(20) DEFAULT 'v1.0',
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    response_time_minutes INT,
    
    -- Core Satisfaction Ratings (1-5 scale)
    overall_satisfaction INT CHECK (overall_satisfaction BETWEEN 1 AND 5),
    video_quality_rating INT CHECK (video_quality_rating BETWEEN 1 AND 5),
    audio_quality_rating INT CHECK (audio_quality_rating BETWEEN 1 AND 5),
    ease_of_use_rating INT CHECK (ease_of_use_rating BETWEEN 1 AND 5),
    provider_communication_rating INT CHECK (provider_communication_rating BETWEEN 1 AND 5),
    technical_support_rating INT CHECK (technical_support_rating BETWEEN 1 AND 5),
    
    -- Specific Questions
    would_recommend BOOLEAN,
    prefer_telehealth_vs_inperson ENUM('strongly_prefer_telehealth', 'prefer_telehealth', 'no_preference', 'prefer_inperson', 'strongly_prefer_inperson'),
    technical_difficulties BOOLEAN DEFAULT FALSE,
    wait_time_acceptable BOOLEAN DEFAULT TRUE,
    
    -- Open-ended Feedback
    positive_feedback TEXT,
    improvement_suggestions TEXT,
    technical_issues_description TEXT,
    
    -- Net Promoter Score
    nps_score INT CHECK (nps_score BETWEEN 0 AND 10),
    nps_category ENUM('detractor', 'passive', 'promoter') GENERATED ALWAYS AS (
        CASE 
            WHEN nps_score BETWEEN 0 AND 6 THEN 'detractor'
            WHEN nps_score BETWEEN 7 AND 8 THEN 'passive'
            WHEN nps_score BETWEEN 9 AND 10 THEN 'promoter'
        END
    ) STORED,
    
    -- Survey Completion Status
    completion_status ENUM('sent', 'partial', 'completed', 'expired') DEFAULT 'sent',
    reminder_count INT DEFAULT 0,
    last_reminder_sent DATETIME,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_survey (session_id),
    INDEX idx_patient_surveys (patient_id, completed_at),
    INDEX idx_provider_surveys (provider_id, completed_at),
    INDEX idx_completion_status (completion_status, sent_at),
    INDEX idx_nps_category (nps_category, completed_at)
);

-- Clinical Outcomes Tracking Table
CREATE TABLE IF NOT EXISTS telehealth_clinical_outcomes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    
    -- Outcome Measurement
    outcome_type ENUM('symptom_improvement', 'medication_adherence', 'vital_signs', 'lab_results', 'functional_status', 'quality_of_life') NOT NULL,
    measurement_date DATE NOT NULL,
    baseline_value DECIMAL(10,4),
    current_value DECIMAL(10,4),
    target_value DECIMAL(10,4),
    unit_of_measure VARCHAR(50),
    
    -- Clinical Assessment
    improvement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN baseline_value IS NOT NULL AND baseline_value != 0 
            THEN ((current_value - baseline_value) / baseline_value) * 100
            ELSE NULL
        END
    ) STORED,
    
    goal_achieved BOOLEAN DEFAULT FALSE,
    clinical_significance ENUM('not_significant', 'minimal', 'moderate', 'substantial', 'very_substantial'),
    
    -- Provider Assessment
    provider_notes TEXT,
    intervention_effectiveness ENUM('ineffective', 'somewhat_effective', 'effective', 'very_effective', 'highly_effective'),
    
    -- Follow-up Planning
    requires_followup BOOLEAN DEFAULT FALSE,
    followup_timeframe ENUM('1_week', '2_weeks', '1_month', '3_months', '6_months', '1_year'),
    next_measurement_due DATE,
    
    -- Data Source
    data_source ENUM('patient_reported', 'provider_assessed', 'device_measured', 'lab_result', 'imaging') NOT NULL,
    source_reliability ENUM('low', 'medium', 'high', 'verified') DEFAULT 'medium',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_session_outcomes (session_id),
    INDEX idx_patient_outcomes (patient_id, outcome_type, measurement_date),
    INDEX idx_provider_outcomes (provider_id, measurement_date),
    INDEX idx_outcome_type (outcome_type, measurement_date),
    INDEX idx_followup_due (next_measurement_due, requires_followup)
);

-- Patient Reported Outcome Measures (PROMs) Table
CREATE TABLE IF NOT EXISTS telehealth_proms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    session_id INT,
    
    -- PROM Details
    prom_type ENUM('phq9', 'gad7', 'sf36', 'eq5d', 'promis', 'custom') NOT NULL,
    prom_version VARCHAR(20),
    administration_date DATE NOT NULL,
    
    -- Scores and Results
    total_score DECIMAL(6,2),
    subscale_scores JSON, -- Store multiple subscale scores
    severity_level ENUM('minimal', 'mild', 'moderate', 'moderately_severe', 'severe'),
    
    -- Individual Responses
    question_responses JSON, -- Store all question responses
    completion_time_minutes INT,
    
    -- Clinical Context
    administered_by ENUM('patient', 'provider', 'caregiver', 'automated') DEFAULT 'patient',
    clinical_context VARCHAR(255),
    
    -- Comparison and Trends
    previous_score DECIMAL(6,2),
    score_change DECIMAL(6,2) GENERATED ALWAYS AS (total_score - previous_score) STORED,
    trend_direction ENUM('improving', 'stable', 'declining', 'insufficient_data') DEFAULT 'insufficient_data',
    
    -- Validity and Quality
    completion_status ENUM('complete', 'partial', 'invalid') DEFAULT 'complete',
    validity_flags JSON, -- Store any validity concerns
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE SET NULL,
    
    INDEX idx_patient_proms (patient_id, prom_type, administration_date),
    INDEX idx_session_proms (session_id),
    INDEX idx_prom_type (prom_type, administration_date),
    INDEX idx_severity_level (severity_level, administration_date)
);

-- Advanced Analytics Aggregation Table
CREATE TABLE IF NOT EXISTS telehealth_analytics_advanced (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT,
    date_period DATE NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    
    -- Patient Satisfaction Metrics
    avg_overall_satisfaction DECIMAL(3,2),
    avg_video_quality DECIMAL(3,2),
    avg_audio_quality DECIMAL(3,2),
    avg_ease_of_use DECIMAL(3,2),
    avg_provider_communication DECIMAL(3,2),
    
    -- Net Promoter Score Metrics
    nps_score DECIMAL(5,2),
    promoter_count INT DEFAULT 0,
    passive_count INT DEFAULT 0,
    detractor_count INT DEFAULT 0,
    total_nps_responses INT DEFAULT 0,
    
    -- Survey Response Metrics
    surveys_sent INT DEFAULT 0,
    surveys_completed INT DEFAULT 0,
    survey_response_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN surveys_sent > 0 THEN (surveys_completed / surveys_sent) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Clinical Outcomes Metrics
    total_outcome_measurements INT DEFAULT 0,
    goals_achieved_count INT DEFAULT 0,
    goal_achievement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_outcome_measurements > 0 THEN (goals_achieved_count / total_outcome_measurements) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Quality Metrics
    avg_improvement_percentage DECIMAL(5,2),
    high_satisfaction_sessions INT DEFAULT 0, -- Sessions with satisfaction >= 4
    technical_issue_sessions INT DEFAULT 0,
    
    -- Telehealth Adoption Metrics
    telehealth_preference_rate DECIMAL(5,2), -- % preferring telehealth over in-person
    repeat_telehealth_users INT DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_provider_period (provider_id, date_period, period_type),
    INDEX idx_provider_analytics (provider_id, date_period),
    INDEX idx_period_analytics (period_type, date_period)
);

-- Patient Journey Analytics Table
CREATE TABLE IF NOT EXISTS telehealth_patient_journey (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    
    -- Journey Metrics
    first_telehealth_session DATE,
    last_telehealth_session DATE,
    total_sessions INT DEFAULT 0,
    completed_sessions INT DEFAULT 0,
    cancelled_sessions INT DEFAULT 0,
    
    -- Engagement Metrics
    avg_session_duration DECIMAL(5,2),
    total_telehealth_minutes INT DEFAULT 0,
    preferred_session_type ENUM('video', 'audio', 'phone'),
    
    -- Satisfaction Trends
    first_satisfaction_score DECIMAL(3,2),
    latest_satisfaction_score DECIMAL(3,2),
    avg_satisfaction_score DECIMAL(3,2),
    satisfaction_trend ENUM('improving', 'stable', 'declining') DEFAULT 'stable',
    
    -- Clinical Progress
    baseline_health_score DECIMAL(5,2),
    current_health_score DECIMAL(5,2),
    health_improvement_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN baseline_health_score IS NOT NULL AND baseline_health_score != 0 
            THEN ((current_health_score - baseline_health_score) / baseline_health_score) * 100
            ELSE NULL
        END
    ) STORED,
    
    -- Outcome Achievement
    total_goals_set INT DEFAULT 0,
    goals_achieved INT DEFAULT 0,
    goal_achievement_rate DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_goals_set > 0 THEN (goals_achieved / total_goals_set) * 100
            ELSE 0
        END
    ) STORED,
    
    -- Technology Adoption
    technical_proficiency ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    support_requests_count INT DEFAULT 0,
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_patient_journey (patient_id),
    INDEX idx_patient_journey_dates (first_telehealth_session, last_telehealth_session),
    INDEX idx_satisfaction_trend (satisfaction_trend),
    INDEX idx_health_improvement (health_improvement_percentage)
);

-- Triggers for Automatic Analytics Updates
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_patient_journey_after_session
AFTER UPDATE ON telehealth_sessions
FOR EACH ROW
BEGIN
    IF NEW.session_status = 'completed' AND OLD.session_status != 'completed' THEN
        INSERT INTO telehealth_patient_journey (
            patient_id, first_telehealth_session, last_telehealth_session,
            total_sessions, completed_sessions, avg_session_duration, total_telehealth_minutes
        ) VALUES (
            NEW.patient_id, DATE(NEW.actual_start_time), DATE(NEW.end_time),
            1, 1, NEW.duration_minutes, NEW.duration_minutes
        ) ON DUPLICATE KEY UPDATE
            last_telehealth_session = DATE(NEW.end_time),
            total_sessions = total_sessions + 1,
            completed_sessions = completed_sessions + 1,
            avg_session_duration = (
                (avg_session_duration * (completed_sessions - 1) + NEW.duration_minutes) / completed_sessions
            ),
            total_telehealth_minutes = total_telehealth_minutes + NEW.duration_minutes,
            last_updated = NOW();
    END IF;
END //

CREATE TRIGGER IF NOT EXISTS update_analytics_after_survey
AFTER UPDATE ON telehealth_patient_surveys
FOR EACH ROW
BEGIN
    IF NEW.completion_status = 'completed' AND OLD.completion_status != 'completed' THEN
        -- Update advanced analytics
        INSERT INTO telehealth_analytics_advanced (
            provider_id, date_period, period_type,
            surveys_completed, avg_overall_satisfaction,
            promoter_count, passive_count, detractor_count, total_nps_responses
        ) VALUES (
            NEW.provider_id, DATE(NEW.completed_at), 'daily',
            1, NEW.overall_satisfaction,
            CASE WHEN NEW.nps_category = 'promoter' THEN 1 ELSE 0 END,
            CASE WHEN NEW.nps_category = 'passive' THEN 1 ELSE 0 END,
            CASE WHEN NEW.nps_category = 'detractor' THEN 1 ELSE 0 END,
            1
        ) ON DUPLICATE KEY UPDATE
            surveys_completed = surveys_completed + 1,
            avg_overall_satisfaction = (
                (avg_overall_satisfaction * (surveys_completed - 1) + NEW.overall_satisfaction) / surveys_completed
            ),
            promoter_count = promoter_count + CASE WHEN NEW.nps_category = 'promoter' THEN 1 ELSE 0 END,
            passive_count = passive_count + CASE WHEN NEW.nps_category = 'passive' THEN 1 ELSE 0 END,
            detractor_count = detractor_count + CASE WHEN NEW.nps_category = 'detractor' THEN 1 ELSE 0 END,
            total_nps_responses = total_nps_responses + 1,
            calculated_at = NOW();
            
        -- Update patient journey satisfaction
        UPDATE telehealth_patient_journey 
        SET 
            latest_satisfaction_score = NEW.overall_satisfaction,
            avg_satisfaction_score = (
                SELECT AVG(overall_satisfaction) 
                FROM telehealth_patient_surveys 
                WHERE patient_id = NEW.patient_id AND completion_status = 'completed'
            ),
            last_updated = NOW()
        WHERE patient_id = NEW.patient_id;
    END IF;
END //

DELIMITER ;

-- Sample Data for Testing
INSERT IGNORE INTO telehealth_patient_surveys (
    session_id, patient_id, provider_id, survey_type,
    overall_satisfaction, video_quality_rating, audio_quality_rating,
    ease_of_use_rating, provider_communication_rating,
    would_recommend, nps_score, completion_status, completed_at
) VALUES 
(1, 2, 1, 'post_session', 5, 4, 5, 4, 5, TRUE, 9, 'completed', NOW()),
(2, 3, 1, 'post_session', 4, 3, 4, 4, 4, TRUE, 8, 'completed', NOW() - INTERVAL 1 DAY);

INSERT IGNORE INTO telehealth_clinical_outcomes (
    session_id, patient_id, provider_id, outcome_type,
    measurement_date, baseline_value, current_value, target_value,
    unit_of_measure, goal_achieved, clinical_significance, data_source
) VALUES 
(1, 2, 1, 'vital_signs', CURDATE(), 140.0, 125.0, 120.0, 'mmHg', FALSE, 'moderate', 'provider_assessed'),
(2, 3, 1, 'symptom_improvement', CURDATE(), 7.0, 4.0, 3.0, 'pain_scale_1_10', FALSE, 'substantial', 'patient_reported');

SELECT 'Advanced Telehealth Analytics Schema Created Successfully!' as Status;