-- CLIA and DEA Number Schema
-- Critical for regulatory compliance

-- Add CLIA and regulatory fields to practice settings
ALTER TABLE practice_settings 
ADD COLUMN IF NOT EXISTS clia_number VARCHAR(12) NULL COMMENT 'Clinical Laboratory Improvement Amendments number',
ADD COLUMN IF NOT EXISTS clia_certificate_expiry DATE NULL COMMENT 'CLIA certificate expiration date',
ADD COLUMN IF NOT EXISTS laboratory_director VARCHAR(100) NULL COMMENT 'Laboratory director name',
ADD COLUMN IF NOT EXISTS laboratory_director_license VARCHAR(50) NULL COMMENT 'Laboratory director license number';

-- Add DEA and additional regulatory fields to provider settings
ALTER TABLE provider_settings 
ADD COLUMN IF NOT EXISTS dea_number VARCHAR(10) NULL COMMENT 'Drug Enforcement Administration number',
ADD COLUMN IF NOT EXISTS dea_expiry_date DATE NULL COMMENT 'DEA registration expiration date',
ADD COLUMN IF NOT EXISTS state_license_number VARCHAR(50) NULL COMMENT 'State medical license number',
ADD COLUMN IF NOT EXISTS state_license_state VARCHAR(2) NULL COMMENT 'State of license',
ADD COLUMN IF NOT EXISTS state_license_expiry DATE NULL COMMENT 'State license expiration date',
ADD COLUMN IF NOT EXISTS board_certification VARCHAR(100) NULL COMMENT 'Board certification details',
ADD COLUMN IF NOT EXISTS board_cert_expiry DATE NULL COMMENT 'Board certification expiration',
ADD COLUMN IF NOT EXISTS npi_type ENUM('individual', 'organization') DEFAULT 'individual' COMMENT 'Type of NPI';

-- Create table for multiple state licenses (providers can have licenses in multiple states)
CREATE TABLE IF NOT EXISTS provider_state_licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    license_number VARCHAR(50) NOT NULL,
    license_type VARCHAR(50) DEFAULT 'Medical License',
    issue_date DATE NULL,
    expiry_date DATE NULL,
    status ENUM('active', 'expired', 'suspended', 'revoked') DEFAULT 'active',
    issuing_board VARCHAR(100) NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_provider_state_license (provider_id, state_code, license_number),
    INDEX idx_provider_id (provider_id),
    INDEX idx_state_code (state_code),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status)
);

-- Create table for DEA registrations (providers can have multiple DEA numbers for different locations)
CREATE TABLE IF NOT EXISTS provider_dea_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    dea_number VARCHAR(10) NOT NULL,
    registration_type ENUM('practitioner', 'mid-level', 'researcher', 'manufacturer') DEFAULT 'practitioner',
    schedule_authority VARCHAR(10) DEFAULT '2,3,4,5' COMMENT 'Controlled substance schedules authorized',
    business_activity VARCHAR(100) NULL,
    expiry_date DATE NOT NULL,
    status ENUM('active', 'expired', 'suspended', 'revoked') DEFAULT 'active',
    registered_address TEXT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_dea_number (dea_number),
    INDEX idx_provider_id (provider_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status)
);

-- Create table for CLIA certificates (organizations can have multiple CLIA numbers for different labs)
CREATE TABLE IF NOT EXISTS organization_clia_certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL DEFAULT 1,
    clia_number VARCHAR(12) NOT NULL,
    certificate_type ENUM('waived', 'moderate_complexity', 'high_complexity', 'provider_performed') DEFAULT 'waived',
    laboratory_name VARCHAR(100) NOT NULL,
    laboratory_director VARCHAR(100) NULL,
    director_license_number VARCHAR(50) NULL,
    director_license_state VARCHAR(2) NULL,
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status ENUM('active', 'expired', 'suspended', 'revoked') DEFAULT 'active',
    laboratory_address TEXT NULL,
    specialties TEXT NULL COMMENT 'JSON array of laboratory specialties',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_clia_number (clia_number),
    INDEX idx_organization_id (organization_id),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_status (status)
);

-- Create regulatory compliance alerts table
CREATE TABLE IF NOT EXISTS regulatory_compliance_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alert_type ENUM('license_expiry', 'dea_expiry', 'clia_expiry', 'board_cert_expiry') NOT NULL,
    entity_type ENUM('provider', 'organization') NOT NULL,
    entity_id INT NOT NULL,
    identifier VARCHAR(50) NOT NULL COMMENT 'License number, DEA number, etc.',
    expiry_date DATE NOT NULL,
    alert_date DATE NOT NULL COMMENT 'When to send the alert',
    days_before_expiry INT NOT NULL,
    status ENUM('pending', 'sent', 'acknowledged', 'resolved') DEFAULT 'pending',
    message TEXT NULL,
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_alert_date (alert_date),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_status (status),
    INDEX idx_expiry_date (expiry_date)
);

-- Insert sample CLIA certificate
INSERT IGNORE INTO organization_clia_certificates (
    organization_id,
    clia_number,
    certificate_type,
    laboratory_name,
    laboratory_director,
    director_license_number,
    director_license_state,
    effective_date,
    expiry_date,
    status,
    laboratory_address,
    specialties
) VALUES (
    1,
    '12D3456789',
    'moderate_complexity',
    'OVHI Medical Laboratory',
    'Dr. Sarah Johnson',
    'MD123456',
    'CA',
    '2024-01-01',
    '2026-01-01',
    'active',
    '123 Medical Center Dr, Suite 100, Los Angeles, CA 90210',
    '["Hematology", "Chemistry", "Urinalysis", "Microbiology"]'
);

-- Insert sample provider licenses and DEA
INSERT IGNORE INTO provider_state_licenses (
    provider_id,
    state_code,
    license_number,
    license_type,
    issue_date,
    expiry_date,
    status,
    issuing_board
) VALUES 
(1, 'CA', 'A123456', 'Medical License', '2020-01-01', '2025-12-31', 'active', 'Medical Board of California'),
(1, 'NV', 'NV789012', 'Medical License', '2021-06-01', '2025-06-30', 'active', 'Nevada State Board of Medical Examiners');

INSERT IGNORE INTO provider_dea_registrations (
    provider_id,
    dea_number,
    registration_type,
    schedule_authority,
    business_activity,
    expiry_date,
    status,
    registered_address
) VALUES (
    1,
    'AB1234563',
    'practitioner',
    '2,3,4,5',
    'Prescribing controlled substances',
    '2025-08-31',
    'active',
    '123 Medical Center Dr, Los Angeles, CA 90210'
);

-- Create stored procedure to validate CLIA number format
DELIMITER //

CREATE FUNCTION IF NOT EXISTS ValidateCLIANumber(clia_number VARCHAR(12))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    -- CLIA number format: 2 digits + 1 letter + 7 digits (e.g., 12D3456789)
    IF LENGTH(clia_number) = 10 AND 
       clia_number REGEXP '^[0-9]{2}[A-Z][0-9]{7}$' THEN
        RETURN TRUE;
    END IF;
    RETURN FALSE;
END //

DELIMITER ;

-- Create stored procedure to validate DEA number format and checksum
DELIMITER //

CREATE FUNCTION IF NOT EXISTS ValidateDEANumber(dea_number VARCHAR(10))
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE checksum INT DEFAULT 0;
    DECLARE calculated_check INT DEFAULT 0;
    DECLARE provided_check INT DEFAULT 0;
    
    -- DEA number format: 2 letters + 7 digits (e.g., AB1234563)
    IF LENGTH(dea_number) != 9 OR 
       NOT (dea_number REGEXP '^[A-Z]{2}[0-9]{7}$') THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate DEA checksum
    SET checksum = 
        CAST(SUBSTRING(dea_number, 3, 1) AS UNSIGNED) +
        CAST(SUBSTRING(dea_number, 5, 1) AS UNSIGNED) +
        CAST(SUBSTRING(dea_number, 7, 1) AS UNSIGNED) +
        (CAST(SUBSTRING(dea_number, 4, 1) AS UNSIGNED) +
         CAST(SUBSTRING(dea_number, 6, 1) AS UNSIGNED) +
         CAST(SUBSTRING(dea_number, 8, 1) AS UNSIGNED)) * 2;
    
    SET calculated_check = checksum % 10;
    SET provided_check = CAST(SUBSTRING(dea_number, 9, 1) AS UNSIGNED);
    
    RETURN calculated_check = provided_check;
END //

DELIMITER ;

-- Create procedure to generate compliance alerts
DELIMITER //

CREATE PROCEDURE IF NOT EXISTS GenerateComplianceAlerts()
BEGIN
    -- Clear existing pending alerts
    DELETE FROM regulatory_compliance_alerts WHERE status = 'pending';
    
    -- Generate license expiry alerts (30, 60, 90 days before expiry)
    INSERT INTO regulatory_compliance_alerts (
        alert_type, entity_type, entity_id, identifier, expiry_date, alert_date, days_before_expiry, message
    )
    SELECT 
        'license_expiry',
        'provider',
        provider_id,
        license_number,
        expiry_date,
        DATE_SUB(expiry_date, INTERVAL days_before DAY),
        days_before,
        CONCAT('State license ', license_number, ' in ', state_code, ' expires on ', expiry_date)
    FROM provider_state_licenses psl
    CROSS JOIN (SELECT 30 as days_before UNION SELECT 60 UNION SELECT 90) d
    WHERE psl.status = 'active' 
    AND psl.expiry_date > CURDATE()
    AND DATE_SUB(psl.expiry_date, INTERVAL d.days_before DAY) >= CURDATE();
    
    -- Generate DEA expiry alerts
    INSERT INTO regulatory_compliance_alerts (
        alert_type, entity_type, entity_id, identifier, expiry_date, alert_date, days_before_expiry, message
    )
    SELECT 
        'dea_expiry',
        'provider',
        provider_id,
        dea_number,
        expiry_date,
        DATE_SUB(expiry_date, INTERVAL days_before DAY),
        days_before,
        CONCAT('DEA registration ', dea_number, ' expires on ', expiry_date)
    FROM provider_dea_registrations pdr
    CROSS JOIN (SELECT 30 as days_before UNION SELECT 60 UNION SELECT 90) d
    WHERE pdr.status = 'active' 
    AND pdr.expiry_date > CURDATE()
    AND DATE_SUB(pdr.expiry_date, INTERVAL d.days_before DAY) >= CURDATE();
    
    -- Generate CLIA expiry alerts
    INSERT INTO regulatory_compliance_alerts (
        alert_type, entity_type, entity_id, identifier, expiry_date, alert_date, days_before_expiry, message
    )
    SELECT 
        'clia_expiry',
        'organization',
        organization_id,
        clia_number,
        expiry_date,
        DATE_SUB(expiry_date, INTERVAL days_before DAY),
        days_before,
        CONCAT('CLIA certificate ', clia_number, ' expires on ', expiry_date)
    FROM organization_clia_certificates occ
    CROSS JOIN (SELECT 30 as days_before UNION SELECT 60 UNION SELECT 90) d
    WHERE occ.status = 'active' 
    AND occ.expiry_date > CURDATE()
    AND DATE_SUB(occ.expiry_date, INTERVAL d.days_before DAY) >= CURDATE();
    
END //

DELIMITER ;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practice_settings_clia ON practice_settings(clia_number);
CREATE INDEX IF NOT EXISTS idx_provider_settings_dea ON provider_settings(dea_number);
CREATE INDEX IF NOT EXISTS idx_provider_settings_license ON provider_settings(state_license_number, state_license_state);