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
export const initiateAutomatedFollowUpAPI = async (token, accountId) => {
  try {
    const response = await apiConnector(
      "POST",
      `${RCM_AR_AGING_API}/${accountId}/follow-up`,
      {},
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