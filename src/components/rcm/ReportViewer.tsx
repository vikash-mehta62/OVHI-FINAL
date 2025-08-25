import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  RefreshCw, 
  Filter, 
  BarChart3, 
  PieChart, 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Eye,
  Share
} from 'lucide-react';

interface ReportData {
  summary: any;
  data: any[];
  charts: any[];
  metadata: {
    generatedAt: string;
    totalRecords: number;
    filters: any;
    reportType: string;
  };
}

interface ReportViewerProps {
  reportId?: string;
  reportType?: string;
  initialData?: ReportData;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ 
  reportId, 
  reportType = 'cms_compliance',
  initialData 
}) => {
  const [reportData, setReportData] = useState<ReportData | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    providerId: '',
    payerId: ''
  });
  const [exportFormat, setExportFormat] = useState('csv');

  useEffect(() => {
    if (!initialData) {
      fetchReportData();
    }
  }, [reportId, reportType]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const endpoint = reportId 
        ? `/api/v1/rcm/reports/${reportId}`
        : `/api/v1/rcm/reports/generate/${reportType}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      });

      const result = await response.json();
      if (result.success) {
        setReportData(result.report);
      } else {
        console.error('Failed to fetch report data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/export/${reportType}?format=${exportFormat}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getReportTitle = (type: string) => {
    switch (type) {
      case 'cms_compliance':
        return 'CMS Compliance Report';
      case 'performance_analytics':
        return 'Performance Analytics Report';
      case 'denial_analysis':
        return 'Denial Analysis Report';
      case 'payer_performance':
        return 'Payer Performance Report';
      default:
        return 'Report';
    }
  };

  const renderSummaryCards = () => {
    if (!reportData?.summary) return null;

    const summary = reportData.summary;
    
    switch (reportType) {
      case 'cms_compliance':
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Claims</p>
                    <p className="text-2xl font-bold">{summary.total_claims?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Compliant Claims</p>
                    <p className="text-2xl font-bold">{summary.compliant_claims?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Non-Compliant</p>
                    <p className="text-2xl font-bold">{summary.non_compliant_claims?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Compliance Rate</p>
                    <p className="text-2xl font-bold">{summary.compliance_rate?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 'performance_analytics':
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Total Billed</p>
                    <p className="text-2xl font-bold">${summary.total_billed_amount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Collection Rate</p>
                    <p className="text-2xl font-bold">{summary.collection_rate?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Avg Collection Days</p>
                    <p className="text-2xl font-bold">{Math.round(summary.avg_collection_days || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Denial Rate</p>
                    <p className="text-2xl font-bold">{summary.denial_rate?.toFixed(1) || 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderDataTable = (data: any[], title: string) => {
    if (!data || data.length === 0) return null;

    const columns = Object.keys(data[0]);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  {columns.map(column => (
                    <th key={column} className="border border-gray-300 px-4 py-2 text-left">
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {columns.map(column => (
                      <td key={column} className="border border-gray-300 px-4 py-2">
                        {typeof row[column] === 'number' && column.includes('rate') 
                          ? `${row[column].toFixed(1)}%`
                          : typeof row[column] === 'number' && column.includes('amount')
                          ? `$${row[column].toLocaleString()}`
                          : row[column]?.toString() || ''
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Showing 10 of {data.length} records. Export for full data.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-gray-500">No report data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getReportTitle(reportType)}</h1>
          <p className="text-gray-500">
            Generated on {new Date(reportData.metadata.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchReportData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Filters */}
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
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={filters.providerId} onValueChange={(value) => setFilters(prev => ({ ...prev, providerId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Providers</SelectItem>
                  {/* Provider options would be populated from API */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payer</Label>
              <Select value={filters.payerId} onValueChange={(value) => setFilters(prev => ({ ...prev, payerId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Payers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Payers</SelectItem>
                  {/* Payer options would be populated from API */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={fetchReportData}>
              <Eye className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Report Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed Data</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Render different sections based on report type */}
          {reportType === 'cms_compliance' && reportData.validationBreakdown && 
            renderDataTable(reportData.validationBreakdown, 'Validation Rule Breakdown')
          }
          
          {reportType === 'cms_compliance' && reportData.topIssues && 
            renderDataTable(reportData.topIssues, 'Top Compliance Issues')
          }
          
          {reportType === 'performance_analytics' && reportData.monthlyTrends && 
            renderDataTable(reportData.monthlyTrends, 'Monthly Performance Trends')
          }
          
          {reportType === 'denial_analysis' && reportData.denialReasons && 
            renderDataTable(reportData.denialReasons, 'Top Denial Reasons')
          }
          
          {reportType === 'payer_performance' && reportData.payerSummary && 
            renderDataTable(reportData.payerSummary, 'Payer Performance Summary')
          }
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Report Data</CardTitle>
              <CardDescription>
                Complete dataset for this report ({reportData.metadata.totalRecords} records)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.data && reportData.data.length > 0 ? (
                renderDataTable(reportData.data, 'All Data')
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No detailed data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Performance Chart</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chart visualization will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Distribution Chart</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Distribution chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Report Insights</CardTitle>
              <CardDescription>
                Key findings and recommendations based on the report data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Key Finding</h4>
                  <p className="text-blue-700 text-sm mt-1">
                    Analysis shows improvement opportunities in specific areas.
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Recommendation</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Consider implementing targeted improvements based on the data trends.
                  </p>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900">Action Item</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Review processes that show declining performance metrics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportViewer;