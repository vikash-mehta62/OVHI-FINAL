import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
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
  CheckCircle,
  Share,
  Clock,
  Target,
  Activity,
  Zap
} from 'lucide-react';

interface DashboardMetrics {
  totalReports: number;
  scheduledReports: number;
  reportsThisMonth: number;
  avgGenerationTime: number;
  totalRevenue: number;
  complianceRate: number;
  denialRate: number;
  collectionRate: number;
}

interface ChartData {
  name: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface ReportSummary {
  id: string;
  name: string;
  type: string;
  lastGenerated: string;
  status: 'completed' | 'generating' | 'scheduled' | 'failed';
  recordCount: number;
  insights: string[];
}

const EnhancedReportingDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [recentReports, setRecentReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [metricsResponse, chartsResponse, reportsResponse] = await Promise.all([
        fetch(`/api/v1/rcm/reports/dashboard/metrics?range=${selectedTimeRange}`),
        fetch(`/api/v1/rcm/reports/dashboard/charts?metric=${selectedMetric}&range=${selectedTimeRange}`),
        fetch(`/api/v1/rcm/reports/dashboard/recent?limit=10`)
      ]);

      const metricsData = await metricsResponse.json();
      const chartsData = await chartsResponse.json();
      const reportsData = await reportsResponse.json();

      setMetrics(metricsData.metrics);
      setChartData(chartsData.data || []);
      setRecentReports(reportsData.reports || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQuickReport = async (reportType: string) => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/generate/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        })
      });

      const result = await response.json();
      if (result.success) {
        // Refresh dashboard data
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error generating quick report:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'generating':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'up' || change > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (trend === 'down' || change < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
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
          <h1 className="text-3xl font-bold">Reporting Dashboard</h1>
          <p className="text-gray-500">Comprehensive analytics and reporting overview</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Automated Report</DialogTitle>
                <DialogDescription>
                  Set up automated report generation and delivery
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cms_compliance">CMS Compliance</SelectItem>
                      <SelectItem value="performance_analytics">Performance Analytics</SelectItem>
                      <SelectItem value="denial_analysis">Denial Analysis</SelectItem>
                      <SelectItem value="payer_performance">Payer Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
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
                  <Label>Email Recipients</Label>
                  <Input placeholder="Enter email addresses separated by commas" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setShowScheduleDialog(false)}>
                    Schedule Report
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Compliance Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(metrics.complianceRate)}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Collection Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(metrics.collectionRate)}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Denial Rate</p>
                  <p className="text-2xl font-bold">{formatPercentage(metrics.denialRate)}</p>
                </div>
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Recent Reports</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Generate reports instantly with predefined configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col space-y-2"
                  onClick={() => generateQuickReport('cms_compliance')}
                >
                  <CheckCircle className="h-6 w-6" />
                  <span>CMS Compliance</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col space-y-2"
                  onClick={() => generateQuickReport('performance_analytics')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Performance</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col space-y-2"
                  onClick={() => generateQuickReport('denial_analysis')}
                >
                  <AlertTriangle className="h-6 w-6" />
                  <span>Denials</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col space-y-2"
                  onClick={() => generateQuickReport('payer_performance')}
                >
                  <Users className="h-6 w-6" />
                  <span>Payers</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <LineChart className="h-5 w-5" />
                    <span>Revenue Trend</span>
                  </div>
                  <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="claims">Claims</SelectItem>
                      <SelectItem value="denials">Denials</SelectItem>
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  {chartData.length > 0 ? (
                    <div className="w-full space-y-4">
                      {chartData.slice(0, 6).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{formatCurrency(item.value)}</span>
                            {item.change && getTrendIcon(item.trend || 'stable', item.change)}
                            {item.change && (
                              <span className={`text-sm ${item.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <LineChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Chart data will be displayed here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5" />
                  <span>Report Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Distribution chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReports.slice(0, 5).map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(report.status)}
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(report.lastGenerated).toLocaleString()} • {report.recordCount.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{report.type}</Badge>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed performance metrics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Interactive analytics charts will be displayed here</p>
                    <p className="text-sm mt-2">Drill-down capabilities and filtering options</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Revenue Growth</h4>
                    <p className="text-blue-700 text-sm mt-1">
                      15% increase in collections this month
                    </p>
                  </div>
                  
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Compliance Improvement</h4>
                    <p className="text-green-700 text-sm mt-1">
                      CMS compliance rate improved to 96.5%
                    </p>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Denial Reduction</h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Denial rate decreased by 2.3% this quarter
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>
                View and manage recently generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(report.status)}
                        <div>
                          <h3 className="font-medium">{report.name}</h3>
                          <p className="text-sm text-gray-500">
                            Generated: {new Date(report.lastGenerated).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{report.type}</Badge>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">{report.recordCount.toLocaleString()} records processed</p>
                      {report.insights.length > 0 && (
                        <div>
                          <p className="font-medium mb-1">Key Insights:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {report.insights.map((insight, index) => (
                              <li key={index}>{insight}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>
                Manage automated report generation and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No scheduled reports configured</p>
                <Button className="mt-4" onClick={() => setShowScheduleDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Your First Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedReportingDashboard;