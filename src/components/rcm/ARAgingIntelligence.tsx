import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { getARAgingReportAPI, initiateAutomatedFollowUpAPI, setupPaymentPlanAPI } from '@/services/operations/rcm';
import {
  Clock,
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Bot,
  Target,
  Filter,
  Download,
  Mail,
  Phone,
  CreditCard,
  CheckCircle
} from 'lucide-react';

interface ARBucket {
  range: string;
  amount: number;
  percentage: number;
  count: number;
  priority: 'high' | 'medium' | 'low';
  collectability: number;
}

interface ARAccount {
  id: string;
  patientName: string;
  payerName: string;
  balance: number;
  lastPayment: string;
  daysPastDue: number;
  collectabilityScore: number;
  recommendedAction: string;
  contactMethod: 'phone' | 'email' | 'letter';
  paymentPlan?: boolean;
}

const ARAgingIntelligence: React.FC = () => {
  const [selectedBucket, setSelectedBucket] = useState<string>('all');
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [arData, setArData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useSelector((state: RootState) => state.auth);

  // Fetch A/R aging data
  const fetchARData = async () => {
    setLoading(true);
    try {
      const response = await getARAgingReportAPI(token);
      if (response?.data) {
        setArData(response.data);
      }
    } catch (error) {
      console.error('Error fetching A/R data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchARData();
    }
  }, [token]);

  // Use real data or fallback to mock data
  const arBuckets: ARBucket[] = arData?.arBuckets || [
    {
      range: '0-30 days',
      amount: 0,
      percentage: 0,
      count: 0,
      priority: 'low',
      collectability: 95
    },
    {
      range: '31-60 days',
      amount: 0,
      percentage: 0,
      count: 0,
      priority: 'medium',
      collectability: 85
    },
    {
      range: '61-90 days',
      amount: 0,
      percentage: 0,
      count: 0,
      priority: 'high',
      collectability: 70
    },
    {
      range: '91-120 days',
      amount: 0,
      percentage: 0,
      count: 0,
      priority: 'high',
      collectability: 50
    },
    {
      range: '120+ days',
      amount: 0,
      percentage: 0,
      count: 0,
      priority: 'high',
      collectability: 25
    }
  ];

  const arAccounts: ARAccount[] = arData?.arAccounts || [];
  const totalAR = arData?.totalAR || 0;

  const handleAutomatedFollowUp = async (accountId: string) => {
    try {
      await initiateAutomatedFollowUpAPI(token, accountId);
      // Refresh data after follow-up
      fetchARData();
    } catch (error) {
      console.error('Failed to initiate follow-up:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      // Simulate bulk action
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${action} completed for selected accounts`);
    } catch (error) {
      toast.error(`Failed to complete ${action}`);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getCollectabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* A/R Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            A/R Aging Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm">Auto-Follow Up:</span>
              <input
                type="checkbox"
                checked={automationEnabled}
                onChange={(e) => setAutomationEnabled(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Total A/R Overview */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold">${totalAR.toLocaleString()}</span>
              <Badge variant="secondary">Total A/R</Badge>
            </div>
            <p className="text-muted-foreground">
              {arBuckets.reduce((sum, bucket) => sum + bucket.count, 0)} total accounts
            </p>
          </div>

          {/* A/R Buckets */}
          <div className="space-y-4">
            {arBuckets.map((bucket, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{bucket.range}</span>
                    <Badge className={getPriorityColor(bucket.priority)}>
                      {bucket.priority}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${bucket.amount.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{bucket.count} accounts</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Percentage of Total A/R</span>
                    <span>{bucket.percentage}%</span>
                  </div>
                  <Progress value={bucket.percentage} className="w-full" />

                  <div className="flex items-center justify-between text-sm">
                    <span>Collectability Score</span>
                    <span className={getCollectabilityColor(bucket.collectability)}>
                      {bucket.collectability}%
                    </span>
                  </div>
                  <Progress value={bucket.collectability} className="w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Individual Account Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI-Powered Collections Workflow
          </CardTitle>
          <div className="flex items-center gap-2">
            <select 
              value={selectedBucket} 
              onChange={(e) => setSelectedBucket(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm"
            >
              <option value="all">All Buckets</option>
              <option value="0-30">0-30 Days</option>
              <option value="31-60">31-60 Days</option>
              <option value="61-90">61-90 Days</option>
              <option value="91+">91+ Days</option>
            </select>
            <Button size="sm" onClick={() => handleBulkAction('Send Statements')}>
              <Mail className="h-4 w-4 mr-2" />
              Bulk Statements
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {arAccounts.map((account) => (
              <div key={account.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{account.patientName}</span>
                    <Badge variant="outline">{account.payerName}</Badge>
                    {account.paymentPlan && (
                      <Badge variant="secondary">
                        <CreditCard className="h-3 w-3 mr-1" />
                        Payment Plan
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${account.balance.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{account.daysPastDue} days</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Payment:</span>
                    <p className="font-medium">{account.lastPayment}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Collectability:</span>
                    <p className={`font-medium ${getCollectabilityColor(account.collectabilityScore)}`}>
                      {account.collectabilityScore}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contact Method:</span>
                    <div className="flex items-center gap-1">
                      {account.contactMethod === 'phone' && <Phone className="h-3 w-3" />}
                      {account.contactMethod === 'email' && <Mail className="h-3 w-3" />}
                      <span className="font-medium capitalize">{account.contactMethod}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Days Past Due:</span>
                    <p className="font-medium">{account.daysPastDue}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-md border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">AI Recommendation</span>
                  </div>
                  <p className="text-sm text-blue-700">{account.recommendedAction}</p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button 
                    size="sm" 
                    onClick={() => handleAutomatedFollowUp(account.id)}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Auto Follow-Up
                  </Button>
                  <Button size="sm" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Setup Payment Plan
                  </Button>
                  <Button size="sm" variant="ghost">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Resolved
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ARAgingIntelligence;