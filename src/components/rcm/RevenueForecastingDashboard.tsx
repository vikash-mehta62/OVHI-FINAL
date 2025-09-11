/**
 * Revenue Forecasting Dashboard Component
 * ML-powered revenue predictions and business intelligence
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  Brain,
  Calendar,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface ForecastData {
  forecastId: string;
  forecastPeriod: number;
  modelType: string;
  projectedRevenue: number;
  confidenceInterval: {
    lowerBound: number;
    upperBound: number;
    confidenceLevel: number;
  };
  keyDrivers: Array<{
    driver: string;
    factor: string;
    impact: number;
    percentage?: number;
  }>;
  riskFactors: Array<{
    category: string;
    factor: string;
    impact: string;
    probability: number;
    description: string;
  }>;
  monthlyForecasts: Array<{
    month: number;
    projectedRevenue: number;
    lowerBound?: number;
    upperBound?: number;
  }>;
  accuracy: number;
  recommendations: Array<{
    category: string;
    priority: string;
    recommendation: string;
    expectedImpact: string;
  }>;
}

const RevenueForecastingDashboard: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [forecastPeriod, setForecastPeriod] = useState('12');
  const [modelType, setModelType] = useState('ensemble');
  const [includeSeasonality, setIncludeSeasonality] = useState(true);
  const [confidenceLevel, setConfidenceLevel] = useState('95');
  const [activeTab, setActiveTab] = useState('forecast');

  // Sample data for demonstration
  useEffect(() => {
    const sampleForecast: ForecastData = {
      forecastId: 'FCST_2024_001',
      forecastPeriod: 12,
      modelType: 'ensemble',
      projectedRevenue: 1250000,
      confidenceInterval: {
        lowerBound: 1125000,
        upperBound: 1375000,
        confidenceLevel: 95
      },
      keyDrivers: [
        { driver: 'Payer Mix', factor: 'Blue Cross Blue Shield', impact: 425000, percentage: 34 },
        { driver: 'Payer Mix', factor: 'Medicare', impact: 312500, percentage: 25 },
        { driver: 'Seasonality', factor: 'Q4 Peak', impact: 187500, percentage: 15 },
        { driver: 'Volume', factor: 'Average Monthly Claims', impact: 156250, percentage: 12.5 },
        { driver: 'Pricing', factor: 'Average Payment Amount', impact: 168750, percentage: 13.5 }
      ],
      riskFactors: [
        {
          category: 'Operational',
          factor: 'High Denial Rate',
          impact: 'High',
          probability: 0.7,
          description: 'Current denial rate of 12.5% is above industry average'
        },
        {
          category: 'Market',
          factor: 'Payer Contract Changes',
          impact: 'Medium',
          probability: 0.4,
          description: 'Potential changes in major payer contracts'
        }
      ],
      monthlyForecasts: [
        { month: 1, projectedRevenue: 95000, lowerBound: 85500, upperBound: 104500 },
        { month: 2, projectedRevenue: 98000, lowerBound: 88200, upperBound: 107800 },
        { month: 3, projectedRevenue: 102000, lowerBound: 91800, upperBound: 112200 },
        { month: 4, projectedRevenue: 105000, lowerBound: 94500, upperBound: 115500 },
        { month: 5, projectedRevenue: 108000, lowerBound: 97200, upperBound: 118800 },
        { month: 6, projectedRevenue: 110000, lowerBound: 99000, upperBound: 121000 },
        { month: 7, projectedRevenue: 112000, lowerBound: 100800, upperBound: 123200 },
        { month: 8, projectedRevenue: 108000, lowerBound: 97200, upperBound: 118800 },
        { month: 9, projectedRevenue: 105000, lowerBound: 94500, upperBound: 115500 },
        { month: 10, projectedRevenue: 110000, lowerBound: 99000, upperBound: 121000 },
        { month: 11, projectedRevenue: 115000, lowerBound: 103500, upperBound: 126500 },
        { month: 12, projectedRevenue: 122000, lowerBound: 109800, upperBound: 134200 }
      ],
      accuracy: 87.5,
      recommendations: [
        {
          category: 'Revenue Optimization',
          priority: 'High',
          recommendation: 'Focus on high-performing payers and services',
          expectedImpact: '5-10% revenue increase'
        },
        {
          category: 'Risk Mitigation',
          priority: 'Critical',
          recommendation: 'Address high denial rate through improved validation',
          expectedImpact: 'Prevent 10-15% revenue loss'
        }
      ]
    };

    setForecastData(sampleForecast);
  }, []);

  const handleGenerateForecast = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/v1/rcm/enhanced/forecasting/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          forecast_period: parseInt(forecastPeriod),
          model_type: modelType,
          include_seasonality: includeSeasonality,
          confidence_level: parseInt(confidenceLevel)
        })
      });

      if (response.ok) {
        const result = await response.json();
        setForecastData(result.data);
        toast.success('Revenue forecast generated successfully');
      } else {
        throw new Error('Failed to generate forecast');
      }
    } catch (error) {
      console.error('Forecast generation error:', error);
      toast.error('Failed to generate revenue forecast');
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

  const getMonthName = (monthNumber: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNumber - 1];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Revenue Forecasting</h2>
          <p className="text-gray-600">ML-powered revenue predictions and business intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Forecast Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Forecast Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Forecast Period</label>
              <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 Months</SelectItem>
                  <SelectItem value="12">12 Months</SelectItem>
                  <SelectItem value="18">18 Months</SelectItem>
                  <SelectItem value="24">24 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Model Type</label>
              <Select value={modelType} onValueChange={setModelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear Regression</SelectItem>
                  <SelectItem value="seasonal">Seasonal Decomposition</SelectItem>
                  <SelectItem value="arima">ARIMA Model</SelectItem>
                  <SelectItem value="ensemble">Ensemble Method</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Confidence Level</label>
              <Select value={confidenceLevel} onValueChange={setConfidenceLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="95">95%</SelectItem>
                  <SelectItem value="99">99%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleGenerateForecast}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {forecastData && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Projected Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(forecastData.projectedRevenue)}
                    </p>
                    <p className="text-xs text-gray-500">{forecastData.forecastPeriod} months</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Model Accuracy</p>
                    <p className="text-2xl font-bold text-green-600">{forecastData.accuracy}%</p>
                    <p className="text-xs text-green-600">High confidence</p>
                  </div>
                  <Target className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Confidence Range</p>
                    <p className="text-lg font-bold text-purple-600">
                      ±{formatCurrency((forecastData.confidenceInterval.upperBound - forecastData.confidenceInterval.lowerBound) / 2)}
                    </p>
                    <p className="text-xs text-gray-500">{forecastData.confidenceInterval.confidenceLevel}% confidence</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Risk Factors</p>
                    <p className="text-2xl font-bold text-red-600">{forecastData.riskFactors.length}</p>
                    <p className="text-xs text-red-600">Require attention</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="forecast">Forecast Chart</TabsTrigger>
              <TabsTrigger value="drivers">Key Drivers</TabsTrigger>
              <TabsTrigger value="risks">Risk Analysis</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="forecast" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Forecast Projection</CardTitle>
                  <CardDescription>
                    Monthly revenue projections with confidence intervals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={forecastData.monthlyForecasts}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={getMonthName}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), '']}
                          labelFormatter={(month: number) => `Month: ${getMonthName(month)}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stackId="1"
                          stroke="none"
                          fill="#3B82F6"
                          fillOpacity={0.1}
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stackId="1"
                          stroke="none"
                          fill="#ffffff"
                          fillOpacity={1}
                        />
                        <Line
                          type="monotone"
                          dataKey="projectedRevenue"
                          stroke="#3B82F6"
                          strokeWidth={3}
                          dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drivers" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Drivers Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={forecastData.keyDrivers}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ factor, percentage }) => `${factor}: ${percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="percentage"
                          >
                            {forecastData.keyDrivers.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value}%`, 'Impact']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Revenue Drivers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {forecastData.keyDrivers.map((driver, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <div>
                              <p className="font-medium">{driver.factor}</p>
                              <p className="text-sm text-gray-600">{driver.driver}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatCurrency(driver.impact)}</p>
                            <p className="text-sm text-gray-600">{driver.percentage}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Factor Analysis</CardTitle>
                  <CardDescription>
                    Identified risks that could impact revenue projections
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forecastData.riskFactors.map((risk, index) => (
                      <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium text-red-900">{risk.factor}</h4>
                            <p className="text-sm text-red-700">{risk.category}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={`${getImpactColor(risk.impact)} bg-transparent border`}>
                              {risk.impact} Impact
                            </Badge>
                            <p className="text-sm text-red-600 mt-1">
                              {(risk.probability * 100).toFixed(0)}% probability
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-red-700">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                  <CardDescription>
                    AI-generated recommendations to optimize revenue performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forecastData.recommendations.map((rec, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{rec.recommendation}</h4>
                            <p className="text-sm text-gray-600">{rec.category}</p>
                          </div>
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority} Priority
                          </Badge>
                        </div>
                        <p className="text-sm text-green-600 font-medium">
                          Expected Impact: {rec.expectedImpact}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default RevenueForecastingDashboard;