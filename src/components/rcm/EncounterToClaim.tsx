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
import { ClaimInfoSection } from './encounter/ClaimSection';
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
export interface EncounterData {
  // Step 1 – Patient & Insurance
  patientId: string;
  patientName: string;
  dob: string;
  sex: "M" | "F" | "U";
  address: string;
  patientPhone?: string;

  insurance: {
    payerId: string;
    subscriberId: string;
    groupNumber?: string;
    relationship: "self" | "spouse" | "child" | "other";
  };

  // Step 1 – Providers
  renderingProvider?: {
    npi: string;
    tin: string;
  };
  billingProvider?: {
    organization: string;
    tin: string;
    phone?: string;
    address?: string;
    npi?: string;
  };
  referringProvider?: { npi: string; name?: string };
  supervisingProvider?: { npi: string; name?: string };
  sameAsBilling?: boolean;

  // Step 1 – Service Facility (CMS-1500 Box 32)
  serviceFacility?: {
    name: string;
    npi: string;
    address: string;
    phone?: string;
  };

  // Step 1 – Encounter basics
  priorAuthNumber?: string;
  occurrenceCode?: string;
  occurrenceDate?: string;
  dateOfService: string;
  serviceTo?: string;
  placeOfService: string;

  // Step 2 – Clinical Documentation
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  additionalFindings?: string;
  lockedForAudit?: boolean;

  // Step 3 – Coding
  icdCodes: {
    code: string;
    description: string;
    primary?: boolean;
  }[];
  cptCodes: {
    code: string;
    description: string;
    fee: number;
    units: number;
    modifiers: string[];
    dxPointers: string[];
    ndc?: string;
  }[];

  // Step 3–4 – Financials
  totalCharges: number;
  copayCollected?: number;

  // Step 4 – Signatures / Claim
  signatures?: {
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
    patientPhone: "555-123-4567",
    dob: "1980-04-15",
    sex: "M",
    address: "123 Main St, Springfield, IL 62704",
  
    // Insurance
    insurance: {
      payerId: "60054",
      subscriberId: "W123456789",
      groupNumber: "GRP7890",
      relationship: "self",
    },
  
    // Providers
    renderingProvider: {
      npi: "1234567890",
      tin: "12-3456789",
    },
    billingProvider: {
      organization: "Springfield Family Practice LLC",
      tin: "12-3456789",
      phone: "555-987-6543",
      address: "456 Medical Plaza, Springfield, IL 62704",
    },
    referringProvider: {
      npi: "0987654321",
      name: "Dr. Robert Jones",
    },
    supervisingProvider: {
      npi: "1122334455",
      name: "Dr. Jane Supervising",
    },
    sameAsBilling: true,
  
    // Encounter basics
    priorAuthNumber: "AUTH5678",
    occurrenceCode: "01",
    occurrenceDate: "2025-08-28",
    dateOfService: "2025-08-28",
    serviceTo: "2025-08-28",
    placeOfService: "11",
  
    // Clinical notes
    chiefComplaint: "Follow-up for hypertension and diabetes",
    subjective: "Patient reports occasional headaches and fatigue.",
    objective: "BP 150/90, HR 82, BMI 29. Labs pending.",
    assessment: "Uncontrolled hypertension; stable type 2 diabetes.",
    plan: "Increase lisinopril dosage, follow-up in 1 month, continue metformin.",
    additionalFindings: "Patient reports occasional headaches and fatigue.",
    lockedForAudit: false,
  
    // ICD codes
    icdCodes: [
      { code: "I10", description: "Essential (primary) hypertension", primary: true },
      { code: "E11.9", description: "Type 2 diabetes mellitus without complications", primary: false },
    ],
  
    // CPT codes
    cptCodes: [
      {
        code: "99214",
        description: "Office/outpatient visit, established patient, 25 min",
        fee: 125,
        units: 1,
        modifiers: ["25"],
        dxPointers: ["A", "B"],
        ndc: "1234567890",
      },
      {
        code: "93000",
        description: "Electrocardiogram, routine, w/ interpretation & report",
        fee: 40,
        units: 1,
        modifiers: ["59"],
        dxPointers: ["A"],
      },
    ],
  
    // Financials
    totalCharges: 165,
    copayCollected: 20,
  
    // Signatures
    signatures: {
      providerOnFile: true,
      patientOnFile: true,
    },
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

  // ✅ Generic field update handler (Step 1 & 2)
const handleFieldChange = (field: string, value: any) => {
  setEncounterData((prev) => {
    const keys = field.split(".");
    const updated: any = { ...prev };
    let obj = updated;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      obj[k] = { ...obj[k] };
      obj = obj[k];
    }
    obj[keys[keys.length - 1]] = value;
    return updated;
  });
};

// ✅ ICD Management (Step 3)
const addIcdCode = (icd: { code: string; description: string }) => {
  setEncounterData(prev => {
    if (prev.icdCodes.some(existing => existing.code === icd.code)) return prev;
    return {
      ...prev,
      icdCodes: [...prev.icdCodes, { ...icd, primary: prev.icdCodes.length === 0 }]
    };
  });
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

const updateIcdCode = (
  index: number,
  updatedIcd: { code: string; description: string; primary?: boolean }
) => {
  setEncounterData(prev => {
    const icdCodes = [...prev.icdCodes];
    icdCodes[index] = updatedIcd;
    return { ...prev, icdCodes };
  });
};

// ✅ CPT Management (Step 3)
const addCptCode = (cpt: { code: string; description: string; fee: number }) => {
  setEncounterData(prev => {
    if (prev.cptCodes.some(existing => existing.code === cpt.code)) return prev;
    return {
      ...prev,
      cptCodes: [...prev.cptCodes, { ...cpt, units: 1, modifiers: [], dxPointers: ["A"] }]
    };
  });
};

const removeCptCode = (code: string) => {
  setEncounterData(prev => ({
    ...prev,
    cptCodes: prev.cptCodes.filter(cpt => cpt.code !== code)
  }));
};

// Unified update for CPT (replaces old updateCpt & updateCptCode)
const updateCptCode = (
  code: string,
  updates: Partial<EncounterData["cptCodes"][0]>
) => {
  setEncounterData(prev => ({
    ...prev,
    cptCodes: prev.cptCodes.map(cpt =>
      cpt.code === code ? { ...cpt, ...updates } : cpt
    )
  }));
};

// Toggle Dx Pointers
const toggleDxPointerLetter = (cptCode: string, pointer: string) => {
  setEncounterData(prev => ({
    ...prev,
    cptCodes: prev.cptCodes.map(cpt => {
      if (cpt.code !== cptCode) return cpt;
      const dxPointers = cpt.dxPointers ?? [];
      return dxPointers.includes(pointer)
        ? { ...cpt, dxPointers: dxPointers.filter(p => p !== pointer) }
        : { ...cpt, dxPointers: [...dxPointers, pointer] };
    }),
  }));
};

// ✅ Auto update total charges when CPTs change
useEffect(() => {
  const total = encounterData.cptCodes.reduce((sum, cpt) => sum + (cpt.fee * (cpt.units || 1)), 0);
  setEncounterData(prev => ({ ...prev, totalCharges: total }));
}, [encounterData.cptCodes]);

// ✅ Claim Processing (Step 4)
const validateAndCreateClaim = async () => {
  setIsProcessing(true);
  try {
    const response = await createClaimFromEncounterApi(encounterData, token);
    if (response?.success) {
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
    console.error("Error creating claim:", error);
  } finally {
    setIsProcessing(false);
  }
};

const submitClaim = async () => {
  if (!claimData) return;
  setIsProcessing(true);
  try {
    const response = await submitClaimApi(claimData.claimId, token);
    if (response?.success) {
      setClaimData(prev => prev ? { ...prev, status: "submitted" } : null);
    }
  } catch (error) {
    console.error("Error submitting claim:", error);
  } finally {
    setIsProcessing(false);
  }
};

const saveClaimDraft = () => {
  // could persist to backend
  alert("Claim draft saved successfully!");
};
// ✅ Step indicator UI
const renderStepIndicator = () => (
  <div className="flex items-center justify-between mb-6">
    {[
      { step: 1, title: 'Patient & Provider', icon: User },
      { step: 2, title: 'SOAP Documentation', icon: FileText },
      { step: 3, title: 'Medical Coding', icon: Calendar },
      { step: 4, title: 'Claim Review', icon: DollarSign }
    ].map(({ step, title, icon: Icon }) => (
      <div key={step} className="flex items-center">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            currentStep >= step
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 text-gray-400'
          }`}
        >
          {currentStep > step ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
        </div>
        <span
          className={`ml-2 text-sm font-medium ${
            currentStep >= step ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          {title}
        </span>
        {step < 4 && <div className="w-16 h-0.5 bg-gray-300 mx-4" />}
      </div>
    ))}
  </div>
);
function handleClaimChange(field: string, value: any) {
  setClaimData(prev => ({
    ...prev,
    [field]: value
  }));
}

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
          {/* Prior Auth Number (CMS-1500 Box 23) */}
          <div>
            <Label htmlFor="priorAuthNumber">Prior Authorization Number</Label>
            <Input
              id="priorAuthNumber"
              type="text"
              value={encounterData.priorAuthNumber || ""}
              onChange={(e) =>
                setEncounterData((prev) => ({ ...prev, priorAuthNumber: e.target.value }))
              }
              placeholder="Enter prior auth #"
            />
          </div>

          {/* Occurrence Code (custom/UB-04 style if your payer needs it) */}
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
                setEncounterData((prev) => ({ ...prev, occurrenceDate: e.target.value }))
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
                setEncounterData((prev) => ({ ...prev, dateOfService: e.target.value }))
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
              setEncounterData((prev) => ({ ...prev, chiefComplaint: e.target.value }))
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
          // disabled={
          //   !encounterData.patientId ||
          //   !encounterData.patientName ||
          //   !encounterData.dob ||
          //   !encounterData.sex ||
          //   !encounterData.patientPhone ||
          //   !encounterData.insurance?.subscriberId ||
          //   !encounterData.insurance?.payerId ||
          //   !encounterData.dateOfService ||
          //   !encounterData.placeOfService ||
          //   !encounterData.renderingProvider?.npi ||
          //   !encounterData.billingProvider?.npi ||      // CMS-1500 Box 33a
          //   !encounterData.billingProvider?.address ||  // CMS-1500 Box 33
          //   (!encounterData.serviceFacility?.npi &&     // CMS-1500 Box 32 (required if different)
          //     encounterData.placeOfService !== "11")
          // }
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
        SOAP Documentation & Clinical Notes
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-6">
      
      {/* Chief Complaint (from Step 1, but editable here too) */}
      <section>
        <Label htmlFor="chiefComplaint">Chief Complaint</Label>
        <Textarea
          id="chiefComplaint"
          value={encounterData.chiefComplaint || ""}
          onChange={(e) =>
            setEncounterData((prev) => ({ ...prev, chiefComplaint: e.target.value }))
          }
          rows={2}
          placeholder="E.g. Follow-up for hypertension and diabetes..."
        />
      </section>

      {/* SOAP Notes */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Subjective</Label>
          <Textarea
            value={encounterData.subjective || ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, subjective: e.target.value }))
            }
            placeholder="Patient reports headache, dizziness, chest pain..."
            rows={3}
          />
        </div>

        <div>
          <Label>Objective</Label>
          <Textarea
            value={encounterData.objective || ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, objective: e.target.value }))
            }
            placeholder="Vitals, exam findings, labs..."
            rows={3}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Assessment</Label>
          <Textarea
            value={encounterData.assessment || ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, assessment: e.target.value }))
            }
            placeholder="Diagnosis summary..."
            rows={3}
          />
        </div>

        <div>
          <Label>Plan</Label>
          <Textarea
            value={encounterData.plan || ""}
            onChange={(e) =>
              setEncounterData((prev) => ({ ...prev, plan: e.target.value }))
            }
            placeholder="Treatment plan, follow-up instructions..."
            rows={3}
          />
        </div>
      </section>

      {/* Additional Findings */}
      <section>
        <Label>Additional Findings</Label>
        <Textarea
          value={encounterData.additionalFindings || ""}
          onChange={(e) =>
            setEncounterData((prev) => ({ ...prev, additionalFindings: e.target.value }))
          }
          placeholder="Free-text notes: imaging results, extended observations, etc."
          rows={3}
        />
      </section>

      {/* Lock for Audit */}
      <section className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          checked={encounterData.lockedForAudit || false}
          onChange={(e) =>
            setEncounterData((prev) => ({
              ...prev,
              lockedForAudit: e.target.checked,
            }))
          }
        />
        <Label>Lock Documentation (prevents further edits after claim submission)</Label>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(1)}>
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(3)}
          disabled={
            !encounterData.subjective ||
            !encounterData.objective ||
            !encounterData.assessment ||
            !encounterData.plan
          }
        >
          Next: Coding & Charges
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
        Coding & Charges
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-8">

      {/* ICD-10 Section */}
      <section>
        <h3 className="text-lg font-semibold mb-2">Diagnoses (ICD-10)</h3>
        <div className="space-y-3">
          {encounterData.icdCodes?.map((dx, index) => (
            <div key={index} className="grid grid-cols-6 gap-2 items-center">
              <Input
                placeholder="ICD-10 Code"
                value={dx.code}
                onChange={(e) => {
                  const updated = [...encounterData.icdCodes];
                  updated[index].code = e.target.value;
                  setEncounterData((prev) => ({ ...prev, icdCodes: updated }));
                }}
              />
              <Input
                placeholder="Description"
                value={dx.description}
                onChange={(e) => {
                  const updated = [...encounterData.icdCodes];
                  updated[index].description = e.target.value;
                  setEncounterData((prev) => ({ ...prev, icdCodes: updated }));
                }}
              />
              <Select
                value={dx.primary ? "yes" : "no"}
                onValueChange={(val) => {
                  const updated = encounterData.icdCodes.map((d, i) => ({
                    ...d,
                    primary: i === index ? val === "yes" : false, // only one primary
                  }));
                  setEncounterData((prev) => ({ ...prev, icdCodes: updated }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Primary?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Primary</SelectItem>
                  <SelectItem value="no">Secondary</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const updated = [...encounterData.icdCodes];
                  updated.splice(index, 1);
                  setEncounterData((prev) => ({ ...prev, icdCodes: updated }));
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setEncounterData((prev) => ({
                ...prev,
                icdCodes: [...(prev.icdCodes || []), { code: "", description: "", primary: false }],
              }))
            }
          >
            + Add Diagnosis
          </Button>
        </div>
      </section>

{/* CPT/HCPCS Section */}
<section>
  <h3 className="text-lg font-semibold mb-2">Procedures (CPT / HCPCS)</h3>

  {/* Table Header */}
  <div className="grid grid-cols-7 gap-2 font-semibold text-sm text-gray-600 mb-2">
    <span>CPT Code</span>
    <span>Fee</span>
    <span>Units</span>
    <span>Modifiers</span>
    <span>DX Pointers</span>
    <span>NDC</span>
    <span>Action</span>
  </div>

  <div className="space-y-3">
    {encounterData.cptCodes?.map((proc, index) => (
      <div key={index} className="grid grid-cols-7 gap-2 items-center">
        <Input
          placeholder="CPT Code"
          value={proc.code}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].code = e.target.value;
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Input
          type="number"
          placeholder="Fee"
          value={proc.fee}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].fee = parseFloat(e.target.value) || 0;
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Input
          type="number"
          placeholder="Units"
          value={proc.units}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].units = parseInt(e.target.value) || 1;
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Input
          placeholder="Modifiers"
          value={proc.modifiers?.join(",") || ""}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].modifiers = e.target.value.split(",").map((m) => m.trim());
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Input
          placeholder="DX Pointers"
          value={proc.dxPointers?.join(",") || ""}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].dxPointers = e.target.value.split(",").map((p) => p.trim());
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Input
          placeholder="NDC"
          value={proc.ndc || ""}
          onChange={(e) => {
            const updated = [...encounterData.cptCodes];
            updated[index].ndc = e.target.value;
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            const updated = [...encounterData.cptCodes];
            updated.splice(index, 1);
            setEncounterData((prev) => ({ ...prev, cptCodes: updated }));
          }}
        >
          Remove
        </Button>
      </div>
    ))}
    <Button
      variant="outline"
      onClick={() =>
        setEncounterData((prev) => ({
          ...prev,
          cptCodes: [
            ...(prev.cptCodes || []),
            { code: "", fee: 0, units: 1, modifiers: [], dxPointers: [] },
          ],
        }))
      }
    >
      + Add Procedure
    </Button>
  </div>
</section>


      {/* Financial Summary */}
      <section className="pt-4">
        <Label>Total Charges</Label>
        <Input
          type="number"
          value={encounterData.totalCharges || 0}
          readOnly
        />
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={() => setCurrentStep(2)}>
          Back
        </Button>
        <Button
          onClick={() => setCurrentStep(4)}
          disabled={!encounterData.icdCodes?.length || !encounterData.cptCodes?.length}
        >
          Next: Claim Review
        </Button>
      </div>
    </CardContent>
  </Card>
)}


