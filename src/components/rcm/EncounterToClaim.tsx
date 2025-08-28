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

// Common medical codes for quick selection
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

interface EncounterData {
  patientId: string;
  patientName: string;
  dateOfService: string;
  providerId: string;
  providerName: string;
  chiefComplaint: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  placeOfService: string;
  icdCodes: Array<{ code: string; description: string; primary: boolean }>;
  cptCodes: Array<{ code: string; description: string; fee: number; modifier?: string }>;
  totalCharges: number;
}

interface ClaimData {
  claimId: string;
  status: 'draft' | 'validated' | 'submitted' | 'paid' | 'denied';
  validationScore: number;
  estimatedReimbursement: number;
  issues: Array<{ type: 'error' | 'warning'; message: string }>;
}

export default function EncounterToClaim() {
  const { token } = useSelector((state: any) => state.auth);
  const [currentStep, setCurrentStep] = useState(1);
  const [encounterData, setEncounterData] = useState<EncounterData>({
    patientId: '',
    patientName: '',
    dateOfService: new Date().toISOString().split('T')[0],
    providerId: '',
    providerName: '',
    chiefComplaint: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    placeOfService: '11',
    icdCodes: [],
    cptCodes: [],
    totalCharges: 0
  });
  
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
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
        cptCodes: [...prev.cptCodes, cpt]
      }));
    }
  };

  const removeIcdCode = (code: string) => {
    setEncounterData(prev => ({
      ...prev,
      icdCodes: prev.icdCodes.filter(icd => icd.code !== code)
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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  id="patientId"
                  value={encounterData.patientId}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, patientId: e.target.value }))}
                  placeholder="Enter patient ID"
                />
              </div>
              <div>
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  value={encounterData.patientName}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, patientName: e.target.value }))}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label htmlFor="providerId">Provider ID</Label>
                <Input
                  id="providerId"
                  value={encounterData.providerId}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, providerId: e.target.value }))}
                  placeholder="Enter provider ID"
                />
              </div>
              <div>
                <Label htmlFor="providerName">Provider Name</Label>
                <Input
                  id="providerName"
                  value={encounterData.providerName}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, providerName: e.target.value }))}
                  placeholder="Enter provider name"
                />
              </div>
              <div>
                <Label htmlFor="dateOfService">Date of Service</Label>
                <Input
                  id="dateOfService"
                  type="date"
                  value={encounterData.dateOfService}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, dateOfService: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="placeOfService">Place of Service</Label>
                <Select
                  value={encounterData.placeOfService}
                  onValueChange={(value) => setEncounterData(prev => ({ ...prev, placeOfService: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLACE_OF_SERVICE_CODES.map(pos => (
                      <SelectItem key={pos.code} value={pos.code}>
                        {pos.code} - {pos.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Textarea
                id="chiefComplaint"
                value={encounterData.chiefComplaint}
                onChange={(e) => setEncounterData(prev => ({ ...prev, chiefComplaint: e.target.value }))}
                placeholder="Enter chief complaint"
                rows={2}
              />
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!encounterData.patientId || !encounterData.patientName}
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
              SOAP Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="subjective">Subjective</Label>
                <Textarea
                  id="subjective"
                  value={encounterData.subjective}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, subjective: e.target.value }))}
                  placeholder="Patient's description of symptoms, history of present illness..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="objective">Objective</Label>
                <Textarea
                  id="objective"
                  value={encounterData.objective}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, objective: e.target.value }))}
                  placeholder="Physical examination findings, vital signs, test results..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="assessment">Assessment</Label>
                <Textarea
                  id="assessment"
                  value={encounterData.assessment}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, assessment: e.target.value }))}
                  placeholder="Clinical impression, diagnosis..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Textarea
                  id="plan"
                  value={encounterData.plan}
                  onChange={(e) => setEncounterData(prev => ({ ...prev, plan: e.target.value }))}
                  placeholder="Treatment plan, medications, follow-up instructions..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                Next: Medical Coding
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
                        <Button size="sm" onClick={() => addIcdCode(icd)}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Selected Diagnosis Codes</h4>
                  {encounterData.icdCodes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No diagnosis codes selected</p>
                  ) : (
                    <div className="space-y-2">
                      {encounterData.icdCodes.map(icd => (
                        <div key={icd.code} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant={icd.primary ? "default" : "secondary"}>
                              {icd.primary ? "Primary" : "Secondary"}
                            </Badge>
                            <span className="font-mono text-sm">{icd.code}</span>
                            <span className="text-sm">{icd.description}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => removeIcdCode(icd.code)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

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
                        <Button size="sm" onClick={() => addCptCode(cpt)}>
                          Add
                        </Button>
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
                    <div className="space-y-2">
                      {encounterData.cptCodes.map(cpt => (
                        <div key={cpt.code} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <div>
                            <span className="font-mono text-sm">{cpt.code}</span>
                            <span className="ml-2 text-sm">{cpt.description}</span>
                            <span className="ml-2 text-sm font-medium text-green-600">${cpt.fee}</span>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => removeCptCode(cpt.code)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Total Charges:</span>
                          <span className="text-lg font-bold text-green-600">
                            ${encounterData.totalCharges.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back
              </Button>
              <Button 
                onClick={validateAndCreateClaim}
                disabled={encounterData.icdCodes.length === 0 || encounterData.cptCodes.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  'Create & Validate Claim'
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{claimData.validationScore}%</div>
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

            {claimData.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Validation Issues</h4>
                {claimData.issues.map((issue, index) => (
                  <Alert key={index} variant={issue.type === 'error' ? 'destructive' : 'default'}>
                    {issue.type === 'error' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>{issue.message}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <h4 className="font-medium">Claim Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Patient:</strong> {encounterData.patientName} ({encounterData.patientId})
                </div>
                <div>
                  <strong>Provider:</strong> {encounterData.providerName} ({encounterData.providerId})
                </div>
                <div>
                  <strong>Date of Service:</strong> {encounterData.dateOfService}
                </div>
                <div>
                  <strong>Place of Service:</strong> {encounterData.placeOfService}
                </div>
                <div className="col-span-2">
                  <strong>Diagnosis Codes:</strong> {encounterData.icdCodes.map(icd => icd.code).join(', ')}
                </div>
                <div className="col-span-2">
                  <strong>Procedure Codes:</strong> {encounterData.cptCodes.map(cpt => cpt.code).join(', ')}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                Back to Coding
              </Button>
              <div className="space-x-2">
                <Button variant="outline">Save as Draft</Button>
                <Button 
                  onClick={submitClaim}
                  disabled={claimData.status === 'submitted' || claimData.issues.some(i => i.type === 'error') || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : claimData.status === 'submitted' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submitted
                    </>
                  ) : (
                    'Submit Claim'
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