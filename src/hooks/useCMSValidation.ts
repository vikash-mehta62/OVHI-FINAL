import { useState, useEffect, useCallback } from 'react';
import { validateClaimDataAPI, validateNPIAPI, checkNCCIEditsAPI } from '@/services/operations/rcm';

interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  cms_reference?: string;
  suggested_fix?: string;
}

interface CMSValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'warning' | 'pending';
  errors: ValidationError[];
  warnings: ValidationError[];
  recommendations?: Array<{ message: string; priority: string }>;
  validationSummary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningChecks: number;
  };
  cmsCompliance: {
    npiValidation: boolean;
    taxonomyValidation: boolean;
    placeOfServiceValidation: boolean;
    codeValidation: boolean;
    dateValidation: boolean;
    timelyFilingValidation: boolean;
  };
  ncci_status: 'clean' | 'edit' | 'override';
  medical_necessity_verified: boolean;
  timely_filing_status: 'compliant' | 'due_soon' | 'overdue';
  timely_filing_date?: string;
}

interface NPIValidationResult {
  npi: string;
  isValid: boolean;
  errors: Array<{ message: string; code?: string }>;
  warnings?: Array<{ message: string; code?: string }>;
}

interface UseCMSValidationOptions {
  autoValidate?: boolean;
  debounceMs?: number;
  includeRecommendations?: boolean;
  validateMedicalNecessity?: boolean;
}

interface UseCMSValidationReturn {
  // Validation state
  validationResult: CMSValidationResult | null;
  npiValidation: NPIValidationResult | null;
  isValidating: boolean;
  lastValidation: Date | null;
  
  // Validation functions
  validateClaim: (claimData: any) => Promise<void>;
  validateNPI: (npi: string) => Promise<void>;
  checkNCCIEdits: (procedureCodes: string[]) => Promise<any>;
  clearValidation: () => void;
  
  // Utility functions
  hasMinimumRequiredFields: (claimData: any) => boolean;
  getValidationSummary: () => string;
  isCompliant: () => boolean;
}

export const useCMSValidation = (
  claimData?: any,
  options: UseCMSValidationOptions = {}
): UseCMSValidationReturn => {
  const {
    autoValidate = false,
    debounceMs = 1000,
    includeRecommendations = true,
    validateMedicalNecessity = true
  } = options;

  // State
  const [validationResult, setValidationResult] = useState<CMSValidationResult | null>(null);
  const [npiValidation, setNpiValidation] = useState<NPIValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  // Debounce utility
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }, []);

  // Check if minimum required fields are present
  const hasMinimumRequiredFields = useCallback((data: any): boolean => {
    return !!(data?.npi_number && data?.procedure_code && data?.diagnosis_code);
  }, []);

  // Validate claim against CMS guidelines
  const validateClaim = useCallback(async (data: any) => {
    if (!data || !hasMinimumRequiredFields(data)) {
      setValidationResult(null);
      return;
    }

    try {
      setIsValidating(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await validateClaimDataAPI(token, data, {
        skipWarnings: false,
        includeRecommendations,
        validateMedicalNecessity
      });

      if (response?.data) {
        setValidationResult(response.data);
        setLastValidation(new Date());
      }
    } catch (error) {
      console.error('CMS validation error:', error);
      const errorResult: CMSValidationResult = {
        isValid: false,
        status: 'invalid',
        errors: [{ 
          field: 'system', 
          code: 'SERVICE_ERROR', 
          message: 'Validation service unavailable', 
          severity: 'error' 
        }],
        warnings: [],
        validationSummary: {
          totalChecks: 1,
          passedChecks: 0,
          failedChecks: 1,
          warningChecks: 0
        },
        cmsCompliance: {
          npiValidation: false,
          taxonomyValidation: false,
          placeOfServiceValidation: false,
          codeValidation: false,
          dateValidation: false,
          timelyFilingValidation: false
        },
        ncci_status: 'clean',
        medical_necessity_verified: false,
        timely_filing_status: 'compliant'
      };
      setValidationResult(errorResult);
    } finally {
      setIsValidating(false);
    }
  }, [hasMinimumRequiredFields, includeRecommendations, validateMedicalNecessity]);

  // Validate NPI number
  const validateNPI = useCallback(async (npi: string) => {
    if (!npi || npi.length !== 10) {
      setNpiValidation(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await validateNPIAPI(token, npi);
      if (response?.data) {
        setNpiValidation(response.data);
      }
    } catch (error) {
      console.error('NPI validation error:', error);
      setNpiValidation({
        npi,
        isValid: false,
        errors: [{ message: 'NPI validation service unavailable' }]
      });
    }
  }, []);

  // Check NCCI edits
  const checkNCCIEdits = useCallback(async (procedureCodes: string[]) => {
    if (!procedureCodes || procedureCodes.length === 0) {
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await checkNCCIEditsAPI(token, procedureCodes);
      return response?.data || null;
    } catch (error) {
      console.error('NCCI edit check error:', error);
      return {
        procedureCodes,
        hasEdits: false,
        edits: [],
        warnings: [{ message: 'NCCI edit service unavailable' }]
      };
    }
  }, []);

  // Clear validation results
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setNpiValidation(null);
    setLastValidation(null);
  }, []);

  // Get validation summary text
  const getValidationSummary = useCallback((): string => {
    if (!validationResult) return 'No validation performed';
    
    const { validationSummary } = validationResult;
    return `${validationSummary.passedChecks}/${validationSummary.totalChecks} checks passed`;
  }, [validationResult]);

  // Check if claim is compliant
  const isCompliant = useCallback((): boolean => {
    return validationResult?.status === 'valid' || validationResult?.status === 'warning';
  }, [validationResult]);

  // Debounced validation for auto-validate
  const debouncedValidate = useCallback(
    debounce(validateClaim, debounceMs),
    [validateClaim, debounceMs]
  );

  // Auto-validate when claim data changes
  useEffect(() => {
    if (autoValidate && claimData && hasMinimumRequiredFields(claimData)) {
      debouncedValidate(claimData);
    }
  }, [claimData, autoValidate, debouncedValidate, hasMinimumRequiredFields]);

  // Auto-validate NPI when it changes
  useEffect(() => {
    if (claimData?.npi_number) {
      const timeoutId = setTimeout(() => {
        validateNPI(claimData.npi_number);
      }, 500); // Shorter debounce for NPI

      return () => clearTimeout(timeoutId);
    } else {
      setNpiValidation(null);
    }
  }, [claimData?.npi_number, validateNPI]);

  return {
    // State
    validationResult,
    npiValidation,
    isValidating,
    lastValidation,
    
    // Functions
    validateClaim,
    validateNPI,
    checkNCCIEdits,
    clearValidation,
    
    // Utilities
    hasMinimumRequiredFields,
    getValidationSummary,
    isCompliant
  };
};

export default useCMSValidation;