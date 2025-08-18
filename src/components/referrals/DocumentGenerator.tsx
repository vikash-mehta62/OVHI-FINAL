import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, Download, Eye, Send, Mail, Fax, Printer,
  CheckCircle, AlertCircle, Clock, Loader2, Settings,
  Signature, Stamp, Image, Type, Layout, Palette
} from 'lucide-react';
import { toast } from 'sonner';
import { templateService, type ReferralTemplate } from '@/services/templateService';
import { referralService, type Referral } from '@/services/referralService';

interface DocumentGeneratorProps {
  referral: Referral;
  onDocumentGenerated?: (document: GeneratedDocument) => void;
  onClose?: () => void;
}

interface GeneratedDocument {
  id: string;
  referral_id: string;
  template_id: string;
  format: 'pdf' | 'docx' | 'html';
  file_path: string;
  file_size: number;
  generated_at: string;
  status: 'generating' | 'completed' | 'failed';
  download_url?: string;
  preview_url?: string;
}

interface DocumentOptions {
  format: 'pdf' | 'docx' | 'html';
  include_letterhead: boolean;
  include_footer: boolean;
  include_signature: boolean;
  signature_type: 'digital' | 'image' | 'text';
  delivery_method: 'download' | 'email' | 'fax' | 'print';
  recipient_email?: string;
  recipient_fax?: string;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({
  referral,
  onDocumentGenerated,
  onClose
}) => {
  const [templates, setTemplates] = useState<ReferralTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReferralTemplate | null>(null);
  const [documentOptions, setDocumentOptions] = useState<DocumentOptions>({
    format: 'pdf',
    include_letterhead: true,
    include_footer: true,
    include_signature: false,
    signature_type: 'digital',
    delivery_method: 'download'
  });
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedDocument, setGeneratedDocument] = useState<GeneratedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load available templates
  useEffect(() => {
    loadTemplates();
  }, [referral.specialty_type]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templateService.getTemplatesBySpecialty(referral.specialty_type);
      
      if (response.success && response.templates) {
        setTemplates(response.templates);
        // Auto-select first active template
        const activeTemplate = response.templates.find(t => t.is_active);
        if (activeTemplate) {
          setSelectedTemplate(activeTemplate);
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const generateDocument = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      setGenerating(true);
      setGenerationProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await templateService.generateDocument(referral.id, selectedTemplate.id, {
        format: documentOptions.format,
        options: {
          include_letterhead: documentOptions.include_letterhead,
          include_footer: documentOptions.include_footer,
          include_signature: documentOptions.include_signature,
          signature_type: documentOptions.signature_type
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (response.success && response.document) {
        setGeneratedDocument(response.document);
        onDocumentGenerated?.(response.document);
        
        // Handle delivery method
        switch (documentOptions.delivery_method) {
          case 'download':
            handleDownload(response.document);
            break;
          case 'email':
            if (documentOptions.recipient_email) {
              await handleEmailDelivery(response.document, documentOptions.recipient_email);
            }
            break;
          case 'fax':
            if (documentOptions.recipient_fax) {
              await handleFaxDelivery(response.document, documentOptions.recipient_fax);
            }
            break;
          case 'print':
            handlePrint(response.document);
            break;
        }

        toast.success('Document generated successfully');
      }
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Failed to generate document');
    } finally {
      setGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleDownload = (document: GeneratedDocument) => {
    if (document.download_url) {
      const link = document.createElement('a');
      link.href = document.download_url;
      link.download = `referral-${referral.id}.${document.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleEmailDelivery = async (document: GeneratedDocument, email: string) => {
    try {
      await templateService.emailDocument(document.id, {
        recipient_email: email,
        subject: `Referral Letter for ${referral.patient_name}`,
        message: 'Please find the attached referral letter.'
      });
      toast.success(`Document emailed to ${email}`);
    } catch (error) {
      console.error('Error emailing document:', error);
      toast.error('Failed to email document');
    }
  };

  const handleFaxDelivery = async (document: GeneratedDocument, faxNumber: string) => {
    try {
      await templateService.faxDocument(document.id, {
        recipient_fax: faxNumber,
        cover_page: true,
        cover_message: `Referral letter for patient ${referral.patient_name}`
      });
      toast.success(`Document faxed to ${faxNumber}`);
    } catch (error) {
      console.error('Error faxing document:', error);
      toast.error('Failed to fax document');
    }
  };

  const handlePrint = (document: GeneratedDocument) => {
    if (document.preview_url) {
      const printWindow = window.open(document.preview_url, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }

    try {
      const response = await templateService.previewDocument(referral.id, selectedTemplate.id, {
        format: 'html',
        options: {
          include_letterhead: documentOptions.include_letterhead,
          include_footer: documentOptions.include_footer,
          include_signature: documentOptions.include_signature
        }
      });

      if (response.success && response.preview_url) {
        setPreviewUrl(response.preview_url);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    }
  };

  const getTemplateVariables = () => {
    if (!selectedTemplate) return [];
    
    return selectedTemplate.variables?.map(variable => ({
      name: variable.name,
      label: variable.label,
      value: getReferralValue(variable.name),
      required: variable.required
    })) || [];
  };

  const getReferralValue = (variableName: string): string => {
    const mapping: Record<string, any> = {
      patient_name: referral.patient_name,
      patient_dob: referral.patient_dob,
      patient_mrn: referral.patient_mrn,
      referring_provider: referral.referring_provider_name,
      provider_phone: referral.provider_phone,
      provider_email: referral.provider_email,
      practice_name: referral.practice_name,
      referral_date: referral.created_at?.split('T')[0],
      referral_reason: referral.referral_reason,
      clinical_notes: referral.clinical_notes,
      diagnosis_codes: referral.diagnosis_codes,
      medications: referral.current_medications,
      allergies: referral.allergies,
      urgency_level: referral.urgency_level,
      appointment_type: referral.appointment_type,
      insurance_info: referral.insurance_info,
      specialist_name: referral.specialist_name,
      specialist_practice: referral.specialist_practice
    };

    return mapping[variableName] || '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Generate Referral Document</h2>
          <p className="text-muted-foreground">
            Create and deliver professional referral letters
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Referral Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="font-medium">Patient</Label>
              <p>{referral.patient_name}</p>
            </div>
            <div>
              <Label className="font-medium">Specialty</Label>
              <p>{referral.specialty_type}</p>
            </div>
            <div>
              <Label className="font-medium">Urgency</Label>
              <Badge variant="outline">{referral.urgency_level}</Badge>
            </div>
            <div>
              <Label className="font-medium">Status</Label>
              <Badge variant="default">{referral.status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Template Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div>
                  <Label>Available Templates</Label>
                  <Select
                    value={selectedTemplate?.id || ''}
                    onValueChange={(value) => {
                      const template = templates.find(t => t.id === value);
                      setSelectedTemplate(template || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            {template.is_active && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTemplate && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm text-gray-600">
                        {selectedTemplate.description || 'No description available'}
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium">Variables ({getTemplateVariables().length})</Label>
                      <div className="max-h-32 overflow-y-auto">
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          {getTemplateVariables().map((variable) => (
                            <div key={variable.name} className="flex items-center justify-between p-1 border-b">
                              <span className={variable.required ? 'font-medium' : ''}>
                                {variable.label}
                                {variable.required && <span className="text-red-500 ml-1">*</span>}
                              </span>
                              <span className="text-gray-500 truncate max-w-24">
                                {variable.value || 'Not set'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Missing required variables warning */}
                    {getTemplateVariables().some(v => v.required && !v.value) && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Some required variables are missing values. The document may be incomplete.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Document Options */}
        <Card>
          <CardHeader>
            <CardTitle>Document Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Output Format</Label>
              <Select
                value={documentOptions.format}
                onValueChange={(value: 'pdf' | 'docx' | 'html') =>
                  setDocumentOptions(prev => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="docx">Word Document</SelectItem>
                  <SelectItem value="html">HTML Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Formatting Options</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="letterhead"
                    checked={documentOptions.include_letterhead}
                    onChange={(e) =>
                      setDocumentOptions(prev => ({
                        ...prev,
                        include_letterhead: e.target.checked
                      }))
                    }
                  />
                  <Label htmlFor="letterhead" className="text-sm">Include letterhead</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="footer"
                    checked={documentOptions.include_footer}
                    onChange={(e) =>
                      setDocumentOptions(prev => ({
                        ...prev,
                        include_footer: e.target.checked
                      }))
                    }
                  />
                  <Label htmlFor="footer" className="text-sm">Include footer</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="signature"
                    checked={documentOptions.include_signature}
                    onChange={(e) =>
                      setDocumentOptions(prev => ({
                        ...prev,
                        include_signature: e.target.checked
                      }))
                    }
                  />
                  <Label htmlFor="signature" className="text-sm">Include digital signature</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Delivery Method</Label>
              <Select
                value={documentOptions.delivery_method}
                onValueChange={(value: DocumentOptions['delivery_method']) =>
                  setDocumentOptions(prev => ({ ...prev, delivery_method: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="download">
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="fax">
                    <div className="flex items-center">
                      <Fax className="h-4 w-4 mr-2" />
                      Fax
                    </div>
                  </SelectItem>
                  <SelectItem value="print">
                    <div className="flex items-center">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Delivery-specific options */}
            {documentOptions.delivery_method === 'email' && (
              <div>
                <Label htmlFor="recipient-email">Recipient Email</Label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={documentOptions.recipient_email || ''}
                  onChange={(e) =>
                    setDocumentOptions(prev => ({
                      ...prev,
                      recipient_email: e.target.value
                    }))
                  }
                  placeholder="Enter email address"
                />
              </div>
            )}

            {documentOptions.delivery_method === 'fax' && (
              <div>
                <Label htmlFor="recipient-fax">Recipient Fax Number</Label>
                <Input
                  id="recipient-fax"
                  value={documentOptions.recipient_fax || ''}
                  onChange={(e) =>
                    setDocumentOptions(prev => ({
                      ...prev,
                      recipient_fax: e.target.value
                    }))
                  }
                  placeholder="Enter fax number"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Generation Progress */}
      {generating && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Generating document...</span>
                <span className="text-sm text-gray-500">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Document */}
      {generatedDocument && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <CardTitle className="text-green-800">Document Generated Successfully</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label className="font-medium">Format</Label>
                <p className="uppercase">{generatedDocument.format}</p>
              </div>
              <div>
                <Label className="font-medium">Size</Label>
                <p>{(generatedDocument.file_size / 1024).toFixed(1)} KB</p>
              </div>
              <div>
                <Label className="font-medium">Generated</Label>
                <p>{new Date(generatedDocument.generated_at).toLocaleString()}</p>
              </div>
              <div>
                <Label className="font-medium">Status</Label>
                <Badge variant="default">{generatedDocument.status}</Badge>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Button size="sm" onClick={() => handleDownload(generatedDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {generatedDocument.preview_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  setPreviewUrl(generatedDocument.preview_url!);
                  setShowPreview(true);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handlePreview} disabled={!selectedTemplate || generating}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        
        <Button onClick={generateDocument} disabled={!selectedTemplate || generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Document
            </>
          )}
        </Button>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="h-96 overflow-auto">
            {previewUrl && (
              <iframe
                src={previewUrl}
                className="w-full h-full border-0"
                title="Document Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};