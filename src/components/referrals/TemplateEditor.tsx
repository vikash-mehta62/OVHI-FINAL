import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Save, Eye, Download, Upload, Copy, Trash2, Plus,
  FileText, Type, Image, Table, List, Bold, Italic,
  Underline, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Settings, Code, Palette, Layout,
  Variable, Braces, Calendar, User, Building
} from 'lucide-react';
import { toast } from 'sonner';
import { templateService, type ReferralTemplate, type TemplateVariable } from '@/services/templateService';

interface TemplateEditorProps {
  templateId?: string;
  specialty?: string;
  onSave?: (template: ReferralTemplate) => void;
  onCancel?: () => void;
}

interface EditorState {
  content: string;
  variables: TemplateVariable[];
  selectedVariable: TemplateVariable | null;
  cursorPosition: number;
}

const defaultVariables: TemplateVariable[] = [
  { name: 'patient_name', label: 'Patient Name', type: 'text', required: true },
  { name: 'patient_dob', label: 'Date of Birth', type: 'date', required: true },
  { name: 'patient_mrn', label: 'Medical Record Number', type: 'text', required: true },
  { name: 'referring_provider', label: 'Referring Provider', type: 'text', required: true },
  { name: 'provider_phone', label: 'Provider Phone', type: 'text', required: false },
  { name: 'provider_email', label: 'Provider Email', type: 'email', required: false },
  { name: 'practice_name', label: 'Practice Name', type: 'text', required: false },
  { name: 'practice_address', label: 'Practice Address', type: 'text', required: false },
  { name: 'referral_date', label: 'Referral Date', type: 'date', required: true },
  { name: 'referral_reason', label: 'Reason for Referral', type: 'textarea', required: true },
  { name: 'clinical_notes', label: 'Clinical Notes', type: 'textarea', required: false },
  { name: 'diagnosis_codes', label: 'Diagnosis Codes', type: 'text', required: false },
  { name: 'medications', label: 'Current Medications', type: 'textarea', required: false },
  { name: 'allergies', label: 'Allergies', type: 'text', required: false },
  { name: 'urgency_level', label: 'Urgency Level', type: 'select', required: true },
  { name: 'appointment_type', label: 'Appointment Type', type: 'select', required: false },
  { name: 'insurance_info', label: 'Insurance Information', type: 'text', required: false },
  { name: 'specialist_name', label: 'Specialist Name', type: 'text', required: false },
  { name: 'specialist_practice', label: 'Specialist Practice', type: 'text', required: false }
];

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  templateId,
  specialty,
  onSave,
  onCancel
}) => {
  const [template, setTemplate] = useState<Partial<ReferralTemplate>>({
    name: '',
    specialty: specialty || '',
    content: '',
    variables: defaultVariables,
    is_active: true,
    letterhead_enabled: true,
    footer_enabled: true
  });
  
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    variables: defaultVariables,
    selectedVariable: null,
    cursorPosition: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showVariables, setShowVariables] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');
  const [sampleData, setSampleData] = useState<Record<string, any>>({});
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  const specialties = [
    'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
    'Hematology/Oncology', 'Nephrology', 'Neurology', 'Orthopedics',
    'Pulmonology', 'Rheumatology', 'Urology', 'Mental Health',
    'Physical Therapy', 'Radiology', 'Surgery', 'Ophthalmology',
    'ENT', 'Pediatrics', 'Obstetrics/Gynecology', 'General'
  ];

  // Load template if editing existing
  useEffect(() => {
    if (templateId) {
      loadTemplate();
    } else {
      // Initialize with default template content
      const defaultContent = generateDefaultTemplate(specialty || 'General');
      setTemplate(prev => ({ ...prev, content: defaultContent }));
      setEditorState(prev => ({ ...prev, content: defaultContent }));
      generateSampleData();
    }
  }, [templateId, specialty]);

  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      setLoading(true);
      const response = await templateService.getTemplate(templateId);
      
      if (response.success && response.template) {
        setTemplate(response.template);
        setEditorState(prev => ({
          ...prev,
          content: response.template.content,
          variables: response.template.variables || defaultVariables
        }));
        generateSampleData();
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const generateDefaultTemplate = (specialty: string) => {
    return `[Date: {{referral_date}}]

{{practice_name}}
{{practice_address}}

Dear {{specialist_name}},

RE: {{patient_name}} (DOB: {{patient_dob}}, MRN: {{patient_mrn}})

I am referring the above patient to you for evaluation and management of {{referral_reason}}.

CLINICAL HISTORY:
{{clinical_notes}}

CURRENT MEDICATIONS:
{{medications}}

ALLERGIES:
{{allergies}}

DIAGNOSIS CODES:
{{diagnosis_codes}}

This referral is marked as {{urgency_level}} priority. The patient's insurance information is as follows: {{insurance_info}}.

Please contact me at {{provider_phone}} or {{provider_email}} if you need any additional information.

Thank you for your time and expertise in caring for this patient.

Sincerely,

{{referring_provider}}
{{practice_name}}
{{provider_phone}}
{{provider_email}}`;
  };

  const generateSampleData = () => {
    const sample = {
      patient_name: 'John Smith',
      patient_dob: '1985-03-15',
      patient_mrn: 'MRN123456',
      referring_provider: 'Dr. Sarah Johnson',
      provider_phone: '(555) 123-4567',
      provider_email: 'sarah.johnson@clinic.com',
      practice_name: 'Family Health Clinic',
      practice_address: '123 Main St, Anytown, ST 12345',
      referral_date: new Date().toISOString().split('T')[0],
      referral_reason: 'Evaluation of chest pain and shortness of breath',
      clinical_notes: 'Patient presents with 3-month history of exertional chest pain and dyspnea. Recent EKG shows possible ST changes. No known cardiac history.',
      diagnosis_codes: 'R06.02 (Shortness of breath), R07.89 (Chest pain)',
      medications: 'Lisinopril 10mg daily, Metformin 500mg BID',
      allergies: 'NKDA',
      urgency_level: 'urgent',
      appointment_type: 'consultation',
      insurance_info: 'Blue Cross Blue Shield - Policy #ABC123456',
      specialist_name: 'Dr. Michael Chen',
      specialist_practice: 'Cardiology Associates'
    };
    setSampleData(sample);
  };

  const handleContentChange = (newContent: string) => {
    // Add to undo stack
    setUndoStack(prev => [...prev.slice(-19), editorState.content]);
    setRedoStack([]);
    
    setEditorState(prev => ({ ...prev, content: newContent }));
    setTemplate(prev => ({ ...prev, content: newContent }));
  };

  const insertVariable = (variable: TemplateVariable) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = editorState.content;
    const variableText = `{{${variable.name}}}`;
    
    const newContent = content.substring(0, start) + variableText + content.substring(end);
    handleContentChange(newContent);
    
    // Set cursor position after inserted variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableText.length, start + variableText.length);
    }, 0);
  };

  const addCustomVariable = () => {
    const name = prompt('Enter variable name (lowercase, underscores only):');
    if (!name || !/^[a-z_]+$/.test(name)) {
      toast.error('Invalid variable name. Use lowercase letters and underscores only.');
      return;
    }

    const label = prompt('Enter variable label:');
    if (!label) return;

    const newVariable: TemplateVariable = {
      name,
      label,
      type: 'text',
      required: false
    };

    setEditorState(prev => ({
      ...prev,
      variables: [...prev.variables, newVariable]
    }));
    
    setTemplate(prev => ({
      ...prev,
      variables: [...(prev.variables || []), newVariable]
    }));
  };

  const removeVariable = (variableName: string) => {
    setEditorState(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v.name !== variableName)
    }));
    
    setTemplate(prev => ({
      ...prev,
      variables: (prev.variables || []).filter(v => v.name !== variableName)
    }));
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    
    const previousContent = undoStack[undoStack.length - 1];
    setRedoStack(prev => [editorState.content, ...prev.slice(0, 19)]);
    setUndoStack(prev => prev.slice(0, -1));
    
    setEditorState(prev => ({ ...prev, content: previousContent }));
    setTemplate(prev => ({ ...prev, content: previousContent }));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    
    const nextContent = redoStack[0];
    setUndoStack(prev => [...prev.slice(-19), editorState.content]);
    setRedoStack(prev => prev.slice(1));
    
    setEditorState(prev => ({ ...prev, content: nextContent }));
    setTemplate(prev => ({ ...prev, content: nextContent }));
  };

  const renderPreview = () => {
    let previewContent = editorState.content;
    
    // Replace variables with sample data
    editorState.variables.forEach(variable => {
      const value = sampleData[variable.name] || `[${variable.label}]`;
      previewContent = previewContent.replace(
        new RegExp(`{{${variable.name}}}`, 'g'),
        value
      );
    });

    return (
      <div className="prose max-w-none">
        <div className="bg-white p-8 border rounded-lg shadow-sm">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {previewContent}
          </pre>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!template.name?.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    if (!template.specialty) {
      toast.error('Please select a specialty');
      return;
    }

    if (!editorState.content.trim()) {
      toast.error('Template content cannot be empty');
      return;
    }

    try {
      setLoading(true);
      
      const templateData = {
        ...template,
        content: editorState.content,
        variables: editorState.variables
      };

      const response = templateId 
        ? await templateService.updateTemplate(templateId, templateData)
        : await templateService.createTemplate(templateData);

      if (response.success) {
        toast.success(`Template ${templateId ? 'updated' : 'created'} successfully`);
        onSave?.(response.template);
      }
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const exportTemplate = () => {
    const templateData = {
      ...template,
      content: editorState.content,
      variables: editorState.variables
    };
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name || 'template'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setTemplate(imported);
        setEditorState(prev => ({
          ...prev,
          content: imported.content || '',
          variables: imported.variables || defaultVariables
        }));
        toast.success('Template imported successfully');
      } catch (error) {
        toast.error('Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {templateId ? 'Edit Template' : 'Create Template'}
          </h2>
          <p className="text-muted-foreground">
            Design referral letter templates with dynamic content
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleUndo} disabled={undoStack.length === 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleRedo} disabled={redoStack.length === 0}>
            <Redo className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" onClick={exportTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => document.getElementById('import-file')?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <input
            id="import-file"
            type="file"
            accept=".json"
            onChange={importTemplate}
            className="hidden"
          />
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Template Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={template.name || ''}
                onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter template name"
              />
            </div>
            
            <div>
              <Label htmlFor="specialty">Specialty *</Label>
              <Select
                value={template.specialty || ''}
                onValueChange={(value) => setTemplate(prev => ({ ...prev, specialty: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={template.description || ''}
                onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Variables Panel */}
        {showVariables && (
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Variables</CardTitle>
                <Button size="sm" variant="outline" onClick={addCustomVariable}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {editorState.variables.map((variable) => (
                    <div
                      key={variable.name}
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => insertVariable(variable)}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{variable.label}</div>
                        <div className="text-xs text-gray-500">
                          {`{{${variable.name}}}`}
                          {variable.required && <span className="text-red-500 ml-1">*</span>}
                        </div>
                      </div>
                      {!defaultVariables.some(v => v.name === variable.name) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeVariable(variable.name);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Editor/Preview */}
        <Card className={showVariables ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </Tabs>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVariables(!showVariables)}
              >
                <Variable className="h-4 w-4 mr-2" />
                {showVariables ? 'Hide' : 'Show'} Variables
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <TabsContent value="editor" className="mt-0">
              <div className="space-y-4">
                <Textarea
                  ref={textareaRef}
                  value={editorState.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Enter your template content here. Use {{variable_name}} to insert variables."
                  className="min-h-96 font-mono text-sm"
                  onSelect={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    setEditorState(prev => ({
                      ...prev,
                      cursorPosition: target.selectionStart
                    }));
                  }}
                />
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Characters: {editorState.content.length} | 
                    Lines: {editorState.content.split('\n').length} |
                    Variables: {(editorState.content.match(/{{[^}]+}}/g) || []).length}
                  </div>
                  <div>
                    Cursor: {editorState.cursorPosition}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="mt-0">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Template Preview</h3>
                  <Button size="sm" variant="outline" onClick={generateSampleData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Sample Data
                  </Button>
                </div>
                
                <ScrollArea className="h-96">
                  {renderPreview()}
                </ScrollArea>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </div>

      {/* Template Options */}
      <Card>
        <CardHeader>
          <CardTitle>Template Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <Label>Formatting Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="letterhead"
                    checked={template.letterhead_enabled}
                    onChange={(e) => setTemplate(prev => ({ 
                      ...prev, 
                      letterhead_enabled: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="letterhead">Include letterhead</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="footer"
                    checked={template.footer_enabled}
                    onChange={(e) => setTemplate(prev => ({ 
                      ...prev, 
                      footer_enabled: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="footer">Include footer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={template.is_active}
                    onChange={(e) => setTemplate(prev => ({ 
                      ...prev, 
                      is_active: e.target.checked 
                    }))}
                  />
                  <Label htmlFor="active">Template is active</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Output Formats</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="pdf" defaultChecked />
                  <Label htmlFor="pdf">PDF</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="docx" />
                  <Label htmlFor="docx">Word Document</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="html" />
                  <Label htmlFor="html">HTML</Label>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label>Validation Rules</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="require-all" />
                  <Label htmlFor="require-all">Require all variables</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="validate-format" />
                  <Label htmlFor="validate-format">Validate data formats</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="spell-check" />
                  <Label htmlFor="spell-check">Enable spell check</Label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};