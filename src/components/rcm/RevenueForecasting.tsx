import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Brain,
  Target,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Activity
} from 'lucide-react';

const RevenueForecasting: React.FC = () => {
  const [forecastPeriod, setForecastPeriod] = useState('6m');
  const [confidenceLevel, setConfidenceLevel] = useState(85);

  // Mock forecasting data
  const historicalData = [
    { month: 'Jul 23', actual: 485000, predicted: null },
    { month: 'Aug 23', actual: 520000, predicted: null },
    { month: 'Sep 23', actual: 475000, predicted: null },
    { month: 'Oct 23', actual: 610000, predicted: null },
    { month: 'Nov 23', actual: 555000, predicted: null },
    { month: 'Dec 23', actual: 625000, predicted: null }
  ];

  const forecastData = [
    { month: 'Dec 23', actual: 625000, predicted: 625000, upper: 650000, lower: 600000 },
    { month: 'Jan 24', actual: null, predicted: 640000, upper: 680000, lower: 600000 },
    { month: 'Feb 24', actual: null, predicted: 655000, upper: 695000, lower: 615000 },
    { month: 'Mar 24', actual: null, predicted: 670000, upper: 715000, lower: 625000 },
    { month: 'Apr 24', actual: null, predicted: 685000, upper: 730000, lower: 640000 },
    { month: 'May 24', actual: null, predicted: 695000, upper: 745000, lower: 645000 },
    { month: 'Jun 24', actual: null, predicted: 710000, upper: 760000, lower: 660000 }
  ];

  const kpiData = [
    { name: 'Collection Rate', current: 92.5, target: 95, trend: 'up' },
    { name: 'Days in A/R', current: 28, target: 25, trend: 'down' },
    { name: 'Denial Rate', current: 8.2, target: 5, trend: 'down' },
    { name: 'Net Collection %', current: 96.8, target: 98, trend: 'up' }
  ];

  const scenarioAnalysis = [
    {
      scenario: 'Conservative',
      probability: 70,
      q1Revenue: 1950000,
      q2Revenue: 2100000,
      yearlyRevenue: 8200000,
      growth: 5.2
    },
    {
      scenario: 'Most Likely',
      probability: 85,
      q1Revenue: 2050000,
      q2Revenue: 2200000,
      yearlyRevenue: 8600000,
      growth: 8.1
    },
    {
      scenario: 'Optimistic',
      probability: 45,
      q1Revenue: 2200000,
      q2Revenue: 2350000,
      yearlyRevenue: 9200000,
      growth: 12.5
    }
  ];

  const riskFactors = [
    {
      factor: 'Payer Mix Changes',
      impact: 'High',
      probability: 'Medium',
      mitigation: 'Diversify payer contracts'
    },
    {
      factor: 'Regulatory Changes',
      impact: 'Medium',
      probability: 'High',
      mitigation: 'Stay updated on compliance'
    }
  ];

  const seasonalityData = [
    { month: 'Jan', factor: 0.95, revenue: 608000 },
    { month: 'Feb', factor: 0.98, revenue: 627200 },
    { month: 'Mar', factor: 1.05, revenue: 672000 },
    { month: 'Apr', factor: 1.02, revenue: 652800 },
    { month: 'May', factor: 0.97, revenue: 620800 },
    { month: 'Jun', factor: 1.03, revenue: 659200 },
    { month: 'Jul', factor: 0.94, revenue: 601600 },
    { month: 'Aug', factor: 1.06, revenue: 678400 },
    { month: 'Sep', factor: 0.99, revenue: 633600 },
    { month: 'Oct', factor: 1.08, revenue: 691200 },
    { month: 'Nov', factor: 1.01, revenue: 646400 },
    { month: 'Dec', factor: 1.04, revenue: 665600 }
  ];

  const forecastMetrics = {
    predictedRevenue: 4255000,
    confidence: 85,
    growthRate: 8.5,
    seasonalVariation: 12.8,
    riskFactors: ['Seasonal decline in Q1', 'New competitor entry'],
    opportunities: ['New service line launch', 'Insurance contract renewal']
  };

  const ModelAccuracy = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">Model Accuracy</span>
        <Badge variant="secondary">{confidenceLevel}%</Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Historical Variance</span>
          <span>±5.2%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Seasonal Adjustment</span>
          <span>Enabled</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>External Factors</span>
          <span>Included</span>
        </div>
      </div>
    </div>
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Revenue Forecasting
          </CardTitle>
          <div className="flex items-center gap-2">
            <select 
              value={forecastPeriod} 
              onChange={(e) => setForecastPeriod(e.target.value)}
              className="border rounded-md px-3 py-1 text-sm"
            >
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="12m">12 Months</option>
            </select>
            <Button size="sm" variant="outline">
              <Target className="h-4 w-4 mr-2" />
              Set Goals
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Forecast Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Predicted Revenue</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(forecastMetrics.predictedRevenue)}</p>
              <p className="text-sm text-muted-foreground">Next 6 months</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Confidence</span>
              </div>
              <p className="text-2xl font-bold">{forecastMetrics.confidence}%</p>
              <p className="text-sm text-muted-foreground">Model accuracy</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">Growth Rate</span>
              </div>
              <p className="text-2xl font-bold">{forecastMetrics.growthRate}%</p>
              <p className="text-sm text-muted-foreground">Year over year</p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">Seasonal Variation</span>
              </div>
              <p className="text-2xl font-bold">{forecastMetrics.seasonalVariation}%</p>
              <p className="text-sm text-muted-foreground">Peak to trough</p>
            </div>
          </div>

          {/* Revenue Forecast Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[...historicalData, ...forecastData]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  name="Actual" 
                  stroke="#22c55e" 
                  fill="#dcfce7" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="predicted" 
                  name="Predicted" 
                  stroke="#3b82f6" 
                  fill="#dbeafe" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* KPI Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Key Performance Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiData.map((kpi, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getTrendIcon(kpi.trend)}
                      <div>
                        <p className="font-medium">{kpi.name}</p>
                        <p className="text-sm text-gray-600">
                          Target: {kpi.name.includes('%') ? `${kpi.target}%` : kpi.target}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {kpi.name.includes('%') ? `${kpi.current}%` : kpi.current}
                      </p>
                      <p className={`text-sm ${
                        kpi.current >= kpi.target ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.current >= kpi.target ? 'On Target' : 'Below Target'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scenario Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarioAnalysis.map((scenario, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{scenario.scenario}</h4>
                      <Badge variant="outline">{scenario.probability}% likely</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Q1 Revenue</p>
                        <p className="font-bold">{formatCurrency(scenario.q1Revenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Q2 Revenue</p>
                        <p className="font-bold">{formatCurrency(scenario.q2Revenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Yearly Revenue</p>
                        <p className="font-bold">{formatCurrency(scenario.yearlyRevenue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Growth Rate</p>
                        <p className="font-bold text-green-600">+{scenario.growth}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Risk Factor</th>
                      <th className="text-left p-3">Impact</th>
                      <th className="text-left p-3">Probability</th>
                      <th className="text-left p-3">Mitigation Strategy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskFactors.map((risk, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{risk.factor}</td>
                        <td className="p-3">
                          <Badge className={getImpactColor(risk.impact)}>
                            {risk.impact}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={getImpactColor(risk.probability)}>
                            {risk.probability}
                          </Badge>
                        </td>
                        <td className="p-3 text-gray-600">{risk.mitigation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Revenue Growth Opportunity</p>
                    <p className="text-sm text-blue-700">
                      Analysis shows 15% increase in cardiology procedures. Consider expanding cardiology services 
                      to capture additional revenue of approximately $180K annually.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">Collection Rate Alert</p>
                    <p className="text-sm text-yellow-700">
                      Collection rate has decreased by 2.3% over the last quarter. Focus on improving 
                      patient payment processes and follow-up procedures.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Seasonal Trend Identified</p>
                    <p className="text-sm text-green-700">
                      Historical data shows 12% revenue increase in Q2. Prepare staffing and resources 
                      accordingly to maximize this seasonal opportunity.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueForecasting;