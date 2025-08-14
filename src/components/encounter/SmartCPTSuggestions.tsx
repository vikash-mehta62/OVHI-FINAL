import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DollarSign, Plus, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CPTCode {
  code: string;
  description: string;
  category: string;
  baseRVU: number;
  estimatedReimbursement: number;
  complexity: 'low' | 'moderate' | 'high';
  requirements?: string[];
  modifiers?: string[];
}

interface SmartCPTSuggestionsProps {
  diagnoses: any[];
  encounterType: string;
  specialty: string;
  patientAge?: number;
  patientGender?: string;
  onCPTSelect: (cpt: CPTCode) => void;
  selectedCPTs: CPTCode[];
}

// Mock CPT code database
const CPT_CODES: CPTCode[] = [
  // Office Visits
  {
    code: '99213',
    description: 'Office visit, established patient, moderate complexity',
    category: 'Office Visits',
    baseRVU: 1.3,
    estimatedReimbursement: 109,
    complexity: 'moderate',
    requirements: ['Detailed history', 'Detailed exam', 'Low complexity decision making']
  },
  {
    code: '99214',
    description: 'Office visit, established patient, high complexity',
    category: 'Office Visits',
    baseRVU: 1.92,
    estimatedReimbursement: 161,
    complexity: 'high',
    requirements: ['Comprehensive history', 'Comprehensive exam', 'Moderate complexity decision making']
  },
  {
    code: '99212',
    description: 'Office visit, established patient, low complexity',
    category: 'Office Visits',
    baseRVU: 0.7,
    estimatedReimbursement: 58,
    complexity: 'low',
    requirements: ['Problem focused history', 'Problem focused exam', 'Straightforward decision making']
  },
  {
    code: '99215',
    description: 'Office visit, established patient, very high complexity',
    category: 'Office Visits',
    baseRVU: 2.8,
    estimatedReimbursement: 235,
    complexity: 'high',
    requirements: ['Comprehensive history', 'Comprehensive exam', 'High complexity decision making']
  },
  
  // New Patient Visits
  {
    code: '99203',
    description: 'Office visit, new patient, moderate complexity',
    category: 'New Patient',
    baseRVU: 2.17,
    estimatedReimbursement: 182,
    complexity: 'moderate',
    requirements: ['Detailed history', 'Detailed exam', 'Low complexity decision making']
  },
  {
    code: '99204',
    description: 'Office visit, new patient, high complexity',
    category: 'New Patient',
    baseRVU: 3.17,
    estimatedReimbursement: 266,
    complexity: 'high',
    requirements: ['Comprehensive history', 'Comprehensive exam', 'Moderate complexity decision making']
  },
  
  // Preventive Care
  {
    code: '99395',
    description: 'Preventive visit, established patient, 18-39 years',
    category: 'Preventive',
    baseRVU: 2.14,
    estimatedReimbursement: 179,
    complexity: 'moderate',
    requirements: ['Age 18-39', 'Comprehensive preventive exam']
  },
  {
    code: '99396',
    description: 'Preventive visit, established patient, 40-64 years',
    category: 'Preventive',
    baseRVU: 2.46,
    estimatedReimbursement: 206,
    complexity: 'moderate',
    requirements: ['Age 40-64', 'Comprehensive preventive exam']
  },
  {
    code: '99397',
    description: 'Preventive visit, established patient, 65+ years',
    category: 'Preventive',
    baseRVU: 2.46,
    estimatedReimbursement: 206,
    complexity: 'moderate',
    requirements: ['Age 65+', 'Comprehensive preventive exam']
  },
  
  // Procedures
  {
    code: '93000',
    description: 'Electrocardiogram, routine ECG with interpretation',
    category: 'Diagnostic',
    baseRVU: 0.17,
    estimatedReimbursement: 14,
    complexity: 'low',
    requirements: ['ECG performed and interpreted']
  },
  {
    code: '11100',
    description: 'Biopsy of skin, single lesion',
    category: 'Procedures',
    baseRVU: 1.37,
    estimatedReimbursement: 115,
    complexity: 'moderate',
    requirements: ['Skin biopsy performed', 'Pathology specimen obtained']
  },
  {
    code: '20610',
    description: 'Arthrocentesis, aspiration and/or injection, major joint',
    category: 'Procedures',
    baseRVU: 1.94,
    estimatedReimbursement: 163,
    complexity: 'moderate',
    requirements: ['Joint injection/aspiration performed']
  }
];

const SmartCPTSuggestions: React.FC<SmartCPTSuggestionsProps> = ({
  diagnoses,
  encounterType,
  specialty,
  patientAge,
  patientGender,
  onCPTSelect,
  selectedCPTs
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Smart CPT suggestions based on context
  const suggestedCPTs = useMemo(() => {
    let suggestions = [...CPT_CODES];

    // Filter by encounter type
    if (encounterType === 'annual') {
      suggestions = suggestions.filter(cpt => 
        cpt.category === 'Preventive' || cpt.code.startsWith('993')
      );
    } else if (encounterType === 'acute') {
      suggestions = suggestions.filter(cpt => 
        cpt.category === 'Office Visits' || cpt.category === 'Diagnostic'
      );
    }

    // Filter by patient age for preventive visits
    if (patientAge && encounterType === 'annual') {
      if (patientAge >= 18 && patientAge <= 39) {
        suggestions = suggestions.filter(cpt => 
          !cpt.requirements?.some(req => req.includes('Age')) || 
          cpt.requirements?.some(req => req.includes('18-39'))
        );
      } else if (patientAge >= 40 && patientAge <= 64) {
        suggestions = suggestions.filter(cpt => 
          !cpt.requirements?.some(req => req.includes('Age')) || 
          cpt.requirements?.some(req => req.includes('40-64'))
        );
      } else if (patientAge >= 65) {
        suggestions = suggestions.filter(cpt => 
          !cpt.requirements?.some(req => req.includes('Age')) || 
          cpt.requirements?.some(req => req.includes('65+'))
        );
      }
    }

    // Sort by relevance and reimbursement
    suggestions.sort((a, b) => {
      // Prioritize by category relevance, then by reimbursement
      const categoryPriority = {
        'Office Visits': 1,
        'New Patient': 2,
        'Preventive': 3,
        'Diagnostic': 4,
        'Procedures': 5
      };
      
      const aPriority = categoryPriority[a.category] || 6;
      const bPriority = categoryPriority[b.category] || 6;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return b.estimatedReimbursement - a.estimatedReimbursement;
    });

    return suggestions;
  }, [encounterType, patientAge, specialty]);

  // Filter by selected category
  const filteredCPTs = useMemo(() => {
    if (selectedCategory === 'all') {
      return suggestedCPTs;
    }
    return suggestedCPTs.filter(cpt => cpt.category === selectedCategory);
  }, [suggestedCPTs, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(suggestedCPTs.map(cpt => cpt.category))];
    return ['all', ...cats];
  }, [suggestedCPTs]);

  const handleCPTSelect = useCallback((cpt: CPTCode) => {
    if (selectedCPTs.find(selected => selected.code === cpt.code)) {
      toast.info('CPT code already selected');
      return;
    }
    onCPTSelect(cpt);
  }, [selectedCPTs, onCPTSelect]);

  const totalEstimatedReimbursement = useMemo(() => {
    return selectedCPTs.reduce((total, cpt) => total + cpt.estimatedReimbursement, 0);
  }, [selectedCPTs]);

  const totalRVUs = useMemo(() => {
    return selectedCPTs.reduce((total, cpt) => total + cpt.baseRVU, 0);
  }, [selectedCPTs]);

  return (
    <div className="space-y-4">
      {/* Selected CPTs Summary */}
      {selectedCPTs.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-green-800">
              <Check className="w-4 h-4" />
              Selected CPT Codes ({selectedCPTs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedCPTs.map((cpt) => (
                <div key={cpt.code} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {cpt.code}
                      </Badge>
                      <span className="text-sm font-medium">{cpt.description}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {cpt.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        RVU: {cpt.baseRVU}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-700">
                      ${cpt.estimatedReimbursement}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Totals */}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span>Total RVUs: {totalRVUs.toFixed(2)}</span>
                  <span className="text-green-700">
                    Estimated Total: ${totalEstimatedReimbursement}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CPT Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4" />
            Smart CPT Code Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="text-xs"
                >
                  {category === 'all' ? 'All Categories' : category}
                </Button>
              ))}
            </div>

            {/* CPT Code List */}
            <ScrollArea className="h-[400px] w-full">
              <div className="space-y-2">
                {filteredCPTs.map((cpt) => {
                  const isSelected = selectedCPTs.find(selected => selected.code === cpt.code);
                  const meetsRequirements = true; // Simplified - in real app, check against encounter data
                  
                  return (
                    <div
                      key={cpt.code}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-green-50 border-green-200' 
                          : meetsRequirements
                            ? 'hover:bg-blue-50 border-gray-200'
                            : 'bg-gray-50 border-gray-200 opacity-60'
                      }`}
                      onClick={() => meetsRequirements && !isSelected && handleCPTSelect(cpt)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {cpt.code}
                            </Badge>
                            <Badge variant={
                              cpt.complexity === 'high' ? 'destructive' :
                              cpt.complexity === 'moderate' ? 'default' : 'secondary'
                            } className="text-xs">
                              {cpt.complexity}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {cpt.category}
                            </Badge>
                          </div>
                          
                          <h4 className="text-sm font-medium mb-1">{cpt.description}</h4>
                          
                          {cpt.requirements && (
                            <div className="text-xs text-muted-foreground">
                              Requirements: {cpt.requirements.join(', ')}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>RVU: {cpt.baseRVU}</span>
                            <span>Est. Reimbursement: ${cpt.estimatedReimbursement}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {!meetsRequirements && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs">Requirements not met</span>
                            </div>
                          )}
                          
                          {isSelected ? (
                            <Badge variant="default" className="text-xs">
                              <Check className="w-3 h-3 mr-1" />
                              Selected
                            </Badge>
                          ) : meetsRequirements ? (
                            <Button variant="ghost" size="sm" className="h-6 px-2">
                              <Plus className="w-3 h-3" />
                            </Button>
                          ) : null}
                        </div>
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

export default SmartCPTSuggestions;