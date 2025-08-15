import { apiConnector } from "../apiConnector";
import { toast } from "sonner";

const { REACT_APP_BASE_URL } = process.env;

// Patient Account API endpoints
const PATIENT_ACCOUNT_ENDPOINTS = {
  GET_ACCOUNT_SUMMARY: "/api/v1/patient/account/account-summary",
  GET_CLAIMS: "/api/v1/patient/account/claims",
  GET_CLAIM_DETAILS: "/api/v1/patient/account/claims",
  ADD_CLAIM_COMMENT: "/api/v1/patient/account/claims/comment",
  VOID_CLAIM: "/api/v1/patient/account/claims/void",
  CORRECT_CLAIM: "/api/v1/patient/account/claims/correct",
  GET_PAYMENTS: "/api/v1/patient/account/payments", 
  RECORD_PAYMENT: "/api/v1/patient/account/payments/record",
  GET_STATEMENTS: "/api/v1/patient/account/statements",
  GENERATE_STATEMENT: "/api/v1/patient/account/statements/generate",
  DOWNLOAD_STATEMENT: "/api/v1/patient/account/statements",
  RESEND_STATEMENT: "/api/v1/patient/account/statements/resend"
};

// Get patient account summary
export const getPatientAccountSummaryAPI = async (patientId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      PATIENT_ACCOUNT_ENDPOINTS.GET_ACCOUNT_SUMMARY + `?patientId=${patientId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch account summary");
    }
    
    result = response?.data;
  } catch (error) {
    console.error("GET_PATIENT_ACCOUNT_SUMMARY_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch account summary");
  }
  return result;
};

// Get patient claims
export const getPatientClaimsAPI = async (patientId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      PATIENT_ACCOUNT_ENDPOINTS.GET_CLAIMS + `?patientId=${patientId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch claims");
    }
    
    result = response?.data;
  } catch (error) {
    console.error("GET_PATIENT_CLAIMS_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch claims");
  }
  return result;
};

// Get patient payments
export const getPatientPaymentsAPI = async (patientId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      PATIENT_ACCOUNT_ENDPOINTS.GET_PAYMENTS + `?patientId=${patientId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payments");
    }
    
    result = response?.data;
  } catch (error) {
    console.error("GET_PATIENT_PAYMENTS_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch payments");
  }
  return result;
};

// Get patient statements
export const getPatientStatementsAPI = async (patientId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      PATIENT_ACCOUNT_ENDPOINTS.GET_STATEMENTS + `?patientId=${patientId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch statements");
    }
    
    result = response?.data;
  } catch (error) {
    console.error("GET_PATIENT_STATEMENTS_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch statements");
  }
  return result;
};

// Record patient payment
export const recordPatientPaymentAPI = async (paymentData, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.RECORD_PAYMENT,
      paymentData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to record payment");
    }
    
    result = response?.data;
    toast.success("Payment recorded successfully");
  } catch (error) {
    console.error("RECORD_PATIENT_PAYMENT_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to record payment");
  }
  return result;
};

// Generate patient statement
export const generatePatientStatementAPI = async (statementData, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.GENERATE_STATEMENT,
      statementData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to generate statement");
    }
    
    result = response?.data;
    toast.success("Patient statement generated and sent successfully");
  } catch (error) {
    console.error("GENERATE_PATIENT_STATEMENT_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to generate statement");
  }
  return result;
};

// Download patient statement
export const downloadPatientStatementAPI = async (statementId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      PATIENT_ACCOUNT_ENDPOINTS.DOWNLOAD_STATEMENT + `/${statementId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
        responseType: 'blob'
      }
    );
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `statement-${statementId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success("Statement downloaded successfully");
    result = { success: true };
  } catch (error) {
    console.error("DOWNLOAD_PATIENT_STATEMENT_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to download statement");
  }
  return result;
};

// Get claim details
export const getClaimDetailsAPI = async (claimId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "GET",
      `${PATIENT_ACCOUNT_ENDPOINTS.GET_CLAIM_DETAILS}/${claimId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch claim details");
    }
    
    result = response?.data;
  } catch (error) {
    console.error("GET_CLAIM_DETAILS_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch claim details");
  }
  return result;
};

// Add claim comment
export const addClaimCommentAPI = async (commentData, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.ADD_CLAIM_COMMENT,
      commentData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to add comment");
    }
    
    result = response?.data;
    toast.success("Comment added successfully");
  } catch (error) {
    console.error("ADD_CLAIM_COMMENT_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to add comment");
  }
  return result;
};

// Void claim
export const voidClaimAPI = async (voidData, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.VOID_CLAIM,
      voidData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to void claim");
    }
    
    result = response?.data;
    toast.success("Claim voided successfully");
  } catch (error) {
    console.error("VOID_CLAIM_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to void claim");
  }
  return result;
};

// Correct claim
export const correctClaimAPI = async (correctionData, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.CORRECT_CLAIM,
      correctionData,
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to correct claim");
    }
    
    result = response?.data;
    toast.success("Claim correction submitted successfully");
  } catch (error) {
    console.error("CORRECT_CLAIM_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to correct claim");
  }
  return result;
};

// Resend patient statement
export const resendPatientStatementAPI = async (statementId, token) => {
  let result = null;
  try {
    const response = await apiConnector(
      "POST",
      PATIENT_ACCOUNT_ENDPOINTS.RESEND_STATEMENT,
      { statementId },
      {
        Authorization: `Bearer ${token}`,
      }
    );
    
    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to resend statement");
    }
    
    result = response?.data;
    toast.success("Statement resent to patient successfully");
  } catch (error) {
    console.error("RESEND_PATIENT_STATEMENT_API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to resend statement");
  }
  return result;
};