import { apiConnector } from "../apiConnector";
import { toast } from "react-toastify";

const BASE_URL = "/api/v1/settings/auto-specialty";

// Get specialty configuration for current user
export const getSpecialtyConfigurationAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/config`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch specialty configuration");
    }

    return response.data;
  } catch (error) {
    console.error("Get Specialty Configuration API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch specialty configuration");
    return null;
  }
};

// Update specialty configuration
export const updateSpecialtyConfigurationAPI = async (token, configData) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${BASE_URL}/config`,
      configData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update specialty configuration");
    }

    toast.success("Specialty configuration updated successfully");
    return response.data;
  } catch (error) {
    console.error("Update Specialty Configuration API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to update specialty configuration");
    return null;
  }
};

// Get auto-assigned templates based on context
export const getAutoAssignedTemplatesAPI = async (token, context = {}) => {
  try {
    const queryParams = new URLSearchParams(context).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/auto-assigned?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch auto-assigned templates");
    }

    return response.data;
  } catch (error) {
    console.error("Get Auto-Assigned Templates API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch auto-assigned templates");
    return null;
  }
};

// Create custom template
export const createCustomTemplateAPI = async (token, templateData) => {
  try {
    const response = await apiConnector(
      "POST",
      `${BASE_URL}/custom-template`,
      templateData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create custom template");
    }

    toast.success("Custom template created successfully");
    return response.data;
  } catch (error) {
    console.error("Create Custom Template API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to create custom template");
    return null;
  }
};

// Get AI template recommendations
export const getAITemplateRecommendationsAPI = async (token, context) => {
  try {
    const queryParams = new URLSearchParams(context).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/ai-recommendations?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch AI recommendations");
    }

    return response.data;
  } catch (error) {
    console.error("Get AI Template Recommendations API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch AI recommendations");
    return null;
  }
};

// Get specialty template analytics
export const getSpecialtyTemplateAnalyticsAPI = async (token, specialty, timeframe = '30d') => {
  try {
    const queryParams = new URLSearchParams({ specialty, timeframe }).toString();
    const response = await apiConnector(
      "GET",
      `${BASE_URL}/analytics?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch template analytics");
    }

    return response.data;
  } catch (error) {
    console.error("Get Specialty Template Analytics API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch template analytics");
    return null;
  }
};

// Toggle auto-assignment for specialty
export const toggleAutoAssignmentAPI = async (token, specialty, enabled) => {
  try {
    const response = await updateSpecialtyConfigurationAPI(token, {
      specialty,
      auto_template_assignment: enabled
    });

    if (response) {
      toast.success(`Auto-assignment ${enabled ? 'enabled' : 'disabled'} for ${specialty}`);
    }

    return response;
  } catch (error) {
    console.error("Toggle Auto-Assignment API Error:", error);
    toast.error("Failed to update auto-assignment setting");
    return null;
  }
};

// Set template as default for specialty
export const setTemplateAsDefaultAPI = async (token, specialty, templateId, isDefault) => {
  try {
    // First get current configuration
    const currentConfig = await getSpecialtyConfigurationAPI(token);
    if (!currentConfig?.data?.config) {
      throw new Error("Failed to get current configuration");
    }

    const config = currentConfig.data.config;
    let defaultTemplates = config.default_templates || [];

    if (isDefault) {
      // Add to defaults if not already there
      if (!defaultTemplates.includes(templateId.toString())) {
        defaultTemplates.push(templateId.toString());
      }
    } else {
      // Remove from defaults
      defaultTemplates = defaultTemplates.filter(id => id !== templateId.toString());
    }

    const response = await updateSpecialtyConfigurationAPI(token, {
      specialty,
      default_templates: defaultTemplates
    });

    if (response) {
      toast.success(`Template ${isDefault ? 'set as' : 'removed from'} default`);
    }

    return response;
  } catch (error) {
    console.error("Set Template As Default API Error:", error);
    toast.error("Failed to update template default status");
    return null;
  }
};

// Update AI settings for specialty
export const updateAISettingsAPI = async (token, specialty, aiSettings) => {
  try {
    const response = await updateSpecialtyConfigurationAPI(token, {
      specialty,
      ai_settings: aiSettings
    });

    if (response) {
      toast.success("AI settings updated successfully");
    }

    return response;
  } catch (error) {
    console.error("Update AI Settings API Error:", error);
    toast.error("Failed to update AI settings");
    return null;
  }
};

// Get template suggestions based on patient context
export const getTemplateContextSuggestionsAPI = async (token, patientContext) => {
  try {
    const {
      specialty,
      visitType,
      chiefComplaint,
      patientAge,
      patientGender,
      patientHistory
    } = patientContext;

    // Get both auto-assigned templates and AI recommendations
    const [autoAssigned, aiRecommendations] = await Promise.all([
      getAutoAssignedTemplatesAPI(token, {
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        patient_context: JSON.stringify({ age: patientAge, gender: patientGender, history: patientHistory })
      }),
      getAITemplateRecommendationsAPI(token, {
        specialty,
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        patient_age: patientAge,
        patient_gender: patientGender,
        patient_history: patientHistory
      })
    ]);

    return {
      success: true,
      data: {
        auto_assigned: autoAssigned?.data || { templates: [] },
        ai_recommendations: aiRecommendations?.data || { recommendations: [] },
        context: patientContext
      }
    };
  } catch (error) {
    console.error("Get Template Context Suggestions API Error:", error);
    toast.error("Failed to get template suggestions");
    return null;
  }
};

// Utility functions for template management
export const templateUtils = {
  // Format template for display
  formatTemplate: (template) => {
    return {
      ...template,
      soap_structure: typeof template.soap_structure === 'string' 
        ? JSON.parse(template.soap_structure) 
        : template.soap_structure,
      billing_codes: typeof template.billing_codes === 'string'
        ? JSON.parse(template.billing_codes)
        : template.billing_codes,
      custom_fields: typeof template.custom_fields === 'string'
        ? JSON.parse(template.custom_fields)
        : template.custom_fields,
      tags: typeof template.tags === 'string'
        ? JSON.parse(template.tags)
        : template.tags
    };
  },

  // Get template priority score
  getTemplatePriority: (template, context) => {
    let score = 0;
    
    // Base score from rating and usage
    score += (template.avg_rating || 0) * 20;
    score += Math.min((template.usage_count || 0) * 2, 40);
    
    // Bonus for auto-assigned templates
    if (template.is_auto_assigned) score += 30;
    
    // Bonus for default templates
    if (template.is_default) score += 25;
    
    // Bonus for AI-enhanced templates
    if (template.ai_enhanced) score += 15;
    
    // Context matching bonus
    if (context?.visitType && template.visit_type === context.visitType) {
      score += 20;
    }
    
    // Chief complaint matching (simple keyword matching)
    if (context?.chiefComplaint && template.tags) {
      const complaint = context.chiefComplaint.toLowerCase();
      const matchingTags = template.tags.filter(tag => 
        complaint.includes(tag.toLowerCase()) || tag.toLowerCase().includes(complaint)
      );
      score += matchingTags.length * 10;
    }
    
    return Math.min(score, 100); // Cap at 100
  },

  // Sort templates by relevance
  sortTemplatesByRelevance: (templates, context) => {
    return templates
      .map(template => ({
        ...template,
        priority_score: templateUtils.getTemplatePriority(template, context)
      }))
      .sort((a, b) => b.priority_score - a.priority_score);
  },

  // Get template category color
  getCategoryColor: (specialty) => {
    const colors = {
      'Primary Care': 'blue',
      'Cardiology': 'red',
      'Mental Health': 'purple',
      'Neurology': 'green',
      'Urgent Care': 'orange',
      'Dermatology': 'pink',
      'General': 'gray'
    };
    return colors[specialty] || 'gray';
  },

  // Validate template data
  validateTemplate: (templateData) => {
    const errors = [];
    
    if (!templateData.template_name?.trim()) {
      errors.push('Template name is required');
    }
    
    if (!templateData.specialty?.trim()) {
      errors.push('Specialty is required');
    }
    
    if (!templateData.visit_type?.trim()) {
      errors.push('Visit type is required');
    }
    
    if (!templateData.soap_structure || typeof templateData.soap_structure !== 'object') {
      errors.push('SOAP structure is required');
    } else {
      const requiredSoapFields = ['subjective', 'objective', 'assessment', 'plan'];
      const missingSoapFields = requiredSoapFields.filter(
        field => !templateData.soap_structure[field]?.trim()
      );
      if (missingSoapFields.length > 0) {
        errors.push(`Missing SOAP fields: ${missingSoapFields.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Generate template preview
  generateTemplatePreview: (template) => {
    const soap = template.soap_structure || {};
    const billing = template.billing_codes || {};
    
    return {
      name: template.template_name,
      specialty: template.specialty,
      visitType: template.visit_type,
      sections: {
        subjective: soap.subjective?.substring(0, 100) + (soap.subjective?.length > 100 ? '...' : ''),
        objective: soap.objective?.substring(0, 100) + (soap.objective?.length > 100 ? '...' : ''),
        assessment: soap.assessment?.substring(0, 100) + (soap.assessment?.length > 100 ? '...' : ''),
        plan: soap.plan?.substring(0, 100) + (soap.plan?.length > 100 ? '...' : '')
      },
      billing: {
        primaryCPT: billing.primary_cpt,
        secondaryCPTs: billing.secondary_cpts?.slice(0, 3) || [],
        icd10Codes: billing.icd10_codes?.slice(0, 3) || []
      },
      metadata: {
        usageCount: template.usage_count || 0,
        avgRating: template.avg_rating || 0,
        isDefault: template.is_default || false,
        isAIEnhanced: template.ai_enhanced || false,
        lastUpdated: template.updated_at
      }
    };
  }
};

export default {
  getSpecialtyConfigurationAPI,
  updateSpecialtyConfigurationAPI,
  getAutoAssignedTemplatesAPI,
  createCustomTemplateAPI,
  getAITemplateRecommendationsAPI,
  getSpecialtyTemplateAnalyticsAPI,
  toggleAutoAssignmentAPI,
  setTemplateAsDefaultAPI,
  updateAISettingsAPI,
  getTemplateContextSuggestionsAPI,
  templateUtils
};