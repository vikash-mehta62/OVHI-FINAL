import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Settings,
  Download,
  Share,
  Calendar,
  Users,
  DollarSign,
  Activity
} from 'lucide-react';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import CustomReportBuilder from '@/components/analytics/CustomReportBuilder';
import AdvancedMetricsVisualization from '@/components/analytics/AdvancedMetricsVisualization';

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const quickStats = [
    {
      title: 'Total Reports Generated',
      value: '247',
      change: '+12%',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Active Dashboards',
      value: '8',
      change: '+2',
      icon: BarChart3,
      color: 'text-green-600'
    },
    {
      title: 'Data Points Analyzed',
      value: '1.2M',
      change: '+18%',
      icon: Activity,
      color: 'text-purple-600'
    },
    {
      title: 'Automated Insights',
      value: '34',
      change: '+5',
      icon: TrendingUp,
      color: 'text-orange-600'
    }
  ];

  const recentReports = [
    {
      name: 'Monthly Revenue Analysis',
      type: 'Financial',
      lastRun: '2 hours ago',
      status: 'completed'
    },
    {
      name: 'Patient Satisfaction Survey',
      type: 'Quality',
      lastRun: '1 day ago',
      status: 'completed'
    },
    {
      name: 'Provider Performance Review',
      type: 'Operations',
      lastRun: '3 days ago',
      status: 'scheduled'
    },
    {
      name: 'Claims Denial Analysis',
      type: 'RCM',
      lastRun: '1 week ago',
      status: 'completed'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reporting</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics, custom reports, and advanced visualizations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Report
          </Button>
          <Button variant="outline" size="sm">
            <Share className="h-4 w-4 mr-2" />
            Share Dashboard
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
          <TabsTrigger value="metrics">Advanced Metrics</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <CustomReportBuilder />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <AdvancedMetricsVisualization />
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Insights Panel */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI-Powered Insights</CardTitle>
                  <CardDescription>
                    Automated analysis and recommendations based on your practice data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Revenue Insight */}
                    <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-start space-x-3">
                        <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">Revenue Opportunity Identified</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your collection rate for CPT code 99214 is 8% below industry average. 
                            Implementing automated follow-up could increase collections by an estimated $12,000/month.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            View Recommendations
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Patient Flow Insight */}
                    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-start space-x-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">Patient Flow Optimization</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Peak wait times occur between 10-11 AM. Consider adjusting appointment 
                            scheduling to distribute patient load more evenly throughout the day.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            Optimize Schedule
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Denial Pattern Insight */}
                    <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900">Denial Pattern Detected</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Claims for diagnosis code M79.3 have a 15% higher denial rate. 
                            Review documentation requirements for this condition.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            Review Guidelines
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Provider Performance Insight */}
                    <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                      <div className="flex items-start space-x-3">
                        <Activity className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-purple-900">Provider Efficiency Trend</h4>
                          <p className="text-sm text-purple-700 mt-1">
                            Dr. Williams shows 15% higher patient satisfaction scores when appointments 
                            are scheduled with 20-minute intervals instead of 15-minute intervals.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            Adjust Templates
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Predictive Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Predictive Analytics</CardTitle>
                  <CardDescription>
                    Forecasts and predictions based on historical data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Revenue Forecast</h4>
                      <div className="text-2xl font-bold text-green-600">$95,000</div>
                      <p className="text-sm text-muted-foreground">Projected next month</p>
                      <div className="text-xs text-green-600 mt-1">+8% vs current month</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Patient Volume</h4>
                      <div className="text-2xl font-bold text-blue-600">1,240</div>
                      <p className="text-sm text-muted-foreground">Projected appointments</p>
                      <div className="text-xs text-blue-600 mt-1">+12% vs current month</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Collection Rate</h4>
                      <div className="text-2xl font-bold text-purple-600">95.2%</div>
                      <p className="text-sm text-muted-foreground">Projected rate</p>
                      <div className="text-xs text-purple-600 mt-1">+1.0% improvement</div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">No-Show Rate</h4>
                      <div className="text-2xl font-bold text-orange-600">6.8%</div>
                      <p className="text-sm text-muted-foreground">Projected rate</p>
                      <div className="text-xs text-orange-600 mt-1">-1.4% improvement</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Reports Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Reports</CardTitle>
                  <CardDescription>Your latest generated reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentReports.map((report, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{report.name}</h4>
                          <p className="text-xs text-muted-foreground">{report.type}</p>
                          <p className="text-xs text-muted-foreground">{report.lastRun}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            report.status === 'completed' ? 'bg-green-500' : 
                            report.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-500'
                          }`} />
                          <Button variant="ghost" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Monthly Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Create Custom Dashboard
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Export Analytics Data
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;