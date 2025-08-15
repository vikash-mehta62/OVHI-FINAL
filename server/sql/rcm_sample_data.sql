-- RCM Sample Data for Testing and Understanding
-- This file creates sample data for the RCM system

-- Sample CPT Codes
INSERT INTO cpt_codes (code, description, price, category, created_at) VALUES
('99213', 'Office visit, established patient, moderate complexity', 150.00, 'Evaluation & Management', NOW()),
('99214', 'Office visit, established patient, high complexity', 200.00, 'Evaluation & Management', NOW()),
('99215', 'Office visit, established patient, comprehensive', 250.00, 'Evaluation & Management', NOW()),
('99203', 'Office visit, new patient, moderate complexity', 180.00, 'Evaluation & Management', NOW()),
('99204', 'Office visit, new patient, high complexity', 220.00, 'Evaluation & Management', NOW()),
('90834', 'Psychotherapy, 45 minutes', 120.00, 'Mental Health', NOW()),
('90837', 'Psychotherapy, 60 minutes', 160.00, 'Mental Health', NOW()),
('96116', 'Neurobehavioral status exam', 300.00, 'Testing', NOW()),
('96118', 'Neuropsychological testing', 400.00, 'Testing', NOW()),
('90791', 'Psychiatric diagnostic evaluation', 250.00, 'Mental Health', NOW());

-- Sample Patient Profiles (assuming some exist)
-- Note: This assumes user_profiles table exists with patients

-- Sample CPT Billing Records
INSERT INTO cpt_billing (patient_id, cpt_code_id, code_units, status, created, billed_date, notes) VALUES
-- Recent claims (last 30 days)
(101, 1, 1, 2, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'Routine follow-up visit'),
(102, 2, 1, 2, DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY), 'Complex case management'),
(103, 3, 1, 1, DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), 'Comprehensive evaluation'),
(104, 4, 1, 2, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), 'New patient consultation'),
(105, 5, 1, 3, DATE_SUB(NOW(), INTERVAL 15 DAY), DATE_SUB(NOW(), INTERVAL 13 DAY), 'High complexity visit - denied for documentation'),
(106, 6, 1, 2, DATE_SUB(NOW(), INTERVAL 18 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY), 'Therapy session completed'),
(107, 7, 1, 1, DATE_SUB(NOW(), INTERVAL 20 DAY), DATE_SUB(NOW(), INTERVAL 18 DAY), 'Extended therapy session'),
(108, 8, 1, 2, DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 20 DAY), 'Neuropsychological assessment'),
(109, 9, 1, 3, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 23 DAY), 'Testing denied - prior auth required'),
(110, 10, 1, 2, DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 26 DAY), 'Psychiatric evaluation'),

-- Older claims for A/R aging (31-60 days)
(101, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 35 DAY), DATE_SUB(NOW(), INTERVAL 33 DAY), 'Pending insurance review'),
(102, 2, 1, 1, DATE_SUB(NOW(), INTERVAL 40 DAY), DATE_SUB(NOW(), INTERVAL 38 DAY), 'Awaiting prior authorization'),
(103, 6, 1, 1, DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_SUB(NOW(), INTERVAL 43 DAY), 'Under payer review'),
(104, 7, 1, 3, DATE_SUB(NOW(), INTERVAL 50 DAY), DATE_SUB(NOW(), INTERVAL 48 DAY), 'Denied - insufficient documentation'),
(105, 8, 1, 1, DATE_SUB(NOW(), INTERVAL 55 DAY), DATE_SUB(NOW(), INTERVAL 53 DAY), 'Claim in process'),

-- Older claims for A/R aging (61-90 days)
(106, 3, 1, 1, DATE_SUB(NOW(), INTERVAL 65 DAY), DATE_SUB(NOW(), INTERVAL 63 DAY), 'Long pending claim'),
(107, 4, 1, 1, DATE_SUB(NOW(), INTERVAL 70 DAY), DATE_SUB(NOW(), INTERVAL 68 DAY), 'Insurance verification needed'),
(108, 5, 1, 3, DATE_SUB(NOW(), INTERVAL 75 DAY), DATE_SUB(NOW(), INTERVAL 73 DAY), 'Denied - coding error'),
(109, 9, 1, 1, DATE_SUB(NOW(), INTERVAL 80 DAY), DATE_SUB(NOW(), INTERVAL 78 DAY), 'Awaiting appeal decision'),
(110, 10, 1, 1, DATE_SUB(NOW(), INTERVAL 85 DAY), DATE_SUB(NOW(), INTERVAL 83 DAY), 'Under review'),

-- Very old claims (120+ days)
(101, 2, 1, 1, DATE_SUB(NOW(), INTERVAL 125 DAY), DATE_SUB(NOW(), INTERVAL 123 DAY), 'Collections candidate'),
(102, 3, 1, 3, DATE_SUB(NOW(), INTERVAL 130 DAY), DATE_SUB(NOW(), INTERVAL 128 DAY), 'Final denial received'),
(103, 4, 1, 1, DATE_SUB(NOW(), INTERVAL 135 DAY), DATE_SUB(NOW(), INTERVAL 133 DAY), 'Write-off candidate'),
(104, 8, 1, 1, DATE_SUB(NOW(), INTERVAL 140 DAY), DATE_SUB(NOW(), INTERVAL 138 DAY), 'Patient responsibility'),
(105, 9, 1, 1, DATE_SUB(NOW(), INTERVAL 145 DAY), DATE_SUB(NOW(), INTERVAL 143 DAY), 'Collections agency referral');

-- Sample Patient Claims (ClaimMD integration data)
INSERT INTO patient_claims (patient_id, claim_md_tracking_id, payer_name, policy_number, group_number, billing_ids, status, created_at) VALUES
(101, 'CMD-2024-001', 'Blue Cross Blue Shield', 'BCBS123456', 'GRP001', '1,11,21', 'submitted', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(102, 'CMD-2024-002', 'Aetna', 'AET789012', 'GRP002', '2,12', 'paid', DATE_SUB(NOW(), INTERVAL 7 DAY)),
(103, 'CMD-2024-003', 'UnitedHealthcare', 'UHC345678', 'GRP003', '3,13,22', 'submitted', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(104, 'CMD-2024-004', 'Cigna', 'CIG901234', 'GRP004', '4,14', 'paid', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(105, 'CMD-2024-005', 'Humana', 'HUM567890', 'GRP005', '5,15,23', 'denied', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(106, 'CMD-2024-006', 'Medicare', 'MED123456', '', '6,16', 'paid', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(107, 'CMD-2024-007', 'Medicaid', 'MCD789012', '', '7,17', 'submitted', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(108, 'CMD-2024-008', 'Blue Cross Blue Shield', 'BCBS234567', 'GRP001', '8,18,24', 'paid', DATE_SUB(NOW(), INTERVAL 22 DAY)),
(109, 'CMD-2024-009', 'Aetna', 'AET890123', 'GRP002', '9,19', 'denied', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(110, 'CMD-2024-010', 'UnitedHealthcare', 'UHC456789', 'GRP003', '10,20,25', 'paid', DATE_SUB(NOW(), INTERVAL 28 DAY));

-- Sample Patient Diagnoses
INSERT INTO patient_diagnoses (patient_id, diagnosis_code, diagnosis_description, created_at) VALUES
(101, 'F32.9', 'Major depressive disorder, single episode, unspecified', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(102, 'F41.1', 'Generalized anxiety disorder', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(103, 'F43.10', 'Post-traumatic stress disorder, unspecified', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(104, 'F90.9', 'Attention-deficit hyperactivity disorder, unspecified type', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(105, 'F84.0', 'Autistic disorder', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(106, 'F32.1', 'Major depressive disorder, single episode, moderate', DATE_SUB(NOW(), INTERVAL 35 DAY)),
(107, 'F41.9', 'Anxiety disorder, unspecified', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(108, 'F43.12', 'Post-traumatic stress disorder, chronic', DATE_SUB(NOW(), INTERVAL 45 DAY)),
(109, 'F90.1', 'Attention-deficit hyperactivity disorder, predominantly hyperactive type', DATE_SUB(NOW(), INTERVAL 50 DAY)),
(110, 'F33.1', 'Major depressive disorder, recurrent, moderate', DATE_SUB(NOW(), INTERVAL 55 DAY));

-- Update users_mappings to link patients to a provider (assuming provider user_id = 1)
-- Note: This assumes the users_mappings table exists and provider has user_id = 1
INSERT INTO users_mappings (user_id, fk_physician_id, created_at) VALUES
(101, 1, DATE_SUB(NOW(), INTERVAL 60 DAY)),
(102, 1, DATE_SUB(NOW(), INTERVAL 55 DAY)),
(103, 1, DATE_SUB(NOW(), INTERVAL 50 DAY)),
(104, 1, DATE_SUB(NOW(), INTERVAL 45 DAY)),
(105, 1, DATE_SUB(NOW(), INTERVAL 40 DAY)),
(106, 1, DATE_SUB(NOW(), INTERVAL 35 DAY)),
(107, 1, DATE_SUB(NOW(), INTERVAL 30 DAY)),
(108, 1, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(109, 1, DATE_SUB(NOW(), INTERVAL 20 DAY)),
(110, 1, DATE_SUB(NOW(), INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE fk_physician_id = 1;

-- Sample user profiles for patients (if they don't exist)
INSERT INTO user_profiles (fk_userid, firstname, lastname, dob, phone, email, created_at) VALUES
(101, 'John', 'Smith', '1985-03-15', '555-0101', 'john.smith@email.com', DATE_SUB(NOW(), INTERVAL 60 DAY)),
(102, 'Sarah', 'Johnson', '1990-07-22', '555-0102', 'sarah.johnson@email.com', DATE_SUB(NOW(), INTERVAL 55 DAY)),
(103, 'Michael', 'Brown', '1978-11-08', '555-0103', 'michael.brown@email.com', DATE_SUB(NOW(), INTERVAL 50 DAY)),
(104, 'Emily', 'Davis', '1995-01-30', '555-0104', 'emily.davis@email.com', DATE_SUB(NOW(), INTERVAL 45 DAY)),
(105, 'David', 'Wilson', '1982-09-12', '555-0105', 'david.wilson@email.com', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(106, 'Lisa', 'Anderson', '1988-05-18', '555-0106', 'lisa.anderson@email.com', DATE_SUB(NOW(), INTERVAL 35 DAY)),
(107, 'Robert', 'Taylor', '1975-12-03', '555-0107', 'robert.taylor@email.com', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(108, 'Jennifer', 'Martinez', '1992-08-25', '555-0108', 'jennifer.martinez@email.com', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(109, 'Christopher', 'Garcia', '1987-04-14', '555-0109', 'christopher.garcia@email.com', DATE_SUB(NOW(), INTERVAL 20 DAY)),
(110, 'Amanda', 'Rodriguez', '1993-10-07', '555-0110', 'amanda.rodriguez@email.com', DATE_SUB(NOW(), INTERVAL 15 DAY))
ON DUPLICATE KEY UPDATE 
  firstname = VALUES(firstname),
  lastname = VALUES(lastname),
  dob = VALUES(dob),
  phone = VALUES(phone),
  email = VALUES(email);

-- Create payment gateway configuration table
CREATE TABLE IF NOT EXISTS payment_gateways (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  gateway_name VARCHAR(50) NOT NULL,
  gateway_type ENUM('stripe', 'square', 'paypal', 'authorize_net') NOT NULL,
  api_key VARCHAR(255),
  secret_key VARCHAR(255),
  webhook_secret VARCHAR(255),
  is_sandbox BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT FALSE,
  configuration JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_gateway (provider_id, gateway_name)
);

-- Create patient payments table
CREATE TABLE IF NOT EXISTS patient_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  billing_id INT,
  payment_gateway_id INT,
  transaction_id VARCHAR(100),
  payment_method ENUM('credit_card', 'debit_card', 'ach', 'cash', 'check') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  fee_amount DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status ENUM('pending', 'completed', 'failed', 'refunded', 'cancelled') DEFAULT 'pending',
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT,
  card_last_four VARCHAR(4),
  card_brand VARCHAR(20),
  receipt_url VARCHAR(500),
  refund_reason TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_payment (patient_id, payment_date),
  INDEX idx_provider_payment (provider_id, payment_date),
  INDEX idx_billing_payment (billing_id),
  INDEX idx_transaction (transaction_id),
  FOREIGN KEY (billing_id) REFERENCES cpt_billing(id) ON DELETE SET NULL
);

-- Create payment plans table
CREATE TABLE IF NOT EXISTS payment_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  monthly_amount DECIMAL(10,2) NOT NULL,
  remaining_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('active', 'completed', 'cancelled', 'defaulted') DEFAULT 'active',
  auto_pay BOOLEAN DEFAULT FALSE,
  payment_method_id VARCHAR(100),
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_patient_plan (patient_id, status),
  INDEX idx_provider_plan (provider_id, status),
  INDEX idx_next_payment (next_payment_date, status)
);

-- Sample payment gateway configuration
INSERT INTO payment_gateways (provider_id, gateway_name, gateway_type, api_key, secret_key, is_sandbox, is_active, configuration) VALUES
(1, 'Stripe Payment Gateway', 'stripe', 'pk_test_sample_key', 'sk_test_sample_secret', TRUE, TRUE, 
 JSON_OBJECT(
   'webhook_endpoint', 'https://yourapp.com/api/v1/payments/stripe/webhook',
   'success_url', 'https://yourapp.com/payment/success',
   'cancel_url', 'https://yourapp.com/payment/cancel',
   'currency', 'USD',
   'capture_method', 'automatic'
 )),
(1, 'Square Payment Gateway', 'square', 'sandbox-sq0idb-sample', 'sandbox-sq0csb-sample', TRUE, FALSE,
 JSON_OBJECT(
   'application_id', 'sandbox-sq0idb-sample',
   'location_id', 'sample-location-id',
   'webhook_signature_key', 'sample-webhook-key',
   'environment', 'sandbox'
 ));

-- Sample payment records
INSERT INTO patient_payments (patient_id, provider_id, billing_id, payment_gateway_id, transaction_id, payment_method, amount, fee_amount, net_amount, status, payment_date, description, card_last_four, card_brand) VALUES
(101, 1, 1, 1, 'pi_sample_001', 'credit_card', 150.00, 4.65, 145.35, 'completed', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Payment for office visit', '4242', 'Visa'),
(102, 1, 2, 1, 'pi_sample_002', 'credit_card', 200.00, 6.10, 193.90, 'completed', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Payment for complex visit', '1234', 'MasterCard'),
(104, 1, 4, 1, 'pi_sample_003', 'credit_card', 180.00, 5.52, 174.48, 'completed', DATE_SUB(NOW(), INTERVAL 10 DAY), 'New patient consultation', '5678', 'Visa'),
(106, 1, 6, 1, 'pi_sample_004', 'credit_card', 120.00, 3.78, 116.22, 'completed', DATE_SUB(NOW(), INTERVAL 16 DAY), 'Therapy session payment', '9012', 'American Express'),
(108, 1, 8, 1, 'pi_sample_005', 'credit_card', 300.00, 9.00, 291.00, 'completed', DATE_SUB(NOW(), INTERVAL 20 DAY), 'Neuropsychological assessment', '3456', 'Visa'),
(110, 1, 10, 1, 'pi_sample_006', 'credit_card', 250.00, 7.50, 242.50, 'completed', DATE_SUB(NOW(), INTERVAL 26 DAY), 'Psychiatric evaluation', '7890', 'MasterCard');

-- Sample payment plan
INSERT INTO payment_plans (patient_id, provider_id, total_amount, monthly_amount, remaining_amount, start_date, end_date, status, auto_pay, next_payment_date) VALUES
(103, 1, 600.00, 100.00, 400.00, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 4 MONTH), 'active', TRUE, DATE_ADD(NOW(), INTERVAL 1 MONTH)),
(105, 1, 450.00, 75.00, 300.00, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 4 MONTH), 'active', FALSE, DATE_ADD(NOW(), INTERVAL 15 DAY));

-- Summary of sample data created:
-- ✅ 10 CPT codes covering common procedures
-- ✅ 25 billing records with various statuses and dates for A/R aging
-- ✅ 10 patient claims with ClaimMD tracking
-- ✅ 10 patient diagnoses
-- ✅ 10 patient profiles
-- ✅ Patient-provider mappings
-- ✅ Payment gateway configuration tables
-- ✅ Sample payment records
-- ✅ Payment plan examples

SELECT 'RCM Sample Data Installation Complete!' as Status;