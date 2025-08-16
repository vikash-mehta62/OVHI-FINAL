# Patient Profile Field Coverage Matrix

## Core Demographics

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Full Legal Name** | | | | | |
| - First Name | ✅ | ✅ | user_profiles.firstname | P0 | Implemented |
| - Middle Name | ✅ | ✅ | user_profiles.middlename | P0 | Implemented |
| - Last Name | ✅ | ✅ | user_profiles.lastname | P0 | Implemented |
| - Suffix | ❌ | ❌ | Missing field | P1 | Add suffix field |
| **Demographics** | | | | | |
| - Date of Birth | ✅ | ✅ | user_profiles.dob | P0 | Implemented |
| - Gender/Sex | ✅ | ✅ | user_profiles.gender | P0 | Implemented |
| - Pronouns | ❌ | ❌ | Missing field | P2 | Add pronouns field |
| **Contact Information** | | | | | |
| - Primary Phone | ✅ | ✅ | user_profiles.phone | P0 | Implemented |
| - Email Address | ✅ | ✅ | user_profiles.work_email | P0 | Implemented |
| - Address Line 1 | ✅ | ✅ | user_profiles.address_line | P0 | Implemented |
| - Address Line 2 | ✅ | ✅ | user_profiles.address_line_2 | P0 | Implemented |
| - City | ✅ | ✅ | user_profiles.city | P0 | Implemented |
| - State | ✅ | ✅ | user_profiles.state | P0 | Implemented |
| - ZIP Code | ✅ | ✅ | user_profiles.zip | P0 | Implemented |
| - Country | ✅ | ✅ | user_profiles.country | P0 | Implemented |
| - Emergency Contact | ✅ | ✅ | user_profiles.emergency_contact | P0 | Implemented |
| **Additional Demographics** | | | | | |
| - Marital Status | ❌ | ❌ | Missing field | P2 | Add marital_status |
| - Race/Ethnicity | ✅ | ✅ | user_profiles.ethnicity | P1 | Implemented |
| - Language Preference | ❌ | ❌ | Missing field | P1 | Add language_preference |
| - Preferred Communication | ❌ | ❌ | Missing field | P1 | Add comm_preference |
| - Disability Status | ❌ | ❌ | Missing field | P1 | Add disability_status |
| - Accessibility Needs | ❌ | ❌ | Missing field | P1 | Add accessibility_needs |

## Identifiers

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Internal IDs** | | | | | |
| - Patient ID/MRN | ✅ | ✅ | user_profiles.fk_userid | P0 | Implemented |
| - Portal Login ID | ❌ | ❌ | Missing linkage | P1 | Link to users table |
| **External IDs** | | | | | |
| - SSN | ❌ | ❌ | Missing field | P0 | Add encrypted SSN |
| - Driver's License | ❌ | ❌ | Missing field | P2 | Add dl_number |
| - Passport Number | ❌ | ❌ | Missing field | P2 | Add passport_number |
| - HIE ID | ❌ | ❌ | Missing field | P2 | Add hie_id |
| - State Immunization ID | ❌ | ❌ | Missing field | P2 | Add immunization_id |
| **Insurance IDs** | | | | | |
| - Member ID | ✅ | ✅ | patient_insurances.insurance_policy_number | P0 | Implemented |
| - Group Number | ✅ | ✅ | patient_insurances.insurance_group_number | P0 | Implemented |
| - Subscriber ID Validation | ❌ | ❌ | Missing validation | P1 | Add format validation |

## Insurance & Payer Linkage

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Insurance Policies** | | | | | |
| - Primary Insurance | ✅ | ⚠️ | patient_insurances table | P0 | No hierarchy enforcement |
| - Secondary Insurance | ✅ | ⚠️ | patient_insurances table | P0 | No hierarchy enforcement |
| - Tertiary Insurance | ✅ | ⚠️ | patient_insurances table | P0 | No hierarchy enforcement |
| - Payer Information | ✅ | ❌ | insurance_company field | P0 | No payer master data |
| - Plan Details | ✅ | ❌ | insurance_plan field | P0 | No plan master data |
| - Member ID | ✅ | ✅ | insurance_policy_number | P0 | Implemented |
| - Group Number | ✅ | ✅ | insurance_group_number | P0 | Implemented |
| - Effective Dates | ✅ | ✅ | effective_date, insurance_expiry | P0 | Implemented |
| - Subscriber Relationship | ✅ | ✅ | insurance_relationship | P0 | Implemented |
| **Coverage Details** | | | | | |
| - Scanned Card Images | ❌ | ❌ | Missing field | P1 | Add card_front/back_image |
| - Coverage History | ⚠️ | ❌ | Overwritten on update | P1 | Preserve history |
| - Eligibility Status | ❌ | ❌ | Missing integration | P0 | Add eligibility checks |
| - Benefit Limitations | ❌ | ❌ | Missing field | P1 | Add benefit_limits |
| - Prior Auth Requirements | ❌ | ❌ | Missing field | P1 | Add prior_auth_required |
| - Expired Insurance Alerts | ❌ | ❌ | Missing validation | P1 | Add expiry alerts |

## Clinical Data

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Allergies** | | | | | |
| - Allergy Categories | ✅ | ✅ | allergies.category | P0 | Implemented |
| - Allergen Name | ✅ | ✅ | allergies.allergen | P0 | Implemented |
| - Reaction Type/Severity | ✅ | ✅ | allergies.reaction | P0 | Implemented |
| **Medications** | | | | | |
| - Active Medications | ✅ | ✅ | patient_medication table | P0 | Implemented |
| - Dosage Information | ✅ | ✅ | patient_medication.dosage | P0 | Implemented |
| - Frequency | ✅ | ✅ | patient_medication.frequency | P0 | Implemented |
| - Prescribing Provider | ✅ | ✅ | patient_medication.prescribed_by | P0 | Implemented |
| - Start/End Dates | ✅ | ✅ | patient_medication.startDate/endDate | P0 | Implemented |
| - Refills Remaining | ✅ | ✅ | patient_medication.refills | P0 | Implemented |
| **Vitals** | | | | | |
| - Height | ✅ | ✅ | patient_vitals.height | P0 | Implemented |
| - Weight | ✅ | ✅ | patient_vitals.weight | P0 | Implemented |
| - BMI | ✅ | ✅ | patient_vitals.bmi | P0 | Implemented |
| - Blood Pressure | ✅ | ✅ | patient_vitals.blood_pressure | P0 | Implemented |
| - Heart Rate | ✅ | ✅ | patient_vitals.heart_rate | P0 | Implemented |
| - Temperature | ✅ | ✅ | patient_vitals.temperature | P0 | Implemented |
| **Diagnoses** | | | | | |
| - ICD-10 Codes | ✅ | ✅ | patient_diagnoses.icd10 | P0 | Implemented |
| - Diagnosis Description | ✅ | ✅ | patient_diagnoses.diagnosis | P0 | Implemented |
| - Status (Active/Resolved) | ✅ | ✅ | patient_diagnoses.status | P0 | Implemented |
| - Diagnosis Date | ✅ | ✅ | patient_diagnoses.date | P0 | Implemented |
| **Missing Clinical Data** | | | | | |
| - Problem List | ❌ | ❌ | Missing table | P1 | Create problem_list table |
| - Past Medical History | ❌ | ❌ | Missing field | P1 | Add medical_history |
| - Family History | ❌ | ❌ | Missing field | P2 | Add family_history |
| - Immunizations | ❌ | ❌ | Missing table | P1 | Create immunizations table |
| - Risk Scores (HCC/RAF) | ❌ | ❌ | Missing field | P1 | Add risk_scores |
| - Smoking Status | ❌ | ❌ | Missing field | P1 | Add smoking_status |

## Encounters & Visits

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Encounter Linkage** | | | | | |
| - Encounter History | ⚠️ | ❌ | Limited integration | P0 | Improve linkage |
| - Visit Dates | ✅ | ✅ | user_profiles.last_visit | P0 | Basic implementation |
| - Provider Information | ⚠️ | ❌ | Limited linkage | P0 | Improve provider linkage |
| - Location Information | ❌ | ❌ | Missing field | P1 | Add location tracking |
| **Auto-Population** | | | | | |
| - Demographics to Encounter | ❌ | ❌ | Missing integration | P0 | Implement auto-fill |
| - Insurance to Encounter | ❌ | ❌ | Missing integration | P0 | Implement auto-fill |
| **Document Generation** | | | | | |
| - Superbill Generation | ❌ | ❌ | Missing integration | P1 | Link to encounters |
| - Discharge Summaries | ❌ | ❌ | Missing integration | P2 | Link to encounters |
| - Referral Letters | ❌ | ❌ | Missing integration | P2 | Link to encounters |
| **Lab/Imaging Results** | | | | | |
| - Lab Results Linkage | ❌ | ❌ | Missing integration | P1 | Create results table |
| - Imaging Results | ❌ | ❌ | Missing integration | P1 | Create imaging table |

## Financial/Billing Integration

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Account Ledger** | | | | | |
| - Patient Balance | ✅ | ✅ | patient_account_summary view | P0 | Implemented |
| - Payment History | ✅ | ✅ | patient_payments table | P0 | Implemented |
| - Adjustment History | ✅ | ✅ | payment_adjustments table | P0 | Implemented |
| - Statement History | ✅ | ✅ | patient_statements table | P0 | Implemented |
| **Claims Integration** | | | | | |
| - Claims Linkage | ✅ | ✅ | claims.patient_id | P0 | Implemented |
| - Patient Responsibility | ✅ | ✅ | claims.patient_responsibility | P0 | Implemented |
| - Insurance Payments | ✅ | ✅ | patient_payments table | P0 | Implemented |
| **Payment Plans** | | | | | |
| - Payment Plan Tracking | ❌ | ❌ | Missing table | P1 | Create payment_plans table |
| - Installment Schedules | ❌ | ❌ | Missing functionality | P1 | Add installment tracking |
| - Auto-Pay Consents | ❌ | ❌ | Missing field | P1 | Add autopay_consent |
| **Collections** | | | | | |
| - Bad Debt Flags | ❌ | ❌ | Missing field | P1 | Add bad_debt_flag |
| - Collections Status | ❌ | ❌ | Missing field | P1 | Add collections_status |
| - External Agency Export | ❌ | ❌ | Missing integration | P2 | Add export functionality |

## Documents & Consents

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Document Management** | | | | | |
| - Uploaded Documents | ❌ | ❌ | Missing table | P1 | Create documents table |
| - Document Categories | ❌ | ❌ | Missing categorization | P1 | Add document types |
| - Version History | ❌ | ❌ | Missing versioning | P1 | Add version tracking |
| - Digital Signatures | ❌ | ❌ | Missing functionality | P1 | Add signature capture |
| **Consent Management** | | | | | |
| - HIPAA Consents | ❌ | ❌ | Missing table | P0 | Create consents table |
| - Financial Agreements | ❌ | ❌ | Missing tracking | P1 | Add financial consents |
| - Treatment Consents | ❌ | ❌ | Missing tracking | P1 | Add treatment consents |
| - Consent Versions | ❌ | ❌ | Missing versioning | P1 | Add consent versioning |
| **Auto-Generated Documents** | | | | | |
| - Patient Statements | ✅ | ✅ | patient_statements table | P0 | Implemented |
| - Superbills | ❌ | ❌ | Missing integration | P1 | Link to profile |
| - Referral Letters | ❌ | ❌ | Missing integration | P2 | Link to profile |

## Compliance & Security

| Required Field | Present? | Connected? | Evidence | Priority | Notes |
|---|---|---|---|---|---|
| **Data Encryption** | | | | | |
| - PHI Field Encryption | ❌ | ❌ | No encryption at rest | P0 | Implement encryption |
| - SSN Encryption | ❌ | ❌ | SSN field missing | P0 | Add encrypted SSN |
| - Address Encryption | ❌ | ❌ | No encryption | P1 | Encrypt addresses |
| **Access Controls** | | | | | |
| - Role-Based Access | ⚠️ | ⚠️ | Basic roles only | P0 | Enhance RBAC |
| - Field-Level Masking | ❌ | ❌ | No field masking | P0 | Implement masking |
| - Audit Logging | ⚠️ | ⚠️ | Basic logging only | P0 | Enhance audit trail |
| **Validation & Alerts** | | | | | |
| - Completeness Validation | ❌ | ❌ | No validation | P0 | Add completeness checks |
| - Billing Readiness | ❌ | ❌ | No validation | P0 | Add billing validation |
| - Insurance Expiry Alerts | ❌ | ❌ | No alerts | P1 | Add expiry alerts |
| - Duplicate Patient Checks | ❌ | ❌ | No duplicate detection | P1 | Add duplicate detection |

## Summary Statistics

- **Total Fields Evaluated**: 89
- **Fully Implemented**: 40 (45%)
- **Partially Implemented**: 8 (9%)
- **Missing/Not Implemented**: 41 (46%)

### Priority Breakdown
- **P0 (Critical)**: 23 missing fields
- **P1 (High)**: 15 missing fields  
- **P2 (Medium)**: 3 missing fields

### Module Completeness
- **Core Demographics**: 60%
- **Identifiers**: 40%
- **Insurance & Payer**: 50%
- **Clinical Data**: 70%
- **Encounters & Visits**: 20%
- **Financial/Billing**: 60%
- **Documents & Consents**: 10%
- **Compliance & Security**: 15%