{/* Step 4: Claim Review */}
{currentStep === 4 && (
  <Card className="mt-4 p-4">
    <CardHeader>
      <CardTitle className="text-2xl font-semibold flex items-center gap-2">
        Claim Review & Submission
      </CardTitle>
    </CardHeader>

    <ClaimInfoSection data={claimData} onChange={handleClaimChange} />

    <CardContent className="space-y-6">

      {/* ---------------- Patient & Insurance ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Patient & Insurance</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Patient:</span> {encounterData.patientName} (DOB: {encounterData.dob})</div>
          <div><span className="font-medium">Sex:</span> {encounterData.sex}</div>
          <div><span className="font-medium">Address:</span> {encounterData.address}</div>
          <div><span className="font-medium">Payer ID:</span> {encounterData.insurance?.payerId}</div>
          <div><span className="font-medium">Subscriber ID:</span> {encounterData.insurance?.subscriberId}</div>
          <div><span className="font-medium">Group #:</span> {encounterData.insurance?.groupNumber}</div>
          <div><span className="font-medium">Relationship:</span> {encounterData.insurance?.relationship}</div>
        </div>
      </section>

      {/* ---------------- Provider ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Provider</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Rendering NPI:</span> {encounterData.renderingProvider?.npi}</div>
          <div><span className="font-medium">Rendering TIN:</span> {encounterData.renderingProvider?.tin}</div>
          <div><span className="font-medium">Billing Org:</span> {encounterData.billingProvider?.organization}</div>
          <div><span className="font-medium">Billing TIN:</span> {encounterData.billingProvider?.tin}</div>
          <div><span className="font-medium">Billing Address:</span> {encounterData.billingProvider?.address}</div>
          <div><span className="font-medium">Billing Phone:</span> {encounterData.billingProvider?.phone}</div>
          {encounterData.referringProvider?.npi && (
            <div><span className="font-medium">Referring NPI:</span> {encounterData.referringProvider?.npi}</div>
          )}
          {encounterData.supervisingProvider?.npi && (
            <div><span className="font-medium">Supervising NPI:</span> {encounterData.supervisingProvider?.npi}</div>
          )}
        </div>
      </section>

      {/* ---------------- Diagnoses ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Diagnoses (ICD-10)</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {encounterData.icdCodes?.map((dx, i) => (
            <div key={i} className="mb-1">
              <span className="font-medium">{dx.code}</span>: {dx.description} {dx.primary ? "(Primary)" : ""}
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Procedures ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Procedures (CPT/HCPCS)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Code</th>
                <th className="p-2 border">Description</th>
                <th className="p-2 border">Fee</th>
                <th className="p-2 border">Units</th>
                <th className="p-2 border">Modifiers</th>
                <th className="p-2 border">DX Ptrs</th>
              </tr>
            </thead>
            <tbody>
              {encounterData.cptCodes?.map((proc, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="p-2 border">{proc.code}</td>
                  <td className="p-2 border">{proc.description}</td>
                  <td className="p-2 border">${proc.fee}</td>
                  <td className="p-2 border">{proc.units}</td>
                  <td className="p-2 border">{proc.modifiers?.join(", ")}</td>
                  <td className="p-2 border">{proc.dxPointers?.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Financials ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Financials</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium">Total Charges:</span> ${encounterData.totalCharges}</div>
          <div><span className="font-medium">Copay Collected:</span> ${encounterData.copayCollected || 0}</div>
        </div>
      </section>

      {/* ---------------- Signatures ---------------- */}
      <section className="p-4 border rounded-md bg-gray-50">
        <h3 className="text-lg font-medium mb-3 border-b pb-2">Signatures</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={encounterData.signatures?.providerOnFile || false}
              onChange={(e) =>
                setEncounterData((prev) => ({
                  ...prev,
                  signatures: { ...prev.signatures, providerOnFile: e.target.checked },
                }))
              }
            />
            <Label>Provider Signature on File</Label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={encounterData.signatures?.patientOnFile || false}
              onChange={(e) =>
                setEncounterData((prev) => ({
                  ...prev,
                  signatures: { ...prev.signatures, patientOnFile: e.target.checked },
                }))
              }
            />
            <Label>Patient Signature on File</Label>
          </div>
        </div>
      </section>

{/* ---------------- Navigation + Submit + Export ---------------- */}
<div className="flex justify-between pt-6 space-x-4">
  <Button variant="outline" onClick={() => setCurrentStep(3)}>
    Back
  </Button>

  <div className="flex space-x-2">
    {/* Export to CMS-1500 */}
    {/* <Button
      variant="secondary"
      onClick={() => handleExportCMS(encounterData)}
    >
      Export CMS-1500
    </Button> */}

    {/* Submit Claim */}
    <Button
      onClick={() => console.log("Submitting claim:", encounterData)}
      disabled={
        !encounterData.signatures?.providerOnFile ||
        !encounterData.signatures?.patientOnFile
      }
    >
      Submit Claim
    </Button>
  </div>
</div>
    </CardContent>
  </Card>
)}





    </div>
  );
}