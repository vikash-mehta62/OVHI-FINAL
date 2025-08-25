import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,
  Users,
  Calendar,
  Award,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Download,
  Share
} from 'lucide-react';

interface ExecutiveMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  collectionRate: number;
  collectionRateChange: number;
  denialRate: number;
  denialRateChange: number;
  complianceScore: number;
  complianceChange: number;
  avgDaysToPayment: number;
  paymentDaysChange: number;
  totalClaims: number;
  claimsGrowth: number;
  topPerformingProvider: string;
  topPerformingPayer: string;
}

interface KPITrend {
  name: string;
  current: number;
  previous: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit: 'currency' | 'percentage' | 'days' | 'count';
}

interface ExecutiveInsight {
  id: string;
  type: 'success' | 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation?: string;
  metric?: string;
  value?: number;
}

interface PerformanceHighlight {
  category: string;
  metric: string;
  value: string;
  change: number;
  status: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

const ExecutiveSummary: React.FC = () => {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [kpiTrends, setKpiTrends] = useState<KPITrend[]>([]);
  const [insights, setInsights] = useState<ExecutiveInsight[]>([]);
  const [highlights, setHighlights] = useState<PerformanceHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [comparisonPeriod, setComparisonPeriod] = useState('previous_period');

  useEffect(() => {
    fetchExecutiveData();
  }, [timeRange, comparisonPeriod]);

  const fetchExecutiveData = async () => {
    setLoading(true);
    try {
      const [metricsResponse, trendsResponse, insightsResponse, highlightsResponse] = await Promise.all([
        fetch(`/api/v1/rcm/reports/executive/metrics?range=${timeRange}&comparison=${comparisonPeriod}`),
        fetch(`/api/v1/rcm/reports/executive/kpi-trends?range=${timeRange}`),
        fetch(`/api/v1/rcm/reports/executive/insights?range=${timeRange}`),
        fetch(`/api/v1/rcm/reports/executive/highlights?range=${timeRange}`)
      ]);

      const metricsData = await metricsResponse.json();
      const trendsData = await trendsResponse.json();
      const insightsData = await insightsResponse.json();
      const highlightsData = await highlightsResponse.json();

      setMetrics(metricsData.metrics);
      setKpiTrends(trendsData.trends || []);
      setInsights(insightsData.insights || []);
      setHighlights(highlightsData.highlights || []);
    } catch (error) {
      console.error('Error fetching executive data:', error);
    } finally {
      setLoading(false);
    }
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

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const getTrendIcon = (trend: string, size = 'h-4 w-4') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className={`${size} text-green-500`} />;
      case 'down':
        return <ArrowDown className={`${size} text-red-500`} />;
      default:
        return <Minus className={`${size} text-gray-500`} />;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_attention':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportExecutiveSummary = async () => {
    try {
      const response = await fetch(`/api/v1/rcm/reports/executive/export?range=${timeRange}&format=pdf`, {
        method: 'POST'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive-summary-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting executive summary:', error);
    }
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
          <h1 className="text-3xl font-bold">Executive Summary</h1>
          <p className="text-gray-500">High-level performance overview and key insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_period">vs Previous Period</SelectItem>
              <SelectItem value="same_period_last_year">vs Same Period Last Year</SelectItem>
              <SelectItem value="rolling_average">vs Rolling Average</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportExecutiveSummary}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metrics.revenueGrowth > 0 ? 'up' : metrics.revenueGrowth < 0 ? 'down' : 'stable')}
                    <span className={`text-sm ${metrics.revenueGrowth > 0 ? 'text-green-600' : metrics.revenueGrowth < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {metrics.revenueGrowth > 0 ? '+' : ''}{formatPercentage(metrics.revenueGrowth)}
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Collection Rate</p>
                  <p className="text-3xl font-bold">{formatPercentage(metrics.collectionRate)}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metrics.collectionRateChange > 0 ? 'up' : metrics.collectionRateChange < 0 ? 'down' : 'stable')}
                    <span className={`text-sm ${metrics.collectionRateChange > 0 ? 'text-green-600' : metrics.collectionRateChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {metrics.collectionRateChange > 0 ? '+' : ''}{formatPercentage(metrics.collectionRateChange)}
                    </span>
                  </div>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Denial Rate</p>
                  <p className="text-3xl font-bold">{formatPercentage(metrics.denialRate)}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metrics.denialRateChange < 0 ? 'up' : metrics.denialRateChange > 0 ? 'down' : 'stable')}
                    <span className={`text-sm ${metrics.denialRateChange < 0 ? 'text-green-600' : metrics.denialRateChange > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {metrics.denialRateChange > 0 ? '+' : ''}{formatPercentage(metrics.denialRateChange)}
                    </span>
                  </div>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Compliance Score</p>
                  <p className="text-3xl font-bold">{formatPercentage(metrics.complianceScore)}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    {getTrendIcon(metrics.complianceChange > 0 ? 'up' : metrics.complianceChange < 0 ? 'down' : 'stable')}
                    <span className={`text-sm ${metrics.complianceChange > 0 ? 'text-green-600' : metrics.complianceChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {metrics.complianceChange > 0 ? '+' : ''}{formatPercentage(metrics.complianceChange)}
                    </span>
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis">Key Performance</TabsTrigger>
          <TabsTrigger value="insights">Strategic Insights</TabsTrigger>
          <TabsTrigger value="highlights">Performance Highlights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Revenue Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Current Period</span>
                    <span className="font-bold">{metrics && formatCurrency(metrics.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Growth Rate</span>
                    <div className="flex items-center space-x-1">
                      {metrics && getTrendIcon(metrics.revenueGrowth > 0 ? 'up' : 'down')}
                      <span className="font-medium">{metrics && formatPercentage(metrics.revenueGrowth)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Claims</span>
                    <span className="font-medium">{metrics && formatNumber(metrics.totalClaims)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Avg Days to Payment</span>
                    <span className="font-medium">{metrics && metrics.avgDaysToPayment} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Award className="h-5 w-5" />
                  <span>Top Performers</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Top Performing Provider</p>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{metrics?.topPerformingProvider || 'N/A'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Top Performing Payer</p>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{metrics?.topPerformingPayer || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Quick Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.slice(0, 3).map((insight) => (
                  <div key={insight.id} className="p-4 border rounded-lg">
                    <div className="flex items-start space-x-3">
                      {getInsightIcon(insight.type)}
                      <div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-600 mt-2 font-medium">
                            💡 {insight.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kpis">
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
              <CardDescription>
                Track critical metrics against targets and historical performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {kpiTrends.map((kpi, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{kpi.name}</h3>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(kpi.trend)}
                        <span className={`font-medium ${kpi.change > 0 ? 'text-green-600' : kpi.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Current</p>
                        <p className="font-bold">
                          {kpi.unit === 'currency' && formatCurrency(kpi.current)}
                          {kpi.unit === 'percentage' && formatPercentage(kpi.current)}
                          {kpi.unit === 'days' && `${kpi.current} days`}
                          {kpi.unit === 'count' && formatNumber(kpi.current)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Previous</p>
                        <p className="font-medium">
                          {kpi.unit === 'currency' && formatCurrency(kpi.previous)}
                          {kpi.unit === 'percentage' && formatPercentage(kpi.previous)}
                          {kpi.unit === 'days' && `${kpi.previous} days`}
                          {kpi.unit === 'count' && formatNumber(kpi.previous)}
                        </p>
                      </div>
                      {kpi.target && (
                        <div>
                          <p className="text-sm text-gray-500">Target</p>
                          <p className="font-medium">
                            {kpi.unit === 'currency' && formatCurrency(kpi.target)}
                            {kpi.unit === 'percentage' && formatPercentage(kpi.target)}
                            {kpi.unit === 'days' && `${kpi.target} days`}
                            {kpi.unit === 'count' && formatNumber(kpi.target)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Performance</p>
                        <div className="flex items-center space-x-1">
                          {kpi.target && (
                            <Badge variant={kpi.current >= kpi.target ? 'default' : 'secondary'}>
                              {kpi.current >= kpi.target ? 'On Target' : 'Below Target'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights & Recommendations</CardTitle>
              <CardDescription>
                AI-powered insights and actionable recommendations for improvement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{insight.title}</h3>
                          <div className="flex items-center space-x-2">
                            <Badge variant={insight.impact === 'high' ? 'destructive' : insight.impact === 'medium' ? 'default' : 'secondary'}>
                              {insight.impact} impact
                            </Badge>
                            <Badge variant="outline">{insight.type}</Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{insight.description}</p>
                        
                        {insight.recommendation && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <h4 className="font-medium text-blue-900 mb-1">Recommendation</h4>
                            <p className="text-blue-800 text-sm">{insight.recommendation}</p>
                          </div>
                        )}
                        
                        {insight.metric && insight.value && (
                          <div className="mt-3 text-sm text-gray-500">
                            Related metric: {insight.metric} - {insight.value}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights">
          <Card>
            <CardHeader>
              <CardTitle>Performance Highlights</CardTitle>
              <CardDescription>
                Key achievements and areas requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((highlight, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getStatusColor(highlight.status)}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{highlight.category}</h3>
                      <Badge variant="outline">{highlight.status.replace('_', ' ')}</Badge>
                    </div>
                    
                    <p className="text-sm mb-2">{highlight.metric}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">{highlight.value}</span>
                      <div className="flex items-center space-x-1">
                        {getTrendIcon(highlight.change > 0 ? 'up' : highlight.change < 0 ? 'down' : 'stable')}
                        <span className="text-sm font-medium">
                          {highlight.change > 0 ? '+' : ''}{highlight.change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExecutiveSummary;