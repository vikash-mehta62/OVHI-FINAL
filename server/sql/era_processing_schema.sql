-- ERA Processing and Office Payments Schema

-- ERA Files Table
CREATE TABLE IF NOT EXISTS era_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT DEFAULT 0,
  total_payments DECIMAL(12,2) DEFAULT 0.00,
  total_adjustments DECIMAL(12,2) DEFAULT 0.00,
  status ENUM('uploaded', 'processing', 'processed', 'error') DEFAULT 'uploaded',
  processed_date DATETIME NULL,
  auto_posted BOOLEAN DEFAULT FALSE,
  error_message TEXT NULL,
  file_path VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_era (provider_id, processed_date),
  INDEX idx_era_status (status, processed_date)
);

-- ERA Payment Details Table
CREATE TABLE IF NOT EXISTS era_payment_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  era_file_id INT NOT NULL,
  claim_id INT NULL,
  patient_id INT NULL,
  service_date DATE NOT NULL,
  billed_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
  reason_codes JSON NULL,
  check_number VARCHAR(50) NULL,
  payer_name VARCHAR(100) NULL,
  patient_name VARCHAR(100) NULL,
  cpt_code VARCHAR(10) NULL,
  status ENUM('pending', 'auto_posted', 'manual_posted', 'rejected') DEFAULT 'pending',
  posted_date DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_era_payments (era_file_id, status),
  INDEX idx_claim_payment (claim_id, status),
  INDEX idx_patient_payment (patient_id, service_date),
  FOREIGN KEY (era_file_id) REFERENCES era_files(id) ON DELETE CASCADE
);

-- Enhanced Patient Payments Table
ALTER TABLE patient_payments 
ADD COLUMN IF NOT EXISTS source_type ENUM('online', 'office', 'era', 'manual') DEFAULT 'online',
ADD COLUMN IF NOT EXISTS check_number VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS cash_received DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS change_given DECIMAL(10,2) NULL,
ADD COLUMN IF NOT EXISTS recorded_by INT NULL,
ADD COLUMN IF NOT EXISTS batch_id VARCHAR(50) NULL;

-- Payment Batches Table (for grouping office payments)
CREATE TABLE IF NOT EXISTS payment_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  batch_date DATE NOT NULL,
  batch_number VARCHAR(50) NOT NULL,
  total_amount DECIMAL(12,2) DEFAULT 0.00,
  payment_count INT DEFAULT 0,
  status ENUM('open', 'closed', 'deposited') DEFAULT 'open',
  created_by INT NOT NULL,
  closed_date DATETIME NULL,
  deposit_date DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_batch (provider_id, batch_date),
  INDEX idx_batch_status (status, batch_date),
  UNIQUE KEY unique_batch_number (provider_id, batch_number)
);

-- ERA Reason Codes Reference Table
CREATE TABLE IF NOT EXISTS era_reason_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  code_type ENUM('CO', 'PR', 'OA', 'PI') NOT NULL,
  description TEXT NOT NULL,
  category ENUM('denial', 'adjustment', 'information') DEFAULT 'adjustment',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reason_code (code, code_type),
  INDEX idx_code_category (category, is_active),
  UNIQUE KEY unique_reason_code (code, code_type)
);

-- Payment Method Configuration
CREATE TABLE IF NOT EXISTS payment_method_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  method_name VARCHAR(50) NOT NULL,
  method_type ENUM('credit_card', 'debit_card', 'cash', 'check', 'ach', 'other') NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  requires_signature BOOLEAN DEFAULT FALSE,
  processing_fee_percent DECIMAL(5,2) DEFAULT 0.00,
  processing_fee_fixed DECIMAL(10,2) DEFAULT 0.00,
  daily_limit DECIMAL(12,2) NULL,
  transaction_limit DECIMAL(10,2) NULL,
  settings JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_methods (provider_id, is_active),
  INDEX idx_method_type (method_type, is_active)
);

-- Office Payment Reconciliation
CREATE TABLE IF NOT EXISTS payment_reconciliation (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  reconciliation_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  expected_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  actual_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  variance_amount DECIMAL(12,2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
  payment_count INT DEFAULT 0,
  status ENUM('pending', 'reconciled', 'variance') DEFAULT 'pending',
  reconciled_by INT NULL,
  reconciled_date DATETIME NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_reconciliation (provider_id, reconciliation_date),
  INDEX idx_reconciliation_status (status, reconciliation_date)
);

-- Insert sample ERA reason codes
INSERT INTO era_reason_codes (code, code_type, description, category) VALUES
-- Contractual Obligation (CO) codes
('CO-45', 'CO', 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement', 'adjustment'),
('CO-97', 'CO', 'The benefit for this service is included in the payment/allowance for another service/procedure', 'adjustment'),
('CO-16', 'CO', 'Claim/service lacks information which is needed for adjudication', 'denial'),
('CO-18', 'CO', 'Duplicate claim/service', 'denial'),
('CO-50', 'CO', 'These are non-covered services because this is not deemed a medical necessity', 'denial'),

-- Patient Responsibility (PR) codes
('PR-1', 'PR', 'Deductible amount', 'adjustment'),
('PR-2', 'PR', 'Coinsurance amount', 'adjustment'),
('PR-3', 'PR', 'Copayment amount', 'adjustment'),
('PR-96', 'PR', 'Non-covered charge(s)', 'denial'),

-- Other Adjustment (OA) codes
('OA-23', 'OA', 'The impact of prior payer(s) adjudication including payments and/or adjustments', 'adjustment'),
('OA-94', 'OA', 'Processed in excess of charges', 'adjustment'),

-- Payer Initiated (PI) codes
('PI-15', 'PI', 'Workers Compensation case settled. Patient is responsible for amount of this claim', 'information')

ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  category = VALUES(category);

-- Insert sample payment method configurations
INSERT INTO payment_method_config (provider_id, method_name, method_type, processing_fee_percent, processing_fee_fixed) VALUES
(1, 'Credit Card', 'credit_card', 2.90, 0.30),
(1, 'Debit Card', 'debit_card', 1.50, 0.25),
(1, 'Cash', 'cash', 0.00, 0.00),
(1, 'Check', 'check', 0.00, 0.00),
(1, 'ACH', 'ach', 0.75, 0.00)

ON DUPLICATE KEY UPDATE 
  processing_fee_percent = VALUES(processing_fee_percent),
  processing_fee_fixed = VALUES(processing_fee_fixed);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_payments_source ON patient_payments(source_type, payment_date);
CREATE INDEX IF NOT EXISTS idx_patient_payments_method ON patient_payments(payment_method, status);
CREATE INDEX IF NOT EXISTS idx_patient_payments_batch ON patient_payments(batch_id);

-- Update existing payment records to set source_type
UPDATE patient_payments 
SET source_type = CASE 
  WHEN transaction_id LIKE 'ERA-%' THEN 'era'
  WHEN transaction_id LIKE 'OFFICE-%' THEN 'office'
  WHEN payment_method IN ('credit_card', 'debit_card') AND transaction_id LIKE 'pi_%' THEN 'online'
  ELSE 'manual'
END
WHERE source_type IS NULL;

-- Summary
SELECT 'ERA Processing Schema Installation Complete!' as Status,
       'Added ERA files, payment details, office payments, and reconciliation tables' as Features;