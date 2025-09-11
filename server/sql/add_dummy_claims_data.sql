-- Add Dummy Claims Data for Testing
-- This script creates billings table if not exists and adds sample claims data

-- Create billings table if it doesn't exist
CREATE TABLE IF NOT EXISTS billings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    provider_id INT DEFAULT 1,
    claim_number VARCHAR(100),
    procedure_code VARCHAR(10) NOT NULL,
    diagnosis_code VARCHAR(10),
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_date DATE NOT NULL,
    submission_date DATE,
    status INT DEFAULT 0 COMMENT '0=draft, 1=submitted, 2=paid, 3=denied, 4=appealed',
    notes TEXT,
    payer_name VARCHAR(255),
    created DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_id (patient_id),
    INDEX idx_provider_id (provider_id),
    INDEX idx_status (status),
    INDEX idx_service_date (service_date),
    INDEX idx_created (created)
);

-- Create user_profiles table if it doesn't exist (for patient data)
CREATE TABLE IF NOT EXISTS user_profiles (
    fk_userid INT PRIMARY KEY,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    phone VARCHAR(20),
    work_email VARCHAR(100),
    dob DATE,
    gender VARCHAR(10),
    address_line VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(10),
    service_type JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT,
    patient_id INT,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Electronic',
    check_number VARCHAR(50),
    adjustment_amount DECIMAL(10,2) DEFAULT 0.00,
    adjustment_reason TEXT,
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    posted_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (claim_id) REFERENCES billings(id) ON DELETE CASCADE,
    INDEX idx_claim_id (claim_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_payment_date (payment_date)
);

-- Insert dummy patient profiles
INSERT IGNORE INTO user_profiles (fk_userid, firstname, lastname, phone, work_email, dob, gender, address_line, city, state, zip, service_type) VALUES
(101, 'John', 'Smith', '555-0101', 'john.smith@email.com', '1985-03-15', 'Male', '123 Main St', 'Anytown', 'CA', '12345', '[1,2]'),
(102, 'Sarah', 'Johnson', '555-0102', 'sarah.johnson@email.com', '1990-07-22', 'Female', '456 Oak Ave', 'Springfield', 'NY', '67890', '[1,2]'),
(103, 'Michael', 'Brown', '555-0103', 'michael.brown@email.com', '1978-11-08', 'Male', '789 Pine Rd', 'Madison', 'TX', '54321', '[1,2]'),
(104, 'Emily', 'Davis', '555-0104', 'emily.davis@email.com', '1995-01-30', 'Female', '321 Elm St', 'Franklin', 'FL', '98765', '[1,2]'),
(105, 'David', 'Wilson', '555-0105', 'david.wilson@email.com', '1982-09-12', 'Male', '654 Maple Dr', 'Georgetown', 'WA', '13579', '[1,2]'),
(106, 'Lisa', 'Anderson', '555-0106', 'lisa.anderson@email.com', '1988-05-18', 'Female', '987 Cedar Ln', 'Riverside', 'OR', '24680', '[1,2]'),
(107, 'Robert', 'Taylor', '555-0107', 'robert.taylor@email.com', '1975-12-03', 'Male', '147 Birch Way', 'Fairview', 'CO', '97531', '[1,2]'),
(108, 'Jennifer', 'Martinez', '555-0108', 'jennifer.martinez@email.com', '1992-08-25', 'Female', '258 Spruce Ct', 'Hillside', 'AZ', '86420', '[1,2]'),
(109, 'Christopher', 'Garcia', '555-0109', 'christopher.garcia@email.com', '1987-04-14', 'Male', '369 Willow Pl', 'Lakewood', 'NV', '75319', '[1,2]'),
(110, 'Amanda', 'Rodriguez', '555-0110', 'amanda.rodriguez@email.com', '1993-10-07', 'Female', '741 Poplar Ave', 'Greenfield', 'UT', '64208', '[1,2]'),
(111, 'James', 'Lee', '555-0111', 'james.lee@email.com', '1980-06-20', 'Male', '852 Ash St', 'Brookfield', 'ID', '95173', '[1,2]'),
(112, 'Michelle', 'White', '555-0112', 'michelle.white@email.com', '1991-02-14', 'Female', '963 Hickory Rd', 'Clearwater', 'MT', '84062', '[1,2]'),
(113, 'Kevin', 'Thompson', '555-0113', 'kevin.thompson@email.com', '1986-09-28', 'Male', '159 Walnut Dr', 'Midtown', 'WY', '73951', '[1,2]'),
(114, 'Rachel', 'Harris', '555-0114', 'rachel.harris@email.com', '1994-12-11', 'Female', '357 Cherry Ln', 'Westside', 'ND', '62840', '[1,2]'),
(115, 'Daniel', 'Clark', '555-0115', 'daniel.clark@email.com', '1983-03-07', 'Male', '468 Peach St', 'Eastview', 'SD', '51729', '[1,2]')
ON DUPLICATE KEY UPDATE 
  firstname = VALUES(firstname),
  lastname = VALUES(lastname),
  phone = VALUES(phone),
  work_email = VALUES(work_email);

-- Clear existing billing data first
DELETE FROM billings WHERE claim_number LIKE 'CLM-2024-%';

-- Insert dummy claims data with various statuses and dates (using unique patient combinations)
INSERT INTO billings (patient_id, provider_id, claim_number, procedure_code, diagnosis_code, total_amount, service_date, submission_date, status, notes, payer_name, created) VALUES

-- Recent claims (last 7 days) - Mixed statuses
(101, 1, 'CLM-2024-001', '99213', 'F32.9', 150.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1, 'Office visit for depression follow-up', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(102, 1, 'CLM-2024-002', '99214', 'F41.1', 200.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 2, 'Complex anxiety management', 'Aetna', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(103, 1, 'CLM-2024-003', '99215', 'F43.10', 250.00, DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY), 0, 'PTSD comprehensive evaluation - draft', 'UnitedHealthcare', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(104, 1, 'CLM-2024-004', '99203', 'F90.9', 180.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_SUB(CURDATE(), INTERVAL 4 DAY), 2, 'New patient ADHD assessment', 'Cigna', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(105, 1, 'CLM-2024-005', '90834', 'F84.0', 120.00, DATE_SUB(CURDATE(), INTERVAL 6 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), 3, 'Autism therapy session - denied for documentation', 'Humana', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(106, 1, 'CLM-2024-006', '90837', 'F32.1', 160.00, DATE_SUB(CURDATE(), INTERVAL 7 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), 1, 'Extended therapy for moderate depression', 'Medicare', DATE_SUB(NOW(), INTERVAL 7 DAY)),

-- Claims from 1-2 weeks ago
(107, 1, 'CLM-2024-007', '96116', 'F41.9', 300.00, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 9 DAY), 2, 'Neurobehavioral status exam completed', 'Medicaid', DATE_SUB(NOW(), INTERVAL 10 DAY)),
(108, 1, 'CLM-2024-008', '96118', 'F43.12', 400.00, DATE_SUB(CURDATE(), INTERVAL 12 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY), 1, 'Neuropsychological testing in progress', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 12 DAY)),
(109, 1, 'CLM-2024-009', '90791', 'F90.1', 250.00, DATE_SUB(CURDATE(), INTERVAL 14 DAY), DATE_SUB(CURDATE(), INTERVAL 13 DAY), 3, 'Psychiatric evaluation - denied for prior auth', 'Aetna', DATE_SUB(NOW(), INTERVAL 14 DAY)),
(110, 1, 'CLM-2024-010', '99213', 'F33.1', 150.00, DATE_SUB(CURDATE(), INTERVAL 16 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), 2, 'Recurrent depression management', 'UnitedHealthcare', DATE_SUB(NOW(), INTERVAL 16 DAY)),

-- Claims from 2-4 weeks ago (A/R aging 31-60 days) - using existing patient IDs
(101, 1, 'CLM-2024-011', '99214', 'F32.9', 200.00, DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_SUB(CURDATE(), INTERVAL 24 DAY), 1, 'Depression follow-up - pending review', 'Cigna', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(102, 1, 'CLM-2024-012', '90834', 'F41.1', 120.00, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 29 DAY), 1, 'Anxiety therapy - awaiting approval', 'Humana', DATE_SUB(NOW(), INTERVAL 30 DAY)),
(103, 1, 'CLM-2024-013', '99215', 'F43.10', 250.00, DATE_SUB(CURDATE(), INTERVAL 35 DAY), DATE_SUB(CURDATE(), INTERVAL 34 DAY), 3, 'PTSD treatment - denied insufficient docs', 'Medicare', DATE_SUB(NOW(), INTERVAL 35 DAY)),
(104, 1, 'CLM-2024-014', '99203', 'F90.9', 180.00, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_SUB(CURDATE(), INTERVAL 39 DAY), 1, 'ADHD new patient - under review', 'Medicaid', DATE_SUB(NOW(), INTERVAL 40 DAY)),
(105, 1, 'CLM-2024-015', '90837', 'F84.0', 160.00, DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_SUB(CURDATE(), INTERVAL 44 DAY), 1, 'Autism extended therapy - pending', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 45 DAY)),

-- Additional claims with different patients (A/R aging 61-90 days)
(101, 1, 'CLM-2024-016', '96116', 'F32.1', 300.00, DATE_SUB(CURDATE(), INTERVAL 65 DAY), DATE_SUB(CURDATE(), INTERVAL 64 DAY), 1, 'Neurobehavioral exam - long pending', 'Aetna', DATE_SUB(NOW(), INTERVAL 65 DAY)),
(102, 1, 'CLM-2024-017', '96118', 'F41.9', 400.00, DATE_SUB(CURDATE(), INTERVAL 70 DAY), DATE_SUB(CURDATE(), INTERVAL 69 DAY), 3, 'Neuropsych testing - denied coding error', 'UnitedHealthcare', DATE_SUB(NOW(), INTERVAL 70 DAY)),
(103, 1, 'CLM-2024-018', '90791', 'F43.12', 250.00, DATE_SUB(CURDATE(), INTERVAL 75 DAY), DATE_SUB(CURDATE(), INTERVAL 74 DAY), 1, 'Psychiatric eval - awaiting appeal decision', 'Cigna', DATE_SUB(NOW(), INTERVAL 75 DAY)),
(104, 1, 'CLM-2024-019', '99213', 'F90.1', 150.00, DATE_SUB(CURDATE(), INTERVAL 80 DAY), DATE_SUB(CURDATE(), INTERVAL 79 DAY), 1, 'ADHD follow-up - insurance review', 'Humana', DATE_SUB(NOW(), INTERVAL 80 DAY)),
(105, 1, 'CLM-2024-020', '99214', 'F33.1', 200.00, DATE_SUB(CURDATE(), INTERVAL 85 DAY), DATE_SUB(CURDATE(), INTERVAL 84 DAY), 1, 'Depression management - under review', 'Medicare', DATE_SUB(NOW(), INTERVAL 85 DAY)),

-- Very old claims (120+ days) - Collections candidates
(106, 1, 'CLM-2024-021', '90834', 'F32.9', 120.00, DATE_SUB(CURDATE(), INTERVAL 125 DAY), DATE_SUB(CURDATE(), INTERVAL 124 DAY), 1, 'Old therapy claim - collections candidate', 'Medicaid', DATE_SUB(NOW(), INTERVAL 125 DAY)),
(107, 1, 'CLM-2024-022', '99215', 'F41.1', 250.00, DATE_SUB(CURDATE(), INTERVAL 130 DAY), DATE_SUB(CURDATE(), INTERVAL 129 DAY), 3, 'Anxiety treatment - final denial', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 130 DAY)),
(108, 1, 'CLM-2024-023', '90837', 'F43.10', 160.00, DATE_SUB(CURDATE(), INTERVAL 135 DAY), DATE_SUB(CURDATE(), INTERVAL 134 DAY), 1, 'PTSD therapy - write-off candidate', 'Aetna', DATE_SUB(NOW(), INTERVAL 135 DAY)),
(109, 1, 'CLM-2024-024', '96116', 'F90.9', 300.00, DATE_SUB(CURDATE(), INTERVAL 140 DAY), DATE_SUB(CURDATE(), INTERVAL 139 DAY), 1, 'Neurobehavioral - patient responsibility', 'UnitedHealthcare', DATE_SUB(NOW(), INTERVAL 140 DAY)),
(110, 1, 'CLM-2024-025', '96118', 'F84.0', 400.00, DATE_SUB(CURDATE(), INTERVAL 145 DAY), DATE_SUB(CURDATE(), INTERVAL 144 DAY), 1, 'Neuropsych testing - collections referral', 'Cigna', DATE_SUB(NOW(), INTERVAL 145 DAY)),

-- Additional recent claims for better testing
(111, 1, 'CLM-2024-026', '90791', 'F32.1', 250.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY), CURDATE(), 0, 'Psychiatric evaluation - just created', 'Humana', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(112, 1, 'CLM-2024-027', '99213', 'F41.9', 150.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), 4, 'Anxiety follow-up - appealed', 'Medicare', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(113, 1, 'CLM-2024-028', '99214', 'F43.12', 200.00, DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_SUB(CURDATE(), INTERVAL 17 DAY), 2, 'PTSD management - paid', 'Medicaid', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(114, 1, 'CLM-2024-029', '90834', 'F90.1', 120.00, DATE_SUB(CURDATE(), INTERVAL 22 DAY), DATE_SUB(CURDATE(), INTERVAL 21 DAY), 1, 'ADHD therapy - submitted', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 22 DAY)),
(115, 1, 'CLM-2024-030', '90837', 'F33.1', 160.00, DATE_SUB(CURDATE(), INTERVAL 28 DAY), DATE_SUB(CURDATE(), INTERVAL 27 DAY), 2, 'Depression extended therapy - paid', 'Aetna', DATE_SUB(NOW(), INTERVAL 28 DAY));

-- Very old claims (120+ days) - Collections candidates
(106, 1, 'CLM-2024-021', '90834', 'F32.9', 120.00, DATE_SUB(CURDATE(), INTERVAL 125 DAY), DATE_SUB(CURDATE(), INTERVAL 124 DAY), 1, 'Old therapy claim - collections candidate', 'Medicaid', DATE_SUB(NOW(), INTERVAL 125 DAY)),
(107, 1, 'CLM-2024-022', '99215', 'F41.1', 250.00, DATE_SUB(CURDATE(), INTERVAL 130 DAY), DATE_SUB(CURDATE(), INTERVAL 129 DAY), 3, 'Anxiety treatment - final denial', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 130 DAY)),
(108, 1, 'CLM-2024-023', '90837', 'F43.10', 160.00, DATE_SUB(CURDATE(), INTERVAL 135 DAY), DATE_SUB(CURDATE(), INTERVAL 134 DAY), 1, 'PTSD therapy - write-off candidate', 'Aetna', DATE_SUB(NOW(), INTERVAL 135 DAY)),
(109, 1, 'CLM-2024-024', '96116', 'F90.9', 300.00, DATE_SUB(CURDATE(), INTERVAL 140 DAY), DATE_SUB(CURDATE(), INTERVAL 139 DAY), 1, 'Neurobehavioral - patient responsibility', 'UnitedHealthcare', DATE_SUB(NOW(), INTERVAL 140 DAY)),
(110, 1, 'CLM-2024-025', '96118', 'F84.0', 400.00, DATE_SUB(CURDATE(), INTERVAL 145 DAY), DATE_SUB(CURDATE(), INTERVAL 144 DAY), 1, 'Neuropsych testing - collections referral', 'Cigna', DATE_SUB(NOW(), INTERVAL 145 DAY)),

-- Additional recent claims for better testing
(111, 1, 'CLM-2024-026', '90791', 'F32.1', 250.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY), CURDATE(), 0, 'Psychiatric evaluation - just created', 'Humana', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(112, 1, 'CLM-2024-027', '99213', 'F41.9', 150.00, DATE_SUB(CURDATE(), INTERVAL 8 DAY), DATE_SUB(CURDATE(), INTERVAL 7 DAY), 4, 'Anxiety follow-up - appealed', 'Medicare', DATE_SUB(NOW(), INTERVAL 8 DAY)),
(113, 1, 'CLM-2024-028', '99214', 'F43.12', 200.00, DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_SUB(CURDATE(), INTERVAL 17 DAY), 2, 'PTSD management - paid', 'Medicaid', DATE_SUB(NOW(), INTERVAL 18 DAY)),
(114, 1, 'CLM-2024-029', '90834', 'F90.1', 120.00, DATE_SUB(CURDATE(), INTERVAL 22 DAY), DATE_SUB(CURDATE(), INTERVAL 21 DAY), 1, 'ADHD therapy - submitted', 'Blue Cross Blue Shield', DATE_SUB(NOW(), INTERVAL 22 DAY)),
(115, 1, 'CLM-2024-030', '90837', 'F33.1', 160.00, DATE_SUB(CURDATE(), INTERVAL 28 DAY), DATE_SUB(CURDATE(), INTERVAL 27 DAY), 2, 'Depression extended therapy - paid', 'Aetna', DATE_SUB(NOW(), INTERVAL 28 DAY));

-- Insert sample payment records for paid claims using dynamic claim IDs
INSERT INTO payments (claim_id, patient_id, amount, payment_date, payment_method, check_number, reference_number, status, posted_by)
SELECT 
    b.id as claim_id,
    b.patient_id,
    b.total_amount as amount,
    DATE_SUB(CURDATE(), INTERVAL 1 DAY) as payment_date,
    'Electronic' as payment_method,
    NULL as check_number,
    CONCAT('REF-', LPAD(b.id, 3, '0')) as reference_number,
    'completed' as status,
    1 as posted_by
FROM billings b 
WHERE b.status = 2 AND b.claim_number LIKE 'CLM-2024-%'
LIMIT 6;

-- Insert some partial payments
INSERT INTO payments (claim_id, patient_id, amount, payment_date, payment_method, check_number, reference_number, status, posted_by)
SELECT 
    b.id as claim_id,
    b.patient_id,
    ROUND(b.total_amount * 0.5, 2) as amount,
    DATE_SUB(CURDATE(), INTERVAL 2 DAY) as payment_date,
    'Electronic' as payment_method,
    NULL as check_number,
    CONCAT('PART-', LPAD(b.id, 3, '0')) as reference_number,
    'completed' as status,
    1 as posted_by
FROM billings b 
WHERE b.status = 1 AND b.claim_number LIKE 'CLM-2024-%'
LIMIT 3;

-- Display summary of inserted data
SELECT 
    'Dummy Claims Data Inserted Successfully!' as Status,
    COUNT(*) as Total_Claims,
    SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as Draft_Claims,
    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as Submitted_Claims,
    SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as Paid_Claims,
    SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as Denied_Claims,
    SUM(CASE WHEN status = 4 THEN 1 ELSE 0 END) as Appealed_Claims,
    SUM(total_amount) as Total_Amount,
    COUNT(DISTINCT patient_id) as Unique_Patients
FROM billings;

SELECT 'Patient Profiles Created:' as Info, COUNT(*) as Count FROM user_profiles;
SELECT 'Payment Records Created:' as Info, COUNT(*) as Count FROM payments;