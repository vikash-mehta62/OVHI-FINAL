import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, Lock, Eye, UserCheck, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface PrivacySettings {
  dataRetention: {
    patientRecords: number; // months
    auditLogs: number; // months
    backups: number; // months
    autoDelete: boolean;
  };
  accessControls: {
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
    passwordExpiry: number; // days
    mfaRequired: boolean;
    ipWhitelist: string[];
  };
  dataSharing: {
    allowThirdParty: boolean;
    allowResearch: boolean;
    allowMarketing: boolean;
    consentRequired: boolean;
  };
  encryption: {
    dataAtRest: boolean;
    dataInTransit: boolean;
    keyRotation: number; // days
    algorithm: string;
  };
  auditSettings: {
    logAllAccess: boolean;
    logDataChanges: boolean;
    logExports: boolean;
    logPrints: boolean;
    retentionPeriod: number; // months
  };
  patientRights: {
    allowDataAccess: boolean;
    allowDataPortability: boolean;
    allowDataDeletion: boolean;
    responseTimeLimit: number; // days
  };
}

const PrivacySettings: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    dataRetention: {
      patientRecords: 84, // 7 years
      auditLogs: 84,
      backups: 12,
      autoDelete: false
    },
    accessControls: {
      sessionTimeout: 30,
      maxLoginAttempts: 3,
      passwordExpiry: 90,
      mfaRequired: true,
      ipWhitelist: []
    },
    dataSharing: {
      allowThirdParty: false,
      allowResearch: false,
      allowMarketing: false,
      consentRequired: true
    },
    encryption: {
      dataAtRest: true,
      dataInTransit: true,
      keyRotation: 90,
      algorithm: 'AES-256'
    },
    auditSettings: {
      logAllAccess: true,
      logDataChanges: true,
      logExports: true,
      logPrints: true,
      retentionPeriod: 84
    },
    patientRights: {
      allowDataAccess: true,
      allowDataPortability: true,
      allowDataDeletion: false,
      responseTimeLimit: 30
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState('');

  useEffect(() => {
    fetchPrivacySettings();
  }, []);

  const fetchPrivacySettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/settings/privacy', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      toast({
        title: "Error",
        description: "Failed to load privacy settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/settings/privacy', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Privacy settings saved successfully"
        });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addIpAddress = () => {
    if (newIpAddress && !settings.accessControls.ipWhitelist.includes(newIpAddress)) {
      setSettings(prev => ({
        ...prev,
        accessControls: {
          ...prev.accessControls,
          ipWhitelist: [...prev.accessControls.ipWhitelist, newIpAddress]
        }
      }));
      setNewIpAddress('');
    }
  };

  const removeIpAddress = (ip: string) => {
    setSettings(prev => ({
      ...prev,
      accessControls: {
        ...prev.accessControls,
        ipWhitelist: prev.accessControls.ipWhitelist.filter(address => address !== ip)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading privacy settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Retention Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Retention
          </CardTitle>
          <CardDescription>
            Configure how long different types of data are retained in the system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientRecords">Patient Records (months)</Label>
              <Input
                id="patientRecords"
                type="number"
                value={settings.dataRetention.patientRecords}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  dataRetention: {
                    ...prev.dataRetention,
                    patientRecords: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auditLogs">Audit Logs (months)</Label>
              <Input
                id="auditLogs"
                type="number"
                value={settings.dataRetention.auditLogs}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  dataRetention: {
                    ...prev.dataRetention,
                    auditLogs: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backups">Backups (months)</Label>
              <Input
                id="backups"
                type="number"
                value={settings.dataRetention.backups}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  dataRetention: {
                    ...prev.dataRetention,
                    backups: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoDelete"
                checked={settings.dataRetention.autoDelete}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  dataRetention: {
                    ...prev.dataRetention,
                    autoDelete: checked
                  }
                }))}
              />
              <Label htmlFor="autoDelete">Auto-delete expired data</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Access Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Access Controls
          </CardTitle>
          <CardDescription>
            Configure security settings for user access and authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.accessControls.sessionTimeout}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  accessControls: {
                    ...prev.accessControls,
                    sessionTimeout: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
              <Input
                id="maxLoginAttempts"
                type="number"
                value={settings.accessControls.maxLoginAttempts}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  accessControls: {
                    ...prev.accessControls,
                    maxLoginAttempts: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
              <Input
                id="passwordExpiry"
                type="number"
                value={settings.accessControls.passwordExpiry}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  accessControls: {
                    ...prev.accessControls,
                    passwordExpiry: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="mfaRequired"
                checked={settings.accessControls.mfaRequired}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  accessControls: {
                    ...prev.accessControls,
                    mfaRequired: checked
                  }
                }))}
              />
              <Label htmlFor="mfaRequired">Require Multi-Factor Authentication</Label>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>IP Whitelist</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter IP address"
                value={newIpAddress}
                onChange={(e) => setNewIpAddress(e.target.value)}
              />
              <Button onClick={addIpAddress} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {settings.accessControls.ipWhitelist.map((ip, index) => (
                <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeIpAddress(ip)}>
                  {ip} ×
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Data Sharing
          </CardTitle>
          <CardDescription>
            Control how patient data can be shared with external parties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowThirdParty">Allow Third-Party Access</Label>
                <p className="text-sm text-muted-foreground">Allow approved third-party applications to access data</p>
              </div>
              <Switch
                id="allowThirdParty"
                checked={settings.dataSharing.allowThirdParty}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  dataSharing: {
                    ...prev.dataSharing,
                    allowThirdParty: checked
                  }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowResearch">Allow Research Use</Label>
                <p className="text-sm text-muted-foreground">Allow anonymized data to be used for research purposes</p>
              </div>
              <Switch
                id="allowResearch"
                checked={settings.dataSharing.allowResearch}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  dataSharing: {
                    ...prev.dataSharing,
                    allowResearch: checked
                  }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allowMarketing">Allow Marketing Communications</Label>
                <p className="text-sm text-muted-foreground">Allow use of data for marketing and promotional purposes</p>
              </div>
              <Switch
                id="allowMarketing"
                checked={settings.dataSharing.allowMarketing}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  dataSharing: {
                    ...prev.dataSharing,
                    allowMarketing: checked
                  }
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="consentRequired">Require Explicit Consent</Label>
                <p className="text-sm text-muted-foreground">Require patient consent before any data sharing</p>
              </div>
              <Switch
                id="consentRequired"
                checked={settings.dataSharing.consentRequired}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  dataSharing: {
                    ...prev.dataSharing,
                    consentRequired: checked
                  }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encryption Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Encryption Settings
          </CardTitle>
          <CardDescription>
            Configure encryption settings for data protection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="dataAtRest"
                checked={settings.encryption.dataAtRest}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  encryption: {
                    ...prev.encryption,
                    dataAtRest: checked
                  }
                }))}
              />
              <Label htmlFor="dataAtRest">Encrypt Data at Rest</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dataInTransit"
                checked={settings.encryption.dataInTransit}
                onCheckedChange={(checked) => setSettings(prev => ({
                  ...prev,
                  encryption: {
                    ...prev.encryption,
                    dataInTransit: checked
                  }
                }))}
              />
              <Label htmlFor="dataInTransit">Encrypt Data in Transit</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="keyRotation">Key Rotation (days)</Label>
              <Input
                id="keyRotation"
                type="number"
                value={settings.encryption.keyRotation}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  encryption: {
                    ...prev.encryption,
                    keyRotation: parseInt(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="algorithm">Encryption Algorithm</Label>
              <Select
                value={settings.encryption.algorithm}
                onValueChange={(value) => setSettings(prev => ({
                  ...prev,
                  encryption: {
                    ...prev.encryption,
                    algorithm: value
                  }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AES-256">AES-256</SelectItem>
                  <SelectItem value="AES-192">AES-192</SelectItem>
                  <SelectItem value="AES-128">AES-128</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePrivacySettings} disabled={saving}>
          {saving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Privacy Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PrivacySettings;
