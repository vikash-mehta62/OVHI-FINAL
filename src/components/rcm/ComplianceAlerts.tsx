/**
 * Compliance Alerts Component
 * Displays and manages compliance alerts and notifications
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar,
  AlertCircle,
  Check,
  X,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ComplianceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  deadline?: string;
  affected_claims: number;
  action_required: string;
  created_at: string;
  acknowledged?: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  acknowledgment_note?: string;
}

interface ComplianceAlertsProps {
  showHeader?: boolean;
  maxAlerts?: number;
  severityFilter?: string[];
  onAlertAcknowledged?: (alertId: string) => void;
}

const ComplianceAlerts: React.FC<ComplianceAlertsProps> = ({
  showHeader = true,
  maxAlerts,
  severityFilter,
  onAlertAcknowledged
}) => {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null);
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');
  const [acknowledging, setAcknowledging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    loadAlerts();
  }, [severityFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter && severityFilter.length > 0) {
        params.append('severity', severityFilter.join(','));
      }
      if (maxAlerts) {
        params.append('limit', maxAlerts.toString());
      }

      const response = await fetch(`/api/v1/rcm/compliance/alerts?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data);
      }
    } catch (error) {
      console.error('Failed to load compliance alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    setAcknowledging(true);
    try {
      const response = await fetch(`/api/v1/rcm/compliance/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          acknowledgment_note: acknowledgmentNote
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update the alert in the local state
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledged_at: new Date().toISOString(), acknowledgment_note: acknowledgmentNote }
            : alert
        ));
        
        setSelectedAlert(null);
        setAcknowledgmentNote('');
        
        if (onAlertAcknowledged) {
          onAlertAcknowledged(alertId);
        }
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setAcknowledging(false);
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === 'critical') return <XCircle className="h-5 w-5 text-red-500" />;
    if (severity === 'high') return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    if (severity === 'medium') return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <Clock className="h-5 w-5 text-blue-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return variants[severity as keyof typeof variants] || variants.low;
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      error: 'bg-red-50 text-red-700',
      warning: 'bg-yellow-50 text-yellow-700',
      info: 'bg-blue-50 text-blue-700'
    };
    
    return variants[type as keyof typeof variants] || variants.info;
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesType = selectedType === 'all' || alert.type === selectedType;
    
    return matchesSearch && matchesSeverity && matchesType;
  });

  const unacknowledgedAlerts = filteredAlerts.filter(alert => !alert.acknowledged);
  const acknowledgedAlerts = filteredAlerts.filter(alert => alert.acknowledged);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compliance Alerts</h2>
            <p className="text-gray-600">
              {unacknowledgedAlerts.length} unacknowledged alerts, {acknowledgedAlerts.length} acknowledged
            </p>
          </div>
          <Button onClick={loadAlerts} variant="outline">
            Refresh
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex space-x-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Critical Alerts Summary */}
      {unacknowledgedAlerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-800">Critical Alerts</AlertTitle>
          <AlertDescription className="text-red-700">
            {unacknowledgedAlerts.filter(alert => alert.severity === 'critical').length} critical compliance issues require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* Unacknowledged Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Unacknowledged Alerts</h3>
          {unacknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className={`border-l-4 ${
              alert.severity === 'critical' ? 'border-l-red-500' :
              alert.severity === 'high' ? 'border-l-orange-500' :
              alert.severity === 'medium' ? 'border-l-yellow-500' :
              'border-l-blue-500'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.type, alert.severity)}
                    <div>
                      <CardTitle className="text-lg">{alert.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getSeverityBadge(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className={getTypeBadge(alert.type)}>
                          {alert.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {alert.deadline && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        Due: {new Date(alert.deadline).toLocaleDateString()}
                      </div>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedAlert(alert)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-2">
                            {getAlertIcon(alert.type, alert.severity)}
                            <span>{alert.title}</span>
                          </DialogTitle>
                          <DialogDescription>
                            Alert created on {new Date(alert.created_at).toLocaleString()}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Description</h4>
                            <p className="text-gray-700">{alert.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold mb-1">Affected Claims</h4>
                              <p className="text-gray-700">{alert.affected_claims}</p>
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">Action Required</h4>
                              <p className="text-gray-700">{alert.action_required}</p>
                            </div>
                          </div>
                          {alert.deadline && (
                            <div>
                              <h4 className="font-semibold mb-1">Deadline</h4>
                              <p className="text-gray-700">{new Date(alert.deadline).toLocaleString()}</p>
                            </div>
                          )}
                          <div>
                            <h4 className="font-semibold mb-2">Acknowledgment Note</h4>
                            <Textarea
                              placeholder="Add a note about how this alert was addressed..."
                              value={acknowledgmentNote}
                              onChange={(e) => setAcknowledgmentNote(e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => acknowledgeAlert(alert.id)}
                            disabled={acknowledging}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3">{alert.description}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Affects {alert.affected_claims} claims</span>
                  <span>Action: {alert.action_required}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">Acknowledged Alerts</h3>
          {acknowledgedAlerts.map((alert) => (
            <Card key={alert.id} className="border-gray-200 bg-gray-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <CardTitle className="text-lg text-gray-700">{alert.title}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Acknowledged
                        </Badge>
                        <span className="text-sm text-gray-500">
                          on {new Date(alert.acknowledged_at!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-2">{alert.description}</p>
                {alert.acknowledgment_note && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm text-gray-700 mb-1">Acknowledgment Note:</h5>
                    <p className="text-sm text-gray-600">{alert.acknowledgment_note}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Alerts */}
      {filteredAlerts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Compliance Alerts</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || selectedSeverity !== 'all' || selectedType !== 'all' 
                ? 'No alerts match your current filters.'
                : 'All compliance requirements are being met. Great job!'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ComplianceAlerts;