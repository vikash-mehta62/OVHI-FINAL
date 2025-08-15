import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
  Settings,
  Stethoscope,
  Brain,
  Wand2,
  Plus,
  Edit,
  Copy,
  Trash,
  Eye,
  Star,
  Users,
  Clock,
  FileText,
  Sparkles,
  Target,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Filter,
  Search
} from 'lucide-react';

interface SpecialtyTemplate {
  id: string;
  template_name: string;
  specialty: string;
  visit_type: string;
  is_default: boolean;
  is_auto_assigned: boolean;
  soap_structure: any;
  billing_codes: any;
  usage_count: number;
  avg_rating: number;
  created_at: string;
  updated_at: string;
}

interface SpecialtyConfig {
  specialty: string;
  auto_template_assignment: boolean;
  default_templates: string[];
  custom_templates: string[];
  ai_suggestions_enabled: boolean;
  template_preferences: {
    visit_types: string[];
    required_fields: string[];
    billing_integration: boolean;
  };
}

const AutoSpecialtyTemplateSettings: React.FC = () => {
  const { token, user } = useSelector((state: RootState) => state.auth);
  const [specialtyConfigs, setSpecialtyConfigs] = useState<SpecialtyConfig[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<SpecialtyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('auto-assignment');
  const [selectedSpecialty, setSelectedSpecialty] = useState(user?.specialty || 'Primary Care');
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SpecialtyTemplate | null>(null);
  const [newTemplateData, setNewTemplateData] = useState({
    template_name: '',
    specialty: selectedSpecialty,
    visit_type: 'Established Patient',
    soap_structure: {
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    },
    billing_codes: {
      primary_cpt: '',
      secondary_cpts: [],
      icd10_codes: []
    },
    is_default: false,
    ai_enhanced: true
  });

  // Specialty options with their common templates
  const specialtyOptions = [
    {
      name: 'Primary Care',
      defaultTemplates: ['Annual Physical', 'Sick Visit', 'Follow-up', 'Preventive Care'],
      commonVisitTypes: ['New Patient', 'Established Patient', 'Annual/Preventive', 'Sick Visit', 'Follow-up']
    },
    {
      name: 'Cardiology',
      defaultTemplates: ['Cardiac Consultation', 'Echo Follow-up', 'Stress Test', 'Chest Pain Evaluation'],
      commonVisitTypes: ['New Consultation', 'Follow-up', 'Procedure', 'Emergency']
    },
    {
      name: 'Mental Health',
      defaultTemplates: ['Initial Psychiatric Evaluation', 'Therapy Session', 'Medication Management', 'Crisis Assessment'],
      commonVisitTypes: ['Initial Evaluation', 'Therapy Session', 'Medication Check', 'Crisis Intervention']
    },
    {
      name: 'Neurology',
      defaultTemplates: ['Neurological Consultation', 'Headache Evaluation', 'Seizure Follow-up', 'Memory Assessment'],
      commonVisitTypes: ['New Consultation', 'Follow-up', 'Diagnostic', 'Treatment Planning']
    },
    {
      name: 'Urgent Care',
      defaultTemplates: ['Acute Illness', 'Minor Injury', 'Diagnostic Workup', 'Referral Assessment'],
      commonVisitTypes: ['Acute Visit', 'Injury Assessment', 'Diagnostic', 'Follow-up']
    },
    {
      name: 'Dermatology',
      defaultTemplates: ['Skin Examination', 'Mole Check', 'Acne Treatment', 'Skin Cancer Screening'],
      commonVisitTypes: ['New Patient', 'Follow-up', 'Screening', 'Procedure']
    }
  ];

  // Fetch specialty configurations
  const fetchSpecialtyConfigs = async () => {
    setLoading(true);
    try {
      // This would be an API call to get specialty configurations
      // For now, using mock data
      const mockConfigs: SpecialtyConfig[] = specialtyOptions.map(specialty => ({
        specialty: specialty.name,
        auto_template_assignment: specialty.name === selectedSpecialty,
        default_templates: specialty.defaultTemplates,
        custom_templates: [],
        ai_suggestions_enabled: true,
        template_preferences: {
          visit_types: specialty.commonVisitTypes,
          required_fields: ['chief_complaint', 'history_present_illness', 'physical_exam'],
          billing_integration: true
        }
      }));
      
      setSpecialtyConfigs(mockConfigs);
    } catch (error) {
      console.error('Error fetching specialty configs:', error);
      toast.error('Failed to load specialty configurations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available templates for specialty
  const fetchTemplatesForSpecialty = async (specialty: string) => {
    try {
      // This would be an API call to get templates by specialty
      // For now, using mock data
      const mockTemplates: SpecialtyTemplate[] = [
        {
          id: '1',
          template_name: 'Annual Physical Exam',
          specialty: specialty,
          visit_type: 'Annual/Preventive',
          is_default: true,
          is_auto_assigned: true,
          soap_structure: {
            subjective: 'Review of systems, current medications, allergies',
            objective: 'Vital signs, physical examination',
            assessment: 'Overall health assessment',
            plan: 'Preventive care recommendations, follow-up'
          },
          billing_codes: {
            primary_cpt: '99396',
            secondary_cpts: [],
            icd10_codes: ['Z00.00']
          },
          usage_count: 45,
          avg_rating: 4.8,
          created_at: '2024-01-15',
          updated_at: '2024-01-20'
        },
        {
          id: '2',
          template_name: 'Sick Visit - Acute',
          specialty: specialty,
          visit_type: 'Sick Visit',
          is_default: true,
          is_auto_assigned: false,
          soap_structure: {
            subjective: 'Chief complaint, history of present illness, associated symptoms',
            objective: 'Vital signs, focused physical examination',
            assessment: 'Clinical impression based on findings',
            plan: 'Treatment plan, medications, follow-up instructions'
          },
          billing_codes: {
            primary_cpt: '99213',
            secondary_cpts: [],
            icd10_codes: []
          },
          usage_count: 32,
          avg_rating: 4.5,
          created_at: '2024-01-10',
          updated_at: '2024-01-18'
        }
      ];
      
      setAvailableTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  // Toggle auto-assignment for specialty
  const toggleAutoAssignment = async (specialty: string, enabled: boolean) => {
    try {
      // API call to update auto-assignment setting
      const updatedConfigs = specialtyConfigs.map(config =>
        config.specialty === specialty
          ? { ...config, auto_template_assignment: enabled }
          : config
      );
      setSpecialtyConfigs(updatedConfigs);
      
      toast.success(`Auto-assignment ${enabled ? 'enabled' : 'disabled'} for ${specialty}`);
    } catch (error) {
      console.error('Error updating auto-assignment:', error);
      toast.error('Failed to update auto-assignment setting');
    }
  };

  // Set template as default for specialty
  const setTemplateAsDefault = async (templateId: string, isDefault: boolean) => {
    try {
      // API call to set template as default
      const updatedTemplates = availableTemplates.map(template =>
        template.id === templateId
          ? { ...template, is_default: isDefault }
          : template
      );
      setAvailableTemplates(updatedTemplates);
      
      toast.success(`Template ${isDefault ? 'set as' : 'removed from'} default`);
    } catch (error) {
      console.error('Error updating template default status:', error);
      toast.error('Failed to update template');
    }
  };

  // Create new custom template
  const createCustomTemplate = async () => {
    try {
      if (!newTemplateData.template_name.trim()) {
        toast.error('Template name is required');
        return;
      }

      // API call to create template
      const newTemplate: SpecialtyTemplate = {
        id: Date.now().toString(),
        ...newTemplateData,
        is_auto_assigned: false,
        usage_count: 0,
        avg_rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setAvailableTemplates([...availableTemplates, newTemplate]);
      setShowTemplateBuilder(false);
      setNewTemplateData({
        template_name: '',
        specialty: selectedSpecialty,
        visit_type: 'Established Patient',
        soap_structure: {
          subjective: '',
          objective: '',
          assessment: '',
          plan: ''
        },
        billing_codes: {
          primary_cpt: '',
          secondary_cpts: [],
          icd10_codes: []
        },
        is_default: false,
        ai_enhanced: true
      });

      toast.success('Custom template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  // Get current specialty config
  const getCurrentSpecialtyConfig = () => {
    return specialtyConfigs.find(config => config.specialty === selectedSpecialty);
  };

  // Get templates for current specialty
  const getTemplatesForCurrentSpecialty = () => {
    return availableTemplates.filter(template => template.specialty === selectedSpecialty);
  };

  useEffect(() => {
    fetchSpecialtyConfigs();
  }, []);

  useEffect(() => {
    if (selectedSpecialty) {
      fetchTemplatesForSpecialty(selectedSpecialty);
    }
  }, [selectedSpecialty]);

  const currentConfig = getCurrentSpecialtyConfig();
  const currentTemplates = getTemplatesForCurrentSpecialty();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-blue-600" />
            Auto Specialty Templates
          </h2>
          <p className="text-muted-foreground">
            Automatically assign templates based on provider specialty and create custom templates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {specialtyOptions.map(specialty => (
                <SelectItem key={specialty.name} value={specialty.name}>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {specialty.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="auto-assignment" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Auto Assignment
          </TabsTrigger>
          <TabsTrigger value="default-templates" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Default Templates
          </TabsTrigger>
          <TabsTrigger value="custom-templates" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Custom Templates
          </TabsTrigger>
          <TabsTrigger value="ai-settings" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Settings
          </TabsTrigger>
        </TabsList>

        {/* Auto Assignment Tab */}
        <TabsContent value="auto-assignment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Automatic Template Assignment
              </CardTitle>
              <CardDescription>
                Configure automatic template assignment based on your specialty and visit types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Assignment Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">Enable Auto Assignment</h3>
                    {currentConfig?.auto_template_assignment && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automatically suggest templates based on {selectedSpecialty} specialty
                  </p>
                </div>
                <Switch
                  checked={currentConfig?.auto_template_assignment || false}
                  onCheckedChange={(checked) => toggleAutoAssignment(selectedSpecialty, checked)}
                />
              </div>

              {/* Specialty Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Specialty</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Stethoscope className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{selectedSpecialty}</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentTemplates.length} templates available
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Common Visit Types:</h4>
                      <div className="flex flex-wrap gap-1">
                        {specialtyOptions
                          .find(s => s.name === selectedSpecialty)
                          ?.commonVisitTypes.map(visitType => (
                          <Badge key={visitType} variant="outline" className="text-xs">
                            {visitType}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment Rules</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Match by specialty first</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Consider visit type</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Use rating and usage data</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>AI-enhanced suggestions</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview of Auto-Assigned Templates */}
              {currentConfig?.auto_template_assignment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Auto-Assigned Templates Preview</CardTitle>
                    <CardDescription>
                      These templates will be automatically suggested for {selectedSpecialty}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentTemplates
                        .filter(template => template.is_auto_assigned || template.is_default)
                        .map(template => (
                        <div key={template.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{template.template_name}</h4>
                            <div className="flex items-center gap-1">
                              {template.is_default && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">
                                  Default
                                </Badge>
                              )}
                              {template.is_auto_assigned && (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  Auto
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{template.visit_type}</span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {template.usage_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {template.avg_rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Default Templates Tab */}
        <TabsContent value="default-templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                Default Templates for {selectedSpecialty}
              </CardTitle>
              <CardDescription>
                Manage default templates that will be automatically suggested for this specialty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentTemplates.map(template => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{template.template_name}</h3>
                          <p className="text-sm text-muted-foreground">{template.visit_type}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.is_default && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {template.usage_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {template.avg_rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTemplateAsDefault(template.id, !template.is_default)}
                          >
                            {template.is_default ? 'Remove Default' : 'Set Default'}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Templates Tab */}
        <TabsContent value="custom-templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Custom Templates</h3>
              <p className="text-muted-foreground">
                Create and manage your own templates for {selectedSpecialty}
              </p>
            </div>
            <Button onClick={() => setShowTemplateBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentTemplates
              .filter(template => !template.is_default)
              .map(template => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{template.template_name}</h3>
                      <p className="text-sm text-muted-foreground">{template.visit_type}</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      Custom
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {template.usage_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(template.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-3 w-3 mr-1" />
                        Clone
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {currentTemplates.filter(template => !template.is_default).length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Custom Templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom template to get started
                </p>
                <Button onClick={() => setShowTemplateBuilder(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                AI Enhancement Settings
              </CardTitle>
              <CardDescription>
                Configure AI-powered features for template suggestions and enhancements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h3 className="font-medium">AI Template Suggestions</h3>
                    <p className="text-sm text-muted-foreground">
                      Get AI-powered template recommendations based on patient context
                    </p>
                  </div>
                  <Switch
                    checked={currentConfig?.ai_suggestions_enabled || false}
                    onCheckedChange={(checked) => {
                      // Update AI suggestions setting
                      const updatedConfigs = specialtyConfigs.map(config =>
                        config.specialty === selectedSpecialty
                          ? { ...config, ai_suggestions_enabled: checked }
                          : config
                      );
                      setSpecialtyConfigs(updatedConfigs);
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">AI Features</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span>Smart content suggestions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <span>Contextual recommendations</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Wand2 className="h-4 w-4 text-purple-600" />
                          <span>Auto-complete assistance</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-purple-600" />
                          <span>Billing code suggestions</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Learning Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Learn from my usage patterns</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Adapt to specialty trends</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Share anonymized data</span>
                          <Switch />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Builder Dialog */}
      <Dialog open={showTemplateBuilder} onOpenChange={setShowTemplateBuilder}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Custom Template</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplateData.template_name}
                  onChange={(e) => setNewTemplateData({
                    ...newTemplateData,
                    template_name: e.target.value
                  })}
                  placeholder="Enter template name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-type">Visit Type</Label>
                <Select
                  value={newTemplateData.visit_type}
                  onValueChange={(value) => setNewTemplateData({
                    ...newTemplateData,
                    visit_type: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {specialtyOptions
                      .find(s => s.name === selectedSpecialty)
                      ?.commonVisitTypes.map(visitType => (
                      <SelectItem key={visitType} value={visitType}>
                        {visitType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* SOAP Structure */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">SOAP Structure</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subjective">Subjective</Label>
                  <Textarea
                    id="subjective"
                    value={newTemplateData.soap_structure.subjective}
                    onChange={(e) => setNewTemplateData({
                      ...newTemplateData,
                      soap_structure: {
                        ...newTemplateData.soap_structure,
                        subjective: e.target.value
                      }
                    })}
                    placeholder="Patient's subjective information..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objective">Objective</Label>
                  <Textarea
                    id="objective"
                    value={newTemplateData.soap_structure.objective}
                    onChange={(e) => setNewTemplateData({
                      ...newTemplateData,
                      soap_structure: {
                        ...newTemplateData.soap_structure,
                        objective: e.target.value
                      }
                    })}
                    placeholder="Objective findings..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assessment">Assessment</Label>
                  <Textarea
                    id="assessment"
                    value={newTemplateData.soap_structure.assessment}
                    onChange={(e) => setNewTemplateData({
                      ...newTemplateData,
                      soap_structure: {
                        ...newTemplateData.soap_structure,
                        assessment: e.target.value
                      }
                    })}
                    placeholder="Clinical assessment..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Textarea
                    id="plan"
                    value={newTemplateData.soap_structure.plan}
                    onChange={(e) => setNewTemplateData({
                      ...newTemplateData,
                      soap_structure: {
                        ...newTemplateData.soap_structure,
                        plan: e.target.value
                      }
                    })}
                    placeholder="Treatment plan..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Billing Codes */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Billing Codes</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-cpt">Primary CPT Code</Label>
                  <Input
                    id="primary-cpt"
                    value={newTemplateData.billing_codes.primary_cpt}
                    onChange={(e) => setNewTemplateData({
                      ...newTemplateData,
                      billing_codes: {
                        ...newTemplateData.billing_codes,
                        primary_cpt: e.target.value
                      }
                    })}
                    placeholder="e.g., 99213"
                  />
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-default"
                    checked={newTemplateData.is_default}
                    onCheckedChange={(checked) => setNewTemplateData({
                      ...newTemplateData,
                      is_default: checked
                    })}
                  />
                  <Label htmlFor="is-default">Set as default template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ai-enhanced"
                    checked={newTemplateData.ai_enhanced}
                    onCheckedChange={(checked) => setNewTemplateData({
                      ...newTemplateData,
                      ai_enhanced: checked
                    })}
                  />
                  <Label htmlFor="ai-enhanced">Enable AI enhancements</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowTemplateBuilder(false)}>
                  Cancel
                </Button>
                <Button onClick={createCustomTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoSpecialtyTemplateSettings;