/**
 * CMS1500FormViewer Component
 * Comprehensive interface for viewing, generating, and managing CMS-1500 forms
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer,
  RefreshCw,
  Settings,
  History,
  FileCheck,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Copy,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface CMS1500FormViewerProps {
  claimId: number;
  onFormGenerated?: (formData: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface FormValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FormPreview {
  claimId: number;
  validation: FormValidation;
  formData: Record<string, any>;
  fieldCount: number;
  estimatedSize: string;
}

interface GenerationHistory {
  id: number;
  timestamp: string;
  user_name: string;
  success: boolean;
  options: Record<string, any>;
  error?: string;
}

interface BatchGenerationResult {
  claimId: number;
  success: boolean;
  error?: string;
  size?: number;
}

const CMS1500FormViewer: React.FC<CMS1500FormViewerProps> = ({
  claimId,
  onFormGenerated,
  onError,
  className
}) => {
  // State management
  const [activeTab, setActiveTab] = useState('preview');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formPreview, setFormPreview] = useState<FormPreview | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistory[]>([]);
  const [validationResult, setValidationResult] = useState<FormValidation | null>(null);
  const [generationOptions, setGenerationOptions] = useState({
    includeFormBackground: true,
    isDraft: false,
    format: 'pdf'
  });
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchClaimIds, setBatchClaimIds] = useState<string>('');
  const [batchResults, setBatchResults] = useState<BatchGenerationResult[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Load initial data
  useEffect(() => {
    if (claimId) {
      loadFormPreview();
      loadValidation();
      loadGenerationHistory();
    }
  }, [claimId]);

  /**
   * Load form preview data
   */
  const loadFormPreview = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/preview`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load form preview');
      }

      const data = await response.json();
      setFormPreview(data.data);
    } catch (error) {
      console.error('Error loading form preview:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to load form preview');
      toast.error('Failed to load form preview');
    } finally {
      setIsLoading(false);
    }
  }, [claimId, onError]);

  /**
   * Load validation results
   */
  const loadValidation = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/validate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate form data');
      }

      const data = await response.json();
      setValidationResult(data.data.validation);
    } catch (error) {
      console.error('Error validating form:', error);
      toast.error('Failed to validate form data');
    }
  }, [claimId]);

  /**
   * Load generation history
   */
  const loadGenerationHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load generation history');
      }

      const data = await response.json();
      setGenerationHistory(data.data.activities || []);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load generation history');
    }
  }, [claimId]);

  /**
   * Generate CMS-1500 form
   */
  const generateForm = async (options = generationOptions) => {
    try {
      setIsGenerating(true);
      
      const params = new URLSearchParams({
        includeFormBackground: options.includeFormBackground.toString(),
        isDraft: options.isDraft.toString(),
        format: options.format
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/generate?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate form');
      }

      // Handle PDF download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CMS1500-${claimId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('CMS-1500 form generated successfully');
      onFormGenerated?.({
        claimId,
        success: true,
        options,
        size: blob.size
      });

      // Refresh history
      await loadGenerationHistory();
    } catch (error) {
      console.error('Error generating form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate form';
      onError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Batch generate forms
   */
  const batchGenerateForms = async () => {
    try {
      setIsBatchGenerating(true);
      setBatchResults([]);
      
      const claimIds = batchClaimIds
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

      if (claimIds.length === 0) {
        toast.error('Please enter valid claim IDs');
        return;
      }

      if (claimIds.length > 50) {
        toast.error('Maximum 50 claims can be processed at once');
        return;
      }

      const response = await fetch('/api/v1/rcm/forms/cms1500/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimIds,
          options: generationOptions
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate batch forms');
      }

      const data = await response.json();
      setBatchResults(data.data.results);
      
      const { successful, failed } = data.data.summary;
      toast.success(`Batch generation completed: ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('Error in batch generation:', error);
      toast.error('Failed to generate batch forms');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  /**
   * Print form
   */
  const printForm = async () => {
    try {
      const params = new URLSearchParams({
        includeFormBackground: 'true',
        isDraft: 'false'
      });

      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/generate?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate form for printing');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing form:', error);
      toast.error('Failed to print form');
    }
  };

  /**
   * Copy claim ID to clipboard
   */
  const copyClaimId = () => {
    navigator.clipboard.writeText(claimId.toString());
    toast.success('Claim ID copied to clipboard');
  };

  /**
   * Refresh all data
   */
  const refreshData = async () => {
    await Promise.all([
      loadFormPreview(),
      loadValidation(),
      loadGenerationHistory()
    ]);
    toast.success('Data refreshed');
  };

  // Render validation status
  const renderValidationStatus = () => {
    if (!validationResult) return null;

    const { isValid, errors, warnings } = validationResult;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">
            {isValid ? 'Form data is valid' : 'Form data has issues'}
          </span>
          <Badge variant={isValid ? 'default' : 'destructive'}>
            {isValid ? 'Ready to generate' : 'Needs attention'}
          </Badge>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Errors ({errors.length}):</div>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Warnings ({warnings.length}):</div>
              <ul className="list-disc list-inside space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-sm">{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };
  // Render form preview
  const renderFormPreview = () => {
    if (!formPreview) return null;

    const { formData, fieldCount, estimatedSize } = formPreview;
    const formFields = Object.entries(formData);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="outline">{fieldCount} fields</Badge>
            <Badge variant="outline">{estimatedSize}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <ScrollArea className="h-96 border rounded-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formFields.map(([fieldName, value]) => (
              <div key={fieldName} className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-600">
                  {formatFieldLabel(fieldName)}
                </label>
                <div className="text-sm bg-gray-50 p-2 rounded border">
                  {value === 'X' ? (
                    <span className="font-bold text-blue-600">☑ Checked</span>
                  ) : (
                    <span className="font-mono">{value || '(empty)'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  // Render generation history
  const renderGenerationHistory = () => {
    if (generationHistory.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No generation history available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Options</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generationHistory.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </TableCell>
                <TableCell>{entry.user_name}</TableCell>
                <TableCell>
                  <Badge variant={entry.success ? 'default' : 'destructive'}>
                    {entry.success ? 'Success' : 'Failed'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {entry.options.isDraft && <Badge variant="outline" className="mr-1">Draft</Badge>}
                    {entry.options.includeFormBackground && <Badge variant="outline">Background</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.success ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateForm(entry.options)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-sm text-red-600">{entry.error}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  // Render batch generation dialog
  const renderBatchDialog = () => (
    <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch Generate CMS-1500 Forms</DialogTitle>
          <DialogDescription>
            Generate multiple CMS-1500 forms at once. Enter claim IDs separated by commas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Claim IDs (comma-separated, max 50)
            </label>
            <textarea
              className="w-full p-3 border rounded-md resize-none"
              rows={4}
              placeholder="123, 124, 125, 126..."
              value={batchClaimIds}
              onChange={(e) => setBatchClaimIds(e.target.value)}
              disabled={isBatchGenerating}
            />
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={batchGenerateForms}
              disabled={isBatchGenerating || !batchClaimIds.trim()}
            >
              {isBatchGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Forms
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowBatchDialog(false)}
              disabled={isBatchGenerating}
            >
              Cancel
            </Button>
          </div>

          {batchResults.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Generation Results</h4>
              <div className="max-h-60 overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchResults.map((result) => (
                      <TableRow key={result.claimId}>
                        <TableCell>{result.claimId}</TableCell>
                        <TableCell>
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {result.size ? `${(result.size / 1024).toFixed(1)} KB` : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-red-600">
                          {result.error || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Format field labels for display
  const formatFieldLabel = (fieldName: string): string => {
    const labelMap: Record<string, string> = {
      '1_medicare': 'Box 1 - Medicare',
      '1_medicaid': 'Box 1 - Medicaid',
      '1_tricare': 'Box 1 - Tricare',
      '1_champva': 'Box 1 - CHAMPVA',
      '1_group_health': 'Box 1 - Group Health Plan',
      '1_feca': 'Box 1 - FECA',
      '1_other': 'Box 1 - Other',
      '1a_insured_id': 'Box 1a - Insured ID Number',
      '2_patient_name': 'Box 2 - Patient Name',
      '3_birth_date': 'Box 3 - Patient Birth Date',
      '3_sex_male': 'Box 3 - Sex: Male',
      '3_sex_female': 'Box 3 - Sex: Female',
      '4_insured_name': 'Box 4 - Insured Name',
      '5_patient_address': 'Box 5 - Patient Address',
      '5_patient_city': 'Box 5 - Patient City',
      '5_patient_state': 'Box 5 - Patient State',
      '5_patient_zip': 'Box 5 - Patient ZIP',
      '6_self': 'Box 6 - Relationship: Self',
      '6_spouse': 'Box 6 - Relationship: Spouse',
      '6_child': 'Box 6 - Relationship: Child',
      '6_other': 'Box 6 - Relationship: Other',
      '11_insured_policy': 'Box 11 - Insured Policy/Group Number',
      '12_signature': 'Box 12 - Patient Signature',
      '12_date': 'Box 12 - Signature Date',
      '13_signature': 'Box 13 - Insured Signature',
      '25_federal_tax_id': 'Box 25 - Federal Tax ID',
      '26_patient_account_no': 'Box 26 - Patient Account Number',
      '27_accept_assignment_yes': 'Box 27 - Accept Assignment: Yes',
      '27_accept_assignment_no': 'Box 27 - Accept Assignment: No',
      '28_total_charge': 'Box 28 - Total Charge',
      '29_amount_paid': 'Box 29 - Amount Paid',
      '31_signature_date': 'Box 31 - Signature Date',
      '32_service_facility_name': 'Box 32 - Service Facility Name',
      '32a_service_facility_npi': 'Box 32a - Service Facility NPI',
      '33_billing_provider_name': 'Box 33 - Billing Provider Name',
      '33_billing_provider_address': 'Box 33 - Billing Provider Address',
      '33a_billing_provider_npi': 'Box 33a - Billing Provider NPI'
    };

    // Handle diagnosis codes
    if (fieldName.startsWith('21_diagnosis_')) {
      const letter = fieldName.split('_')[2];
      return `Box 21${letter} - Diagnosis Code`;
    }

    // Handle service lines
    if (fieldName.includes('_1') || fieldName.includes('_2') || fieldName.includes('_3') ||
        fieldName.includes('_4') || fieldName.includes('_5') || fieldName.includes('_6')) {
      const parts = fieldName.split('_');
      const lineNum = parts[parts.length - 1];
      const fieldType = parts.slice(0, -1).join('_');
      
      const serviceFieldMap: Record<string, string> = {
        '14_date_from': 'Service Date From',
        '14_date_to': 'Service Date To',
        '15_place_of_service': 'Place of Service',
        '16_emg': 'Emergency',
        '17_procedure_code': 'Procedure Code',
        '17_modifier1': 'Modifier 1',
        '17_modifier2': 'Modifier 2',
        '18_diagnosis_pointer': 'Diagnosis Pointer',
        '19_charges': 'Charges',
        '20_days_units': 'Days/Units',
        '21_epsdt': 'EPSDT'
      };
      
      const fieldLabel = serviceFieldMap[fieldType] || fieldType;
      return `Line ${lineNum} - ${fieldLabel}`;
    }

    return labelMap[fieldName] || fieldName.replace(/_/g, ' ').toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading form data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CMS-1500 Form Generator
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm text-gray-600">Claim ID: {claimId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyClaimId}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Options
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Generation Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setGenerationOptions(prev => ({
                      ...prev,
                      includeFormBackground: !prev.includeFormBackground
                    }))}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    {generationOptions.includeFormBackground ? '✓' : ''} Form Background
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setGenerationOptions(prev => ({
                      ...prev,
                      isDraft: !prev.isDraft
                    }))}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {generationOptions.isDraft ? '✓' : ''} Draft Watermark
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button
                variant="outline"
                size="sm"
                onClick={printForm}
                disabled={!validationResult?.isValid}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              <Button
                onClick={() => generateForm()}
                disabled={isGenerating || !validationResult?.isValid}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Generate PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="batch">Batch</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="mt-6">
              {renderFormPreview()}
            </TabsContent>
            
            <TabsContent value="validation" className="mt-6">
              {renderValidationStatus()}
            </TabsContent>
            
            <TabsContent value="history" className="mt-6">
              {renderGenerationHistory()}
            </TabsContent>
            
            <TabsContent value="batch" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Batch Generation</h3>
                    <p className="text-sm text-gray-600">
                      Generate CMS-1500 forms for multiple claims simultaneously
                    </p>
                  </div>
                  <Button onClick={() => setShowBatchDialog(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Start Batch Generation
                  </Button>
                </div>
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Batch generation allows you to create up to 50 CMS-1500 forms at once.
                    Each claim will be validated before generation.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {renderBatchDialog()}
    </div>
  );
};

export default CMS1500FormViewer;