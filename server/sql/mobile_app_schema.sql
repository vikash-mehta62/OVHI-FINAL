-- Mobile App Integration Schema
-- Support for native iOS and Android telehealth apps

-- Mobile Devices Table
CREATE TABLE IF NOT EXISTS mobile_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_token VARCHAR(255) NOT NULL, -- FCM/APNS token
    device_type ENUM('ios', 'android') NOT NULL,
    device_model VARCHAR(100),
    device_id VARCHAR(255), -- Unique device identifier
    os_version VARCHAR(20),
    app_version VARCHAR(20),
    
    -- Device Capabilities
    supports_video_calls BOOLEAN DEFAULT TRUE,
    supports_background_mode BOOLEAN DEFAULT FALSE,
    supports_picture_in_picture BOOLEAN DEFAULT FALSE,
    supports_biometric_auth BOOLEAN DEFAULT FALSE,
    
    -- Settings and Preferences
    notification_preferences JSON,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Status and Activity
    is_active BOOLEAN DEFAULT TRUE,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Network and Performance
    last_known_ip VARCHAR(45),
    network_type ENUM('wifi', 'cellular', 'ethernet', 'unknown') DEFAULT 'unknown',
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_device (user_id, device_id),
    INDEX idx_device_token (device_token),
    INDEX idx_user_devices (user_id, is_active),
    INDEX idx_device_type (device_type),
    INDEX idx_last_active (last_active)
);

-- Mobile App Configuration Table
CREATE TABLE IF NOT EXISTS mobile_app_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Video/Audio Settings
    video_quality ENUM('low', 'medium', 'high', 'auto') DEFAULT 'auto',
    audio_quality ENUM('low', 'medium', 'high') DEFAULT 'high',
    auto_mute_on_join BOOLEAN DEFAULT FALSE,
    auto_video_on_join BOOLEAN DEFAULT TRUE,
    
    -- App Behavior
    background_mode_enabled BOOLEAN DEFAULT TRUE,
    picture_in_picture_enabled BOOLEAN DEFAULT TRUE,
    auto_reconnect_enabled BOOLEAN DEFAULT TRUE,
    
    -- Notifications
    push_notifications_enabled BOOLEAN DEFAULT TRUE,
    session_reminders_enabled BOOLEAN DEFAULT TRUE,
    reminder_minutes_before INT DEFAULT 15,
    
    -- Security
    biometric_auth_enabled BOOLEAN DEFAULT FALSE,
    auto_lock_enabled BOOLEAN DEFAULT TRUE,
    auto_lock_minutes INT DEFAULT 5,
    
    -- Data Usage
    data_saver_mode BOOLEAN DEFAULT FALSE,
    cellular_video_enabled BOOLEAN DEFAULT TRUE,
    max_cellular_quality ENUM('low', 'medium', 'high') DEFAULT 'medium',
    
    -- UI/UX
    theme ENUM('light', 'dark', 'system') DEFAULT 'system',
    font_size ENUM('small', 'medium', 'large') DEFAULT 'medium',
    high_contrast_mode BOOLEAN DEFAULT FALSE,
    
    -- Accessibility
    voice_over_enabled BOOLEAN DEFAULT FALSE,
    closed_captions_enabled BOOLEAN DEFAULT FALSE,
    gesture_navigation_enabled BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_config (user_id),
    INDEX idx_user_config (user_id)
);

-- Mobile Session Tokens Table
CREATE TABLE IF NOT EXISTS mobile_session_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT,
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of the token
    device_id VARCHAR(255),
    
    -- Token Details
    token_type ENUM('session', 'refresh', 'deep_link') DEFAULT 'session',
    scope VARCHAR(255) DEFAULT 'telehealth_session',
    
    -- Expiration
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used TIMESTAMP,
    
    -- Security
    ip_address VARCHAR(45),
    user_agent TEXT,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    revoked_reason VARCHAR(255),
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_token_hash (token_hash),
    INDEX idx_user_tokens (user_id, expires_at),
    INDEX idx_session_tokens (session_id),
    INDEX idx_token_expiry (expires_at, revoked)
);

-- Mobile Notifications Table
CREATE TABLE IF NOT EXISTS mobile_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_token VARCHAR(255) NOT NULL,
    
    -- Notification Content
    notification_type ENUM('session_reminder', 'session_started', 'session_ended', 'connection_issue', 'app_update', 'general') NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    
    -- Payload and Actions
    data_payload JSON,
    action_buttons JSON, -- Array of action buttons
    deep_link_url VARCHAR(500),
    
    -- Delivery
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    status ENUM('sent', 'delivered', 'opened', 'failed', 'expired') DEFAULT 'sent',
    
    -- Platform Specific
    platform_response JSON, -- FCM/APNS response
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    
    -- Scheduling
    scheduled_for TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_user_notifications (user_id, sent_at),
    INDEX idx_device_notifications (device_token, sent_at),
    INDEX idx_notification_type (notification_type, sent_at),
    INDEX idx_notification_status (status, sent_at),
    INDEX idx_scheduled_notifications (scheduled_for, status)
);

-- Mobile Session Events Table
CREATE TABLE IF NOT EXISTS mobile_session_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_id INT,
    device_id VARCHAR(255),
    
    -- Event Details
    event_type ENUM(
        'app_opened', 'app_closed', 'app_backgrounded', 'app_foregrounded',
        'session_joined', 'session_left', 'video_enabled', 'video_disabled',
        'audio_enabled', 'audio_disabled', 'screen_shared', 'screen_stopped',
        'connection_quality_changed', 'network_changed', 'battery_low',
        'orientation_changed', 'call_interrupted', 'call_resumed'
    ) NOT NULL,
    
    -- Event Data
    event_data JSON,
    device_info JSON,
    network_info JSON,
    
    -- Performance Metrics
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    battery_level INT,
    network_strength INT,
    
    -- Timing
    event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_duration_seconds INT,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    
    INDEX idx_user_events (user_id, event_timestamp),
    INDEX idx_session_events (session_id, event_timestamp),
    INDEX idx_event_type (event_type, event_timestamp),
    INDEX idx_device_events (device_id, event_timestamp)
);

-- Mobile App Analytics Table
CREATE TABLE IF NOT EXISTS mobile_app_analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date_recorded DATE NOT NULL,
    
    -- App Usage Metrics
    total_app_opens INT DEFAULT 0,
    unique_daily_users INT DEFAULT 0,
    avg_session_duration DECIMAL(8,2) DEFAULT 0,
    total_session_time DECIMAL(12,2) DEFAULT 0,
    
    -- Platform Distribution
    ios_users INT DEFAULT 0,
    android_users INT DEFAULT 0,
    ios_sessions INT DEFAULT 0,
    android_sessions INT DEFAULT 0,
    
    -- Feature Usage
    video_calls_initiated INT DEFAULT 0,
    audio_calls_initiated INT DEFAULT 0,
    background_mode_usage INT DEFAULT 0,
    picture_in_picture_usage INT DEFAULT 0,
    
    -- Performance Metrics
    avg_connection_quality DECIMAL(3,2),
    crash_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    
    -- Engagement Metrics
    push_notifications_sent INT DEFAULT 0,
    push_notifications_opened INT DEFAULT 0,
    deep_links_clicked INT DEFAULT 0,
    
    -- Quality Metrics
    call_completion_rate DECIMAL(5,2),
    user_satisfaction_score DECIMAL(3,2),
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_date_analytics (date_recorded),
    INDEX idx_date_analytics (date_recorded)
);

-- Mobile App Crashes Table
CREATE TABLE IF NOT EXISTS mobile_app_crashes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    device_id VARCHAR(255),
    
    -- Crash Details
    crash_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    app_version VARCHAR(20),
    os_version VARCHAR(20),
    device_model VARCHAR(100),
    
    -- Crash Information
    crash_type ENUM('exception', 'anr', 'oom', 'signal', 'other') NOT NULL,
    error_message TEXT,
    stack_trace LONGTEXT,
    
    -- Context
    session_id INT,
    user_action VARCHAR(255),
    screen_name VARCHAR(100),
    
    -- Device State
    available_memory BIGINT,
    battery_level INT,
    network_type VARCHAR(20),
    
    -- Crash Metadata
    crash_id VARCHAR(100) UNIQUE,
    symbolicated BOOLEAN DEFAULT FALSE,
    resolved BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE SET NULL,
    
    INDEX idx_crash_timestamp (crash_timestamp),
    INDEX idx_user_crashes (user_id, crash_timestamp),
    INDEX idx_crash_type (crash_type, crash_timestamp),
    INDEX idx_app_version (app_version, crash_timestamp)
);

-- Mobile Deep Links Table
CREATE TABLE IF NOT EXISTS mobile_deep_links (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Link Details
    link_id VARCHAR(50) UNIQUE NOT NULL,
    link_type ENUM('session_join', 'appointment_reminder', 'survey', 'general') NOT NULL,
    target_url VARCHAR(500) NOT NULL,
    
    -- Associated Data
    session_id INT,
    user_id INT,
    expires_at TIMESTAMP,
    
    -- Usage Tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    clicked_at TIMESTAMP NULL,
    click_count INT DEFAULT 0,
    
    -- Metadata
    campaign_name VARCHAR(100),
    source VARCHAR(100),
    medium VARCHAR(100),
    
    FOREIGN KEY (session_id) REFERENCES telehealth_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    
    INDEX idx_link_id (link_id),
    INDEX idx_link_type (link_type, created_at),
    INDEX idx_user_links (user_id, created_at),
    INDEX idx_session_links (session_id)
);

-- Triggers for Mobile Analytics
DELIMITER //

CREATE TRIGGER IF NOT EXISTS update_mobile_analytics_after_event
AFTER INSERT ON mobile_session_events
FOR EACH ROW
BEGIN
    IF NEW.event_type = 'app_opened' THEN
        INSERT INTO mobile_app_analytics (
            date_recorded, total_app_opens, unique_daily_users
        ) VALUES (
            DATE(NEW.event_timestamp), 1, 1
        ) ON DUPLICATE KEY UPDATE
            total_app_opens = total_app_opens + 1,
            unique_daily_users = (
                SELECT COUNT(DISTINCT user_id) 
                FROM mobile_session_events 
                WHERE DATE(event_timestamp) = DATE(NEW.event_timestamp)
                AND event_type = 'app_opened'
            ),
            calculated_at = NOW();
    END IF;
END //

CREATE TRIGGER IF NOT EXISTS update_mobile_analytics_after_notification
AFTER UPDATE ON mobile_notifications
FOR EACH ROW
BEGIN
    IF NEW.status = 'opened' AND OLD.status != 'opened' THEN
        INSERT INTO mobile_app_analytics (
            date_recorded, push_notifications_opened
        ) VALUES (
            DATE(NEW.opened_at), 1
        ) ON DUPLICATE KEY UPDATE
            push_notifications_opened = push_notifications_opened + 1,
            calculated_at = NOW();
    END IF;
END //

DELIMITER ;

-- Sample Data for Testing
INSERT IGNORE INTO mobile_devices (
    user_id, device_token, device_type, device_model, os_version, app_version,
    supports_background_mode, supports_picture_in_picture
) VALUES 
(2, 'sample_ios_token_123', 'ios', 'iPhone 13 Pro', '15.0', '1.0.0', TRUE, TRUE),
(3, 'sample_android_token_456', 'android', 'Samsung Galaxy S21', '12.0', '1.0.0', TRUE, FALSE);

INSERT IGNORE INTO mobile_app_config (
    user_id, video_quality, push_notifications_enabled, biometric_auth_enabled
) VALUES 
(2, 'high', TRUE, TRUE),
(3, 'auto', TRUE, FALSE);

SELECT 'Mobile App Integration Schema Created Successfully!' as Status;