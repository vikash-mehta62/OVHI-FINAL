import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Stethoscope } from "lucide-react";
import { toast } from "sonner";

interface Diagnosis {
  id: string;
  code: string;
  name: string;
  category: string;
  severity?: 'mild' | 'moderate' | 'severe';
  status?: 'active' | 'resolved' | 'chronic';
}

interface UnifiedDiagnosisManagerProps {
  selectedDiagnoses: Diagnosis[];
  patientId: string;
  encounterId: string;
  mode: 'encounter' | 'patient';
  specialty: string;
  onDiagnosisChange: (diagnoses: Diagnosis[]) => void;
}

// Mock diagnosis database
const COMMON_DIAGNOSES: Diagnosis[] = [
  { id: '1', code: 'I10', name: 'Essential hypertension', category: 'Cardiovascular' },
  { id: '2', code: 'E11.9', name: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
  { id: '3', code: 'J06.9', name: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' },
  { id: '4', code: 'M79.3', name: 'Panniculitis, unspecified', category: 'Musculoskeletal' },
  { id: '5', code: 'F32.9', name: 'Major depressive disorder, single episode, unspecified', category: 'Mental Health' },
  { id: '6', code: 'Z00.00', name: 'Encounter for general adult medical examination without abnormal findings', category: 'Preventive' },
  { id: '7', code: 'K21.9', name: 'Gastro-esophageal reflux disease without esophagitis', category: 'Digestive' },
  { id: '8', code: 'M25.50', name: 'Pain in unspecified joint', category: 'Musculoskeletal' },
  { id: '9', code: 'R50.9', name: 'Fever, unspecified', category: 'Symptoms' },
  { id: '10', code: 'Z51.11', name: 'Encounter for antineoplastic chemotherapy', category: 'Treatment' }
];

export const UnifiedDiagnosisManager: React.FC<UnifiedDiagnosisManagerProps> = ({
  selectedDiagnoses,
  patientId,
  encounterId,
  mode,
  specialty,
  onDiagnosisChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDiagnoses, setFilteredDiagnoses] = useState(COMMON_DIAGNOSES);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredDiagnoses(COMMON_DIAGNOSES);
    } else {
      const filtered = COMMON_DIAGNOSES.filter(diagnosis =>
        diagnosis.name.toLowerCase().includes(term.toLowerCase()) ||
        diagnosis.code.toLowerCase().includes(term.toLowerCase()) ||
        diagnosis.category.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredDiagnoses(filtered);
    }
  }, []);

  const handleAddDiagnosis = useCallback((diagnosis: Diagnosis) => {
    if (!selectedDiagnoses.find(d => d.id === diagnosis.id)) {
      const newDiagnoses = [...selectedDiagnoses, { ...diagnosis, status: 'active' }];
      onDiagnosisChange(newDiagnoses);
      toast.success(`Added diagnosis: ${diagnosis.name}`);
    } else {
      toast.info('Diagnosis already selected');
    }
  }, [selectedDiagnoses, onDiagnosisChange]);

  const handleRemoveDiagnosis = useCallback((diagnosisId: string) => {
    const newDiagnoses = selectedDiagnoses.filter(d => d.id !== diagnosisId);
    onDiagnosisChange(newDiagnoses);
    toast.success('Diagnosis removed');
  }, [selectedDiagnoses, onDiagnosisChange]);

  const handleStatusChange = useCallback((diagnosisId: string, status: 'active' | 'resolved' | 'chronic') => {
    const newDiagnoses = selectedDiagnoses.map(d =>
      d.id === diagnosisId ? { ...d, status } : d
    );
    onDiagnosisChange(newDiagnoses);
  }, [selectedDiagnoses, onDiagnosisChange]);

  return (
    <div className="space-y-4">
      {/* Selected Diagnoses */}
      {selectedDiagnoses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Stethoscope className="w-4 h-4" />
              Selected Diagnoses ({selectedDiagnoses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedDiagnoses.map((diagnosis) => (
                <div key={diagnosis.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {diagnosis.code}
                      </Badge>
                      <span className="text-sm font-medium">{diagnosis.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {diagnosis.category}
                      </Badge>
                      <select
                        value={diagnosis.status || 'active'}
                        onChange={(e) => handleStatusChange(diagnosis.id, e.target.value as any)}
                        className="text-xs border rounded px-1 py-0.5"
                      >
                        <option value="active">Active</option>
                        <option value="chronic">Chronic</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDiagnosis(diagnosis.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Add Diagnoses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Add Diagnosis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search diagnoses by name, code, or category..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Available Diagnoses */}
            <ScrollArea className="h-[200px] w-full">
              <div className="space-y-2">
                {filteredDiagnoses.map((diagnosis) => {
                  const isSelected = selectedDiagnoses.find(d => d.id === diagnosis.id);
                  return (
                    <div
                      key={diagnosis.id}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-green-50 border-green-200' 
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => !isSelected && handleAddDiagnosis(diagnosis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {diagnosis.code}
                            </Badge>
                            <span className="text-sm">{diagnosis.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {diagnosis.category}
                          </Badge>
                        </div>
                        {isSelected ? (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        ) : (
                          <Button variant="ghost" size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedDiagnosisManager;