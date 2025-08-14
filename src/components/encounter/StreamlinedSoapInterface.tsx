import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  Save,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Clock,
  User,
  FileText,
  Stethoscope,
  Brain,
  Calendar,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import { getTemplateById, ENCOUNTER_TEMPLATES, type EncounterTemplate } from './EncounterTemplates';
import { AdvancedAssessmentBuilder } from './AdvancedAssessmentBuilder';
import { ClinicalFindingsBuilder } from './ClinicalFindingsBuilder';
import { UnifiedDiagnosisManager } from './UnifiedDiagnosisManager';
import AutoSaveEncounterManager from './AutoSaveEncounterManager';
import SmartCPTSuggestions from './SmartCPTSuggestions';
import AdvancedDocumentGenerator from './AdvancedDocumentGenerator';

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface PatientContext {
  name: string;
  age: number;
  gender: string;
  chiefComplaint: string;
  vitals: any;
  allergies: string[];
  medications: string[];
  medicalHistory: string[];
  conditions: string[];
}

interface StreamlinedSoapInterfaceProps {
  appointment?: any;
  patientContext?: PatientContext;
  onSave?: (data: SOAPData) => void;
  onComplete?: (data: SOAPData) => void;
}

const SOAP_SECTIONS = [
  {
    key: 'subjective' as keyof SOAPData,
    title: 'Subjective',
    subtitle: 'Patient\'s story and symptoms',
    icon: User,
    placeholder: 'What brings you in today? How are you feeling?',
    quickActions: [
      'Patient reports feeling well',
      'No acute distress',
      'Chief complaint unchanged',
      'Symptoms improving since last visit'
    ]
  },
  {
    key: 'objective' as keyof SOAPData,
    title: 'Objective',
    subtitle: 'Physical examination findings',
    icon: Stethoscope,
    placeholder: 'Physical examination findings, vital signs, test results',
    quickActions: [
      'Vital signs stable',
      'Physical exam unremarkable',
      'Alert and oriented',
      'No acute findings'
    ]
  },
  {
    key: 'assessment' as keyof SOAPData,
    title: 'Assessment',
    subtitle: 'Clinical impression and diagnosis',
    icon: Brain,
    placeholder: 'Clinical impression, differential diagnosis',
    quickActions: [
      'Stable chronic condition',
      'Acute condition improving',
      'No change from previous visit',
      'Rule out differential diagnosis'
    ]
  },
  {
    key: 'plan' as keyof SOAPData,
    title: 'Plan',
    subtitle: 'Treatment plan and next steps',
    icon: Calendar,
    placeholder: 'Treatment plan, medications, follow-up instructions',
    quickActions: [
      'Continue current medications',
      'Follow up in 3 months',
      'Return if symptoms worsen',
      'Lab work in 6 months'
    ]
  }
];

// Template-aware quick actions
const getTemplateQuickActions = (sectionKey: keyof SOAPData, selectedTemplate: EncounterTemplate | null) => {
  if (!selectedTemplate) {
    return SOAP_SECTIONS.find(s => s.key === sectionKey)?.quickActions || [];
  }

  switch (sectionKey) {
    case 'subjective':
      return selectedTemplate.soapTemplate.subjective.quickPhrases;
    case 'objective':
      return selectedTemplate.soapTemplate.objective.quickPhrases;
    case 'assessment':
      return selectedTemplate.soapTemplate.assessment.commonDiagnoses.map(dx => `Assessment: ${dx}`);
    case 'plan':
      return selectedTemplate.soapTemplate.plan.treatments.concat(
        selectedTemplate.soapTemplate.plan.followUp
      );
    default:
      return [];
  }
};

export const StreamlinedSoapInterface: React.FC<StreamlinedSoapInterfaceProps> = ({
  appointment,
  patientContext,
  onSave,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [soapData, setSoapData] = useState<SOAPData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [selectedEncounterTemplate, setSelectedEncounterTemplate] = useState<EncounterTemplate | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<any[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [physicalFindings, setPhysicalFindings] = useState<any[]>([]);
  const [vitalSigns, setVitalSigns] = useState<any>({});
  const [selectedProcedures, setSelectedProcedures] = useState<any[]>([]);
  const [encounterData, setEncounterData] = useState<any>({
    patientId: patientContext?.name || '',
    providerId: 'dr-001',
    appointmentId: appointment?.id,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    diagnoses: [],
    procedures: [],
    status: 'draft'
  });

  const progress = ((currentStep + 1) / SOAP_SECTIONS.length) * 100;
  const currentSection = SOAP_SECTIONS[currentStep];

  // Auto-save functionality
  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      if (Object.values(soapData).some(value => value.trim().length > 0)) {
        onSave?.(soapData);
      }
    }, 2000);

    return () => clearTimeout(autoSaveTimer);
  }, [soapData, onSave]);

  // Update encounter data when SOAP data changes
  useEffect(() => {
    const updatedEncounterData = {
      ...encounterData,
      subjective: soapData.subjective,
      objective: soapData.objective,
      assessment: soapData.assessment,
      plan: soapData.plan,
      diagnoses: selectedDiagnoses,
      procedures: selectedProcedures
    };
    setEncounterData(updatedEncounterData);
  }, [soapData, selectedDiagnoses, selectedProcedures]);

  const handleTextChange = useCallback((value: string) => {
    setSoapData(prev => ({
      ...prev,
      [currentSection.key]: value
    }));
  }, [currentSection.key]);

  const handleQuickAction = useCallback((text: string) => {
    const currentValue = soapData[currentSection.key];
    const newValue = currentValue ? `${currentValue}\n${text}` : text;
    handleTextChange(newValue);
  }, [currentSection.key, soapData, handleTextChange]);

  const applyTemplateToCurrentSection = useCallback(() => {
    if (!selectedEncounterTemplate) return;

    const template = selectedEncounterTemplate.soapTemplate;
    let templateContent = '';

    switch (currentSection.key) {
      case 'subjective':
        templateContent = template.subjective.quickPhrases.join('. ') + '.';
        break;
      case 'objective':
        templateContent = template.objective.quickPhrases.concat(
          template.objective.physicalExam
        ).join('. ') + '.';
        break;
      case 'assessment':
        templateContent = template.assessment.commonDiagnoses.map((dx, i) =>
          `${i + 1}. ${dx}`
        ).join('\n');
        break;
      case 'plan':
        templateContent = [
          'Treatment:',
          ...template.plan.treatments.map(t => `• ${t}`),
          '\nFollow-up:',
          ...template.plan.followUp.map(f => `• ${f}`),
          '\nPatient Education:',
          ...template.plan.patientEducation.map(e => `• ${e}`)
        ].join('\n');
        break;
    }

    setSoapData(prev => ({
      ...prev,
      [currentSection.key]: templateContent
    }));

    toast.success(`Applied ${selectedEncounterTemplate.name} template to ${currentSection.title}`);
  }, [selectedEncounterTemplate, currentStep]);

  const handleVoiceRecording = useCallback(() => {
    setIsVoiceRecording(!isVoiceRecording);
    if (!isVoiceRecording) {
      toast.info("Voice recording started");
      // TODO: Implement voice-to-text
    } else {
      toast.info("Voice recording stopped");
    }
  }, [isVoiceRecording]);

  const handleNext = useCallback(() => {
    if (currentStep < SOAP_SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSave = useCallback(() => {
    onSave?.(soapData);
    toast.success("SOAP notes saved successfully");
  }, [soapData, onSave]);

  const handleComplete = useCallback(() => {
    onComplete?.(soapData);
    toast.success("Encounter completed successfully");
  }, [soapData, onComplete]);

  // Advanced mode handlers
  const handleAssessmentUpdate = useCallback((assessment: string) => {
    setSoapData(prev => ({ ...prev, assessment }));
  }, []);

  const handleFindingsUpdate = useCallback((findings: any[]) => {
    setPhysicalFindings(findings);
    const findingsText = findings.map(finding =>
      `${finding.system}: ${finding.finding}`
    ).join('\n');
    setSoapData(prev => ({ ...prev, objective: findingsText }));
  }, []);

  const handleVitalSignsUpdate = useCallback((vitals: any) => {
    setVitalSigns(vitals);
    const vitalsText = Object.entries(vitals)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    if (vitalsText) {
      setSoapData(prev => ({
        ...prev,
        objective: prev.objective ? `${vitalsText}\n${prev.objective}` : vitalsText
      }));
    }
  }, []);

  const handleDiagnosisAdd = useCallback((diagnosis: any) => {
    setSelectedDiagnoses(prev => [...prev, diagnosis]);
    const diagnosisText = `${diagnosis.name} (${diagnosis.code})`;
    setSoapData(prev => ({
      ...prev,
      assessment: prev.assessment ? `${prev.assessment}\n${diagnosisText}` : diagnosisText
    }));
  }, []);

  const handleEncounterDataChange = useCallback((data: any) => {
    setEncounterData(data);
    setSoapData({
      subjective: data.subjective,
      objective: data.objective,
      assessment: data.assessment,
      plan: data.plan
    });
    setSelectedDiagnoses(data.diagnoses);
    setSelectedProcedures(data.procedures);
  }, []);

  const isCurrentSectionComplete = soapData[currentSection.key].trim().length > 0;
  const allSectionsComplete = Object.values(soapData).every(value => value.trim().length > 0);

  // Mock patient and provider info for document generation
  const mockPatientInfo = {
    id: patientContext?.name || '',
    name: patientContext?.name || '',
    dateOfBirth: '1980-01-01',
    gender: patientContext?.gender || 'Unknown',
    mrn: 'MRN123456'
  };

  const mockProviderInfo = {
    name: 'Dr. Sarah Johnson',
    title: 'Family Medicine Physician',
    npi: '1234567890',
    address: '123 Medical Center Dr, Healthcare City, HC 12345',
    phone: '(555) 123-4567'
  };

  return (
    <AutoSaveEncounterManager
      patientId={patientContext?.name || ''}
      providerId="dr-001"
      appointmentId={appointment?.id}
      encounterData={encounterData}
      onDataChange={handleEncounterDataChange}
    >
      <div className="space-y-6">
        {/* Header with Patient Context */}
        {patientContext && (
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {patientContext.name} • {patientContext.age}y • {patientContext.gender}
                  </h3>
                  <p className="text-blue-700">{patientContext.chiefComplaint}</p>
                </div>
                <div className="text-right text-sm text-blue-600">
                  <p>Allergies: {patientContext.allergies.join(', ') || 'NKDA'}</p>
                  <p>Current Meds: {patientContext.medications.length} active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress and Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">SOAP Documentation</h2>
              <Badge variant="outline" className="text-sm">
                Step {currentStep + 1} of {SOAP_SECTIONS.length}
              </Badge>
            </div>
            <Progress value={progress} className="mb-4" />

            {/* Template Selection */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Label className="text-sm font-medium">Template:</Label>
              <Select
                value={selectedEncounterTemplate?.id || 'none'}
                onValueChange={(value) => {
                  if (value === "none") {
                    setSelectedEncounterTemplate(null);
                  } else {
                    const template = getTemplateById(value);
                    setSelectedEncounterTemplate(template || null);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Template</SelectItem>
                  {ENCOUNTER_TEMPLATES.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{template.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.specialty}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedEncounterTemplate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyTemplateToCurrentSection}
                  className="text-xs"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Apply Template
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current SOAP Section */}
        <Card className="min-h-[500px]">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <currentSection.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentSection.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentSection.subtitle}</p>
              </div>
              {isCurrentSectionComplete && (
                <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Mode Toggle and Voice Recording */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Documentation Mode:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={!useAdvancedMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseAdvancedMode(false)}
                      className="text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Simple
                    </Button>
                    <Button
                      variant={useAdvancedMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseAdvancedMode(true)}
                      className="text-xs"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Advanced
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleVoiceRecording}
                className={`text-xs ${isVoiceRecording ? 'text-red-600 bg-red-50' : ''}`}
              >
                <Mic className="w-3 h-3 mr-1" />
                {isVoiceRecording ? 'Stop Recording' : 'Voice Input'}
              </Button>
            </div>

            {/* Quick Actions - Only show in simple mode */}
            {!useAdvancedMode && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Quick Actions:</Label>
                <div className="flex flex-wrap gap-2">
                  {getTemplateQuickActions(currentSection.key, selectedEncounterTemplate).map((action, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAction(action)}
                      className="text-xs h-7 px-2 border border-dashed hover:bg-blue-50"
                    >
                      {action}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Assessment Builder for Assessment Section */}
            {useAdvancedMode && currentSection.key === 'assessment' && (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-hidden">
                  <UnifiedDiagnosisManager
                    selectedDiagnoses={selectedDiagnoses}
                    patientId={patientContext?.name || ''}
                    encounterId="current-encounter"
                    mode="encounter"
                    specialty="General"
                    onDiagnosisChange={setSelectedDiagnoses}
                  />
                </div>
                <AdvancedAssessmentBuilder
                  symptoms={symptoms}
                  physicalFindings={physicalFindings}
                  patientContext={patientContext}
                  onDiagnosisAdd={handleDiagnosisAdd}
                  onAssessmentUpdate={handleAssessmentUpdate}
                  currentAssessment={soapData.assessment}
                />
              </div>
            )}

            {/* Advanced Findings Builder for Objective Section */}
            {useAdvancedMode && currentSection.key === 'objective' && (
              <ClinicalFindingsBuilder
                initialFindings={physicalFindings}
                vitals={vitalSigns}
                onFindingsUpdate={handleFindingsUpdate}
                onVitalsUpdate={handleVitalSignsUpdate}
              />
            )}

            {/* Template-specific billing codes */}
            {selectedEncounterTemplate && currentSection.key === 'plan' && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-sm font-medium text-green-800">Suggested Billing Codes:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedEncounterTemplate.billingCodes.commonCPT.map(code => (
                    <Badge key={code} variant="outline" className="text-xs bg-green-100 text-green-700">
                      CPT: {code}
                    </Badge>
                  ))}
                  {selectedEncounterTemplate.billingCodes.commonICD10.map(code => (
                    <Badge key={code} variant="outline" className="text-xs bg-blue-100 text-blue-700">
                      ICD-10: {code}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Simple Text Area for Basic Mode or Other Sections */}
            {(!useAdvancedMode || (currentSection.key !== 'assessment' && currentSection.key !== 'objective')) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="soap-text" className="text-sm font-medium">
                    {currentSection.title} Notes
                  </Label>
                </div>

                <Textarea
                  id="soap-text"
                  placeholder={currentSection.placeholder}
                  value={soapData[currentSection.key]}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="min-h-[200px] text-sm leading-relaxed"
                  autoFocus
                />
              </div>
            )}

            {/* Character count and additional info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{soapData[currentSection.key].length} characters</span>
              <div className="flex items-center gap-4">
                {useAdvancedMode && (currentSection.key === 'assessment' || currentSection.key === 'objective') && (
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI-Enhanced
                  </Badge>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Auto-saving enabled
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>

                {currentStep < SOAP_SECTIONS.length - 1 ? (
                  <Button
                    onClick={handleNext}
                    disabled={!isCurrentSectionComplete}
                    size="sm"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleComplete}
                    disabled={!allSectionsComplete}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete Encounter
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSave} size="sm">
                  <Save className="w-4 h-4 mr-1" />
                  Save Draft
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary View for Review */}
        {currentStep === SOAP_SECTIONS.length - 1 && (
          <div className="space-y-6">
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg">Documentation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {SOAP_SECTIONS.map((section) => (
                  <div key={section.key} className="space-y-1">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <section.icon className="w-4 h-4" />
                      {section.title}
                    </Label>
                    <div className="text-sm bg-white p-3 rounded border">
                      {soapData[section.key] || 'No content added'}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Smart CPT Suggestions */}
            <SmartCPTSuggestions
              diagnoses={selectedDiagnoses}
              encounterType="office-visit"
              specialty="family-medicine"
              patientAge={patientContext?.age}
              patientGender={patientContext?.gender}
              onCPTSelect={(cpt) => {
                setSelectedProcedures(prev => [...prev, cpt]);
                toast.success(`Added CPT ${cpt.code} to procedures`);
              }}
              selectedCPTs={selectedProcedures}
            />

            {/* Advanced Document Generator */}
            <AdvancedDocumentGenerator
              encounterData={{
                ...encounterData,
                id: encounterData.id || 'temp-encounter',
                createdAt: new Date(),
                updatedAt: new Date()
              }}
              patientInfo={mockPatientInfo}
              providerInfo={mockProviderInfo}
              onDocumentGenerated={(type, data) => {
                toast.success(`${type} document generated successfully`);
              }}
            />
          </div>
        )}
      </div>
    </AutoSaveEncounterManager>
  );
};

export default StreamlinedSoapInterface;