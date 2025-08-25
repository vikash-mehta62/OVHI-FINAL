/**
 * Compliance Monitor Component
 * Comprehensive dashboard for CMS compliance monitoring and regulatory tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Shield,
  FileText,
  Calendar,
  BarChart3,
  AlertCircle,
  Download,
  RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ComplianceMetrics {
  overall_score: number;
  validation_rate: number;
  first_pass_rate: number;
  denial_rate: number;
  timely_filing_rate: number;
  provider_enrollment_rate: number;
  medical_necessity_rate: number;
  total_claims: number;
  compliant_claims: number;
  non_compliant_claims: number;
  pending_review: number;
}

interface ComplianceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  deadline?: string;
  affected_claims: number;
  action_required: string;
  created_at: string;
}

interface ComplianceTrend {
  date: string;
  compliance_score: number;
  validation_rate: number;
  denial_rate: number;
  claims_processed: number;
}

interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: Array<{
    category: string;
    risk_level: string;
    description: string;
    impact: string;
    recommendation: string;
  }>;
  patterns_detected: Array<{
    pattern: string;
    frequency: number;
    impact: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
}

const ComplianceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [trends, setTrends] = useState<ComplianceTrend[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');

  useEffect(() => {
    loadComplianceData();
  }, [selectedTimeRange]);

  const loadComplianceData = async () => {
    setLoading(true);
    try {
      // Load compliance metrics
      const metricsResponse = await fetch(`/api/v1/rcm/compliance/metrics?timeRange=${selectedTimeRange}`);
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData.data);

      // Load compliance alerts
      const alertsResponse = await fetch('/api/v1/rcm/compliance/alerts');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData.data);

      // Load compliance trends
      const trendsResponse = await fetch(`/api/v1/rcm/compliance/trends?timeRange=${selectedTimeRange}`);
      const trendsData = await trendsResponse.json();
      setTrends(trendsData.data);

      // Load risk assessment
      const riskResponse = await fetch('/api/v1/rcm/compliance/risk-assessment');
      const riskData = await riskResponse.json();
      setRiskAssessment(riskData.data);

    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadComplianceData();
    setRefreshing(false);
  };

  const exportComplianceReport = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/compliance/reports/export?timeRange=${selectedTimeRange}`, {
        method: 'POST'
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export compliance report:', error);
    }
  };

  const getComplianceScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComplianceScoreBadge = (score: number) => {
    if (score >= 95) return 'bg-green-100 text-green-800';
    if (score >= 85) return 'bg-yellow-100 text-yellow-800';
    if (score >= 70) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <XCircle className="h-5 w-5 text-red-500" />;
    if (severity === 'high') return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (severity === 'medium') return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading compliance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compliance Monitor</h1>
          <p className="text-gray-600">CMS compliance tracking and regulatory monitoring</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportComplianceReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-800">Critical Compliance Issues</AlertTitle>
          <AlertDescription className="text-red-700">
            {alerts.filter(alert => alert.severity === 'critical').length} critical compliance issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Compliance Overview Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Compliance</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getComplianceScoreColor(metrics.overall_score)}`}>
                {metrics.overall_score}%
              </div>
              <Badge className={getComplianceScoreBadge(metrics.overall_score)}>
                {metrics.overall_score >= 95 ? 'Excellent' : 
                 metrics.overall_score >= 85 ? 'Good' : 
                 metrics.overall_score >= 70 ? 'Fair' : 'Poor'}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">First Pass Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.first_pass_rate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.compliant_claims} of {metrics.total_claims} claims
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Denial Rate</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.denial_rate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.non_compliant_claims} denied claims
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{metrics.pending_review}</div>
              <p className="text-xs text-muted-foreground">
                Claims requiring review
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compliance Metrics Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {metrics && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Validation Rate</span>
                        <span>{metrics.validation_rate}%</span>
                      </div>
                      <Progress value={metrics.validation_rate} className="mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Timely Filing Rate</span>
                        <span>{metrics.timely_filing_rate}%</span>
                      </div>
                      <Progress value={metrics.timely_filing_rate} className="mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Provider Enrollment Rate</span>
                        <span>{metrics.provider_enrollment_rate}%</span>
                      </div>
                      <Progress value={metrics.provider_enrollment_rate} className="mt-1" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Medical Necessity Rate</span>
                        <span>{metrics.medical_necessity_rate}%</span>
                      </div>
                      <Progress value={metrics.medical_necessity_rate} className="mt-1" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Compliance Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Trends</CardTitle>
                <CardDescription>30-day compliance score trend</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="compliance_score" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      name="Compliance Score"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="validation_rate" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      name="Validation Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={`border-l-4 ${
                alert.severity === 'critical' ? 'border-l-red-500' :
                alert.severity === 'high' ? 'border-l-orange-500' :
                alert.severity === 'medium' ? 'border-l-yellow-500' :
                'border-l-blue-500'
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type, alert.severity)}
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                    {alert.deadline && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Due: {new Date(alert.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-2">{alert.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Affects {alert.affected_claims} claims</span>
                    <span>Action: {alert.action_required}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Compliance Trends</CardTitle>
              <CardDescription>Historical compliance performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="compliance_score" 
                    stackId="1"
                    stroke="#8884d8" 
                    fill="#8884d8"
                    name="Compliance Score"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="validation_rate" 
                    stackId="2"
                    stroke="#82ca9d" 
                    fill="#82ca9d"
                    name="Validation Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risk" className="space-y-6">
          {riskAssessment && (
            <>
              {/* Overall Risk Score */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment Overview</CardTitle>
                  <CardDescription>Current compliance risk evaluation</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl font-bold ${getRiskLevelColor(riskAssessment.overall_risk)}`}>
                        {riskAssessment.overall_risk.toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Risk Score: {riskAssessment.risk_score}/100
                      </div>
                    </div>
                    <div className="w-32">
                      <Progress 
                        value={riskAssessment.risk_score} 
                        className={`${
                          riskAssessment.overall_risk === 'critical' ? 'bg-red-200' :
                          riskAssessment.overall_risk === 'high' ? 'bg-orange-200' :
                          riskAssessment.overall_risk === 'medium' ? 'bg-yellow-200' :
                          'bg-green-200'
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Factors */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Factors</CardTitle>
                  <CardDescription>Identified compliance risk factors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskAssessment.risk_factors.map((factor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{factor.category}</h4>
                          <Badge className={getRiskLevelColor(factor.risk_level)}>
                            {factor.risk_level}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{factor.description}</p>
                        <div className="text-xs text-gray-500">
                          <div>Impact: {factor.impact}</div>
                          <div>Recommendation: {factor.recommendation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pattern Detection */}
              <Card>
                <CardHeader>
                  <CardTitle>Pattern Detection</CardTitle>
                  <CardDescription>Detected compliance patterns and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {riskAssessment.patterns_detected.map((pattern, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{pattern.pattern}</div>
                          <div className="text-sm text-gray-500">
                            Frequency: {pattern.frequency} | Impact: {pattern.impact}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {pattern.trend === 'increasing' ? (
                            <TrendingUp className="h-5 w-5 text-red-500" />
                          ) : pattern.trend === 'decreasing' ? (
                            <TrendingDown className="h-5 w-5 text-green-500" />
                          ) : (
                            <BarChart3 className="h-5 w-5 text-gray-500" />
                          )}
                          <span className="ml-2 text-sm capitalize">{pattern.trend}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComplianceMonitor;