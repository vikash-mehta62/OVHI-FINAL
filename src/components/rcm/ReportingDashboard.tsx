import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, 
  TrendingUp, 
  FileText, 
  Download, 
  Calendar,
  Filter,
  Plus,
  Eye,
  Settings,
  RefreshCw,
  PieChart,
  LineChart,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  lastGenerated?: string;
  status?: 'ready' | 'generating' | 'error';
}

interface ReportMetrics {
  totalReports: number;
  scheduledReports: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
}

const ReportingDashboard: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [generatingReports, setGeneratingReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReportTemplates();
    fetchReportMetrics();
  }, []);

  const fetchReportTemplates = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/templates');
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching report templates:', error);
    }
  };

  const fetchReportMetrics = async () => {
    try {
      const response = await fetch('/api/v1/rcm/reports/metrics');
      const data = await response.json();
      setMetrics(data.metrics);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report metrics:', error);
      setLoading(false);
    }
  };

  const generateReport = async (templateId: string) => {
    setGeneratingReports(prev => new Set(prev).add(templateId));
    
    try {
      const response = await fetch(`/api/v1/rcm/reports/generate/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateFrom: dateRange.from,
          dateTo: dateRange.to
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Handle successful report generation
        console.log('Report generated successfully');
      } else {
        console.error('Report generation failed:', result.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReports(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
    }
  };

  const exportReport = async (templateId: string, format: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/export/${templateId}?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateFrom: dateRange.from,
          dateTo: dateRange.to
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${templateId}_${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'compliance':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'analytics':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'denials':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'payers':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'custom':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'compliance':
        return 'bg-green-100 text-green-800';
      case 'analytics':
        return 'bg-blue-100 text-blue-800';
      case 'denials':
        return 'bg-red-100 text-red-800';
      case 'payers':
        return 'bg-purple-100 text-purple-800';
      case 'custom':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

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
          <h1 className="text-3xl font-bold">Reporting Dashboard</h1>
          <p className="text-gray-500">Generate comprehensive reports and analytics</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Custom Report
        </Button>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Reports</p>
                  <p className="text-2xl font-bold">{metrics.totalReports}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Scheduled Reports</p>
                  <p className="text-2xl font-bold">{metrics.scheduledReports}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">This Month</p>
                  <p className="text-2xl font-bold">{metrics.reportsThisMonth}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Avg Generation Time</p>
                  <p className="text-2xl font-bold">{metrics.avgGenerationTime}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="denials">Denials</SelectItem>
                  <SelectItem value="payers">Payers</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Report Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(template.category)}
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                    </div>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {template.lastGenerated && (
                    <div className="text-sm text-gray-500">
                      Last generated: {new Date(template.lastGenerated).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      onClick={() => generateReport(template.id)}
                      disabled={generatingReports.has(template.id)}
                      className="flex-1"
                    >
                      {generatingReports.has(template.id) ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BarChart3 className="h-4 w-4 mr-2" />
                      )}
                      Generate
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => exportReport(template.id, 'csv')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-xs"
                      onClick={() => exportReport(template.id, 'csv')}
                    >
                      CSV
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-xs"
                      onClick={() => exportReport(template.id, 'excel')}
                    >
                      Excel
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-xs"
                      onClick={() => exportReport(template.id, 'pdf')}
                    >
                      PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Manage automated report generation schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled reports configured</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                View previously generated reports and download archives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Report history will be displayed here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Report Categories</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['compliance', 'analytics', 'denials', 'payers', 'custom'].map(category => {
                const count = templates.filter(t => t.category === category).length;
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getCategoryIcon(category)}
                      <span className="capitalize">{category}</span>
                    </div>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LineChart className="h-5 w-5" />
              <span>Generation Trends</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <LineChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Trend chart will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Quick Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Most Popular</span>
                <span className="text-sm font-medium">Performance Analytics</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Avg Size</span>
                <span className="text-sm font-medium">2.4 MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Success Rate</span>
                <span className="text-sm font-medium">98.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportingDashboard;