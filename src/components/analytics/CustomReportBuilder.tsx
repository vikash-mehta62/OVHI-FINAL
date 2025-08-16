import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Download, 
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Table,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Settings
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface ReportField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  category: string;
  description?: string;
}

interface ReportFilter {
  id: string;
  field: string;
  operator: string;
  value: string;
  type: 'and' | 'or';
}

interface ReportConfig {
  name: string;
  description: string;
  fields: string[];
  filters: ReportFilter[];
  groupBy: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  chartType: 'table' | 'bar' | 'line' | 'pie' | 'area';
  dateRange: DateRange | undefined;
  limit: number;
}

interface SavedReport {
  id: string;
  name: string;
  description: string;
  config: ReportConfig;
  createdAt: string;
  lastRun: string;
}

const CustomReportBuilder: React.FC = () => {
  const [config, setConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    fields: [],
    filters: [],
    groupBy: [],
    sortBy: '',
    sortOrder: 'desc',
    chartType: 'table',
    dateRange: undefined,
    limit: 100
  });

  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

  const availableFields: ReportField[] = [
    // Patient Fields
    { id: 'patient_id', name: 'Patient ID', type: 'string', category: 'Patient' },
    { id: 'patient_name', name: 'Patient Name', type: 'string', category: 'Patient' },
    { id: 'patient_age', name: 'Patient Age', type: 'number', category: 'Patient' },
    { id: 'patient_gender', name: 'Gender', type: 'string', category: 'Patient' },
    { id: 'patient_dob', name: 'Date of Birth', type: 'date', category: 'Patient' },
    { id: 'insurance_type', name: 'Insurance Type', type: 'string', category: 'Patient' },
    
    // Appointment Fields
    { id: 'appointment_id', name: 'Appointment ID', type: 'string', category: 'Appointment' },
    { id: 'appointment_date', name: 'Appointment Date', type: 'date', category: 'Appointment' },
    { id: 'appointment_type', name: 'Appointment Type', type: 'string', category: 'Appointment' },
    { id: 'appointment_status', name: 'Status', type: 'string', category: 'Appointment' },
    { id: 'provider_name', name: 'Provider', type: 'string', category: 'Appointment' },
    { id: 'location_name', name: 'Location', type: 'string', category: 'Appointment' },
    
    // Billing Fields
    { id: 'claim_id', name: 'Claim ID', type: 'string', category: 'Billing' },
    { id: 'cpt_code', name: 'CPT Code', type: 'string', category: 'Billing' },
    { id: 'diagnosis_code', name: 'Diagnosis Code', type: 'string', category: 'Billing' },
    { id: 'billed_amount', name: 'Billed Amount', type: 'number', category: 'Billing' },
    { id: 'paid_amount', name: 'Paid Amount', type: 'number', category: 'Billing' },
    { id: 'claim_status', name: 'Claim Status', type: 'string', category: 'Billing' },
    { id: 'denial_reason', name: 'Denial Reason', type: 'string', category: 'Billing' },
    
    // Revenue Fields
    { id: 'revenue_total', name: 'Total Revenue', type: 'number', category: 'Revenue' },
    { id: 'collection_rate', name: 'Collection Rate', type: 'number', category: 'Revenue' },
    { id: 'days_in_ar', name: 'Days in A/R', type: 'number', category: 'Revenue' },
    
    // Performance Fields
    { id: 'satisfaction_score', name: 'Satisfaction Score', type: 'number', category: 'Performance' },
    { id: 'wait_time', name: 'Wait Time (minutes)', type: 'number', category: 'Performance' },
    { id: 'no_show_rate', name: 'No Show Rate', type: 'number', category: 'Performance' }
  ];

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'between', label: 'Between' },
    { value: 'in', label: 'In List' },
    { value: 'is_null', label: 'Is Empty' },
    { value: 'is_not_null', label: 'Is Not Empty' }
  ];

  const chartTypes = [
    { value: 'table', label: 'Table', icon: Table },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'line', label: 'Line Chart', icon: LineChart },
    { value: 'pie', label: 'Pie Chart', icon: PieChart },
    { value: 'area', label: 'Area Chart', icon: BarChart3 }
  ];

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      const response = await fetch('/api/v1/analytics/reports', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedReports(data.reports);
      }
    } catch (error) {
      console.error('Failed to load saved reports:', error);
      // Mock data for development
      setSavedReports([
        {
          id: '1',
          name: 'Monthly Revenue Report',
          description: 'Monthly revenue breakdown by provider and service',
          config: {
            name: 'Monthly Revenue Report',
            description: 'Monthly revenue breakdown by provider and service',
            fields: ['provider_name', 'cpt_code', 'billed_amount', 'paid_amount'],
            filters: [],
            groupBy: ['provider_name'],
            sortBy: 'paid_amount',
            sortOrder: 'desc',
            chartType: 'bar',
            dateRange: undefined,
            limit: 100
          },
          createdAt: '2024-01-15',
          lastRun: '2024-01-20'
        }
      ]);
    }
  };

  const addField = (fieldId: string) => {
    if (!config.fields.includes(fieldId)) {
      setConfig(prev => ({
        ...prev,
        fields: [...prev.fields, fieldId]
      }));
    }
  };

  const removeField = (fieldId: string) => {
    setConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f !== fieldId)
    }));
  };

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: '',
      type: 'and'
    };
    
    setConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }));
  };

  const removeFilter = (filterId: string) => {
    setConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }));
  };

  const runReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/analytics/reports/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportData(data.results);
        setActiveTab('results');
      } else {
        // Mock data for development
        setReportData(generateMockReportData());
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Failed to run report:', error);
      setReportData(generateMockReportData());
      setActiveTab('results');
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!config.name) {
      alert('Please enter a report name');
      return;
    }

    try {
      const response = await fetch('/api/v1/analytics/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSavedReports(prev => [...prev, data.report]);
        alert('Report saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save report:', error);
      alert('Failed to save report');
    }
  };

  const loadReport = (report: SavedReport) => {
    setConfig(report.config);
    setActiveTab('builder');
  };

  const exportReport = () => {
    if (reportData.length === 0) return;

    const csv = convertToCSV(reportData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'report'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const generateMockReportData = () => {
    return [
      { provider_name: 'Dr. Smith', cpt_code: '99213', billed_amount: 150, paid_amount: 142 },
      { provider_name: 'Dr. Johnson', cpt_code: '99214', billed_amount: 200, paid_amount: 190 },
      { provider_name: 'Dr. Williams', cpt_code: '99213', billed_amount: 150, paid_amount: 145 },
      { provider_name: 'Dr. Brown', cpt_code: '99215', billed_amount: 250, paid_amount: 238 }
    ];
  };

  const getFieldsByCategory = (category: string) => {
    return availableFields.filter(field => field.category === category);
  };

  const categories = [...new Set(availableFields.map(field => field.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground">
            Create custom reports and analytics for your practice
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={runReport}
            disabled={loading || config.fields.length === 0}
          >
            <Play className="h-4 w-4 mr-2" />
            {loading ? 'Running...' : 'Run Report'}
          </Button>
          <Button variant="outline" onClick={saveReport}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      value={config.name}
                      onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter report name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-description">Description</Label>
                    <Input
                      id="report-description"
                      value={config.description}
                      onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter report description"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Fields Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Select Fields</CardTitle>
                  <CardDescription>Choose the data fields to include in your report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map(category => (
                      <div key={category}>
                        <h4 className="font-medium mb-2">{category}</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {getFieldsByCategory(category).map(field => (
                            <div key={field.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={field.id}
                                checked={config.fields.includes(field.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    addField(field.id);
                                  } else {
                                    removeField(field.id);
                                  }
                                }}
                              />
                              <Label htmlFor={field.id} className="text-sm">
                                {field.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Add conditions to filter your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {config.filters.map((filter, index) => (
                      <div key={filter.id} className="flex items-center space-x-2 p-4 border rounded-lg">
                        {index > 0 && (
                          <Select
                            value={filter.type}
                            onValueChange={(value: 'and' | 'or') => updateFilter(filter.id, { type: value })}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="and">AND</SelectItem>
                              <SelectItem value="or">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Select
                          value={filter.field}
                          onValueChange={(value) => updateFilter(filter.id, { field: value })}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map(field => (
                              <SelectItem key={field.id} value={field.id}>
                                {field.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          value={filter.value}
                          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1"
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFilter(filter.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    
                    <Button variant="outline" onClick={addFilter}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Filter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Configuration Panel */}
            <div className="space-y-6">
              {/* Selected Fields */}
              <Card>
                <CardHeader>
                  <CardTitle>Selected Fields</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {config.fields.map(fieldId => {
                      const field = availableFields.find(f => f.id === fieldId);
                      return field ? (
                        <div key={fieldId} className="flex items-center justify-between">
                          <Badge variant="secondary">{field.name}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(fieldId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : null;
                    })}
                    {config.fields.length === 0 && (
                      <p className="text-sm text-muted-foreground">No fields selected</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Chart Type */}
              <Card>
                <CardHeader>
                  <CardTitle>Visualization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Chart Type</Label>
                      <Select
                        value={config.chartType}
                        onValueChange={(value: any) => setConfig(prev => ({ ...prev, chartType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {chartTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center space-x-2">
                                <type.icon className="h-4 w-4" />
                                <span>{type.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Sort By</Label>
                      <Select
                        value={config.sortBy}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, sortBy: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {config.fields.map(fieldId => {
                            const field = availableFields.find(f => f.id === fieldId);
                            return field ? (
                              <SelectItem key={fieldId} value={fieldId}>
                                {field.name}
                              </SelectItem>
                            ) : null;
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Sort Order</Label>
                      <Select
                        value={config.sortOrder}
                        onValueChange={(value: 'asc' | 'desc') => setConfig(prev => ({ ...prev, sortOrder: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Limit Results</Label>
                      <Input
                        type="number"
                        value={config.limit}
                        onChange={(e) => setConfig(prev => ({ ...prev, limit: parseInt(e.target.value) || 100 }))}
                        min="1"
                        max="10000"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>Your previously saved custom reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {savedReports.map(report => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{report.name}</h4>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span>Created: {report.createdAt}</span>
                        <span>Last Run: {report.lastRun}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadReport(report)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setConfig(report.config);
                          runReport();
                        }}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run
                      </Button>
                    </div>
                  </div>
                ))}
                {savedReports.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Saved Reports</h3>
                    <p className="text-muted-foreground">Create and save your first custom report</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Results</CardTitle>
              <CardDescription>
                {reportData.length > 0 ? `${reportData.length} records found` : 'No data available'}
              </CardDescription>
              {reportData.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {reportData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(reportData[0]).map(key => (
                          <th key={key} className="border border-gray-300 px-4 py-2 text-left font-medium">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                              {typeof value === 'number' && value > 1000 
                                ? value.toLocaleString() 
                                : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Results</h3>
                  <p className="text-muted-foreground">Run a report to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomReportBuilder;