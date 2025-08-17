import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  DollarSign,
  FileText,
  RefreshCw,
  Search,
  Calendar
} from 'lucide-react';
import { apiConnector } from '@/services/apiConnector';

interface EligibilityResult {
  eligibilityId: number;
  eligibilityStatus: string;
  benefitInformation: any;
  priorAuthRequired: boolean;
  issues: any[];
  riskLevel: string;
  recommendations: any[];
}

interface EligibilityCheckerProps {
  patientId?: number;
  onEligibilityChecked?: (result: EligibilityResult) => void;
}

const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  patientId: propPatientId,
  onEligibilityChecked
}) => {
  const { token } = useSelector((state: any) => state.auth);
  const [patientId, setPatientId] = useState(propPatientId || '');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(['30']); // Default: General health benefit
  const [loading, setLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityHistory, setEligibilityHistory] = useState<any[]>([]);

  useEffect(() => {
    if (propPatientId) {
      loadEligibilityHistory(propPatientId);
    }
  }, [propPatientId]);

  const checkEligibility = async () => {
    if (!patientId || !serviceDate) {
      setError('Patient ID and service date are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiConnector(
        'POST',
        '/api/v1/rcm/eligibility/check',
        {
          patientId: parseInt(patientId.toString()),
          serviceDate,
          serviceTypes
        },
        {
          Authorization: `Bearer ${token}`,
        }
      );

      if (response.data.success) {
        const result = response.data.data;
        setEligibilityResult(result);
        onEligibilityChecked?.(result);
        
        // Refresh history if checking for the same patient
        if (propPatientId) {
          loadEligibilityHistory(propPatientId);
        }
      } else {
        setError(response.data.error || 'Eligibility check failed');
      }

    } catch (error: any) {
      console.error('Eligibility check error:', error);
      setError(error.response?.data?.message || 'Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibilityHistory = async (patientIdToLoad: number) => {
    try {
      const response = await apiConnector(
        'GET',
        `/api/v1/rcm/eligibility/history/${patientIdToLoad}?limit=10`,
        null,
        {
          Authorization: `Bearer ${token}`,
        }
      );

      if (response.data.success) {
        setEligibilityHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error loading eligibility history:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'eligible':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'inactive':
      case 'not_eligible':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-600 text-white'
    };

    return (
      <Badge className={variants[riskLevel as keyof typeof variants] || variants.MEDIUM}>
        {riskLevel} Risk
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Eligibility Check Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Real-Time Eligibility Verification
          </CardTitle>
          <CardDescription>
            Verify patient insurance eligibility and benefits before service
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                type="number"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID"
                disabled={!!propPatientId}
              />
            </div>
            <div>
              <Label htmlFor="serviceDate">Service Date</Label>
              <Input
                id="serviceDate"
                type="date"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="serviceType">Service Type</Label>
              <Select
                value={serviceTypes[0]}
                onValueChange={(value) => setServiceTypes([value])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">General Health Benefit</SelectItem>
                  <SelectItem value="1">Medical Care</SelectItem>
                  <SelectItem value="33">Chiropractic</SelectItem>
                  <SelectItem value="35">Dental Care</SelectItem>
                  <SelectItem value="47">Hospital</SelectItem>
                  <SelectItem value="86">Emergency Services</SelectItem>
                  <SelectItem value="88">Pharmacy</SelectItem>
                  <SelectItem value="98">Professional Physician Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <Alert className="border-red-500">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={checkEligibility} 
            disabled={loading || !patientId || !serviceDate}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Checking Eligibility...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Check Eligibility
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Eligibility Results */}
      {eligibilityResult && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="benefits">Benefits</TabsTrigger>
            <TabsTrigger value="issues">Issues & Recommendations</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {getStatusIcon(eligibilityResult.eligibilityStatus)}
                    Eligibility Status
                  </span>
                  {getRiskBadge(eligibilityResult.riskLevel)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Coverage Status</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Eligibility:</span>
                        <Badge variant={eligibilityResult.eligibilityStatus === 'active' ? 'default' : 'destructive'}>
                          {eligibilityResult.eligibilityStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Prior Auth Required:</span>
                        <Badge variant={eligibilityResult.priorAuthRequired ? 'destructive' : 'secondary'}>
                          {eligibilityResult.priorAuthRequired ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Denial Risk:</span>
                        {getRiskBadge(eligibilityResult.riskLevel)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Quick Actions</h4>
                    <div className="space-y-2">
                      {eligibilityResult.priorAuthRequired && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Prior authorization required before service
                          </AlertDescription>
                        </Alert>
                      )}
                      {eligibilityResult.riskLevel === 'HIGH' && (
                        <Alert className="border-red-500">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription className="text-red-700">
                            High denial risk - verify insurance before service
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benefits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Benefit Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eligibilityResult.benefitInformation ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Deductible Information */}
                    {eligibilityResult.benefitInformation.deductible && (
                      <div>
                        <h4 className="font-semibold mb-3">Deductible</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Individual:</span>
                            <span>{formatCurrency(eligibilityResult.benefitInformation.deductible.individual || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Family:</span>
                            <span>{formatCurrency(eligibilityResult.benefitInformation.deductible.family || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Remaining:</span>
                            <span className="font-semibold">
                              {formatCurrency(eligibilityResult.benefitInformation.deductible.remaining || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Copay Information */}
                    {eligibilityResult.benefitInformation.copay && (
                      <div>
                        <h4 className="font-semibold mb-3">Copayments</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Primary Care:</span>
                            <span>{formatCurrency(eligibilityResult.benefitInformation.copay.primaryCare || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Specialist:</span>
                            <span>{formatCurrency(eligibilityResult.benefitInformation.copay.specialist || 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Emergency:</span>
                            <span>{formatCurrency(eligibilityResult.benefitInformation.copay.emergency || 0)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Out-of-Pocket Information */}
                    <div>
                      <h4 className="font-semibold mb-3">Out-of-Pocket</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Maximum:</span>
                          <span>{formatCurrency(eligibilityResult.benefitInformation.outOfPocketMax || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining:</span>
                          <span className="font-semibold">
                            {formatCurrency(eligibilityResult.benefitInformation.outOfPocketRemaining || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Coinsurance */}
                    <div>
                      <h4 className="font-semibold mb-3">Coinsurance</h4>
                      <div className="text-2xl font-bold">
                        {eligibilityResult.benefitInformation.coinsurance || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Patient responsibility after deductible
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No benefit information available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <div className="space-y-4">
              {/* Issues */}
              {eligibilityResult.issues && eligibilityResult.issues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      Identified Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {eligibilityResult.issues.map((issue, index) => (
                        <Alert key={index} className={
                          issue.severity === 'HIGH' ? 'border-red-500' :
                          issue.severity === 'MEDIUM' ? 'border-yellow-500' :
                          'border-blue-500'
                        }>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-medium">{issue.message}</div>
                            <div className="text-sm mt-1">{issue.recommendation}</div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {eligibilityResult.recommendations && eligibilityResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {eligibilityResult.recommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">{rec.message}</div>
                              <div className="text-sm text-muted-foreground mt-1">{rec.action}</div>
                            </div>
                            <Badge variant={
                              rec.type === 'URGENT' ? 'destructive' :
                              rec.type === 'REQUIRED' ? 'default' :
                              'secondary'
                            }>
                              {rec.type}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!eligibilityResult.issues || eligibilityResult.issues.length === 0) &&
               (!eligibilityResult.recommendations || eligibilityResult.recommendations.length === 0) && (
                <Card>
                  <CardContent className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      Eligibility verification completed successfully with no issues or recommendations.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Eligibility History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eligibilityHistory.length > 0 ? (
                  <div className="space-y-3">
                    {eligibilityHistory.map((entry, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(entry.eligibility_status)}
                            <div>
                              <div className="font-medium">
                                {new Date(entry.request_date).toLocaleDateString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Status: {entry.eligibility_status}
                              </div>
                            </div>
                          </div>
                          {getRiskBadge(entry.denial_risk_level)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-muted-foreground">No eligibility history available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EligibilityChecker;