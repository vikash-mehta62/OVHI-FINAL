import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  User,
  Building,
  FileText,
  DollarSign,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Loader2,
  XCircle,
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/rcmFormatters';
import { validateClaimDataAPI, validateNPIAPI } from '@/services/operations/rcm';

// CMS Validation interface
interface CMSValidationResult {
  isValid: boolean;
  status: 'valid' | 'invalid' | 'warning' | 'pending';
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  ncci_status: 'clean' | 'edit' | 'override';
  medical_necessity_verified: boolean;
  timely_filing_status: 'compliant' | 'due_soon' | 'overdue';
  timely_filing_date?: string;
}

interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  cms_reference?: string;
  suggested_fix?: string;
}

// Enhanced validation schema with CMS fields
const claimFormSchema = z.object({
  patient_id: z.number().min(1, 'Patient is required'),
  patient_name: z.string().min(1, 'Patient name is required'),
  service_date: z.string().min(1, 'Service date is required'),
  procedure_code: z.string().min(1, 'Procedure code is required'),
  procedure_description: z.string().optional(),
  diagnosis_code: z.string().min(1, 'Diagnosis code is required'),
  diagnosis_description: z.string().optional(),
  total_amount: z.number().min(0.01, 'Amount must be greater than 0'),
  unit_price: z.number().min(0.01, 'Unit price must be greater than 0'),
  code_units: z.number().min(1, 'Units must be at least 1'),
  payer_name: z.string().optional(),
  policy_number: z.string().optional(),
  group_number: z.string().optional(),
  notes: z.string().optional(),
  status: z.number().min(0).max(4),
  // CMS Required Fields
  npi_number: z.string().min(10, 'NPI number must be 10 digits').max(10, 'NPI number must be 10 digits'),
  taxonomy_code: z.string().min(10, 'Taxonomy code must be 10 characters').max(10, 'Taxonomy code must be 10 characters'),
  place_of_service: z.string().min(2, 'Place of service must be 2 digits').max(2, 'Place of service must be 2 digits'),
  type_of_bill: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
});

type ClaimFormData = z.infer<typeof claimFormSchema>;

interface ClaimFormProps {
  claim?: any;
  onSubmit: (data: ClaimFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

// Common CPT codes for quick selection
const commonCPTCodes = [
  { code: '99213', description: 'Office Visit - Level 3' },
  { code: '99214', description: 'Office Visit - Level 4' },
  { code: '99215', description: 'Office Visit - Level 5' },
  { code: '99202', description: 'New Patient Visit - Level 2' },
  { code: '99203', description: 'New Patient Visit - Level 3' },
  { code: '99204', description: 'New Patient Visit - Level 4' },
  { code: '90834', description: 'Psychotherapy - 45 minutes' },
  { code: '90837', description: 'Psychotherapy - 60 minutes' },
  { code: '96116', description: 'Neurobehavioral Status Exam' },
  { code: '80053', description: 'Comprehensive Metabolic Panel' },
];

// Common ICD-10 codes
const commonICD10Codes = [
  { code: 'Z00.00', description: 'Encounter for general adult medical examination' },
  { code: 'I10', description: 'Essential hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified' },
  { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified' },
  { code: 'K21.9', description: 'Gastro-esophageal reflux disease without esophagitis' },
  { code: 'M25.50', description: 'Pain in unspecified joint' },
];

// Place of Service codes
const placeOfServiceCodes = [
  { code: '01', description: 'Pharmacy' },
  { code: '02', description: 'Telehealth Provided Other than in Patient\'s Home' },
  { code: '03', description: 'School' },
  { code: '04', description: 'Homeless Shelter' },
  { code: '05', description: 'Indian Health Service Free-standing Facility' },
  { code: '06', description: 'Indian Health Service Provider-based Facility' },
  { code: '07', description: 'Tribal 638 Free-standing Facility' },
  { code: '08', description: 'Tribal 638 Provider-based Facility' },
  { code: '09', description: 'Prison/Correctional Facility' },
  { code: '10', description: 'Telehealth Provided in Patient\'s Home' },
  { code: '11', description: 'Office' },
  { code: '12', description: 'Home' },
  { code: '13', description: 'Assisted Living Facility' },
  { code: '14', description: 'Group Home' },
  { code: '15', description: 'Mobile Unit' },
  { code: '16', description: 'Temporary Lodging' },
  { code: '17', description: 'Walk-in Retail Health Clinic' },
  { code: '18', description: 'Place of Employment-Worksite' },
  { code: '19', description: 'Off Campus-Outpatient Hospital' },
  { code: '20', description: 'Urgent Care Facility' },
  { code: '21', description: 'Inpatient Hospital' },
  { code: '22', description: 'On Campus-Outpatient Hospital' },
  { code: '23', description: 'Emergency Room – Hospital' },
  { code: '24', description: 'Ambulatory Surgical Center' },
  { code: '25', description: 'Birthing Center' },
  { code: '26', description: 'Military Treatment Facility' },
  { code: '31', description: 'Skilled Nursing Facility' },
  { code: '32', description: 'Nursing Facility' },
  { code: '33', description: 'Custodial Care Facility' },
  { code: '34', description: 'Hospice' },
  { code: '41', description: 'Ambulance – Land' },
  { code: '42', description: 'Ambulance – Air or Water' },
  { code: '49', description: 'Independent Clinic' },
  { code: '50', description: 'Federally Qualified Health Center' },
  { code: '51', description: 'Inpatient Psychiatric Facility' },
  { code: '52', description: 'Psychiatric Facility-Partial Hospitalization' },
  { code: '53', description: 'Community Mental Health Center' },
  { code: '54', description: 'Intermediate Care Facility/Individuals with Intellectual Disabilities' },
  { code: '55', description: 'Residential Substance Abuse Treatment Facility' },
  { code: '56', description: 'Psychiatric Residential Treatment Center' },
  { code: '57', description: 'Non-residential Substance Abuse Treatment Facility' },
  { code: '58', description: 'Non-residential Opioid Treatment Facility' },
  { code: '60', description: 'Mass Immunization Center' },
  { code: '61', description: 'Comprehensive Inpatient Rehabilitation Facility' },
  { code: '62', description: 'Comprehensive Outpatient Rehabilitation Facility' },
  { code: '65', description: 'End-Stage Renal Disease Treatment Facility' },
  { code: '71', description: 'Public Health Clinic' },
  { code: '72', description: 'Rural Health Clinic' },
  { code: '81', description: 'Independent Laboratory' },
  { code: '99', description: 'Other Place of Service' }
];

// Common modifiers
const commonModifiers = [
  { code: '25', description: 'Significant, Separately Identifiable Evaluation and Management Service' },
  { code: '26', description: 'Professional Component' },
  { code: '50', description: 'Bilateral Procedure' },
  { code: '51', description: 'Multiple Procedures' },
  { code: '52', description: 'Reduced Services' },
  { code: '53', description: 'Discontinued Procedure' },
  { code: '54', description: 'Surgical Care Only' },
  { code: '55', description: 'Postoperative Management Only' },
  { code: '56', description: 'Preoperative Management Only' },
  { code: '57', description: 'Decision for Surgery' },
  { code: '58', description: 'Staged or Related Procedure' },
  { code: '59', description: 'Distinct Procedural Service' },
  { code: '62', description: 'Two Surgeons' },
  { code: '76', description: 'Repeat Procedure by Same Physician' },
  { code: '77', description: 'Repeat Procedure by Another Physician' },
  { code: '78', description: 'Unplanned Return to OR' },
  { code: '79', description: 'Unrelated Procedure During Postop Period' },
  { code: '80', description: 'Assistant Surgeon' },
  { code: 'LT', description: 'Left Side' },
  { code: 'RT', description: 'Right Side' },
  { code: 'TC', description: 'Technical Component' }
];

const ClaimForm: React.FC<ClaimFormProps> = ({
  claim,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [cmsValidation, setCmsValidation] = useState<CMSValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);
  const [realTimeValidation, setRealTimeValidation] = useState(true);
  const [npiValidation, setNpiValidation] = useState<any>(null);

  const form = useForm<ClaimFormData>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      patient_id: claim?.patient_id || 0,
      patient_name: claim?.patient_name || '',
      service_date: claim?.service_date || new Date().toISOString().split('T')[0],
      procedure_code: claim?.procedure_code || '',
      procedure_description: claim?.procedure_description || '',
      diagnosis_code: claim?.diagnosis_code || '',
      diagnosis_description: claim?.diagnosis_description || '',
      total_amount: claim?.total_amount || 0,
      unit_price: claim?.unit_price || 0,
      code_units: claim?.code_units || 1,
      payer_name: claim?.payer_name || '',
      policy_number: claim?.policy_number || '',
      group_number: claim?.group_number || '',
      notes: claim?.notes || '',
      status: claim?.status || 0,
      // CMS Fields
      npi_number: claim?.npi_number || '',
      taxonomy_code: claim?.taxonomy_code || '',
      place_of_service: claim?.place_of_service || '',
      type_of_bill: claim?.type_of_bill || '',
      modifiers: claim?.modifiers || [],
    },
  });

  const watchedValues = form.watch(['unit_price', 'code_units']);
  const watchedCMSFields = form.watch(['npi_number', 'taxonomy_code', 'place_of_service', 'procedure_code', 'diagnosis_code', 'service_date']);

  // Calculate total amount when unit price or units change
  useEffect(() => {
    const [unitPrice, units] = watchedValues;
    if (unitPrice && units) {
      const calculated = unitPrice * units;
      setCalculatedAmount(calculated);
      form.setValue('total_amount', calculated);
    }
  }, [watchedValues, form]);

  // Real-time CMS validation
  useEffect(() => {
    if (realTimeValidation && watchedCMSFields.some(field => field)) {
      const timeoutId = setTimeout(() => {
        performCMSValidation();
      }, 1000); // Debounce validation calls

      return () => clearTimeout(timeoutId);
    }
  }, [watchedCMSFields, realTimeValidation]);

  // Real-time NPI validation
  useEffect(() => {
    const npi = form.watch('npi_number');
    if (npi && npi.length === 10) {
      const timeoutId = setTimeout(() => {
        validateNPIRealTime(npi);
      }, 500); // Shorter debounce for NPI

      return () => clearTimeout(timeoutId);
    } else {
      setNpiValidation(null);
    }
  }, [form.watch('npi_number')]);

  // Perform CMS validation
  const performCMSValidation = async () => {
    try {
      setValidationLoading(true);
      const formData = form.getValues();
      
      // Only validate if we have minimum required fields
      if (!formData.npi_number || !formData.procedure_code || !formData.diagnosis_code) {
        setCmsValidation(null);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await validateClaimDataAPI(token, formData, {
        skipWarnings: false,
        includeRecommendations: true,
        validateMedicalNecessity: true
      });

      if (response?.data) {
        setCmsValidation(response.data);
      }
    } catch (error) {
      console.error('Error performing CMS validation:', error);
      setCmsValidation({
        isValid: false,
        status: 'invalid',
        errors: [{ message: 'Validation service unavailable', code: 'SERVICE_ERROR', field: 'system', severity: 'error' }],
        warnings: [],
        info: [],
        ncci_status: 'clean',
        medical_necessity_verified: false,
        timely_filing_status: 'compliant'
      });
    } finally {
      setValidationLoading(false);
    }
  };

  // Validate NPI number in real-time
  const validateNPIRealTime = async (npi: string) => {
    if (!npi || npi.length !== 10) {
      setNpiValidation(null);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

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
  };

  // Handle CPT code selection
  const handleCPTCodeSelect = (cptCode: string, description: string) => {
    form.setValue('procedure_code', cptCode);
    form.setValue('procedure_description', description);
    
    // Set common pricing for known codes
    const commonPricing: { [key: string]: number } = {
      '99213': 150,
      '99214': 200,
      '99215': 250,
      '99202': 120,
      '99203': 180,
      '99204': 220,
      '90834': 120,
      '90837': 160,
      '96116': 300,
      '80053': 85,
    };
    
    if (commonPricing[cptCode]) {
      form.setValue('unit_price', commonPricing[cptCode]);
    }
  };

  // Handle ICD-10 code selection
  const handleICD10CodeSelect = (icdCode: string, description: string) => {
    form.setValue('diagnosis_code', icdCode);
    form.setValue('diagnosis_description', description);
  };

  // Validate claim data
  const validateClaim = (data: ClaimFormData): string[] => {
    const errors: string[] = [];

    // Check service date is not in future
    const serviceDate = new Date(data.service_date);
    const today = new Date();
    if (serviceDate > today) {
      errors.push('Service date cannot be in the future');
    }

    // Check if service date is too old (more than 1 year)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (serviceDate < oneYearAgo) {
      errors.push('Service date is more than 1 year old - may be rejected by payer');
    }

    // Validate CPT code format
    if (!/^\d{5}$/.test(data.procedure_code)) {
      errors.push('CPT code must be 5 digits');
    }

    // Validate ICD-10 code format (basic validation)
    if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(data.diagnosis_code)) {
      errors.push('ICD-10 code format appears invalid');
    }

    // Check reasonable amount ranges
    if (data.total_amount > 10000) {
      errors.push('Amount seems unusually high - please verify');
    }

    if (data.code_units > 10) {
      errors.push('Units seem unusually high - please verify');
    }

    return errors;
  };

  const handleSubmit = async (data: ClaimFormData) => {
    // Validate the claim
    const errors = validateClaim(data);
    setValidationErrors(errors);

    // If there are validation errors, show them but still allow submission
    if (errors.length > 0) {
      toast({
        title: "Validation Warnings",
        description: `${errors.length} warnings found. Please review before submitting.`,
        variant: "default"
      });
    }

    try {
      await onSubmit(data);
      toast({
        title: "Success",
        description: claim ? "Claim updated successfully" : "Claim created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save claim. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">
            {claim ? 'Edit Claim' : 'Create New Claim'}
          </h2>
          <p className="text-muted-foreground">
            {claim ? `Editing claim #${claim.claim_id}` : 'Enter claim information below'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* CMS Validation Status */}
      {cmsValidation && (
        <div className="space-y-4">
          <Alert className={
            cmsValidation.status === 'valid' ? 'border-green-200 bg-green-50' :
            cmsValidation.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
            cmsValidation.status === 'invalid' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cmsValidation.status === 'valid' && <CheckCircle className="h-4 w-4 text-green-600" />}
                {cmsValidation.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                {cmsValidation.status === 'invalid' && <XCircle className="h-4 w-4 text-red-600" />}
                {validationLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                <span className="font-medium">
                  CMS Validation: {cmsValidation.status.charAt(0).toUpperCase() + cmsValidation.status.slice(1)}
                </span>
              </div>
              <Badge 
                variant={cmsValidation.status === 'valid' ? 'default' : 
                        cmsValidation.status === 'warning' ? 'secondary' : 'destructive'}
                className={cmsValidation.status === 'valid' ? 'bg-green-100 text-green-800' : 
                          cmsValidation.status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}
              >
                {cmsValidation.status.toUpperCase()}
              </Badge>
            </div>
            
            <AlertDescription className="mt-3">
              {/* Validation Summary */}
              {cmsValidation.validationSummary && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">{cmsValidation.validationSummary.totalChecks}</div>
                    <div className="text-sm text-blue-600">Total Checks</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">{cmsValidation.validationSummary.passedChecks}</div>
                    <div className="text-sm text-green-600">Passed</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded">
                    <div className="text-2xl font-bold text-yellow-600">{cmsValidation.validationSummary.warningChecks}</div>
                    <div className="text-sm text-yellow-600">Warnings</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-600">{cmsValidation.validationSummary.failedChecks}</div>
                    <div className="text-sm text-red-600">Errors</div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {cmsValidation.errors.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="font-medium text-red-700 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    CMS Validation Errors:
                  </div>
                  {cmsValidation.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-400">
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
              )}

              {/* Warnings */}
              {cmsValidation.warnings.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="font-medium text-yellow-700 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    CMS Validation Warnings:
                  </div>
                  {cmsValidation.warnings.map((warning, index) => (
                    <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded border-l-4 border-yellow-400">
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
              )}

              {/* Information */}
              {cmsValidation.info && cmsValidation.info.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="font-medium text-blue-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Information:
                  </div>
                  {cmsValidation.info.map((info, index) => (
                    <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded border-l-4 border-blue-400">
                      • {info.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {cmsValidation.recommendations && cmsValidation.recommendations.length > 0 && (
                <div className="space-y-2 mb-4">
                  <div className="font-medium text-blue-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Recommendations:
                  </div>
                  {cmsValidation.recommendations.map((rec, index) => (
                    <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                      • {rec.message}
                    </div>
                  ))}
                </div>
              )}

              {/* CMS Compliance Status */}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-600 border-t pt-3">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${cmsValidation.ncci_status === 'clean' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                  NCCI Status: {cmsValidation.ncci_status}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${cmsValidation.medical_necessity_verified ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                  Medical Necessity: {cmsValidation.medical_necessity_verified ? 'Verified' : 'Not Verified'}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${
                    cmsValidation.timely_filing_status === 'compliant' ? 'bg-green-500' : 
                    cmsValidation.timely_filing_status === 'due_soon' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
                  Timely Filing: {cmsValidation.timely_filing_status}
                </span>
                {cmsValidation.timely_filing_date && (
                  <span className="text-xs text-gray-500">
                    Due: {cmsValidation.timely_filing_date}
                  </span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Validation Warnings */}
      {validationErrors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-medium">Validation Warnings:</div>
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm">• {error}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Patient Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patient_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter patient ID"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="patient_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Patient Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="service_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* CPT Code Section */}
              <div className="space-y-2">
                <Label>Procedure Code (CPT)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="procedure_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter CPT code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="procedure_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Procedure description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Common CPT Codes */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Common CPT Codes:</Label>
                  <div className="flex flex-wrap gap-2">
                    {commonCPTCodes.map((cpt) => (
                      <Button
                        key={cpt.code}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCPTCodeSelect(cpt.code, cpt.description)}
                        className="text-xs"
                      >
                        {cpt.code} - {cpt.description}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ICD-10 Code Section */}
              <div className="space-y-2">
                <Label>Diagnosis Code (ICD-10)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="diagnosis_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Enter ICD-10 code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="diagnosis_description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="Diagnosis description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {/* Common ICD-10 Codes */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Common ICD-10 Codes:</Label>
                  <div className="flex flex-wrap gap-2">
                    {commonICD10Codes.map((icd) => (
                      <Button
                        key={icd.code}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleICD10CodeSelect(icd.code, icd.description)}
                        className="text-xs"
                      >
                        {icd.code} - {icd.description}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code_units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Units</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        {calculatedAmount > 0 && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                            <Badge variant="secondary" className="text-xs">
                              Calc: {formatCurrency(calculatedAmount)}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Calculated: {formatCurrency(calculatedAmount)}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* CMS Compliance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                CMS Compliance Information
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-sm">Real-time Validation:</label>
                  <input
                    type="checkbox"
                    checked={realTimeValidation}
                    onChange={(e) => setRealTimeValidation(e.target.checked)}
                    className="rounded"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={performCMSValidation}
                    disabled={validationLoading}
                  >
                    {validationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Validate
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="npi_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NPI Number *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="1234567890"
                            maxLength={10}
                            {...field}
                          />
                          {npiValidation && (
                            <div className="absolute right-2 top-2">
                              {npiValidation.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>10-digit National Provider Identifier</FormDescription>
                      {npiValidation && !npiValidation.isValid && (
                        <div className="text-sm text-red-600 mt-1">
                          {npiValidation.errors?.map((error: any, index: number) => (
                            <div key={index}>• {error.message}</div>
                          ))}
                        </div>
                      )}
                      {npiValidation && npiValidation.isValid && (
                        <div className="text-sm text-green-600 mt-1">
                          ✓ Valid NPI number
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxonomy_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxonomy Code *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="207Q00000X"
                          maxLength={10}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Provider taxonomy classification</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="place_of_service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place of Service *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select place of service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {placeOfServiceCodes.map((pos) => (
                            <SelectItem key={pos.code} value={pos.code}>
                              {pos.code} - {pos.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Modifiers */}
              <div>
                <Label>Modifiers (Optional)</Label>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Common Modifiers:</div>
                  <div className="flex flex-wrap gap-2">
                    {commonModifiers.slice(0, 10).map((modifier) => (
                      <Button
                        key={modifier.code}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentModifiers = form.getValues('modifiers') || [];
                          if (!currentModifiers.includes(modifier.code)) {
                            form.setValue('modifiers', [...currentModifiers, modifier.code]);
                          }
                        }}
                        className="text-xs"
                      >
                        {modifier.code} - {modifier.description}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(form.watch('modifiers') || []).map((modifier, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {modifier}
                        <button
                          type="button"
                          onClick={() => {
                            const currentModifiers = form.getValues('modifiers') || [];
                            form.setValue('modifiers', currentModifiers.filter(m => m !== modifier));
                          }}
                          className="ml-1 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Insurance Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="payer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Insurance company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="policy_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Policy number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="group_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Group number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Claim Status</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Draft</SelectItem>
                        <SelectItem value="1">Submitted</SelectItem>
                        <SelectItem value="2">Paid</SelectItem>
                        <SelectItem value="3">Denied</SelectItem>
                        <SelectItem value="4">Appealed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes or comments"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {claim ? 'Update Claim' : 'Create Claim'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ClaimForm;