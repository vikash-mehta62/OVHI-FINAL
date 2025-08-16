# Document Field Mapping

**Generated:** January 2025  
**Purpose:** Map document fields to settings sources for auto-population  
**System:** OVHI Healthcare Platform Settings Module

---

## Document Auto-Population Status

### ✅ IMPLEMENTED DOCUMENTS

#### Patient Statements
- **Settings Source:** `src/components/rcm/PatientStatements.tsx`, `server/services/rcm/patientStatementCtrl.js`
- **Auto-Populated:** Yes
- **Fields Mapped:**
  - Organization Name → Practice Settings
  - Address → Practice Settings
  - Phone/Fax → Practice Settings
  - Tax ID → Practice Settings
  - Statement Footer → Branding Settings
- **Evidence:** Patient statement generation system implemented

#### Claims Management
- **Settings Source:** `src/components/rcm/ClaimsManagement.tsx`, `server/services/rcm/rcmCtrl.js`
- **Auto-Populated:** Yes
- **Fields Mapped:**
  - Provider NPI → Provider Settings
  - Organization NPI → Practice Settings
  - Tax ID → Practice Settings
  - Provider Name → Provider Settings
- **Evidence:** Claims management system implemented

#### PDF Header Configuration
- **Settings Source:** `server/services/settings/settingsCtrl.js`
- **Auto-Populated:** Yes
- **Fields Mapped:**
  - Logo → Branding Settings
  - Organization Name → Practice Settings
  - Address → Practice Settings
  - Phone/Email → Practice Settings
  - License Number → Provider Settings
- **Evidence:** PDF header configuration system implemented

### ⚠️ PARTIALLY IMPLEMENTED DOCUMENTS

#### Superbill/Encounter Summary
- **Settings Source:** `src/components/encounter/` (partial)
- **Auto-Populated:** Partial
- **Fields Mapped:**
  - Provider Identity → Provider Settings (partial)
  - Specialty Templates → Auto-Specialty Settings
- **Evidence:** Some encounter features implemented
- **Missing:** Complete encounter-settings integration

### ❌ MISSING DOCUMENTS

#### Referral Letters
- **Settings Source:** Not implemented
- **Auto-Populated:** No
- **Required Fields:**
  - Provider Name/Credentials
  - Specialty Information
  - Organization Letterhead
  - Contact Information
  - License Numbers
- **Evidence:** Referral letter automation not implemented

#### Lab/Diagnostic Requisitions
- **Settings Source:** Not implemented
- **Auto-Populated:** No
- **Required Fields:**
  - CLIA Number
  - Provider Information
  - Organization Details
  - Patient ID Format
- **Evidence:** Lab requisition system not found

#### Consent Forms/Intake Forms
- **Settings Source:** Not implemented
- **Auto-Populated:** No
- **Required Fields:**
  - Organization Details
  - Provider Information
  - Legal Disclaimers
  - Contact Information
- **Evidence:** Consent form automation not implemented

---

## Field Mapping Details

### Organization Settings → Document Fields

| Setting Field | Document Usage | Implementation Status |
|---------------|----------------|----------------------|
| `practiceName` | All documents header | ✅ Implemented |
| `addressLine1/2` | All documents | ✅ Implemented |
| `city/state/zipCode` | All documents | ✅ Implemented |
| `practicePhone` | Contact sections | ✅ Implemented |
| `practiceFax` | Contact sections | ✅ Implemented |
| `practiceEmail` | Contact sections | ✅ Implemented |
| `website` | Footer sections | ✅ Implemented |
| `taxId` | Claims, statements | ✅ Implemented |
| `npi` | Claims, statements | ✅ Implemented |

### Provider Settings → Document Fields

| Setting Field | Document Usage | Implementation Status |
|---------------|----------------|----------------------|
| Provider Name | All provider documents | ✅ Implemented |
| Provider NPI | Claims, encounters | ✅ Implemented |
| Credentials | Provider signature block | ❌ Missing |
| Specialty | Templates, encounters | ✅ Implemented |
| License Number | Provider documents | ⚠️ Partial |
| Signature Image | All provider documents | ❌ Missing |

### Branding Settings → Document Fields

| Setting Field | Document Usage | Implementation Status |
|---------------|----------------|----------------------|
| Logo | PDF headers | ✅ Implemented |
| Color Theme | Document styling | ✅ Implemented |
| Letterhead Template | All documents | ✅ Implemented |
| Footer Text | All documents | ✅ Implemented |

---

## Auto-Population Workflow

### Current Implementation
1. **Settings Configuration** → User configures organization/provider settings
2. **Template Generation** → System generates document templates with settings
3. **Document Creation** → Documents auto-populate from settings
4. **PDF Generation** → Headers/footers applied from branding settings

### Missing Workflows
1. **Document Numbering** → Sequential numbering for invoices/statements
2. **Multi-Location** → Location-specific document generation
3. **Provider Signatures** → Digital signature integration
4. **Compliance Fields** → CLIA, license number auto-population

---

## Integration Points

### ✅ Working Integrations
- Practice Settings → Patient Statements
- Provider Settings → Claims Management
- Branding Settings → PDF Headers
- Specialty Settings → Template Selection

### ❌ Missing Integrations
- Settings → Encounter Documents
- Settings → Referral Letters
- Settings → Lab Requisitions
- Settings → Consent Forms

### ⚠️ Partial Integrations
- Encounter Settings → Provider Identity
- License Settings → Document Compliance

---

## Recommendations

### Immediate Fixes (P0)
1. **Implement Document Numbering System**
   - Add sequential numbering for all document types
   - Store last used numbers in settings

2. **Complete CLIA Number Integration**
   - Add CLIA field to practice settings
   - Auto-populate in lab documents

### High Priority (P1)
1. **Provider Signature System**
   - Digital signature upload/storage
   - Auto-insertion in documents

2. **Referral Letter Templates**
   - Provider-specific referral templates
   - Auto-population from settings

### Medium Priority (P2)
1. **Multi-Location Document Support**
   - Location-specific headers/footers
   - Address selection for documents

2. **Enhanced Compliance Fields**
   - State license auto-population
   - Regulatory disclaimer insertion

---

*This mapping ensures all document fields are properly sourced from settings for consistent, automated document generation.*