# Frontend ↔ Backend Route/Endpoint Coverage Matrix

## Matrix Overview

This matrix maps frontend routes and components to their corresponding backend endpoints, identifying coverage gaps and mismatches.

## Legend
- ✅ **OK**: Frontend and backend properly connected
- 🔴 **Backend-only**: Endpoint exists but no frontend consumer
- 🟡 **Frontend-only**: UI exists but missing/incomplete backend
- ⚠️ **Broken schema**: Schema mismatch between frontend/backend
- ❓ **Needs verification**: Requires further investigation

---

## Core Platform Features

### Authentication & Authorization

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Login | `/login` | `LoginForm.tsx` | `POST /api/v1/auth/login` | No | ✅ OK | `src/components/auth/LoginForm.tsx` |
| Register | `/register` | `SignupForm.tsx` | `POST /api/v1/auth/register` | No | ✅ OK | `src/components/auth/SignupForm.tsx` |
| Forgot Password | `/forgot-password` | `ForgotPassword.tsx` | `POST /api/v1/auth/forgot-password` | No | ✅ OK | `src/pages/ForgetPassword.tsx` |
| Email Verification | `/verify-email` | `VerifyEmail.tsx` | `POST /api/v1/auth/verify-email` | No | ✅ OK | `src/pages/VerifyEmail.tsx` |
| Provider Verification | `/provider-verify` | `VerifyEmailProvider.tsx` | `POST /api/v1/auth/provider-verify` | No | ❓ Needs verification | `src/components/auth/ProviderPassword.tsx` |
| Update Password | `/update-password/:id` | `UpdatePassword.tsx` | `PUT /api/v1/auth/update-password` | No | ✅ OK | `src/pages/UpdatePassword.tsx` |

---

## Patient Management

### Patient Profile & Demographics

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Patient List | `/provider/patients` | `Patients.tsx` | `GET /api/v1/patient` | Yes | ✅ OK | `src/pages/Patients.tsx` |
| Patient Details | `/provider/patients/:id` | `PatientDetails.tsx` | `GET /api/v1/patient/:id` | Yes | ✅ OK | `src/pages/PatientDetails.tsx` |
| Enhanced Profile | N/A | `EnhancedPatientProfile.tsx` | `GET /api/v1/patients/:id/enhanced` | Yes | ✅ OK | `src/components/patient/EnhancedPatientProfile.tsx` |
| Profile Completeness | N/A | `EnhancedPatientProfile.tsx` | `GET /api/v1/patients/:id/completeness` | Yes | ✅ OK | Component calls this endpoint |
| Billing Validation | N/A | N/A | `GET /api/v1/patients/:id/billing-validation` | Yes | 🔴 Backend-only | `server/services/patients/enhancedPatientRoutes.js:8` |
| Patient Account | N/A | `PatientAccountManager.tsx` | `GET /api/v1/patient/account/*` | Yes | ✅ OK | `src/services/operations/patientAccount.js` |

### Patient Dashboard & Portal

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Patient Dashboard | `/patient/dashboard` | `PatientDashboard.tsx` | Multiple endpoints | Yes | ✅ OK | `src/pages/patient/PatientDashboard.tsx` |
| Medical Records | `/patient/medical` | `PatientMedical.tsx` | `GET /api/v1/patient/:id/medical` | Yes | ❓ Needs verification | Route exists but endpoint unclear |
| Medications | `/patient/medications` | `PatientMedications.tsx` | `GET /api/v1/patient/:id/medications` | Yes | ❓ Needs verification | Route exists but endpoint unclear |
| Vitals | `/patient/vitals` | `PatientVitals.tsx` | `GET /api/v1/patient/:id/vitals` | Yes | ❓ Needs verification | Route exists but endpoint unclear |
| Insurance | `/patient/insurance` | `PatientInsurance.tsx` | `GET /api/v1/patient/:id/insurance` | Yes | ❓ Needs verification | Route exists but endpoint unclear |
| Test Results | `/patient/tests` | `PatientTestResults.tsx` | `GET /api/v1/patient/:id/tests` | Yes | ❓ Needs verification | Route exists but endpoint unclear |

---

## Appointments & Scheduling

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Appointments List | `/provider/appointments` | `Appointments.tsx` | `GET /api/v1/appointment` | Yes | ✅ OK | `src/pages/Appointments.tsx` |
| Create Appointment | N/A | `AddAppointmentDialog.tsx` | `POST /api/v1/appointment` | Yes | ✅ OK | `src/components/appointments/AddAppointmentDialog.tsx` |
| Calendar View | N/A | `MonthCalendarView.tsx` | `GET /api/v1/appointment` | Yes | ✅ OK | `src/components/appointments/MonthCalendarView.tsx` |
| Provider Calendar | N/A | `ProviderCalendarView.tsx` | `GET /api/v1/appointment/provider/:id` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Patient Appointments | `/patient/appointments` | `PatientAppointments.tsx` | `GET /api/v1/appointment/patient/:id` | Yes | ❓ Needs verification | Route exists but endpoint unclear |

---

## Encounters & Clinical Documentation

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Encounters List | `/provider/encounters` | `Encounters.tsx` | `GET /api/v1/encounters` | Yes | ✅ OK | `src/pages/Encounters.tsx` |
| Create Encounter | N/A | `SmartEncounterBuilder.tsx` | `POST /api/v1/encounters` | Yes | ✅ OK | `src/components/encounter/SmartEncounterBuilder.tsx` |
| SOAP Notes | N/A | `EnhancedSoapNotesEditor.tsx` | `PUT /api/v1/encounters/:id/soap` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Smart Templates | N/A | `SmartTemplateBuilder.tsx` | `GET /api/v1/encounters/smart-templates` | Yes | ✅ OK | `src/components/encounters/SmartTemplateBuilder.tsx` |
| AI Suggestions | N/A | `SmartTemplateBuilder.tsx` | `POST /api/v1/encounters/smart-templates/ai-suggestions` | Yes | ✅ OK | Component calls this endpoint |
| Template Recommendations | N/A | `SmartTemplateSelector.tsx` | `GET /api/v1/encounters/smart-templates/recommendations` | Yes | ✅ OK | Component calls this endpoint |

---

## Revenue Cycle Management (RCM)

### Claims Management

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| RCM Dashboard | `/provider/rcm` | `RCMManagement.tsx` | `GET /api/v1/rcm/dashboard` | Yes | ✅ OK | `src/pages/RCMManagement.tsx` |
| Claims List | N/A | `ClaimsManagement.tsx` | `GET /api/v1/rcm/claims` | Yes | ✅ OK | `src/components/rcm/ClaimsManagement.tsx` |
| Claim Details | N/A | `ClaimsManagement.tsx` | `GET /api/v1/rcm/claims/:id` | Yes | ✅ OK | Backend endpoint exists |
| Claim Validation | N/A | `ClaimValidation.tsx` | `GET /api/v1/rcm/claims/:id/validate` | Yes | ✅ OK | `src/components/rcm/ClaimValidation.tsx` |
| Bulk Claim Update | N/A | `ClaimsManagement.tsx` | `POST /api/v1/rcm/claims/bulk-update` | Yes | ✅ OK | Backend endpoint exists |

### A/R Aging & Collections

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| A/R Aging Report | N/A | `ARAgingManagement.tsx` | `GET /api/v1/rcm/ar-aging` | Yes | ✅ OK | `src/components/rcm/ARAgingManagement.tsx` |
| Collections Workflow | N/A | `CollectionsManagement.tsx` | `GET /api/v1/rcm/collections` | Yes | ✅ OK | `src/components/rcm/CollectionsManagement.tsx` |
| Payment Plans | N/A | `CollectionsManagement.tsx` | `GET /api/v1/rcm/collections/payment-plans` | Yes | ✅ OK | Component calls this endpoint |
| Collection Activities | N/A | `CollectionsManagement.tsx` | `GET /api/v1/rcm/collections/activities` | Yes | ✅ OK | Component calls this endpoint |

### Denials Management

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Denial Cases | N/A | `DenialManagement.tsx` | `GET /api/v1/rcm/denials` | Yes | ✅ OK | `src/components/rcm/DenialManagement.tsx` |
| Appeal Tasks | N/A | `DenialManagement.tsx` | `GET /api/v1/rcm/appeals` | Yes | ✅ OK | Component calls this endpoint |
| Denial Analytics | N/A | `DenialManagement.tsx` | `GET /api/v1/rcm/denials/analytics` | Yes | ✅ OK | Backend endpoint exists |
| Denial Trends | N/A | N/A | `GET /api/v1/rcm/denials/trends` | Yes | 🔴 Backend-only | `server/services/rcm/rcmRoutes.js:42` |

