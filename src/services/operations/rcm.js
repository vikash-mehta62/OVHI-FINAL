import { apiConnector } from "../apiConnector";
import { rcm } from "../apis";
import { toast } from "react-toastify";

const {
  RCM_DASHBOARD_API,
  RCM_CLAIMS_API,
  RCM_AR_AGING_API,
  RCM_DENIALS_API,
  RCM_PAYMENTS_API,
  RCM_FORECASTING_API,
  RCM_COLLECTIONS_API,
  RCM_ANALYTICS_API
} = rcm;

// Dashboard Data
export const getRCMDashboardDataAPI = async (token, timeframe = '30d') => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_DASHBOARD_API}?timeframe=${timeframe}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch dashboard data");
    }

    return response.data;
  } catch (error) {
    console.error("RCM Dashboard API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch dashboard data");
    return null;
  }
};

// Claims Status
export const getClaimsStatusAPI = async (token, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API}?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch claims status");
    }

    return response.data;
  } catch (error) {
    console.error("Claims Status API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch claims status");
    return null;
  }
};

// Update Claim Status
export const updateClaimStatusAPI = async (token, claimId, statusData) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${RCM_CLAIMS_API}/${claimId}/status`,
      statusData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update claim status");
    }

    toast.success("Claim status updated successfully");
    return response.data;
  } catch (error) {
    console.error("Update Claim Status API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to update claim status");
    return null;
  }
};

// Bulk Update Claims
export const bulkUpdateClaimsAPI = async (token, claimIds, status) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API}/bulk-update`,
      { claimIds, status },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to bulk update claims");
    }

    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    console.error("Bulk Update Claims API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to bulk update claims");
    return null;
  }
};

// A/R Aging Report
export const getARAgingReportAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      RCM_AR_AGING_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch A/R aging report");
    }

    return response.data;
  } catch (error) {
    console.error("A/R Aging API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch A/R aging report");
    return null;
  }
};

// Denial Analytics
export const getDenialAnalyticsAPI = async (token, timeframe = '30d') => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_DENIALS_API}/analytics?timeframe=${timeframe}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch denial analytics");
    }

    return response.data;
  } catch (error) {
    console.error("Denial Analytics API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch denial analytics");
    return null;
  }
};

// Payment Posting Data
export const getPaymentPostingDataAPI = async (token, date) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_PAYMENTS_API}?date=${date}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payment data");
    }

    return response.data;
  } catch (error) {
    console.error("Payment Posting API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch payment data");
    return null;
  }
};

// Revenue Forecasting
export const getRevenueForecastingAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      RCM_FORECASTING_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch revenue forecasting");
    }

    return response.data;
  } catch (error) {
    console.error("Revenue Forecasting API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch revenue forecasting");
    return null;
  }
};

// Collections Workflow
export const getCollectionsWorkflowAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      RCM_COLLECTIONS_API,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch collections workflow");
    }

    return response.data;
  } catch (error) {
    console.error("Collections Workflow API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch collections workflow");
    return null;
  }
};

// Update Collection Status
export const updateCollectionStatusAPI = async (token, accountId, status) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${RCM_COLLECTIONS_API}/${accountId}/status`,
      { status },
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update collection status");
    }

    toast.success("Collection status updated successfully");
    return response.data;
  } catch (error) {
    console.error("Update Collection Status API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to update collection status");
    return null;
  }
};

// Initiate Automated Follow-up
export const initiateAutomatedFollowUpAPI = async (token, accountId, followUpData = {}) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_AR_AGING_API}/${accountId}/follow-up`,
      followUpData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to initiate follow-up");
    }

    toast.success("Automated follow-up initiated successfully");
    return response.data;
  } catch (error) {
    console.error("Automated Follow-up API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to initiate follow-up");
    return null;
  }
};

// Setup Payment Plan
export const setupPaymentPlanAPI = async (token, accountId, planData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_AR_AGING_API}/${accountId}/payment-plan`,
      planData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to setup payment plan");
    }

    toast.success("Payment plan setup successfully");
    return response.data;
  } catch (error) {
    console.error("Setup Payment Plan API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to setup payment plan");
    return null;
  }
};

// Generate RCM Report
export const generateRCMReportAPI = async (token, reportParams) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_ANALYTICS_API}/reports/generate`,
      reportParams,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to generate report");
    }

    toast.success("Report generated successfully");
    return response.data;
  } catch (error) {
    console.error("Generate Report API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to generate report");
    return null;
  }
};

// Additional RCM API Functions

// Get Claim Details
export const getClaimDetailsAPI = async (token, claimId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API}/${claimId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch claim details");
    }

    return response.data;
  } catch (error) {
    console.error("Claim Details API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch claim details");
    return null;
  }
};

// Create New Claim
export const createClaimAPI = async (token, claimData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_CLAIMS_API,
      claimData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create claim");
    }

    toast.success("Claim created successfully");
    return response.data;
  } catch (error) {
    console.error("Create Claim API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to create claim");
    return null;
  }
};

// Update Existing Claim
export const updateClaimAPI = async (token, claimId, claimData) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${RCM_CLAIMS_API}/${claimId}`,
      claimData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update claim");
    }

    toast.success("Claim updated successfully");
    return response.data;
  } catch (error) {
    console.error("Update Claim API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to update claim");
    return null;
  }
};

// Bulk Claim Status Update
export const bulkClaimStatusUpdateAPI = async (token, updateData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API}/bulk-update`,
      updateData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to bulk update claims");
    }

    toast.success(response.data.message);
    return response.data;
  } catch (error) {
    console.error("Bulk Claim Status Update API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to bulk update claims");
    return null;
  }
};

// Get A/R Account Details
export const getARAccountDetailsAPI = async (token, accountId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_AR_AGING_API}/${accountId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch account details");
    }

    return response.data;
  } catch (error) {
    console.error("A/R Account Details API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch account details");
    return null;
  }
};

// Process ERA File
export const processERAFileAPI = async (token, eraData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_PAYMENTS_API}/era/process`,
      eraData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to process ERA file");
    }

    toast.success("ERA file processed successfully");
    return response.data;
  } catch (error) {
    console.error("Process ERA File API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to process ERA file");
    return null;
  }
};

// Get RCM Analytics
export const getRCMAnalyticsAPI = async (token, timeframe = '30d', compareWith = 'previous') => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_ANALYTICS_API}?timeframe=${timeframe}&compareWith=${compareWith}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch RCM analytics");
    }

    return response.data;
  } catch (error) {
    console.error("RCM Analytics API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch RCM analytics");
    return null;
  }
};

// Get Payer Performance
export const getPayerPerformanceAPI = async (token, timeframe = '90d') => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_ANALYTICS_API}/payer-performance?timeframe=${timeframe}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payer performance");
    }

    return response.data;
  } catch (error) {
    console.error("Payer Performance API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch payer performance");
    return null;
  }
};

// Get Denial Trends
export const getDenialTrendsAPI = async (token, timeframe = '6m') => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_DENIALS_API}/trends?timeframe=${timeframe}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch denial trends");
    }

    return response.data;
  } catch (error) {
    console.error("Denial Trends API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch denial trends");
    return null;
  }
};

// Get ClaimMD Status
export const getClaimMDStatusAPI = async (token, trackingId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API}/claimmd/status/${trackingId}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch ClaimMD status");
    }

    return response.data;
  } catch (error) {
    console.error("ClaimMD Status API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch ClaimMD status");
    return null;
  }
};

// Enhanced RCM Features

// Validate Claim
export const validateClaimAPI = async (token, claimId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API}/${claimId}/validate`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to validate claim");
    }

    return response.data;
  } catch (error) {
    console.error("Validate Claim API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to validate claim");
    return null;
  }
};

// Get Claim Suggestions
export const getClaimSuggestionsAPI = async (token, patientId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/patients/${patientId}/claim-suggestions`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get claim suggestions");
    }

    return response.data;
  } catch (error) {
    console.error("Claim Suggestions API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to get claim suggestions");
    return null;
  }
};

// Get Auto Corrections
export const getAutoCorrectionAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/auto-corrections`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get auto corrections");
    }

    return response.data;
  } catch (error) {
    console.error("Auto Corrections API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to get auto corrections");
    return null;
  }
};

// Generate Patient Statement
export const generatePatientStatementAPI = async (token, patientId, statementData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API.replace('/claims', '')}/patients/${patientId}/statements/generate`,
      statementData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to generate patient statement");
    }

    toast.success("Patient statement generated successfully");
    return response.data;
  } catch (error) {
    console.error("Generate Patient Statement API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to generate patient statement");
    return null;
  }
};

// Get Patient Statements
export const getPatientStatementsAPI = async (token, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/statements?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch patient statements");
    }

    return response.data;
  } catch (error) {
    console.error("Patient Statements API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch patient statements");
    return null;
  }
};

// Send Patient Statement
export const sendPatientStatementAPI = async (token, statementId, sendData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API.replace('/claims', '')}/statements/${statementId}/send`,
      sendData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to send patient statement");
    }

    toast.success("Patient statement sent successfully");
    return response.data;
  } catch (error) {
    console.error("Send Patient Statement API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to send patient statement");
    return null;
  }
};

// ERA Processing APIs

// Get Office Payments
export const getOfficePaymentsAPI = async (token, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/payments/office?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch office payments");
    }

    return response.data;
  } catch (error) {
    console.error("Office Payments API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch office payments");
    return null;
  }
};

// Record Office Payment
export const recordOfficePaymentAPI = async (token, paymentData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API.replace('/claims', '')}/payments/office/record`,
      paymentData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to record office payment");
    }

    toast.success("Office payment recorded successfully");
    return response.data;
  } catch (error) {
    console.error("Record Office Payment API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to record office payment");
    return null;
  }
};

// Get ERA Files
export const getERAFilesAPI = async (token, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/era/files?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch ERA files");
    }

    return response.data;
  } catch (error) {
    console.error("ERA Files API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch ERA files");
    return null;
  }
};


// Get ERA Payment Details
export const getERAPaymentDetailsAPI = async (token, eraId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${RCM_CLAIMS_API.replace('/claims', '')}/era/${eraId}/details`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch ERA payment details");
    }

    return response.data;
  } catch (error) {
    console.error("ERA Payment Details API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch ERA payment details");
    return null;
  }
};

// Manual Post ERA Payment
export const manualPostERAPaymentAPI = async (token, eraDetailId) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API.replace('/claims', '')}/era/payments/${eraDetailId}/post`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to post ERA payment");
    }

    toast.success("ERA payment posted successfully");
    return response.data;
  } catch (error) {
    console.error("Manual Post ERA API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to post ERA payment");
    return null;
  }
};

// Sync ClaimMD Data
export const syncClaimMDDataAPI = async (token, syncConfig) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_CLAIMS_API}/claimmd/sync`,
      syncConfig,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to sync ClaimMD data");
    }

    toast.success("ClaimMD data synced successfully");
    return response.data;
  } catch (error) {
    console.error("Sync ClaimMD Data API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to sync ClaimMD data");
    return null;
  }
};

// RCM Utility Functions
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

export const formatPercentage = (value, decimals = 1) => {
  return `${(value || 0).toFixed(decimals)}%`;
};

export const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const getStatusColor = (status) => {
  const statusColors = {
    0: 'gray',    // Draft
    1: 'blue',    // Submitted
    2: 'green',   // Paid
    3: 'red',     // Denied
    4: 'yellow'   // Appealed
  };
  return statusColors[status] || 'gray';
};

export const getPriorityColor = (days) => {
  if (days > 30) return 'red';
  if (days > 14) return 'yellow';
  return 'green';
};

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
export const validateClaimDataAPI = (token,data,options) =>{
return true;
}
export const validateNPIAPI = (token,npi) =>{
return true;
}
