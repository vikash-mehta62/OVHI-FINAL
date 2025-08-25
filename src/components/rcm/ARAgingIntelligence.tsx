import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign, 
  Users, 
  Clock,
  Target,
  Brain,
  Zap
} from 'lucide-react';
import { formatCurrency } from '@/utils/rcmFormatters';

interface ARAccount {
  account_id: number;
  patient_id: number;
  current_balance: number;
  days_outstanding: number;
  first_name: string;
  last_name: string;
  insurance_name: string;
  aging_bucket: string;
}

interface ARAnalysis {
  totalOutstanding: number;
  agingBuckets: Record<string, { count: number; amount: number }>;
  collectionProbability: number;
  accounts: ARAccount[];
  riskDistribution: Record<string, number>;
}

interface PredictionResult {
  accountId: number;
  predictionScore: number;
  confidenceLevel: number;
  riskFactors: string[];
  recommendedActions: string[];
}

const ARAgingIntelligence: React.FC = () => {
  const [analysis, setAnalysis] = useState<ARAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ARAccount | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [filters, setFilters] = useState({
    providerId: '',
    payerId: '',
    minBalance: ''
  });

  useEffect(() => {
    loadARAnalysis();
  }, []);

  const loadARAnalysis = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.providerId) queryParams.append('providerId', filters.providerId);
      if (filters.payerId) queryParams.append('payerId', filters.payerId);
      if (filters.minBalance) queryParams.append('minBalance', filters.minBalance);

      const response = await fetch(`/api/v1/rcm-advanced/ar-aging/analyze?${queryParams}`);
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data.data);
      }
    } catch (error) {
      console.error('Error loading AR analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrediction = async (accountId: number) => {
    try {
      const response = await fetch(`/api/v1/rcm-advanced/ar-aging/predict/${accountId}`);
      const data = await response.json();
      
      if (data.success) {
        setPrediction(data.data);
      }
    } catch (error) {
      console.error('Error loading prediction:', error);
    }
  };

  const triggerAutomatedActions = async () => {
    try {
      const thresholds = {
        riskScoreThreshold: 80,
        balanceThreshold: 1000,
        daysOutstandingThreshold: 90
      };

      const response = await fetch('/api/v1/rcm-advanced/ar-aging/trigger-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds)
      });

      const data = await response.json();
      if (data.success) {
        alert(`Triggered ${data.data.length} automated actions`);
      }
    } catch (error) {
      console.error('Error triggering actions:', error);
    }
  };



  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPredictionColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const agingBucketData = analysis ? Object.entries(analysis.agingBuckets).map(([bucket, data]) => ({
    bucket,
    count: data.count,
    amount: data.amount
  })) : [];

  const riskDistributionData = analysis ? Object.entries(analysis.riskDistribution).map(([risk, count]) => ({
    risk,
    count,
    color: getRiskColor(risk)
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AR Aging Intelligence</h1>
          <p className="text-gray-600">AI-powered accounts receivable analysis and collection optimization</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadARAnalysis} variant="outline">
            <Brain className="w-4 h-4 mr-2" />
            Refresh Analysis
          </Button>
          <Button onClick={triggerAutomatedActions}>
            <Zap className="w-4 h-4 mr-2" />
            Trigger Actions
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analysis.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">
                Across {analysis.accounts.length} accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Probability</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analysis.collectionProbability.toFixed(1)}%</div>
              <Progress value={analysis.collectionProbability} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analysis.riskDistribution.high || 0) + (analysis.riskDistribution.critical || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Days Outstanding</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analysis.accounts.length > 0 
                  ? Math.round(analysis.accounts.reduce((sum, acc) => sum + acc.days_outstanding, 0) / analysis.accounts.length)
                  : 0
                } days
              </div>
              <p className="text-xs text-muted-foreground">
                Average across all accounts
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="accounts">Account Details</TabsTrigger>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aging Buckets Chart */}
            <Card>
              <CardHeader>
                <CardTitle>AR Aging Distribution</CardTitle>
                <CardDescription>Outstanding amounts by aging bucket</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={agingBucketData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Account risk level breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ risk, count }) => `${risk}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {riskDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Detailed view of accounts receivable</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Patient</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Balance</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Days Outstanding</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Aging Bucket</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Insurance</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis?.accounts.slice(0, 20).map((account) => (
                      <tr key={account.account_id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {account.first_name} {account.last_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {formatCurrency(account.current_balance)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {account.days_outstanding} days
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge variant={account.aging_bucket === '120+' ? 'destructive' : 'secondary'}>
                            {account.aging_bucket}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {account.insurance_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAccount(account);
                              loadPrediction(account.account_id);
                            }}
                          >
                            Predict
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          {selectedAccount && prediction ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Collection Prediction</CardTitle>
                  <CardDescription>
                    AI prediction for {selectedAccount.first_name} {selectedAccount.last_name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getPredictionColor(prediction.predictionScore)}`}>
                      {prediction.predictionScore.toFixed(1)}%
                    </div>
                    <p className="text-sm text-gray-600">Collection Probability</p>
                    <Progress value={prediction.predictionScore} className="mt-2" />
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Confidence Level</h4>
                    <div className="flex items-center gap-2">
                      <Progress value={prediction.confidenceLevel} className="flex-1" />
                      <span className="text-sm">{prediction.confidenceLevel}%</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Account Details</h4>
                    <div className="space-y-1 text-sm">
                      <p>Balance: {formatCurrency(selectedAccount.current_balance)}</p>
                      <p>Days Outstanding: {selectedAccount.days_outstanding} days</p>
                      <p>Aging Bucket: {selectedAccount.aging_bucket}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Risk Factors & Actions</CardTitle>
                  <CardDescription>AI-identified risk factors and recommendations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Risk Factors</h4>
                    <div className="space-y-1">
                      {prediction.riskFactors.map((factor, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{factor}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Recommended Actions</h4>
                    <div className="space-y-2">
                      {prediction.recommendedActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <Target className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select an account from the Account Details tab to view AI predictions</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ARAgingIntelligence;