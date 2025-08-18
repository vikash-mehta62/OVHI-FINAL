-- MIPS (Merit-Based Incentive Payment System) Compliance Module
-- Comprehensive database schema for Medicare Quality Payment Program compliance

-- 1. MIPS Eligibility Tracking
CREATE TABLE IF NOT EXISTS mips_eligibility (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    tin VARCHAR(20) NOT NULL,
    npi VARCHAR(15) NOT NULL,
    performance_year YEAR NOT NULL,
    specialty_code VARCHAR(10),
    specialty_name VARCHAR(100),
    eligibility_status ENUM('eligible', 'not_eligible', 'exempt', 'pending') DEFAULT 'pending',
    eligibility_reason TEXT,
    medicare_volume_threshold DECIMAL(5,2) DEFAULT 0.00,
    patient_volume_threshold INT DEFAULT 0,
    allowed_charges_threshold DECIMAL(12,2) DEFAULT 0.00,
    first_year_participation BOOLEAN DEFAULT FALSE,
    hospital_based_exemption BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_year (provider_id, performance_year),
    INDEX idx_tin_year (tin, performance_year),
    INDEX idx_npi_year (npi, performance_year)
);

-- 2. MIPS Quality Measures Master List
CREATE TABLE IF NOT EXISTS mips_quality_measures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    measure_id VARCHAR(20) NOT NULL UNIQUE,
    measure_title VARCHAR(500) NOT NULL,
    measure_type ENUM('outcome', 'process', 'structure', 'patient_reported_outcome', 'efficiency') NOT NULL,
    collection_type ENUM('ecqm', 'registry', 'claims', 'mips_cqm') NOT NULL,
    specialty_set VARCHAR(100),
    high_priority BOOLEAN DEFAULT FALSE,
    outcome_measure BOOLEAN DEFAULT FALSE,
    appropriate_use_measure BOOLEAN DEFAULT FALSE,
    performance_year YEAR NOT NULL,
    measure_description TEXT,
    numerator_description TEXT,
    denominator_description TEXT,
    exclusions_description TEXT,
    minimum_case_requirement INT DEFAULT 20,
    benchmark_data JSON,
    cpt_codes JSON, -- Array of applicable CPT codes
    icd10_codes JSON, -- Array of applicable ICD-10 codes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_measure_id (measure_id),
    INDEX idx_specialty_year (specialty_set, performance_year),
    INDEX idx_collection_type (collection_type),
    INDEX idx_high_priority (high_priority, outcome_measure)
);

-- 3. Provider Quality Measure Selection
CREATE TABLE IF NOT EXISTS mips_provider_measures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    measure_id VARCHAR(20) NOT NULL,
    selection_status ENUM('selected', 'candidate', 'rejected', 'completed') DEFAULT 'candidate',
    selection_reason TEXT,
    data_completeness_expected DECIMAL(5,2) DEFAULT 0.00,
    performance_rate_target DECIMAL(5,2) DEFAULT 0.00,
    minimum_cases_met BOOLEAN DEFAULT FALSE,
    submission_method ENUM('ecqm', 'registry', 'claims', 'direct') DEFAULT 'ecqm',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (measure_id) REFERENCES mips_quality_measures(measure_id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_measure_year (provider_id, measure_id, performance_year),
    INDEX idx_provider_year (provider_id, performance_year),
    INDEX idx_selection_status (selection_status)
);

-- 4. Quality Measure Performance Data
CREATE TABLE IF NOT EXISTS mips_quality_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_measure_id INT NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,
    numerator_count INT DEFAULT 0,
    denominator_count INT DEFAULT 0,
    exclusion_count INT DEFAULT 0,
    performance_rate DECIMAL(5,2) DEFAULT 0.00,
    performance_score DECIMAL(4,2) DEFAULT 0.00,
    benchmark_percentile DECIMAL(5,2),
    data_completeness DECIMAL(5,2) DEFAULT 0.00,
    case_minimum_met BOOLEAN DEFAULT FALSE,
    submission_status ENUM('draft', 'validated', 'submitted', 'accepted', 'rejected') DEFAULT 'draft',
    validation_errors JSON,
    last_calculated_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_measure_id) REFERENCES mips_provider_measures(id) ON DELETE CASCADE,
    INDEX idx_provider_measure (provider_measure_id),
    INDEX idx_reporting_period (reporting_period_start, reporting_period_end),
    INDEX idx_submission_status (submission_status)
);

-- 5. Promoting Interoperability (PI) Measures
CREATE TABLE IF NOT EXISTS mips_pi_measures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    measure_id VARCHAR(20) NOT NULL UNIQUE,
    measure_title VARCHAR(300) NOT NULL,
    measure_category ENUM('base', 'performance', 'bonus') NOT NULL,
    required_measure BOOLEAN DEFAULT FALSE,
    performance_year YEAR NOT NULL,
    objective_description TEXT,
    numerator_description TEXT,
    denominator_description TEXT,
    threshold_percentage DECIMAL(5,2),
    max_points INT DEFAULT 0,
    bonus_points INT DEFAULT 0,
    exclusion_criteria TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_measure_category (measure_category, performance_year),
    INDEX idx_required (required_measure, performance_year)
);

-- 6. Provider PI Performance
CREATE TABLE IF NOT EXISTS mips_pi_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    measure_id VARCHAR(20) NOT NULL,
    numerator_value INT DEFAULT 0,
    denominator_value INT DEFAULT 0,
    performance_rate DECIMAL(5,2) DEFAULT 0.00,
    points_earned DECIMAL(4,2) DEFAULT 0.00,
    attestation_status ENUM('not_started', 'in_progress', 'attested', 'verified') DEFAULT 'not_started',
    attestation_date TIMESTAMP NULL,
    evidence_documentation TEXT,
    exclusion_claimed BOOLEAN DEFAULT FALSE,
    exclusion_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (measure_id) REFERENCES mips_pi_measures(measure_id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_pi_year (provider_id, measure_id, performance_year),
    INDEX idx_provider_year (provider_id, performance_year),
    INDEX idx_attestation_status (attestation_status)
);

-- 7. Improvement Activities (IA) Master List
CREATE TABLE IF NOT EXISTS mips_improvement_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    activity_id VARCHAR(20) NOT NULL UNIQUE,
    activity_title VARCHAR(500) NOT NULL,
    activity_description TEXT,
    subcategory ENUM('expanded_practice_access', 'population_management', 'care_coordination', 
                     'beneficiary_engagement', 'patient_safety_practice_improvements', 
                     'achieving_health_equity') NOT NULL,
    weight ENUM('medium', 'high') DEFAULT 'medium',
    performance_year YEAR NOT NULL,
    attestation_requirements TEXT,
    supporting_documentation TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_activity_id (activity_id),
    INDEX idx_subcategory_year (subcategory, performance_year),
    INDEX idx_weight (weight, performance_year)
);

-- 8. Provider IA Attestations
CREATE TABLE IF NOT EXISTS mips_ia_attestations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    activity_id VARCHAR(20) NOT NULL,
    attestation_status ENUM('planned', 'in_progress', 'completed', 'verified') DEFAULT 'planned',
    start_date DATE,
    end_date DATE,
    continuous_90_days BOOLEAN DEFAULT FALSE,
    points_earned INT DEFAULT 0,
    attestation_statement TEXT,
    supporting_evidence TEXT,
    attestation_date TIMESTAMP NULL,
    verified_by INT NULL,
    verification_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES mips_improvement_activities(activity_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_provider_activity_year (provider_id, activity_id, performance_year),
    INDEX idx_provider_year (provider_id, performance_year),
    INDEX idx_attestation_status (attestation_status)
);

-- 9. Cost Category (Claims-based, read-only tracking)
CREATE TABLE IF NOT EXISTS mips_cost_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    cost_measure_id VARCHAR(50) NOT NULL,
    cost_measure_name VARCHAR(200) NOT NULL,
    episode_count INT DEFAULT 0,
    total_cost DECIMAL(12,2) DEFAULT 0.00,
    benchmark_cost DECIMAL(12,2) DEFAULT 0.00,
    performance_score DECIMAL(4,2) DEFAULT 0.00,
    percentile_rank DECIMAL(5,2),
    data_source ENUM('cms_claims', 'estimated', 'manual') DEFAULT 'cms_claims',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_provider_cost_year (provider_id, cost_measure_id, performance_year),
    INDEX idx_provider_year (provider_id, performance_year)
);

-- 10. MIPS Scoring and Submission Tracking
CREATE TABLE IF NOT EXISTS mips_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    submission_type ENUM('individual', 'group', 'virtual_group') DEFAULT 'individual',
    submission_method ENUM('registry', 'ecqm', 'claims', 'direct') NOT NULL,
    
    -- Category Scores
    quality_score DECIMAL(5,2) DEFAULT 0.00,
    pi_score DECIMAL(5,2) DEFAULT 0.00,
    ia_score DECIMAL(5,2) DEFAULT 0.00,
    cost_score DECIMAL(5,2) DEFAULT 0.00,
    
    -- Weighted Scores
    quality_weight DECIMAL(3,2) DEFAULT 0.45,
    pi_weight DECIMAL(3,2) DEFAULT 0.25,
    ia_weight DECIMAL(3,2) DEFAULT 0.15,
    cost_weight DECIMAL(3,2) DEFAULT 0.15,
    
    -- Final Scoring
    composite_score DECIMAL(5,2) DEFAULT 0.00,
    payment_adjustment DECIMAL(5,2) DEFAULT 0.00,
    
    -- Submission Status
    submission_status ENUM('draft', 'ready', 'submitted', 'accepted', 'rejected') DEFAULT 'draft',
    submission_date TIMESTAMP NULL,
    cms_submission_id VARCHAR(100),
    validation_errors JSON,
    
    -- Audit Trail
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    submitted_by INT,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_provider_submission_year (provider_id, performance_year),
    INDEX idx_submission_status (submission_status),
    INDEX idx_performance_year (performance_year)
);

-- 11. Data Gap Analysis and Remediation Tasks
CREATE TABLE IF NOT EXISTS mips_data_gaps (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    gap_category ENUM('quality_data', 'pi_evidence', 'ia_documentation', 'patient_data', 'coding') NOT NULL,
    gap_type ENUM('missing_data', 'incomplete_data', 'invalid_data', 'insufficient_volume') NOT NULL,
    measure_id VARCHAR(20),
    gap_description TEXT NOT NULL,
    impact_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    remediation_task TEXT NOT NULL,
    assigned_to INT,
    due_date DATE,
    status ENUM('open', 'in_progress', 'resolved', 'deferred') DEFAULT 'open',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_provider_year (provider_id, performance_year),
    INDEX idx_gap_category (gap_category, status),
    INDEX idx_impact_level (impact_level, status),
    INDEX idx_due_date (due_date, status)
);

-- 12. MIPS Audit Log
CREATE TABLE IF NOT EXISTS mips_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    performance_year YEAR NOT NULL,
    action_type ENUM('calculation', 'submission', 'validation', 'data_update', 'attestation') NOT NULL,
    action_description TEXT NOT NULL,
    affected_measure_id VARCHAR(20),
    old_values JSON,
    new_values JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_provider_year (provider_id, performance_year),
    INDEX idx_action_type (action_type, created_at),
    INDEX idx_created_at (created_at)
);

-- 13. MIPS Configuration and Settings
CREATE TABLE IF NOT EXISTS mips_configuration (
    id INT PRIMARY KEY AUTO_INCREMENT,
    performance_year YEAR NOT NULL,
    config_key VARCHAR(100) NOT NULL,
    config_value JSON NOT NULL,
    config_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_year_key (performance_year, config_key),
    INDEX idx_performance_year (performance_year, is_active)
);

-- Insert default MIPS configuration for current year
INSERT IGNORE INTO mips_configuration (performance_year, config_key, config_value, config_description) VALUES
(2024, 'quality_category_weight', '0.45', 'Quality category weight in composite score'),
(2024, 'pi_category_weight', '0.25', 'Promoting Interoperability category weight'),
(2024, 'ia_category_weight', '0.15', 'Improvement Activities category weight'),
(2024, 'cost_category_weight', '0.15', 'Cost category weight in composite score'),
(2024, 'minimum_quality_measures', '6', 'Minimum number of quality measures required'),
(2024, 'outcome_measure_required', 'true', 'At least one outcome measure required'),
(2024, 'case_minimum_threshold', '20', 'Minimum cases required per quality measure'),
(2024, 'data_completeness_threshold', '70', 'Minimum data completeness percentage'),
(2024, 'submission_deadline', '"2025-03-31"', 'Final submission deadline'),
(2024, 'performance_period_start', '"2024-01-01"', 'Performance period start date'),
(2024, 'performance_period_end', '"2024-12-31"', 'Performance period end date');

-- Create views for common MIPS queries
CREATE OR REPLACE VIEW mips_provider_dashboard AS
SELECT 
    e.provider_id,
    e.npi,
    e.tin,
    e.performance_year,
    e.eligibility_status,
    e.specialty_name,
    COUNT(DISTINCT pm.measure_id) as selected_measures,
    COUNT(DISTINCT CASE WHEN qm.outcome_measure = TRUE THEN pm.measure_id END) as outcome_measures,
    AVG(qp.performance_rate) as avg_performance_rate,
    COUNT(DISTINCT pi.measure_id) as pi_measures_attested,
    COUNT(DISTINCT ia.activity_id) as ia_activities_completed,
    s.composite_score,
    s.submission_status,
    COUNT(DISTINCT dg.id) as open_data_gaps
FROM mips_eligibility e
LEFT JOIN mips_provider_measures pm ON e.provider_id = pm.provider_id AND e.performance_year = pm.performance_year
LEFT JOIN mips_quality_measures qm ON pm.measure_id = qm.measure_id
LEFT JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
LEFT JOIN mips_pi_performance pi ON e.provider_id = pi.provider_id AND e.performance_year = pi.performance_year
LEFT JOIN mips_ia_attestations ia ON e.provider_id = ia.provider_id AND e.performance_year = ia.performance_year
LEFT JOIN mips_submissions s ON e.provider_id = s.provider_id AND e.performance_year = s.performance_year
LEFT JOIN mips_data_gaps dg ON e.provider_id = dg.provider_id AND e.performance_year = dg.performance_year AND dg.status = 'open'
GROUP BY e.provider_id, e.performance_year;

-- Create stored procedures for MIPS calculations
DELIMITER //

CREATE PROCEDURE CalculateMIPSQualityScore(
    IN p_provider_id INT,
    IN p_performance_year YEAR
)
BEGIN
    DECLARE quality_score DECIMAL(5,2) DEFAULT 0.00;
    
    -- Calculate quality score based on performance rates and benchmarks
    SELECT 
        COALESCE(AVG(
            CASE 
                WHEN qp.case_minimum_met = TRUE AND qp.data_completeness >= 70 
                THEN qp.performance_score 
                ELSE 0 
            END
        ), 0.00) INTO quality_score
    FROM mips_provider_measures pm
    JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
    WHERE pm.provider_id = p_provider_id 
    AND pm.performance_year = p_performance_year
    AND pm.selection_status = 'selected';
    
    -- Update submission record
    INSERT INTO mips_submissions (provider_id, performance_year, quality_score)
    VALUES (p_provider_id, p_performance_year, quality_score)
    ON DUPLICATE KEY UPDATE 
        quality_score = quality_score,
        updated_at = CURRENT_TIMESTAMP;
        
    SELECT quality_score as calculated_quality_score;
