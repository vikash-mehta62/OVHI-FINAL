import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { FileText, User, Calendar, DollarSign, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { createClaimFromEncounterApi, submitClaimApi } from '@/services/operations/encounter';
import { ProviderSection } from './encounter/ProviderSection';
import { PatientInsuranceSection } from './encounter/PatientInsuranceSection';
import { Checkbox } from 'antd';

// Common medical codes for quick selection
export const OCCURRENCE_CODES = [
  { code: "01", description: "Accident/Medical coverage - Auto" },
  { code: "02", description: "No-fault insurance involved, including auto accident" },
  { code: "03", description: "Accident/Tort liability" },
  { code: "04", description: "Accident/Employment related" },
  { code: "05", description: "Other accident" },
  { code: "06", description: "Crime victim" },
  { code: "09", description: "Start of infertility treatment cycle" },
  { code: "10", description: "Last menstrual period" },
  { code: "11", description: "Onset of symptoms/illness" },
  { code: "12", description: "Date of onset for a chronic condition" },
  { code: "17", description: "Date outpatient occupational therapy began" },
  { code: "18", description: "Date outpatient speech pathology began" },
  { code: "19", description: "Date outpatient physical therapy began" },
  { code: "20", description: "Guarantee of payment began" },
  { code: "21", description: "First day of prior stay" },
  { code: "22", description: "Date active care ended" },
  { code: "23", description: "Beneficiary insurance terminated" },
  { code: "24", description: "Date insurance denied" },
  { code: "25", description: "Date benefits terminated by primary payer" },
  { code: "26", description: "Date SNF bed available" },
  { code: "27", description: "Date home health plan established" },
  { code: "28", description: "Spouse’s date of birth" },
  { code: "29", description: "Date outpatient cardiac rehab began" },
  { code: "30", description: "Date outpatient pulmonary rehab began" },
  { code: "31", description: "Date denoting last day covered by insurance" },
  { code: "32", description: "Date liability claim made" },
  { code: "33", description: "Date accident occurred" },
  { code: "34", description: "Date therapy began" },
  { code: "35", description: "Date patient became Medicaid eligible" },
  { code: "36", description: "Date blood deductible met" },
  { code: "37", description: "Date of inpatient hospital admission" },
  { code: "38", description: "Date of inpatient hospital discharge" },
  { code: "39", description: "Date outpatient dialysis began" },
  { code: "40", description: "Date outpatient dialysis ended" },
  { code: "41", description: "Date accident/employment related claim filed" },
  { code: "42", description: "Date accident/employment related claim denied" },
  { code: "43", description: "Scheduled date of surgery" },
  { code: "44", description: "Date treatment started" },
  { code: "45", description: "Date treatment stopped" },
  { code: "46", description: "Date preadmission testing began" },
  { code: "47", description: "Date outpatient diagnostic services began" },
  { code: "48", description: "Date outpatient diagnostic services ended" },
  { code: "49", description: "Date hospice election effective" },
  { code: "50", description: "Date hospice election terminated" },
  { code: "51", description: "Date of first test for pre-admission" },
  { code: "52", description: "Date of admission to skilled nursing facility" },
  { code: "53", description: "Date skilled nursing facility discharge" },
  { code: "54", description: "Date of first outpatient therapy service" },
  { code: "55", description: "Date of last outpatient therapy service" },
  { code: "56", description: "Date service interrupted" },
  { code: "57", description: "Date service resumed" },
  { code: "58", description: "Date treatment authorization received" },
  { code: "59", description: "Date patient admitted to hospice" },
  { code: "60", description: "Date patient discharged from hospice" },
];

const COMMON_ICD10_CODES = [
  { code: 'Z00.00', description: 'Encounter for general adult medical examination without abnormal findings' },
  { code: 'Z01.419', description: 'Encounter for gynecological examination (general) (routine) without abnormal findings' },
  { code: 'I10', description: 'Essential (primary) hypertension' },
  { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications' },
  { code: 'M79.3', description: 'Panniculitis, unspecified' },
  { code: 'R06.02', description: 'Shortness of breath' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'K59.00', description: 'Constipation, unspecified' }
];

const COMMON_CPT_CODES = [
  { code: '99213', description: 'Office visit, established patient, low complexity', fee: 150 },
  { code: '99214', description: 'Office visit, established patient, moderate complexity', fee: 200 },
  { code: '99215', description: 'Office visit, established patient, high complexity', fee: 250 },
  { code: '99203', description: 'Office visit, new patient, low complexity', fee: 180 },
  { code: '99204', description: 'Office visit, new patient, moderate complexity', fee: 230 },
  { code: '99205', description: 'Office visit, new patient, high complexity', fee: 280 },
  { code: '90834', description: 'Psychotherapy, 45 minutes', fee: 120 },
  { code: '93000', description: 'Electrocardiogram, routine ECG with at least 12 leads', fee: 75 }
];

const PLACE_OF_SERVICE_CODES = [
  { code: '11', description: 'Office' },
  { code: '12', description: 'Home' },
  { code: '21', description: 'Inpatient Hospital' },
  { code: '22', description: 'Outpatient Hospital' },
  { code: '23', description: 'Emergency Room - Hospital' },
  { code: '02', description: 'Telehealth' }
];
const RESUBMISSION_CODES = [
  { code: 0, description: "Select Resubmission Code" },
  { code: 1, description: "Original Claim" },
  { code: 7, description: "Replacement of Prior Claim" },
  { code: 8, description: "Void / Canceled Prior Claim" },
];
interface EncounterData {
  // Patient demographics
  patientId: string;
  patientName: string;
  dob: string; // YYYY-MM-DD
  sex: "M" | "F" | "U";
  address: string;

  // Insurance info
  insurance: {
    payerId: string;       // Electronic payer ID (e.g. 60054 for BCBS)
    subscriberId: string;  // Policy/Member ID
    groupNumber?: string;  // Group plan number
    relationship: "self" | "spouse" | "child" | "other";
  };

  // Provider / Billing org
  provider: {
  providerId: string;
  providerName: string;
  npi: string;             // Rendering provider NPI
  tin: string;             // Tax ID (billing org)
  billingOrg: string;      // Billing org name
  referringNpi?: string;
  supervisingNpi?: string;
  };

  // Encounter basics
  occurrenceInfo: string;
  occurrenceCode: string;
  occurrenceDate: string;
  dateOfService: string;   // From DOS
  serviceTo?: string;      // To DOS (for time-based codes like CCM)
  placeOfService: string;  // CMS POS code
  priorAuthNumber: string;
  findings: string;

  // Clinical notes
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;

  // Diagnosis
  icdCodes: Array<{
    code: string;
    description: string;
    primary?: boolean;
  }>;

  // Procedures
  cptCodes: Array<{
    code: string;
    description: string;
    fee: number;
    units?: number;
    modifiers?: string[];
    dxPointers?: string[]; 
    ndc?: string;
  }>;

  // Financials
  totalCharges: number;
  copayCollected?: number;

  // Optional programs
  rpm?: { minutes: number; daysOfReading: number };
  ccm?: { minutes: number; careTeamInvolved: string[] };

  // Signatures
  signatures: {
    providerOnFile: boolean;
    patientOnFile: boolean;
  };
}

interface ClaimData {
  claimId: string;
  status: 'draft' | 'validated' | 'submitted' | 'paid' | 'denied';
  validationScore: number;
  estimatedReimbursement: number;
  resubmissionCode: number;
  issues: Array<{ type: 'error' | 'warning'; message: string }>;
}

export default function EncounterToClaim() {
  const { token } = useSelector((state: any) => state.auth);
  const [currentStep, setCurrentStep] = useState(1);
  const [encounterData, setEncounterData] = useState<EncounterData>({
    // Patient
    patientId: "P12345",
    patientName: "John Doe",
    dob: "1980-04-15",
    sex: "M",
    address: "123 Main St, Springfield, IL 62704",
  
    // Insurance
    insurance: {
      payerId: "60054",
      subscriberId: "W123456789",
      groupNumber: "GRP7890",
      relationship: "self"
    },
  
    // Provider
    provider: {
      providerId: "DR5678",
      providerName: "Dr. Alice Smith",
      npi: "1234567890",
      tin: "12-3456789",
      billingOrg: "Springfield Family Practice LLC",
      referringNpi: "0987654321",
      supervisingNpi: ""
    },
  
    // Encounter basics
    occurrenceInfo:"Accident",
    dateOfService: "2025-08-28",
    serviceTo: "2025-08-28",
    placeOfService: "11",
    priorAuthNumber: "AUTH5678",
    occurrenceCode: "",
    occurrenceDate: "2025-08-28",
    findings: "Patient Has Suffered From Headache For The Past 2 Years.",

    // Clinical notes (required by your interface, so add placeholders if empty)
    chiefComplaint: "Follow-up for hypertension and diabetes",
    subjective: "Patient reports occasional headaches and fatigue.",
    objective: "BP 150/90, HR 82, BMI 29. Labs pending.",
    assessment: "Uncontrolled hypertension; stable type 2 diabetes.",
    plan: "Increase lisinopril dosage, follow-up in 1 month, continue metformin.",
  
    // ICD codes
    icdCodes: [
      { code: "I10", description: "Essential (primary) hypertension", primary: true },
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", primary: false }
    ],
  
    // CPT codes
    cptCodes: [
      {
        code: "99214",
        description: "Office/outpatient visit, established patient, 25 min",
        fee: 125,
        modifiers: ["25"],
        units: 1,
        dxPointers: ["A", "B"],
        ndc: "1234567890"
      },
      {
        code: "93000",
        description: "Electrocardiogram, routine, w/ interpretation & report",
        fee: 40,
        modifiers: ["59"],
        units: 1,
        dxPointers: ["A"]
      }
    ],
  
    // Financials
    totalCharges: 165,
    copayCollected: 20, // optional but realistic
  
    // Optional programs
    rpm: {
      minutes: 22,
      daysOfReading: 18
    },
    ccm: {
      minutes: 30,
      careTeamInvolved: ["Nurse A", "Care Coordinator B"]
    },
  
    // Signatures
    signatures: {
      providerOnFile: true,
      patientOnFile: true
    }
  });
  
  // const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [claimData, setClaimData] = useState<ClaimData>({
    claimId: 'CLM-1001',
    status: 'draft',
    validationScore: 85,
    estimatedReimbursement: 120,
    resubmissionCode: 0,
    issues: [
      { type: 'warning', message: 'Diagnosis code not marked as primary' },
    ]
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate total charges when CPT codes change
  useEffect(() => {
    const total = encounterData.cptCodes.reduce((sum, cpt) => sum + cpt.fee, 0);
    setEncounterData(prev => ({ ...prev, totalCharges: total }));
  }, [encounterData.cptCodes]);

  const addIcdCode = (icd: { code: string; description: string }) => {
    if (!encounterData.icdCodes.find(existing => existing.code === icd.code)) {
      setEncounterData(prev => ({
        ...prev,
        icdCodes: [...prev.icdCodes, { ...icd, primary: prev.icdCodes.length === 0 }]
      }));
    }
  };

  const addCptCode = (cpt: { code: string; description: string; fee: number }) => {
    if (!encounterData.cptCodes.find(existing => existing.code === cpt.code)) {
      setEncounterData(prev => ({
        ...prev,
        cptCodes: [...prev.cptCodes, { ...cpt, dxPointers: ['A', 'B'] }]
      }));
    }
  };

  const removeIcdCode = (code: string) => {
    setEncounterData(prev => ({
      ...prev,
      icdCodes: prev.icdCodes.filter(icd => icd.code !== code)
    }));
  };
  const togglePrimaryIcd = (code: string) => {
    setEncounterData(prev => ({
      ...prev,
      icdCodes: prev.icdCodes.map(icd => ({
        ...icd,
        primary: icd.code === code
      }))
    }));
  };
  
  const updateCpt = (code: string, updates: Partial<EncounterData["cptCodes"][0]>) => {
    setEncounterData(prev => ({
      ...prev,
      cptCodes: prev.cptCodes.map(cpt =>
        cpt.code === code ? { ...cpt, ...updates } : cpt
      ),
    }));
  };

  const removeCptCode = (code: string) => {
    setEncounterData(prev => ({
      ...prev,
      cptCodes: prev.cptCodes.filter(cpt => cpt.code !== code)
    }));
  };

  const validateAndCreateClaim = async () => {
    setIsProcessing(true);
    
    try {
      const response = await createClaimFromEncounterApi(encounterData, token);
      
      if (response && response.success) {
        setClaimData({
          claimId: response.data.claimId,
          status: response.data.status,
          validationScore: response.data.validationScore,
          resubmissionCode: response.data.resubmissionCode,
          estimatedReimbursement: response.data.estimatedReimbursement,
          issues: response.data.issues
        });
        setCurrentStep(4);
      }
    } catch (error) {
      console.error('Error creating claim:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const submitClaim = async () => {
    if (!claimData) return;
    
    setIsProcessing(true);
    
    try {
      const response = await submitClaimApi(claimData.claimId, token);
      
      if (response && response.success) {
        setClaimData(prev => prev ? { ...prev, status: 'submitted' } : null);
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {[
        { step: 1, title: 'Patient & Provider', icon: User },
        { step: 2, title: 'SOAP Documentation', icon: FileText },
        { step: 3, title: 'Medical Coding', icon: Calendar },
        { step: 4, title: 'Claim Review', icon: DollarSign }
      ].map(({ step, title, icon: Icon }) => (
        <div key={step} className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'border-gray-300 text-gray-400'
          }`}>
            {currentStep > step ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
          </div>
          <span className={`ml-2 text-sm font-medium ${
            currentStep >= step ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {title}
          </span>
          {step < 4 && <div className="w-16 h-0.5 bg-gray-300 mx-4" />}
        </div>
      ))}
    </div>
  );
  // Generic handler for updating nested encounterData fields
const handleFieldChange = (field: string, value: any) => {
  setEncounterData((prev) => {
    // Split field by dot notation, e.g. "insurance.subscriberId"
    const keys = field.split(".");
    const updated: any = { ...prev };
    let obj = updated;

    // Traverse until second-to-last key
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      obj[k] = { ...obj[k] }; // clone nested object
      obj = obj[k];
    }

    // Set the final value
    obj[keys[keys.length - 1]] = value;

    return updated;
  });
};

const saveClaimDraft = () => {
  // Implement draft saving logic here
  alert("Claim draft saved successfully!");
};
const updateIcdCode = (
  index: number,
  updatedIcd: { code: string; description: string; primary?: boolean }
) => {
  setEncounterData((prev) => {
    const icdCodes = [...prev.icdCodes];
    icdCodes[index] = updatedIcd;
    return { ...prev, icdCodes };
  });
};

const updateCptCode = (
  index: number,
  updatedCpt: { code: string; description: string; fee: number; modifiers?: string[]; units?: number; dxPointers?: string[]; ndc?: string }
) => {
  setEncounterData((prev) => {
    const cptCodes = [...prev.cptCodes];
    // Initialize dxPointers with ['A', 'B'] if not provided
    const newCpt = {
      ...updatedCpt,
      dxPointers: updatedCpt.dxPointers || ['A', 'B']
    };
    cptCodes[index] = newCpt;
    return { ...prev, cptCodes };
  });
};
const toggleDxPointerLetter = (cptCode: string, pointerIndex: string) => {
  setEncounterData(prev => ({
    ...prev,
    cptCodes: prev.cptCodes.map(cpt => {
      if (cpt.code === cptCode) {
        const dxPointers = cpt.dxPointers ?? [];
        const index = dxPointers.indexOf(pointerIndex);
        if (index > -1) {
          // Remove the pointer if it exists
          return { 
            ...cpt, 
            dxPointers: dxPointers.filter(i => i !== pointerIndex) 
          };
        } else {
          // Add the pointer if it doesn't exist
          return { 
            ...cpt, 
            dxPointers: [...dxPointers, pointerIndex] 
          };
        }
      }
      return cpt;
    }),
  }));
};

return (
  <div className="max-w-6xl mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-bold text-gray-900">Encounter to Claim Workflow</h1>
      <Badge variant="outline" className="text-sm">
        Step {currentStep} of 4
      </Badge>
    </div>

    {renderStepIndicator()}

    {/* Step 1: Patient & Provider Information */}
{currentStep === 1 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <User className="w-5 h-5" />
        Patient & Provider Information
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-8">
      {/* Patient + Insurance Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Patient & Insurance</h3>
        <PatientInsuranceSection 
          data={encounterData} 
          onChange={handleFieldChange} 
        />
      </section>

      {/* Provider Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Provider Information</h3>
        <ProviderSection 
          data={encounterData} 
          onChange={handleFieldChange} 
        />
      </section>
      
      {/* Prior Auth / Occurrence Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Prior Authorization / Occurrence</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prior Auth Number */}
          <div>
            <Label htmlFor="priorAuthNumber">Prior Authorization Number</Label>
            <Input
              id="priorAuthNumber"
              type="text"
              value={encounterData.priorAuthNumber || ""}
              onChange={(e) =>
                setEncounterData((prev) => ({
                  ...prev,
                  priorAuthNumber: e.target.value,
                }))
              }
              placeholder="Enter prior auth #"
            />
          </div>

          {/* Occurrence Code */}
          <div>
            <Label htmlFor="occurrenceCode">Occurrence Code</Label>
            <Select
              value={encounterData.occurrenceCode || ""}
              onValueChange={(value) =>
                setEncounterData((prev) => ({ ...prev, occurrenceCode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select occurrence code" />
              </SelectTrigger>
              <SelectContent>
                {OCCURRENCE_CODES.map((code) => (
                  <SelectItem key={code.code} value={code.code}>
                    {code.code} - {code.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Occurrence Date */}
          <div>
            <Label htmlFor="occurrenceDate">Occurrence Date</Label>
            <Input
              id="occurrenceDate"
              type="date"
              value={encounterData.occurrenceDate || ""}
              onChange={(e) =>
                setEncounterData((prev) => ({
                  ...prev,
                  occurrenceDate: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* Encounter Basics */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Encounter Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateOfService">Date of Service</Label>
            <Input
              id="dateOfService"
              type="date"
              value={encounterData.dateOfService}
              onChange={(e) =>
                setEncounterData((prev) => ({
                  ...prev,
                  dateOfService: e.target.value,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="placeOfService">Place of Service</Label>
            <Select
              value={encounterData.placeOfService}
              onValueChange={(value) =>
                setEncounterData((prev) => ({ ...prev, placeOfService: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select place of service" />
              </SelectTrigger>
              <SelectContent>
                {PLACE_OF_SERVICE_CODES.map((pos) => (
                  <SelectItem key={pos.code} value={pos.code}>
                    {pos.code} - {pos.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="chiefComplaint">Chief Complaint</Label>
          <Textarea
            id="chiefComplaint"
            value={encounterData.chiefComplaint}
            onChange={(e) =>
              setEncounterData((prev) => ({
                ...prev,
                chiefComplaint: e.target.value,
              }))
            }
            placeholder="E.g. Patient reports headache for 3 days..."
            rows={2}
          />
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={() => setCurrentStep(2)}
          disabled={
            !encounterData.patientId || 
            !encounterData.patientName || 
            !encounterData.provider?.providerId ||
            !encounterData.dateOfService ||
            !encounterData.placeOfService
          }
        >
          Next: SOAP Documentation
        </Button>
      </div>
    </CardContent>
  </Card>
)}


{/* Step 2: SOAP Documentation */}
{currentStep === 2 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Encounter Documentation
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Subjective */}
        <div>
          <Label htmlFor="subjective">Subjective</Label>
          <Textarea
            id="subjective"
            value={encounterData.subjective ?? ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, subjective: e.target.value }))
            }
            placeholder="Patient's description of symptoms, history of present illness..."
            rows={4}
          />
        </div>

        {/* Objective */}
        <div>
          <Label htmlFor="objective">Objective</Label>
          <Textarea
            id="objective"
            value={encounterData.objective ?? ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, objective: e.target.value }))
            }
            placeholder="Physical exam findings, vitals, test results..."
            rows={4}
          />
        </div>

        {/* Assessment */}
        <div>
          <Label htmlFor="assessment">Assessment</Label>
          <Textarea
            id="assessment"
            value={encounterData.assessment ?? ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, assessment: e.target.value }))
            }
            placeholder="Clinical impression, diagnosis..."
            rows={3}
          />
        </div>

        {/* Plan */}
        <div>
          <Label htmlFor="plan">Plan</Label>
          <Textarea
            id="plan"
            value={encounterData.plan ?? ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, plan: e.target.value }))
            }
            placeholder="Treatment plan, medications, follow-up instructions..."
            rows={3}
          />
        </div>

        {/* Findings */}
        <div className="col-span-2">
          <Label htmlFor="findings">Findings</Label>
          <Textarea
            id="findings"
            value={encounterData.findings ?? ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, findings: e.target.value }))
            }
            placeholder="Additional clinical findings, lab interpretations, imaging results..."
            rows={4}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Back
        </Button>
        <Button onClick={() => setCurrentStep(3)}>
          Next
        </Button>
      </div>
    </CardContent>
  </Card>
)}



      {/* Step 3: Medical Coding */}
      {currentStep === 3 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Medical Coding
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue="diagnosis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="diagnosis">Diagnosis Codes (ICD-10)</TabsTrigger>
          <TabsTrigger value="procedure">Procedure Codes (CPT)</TabsTrigger>
        </TabsList>

        {/* Diagnosis Codes */}
        <TabsContent value="diagnosis" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Common ICD-10 Codes</h4>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {COMMON_ICD10_CODES.map(icd => (
                <div key={icd.code} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-mono text-sm">{icd.code}</span>
                    <span className="ml-2 text-sm text-gray-600">{icd.description}</span>
                  </div>
                  <Button size="sm" onClick={() => addIcdCode(icd)} disabled={encounterData.icdCodes.length >= 12}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Selected Diagnosis Codes (A–L)</h4>
            {encounterData.icdCodes.length === 0 ? (
              <p className="text-gray-500 text-sm">No diagnosis codes selected</p>
            ) : (
              <div className="space-y-2">
                {encounterData.icdCodes.map((icd, idx) => (
                  <div key={icd.code} className="flex items-center gap-2 mb-2">
                    <Input
                      className="w-28"
                      value={icd.code}
                      onChange={(e) => updateIcdCode(idx, { ...icd, code: e.target.value })}
                    />
                    <Input
                      className="flex-1"
                      value={icd.description}
                      onChange={(e) =>
                        updateIcdCode(idx, { ...icd, description: e.target.value })
                      }
                    />
                    <Checkbox
                      checked={icd.primary}
                      onChange={(e) =>
                        updateIcdCode(idx, { ...icd, primary: Boolean(e.target.value) })
                      }
                    />
                    <span className="text-sm">Primary</span>
                    <Button size="sm" variant="outline" onClick={() => removeIcdCode(icd.code)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Procedure Codes */}
        <TabsContent value="procedure" className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Common CPT Codes</h4>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
              {COMMON_CPT_CODES.map(cpt => (
                <div key={cpt.code} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-mono text-sm">{cpt.code}</span>
                    <span className="ml-2 text-sm text-gray-600">{cpt.description}</span>
                    <span className="ml-2 text-sm font-medium text-green-600">${cpt.fee}</span>
                  </div>
                  <Button size="sm" onClick={() => addCptCode(cpt)}>Add</Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Selected Procedure Codes</h4>
            {encounterData.cptCodes.length === 0 ? (
              <p className="text-gray-500 text-sm">No procedure codes selected</p>
            ) : (
              <div className="space-y-4">
                {encounterData.cptCodes.map(cpt => (
                  <div key={cpt.code} className="p-3 bg-green-50 rounded space-y-3">
                    <div className="flex justify-between">
                      <div>
                        <span className="font-mono text-sm">{cpt.code}</span>
                        <span className="ml-2 text-sm">{cpt.description}</span>
                        <span className="ml-2 text-sm font-medium text-green-600">${cpt.fee}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removeCptCode(cpt.code)}>
                        Remove
                      </Button>
                    </div>

                    {/* Units */}
                    <div className="flex items-center gap-2">
                      <Label>Units:</Label>
                      <Input
                        type="number"
                        min={1}
                        value={cpt.units ?? 1}
                        onChange={(e) => updateCpt(cpt.code, { units: parseInt(e.target.value) })}
                        className="w-20"
                      />
                    </div>

                    {/* Modifiers */}
                    <div className="flex items-center gap-2">
                      <Label>Modifiers:</Label>
                      <Input
                        type="text"
                        placeholder="e.g., 25, 59"
                        value={cpt.modifiers?.join(", ") ?? ""}
                        onChange={(e) =>
                          updateCpt(cpt.code, { modifiers: e.target.value.split(",").map(m => m.trim()) })
                        }
                        className="w-48"
                      />
                    </div>

                    {/* DX Pointers (CMS-1500 Box 24E Letters A–L) */}
                    <div>
                      <Label className="mb-1 block">Diagnosis Pointers (A–L):</Label>
                      <div className="flex flex-wrap gap-2">
                        {encounterData.icdCodes.map((icd, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          return (
                            <label key={icd.code} className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={cpt.dxPointers?.includes(letter) || false}
                                onChange={() => toggleDxPointerLetter(cpt.code, letter)}
                              />
                              {letter}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* NDC Info */}
                    {cpt.code.startsWith("J") && (
                      <div className="flex items-center gap-2">
                        <Label>NDC:</Label>
                        <Input
                          type="text"
                          placeholder="e.g., 0002-8215-01"
                          value={(cpt as any).ndc ?? ""}
                          onChange={(e) => updateCpt(cpt.code, { ndc: e.target.value })}
                          className="w-64"
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Total Charges */}
                <div className="pt-2 border-t flex justify-between items-center">
                  <span className="font-medium">Total Charges:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${encounterData.totalCharges.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
        <Button
          onClick={async () => setCurrentStep(4)}
          disabled={encounterData.icdCodes.length === 0 || encounterData.cptCodes.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Validating...
            </>
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </CardContent>
  </Card>
)}


      {/* Step 4: Claim Review */}
      {currentStep === 4 && claimData && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <DollarSign className="w-5 h-5" />
        Claim Review & Submission
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">

      {/* Top summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {claimData.validationScore}%
          </div>
          <div className="text-sm text-gray-600">Validation Score</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            ${claimData.estimatedReimbursement.toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Est. Reimbursement</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-600">{claimData.claimId}</div>
          <div className="text-sm text-gray-600">Claim ID</div>
        </div>
      </div>
      <div className="my-4 border-t border-b py-4">
  <div className="grid grid-cols-2 gap-4 text-sm">
    {/* Empty left column to push content right */}
    <div></div>

    {/* Resubmission Code on Right */}
    <div>
      <Label htmlFor="resubmissionCode">
        Resubmission Code (CMS-1500 Box 22)
      </Label>
      <Select
        value={claimData.resubmissionCode?.toString() || ""}
        onValueChange={(value) =>
          setClaimData((prev) => ({ ...prev, resubmissionCode: Number(value) }))
        }
      >
        <SelectTrigger>
          <SelectValue placeholder="Select Resubmission Code" />
        </SelectTrigger>
        <SelectContent>
          {RESUBMISSION_CODES.map((code) => (
            <SelectItem key={code.code} value={code.code.toString()}>
              {code.code} – {code.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>



      {/* Patient / Provider / Encounter */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label>Patient Name</Label>
          <Input
            value={encounterData.patientName}
            onChange={(e) => handleFieldChange("patientName", e.target.value)}
          />
        </div>
        <div>
          <Label>Patient ID</Label>
          <Input
            value={encounterData.patientId}
            onChange={(e) => handleFieldChange("patientId", e.target.value)}
          />
        </div>
        <div>
          <Label>Provider Name</Label>
          <Input
            value={encounterData.provider?.providerName}
            onChange={(e) =>
              handleFieldChange("provider", {
                ...encounterData.provider,
                providerName: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Provider ID</Label>
          <Input
            value={encounterData.provider?.providerId}
            onChange={(e) =>
              handleFieldChange("provider", {
                ...encounterData.provider,
                providerId: e.target.value,
              })
            }
          />
        </div>
        <div>
          <Label>Date of Service</Label>
          <Input
            type="date"
            value={encounterData.dateOfService}
            onChange={(e) => handleFieldChange("dateOfService", e.target.value)}
          />
        </div>
        <div>
          <Label>Place of Service</Label>
          <Input
            value={encounterData.placeOfService}
            onChange={(e) => handleFieldChange("placeOfService", e.target.value)}
          />
        </div>
      </div>

      {/* ICD Codes */}
      <div>
        <h4 className="font-medium">Diagnosis Codes</h4>
        {encounterData.icdCodes.map((icd, idx) => (
          <div key={icd.code} className="flex items-center gap-2 mb-2">
            <Input
              className="w-28"
              value={icd.code}
              onChange={(e) => updateIcdCode(idx, { ...icd, code: e.target.value })}
            />
            <Input
              className="flex-1"
              value={icd.description}
              onChange={(e) =>
                updateIcdCode(idx, { ...icd, description: e.target.value })
              }
            />
            <Checkbox
              checked={icd.primary}
              onChange={(e) =>
                updateIcdCode(idx, { ...icd, primary: Boolean(e.target.checked) })
              }
            />
            <span className="text-sm">Primary</span>
            <Button size="sm" variant="outline" onClick={() => removeIcdCode(icd.code)}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      {/* CPT Codes */}
      <div>
        <h4 className="font-medium mb-3">Procedure Codes</h4>
        {encounterData.cptCodes.map((cpt, idx) => (
          <div
            key={cpt.code}
            className="space-y-2 mb-4 p-3 border rounded bg-gray-50"
          >
            <div className="grid grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">CPT Code</label>
                <Input
                  className="w-full"
                  value={cpt.code}
                  onChange={(e) =>
                    updateCptCode(idx, { ...cpt, code: e.target.value })
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium mb-1">Description</label>
                <Input
                  className="w-full"
                  value={cpt.description}
                  onChange={(e) =>
                    updateCptCode(idx, { ...cpt, description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Units</label>
                <Input
                  type="number"
                  className="w-full"
                  value={cpt.units ?? 1}
                  onChange={(e) =>
                    updateCptCode(idx, { ...cpt, units: Number(e.target.value) })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Fee ($)</label>
                <Input
                  type="number"
                  className="w-full"
                  value={cpt.fee}
                  onChange={(e) =>
                    updateCptCode(idx, { ...cpt, fee: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Modifiers</label>
                <Input
                  placeholder="Comma separated"
                  value={cpt.modifiers?.join(", ") || ""}
                  onChange={(e) =>
                    updateCptCode(idx, {
                      ...cpt,
                      modifiers: e.target.value
                        .split(",")
                        .map((m) => m.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">DX Pointers</label>
                <Input
                  placeholder="Comma separated letters"
                  value={cpt.dxPointers?.join(", ") || ""}
                  onChange={(e) =>
                    updateCptCode(idx, {
                      ...cpt,
                      dxPointers: e.target.value
                        .split(",")
                        .map((n) => n.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">NDC</label>
                <Input
                  placeholder="If applicable"
                  value={cpt.ndc || ""}
                  onChange={(e) =>
                    updateCptCode(idx, { ...cpt, ndc: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {/* Total charges */}
        <div className="pt-2 border-t flex justify-between items-center">
          <span className="font-medium">Total Charges:</span>
          <span className="text-lg font-bold text-green-600">
            $
            {encounterData.cptCodes
              .reduce((sum, c) => sum + (c.fee || 0) * (c.units || 1), 0)
              .toFixed(2)}
          </span>
        </div>
      </div>


      {/* Action Buttons */}
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={() => setCurrentStep(3)}>
          Back to Coding
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={saveClaimDraft}>
            Save as Draft
          </Button>
          <Button
            onClick={submitClaim}
            disabled={
              claimData.status === "submitted" ||
              claimData.issues.some((i) => i.type === "error") ||
              isProcessing
            }
          >
            {isProcessing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : claimData.status === "submitted" ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submitted
              </>
            ) : (
              "Submit Claim"
            )}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}



    </div>
  );
}