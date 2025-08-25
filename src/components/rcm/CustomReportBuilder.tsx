import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Minus, 
  Play, 
  Save, 
  Eye, 
  Download,
  Settings,
  Database,
  Filter,
  BarChart3,
  Table,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  table: string;
  description: string;
  columns: Column[];
}

interface Column {
  name: string;
  type: string;
  description: string;
  nullable: boolean;
}

interface FilterCondition {
  id: string;
  column: string;
  operator: string;
  value: string;
  dataType: string;
}

interface ReportConfig {
  name: string;
  description: string;
  dataSource: string;
  selectedColumns: string[];
  filters: FilterCondition[];
  groupBy: string[];
  orderBy: Array<{ column: string; direction: 'ASC' | 'DESC' }>;
  aggregations: Array<{ column: string; type: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX' }>;
  limit?: number;
}

const CustomReportBuilder: React.FC = () => {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    dataSource: '',
    selectedColumns: [],
    filters: [],
    groupBy: [],
    orderBy: [],
    aggregations: [],
    limit: 1000
  });
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    fetchDataSources();
    fetchSavedReports();
  }, []);

  const fetchDataSources = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/data-sources');
      const data = await response.json();
      setDataSources(data.dataSources || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
    }
  };

  const fetchSavedReports = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/custom');
      const data = await response.json();
      setSavedReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching saved reports:', error);
    }
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      column: '',
      operator: '=',
      value: '',
      dataType: 'string'
    };
    setReportConfig(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }));
  };

  const updateFilter = (filterId: string, field: keyof FilterCondition, value: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.map(filter =>
        filter.id === filterId ? { ...filter, [field]: value } : filter
      )
    }));
  };

  const removeFilter = (filterId: string) => {
    setReportConfig(prev => ({
      ...prev,
      filters: prev.filters.filter(filter => filter.id !== filterId)
    }));
  };

  const addOrderBy = () => {
    setReportConfig(prev => ({
      ...prev,
      orderBy: [...prev.orderBy, { column: '', direction: 'ASC' }]
    }));
  };

  const updateOrderBy = (index: number, field: 'column' | 'direction', value: string) => {
    setReportConfig(prev => ({
      ...prev,
      orderBy: prev.orderBy.map((order, i) =>
        i === index ? { ...order, [field]: value } : order
      )
    }));
  };

  const removeOrderBy = (index: number) => {
    setReportConfig(prev => ({
      ...prev,
      orderBy: prev.orderBy.filter((_, i) => i !== index)
    }));
  };

  const addAggregation = () => {
    setReportConfig(prev => ({
      ...prev,
      aggregations: [...prev.aggregations, { column: '', type: 'COUNT' }]
    }));
  };

  const updateAggregation = (index: number, field: 'column' | 'type', value: string) => {
    setReportConfig(prev => ({
      ...prev,
      aggregations: prev.aggregations.map((agg, i) =>
        i === index ? { ...agg, [field]: value } : agg
      )
    }));
  };

  const removeAggregation = (index: number) => {
    setReportConfig(prev => ({
      ...prev,
      aggregations: prev.aggregations.filter((_, i) => i !== index)
    }));
  };

  const previewReport = async () => {
    if (!reportConfig.dataSource || reportConfig.selectedColumns.length === 0) {
      alert('Please select a data source and at least one column');
      return;
    }

    setPreviewLoading(true);
    try {
      const response = await fetch('/api/v1/rcm/reports/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...reportConfig, limit: 10 })
      });

      const result = await response.json();
      if (result.success) {
        setPreviewData(result.data || []);
      } else {
        console.error('Preview failed:', result.error);
      }
    } catch (error) {
      console.error('Error previewing report:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveReport = async () => {
    if (!reportConfig.name.trim()) {
      alert('Please enter a report name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/rcm/reports/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      const result = await response.json();
      if (result.success) {
        alert('Report saved successfully');
        fetchSavedReports();
      } else {
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!reportConfig.dataSource || reportConfig.selectedColumns.length === 0) {
      alert('Please select a data source and at least one column');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/rcm/reports/generate-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportConfig)
      });

      const result = await response.json();
      if (result.success) {
        // Handle successful report generation
        console.log('Report generated successfully');
      } else {
        console.error('Generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDataSource = dataSources.find(ds => ds.id === reportConfig.dataSource);
  const availableColumns = selectedDataSource?.columns || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-gray-500">Build custom reports with flexible configuration</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={previewReport} disabled={previewLoading}>
            {previewLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Preview
          </Button>
          <Button variant="outline" onClick={saveReport} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={generateReport} disabled={loading}>
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="builder" className="space-y-4">
        <TabsList>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={reportConfig.name}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter report name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Select 
                    value={reportConfig.dataSource} 
                    onValueChange={(value) => setReportConfig(prev => ({ 
                      ...prev, 
                      dataSource: value,
                      selectedColumns: [],
                      filters: [],
                      groupBy: [],
                      orderBy: [],
                      aggregations: []
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select data source" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataSources.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>
                          <div className="flex items-center space-x-2">
                            <Database className="h-4 w-4" />
                            <span>{ds.name}</span>
                          </div>
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
                  value={reportConfig.description}
                  onChange={(e) => setReportConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter report description"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Column Selection */}
          {selectedDataSource && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Table className="h-5 w-5" />
                  <span>Column Selection</span>
                </CardTitle>
                <CardDescription>
                  Select the columns to include in your report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {availableColumns.map(column => (
                    <div key={column.name} className="flex items-center space-x-2">
                      <Checkbox
                        checked={reportConfig.selectedColumns.includes(column.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setReportConfig(prev => ({
                              ...prev,
                              selectedColumns: [...prev.selectedColumns, column.name]
                            }));
                          } else {
                            setReportConfig(prev => ({
                              ...prev,
                              selectedColumns: prev.selectedColumns.filter(col => col !== column.name)
                            }));
                          }
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">{column.name}</p>
                        <p className="text-xs text-gray-500">{column.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Filters</span>
                </div>
                <Button size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Filter
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportConfig.filters.map(filter => (
                <div key={filter.id} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Column</Label>
                    <Select 
                      value={filter.column} 
                      onValueChange={(value) => updateFilter(filter.id, 'column', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Operator</Label>
                    <Select 
                      value={filter.operator} 
                      onValueChange={(value) => updateFilter(filter.id, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="=">=</SelectItem>
                        <SelectItem value="!=">!=</SelectItem>
                        <SelectItem value=">">></SelectItem>
                        <SelectItem value="<"><</SelectItem>
                        <SelectItem value=">=">>=</SelectItem>
                        <SelectItem value="<="><=</SelectItem>
                        <SelectItem value="LIKE">LIKE</SelectItem>
                        <SelectItem value="IN">IN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                      placeholder="Enter value"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select 
                      value={filter.dataType} 
                      onValueChange={(value) => updateFilter(filter.id, 'dataType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => removeFilter(filter.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {reportConfig.filters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No filters configured</p>
                  <p className="text-sm">Add filters to refine your report data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grouping and Sorting */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Group By</span>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {reportConfig.groupBy.map((column, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <Badge variant="outline">{column}</Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setReportConfig(prev => ({
                          ...prev,
                          groupBy: prev.groupBy.filter((_, i) => i !== index)
                        }))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order By</span>
                  <Button size="sm" onClick={addOrderBy}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reportConfig.orderBy.map((order, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2 items-center">
                    <Select 
                      value={order.column} 
                      onValueChange={(value) => updateOrderBy(index, 'column', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.map(col => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={order.direction} 
                      onValueChange={(value) => updateOrderBy(index, 'direction', value as 'ASC' | 'DESC')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ASC">ASC</SelectItem>
                        <SelectItem value="DESC">DESC</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => removeOrderBy(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Aggregations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Aggregations</span>
                </div>
                <Button size="sm" onClick={addAggregation}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Aggregation
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reportConfig.aggregations.map((agg, index) => (
                <div key={index} className="grid grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Column</Label>
                    <Select 
                      value={agg.column} 
                      onValueChange={(value) => updateAggregation(index, 'column', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableColumns.filter(col => 
                          col.type === 'number' || col.type === 'decimal' || col.type === 'int'
                        ).map(col => (
                          <SelectItem key={col.name} value={col.name}>
                            {col.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Function</Label>
                    <Select 
                      value={agg.type} 
                      onValueChange={(value) => updateAggregation(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUM">SUM</SelectItem>
                        <SelectItem value="AVG">AVG</SelectItem>
                        <SelectItem value="COUNT">COUNT</SelectItem>
                        <SelectItem value="MIN">MIN</SelectItem>
                        <SelectItem value="MAX">MAX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => removeAggregation(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="saved">
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
              <CardDescription>
                Manage your saved custom reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Save className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No saved reports found</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>
                Preview your report data (limited to 10 rows)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {previewData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        {Object.keys(previewData[0]).map(column => (
                          <th key={column} className="border border-gray-300 px-4 py-2 text-left">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value: any, cellIndex) => (
                            <td key={cellIndex} className="border border-gray-300 px-4 py-2">
                              {value?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No preview data available</p>
                  <p className="text-sm">Click "Preview" to see your report data</p>
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