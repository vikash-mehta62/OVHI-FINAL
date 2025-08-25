import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  RefreshCw,
  Shield
} from 'lucide-react';
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

interface CMSValidationServiceProps {
  claimData: any;
  onValidationChange?: (result: CMSValidationResult | null) => void;
  autoValidate?: boolean;
  showSummary?: boolean;
  showRecommendations?: boolean;
  className?: string;
}

const CMSValidationService: React.FC<CMSValidationServiceProps> = ({
  claimData,
  onValidationChange,
  autoValidate = true,
  showSummary = true,
  showRecommendations = true,
  className = ''
}) => {
  const [validationResult, setValidationResult] = useState<CMSValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  // Debounced validation function
  const debouncedValidate = useCallback(
    debounce(async (data: any) => {
      await performValidation(data);
    }, 1000),
    []
  );

  // Perform CMS validation
  const performValidation = async (data: any = claimData) => {
    if (!data || !hasMinimumRequiredFields(data)) {
      setValidationResult(null);
      onValidationChange?.(null);
      return;
    }

    try {
      setIsValidating(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await validateClaimDataAPI(token, data, {
        skipWarnings: false,
        includeRecommendations: showRecommendations,
        validateMedicalNecessity: true
      });

      if (response?.data) {
        const result = response.data;
        setValidationResult(result);
        setLastValidation(new Date());
        onValidationChange?.(result);
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
      onValidationChange?.(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  // Check if minimum required fields are present
  const hasMinimumRequiredFields = (data: any): boolean => {
    return !!(data?.npi_number && data?.procedure_code && data?.diagnosis_code);
  };

  // Auto-validate when claim data changes
  useEffect(() => {
    if (autoValidate && claimData) {
      debouncedValidate(claimData);
    }
  }, [claimData, autoValidate, debouncedValidate]);

  // Manual validation trigger
  const handleManualValidation = () => {
    performValidation();
  };

  // Get validation status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'invalid': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'invalid': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Shield className="h-5 w-5 text-blue-600" />;
    }
  };

  if (!validationResult && !isValidating) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              CMS Validation
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualValidation}
              disabled={!hasMinimumRequiredFields(claimData)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Validate
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            {hasMinimumRequiredFields(claimData) 
              ? 'Click Validate to check CMS compliance' 
              : 'Enter NPI, procedure code, and diagnosis code to validate'
            }
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isValidating ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : (
              getStatusIcon(validationResult?.status || 'pending')
            )}
            CMS Validation
            {validationResult && (
              <Badge 
                variant={validationResult.status === 'valid' ? 'default' : 
                        validationResult.status === 'warning' ? 'secondary' : 'destructive'}
                className={validationResult.status === 'valid' ? 'bg-green-100 text-green-800' : 
                          validationResult.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}
              >
                {validationResult.status.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastValidation && (
              <span className="text-xs text-muted-foreground">
                Last: {lastValidation.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualValidation}
              disabled={isValidating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
              Validate
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      {validationResult && (
        <CardContent className="space-y-4">
          {/* Validation Summary */}
          {showSummary && validationResult.validationSummary && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResult.validationSummary.totalChecks}
                </div>
                <div className="text-sm text-blue-600">Total Checks</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">
                  {validationResult.validationSummary.passedChecks}
                </div>
                <div className="text-sm text-green-600">Passed</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">
                  {validationResult.validationSummary.warningChecks}
                </div>
                <div className="text-sm text-yellow-600">Warnings</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">
                  {validationResult.validationSummary.failedChecks}
                </div>
                <div className="text-sm text-red-600">Errors</div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult.errors.length > 0 && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">CMS Validation Errors:</div>
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded border-l-4 border-red-400">
                      <strong>{error.code}:</strong> {error.message}
                      {error.cms_reference && (
                        <div className="text-xs text-red-500 mt-1">
                          Reference: {error.cms_reference}
                        </div>
                      )}
                      {error.suggested_fix && (
                        <div className="text-xs text-red-600 mt-1 font-medium">
                          Suggestion: {error.suggested_fix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Validation Warnings */}
          {validationResult.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">CMS Validation Warnings:</div>
                  {validationResult.warnings.map((warning, index) => (
                    <div key={index} className="text-sm bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
                      <strong>{warning.code}:</strong> {warning.message}
                      {warning.cms_reference && (
                        <div className="text-xs text-yellow-500 mt-1">
                          Reference: {warning.cms_reference}
                        </div>
                      )}
                      {warning.suggested_fix && (
                        <div className="text-xs text-yellow-600 mt-1 font-medium">
                          Suggestion: {warning.suggested_fix}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Recommendations */}
          {showRecommendations && validationResult.recommendations && validationResult.recommendations.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Recommendations:</div>
                  {validationResult.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm bg-blue-50 p-2 rounded">
                      • {rec.message}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* CMS Compliance Status */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">CMS Compliance Status:</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>NPI Validation:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.npiValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.npiValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.npiValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxonomy Code:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.taxonomyValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.taxonomyValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.taxonomyValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Place of Service:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.placeOfServiceValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.placeOfServiceValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.placeOfServiceValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Code Validation:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.codeValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.codeValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.codeValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Date Logic:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.dateValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.dateValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.dateValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Timely Filing:</span>
                  <span className={`flex items-center gap-1 ${validationResult.cmsCompliance.timelyFilingValidation ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.cmsCompliance.timelyFilingValidation ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {validationResult.cmsCompliance.timelyFilingValidation ? 'Valid' : 'Invalid'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Status Information */}
          <div className="flex items-center gap-4 text-xs text-gray-600 border-t pt-3">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${validationResult.ncci_status === 'clean' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              NCCI: {validationResult.ncci_status}
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${validationResult.medical_necessity_verified ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              Medical Necessity: {validationResult.medical_necessity_verified ? 'Verified' : 'Not Verified'}
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                validationResult.timely_filing_status === 'compliant' ? 'bg-green-500' : 
                validationResult.timely_filing_status === 'due_soon' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
              Timely Filing: {validationResult.timely_filing_status}
            </span>
            {validationResult.timely_filing_date && (
              <span className="text-xs text-gray-500">
                Due: {validationResult.timely_filing_date}
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Debounce utility function
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default CMSValidationService;