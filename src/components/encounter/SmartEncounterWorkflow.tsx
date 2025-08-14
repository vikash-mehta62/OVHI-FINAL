import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  User,
  FileText,
  Stethoscope,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Search,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import StreamlinedSoapInterface from './StreamlinedSoapInterface';
import { ENCOUNTER_TEMPLATES, getTemplatesByType, type EncounterTemplate } from './EncounterTemplates';
import { ENCOUNTER_TYPE_CONFIGS } from './EncounterTypeConfig';

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  lastVisit?: string;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
}

interface ProviderSettings {
  id: string;
  name: string;
  specialty: string;
  subSpecialties?: string[];
  allowedEncounterTypes?: string[];
  preferredTemplates?: string[];
}

interface EncounterWorkflowProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: any;
  onEncounterComplete?: (data: any) => void;
  providerSettings?: ProviderSettings;
}

const WORKFLOW_STAGES = [
  { id: 'setup', title: 'Encounter Setup', icon: Settings },
  { id: 'documentation', title: 'SOAP Documentation', icon: FileText },
  { id: 'review', title: 'Review & Complete', icon: CheckCircle }
];

export const SmartEncounterWorkflow: React.FC<EncounterWorkflowProps> = ({
  isOpen,
  onClose,
  appointment,
  onEncounterComplete,
  providerSettings
}) => {
  // Default provider settings
  const defaultProviderSettings: ProviderSettings = providerSettings || {
    id: 'provider-1',
    name: 'Dr. Sarah Johnson',
    specialty: 'Family Medicine',
    subSpecialties: ['Internal Medicine', 'Preventive Care'],
    allowedEncounterTypes: ['routine', 'annual', 'acute', 'telehealth', 'wellness', 'preventive'],
    preferredTemplates: ['annual-physical', 'acute-illness', 'telehealth-visit']
  };

  // State management
  const [currentStage, setCurrentStage] = useState('setup');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EncounterTemplate | null>(null);
  const [encounterType, setEncounterType] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [soapData, setSoapData] = useState<any>(null);
  const [encounterTypeSearch, setEncounterTypeSearch] = useState('');
  const [currentProviderSettings, setCurrentProviderSettings] = useState<ProviderSettings>(defaultProviderSettings);

  // Mock patient data
  const mockPatients: Patient[] = [
    {
      id: '1',
      name: 'John Doe',
      age: 45,
      gender: 'Male',
      lastVisit: '2024-01-15',
      conditions: ['Hypertension', 'Type 2 Diabetes'],
      allergies: ['Penicillin'],
      medications: ['Metformin', 'Lisinopril']
    },
    {
      id: '2',
      name: 'Jane Smith',
      age: 32,
      gender: 'Female',
      lastVisit: '2024-01-20',
      conditions: ['Asthma'],
      allergies: ['Shellfish'],
      medications: ['Albuterol']
    }
  ];

  // Auto-select first patient for testing
  useEffect(() => {
    if (!selectedPatient && mockPatients.length > 0) {
      setSelectedPatient(mockPatients[0]);
    }
  }, [selectedPatient]);

  // Specialty-based filtering logic
  const getFilteredEncounterTypes = useCallback(() => {
    if (!currentProviderSettings?.specialty) {
      return ENCOUNTER_TYPE_CONFIGS;
    }

    const specialty = currentProviderSettings.specialty.toLowerCase();
    const subSpecialties = currentProviderSettings.subSpecialties?.map(s => s.toLowerCase()) || [];

    return ENCOUNTER_TYPE_CONFIGS.filter(type => {
      // Always include general/primary care types
      if (['primary care', 'acute care', 'telehealth', 'administrative'].includes(type.category.toLowerCase())) {
        return true;
      }

      // Include specialty-specific types
      if (type.specialtySpecific) {
        const typeSpecialty = type.value.toLowerCase();
        const typeCategory = type.category.toLowerCase();

        return (
          specialty.includes(typeSpecialty) ||
          typeSpecialty.includes(specialty) ||
          typeCategory.includes(specialty) ||
          specialty.includes(typeCategory) ||
          subSpecialties.some(sub =>
            typeSpecialty.includes(sub) ||
            typeCategory.includes(sub) ||
            sub.includes(typeSpecialty) ||
            sub.includes(typeCategory)
          )
        );
      }

      // Include types that match provider's allowed encounter types
      if (currentProviderSettings.allowedEncounterTypes?.includes(type.value)) {
        return true;
      }

      return false;
    });
  }, [currentProviderSettings]);

  const getFilteredTemplates = useCallback((encounterType?: string) => {
    const baseTemplates = encounterType ? getTemplatesByType(encounterType) : ENCOUNTER_TEMPLATES;

    if (!currentProviderSettings?.specialty) {
      return baseTemplates;
    }

    const specialty = currentProviderSettings.specialty.toLowerCase();
    const subSpecialties = currentProviderSettings.subSpecialties?.map(s => s.toLowerCase()) || [];

    return baseTemplates.filter(template => {
      // Always include general templates
      if (['family medicine', 'general practice', 'primary care'].includes(template.specialty.toLowerCase())) {
        return true;
      }

      // Include templates that match provider's specialty
      const templateSpecialty = template.specialty.toLowerCase();

      if (
        specialty.includes(templateSpecialty) ||
        templateSpecialty.includes(specialty) ||
        subSpecialties.some(sub =>
          templateSpecialty.includes(sub) ||
          sub.includes(templateSpecialty)
        )
      ) {
        return true;
      }

      // Include preferred templates
      if (currentProviderSettings.preferredTemplates?.includes(template.id)) {
        return true;
      }

      return false;
    });
  }, [currentProviderSettings]);

  // Get filtered data
  const availableTemplates = getFilteredTemplates(encounterType);
  const filteredEncounterTypes = getFilteredEncounterTypes();

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, sessionStartTime]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Event handlers
  const handleStartEncounter = useCallback(() => {
    if (!selectedPatient || !encounterType) {
      toast.error("Please select a patient and encounter type");
      return;
    }

    setSessionStartTime(new Date());
    setIsTimerRunning(true);
    setCurrentStage('documentation');
    toast.success("Encounter started");
  }, [selectedPatient, encounterType]);

  const handlePauseTimer = useCallback(() => {
    setIsTimerRunning(!isTimerRunning);
    toast.info(isTimerRunning ? "Timer paused" : "Timer resumed");
  }, [isTimerRunning]);

  const handleResetTimer = useCallback(() => {
    setSessionStartTime(new Date());
    setElapsedTime(0);
    setIsTimerRunning(true);
    toast.info("Timer reset");
  }, []);

  const handleSoapSave = useCallback((data: any) => {
    setSoapData(data);
    toast.success("SOAP notes auto-saved");
  }, []);

  const handleEncounterComplete = useCallback((data: any) => {
    setIsTimerRunning(false);
    setCurrentStage('review');

    const encounterData = {
      patient: selectedPatient,
      type: encounterType,
      template: selectedTemplate,
      duration: elapsedTime,
      soapNotes: data,
      completedAt: new Date().toISOString()
    };

    onEncounterComplete?.(encounterData);
    toast.success("Encounter completed successfully");
  }, [selectedPatient, encounterType, selectedTemplate, elapsedTime, onEncounterComplete]);

  const isSetupComplete = selectedPatient && encounterType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Smart Encounter Workflow</span>
              {currentProviderSettings && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {currentProviderSettings.specialty}
                  </Badge>
                  {currentProviderSettings.subSpecialties && currentProviderSettings.subSpecialties.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      +{currentProviderSettings.subSpecialties.length} subspecialties
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Timer Display */}
            {sessionStartTime && (
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono bg-gray-100 px-3 py-1 rounded">
                  {formatTime(elapsedTime)}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handlePauseTimer}>
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleResetTimer}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Stage Progress */}
          <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
            {WORKFLOW_STAGES.map((stage, index) => (
              <div key={stage.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
                  currentStage === stage.id
                    ? 'bg-blue-100 text-blue-700'
                    : WORKFLOW_STAGES.findIndex(s => s.id === currentStage) > index
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  <stage.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{stage.title}</span>
                </div>
                {index < WORKFLOW_STAGES.length - 1 && (
                  <div className="mx-4 h-px w-8 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>

          {/* Setup Stage */}
          {currentStage === 'setup' && (
            <div className="space-y-6">
              {/* Provider Settings */}
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Settings className="w-4 h-4" />
                    Provider Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-medium">Current Specialty</Label>
                      <Select
                        value={currentProviderSettings.specialty}
                        onValueChange={(value) => {
                          const specialtyConfigs = {
                            'Family Medicine': {
                              ...currentProviderSettings,
                              specialty: 'Family Medicine',
                              subSpecialties: ['Internal Medicine', 'Preventive Care'],
                              allowedEncounterTypes: ['routine', 'annual', 'acute', 'telehealth', 'wellness', 'preventive'],
                              preferredTemplates: ['annual-physical', 'acute-illness', 'telehealth-visit']
                            },
                            'Cardiology': {
                              ...currentProviderSettings,
                              specialty: 'Cardiology',
                              subSpecialties: ['Interventional Cardiology', 'Electrophysiology'],
                              allowedEncounterTypes: ['cardiology', 'consultation', 'acute', 'telehealth'],
                              preferredTemplates: ['cardiology-consultation']
                            },
                            'Pediatrics': {
                              ...currentProviderSettings,
                              specialty: 'Pediatrics',
                              subSpecialties: ['Adolescent Medicine'],
                              allowedEncounterTypes: ['pediatric-well', 'pediatric-sick', 'immunization', 'acute'],
                              preferredTemplates: ['pediatric-well-visit']
                            },
                            'Psychiatry': {
                              ...currentProviderSettings,
                              specialty: 'Psychiatry',
                              subSpecialties: ['Child Psychiatry'],
                              allowedEncounterTypes: ['psychiatry', 'psychology', 'telehealth', 'consultation'],
                              preferredTemplates: ['psychiatric-evaluation']
                            }
                          };
                          setCurrentProviderSettings(specialtyConfigs[value] || currentProviderSettings);
                        }}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Family Medicine">Family Medicine</SelectItem>
                          <SelectItem value="Cardiology">Cardiology</SelectItem>
                          <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                          <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Available Types</Label>
                      <div className="text-xs text-muted-foreground">
                        {filteredEncounterTypes.length} encounter types
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Available Templates</Label>
                      <div className="text-xs text-muted-foreground">
                        {availableTemplates.length} templates
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Patient Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold">{selectedPatient.name}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedPatient.age}y • {selectedPatient.gender} • Last visit: {selectedPatient.lastVisit}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {selectedPatient.conditions?.map((condition) => (
                            <Badge key={condition} variant="secondary" className="text-xs">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setSelectedPatient(null)}>
                        Change Patient
                      </Button>
                    </div>
                  ) : (
                    <Select onValueChange={(value) => {
                      const patient = mockPatients.find(p => p.id === value);
                      setSelectedPatient(patient || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockPatients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} - {patient.age}y {patient.gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {/* Encounter Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Encounter Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search encounter types..."
                      value={encounterTypeSearch}
                      onChange={(e) => setEncounterTypeSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <ScrollArea className="h-[400px] w-full">
                    <div className="space-y-6 pr-4">
                      {[...new Set(filteredEncounterTypes.map(type => type.category))]
                        .map(category => ({
                          category,
                          types: filteredEncounterTypes
                            .filter(type => type.category === category)
                            .filter(type =>
                              encounterTypeSearch === '' ||
                              type.label.toLowerCase().includes(encounterTypeSearch.toLowerCase()) ||
                              type.description.toLowerCase().includes(encounterTypeSearch.toLowerCase()) ||
                              type.category.toLowerCase().includes(encounterTypeSearch.toLowerCase())
                            )
                        }))
                        .filter(({ types }) => types.length > 0)
                        .map(({ category, types }) => (
                          <div key={category} className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-700 border-b pb-1">
                              {category}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {types.map((type) => (
                                <div
                                  key={type.value}
                                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                    encounterType === type.value
                                      ? 'border-blue-500 bg-blue-50 shadow-md'
                                      : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                  onClick={() => setEncounterType(type.value)}
                                  title={type.description}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-md ${
                                      encounterType === type.value ? 'bg-blue-100' : 'bg-gray-100'
                                    }`}>
                                      <type.icon className={`w-4 h-4 ${
                                        encounterType === type.value ? 'text-blue-600' : 'text-gray-600'
                                      }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-medium text-sm leading-tight">{type.label}</h3>
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{type.description}</p>
                                      <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Clock className="w-3 h-3" />
                                          <span>{type.time}min</span>
                                        </div>
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          type.complexity === 'high' ? 'bg-red-100 text-red-700' :
                                          type.complexity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-green-100 text-green-700'
                                        }`}>
                                          {type.complexity}
                                        </div>
                                        {type.specialtySpecific && (
                                          <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                            Specialty
                                          </div>
                                        )}
                                      </div>
                                      {type.suggestedCPTCodes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {type.suggestedCPTCodes.slice(0, 2).map(code => (
                                            <Badge key={code} variant="outline" className="text-xs">
                                              {code}
                                            </Badge>
                                          ))}
                                          {type.suggestedCPTCodes.length > 2 && (
                                            <Badge variant="outline" className="text-xs">
                                              +{type.suggestedCPTCodes.length - 2}
                                            </Badge>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Template Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Documentation Template (Optional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Select onValueChange={(value) => {
                      const template = availableTemplates.find(t => t.id === value);
                      setSelectedTemplate(template || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template or start blank" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{template.name}</span>
                              <div className="flex items-center gap-2 ml-4">
                                <Badge variant="outline" className="text-xs">
                                  {template.specialty}
                                </Badge>
                                <Badge variant={
                                  template.complexity === 'high' ? 'destructive' :
                                  template.complexity === 'moderate' ? 'default' : 'secondary'
                                } className="text-xs">
                                  {template.complexity}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {template.estimatedTime}min
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectedTemplate && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-blue-900">{selectedTemplate.name}</h4>
                          <Badge variant="secondary">{selectedTemplate.specialty}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-blue-700">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Estimated: {selectedTemplate.estimatedTime} minutes</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>Type: {selectedTemplate.type}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Start Encounter Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleStartEncounter}
                  disabled={!isSetupComplete}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Start Encounter
                </Button>
              </div>
            </div>
          )}

          {/* Documentation Stage */}
          {currentStage === 'documentation' && (
            <div className="space-y-6">
              <StreamlinedSoapInterface
                appointment={appointment}
                patientContext={{
                  name: selectedPatient?.name || '',
                  age: selectedPatient?.age || 0,
                  gender: selectedPatient?.gender || '',
                  chiefComplaint: 'Follow-up visit',
                  vitals: {},
                  allergies: selectedPatient?.allergies || [],
                  medications: selectedPatient?.medications || [],
                  medicalHistory: [],
                  conditions: selectedPatient?.conditions || []
                }}
                onSave={handleSoapSave}
                onComplete={handleEncounterComplete}
              />
            </div>
          )}

          {/* Review Stage */}
          {currentStage === 'review' && (
            <div className="space-y-6">
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    Encounter Completed Successfully
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="font-medium">Patient:</Label>
                        <p>{selectedPatient?.name}</p>
                      </div>
                      <div>
                        <Label className="font-medium">Encounter Type:</Label>
                        <p>{filteredEncounterTypes.find(t => t.value === encounterType)?.label}</p>
                      </div>
                      <div>
                        <Label className="font-medium">Duration:</Label>
                        <p>{formatTime(elapsedTime)}</p>
                      </div>
                      <div>
                        <Label className="font-medium">Template Used:</Label>
                        <p>{selectedTemplate?.name || 'None'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={onClose} className="flex-1">
                        Close Encounter
                      </Button>
                      <Button variant="outline" onClick={() => setCurrentStage('setup')}>
                        Start New Encounter
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartEncounterWorkflow;