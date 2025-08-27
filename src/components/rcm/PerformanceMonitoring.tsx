/**
 * Performance Monitoring Component
 * Displays RCM system performance metrics and cache statistics
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Database,
  Clock,
  Zap,
  RefreshCw,
  Trash2,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Server,
  BarChart3
} from 'lucide-react';
import { getPerformanceMetricsAPI, getCacheStatsAPI, clearCacheAPI, rcmHealthCheckAPI } from '@/services/operations/rcm';

interface PerformanceMetrics {
  queryMetrics: {
    totalQueries: number;
    averageResponseTime: number;
    slowQueries: any[];
    errorRate: number;
  };
  systemHealth: {
    status: string;
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}

interface CacheStats {
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  evictions: number;
  operations: {
    gets: number;
    sets: number;
    deletes: number;
  };
}

const PerformanceMonitoring: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [metricsResponse, cacheResponse, healthResponse] = await Promise.all([
        getPerformanceMetricsAPI(token),
        getCacheStatsAPI(token),
        rcmHealthCheckAPI(token)
      ]);

      if (metricsResponse?.success) {
        setMetrics(metricsResponse.data);
      }

      if (cacheResponse?.success) {
        setCacheStats(cacheResponse.data);
      }

      if (healthResponse?.success) {
        setHealthStatus(healthResponse.data);
      }
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      setClearing(true);
      const response = await clearCacheAPI(token);
      
      if (response?.success) {
        // Refresh cache stats after clearing
        const cacheResponse = await getCacheStatsAPI(token);
        if (cacheResponse?.success) {
          setCacheStats(cacheResponse.data);
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    } finally {
      setClearing(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getHealthStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading && !metrics && !cacheStats) {
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
          <h2 className="text-2xl font-bold">Performance Monitoring</h2>
          <p className="text-gray-500">Monitor RCM system performance and cache statistics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchAllData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleClearCache} disabled={clearing}>
            {clearing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Clear Cache
          </Button>
        </div>
      </div>

      {/* System Health Status */}
      {healthStatus && (
        <Alert className="border-blue-200 bg-blue-50">
          <div className="flex items-center">
            {getHealthStatusIcon(healthStatus.status)}
            <AlertDescription className="ml-2">
              <span className={`font-medium ${getHealthStatusColor(healthStatus.status)}`}>
                System Status: {healthStatus.status}
              </span>
              {healthStatus.uptime && (
                <span className="ml-4 text-gray-600">
                  Uptime: {formatUptime(healthStatus.uptime)}
                </span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Queries</p>
                    <p className="text-2xl font-bold">{metrics.queryMetrics?.totalQueries || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Avg Response Time</p>
                    <p className="text-2xl font-bold">
                      {metrics.queryMetrics?.averageResponseTime || 0}ms
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Slow Queries</p>
                    <p className="text-2xl font-bold">
                      {metrics.queryMetrics?.slowQueries?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Error Rate</p>
                    <p className="text-2xl font-bold">
                      {(metrics.queryMetrics?.errorRate || 0).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Cache Performance</span>
              </CardTitle>
              <CardDescription>
                Cache hit rate and memory usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Hit Rate</span>
                  <Badge variant={cacheStats.hitRate > 80 ? "default" : "secondary"}>
                    {cacheStats.hitRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={cacheStats.hitRate} className="w-full" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Total Keys</span>
                  <p className="font-medium">{cacheStats.totalKeys.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Memory Usage</span>
                  <p className="font-medium">{formatBytes(cacheStats.memoryUsage)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Evictions</span>
                  <p className="font-medium">{cacheStats.evictions.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-500">Operations</span>
                  <p className="font-medium">
                    {(cacheStats.operations.gets + cacheStats.operations.sets + cacheStats.operations.deletes).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Cache Operations</span>
              </CardTitle>
              <CardDescription>
                Breakdown of cache operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">GET Operations</span>
                  <span className="font-medium">{cacheStats.operations.gets.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">SET Operations</span>
                  <span className="font-medium">{cacheStats.operations.sets.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">DELETE Operations</span>
                  <span className="font-medium">{cacheStats.operations.deletes.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleClearCache}
                  disabled={clearing}
                  className="w-full"
                >
                  {clearing ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Clear All Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Memory Usage */}
      {metrics?.systemHealth && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>System Resources</span>
            </CardTitle>
            <CardDescription>
              Memory usage and system health metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-gray-500">
                  {formatBytes(metrics.systemHealth.memory.used)} / {formatBytes(metrics.systemHealth.memory.total)}
                </span>
              </div>
              <Progress value={metrics.systemHealth.memory.percentage} className="w-full" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>{metrics.systemHealth.memory.percentage.toFixed(1)}% used</span>
                <span>100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Slow Queries */}
      {metrics?.queryMetrics?.slowQueries && metrics.queryMetrics.slowQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>Slow Queries</span>
            </CardTitle>
            <CardDescription>
              Queries that took longer than expected to execute
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.queryMetrics.slowQueries.slice(0, 5).map((query, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Query #{index + 1}</span>
                    <Badge variant="secondary">{query.duration}ms</Badge>
                  </div>
                  <code className="text-xs bg-gray-100 p-2 rounded block overflow-x-auto">
                    {query.sql || 'Query details not available'}
                  </code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitoring;