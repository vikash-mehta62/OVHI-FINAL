import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Pause,
  RefreshCw,
  Settings,
  Users,
  FileText,
  Download
} from 'lucide-react';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  reportType: string;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  scheduleConfig: {
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone: string;
  };
  filters: Record<string, any>;
  exportFormat: 'csv' | 'excel' | 'pdf' | 'json';
  emailRecipients: string[];
  isActive: boolean;
  lastRun?: string;
  nextRun: string;
  createdBy: string;
  createdAt: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
}

const ReportScheduler: React.FC = () => {
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    reportType: '',
    scheduleType: 'weekly' as const,
    time: '09:00',
    dayOfWeek: 1,
    dayOfMonth: 1,
    timezone: 'America/New_York',
    exportFormat: 'csv' as const,
    emailRecipients: [''],
    filters: {}
  });

  useEffect(() => {
    fetchScheduledReports();
    fetchReportTemplates();
  }, []);

  const fetchScheduledReports = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/schedules');
      const data = await response.json();
      setScheduledReports(data.schedules || []);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
    }
  };

  const fetchReportTemplates = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/templates');
      const data = await response.json();
      setReportTemplates(data.templates || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report templates:', error);
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const scheduleData = {
        ...formData,
        scheduleConfig: {
          time: formData.time,
          dayOfWeek: formData.scheduleType === 'weekly' ? formData.dayOfWeek : undefined,
          dayOfMonth: formData.scheduleType === 'monthly' ? formData.dayOfMonth : undefined,
          timezone: formData.timezone
        },
        emailRecipients: formData.emailRecipients.filter(email => email.trim() !== '')
      };

      const response = await fetch('/api/v1/rcm/reports/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        setShowCreateDialog(false);
        resetForm();
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Error creating schedule:', error);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingReport) return;

    try {
      const scheduleData = {
        ...formData,
        scheduleConfig: {
          time: formData.time,
          dayOfWeek: formData.scheduleType === 'weekly' ? formData.dayOfWeek : undefined,
          dayOfMonth: formData.scheduleType === 'monthly' ? formData.dayOfMonth : undefined,
          timezone: formData.timezone
        },
        emailRecipients: formData.emailRecipients.filter(email => email.trim() !== '')
      };

      const response = await fetch(`/api/v1/rcm/reports/schedules/${editingReport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });

      if (response.ok) {
        setEditingReport(null);
        resetForm();
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) return;

    try {
      const response = await fetch(`/api/v1/rcm/reports/schedules/${scheduleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleToggleSchedule = async (scheduleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });

      if (response.ok) {
        fetchScheduledReports();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/schedules/${scheduleId}/run`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Report generation started. You will receive an email when it\'s complete.');
      }
    } catch (error) {
      console.error('Error running report:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      reportType: '',
      scheduleType: 'weekly',
      time: '09:00',
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: 'America/New_York',
      exportFormat: 'csv',
      emailRecipients: [''],
      filters: {}
    });
  };

  const addEmailRecipient = () => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: [...prev.emailRecipients, '']
    }));
  };

  const updateEmailRecipient = (index: number, email: string) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.map((e, i) => i === index ? email : e)
    }));
  };

  const removeEmailRecipient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter((_, i) => i !== index)
    }));
  };

  const getScheduleDescription = (report: ScheduledReport) => {
    const { scheduleType, scheduleConfig } = report;
    const time = scheduleConfig.time;
    
    switch (scheduleType) {
      case 'daily':
        return `Daily at ${time}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `Weekly on ${days[scheduleConfig.dayOfWeek || 1]} at ${time}`;
      case 'monthly':
        return `Monthly on day ${scheduleConfig.dayOfMonth} at ${time}`;
      case 'quarterly':
        return `Quarterly at ${time}`;
      default:
        return 'Custom schedule';
    }
  };

  const getNextRunDisplay = (nextRun: string) => {
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Report Scheduler</h1>
          <p className="text-gray-500">Automate report generation and delivery</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReport ? 'Edit Scheduled Report' : 'Schedule New Report'}
              </DialogTitle>
              <DialogDescription>
                Set up automated report generation and email delivery
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Report Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter report name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Report Type</Label>
                    <Select 
                      value={formData.reportType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, reportType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTemplates.map(template => (
                          <SelectItem key={template.id} value={template.type}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter report description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Schedule Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Schedule Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select 
                      value={formData.scheduleType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, scheduleType: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>
                  
                  {formData.scheduleType === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <Select 
                        value={formData.dayOfWeek.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, dayOfWeek: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Sunday</SelectItem>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formData.scheduleType === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData(prev => ({ ...prev, dayOfMonth: parseInt(e.target.value) }))}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Export and Delivery */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Export and Delivery</h3>
                
                <div className="space-y-2">
                  <Label>Export Format</Label>
                  <Select 
                    value={formData.exportFormat} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, exportFormat: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Email Recipients</Label>
                  {formData.emailRecipients.map((email, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmailRecipient(index, e.target.value)}
                        placeholder="Enter email address"
                      />
                      {formData.emailRecipients.length > 1 && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeEmailRecipient(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addEmailRecipient}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recipient
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingReport(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={editingReport ? handleUpdateSchedule : handleCreateSchedule}>
                {editingReport ? 'Update Schedule' : 'Create Schedule'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scheduled Reports List */}
      <div className="space-y-4">
        {scheduledReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Scheduled Reports</h3>
              <p className="text-gray-500 mb-4">
                Create your first scheduled report to automate report generation and delivery
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Your First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          scheduledReports.map((report) => (
            <Card key={report.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={report.isActive}
                        onCheckedChange={(checked) => handleToggleSchedule(report.id, checked)}
                      />
                      <div>
                        <h3 className="text-lg font-medium">{report.name}</h3>
                        <p className="text-sm text-gray-500">{report.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{report.reportType}</Badge>
                    <Badge variant={report.isActive ? 'default' : 'secondary'}>
                      {report.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Schedule</p>
                    <p className="text-sm">{getScheduleDescription(report)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Next Run</p>
                    <p className="text-sm">{getNextRunDisplay(report.nextRun)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Recipients</p>
                    <p className="text-sm">{report.emailRecipients.length} recipient(s)</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500">Format</p>
                    <p className="text-sm uppercase">{report.exportFormat}</p>
                  </div>
                </div>
                
                {report.lastRun && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">
                      Last run: {new Date(report.lastRun).toLocaleString()}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleRunNow(report.id)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Run Now
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setEditingReport(report);
                      setFormData({
                        name: report.name,
                        description: report.description,
                        reportType: report.reportType,
                        scheduleType: report.scheduleType,
                        time: report.scheduleConfig.time,
                        dayOfWeek: report.scheduleConfig.dayOfWeek || 1,
                        dayOfMonth: report.scheduleConfig.dayOfMonth || 1,
                        timezone: report.scheduleConfig.timezone,
                        exportFormat: report.exportFormat,
                        emailRecipients: report.emailRecipients,
                        filters: report.filters
                      });
                      setShowCreateDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleDeleteSchedule(report.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportScheduler;