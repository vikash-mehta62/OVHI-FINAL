-- RCM Advanced Workflow Database Schema
-- Comprehensive schema for all advanced RCM components

-- AR Aging Intelligence Tables
CREATE TABLE IF NOT EXISTS rcm_ar_aging_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_date DATE NOT NULL,
    total_outstanding DECIMAL(15,2) NOT NULL,
    bucket_0_30 DECIMAL(15,2) DEFAULT 0,
    bucket_31_60 DECIMAL(15,2) DEFAULT 0,
    bucket_61_90 DECIMAL(15,2) DEFAULT 0,
    bucket_91_120 DECIMAL(15,2) DEFAULT 0,
    bucket_120_plus DECIMAL(15,2) DEFAULT 0,
    collection_probability DECIMAL(5,2) DEFAULT 0,
    risk_distribution JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rcm_collection_predictions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    patient_id INT NOT NULL,
    prediction_score DECIMAL(5,2) NOT NULL,
    confidence_level DECIMAL(5,2) NOT NULL,
    risk_factors JSON,
    recommended_actions JSON,
    prediction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50),
    INDEX idx_account_id (account_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_prediction_date (prediction_date)
);

CREATE TABLE IF NOT EXISTS rcm_risk_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    patient_id INT NOT NULL,
    risk_score DECIMAL(5,2) NOT NULL,
    risk_category ENUM('low', 'medium', 'high', 'critical') NOT NULL,
    contributing_factors JSON,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_account_risk (account_id)
);

CREATE TABLE IF NOT EXISTS rcm_automated_actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    trigger_condition VARCHAR(255),
    action_data JSON,
    status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    scheduled_date TIMESTAMP,
    executed_date TIMESTAMP NULL,
    result_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_date (scheduled_date)
);

-- ClaimMD Connector Tables
CREATE TABLE IF NOT EXISTS rcm_claimmd_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    claimmd_id VARCHAR(100),
    submission_status ENUM('submitted', 'accepted', 'rejected', 'pending') DEFAULT 'pending',
    confirmation_number VARCHAR(100),
    submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_date TIMESTAMP NULL,
    error_count INT DEFAULT 0,
    retry_count INT DEFAULT 0,
    INDEX idx_claim_id (claim_id),
    INDEX idx_claimmd_id (claimmd_id),
    INDEX idx_submission_status (submission_status)
);

CREATE TABLE IF NOT EXISTS rcm_claimmd_responses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    response_type VARCHAR(50) NOT NULL,
    response_data JSON,
    received_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (submission_id) REFERENCES rcm_claimmd_submissions(id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_response_type (response_type)
);

CREATE TABLE IF NOT EXISTS rcm_claimmd_errors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    submission_id INT NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    error_severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    resolution_status ENUM('open', 'in_progress', 'resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (submission_id) REFERENCES rcm_claimmd_submissions(id),
    INDEX idx_submission_id (submission_id),
    INDEX idx_error_code (error_code)
);

-- Collection Workflow Tables
CREATE TABLE IF NOT EXISTS rcm_collection_workflows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    patient_id INT NOT NULL,
    workflow_type VARCHAR(50) NOT NULL,
    current_stage VARCHAR(100) NOT NULL,
    stage_sequence JSON,
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    status ENUM('active', 'paused', 'completed', 'cancelled') DEFAULT 'active',
    started_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_date TIMESTAMP NULL,
    next_action_date TIMESTAMP,
    workflow_data JSON,
    INDEX idx_account_id (account_id),
    INDEX idx_status (status),
    INDEX idx_next_action_date (next_action_date)
);

CREATE TABLE IF NOT EXISTS rcm_collection_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workflow_id INT NOT NULL,
    stage_name VARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    stage_type VARCHAR(50) NOT NULL,
    stage_config JSON,
    status ENUM('pending', 'active', 'completed', 'skipped') DEFAULT 'pending',
    started_date TIMESTAMP NULL,
    completed_date TIMESTAMP NULL,
    FOREIGN KEY (workflow_id) REFERENCES rcm_collection_workflows(id),
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_stage_order (stage_order)
);

CREATE TABLE IF NOT EXISTS rcm_collection_actions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    workflow_id INT NOT NULL,
    stage_id INT,
    action_type VARCHAR(100) NOT NULL,
    action_description TEXT,
    scheduled_date TIMESTAMP,
    completed_date TIMESTAMP NULL,
    assigned_to INT,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    action_data JSON,
    result_data JSON,
    FOREIGN KEY (workflow_id) REFERENCES rcm_collection_workflows(id),
    FOREIGN KEY (stage_id) REFERENCES rcm_collection_stages(id),
    INDEX idx_workflow_id (workflow_id),
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS rcm_payment_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    patient_id INT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    number_of_payments INT NOT NULL,
    payments_made INT DEFAULT 0,
    remaining_balance DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    next_payment_date DATE,
    status ENUM('active', 'completed', 'defaulted', 'cancelled') DEFAULT 'active',
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    payment_method_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_status (status),
    INDEX idx_next_payment_date (next_payment_date)
);

-- Denial Management Tables
CREATE TABLE IF NOT EXISTS rcm_denial_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    denial_id INT NOT NULL,
    claim_id INT NOT NULL,
    denial_code VARCHAR(20) NOT NULL,
    denial_reason TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    priority_level ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    resolution_complexity ENUM('simple', 'moderate', 'complex') DEFAULT 'moderate',
    estimated_recovery_amount DECIMAL(15,2),
    categorized_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_denial_id (denial_id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS rcm_denial_resolutions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    denial_category_id INT NOT NULL,
    suggested_action VARCHAR(255),
    action_priority INT DEFAULT 1,
    success_rate DECIMAL(5,2),
    average_recovery_time INT,
    required_documents JSON,
    resolution_steps JSON,
    historical_success_count INT DEFAULT 0,
    historical_attempt_count INT DEFAULT 0,
    FOREIGN KEY (denial_category_id) REFERENCES rcm_denial_categories(id),
    INDEX idx_denial_category_id (denial_category_id)
);

CREATE TABLE IF NOT EXISTS rcm_appeal_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    denial_category_id INT NOT NULL,
    appeal_type VARCHAR(100) NOT NULL,
    document_template TEXT,
    generated_document TEXT,
    supporting_documents JSON,
    submission_deadline DATE,
    submitted_date DATE NULL,
    status ENUM('draft', 'ready', 'submitted', 'responded') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (denial_category_id) REFERENCES rcm_denial_categories(id),
    INDEX idx_denial_category_id (denial_category_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS rcm_appeal_outcomes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appeal_document_id INT NOT NULL,
    outcome ENUM('approved', 'denied', 'partial', 'pending') DEFAULT 'pending',
    recovered_amount DECIMAL(15,2) DEFAULT 0,
    response_date DATE,
    response_details TEXT,
    lessons_learned TEXT,
    FOREIGN KEY (appeal_document_id) REFERENCES rcm_appeal_documents(id),
    INDEX idx_appeal_document_id (appeal_document_id),
    INDEX idx_outcome (outcome)
);

-- EDI Transaction Manager Tables
CREATE TABLE IF NOT EXISTS rcm_edi_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_type VARCHAR(10) NOT NULL,
    control_number VARCHAR(50) NOT NULL,
    sender_id VARCHAR(50),
    receiver_id VARCHAR(50),
    transaction_data LONGTEXT,
    parsed_data JSON,
    validation_status ENUM('pending', 'valid', 'invalid', 'warning') DEFAULT 'pending',
    transmission_status ENUM('pending', 'sent', 'acknowledged', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transmitted_at TIMESTAMP NULL,
    acknowledged_at TIMESTAMP NULL,
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_control_number (control_number),
    INDEX idx_validation_status (validation_status)
);

CREATE TABLE IF NOT EXISTS rcm_edi_validation_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_type VARCHAR(10) NOT NULL,
    segment_id VARCHAR(10),
    element_position INT,
    rule_type VARCHAR(50) NOT NULL,
    rule_description TEXT,
    validation_logic JSON,
    severity ENUM('error', 'warning', 'info') DEFAULT 'error',
    active BOOLEAN DEFAULT TRUE,
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_segment_id (segment_id)
);

CREATE TABLE IF NOT EXISTS rcm_edi_transmission_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    transmission_method VARCHAR(50),
    endpoint_url VARCHAR(255),
    request_headers JSON,
    response_headers JSON,
    response_code INT,
    response_body TEXT,
    transmission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    FOREIGN KEY (transaction_id) REFERENCES rcm_edi_transactions(id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_success (success)
);

-- Enhanced Eligibility Checker Tables
CREATE TABLE IF NOT EXISTS rcm_eligibility_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    insurance_id INT NOT NULL,
    service_codes JSON,
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payer_response_time INT,
    eligibility_status ENUM('eligible', 'not_eligible', 'unknown', 'error') DEFAULT 'unknown',
    response_data JSON,
    cached BOOLEAN DEFAULT FALSE,
    cache_expiry TIMESTAMP NULL,
    INDEX idx_patient_id (patient_id),
    INDEX idx_insurance_id (insurance_id),
    INDEX idx_request_date (request_date)
);

CREATE TABLE IF NOT EXISTS rcm_eligibility_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    eligibility_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    hit_count INT DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cache_key (cache_key),
    INDEX idx_expires_at (expires_at)
);

CREATE TABLE IF NOT EXISTS rcm_coverage_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    eligibility_request_id INT NOT NULL,
    coverage_type VARCHAR(100),
    copay_amount DECIMAL(10,2),
    deductible_amount DECIMAL(10,2),
    deductible_met DECIMAL(10,2),
    out_of_pocket_max DECIMAL(10,2),
    out_of_pocket_met DECIMAL(10,2),
    coverage_percentage DECIMAL(5,2),
    coverage_limitations JSON,
    effective_date DATE,
    termination_date DATE,
    FOREIGN KEY (eligibility_request_id) REFERENCES rcm_eligibility_requests(id),
    INDEX idx_eligibility_request_id (eligibility_request_id)
);

CREATE TABLE IF NOT EXISTS rcm_prior_auth_requirements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    eligibility_request_id INT NOT NULL,
    service_code VARCHAR(20) NOT NULL,
    prior_auth_required BOOLEAN DEFAULT FALSE,
    auth_number VARCHAR(100),
    auth_status ENUM('required', 'pending', 'approved', 'denied') DEFAULT 'required',
    submission_deadline DATE,
    approval_date DATE NULL,
    denial_reason TEXT,
    FOREIGN KEY (eligibility_request_id) REFERENCES rcm_eligibility_requests(id),
    INDEX idx_eligibility_request_id (eligibility_request_id),
    INDEX idx_service_code (service_code)
);

-- ERA Processor Tables
CREATE TABLE IF NOT EXISTS rcm_era_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size INT,
    payer_id INT,
    processing_status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
    total_payments DECIMAL(15,2) DEFAULT 0,
    matched_payments INT DEFAULT 0,
    unmatched_payments INT DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    error_message TEXT,
    INDEX idx_payer_id (payer_id),
    INDEX idx_processing_status (processing_status)
);

CREATE TABLE IF NOT EXISTS rcm_payment_matches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_file_id INT NOT NULL,
    claim_id INT,
    era_line_number INT,
    payment_amount DECIMAL(15,2) NOT NULL,
    adjustment_amount DECIMAL(15,2) DEFAULT 0,
    match_confidence DECIMAL(5,2) DEFAULT 0,
    match_criteria JSON,
    match_status ENUM('matched', 'unmatched', 'partial', 'disputed') DEFAULT 'unmatched',
    manual_review BOOLEAN DEFAULT FALSE,
    matched_at TIMESTAMP NULL,
    FOREIGN KEY (era_file_id) REFERENCES rcm_era_files(id),
    INDEX idx_era_file_id (era_file_id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_match_status (match_status)
);

CREATE TABLE IF NOT EXISTS rcm_posting_results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_match_id INT NOT NULL,
    posting_status ENUM('pending', 'posted', 'failed', 'reversed') DEFAULT 'pending',
    posted_amount DECIMAL(15,2),
    adjustment_amount DECIMAL(15,2),
    patient_responsibility DECIMAL(15,2),
    posting_date TIMESTAMP NULL,
    posting_user_id INT,
    error_message TEXT,
    FOREIGN KEY (payment_match_id) REFERENCES rcm_payment_matches(id),
    INDEX idx_payment_match_id (payment_match_id),
    INDEX idx_posting_status (posting_status)
);

CREATE TABLE IF NOT EXISTS rcm_variance_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_file_id INT NOT NULL,
    variance_type VARCHAR(100),
    expected_amount DECIMAL(15,2),
    actual_amount DECIMAL(15,2),
    variance_amount DECIMAL(15,2),
    variance_percentage DECIMAL(5,2),
    explanation TEXT,
    resolution_status ENUM('open', 'investigating', 'resolved') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (era_file_id) REFERENCES rcm_era_files(id),
    INDEX idx_era_file_id (era_file_id),
    INDEX idx_variance_type (variance_type)
);

-- Intelligent Claims Scrubbers Tables
CREATE TABLE IF NOT EXISTS rcm_claim_validations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    validation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validation_version VARCHAR(50),
    overall_score DECIMAL(5,2) DEFAULT 0,
    risk_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    validation_passed BOOLEAN DEFAULT FALSE,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    validation_details JSON,
    INDEX idx_claim_id (claim_id),
    INDEX idx_validation_date (validation_date),
    INDEX idx_risk_level (risk_level)
);

CREATE TABLE IF NOT EXISTS rcm_auto_corrections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    validation_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    original_value TEXT,
    corrected_value TEXT,
    correction_confidence DECIMAL(5,2),
    correction_reason TEXT,
    applied BOOLEAN DEFAULT FALSE,
    manual_review BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (validation_id) REFERENCES rcm_claim_validations(id),
    INDEX idx_validation_id (validation_id),
    INDEX idx_field_name (field_name)
);

CREATE TABLE IF NOT EXISTS rcm_quality_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    overall_quality DECIMAL(5,2) NOT NULL,
    completeness_score DECIMAL(5,2),
    accuracy_score DECIMAL(5,2),
    compliance_score DECIMAL(5,2),
    risk_score DECIMAL(5,2),
    scoring_factors JSON,
    scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_claim_id (claim_id),
    INDEX idx_overall_quality (overall_quality)
);

CREATE TABLE IF NOT EXISTS rcm_learning_patterns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pattern_type VARCHAR(100) NOT NULL,
    pattern_data JSON,
    success_rate DECIMAL(5,2),
    sample_size INT DEFAULT 0,
    confidence_level DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    INDEX idx_pattern_type (pattern_type),
    INDEX idx_success_rate (success_rate)
);

-- Patient Financial Portal Tables
CREATE TABLE IF NOT EXISTS rcm_patient_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL UNIQUE,
    current_balance DECIMAL(15,2) DEFAULT 0,
    total_charges DECIMAL(15,2) DEFAULT 0,
    total_payments DECIMAL(15,2) DEFAULT 0,
    total_adjustments DECIMAL(15,2) DEFAULT 0,
    last_payment_date DATE,
    last_statement_date DATE,
    payment_plan_active BOOLEAN DEFAULT FALSE,
    portal_access_enabled BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_id (patient_id),
    INDEX idx_current_balance (current_balance)
);

CREATE TABLE IF NOT EXISTS rcm_patient_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_account_id INT NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_method ENUM('credit_card', 'debit_card', 'ach', 'check', 'cash', 'payment_plan') NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(100),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_source ENUM('portal', 'phone', 'mail', 'office') DEFAULT 'portal',
    FOREIGN KEY (patient_account_id) REFERENCES rcm_patient_accounts(id),
    INDEX idx_patient_account_id (patient_account_id),
    INDEX idx_payment_date (payment_date)
);

CREATE TABLE IF NOT EXISTS rcm_patient_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_account_id INT NOT NULL,
    message_type ENUM('inquiry', 'payment', 'dispute', 'general') DEFAULT 'general',
    subject VARCHAR(255),
    message_content TEXT,
    sender_type ENUM('patient', 'staff') NOT NULL,
    sender_id INT,
    read_status BOOLEAN DEFAULT FALSE,
    response_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    FOREIGN KEY (patient_account_id) REFERENCES rcm_patient_accounts(id),
    INDEX idx_patient_account_id (patient_account_id),
    INDEX idx_sender_type (sender_type),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS rcm_patient_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_account_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INT,
    document_date DATE,
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_account_id) REFERENCES rcm_patient_accounts(id),
    INDEX idx_patient_account_id (patient_account_id),
    INDEX idx_document_type (document_type)
);

-- Payment Posting Engine Tables
CREATE TABLE IF NOT EXISTS rcm_payment_postings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    posting_type ENUM('insurance', 'patient', 'adjustment', 'refund') NOT NULL,
    posting_amount DECIMAL(15,2) NOT NULL,
    posting_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_by INT,
    posting_method ENUM('automatic', 'manual', 'batch') DEFAULT 'automatic',
    posting_status ENUM('pending', 'posted', 'reversed', 'error') DEFAULT 'pending',
    error_message TEXT,
    INDEX idx_payment_id (payment_id),
    INDEX idx_posting_type (posting_type),
    INDEX idx_posting_date (posting_date)
);

CREATE TABLE IF NOT EXISTS rcm_payment_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    posting_id INT NOT NULL,
    claim_id INT,
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_type ENUM('payment', 'adjustment', 'writeoff') NOT NULL,
    allocation_reason VARCHAR(255),
    FOREIGN KEY (posting_id) REFERENCES rcm_payment_postings(id),
    INDEX idx_posting_id (posting_id),
    INDEX idx_claim_id (claim_id)
);

CREATE TABLE IF NOT EXISTS rcm_adjustments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    posting_id INT NOT NULL,
    adjustment_type VARCHAR(100) NOT NULL,
    adjustment_amount DECIMAL(15,2) NOT NULL,
    adjustment_reason VARCHAR(255),
    adjustment_code VARCHAR(20),
    contractual BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (posting_id) REFERENCES rcm_payment_postings(id),
    INDEX idx_posting_id (posting_id),
    INDEX idx_adjustment_type (adjustment_type)
);

CREATE TABLE IF NOT EXISTS rcm_overpayments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_id INT NOT NULL,
    overpayment_amount DECIMAL(15,2) NOT NULL,
    detection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    refund_status ENUM('pending', 'processed', 'applied_to_account', 'written_off') DEFAULT 'pending',
    refund_method ENUM('check', 'credit_card_reversal', 'ach_reversal', 'account_credit') NULL,
    refund_date DATE NULL,
    refund_reference VARCHAR(100),
    INDEX idx_payment_id (payment_id),
    INDEX idx_refund_status (refund_status)
);

-- Revenue Forecasting Tables
CREATE TABLE IF NOT EXISTS rcm_revenue_forecasts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    forecast_period VARCHAR(50) NOT NULL,
    forecast_date DATE NOT NULL,
    projected_revenue DECIMAL(15,2) NOT NULL,
    confidence_lower DECIMAL(15,2),
    confidence_upper DECIMAL(15,2),
    confidence_level DECIMAL(5,2) DEFAULT 95.0,
    forecast_method VARCHAR(100),
    model_version VARCHAR(50),
    key_drivers JSON,
    risk_factors JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_forecast_period (forecast_period),
    INDEX idx_forecast_date (forecast_date)
);

CREATE TABLE IF NOT EXISTS rcm_trend_analysis (
    id INT PRIMARY KEY AUTO_INCREMENT,
    analysis_period VARCHAR(50) NOT NULL,
    trend_type VARCHAR(100) NOT NULL,
    trend_direction ENUM('increasing', 'decreasing', 'stable', 'volatile') NOT NULL,
    trend_strength DECIMAL(5,2),
    trend_data JSON,
    statistical_significance DECIMAL(5,2),
    analysis_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analysis_period (analysis_period),
    INDEX idx_trend_type (trend_type)
);

CREATE TABLE IF NOT EXISTS rcm_scenario_models (
    id INT PRIMARY KEY AUTO_INCREMENT,
    scenario_name VARCHAR(255) NOT NULL,
    scenario_parameters JSON,
    projected_outcomes JSON,
    probability_score DECIMAL(5,2),
    impact_assessment JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_scenario_name (scenario_name),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS rcm_forecast_accuracy (
    id INT PRIMARY KEY AUTO_INCREMENT,
    forecast_id INT NOT NULL,
    actual_revenue DECIMAL(15,2),
    forecast_error DECIMAL(15,2),
    error_percentage DECIMAL(5,2),
    accuracy_score DECIMAL(5,2),
    evaluation_date DATE,
    FOREIGN KEY (forecast_id) REFERENCES rcm_revenue_forecasts(id),
    INDEX idx_forecast_id (forecast_id),
    INDEX idx_evaluation_date (evaluation_date)
);

-- Audit and Monitoring Tables
CREATE TABLE IF NOT EXISTS rcm_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    component VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    user_id INT,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_component (component),
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS rcm_system_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(50),
    component VARCHAR(100),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metric_name (metric_name),
    INDEX idx_component (component),
    INDEX idx_recorded_at (recorded_at)
);

-- Create indexes for performance optimization
CREATE INDEX idx_rcm_ar_aging_analysis_date ON rcm_ar_aging_analysis(analysis_date);
CREATE INDEX idx_rcm_collection_workflows_status ON rcm_collection_workflows(status, next_action_date);
CREATE INDEX idx_rcm_denial_categories_priority ON rcm_denial_categories(priority_level, categorized_date);
CREATE INDEX idx_rcm_edi_transactions_type_status ON rcm_edi_transactions(transaction_type, validation_status);
CREATE INDEX idx_rcm_eligibility_requests_patient_date ON rcm_eligibility_requests(patient_id, request_date);
CREATE INDEX idx_rcm_era_files_status_date ON rcm_era_files(processing_status, uploaded_at);
CREATE INDEX idx_rcm_claim_validations_score ON rcm_claim_validations(overall_score, risk_level);
CREATE INDEX idx_rcm_patient_accounts_balance ON rcm_patient_accounts(current_balance, payment_plan_active);
CREATE INDEX idx_rcm_payment_postings_date_status ON rcm_payment_postings(posting_date, posting_status);
CREATE INDEX idx_rcm_revenue_forecasts_period ON rcm_revenue_forecasts(forecast_period, forecast_date);