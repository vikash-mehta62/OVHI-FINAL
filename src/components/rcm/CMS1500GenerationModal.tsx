/**
 * CMS1500GenerationModal Component
 * Modal dialog for CMS-1500 form generation with advanced options
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Eye,
  Printer,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface CMS1500GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  claimId: number;
  onSuccess?: (result: any) => void;
}

interface GenerationOptions {
  includeFormBackground: boolean;
  isDraft: boolean;
  format: 'pdf';
  action: 'download' | 'print' | 'email';
  emailRecipient?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const CMS1500GenerationModal: React.FC<CMS1500GenerationModalProps> = ({
  isOpen,
  onClose,
  claimId,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [options, setOptions] = useState<GenerationOptions>({
    includeFormBackground: true,
    isDraft: false,
    format: 'pdf',
    action: 'download'
  });
  const [step, setStep] = useState<'options' | 'generating' | 'complete'>('options');
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Load validation when modal opens
  useEffect(() => {
    if (isOpen && claimId) {
      loadValidation();
      setStep('options');
      setGenerationProgress(0);
      setGenerationResult(null);
    }
  }, [isOpen, claimId]);

  /**
   * Load form validation
   */
  const loadValidation = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/v1/rcm/claims/${claimId}/cms1500/validate`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to validate form');
      }

      const data = await response.json();
      setValidation(data.data.validation);
    } catch (error) {
      console.error('Error validating form:', error);
      toast.error('Failed to validate form data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Generate the form
   */
  const generateForm = async () => {
    try {
      setIsGenerating(true);
      setStep('generating');
      setGenerationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

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

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate form');
      }

      const blob = await response.blob();
      const result = {
        claimId,
        blob,
        size: blob.size,
        filename: `CMS1500-${claimId}.pdf`,
        options
      };

      setGenerationResult(result);
      setStep('complete');

      // Handle the action
      await handleGenerationAction(result);

      onSuccess?.(result);
      toast.success('CMS-1500 form generated successfully');
    } catch (error) {
      console.error('Error generating form:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate form');
      setStep('options');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle the selected action after generation
   */
  const handleGenerationAction = async (result: any) => {
    const { blob, filename } = result;

    switch (options.action) {
      case 'download':
        // Download the file
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        break;

      case 'print':
        // Open in new window for printing
        const printUrl = window.URL.createObjectURL(blob);
        const printWindow = window.open(printUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
        break;

      case 'email':
        // In a real implementation, you would send the PDF via email
        toast.info('Email functionality would be implemented here');
        break;
    }
  };

  /**
   * Close modal and reset state
   */
  const handleClose = () => {
    if (!isGenerating) {
      onClose();
      setStep('options');
      setGenerationProgress(0);
      setGenerationResult(null);
    }
  };

  /**
   * Render validation status
   */
  const renderValidationStatus = () => {
    if (!validation) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {validation.isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <span className="font-medium">
            {validation.isValid ? 'Form data is valid' : 'Form data has issues'}
          </span>
          <Badge variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.isValid ? 'Ready' : 'Needs attention'}
          </Badge>
        </div>

        {validation.errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Errors ({validation.errors.length}):</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validation.errors.slice(0, 3).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
                {validation.errors.length > 3 && (
                  <li>... and {validation.errors.length - 3} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {validation.warnings.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Warnings ({validation.warnings.length}):</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validation.warnings.slice(0, 2).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
                {validation.warnings.length > 2 && (
                  <li>... and {validation.warnings.length - 2} more</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  /**
   * Render generation options
   */
  const renderGenerationOptions = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Form Options</Label>
        <div className="space-y-3 mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeBackground"
              checked={options.includeFormBackground}
              onCheckedChange={(checked) =>
                setOptions(prev => ({ ...prev, includeFormBackground: !!checked }))
              }
            />
            <Label htmlFor="includeBackground" className="text-sm">
              Include form background and labels
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isDraft"
              checked={options.isDraft}
              onCheckedChange={(checked) =>
                setOptions(prev => ({ ...prev, isDraft: !!checked }))
              }
            />
            <Label htmlFor="isDraft" className="text-sm">
              Add "DRAFT" watermark
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-medium">Action After Generation</Label>
        <Select
          value={options.action}
          onValueChange={(value: 'download' | 'print' | 'email') =>
            setOptions(prev => ({ ...prev, action: value }))
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="download">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </div>
            </SelectItem>
            <SelectItem value="print">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print PDF
              </div>
            </SelectItem>
            <SelectItem value="email">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Email PDF
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  /**
   * Render generation progress
   */
  const renderGenerationProgress = () => (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Generating CMS-1500 Form</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please wait while we generate your form...
        </p>
        
        <div className="space-y-2">
          <Progress value={generationProgress} className="h-2" />
          <div className="text-sm text-gray-500">
            {generationProgress < 30 && 'Validating claim data...'}
            {generationProgress >= 30 && generationProgress < 60 && 'Formatting form fields...'}
            {generationProgress >= 60 && generationProgress < 90 && 'Generating PDF...'}
            {generationProgress >= 90 && 'Finalizing document...'}
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render completion status
   */
  const renderCompletion = () => (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
      </div>
      
      <div>
        <h3 className="font-medium mb-2">Form Generated Successfully</h3>
        <p className="text-sm text-gray-600">
          Your CMS-1500 form has been generated and processed according to your selected action.
        </p>
        
        {generationResult && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
            <div className="flex items-center justify-between">
              <span>File size:</span>
              <span>{(generationResult.size / 1024).toFixed(1)} KB</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Action:</span>
              <span className="capitalize">{options.action}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate CMS-1500 Form
          </DialogTitle>
          <DialogDescription>
            Claim ID: {claimId}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading form data...</span>
            </div>
          ) : (
            <>
              {step === 'options' && (
                <div className="space-y-6">
                  {renderValidationStatus()}
                  {validation?.isValid && (
                    <>
                      <Separator />
                      {renderGenerationOptions()}
                    </>
                  )}
                </div>
              )}
              
              {step === 'generating' && renderGenerationProgress()}
              {step === 'complete' && renderCompletion()}
            </>
          )}
        </div>

        <DialogFooter>
          {step === 'options' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={generateForm}
                disabled={!validation?.isValid || isGenerating}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Form
              </Button>
            </>
          )}
          
          {step === 'generating' && (
            <Button variant="outline" disabled>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </Button>
          )}
          
          {step === 'complete' && (
            <>
              <Button variant="outline" onClick={() => setStep('options')}>
                Generate Another
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CMS1500GenerationModal;