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