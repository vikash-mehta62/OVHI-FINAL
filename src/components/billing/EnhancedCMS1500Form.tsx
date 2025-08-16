import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Trash2, Save, Send, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { toast } from '@/components/ui/use-toast';

interface ServiceLine {
  serviceDate: string;
  cptCode: string;
  charges: number;
  units: number;
  modifier?: string;
  diagnosisPointer?: string;
  placeOfService?: string;
}

interface DiagnosisCode {
  code: string;
  description: string;
}

interface CMS1500FormData {
  patientInfo: {
    patientId: string;
    lastName: string;
    firstName: string;
    middleInitial?: string;
    dateOfBirth: string;
    gender: 'M' | 'F';
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone?: string;
  };
  insuranceInfo: {
    payerId: string;
    payerName: string;
    memberId: string;
    groupNumber?: string;
    planName?: string;
    relationshipToInsured: 'self' | 'spouse' | 'child' | 'other';
  };
  providerInfo: {
    npi: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    taxId: string;
    phone?: string;
  };
  serviceLines: ServiceLine[];
  diagnosisCodes: DiagnosisCode[];
  claimInfo: {
    dateOfService: string;
    placeOfService: string;
    totalCharges: number;
    amountPaid: number;
    balanceDue: number;
  };
}

interface EnhancedCMS1500FormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  encounterId?: string;
}

const EnhancedCMS1500Form: React.FC<EnhancedCMS1500FormProps> = ({
  open,
  onOpenChange,
  patientId,
  encounterId
}) => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [formData, setFormData] = useState<CMS1500FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [claimStatus, setClaimStatus] = useState<string>('draft');
  const [claimId, setClaimId] = useState<string>('');

  useEffect(() => {
    if (open && patientId) {
      fetchFormTemplate();
    }
  }, [open, patientId]);

  const fetchFormTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/billing/cms1500/template', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const template = await response.json();
        // Initialize form with template structure
        initializeForm(template.data);
      }
    } catch (error) {
      console.error('Error fetching form template:', error);
      toast({
        title: "Error",
        description: "Failed to load form template",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = (template: any) => {
    setFormData({
      patientInfo: {
        patientId: patientId || '',
        lastName: '',
        firstName: '',
        dateOfBirth: '',
        gender: 'M',
        address: '',
        city: '',
        state: '',
        zipCode: '',
      },
      insuranceInfo: {
        payerId: '',
        payerName: '',
        memberId: '',
        relationshipToInsured: 'self'
      },
      providerInfo: {
        npi: '',
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        taxId: ''
      },
      serviceLines: [{
        serviceDate: new Date().toISOString().split('T')[0],
        cptCode: '',
        charges: 0,
        units: 1,
        placeOfService: '11'
      }],
      diagnosisCodes: [{
        code: '',
        description: ''
      }],
      claimInfo: {
        dateOfService: new Date().toISOString().split('T')[0],
        placeOfService: '11',
        totalCharges: 0,
        amountPaid: 0,
        balanceDue: 0
      }
    });
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!formData) {
      errors.push('Form data is required');
      return errors;
    }

    // Patient validation
    if (!formData.patientInfo.lastName) errors.push('Patient last name is required');
    if (!formData.patientInfo.firstName) errors.push('Patient first name is required');
    if (!formData.patientInfo.dateOfBirth) errors.push('Patient date of birth is required');

    // Insurance validation
    if (!formData.insuranceInfo.payerName) errors.push('Payer name is required');
    if (!formData.insuranceInfo.memberId) errors.push('Member ID is required');

    // Provider validation
    if (!formData.providerInfo.npi) errors.push('Provider NPI is required');
    if (!formData.providerInfo.name) errors.push('Provider name is required');

    // Service lines validation
    if (formData.serviceLines.length === 0) {
      errors.push('At least one service line is required');
    } else {
      formData.serviceLines.forEach((line, index) => {
        if (!line.cptCode) errors.push(`CPT code is required for service line ${index + 1}`);
        if (!line.charges || line.charges <= 0) errors.push(`Charges are required for service line ${index + 1}`);
      });
    }

    // Diagnosis codes validation
    if (formData.diagnosisCodes.length === 0 || !formData.diagnosisCodes[0].code) {
      errors.push('At least one diagnosis code is required');
    }

    return errors;
  };

  const calculateTotals = () => {
    if (!formData) return;

    const totalCharges = formData.serviceLines.reduce((sum, line) => 
      sum + (line.charges * line.units), 0
    );

    setFormData(prev => prev ? {
      ...prev,
      claimInfo: {
        ...prev.claimInfo,
        totalCharges,
        balanceDue: totalCharges - prev.claimInfo.amountPaid
      }
    } : null);
  };

  const addServiceLine = () => {
    if (!formData) return;

    setFormData(prev => prev ? {
      ...prev,
      serviceLines: [...prev.serviceLines, {
        serviceDate: new Date().toISOString().split('T')[0],
        cptCode: '',
        charges: 0,
        units: 1,
        placeOfService: '11'
      }]
    } : null);
  };

  const removeServiceLine = (index: number) => {
    if (!formData || formData.serviceLines.length <= 1) return;

    setFormData(prev => prev ? {
      ...prev,
      serviceLines: prev.serviceLines.filter((_, i) => i !== index)
    } : null);
    calculateTotals();
  };

  const updateServiceLine = (index: number, field: keyof ServiceLine, value: any) => {
    if (!formData) return;

    setFormData(prev => {
      if (!prev) return null;
      const updatedLines = [...prev.serviceLines];
      updatedLines[index] = { ...updatedLines[index], [field]: value };
      return { ...prev, serviceLines: updatedLines };
    });
    calculateTotals();
  };

  const submitClaim = async () => {
    if (!formData) return;

    const errors = validateForm();
    setValidationErrors(errors);

    if (errors.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before submitting",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/v1/billing/cms1500/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        setClaimId(result.data.claimId);
        setClaimStatus(result.data.status);
        
        toast({
          title: "Success",
          description: `Claim submitted successfully. Claim ID: ${result.data.claimNumber}`
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Submission Error",
          description: errorData.message || "Failed to submit claim",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast({
        title: "Error",
        description: "Failed to submit claim",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Loading CMS-1500 Form...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="ml-3">Loading form template...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            CMS-1500 Health Insurance Claim Form
          </DialogTitle>
          <DialogDescription>
            Complete and submit insurance claims electronically
          </DialogDescription>
        </DialogHeader>

        {formData && (
          <div className="space-y-6">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Claim Status */}
            {claimId && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Claim Status</AlertTitle>
                <AlertDescription>
                  Claim ID: {claimId} - Status: <Badge>{claimStatus}</Badge>
                </AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="patient" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="patient">Patient</TabsTrigger>
                <TabsTrigger value="insurance">Insurance</TabsTrigger>
                <TabsTrigger value="provider">Provider</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="review">Review</TabsTrigger>
              </TabsList>

              {/* Patient Information Tab */}
              <TabsContent value="patient" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.patientInfo.lastName}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, lastName: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.patientInfo.firstName}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, firstName: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.patientInfo.dateOfBirth}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, dateOfBirth: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="gender">Gender *</Label>
                      <Select
                        value={formData.patientInfo.gender}
                        onValueChange={(value: 'M' | 'F') => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, gender: value }
                        } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={formData.patientInfo.address}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, address: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.patientInfo.city}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, city: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.patientInfo.state}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          patientInfo: { ...prev.patientInfo, state: e.target.value }
                        } : null)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Insurance Information Tab */}
              <TabsContent value="insurance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Insurance Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payerName">Payer Name *</Label>
                      <Input
                        id="payerName"
                        value={formData.insuranceInfo.payerName}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          insuranceInfo: { ...prev.insuranceInfo, payerName: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="memberId">Member ID *</Label>
                      <Input
                        id="memberId"
                        value={formData.insuranceInfo.memberId}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          insuranceInfo: { ...prev.insuranceInfo, memberId: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="groupNumber">Group Number</Label>
                      <Input
                        id="groupNumber"
                        value={formData.insuranceInfo.groupNumber || ''}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          insuranceInfo: { ...prev.insuranceInfo, groupNumber: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="relationship">Relationship to Insured</Label>
                      <Select
                        value={formData.insuranceInfo.relationshipToInsured}
                        onValueChange={(value: any) => setFormData(prev => prev ? {
                          ...prev,
                          insuranceInfo: { ...prev.insuranceInfo, relationshipToInsured: value }
                        } : null)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="self">Self</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Provider Information Tab */}
              <TabsContent value="provider" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="providerNpi">NPI *</Label>
                      <Input
                        id="providerNpi"
                        value={formData.providerInfo.npi}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          providerInfo: { ...prev.providerInfo, npi: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="providerName">Provider Name *</Label>
                      <Input
                        id="providerName"
                        value={formData.providerInfo.name}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          providerInfo: { ...prev.providerInfo, name: e.target.value }
                        } : null)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="taxId">Tax ID</Label>
                      <Input
                        id="taxId"
                        value={formData.providerInfo.taxId}
                        onChange={(e) => setFormData(prev => prev ? {
                          ...prev,
                          providerInfo: { ...prev.providerInfo, taxId: e.target.value }
                        } : null)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Service Lines</CardTitle>
                      <Button onClick={addServiceLine} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {formData.serviceLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-6 gap-4 p-4 border rounded-lg">
                          <div>
                            <Label>Service Date</Label>
                            <Input
                              type="date"
                              value={line.serviceDate}
                              onChange={(e) => updateServiceLine(index, 'serviceDate', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>CPT Code</Label>
                            <Input
                              value={line.cptCode}
                              onChange={(e) => updateServiceLine(index, 'cptCode', e.target.value)}
                              placeholder="99213"
                            />
                          </div>
                          <div>
                            <Label>Charges</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={line.charges}
                              onChange={(e) => updateServiceLine(index, 'charges', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Units</Label>
                            <Input
                              type="number"
                              value={line.units}
                              onChange={(e) => updateServiceLine(index, 'units', parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div>
                            <Label>Place of Service</Label>
                            <Select
                              value={line.placeOfService}
                              onValueChange={(value) => updateServiceLine(index, 'placeOfService', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="11">Office</SelectItem>
                                <SelectItem value="21">Inpatient Hospital</SelectItem>
                                <SelectItem value="22">Outpatient Hospital</SelectItem>
                                <SelectItem value="23">Emergency Room</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeServiceLine(index)}
                              disabled={formData.serviceLines.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Diagnosis Codes */}
                    <div className="mt-6">
                      <Label className="text-base font-semibold">Diagnosis Codes</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label>Primary Diagnosis Code</Label>
                          <Input
                            value={formData.diagnosisCodes[0]?.code || ''}
                            onChange={(e) => setFormData(prev => {
                              if (!prev) return null;
                              const updatedCodes = [...prev.diagnosisCodes];
                              updatedCodes[0] = { ...updatedCodes[0], code: e.target.value };
                              return { ...prev, diagnosisCodes: updatedCodes };
                            })}
                            placeholder="I10"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={formData.diagnosisCodes[0]?.description || ''}
                            onChange={(e) => setFormData(prev => {
                              if (!prev) return null;
                              const updatedCodes = [...prev.diagnosisCodes];
                              updatedCodes[0] = { ...updatedCodes[0], description: e.target.value };
                              return { ...prev, diagnosisCodes: updatedCodes };
                            })}
                            placeholder="Essential hypertension"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Review Tab */}
              <TabsContent value="review" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Claim Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Total Charges</Label>
                        <div className="text-2xl font-bold">
                          ${formData.claimInfo.totalCharges.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <Label>Balance Due</Label>
                        <div className="text-2xl font-bold">
                          ${formData.claimInfo.balanceDue.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submitClaim} disabled={submitting}>
                {submitting ? (
                  <>Submitting...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedCMS1500Form;