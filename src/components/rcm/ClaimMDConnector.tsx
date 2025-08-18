import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Download,
  Sync,
  FileText,
  Activity,
  TrendingUp
} from 'lucide-react';

interface ClaimSubmission {
  id: number;
  claim_id: number;
  claimmd_id: string;
  submission_status: string;
  confirmation_number: string;
  submission_date: string;
  response_date?: string;
  error_count: number;
  retry_count: number;
  claim_number: string;
  first_name: string;
  last_name: string;
}

interface ClaimMDDashboard {
  submissionStats: Array<{
    submission_status: string;
    count: number;
    submission_date: string;
  }>;
  errorStats: Array<{
    error_code: string;
    error_severity: string;
    count: number;
  }>;
  recentSubmissions: ClaimSubmission[];
  summary: {
    totalSubmissions: number;
    successRate: number;
    avgProcessingTime: number;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const ClaimMDConnector: React.FC = () => {
  const [dashboard, setDashboard] = useState<ClaimMDDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [claimMDId, setClaimMDId] = useState('');
  const [claimStatus, setClaimStatus] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/rcm-advanced/claimmd/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setDashboard(data.data);
      }
    } catch (error) {
      console.error('Error loading ClaimMD dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async (claim: any) => {
    try {
      const response = await fetch('/api/v1/rcm-advanced/claimmd/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claim)
      });

      const data = await response.json();
      if (data.success) {
        alert(`Claim submitted successfully. ClaimMD ID: ${data.data.claimMDId}`);
        loadDashboard();
      } else {
        alert(`Submission failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      alert('Error submitting claim');
    }
  };

  const validateClaim = async (claimData: any) => {
    try {
      const response = await fetch('/api/v1/rcm-advanced/claimmd/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(claimData)
      });

      const data = await response.json();
      if (data.success) {
        setValidationResult(data.data);
      }
    } catch (error) {
      console.error('Error validating claim:', error);
    }
  };

  const getClaimStatus = async () => {
    if (!claimMDId) return;

    try {
      const response = await fetch(`/api/v1/rcm-advanced/claimmd/status/${claimMDId}`);
      const data = await response.json();
      
      if (data.success) {
        setClaimStatus(data.data);
      }
    } catch (error) {
      console.error('Error getting claim status:', error);
    }
  };

  const syncAllStatuses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/rcm-advanced/claimmd/sync-statuses', {
        method: 'POST'
      });

      const data = await response.json();
      if (data.success) {
        alert(`Synced ${data.data.length} claim statuses`);
        loadDashboard();
      }
    } catch (error) {
      console.error('Error syncing statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadERA = async (eraId: string) => {
    try {
      const response = await fetch(`/api/v1/rcm-advanced/claimmd/era/${eraId}/download`);
      const data = await response.json();
      
      if (data.success) {
        alert(`ERA downloaded: ${data.data.fileName}`);
      }
    } catch (error) {
      console.error('Error downloading ERA:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return 'bg-green-500';
      case 'submitted': return 'bg-blue-500';
      case 'rejected': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'accepted': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const submissionChartData = dashboard?.submissionStats.map(stat => ({
    date: new Date(stat.submission_date).toLocaleDateString(),
    [stat.submission_status]: stat.count
  })) || [];

  const errorChartData = dashboard?.errorStats.slice(0, 10).map(error => ({
    code: error.error_code,
    count: error.count,
    severity: error.error_severity
  })) || [];

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
          <h1 className="text-3xl font-bold">ClaimMD Connector</h1>
          <p className="text-gray-600">Seamless integration with ClaimMD clearinghouse services</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadDashboard} variant="outline">
            <Activity className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={syncAllStatuses}>
            <Sync className="w-4 h-4 mr-2" />
            Sync Statuses
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.summary.totalSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.summary.successRate.toFixed(1)}%</div>
              <Progress value={dashboard.summary.successRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Processing Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.summary.avgProcessingTime.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">
                Average response time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {((100 - dashboard.summary.successRate)).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="status">Status Check</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Submission Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Submission Status Trends</CardTitle>
                <CardDescription>Daily submission status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={submissionChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="accepted" fill="#10b981" name="Accepted" />
                    <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                    <Bar dataKey="pending" fill="#f59e0b" name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Top Error Codes</CardTitle>
                <CardDescription>Most common submission errors</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={errorChartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="code" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Error Details */}
          <Card>
            <CardHeader>
              <CardTitle>Error Details</CardTitle>
              <CardDescription>Detailed error analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Error Code</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Severity</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Count</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.errorStats.slice(0, 10).map((error, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-mono">
                          {error.error_code}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge variant={error.error_severity === 'critical' ? 'destructive' : 'secondary'}>
                            {error.error_severity}
                          </Badge>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {error.count}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {((error.count / dashboard.summary.totalSubmissions) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>Latest claim submissions to ClaimMD</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Claim Number</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Patient</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">ClaimMD ID</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Submitted</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Errors</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard?.recentSubmissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2">
                          {submission.claim_number}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {submission.first_name} {submission.last_name}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 font-mono">
                          {submission.claimmd_id}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(submission.submission_status)}
                            <Badge className={getStatusColor(submission.submission_status)}>
                              {submission.submission_status}
                            </Badge>
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {new Date(submission.submission_date).toLocaleDateString()}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          {submission.error_count > 0 && (
                            <Badge variant="destructive">{submission.error_count}</Badge>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setClaimMDId(submission.claimmd_id);
                              getClaimStatus();
                            }}
                          >
                            Check Status
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

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claim Status Check</CardTitle>
              <CardDescription>Check the status of a specific claim in ClaimMD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="claimmd-id">ClaimMD ID</Label>
                  <Input
                    id="claimmd-id"
                    value={claimMDId}
                    onChange={(e) => setClaimMDId(e.target.value)}
                    placeholder="Enter ClaimMD ID"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={getClaimStatus} disabled={!claimMDId}>
                    <Activity className="w-4 h-4 mr-2" />
                    Check Status
                  </Button>
                </div>
              </div>

              {claimStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>ClaimMD ID</Label>
                        <p className="font-mono">{claimStatus.claimMDId}</p>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(claimStatus.status)}
                          <Badge className={getStatusColor(claimStatus.status)}>
                            {claimStatus.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label>Status Date</Label>
                        <p>{new Date(claimStatus.statusDate).toLocaleString()}</p>
                      </div>
                      <div>
                        <Label>Details</Label>
                        <p>{claimStatus.statusDetails}</p>
                      </div>
                    </div>

                    {claimStatus.paymentInfo && (
                      <div>
                        <Label>Payment Information</Label>
                        <pre className="bg-gray-100 p-2 rounded text-sm">
                          {JSON.stringify(claimStatus.paymentInfo, null, 2)}
                        </pre>
                      </div>
                    )}

                    {claimStatus.denialInfo && (
                      <div>
                        <Label>Denial Information</Label>
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {JSON.stringify(claimStatus.denialInfo, null, 2)}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claim Validation</CardTitle>
              <CardDescription>Validate claim data before submission to ClaimMD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="claim-data">Claim Data (JSON)</Label>
                <textarea
                  id="claim-data"
                  className="w-full h-32 p-2 border rounded"
                  placeholder="Enter claim data in JSON format"
                  onChange={(e) => {
                    try {
                      const claimData = JSON.parse(e.target.value);
                      validateClaim(claimData);
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                />
              </div>

              {validationResult && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={validationResult.isValid ? 'text-green-600' : 'text-red-600'}>
                      {validationResult.isValid ? 'Validation Passed' : 'Validation Failed'}
                    </span>
                  </div>

                  {validationResult.errors.length > 0 && (
                    <div>
                      <Label>Errors</Label>
                      <div className="space-y-2">
                        {validationResult.errors.map((error, index) => (
                          <Alert key={index} variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {validationResult.warnings.length > 0 && (
                    <div>
                      <Label>Warnings</Label>
                      <div className="space-y-2">
                        {validationResult.warnings.map((warning, index) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{warning}</AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaimMDConnector;