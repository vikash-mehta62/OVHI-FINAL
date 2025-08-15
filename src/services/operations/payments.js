import { apiConnector } from '../apiConnector';

const BASE_URL = "http://localhost:8000/api/v1";

// Payment Gateway APIs
export const getPaymentGatewaysAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/payments/gateways`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payment gateways");
    }

    return response.data;
  } catch (error) {
    console.error("Payment Gateways API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to fetch payment gateways" };
  }
};

export const configurePaymentGatewayAPI = async (token, gatewayData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/payments/gateways`,
      gatewayData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to configure payment gateway");
    }

    return response.data;
  } catch (error) {
    console.error("Configure Payment Gateway API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to configure payment gateway" };
  }
};

export const createPaymentIntentAPI = async (token, paymentData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/payments/intent`,
      paymentData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create payment intent");
    }

    return response.data;
  } catch (error) {
    console.error("Create Payment Intent API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to create payment intent" };
  }
};

export const confirmPaymentAPI = async (token, paymentId, confirmationData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/payments/${paymentId}/confirm`,
      confirmationData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to confirm payment");
    }

    return response.data;
  } catch (error) {
    console.error("Confirm Payment API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to confirm payment" };
  }
};

export const getPaymentHistoryAPI = async (token, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/payments/history${queryString ? '?' + queryString : ''}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payment history");
    }

    return response.data;
  } catch (error) {
    console.error("Payment History API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to fetch payment history" };
  }
};

export const processRefundAPI = async (token, paymentId, refundData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/payments/${paymentId}/refund`,
      refundData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to process refund");
    }

    return response.data;
  } catch (error) {
    console.error("Process Refund API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to process refund" };
  }
};

export const getPaymentAnalyticsAPI = async (token, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/payments/analytics${queryString ? '?' + queryString : ''}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch payment analytics");
    }

    return response.data;
  } catch (error) {
    console.error("Payment Analytics API Error:", error);
    return { success: false, message: error?.response?.data?.message || "Failed to fetch payment analytics" };
  }
};

// Legacy paymentAPI object for backward compatibility
export const paymentAPI = {
  getGateways: (token) => getPaymentGatewaysAPI(token),
  configureGateway: (token, gatewayData) => configurePaymentGatewayAPI(token, gatewayData),
  createPaymentIntent: (token, paymentData) => createPaymentIntentAPI(token, paymentData),
  confirmPayment: (token, paymentId, confirmationData) => confirmPaymentAPI(token, paymentId, confirmationData),
  getPaymentHistory: (token, params) => getPaymentHistoryAPI(token, params),
  processRefund: (token, paymentId, refundData) => processRefundAPI(token, paymentId, refundData),
  getPaymentAnalytics: (token, params) => getPaymentAnalyticsAPI(token, params)
};