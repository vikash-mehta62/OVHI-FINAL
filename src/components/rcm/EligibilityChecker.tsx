import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Search, FileText, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  checkEligibilityAPI,
  verifyEligibilityAPI,
  getEligibilityHistoryAPI,
  validateClaimAPI,
  scrubClaimAPI,
  getClaimEstimateAPI,
  checkBenefitsAPI,
  getCopayEstimateAPI,
  formatEligibilityStatus,
  formatCurrency,
  formatDeductible,
  calculateClaimConfidence
} from '@/services/operations/eligibility';

interface EligibilityCheckerProps {
  patientId?: string;
  onEligibilityCheck?: (result: any) => void;
  onClaimValidation?: (result: any) => void;
}

const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  patientId,
  onEligibilityCheck,
  onClaimValidation
}) => {
  const [activeTab, setActiveTab] = useState('eligibility');
  const [loading, setLoading] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<any>(null);
  const [claimValidationData, setClaimValidationData] = useState<any>(null);
  const [benefitsData, setBenefitsData] = useState<any>(null);

  // Eligibility Form State
  const [eligibilityForm, setEligibilityForm] = useState({
    patientId: patientId || '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    memberId: '',
    insuranceId: '',
    serviceDate: new Date().toISOString().split('T')[0]
  });

  // Claim Validation Form State
  const [claimForm, setClaimForm] = useState({
    patientId: patientId || '',
    serviceDate: new Date().toISOString().split('T')[0],
    procedureCodes: '',
    diagnosisCodes: '',
    providerId: '',
    placeOfService: '11',
    units: '1',
    charges: ''
  });

  const token = localStorage.getItem('token');

  // Handle Eligibility Check
  const handleEligibilityCheck = async () => {
    if (!eligibilityForm.patientId || !eligibilityForm.memberId) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await checkEligibilityAPI(token, eligibilityForm);
      if (result) {
        setEligibilityData(result.data);
        onEligibilityCheck?.(result.data);
      }
    } catch (error) {
      console.error('Eligibility check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Real-time Verification
  const handleRealTimeVerification = async () => {
    if (!eligibilityForm.patientId) {
      toast.error('Patient ID is required');
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEligibilityAPI(token, {
        patientId: eligibilityForm.patientId,
        serviceDate: eligibilityForm.serviceDate
      });
      if (result) {
        setEligibilityData(result.data);
      }
    } catch (error) {
      console.error('Real-time verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Claim Validation
  const handleClaimValidation = async () => {
    if (!claimForm.patientId || !claimForm.procedureCodes) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await validateClaimAPI(token, {
        ...claimForm,
        procedureCodes: claimForm.procedureCodes.split(',').map(code => code.trim()),
        diagnosisCodes: claimForm.diagnosisCodes.split(',').map(code => code.trim())
      });
      if (result) {
        setClaimValidationData(result.data);
        onClaimValidation?.(result.data);
      }
    } catch (error) {
      console.error('Claim validation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Claim Scrubbing
  const handleClaimScrub = async () => {
    if (!claimForm.patientId || !claimForm.procedureCodes) {
      toast.error('Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await scrubClaimAPI(token, {
        ...claimForm,
        procedureCodes: claimForm.procedureCodes.split(',').map(code => code.trim()),
        diagnosisCodes: claimForm.diagnosisCodes.split(',').map(code => code.trim())
      });
      if (result) {
        setClaimValidationData(result.data);
      }
    } catch (error) {
      console.error('Claim scrub failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Benefits Check
  const handleBenefitsCheck = async () => {
    if (!eligibilityForm.patientId) {
      toast.error('Patient ID is required');
      return;
    }

    setLoading(true);
    try {
      const result = await checkBenefitsAPI(token, {
        patientId: eligibilityForm.patientId,
        serviceDate: eligibilityForm.serviceDate,
        procedureCodes: claimForm.procedureCodes.split(',').map(code => code.trim()).filter(Boolean)
      });
      if (result) {
        setBenefitsData(result.data);
      }
    } catch (error) {
      console.error('Benefits check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render Eligibility Status
  const renderEligibilityStatus = (status: string) => {
    const statusInfo = formatEligibilityStatus(status);
    return (
      <Badge variant={statusInfo.color === 'green' ? 'default' : 'destructive'}>
        {statusInfo.icon} {statusInfo.text}
      </Badge>
    );
  };

  // Render Validation Results
  const renderValidationResults = (validationData: any) => {
    if (!validationData) return null;

    const { errors = [], warnings = [], suggestions = [] } = validationData;
    const confidence = calculateClaimConfidence(validationData);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Validation Results</h3>
          <Badge variant={confidence.color === 'green' ? 'default' : 'destructive'}>
            Confidence: {confidence.score}%
          </Badge>
        </div>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Errors ({errors.length}):</strong>
              <ul className="mt-2 list-disc list-inside">
                {errors.map((error: any, index: number) => (
                  <li key={index}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {warnings.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warnings ({warnings.length}):</strong>
              <ul className="mt-2 list-disc list-inside">
                {warnings.map((warning: any, index: number) => (
                  <li key={index}>{warning.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {suggestions.length > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Suggestions ({suggestions.length}):</strong>
              <ul className="mt-2 list-disc list-inside">
                {suggestions.map((suggestion: any, index: number) => (
                  <li key={index}>{suggestion.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Eligibility & Claim Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="eligibility">Eligibility Check</TabsTrigger>
              <TabsTrigger value="validation">Claim Validation</TabsTrigger>
              <TabsTrigger value="benefits">Benefits & Coverage</TabsTrigger>
            </TabsList>

            {/* Eligibility Check Tab */}
            <TabsContent value="eligibility" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Patient Eligibility Verification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patientId">Patient ID *</Label>
                      <Input
                        id="patientId"
                        value={eligibilityForm.patientId}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, patientId: e.target.value }))}
                        placeholder="Enter patient ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="memberId">Member ID *</Label>
                      <Input
                        id="memberId"
                        value={eligibilityForm.memberId}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, memberId: e.target.value }))}
                        placeholder="Enter insurance member ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={eligibilityForm.firstName}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, firstName: e.target.value }))}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={eligibilityForm.lastName}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Enter last name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={eligibilityForm.dateOfBirth}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="serviceDate">Service Date</Label>
                      <Input
                        id="serviceDate"
                        type="date"
                        value={eligibilityForm.serviceDate}
                        onChange={(e) => setEligibilityForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleEligibilityCheck} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                      Check Eligibility
                    </Button>
                    <Button variant="outline" onClick={handleRealTimeVerification} disabled={loading}>
                      Real-time Verify
                    </Button>
                    <Button variant="outline" onClick={handleBenefitsCheck} disabled={loading}>
                      Check Benefits
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Eligibility Results */}
              {eligibilityData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Eligibility Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label>Status</Label>
                        <div className="mt-1">
                          {renderEligibilityStatus(eligibilityData.status)}
                        </div>
                      </div>
                      <div>
                        <Label>Coverage</Label>
                        <p className="text-lg font-semibold">{eligibilityData.coveragePercentage || 'N/A'}%</p>
                      </div>
                      <div>
                        <Label>Effective Date</Label>
                        <p>{eligibilityData.effectiveDate || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Deductible</Label>
                        <p>{formatCurrency(eligibilityData.deductible)}</p>
                      </div>
                      <div>
                        <Label>Copay</Label>
                        <p>{formatCurrency(eligibilityData.copay)}</p>
                      </div>
                      <div>
                        <Label>Out of Pocket Max</Label>
                        <p>{formatCurrency(eligibilityData.outOfPocketMax)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Claim Validation Tab */}
            <TabsContent value="validation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Claim Validation & Scrubbing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="claimPatientId">Patient ID *</Label>
                      <Input
                        id="claimPatientId"
                        value={claimForm.patientId}
                        onChange={(e) => setClaimForm(prev => ({ ...prev, patientId: e.target.value }))}
                        placeholder="Enter patient ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="claimServiceDate">Service Date</Label>
                      <Input
                        id="claimServiceDate"
                        type="date"
                        value={claimForm.serviceDate}
                        onChange={(e) => setClaimForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="procedureCodes">Procedure Codes (CPT) *</Label>
                      <Input
                        id="procedureCodes"
                        value={claimForm.procedureCodes}
                        onChange={(e) => setClaimForm(prev => ({ ...prev, procedureCodes: e.target.value }))}
                        placeholder="99213, 99214 (comma separated)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="diagnosisCodes">Diagnosis Codes (ICD-10)</Label>
                      <Input
                        id="diagnosisCodes"
                        value={claimForm.diagnosisCodes}
                        onChange={(e) => setClaimForm(prev => ({ ...prev, diagnosisCodes: e.target.value }))}
                        placeholder="Z00.00, M79.3 (comma separated)"
                      />
                    </div>
                    <div>
                      <Label htmlFor="placeOfService">Place of Service</Label>
                      <Select value={claimForm.placeOfService} onValueChange={(value) => setClaimForm(prev => ({ ...prev, placeOfService: value }))}>
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
                    <div>
                      <Label htmlFor="charges">Total Charges</Label>
                      <Input
                        id="charges"
                        type="number"
                        step="0.01"
                        value={claimForm.charges}
                        onChange={(e) => setClaimForm(prev => ({ ...prev, charges: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleClaimValidation} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      Validate Claim
                    </Button>
                    <Button variant="outline" onClick={handleClaimScrub} disabled={loading}>
                      Scrub Claim
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Results */}
              {claimValidationData && renderValidationResults(claimValidationData)}
            </TabsContent>

            {/* Benefits & Coverage Tab */}
            <TabsContent value="benefits" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Benefits & Coverage Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {benefitsData ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label>Plan Type</Label>
                          <p className="font-semibold">{benefitsData.planType || 'N/A'}</p>
                        </div>
                        <div>
                          <Label>Network Status</Label>
                          <Badge variant={benefitsData.inNetwork ? 'default' : 'destructive'}>
                            {benefitsData.inNetwork ? 'In-Network' : 'Out-of-Network'}
                          </Badge>
                        </div>
                        <div>
                          <Label>Prior Auth Required</Label>
                          <Badge variant={benefitsData.priorAuthRequired ? 'destructive' : 'default'}>
                            {benefitsData.priorAuthRequired ? 'Required' : 'Not Required'}
                          </Badge>
                        </div>
                      </div>

                      {benefitsData.benefits && (
                        <div>
                          <h4 className="font-semibold mb-2">Coverage Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {benefitsData.benefits.map((benefit: any, index: number) => (
                              <div key={index} className="border rounded p-3">
                                <h5 className="font-medium">{benefit.serviceType}</h5>
                                <p>Coverage: {benefit.coveragePercentage}%</p>
                                <p>Copay: {formatCurrency(benefit.copay)}</p>
                                <p>Deductible: {formatCurrency(benefit.deductible)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">Run an eligibility check to see benefits information</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EligibilityChecker;