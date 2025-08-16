-- Complete RCM System Database Schema
-- Production-ready Revenue Cycle Management with all components

-- =====================================================
-- PAYER & PROVIDER MASTER
-- =====================================================

-- Payers Table
CREATE TABLE IF NOT EXISTS rcm_payers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payer_name VARCHAR(255) NOT NULL,
    payer_id VARCHAR(50) UNIQUE NOT NULL,
    payer_type ENUM('commercial', 'medicare', 'medicaid', 'self_pay', 'other') NOT NULL,
    clearinghouse_id VARCHAR(50),
    routing_info JSON,
    contact_info JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_payer_id (payer_id),
    INDEX idx_payer_type (payer_type),
    INDEX idx_active (is_active)
);

-- Insurance Plans Table
CREATE TABLE IF NOT EXISTS rcm_insurance_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payer_id INT NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    plan_id VARCHAR(50) NOT NULL,
    plan_type ENUM('hmo', 'ppo', 'epo', 'pos', 'medicare', 'medicaid') NOT NULL,
    copay_amount DECIMAL(10,2) DEFAULT 0.00,
    coinsurance_percentage DECIMAL(5,2) DEFAULT 0.00,
    deductible_amount DECIMAL(10,2) DEFAULT 0.00,
    out_of_pocket_max DECIMAL(10,2) DEFAULT 0.00,
    effective_date DATE,
    termination_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    INDEX idx_plan_id (plan_id),
    INDEX idx_payer_plan (payer_id, is_active)
);

-- Provider Organizations Table
CREATE TABLE IF NOT EXISTS rcm_provider_organizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_name VARCHAR(255) NOT NULL,
    npi VARCHAR(10) UNIQUE NOT NULL,
    tin VARCHAR(20) NOT NULL,
    taxonomy_code VARCHAR(20),
    organization_type ENUM('individual', 'group', 'facility') NOT NULL,
    address JSON,
    contact_info JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_npi (npi),
    INDEX idx_tin (tin),
    INDEX idx_taxonomy (taxonomy_code)
);

-- Provider Locations Table
CREATE TABLE IF NOT EXISTS rcm_provider_locations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_id INT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    location_npi VARCHAR(10),
    place_of_service VARCHAR(2) NOT NULL,
    address JSON NOT NULL,
    is_billing_location BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES rcm_provider_organizations(id),
    INDEX idx_location_npi (location_npi),
    INDEX idx_pos (place_of_service)
);

-- =====================================================
-- PATIENT & INSURANCE
-- =====================================================

-- Enhanced Patient Insurance Table
CREATE TABLE IF NOT EXISTS rcm_patient_insurance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    payer_id INT NOT NULL,
    plan_id INT,
    coverage_type ENUM('primary', 'secondary', 'tertiary') NOT NULL,
    member_id VARCHAR(50) NOT NULL,
    group_number VARCHAR(50),
    policy_holder_name VARCHAR(255),
    policy_holder_dob DATE,
    relationship_to_patient ENUM('self', 'spouse', 'child', 'other') DEFAULT 'self',
    effective_date DATE NOT NULL,
    termination_date DATE,
    copay_amount DECIMAL(10,2) DEFAULT 0.00,
    coinsurance_percentage DECIMAL(5,2) DEFAULT 0.00,
    deductible_amount DECIMAL(10,2) DEFAULT 0.00,
    deductible_met DECIMAL(10,2) DEFAULT 0.00,
    out_of_pocket_max DECIMAL(10,2) DEFAULT 0.00,
    out_of_pocket_met DECIMAL(10,2) DEFAULT 0.00,
    card_front_image VARCHAR(500),
    card_back_image VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    FOREIGN KEY (plan_id) REFERENCES rcm_insurance_plans(id),
    INDEX idx_patient_coverage (patient_id, coverage_type),
    INDEX idx_member_id (member_id),
    UNIQUE KEY unique_patient_coverage (patient_id, coverage_type, effective_date)
);

-- =====================================================
-- ELIGIBILITY
-- =====================================================

-- Eligibility Requests Table
CREATE TABLE IF NOT EXISTS rcm_eligibility_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    insurance_id INT NOT NULL,
    provider_id INT NOT NULL,
    request_date DATE NOT NULL,
    service_date DATE,
    request_type ENUM('general', 'specific_service') DEFAULT 'general',
    service_codes JSON,
    request_data JSON,
    response_data JSON,
    eligibility_status ENUM('eligible', 'not_eligible', 'pending', 'error') DEFAULT 'pending',
    benefits_summary JSON,
    copay_info JSON,
    deductible_info JSON,
    coinsurance_info JSON,
    out_of_pocket_info JSON,
    prior_auth_required BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (insurance_id) REFERENCES rcm_patient_insurance(id),
    INDEX idx_patient_eligibility (patient_id, request_date),
    INDEX idx_eligibility_status (eligibility_status, request_date)
);

-- =====================================================
-- CHARGE CAPTURE & CODING
-- =====================================================

-- Enhanced Encounters Table
CREATE TABLE IF NOT EXISTS rcm_encounters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    location_id INT NOT NULL,
    encounter_date DATE NOT NULL,
    encounter_time TIME,
    encounter_type VARCHAR(50),
    place_of_service VARCHAR(2) NOT NULL,
    chief_complaint TEXT,
    diagnosis_codes JSON NOT NULL,
    procedure_codes JSON NOT NULL,
    total_charges DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('draft', 'ready_to_bill', 'billed', 'closed') DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (location_id) REFERENCES rcm_provider_locations(id),
    INDEX idx_patient_encounter (patient_id, encounter_date),
    INDEX idx_provider_encounter (provider_id, encounter_date),
    INDEX idx_encounter_status (status, encounter_date)
);

-- Charge Capture Table
CREATE TABLE IF NOT EXISTS rcm_charges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    encounter_id INT NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    modifier_1 VARCHAR(2),
    modifier_2 VARCHAR(2),
    modifier_3 VARCHAR(2),
    modifier_4 VARCHAR(2),
    units INT DEFAULT 1,
    charge_amount DECIMAL(10,2) NOT NULL,
    diagnosis_pointer VARCHAR(10),
    revenue_code VARCHAR(4),
    ndc_code VARCHAR(20),
    service_date DATE NOT NULL,
    line_note TEXT,
    status ENUM('draft', 'ready', 'billed', 'paid', 'denied', 'adjusted') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (encounter_id) REFERENCES rcm_encounters(id),
    INDEX idx_encounter_charges (encounter_id),
    INDEX idx_cpt_code (cpt_code),
    INDEX idx_service_date (service_date)
);

-- Coding Validation Rules Table
CREATE TABLE IF NOT EXISTS rcm_coding_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(255) NOT NULL,
    rule_type ENUM('edit', 'coverage', 'frequency', 'age', 'gender', 'modifier') NOT NULL,
    payer_id INT,
    cpt_code VARCHAR(10),
    icd_code VARCHAR(10),
    rule_logic JSON NOT NULL,
    error_message TEXT,
    severity ENUM('warning', 'error', 'info') DEFAULT 'warning',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    INDEX idx_rule_type (rule_type),
    INDEX idx_cpt_rule (cpt_code),
    INDEX idx_payer_rule (payer_id)
);-- =====
================================================
-- CLAIM LIFECYCLE
-- =====================================================

-- Claims Table (Enhanced)
CREATE TABLE IF NOT EXISTS rcm_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    payer_id INT NOT NULL,
    encounter_id INT,
    claim_type ENUM('original', 'replacement', 'void', 'corrected') DEFAULT 'original',
    frequency_code VARCHAR(1) DEFAULT '1',
    total_charge_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_paid_amount DECIMAL(10,2) DEFAULT 0.00,
    total_patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
    claim_status ENUM('draft', 'ready', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'partial_paid') DEFAULT 'draft',
    submission_date DATETIME,
    acceptance_date DATETIME,
    payment_date DATETIME,
    clearinghouse_id VARCHAR(50),
    clearinghouse_claim_id VARCHAR(50),
    payer_claim_id VARCHAR(50),
    batch_id VARCHAR(50),
    x12_837_data LONGTEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(user_id),
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    FOREIGN KEY (encounter_id) REFERENCES rcm_encounters(id),
    INDEX idx_claim_number (claim_number),
    INDEX idx_patient_claim (patient_id, claim_status),
    INDEX idx_payer_claim (payer_id, claim_status),
    INDEX idx_submission_date (submission_date),
    INDEX idx_claim_status (claim_status, submission_date)
);

-- Claim Line Items Table
CREATE TABLE IF NOT EXISTS rcm_claim_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    line_number INT NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    modifier_1 VARCHAR(2),
    modifier_2 VARCHAR(2),
    modifier_3 VARCHAR(2),
    modifier_4 VARCHAR(2),
    units INT DEFAULT 1,
    charge_amount DECIMAL(10,2) NOT NULL,
    allowed_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
    diagnosis_pointer VARCHAR(10),
    service_date DATE NOT NULL,
    service_end_date DATE,
    place_of_service VARCHAR(2),
    revenue_code VARCHAR(4),
    ndc_code VARCHAR(20),
    line_status ENUM('submitted', 'paid', 'denied', 'adjusted', 'pending') DEFAULT 'submitted',
    denial_code VARCHAR(10),
    denial_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id) ON DELETE CASCADE,
    INDEX idx_claim_lines (claim_id, line_number),
    INDEX idx_cpt_line (cpt_code),
    INDEX idx_service_date (service_date),
    UNIQUE KEY unique_claim_line (claim_id, line_number)
);

-- Claim Status Events Table
CREATE TABLE IF NOT EXISTS rcm_claim_status_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    status_code VARCHAR(10) NOT NULL,
    status_description TEXT,
    event_date DATETIME NOT NULL,
    source ENUM('clearinghouse', 'payer', 'manual', 'system') NOT NULL,
    details JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id) ON DELETE CASCADE,
    INDEX idx_claim_status (claim_id, event_date),
    INDEX idx_status_code (status_code)
);

-- Clearinghouse Submissions Table
CREATE TABLE IF NOT EXISTS rcm_clearinghouse_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    clearinghouse_id VARCHAR(50) NOT NULL,
    submission_type ENUM('claims', 'eligibility', 'status') NOT NULL,
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    total_claims INT DEFAULT 0,
    accepted_claims INT DEFAULT 0,
    rejected_claims INT DEFAULT 0,
    submission_date DATETIME NOT NULL,
    acknowledgment_date DATETIME,
    status ENUM('pending', 'accepted', 'rejected', 'processed') DEFAULT 'pending',
    response_data LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_batch_id (batch_id),
    INDEX idx_clearinghouse (clearinghouse_id),
    INDEX idx_submission_date (submission_date)
);

-- =====================================================
-- ERA/835 INGESTION & AUTO-POSTING
-- =====================================================

-- ERA Files Table
CREATE TABLE IF NOT EXISTS rcm_era_files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    payer_id INT,
    check_number VARCHAR(50),
    check_date DATE,
    check_amount DECIMAL(12,2),
    total_claims INT DEFAULT 0,
    processed_claims INT DEFAULT 0,
    unmatched_claims INT DEFAULT 0,
    processing_status ENUM('pending', 'processing', 'completed', 'error') DEFAULT 'pending',
    x12_835_data LONGTEXT,
    processing_notes TEXT,
    processed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    INDEX idx_check_number (check_number),
    INDEX idx_check_date (check_date),
    INDEX idx_processing_status (processing_status)
);

-- ERA Claims Table
CREATE TABLE IF NOT EXISTS rcm_era_claims (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_file_id INT NOT NULL,
    payer_claim_id VARCHAR(50),
    patient_account_number VARCHAR(50),
    claim_status_code VARCHAR(10),
    total_charge_amount DECIMAL(10,2),
    total_payment_amount DECIMAL(10,2),
    patient_responsibility_amount DECIMAL(10,2),
    claim_adjustment_reason_codes JSON,
    matched_claim_id INT,
    matching_status ENUM('matched', 'unmatched', 'multiple_matches') DEFAULT 'unmatched',
    posting_status ENUM('pending', 'posted', 'error', 'manual_review') DEFAULT 'pending',
    posting_date DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (era_file_id) REFERENCES rcm_era_files(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_claim_id) REFERENCES rcm_claims(id),
    INDEX idx_era_claims (era_file_id),
    INDEX idx_payer_claim_id (payer_claim_id),
    INDEX idx_matching_status (matching_status),
    INDEX idx_posting_status (posting_status)
);

-- ERA Line Items Table
CREATE TABLE IF NOT EXISTS rcm_era_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_claim_id INT NOT NULL,
    line_number INT NOT NULL,
    cpt_code VARCHAR(10),
    service_date DATE,
    charge_amount DECIMAL(10,2),
    payment_amount DECIMAL(10,2),
    adjustment_amount DECIMAL(10,2),
    patient_responsibility DECIMAL(10,2),
    adjustment_reason_codes JSON,
    remark_codes JSON,
    matched_line_id INT,
    posting_status ENUM('pending', 'posted', 'error') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (era_claim_id) REFERENCES rcm_era_claims(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_line_id) REFERENCES rcm_claim_lines(id),
    INDEX idx_era_lines (era_claim_id, line_number),
    INDEX idx_cpt_service (cpt_code, service_date)
);

-- =====================================================
-- PAYMENTS & ADJUSTMENTS
-- =====================================================

-- Payments Table
CREATE TABLE IF NOT EXISTS rcm_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_type ENUM('insurance', 'patient', 'adjustment', 'refund') NOT NULL,
    payer_id INT,
    claim_id INT,
    era_file_id INT,
    payment_method ENUM('check', 'eft', 'credit_card', 'cash', 'adjustment') NOT NULL,
    check_number VARCHAR(50),
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(50),
    notes TEXT,
    posted_by INT,
    posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    FOREIGN KEY (era_file_id) REFERENCES rcm_era_files(id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_type (payment_type),
    INDEX idx_claim_payment (claim_id)
);

-- Adjustments Table
CREATE TABLE IF NOT EXISTS rcm_adjustments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT,
    claim_line_id INT,
    adjustment_type ENUM('contractual', 'write_off', 'refund', 'correction', 'other') NOT NULL,
    adjustment_code VARCHAR(10),
    adjustment_amount DECIMAL(10,2) NOT NULL,
    adjustment_reason TEXT,
    adjustment_date DATE NOT NULL,
    posted_by INT,
    posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    FOREIGN KEY (claim_line_id) REFERENCES rcm_claim_lines(id),
    INDEX idx_adjustment_date (adjustment_date),
    INDEX idx_adjustment_type (adjustment_type),
    INDEX idx_claim_adjustment (claim_id)
);-- ====
=================================================
-- DENIALS & APPEALS
-- =====================================================

-- Denial Cases Table
CREATE TABLE IF NOT EXISTS rcm_denial_cases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id INT NOT NULL,
    claim_line_id INT,
    denial_date DATE NOT NULL,
    denial_code VARCHAR(10) NOT NULL,
    denial_reason TEXT NOT NULL,
    carc_code VARCHAR(10),
    rarc_code VARCHAR(10),
    denial_category ENUM('authorization', 'eligibility', 'coding', 'documentation', 'timely_filing', 'other') NOT NULL,
    root_cause VARCHAR(255),
    denial_amount DECIMAL(10,2) NOT NULL,
    case_status ENUM('new', 'under_review', 'appealing', 'resolved', 'written_off') DEFAULT 'new',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to INT,
    resolution_notes TEXT,
    resolved_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    FOREIGN KEY (claim_line_id) REFERENCES rcm_claim_lines(id),
    INDEX idx_denial_date (denial_date),
    INDEX idx_denial_code (denial_code),
    INDEX idx_case_status (case_status),
    INDEX idx_assigned_to (assigned_to)
);

-- Appeal Tasks Table
CREATE TABLE IF NOT EXISTS rcm_appeal_tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    denial_case_id INT NOT NULL,
    appeal_level ENUM('first', 'second', 'third', 'external') DEFAULT 'first',
    appeal_type ENUM('reconsideration', 'redetermination', 'hearing', 'review') NOT NULL,
    due_date DATE NOT NULL,
    appeal_status ENUM('pending', 'in_progress', 'submitted', 'approved', 'denied', 'withdrawn') DEFAULT 'pending',
    template_used VARCHAR(255),
    appeal_letter_path VARCHAR(500),
    supporting_documents JSON,
    submission_date DATE,
    response_date DATE,
    response_outcome ENUM('approved', 'denied', 'partial_approval') NULL,
    recovery_amount DECIMAL(10,2) DEFAULT 0.00,
    assigned_to INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (denial_case_id) REFERENCES rcm_denial_cases(id) ON DELETE CASCADE,
    INDEX idx_due_date (due_date),
    INDEX idx_appeal_status (appeal_status),
    INDEX idx_assigned_to (assigned_to)
);

-- Appeal Templates Table
CREATE TABLE IF NOT EXISTS rcm_appeal_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_name VARCHAR(255) NOT NULL,
    payer_id INT,
    denial_category VARCHAR(100),
    template_content LONGTEXT NOT NULL,
    required_documents JSON,
    sla_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payer_id) REFERENCES rcm_payers(id),
    INDEX idx_template_name (template_name),
    INDEX idx_payer_template (payer_id),
    INDEX idx_denial_category (denial_category)
);

-- =====================================================
-- PATIENT BILLING
-- =====================================================

-- Patient Statements Table (Enhanced)
CREATE TABLE IF NOT EXISTS rcm_patient_statements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    statement_number VARCHAR(50) UNIQUE NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE,
    previous_balance DECIMAL(10,2) DEFAULT 0.00,
    new_charges DECIMAL(10,2) DEFAULT 0.00,
    payments_received DECIMAL(10,2) DEFAULT 0.00,
    adjustments DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) NOT NULL,
    aging_30 DECIMAL(10,2) DEFAULT 0.00,
    aging_60 DECIMAL(10,2) DEFAULT 0.00,
    aging_90 DECIMAL(10,2) DEFAULT 0.00,
    aging_120_plus DECIMAL(10,2) DEFAULT 0.00,
    statement_type ENUM('standard', 'final_notice', 'collections') DEFAULT 'standard',
    delivery_method ENUM('mail', 'email', 'portal', 'print') DEFAULT 'mail',
    delivery_status ENUM('pending', 'sent', 'delivered', 'bounced', 'viewed') DEFAULT 'pending',
    sent_date DATETIME,
    payment_plan_id INT,
    custom_message TEXT,
    pdf_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_patient_statement (patient_id, statement_date),
    INDEX idx_statement_number (statement_number),
    INDEX idx_delivery_status (delivery_status)
);

-- Patient Statement Line Items Table
CREATE TABLE IF NOT EXISTS rcm_statement_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    statement_id INT NOT NULL,
    claim_id INT,
    service_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    cpt_code VARCHAR(10),
    charge_amount DECIMAL(10,2) NOT NULL,
    insurance_payment DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    patient_responsibility DECIMAL(10,2) NOT NULL,
    line_type ENUM('charge', 'payment', 'adjustment', 'balance_forward') NOT NULL,
    
    FOREIGN KEY (statement_id) REFERENCES rcm_patient_statements(id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES rcm_claims(id),
    INDEX idx_statement_lines (statement_id),
    INDEX idx_service_date (service_date)
);

-- Patient Payment Plans Table
CREATE TABLE IF NOT EXISTS rcm_payment_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    plan_name VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) DEFAULT 0.00,
    monthly_payment DECIMAL(10,2) NOT NULL,
    number_of_payments INT NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    plan_status ENUM('active', 'completed', 'defaulted', 'cancelled') DEFAULT 'active',
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    payment_method_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_patient_plan (patient_id),
    INDEX idx_plan_status (plan_status),
    INDEX idx_payment_date (first_payment_date)
);

-- Patient Payments Table
CREATE TABLE IF NOT EXISTS rcm_patient_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    payment_plan_id INT,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'check', 'credit_card', 'debit_card', 'ach', 'online') NOT NULL,
    reference_number VARCHAR(50),
    transaction_id VARCHAR(100),
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    applied_to_claims JSON,
    notes TEXT,
    processed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (payment_plan_id) REFERENCES rcm_payment_plans(id),
    INDEX idx_patient_payment (patient_id, payment_date),
    INDEX idx_payment_status (payment_status),
    INDEX idx_reference_number (reference_number)
);

-- =====================================================
-- ANALYTICS & REPORTS
-- =====================================================

-- RCM Analytics Cache Table
CREATE TABLE IF NOT EXISTS rcm_analytics_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    metric_name VARCHAR(100) NOT NULL,
    provider_id INT,
    payer_id INT,
    date_period DATE NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly') NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    additional_data JSON,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_provider (metric_name, provider_id, date_period),
    INDEX idx_metric_payer (metric_name, payer_id, date_period),
    INDEX idx_period_type (period_type, date_period),
    UNIQUE KEY unique_metric_cache (metric_name, provider_id, payer_id, date_period, period_type)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================

-- RCM Audit Logs Table
CREATE TABLE IF NOT EXISTS rcm_audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_action (user_id, action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- =====================================================
-- USER ROLES & PERMISSIONS
-- =====================================================

-- RCM User Roles Table
CREATE TABLE IF NOT EXISTS rcm_user_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT,
    permissions JSON NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RCM User Role Assignments Table
CREATE TABLE IF NOT EXISTS rcm_user_role_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (role_id) REFERENCES rcm_user_roles(id),
    INDEX idx_user_role (user_id, role_id),
    INDEX idx_active_assignments (is_active, expires_at),
    UNIQUE KEY unique_user_role (user_id, role_id)
);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert default payers
INSERT IGNORE INTO rcm_payers (payer_name, payer_id, payer_type, is_active) VALUES
('Medicare', 'MEDICARE_001', 'medicare', TRUE),
('Medicaid', 'MEDICAID_001', 'medicaid', TRUE),
('Blue Cross Blue Shield', 'BCBS_001', 'commercial', TRUE),
('Aetna', 'AETNA_001', 'commercial', TRUE),
('UnitedHealthcare', 'UHC_001', 'commercial', TRUE),
('Cigna', 'CIGNA_001', 'commercial', TRUE),
('Self Pay', 'SELF_PAY', 'self_pay', TRUE);

-- Insert default user roles
INSERT IGNORE INTO rcm_user_roles (role_name, role_description, permissions) VALUES
('Admin', 'Full system access', '["all"]'),
('Biller', 'Billing and claims management', '["claims", "billing", "payments", "reports"]'),
('Coder', 'Coding and charge capture', '["coding", "encounters", "charges"]'),
('Provider', 'Clinical and basic billing access', '["encounters", "patients", "basic_reports"]'),
('Auditor', 'Read-only access for auditing', '["view_all", "reports", "audit_logs"]'),
('Collections', 'Patient billing and collections', '["patient_billing", "collections", "payment_plans"]');

-- Insert appeal templates
INSERT IGNORE INTO rcm_appeal_templates (template_name, denial_category, template_content, sla_days) VALUES
('Authorization Appeal', 'authorization', 'Dear Claims Review Department,\n\nWe are appealing the denial of claim [CLAIM_NUMBER] for lack of prior authorization...', 30),
('Coding Appeal', 'coding', 'Dear Medical Director,\n\nWe respectfully request reconsideration of the coding denial for claim [CLAIM_NUMBER]...', 45),
('Timely Filing Appeal', 'timely_filing', 'Dear Claims Administrator,\n\nWe are submitting this appeal for claim [CLAIM_NUMBER] regarding timely filing...', 60);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_claims_composite ON rcm_claims(patient_id, payer_id, claim_status, submission_date);
CREATE INDEX IF NOT EXISTS idx_era_processing ON rcm_era_claims(matching_status, posting_status);
CREATE INDEX IF NOT EXISTS idx_denial_analytics ON rcm_denial_cases(denial_category, case_status, denial_date);
CREATE INDEX IF NOT EXISTS idx_patient_balance ON rcm_patient_statements(patient_id, current_balance, statement_date);

-- Summary
SELECT 'Complete RCM Schema Installation Successful!' as Status,
       'All tables, indexes, and sample data created successfully' as Message;