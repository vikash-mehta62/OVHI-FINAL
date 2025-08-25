import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  Monitor, 
  RefreshCw,
  Server,
  TrendingUp,
  Zap,
  AlertCircle,
  Settings,
  Download
} from 'lucide-react';

interface PerformanceMetric {
  timestamp: string;
  value: number;
  unit?: string;
}

interface SystemAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  value?: number;
  threshold?: number;
}

interface PerformanceSummary {
  system: {
    healthy: boolean;
    issues: string[];
    avgCpuUsage?: number;
    avgMemoryUsage?: number;
  };
  application: {
    healthy: boolean;
    issues: string[];
  };
  database: {
    healthy: boolean;
    issues: string[];
  };
  api: {
    healthy: boolean;
    issues: string[];
    avgResponseTime?: number;
    errorRate?: number;
    totalRequests?: number;
  };
  alerts: {
    count: number;
    recent: SystemAlert[];
  };
}

const PerformanceMonitoringDashboard: React.FC = () => {
  const [performanceData, setPerformanceData] = useState<{
    system: PerformanceMetric[];
    api: PerformanceMetric[];
    database: PerformanceMetric[];
  }>({
    system: [],
    api: [],
    database: []
  });
  
  const [summary, setSummary] = useState<PerformanceSummary | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch performance summary
      const summaryResponse = await fetch('/api/v1/rcm/performance/summary');
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);
      
      // Fetch recent metrics
      const metricsResponse = await fetch('/api/v1/rcm/performance/metrics?timeRange=3600000'); // Last hour
      const metricsData = await metricsResponse.json();
      setPerformanceData(metricsData);
      
      // Fetch alerts
      const alertsResponse = await fetch('/api/v1/rcm/performance/alerts?status=active');
      const alertsData = await alertsResponse.json();
      setAlerts(alertsData);
      
      // Check monitoring status
      const statusResponse = await fetch('/api/v1/rcm/performance/status');
      const statusData = await statusResponse.json();
      setIsMonitoring(statusData.monitoring);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMonitoring = async () => {
    try {
      const action = isMonitoring ? 'stop' : 'start';
      await fetch(`/api/v1/rcm/performance/monitoring/${action}`, {
        method: 'POST'
      });
      
      setIsMonitoring(!isMonitoring);
      fetchPerformanceData();
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`/api/v1/rcm/performance/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });
      
      fetchPerformanceData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const exportMetrics = async () => {
    try {
      const response = await fetch('/api/v1/rcm/performance/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting metrics:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'info': return <CheckCircle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`;
    } else {
      return `${Math.floor(diffMins / 1440)}d ago`;
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Performance Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system performance and health monitoring
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={toggleMonitoring}
            className="flex items-center space-x-2"
          >
            {isMonitoring ? (
              <>
                <Activity className="h-4 w-4" />
                <span>Stop Monitoring</span>
              </>
            ) : (
              <>
                <Monitor className="h-4 w-4" />
                <span>Start Monitoring</span>
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <Button variant="outline" onClick={fetchPerformanceData}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {summary?.system.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">
                {summary?.system.healthy ? 'Healthy' : 'Issues'}
              </span>
            </div>
            {summary?.system.avgCpuUsage && (
              <p className="text-xs text-muted-foreground">
                CPU: {summary.system.avgCpuUsage}% | Memory: {summary.system.avgMemoryUsage}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {summary?.api.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">
                {summary?.api.avgResponseTime || 0}ms
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.api.totalRequests || 0} requests | {summary?.api.errorRate || 0}% errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {summary?.database.healthy ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-2xl font-bold">
                {summary?.database.healthy ? 'Optimal' : 'Slow'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Connection pool healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.alerts.count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {isMonitoring ? 'Monitoring active' : 'Monitoring stopped'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>Active Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Alert key={alert.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <AlertTitle className="text-sm">
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="ml-2">{alert.message}</span>
                      </AlertTitle>
                      <AlertDescription className="text-xs">
                        {formatDuration(alert.timestamp)} • Type: {alert.type}
                        {alert.value && alert.threshold && (
                          <span> • Value: {alert.value} (Threshold: {alert.threshold})</span>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Charts */}
      <Tabs defaultValue="system" className="space-y-4">
        <TabsList>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="batch">Batch Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>CPU Usage</CardTitle>
                <CardDescription>System CPU utilization over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData.system}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value)}`}
                      formatter={(value: number) => [`${value}%`, 'CPU Usage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>System memory utilization over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceData.system}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value)}`}
                      formatter={(value: number) => [`${value}%`, 'Memory Usage']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#82ca9d" 
                      fill="#82ca9d"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Response Times</CardTitle>
                <CardDescription>API response times over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData.api}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value)}`}
                      formatter={(value: number) => [`${value}ms`, 'Response Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#ff7300" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
                <CardDescription>API requests per minute</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData.api}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value)}`}
                      formatter={(value: number) => [value, 'Requests']}
                    />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>Average query execution times</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData.database}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={formatTimestamp}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => `Time: ${formatTimestamp(value)}`}
                      formatter={(value: number) => [`${value}ms`, 'Avg Query Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connection Pool</CardTitle>
                <CardDescription>Database connection utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Active Connections</span>
                      <span>15/20</span>
                    </div>
                    <Progress value={75} className="mt-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Cache Hit Rate</span>
                      <span>94.2%</span>
                    </div>
                    <Progress value={94.2} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Job Status</CardTitle>
              <CardDescription>Current batch processing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">5</div>
                  <div className="text-sm text-muted-foreground">Active Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">142</div>
                  <div className="text-sm text-muted-foreground">Completed Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">3</div>
                  <div className="text-sm text-muted-foreground">Failed Jobs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        {lastUpdate && (
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        )}
        {isMonitoring && (
          <span className="ml-4 flex items-center justify-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live monitoring active</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitoringDashboard;