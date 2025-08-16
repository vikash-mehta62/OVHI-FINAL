import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Settings, Trash2, RefreshCw, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface ThirdPartyClient {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  lastSync: string;
  apiKey: string;
  webhookUrl?: string;
  permissions: string[];
  createdAt: string;
}

interface IntegrationHealth {
  clientId: string;
  status: 'healthy' | 'warning' | 'error';
  lastCheck: string;
  responseTime: number;
  errorMessage?: string;
}

const IntegrationManagement: React.FC = () => {
  const [clients, setClients] = useState<ThirdPartyClient[]>([]);
  const [healthStatus, setHealthStatus] = useState<IntegrationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ThirdPartyClient | null>(null);
  const [newToken, setNewToken] = useState('');

  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    webhookUrl: '',
    permissions: [] as string[]
  });

  useEffect(() => {
    fetchClients();
    fetchHealthStatus();
  }, []);

  const fetchClients = async () => {
    try {
      // This would call the existing backend endpoint
      const response = await fetch('/api/v1/client/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch integration clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/v1/client/health-status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data.healthStatus || []);
      }
    } catch (error) {
      console.error('Error fetching health status:', error);
    }
  };

  const registerClient = async () => {
    try {
      const response = await fetch('/api/v1/client/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newClient)
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: "Integration client registered successfully"
        });
        setShowAddDialog(false);
        setNewClient({ name: '', description: '', webhookUrl: '', permissions: [] });
        fetchClients();
      }
    } catch (error) {
      console.error('Error registering client:', error);
      toast({
        title: "Error",
        description: "Failed to register integration client",
        variant: "destructive"
      });
    }
  };

  const generateToken = async (clientId: string) => {
    try {
      const response = await fetch('/api/v1/client/get-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ clientId })
      });

      if (response.ok) {
        const data = await response.json();
        setNewToken(data.token);
        setShowTokenDialog(true);
      }
    } catch (error) {
      console.error('Error generating token:', error);
      toast({
        title: "Error",
        description: "Failed to generate access token",
        variant: "destructive"
      });
    }
  };

  const runHealthCheck = async (clientId: string) => {
    try {
      const response = await fetch('/api/v1/client/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ clientId })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Health check completed"
        });
        fetchHealthStatus();
      }
    } catch (error) {
      console.error('Error running health check:', error);
      toast({
        title: "Error",
        description: "Health check failed",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'inactive':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'active' || status === 'healthy' ? 'default' : 
                   status === 'warning' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Integration Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Integration Management</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Integration Client</DialogTitle>
              <DialogDescription>
                Add a new third-party integration client to access your OVHI data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Client Name</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newClient.description}
                  onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
                  placeholder="Describe the integration purpose"
                />
              </div>
              <div>
                <Label htmlFor="webhookUrl">Webhook URL (Optional)</Label>
                <Input
                  id="webhookUrl"
                  value={newClient.webhookUrl}
                  onChange={(e) => setNewClient({ ...newClient, webhookUrl: e.target.value })}
                  placeholder="https://your-app.com/webhook"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={registerClient}>Register Client</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Integration Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => {
          const health = healthStatus.find(h => h.clientId === client.id);
          return (
            <Card key={client.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(client.status)}
                    {getStatusBadge(client.status)}
                  </div>
                </div>
                <CardDescription>{client.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>{new Date(client.lastSync).toLocaleDateString()}</span>
                  </div>
                  
                  {health && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Response Time:</span>
                      <span>{health.responseTime}ms</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Permissions:</span>
                    <span>{client.permissions.length} granted</span>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateToken(client.id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Token
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runHealthCheck(client.id)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Integration</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the integration client and revoke all access tokens.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Token Display Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={setShowTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Access Token Generated</DialogTitle>
            <DialogDescription>
              Copy this token and store it securely. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-100 rounded-lg">
              <code className="text-sm break-all">{newToken}</code>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                navigator.clipboard.writeText(newToken);
                toast({ title: "Copied", description: "Token copied to clipboard" });
              }}>
                Copy Token
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {clients.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations</h3>
            <p className="text-gray-500 text-center mb-4">
              Get started by adding your first third-party integration client.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntegrationManagement;