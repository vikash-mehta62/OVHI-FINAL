/**
 * RCM Frontend Validation Utilities
 * Validation functions for RCM forms and data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate patient information
 * @param patient - Patient data object
 * @returns Validation result
 */
export const validatePatientInfo = (patient: {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  ssn?: string;
  phone?: string;
  email?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!patient.firstName?.trim()) {
    errors.push('First name is required');
  }
  
  if (!patient.lastName?.trim()) {
    errors.push('Last name is required');
  }
  
  if (!patient.dateOfBirth) {
    errors.push('Date of birth is required');
  } else {
    const dob = new Date(patient.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    
    if (isNaN(dob.getTime())) {
      errors.push('Invalid date of birth');
    } else if (age < 0 || age > 150) {
      errors.push('Invalid date of birth - age must be between 0 and 150');
    }
  }

  // Optional field validations
  if (patient.ssn && !isValidSSN(patient.ssn)) {
    errors.push('Invalid Social Security Number format');
  }
  
  if (patient.phone && !isValidPhoneNumber(patient.phone)) {
    warnings.push('Phone number format may be invalid');
  }
  
  if (patient.email && !isValidEmail(patient.email)) {
    errors.push('Invalid email address format');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate claim information
 * @param claim - Claim data object
 * @returns Validation result
 */
export const validateClaimInfo = (claim: {
  patientId?: string;
  serviceDate?: string;
  cptCodes?: string[];
  diagnosisCodes?: string[];
  amount?: number;
  payerName?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!claim.patientId?.trim()) {
    errors.push('Patient ID is required');
  }
  
  if (!claim.serviceDate) {
    errors.push('Service date is required');
  } else {
    const serviceDate = new Date(claim.serviceDate);
    const today = new Date();
    
    if (isNaN(serviceDate.getTime())) {
      errors.push('Invalid service date');
    } else if (serviceDate > today) {
      errors.push('Service date cannot be in the future');
    }
  }
  
  if (!claim.cptCodes || claim.cptCodes.length === 0) {
    errors.push('At least one CPT code is required');
  } else {
    claim.cptCodes.forEach((code, index) => {
      if (!isValidCPTCode(code)) {
        errors.push(`Invalid CPT code at position ${index + 1}: ${code}`);
      }
    });
  }
  
  if (!claim.diagnosisCodes || claim.diagnosisCodes.length === 0) {
    errors.push('At least one diagnosis code is required');
  } else {
    claim.diagnosisCodes.forEach((code, index) => {
      if (!isValidDiagnosisCode(code)) {
        errors.push(`Invalid diagnosis code at position ${index + 1}: ${code}`);
      }
    });
  }
  
  if (!claim.amount || claim.amount <= 0) {
    errors.push('Claim amount must be greater than zero');
  } else if (claim.amount > 100000) {
    warnings.push('Claim amount is unusually high - please verify');
  }
  
  if (!claim.payerName?.trim()) {
    errors.push('Payer name is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate insurance information
 * @param insurance - Insurance data object
 * @returns Validation result
 */
export const validateInsuranceInfo = (insurance: {
  payerName?: string;
  policyNumber?: string;
  groupNumber?: string;
  subscriberId?: string;
  relationshipToSubscriber?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!insurance.payerName?.trim()) {
    errors.push('Insurance payer name is required');
  }
  
  if (!insurance.policyNumber?.trim()) {
    errors.push('Policy number is required');
  }
  
  if (!insurance.subscriberId?.trim()) {
    errors.push('Subscriber ID is required');
  }
  
  if (!insurance.relationshipToSubscriber?.trim()) {
    errors.push('Relationship to subscriber is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate payment information
 * @param payment - Payment data object
 * @returns Validation result
 */
export const validatePaymentInfo = (payment: {
  amount?: number;
  method?: string;
  claimId?: string;
  patientId?: string;
  paymentDate?: string;
}): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!payment.amount || payment.amount <= 0) {
    errors.push('Payment amount must be greater than zero');
  }
  
  if (!payment.method?.trim()) {
    errors.push('Payment method is required');
  }
  
  if (!payment.claimId?.trim() && !payment.patientId?.trim()) {
    errors.push('Either claim ID or patient ID is required');
  }
  
  if (payment.paymentDate) {
    const paymentDate = new Date(payment.paymentDate);
    const today = new Date();
    
    if (isNaN(paymentDate.getTime())) {
      errors.push('Invalid payment date');
    } else if (paymentDate > today) {
      errors.push('Payment date cannot be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate SSN format
 * @param ssn - Social Security Number
 * @returns True if valid format
 */
export const isValidSSN = (ssn: string): boolean => {
  const ssnRegex = /^\d{3}-?\d{2}-?\d{4}$/;
  return ssnRegex.test(ssn.replace(/\s/g, ''));
};

/**
 * Validate phone number format
 * @param phone - Phone number
 * @returns True if valid format
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
};

/**
 * Validate email format
 * @param email - Email address
 * @returns True if valid format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate CPT code format
 * @param code - CPT code
 * @returns True if valid format
 */
export const isValidCPTCode = (code: string): boolean => {
  // CPT codes are 5 digits
  const cptRegex = /^\d{5}$/;
  return cptRegex.test(code.trim());
};

/**
 * Validate diagnosis code format (ICD-10)
 * @param code - Diagnosis code
 * @returns True if valid format
 */
export const isValidDiagnosisCode = (code: string): boolean => {
  // ICD-10 codes: Letter followed by 2 digits, then optional decimal and up to 4 more characters
  const icd10Regex = /^[A-Z]\d{2}(\.\w{1,4})?$/;
  return icd10Regex.test(code.trim().toUpperCase());
};

/**
 * Validate NPI (National Provider Identifier)
 * @param npi - NPI number
 * @returns True if valid format
 */
export const isValidNPI = (npi: string): boolean => {
  const npiRegex = /^\d{10}$/;
  return npiRegex.test(npi.replace(/\s/g, ''));
};

/**
 * Validate tax ID format
 * @param taxId - Tax ID (EIN)
 * @returns True if valid format
 */
export const isValidTaxId = (taxId: string): boolean => {
  const taxIdRegex = /^\d{2}-?\d{7}$/;
  return taxIdRegex.test(taxId.replace(/\s/g, ''));
};

/**
 * Validate date range
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Validation result
 */
export const validateDateRange = (startDate: string, endDate: string): ValidationResult => {
  const errors: string[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }
  
  if (errors.length === 0 && start > end) {
    errors.push('Start date must be before end date');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate amount range
 * @param minAmount - Minimum amount
 * @param maxAmount - Maximum amount
 * @returns Validation result
 */
export const validateAmountRange = (minAmount: number, maxAmount: number): ValidationResult => {
  const errors: string[] = [];
  
  if (minAmount < 0) {
    errors.push('Minimum amount cannot be negative');
  }
  
  if (maxAmount < 0) {
    errors.push('Maximum amount cannot be negative');
  }
  
  if (minAmount > maxAmount) {
    errors.push('Minimum amount must be less than or equal to maximum amount');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize input string
 * @param input - Input string
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .substring(0, 255); // Limit length
};

/**
 * Validate and sanitize search query
 * @param query - Search query
 * @returns Sanitized query or null if invalid
 */
export const validateSearchQuery = (query: string): string | null => {
  if (!query || query.trim().length < 2) {
    return null;
  }
  
  const sanitized = sanitizeInput(query);
  
  // Check for minimum length after sanitization
  if (sanitized.length < 2) {
    return null;
  }
  
  return sanitized;
};