-- Patient Outreach System Database Schema
-- This schema supports comprehensive patient communication management
-- with HIPAA compliance, multi-channel support, and advanced analytics

-- Patient Communication Preferences Table
CREATE TABLE patient_comm_prefs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    language VARCHAR(10) DEFAULT 'en',
    quiet_start TIME DEFAULT '22:00:00',
    quiet_end TIME DEFAULT '08:00:00',
    work_start TIME DEFAULT '09:00:00',
    work_end TIME DEFAULT '17:00:00',
    best_hour TINYINT NULL COMMENT 'Learned optimal hour (0-23) for patient engagement',
    allow_email BOOLEAN DEFAULT TRUE,
    allow_sms BOOLEAN DEFAULT TRUE,
    allow_whatsapp BOOLEAN DEFAULT FALSE,
    marketing_opt_in_email BOOLEAN DEFAULT FALSE,
    marketing_opt_in_sms BOOLEAN DEFAULT FALSE,
    marketing_opt_in_whatsapp BOOLEAN DEFAULT FALSE,
    email_address VARCHAR(255),
    sms_number VARCHAR(20),
    whatsapp_number VARCHAR(20),
    fatigue_score DECIMAL(3,2) DEFAULT 0.00 COMMENT 'Communication fatigue score (0-1)',
    last_engagement TIMESTAMP NULL COMMENT 'Last time patient engaged with communication',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    INDEX idx_patient_id (patient_id),
    INDEX idx_timezone (timezone),
    INDEX idx_language (language),
    INDEX idx_marketing_opts (marketing_opt_in_email, marketing_opt_in_sms, marketing_opt_in_whatsapp)
);

-- Communication Templates Table
CREATE TABLE comm_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    purpose ENUM('appt_confirm', 'appt_reminder', 'no_show', 'rx_refill', 'lab_ready', 'campaign_education', 'urgent') NOT NULL,
    channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    subject VARCHAR(255) COMMENT 'Email subject line (null for SMS/WhatsApp)',
    body TEXT NOT NULL,
    variables JSON COMMENT 'Allowed variables for this template',
    is_marketing BOOLEAN DEFAULT FALSE,
    organization_id INT,
    provider_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1 COMMENT 'Template version for A/B testing',
    parent_template_id INT NULL COMMENT 'Reference to original template for variants',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_purpose_channel (purpose, channel),
    INDEX idx_organization (organization_id),
    INDEX idx_provider (provider_id),
    INDEX idx_active_marketing (is_active, is_marketing),
    INDEX idx_language (language),
    FOREIGN KEY (parent_template_id) REFERENCES comm_templates(id) ON DELETE SET NULL
);

-- Patient Segments Table
CREATE TABLE patient_segments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rules JSON NOT NULL COMMENT 'JSON-based segmentation rules with AND/OR logic',
    organization_id INT,
    created_by INT,
    is_active BOOLEAN DEFAULT TRUE,
    last_evaluated TIMESTAMP NULL,
    patient_count INT DEFAULT 0,
    evaluation_frequency ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id),
    INDEX idx_active (is_active),
    INDEX idx_last_evaluated (last_evaluated),
    INDEX idx_created_by (created_by)
);

-- Communication Campaigns Table
CREATE TABLE comm_campaigns (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    segment_id INT NOT NULL,
    steps JSON NOT NULL COMMENT 'Array of campaign steps with day offsets and template IDs',
    ab_variants JSON COMMENT 'A/B test configuration and variants',
    organization_id INT,
    created_by INT,
    status ENUM('draft', 'active', 'paused', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    target_patient_count INT DEFAULT 0,
    enrolled_patient_count INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (segment_id) REFERENCES patient_segments(id) ON DELETE RESTRICT,
    INDEX idx_organization_status (organization_id, status),
    INDEX idx_segment (segment_id),
    INDEX idx_status_dates (status, start_date, end_date),
    INDEX idx_created_by (created_by)
);

-- Communication Jobs Table
CREATE TABLE comm_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    template_id INT NOT NULL,
    campaign_id INT NULL,
    purpose VARCHAR(50) NOT NULL,
    channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
    recipient VARCHAR(255) NOT NULL COMMENT 'Email address or phone number',
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSON COMMENT 'Template variables used for this job',
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP NULL,
    status ENUM('queued', 'processing', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled') DEFAULT 'queued',
    provider_message_id VARCHAR(255) COMMENT 'External provider message ID',
    error_message TEXT,
    retry_count TINYINT DEFAULT 0,
    max_retries TINYINT DEFAULT 5,
    is_urgent BOOLEAN DEFAULT FALSE,
    ab_variant VARCHAR(50) COMMENT 'A/B test variant identifier',
    cost_cents INT DEFAULT 0 COMMENT 'Communication cost in cents',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES comm_templates(id) ON DELETE RESTRICT,
    FOREIGN KEY (campaign_id) REFERENCES comm_campaigns(id) ON DELETE SET NULL,
    INDEX idx_patient_status (patient_id, status),
    INDEX idx_scheduled_status (scheduled_at, status),
    INDEX idx_provider_message (provider_message_id),
    INDEX idx_campaign (campaign_id),
    INDEX idx_channel_status (channel, status),
    INDEX idx_urgent_scheduled (is_urgent, scheduled_at),
    INDEX idx_retry_status (retry_count, status)
);

-- Inbound Communications Table
CREATE TABLE comm_inbound (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    channel ENUM('sms', 'whatsapp', 'email') NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    intent ENUM('confirm', 'reschedule', 'stop', 'help', 'other') NULL,
    confidence_score DECIMAL(3,2) COMMENT 'Intent recognition confidence (0-1)',
    related_job_id INT NULL,
    provider_message_id VARCHAR(255),
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP NULL,
    response_sent BOOLEAN DEFAULT FALSE,
    response_job_id INT NULL COMMENT 'ID of auto-response job if sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    FOREIGN KEY (related_job_id) REFERENCES comm_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (response_job_id) REFERENCES comm_jobs(id) ON DELETE SET NULL,
    INDEX idx_patient_channel (patient_id, channel),
    INDEX idx_processed (processed),
    INDEX idx_provider_message (provider_message_id),
    INDEX idx_intent (intent),
    INDEX idx_created_at (created_at)
);

-- Communication Statistics Table (Daily Aggregates)
CREATE TABLE comm_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    organization_id INT,
    provider_id INT,
    channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
    purpose VARCHAR(50) NOT NULL,
    campaign_id INT NULL,
    sent_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    opened_count INT DEFAULT 0,
    clicked_count INT DEFAULT 0,
    replied_count INT DEFAULT 0,
    bounced_count INT DEFAULT 0,
    unsubscribed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    total_cost_cents INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_stats (date, organization_id, provider_id, channel, purpose, campaign_id),
    INDEX idx_date_org (date, organization_id),
    INDEX idx_channel_purpose (channel, purpose),
    INDEX idx_campaign_date (campaign_id, date),
    FOREIGN KEY (campaign_id) REFERENCES comm_campaigns(id) ON DELETE SET NULL
);

-- Audit Log Table
CREATE TABLE comm_audit_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT,
    user_id INT,
    action ENUM('send', 'receive', 'opt_out', 'opt_in', 'preference_change', 'access', 'template_create', 'template_update', 'campaign_create', 'campaign_update') NOT NULL,
    entity_type ENUM('patient', 'template', 'campaign', 'job', 'preference') NOT NULL,
    entity_id INT,
    details JSON COMMENT 'Action-specific details and metadata',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_patient_action (patient_id, action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_action (user_id, action)
);

-- Provider Communication Settings Table
CREATE TABLE provider_comm_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    provider_id INT NOT NULL,
    organization_id INT NOT NULL,
    default_timezone VARCHAR(50) DEFAULT 'America/New_York',
    default_language VARCHAR(10) DEFAULT 'en',
    default_quiet_start TIME DEFAULT '22:00:00',
    default_quiet_end TIME DEFAULT '08:00:00',
    default_work_start TIME DEFAULT '09:00:00',
    default_work_end TIME DEFAULT '17:00:00',
    sms_hours_start TIME DEFAULT '08:00:00',
    sms_hours_end TIME DEFAULT '21:00:00',
    enable_auto_reminders BOOLEAN DEFAULT TRUE,
    reminder_hours_before JSON DEFAULT '[24, 2]' COMMENT 'Hours before appointment to send reminders',
    signature TEXT COMMENT 'Provider signature for communications',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_provider_org (provider_id, organization_id),
    INDEX idx_provider (provider_id),
    INDEX idx_organization (organization_id)
);

-- Organization Communication Settings Table
CREATE TABLE org_comm_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    organization_id INT NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    business_address TEXT NOT NULL COMMENT 'Required for CAN-SPAM compliance',
    business_phone VARCHAR(20),
    support_email VARCHAR(255),
    default_timezone VARCHAR(50) DEFAULT 'America/New_York',
    default_language VARCHAR(10) DEFAULT 'en',
    sendgrid_api_key VARCHAR(255),
    twilio_account_sid VARCHAR(255),
    twilio_auth_token VARCHAR(255),
    twilio_phone_number VARCHAR(20),
    whatsapp_business_id VARCHAR(255),
    whatsapp_access_token VARCHAR(255),
    enable_marketing BOOLEAN DEFAULT FALSE,
    marketing_consent_required BOOLEAN DEFAULT TRUE,
    data_retention_days INT DEFAULT 2555 COMMENT '7 years default retention',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_organization (organization_id)
);

-- Communication Queue Jobs Table (Redis backup)
CREATE TABLE comm_queue_jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    job_id VARCHAR(255) NOT NULL UNIQUE,
    queue_name VARCHAR(100) NOT NULL,
    payload JSON NOT NULL,
    priority TINYINT DEFAULT 5 COMMENT '1=highest, 10=lowest priority',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 5,
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    scheduled_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_queue_status (queue_name, status),
    INDEX idx_scheduled_priority (scheduled_at, priority),
    INDEX idx_job_id (job_id)
);

-- Patient Segment Membership Cache Table
CREATE TABLE patient_segment_membership (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    segment_id INT NOT NULL,
    is_member BOOLEAN NOT NULL,
    last_evaluated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluation_data JSON COMMENT 'Cached evaluation results for debugging',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_patient_segment (patient_id, segment_id),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES patient_segments(id) ON DELETE CASCADE,
    INDEX idx_segment_member (segment_id, is_member),
    INDEX idx_patient (patient_id),
    INDEX idx_last_evaluated (last_evaluated)
);