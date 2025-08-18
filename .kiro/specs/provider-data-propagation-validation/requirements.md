# Provider Data Propagation Validation - Requirements Document

## Introduction

This document outlines the requirements for validating and implementing proper provider data propagation throughout the OVHI EHR system. The system currently lacks the structured provider profile tables and automated data binding mechanisms required for compliant encounter documentation and claims processing.

## Requirements

### Requirement 1: Provider Profile Management

**User Story:** As a healthcare provider, I want my provider information (NPI, taxonomy, organization details) to be properly structured and maintained, so that all clinical documentation and billing automatically includes the correct provider identifiers.

#### Acceptance Criteria

1. WHEN a provider profile is created THEN the system SHALL store provider_id, display_name, npi_type1, and taxonomy_code
2. WHEN provider information is updated THEN the system SHALL validate NPI format (10 digits) and taxonomy code format
3. WHEN provider profiles are accessed THEN the system SHALL enforce data integrity constraints
4. IF provider_profile is missing required fields THEN the system SHALL prevent encounter creation

### Requirement 2: Organization Profile Management

**User Story:** As a practice administrator, I want organization information to be centrally managed and automatically applied to billing, so that claims contain accurate billing provider details.

#### Acceptance Criteria

1. WHEN an organization profile is created THEN the system SHALL store org_id, legal_name, tax_id_ein, pay_to_name, pay_to_npi_type2, and pay_to_address
2. WHEN organization information is updated THEN the system SHALL validate EIN format and NPI Type 2 format
3. WHEN multiple organizations exist THEN the system SHALL support hierarchical relationships
4. IF org_profile is missing required billing fields THEN the system SHALL prevent claim submission

### Requirement 3: Billing Profile Configuration

**User Story:** As a billing manager, I want billing-specific provider information to be maintained separately from clinical profiles, so that claims can be submitted with the correct billing provider details.

#### Acceptance Criteria

1. WHEN a billing profile is created THEN the system SHALL store billing_org_id, billing_npi_type2, tax_id_ein, clia, taxonomy_code, and contact_phone
2. WHEN billing profiles are configured THEN the system SHALL support multiple billing entities per organization
3. WHEN CLIA numbers are provided THEN the system SHALL validate format for laboratory services
4. IF billing_profile is incomplete THEN the system SHALL use fallback hierarchy: billing_profile → org_profile → provider_profile

### Requirement 4: Encounter Header Auto-Binding

**User Story:** As a clinician creating any type of note (Progress/SOAP/DAP/Treatment Plan), I want the encounter headers to be automatically populated with provider and location information, so that documentation is complete and compliant.

#### Acceptance Criteria

1. WHEN any note type is created THEN the system SHALL auto-bind provider_id from current user session
2. WHEN encounter headers are generated THEN the system SHALL populate rendering_npi from provider.npi_type1
3. WHEN encounter documentation occurs THEN the system SHALL include rendering_taxonomy from provider profile
4. WHEN encounters are created THEN the system SHALL auto-populate org_id, place_of_service, and service_location
5. IF any required encounter header field is missing THEN the system SHALL prevent note completion

### Requirement 5: CMS-1500/837P Claim Mapping

**User Story:** As a billing specialist, I want claims to be automatically mapped to the correct CMS-1500 form fields, so that submissions are accurate and compliant with payer requirements.

#### Acceptance Criteria

1. WHEN claims are generated THEN Box 24J SHALL contain provider.npi_type1 as Rendering NPI
2. WHEN billing provider information is mapped THEN Box 33/2010AA SHALL contain billing_profile.billing_npi_type2 + tax_id_ein + address
3. WHEN service facility differs from billing THEN Box 32/2010AB SHALL contain appropriate facility information
4. WHEN payer requires taxonomy THEN the system SHALL include taxonomy in PRV*PE segment or Box 24J shaded area
5. IF claim mapping fails validation THEN the system SHALL prevent claim submission with specific error messages

### Requirement 6: Data Fallback Hierarchy

**User Story:** As a system administrator, I want the system to use a defined fallback order for missing data elements, so that claims can still be processed when some profile information is incomplete.

#### Acceptance Criteria

1. WHEN billing_profile data is incomplete THEN the system SHALL attempt to use org_profile data
2. WHEN org_profile data is incomplete THEN the system SHALL attempt to use provider_profile data
3. WHEN all fallback options are exhausted AND required field is missing THEN the system SHALL fail with specific error message
4. WHEN fallback data is used THEN the system SHALL log the fallback action for audit purposes
5. IF critical fields cannot be resolved through fallback THEN the system SHALL prevent encounter/claim creation

### Requirement 7: Validation and Error Reporting

**User Story:** As a practice manager, I want clear error messages and validation reports when provider data is incomplete, so that I can quickly identify and fix data gaps.

#### Acceptance Criteria

1. WHEN data validation fails THEN the system SHALL provide severity levels (Critical, High, Medium, Low)
2. WHEN errors are reported THEN the system SHALL specify exact table/column or API route to fix
3. WHEN validation runs THEN the system SHALL generate SQL assertions for data integrity verification
4. WHEN gaps are identified THEN the system SHALL provide actionable remediation steps
5. IF multiple validation errors exist THEN the system SHALL prioritize by business impact