END//

CREATE PROCEDURE IdentifyMIPSDataGaps(
    IN p_provider_id INT,
    IN p_performance_year YEAR
)
BEGIN
    -- Clear existing gaps for recalculation
    DELETE FROM mips_data_gaps 
    WHERE provider_id = p_provider_id 
    AND performance_year = p_performance_year;
    
    -- Identify quality measure data gaps
    INSERT INTO mips_data_gaps (provider_id, performance_year, gap_category, gap_type, measure_id, gap_description, impact_level, remediation_task)
    SELECT 
        pm.provider_id,
        pm.performance_year,
        'quality_data',
        'insufficient_volume',
        pm.measure_id,
        CONCAT('Measure ', pm.measure_id, ' has insufficient case volume'),
        'high',
        CONCAT('Increase patient encounters for measure ', pm.measure_id, ' or consider alternative measures')
    FROM mips_provider_measures pm
    LEFT JOIN mips_quality_performance qp ON pm.id = qp.provider_measure_id
    WHERE pm.provider_id = p_provider_id
    AND pm.performance_year = p_performance_year
    AND pm.selection_status = 'selected'
    AND (qp.denominator_count < 20 OR qp.denominator_count IS NULL);
    
    -- Identify PI attestation gaps
    INSERT INTO mips_data_gaps (provider_id, performance_year, gap_category, gap_type, measure_id, gap_description, impact_level, remediation_task)
    SELECT 
        p_provider_id,
        p_performance_year,
        'pi_evidence',
        'missing_data',
        pim.measure_id,
        CONCAT('PI measure ', pim.measure_id, ' requires attestation'),
        CASE WHEN pim.required_measure = TRUE THEN 'critical' ELSE 'medium' END,
        CONCAT('Complete attestation for PI measure ', pim.measure_id, ' with supporting documentation')
    FROM mips_pi_measures pim
    LEFT JOIN mips_pi_performance pip ON pim.measure_id = pip.measure_id 
        AND pip.provider_id = p_provider_id 
        AND pip.performance_year = p_performance_year
    WHERE pim.performance_year = p_performance_year
    AND pim.is_active = TRUE
    AND (pip.attestation_status IS NULL OR pip.attestation_status = 'not_started');
    
END//

DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX idx_mips_quality_performance_composite ON mips_quality_performance(provider_measure_id, reporting_period_start, reporting_period_end, submission_status);
CREATE INDEX idx_mips_provider_measures_composite ON mips_provider_measures(provider_id, performance_year, selection_status);
CREATE INDEX idx_mips_audit_log_composite ON mips_audit_log(provider_id, performance_year, action_type, created_at);

-- Add table comments for documentation
ALTER TABLE mips_eligibility COMMENT = 'Tracks MIPS eligibility status for providers by performance year';
ALTER TABLE mips_quality_measures COMMENT = 'Master list of available MIPS quality measures';
ALTER TABLE mips_provider_measures COMMENT = 'Provider-specific quality measure selections and targets';
ALTER TABLE mips_quality_performance COMMENT = 'Actual performance data for quality measures';
ALTER TABLE mips_pi_measures COMMENT = 'Promoting Interoperability measures master list';
ALTER TABLE mips_pi_performance COMMENT = 'PI measure performance and attestation tracking';
ALTER TABLE mips_improvement_activities COMMENT = 'Improvement Activities master list';
ALTER TABLE mips_ia_attestations COMMENT = 'IA attestations and completion tracking';
ALTER TABLE mips_cost_performance COMMENT = 'Cost category performance (claims-based)';
ALTER TABLE mips_submissions COMMENT = 'MIPS submission tracking and scoring';
ALTER TABLE mips_data_gaps COMMENT = 'Data gap analysis and remediation task tracking';
ALTER TABLE mips_audit_log COMMENT = 'Comprehensive audit trail for MIPS activities';
ALTER TABLE mips_configuration COMMENT = 'MIPS system configuration by performance year';