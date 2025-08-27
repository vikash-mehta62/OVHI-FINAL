-- ClaimMD Integration Schema
-- Database tables for ClaimMD ERA processing integration

-- ClaimMD Configurations Table
CREATE TABLE IF NOT EXISTS claimmd_configurations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    base_url VARCHAR(255) DEFAULT 'https://api.claim.md',
    provider_id VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    configuration_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_user_config (user_id),
    INDEX idx_user_active (user_id, is_active),
    INDEX idx_provider_id (provider_id)
);

-- ClaimMD Interactions Log Table
CREATE TABLE IF NOT EXISTS claimmd_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    interaction_type ENUM('ERA_SUBMIT', 'ERA_STATUS_CHECK', 'CLAIM_SUBMIT', 'ERA_SUBMIT_ERROR') NOT NULL,
    reference_id VARCHAR(100),
    request_data JSON,
    response_data JSON,
    status VARCHAR(50),
    response_time_ms INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_type (user_id, interaction_type),
    INDEX idx_reference_id (reference_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
);

-- Update ERA Files table to include ClaimMD references
ALTER TABLE era_files 
ADD COLUMN IF NOT EXISTS claimmd_reference_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS claimmd_status VARCHAR(50) DEFAULT 'local_only',
ADD COLUMN IF NOT EXISTS claimmd_last_check TIMESTAMP NULL,
ADD INDEX idx_claimmd_reference (claimmd_reference_id),
ADD INDEX idx_claimmd_status (claimmd_status);

-- Update ERA Payment Details table to include ClaimMD payment IDs
ALTER TABLE era_payment_details 
ADD COLUMN IF NOT EXISTS claimmd_payment_id VARCHAR(100),
ADD INDEX idx_claimmd_payment (claimmd_payment_id);

-- ClaimMD Processing Queue Table (for async processing)
CREATE TABLE IF NOT EXISTS claimmd_processing_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    era_file_id INT,
    processing_type ENUM('ERA_SUBMIT', 'STATUS_CHECK', 'RETRY') NOT NULL,
    priority TINYINT DEFAULT 5,
    payload JSON,
    status ENUM('pending', 'processing', 'completed', 'failed', 'retry') DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    next_attempt_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    INDEX idx_status_priority (status, priority),
    INDEX idx_user_status (user_id, status),
    INDEX idx_next_attempt (next_attempt_at),
    INDEX idx_era_file (era_file_id),
    FOREIGN KEY (era_file_id) REFERENCES era_files(id) ON DELETE CASCADE
);

-- ClaimMD API Rate Limiting Table
CREATE TABLE IF NOT EXISTS claimmd_rate_limits (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    request_count INT DEFAULT 0,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    window_duration_minutes INT DEFAULT 60,
    max_requests_per_window INT DEFAULT 100,
    
    UNIQUE KEY unique_user_endpoint_window (user_id, endpoint, window_start),
    INDEX idx_user_endpoint (user_id, endpoint),
    INDEX idx_window_start (window_start)
);

-- ClaimMD Webhook Events Table (for receiving status updates)
CREATE TABLE IF NOT EXISTS claimmd_webhook_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    webhook_id VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100),
    payload JSON,
    signature VARCHAR(255),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_webhook_id (webhook_id),
    INDEX idx_reference_id (reference_id),
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed),
    INDEX idx_created_at (created_at)
);

-- Insert default ClaimMD configuration template
INSERT IGNORE INTO claimmd_configurations (
    user_id, 
    api_key, 
    base_url, 
    provider_id, 
    is_active, 
    configuration_data
) VALUES (
    0, -- Template configuration
    'YOUR_API_KEY_HERE',
    'https://api.claim.md',
    'YOUR_PROVIDER_ID_HERE',
    FALSE,
    JSON_OBJECT(
        'timeout_seconds', 30,
        'retry_attempts', 3,
        'auto_post_enabled', false,
        'webhook_enabled', false,
        'rate_limit_per_hour', 100,
        'supported_formats', JSON_ARRAY('X12_835', 'CSV', 'JSON')
    )
);

-- Create stored procedure for ClaimMD rate limiting check
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CheckClaimMDRateLimit(
    IN p_user_id INT,
    IN p_endpoint VARCHAR(100),
    IN p_max_requests INT,
    OUT p_allowed BOOLEAN,
    OUT p_remaining INT
)
BEGIN
    DECLARE v_current_count INT DEFAULT 0;
    DECLARE v_window_start TIMESTAMP;
    
    -- Get current window start (top of the hour)
    SET v_window_start = DATE_FORMAT(NOW(), '%Y-%m-%d %H:00:00');
    
    -- Get current request count for this window
    SELECT COALESCE(request_count, 0) INTO v_current_count
    FROM claimmd_rate_limits
    WHERE user_id = p_user_id 
      AND endpoint = p_endpoint 
      AND window_start = v_window_start;
    
    -- Check if request is allowed
    IF v_current_count < p_max_requests THEN
        SET p_allowed = TRUE;
        SET p_remaining = p_max_requests - v_current_count - 1;
        
        -- Increment counter
        INSERT INTO claimmd_rate_limits (user_id, endpoint, request_count, window_start, max_requests_per_window)
        VALUES (p_user_id, p_endpoint, 1, v_window_start, p_max_requests)
        ON DUPLICATE KEY UPDATE request_count = request_count + 1;
    ELSE
        SET p_allowed = FALSE;
        SET p_remaining = 0;
    END IF;
END //
DELIMITER ;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_era_files_claimmd_composite ON era_files (claimmd_reference_id, claimmd_status, processed_date);
CREATE INDEX IF NOT EXISTS idx_era_payment_details_composite ON era_payment_details (era_file_id, claimmd_payment_id, status);
CREATE INDEX IF NOT EXISTS idx_claimmd_interactions_composite ON claimmd_interactions (user_id, interaction_type, created_at);

-- Create view for ClaimMD integration status
CREATE OR REPLACE VIEW claimmd_integration_status AS
SELECT 
    c.user_id,
    c.provider_id,
    c.is_active,
    c.base_url,
    COUNT(ef.id) as total_era_files,
    COUNT(CASE WHEN ef.claimmd_reference_id IS NOT NULL THEN 1 END) as claimmd_processed_files,
    COUNT(CASE WHEN ef.claimmd_status = 'completed' THEN 1 END) as completed_files,
    COUNT(CASE WHEN ef.claimmd_status = 'error' THEN 1 END) as error_files,
    MAX(ef.processed_date) as last_era_processed,
    COUNT(ci.id) as total_interactions,
    COUNT(CASE WHEN ci.interaction_type = 'ERA_SUBMIT_ERROR' THEN 1 END) as error_interactions
FROM claimmd_configurations c
LEFT JOIN era_files ef ON c.user_id = ef.provider_id
LEFT JOIN claimmd_interactions ci ON c.user_id = ci.user_id
WHERE c.user_id > 0  -- Exclude template configuration
GROUP BY c.user_id, c.provider_id, c.is_active, c.base_url;

-- Add comments for documentation
ALTER TABLE claimmd_configurations COMMENT = 'Stores ClaimMD API configuration for each provider';
ALTER TABLE claimmd_interactions COMMENT = 'Logs all interactions with ClaimMD API for audit and debugging';
ALTER TABLE claimmd_processing_queue COMMENT = 'Queue for async processing of ClaimMD operations';
ALTER TABLE claimmd_rate_limits COMMENT = 'Tracks API rate limiting per user and endpoint';
ALTER TABLE claimmd_webhook_events COMMENT = 'Stores webhook events received from ClaimMD';

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON claimmd_configurations TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT ON claimmd_interactions TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claimmd_processing_queue TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claimmd_rate_limits TO 'rcm_user'@'%';
-- GRANT SELECT, INSERT, UPDATE ON claimmd_webhook_events TO 'rcm_user'@'%';