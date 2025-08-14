import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Mail, Printer, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface EncounterData {
  id: string;
  patientId: string;
  providerId: string;
  appointmentId?: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses: any[];
  procedures: any[];
  vitals?: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PatientInfo {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  mrn: string;
}

interface ProviderInfo {
  name: string;
  title: string;
  npi: string;
  address: string;
  phone: string;
}

interface AdvancedDocumentGeneratorProps {
  encounterData: EncounterData;
  patientInfo: PatientInfo;
  providerInfo: ProviderInfo;
  onDocumentGenerated: (type: string, data: any) => void;
}

const AdvancedDocumentGenerator: React.FC<AdvancedDocumentGeneratorProps> = ({
  encounterData,
  patientInfo,
  providerInfo,
  onDocumentGenerated
}) => {
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Document templates
  const generateProgressNote = useCallback(() => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    
    return `PROGRESS NOTE

Date: ${date}
Time: ${time}
Provider: ${providerInfo.name}, ${providerInfo.title}
Patient: ${patientInfo.name}
DOB: ${patientInfo.dateOfBirth}
MRN: ${patientInfo.mrn}

SUBJECTIVE:
${encounterData.subjective || 'No subjective data documented.'}

OBJECTIVE:
${encounterData.objective || 'No objective data documented.'}

ASSESSMENT:
${encounterData.assessment || 'No assessment documented.'}

PLAN:
${encounterData.plan || 'No plan documented.'}

DIAGNOSES:
${encounterData.diagnoses.map((dx, i) => `${i + 1}. ${dx.name} (${dx.code})`).join('\n') || 'No diagnoses documented.'}

PROCEDURES:
${encounterData.procedures.map((proc, i) => `${i + 1}. ${proc.description} (${proc.code})`).join('\n') || 'No procedures documented.'}

Provider: ${providerInfo.name}, ${providerInfo.title}
NPI: ${providerInfo.npi}
Date: ${date}

Electronically signed by ${providerInfo.name} on ${date} at ${time}`;
  }, [encounterData, patientInfo, providerInfo]);

  const generateReferralLetter = useCallback(() => {
    const date = new Date().toLocaleDateString();
    
    return `REFERRAL LETTER

Date: ${date}

To: [Specialist Name]
[Specialist Address]

Re: ${patientInfo.name}
DOB: ${patientInfo.dateOfBirth}
MRN: ${patientInfo.mrn}

Dear Colleague,

I am referring ${patientInfo.name} for your evaluation and management. Please see the details below:

REASON FOR REFERRAL:
${encounterData.assessment || 'Please see clinical details below.'}

CLINICAL HISTORY:
${encounterData.subjective || 'Clinical history as documented in encounter.'}

PHYSICAL EXAMINATION:
${encounterData.objective || 'Physical examination findings as documented.'}

CURRENT DIAGNOSES:
${encounterData.diagnoses.map((dx, i) => `${i + 1}. ${dx.name} (${dx.code})`).join('\n') || 'See encounter documentation.'}

CURRENT TREATMENT:
${encounterData.plan || 'Current treatment plan as documented.'}

Please evaluate and provide recommendations for ongoing management. I would appreciate a consultation report at your earliest convenience.

Thank you for your assistance with this patient's care.

Sincerely,

${providerInfo.name}, ${providerInfo.title}
${providerInfo.address}
${providerInfo.phone}
NPI: ${providerInfo.npi}`;
  }, [encounterData, patientInfo, providerInfo]);

  const generateDischargeInstructions = useCallback(() => {
    const date = new Date().toLocaleDateString();
    
    return `DISCHARGE INSTRUCTIONS

Patient: ${patientInfo.name}
Date: ${date}
Provider: ${providerInfo.name}, ${providerInfo.title}

DIAGNOSIS:
${encounterData.diagnoses.map((dx, i) => `${i + 1}. ${dx.name}`).join('\n') || 'As discussed during your visit.'}

TREATMENT PROVIDED:
${encounterData.procedures.map((proc, i) => `${i + 1}. ${proc.description}`).join('\n') || 'As discussed during your visit.'}

MEDICATIONS:
Please take medications as prescribed. Follow the instructions on the medication labels.

ACTIVITY:
Resume normal activities as tolerated unless otherwise instructed.

DIET:
Resume normal diet unless otherwise instructed.

FOLLOW-UP:
${encounterData.plan.includes('follow') ? 'As discussed during your visit.' : 'Follow up as needed or if symptoms worsen.'}

WHEN TO CALL OR RETURN:
• Fever over 101°F (38.3°C)
• Worsening symptoms
• New or concerning symptoms
• Any questions or concerns

EMERGENCY CONTACT:
If you have a medical emergency, call 911 or go to the nearest emergency room.

For non-urgent questions, please call our office at ${providerInfo.phone}.

Provider: ${providerInfo.name}, ${providerInfo.title}
${providerInfo.address}
${providerInfo.phone}`;
  }, [encounterData, patientInfo, providerInfo]);

  const generatePrescription = useCallback(() => {
    const date = new Date().toLocaleDateString();
    
    return `PRESCRIPTION

Provider: ${providerInfo.name}, ${providerInfo.title}
${providerInfo.address}
${providerInfo.phone}
NPI: ${providerInfo.npi}

Date: ${date}

Patient: ${patientInfo.name}
DOB: ${patientInfo.dateOfBirth}
Address: [Patient Address]

Rx:
[Medication Name]
[Strength]
[Quantity]
[Directions for use]
[Refills]

Diagnosis: ${encounterData.diagnoses[0]?.name || '[Primary Diagnosis]'}
ICD-10: ${encounterData.diagnoses[0]?.code || '[ICD-10 Code]'}

Provider Signature: ${providerInfo.name}
Date: ${date}

DEA#: [DEA Number if controlled substance]

Generic substitution permitted unless checked: [ ]
Brand medically necessary: [ ]`;
  }, [encounterData, patientInfo, providerInfo]);

  const generateLabOrder = useCallback(() => {
    const date = new Date().toLocaleDateString();
    
    return `LABORATORY ORDER

Provider: ${providerInfo.name}, ${providerInfo.title}
${providerInfo.address}
${providerInfo.phone}
NPI: ${providerInfo.npi}

Date: ${date}

Patient: ${patientInfo.name}
DOB: ${patientInfo.dateOfBirth}
MRN: ${patientInfo.mrn}

TESTS ORDERED:
[ ] Complete Blood Count (CBC)
[ ] Comprehensive Metabolic Panel (CMP)
[ ] Lipid Panel
[ ] Hemoglobin A1c
[ ] Thyroid Function Tests
[ ] Urinalysis
[ ] Other: ________________

CLINICAL INDICATION:
${encounterData.assessment || 'Clinical indication as documented in encounter.'}

DIAGNOSIS:
${encounterData.diagnoses.map((dx, i) => `${i + 1}. ${dx.name} (${dx.code})`).join('\n') || 'See encounter documentation.'}

STAT: [ ] Yes [ ] No
Fasting Required: [ ] Yes [ ] No

Provider Signature: ${providerInfo.name}
Date: ${date}`;
  }, [encounterData, patientInfo, providerInfo]);

  const documentTypes = [
    { id: 'progress-note', name: 'Progress Note', generator: generateProgressNote },
    { id: 'referral-letter', name: 'Referral Letter', generator: generateReferralLetter },
    { id: 'discharge-instructions', name: 'Discharge Instructions', generator: generateDischargeInstructions },
    { id: 'prescription', name: 'Prescription', generator: generatePrescription },
    { id: 'lab-order', name: 'Lab Order', generator: generateLabOrder }
  ];

  const handleGenerateDocument = useCallback(async (type: string) => {
    setIsGenerating(true);
    
    try {
      const documentType = documentTypes.find(dt => dt.id === type);
      if (!documentType) {
        throw new Error('Document type not found');
      }
      
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const document = documentType.generator();
      setGeneratedDocument(document);
      setSelectedDocumentType(type);
      
      onDocumentGenerated(documentType.name, document);
      toast.success(`${documentType.name} generated successfully`);
    } catch (error) {
      toast.error('Failed to generate document');
      console.error('Document generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [documentTypes, onDocumentGenerated]);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(generatedDocument);
    toast.success('Document copied to clipboard');
  }, [generatedDocument]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Medical Document</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${generatedDocument}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [generatedDocument]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([generatedDocument], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDocumentType}-${patientInfo.name}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Document downloaded');
  }, [generatedDocument, selectedDocumentType, patientInfo.name]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" />
            Advanced Document Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Document Type Selection */}
            <div>
              <Label className="text-sm font-medium">Select Document Type:</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {documentTypes.map((docType) => (
                  <Button
                    key={docType.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateDocument(docType.id)}
                    disabled={isGenerating}
                    className="text-xs h-auto p-3 text-left justify-start"
                  >
                    <div>
                      <div className="font-medium">{docType.name}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Generation Status */}
            {isGenerating && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-800">Generating document...</span>
              </div>
            )}

            {/* Generated Document */}
            {generatedDocument && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <Label className="text-sm font-medium">
                      Generated: {documentTypes.find(dt => dt.id === selectedDocumentType)?.name}
                    </Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToClipboard}
                      className="text-xs"
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      className="text-xs"
                    >
                      <Printer className="w-3 h-3 mr-1" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] w-full">
                  <Textarea
                    value={generatedDocument}
                    onChange={(e) => setGeneratedDocument(e.target.value)}
                    className="min-h-[380px] text-sm font-mono"
                    placeholder="Generated document will appear here..."
                  />
                </ScrollArea>
              </div>
            )}

            {/* Document Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <Label className="font-medium">Patient:</Label>
                  <p>{patientInfo.name}</p>
                </div>
                <div>
                  <Label className="font-medium">Provider:</Label>
                  <p>{providerInfo.name}</p>
                </div>
                <div>
                  <Label className="font-medium">Encounter Date:</Label>
                  <p>{encounterData.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="font-medium">Document Status:</Label>
                  <Badge variant="secondary" className="text-xs">
                    {generatedDocument ? 'Generated' : 'Not Generated'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedDocumentGenerator;