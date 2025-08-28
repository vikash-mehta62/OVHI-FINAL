-- Payment Posting Engine Schema
-- This schema supports ERA processing and automated payment posting

-- ERA Payments table
CREATE TABLE IF NOT EXISTS era_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_number VARCHAR(100) NOT NULL UNIQUE,
    provider_id INT NOT NULL,
    payer_name VARCHAR(255) NOT NULL,
    check_number VARCHAR(100),
    check_date DATE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    claims_count INT NOT NULL DEFAULT 0,
    status ENUM('pending', 'processing', 'posted', 'exception') DEFAULT 'pending',
    auto_posted BOOLEAN DEFAULT FALSE,
    exceptions JSON,
    file_path VARCHAR(500),
    created_by INT NOT NULL,
    processed_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_status (status),
    INDEX idx_payer_name (payer_name),
    INDEX idx_check_date (check_date)
);

-- ERA Payment Details table
CREATE TABLE IF NOT EXISTS era_payment_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_id INT NOT NULL,
    claim_id VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255),
    service_date DATE,
    charged_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    adjustment_reason VARCHAR(500),
    adjustment_code VARCHAR(20),
    status ENUM('posted', 'exception', 'pending') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (era_id) REFERENCES era_payments(id) ON DELETE CASCADE,
    INDEX idx_era_id (era_id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_status (status)
);

-- Payment Postings table
CREATE TABLE IF NOT EXISTS payment_postings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    claim_id VARCHAR(50) NOT NULL,
    era_id INT,
    patient_id VARCHAR(50),
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    adjustment_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    adjustment_reason VARCHAR(500),
    adjustment_code VARCHAR(20),
    posted_date DATE NOT NULL,
    posted_by INT NOT NULL,
    auto_posted BOOLEAN DEFAULT FALSE,
    payment_method ENUM('insurance', 'patient', 'other') DEFAULT 'insurance',
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (era_id) REFERENCES era_payments(id) ON DELETE SET NULL,
    INDEX idx_claim_id (claim_id),
    INDEX idx_era_id (era_id),
    INDEX idx_posted_date (posted_date),
    INDEX idx_posted_by (posted_by)
);

-- Payment Posting Rules table
CREATE TABLE IF NOT EXISTS payment_posting_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_name VARCHAR(255) NOT NULL,
    provider_id INT NOT NULL,
    payer_name VARCHAR(255),
    rule_type ENUM('auto_post', 'exception', 'validation') DEFAULT 'auto_post',
    conditions JSON NOT NULL,
    actions JSON NOT NULL,
    confidence_threshold INT DEFAULT 95,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id),
    INDEX idx_rule_type (rule_type),
    INDEX idx_is_active (is_active)
);

-- Payment Posting Audit table
CREATE TABLE IF NOT EXISTS payment_posting_audit (
    id INT PRIMARY KEY AUTO_INCREMENT,
    era_id INT,
    claim_id VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    old_values JSON,
    new_values JSON,
    confidence_score INT,
    auto_posted BOOLEAN DEFAULT FALSE,
    performed_by INT NOT NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (era_id) REFERENCES era_payments(id) ON DELETE CASCADE,
    INDEX idx_era_id (era_id),
    INDEX idx_claim_id (claim_id),
    INDEX idx_performed_at (performed_at)
);

-- Auto-posting Configuration table
CREATE TABLE IF NOT EXISTS auto_posting_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL UNIQUE,
    enabled BOOLEAN DEFAULT TRUE,
    confidence_threshold INT DEFAULT 95,
    max_amount_threshold DECIMAL(10,2) DEFAULT 1000.00,
    require_exact_match BOOLEAN DEFAULT TRUE,
    auto_post_adjustments BOOLEAN DEFAULT FALSE,
    notification_settings JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_provider_id (provider_id)
);

-- Insert default auto-posting rules
INSERT IGNORE INTO payment_posting_rules (rule_name, provider_id, rule_type, conditions, actions, created_by) VALUES
('Exact Amount Match', 0, 'auto_post', '{"paid_amount": "equals_charged", "claim_found": true}', '{"auto_post": true, "confidence": 100}', 1),
('Partial Payment', 0, 'validation', '{"paid_amount": "less_than_charged", "adjustment_present": true}', '{"require_review": true, "confidence": 80}', 1),
('Overpayment', 0, 'exception', '{"paid_amount": "greater_than_charged"}', '{"create_exception": true, "notify": true}', 1),
('Claim Not Found', 0, 'exception', '{"claim_found": false}', '{"create_exception": true, "message": "Claim not found in system"}', 1);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_era_payments_provider_status ON era_payments(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_postings_claim_date ON payment_postings(claim_id, posted_date);
CREATE INDEX IF NOT EXISTS idx_era_details_era_claim ON era_payment_details(era_id, claim_id);

-- Create views for reporting
CREATE OR REPLACE VIEW payment_posting_summary AS
SELECT 
    ep.id as era_id,
    ep.era_number,
    ep.payer_name,
    ep.check_number,
    ep.check_date,
    ep.total_amount,
    ep.claims_count,
    ep.status,
    ep.auto_posted,
    COUNT(DISTINCT epd.id) as detail_count,
    SUM(epd.paid_amount) as total_paid,
    SUM(epd.adjustment_amount) as total_adjustments,
    COUNT(CASE WHEN epd.status = 'posted' THEN 1 END) as posted_count,
    COUNT(CASE WHEN epd.status = 'exception' THEN 1 END) as exception_count
FROM era_payments ep
LEFT JOIN era_payment_details epd ON ep.id = epd.era_id
GROUP BY ep.id;

-- Create view for auto-posting statistics
CREATE OR REPLACE VIEW auto_posting_stats AS
SELECT 
    DATE(pp.posted_date) as posting_date,
    COUNT(*) as total_postings,
    SUM(CASE WHEN pp.auto_posted = true THEN 1 ELSE 0 END) as auto_postings,
    SUM(pp.paid_amount) as total_amount,
    SUM(CASE WHEN pp.auto_posted = true THEN pp.paid_amount ELSE 0 END) as auto_posted_amount,
    ROUND(
        (SUM(CASE WHEN pp.auto_posted = true THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
    ) as auto_posting_percentage
FROM payment_postings pp
WHERE pp.posted_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(pp.posted_date)
ORDER BY posting_date DESC;

-- Sample data for testing
INSERT IGNORE INTO era_payments (era_number, provider_id, payer_name, check_number, check_date, total_amount, claims_count, status, created_by) VALUES
('ERA-2024-001', 1, 'Blue Cross Blue Shield', 'CHK123456', '2024-01-15', 15420.50, 25, 'posted', 1),
('ERA-2024-002', 1, 'Aetna', 'CHK789012', '2024-01-16', 8750.25, 18, 'processing', 1),
('ERA-2024-003', 1, 'Medicare', 'CHK345678', '2024-01-17', 12300.75, 32, 'exception', 1);

INSERT IGNORE INTO era_payment_details (era_id, claim_id, patient_name, service_date, charged_amount, paid_amount, adjustment_amount, status) VALUES
(1, 'CLM001', 'John Smith', '2024-01-10', 250.00, 200.00, 50.00, 'posted'),
(1, 'CLM002', 'Jane Doe', '2024-01-11', 180.00, 180.00, 0.00, 'posted'),
(2, 'CLM003', 'Bob Johnson', '2024-01-12', 320.00, 0.00, 0.00, 'exception');

INSERT IGNORE INTO auto_posting_config (provider_id, enabled, confidence_threshold, max_amount_threshold) VALUES
(1, true, 95, 1000.00);