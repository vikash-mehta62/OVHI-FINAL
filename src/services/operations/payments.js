import { apiConnector } from '../apiConnector';

const BASE_URL = "http://localhost:8000/api/v1";

export const paymentAPI = {
  // Get payment gateway configurations
  getGateways: () => apiConnector('GET', `${BASE_URL}/payments/gateways`),

  // Configure payment gateway
  configureGateway: (gatewayData) => apiConnector('POST', `${BASE_URL}/payments/gateways`, gatewayData),

  // Create payment intent
  createPaymentIntent: (paymentData) => apiConnector('POST', `${BASE_URL}/payments/intent`, paymentData),

  // Confirm payment
  confirmPayment: (paymentId, confirmationData) => 
    apiConnector('POST', `${BASE_URL}/payments/${paymentId}/confirm`, confirmationData),

  // Get payment history
  getPaymentHistory: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiConnector('GET', `${BASE_URL}/payments/history${queryString ? '?' + queryString : ''}`);
  },

  // Process refund
  processRefund: (paymentId, refundData) => 
    apiConnector('POST', `${BASE_URL}/payments/${paymentId}/refund`, refundData),

  // Get payment analytics
  getPaymentAnalytics: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiConnector('GET', `${BASE_URL}/payments/analytics${queryString ? '?' + queryString : ''}`);
  },

  // Get payment methods for a patient
  getPatientPaymentMethods: (patientId) => 
    apiConnector('GET', `${BASE_URL}/payments/patient/${patientId}/methods`),

  // Save payment method for future use
  savePaymentMethod: (patientId, paymentMethodData) => 
    apiConnector('POST', `${BASE_URL}/payments/patient/${patientId}/methods`, paymentMethodData),

  // Delete saved payment method
  deletePaymentMethod: (patientId, paymentMethodId) => 
    apiConnector('DELETE', `${BASE_URL}/payments/patient/${patientId}/methods/${paymentMethodId}`),

  // Create payment plan
  createPaymentPlan: (planData) => apiConnector('POST', `${BASE_URL}/payments/plans`, planData),

  // Get payment plans
  getPaymentPlans: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiConnector('GET', `${BASE_URL}/payments/plans${queryString ? '?' + queryString : ''}`);
  },

  // Update payment plan
  updatePaymentPlan: (planId, planData) => 
    apiConnector('PUT', `${BASE_URL}/payments/plans/${planId}`, planData),

  // Cancel payment plan
  cancelPaymentPlan: (planId, reason) => 
    apiConnector('POST', `${BASE_URL}/payments/plans/${planId}/cancel`, { reason })
};