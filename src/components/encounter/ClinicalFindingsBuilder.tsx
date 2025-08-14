import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, Heart, Thermometer, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface VitalSigns {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  weight: string;
  height: string;
  bmi: string;
}

interface PhysicalExamFinding {
  id: string;
  system: string;
  finding: string;
  normal: boolean;
  severity?: 'mild' | 'moderate' | 'severe';
  notes?: string;
}

interface ClinicalFindingsBuilderProps {
  initialFindings?: PhysicalExamFinding[];
  vitals?: Partial<VitalSigns>;
  onFindingsUpdate: (findings: PhysicalExamFinding[]) => void;
  onVitalsUpdate: (vitals: Partial<VitalSigns>) => void;
}

const BODY_SYSTEMS = [
  'General',
  'HEENT',
  'Cardiovascular',
  'Respiratory',
  'Abdominal',
  'Musculoskeletal',
  'Neurological',
  'Skin',
  'Psychiatric',
  'Genitourinary'
];

const COMMON_FINDINGS = {
  'General': [
    'Well-appearing, no acute distress',
    'Alert and oriented x3',
    'Appears ill',
    'Diaphoretic',
    'Pale'
  ],
  'HEENT': [
    'Normocephalic, atraumatic',
    'PERRLA',
    'TMs clear bilaterally',
    'Throat erythematous',
    'Lymphadenopathy present'
  ],
  'Cardiovascular': [
    'Regular rate and rhythm',
    'No murmurs, rubs, or gallops',
    'Systolic murmur present',
    'Irregular rhythm',
    'Peripheral edema'
  ],
  'Respiratory': [
    'Clear to auscultation bilaterally',
    'Wheezes present',
    'Crackles at bases',
    'Diminished breath sounds',
    'Respiratory distress'
  ],
  'Abdominal': [
    'Soft, non-tender, non-distended',
    'Bowel sounds present',
    'Tenderness in RLQ',
    'Hepatomegaly',
    'Guarding present'
  ],
  'Musculoskeletal': [
    'Full range of motion',
    'No deformities',
    'Joint swelling present',
    'Muscle weakness',
    'Gait abnormality'
  ],
  'Neurological': [
    'Grossly intact',
    'Reflexes 2+ bilaterally',
    'Focal weakness present',
    'Sensory deficit',
    'Altered mental status'
  ],
  'Skin': [
    'Warm, dry, intact',
    'No rashes or lesions',
    'Rash present',
    'Wound noted',
    'Cyanosis'
  ]
};

export const ClinicalFindingsBuilder: React.FC<ClinicalFindingsBuilderProps> = ({
  initialFindings = [],
  vitals = {},
  onFindingsUpdate,
  onVitalsUpdate
}) => {
  const [findings, setFindings] = useState<PhysicalExamFinding[]>(initialFindings);
  const [currentVitals, setCurrentVitals] = useState<Partial<VitalSigns>>(vitals);
  const [selectedSystem, setSelectedSystem] = useState('');
  const [customFinding, setCustomFinding] = useState('');

  const handleVitalChange = useCallback((key: keyof VitalSigns, value: string) => {
    const updatedVitals = { ...currentVitals, [key]: value };
    
    // Auto-calculate BMI if height and weight are provided
    if (key === 'height' || key === 'weight') {
      const height = key === 'height' ? parseFloat(value) : parseFloat(updatedVitals.height || '0');
      const weight = key === 'weight' ? parseFloat(value) : parseFloat(updatedVitals.weight || '0');
      
      if (height > 0 && weight > 0) {
        const heightInMeters = height * 0.0254; // Convert inches to meters
        const bmi = (weight * 0.453592) / (heightInMeters * heightInMeters); // Convert lbs to kg and calculate BMI
        updatedVitals.bmi = bmi.toFixed(1);
      }
    }
    
    setCurrentVitals(updatedVitals);
    onVitalsUpdate(updatedVitals);
  }, [currentVitals, onVitalsUpdate]);

  const addFinding = useCallback((system: string, finding: string, isNormal: boolean = true) => {
    const newFinding: PhysicalExamFinding = {
      id: Date.now().toString(),
      system,
      finding,
      normal: isNormal,
      severity: isNormal ? undefined : 'mild'
    };
    
    const updatedFindings = [...findings, newFinding];
    setFindings(updatedFindings);
    onFindingsUpdate(updatedFindings);
    toast.success(`Added ${system} finding`);
  }, [findings, onFindingsUpdate]);

  const removeFinding = useCallback((findingId: string) => {
    const updatedFindings = findings.filter(f => f.id !== findingId);
    setFindings(updatedFindings);
    onFindingsUpdate(updatedFindings);
    toast.success('Finding removed');
  }, [findings, onFindingsUpdate]);

  const updateFindingSeverity = useCallback((findingId: string, severity: 'mild' | 'moderate' | 'severe') => {
    const updatedFindings = findings.map(f =>
      f.id === findingId ? { ...f, severity } : f
    );
    setFindings(updatedFindings);
    onFindingsUpdate(updatedFindings);
  }, [findings, onFindingsUpdate]);

  const addCustomFinding = useCallback(() => {
    if (selectedSystem && customFinding.trim()) {
      addFinding(selectedSystem, customFinding.trim(), false);
      setCustomFinding('');
    } else {
      toast.error('Please select a system and enter a finding');
    }
  }, [selectedSystem, customFinding, addFinding]);

  const generateObjectiveText = useCallback(() => {
    let objectiveText = '';
    
    // Add vital signs
    const vitalEntries = Object.entries(currentVitals).filter(([_, value]) => value);
    if (vitalEntries.length > 0) {
      objectiveText += 'Vital Signs:\n';
      vitalEntries.forEach(([key, value]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        objectiveText += `${label}: ${value}\n`;
      });
      objectiveText += '\n';
    }
    
    // Add physical exam findings by system
    BODY_SYSTEMS.forEach(system => {
      const systemFindings = findings.filter(f => f.system === system);
      if (systemFindings.length > 0) {
        objectiveText += `${system}:\n`;
        systemFindings.forEach(finding => {
          let findingText = `• ${finding.finding}`;
          if (!finding.normal && finding.severity) {
            findingText += ` (${finding.severity})`;
          }
          objectiveText += `${findingText}\n`;
        });
        objectiveText += '\n';
      }
    });
    
    return objectiveText;
  }, [currentVitals, findings]);

  return (
    <div className="space-y-4">
      {/* Vital Signs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            Vital Signs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Blood Pressure</Label>
              <Input
                placeholder="120/80"
                value={currentVitals.bloodPressure || ''}
                onChange={(e) => handleVitalChange('bloodPressure', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Heart Rate</Label>
              <Input
                placeholder="72 bpm"
                value={currentVitals.heartRate || ''}
                onChange={(e) => handleVitalChange('heartRate', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Temperature</Label>
              <Input
                placeholder="98.6°F"
                value={currentVitals.temperature || ''}
                onChange={(e) => handleVitalChange('temperature', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Respiratory Rate</Label>
              <Input
                placeholder="16/min"
                value={currentVitals.respiratoryRate || ''}
                onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">O2 Saturation</Label>
              <Input
                placeholder="98%"
                value={currentVitals.oxygenSaturation || ''}
                onChange={(e) => handleVitalChange('oxygenSaturation', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Weight (lbs)</Label>
              <Input
                placeholder="150"
                value={currentVitals.weight || ''}
                onChange={(e) => handleVitalChange('weight', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Height (in)</Label>
              <Input
                placeholder="68"
                value={currentVitals.height || ''}
                onChange={(e) => handleVitalChange('height', e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">BMI</Label>
              <Input
                placeholder="Auto-calculated"
                value={currentVitals.bmi || ''}
                readOnly
                className="text-sm bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Physical Exam Findings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4" />
            Physical Examination Findings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Findings */}
          {findings.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Findings:</Label>
              {findings.map((finding) => (
                <div key={finding.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {finding.system}
                      </Badge>
                      <span className="text-sm">{finding.finding}</span>
                      {!finding.normal && (
                        <Badge variant={
                          finding.severity === 'severe' ? 'destructive' :
                          finding.severity === 'moderate' ? 'default' : 'secondary'
                        } className="text-xs">
                          {finding.severity}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!finding.normal && (
                      <Select
                        value={finding.severity || 'mild'}
                        onValueChange={(value) => updateFindingSeverity(finding.id, value as any)}
                      >
                        <SelectTrigger className="w-20 h-6 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="severe">Severe</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFinding(finding.id)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Findings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Add Findings by System:</Label>
            
            {BODY_SYSTEMS.map(system => (
              <div key={system} className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">{system}</Label>
                <div className="flex flex-wrap gap-1">
                  {COMMON_FINDINGS[system]?.map((finding, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => addFinding(system, finding, true)}
                      className="text-xs h-6 px-2"
                    >
                      {finding}
                    </Button>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Finding */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs">Custom Finding</Label>
                <div className="flex gap-2">
                  <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      {BODY_SYSTEMS.map(system => (
                        <SelectItem key={system} value={system}>
                          {system}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter custom finding..."
                    value={customFinding}
                    onChange={(e) => setCustomFinding(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={addCustomFinding} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Objective Text Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Generated Objective Text</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={generateObjectiveText()}
            readOnly
            className="min-h-[150px] text-sm bg-gray-50"
            placeholder="Objective findings will appear here as you add vital signs and physical exam findings..."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicalFindingsBuilder;