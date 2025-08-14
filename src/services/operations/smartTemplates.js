import { toast } from "react-toastify";
import { apiConnector } from "../apiConnector";

const BASE_URL = "http://localhost:8000/api/v1";

// Get smart template recommendations
export const getSmartTemplateRecommendationsAPI = async (token, params) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/encounters/smart-templates/recommendations?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get recommendations");
    }

    return response.data;
  } catch (error) {
    console.error("Smart template recommendations API error:", error);
    toast.error(error?.response?.data?.message || "Failed to get recommendations");
    return null;
  }
};

// Create smart template
export const createSmartTemplateAPI = async (token, templateData) => {
  try {
    const loadingToastId = toast.loading("Creating smart template...");

    const response = await apiConnector(
      "POST",
      `${BASE_URL}/encounters/smart-templates/create`,
      templateData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create template");
    }

    toast.update(loadingToastId, {
      render: "Smart template created successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to create template");
    console.error("Create smart template API error:", error);
    return null;
  }
};

// Get templates by specialty
export const getTemplatesBySpecialtyAPI = async (token, params) => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/encounters/smart-templates/specialty?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get templates");
    }

    return response.data;
  } catch (error) {
    console.error("Get templates by specialty API error:", error);
    return null;
  }
};

// Clone template
export const cloneTemplateAPI = async (token, templateId, cloneData) => {
  try {
    const loadingToastId = toast.loading("Cloning template...");

    const response = await apiConnector(
      "POST",
      `${BASE_URL}/encounters/smart-templates/${templateId}/clone`,
      cloneData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to clone template");
    }

    toast.update(loadingToastId, {
      render: "Template cloned successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to clone template");
    console.error("Clone template API error:", error);
    return null;
  }
};

// Rate template
export const rateTemplateAPI = async (token, templateId, ratingData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/encounters/smart-templates/${templateId}/rate`,
      ratingData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to rate template");
    }

    toast.success("Template rated successfully");
    return response.data;
  } catch (error) {
    toast.error(error?.response?.data?.message || "Failed to rate template");
    console.error("Rate template API error:", error);
    return null;
  }
};

// Get template analytics
export const getTemplateAnalyticsAPI = async (token, templateId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/encounters/smart-templates/${templateId}/analytics`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get analytics");
    }

    return response.data;
  } catch (error) {
    console.error("Get template analytics API error:", error);
    return null;
  }
};

// Get AI suggestions
export const getAISuggestionsAPI = async (token, contextData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/encounters/smart-templates/ai-suggestions`,
      contextData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get AI suggestions");
    }

    return response.data;
  } catch (error) {
    console.error("Get AI suggestions API error:", error);
    return null;
  }
};

// Generate smart billing codes
export const generateSmartBillingAPI = async (token, billingContext) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/encounters/smart-templates/smart-billing`,
      billingContext,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to generate billing codes");
    }

    return response.data;
  } catch (error) {
    console.error("Generate smart billing API error:", error);
    toast.error("Failed to generate smart billing codes");
    return null;
  }
};