import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Brain, Lightbulb, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";

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

interface AdvancedAssessmentBuilderProps {
  symptoms: string[];
  physicalFindings: string[];
  patientContext?: PatientContext;
  onDiagnosisAdd: (diagnosis: any) => void;
  onAssessmentUpdate: (assessment: string) => void;
  currentAssessment: string;
}

// Mock clinical decision support data
const CLINICAL_GUIDELINES = [
  {
    condition: 'Hypertension',
    criteria: 'BP ≥140/90 mmHg on multiple occasions',
    recommendations: [
      'Lifestyle modifications',
      'Consider ACE inhibitor or ARB',
      'Monitor BP regularly'
    ]
  },
  {
    condition: 'Diabetes Type 2',
    criteria: 'HbA1c ≥6.5% or FPG ≥126 mg/dL',
    recommendations: [
      'Metformin as first-line therapy',
      'Lifestyle counseling',
      'Regular monitoring'
    ]
  },
  {
    condition: 'Upper Respiratory Infection',
    criteria: 'Nasal congestion, cough, sore throat',
    recommendations: [
      'Supportive care',
      'Symptomatic treatment',
      'Return if worsening'
    ]
  }
];

const DIFFERENTIAL_DIAGNOSES = [
  {
    primary: 'Chest Pain',
    differentials: [
      'Myocardial infarction',
      'Angina pectoris',
      'Gastroesophageal reflux',
      'Musculoskeletal pain',
      'Anxiety'
    ]
  },
  {
    primary: 'Shortness of Breath',
    differentials: [
      'Asthma',
      'COPD exacerbation',
      'Heart failure',
      'Pneumonia',
      'Pulmonary embolism'
    ]
  },
  {
    primary: 'Abdominal Pain',
    differentials: [
      'Appendicitis',
      'Gastroenteritis',
      'Cholecystitis',
      'Peptic ulcer disease',
      'Irritable bowel syndrome'
    ]
  }
];

export const AdvancedAssessmentBuilder: React.FC<AdvancedAssessmentBuilderProps> = ({
  symptoms,
  physicalFindings,
  patientContext,
  onDiagnosisAdd,
  onAssessmentUpdate,
  currentAssessment
}) => {
  const [selectedGuideline, setSelectedGuideline] = useState<any>(null);
  const [differentialThinking, setDifferentialThinking] = useState('');
  const [clinicalReasoning, setClinicalReasoning] = useState('');

  const generateAssessment = useCallback(() => {
    let assessment = '';
    
    // Add patient context
    if (patientContext) {
      assessment += `Patient: ${patientContext.name}, ${patientContext.age}y ${patientContext.gender}\n`;
      assessment += `Chief Complaint: ${patientContext.chiefComplaint}\n\n`;
    }

    // Add symptoms analysis
    if (symptoms.length > 0) {
      assessment += `Presenting Symptoms:\n`;
      symptoms.forEach((symptom, index) => {
        assessment += `${index + 1}. ${symptom}\n`;
      });
      assessment += '\n';
    }

    // Add physical findings
    if (physicalFindings.length > 0) {
      assessment += `Physical Examination Findings:\n`;
      physicalFindings.forEach((finding, index) => {
        assessment += `${index + 1}. ${finding}\n`;
      });
      assessment += '\n';
    }

    // Add clinical reasoning
    if (clinicalReasoning) {
      assessment += `Clinical Reasoning:\n${clinicalReasoning}\n\n`;
    }

    // Add differential diagnosis thinking
    if (differentialThinking) {
      assessment += `Differential Diagnosis Considerations:\n${differentialThinking}\n\n`;
    }

    // Add current conditions
    if (patientContext?.conditions && patientContext.conditions.length > 0) {
      assessment += `Current Conditions:\n`;
      patientContext.conditions.forEach((condition, index) => {
        assessment += `${index + 1}. ${condition}\n`;
      });
    }

    onAssessmentUpdate(assessment);
    toast.success('Assessment generated successfully');
  }, [symptoms, physicalFindings, patientContext, clinicalReasoning, differentialThinking, onAssessmentUpdate]);

  const applyGuideline = useCallback((guideline: any) => {
    setSelectedGuideline(guideline);
    const guidelineText = `${guideline.condition}:\nCriteria: ${guideline.criteria}\nRecommendations:\n${guideline.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}`;
    setClinicalReasoning(prev => prev ? `${prev}\n\n${guidelineText}` : guidelineText);
    toast.success(`Applied ${guideline.condition} guideline`);
  }, []);

  const addDifferentialDiagnosis = useCallback((differential: any) => {
    const diffText = `${differential.primary} - Consider:\n${differential.differentials.map((dx: string, i: number) => `${i + 1}. ${dx}`).join('\n')}`;
    setDifferentialThinking(prev => prev ? `${prev}\n\n${diffText}` : diffText);
    toast.success(`Added differential diagnosis for ${differential.primary}`);
  }, []);

  return (
    <div className="space-y-4">
      {/* Clinical Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="w-4 h-4" />
            Clinical Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {CLINICAL_GUIDELINES.map((guideline, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => applyGuideline(guideline)}
                className="text-xs h-auto p-2 text-left justify-start"
              >
                <div>
                  <div className="font-medium">{guideline.condition}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {guideline.criteria}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Differential Diagnosis Helper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Differential Diagnosis Helper
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {DIFFERENTIAL_DIAGNOSES.map((differential, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => addDifferentialDiagnosis(differential)}
                className="text-xs h-auto p-2 text-left justify-start"
              >
                <div>
                  <div className="font-medium">{differential.primary}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {differential.differentials.length} differentials
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinical Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4" />
            Clinical Reasoning
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Clinical Reasoning Notes</Label>
            <Textarea
              placeholder="Document your clinical reasoning, thought process, and decision-making..."
              value={clinicalReasoning}
              onChange={(e) => setClinicalReasoning(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium">Differential Diagnosis Thinking</Label>
            <Textarea
              placeholder="Consider alternative diagnoses, rule-outs, and diagnostic uncertainty..."
              value={differentialThinking}
              onChange={(e) => setDifferentialThinking(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient Context Summary */}
      {patientContext && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-sm text-blue-800">Patient Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="font-medium">Demographics:</Label>
                <p>{patientContext.age}y {patientContext.gender}</p>
              </div>
              <div>
                <Label className="font-medium">Chief Complaint:</Label>
                <p>{patientContext.chiefComplaint}</p>
              </div>
              <div>
                <Label className="font-medium">Allergies:</Label>
                <p>{patientContext.allergies.join(', ') || 'NKDA'}</p>
              </div>
              <div>
                <Label className="font-medium">Current Conditions:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {patientContext.conditions.map((condition, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {condition}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generate Assessment Button */}
      <div className="flex justify-center">
        <Button onClick={generateAssessment} className="bg-blue-600 hover:bg-blue-700">
          <Brain className="w-4 h-4 mr-2" />
          Generate Comprehensive Assessment
        </Button>
      </div>

      {/* Current Assessment Preview */}
      {currentAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm bg-gray-50 p-3 rounded border max-h-[200px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">
                {currentAssessment}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedAssessmentBuilder;