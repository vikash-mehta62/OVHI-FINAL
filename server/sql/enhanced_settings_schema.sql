-- Enhanced Settings Database Schema
-- Run this SQL to create the required tables for enhanced settings

-- User Notification Settings
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  email_appointments BOOLEAN DEFAULT TRUE,
  email_lab_results BOOLEAN DEFAULT TRUE,
  email_patient_registration BOOLEAN DEFAULT TRUE,
  email_messages BOOLEAN DEFAULT TRUE,
  app_appointments BOOLEAN DEFAULT TRUE,
  app_checkins BOOLEAN DEFAULT TRUE,
  app_lab_results BOOLEAN DEFAULT TRUE,
  app_prescriptions BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '07:00:00',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_notifications (user_id)
);

-- User Privacy Settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  data_retention_period INT DEFAULT 7, -- years
  share_data_research BOOLEAN DEFAULT FALSE,
  marketing_communications BOOLEAN DEFAULT FALSE,
  audit_log_retention INT DEFAULT 3, -- years
  hipaa_compliance BOOLEAN DEFAULT TRUE,
  data_encryption BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_privacy (user_id)
);

-- User Appearance Settings
CREATE TABLE IF NOT EXISTS user_appearance_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  theme ENUM('light', 'dark', 'auto') DEFAULT 'light',
  font_size ENUM('small', 'medium', 'large', 'extra-large') DEFAULT 'medium',
  language VARCHAR(10) DEFAULT 'en',
  date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
  time_format ENUM('12h', '24h') DEFAULT '12h',
  density ENUM('compact', 'comfortable', 'spacious') DEFAULT 'comfortable',
  color_scheme ENUM('blue', 'green', 'purple', 'orange', 'red') DEFAULT 'blue',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_appearance (user_id)
);

-- User Security Settings
CREATE TABLE IF NOT EXISTS user_security_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  session_timeout INT DEFAULT 30, -- minutes
  max_concurrent_sessions INT DEFAULT 3,
  password_expiry_days INT DEFAULT 90,
  login_notifications BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_security (user_id)
);

-- Settings Audit Log
CREATE TABLE IF NOT EXISTS settings_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  setting_category VARCHAR(50) NOT NULL,
  setting_name VARCHAR(100) NOT NULL,
  old_value JSON,
  new_value JSON,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_user_category (user_id, setting_category),
  INDEX idx_changed_at (changed_at)
);

-- User Sessions (for session management)
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  device_info TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_session_token (session_token),
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_expires_at (expires_at)
);

-- Two-Factor Authentication
CREATE TABLE IF NOT EXISTS user_two_factor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  secret_key VARCHAR(255) NOT NULL,
  backup_codes JSON, -- Array of backup codes
  enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_2fa (user_id)
);

-- Practice Locations (for multi-location support)
CREATE TABLE IF NOT EXISTS practice_locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  practice_id INT NOT NULL,
  location_name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  fax VARCHAR(20),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_practice_active (practice_id, is_active)
);

-- User Preferences (additional settings)
CREATE TABLE IF NOT EXISTS user_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value TEXT,
  preference_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_preference (user_id, preference_key)
);

-- Insert default settings for existing users
INSERT IGNORE INTO user_notification_settings (user_id)
SELECT user_id FROM users WHERE role = 6;

INSERT IGNORE INTO user_privacy_settings (user_id)
SELECT user_id FROM users WHERE role = 6;

INSERT IGNORE INTO user_appearance_settings (user_id)
SELECT user_id FROM users WHERE role = 6;

INSERT IGNORE INTO user_security_settings (user_id)
SELECT user_id FROM users WHERE role = 6;
-- Addi
tional tables for enhanced notification and privacy features

-- User notifications history
CREATE TABLE IF NOT EXISTS user_notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  status VARCHAR(20) DEFAULT 'sent',
  delivery_method VARCHAR(20) NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  metadata JSON,
  INDEX idx_user_notifications (user_id, sent_at),
  INDEX idx_notification_type (notification_type),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Data export requests (GDPR compliance)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  export_format VARCHAR(10) DEFAULT 'json',
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  estimated_completion TIMESTAMP NULL,
  download_url VARCHAR(500) NULL,
  expires_at TIMESTAMP NULL,
  file_size BIGINT NULL,
  INDEX idx_user_exports (user_id, requested_at),
  INDEX idx_status_exports (status),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Account deletion requests (GDPR Right to be Forgotten)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  scheduled_deletion TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  cancellation_reason TEXT,
  INDEX idx_user_deletions (user_id, requested_at),
  INDEX idx_status_deletions (status),
  INDEX idx_scheduled_deletion (scheduled_deletion),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Update existing tables to match new controller structure
ALTER TABLE user_notification_settings 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE AFTER user_id,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT FALSE AFTER email_notifications,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT TRUE AFTER sms_notifications,
ADD COLUMN IF NOT EXISTS appointment_reminders BOOLEAN DEFAULT TRUE AFTER push_notifications,
ADD COLUMN IF NOT EXISTS billing_alerts BOOLEAN DEFAULT TRUE AFTER appointment_reminders,
ADD COLUMN IF NOT EXISTS system_updates BOOLEAN DEFAULT TRUE AFTER billing_alerts,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT FALSE AFTER system_updates,
ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN DEFAULT TRUE AFTER marketing_emails,
ADD COLUMN IF NOT EXISTS reminder_frequency INT DEFAULT 24 AFTER security_alerts,
ADD COLUMN IF NOT EXISTS notification_sound VARCHAR(20) DEFAULT 'default' AFTER quiet_hours_end;

ALTER TABLE user_privacy_settings
ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT FALSE AFTER user_id,
ADD COLUMN IF NOT EXISTS analytics_tracking BOOLEAN DEFAULT FALSE AFTER data_sharing_consent,
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE AFTER analytics_tracking,
ADD COLUMN IF NOT EXISTS third_party_sharing BOOLEAN DEFAULT FALSE AFTER marketing_consent,
ADD COLUMN IF NOT EXISTS auto_delete_inactive BOOLEAN DEFAULT FALSE AFTER data_retention_period,
ADD COLUMN IF NOT EXISTS export_data_format VARCHAR(10) DEFAULT 'json' AFTER auto_delete_inactive,
ADD COLUMN IF NOT EXISTS delete_account_request BOOLEAN DEFAULT FALSE AFTER export_data_format,
ADD COLUMN IF NOT EXISTS session_timeout INT DEFAULT 30 AFTER audit_log_retention,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE AFTER session_timeout,
ADD COLUMN IF NOT EXISTS login_notifications BOOLEAN DEFAULT TRUE AFTER two_factor_enabled,
ADD COLUMN IF NOT EXISTS data_encryption_level VARCHAR(10) DEFAULT 'aes256' AFTER login_notifications,
ADD COLUMN IF NOT EXISTS backup_frequency VARCHAR(10) DEFAULT 'daily' AFTER data_encryption_level,
ADD COLUMN IF NOT EXISTS gdpr_compliance BOOLEAN DEFAULT TRUE AFTER backup_frequency;

ALTER TABLE user_appearance_settings
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'America/New_York' AFTER language,
ADD COLUMN IF NOT EXISTS currency VARCHAR(5) DEFAULT 'USD' AFTER time_format,
ADD COLUMN IF NOT EXISTS sidebar_collapsed BOOLEAN DEFAULT FALSE AFTER currency,
ADD COLUMN IF NOT EXISTS compact_mode BOOLEAN DEFAULT FALSE AFTER sidebar_collapsed,
ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN DEFAULT FALSE AFTER compact_mode,
ADD COLUMN IF NOT EXISTS animations_enabled BOOLEAN DEFAULT TRUE AFTER high_contrast,
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT TRUE AFTER animations_enabled,
ADD COLUMN IF NOT EXISTS dashboard_layout VARCHAR(10) DEFAULT 'grid' AFTER sound_enabled,
ADD COLUMN IF NOT EXISTS items_per_page INT DEFAULT 20 AFTER dashboard_layout;