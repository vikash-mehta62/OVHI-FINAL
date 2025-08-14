import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Shield, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

interface EligibilityResult {
  status: 'active' | 'inactive' | 'pending' | 'terminated';
  effectiveDate: string;
  terminationDate?: string;
  deductible: {
    individual: number;
    family: number;
    remaining: number;
  };
  outOfPocketMax: {
    individual: number;
    family: number;
    remaining: number;
  };
  copays: {
    primaryCare: number;
    specialist: number;
    emergency: number;
    urgentCare: number;
  };
  benefits: {
    service: string;
    covered: boolean;
    authRequired: boolean;
    copay?: number;
    coinsurance?: number;
    notes?: string;
  }[];
  lastVerified: string;
  verificationId: string;
}

interface InsuranceEligibilityVerificationProps {
  patientId: string;
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    groupNumber: string;
    subscriberId: string;
  };
}

const InsuranceEligibilityVerification: React.FC<InsuranceEligibilityVerificationProps> = ({
  patientId,
  insuranceInfo
}) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceType, setServiceType] = useState('office-visit');
  const [notes, setNotes] = useState('');

  const handleVerifyEligibility = async () => {
    setIsVerifying(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockResult: EligibilityResult = {
        status: 'active',
        effectiveDate: '2024-01-01',
        deductible: {
          individual: 1500,
          family: 3000,
          remaining: 800
        },
        outOfPocketMax: {
          individual: 4500,
          family: 9000,
          remaining: 3200
        },
        copays: {
          primaryCare: 25,
          specialist: 50,
          emergency: 150,
          urgentCare: 75
        },
        benefits: [
          {
            service: 'Office Visit - Primary Care',
            covered: true,
            authRequired: false,
            copay: 25
          },
          {
            service: 'Office Visit - Specialist',
            covered: true,
            authRequired: false,
            copay: 50
          },
          {
            service: 'Diagnostic Lab',
            covered: true,
            authRequired: false,
            coinsurance: 20,
            notes: 'Subject to deductible'
          },
          {
            service: 'MRI/CT Scan',
            covered: true,
            authRequired: true,
            coinsurance: 20,
            notes: 'Prior authorization required'
          },
          {
            service: 'Physical Therapy',
            covered: true,
            authRequired: false,
            copay: 40,
            notes: 'Limited to 20 visits per year'
          }
        ],
        lastVerified: new Date().toISOString(),
        verificationId: `VER-${Date.now()}`
      };
      
      setEligibilityResult(mockResult);
      setIsVerifying(false);
      toast.success('Insurance eligibility verified successfully');
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'inactive':
      case 'terminated':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-red-100 text-red-800 border-red-200',
      terminated: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Insurance Eligibility Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insuranceInfo && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Insurance Provider</Label>
                <p className="text-sm">{insuranceInfo.provider}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Policy Number</Label>
                <p className="text-sm">{insuranceInfo.policyNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Group Number</Label>
                <p className="text-sm">{insuranceInfo.groupNumber}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Subscriber ID</Label>
                <p className="text-sm">{insuranceInfo.subscriberId}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
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
              <select
                id="serviceType"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              >
                <option value="office-visit">Office Visit</option>
                <option value="specialist">Specialist Consultation</option>
                <option value="diagnostic">Diagnostic Testing</option>
                <option value="procedure">Medical Procedure</option>
                <option value="emergency">Emergency Care</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional notes or specific services to verify..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            onClick={handleVerifyEligibility} 
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying Eligibility...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Verify Insurance Eligibility
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {eligibilityResult && (
        <div className="space-y-4">
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  {getStatusIcon(eligibilityResult.status)}
                  <span className="ml-2">Eligibility Status</span>
                </span>
                {getStatusBadge(eligibilityResult.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Effective Date</Label>
                  <p className="font-semibold">{new Date(eligibilityResult.effectiveDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Last Verified</Label>
                  <p className="font-semibold">{new Date(eligibilityResult.lastVerified).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Verification ID</Label>
                  <p className="font-semibold text-xs">{eligibilityResult.verificationId}</p>
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Print Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Deductible Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Individual Deductible:</span>
                    <span className="font-semibold">${eligibilityResult.deductible.individual.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Family Deductible:</span>
                    <span className="font-semibold">${eligibilityResult.deductible.family.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Remaining:</span>
                    <span className="font-bold text-green-600">${eligibilityResult.deductible.remaining.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Out-of-Pocket Maximum
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Individual Max:</span>
                    <span className="font-semibold">${eligibilityResult.outOfPocketMax.individual.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Family Max:</span>
                    <span className="font-semibold">${eligibilityResult.outOfPocketMax.family.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Remaining:</span>
                    <span className="font-bold text-blue-600">${eligibilityResult.outOfPocketMax.remaining.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Copay Information */}
          <Card>
            <CardHeader>
              <CardTitle>Copay Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Primary Care</p>
                  <p className="text-xl font-bold text-green-600">${eligibilityResult.copays.primaryCare}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Specialist</p>
                  <p className="text-xl font-bold text-blue-600">${eligibilityResult.copays.specialist}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Emergency</p>
                  <p className="text-xl font-bold text-red-600">${eligibilityResult.copays.emergency}</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Urgent Care</p>
                  <p className="text-xl font-bold text-orange-600">${eligibilityResult.copays.urgentCare}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Coverage */}
          <Card>
            <CardHeader>
              <CardTitle>Benefits Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eligibilityResult.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center">
                        {benefit.covered ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mr-2" />
                        )}
                        <span className="font-medium">{benefit.service}</span>
                        {benefit.authRequired && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Auth Required
                          </Badge>
                        )}
                      </div>
                      {benefit.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{benefit.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {benefit.copay && (
                        <p className="font-semibold">${benefit.copay} copay</p>
                      )}
                      {benefit.coinsurance && (
                        <p className="font-semibold">{benefit.coinsurance}% coinsurance</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InsuranceEligibilityVerification;