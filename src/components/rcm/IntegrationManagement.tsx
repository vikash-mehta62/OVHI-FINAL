/**
 * Integration Management Component
 * Comprehensive dashboard for managing external system integrations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Settings,
  Play,
  Pause,
  RefreshCw,
  Activity,
  BarChart3,
  FileText,
  Zap,
  Shield,
  Database,
  Globe,
  Eye,
  Edit,
  TestTube,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Integration {
  integration_id: string;
  integration_name: string;
  integration_type: string;
  status: 'healthy' | 'unhealthy' | 'connected' | 'error' | 'unknown';
  is_active: boolean;
  endpoint_url: string;
  last_health_check: string;
  response_time?: number;
  uptime_percentage?: number;
  error?: string;
  configuration?: any;
}

interface IntegrationLog {
  id: number;
  integration_id: string;
  activity_type: string;
  status: string;
  response_time_ms?: number;
  error_message?: string;
  created_at: string;
  details?: any;
}

interface PerformanceMetric {
  integration_id: string;
  activity_type: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
}

const IntegrationManagement: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadIntegrationData();
  }, []);

  const loadIntegrationData = async () => {
    setLoading(true);
    try {
      // Load integration status
      const statusResponse = await fetch('/api/v1/rcm/integrations/status');
      const statusData = await statusResponse.json();
      
      if (statusData.success) {
        const integrationList = Object.entries(statusData.data.connections || {}).map(([id, status]: [string, any]) => ({
          integration_id: id,
          integration_name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          integration_type: getIntegrationType(id),
          ...status
        }));
        setIntegrations(integrationList);
      }

      // Load recent logs
      const logsResponse = await fetch('/api/v1/rcm/integrations/logs?limit=50');
      const logsData = await logsResponse.json();
      
      if (logsData.success) {
        setLogs(logsData.data.logs);
      }

      // Load performance metrics
      const metricsResponse = await fetch('/api/v1/rcm/integrations/performance?timeRange=24h');
      const metricsData = await metricsResponse.json();
      
      if (metricsData.success) {
        setPerformanceMetrics(metricsData.data.metrics);
      }

    } catch (error) {
      console.error('Failed to load integration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await loadIntegrationData();
    setRefreshing(false);
  };

  const testIntegration = async (integrationId: string) => {
    setTesting(true);
    try {
      const response = await fetch(`/api/v1/rcm/integrations/${integrationId}/test`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh integration status after test
        await loadIntegrationData();
      }
    } catch (error) {
      console.error('Integration test failed:', error);
    } finally {
      setTesting(false);
      setTestDialogOpen(false);
    }
  };

  const getIntegrationType = (integrationId: string): string => {
    if (integrationId.includes('cms')) return 'CMS';
    if (integrationId.includes('clearinghouse')) return 'Clearinghouse';
    if (integrationId.includes('prior_auth')) return 'Prior Auth';
    if (integrationId.includes('era')) return 'ERA Processor';
    if (integrationId.includes('payer')) return 'Payer';
    return 'Other';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'unknown':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-100 text-green-800',
      connected: 'bg-green-100 text-green-800',
      unhealthy: 'bg-red-100 text-red-800',
      error: 'bg-red-100 text-red-800',
      unknown: 'bg-yellow-100 text-yellow-800'
    };
    
    return variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800';
  };

  const getActivityTypeIcon = (activityType: string) => {
    switch (activityType) {
      case 'eligibility_verification':
        return <Shield className="h-4 w-4" />;
      case 'prior_authorization':
        return <FileText className="h-4 w-4" />;
      case 'claim_submission':
        return <Database className="h-4 w-4" />;
      case 'status_inquiry':
        return <Eye className="h-4 w-4" />;
      case 'era_processing':
        return <BarChart3 className="h-4 w-4" />;
      case 'health_check':
        return <Activity className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const calculateOverallHealth = () => {
    if (integrations.length === 0) return 0;
    const healthyCount = integrations.filter(i => i.status === 'healthy' || i.status === 'connected').length;
    return Math.round((healthyCount / integrations.length) * 100);
  };

  const getPerformanceData = () => {
    return performanceMetrics.map(metric => ({
      name: metric.integration_id,
      success_rate: metric.total_requests > 0 ? 
        Math.round((metric.successful_requests / metric.total_requests) * 100) : 0,
      avg_response_time: metric.avg_response_time,
      total_requests: metric.total_requests
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-lg">Loading integration data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integration Management</h1>
          <p className="text-gray-600">Monitor and manage external system integrations</p>
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
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateOverallHealth()}%</div>
            <Progress value={calculateOverallHealth()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              of {integrations.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy Connections</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.status === 'healthy' || i.status === 'connected').length}
            </div>
            <p className="text-xs text-muted-foreground">
              connections online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Connections</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {integrations.filter(i => i.status === 'unhealthy' || i.status === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">
              need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Integration Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Integration Status Distribution</CardTitle>
                <CardDescription>Current status of all integrations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Healthy', value: integrations.filter(i => i.status === 'healthy' || i.status === 'connected').length, fill: '#10b981' },
                        { name: 'Unhealthy', value: integrations.filter(i => i.status === 'unhealthy' || i.status === 'error').length, fill: '#ef4444' },
                        { name: 'Unknown', value: integrations.filter(i => i.status === 'unknown').length, fill: '#f59e0b' }
                      ]}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Success rates by integration</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="success_rate" fill="#8884d8" name="Success Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>  
      {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.integration_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(integration.status)}
                    <div>
                      <h3 className="text-lg font-semibold">{integration.integration_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{integration.integration_type}</Badge>
                        <Badge className={getStatusBadge(integration.status)}>
                          {integration.status}
                        </Badge>
                        {!integration.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {integration.response_time && (
                      <div className="text-sm text-gray-500">
                        {integration.response_time}ms
                      </div>
                    )}
                    {integration.uptime_percentage && (
                      <div className="text-sm text-gray-500">
                        {integration.uptime_percentage}% uptime
                      </div>
                    )}
                    
                    <Dialog open={testDialogOpen && selectedIntegration?.integration_id === integration.integration_id} 
                            onOpenChange={setTestDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedIntegration(integration)}
                        >
                          <TestTube className="h-4 w-4 mr-1" />
                          Test
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Test Integration Connection</DialogTitle>
                          <DialogDescription>
                            Test the connection to {integration.integration_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <p>This will perform a health check on the integration endpoint.</p>
                          {integration.endpoint_url && (
                            <p className="text-sm text-gray-500 mt-2">
                              Endpoint: {integration.endpoint_url}
                            </p>
                          )}
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => testIntegration(integration.integration_id)}
                            disabled={testing}
                          >
                            {testing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube className="h-4 w-4 mr-2" />
                                Run Test
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={configDialogOpen && selectedIntegration?.integration_id === integration.integration_id} 
                            onOpenChange={setConfigDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedIntegration(integration)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configure
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Configure Integration</DialogTitle>
                          <DialogDescription>
                            Manage settings for {integration.integration_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="endpoint">Endpoint URL</Label>
                            <Input 
                              id="endpoint" 
                              defaultValue={integration.endpoint_url}
                              placeholder="https://api.example.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="timeout">Timeout (seconds)</Label>
                            <Input 
                              id="timeout" 
                              type="number"
                              defaultValue="30"
                              placeholder="30"
                            />
                          </div>
                          <div>
                            <Label htmlFor="retries">Retry Attempts</Label>
                            <Input 
                              id="retries" 
                              type="number"
                              defaultValue="3"
                              placeholder="3"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              id="active"
                              defaultChecked={integration.is_active}
                            />
                            <Label htmlFor="active">Active</Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button>Save Configuration</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                {integration.error && (
                  <Alert className="mt-4 border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <AlertTitle className="text-red-800">Connection Error</AlertTitle>
                    <AlertDescription className="text-red-700">
                      {integration.error}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="mt-4 text-sm text-gray-500">
                  Last health check: {new Date(integration.last_health_check).toLocaleString()}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Response Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Average Response Times</CardTitle>
                <CardDescription>Response time by integration (ms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avg_response_time" fill="#82ca9d" name="Avg Response Time (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Request Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
                <CardDescription>Total requests by integration (24h)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_requests" fill="#ffc658" name="Total Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Performance Metrics</CardTitle>
              <CardDescription>Comprehensive performance data for all integrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Integration</th>
                      <th className="text-left p-2">Activity Type</th>
                      <th className="text-right p-2">Total Requests</th>
                      <th className="text-right p-2">Success Rate</th>
                      <th className="text-right p-2">Avg Response Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMetrics.map((metric, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{metric.integration_id}</td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            {getActivityTypeIcon(metric.activity_type)}
                            <span>{metric.activity_type.replace(/_/g, ' ')}</span>
                          </div>
                        </td>
                        <td className="text-right p-2">{metric.total_requests}</td>
                        <td className="text-right p-2">
                          <span className={`px-2 py-1 rounded text-sm ${
                            (metric.successful_requests / metric.total_requests) * 100 >= 95 
                              ? 'bg-green-100 text-green-800' 
                              : (metric.successful_requests / metric.total_requests) * 100 >= 80
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {Math.round((metric.successful_requests / metric.total_requests) * 100)}%
                          </span>
                        </td>
                        <td className="text-right p-2">{metric.avg_response_time}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Integration Activity</CardTitle>
              <CardDescription>Latest integration requests and responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getActivityTypeIcon(log.activity_type)}
                      <div>
                        <div className="font-medium">{log.integration_id}</div>
                        <div className="text-sm text-gray-500">
                          {log.activity_type.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      {log.response_time_ms && (
                        <div className="text-sm text-gray-500">
                          {log.response_time_ms}ms
                        </div>
                      )}
                      
                      <Badge className={
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'failure' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {log.status}
                      </Badge>
                      
                      <div className="text-sm text-gray-500">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Integration Settings</CardTitle>
              <CardDescription>Configure global settings for all integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="health-check-interval">Health Check Interval (minutes)</Label>
                <Input 
                  id="health-check-interval" 
                  type="number"
                  defaultValue="5"
                  placeholder="5"
                />
              </div>
              
              <div>
                <Label htmlFor="default-timeout">Default Timeout (seconds)</Label>
                <Input 
                  id="default-timeout" 
                  type="number"
                  defaultValue="30"
                  placeholder="30"
                />
              </div>
              
              <div>
                <Label htmlFor="max-retries">Maximum Retry Attempts</Label>
                <Input 
                  id="max-retries" 
                  type="number"
                  defaultValue="3"
                  placeholder="3"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="auto-retry" defaultChecked />
                <Label htmlFor="auto-retry">Enable automatic retry on failures</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input type="checkbox" id="health-monitoring" defaultChecked />
                <Label htmlFor="health-monitoring">Enable continuous health monitoring</Label>
              </div>
              
              <Button className="mt-4">Save Global Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Audit Trail</CardTitle>
              <CardDescription>Export integration logs and audit data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="export-start-date">Start Date</Label>
                  <Input 
                    id="export-start-date" 
                    type="date"
                    defaultValue={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="export-end-date">End Date</Label>
                  <Input 
                    id="export-end-date" 
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="export-integration">Integration (Optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="All integrations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Integrations</SelectItem>
                    {integrations.map(integration => (
                      <SelectItem key={integration.integration_id} value={integration.integration_id}>
                        {integration.integration_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationManagement;