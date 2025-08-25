# Database Documentation

## Overview

This document provides comprehensive information about the RCM System database schema, including table structures, relationships, indexes, and data management procedures.

## Table of Contents

1. [Database Architecture](#database-architecture)
2. [Schema Overview](#schema-overview)
3. [Core Tables](#core-tables)
4. [Relationships](#relationships)
5. [Indexes & Performance](#indexes--performance)
6. [Data Types & Constraints](#data-types--constraints)
7. [Stored Procedures](#stored-procedures)
8. [Views](#views)
9. [Triggers](#triggers)
10. [Maintenance](#maintenance)

## Database Architecture

### Technology Stack
- **Database Engine**: MySQL 8.0+
- **Character Set**: utf8mb4 (full UTF-8 support)
- **Collation**: utf8mb4_unicode_ci
- **Storage Engine**: InnoDB (ACID compliance, foreign keys)
- **Time Zone**: UTC (all timestamps stored in UTC)

### Database Configuration
```sql
-- Recommended MySQL configuration
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 1
innodb_file_per_table = 1
max_connections = 200
query_cache_size = 64M
tmp_table_size = 64M
max_heap_table_size = 64M
```

### Connection Settings
```javascript
// Database connection configuration
const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'rcm_system',
  username: 'rcm_user',
  password: 'secure_password',
  dialect: 'mysql',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  timezone: '+00:00',
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  }
};
```

## Schema Overview

### Database Structure
```
rcm_system/
├── Core Tables
│   ├── users                    # System users
│   ├── roles                    # User roles
│   ├── permissions              # System permissions
│   └── user_roles               # User-role assignments
├── Healthcare Entities
│   ├── patients                 # Patient information
│   ├── providers                # Healthcare providers
│   ├── insurances               # Insurance companies
│   └── locations                # Practice locations
├── RCM Core
│   ├── claims                   # Insurance claims
│   ├── payments                 # Payment records
│   ├── adjustments              # Payment adjustments
│   ├── denials                  # Claim denials
│   └── appeals                  # Denial appeals
├── Financial
│   ├── ar_aging                 # A/R aging buckets
│   ├── collections              # Collection accounts
│   ├── collection_activities    # Collection activities
│   └── write_offs               # Write-off records
├── Configuration
│   ├── settings                 # System settings
│   ├── templates                # Document templates
│   ├── codes                    # Medical codes (ICD, CPT)
│   └── fee_schedules            # Fee schedules
└── Audit & Logging
    ├── audit_logs               # System audit trail
    ├── user_sessions            # User session tracking
    └── system_logs              # Application logs
```

## Core Tables

### Users Table
```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_active (is_active),
    INDEX idx_users_created (created_at)
);
```

### Patients Table
```sql
CREATE TABLE patients (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    patient_number VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender ENUM('M', 'F', 'O') NOT NULL,
    ssn VARCHAR(11), -- Encrypted
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'US',
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    primary_insurance_id CHAR(36),
    secondary_insurance_id CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_patients_number (patient_number),
    INDEX idx_patients_name (last_name, first_name),
    INDEX idx_patients_dob (date_of_birth),
    INDEX idx_patients_active (is_active),
    FOREIGN KEY (primary_insurance_id) REFERENCES insurances(id),
    FOREIGN KEY (secondary_insurance_id) REFERENCES insurances(id)
);
```

### Providers Table
```sql
CREATE TABLE providers (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    npi VARCHAR(10) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    credentials VARCHAR(50),
    specialty VARCHAR(100),
    license_number VARCHAR(50),
    license_state VARCHAR(2),
    dea_number VARCHAR(20),
    taxonomy_code VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_providers_npi (npi),
    INDEX idx_providers_name (last_name, first_name),
    INDEX idx_providers_specialty (specialty),
    INDEX idx_providers_active (is_active)
);
```

### Claims Table
```sql
CREATE TABLE claims (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    claim_number VARCHAR(20) NOT NULL UNIQUE,
    patient_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    location_id CHAR(36),
    primary_insurance_id CHAR(36),
    secondary_insurance_id CHAR(36),
    service_date DATE NOT NULL,
    service_date_end DATE,
    admission_date DATE,
    discharge_date DATE,
    diagnosis_primary VARCHAR(10) NOT NULL,
    diagnosis_secondary VARCHAR(10),
    diagnosis_tertiary VARCHAR(10),
    diagnosis_quaternary VARCHAR(10),
    procedure_primary VARCHAR(10) NOT NULL,
    procedure_secondary VARCHAR(10),
    procedure_tertiary VARCHAR(10),
    procedure_quaternary VARCHAR(10),
    total_charges DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_payments DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_adjustments DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    patient_responsibility DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('draft', 'ready', 'submitted', 'accepted', 'rejected', 'paid', 'closed') DEFAULT 'draft',
    submission_date TIMESTAMP NULL,
    acceptance_date TIMESTAMP NULL,
    payment_date TIMESTAMP NULL,
    clearinghouse VARCHAR(100),
    batch_id VARCHAR(50),
    icn VARCHAR(50), -- Internal Control Number
    notes TEXT,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_claims_number (claim_number),
    INDEX idx_claims_patient (patient_id),
    INDEX idx_claims_provider (provider_id),
    INDEX idx_claims_status (status),
    INDEX idx_claims_service_date (service_date),
    INDEX idx_claims_submission_date (submission_date),
    INDEX idx_claims_created (created_at),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (provider_id) REFERENCES providers(id),
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (primary_insurance_id) REFERENCES insurances(id),
    FOREIGN KEY (secondary_insurance_id) REFERENCES insurances(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Payments Table
```sql
CREATE TABLE payments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    payment_number VARCHAR(20) NOT NULL UNIQUE,
    claim_id CHAR(36) NOT NULL,
    payer_type ENUM('insurance', 'patient', 'other') NOT NULL,
    payer_id CHAR(36),
    payment_method ENUM('check', 'eft', 'credit_card', 'cash', 'other') NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    deposit_date DATE,
    check_number VARCHAR(50),
    reference_number VARCHAR(100),
    era_number VARCHAR(50), -- Electronic Remittance Advice
    batch_id VARCHAR(50),
    notes TEXT,
    status ENUM('pending', 'posted', 'reversed') DEFAULT 'pending',
    posted_by CHAR(36),
    posted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_payments_number (payment_number),
    INDEX idx_payments_claim (claim_id),
    INDEX idx_payments_payer (payer_type, payer_id),
    INDEX idx_payments_date (payment_date),
    INDEX idx_payments_status (status),
    INDEX idx_payments_era (era_number),
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (posted_by) REFERENCES users(id)
);
```

### Adjustments Table
```sql
CREATE TABLE adjustments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    claim_id CHAR(36) NOT NULL,
    payment_id CHAR(36),
    adjustment_type ENUM('contractual', 'write_off', 'refund', 'correction', 'other') NOT NULL,
    adjustment_reason_code VARCHAR(10),
    adjustment_amount DECIMAL(10,2) NOT NULL,
    adjustment_date DATE NOT NULL,
    description TEXT,
    notes TEXT,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_adjustments_claim (claim_id),
    INDEX idx_adjustments_payment (payment_id),
    INDEX idx_adjustments_type (adjustment_type),
    INDEX idx_adjustments_date (adjustment_date),
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (payment_id) REFERENCES payments(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### Denials Table
```sql
CREATE TABLE denials (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    claim_id CHAR(36) NOT NULL,
    denial_date DATE NOT NULL,
    denial_reason_code VARCHAR(10) NOT NULL,
    denial_reason_description TEXT,
    denied_amount DECIMAL(10,2) NOT NULL,
    is_appealable BOOLEAN DEFAULT TRUE,
    appeal_deadline DATE,
    appeal_level ENUM('first', 'second', 'third') DEFAULT 'first',
    status ENUM('pending', 'appealed', 'overturned', 'upheld', 'expired') DEFAULT 'pending',
    notes TEXT,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_denials_claim (claim_id),
    INDEX idx_denials_date (denial_date),
    INDEX idx_denials_reason (denial_reason_code),
    INDEX idx_denials_status (status),
    INDEX idx_denials_appealable (is_appealable),
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### A/R Aging Table
```sql
CREATE TABLE ar_aging (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    claim_id CHAR(36) NOT NULL,
    patient_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    insurance_id CHAR(36),
    balance_amount DECIMAL(10,2) NOT NULL,
    days_outstanding INT NOT NULL,
    age_bucket ENUM('0-30', '31-60', '61-90', '91-120', '120+') NOT NULL,
    last_activity_date DATE,
    last_activity_type VARCHAR(50),
    priority_level ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to CHAR(36),
    status ENUM('active', 'working', 'resolved', 'written_off') DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ar_aging_claim (claim_id),
    INDEX idx_ar_aging_patient (patient_id),
    INDEX idx_ar_aging_provider (provider_id),
    INDEX idx_ar_aging_bucket (age_bucket),
    INDEX idx_ar_aging_days (days_outstanding),
    INDEX idx_ar_aging_assigned (assigned_to),
    INDEX idx_ar_aging_status (status),
    FOREIGN KEY (claim_id) REFERENCES claims(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (provider_id) REFERENCES providers(id),
    FOREIGN KEY (insurance_id) REFERENCES insurances(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);
```

## Relationships

### Entity Relationship Diagram
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Patients  │       │   Claims    │       │  Providers  │
│             │──────►│             │◄──────│             │
│ • id        │ 1:N   │ • id        │ N:1   │ • id        │
│ • name      │       │ • patient_id│       │ • name      │
│ • dob       │       │ • provider_id│      │ • npi       │
└─────────────┘       │ • amount    │       └─────────────┘
                      │ • status    │
                      └─────────────┘
                             │
                             │ 1:N
                             ▼
                      ┌─────────────┐
                      │  Payments   │
                      │             │
                      │ • id        │
                      │ • claim_id  │
                      │ • amount    │
                      │ • date      │
                      └─────────────┘
```

### Key Relationships

#### One-to-Many Relationships
- **Patients → Claims**: One patient can have multiple claims
- **Providers → Claims**: One provider can have multiple claims
- **Claims → Payments**: One claim can have multiple payments
- **Claims → Adjustments**: One claim can have multiple adjustments
- **Claims → Denials**: One claim can have multiple denials
- **Users → Claims**: One user can create multiple claims

#### Many-to-Many Relationships
- **Users ↔ Roles**: Users can have multiple roles, roles can be assigned to multiple users
- **Claims ↔ Diagnosis Codes**: Claims can have multiple diagnoses
- **Claims ↔ Procedure Codes**: Claims can have multiple procedures

#### Self-Referencing Relationships
- **Appeals → Denials**: Appeals reference parent denials
- **Users → Users**: Users can have managers (self-referencing)

## Indexes & Performance

### Primary Indexes
```sql
-- Unique indexes for business keys
CREATE UNIQUE INDEX idx_patients_number ON patients(patient_number);
CREATE UNIQUE INDEX idx_providers_npi ON providers(npi);
CREATE UNIQUE INDEX idx_claims_number ON claims(claim_number);
CREATE UNIQUE INDEX idx_payments_number ON payments(payment_number);

-- Foreign key indexes
CREATE INDEX idx_claims_patient_id ON claims(patient_id);
CREATE INDEX idx_claims_provider_id ON claims(provider_id);
CREATE INDEX idx_payments_claim_id ON payments(claim_id);
CREATE INDEX idx_adjustments_claim_id ON adjustments(claim_id);
```

### Performance Indexes
```sql
-- Date-based queries
CREATE INDEX idx_claims_service_date ON claims(service_date);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
CREATE INDEX idx_ar_aging_days ON ar_aging(days_outstanding);

-- Status-based queries
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_denials_status ON denials(status);

-- Composite indexes for common queries
CREATE INDEX idx_claims_patient_status ON claims(patient_id, status);
CREATE INDEX idx_claims_provider_date ON claims(provider_id, service_date);
CREATE INDEX idx_ar_aging_bucket_amount ON ar_aging(age_bucket, balance_amount);
```

### Query Optimization Examples
```sql
-- Optimized query for claims dashboard
SELECT 
    c.id,
    c.claim_number,
    c.service_date,
    c.total_charges,
    c.status,
    p.first_name,
    p.last_name,
    pr.first_name AS provider_first_name,
    pr.last_name AS provider_last_name
FROM claims c
INNER JOIN patients p ON c.patient_id = p.id
INNER JOIN providers pr ON c.provider_id = pr.id
WHERE c.status IN ('submitted', 'accepted')
    AND c.service_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY c.service_date DESC
LIMIT 50;

-- Optimized A/R aging query
SELECT 
    age_bucket,
    COUNT(*) as claim_count,
    SUM(balance_amount) as total_balance,
    AVG(balance_amount) as avg_balance
FROM ar_aging
WHERE status = 'active'
GROUP BY age_bucket
ORDER BY FIELD(age_bucket, '0-30', '31-60', '61-90', '91-120', '120+');
```

## Data Types & Constraints

### Standard Data Types
```sql
-- Identifiers
id CHAR(36) PRIMARY KEY DEFAULT (UUID())  -- UUID primary keys
reference_number VARCHAR(50)              -- External reference numbers

-- Names and Text
first_name VARCHAR(100) NOT NULL          -- Person names
description TEXT                          -- Long descriptions
notes TEXT                               -- User notes

-- Financial
amount DECIMAL(10,2) NOT NULL DEFAULT 0.00  -- Currency amounts
percentage DECIMAL(5,2)                     -- Percentages (0.00-100.00)

-- Dates and Times
service_date DATE NOT NULL                  -- Date only
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Full timestamp
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- Status Fields
status ENUM('active', 'inactive') DEFAULT 'active'  -- Predefined statuses
is_active BOOLEAN DEFAULT TRUE                      -- Boolean flags
```

### Constraints and Validations
```sql
-- Check constraints
ALTER TABLE claims ADD CONSTRAINT chk_claims_charges 
    CHECK (total_charges >= 0);

ALTER TABLE payments ADD CONSTRAINT chk_payments_amount 
    CHECK (payment_amount > 0);

ALTER TABLE ar_aging ADD CONSTRAINT chk_ar_aging_days 
    CHECK (days_outstanding >= 0);

-- Foreign key constraints with cascading
ALTER TABLE claims ADD CONSTRAINT fk_claims_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) 
    ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE payments ADD CONSTRAINT fk_payments_claim 
    FOREIGN KEY (claim_id) REFERENCES claims(id) 
    ON UPDATE CASCADE ON DELETE RESTRICT;
```

## Stored Procedures

### Calculate A/R Aging
```sql
DELIMITER //

CREATE PROCEDURE CalculateARAging()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE claim_id_var CHAR(36);
    DECLARE balance_var DECIMAL(10,2);
    DECLARE days_var INT;
    DECLARE bucket_var VARCHAR(10);
    
    DECLARE claim_cursor CURSOR FOR
        SELECT 
            c.id,
            (c.total_charges - COALESCE(SUM(p.payment_amount), 0) - COALESCE(SUM(a.adjustment_amount), 0)) as balance,
            DATEDIFF(CURDATE(), c.service_date) as days_outstanding
        FROM claims c
        LEFT JOIN payments p ON c.id = p.claim_id AND p.status = 'posted'
        LEFT JOIN adjustments a ON c.id = a.claim_id
        WHERE c.status NOT IN ('paid', 'closed')
        GROUP BY c.id
        HAVING balance > 0;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- Clear existing A/R aging data
    DELETE FROM ar_aging;
    
    OPEN claim_cursor;
    
    read_loop: LOOP
        FETCH claim_cursor INTO claim_id_var, balance_var, days_var;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Determine age bucket
        CASE
            WHEN days_var <= 30 THEN SET bucket_var = '0-30';
            WHEN days_var <= 60 THEN SET bucket_var = '31-60';
            WHEN days_var <= 90 THEN SET bucket_var = '61-90';
            WHEN days_var <= 120 THEN SET bucket_var = '91-120';
            ELSE SET bucket_var = '120+';
        END CASE;
        
        -- Insert A/R aging record
        INSERT INTO ar_aging (
            claim_id, 
            balance_amount, 
            days_outstanding, 
            age_bucket,
            patient_id,
            provider_id,
            insurance_id
        )
        SELECT 
            claim_id_var,
            balance_var,
            days_var,
            bucket_var,
            c.patient_id,
            c.provider_id,
            c.primary_insurance_id
        FROM claims c
        WHERE c.id = claim_id_var;
        
    END LOOP;
    
    CLOSE claim_cursor;
END //

DELIMITER ;
```

### Generate Claim Number
```sql
DELIMITER //

CREATE PROCEDURE GenerateClaimNumber(
    IN provider_id_param CHAR(36),
    OUT claim_number_out VARCHAR(20)
)
BEGIN
    DECLARE provider_code VARCHAR(5);
    DECLARE sequence_num INT;
    DECLARE year_code VARCHAR(2);
    
    -- Get provider code (first 3 letters of last name + first 2 of first name)
    SELECT CONCAT(
        LEFT(UPPER(last_name), 3),
        LEFT(UPPER(first_name), 2)
    ) INTO provider_code
    FROM providers
    WHERE id = provider_id_param;
    
    -- Get current year (last 2 digits)
    SET year_code = RIGHT(YEAR(CURDATE()), 2);
    
    -- Get next sequence number for this provider and year
    SELECT COALESCE(MAX(CAST(RIGHT(claim_number, 4) AS UNSIGNED)), 0) + 1
    INTO sequence_num
    FROM claims
    WHERE claim_number LIKE CONCAT(provider_code, year_code, '%');
    
    -- Generate claim number: PROVIDERCODE + YEAR + SEQUENCE (4 digits)
    SET claim_number_out = CONCAT(
        provider_code,
        year_code,
        LPAD(sequence_num, 4, '0')
    );
END //

DELIMITER ;
```

## Views

### Claims Summary View
```sql
CREATE VIEW v_claims_summary AS
SELECT 
    c.id,
    c.claim_number,
    c.service_date,
    c.total_charges,
    c.status,
    CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
    p.date_of_birth,
    CONCAT(pr.first_name, ' ', pr.last_name) AS provider_name,
    pr.npi,
    i.name AS insurance_name,
    COALESCE(SUM(pay.payment_amount), 0) AS total_payments,
    COALESCE(SUM(adj.adjustment_amount), 0) AS total_adjustments,
    (c.total_charges - COALESCE(SUM(pay.payment_amount), 0) - COALESCE(SUM(adj.adjustment_amount), 0)) AS balance,
    DATEDIFF(CURDATE(), c.service_date) AS days_outstanding,
    c.created_at,
    c.updated_at
FROM claims c
INNER JOIN patients p ON c.patient_id = p.id
INNER JOIN providers pr ON c.provider_id = pr.id
LEFT JOIN insurances i ON c.primary_insurance_id = i.id
LEFT JOIN payments pay ON c.id = pay.claim_id AND pay.status = 'posted'
LEFT JOIN adjustments adj ON c.id = adj.claim_id
WHERE c.deleted_at IS NULL
GROUP BY c.id;
```

### A/R Aging Summary View
```sql
CREATE VIEW v_ar_aging_summary AS
SELECT 
    age_bucket,
    COUNT(*) AS claim_count,
    SUM(balance_amount) AS total_balance,
    AVG(balance_amount) AS average_balance,
    MIN(balance_amount) AS min_balance,
    MAX(balance_amount) AS max_balance,
    SUM(CASE WHEN priority_level = 'urgent' THEN 1 ELSE 0 END) AS urgent_count,
    SUM(CASE WHEN priority_level = 'high' THEN 1 ELSE 0 END) AS high_count
FROM ar_aging
WHERE status = 'active'
GROUP BY age_bucket
ORDER BY FIELD(age_bucket, '0-30', '31-60', '61-90', '91-120', '120+');
```

### Revenue Analytics View
```sql
CREATE VIEW v_revenue_analytics AS
SELECT 
    DATE_FORMAT(c.service_date, '%Y-%m') AS service_month,
    COUNT(c.id) AS total_claims,
    SUM(c.total_charges) AS total_charges,
    SUM(COALESCE(p.payment_amount, 0)) AS total_payments,
    SUM(COALESCE(a.adjustment_amount, 0)) AS total_adjustments,
    (SUM(COALESCE(p.payment_amount, 0)) / SUM(c.total_charges)) * 100 AS collection_rate,
    AVG(DATEDIFF(p.payment_date, c.service_date)) AS avg_days_to_payment
FROM claims c
LEFT JOIN payments p ON c.id = p.claim_id AND p.status = 'posted'
LEFT JOIN adjustments a ON c.id = a.claim_id
WHERE c.deleted_at IS NULL
    AND c.service_date >= DATE_SUB(CURDATE(), INTERVAL 24 MONTH)
GROUP BY DATE_FORMAT(c.service_date, '%Y-%m')
ORDER BY service_month DESC;
```

## Triggers

### Audit Trail Trigger
```sql
DELIMITER //

CREATE TRIGGER tr_claims_audit_insert
AFTER INSERT ON claims
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        created_at
    ) VALUES (
        'claims',
        NEW.id,
        'INSERT',
        NULL,
        JSON_OBJECT(
            'claim_number', NEW.claim_number,
            'patient_id', NEW.patient_id,
            'provider_id', NEW.provider_id,
            'total_charges', NEW.total_charges,
            'status', NEW.status
        ),
        NEW.created_by,
        NOW()
    );
END //

CREATE TRIGGER tr_claims_audit_update
AFTER UPDATE ON claims
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        created_at
    ) VALUES (
        'claims',
        NEW.id,
        'UPDATE',
        JSON_OBJECT(
            'claim_number', OLD.claim_number,
            'status', OLD.status,
            'total_charges', OLD.total_charges
        ),
        JSON_OBJECT(
            'claim_number', NEW.claim_number,
            'status', NEW.status,
            'total_charges', NEW.total_charges
        ),
        NEW.created_by,
        NOW()
    );
END //

DELIMITER ;
```

### Balance Calculation Trigger
```sql
DELIMITER //

CREATE TRIGGER tr_payments_update_claim_balance
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
    UPDATE claims 
    SET total_payments = (
        SELECT COALESCE(SUM(payment_amount), 0)
        FROM payments 
        WHERE claim_id = NEW.claim_id 
        AND status = 'posted'
    )
    WHERE id = NEW.claim_id;
END //

DELIMITER ;
```

## Maintenance

### Regular Maintenance Tasks

#### Daily Tasks
```sql
-- Update A/R aging
CALL CalculateARAging();

-- Clean up old sessions
DELETE FROM user_sessions 
WHERE expires_at < NOW() - INTERVAL 7 DAY;

-- Update statistics
ANALYZE TABLE claims, payments, patients, providers;
```

#### Weekly Tasks
```sql
-- Optimize tables
OPTIMIZE TABLE claims, payments, adjustments, ar_aging;

-- Check for orphaned records
SELECT 'Orphaned Payments' as issue, COUNT(*) as count
FROM payments p
LEFT JOIN claims c ON p.claim_id = c.id
WHERE c.id IS NULL;

-- Archive old audit logs
INSERT INTO audit_logs_archive 
SELECT * FROM audit_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);

DELETE FROM audit_logs 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

#### Monthly Tasks
```sql
-- Generate monthly statistics
INSERT INTO monthly_statistics (
    month_year,
    total_claims,
    total_revenue,
    collection_rate,
    avg_days_ar
)
SELECT 
    DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m'),
    COUNT(*),
    SUM(total_charges),
    (SUM(total_payments) / SUM(total_charges)) * 100,
    AVG(DATEDIFF(CURDATE(), service_date))
FROM claims
WHERE service_date >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), INTERVAL 1 MONTH)
    AND service_date < DATE_SUB(CURDATE(), INTERVAL 1 MONTH);
```

### Backup Strategy
```bash
#!/bin/bash
# Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
DB_NAME="rcm_system"

# Full backup
mysqldump --single-transaction --routines --triggers \
    --user=backup_user --password=backup_pass \
    $DB_NAME > $BACKUP_DIR/rcm_full_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/rcm_full_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "rcm_full_*.sql.gz" -mtime +30 -delete
```

### Performance Monitoring
```sql
-- Monitor slow queries
SELECT 
    query_time,
    lock_time,
    rows_sent,
    rows_examined,
    sql_text
FROM mysql.slow_log
WHERE start_time >= DATE_SUB(NOW(), INTERVAL 1 DAY)
ORDER BY query_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
    table_rows
FROM information_schema.tables
WHERE table_schema = 'rcm_system'
ORDER BY (data_length + index_length) DESC;

-- Monitor index usage
SELECT 
    t.table_name,
    s.index_name,
    s.cardinality,
    s.seq_in_index,
    s.column_name
FROM information_schema.statistics s
JOIN information_schema.tables t ON s.table_name = t.table_name
WHERE t.table_schema = 'rcm_system'
    AND s.cardinality < 100
ORDER BY s.cardinality;
```

---

**Document Version**: 1.0  
**Last Updated**: January 2024  
**Next Review**: April 2024  
**Document Owner**: Database Administration Team