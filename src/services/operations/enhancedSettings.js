import { toast } from "react-toastify";
import { apiConnector } from "../apiConnector";
import { settings } from "../apis";

const {
  NOTIFICATION_SETTINGS_API,
  PRIVACY_SETTINGS_API,
  APPEARANCE_SETTINGS_API,
  SECURITY_SETTINGS_API,
  EXPORT_SETTINGS_API
} = settings;

// Notification Settings
export const updateNotificationSettingsAPI = async (settingsData, token) => {
  try {
    const loadingToastId = toast.loading("Updating notification settings...");

    const response = await apiConnector("POST", NOTIFICATION_SETTINGS_API, settingsData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update notification settings");
    }

    toast.update(loadingToastId, {
      render: "Notification settings updated successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to update notification settings");
    console.error("UPDATE_NOTIFICATION_SETTINGS_API ERROR:", error);
    return null;
  }
};

export const getNotificationSettingsAPI = async (token) => {
  try {
    const response = await apiConnector("GET", NOTIFICATION_SETTINGS_API, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get notification settings");
    }

    return response.data;
  } catch (error) {
    console.error("GET_NOTIFICATION_SETTINGS_API ERROR:", error);
    return null;
  }
};

// Privacy Settings
export const updatePrivacySettingsAPI = async (settingsData, token) => {
  try {
    const loadingToastId = toast.loading("Updating privacy settings...");

    const response = await apiConnector("POST", PRIVACY_SETTINGS_API, settingsData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update privacy settings");
    }

    toast.update(loadingToastId, {
      render: "Privacy settings updated successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to update privacy settings");
    console.error("UPDATE_PRIVACY_SETTINGS_API ERROR:", error);
    return null;
  }
};

export const getPrivacySettingsAPI = async (token) => {
  try {
    const response = await apiConnector("GET", PRIVACY_SETTINGS_API, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get privacy settings");
    }

    return response.data;
  } catch (error) {
    console.error("GET_PRIVACY_SETTINGS_API ERROR:", error);
    return null;
  }
};

// Appearance Settings
export const updateAppearanceSettingsAPI = async (settingsData, token) => {
  try {
    const loadingToastId = toast.loading("Updating appearance settings...");

    const response = await apiConnector("POST", APPEARANCE_SETTINGS_API, settingsData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update appearance settings");
    }

    toast.update(loadingToastId, {
      render: "Appearance settings updated successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to update appearance settings");
    console.error("UPDATE_APPEARANCE_SETTINGS_API ERROR:", error);
    return null;
  }
};

export const getAppearanceSettingsAPI = async (token) => {
  try {
    const response = await apiConnector("GET", APPEARANCE_SETTINGS_API, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get appearance settings");
    }

    return response.data;
  } catch (error) {
    console.error("GET_APPEARANCE_SETTINGS_API ERROR:", error);
    return null;
  }
};

// Security Settings
export const updateSecuritySettingsAPI = async (settingsData, token) => {
  try {
    const loadingToastId = toast.loading("Updating security settings...");

    const response = await apiConnector("POST", SECURITY_SETTINGS_API, settingsData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update security settings");
    }

    toast.update(loadingToastId, {
      render: "Security settings updated successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to update security settings");
    console.error("UPDATE_SECURITY_SETTINGS_API ERROR:", error);
    return null;
  }
};

export const getSecuritySettingsAPI = async (token) => {
  try {
    const response = await apiConnector("GET", SECURITY_SETTINGS_API, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get security settings");
    }

    return response.data;
  } catch (error) {
    console.error("GET_SECURITY_SETTINGS_API ERROR:", error);
    return null;
  }
};

// Export Settings
export const exportSettingsAPI = async (token) => {
  try {
    const loadingToastId = toast.loading("Exporting settings...");

    const response = await apiConnector("GET", EXPORT_SETTINGS_API, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to export settings");
    }

    toast.update(loadingToastId, {
      render: "Settings exported successfully!",
      type: "success",
      isLoading: false,
      autoClose: 2500,
      closeButton: true,
    });

    // Create and download file
    const dataStr = JSON.stringify(response.data.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return response.data;
  } catch (error) {
    toast.dismiss();
    toast.error(error?.response?.data?.message || "Failed to export settings");
    console.error("EXPORT_SETTINGS_API ERROR:", error);
    return null;
  }
};