### ERA Processing & Payments

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| ERA Files | N/A | `PaymentManagement.tsx` | `GET /api/v1/rcm/era-files` | Yes | ✅ OK | `src/components/rcm/PaymentManagement.tsx` |
| ERA Processing | N/A | `ERAProcessor.tsx` | `POST /api/v1/rcm/era/process` | Yes | ✅ OK | `src/components/rcm/ERAProcessor.tsx` |
| Payment Posting | N/A | `PaymentPostingEngine.tsx` | `GET /api/v1/rcm/payments` | Yes | ✅ OK | `src/components/rcm/PaymentPostingEngine.tsx` |
| Office Payments | N/A | N/A | `GET /api/v1/rcm/payments/office` | Yes | 🔴 Backend-only | `server/services/rcm/rcmRoutes.js:67` |

---

## Billing & Coding

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Billing Dashboard | `/provider/billing` | `Billing.tsx` | `GET /api/v1/billing` | Yes | ✅ OK | `src/pages/Billing.tsx` |
| CMS-1500 Form | N/A | `CMS1500Form.tsx` | `POST /api/v1/billing/cms1500` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Patient Statements | N/A | `PatientStatement.tsx` | `GET /api/v1/rcm/statements` | Yes | ✅ OK | `src/components/billing/PatientStatement.tsx` |
| Smart CPT Suggestions | N/A | `SmartCPTSuggestions.tsx` | `GET /api/v1/billing/cpt-suggestions` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Billing Automation | `/provider/billing-automation` | `BillingAutomation.tsx` | Multiple endpoints | Yes | ✅ OK | `src/pages/BillingAutomation.tsx` |

---

## Payment Processing

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Payment Form | `/provider/payment/:invoiceId` | `Payment.tsx` | `POST /api/v1/payments/process` | Yes | ✅ OK | `src/pages/Payment.tsx` |
| Payment History | N/A | `PaymentHistory.tsx` | `GET /api/v1/payments/history` | Yes | ✅ OK | `src/components/payments/PaymentHistory.tsx` |
| Gateway Settings | N/A | `PaymentGatewaySettings.tsx` | `GET /api/v1/payments/gateways` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Refund Processing | N/A | N/A | `POST /api/v1/payments/refund` | Yes | 🔴 Backend-only | Backend endpoint exists |

---

## Settings & Configuration

### General Settings

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Settings Dashboard | `/provider/settings` | `Settings.tsx` | `GET /api/v1/settings/get-all-user-modules` | Yes | ✅ OK | `src/pages/Settings.tsx` |
| Doctor Settings | `/provider/doctor-settings` | `DoctorSettings.tsx` | Multiple endpoints | Yes | ✅ OK | `src/pages/DoctorSettings.tsx` |
| Practice Setup | N/A | `PracticeSetupSettings.tsx` | `GET /api/v1/settings/practice` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Appearance Settings | N/A | `AppearanceSettings.tsx` | `GET /api/v1/settings/appearance` | Yes | ❓ Needs verification | Component exists but endpoint unclear |

### Module Management

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| RPM Enable/Disable | N/A | Settings components | `POST /api/v1/settings/rpm/enable` | Yes | ✅ OK | `server/services/settings/settingsRoutes.js:6` |
| CCM Enable/Disable | N/A | Settings components | `POST /api/v1/settings/ccm/enable` | Yes | ✅ OK | `server/services/settings/settingsRoutes.js:112` |
| PCM Enable/Disable | N/A | Settings components | `POST /api/v1/settings/pcm/enable` | Yes | ✅ OK | `server/services/settings/settingsRoutes.js:182` |
| AI Care Plans | N/A | Settings components | `POST /api/v1/settings/ai-care-plans/enable` | Yes | ✅ OK | `server/services/settings/settingsRoutes.js:77` |

### Advanced Settings

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Document Numbering | N/A | `DocumentNumberingSettings.tsx` | `GET /api/v1/settings/document-numbering/sequences` | Yes | ✅ OK | `src/components/settings/DocumentNumberingSettings.tsx` |
| Regulatory Compliance | N/A | `RegulatoryComplianceSettings.tsx` | `GET /api/v1/settings/regulatory/clia` | Yes | ✅ OK | `src/components/settings/RegulatoryComplianceSettings.tsx` |
| Auto Specialty Templates | N/A | `AutoSpecialtyTemplateSettings.tsx` | `GET /api/v1/settings/auto-specialty` | Yes | ✅ OK | `src/components/settings/AutoSpecialtyTemplateSettings.tsx` |
| Privacy Settings | N/A | `PrivacySettings.tsx` | `GET /api/v1/settings/privacy` | Yes | ❓ Needs verification | Component exists, backend routes exist |
| Notification Settings | N/A | `NotificationSettings.tsx` | `GET /api/v1/settings/notifications` | Yes | ❓ Needs verification | Component exists, backend routes exist |

