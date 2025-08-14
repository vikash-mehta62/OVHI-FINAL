import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  Save,
  Sparkles,
  Brain,
  Wand2,
  Plus,
  X,
  Eye,
  Share,
  Lock,
  Users,
  Tag,
  FileText,
  Stethoscope,
  DollarSign,
  Lightbulb,
  Zap,
  Settings
} from 'lucide-react';

interface SmartTemplateBuilderProps {
  initialTemplate?: any;
  onSave: (template: any) => void;
  onCancel: () => void;
}

const SmartTemplateBuilder: React.FC<SmartTemplateBuilderProps> = ({
  initialTemplate,
  onSave,
  onCancel
}) => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [template, setTemplate] = useState({
    templateName: '',
    specialty: '',
    visitType: '',
    procedureType: '',
    careManagementType: '',
    soapStructure: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    },
    billingCodes: {
      primaryCpt: '',
      secondaryCpts: [],
      icd10Codes: []
    },
    customFields: {},
    tags: [],
    isPrivate: false,
    shareWithPractice: true,
    aiAssistance: true
  });

  const [aiSuggestions, setAiSuggestions] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newSecondaryCpt, setNewSecondaryCpt] = useState('');
  const [newIcd10, setNewIcd10] = useState('');

  // Specialty options
  const specialties = [
    'Primary Care', 'Cardiology', 'Mental Health', 'Neurology', 
    'Urgent Care', 'Endocrinology', 'Orthopedics', 'Dermatology',
    'Pediatrics', 'OB/GYN'
  ];

  const visitTypes = [
    'New Patient', 'Established Patient', 'Follow-up', 'Annual/Preventive',
    'Urgent', 'Telehealth', 'Consultation'
  ];

  const procedureTypes = [
    'Minor Procedure', 'Pre-op', 'Post-op', 'Wound Care', 'Injection/Immunization'
  ];

  const careManagementTypes = [
    'CCM Monthly', 'RPM Monthly', 'PCM Monthly', 'TCM', 'Medicare AWV'
  ];

  // Initialize template if editing
  useEffect(() => {
    if (initialTemplate) {
      setTemplate({
        templateName: initialTemplate.template_name || '',
        specialty: initialTemplate.specialty || '',
        visitType: initialTemplate.visit_type || '',
        procedureType: initialTemplate.procedure_type || '',
        careManagementType: initialTemplate.care_management_type || '',
        soapStructure: initialTemplate.soap_structure || {
          subjective: '',
          objective: '',
          assessment: '',
          plan: ''
        },
        billingCodes: initialTemplate.billing_codes || {
          primaryCpt: '',
          secondaryCpts: [],
          icd10Codes: []
        },
        customFields: initialTemplate.custom_fields || {},
        tags: initialTemplate.tags || [],
        isPrivate: initialTemplate.is_private || false,
        shareWithPractice: initialTemplate.share_with_practice || true,
        aiAssistance: initialTemplate.ai_enhanced || true
      });
    }
  }, [initialTemplate]);

  // Get AI suggestions based on current template data
  const getAISuggestions = async () => {
    if (!template.specialty || !template.visitType) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/encounters/smart-templates/ai-suggestions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          specialty: template.specialty,
          visitType: template.visitType,
          procedureType: template.procedureType,
          currentSoap: template.soapStructure
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || {});
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply AI suggestion to SOAP section
  const applySuggestion = (section: string, suggestion: string) => {
    setTemplate(prev => ({
      ...prev,
      soapStructure: {
        ...prev.soapStructure,
        [section]: prev.soapStructure[section] + '\n' + suggestion
      }
    }));
    toast.success('AI suggestion applied');
  };

  // Generate smart billing codes
  const generateSmartBilling = async () => {
    if (!template.specialty || !template.visitType) {
      toast.error('Please select specialty and visit type first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/encounters/smart-templates/smart-billing', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          specialty: template.specialty,
          visitType: template.visitType,
          procedureType: template.procedureType,
          soapContent: template.soapStructure
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTemplate(prev => ({
          ...prev,
          billingCodes: {
            ...prev.billingCodes,
            ...data.smartBillingCodes
          }
        }));
        toast.success('Smart billing codes generated');
      }
    } catch (error) {
      console.error('Error generating smart billing:', error);
      toast.error('Failed to generate smart billing codes');
    } finally {
      setLoading(false);
    }
  };

  // Save template
  const handleSave = async () => {
    if (!template.templateName || !template.specialty || !template.visitType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!template.soapStructure.subjective || !template.soapStructure.objective || 
        !template.soapStructure.assessment || !template.soapStructure.plan) {
      toast.error('Please fill in all SOAP sections');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/encounters/smart-templates/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(template)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Smart template created successfully');
        onSave(data.data);
      } else {
        toast.error('Failed to create template');
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  // Add tag
  const addTag = () => {
    if (newTag.trim() && !template.tags.includes(newTag.trim())) {
      setTemplate(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setTemplate(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Add secondary CPT
  const addSecondaryCpt = () => {
    if (newSecondaryCpt.trim() && !template.billingCodes.secondaryCpts.includes(newSecondaryCpt.trim())) {
      setTemplate(prev => ({
        ...prev,
        billingCodes: {
          ...prev.billingCodes,
          secondaryCpts: [...prev.billingCodes.secondaryCpts, newSecondaryCpt.trim()]
        }
      }));
      setNewSecondaryCpt('');
    }
  };

  // Add ICD-10 code
  const addIcd10 = () => {
    if (newIcd10.trim() && !template.billingCodes.icd10Codes.includes(newIcd10.trim())) {
      setTemplate(prev => ({
        ...prev,
        billingCodes: {
          ...prev.billingCodes,
          icd10Codes: [...prev.billingCodes.icd10Codes, newIcd10.trim()]
        }
      }));
      setNewIcd10('');
    }
  };

  const AISuggestionCard: React.FC<{ section: string; suggestions: string[] }> = ({ 
    section, 
    suggestions 
  }) => (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
          <Brain className="h-4 w-4" />
          AI Suggestions for {section}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <div key={index} className="flex items-start justify-between gap-2">
              <p className="text-sm text-purple-700 flex-1">{suggestion}</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => applySuggestion(section, suggestion)}
                className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-purple-600" />
            Smart Template Builder
          </h2>
          <p className="text-muted-foreground">
            Create intelligent templates with AI assistance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <Card>
          <CardHeader>
            <CardTitle>{template.templateName || 'Untitled Template'}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.specialty}</Badge>
              <Badge variant="outline">{template.visitType}</Badge>
              {template.aiAssistance && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Enhanced
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(template.soapStructure).map(([section, content]) => (
                <div key={section}>
                  <h3 className="font-semibold capitalize mb-2">{section}</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm">{content || 'No content'}</pre>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        // Edit Mode
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Template Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                      id="templateName"
                      value={template.templateName}
                      onChange={(e) => setTemplate(prev => ({ ...prev, templateName: e.target.value }))}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialty">Specialty *</Label>
                    <Select 
                      value={template.specialty} 
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, specialty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map(specialty => (
                          <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="visitType">Visit Type *</Label>
                    <Select 
                      value={template.visitType} 
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, visitType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visit type" />
                      </SelectTrigger>
                      <SelectContent>
                        {visitTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="procedureType">Procedure Type</Label>
                    <Select 
                      value={template.procedureType} 
                      onValueChange={(value) => setTemplate(prev => ({ ...prev, procedureType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select procedure type" />
                      </SelectTrigger>
                      <SelectContent>
                        {procedureTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button size="sm" onClick={addTag}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>AI Assistance</Label>
                      <p className="text-sm text-muted-foreground">Get AI-powered suggestions</p>
                    </div>
                    <Switch
                      checked={template.aiAssistance}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, aiAssistance: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Private Template</Label>
                      <p className="text-sm text-muted-foreground">Only you can see this template</p>
                    </div>
                    <Switch
                      checked={template.isPrivate}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, isPrivate: checked }))}
                    />
                  </div>
                  {!template.isPrivate && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Share with Practice</Label>
                        <p className="text-sm text-muted-foreground">Make available to your practice</p>
                      </div>
                      <Switch
                        checked={template.shareWithPractice}
                        onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, shareWithPractice: checked }))}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SOAP Structure */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    SOAP Structure
                  </CardTitle>
                  {template.aiAssistance && (
                    <Button size="sm" onClick={getAISuggestions} disabled={loading}>
                      <Brain className="h-4 w-4 mr-2" />
                      Get AI Suggestions
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="subjective">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="subjective">Subjective</TabsTrigger>
                    <TabsTrigger value="objective">Objective</TabsTrigger>
                    <TabsTrigger value="assessment">Assessment</TabsTrigger>
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                  </TabsList>
                  
                  {Object.entries(template.soapStructure).map(([section, content]) => (
                    <TabsContent key={section} value={section} className="space-y-4">
                      <Textarea
                        value={content}
                        onChange={(e) => setTemplate(prev => ({
                          ...prev,
                          soapStructure: {
                            ...prev.soapStructure,
                            [section]: e.target.value
                          }
                        }))}
                        placeholder={`Enter ${section} content...`}
                        rows={8}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Billing Codes */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing Codes
                  </CardTitle>
                  <Button size="sm" onClick={generateSmartBilling} disabled={loading}>
                    <Zap className="h-4 w-4 mr-2" />
                    Smart Generate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="primaryCpt">Primary CPT Code</Label>
                  <Input
                    id="primaryCpt"
                    value={template.billingCodes.primaryCpt}
                    onChange={(e) => setTemplate(prev => ({
                      ...prev,
                      billingCodes: {
                        ...prev.billingCodes,
                        primaryCpt: e.target.value
                      }
                    }))}
                    placeholder="e.g., 99213"
                  />
                </div>

                <div>
                  <Label>Secondary CPT Codes</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={newSecondaryCpt}
                      onChange={(e) => setNewSecondaryCpt(e.target.value)}
                      placeholder="Add secondary CPT"
                      onKeyPress={(e) => e.key === 'Enter' && addSecondaryCpt()}
                    />
                    <Button size="sm" onClick={addSecondaryCpt}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.billingCodes.secondaryCpts.map((cpt, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {cpt}
                        <button onClick={() => setTemplate(prev => ({
                          ...prev,
                          billingCodes: {
                            ...prev.billingCodes,
                            secondaryCpts: prev.billingCodes.secondaryCpts.filter((_, i) => i !== index)
                          }
                        }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>ICD-10 Codes</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={newIcd10}
                      onChange={(e) => setNewIcd10(e.target.value)}
                      placeholder="Add ICD-10 code"
                      onKeyPress={(e) => e.key === 'Enter' && addIcd10()}
                    />
                    <Button size="sm" onClick={addIcd10}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {template.billingCodes.icd10Codes.map((code, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        {code}
                        <button onClick={() => setTemplate(prev => ({
                          ...prev,
                          billingCodes: {
                            ...prev.billingCodes,
                            icd10Codes: prev.billingCodes.icd10Codes.filter((_, i) => i !== index)
                          }
                        }))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Suggestions Sidebar */}
          <div className="space-y-4">
            {template.aiAssistance && Object.keys(aiSuggestions).length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  AI Suggestions
                </h3>
                {Object.entries(aiSuggestions).map(([section, suggestions]: [string, any]) => (
                  <AISuggestionCard key={section} section={section} suggestions={suggestions} />
                ))}
              </div>
            )}

            {/* Template Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Template Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Sections:</span>
                  <span>{Object.values(template.soapStructure).filter(Boolean).length}/4</span>
                </div>
                <div className="flex justify-between">
                  <span>Tags:</span>
                  <span>{template.tags.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Codes:</span>
                  <span>
                    {(template.billingCodes.primaryCpt ? 1 : 0) + 
                     template.billingCodes.secondaryCpts.length + 
                     template.billingCodes.icd10Codes.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTemplateBuilder;