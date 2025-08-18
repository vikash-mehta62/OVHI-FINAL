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
        va    </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            View full login history
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
          Delete Account
        </Button>
        <Button>Save Privacy Settings</Button>
      </CardFooter>
    </Card>
  );
};

export default PrivacySettings;