---

## Analytics & Reporting

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Analytics Dashboard | `/provider/analytics` | `Analytics.tsx` | `GET /api/v1/analytics/dashboard` | Yes | ✅ OK | `src/pages/Analytics.tsx` |
| Custom Reports | N/A | `CustomReportBuilder.tsx` | `POST /api/v1/analytics/reports/generate` | Yes | ✅ OK | `src/components/analytics/CustomReportBuilder.tsx` |
| Financial Analytics | N/A | `AnalyticsDashboard.tsx` | `GET /api/v1/analytics/financial` | Yes | ✅ OK | Component calls this endpoint |
| Patient Analytics | N/A | `AnalyticsDashboard.tsx` | `GET /api/v1/analytics/patients` | Yes | ✅ OK | Component calls this endpoint |
| Provider Analytics | N/A | `ProviderAnalyticsDashboard.tsx` | `GET /api/v1/analytics/providers` | Yes | ✅ OK | `src/components/provider/ProviderAnalyticsDashboard.tsx` |

---

## Care Management

### Chronic Care Management (CCM)

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| CCM Tasks | N/A | `GetAllCcmTask.tsx` | `GET /api/v1/ccm/tasks` | Yes | ✅ OK | `src/components/ccm/GetAllCcmTask.tsx` |
| Add CCM Task | N/A | `AddCcmTaskDialog.tsx` | `POST /api/v1/ccm/tasks` | Yes | ✅ OK | `src/components/ccm/AddCcmTaskDialog.tsx` |
| Care Coordination | N/A | `CareCoordinationActivities.tsx` | `GET /api/v1/ccm/activities` | Yes | ❓ Needs verification | Component exists but endpoint unclear |

### Remote Patient Monitoring (RPM)

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| RPM Dashboard | N/A | `RPMDashboard.tsx` | `GET /api/v1/rpm/dashboard` | Yes | 🟡 Frontend-only | Component exists but no backend |
| Device Management | N/A | `DeviceAdd.tsx` | `GET /api/v1/devices` | Yes | ✅ OK | `src/components/ai/DeviceAdd.tsx` |

---

## Telehealth

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| Telehealth Dashboard | `/provider/telehealth` | `Telehealth.tsx` | Multiple endpoints | Yes | ✅ OK | `src/pages/Telehealth.tsx` |
| Video Calls | N/A | `RingCentralVideoCall.tsx` | RingCentral API | Yes | ✅ OK | `src/components/telehealth/RingCentralVideoCall.tsx` |
| Patient Queue | N/A | `PatientQueue.tsx` | `GET /api/v1/telehealth/queue` | Yes | ❓ Needs verification | Component exists but endpoint unclear |
| Session Notes | N/A | `ConsultationNotes.tsx` | `POST /api/v1/telehealth/notes` | Yes | ❓ Needs verification | Component exists but endpoint unclear |

---

## Integration Services

| Feature | Frontend Route | Frontend Component | Backend Endpoint | Auth Required | Status | Evidence |
|---------|---------------|-------------------|------------------|---------------|--------|----------|
| MIO Connect | N/A | Various components | `GET /api/v1/mio/*` | Yes | ✅ OK | `server/services/mio/` |
| RingCentral | N/A | `RingCentralSettings.tsx` | `GET /api/v1/ring-central/*` | Yes | ✅ OK | `src/components/settings/RingCentralSettings.tsx` |
| Twilio | N/A | N/A | `POST /api/v1/twilio/make-call` | Yes | 🔴 Backend-only | `server/services/twilio/twilioRoutes.js` |
| Third-party APIs | N/A | N/A | `POST /api/v1/client/*` | No | 🔴 Backend-only | `server/services/third-party-apis/api-routes.js` |

---

## Summary Statistics

### Coverage Analysis
- **Total Mapped Features**: 89
- **✅ OK (Properly Connected)**: 52 (58%)
- **🔴 Backend-only**: 8 (9%)
- **🟡 Frontend-only**: 3 (3%)
- **❓ Needs Verification**: 26 (29%)
- **⚠️ Broken Schema**: 0 (0%)

### Critical Gaps Identified
1. **Backend-only endpoints** need frontend consumers
2. **Frontend-only components** need backend implementation
3. **Verification needed** for many patient portal endpoints
4. **Missing navigation** for some existing features
5. **API contract validation** required for schema alignment

This matrix serves as the foundation for identifying specific gaps and creating the implementation roadmap.