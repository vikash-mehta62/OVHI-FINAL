/**
 * ClaimMD Integration Component
 * Manages ClaimMD API configuration and ERA processing integration
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface ClaimMDConfig {
  baseUrl: string;
  providerId: string;
  isActive: boolean;
  hasApiKey: boolean;
  additionalConfig: {
    timeout_seconds: number;
    retry_attempts: number;
    auto_post_enabled: boolean;
    webhook_enabled: boolean;
    rate_limit_per_hour: number;
  };
}

interface ConnectionTest {
  success: boolean;
  status?: number;
  statusText?: string;
  responseTime?: number;
  error?: string;
}

const ClaimMDIntegration: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [config, setConfig] = useState<ClaimMDConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(null);
  const [formData, setFormData] = useState({
    api_key: '',
    base_url: 'https://api.claim.md',
    provider_id: '',
    is_active: true,
    configuration_data: {
      timeout_seconds: 30,
      retry_attempts: 3,
      auto_post_enabled: false,
      webhook_enabled: false,
      rate_limit_per_hour: 100
    }
  });

  useEffect(() => {
    fetchConfiguration();
  }, []);

  const fetchConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/rcm/claimmd/configuration', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfig(data.data);
          setFormData({
            api_key: '', // Don't populate API key for security
            base_url: data.data.baseUrl,
            provider_id: data.data.providerId,
            is_active: data.data.isActive,
            configuration_data: data.data.additionalConfig
          });
        }
      }
    } catch (error) {
      console.error('Error fetching ClaimMD configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/v1/rcm/claimmd/configuration', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        await fetchConfiguration();
        setConnectionTest(null); // Reset connection test
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await fetch('/api/v1/rcm/claimmd/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setConnectionTest(data.data || data);
    } catch (error) {
      console.error('Error testing connection:', error);
      setConnectionTest({
        success: false,
        error: 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('configuration_data.')) {
      const configField = field.replace('configuration_data.', '');
      setFormData(prev => ({
        ...prev,
        configuration_data: {
          ...prev.configuration_data,
          [configField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading ClaimMD configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ClaimMD Integration</h2>
          <p className="text-gray-500">Configure ClaimMD API integration for ERA processing</p>
        </div>
        <div className="flex items-center space-x-2">
          {config && (
            <Badge variant={config.isActive ? "default" : "secondary"}>
              {config.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
          <Button onClick={handleTestConnection} disabled={testing || !config?.hasApiKey}>
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {connectionTest && (
        <Alert className={connectionTest.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
          <div className="flex items-center">
            {connectionTest.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className="ml-2">
              {connectionTest.success ? (
                <span>Connection successful! Response time: {connectionTest.responseTime}ms</span>
              ) : (
                <span>Connection failed: {connectionTest.error}</span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="status">Status & Monitoring</TabsTrigger>
          <TabsTrigger value="settings">Advanced Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>API Configuration</span>
              </CardTitle>
              <CardDescription>
                Configure your ClaimMD API credentials and connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    placeholder="Enter your ClaimMD API key"
                    value={formData.api_key}
                    onChange={(e) => handleInputChange('api_key', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    {config?.hasApiKey ? "API key is configured" : "API key is required"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider_id">Provider ID</Label>
                  <Input
                    id="provider_id"
                    placeholder="Your ClaimMD Provider ID"
                    value={formData.provider_id}
                    onChange={(e) => handleInputChange('provider_id', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    placeholder="https://api.claim.md"
                    value={formData.base_url}
                    onChange={(e) => handleInputChange('base_url', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="is_active">Integration Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                    <span className="text-sm">
                      {formData.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={fetchConfiguration}>
                  Reset
                </Button>
                <Button onClick={handleSaveConfiguration} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Shield className="h-4 w-4 mr-2" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Integration Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">API Connection</span>
                  <div className="flex items-center space-x-2">
                    {connectionTest?.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : connectionTest?.success === false ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {connectionTest?.success ? "Connected" : 
                       connectionTest?.success === false ? "Disconnected" : "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Configuration</span>
                  <div className="flex items-center space-x-2">
                    {config?.hasApiKey ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {config?.hasApiKey ? "Complete" : "Incomplete"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Integration Status</span>
                  <Badge variant={config?.isActive ? "default" : "secondary"}>
                    {config?.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ExternalLink className="h-5 w-5" />
                  <span>Quick Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open('https://api.claim.md/docs', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View ClaimMD API Documentation
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Test API Connection
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={fetchConfiguration}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Configuration
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Configure advanced ClaimMD integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="10"
                    max="120"
                    value={formData.configuration_data.timeout_seconds}
                    onChange={(e) => handleInputChange('configuration_data.timeout_seconds', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry_attempts">Retry Attempts</Label>
                  <Input
                    id="retry_attempts"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.configuration_data.retry_attempts}
                    onChange={(e) => handleInputChange('configuration_data.retry_attempts', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_limit">Rate Limit (requests/hour)</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    min="10"
                    max="1000"
                    value={formData.configuration_data.rate_limit_per_hour}
                    onChange={(e) => handleInputChange('configuration_data.rate_limit_per_hour', parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Auto-Post Payments</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.configuration_data.auto_post_enabled}
                      onCheckedChange={(checked) => handleInputChange('configuration_data.auto_post_enabled', checked)}
                    />
                    <span className="text-sm">
                      {formData.configuration_data.auto_post_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Webhook Integration</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.configuration_data.webhook_enabled}
                      onCheckedChange={(checked) => handleInputChange('configuration_data.webhook_enabled', checked)}
                    />
                    <span className="text-sm">
                      {formData.configuration_data.webhook_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfiguration} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2" />
                  )}
                  Save Advanced Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaimMDIntegration;