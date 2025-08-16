# Patient Profile Gap Analysis & Implementation Plan

## Executive Summary

This document identifies critical gaps in the OVHI Patient Profile system and provides detailed implementation plans with acceptance criteria. The analysis reveals 41 missing or incomplete features across 8 major categories.

## Critical Gaps by Priority

### Priority 0 (Critical - Implement Immediately)

#### GAP-001: Enhanced Patient Demographics
**Current State**: Basic demographic fields only
**Gap**: Missing suffix, pronouns, language preference, accessibility needs
**Impact**: Incomplete patient identification, communication barriers
**Fix Plan**: Extend user_profiles table with additional demographic fields

**Implementation**:
```sql
ALTER TABLE user_profiles ADD COLUMN (
    suffix VARCHAR(10),
    pronouns VARCHAR(20),
    language_preference VARCHAR(50) DEFAULT 'English',
    preferred_communication ENUM('phone', 'email', 'sms', 'portal') DEFAULT 'phone',
    disability_status TEXT,
    accessibility_needs TEXT,
    marital_status ENUM('single', 'married', 'divorced', 'widowed', 'other'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Acceptance Criteria**:
- [ ] All new demographic fields added to database
- [ ] Frontend forms updated to capture new fields
- [ ] Validation rules implemented for required fields
- [ ] Existing patient records can be updated with new fields
- [ ] Reports include new demographic data

---

#### GAP-002: Secure SSN Storage
**Current State**: No SSN field
**Gap**: Missing encrypted SSN storage for billing compliance
**Impact**: Manual SSN entry, compliance risks
**Fix Plan**: Add encrypted SSN field with proper security

**Implementation**:
```sql
ALTER TABLE user_profiles ADD COLUMN (
    ssn_encrypted VARBINARY(255),
    ssn_hash VARCHAR(64),
    INDEX idx_ssn_hash (ssn_hash)
);
```

```javascript
// Encryption service
const encryptSSN = (ssn) => {
    const cipher = crypto.createCipher('aes-256-cbc', process.env.SSN_ENCRYPTION_KEY);
    let encrypted = cipher.update(ssn, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const hashSSN = (ssn) => {
    return crypto.createHash('sha256').update(ssn + process.env.SSN_SALT).digest('hex');
};
```

**Acceptance Criteria**:
- [ ] SSN encrypted at rest using AES-256
- [ ] SSN hash for duplicate detection
- [ ] Role-based access to SSN (billing staff only)
- [ ] Audit logging for SSN access
- [ ] Compliance with HIPAA encryption requirements

---

#### GAP-003: Insurance Hierarchy Management
**Current State**: Basic insurance storage without hierarchy
**Gap**: No primary/secondary/tertiary enforcement
**Impact**: Incorrect claim submissions, payment delays
**Fix Plan**: Implement proper insurance hierarchy with validation

**Implementation**:
```sql
ALTER TABLE patient_insurances ADD COLUMN (
    coverage_priority ENUM('primary', 'secondary', 'tertiary') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE KEY unique_patient_priority (fk_userid, coverage_priority, is_active)
);

-- Trigger to enforce only one active insurance per priority
DELIMITER //
CREATE TRIGGER enforce_insurance_hierarchy 
BEFORE INSERT ON patient_insurances
FOR EACH ROW
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE patient_insurances 
        SET is_active = FALSE 
        WHERE fk_userid = NEW.fk_userid 
        AND coverage_priority = NEW.coverage_priority 
        AND is_active = TRUE;
    END IF;
END//
DELIMITER ;
```

**Acceptance Criteria**:
- [ ] Only one active insurance per priority level
- [ ] Automatic deactivation of old insurance when new is added
- [ ] Claims use correct insurance hierarchy
- [ ] Frontend displays insurance in priority order
- [ ] Validation prevents duplicate active insurance

---

#### GAP-004: Field-Level Encryption & Access Control
**Current State**: No field-level security
**Gap**: PHI fields not encrypted, no role-based masking
**Impact**: HIPAA compliance risk, unauthorized data access
**Fix Plan**: Implement comprehensive field-level security

**Implementation**:
```javascript
// Role-based field masking middleware
const maskPHIFields = (userData, userRole) => {
    const maskedData = { ...userData };
    
    const fieldPermissions = {
        'front_desk': ['name', 'phone', 'address'],
        'billing': ['name', 'phone', 'address', 'ssn', 'insurance'],
        'clinical': ['name', 'phone', 'address', 'allergies', 'medications'],
        'admin': ['*'] // All fields
    };
    
    const allowedFields = fieldPermissions[userRole] || [];
    
    if (!allowedFields.includes('*')) {
        // Mask restricted fields
        if (!allowedFields.includes('ssn')) {
            maskedData.ssn = '***-**-****';
        }
        // Add more field masking logic
    }
    
    return maskedData;
};
```

**Acceptance Criteria**:
- [ ] PHI fields encrypted at rest
- [ ] Role-based field masking implemented
- [ ] Audit logging for all PHI access
- [ ] Frontend respects field permissions
- [ ] Compliance with HIPAA security requirements

---

### Priority 1 (High - Implement Within 30 Days)

#### GAP-005: Comprehensive Document Management
**Current State**: No document management system
**Gap**: Missing document storage, versioning, digital signatures
**Impact**: Manual document handling, compliance gaps
**Fix Plan**: Implement full document management system

**Implementation**:
```sql
CREATE TABLE patient_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    document_type ENUM('id_card', 'insurance_card', 'consent_form', 'medical_record', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    version_number INT DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    digital_signature LONGTEXT,
    signature_date DATETIME,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_docs (patient_id, document_type),
    INDEX idx_current_version (is_current_version)
);

CREATE TABLE document_versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    document_id INT NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    change_reason TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (document_id) REFERENCES patient_documents(id),
    UNIQUE KEY unique_doc_version (document_id, version_number)
);
```

**Acceptance Criteria**:
- [ ] Document upload and storage functionality
- [ ] Version control for document updates
- [ ] Digital signature capture and storage
- [ ] Document categorization and search
- [ ] Audit trail for document access

---

#### GAP-006: Clinical Data Enhancement
**Current State**: Basic clinical data only
**Gap**: Missing problem list, risk scores, immunizations
**Impact**: Incomplete clinical picture, care gaps
**Fix Plan**: Expand clinical data capture and management

**Implementation**:
```sql
CREATE TABLE patient_problem_list (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    problem_code VARCHAR(20),
    problem_description TEXT NOT NULL,
    onset_date DATE,
    status ENUM('active', 'inactive', 'resolved') DEFAULT 'active',
    severity ENUM('mild', 'moderate', 'severe'),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_problems (patient_id, status)
);

CREATE TABLE patient_risk_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    score_type ENUM('hcc_raf', 'fall_risk', 'readmission_risk', 'mortality_risk') NOT NULL,
    score_value DECIMAL(10,4) NOT NULL,
    score_date DATE NOT NULL,
    calculated_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_scores (patient_id, score_type, score_date)
);

CREATE TABLE patient_immunizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    vaccine_name VARCHAR(255) NOT NULL,
    vaccine_code VARCHAR(20),
    administration_date DATE NOT NULL,
    lot_number VARCHAR(50),
    manufacturer VARCHAR(100),
    site_administered VARCHAR(50),
    administered_by INT,
    next_due_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_vaccines (patient_id, vaccine_name)
);
```

**Acceptance Criteria**:
- [ ] Problem list management functionality
- [ ] Risk score calculation and tracking
- [ ] Immunization record management
- [ ] Integration with clinical workflows
- [ ] Reporting on clinical quality measures

---

#### GAP-007: Payment Plan Management
**Current State**: No payment plan functionality
**Gap**: Missing installment tracking, auto-pay setup
**Impact**: Manual payment tracking, collection inefficiencies
**Fix Plan**: Implement comprehensive payment plan system

**Implementation**:
```sql
CREATE TABLE patient_payment_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    plan_name VARCHAR(255),
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) DEFAULT 0.00,
    monthly_payment DECIMAL(10,2) NOT NULL,
    number_of_payments INT NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0.00,
    start_date DATE NOT NULL,
    first_payment_date DATE NOT NULL,
    plan_status ENUM('active', 'completed', 'defaulted', 'cancelled') DEFAULT 'active',
    auto_pay_enabled BOOLEAN DEFAULT FALSE,
    payment_method_token VARCHAR(255),
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_plans (patient_id, plan_status)
);

CREATE TABLE payment_plan_installments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_plan_id INT NOT NULL,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    payment_date DATE,
    status ENUM('pending', 'paid', 'overdue', 'skipped') DEFAULT 'pending',
    late_fee DECIMAL(10,2) DEFAULT 0.00,
    
    FOREIGN KEY (payment_plan_id) REFERENCES patient_payment_plans(id),
    INDEX idx_plan_installments (payment_plan_id, due_date)
);
```

**Acceptance Criteria**:
- [ ] Payment plan creation and management
- [ ] Automatic installment scheduling
- [ ] Auto-pay functionality with stored payment methods
- [ ] Late fee calculation and application
- [ ] Payment plan reporting and analytics

---

### Priority 2 (Medium - Implement Within 60 Days)

#### GAP-008: Patient Portal Integration
**Current State**: No patient portal functionality
**Gap**: Missing patient self-service capabilities
**Impact**: Increased administrative burden, patient dissatisfaction
**Fix Plan**: Implement patient portal with profile management

**Implementation**:
```sql
CREATE TABLE patient_portal_access (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    portal_username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login DATETIME,
    login_attempts INT DEFAULT 0,
    account_locked BOOLEAN DEFAULT FALSE,
    password_reset_token VARCHAR(255),
    password_reset_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_portal_username (portal_username)
);

CREATE TABLE portal_activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    activity_type ENUM('login', 'profile_update', 'document_view', 'payment', 'appointment') NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_activity (patient_id, created_at)
);
```

**Acceptance Criteria**:
- [ ] Patient registration and login functionality
- [ ] Profile viewing and limited editing capabilities
- [ ] Document viewing (statements, test results)
- [ ] Payment processing through portal
- [ ] Activity logging and security features

---

#### GAP-009: Advanced Analytics Integration
**Current State**: Basic reporting only
**Gap**: Missing predictive analytics, outcome tracking
**Impact**: Limited insights for quality improvement
**Fix Plan**: Implement advanced analytics and reporting

**Implementation**:
```sql
CREATE TABLE patient_analytics_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    calculation_date DATE NOT NULL,
    data_source VARCHAR(100),
    additional_data JSON,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_metrics (patient_id, metric_name, calculation_date)
);

CREATE TABLE patient_outcomes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    patient_id INT NOT NULL,
    outcome_type ENUM('clinical', 'financial', 'satisfaction', 'quality') NOT NULL,
    outcome_measure VARCHAR(255) NOT NULL,
    baseline_value DECIMAL(10,4),
    current_value DECIMAL(10,4),
    target_value DECIMAL(10,4),
    measurement_date DATE NOT NULL,
    notes TEXT,
    
    FOREIGN KEY (patient_id) REFERENCES user_profiles(fk_userid),
    INDEX idx_patient_outcomes (patient_id, outcome_type, measurement_date)
);
```

**Acceptance Criteria**:
- [ ] Patient-specific analytics dashboard
- [ ] Outcome tracking and trending
- [ ] Predictive risk modeling
- [ ] Quality measure reporting
- [ ] Performance benchmarking

## Implementation Timeline

### Phase 1: Foundation (Weeks 1-2)
- **GAP-001**: Enhanced Demographics
- **GAP-002**: Secure SSN Storage
- **GAP-004**: Field-Level Security

### Phase 2: Core Features (Weeks 3-4)
- **GAP-003**: Insurance Hierarchy
- **GAP-005**: Document Management
- **GAP-006**: Clinical Data Enhancement

### Phase 3: Advanced Features (Weeks 5-8)
- **GAP-007**: Payment Plan Management
- **GAP-008**: Patient Portal Integration
- **GAP-009**: Advanced Analytics

## Testing Strategy

### Unit Testing
- Individual field validation
- Encryption/decryption functions
- Role-based access controls
- Database triggers and constraints

### Integration Testing
- End-to-end patient registration flow
- Insurance hierarchy enforcement
- Document upload and retrieval
- Payment plan processing

### Security Testing
- PHI field encryption verification
- Role-based access validation
- Audit logging verification
- Penetration testing for portal access

### Performance Testing
- Large patient dataset handling
- Concurrent user access
- Database query optimization
- File upload performance

## Success Metrics

### Functional Metrics
- **Patient Profile Completeness**: Target 95%
- **Data Accuracy**: Target 99.5%
- **System Integration**: Target 98%

### Performance Metrics
- **Page Load Time**: < 2 seconds
- **API Response Time**: < 500ms
- **File Upload Speed**: < 30 seconds for 10MB

### Security Metrics
- **Encryption Coverage**: 100% of PHI fields
- **Access Control Compliance**: 100%
- **Audit Log Completeness**: 100%

### User Experience Metrics
- **User Satisfaction**: Target 4.5/5
- **Task Completion Rate**: Target 95%
- **Error Rate**: < 2%

## Risk Mitigation

### Data Migration Risks
- **Risk**: Data loss during schema updates
- **Mitigation**: Full database backup before changes
- **Rollback Plan**: Automated rollback scripts prepared

### Security Risks
- **Risk**: PHI exposure during implementation
- **Mitigation**: Implement encryption first, test thoroughly
- **Monitoring**: Real-time security monitoring

### Performance Risks
- **Risk**: System slowdown with new features
- **Mitigation**: Performance testing at each phase
- **Optimization**: Database indexing and query optimization

## Conclusion

This gap analysis identifies critical improvements needed for the Patient Profile system. The phased implementation approach ensures systematic delivery while maintaining system stability. Success depends on proper testing, security implementation, and user training throughout the process.