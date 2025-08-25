import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Download
} from 'lucide-react';

interface PerformanceMetric {
  timestamp: string;
  responseTime: number;
  successRate: number;
  errorCount: number;
  throughput: number;
}

interface IntegrationHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  lastCheck: string;
  metrics: {
    avgResponseTime: number;
    successRate: number;
    errorRate: number;
    throughput: number;
    availability: number;
  };
  alerts: Array<{
    id: string;
    type: 'error' | 'warning' | 'info';
    message: string;
    timestamp: string;
  }>;
}

interface MonitoringProps {
  integrationId?: string;
}

const IntegrationMonitoring: React.FC<MonitoringProps> = ({ integrationId }) => {
  const [healthData, setHealthData] = useState<IntegrationHealth[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetric[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>(integrationId || 'all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMonitoringData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedIntegration, timeRange, autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      const [healthResponse, performanceResponse] = await Promise.all([
        fetch(`/api/v1/rcm/integrations/health${selectedIntegration !== 'all' ? `?id=${selectedIntegration}` : ''}`),
        fetch(`/api/v1/rcm/integrations/performance?range=${timeRange}${selectedIntegration !== 'all' ? `&id=${selectedIntegration}` : ''}`)
      ]);

      const healthData = await healthResponse.json();
      const performanceData = await performanceResponse.json();

      setHealthData(healthData.integrations || []);
      setPerformanceData(performanceData.metrics || []);
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      case 'offline':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculateTrend = (data: PerformanceMetric[], metric: keyof PerformanceMetric) => {
    if (data.length < 2) return 0;
    
    const recent = data.slice(-5);
    const older = data.slice(-10, -5);
    
    if (older.length === 0) return 0;
    
    const recentAvg = recent.reduce((sum, item) => sum + (item[metric] as number), 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + (item[metric] as number), 0) / older.length;
    
    return ((recentAvg - olderAvg) / olderAvg) * 100;
  };

  const exportData = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/integrations/monitoring/export?range=${timeRange}${selectedIntegration !== 'all' ? `&id=${selectedIntegration}` : ''}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integration-monitoring-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const responseTrend = calculateTrend(performanceData, 'responseTime');
  const successTrend = calculateTrend(performanceData, 'successRate');
  const throughputTrend = calculateTrend(performanceData, 'throughput');

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedIntegration} onValueChange={setSelectedIntegration}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrations</SelectItem>
              {healthData.map((integration) => (
                <SelectItem key={integration.id} value={integration.id}>
                  {integration.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {performanceData.length > 0 
                    ? Math.round(performanceData.reduce((sum, item) => sum + item.responseTime, 0) / performanceData.length)
                    : 0}ms
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {responseTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
                <span className={`text-sm ${responseTrend > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {Math.abs(responseTrend).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Success Rate</p>
                <p className="text-2xl font-bold">
                  {performanceData.length > 0 
                    ? (performanceData.reduce((sum, item) => sum + item.successRate, 0) / performanceData.length).toFixed(1)
                    : 0}%
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {successTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${successTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(successTrend).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Throughput</p>
                <p className="text-2xl font-bold">
                  {performanceData.length > 0 
                    ? Math.round(performanceData.reduce((sum, item) => sum + item.throughput, 0) / performanceData.length)
                    : 0}/min
                </p>
              </div>
              <div className="flex items-center space-x-1">
                {throughputTrend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`text-sm ${throughputTrend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(throughputTrend).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Integrations</p>
                <p className="text-2xl font-bold">
                  {healthData.filter(h => h.status === 'healthy').length}/{healthData.length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Integration Health Status</span>
          </CardTitle>
          <CardDescription>
            Real-time health monitoring for all integrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthData.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(integration.status)}
                    <div>
                      <h3 className="font-medium">{integration.name}</h3>
                      <p className="text-sm text-gray-500">
                        Last checked: {new Date(integration.lastCheck).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={integration.status === 'healthy' ? 'default' : 'destructive'}>
                    {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-3">
                  <div>
                    <p className="text-sm text-gray-500">Uptime</p>
                    <p className="font-medium">{integration.uptime.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Response Time</p>
                    <p className="font-medium">{integration.metrics.avgResponseTime}ms</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Success Rate</p>
                    <p className="font-medium">{integration.metrics.successRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Error Rate</p>
                    <p className="font-medium">{integration.metrics.errorRate.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Throughput</p>
                    <p className="font-medium">{integration.metrics.throughput}/min</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Availability</span>
                    <span>{integration.metrics.availability.toFixed(1)}%</span>
                  </div>
                  <Progress value={integration.metrics.availability} className="h-2" />
                </div>

                {integration.alerts.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">Recent Alerts</p>
                    {integration.alerts.slice(0, 3).map((alert) => (
                      <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between">
                            <span>{alert.message}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5" />
              <span>Response Time Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <LineChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Response time chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Success Rate Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Success rate distribution chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default IntegrationMonitoring;