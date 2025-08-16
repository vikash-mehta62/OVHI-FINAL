-- Collections Management Schema
-- This schema supports comprehensive collections management including payment plans and activities

-- Payment Plans Table
CREATE TABLE IF NOT EXISTS payment_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    monthly_payment DECIMAL(10,2) NOT NULL,
    remaining_balance DECIMAL(10,2) NOT NULL,
    next_payment_date DATE NOT NULL,
    status ENUM('active', 'completed', 'defaulted', 'cancelled', 'pending') DEFAULT 'active',
    payments_remaining INT NOT NULL,
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes TEXT,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_status (status),
    INDEX idx_next_payment_date (next_payment_date),
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Collection Activities Table
CREATE TABLE IF NOT EXISTS collection_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    activity_type ENUM('phone_call', 'email', 'letter', 'in_person', 'payment_received', 'payment_plan_setup', 'insurance_follow_up', 'dispute_resolution') NOT NULL,
    activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL,
    outcome ENUM('successful', 'no_answer', 'busy', 'disconnected', 'promised_payment', 'dispute', 'payment_plan_requested', 'payment_received', 'no_response', 'delivered') NULL,
    next_action ENUM('phone_call', 'send_letter', 'send_email', 'payment_plan', 'collections_agency', 'write_off', 'no_action', 'insurance_follow_up') NULL,
    next_action_date DATE NULL,
    performed_by VARCHAR(100) NOT NULL,
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_date (activity_date),
    INDEX idx_next_action_date (next_action_date),
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Update patient_accounts table to include collections fields
ALTER TABLE patient_accounts 
ADD COLUMN IF NOT EXISTS collection_status ENUM('new', 'active', 'payment_plan', 'collections', 'resolved', 'written_off') DEFAULT 'new',
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS assigned_collector VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS contact_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contact_date DATETIME NULL,
ADD COLUMN IF NOT EXISTS insurance_pending DECIMAL(10,2) DEFAULT 0.00;

-- Add indexes for collections fields
ALTER TABLE patient_accounts 
ADD INDEX IF NOT EXISTS idx_collection_status (collection_status),
ADD INDEX IF NOT EXISTS idx_priority (priority),
ADD INDEX IF NOT EXISTS idx_assigned_collector (assigned_collector),
ADD INDEX IF NOT EXISTS idx_last_contact_date (last_contact_date);

-- Payment Plan Payments Table (for tracking individual payments)
CREATE TABLE IF NOT EXISTS payment_plan_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_plan_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'check', 'credit_card', 'debit_card', 'ach', 'online') NOT NULL,
    transaction_id VARCHAR(100) NULL,
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'completed',
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_plan_id (payment_plan_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_status (status),
    
    FOREIGN KEY (payment_plan_id) REFERENCES payment_plans(id) ON DELETE CASCADE
);

-- Collection Letters Template Table
CREATE TABLE IF NOT EXISTS collection_letter_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    template_type ENUM('first_notice', 'second_notice', 'final_notice', 'payment_plan_offer', 'payment_received') NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body_template TEXT NOT NULL,
    days_after_due INT NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_template_type (template_type),
    INDEX idx_is_active (is_active)
);

-- Collection Rules Table (for automated collection workflows)
CREATE TABLE IF NOT EXISTS collection_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    trigger_condition JSON NOT NULL, -- Conditions like aging days, balance amount, etc.
    action_type ENUM('send_letter', 'make_call', 'send_email', 'escalate_priority', 'assign_collector', 'create_task') NOT NULL,
    action_parameters JSON NULL, -- Parameters for the action
    is_active BOOLEAN DEFAULT TRUE,
    execution_order INT DEFAULT 1,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_is_active (is_active),
    INDEX idx_execution_order (execution_order)
);

-- Collection Tasks Table (for manual follow-up tasks)
CREATE TABLE IF NOT EXISTS collection_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    task_type ENUM('phone_call', 'send_letter', 'send_email', 'review_account', 'payment_plan_follow_up', 'insurance_verification') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    completed_date DATETIME NULL,
    notes TEXT,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_patient_id (patient_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Insert default collection letter templates
INSERT IGNORE INTO collection_letter_templates (template_name, template_type, subject, body_template, days_after_due) VALUES
('First Notice', 'first_notice', 'Payment Reminder - Account #{ACCOUNT_NUMBER}', 
'Dear {PATIENT_NAME},\n\nThis is a friendly reminder that your account has a balance of ${BALANCE_AMOUNT} that is now {DAYS_OVERDUE} days past due.\n\nPlease remit payment at your earliest convenience to avoid any collection activities.\n\nIf you have any questions or would like to set up a payment plan, please contact our billing department at {PRACTICE_PHONE}.\n\nThank you,\n{PRACTICE_NAME}', 30),

('Second Notice', 'second_notice', 'Second Notice - Account #{ACCOUNT_NUMBER}', 
'Dear {PATIENT_NAME},\n\nThis is your second notice regarding the outstanding balance of ${BALANCE_AMOUNT} on your account.\n\nYour account is now {DAYS_OVERDUE} days past due. Please remit payment immediately to avoid further collection activities.\n\nIf you are experiencing financial difficulties, please contact us to discuss payment plan options.\n\nContact us at {PRACTICE_PHONE}.\n\nSincerely,\n{PRACTICE_NAME}', 60),

('Final Notice', 'final_notice', 'FINAL NOTICE - Account #{ACCOUNT_NUMBER}', 
'Dear {PATIENT_NAME},\n\nThis is your FINAL NOTICE regarding the outstanding balance of ${BALANCE_AMOUNT} on your account.\n\nYour account is now {DAYS_OVERDUE} days past due. If payment is not received within 10 days, your account may be forwarded to a collection agency.\n\nPlease contact us immediately at {PRACTICE_PHONE} to resolve this matter.\n\nUrgently,\n{PRACTICE_NAME}', 90);

-- Insert default collection rules
INSERT IGNORE INTO collection_rules (rule_name, trigger_condition, action_type, action_parameters, execution_order) VALUES
('30 Day First Notice', '{"aging_days": 30, "balance_minimum": 25}', 'send_letter', '{"template_type": "first_notice"}', 1),
('60 Day Second Notice', '{"aging_days": 60, "balance_minimum": 25}', 'send_letter', '{"template_type": "second_notice"}', 2),
('90 Day Final Notice', '{"aging_days": 90, "balance_minimum": 25}', 'send_letter', '{"template_type": "final_notice"}', 3),
('High Priority Assignment', '{"aging_days": 120, "balance_minimum": 500}', 'escalate_priority', '{"priority": "high"}', 4),
('Collections Assignment', '{"aging_days": 150, "balance_minimum": 100}', 'assign_collector', '{"collector": "Collections Team"}', 5);

-- Create views for collections reporting
CREATE OR REPLACE VIEW collections_summary AS
SELECT 
    pa.collection_status,
    pa.priority,
    COUNT(*) as account_count,
    SUM(pa.total_balance) as total_balance,
    SUM(pa.aging_0_30) as aging_30,
    SUM(pa.aging_31_60) as aging_60,
    SUM(pa.aging_61_90) as aging_90,
    SUM(pa.aging_91_plus) as aging_120_plus,
    AVG(pa.contact_attempts) as avg_contact_attempts
FROM patient_accounts pa
WHERE pa.total_balance > 0
GROUP BY pa.collection_status, pa.priority;

CREATE OR REPLACE VIEW payment_plan_summary AS
SELECT 
    pp.status,
    COUNT(*) as plan_count,
    SUM(pp.total_amount) as total_planned,
    SUM(pp.remaining_balance) as total_remaining,
    AVG(pp.monthly_payment) as avg_monthly_payment,
    COUNT(CASE WHEN pp.auto_pay_enabled = 1 THEN 1 END) as auto_pay_count
FROM payment_plans pp
GROUP BY pp.status;

CREATE OR REPLACE VIEW collection_activity_summary AS
SELECT 
    ca.activity_type,
    ca.outcome,
    COUNT(*) as activity_count,
    DATE(ca.activity_date) as activity_date
FROM collection_activities ca
WHERE ca.activity_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ca.activity_type, ca.outcome, DATE(ca.activity_date);

-- Stored procedures for collections automation
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS UpdatePaymentPlanBalance(
    IN plan_id INT,
    IN payment_amount DECIMAL(10,2)
)
BEGIN
    DECLARE remaining_balance DECIMAL(10,2);
    DECLARE payments_left INT;
    DECLARE monthly_payment DECIMAL(10,2);
    
    -- Get current plan details
    SELECT pp.remaining_balance, pp.monthly_payment 
    INTO remaining_balance, monthly_payment
    FROM payment_plans pp 
    WHERE pp.id = plan_id;
    
    -- Update remaining balance
    SET remaining_balance = remaining_balance - payment_amount;
    SET payments_left = CEIL(remaining_balance / monthly_payment);
    
    -- Update payment plan
    UPDATE payment_plans 
    SET remaining_balance = remaining_balance,
        payments_remaining = GREATEST(0, payments_left),
        status = CASE 
            WHEN remaining_balance <= 0 THEN 'completed'
            ELSE status 
        END,
        updated_date = NOW()
    WHERE id = plan_id;
    
    -- Record payment
    INSERT INTO payment_plan_payments (payment_plan_id, payment_date, amount_paid, payment_method, status)
    VALUES (plan_id, CURDATE(), payment_amount, 'manual', 'completed');
    
END //

CREATE PROCEDURE IF NOT EXISTS ProcessCollectionRules()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE patient_id INT;
    DECLARE aging_days INT;
    DECLARE balance DECIMAL(10,2);
    
    DECLARE patient_cursor CURSOR FOR
        SELECT pa.patient_id, 
               GREATEST(
                   CASE WHEN pa.aging_31_60 > 0 THEN 45 ELSE 0 END,
                   CASE WHEN pa.aging_61_90 > 0 THEN 75 ELSE 0 END,
                   CASE WHEN pa.aging_91_plus > 0 THEN 120 ELSE 0 END
               ) as max_aging_days,
               pa.total_balance
        FROM patient_accounts pa
        WHERE pa.total_balance > 0 
        AND pa.collection_status NOT IN ('resolved', 'written_off');
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN patient_cursor;
    
    read_loop: LOOP
        FETCH patient_cursor INTO patient_id, aging_days, balance;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Apply collection rules based on aging and balance
        IF aging_days >= 30 AND aging_days < 60 AND balance >= 25 THEN
            -- First notice
            INSERT IGNORE INTO collection_tasks (patient_id, task_type, title, assigned_to, due_date, priority)
            VALUES (patient_id, 'send_letter', 'Send First Notice', 'Collections Team', CURDATE(), 'medium');
        ELSEIF aging_days >= 60 AND aging_days < 90 AND balance >= 25 THEN
            -- Second notice
            INSERT IGNORE INTO collection_tasks (patient_id, task_type, title, assigned_to, due_date, priority)
            VALUES (patient_id, 'send_letter', 'Send Second Notice', 'Collections Team', CURDATE(), 'medium');
        ELSEIF aging_days >= 90 AND balance >= 25 THEN
            -- Final notice and escalate
            INSERT IGNORE INTO collection_tasks (patient_id, task_type, title, assigned_to, due_date, priority)
            VALUES (patient_id, 'send_letter', 'Send Final Notice', 'Collections Team', CURDATE(), 'high');
            
            UPDATE patient_accounts 
            SET priority = 'high', collection_status = 'collections'
            WHERE patient_id = patient_id;
        END IF;
        
    END LOOP;
    
    CLOSE patient_cursor;
END //

DELIMITER ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_accounts_collections ON patient_accounts(collection_status, priority, total_balance);
CREATE INDEX IF NOT EXISTS idx_collection_activities_recent ON collection_activities(activity_date, patient_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_active ON payment_plans(status, next_payment_date);

-- Sample data for testing
INSERT IGNORE INTO patient_accounts (patient_id, total_balance, aging_0_30, aging_31_60, aging_61_90, aging_91_plus, collection_status, priority, assigned_collector, contact_attempts) VALUES
(1001, 1250.00, 300.00, 450.00, 250.00, 250.00, 'active', 'high', 'Sarah Johnson', 3),
(1002, 850.00, 850.00, 0.00, 0.00, 0.00, 'new', 'medium', 'Mike Wilson', 1),
(1003, 2100.00, 0.00, 500.00, 800.00, 800.00, 'collections', 'urgent', 'Lisa Chen', 8),
(1004, 450.00, 0.00, 0.00, 450.00, 0.00, 'payment_plan', 'medium', 'Sarah Johnson', 2);

INSERT IGNORE INTO payment_plans (patient_id, total_amount, monthly_payment, remaining_balance, next_payment_date, status, payments_remaining, auto_pay_enabled) VALUES
(1002, 1200.00, 150.00, 850.00, '2024-02-01', 'active', 6, TRUE),
(1004, 800.00, 100.00, 300.00, '2024-02-05', 'active', 3, FALSE);

INSERT IGNORE INTO collection_activities (patient_id, activity_type, description, outcome, next_action, next_action_date, performed_by) VALUES
(1001, 'phone_call', 'Called patient regarding overdue balance', 'no_answer', 'send_letter', '2024-01-25', 'Sarah Johnson'),
(1003, 'email', 'Sent payment reminder email', 'delivered', 'phone_call', '2024-01-22', 'Lisa Chen'),
(1002, 'payment_plan_setup', 'Set up payment plan for patient', 'successful', 'monitor_payments', '2024-02-01', 'Mike Wilson');