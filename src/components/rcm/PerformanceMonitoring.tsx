/**
 * Performance Monitoring Component
 * System health and performance metrics dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Server
} from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceMetrics {
  timestamp: string;
  timeframe: string;
  database: {
    connectionPool: {
      totalConnections: number;
      activeConnections: number;
      utilizationRate: number;
    };
    queryPerformance: {
      total_queries: number;
      avg_query_time_seconds: number;
      slow_queries: number;
    };
    healthScore: number;
  };
  api: {
    summary: {
      totalRequests: number;
      errorRate: number;
      avgResponseTime: number;
      throughput: number;
    };
    healthScore: number;
  };
  system: {
    memory: {
      total: number;
      used: number;
      usagePercentage: number;
    };
    cpu: {
      usagePercentage: number;
      coreCount: number;
    };
    disk: {
      usagePercentage: number;
    };
    healthScore: number;
  };
  scores: {
    database: number;
    api: number;
    rcm: number;
    system: number;
    overall: number;
    grade: string;
  };
  alerts: Array<{
    id: string;
    type: string;
    message: string;
    severity: string;
    created_at: string;
  }>;
}

const PerformanceMonitoring: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState('1h');
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Sample data for demonstration
  useEffect(() => {
    const sampleMetrics: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      timeframe: '1h',
      database: {
        connectionPool: {
          totalConnections: 20,
          activeConnections: 8,
          utilizationRate: 40
        },
        queryPerformance: {
          total_queries: 1250,
          avg_query_time_seconds: 0.045,
          slow_queries: 3
        },
        healthScore: 92
      },
      api: {
        summary: {
          totalRequests: 2840,
          errorRate: 1.2,
          avgResponseTime: 245,
          throughput: 47.3
        },
        healthScore: 88
      },
      system: {
        memory: {
          total: 16000000000,
          used: 9600000000,
          usagePercentage: 60
        },
        cpu: {
          usagePercentage: 35,
          coreCount: 8
        },
        disk: {
          usagePercentage: 45
        },
        healthScore: 85
      },
      scores: {
        database: 92,
        api: 88,
        rcm: 90,
        system: 85,
        overall: 89,
        grade: 'B+'
      },
      alerts: [
        {
          id: '1',
          type: 'HIGH_RESPONSE_TIME',
          message: 'API response time exceeded 5 seconds for /rcm/claims endpoint',
          severity: 'medium',
          created_at: '2024-01-20T10:30:00Z'
        },
        {
          id: '2',
          type: 'SLOW_QUERY',
          message: 'Database query took 8.5 seconds to complete',
          severity: 'high',
          created_at: '2024-01-20T10:25:00Z'
        }
      ]
    };

    setMetrics(sampleMetrics);
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, timeframe]);

  const fetchMetrics = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/v1/rcm/enhanced/performance/metrics?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMetrics(result.data);
      } else {
        throw new Error('Failed to fetch metrics');
      }
    } catch (error) {
      console.error('Metrics fetch error:', error);
      toast.error('Failed to fetch performance metrics');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800';
    if (score >= 80) return 'bg-blue-100 text-blue-800';
    if (score >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!metrics) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Monitoring</h2>
          <p className="text-gray-600">System health and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15m">Last 15m</SelectItem>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 text-green-700' : ''}
          >
            <Activity className="w-4 h-4 mr-2" />
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button variant="outline" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            System Health Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">
                <span className={getHealthColor(metrics.scores.overall)}>
                  {metrics.scores.overall}
                </span>
                <span className="text-lg text-gray-500 ml-1">/ 100</span>
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
              <Badge className={getHealthBadgeColor(metrics.scores.overall)}>
                Grade {metrics.scores.grade}
              </Badge>
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${getHealthColor(metrics.scores.database)}`}>
                {metrics.scores.database}
              </div>
              <p className="text-sm text-gray-600">Database</p>
              <Progress value={metrics.scores.database} className="mt-2" />
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${getHealthColor(metrics.scores.api)}`}>
                {metrics.scores.api}
              </div>
              <p className="text-sm text-gray-600">API</p>
              <Progress value={metrics.scores.api} className="mt-2" />
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${getHealthColor(metrics.scores.rcm)}`}>
                {metrics.scores.rcm}
              </div>
              <p className="text-sm text-gray-600">RCM</p>
              <Progress value={metrics.scores.rcm} className="mt-2" />
            </div>

            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${getHealthColor(metrics.scores.system)}`}>
                {metrics.scores.system}
              </div>
              <p className="text-sm text-gray-600">System</p>
              <Progress value={metrics.scores.system} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">API Requests</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics.api.summary.totalRequests.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{timeframe}</p>
                  </div>
                  <Zap className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="text-2xl font-bold text-red-600">
                      {metrics.api.summary.errorRate}%
                    </p>
                    <p className="text-xs text-gray-500">Target: {'<'} 2%</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Response</p>
                    <p className="text-2xl font-bold text-green-600">
                      {metrics.api.summary.avgResponseTime}ms
                    </p>
                    <p className="text-xs text-gray-500">Target: {'<'} 500ms</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Memory Usage</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {metrics.system.memory.usagePercentage}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
                    </p>
                  </div>
                  <MemoryStick className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Database Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Pool</span>
                    <Badge variant="outline">
                      {metrics.database.connectionPool.activeConnections}/{metrics.database.connectionPool.totalConnections}
                    </Badge>
                  </div>
                  <Progress value={metrics.database.connectionPool.utilizationRate} />
                  <div className="flex items-center justify-between text-sm">
                    <span>Avg Query Time</span>
                    <span>{(metrics.database.queryPerformance.avg_query_time_seconds * 1000).toFixed(1)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Throughput</span>
                    <span className="font-medium">{metrics.api.summary.throughput} req/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-medium text-green-600">
                      {(100 - metrics.api.summary.errorRate).toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={100 - metrics.api.summary.errorRate} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">CPU Usage</span>
                    <span className="font-medium">{metrics.system.cpu.usagePercentage}%</span>
                  </div>
                  <Progress value={metrics.system.cpu.usagePercentage} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Disk Usage</span>
                    <span className="font-medium">{metrics.system.disk.usagePercentage}%</span>
                  </div>
                  <Progress value={metrics.system.disk.usagePercentage} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Connections</span>
                    <span className="font-bold">{metrics.database.connectionPool.totalConnections}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Connections</span>
                    <span className="font-bold text-blue-600">{metrics.database.connectionPool.activeConnections}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Utilization Rate</span>
                    <span className="font-bold">{metrics.database.connectionPool.utilizationRate}%</span>
                  </div>
                  <Progress value={metrics.database.connectionPool.utilizationRate} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Queries</span>
                    <span className="font-bold">{metrics.database.queryPerformance.total_queries.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg Query Time</span>
                    <span className="font-bold text-green-600">
                      {(metrics.database.queryPerformance.avg_query_time_seconds * 1000).toFixed(1)}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Slow Queries</span>
                    <span className={`font-bold ${metrics.database.queryPerformance.slow_queries > 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.database.queryPerformance.slow_queries}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Total Requests</span>
                    <span className="font-bold">{metrics.api.summary.totalRequests.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Throughput</span>
                    <span className="font-bold text-blue-600">{metrics.api.summary.throughput} req/min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <span className={`font-bold ${metrics.api.summary.errorRate > 2 ? 'text-red-600' : 'text-green-600'}`}>
                      {metrics.api.summary.errorRate}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Avg Response Time</span>
                    <span className="font-bold text-green-600">{metrics.api.summary.avgResponseTime}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Performance trend charts would be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">CPU Usage</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics.system.cpu.usagePercentage}%</span>
                </div>
                <Progress value={metrics.system.cpu.usagePercentage} />
                <p className="text-sm text-gray-600 mt-2">{metrics.system.cpu.coreCount} cores</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MemoryStick className="w-5 h-5 text-purple-500" />
                    <span className="font-medium">Memory Usage</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics.system.memory.usagePercentage}%</span>
                </div>
                <Progress value={metrics.system.memory.usagePercentage} />
                <p className="text-sm text-gray-600 mt-2">
                  {formatBytes(metrics.system.memory.used)} / {formatBytes(metrics.system.memory.total)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Disk Usage</span>
                  </div>
                  <span className="text-2xl font-bold">{metrics.system.disk.usagePercentage}%</span>
                </div>
                <Progress value={metrics.system.disk.usagePercentage} />
                <p className="text-sm text-gray-600 mt-2">Storage utilization</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
              <CardDescription>
                System alerts and notifications requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.alerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{alert.type.replace(/_/g, ' ')}</h4>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                      </div>
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                
                {metrics.alerts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-500">No active alerts</p>
                    <p className="text-sm text-gray-400">System is running smoothly</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitoring;