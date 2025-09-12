/**
 * DiagnosisCodeDialog Component
 * Dialog for adding/editing diagnosis codes with POA indicators in UB-04 forms
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  CheckCircle,
  AlertCircle,
  Stethoscope,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosisCode {
  id?: number;
  diagnosisCode: string;
  description: string;
  poaIndicator: string;
  diagnosisType: 'principal' | 'secondary';
  sequenceNumber: number;
}

interface DiagnosisCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (diagnosis: DiagnosisCode) => void;
  editingDiagnosis: DiagnosisCode | null;
}

// POA Indicator options
const POA_INDICATORS = [
  { value: 'Y', label: 'Y - Yes (Present on Admission)', description: 'Diagnosis was present at the time of admission' },
  { value: 'N', label: 'N - No (Not Present on Admission)', description: 'Diagnosis was not present at the time of admission' },
  { value: 'U', label: 'U - Unknown', description: 'Documentation insufficient to determine if present on admission' },
  { value: 'W', label: 'W - Clinically Undetermined', description: 'Provider unable to clinically determine if present on admission' },
  { value: '1', label: '1 - Unreported/Not Used', description: 'Exempt from POA reporting' }
];

// Common diagnosis codes for quick selection
const COMMON_DIAGNOSIS_CODES = [
  { code: 'I21.9', description: 'Acute myocardial infarction, unspecified' },
  { code: 'I50.9', description: 'Heart failure, unspecified' },
  { code: 'J44.1', description: 'Chronic obstructive pulmonary disease with acute exacerbation' },
  { code: 'N18.6', description: 'End stage renal disease' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'I10', description: 'Essential hypertension' },
  { code: 'Z51.11', description: 'Encounter for antineoplastic chemotherapy' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'R06.02', description: 'Shortness of breath' },
  { code: 'R50.9', description: 'Fever, unspecified' }
];

const DiagnosisCodeDialog: React.FC<DiagnosisCodeDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDiagnosis
}) => {
  const [formData, setFormData] = useState<DiagnosisCode>({
    diagnosisCode: '',
    description: '',
    poaIndicator: 'Y',
    diagnosisType: 'secondary',
    sequenceNumber: 1
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPoaInfo, setShowPoaInfo] = useState(false);

  // Initialize form data when dialog opens or editing diagnosis changes
  useEffect(() => {
    if (isOpen) {
      if (editingDiagnosis) {
        setFormData(editingDiagnosis);
      } else {
        setFormData({
          diagnosisCode: '',
          description: '',
          poaIndicator: 'Y',
          diagnosisType: 'secondary',
          sequenceNumber: 1
        });
      }
      setErrors({});
    }
  }, [isOpen, editingDiagnosis]);

  /**
   * Handle form field changes
   */
  const handleFieldChange = (field: keyof DiagnosisCode, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  /**
   * Select a common diagnosis code
   */
  const selectCommonCode = (code: string, description: string) => {
    setFormData(prev => ({
      ...prev,
      diagnosisCode: code,
      description
    }));
  };

  /**
   * Validate ICD-10-CM code format
   */
  const validateICD10Code = (code: string): boolean => {
    // Basic ICD-10-CM format validation
    // Real implementation would use a comprehensive ICD-10-CM validator
    const icd10Pattern = /^[A-Z]\\d{2}(\\.\\d{1,4})?$/;
    return icd10Pattern.test(code);
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.diagnosisCode) {
      newErrors.diagnosisCode = 'Diagnosis code is required';
    } else if (!validateICD10Code(formData.diagnosisCode)) {
      newErrors.diagnosisCode = 'Invalid ICD-10-CM code format';
    }

    if (!formData.description) {
      newErrors.description = 'Description is required';
    }

    if (!formData.poaIndicator) {
      newErrors.poaIndicator = 'POA indicator is required';
    }

    if (!formData.diagnosisType) {
      newErrors.diagnosisType = 'Diagnosis type is required';
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
   * Get POA indicator info
   */
  const getPoaIndicatorInfo = (indicator: string) => {
    return POA_INDICATORS.find(poa => poa.value === indicator);
  };

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className=\"max-w-2xl\">
//         <DialogHeader>
//           <DialogTitle className=\"flex items-center gap-2\">
//             <Stethoscope className=\"h-5 w-5\" />
//             {editingDiagnosis ? 'Edit Diagnosis Code' : 'Add Diagnosis Code'}
//           </DialogTitle>
//           <DialogDescription>
//             Enter ICD-10-CM diagnosis code with Present on Admission (POA) indicator
//           </DialogDescription>
//         </DialogHeader>

//         <div className=\"space-y-6\">
//           {/* Common Diagnosis Codes */}
//           <div>
//             <Label className=\"text-sm font-medium mb-2 block\">Quick Select Common Codes</Label>
//             <div className=\"grid grid-cols-1 md:grid-cols-2 gap-2\">
//               {COMMON_DIAGNOSIS_CODES.slice(0, 6).map((item) => (
//                 <Button
//                   key={item.code}
//                   variant=\"outline\"
//                   size=\"sm\"
//                   onClick={() => selectCommonCode(item.code, item.description)}
//                   className=\"justify-start text-left h-auto p-2\"
//                 >
//                   <div>
//                     <div className=\"font-mono text-xs\">{item.code}</div>
//                     <div className=\"text-xs text-gray-600 truncate\">{item.description}</div>
//                   </div>
//                 </Button>
//               ))}
//             </div>
//           </div>

//           <Separator />

//           {/* Diagnosis Code Input */}
//           <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
//             <div>
//               <Label htmlFor=\"diagnosisCode\">ICD-10-CM Code *</Label>
//               <Input
//                 id=\"diagnosisCode\"
//                 value={formData.diagnosisCode}
//                 onChange={(e) => handleFieldChange('diagnosisCode', e.target.value.toUpperCase())}
//                 placeholder=\"I21.9\"
//                 className={errors.diagnosisCode ? 'border-red-500' : ''}
//               />
//               {errors.diagnosisCode && (
//                 <p className=\"text-sm text-red-600 mt-1\">{errors.diagnosisCode}</p>
//               )}
//               {formData.diagnosisCode && validateICD10Code(formData.diagnosisCode) && (
//                 <div className=\"flex items-center gap-2 text-green-600 mt-1\">
//                   <CheckCircle className=\"h-3 w-3\" />
//                   <span className=\"text-xs\">Valid ICD-10-CM format</span>
//                 </div>
//               )}
//             </div>

//             <div>
//               <Label htmlFor=\"description\">Description *</Label>
//               <Input
//                 id=\"description\"
//                 value={formData.description}
//                 onChange={(e) => handleFieldChange('description', e.target.value)}
//                 placeholder=\"Acute myocardial infarction, unspecified\"
//                 className={errors.description ? 'border-red-500' : ''}
//               />
//               {errors.description && (
//                 <p className=\"text-sm text-red-600 mt-1\">{errors.description}</p>
//               )}
//             </div>
//           </div>

//           {/* Diagnosis Type */}
//           <div>
//             <Label className=\"text-sm font-medium mb-3 block\">Diagnosis Type *</Label>
//             <RadioGroup
//               value={formData.diagnosisType}
//               onValueChange={(value) => handleFieldChange('diagnosisType', value as 'principal' | 'secondary')}
//               className=\"flex gap-6\"
//             >
//               <div className=\"flex items-center space-x-2\">
//                 <RadioGroupItem value=\"principal\" id=\"principal\" />
//                 <Label htmlFor=\"principal\" className=\"flex items-center gap-2\">
//                   Principal Diagnosis
//                   <Badge variant=\"default\">Primary</Badge>
//                 </Label>
//               </div>
//               <div className=\"flex items-center space-x-2\">
//                 <RadioGroupItem value=\"secondary\" id=\"secondary\" />
//                 <Label htmlFor=\"secondary\" className=\"flex items-center gap-2\">
//                   Secondary Diagnosis
//                   <Badge variant=\"outline\">Additional</Badge>
//                 </Label>
//               </div>
//             </RadioGroup>
//             {errors.diagnosisType && (
//               <p className=\"text-sm text-red-600 mt-1\">{errors.diagnosisType}</p>
//             )}
//           </div>

//           {/* POA Indicator */}
//           <div>
//             <div className=\"flex items-center gap-2 mb-3\">
//               <Label className=\"text-sm font-medium\">Present on Admission (POA) Indicator *</Label>
//               <Button
//                 variant=\"ghost\"
//                 size=\"sm\"
//                 onClick={() => setShowPoaInfo(!showPoaInfo)}
//               >
//                 <Info className=\"h-4 w-4\" />
//               </Button>
//             </div>
            
//             <Select
//               value={formData.poaIndicator}
//               onValueChange={(value) => handleFieldChange('poaIndicator', value)}
//             >
//               <SelectTrigger className={errors.poaIndicator ? 'border-red-500' : ''}>
//                 <SelectValue placeholder=\"Select POA indicator\" />
//               </SelectTrigger>
//               <SelectContent>
//                 {POA_INDICATORS.map((poa) => (
//                   <SelectItem key={poa.value} value={poa.value}>
//                     <div>
//                       <div className=\"font-medium\">{poa.label}</div>
//                       <div className=\"text-xs text-gray-600\">{poa.description}</div>
//                     </div>
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
            
//             {errors.poaIndicator && (
//               <p className=\"text-sm text-red-600 mt-1\">{errors.poaIndicator}</p>
//             )}
            
//             {formData.poaIndicator && (
//               <div className=\"mt-2 p-2 bg-blue-50 rounded-md\">
//                 <div className=\"text-sm font-medium text-blue-900\">
//                   {getPoaIndicatorInfo(formData.poaIndicator)?.label}
//                 </div>
//                 <div className=\"text-xs text-blue-700\">
//                   {getPoaIndicatorInfo(formData.poaIndicator)?.description}
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* POA Information */}
//           {showPoaInfo && (
//             <Alert>
//               <Info className=\"h-4 w-4\" />
//               <AlertDescription>
//                 <div className=\"space-y-2\">
//                   <div className=\"font-medium\">Present on Admission (POA) Indicators:</div>
//                   <ul className=\"text-sm space-y-1\">
//                     <li><strong>Y:</strong> Diagnosis was present at the time of inpatient admission</li>
//                     <li><strong>N:</strong> Diagnosis was not present at the time of inpatient admission</li>
//                     <li><strong>U:</strong> Documentation is insufficient to determine if condition was present</li>
//                     <li><strong>W:</strong> Provider is unable to clinically determine if condition was present</li>
//                     <li><strong>1:</strong> Exempt from POA reporting (certain diagnosis codes)</li>
//                   </ul>
//                 </div>
//               </AlertDescription>
//             </Alert>
//           )}

//           {/* Validation Summary */}
//           {Object.keys(errors).length > 0 && (
//             <Alert variant=\"destructive\">
//               <AlertCircle className=\"h-4 w-4\" />
//               <AlertDescription>
//                 Please correct the following errors:
//                 <ul className=\"list-disc list-inside mt-2\">
//                   {Object.values(errors).map((error, index) => (
//                     <li key={index} className=\"text-sm\">{error}</li>
//                   ))}
//                 </ul>
//               </AlertDescription>
//             </Alert>
//           )}
//         </div>

//         <DialogFooter>
//           <Button variant=\"outline\" onClick={onClose}>
//             Cancel
//           </Button>
//           <Button onClick={handleSubmit}>
//             {editingDiagnosis ? 'Update' : 'Add'} Diagnosis
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default DiagnosisCodeDialog;"