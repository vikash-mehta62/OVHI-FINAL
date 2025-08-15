import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Settings, CheckCircle, XCircle } from 'lucide-react';
import { paymentAPI } from '@/services/operations/payments';

interface PaymentGateway {
  id: number;
  gateway_name: string;
  gateway_type: string;
  is_sandbox: boolean;
  is_active: boolean;
  api_key?: string;
  created_at: string;
}

const PaymentGatewaySettings: React.FC = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    gateway_name: '',
    gateway_type: 'stripe',
    api_key: '',
    secret_key: '',
    webhook_secret: '',
    is_sandbox: true,
    is_active: false
  });

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      const response = await paymentAPI.getGateways();
      if (response.success) {
        setGateways(response.data);
      }
    } catch (error) {
      console.error('Error loading gateways:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const response = await paymentAPI.configureGateway(formData);
      if (response.success) {
        setTestResult(response.data.test_result);
        await loadGateways();
        if (response.data.test_result.success) {
          setShowForm(false);
          resetForm();
        }
      }
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: error.response?.data?.message || 'Configuration failed' 
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      gateway_name: '',
      gateway_type: 'stripe',
      api_key: '',
      secret_key: '',
      webhook_secret: '',
      is_sandbox: true,
      is_active: false
    });
  };  
  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'stripe': return '💳';
      case 'square': return '⬜';
      case 'paypal': return '🅿️';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Gateway Settings</h2>
          <p className="text-gray-600">Configure payment processing for patient payments</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Add Gateway
        </Button>
      </div>

      {/* Existing Gateways */}
      <div className="grid gap-4">
        {gateways.map((gateway) => (
          <Card key={gateway.id} className={`${gateway.is_active ? 'ring-2 ring-green-500' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getGatewayIcon(gateway.gateway_type)}</span>
                  <div>
                    <h3 className="font-semibold">{gateway.gateway_name}</h3>
                    <p className="text-sm text-gray-600 capitalize">
                      {gateway.gateway_type} • {gateway.is_sandbox ? 'Sandbox' : 'Live'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {gateway.is_active ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                      <XCircle className="h-4 w-4" />
                      Inactive
                    </span>
                  )}
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Gateway Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Payment Gateway</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gateway_name">Gateway Name</Label>
                  <Input
                    id="gateway_name"
                    value={formData.gateway_name}
                    onChange={(e) => setFormData({...formData, gateway_name: e.target.value})}
                    placeholder="My Stripe Gateway"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="gateway_type">Gateway Type</Label>
                  <Select 
                    value={formData.gateway_type} 
                    onValueChange={(value) => setFormData({...formData, gateway_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="authorize_net">Authorize.Net</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="api_key">API Key / Publishable Key</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                  placeholder="pk_test_..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="secret_key">Secret Key</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={formData.secret_key}
                  onChange={(e) => setFormData({...formData, secret_key: e.target.value})}
                  placeholder="sk_test_..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  value={formData.webhook_secret}
                  onChange={(e) => setFormData({...formData, webhook_secret: e.target.value})}
                  placeholder="whsec_..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_sandbox"
                    checked={formData.is_sandbox}
                    onCheckedChange={(checked) => setFormData({...formData, is_sandbox: checked})}
                  />
                  <Label htmlFor="is_sandbox">Sandbox Mode</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active">Activate Gateway</Label>
                </div>
              </div>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                  <AlertDescription className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Testing & Saving...' : 'Save Gateway'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  resetForm();
                  setTestResult(null);
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentGatewaySettings;