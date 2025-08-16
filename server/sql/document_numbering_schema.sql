-- Document Numbering System Schema
-- Critical for billing operations and document tracking

-- Document Numbering Sequences Table
CREATE TABLE IF NOT EXISTS document_sequences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL DEFAULT 1,
    document_type ENUM(
        'invoice', 
        'statement', 
        'claim_batch', 
        'receipt', 
        'superbill', 
        'referral', 
        'lab_requisition',
        'prescription',
        'encounter'
    ) NOT NULL,
    prefix VARCHAR(10) DEFAULT '',
    current_number INT NOT NULL DEFAULT 1,
    number_length INT NOT NULL DEFAULT 6,
    suffix VARCHAR(10) DEFAULT '',
    format_template VARCHAR(50) NOT NULL DEFAULT '{prefix}{number}{suffix}',
    reset_frequency ENUM('never', 'yearly', 'monthly', 'daily') DEFAULT 'yearly',
    last_reset_date DATE NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_org_doc_type (organization_id, document_type),
    INDEX idx_organization_id (organization_id),
    INDEX idx_document_type (document_type),
    INDEX idx_is_active (is_active)
);

-- Document Number History Table (for audit trail)
CREATE TABLE IF NOT EXISTS document_number_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL DEFAULT 1,
    document_type VARCHAR(50) NOT NULL,
    document_id INT NULL,
    generated_number VARCHAR(50) NOT NULL,
    full_document_number VARCHAR(100) NOT NULL,
    generated_by INT NULL,
    generated_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_organization_id (organization_id),
    INDEX idx_document_type (document_type),
    INDEX idx_generated_date (generated_date),
    INDEX idx_full_document_number (full_document_number)
);

-- Insert default document sequences
INSERT IGNORE INTO document_sequences (
    organization_id, 
    document_type, 
    prefix, 
    current_number, 
    number_length, 
    format_template
) VALUES
(1, 'invoice', 'INV-', 1001, 6, '{prefix}{number}'),
(1, 'statement', 'STMT-', 1001, 6, '{prefix}{number}'),
(1, 'claim_batch', 'CB-', 1001, 6, '{prefix}{number}'),
(1, 'receipt', 'RCP-', 1001, 6, '{prefix}{number}'),
(1, 'superbill', 'SB-', 1001, 6, '{prefix}{number}'),
(1, 'referral', 'REF-', 1001, 6, '{prefix}{number}'),
(1, 'lab_requisition', 'LAB-', 1001, 6, '{prefix}{number}'),
(1, 'prescription', 'RX-', 1001, 6, '{prefix}{number}'),
(1, 'encounter', 'ENC-', 1001, 6, '{prefix}{number}');

-- Stored procedure to generate next document number
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GetNextDocumentNumber(
    IN p_organization_id INT,
    IN p_document_type VARCHAR(50),
    IN p_document_id INT,
    IN p_generated_by INT,
    OUT p_document_number VARCHAR(100)
)
BEGIN
    DECLARE v_current_number INT;
    DECLARE v_prefix VARCHAR(10);
    DECLARE v_suffix VARCHAR(10);
    DECLARE v_number_length INT;
    DECLARE v_format_template VARCHAR(50);
    DECLARE v_reset_frequency VARCHAR(20);
    DECLARE v_last_reset_date DATE;
    DECLARE v_should_reset BOOLEAN DEFAULT FALSE;
    DECLARE v_padded_number VARCHAR(20);
    
    -- Start transaction
    START TRANSACTION;
    
    -- Get current sequence info with row lock
    SELECT 
        current_number, 
        prefix, 
        suffix, 
        number_length, 
        format_template,
        reset_frequency,
        last_reset_date
    INTO 
        v_current_number, 
        v_prefix, 
        v_suffix, 
        v_number_length, 
        v_format_template,
        v_reset_frequency,
        v_last_reset_date
    FROM document_sequences 
    WHERE organization_id = p_organization_id 
    AND document_type = p_document_type 
    AND is_active = TRUE
    FOR UPDATE;
    
    -- Check if we need to reset based on frequency
    IF v_reset_frequency = 'yearly' AND (v_last_reset_date IS NULL OR YEAR(v_last_reset_date) < YEAR(CURDATE())) THEN
        SET v_should_reset = TRUE;
    ELSEIF v_reset_frequency = 'monthly' AND (v_last_reset_date IS NULL OR DATE_FORMAT(v_last_reset_date, '%Y-%m') < DATE_FORMAT(CURDATE(), '%Y-%m')) THEN
        SET v_should_reset = TRUE;
    ELSEIF v_reset_frequency = 'daily' AND (v_last_reset_date IS NULL OR v_last_reset_date < CURDATE()) THEN
        SET v_should_reset = TRUE;
    END IF;
    
    -- Reset if needed
    IF v_should_reset THEN
        SET v_current_number = 1;
        UPDATE document_sequences 
        SET last_reset_date = CURDATE()
        WHERE organization_id = p_organization_id 
        AND document_type = p_document_type;
    END IF;
    
    -- Pad the number with leading zeros
    SET v_padded_number = LPAD(v_current_number, v_number_length, '0');
    
    -- Generate the full document number
    SET p_document_number = REPLACE(
        REPLACE(
            REPLACE(v_format_template, '{prefix}', IFNULL(v_prefix, '')),
            '{number}', v_padded_number
        ),
        '{suffix}', IFNULL(v_suffix, '')
    );
    
    -- Update the sequence
    UPDATE document_sequences 
    SET current_number = v_current_number + 1,
        updated_date = NOW()
    WHERE organization_id = p_organization_id 
    AND document_type = p_document_type;
    
    -- Log the generated number
    INSERT INTO document_number_history (
        organization_id,
        document_type,
        document_id,
        generated_number,
        full_document_number,
        generated_by,
        generated_date
    ) VALUES (
        p_organization_id,
        p_document_type,
        p_document_id,
        v_padded_number,
        p_document_number,
        p_generated_by,
        NOW()
    );
    
    COMMIT;
END //

DELIMITER ;

-- Function to preview next document number without incrementing
DELIMITER //

CREATE FUNCTION IF NOT EXISTS PreviewNextDocumentNumber(
    p_organization_id INT,
    p_document_type VARCHAR(50)
) RETURNS VARCHAR(100)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_current_number INT;
    DECLARE v_prefix VARCHAR(10);
    DECLARE v_suffix VARCHAR(10);
    DECLARE v_number_length INT;
    DECLARE v_format_template VARCHAR(50);
    DECLARE v_padded_number VARCHAR(20);
    DECLARE v_result VARCHAR(100);
    
    -- Get current sequence info
    SELECT 
        current_number, 
        prefix, 
        suffix, 
        number_length, 
        format_template
    INTO 
        v_current_number, 
        v_prefix, 
        v_suffix, 
        v_number_length, 
        v_format_template
    FROM document_sequences 
    WHERE organization_id = p_organization_id 
    AND document_type = p_document_type 
    AND is_active = TRUE;
    
    -- Pad the number with leading zeros
    SET v_padded_number = LPAD(v_current_number, v_number_length, '0');
    
    -- Generate the preview number
    SET v_result = REPLACE(
        REPLACE(
            REPLACE(v_format_template, '{prefix}', IFNULL(v_prefix, '')),
            '{number}', v_padded_number
        ),
        '{suffix}', IFNULL(v_suffix, '')
    );
    
    RETURN v_result;
END //

DELIMITER ;