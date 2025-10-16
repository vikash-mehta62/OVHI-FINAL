// const BASE_URL = "https://api.varnaamedicalbillingsolutions.com/api/v1"
const BASE_URL = "http://localhost:8000/api/v1"
// const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

export const endpoints = {
  LOGIN_API: BASE_URL + "/auth/login",
  SIGNUP_API: BASE_URL + "/auth/signup",
  REGISTER_PROVIDER_API: BASE_URL + "/auth/register-provider",
  PROVIDER_VERIFY_PASSWORD_API: BASE_URL + "/auth/set-provider-password",
  PROVIDER_TERMS_UPLOAD_API: BASE_URL + "/documents/uploadUserAgreement",
  PROVIDER_PRACTICE_UPDATE_API: BASE_URL + "/physician/addPractice",
  ENCOUNTER_TEMPLATE_PRARTICE_CREATE_API: BASE_URL + "/encounters/template/provider/create",
  GET__ALL_ENCOUNTER_TEMPLATE_PRARTICE_API: BASE_URL + "/encounters/template/provider/get",
  UPDATE_ENCOUNTER_TEMPLATE_PRARTICE_API: BASE_URL + "/encounters/template/provider/update",


  CHANGE_PASSWORD_API: BASE_URL + "/auth/change-password",
  ADD_RINGCENTRAL_API: BASE_URL + "/ring-central/add-config",
  GET_RINGCENTRAL_API: BASE_URL + "/ring-central/ring-cent-config",
  FETCH_PROFILE: BASE_URL + "/auth/fetchMyProfile",
  RESET_PASSWORD_TOKEN: BASE_URL + "/auth/reset-password-token",
  RESET_TOKEN: BASE_URL + "/auth/reset-password",
  VERIFY_OTP: BASE_URL + "/auth/verify-otp",

}

export const patientEndpoints = {
  CREATE_PATIENT_API: BASE_URL + "/patient/create",
  SEND_FORM_TO_PATIENT_API: BASE_URL + "/patient/send-form",
  UPDATE_PATIENT_API: BASE_URL + "/patient/editPatientDataById",
  GET_ALL_PATIENTS_API: BASE_URL + "/patient/getAllPatients",
  GET_ALL_PATIENTS_FOR_PROVIDER_API: BASE_URL + "/patient/getAll-provider-patient",
  GET_SINGLE_PATIENT_API: BASE_URL + "/patient/getPatientDataById",
  GET_SINGLE_PATIENT_BY_NUMBER: BASE_URL + "/patient/getPatientByPhoneNumber",
  GET_PATIENT_MONITOIRING_DATA: BASE_URL + "/patient/getPatientMonitoringData",
  GET_PCM_REPORTS: BASE_URL + "/patient/pcm-reports",
  GET_CCM_REPORTS: BASE_URL + "/patient/ccm-reports",
  ADD_PATIENT_NOTES: BASE_URL + "/patient/addPatientNotes",
  ADD_PATIENT_DIAGNOSIS: BASE_URL + "/patient/addPatientDiagnosis",

  // CCM Endpoints
  START_CCM_TIME_TRACKING: BASE_URL + "/patient/ccm/start-time-tracking",
  STOP_CCM_TIME_TRACKING: BASE_URL + "/patient/ccm/stop-time-tracking",
  GET_CCM_TIME_ENTRIES: BASE_URL + "/patient/ccm/time-entries",
  GENERATE_CCM_SUPERBILL: BASE_URL + "/patient/ccm/generate-superbill",
  GET_CCM_SUPERBILLS: BASE_URL + "/patient/ccm/superbills",
  CREATE_CONDITION_ASSESSMENT: BASE_URL + "/patient/ccm/create-assessment",
  UPDATE_CONDITION_ASSESSMENT: BASE_URL + "/patient/ccm/update-assessment",
  GET_CONDITION_ASSESSMENTS: BASE_URL + "/patient/ccm/assessments",

  // PROVIDERS
  GET_PROVIDERS_API: BASE_URL + "/physician/getPatientTimedDetails",


  SUBMITE_TIMER: BASE_URL + "/physician/addPatientTimedDetails",
  ADD_MEDICATION: BASE_URL + "/patient/addPatientMedication",
  ADD_INSURANCE: BASE_URL + "/patient/addPatientInsurance",
  ADD_ALLERGIES: BASE_URL + "/patient/addPatientAllergy",
  GET_PATIENET_TIMING: BASE_URL + "/patient/getPatientTimings",
  UPDATE_PATIENT_VITALS: BASE_URL + "/patient/update-vitals",
  GET_PATIENT_SUMMARY: BASE_URL + "/patient",
  GET_PATIENT_SUMMARY_RPM: BASE_URL + "/patient",



  GET_BILLING_DETAILS: BASE_URL + "/billing/patients",
  UPDATE_BILLING_STATUS: BASE_URL + "/billing/update-billing-status",
  GET_PATIENT_NOTES: BASE_URL + "/patient/getPatientNotes",


  ASSIGN_BED: BASE_URL + "/patient/assignBedToPatient",
  UNASSIGN_BED: BASE_URL + "/patient/unassignBedFromPatient",
  GET_ALL_BED: BASE_URL + "/patient/getAllBeds",



  SEND_CONSENCT: BASE_URL + "/patient/sendConsentEmail",
  GET_ALL_CONSENCT: BASE_URL + "/patient/getAllConsents",



}

export const image = {
  IMAGE_UPLOAD: BASE_URL + "/image/multi",
}

export const settings = {
  UPDATE_SETTING_API: BASE_URL + "/physician/updatePhysicianMappings",
  PRACTISH_SETTING_API: BASE_URL + "/physician/editPractice",
  GET_PRACTISH_SETTING_API: BASE_URL + "/physician/getProviderDetails",
  DASHBOARD_DATA: BASE_URL + "/physician/providerDashboardCount",
  MEDICATON_DATA: BASE_URL + "/physician/patientsMedications ",
  GET_ALL_ORG: BASE_URL + "/physician/allOrganizations",
  GET_ALL_PRACTIS: BASE_URL + "/physician/allPractices",
  UPDATE_PROVIDER_API: BASE_URL + "/physician/updateProviderInformation",
  GET_ACOCUNT_DETAILS_PROVIDER_API: BASE_URL + "/physician/getProviderInformation",
  PDF_HEADER_API: BASE_URL + "/settings/pdf-header",
  GET_PDF_HEADER_API: BASE_URL + "/settings/get-pdf-header",
  ADD_SERVICE: BASE_URL + "/physician/addService",
  ADD_INSURANCE_NETWORK: BASE_URL + "/physician/addInsuranceNetwork",

  // Enhanced Settings APIs
  NOTIFICATION_SETTINGS_API: BASE_URL + "/settings/enhanced/notifications",
  PRIVACY_SETTINGS_API: BASE_URL + "/settings/enhanced/privacy",
  APPEARANCE_SETTINGS_API: BASE_URL + "/settings/enhanced/appearance",
  SECURITY_SETTINGS_API: BASE_URL + "/settings/enhanced/security",
  EXPORT_SETTINGS_API: BASE_URL + "/settings/enhanced/export",
}

export const task = {
  CREATE_TASK_API: BASE_URL + "/patient/addPatientTask",
  GET_TASK_DETAILS: BASE_URL + "/patient/getPatientTaskDetails",
  GET_TASK_BY_PATIENT_ID: BASE_URL + "/patient/getAllPatientTasks",
  GET_TASK_BY_PROVIDER_ID: BASE_URL + "/patient/getByProvider",
  GET_TASK_BY_NURSE_ID: BASE_URL + "/patient/getByNurse",
  EDIT_TASK: BASE_URL + "/patient/editPatientTask",
  GET_ALL_TASK: BASE_URL + "/patient/getAllTasks",
}

export const sendPdf = {
  SEND_PDF: BASE_URL + "/aws/upload-pdf",
}



export const LOCATION_API = {
  CREATE: BASE_URL + "/location/create",
  GET_ALL: BASE_URL + "/location/all",
  GET_BY_PROVIDER: (providerId) => BASE_URL + `/location/provider/${providerId}`,
  UPDATE: "/location/update",
  DELETE: (locationId) => BASE_URL + `/location/delete/${locationId}`,
};


export const APPOINTMENT_API = {
  CREATE: BASE_URL + "/appointment/create",
  RESCHEDULE: (appointmentId) => BASE_URL + `/appointment/reschedule/${appointmentId}`,
  GET_BY_PROVIDER: (providerId) => BASE_URL + `/appointment/provider/${providerId}`,
  UPCOMING_APPOINTMENT: BASE_URL + `/appointment/upcoming`,
  SINGLE_PATINET_APPOINTMENT: BASE_URL + `/appointment/patient`,
};


export const WORKFLOW_API = {
  CREATE: BASE_URL + "/work-flow/create",
  GET_BY_PROVIDER: (providerId) => BASE_URL + `/work-flow/provider/${providerId}`,
  UPDATE: (id) => BASE_URL + `/work-flow/update/${id}`,
  DELETE: (id) => BASE_URL + `/work-flow/delete/${id}`,
};


export const documents = {
  GET_TYPE: BASE_URL + "/documents/types",
  UPLOAD_DOC: BASE_URL + "/documents/upload",
  GET_DOC: BASE_URL + "/documents/getPatientDocuments",
};




export const careplan = {
  CREATE_CARE_PLAN: BASE_URL + "/ccm/create",
  GET_CARE_PLAN: BASE_URL + "/ccm/get",

}


export const encounter = {
  CREATE_TEMPLATE_API: BASE_URL + "/encounters/template/create",
  GET_TEMPLATE_API: BASE_URL + "/encounters/template/get",
  UPDATE_TEMPLATE_API: BASE_URL + "/encounters/template/update",
  DELETE_TEMPLATE_API: BASE_URL + "/encounters/template/delete",

  CREATE_ENCOUNTER_API: BASE_URL + "/encounters/create",
  GET_ENCOUNTER_API: BASE_URL + "/encounters/get",
  UPDATE_ENCOUNTER_API: BASE_URL + "/encounters/update",
  DELETE_ENCOUNTER_API: BASE_URL + "/encounters/delete",

  // Encounter to Claim workflow
  CREATE_CLAIM_FROM_ENCOUNTER_API: BASE_URL + "/encounters/create-claim",
  SUBMIT_CLAIM_API: BASE_URL + "/encounters/submit-claim",
  CRETE_NEW_ENCOUNTER : BASE_URL + "/encounters/ehr/create-new-encounter",
  GET_NEW_ENCOUNTER : BASE_URL + "/encounters/ehr/get-all-encounters",
}
export const device = {

  GET_ALL_DEVICE: BASE_URL + "/devices/getDevices",
  GET_PATIENT_DEVICE: BASE_URL + "/devices/getPatientDevices",
  ASSIGN_DEVICE: BASE_URL + "/devices/assignDevice",

}
export const cms = {

  GET_CMS_DETAILS: BASE_URL + "/billing/get-form-information-for-cms",
  UPDATE_CMS_DETAILS: BASE_URL + "/billing/save-claim",

}
export const intake = {

  SEND_INTAKE: BASE_URL + "/intake/send",
  REGISTER_INTAKE_PATIENT: BASE_URL + "/intake/register/patient",

}

export const rcm = {
  // Dashboard and Analytics
  RCM_DASHBOARD_API: BASE_URL + "/rcm/dashboard",
  RCM_ANALYTICS_API: BASE_URL + "/rcm/analytics",
  RCM_PERFORMANCE_API: BASE_URL + "/rcm/performance/metrics",

  // Claims Management
  RCM_CLAIMS_API: BASE_URL + "/rcm/claims",
  RCM_CLAIMS_CREATE_API: BASE_URL + "/rcm/claims",
  RCM_CLAIMS_UPDATE_API: (claimId) => BASE_URL + `/rcm/claims/${claimId}`,
  RCM_CLAIMS_STATUS_API: (claimId) => BASE_URL + `/rcm/claims/${claimId}/status`,
  RCM_CLAIMS_BULK_UPDATE_API: BASE_URL + "/rcm/claims/bulk-update",

  // A/R Aging and Collections
  RCM_AR_AGING_API: BASE_URL + "/rcm/ar-aging",
  RCM_COLLECTIONS_API: BASE_URL + "/rcm/collections",
  RCM_COLLECTIONS_UPDATE_API: (accountId) => BASE_URL + `/rcm/collections/${accountId}/status`,

  // Payment Processing
  RCM_PAYMENTS_API: BASE_URL + "/rcm/payments",
  RCM_PAYMENTS_POST_API: BASE_URL + "/rcm/payments/post",
  RCM_ERA_PROCESS_API: BASE_URL + "/rcm/payments/era/process",

  // Denial Management
  RCM_DENIALS_API: BASE_URL + "/rcm/denials/analytics",

  // Patient Statements
  RCM_STATEMENTS_API: BASE_URL + "/rcm/statements",
  RCM_STATEMENTS_GENERATE_API: (patientId) => BASE_URL + `/rcm/patients/${patientId}/statements/generate`,

  // Reports
  RCM_REPORTS_GENERATE_API: BASE_URL + "/rcm/reports/generate",

  // ClaimMD Integration
  RCM_CLAIMMD_API: BASE_URL + "/rcm/claimmd",
  RCM_CLAIMMD_CONFIG_API: BASE_URL + "/rcm/claimmd/configuration",
  RCM_CLAIMMD_TEST_API: BASE_URL + "/rcm/claimmd/test-connection",
  RCM_CLAIMMD_ERA_STATUS_API: (referenceId) => BASE_URL + `/rcm/claimmd/era-status/${referenceId}`,

  // Cache and Performance
  RCM_CACHE_STATS_API: BASE_URL + "/rcm/cache/stats",
  RCM_CACHE_CLEAR_API: BASE_URL + "/rcm/cache/clear",
  RCM_CACHE_INVALIDATE_API: BASE_URL + "/rcm/cache/invalidate",

  // Eligibility and Validation
  RCM_ELIGIBILITY_CHECK_API: BASE_URL + "/rcm/eligibility/check",
  RCM_ELIGIBILITY_VERIFY_API: BASE_URL + "/rcm/eligibility/verify",
  RCM_ELIGIBILITY_HISTORY_API: BASE_URL + "/rcm/eligibility/history",
  RCM_CLAIM_VALIDATE_API: BASE_URL + "/rcm/claims/validate",
  RCM_CLAIM_SCRUB_API: BASE_URL + "/rcm/claims/scrub",
  RCM_CLAIM_ESTIMATE_API: BASE_URL + "/rcm/claims/estimate",
  RCM_BENEFITS_CHECK_API: BASE_URL + "/rcm/benefits/check",
  RCM_PRIOR_AUTH_API: BASE_URL + "/rcm/prior-authorization",
  RCM_COPAY_ESTIMATE_API: BASE_URL + "/rcm/copay/estimate",

  // Legacy endpoints for backward compatibility
  RCM_FORECASTING_API: BASE_URL + "/rcm/analytics", // Maps to analytics
}
