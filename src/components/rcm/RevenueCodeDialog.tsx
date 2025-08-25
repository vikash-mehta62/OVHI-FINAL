/**
 * RevenueCodeDialog Component
 * Dialog for adding/editing revenue code lines in UB-04 forms
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';

interface RevenueCodeLine {
  id?: number;
  revenueCode: string;
  description: string;
  hcpcsCode?: string;
  serviceDate?: string;
  serviceUnits?: number;
  totalCharges: number;
  nonCoveredCharges?: number;
  lineNumber: number;
}

interface RevenueCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (line: RevenueCodeLine) => void;
  editingLine: RevenueCodeLine | null;
  validateRevenueCode: (code: string) => Promise<{ isValid: boolean; description?: string; category?: string }>;
}

// Common revenue codes for quick selection
const COMMON_REVENUE_CODES = [
  { code: '0110', description: 'Room and Board - Private' },
  { code: '0111', description: 'Room and Board - Private - Medical/General' },
  { code: '0120', description: 'Room and Board - Semi-Private' },
  { code: '0130', description: 'Room and Board - Ward' },
  { code: '0140', description: 'Room and Board - ICU' },
  { code: '0200', description: 'Intensive Care Unit' },
  { code: '0210', description: 'Coronary Care Unit' },
  { code: '0300', description: 'Laboratory' },
  { code: '0301', description: 'Laboratory - Chemistry' },
  { code: '0320', description: 'Radiology - Diagnostic' },
  { code: '0330', description: 'Radiology - Therapeutic' },
  { code: '0360', description: 'Operating Room Services' },
  { code: '0370', description: 'Anesthesia' },
  { code: '0380', description: 'Blood' },
  { code: '0450', description: 'Emergency Room' },
  { code: '0636', description: 'Drugs - General Classification' }
];

const RevenueCodeDialog: React.FC<RevenueCodeDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLine,
  validateRevenueCode
}) => {
  const [formData, setFormData] = useState<RevenueCodeLine>({
    revenueCode: '',
    description: '',
    hcpcsCode: '',
    serviceDate: '',
    serviceUnits: 1,
    totalCharges: 0,
    nonCoveredCharges: 0,
    lineNumber: 1
  });
  
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    description?: string;
    category?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or editing line changes
  useEffect(() => {
    if (isOpen) {
      if (editingLine) {
        setFormData(editingLine);
      } else {
        setFormData({
          revenueCode: '',
          description: '',
          hcpcsCode: '',
          serviceDate: '',
          serviceUnits: 1,
          totalCharges: 0,
          nonCoveredCharges: 0,
          lineNumber: 1
        });
      }
      setValidationResult(null);
      setErrors({});
    }
  }, [isOpen, editingLine]);

  /**
   * Handle revenue code validation
   */
  const handleRevenueCodeValidation = async (code: string) => {
    if (!code || code.length !== 4) {
      setValidationResult(null);
      return;
    }

    try {
      setIsValidating(true);
      const result = await validateRevenueCode(code);
      setValidationResult(result);
      
      if (result.isValid && result.description) {
        setFormData(prev => ({
          ...prev,
          description: result.description || prev.description
        }));
      }
    } catch (error) {
      console.error('Error validating revenue code:', error);
      setValidationResult({ isValid: false });
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof RevenueCodeLine, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Validate revenue code when it changes
    if (field === 'revenueCode') {
      handleRevenueCodeValidation(value);
    }
  };

  /**
   * Select a common revenue code
   */
  const selectCommonCode = (code: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      revenueCode: code,
      description
    }));
    setValidationResult({ isValid: true, description });
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.revenueCode) {
      newErrors.revenueCode = 'Revenue code is required';
    } else if (!/^\d{4}$/.test(formData.revenueCode)) {
      newErrors.revenueCode = 'Revenue code must be 4 digits';
    } else if (validationResult && !validationResult.isValid) {
      newErrors.revenueCode = 'Invalid revenue code';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    if (!formData.totalCharges || formData.totalCharges <= 0) {
      newErrors.totalCharges = 'Total charges must be greater than 0';
    }

    if (formData.serviceUnits && formData.serviceUnits <= 0) {
      newErrors.serviceUnits = 'Service units must be greater than 0';
    }

    if (formData.nonCoveredCharges && formData.nonCoveredCharges > formData.totalCharges) {
      newErrors.nonCoveredCharges = 'Non-covered charges cannot exceed total charges';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('Please correct the errors before saving');
      return;
    }

    onSave(formData);
  };

  /**
   * Format date for input
   */
  const formatDateForInput = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {editingLine ? 'Edit Revenue Code Line' : 'Add Revenue Code Line'}
          </DialogTitle>
          <DialogDescription>
            Enter revenue code information for institutional services
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Common Revenue Codes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Select Common Codes</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {COMMON_REVENUE_CODES.slice(0, 6).map((item) => (
                <Button
                  key={item.code}
                  variant="outline"
                  size="sm"
                  onClick={() => selectCommonCode(item.code, item.description)}
                  className="justify-start text-left h-auto p-2"
                >
                  <div>
                    <div className="font-mono text-xs">{item.code}</div>
                    <div className="text-xs text-gray-600 truncate">{item.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Revenue Code Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="revenueCode">Revenue Code *</Label>
              <div className="flex gap-2">
                <Input
                  id="revenueCode"
                  value={formData.revenueCode}
                  onChange={(e) => handleFieldChange('revenueCode', e.target.value)}
                  placeholder="0110"
                  maxLength={4}
                  className={errors.revenueCode ? 'border-red-500' : ''}
                />
                {isValidating && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
              </div>
              {errors.revenueCode && (
                <p className="text-sm text-red-600 mt-1">{errors.revenueCode}</p>
              )}
              {validationResult && (
                <div className="mt-2">
                  {validationResult.isValid ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Valid revenue code</span>
                      {validationResult.category && (
                        <Badge variant="outline">{validationResult.category}</Badge>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Invalid revenue code</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Room and Board - Private"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Service Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="hcpcsCode">HCPCS Code</Label>
              <Input
                id="hcpcsCode"
                value={formData.hcpcsCode || ''}
                onChange={(e) => handleFieldChange('hcpcsCode', e.target.value)}
                placeholder="99213"
              />
            </div>

            <div>
              <Label htmlFor="serviceDate">Service Date</Label>
              <Input
                id="serviceDate"
                type="date"
                value={formatDateForInput(formData.serviceDate || '')}
                onChange={(e) => handleFieldChange('serviceDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="serviceUnits">Service Units</Label>
              <Input
                id="serviceUnits"
                type="number"
                min="1"
                value={formData.serviceUnits || ''}
                onChange={(e) => handleFieldChange('serviceUnits', parseInt(e.target.value) || 0)}
                placeholder="1"
                className={errors.serviceUnits ? 'border-red-500' : ''}
              />
              {errors.serviceUnits && (
                <p className="text-sm text-red-600 mt-1">{errors.serviceUnits}</p>
              )}
            </div>
          </div>

          {/* Charges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalCharges">Total Charges *</Label>
              <Input
                id="totalCharges"
                type="number"
                min="0"
                step="0.01"
                value={formData.totalCharges || ''}
                onChange={(e) => handleFieldChange('totalCharges', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.totalCharges ? 'border-red-500' : ''}
              />
              {errors.totalCharges && (
                <p className="text-sm text-red-600 mt-1">{errors.totalCharges}</p>
              )}
            </div>

            <div>
              <Label htmlFor="nonCoveredCharges">Non-Covered Charges</Label>
              <Input
                id="nonCoveredCharges"
                type="number"
                min="0"
                step="0.01"
                value={formData.nonCoveredCharges || ''}
                onChange={(e) => handleFieldChange('nonCoveredCharges', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.nonCoveredCharges ? 'border-red-500' : ''}
              />
              {errors.nonCoveredCharges && (
                <p className="text-sm text-red-600 mt-1">{errors.nonCoveredCharges}</p>
              )}
            </div>
          </div>

          {/* Validation Summary */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please correct the following errors:
                <ul className="list-disc list-inside mt-2">
                  {Object.values(errors).map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingLine ? 'Update' : 'Add'} Revenue Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevenueCodeDialog;