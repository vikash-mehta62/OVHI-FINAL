import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle, DollarSign } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  checkEligibilityAPI,
  validateClaimAPI,
  formatEligibilityStatus,
  formatCurrency
} from '@/services/operations/eligibility';

interface QuickEligibilityCheckProps {
  patientId?: string;
  onResult?: (result: any) => void;
  compact?: boolean;
}

const QuickEligibilityCheck: React.FC<QuickEligibilityCheckProps> = ({
  patientId,
  onResult,
  compact = false
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    patientId: patientId || '',
    memberId: '',
    serviceDate: new Date().toISOString().split('T')[0]
  });

  const token = localStorage.getItem('token');

  const handleQuickCheck = async () => {
    if (!formData.patientId || !formData.memberId) {
      toast.error('Patient ID and Member ID are required');
      return;
    }

    setLoading(true);
    try {
      const response = await checkEligibilityAPI(token, formData);
      if (response) {
        setResult(response.data);
        onResult?.(response.data);
      }
    } catch (error) {
      console.error('Quick eligibility check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (compact) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4" />
            <span className="font-medium">Quick Eligibility</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Patient ID"
                value={formData.patientId}
                onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
                size="sm"
              />
              <Input
                placeholder="Member ID"
                value={formData.memberId}
                onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
                size="sm"
              />
            </div>

            <Button
              onClick={handleQuickCheck}
              disabled={loading}
              size="sm"
              className="w-full"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
              Check
            </Button>

            {result && (
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Status:</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(result.status)}
                    <span className="text-xs">{result.status}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Coverage:</span>
                  <span className="text-xs">{result.coveragePercentage || 'N/A'}%</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="h-5 w-5" />
          Quick Eligibility Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label htmlFor="quickPatientId">Patient ID</Label>
            <Input
              id="quickPatientId"
              value={formData.patientId}
              onChange={(e) => setFormData(prev => ({ ...prev, patientId: e.target.value }))}
              placeholder="Enter patient ID"
            />
          </div>

          <div>
            <Label htmlFor="quickMemberId">Member ID</Label>
            <Input
              id="quickMemberId"
              value={formData.memberId}
              onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
              placeholder="Enter insurance member ID"
            />
          </div>

          <div>
            <Label htmlFor="quickServiceDate">Service Date</Label>
            <Input
              id="quickServiceDate"
              type="date"
              value={formData.serviceDate}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
            />
          </div>
        </div>

        <Button
          onClick={handleQuickCheck}
          disabled={loading}
          className="w-full"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
          Check Eligibility
        </Button>

        {result && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              {getStatusIcon(result.status)}
              Eligibility Results
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={result.status === 'active' ? 'default' : 'destructive'}>
                  {result.status}
                </Badge>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Coverage:</span>
                <span className="text-sm font-semibold">{result.coveragePercentage || 'N/A'}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Deductible:</span>
                <span className="text-sm">{formatCurrency(result.deductible)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Copay:</span>
                <span className="text-sm">{formatCurrency(result.copay)}</span>
              </div>

              {result.effectiveDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Effective:</span>
                  <span className="text-sm">{new Date(result.effectiveDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuickEligibilityCheck;