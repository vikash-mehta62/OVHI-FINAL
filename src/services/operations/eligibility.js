import { apiConnector } from "../apiConnector";
import { rcm } from "../apis";
import { toast } from "react-toastify";

const {
  RCM_ELIGIBILITY_CHECK_API,
  RCM_ELIGIBILITY_VERIFY_API,
  RCM_ELIGIBILITY_HISTORY_API,
  RCM_CLAIM_VALIDATE_API,
  RCM_CLAIM_SCRUB_API,
  RCM_CLAIM_ESTIMATE_API,
  RCM_BENEFITS_CHECK_API,
  RCM_PRIOR_AUTH_API,
  RCM_COPAY_ESTIMATE_API
} = rcm;

// =====================================================
// ELIGIBILITY VERIFICATION API FUNCTIONS
// =====================================================

/**
 * Check patient eligibility with insurance
 * @param {string} token - Authentication token
 * @param {Object} eligibilityData - Patient and insurance information
 * @returns {Object} Eligibility response
 */
export const checkEligibilityAPI = async (token, eligibilityData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_ELIGIBILITY_CHECK_API,
      eligibilityData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to check eligibility");
    }

    toast.success("Eligibility check completed successfully");
    return response.data;
  } catch (error) {
    console.error("Eligibility Check API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to check eligibility");
    return null;
  }
};

/**
 * Verify patient eligibility in real-time
 * @param {string} token - Authentication token
 * @param {Object} verificationData - Verification parameters
 * @returns {Object} Verification response
 */
export const verifyEligibilityAPI = async (token, verificationData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_ELIGIBILITY_VERIFY_API,
      verificationData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to verify eligibility");
    }

    return response.data;
  } catch (error) {
    console.error("Eligibility Verification API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to verify eligibility");
    return null;
  }
};

/**
 * Get eligibility check history for a patient
 * @param {string} token - Authentication token
 * @param {string} patientId - Patient ID
 * @param {Object} params - Query parameters
 * @returns {Object} Eligibility history
 */
export const getEligibilityHistoryAPI = async (token, patientId, params = {}) => {
  try {
    const queryParams = new URLSearchParams({
      patientId,
      ...params
    }).toString();

    const response = await apiConnector(
      "GET",
      `${RCM_ELIGIBILITY_HISTORY_API}?${queryParams}`,
      null,
      {
        Authorization: `Bearer ${token}`
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch eligibility history");
    }

    return response.data;
  } catch (error) {
    console.error("Eligibility History API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch eligibility history");
    return null;
  }
};

// =====================================================
// CLAIM VALIDATION API FUNCTIONS
// =====================================================

/**
 * Validate claim data before submission
 * @param {string} token - Authentication token
 * @param {Object} claimData - Claim information to validate
 * @returns {Object} Validation response
 */
export const validateClaimAPI = async (token, claimData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_CLAIM_VALIDATE_API,
      claimData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to validate claim");
    }

    if (response.data.data.isValid) {
      toast.success("Claim validation passed");
    } else {
      toast.warning("Claim validation found issues");
    }

    return response.data;
  } catch (error) {
    console.error("Claim Validation API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to validate claim");
    return null;
  }
};

/**
 * Scrub claim for errors and inconsistencies
 * @param {string} token - Authentication token
 * @param {Object} claimData - Claim data to scrub
 * @returns {Object} Scrub results
 */
export const scrubClaimAPI = async (token, claimData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_CLAIM_SCRUB_API,
      claimData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to scrub claim");
    }

    const { errors, warnings, suggestions } = response.data.data;
    
    if (errors?.length > 0) {
      toast.error(`Claim scrub found ${errors.length} error(s)`);
    } else if (warnings?.length > 0) {
      toast.warning(`Claim scrub found ${warnings.length} warning(s)`);
    } else {
      toast.success("Claim scrub completed - no issues found");
    }

    return response.data;
  } catch (error) {
    console.error("Claim Scrub API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to scrub claim");
    return null;
  }
};

/**
 * Get claim reimbursement estimate
 * @param {string} token - Authentication token
 * @param {Object} estimateData - Data for estimate calculation
 * @returns {Object} Estimate response
 */
export const getClaimEstimateAPI = async (token, estimateData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_CLAIM_ESTIMATE_API,
      estimateData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get claim estimate");
    }

    return response.data;
  } catch (error) {
    console.error("Claim Estimate API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to get claim estimate");
    return null;
  }
};

// =====================================================
// BENEFITS AND AUTHORIZATION API FUNCTIONS
// =====================================================

/**
 * Check patient benefits and coverage
 * @param {string} token - Authentication token
 * @param {Object} benefitsData - Benefits check parameters
 * @returns {Object} Benefits information
 */
export const checkBenefitsAPI = async (token, benefitsData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_BENEFITS_CHECK_API,
      benefitsData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to check benefits");
    }

    return response.data;
  } catch (error) {
    console.error("Benefits Check API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to check benefits");
    return null;
  }
};

/**
 * Submit prior authorization request
 * @param {string} token - Authentication token
 * @param {Object} authData - Prior authorization data
 * @returns {Object} Authorization response
 */
export const submitPriorAuthAPI = async (token, authData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_PRIOR_AUTH_API,
      authData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to submit prior authorization");
    }

    toast.success("Prior authorization submitted successfully");
    return response.data;
  } catch (error) {
    console.error("Prior Authorization API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to submit prior authorization");
    return null;
  }
};

/**
 * Get copay estimate for patient
 * @param {string} token - Authentication token
 * @param {Object} copayData - Copay calculation parameters
 * @returns {Object} Copay estimate
 */
export const getCopayEstimateAPI = async (token, copayData) => {
  try {
    const response = await apiConnector(
      "POST",
      RCM_COPAY_ESTIMATE_API,
      copayData,
      {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to get copay estimate");
    }

    return response.data;
  } catch (error) {
    console.error("Copay Estimate API Error:", error);
    toast.error(error?.response?.data?.message || "Failed to get copay estimate");
    return null;
  }
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format eligibility status for display
 * @param {string} status - Eligibility status
 * @returns {Object} Formatted status with color and text
 */
export const formatEligibilityStatus = (status) => {
  const statusMap = {
    'active': { text: 'Active', color: 'green', icon: '✅' },
    'inactive': { text: 'Inactive', color: 'red', icon: '❌' },
    'pending': { text: 'Pending', color: 'yellow', icon: '⏳' },
    'expired': { text: 'Expired', color: 'orange', icon: '⚠️' },
    'unknown': { text: 'Unknown', color: 'gray', icon: '❓' }
  };
  
  return statusMap[status?.toLowerCase()] || statusMap['unknown'];
};

/**
 * Format coverage percentage
 * @param {number} percentage - Coverage percentage
 * @returns {string} Formatted percentage
 */
export const formatCoverage = (percentage) => {
  if (!percentage && percentage !== 0) return 'N/A';
  return `${percentage}%`;
};

/**
 * Format deductible amount
 * @param {number} amount - Deductible amount
 * @param {number} met - Amount already met
 * @returns {Object} Formatted deductible info
 */
export const formatDeductible = (amount, met = 0) => {
  const remaining = Math.max(0, amount - met);
  return {
    total: formatCurrency(amount),
    met: formatCurrency(met),
    remaining: formatCurrency(remaining),
    percentage: amount > 0 ? Math.round((met / amount) * 100) : 0
  };
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

/**
 * Get validation severity color
 * @param {string} severity - Validation severity (error, warning, info)
 * @returns {string} Color class
 */
export const getValidationColor = (severity) => {
  const colorMap = {
    'error': 'text-red-600',
    'warning': 'text-yellow-600',
    'info': 'text-blue-600',
    'success': 'text-green-600'
  };
  
  return colorMap[severity?.toLowerCase()] || 'text-gray-600';
};

/**
 * Group validation results by type
 * @param {Array} validationResults - Array of validation results
 * @returns {Object} Grouped results
 */
export const groupValidationResults = (validationResults = []) => {
  return validationResults.reduce((groups, result) => {
    const type = result.type || 'general';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(result);
    return groups;
  }, {});
};

/**
 * Calculate claim confidence score
 * @param {Object} validationResults - Validation results
 * @returns {Object} Confidence score and level
 */
export const calculateClaimConfidence = (validationResults) => {
  const { errors = [], warnings = [] } = validationResults;
  
  let score = 100;
  score -= errors.length * 20; // Each error reduces score by 20
  score -= warnings.length * 5; // Each warning reduces score by 5
  score = Math.max(0, score);
  
  let level = 'high';
  if (score < 60) level = 'low';
  else if (score < 80) level = 'medium';
  
  return {
    score,
    level,
    color: level === 'high' ? 'green' : level === 'medium' ? 'yellow' : 'red'
  };
};

/**
 * Export eligibility data to CSV
 * @param {Array} eligibilityData - Eligibility data array
 * @param {string} filename - Export filename
 */
export const exportEligibilityToCSV = (eligibilityData, filename = 'eligibility_report') => {
  if (!eligibilityData || eligibilityData.length === 0) {
    toast.warning('No eligibility data to export');
    return;
  }
  
  const headers = [
    'Patient Name',
    'Member ID',
    'Insurance',
    'Status',
    'Effective Date',
    'Coverage %',
    'Deductible',
    'Copay',
    'Check Date'
  ];
  
  const csvContent = [
    headers.join(','),
    ...eligibilityData.map(item => [
      item.patientName || '',
      item.memberId || '',
      item.insuranceName || '',
      item.status || '',
      item.effectiveDate || '',
      item.coveragePercentage || '',
      item.deductible || '',
      item.copay || '',
      item.checkDate || ''
    ].join(','))
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
  
  toast.success('Eligibility data exported successfully');
};

// =====================================================
// BATCH OPERATIONS
// =====================================================

/**
 * Batch eligibility check for multiple patients
 * @param {string} token - Authentication token
 * @param {Array} patientList - Array of patient data
 * @returns {Array} Batch results
 */
export const batchEligibilityCheckAPI = async (token, patientList) => {
  try {
    const batchPromises = patientList.map(patient => 
      checkEligibilityAPI(token, patient)
    );
    
    const results = await Promise.allSettled(batchPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failCount = results.length - successCount;
    
    toast.success(`Batch eligibility check completed: ${successCount} successful, ${failCount} failed`);
    
    return results.map((result, index) => ({
      patient: patientList[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  } catch (error) {
    console.error("Batch Eligibility Check Error:", error);
    toast.error("Failed to complete batch eligibility check");
    return [];
  }
};

/**
 * Batch claim validation
 * @param {string} token - Authentication token
 * @param {Array} claimList - Array of claim data
 * @returns {Array} Batch validation results
 */
export const batchClaimValidationAPI = async (token, claimList) => {
  try {
    const batchPromises = claimList.map(claim => 
      validateClaimAPI(token, claim)
    );
    
    const results = await Promise.allSettled(batchPromises);
    
    const validCount = results.filter(r => 
      r.status === 'fulfilled' && r.value?.data?.isValid
    ).length;
    const invalidCount = results.length - validCount;
    
    toast.success(`Batch claim validation completed: ${validCount} valid, ${invalidCount} invalid`);
    
    return results.map((result, index) => ({
      claim: claimList[index],
      status: result.status,
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null
    }));
  } catch (error) {
    console.error("Batch Claim Validation Error:", error);
    toast.error("Failed to complete batch claim validation");
    return [];
  }
};