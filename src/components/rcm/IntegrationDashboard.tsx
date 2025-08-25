import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  Activity, 
  RefreshCw,
  Clock,
  TrendingUp,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  type: 'eligibility' | 'clearinghouse' | 'payer' | 'era' | 'prior_auth';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastSync: string;
  uptime: number;
  responseTime: number;
  errorCount: number;
  successRate: number;
  configuration: Record<string, any>;
}

interface IntegrationMetrics {
  totalIntegrations: number;
  activeConnections: number;
  avgResponseTime: number;
  totalTransactions: number;
  errorRate: number;
}

const IntegrationDashboard: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [metrics, setMetrics] = useState<IntegrationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
    fetchMetrics();
  }, []);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch('/api/v1/rcm/integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/v1/rcm/integrations/metrics');
      const data = await response.json();
      setMetrics(data.metrics);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setLoading(false);
    }
  };

  const testConnection = async (integrationId: string) => {
    setTestingConnection(integrationId);
    try {
      const response = await fetch(`/api/v1/rcm/integrations/${integrationId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        // Update integration status
        setIntegrations(prev => prev.map(int => 
          int.id === integrationId 
            ? { ...int, status: 'connected', lastSync: new Date().toISOString() }
            : int
        ));
      }
    } catch (error) {
      console.error('Error testing connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      connected: 'default',
      disconnected: 'secondary',
      error: 'destructive',
      testing: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Integrations</p>
                  <p className="text-2xl font-bold">{metrics.totalIntegrations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Active Connections</p>
                  <p className="text-2xl font-bold">{metrics.activeConnections}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Avg Response Time</p>
                  <p className="text-2xl font-bold">{metrics.avgResponseTime}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Total Transactions</p>
                  <p className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Error Rate</p>
                  <p className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedIntegration(integration)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(integration.status)}
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                  <CardDescription>
                    {integration.type.replace('_', ' ').toUpperCase()} Integration
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Last Sync</p>
                      <p className="font-medium">
                        {new Date(integration.lastSync).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Uptime</p>
                      <p className="font-medium">{integration.uptime.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Response Time</p>
                      <p className="font-medium">{integration.responseTime}ms</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Success Rate</p>
                      <p className="font-medium">{integration.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span>{integration.successRate.toFixed(1)}%</span>
                    </div>
                    <Progress value={integration.successRate} className="h-2" />
                  </div>
                  
                  {integration.errorCount > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {integration.errorCount} errors in the last 24 hours
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        testConnection(integration.id);
                      }}
                      disabled={testingConnection === integration.id}
                    >
                      {testingConnection === integration.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Activity className="h-4 w-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIntegration(integration);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle>Integration Configuration</CardTitle>
              <CardDescription>
                Configure and manage external system integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Select an integration from the overview tab to configure its settings.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Performance Monitoring</CardTitle>
              <CardDescription>
                Real-time monitoring of integration performance and health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Performance monitoring dashboard will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Integration activity logs and audit trail
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Audit trail and logging information will be displayed here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationDashboard;