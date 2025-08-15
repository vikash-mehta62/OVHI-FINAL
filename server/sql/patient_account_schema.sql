-- Patient Account Management Schema
-- This schema supports comprehensive billing, claims, and payment tracking

-- Claims table for tracking insurance claims
CREATE TABLE IF NOT EXISTS claims (
    claim_id VARCHAR(50) PRIMARY KEY,
    patient_id INT NOT NULL,
    provider_id INT NOT NULL,
    service_date DATE NOT NULL,
    submitted_date DATE NOT NULL,
    insurance_company VARCHAR(255) NOT NULL,
    status ENUM('submitted', 'pending', 'paid', 'denied', 'appealed', 'voided', 'corrected') DEFAULT 'submitted',
    billed_amount DECIMAL(10,2) NOT NULL,
    allowed_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
    denial_code VARCHAR(20) NULL,
    denial_reason TEXT NULL,
    appeal_deadline DATE NULL,
    days_since_submission INT GENERATED ALWAYS AS (DATEDIFF(CURDATE(), submitted_date)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patientId) ON DELETE CASCADE,
    INDEX idx_patient_claims (patient_id),
    INDEX idx_claim_status (status),
    INDEX idx_service_date (service_date)
);

-- Claim line items for CPT codes and services
CREATE TABLE IF NOT EXISTS claim_line_items (
    line_item_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id VARCHAR(50) NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    description VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_charge DECIMAL(10,2) NOT NULL,
    allowed_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'paid', 'denied', 'adjusted') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_lines (claim_id),
    INDEX idx_cpt_code (cpt_code)
);

-- Claim activity log for tracking all claim events
CREATE TABLE IF NOT EXISTS claim_activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id VARCHAR(50) NOT NULL,
    activity_type ENUM('submitted', 'processed', 'paid', 'denied', 'appealed', 'voided', 'corrected', 'comment_added') NOT NULL,
    description TEXT NOT NULL,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON NULL,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_activity (claim_id),
    INDEX idx_activity_date (performed_at)
);

-- Claim comments for biller notes and communication
CREATE TABLE IF NOT EXISTS claim_comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id VARCHAR(50) NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type ENUM('note', 'action_required', 'follow_up', 'resolution') DEFAULT 'note',
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_internal BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE CASCADE,
    INDEX idx_claim_comments (claim_id),
    INDEX idx_comment_date (created_at)
);

-- Payments table for tracking all payments (insurance and patient)
CREATE TABLE IF NOT EXISTS patient_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    claim_id VARCHAR(50) NULL,
    payment_type ENUM('insurance', 'patient', 'adjustment', 'refund') NOT NULL,
    payment_method ENUM('cash', 'check', 'credit_card', 'debit_card', 'ach', 'wire', 'insurance_check') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR(100) NULL,
    payer_name VARCHAR(255) NULL,
    check_number VARCHAR(50) NULL,
    transaction_id VARCHAR(100) NULL,
    applied_to_service_date DATE NULL,
    status ENUM('pending', 'posted', 'voided', 'refunded') DEFAULT 'posted',
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE SET NULL,
    INDEX idx_patient_payments (patient_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_payment_type (payment_type)
);

-- Adjustments table for tracking contractual and other adjustments
CREATE TABLE IF NOT EXISTS payment_adjustments (
    adjustment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    claim_id VARCHAR(50) NULL,
    adjustment_type ENUM('contractual', 'write_off', 'bad_debt', 'courtesy', 'insurance_adjustment') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    adjustment_date DATE NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100) NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patientId) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE SET NULL,
    INDEX idx_patient_adjustments (patient_id),
    INDEX idx_adjustment_date (adjustment_date)
);

-- Patient statements table
CREATE TABLE IF NOT EXISTS patient_statements (
    statement_id VARCHAR(50) PRIMARY KEY,
    patient_id INT NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_charges DECIMAL(10,2) NOT NULL,
    total_payments DECIMAL(10,2) NOT NULL,
    total_adjustments DECIMAL(10,2) NOT NULL,
    balance_due DECIMAL(10,2) NOT NULL,
    status ENUM('generated', 'sent', 'viewed', 'paid', 'overdue') DEFAULT 'generated',
    sent_date DATE NULL,
    sent_method ENUM('email', 'mail', 'portal') NULL,
    include_services_from DATE NOT NULL,
    include_services_to DATE NOT NULL,
    additional_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES patients(patientId) ON DELETE CASCADE,
    INDEX idx_patient_statements (patient_id),
    INDEX idx_statement_date (statement_date)
);

-- Statement line items
CREATE TABLE IF NOT EXISTS statement_line_items (
    line_id INT AUTO_INCREMENT PRIMARY KEY,
    statement_id VARCHAR(50) NOT NULL,
    service_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    charges DECIMAL(10,2) NOT NULL,
    payments DECIMAL(10,2) DEFAULT 0.00,
    adjustments DECIMAL(10,2) DEFAULT 0.00,
    balance DECIMAL(10,2) NOT NULL,
    claim_id VARCHAR(50) NULL,
    FOREIGN KEY (statement_id) REFERENCES patient_statements(statement_id) ON DELETE CASCADE,
    FOREIGN KEY (claim_id) REFERENCES claims(claim_id) ON DELETE SET NULL,
    INDEX idx_statement_lines (statement_id)
);

-- Account summary view for quick financial overview
CREATE OR REPLACE VIEW patient_account_summary AS
SELECT 
    p.patientId as patient_id,
    CONCAT(p.firstName, ' ', p.lastName) as patient_name,
    COALESCE(charges.total_charges, 0) as total_charges,
    COALESCE(payments.total_payments, 0) as total_payments,
    COALESCE(adjustments.total_adjustments, 0) as total_adjustments,
    COALESCE(insurance_payments.insurance_paid, 0) as insurance_paid,
    COALESCE(patient_payments.patient_paid, 0) as patient_paid,
    (COALESCE(charges.total_charges, 0) - COALESCE(payments.total_payments, 0) - COALESCE(adjustments.total_adjustments, 0)) as outstanding_balance,
    COALESCE(pending_claims.pending_amount, 0) as insurance_pending
FROM patients p
LEFT JOIN (
    SELECT 
        c.patient_id,
        SUM(c.billed_amount) as total_charges
    FROM claims c
    WHERE c.status != 'voided'
    GROUP BY c.patient_id
) charges ON p.patientId = charges.patient_id
LEFT JOIN (
    SELECT 
        pp.patient_id,
        SUM(pp.amount) as total_payments
    FROM patient_payments pp
    WHERE pp.status = 'posted'
    GROUP BY pp.patient_id
) payments ON p.patientId = payments.patient_id
LEFT JOIN (
    SELECT 
        pa.patient_id,
        SUM(pa.amount) as total_adjustments
    FROM payment_adjustments pa
    GROUP BY pa.patient_id
) adjustments ON p.patientId = adjustments.patient_id
LEFT JOIN (
    SELECT 
        pp.patient_id,
        SUM(pp.amount) as insurance_paid
    FROM patient_payments pp
    WHERE pp.payment_type = 'insurance' AND pp.status = 'posted'
    GROUP BY pp.patient_id
) insurance_payments ON p.patientId = insurance_payments.patient_id
LEFT JOIN (
    SELECT 
        pp.patient_id,
        SUM(pp.amount) as patient_paid
    FROM patient_payments pp
    WHERE pp.payment_type = 'patient' AND pp.status = 'posted'
    GROUP BY pp.patient_id
) patient_payments ON p.patientId = patient_payments.patient_id
LEFT JOIN (
    SELECT 
        c.patient_id,
        SUM(c.billed_amount - c.paid_amount) as pending_amount
    FROM claims c
    WHERE c.status IN ('submitted', 'pending')
    GROUP BY c.patient_id
) pending_claims ON p.patientId = pending_claims.patient_id;

-- Insert sample data for testing
INSERT IGNORE INTO claims (claim_id, patient_id, provider_id, service_date, submitted_date, insurance_company, status, billed_amount, allowed_amount, paid_amount, patient_responsibility, created_by) VALUES
('CLM-2024-001', 30474, 1, '2024-01-15', '2024-01-16', 'Blue Cross Blue Shield', 'paid', 400.00, 320.00, 300.00, 70.00, 1),
('CLM-2024-002', 30474, 1, '2024-02-10', '2024-02-11', 'Aetna', 'denied', 350.00, 0.00, 0.00, 350.00, 1);

INSERT IGNORE INTO claim_line_items (claim_id, cpt_code, description, quantity, unit_price, total_charge, allowed_amount, paid_amount, adjustment_amount, patient_responsibility, status) VALUES
('CLM-2024-001', '99213', 'Office Visit - Established Patient', 1, 250.00, 250.00, 200.00, 180.00, 20.00, 50.00, 'paid'),
('CLM-2024-001', '93000', 'EKG', 1, 150.00, 150.00, 120.00, 120.00, 10.00, 20.00, 'paid'),
('CLM-2024-002', '99214', 'Office Visit - Complex', 1, 350.00, 350.00, 0.00, 0.00, 0.00, 350.00, 'denied');

INSERT IGNORE INTO claim_activity_log (claim_id, activity_type, description, performed_by) VALUES
('CLM-2024-001', 'submitted', 'Claim submitted electronically to Blue Cross Blue Shield', 1),
('CLM-2024-001', 'processed', 'Insurance processed claim with adjustments', 1),
('CLM-2024-001', 'paid', 'Payment received from insurance', 1),
('CLM-2024-002', 'submitted', 'Claim submitted electronically to Aetna', 1),
('CLM-2024-002', 'denied', 'Claim denied - CO-97: Benefit for this service not provided', 1);

INSERT IGNORE INTO claim_comments (claim_id, comment_text, created_by) VALUES
('CLM-2024-001', 'Claim processed successfully. Standard contractual adjustment applied. Patient copay collected at time of service.', 1),
('CLM-2024-001', 'Claim submitted electronically. All required fields completed. Expecting processing within 14 business days.', 1),
('CLM-2024-002', 'Claim denied for lack of medical necessity. Review documentation and consider appeal with additional clinical notes.', 1);

INSERT IGNORE INTO patient_payments (patient_id, claim_id, payment_type, payment_method, amount, payment_date, payer_name, reference_number, created_by) VALUES
(30474, 'CLM-2024-001', 'patient', 'credit_card', 50.00, '2024-01-15', 'Patient Copay', 'CC-****1234', 1),
(30474, 'CLM-2024-001', 'insurance', 'insurance_check', 300.00, '2024-01-25', 'Blue Cross Blue Shield', 'CHK-123456', 1);

INSERT IGNORE INTO payment_adjustments (patient_id, claim_id, adjustment_type, amount, adjustment_date, reason, created_by) VALUES
(30474, 'CLM-2024-001', 'contractual', 80.00, '2024-01-25', 'Standard contractual adjustment per insurance contract', 1);