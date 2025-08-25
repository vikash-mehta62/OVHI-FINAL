import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  TestTube, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Key,
  Globe,
  Shield,
  Clock
} from 'lucide-react';

interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  authentication: {
    type: 'api_key' | 'oauth' | 'basic' | 'certificate';
    credentials: Record<string, string>;
  };
  settings: Record<string, any>;
  healthCheck: {
    enabled: boolean;
    interval: number;
    endpoint: string;
  };
}

interface ConfigurationProps {
  integrationId: string;
  onSave?: (config: IntegrationConfig) => void;
  onCancel?: () => void;
}

const IntegrationConfiguration: React.FC<ConfigurationProps> = ({
  integrationId,
  onSave,
  onCancel
}) => {
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfiguration();
  }, [integrationId]);

  const fetchConfiguration = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/integrations/${integrationId}/config`);
      const data = await response.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Error fetching configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateConfiguration = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config?.name?.trim()) {
      newErrors.name = 'Integration name is required';
    }

    if (!config?.endpoint?.trim()) {
      newErrors.endpoint = 'Endpoint URL is required';
    } else if (!/^https?:\/\/.+/.test(config.endpoint)) {
      newErrors.endpoint = 'Please enter a valid URL';
    }

    if (!config?.apiKey?.trim() && config?.authentication?.type === 'api_key') {
      newErrors.apiKey = 'API Key is required for API key authentication';
    }

    if (config?.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
      newErrors.timeout = 'Timeout must be between 1000ms and 60000ms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!config || !validateConfiguration()) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/rcm/integrations/${integrationId}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        onSave?.(config);
      } else {
        const error = await response.json();
        setErrors({ general: error.message || 'Failed to save configuration' });
      }
    } catch (error) {
      setErrors({ general: 'Network error occurred while saving' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config || !validateConfiguration()) return;

    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch(`/api/v1/rcm/integrations/${integrationId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.message || (result.success ? 'Connection successful' : 'Connection failed')
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error occurred during test'
      });
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;

    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setConfig(newConfig);
    
    // Clear related errors
    if (errors[path]) {
      const newErrors = { ...errors };
      delete newErrors[path];
      setErrors(newErrors);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Configuration not found for this integration.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{config.name} Configuration</h2>
          <p className="text-gray-500">Configure integration settings and authentication</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={config.enabled ? 'default' : 'secondary'}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>
      </div>

      {errors.general && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errors.general}</AlertDescription>
        </Alert>
      )}

      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="health">Health Check</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Integration Type</Label>
                  <Select value={config.type} onValueChange={(value) => updateConfig('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eligibility">Eligibility Verification</SelectItem>
                      <SelectItem value="clearinghouse">Clearinghouse</SelectItem>
                      <SelectItem value="payer">Payer System</SelectItem>
                      <SelectItem value="era">ERA Processing</SelectItem>
                      <SelectItem value="prior_auth">Prior Authorization</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint URL</Label>
                <Input
                  id="endpoint"
                  value={config.endpoint}
                  onChange={(e) => updateConfig('endpoint', e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className={errors.endpoint ? 'border-red-500' : ''}
                />
                {errors.endpoint && (
                  <p className="text-sm text-red-500">{errors.endpoint}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => updateConfig('enabled', checked)}
                />
                <Label>Enable Integration</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Key className="h-5 w-5" />
                <span>Authentication Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Authentication Type</Label>
                <Select 
                  value={config.authentication.type} 
                  onValueChange={(value) => updateConfig('authentication.type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth 2.0</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.authentication.type === 'api_key' && (
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => updateConfig('apiKey', e.target.value)}
                    className={errors.apiKey ? 'border-red-500' : ''}
                  />
                  {errors.apiKey && (
                    <p className="text-sm text-red-500">{errors.apiKey}</p>
                  )}
                </div>
              )}

              {config.authentication.type === 'basic' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      value={config.authentication.credentials.username || ''}
                      onChange={(e) => updateConfig('authentication.credentials.username', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={config.authentication.credentials.password || ''}
                      onChange={(e) => updateConfig('authentication.credentials.password', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {config.authentication.type === 'oauth' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client ID</Label>
                      <Input
                        value={config.authentication.credentials.clientId || ''}
                        onChange={(e) => updateConfig('authentication.credentials.clientId', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={config.authentication.credentials.clientSecret || ''}
                        onChange={(e) => updateConfig('authentication.credentials.clientSecret', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>OAuth URL</Label>
                    <Input
                      value={config.authentication.credentials.oauthUrl || ''}
                      onChange={(e) => updateConfig('authentication.credentials.oauthUrl', e.target.value)}
                      placeholder="https://auth.example.com/oauth/token"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Advanced Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={config.timeout}
                    onChange={(e) => updateConfig('timeout', parseInt(e.target.value))}
                    min="1000"
                    max="60000"
                    className={errors.timeout ? 'border-red-500' : ''}
                  />
                  {errors.timeout && (
                    <p className="text-sm text-red-500">{errors.timeout}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryAttempts">Retry Attempts</Label>
                  <Input
                    id="retryAttempts"
                    type="number"
                    value={config.retryAttempts}
                    onChange={(e) => updateConfig('retryAttempts', parseInt(e.target.value))}
                    min="0"
                    max="10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
                  <Input
                    id="retryDelay"
                    type="number"
                    value={config.retryDelay}
                    onChange={(e) => updateConfig('retryDelay', parseInt(e.target.value))}
                    min="100"
                    max="10000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customSettings">Custom Settings (JSON)</Label>
                <Textarea
                  id="customSettings"
                  value={JSON.stringify(config.settings, null, 2)}
                  onChange={(e) => {
                    try {
                      const settings = JSON.parse(e.target.value);
                      updateConfig('settings', settings);
                    } catch (error) {
                      // Invalid JSON, don't update
                    }
                  }}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Health Check Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={config.healthCheck.enabled}
                  onCheckedChange={(checked) => updateConfig('healthCheck.enabled', checked)}
                />
                <Label>Enable Health Checks</Label>
              </div>

              {config.healthCheck.enabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="healthInterval">Check Interval (minutes)</Label>
                      <Input
                        id="healthInterval"
                        type="number"
                        value={config.healthCheck.interval}
                        onChange={(e) => updateConfig('healthCheck.interval', parseInt(e.target.value))}
                        min="1"
                        max="1440"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="healthEndpoint">Health Check Endpoint</Label>
                      <Input
                        id="healthEndpoint"
                        value={config.healthCheck.endpoint}
                        onChange={(e) => updateConfig('healthCheck.endpoint', e.target.value)}
                        placeholder="/health"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || saving}
          >
            {testing ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Test Connection
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving || testing}
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationConfiguration;