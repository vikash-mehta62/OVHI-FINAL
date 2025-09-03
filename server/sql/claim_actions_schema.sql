-- Claim Actions Schema
-- Database tables to support new claim management actions

-- Table for claim comments
CREATE TABLE IF NOT EXISTS claim_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    comment_type ENUM('general', 'correction', 'appeal', 'transfer', 'void') DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_claim_comments_claim_id (claim_id),
    INDEX idx_claim_comments_user_id (user_id),
    INDEX idx_claim_comments_type (comment_type),
    INDEX idx_claim_comments_created (created_at)
);

-- Table for claim appeals
CREATE TABLE IF NOT EXISTS claim_appeals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    appeal_reason TEXT NOT NULL,
    appeal_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'denied', 'withdrawn') DEFAULT 'pending',
    appeal_amount DECIMAL(10,2) DEFAULT 0.00,
    decision_date DATE NULL,
    decision_reason TEXT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_claim_appeals_claim_id (claim_id),
    INDEX idx_claim_appeals_status (status),
    INDEX idx_claim_appeals_date (appeal_date),
    INDEX idx_claim_appeals_created_by (created_by)
);

-- Table for patient statements
CREATE TABLE IF NOT EXISTS patient_statements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    claim_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    statement_date DATE NOT NULL,
    due_date DATE NULL,
    status ENUM('pending', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    payment_received DECIMAL(10,2) DEFAULT 0.00,
    balance_remaining DECIMAL(10,2) GENERATED ALWAYS AS (amount - payment_received) STORED,
    sent_date DATE NULL,
    payment_date DATE NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_patient_statements_patient_id (patient_id),
    INDEX idx_patient_statements_claim_id (claim_id),
    INDEX idx_patient_statements_status (status),
    INDEX idx_patient_statements_date (statement_date),
    INDEX idx_patient_statements_due_date (due_date)
);

-- Add new columns to existing billings table for claim actions
ALTER TABLE billings 
ADD COLUMN IF NOT EXISTS voided TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS void_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS voided_by INT NULL,
ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS patient_responsibility DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_action ENUM('created', 'submitted', 'corrected', 'appealed', 'transferred', 'voided') DEFAULT 'created',
ADD COLUMN IF NOT EXISTS last_action_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for new columns
ALTER TABLE billings 
ADD INDEX IF NOT EXISTS idx_billings_voided (voided),
ADD INDEX IF NOT EXISTS idx_billings_last_action (last_action),
ADD INDEX IF NOT EXISTS idx_billings_patient_responsibility (patient_responsibility);

-- Update existing status values to include new statuses
-- Status codes:
-- 0 = Draft
-- 1 = Submitted  
-- 2 = Accepted
-- 3 = Paid
-- 4 = Denied
-- 5 = Appealed (new)
-- 6 = Patient Responsibility (new)
-- 99 = Voided (new)

-- Create audit log table for claim actions
CREATE TABLE IF NOT EXISTS claim_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    claim_id INT NOT NULL,
    action_type ENUM('created', 'updated', 'submitted', 'corrected', 'appealed', 'transferred', 'voided', 'commented') NOT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    user_id INT NOT NULL,
    user_name VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_claim_audit_claim_id (claim_id),
    INDEX idx_claim_audit_action_type (action_type),
    INDEX idx_claim_audit_user_id (user_id),
    INDEX idx_claim_audit_timestamp (timestamp)
);

-- Create view for claim action summary
CREATE OR REPLACE VIEW claim_action_summary AS
SELECT 
    b.id as claim_id,
    b.claim_number,
    b.patient_id,
    b.status,
    b.total_amount,
    b.patient_responsibility,
    b.voided,
    b.last_action,
    b.last_action_date,
    COUNT(DISTINCT cc.id) as comment_count,
    COUNT(DISTINCT ca.id) as appeal_count,
    COUNT(DISTINCT ps.id) as statement_count,
    MAX(cc.created_at) as last_comment_date,
    MAX(ca.appeal_date) as last_appeal_date,
    MAX(ps.statement_date) as last_statement_date
FROM billings b
LEFT JOIN claim_comments cc ON b.id = cc.claim_id
LEFT JOIN claim_appeals ca ON b.id = ca.claim_id  
LEFT JOIN patient_statements ps ON b.id = ps.claim_id
WHERE b.voided = 0
GROUP BY b.id, b.claim_number, b.patient_id, b.status, b.total_amount, 
         b.patient_responsibility, b.voided, b.last_action, b.last_action_date;

-- Insert sample data for testing
INSERT IGNORE INTO claim_comments (claim_id, user_id, comment, comment_type) VALUES
(1, 1, 'Initial claim review completed', 'general'),
(2, 1, 'Corrected diagnosis code from Z00.00 to Z00.01', 'correction'),
(3, 1, 'Appeal filed due to medical necessity documentation', 'appeal');

INSERT IGNORE INTO claim_appeals (claim_id, appeal_reason, appeal_date, created_by) VALUES
(3, 'Medical necessity clearly documented in patient records', CURDATE(), 1);

-- Create stored procedures for common claim actions

DELIMITER //

-- Procedure to correct and resubmit claim
CREATE PROCEDURE IF NOT EXISTS CorrectAndResubmitClaim(
    IN p_claim_id INT,
    IN p_correction_reason TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Update claim status to submitted
    UPDATE billings 
    SET status = 1, 
        last_action = 'corrected',
        submission_date = CURDATE(),
        updated_at = NOW()
    WHERE id = p_claim_id;
    
    -- Add correction comment
    INSERT INTO claim_comments (claim_id, user_id, comment, comment_type)
    VALUES (p_claim_id, p_user_id, CONCAT('Claim corrected and resubmitted: ', p_correction_reason), 'correction');
    
    -- Log audit trail
    INSERT INTO claim_audit_log (claim_id, action_type, new_values, user_id)
    VALUES (p_claim_id, 'corrected', JSON_OBJECT('correction_reason', p_correction_reason), p_user_id);
    
    COMMIT;
END //

-- Procedure to file appeal
CREATE PROCEDURE IF NOT EXISTS FileClaimAppeal(
    IN p_claim_id INT,
    IN p_appeal_reason TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Update claim status to appealed
    UPDATE billings 
    SET status = 5, 
        last_action = 'appealed',
        updated_at = NOW()
    WHERE id = p_claim_id;
    
    -- Create appeal record
    INSERT INTO claim_appeals (claim_id, appeal_reason, appeal_date, created_by)
    VALUES (p_claim_id, p_appeal_reason, CURDATE(), p_user_id);
    
    -- Add appeal comment
    INSERT INTO claim_comments (claim_id, user_id, comment, comment_type)
    VALUES (p_claim_id, p_user_id, CONCAT('Appeal filed: ', p_appeal_reason), 'appeal');
    
    -- Log audit trail
    INSERT INTO claim_audit_log (claim_id, action_type, new_values, user_id)
    VALUES (p_claim_id, 'appealed', JSON_OBJECT('appeal_reason', p_appeal_reason), p_user_id);
    
    COMMIT;
END //

-- Procedure to transfer to patient responsibility
CREATE PROCEDURE IF NOT EXISTS TransferToPatient(
    IN p_claim_id INT,
    IN p_transfer_reason TEXT,
    IN p_user_id INT
)
BEGIN
    DECLARE v_total_amount DECIMAL(10,2);
    DECLARE v_patient_id INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Get claim details
    SELECT total_amount, patient_id INTO v_total_amount, v_patient_id
    FROM billings WHERE id = p_claim_id;
    
    -- Update claim status to patient responsibility
    UPDATE billings 
    SET status = 6, 
        patient_responsibility = v_total_amount,
        last_action = 'transferred',
        updated_at = NOW()
    WHERE id = p_claim_id;
    
    -- Create patient statement
    INSERT INTO patient_statements (patient_id, claim_id, amount, statement_date, due_date)
    VALUES (v_patient_id, p_claim_id, v_total_amount, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY));
    
    -- Add transfer comment
    INSERT INTO claim_comments (claim_id, user_id, comment, comment_type)
    VALUES (p_claim_id, p_user_id, CONCAT('Transferred to patient responsibility: ', p_transfer_reason), 'transfer');
    
    -- Log audit trail
    INSERT INTO claim_audit_log (claim_id, action_type, new_values, user_id)
    VALUES (p_claim_id, 'transferred', JSON_OBJECT('transfer_reason', p_transfer_reason, 'amount', v_total_amount), p_user_id);
    
    COMMIT;
END //

DELIMITER ;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON claim_comments TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claim_appeals TO 'rcm_user'@'%';  
-- GRANT SELECT, INSERT, UPDATE ON patient_statements TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT ON claim_audit_log TO 'rcm_user'@'%';
-- GRANT EXECUTE ON PROCEDURE CorrectAndResubmitClaim TO 'rcm_user'@'%';
-- GRANT EXECUTE ON PROCEDURE FileClaimAppeal TO 'rcm_user'@'%';
-- GRANT EXECUTE ON PROCEDURE TransferToPatient TO 'rcm_user'@'%';