const moment = require('moment');

/**
 * RCM Utility Functions
 * Consolidated utility functions for Revenue Cycle Management operations
 */

/**
 * Format currency amount with proper validation and error handling
 * @param {number|string} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @param {string} locale - Locale for formatting (default: en-US)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  try {
    // Handle null, undefined, or empty values
    if (amount === null || amount === undefined || amount === '') {
      return '$0.00';
    }

    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Validate numeric input
    if (isNaN(numericAmount)) {
      console.warn(`Invalid amount provided to formatCurrency: ${amount}`);
      return '$0.00';
    }

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '$0.00';
  }
};

/**
 * Format date with various format options and validation
 * @param {string|Date} dateInput - Date to format
 * @param {string} format - Format string (default: MM/DD/YYYY)
 * @returns {string} Formatted date string
 */
const formatDate = (dateInput, format = 'MM/DD/YYYY') => {
  try {
    if (!dateInput) {
      return 'N/A';
    }

    const date = moment(dateInput);
    
    if (!date.isValid()) {
      console.warn(`Invalid date provided to formatDate: ${dateInput}`);
      return 'Invalid Date';
    }

    return date.format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Calculate days between service date and current date for A/R aging
 * @param {string|Date} serviceDate - The service date
 * @param {string|Date} currentDate - Current date (optional, defaults to now)
 * @returns {number} Number of days
 */
const calculateDaysInAR = (serviceDate, currentDate = new Date()) => {
  try {
    if (!serviceDate) {
      return 0;
    }

    const service = moment(serviceDate);
    const current = moment(currentDate);
    
    if (!service.isValid() || !current.isValid()) {
      console.warn(`Invalid dates provided to calculateDaysInAR: ${serviceDate}, ${currentDate}`);
      return 0;
    }

    const days = current.diff(service, 'days');
    return Math.max(0, days); // Ensure non-negative result
  } catch (error) {
    console.error('Error calculating days in A/R:', error);
    return 0;
  }
};

/**
 * Validate claim data structure and required fields
 * @param {Object} claimData - Claim data to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
const validateClaimData = (claimData) => {
  const errors = [];
  
  try {
    // Required fields validation
    const requiredFields = ['patient_id', 'procedure_code', 'total_amount', 'service_date'];
    
    requiredFields.forEach(field => {
      if (!claimData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Data type validations
    if (claimData.patient_id && !Number.isInteger(Number(claimData.patient_id))) {
      errors.push('patient_id must be a valid integer');
    }

    if (claimData.total_amount && (isNaN(claimData.total_amount) || claimData.total_amount < 0)) {
      errors.push('total_amount must be a valid positive number');
    }

    if (claimData.procedure_code && !/^[0-9]{5}$/.test(claimData.procedure_code)) {
      errors.push('procedure_code must be a 5-digit numeric code');
    }

    if (claimData.service_date && !moment(claimData.service_date).isValid()) {
      errors.push('service_date must be a valid date');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  } catch (error) {
    console.error('Error validating claim data:', error);
    return {
      isValid: false,
      errors: ['Validation error occurred']
    };
  }
};

/**
 * Calculate collection rate percentage
 * @param {number} collectedAmount - Amount collected
 * @param {number} totalBilled - Total amount billed
 * @returns {number} Collection rate as percentage (0-100)
 */
const calculateCollectionRate = (collectedAmount, totalBilled) => {
  try {
    if (!totalBilled || totalBilled === 0) {
      return 0;
    }

    const collected = Number(collectedAmount) || 0;
    const billed = Number(totalBilled);
    
    if (billed <= 0) {
      return 0;
    }

    const rate = (collected / billed) * 100;
    return Math.round(rate * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating collection rate:', error);
    return 0;
  }
};

/**
 * Calculate denial rate percentage
 * @param {number} deniedClaims - Number of denied claims
 * @param {number} totalClaims - Total number of claims
 * @returns {number} Denial rate as percentage (0-100)
 */
const calculateDenialRate = (deniedClaims, totalClaims) => {
  try {
    if (!totalClaims || totalClaims === 0) {
      return 0;
    }

    const denied = Number(deniedClaims) || 0;
    const total = Number(totalClaims);
    
    if (total <= 0) {
      return 0;
    }

    const rate = (denied / total) * 100;
    return Math.round(rate * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error calculating denial rate:', error);
    return 0;
  }
};

/**
 * Get aging bucket for A/R based on days past due
 * @param {number} daysPastDue - Number of days past due
 * @returns {string} Aging bucket identifier
 */
const getAgingBucket = (daysPastDue) => {
  try {
    const days = Number(daysPastDue) || 0;
    
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    if (days <= 120) return '91-120';
    return '120+';
  } catch (error) {
    console.error('Error determining aging bucket:', error);
    return '0-30';
  }
};

/**
 * Get collectability score based on aging
 * @param {number} daysPastDue - Number of days past due
 * @returns {number} Collectability score (0-100)
 */
const getCollectabilityScore = (daysPastDue) => {
  try {
    const days = Number(daysPastDue) || 0;
    
    if (days <= 30) return 95;
    if (days <= 60) return 85;
    if (days <= 90) return 70;
    if (days <= 120) return 50;
    return 25;
  } catch (error) {
    console.error('Error calculating collectability score:', error);
    return 0;
  }
};

/**
 * Generate claim recommendations based on claim data
 * @param {Object} claim - Claim data
 * @returns {Array} Array of recommendation strings
 */
const getClaimRecommendations = (claim) => {
  const recommendations = [];
  
  try {
    if (!claim) {
      return recommendations;
    }

    const processingDays = calculateDaysInAR(claim.service_date);
    
    // Processing time recommendations
    if (processingDays > 30) {
      recommendations.push('Follow up with payer - claim is overdue');
    }
    
    if (processingDays > 60) {
      recommendations.push('Consider appeal or resubmission');
    }

    // Status-based recommendations
    if (claim.status === 3) { // Denied
      recommendations.push('Review denial reason and consider appeal');
      recommendations.push('Verify patient eligibility and benefits');
    }

    if (claim.status === 1 && processingDays > 14) { // Submitted but pending
      recommendations.push('Contact payer for status update');
    }

    // Amount-based recommendations
    if (claim.total_amount > 1000) {
      recommendations.push('High-value claim - prioritize follow-up');
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating claim recommendations:', error);
    return [];
  }
};

module.exports = {
  formatCurrency,
  formatDate,
  calculateDaysInAR,
  validateClaimData,
  calculateCollectionRate,
  calculateDenialRate,
  getAgingBucket,
  getCollectabilityScore,
  getClaimRecommendations
};