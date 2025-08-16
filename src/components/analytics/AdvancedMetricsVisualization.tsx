import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  LineChart,
  Activity,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Maximize2
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  Treemap,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { formatCurrency } from '@/utils/billingUtils';

interface MetricCard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  trend: Array<{ date: string; value: number }>;
  target?: number;
  status: 'good' | 'warning' | 'critical';
  description: string;
}

interface ChartData {
  name: string;
  [key: string]: any;
}

const AdvancedMetricsVisualization: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [timeframe, setTimeframe] = useState('30d');
  const [chartType, setChartType] = useState('area');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchMetricsData();
  }, [selectedMetric, timeframe]);

  const fetchMetricsData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      setTimeout(() => {
        setData(getMockMetricsData());
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setData(getMockMetricsData());
      setLoading(false);
    }
  };

  const getMockMetricsData = () => ({
    kpiCards: [
      {
        id: 'revenue',
        title: 'Total Revenue',
        value: formatCurrency(485600),
        change: 12.5,
        changeType: 'increase',
        trend: [
          { date: '2024-01-01', value: 75000 },
          { date: '2024-01-02', value: 78000 },
          { date: '2024-01-03', value: 82000 },
          { date: '2024-01-04', value: 85000 },
          { date: '2024-01-05', value: 88000 }
        ],
        target: 500000,
        status: 'good',
        description: 'Monthly revenue target: 97.1% achieved'
      },
      {
        id: 'collection_rate',
        title: 'Collection Rate',
        value: '94.2%',
        change: 2.1,
        changeType: 'increase',
        trend: [
          { date: '2024-01-01', value: 92.1 },
          { date: '2024-01-02', value: 93.2 },
          { date: '2024-01-03', value: 93.8 },
          { date: '2024-01-04', value: 94.0 },
          { date: '2024-01-05', value: 94.2 }
        ],
        target: 95,
        status: 'warning',
        description: 'Target: 95% (0.8% below target)'
      },
      {
        id: 'patient_satisfaction',
        title: 'Patient Satisfaction',
        value: '4.7/5.0',
        change: 0.3,
        changeType: 'increase',
        trend: [
          { date: '2024-01-01', value: 4.4 },
          { date: '2024-01-02', value: 4.5 },
          { date: '2024-01-03', value: 4.6 },
          { date: '2024-01-04', value: 4.6 },
          { date: '2024-01-05', value: 4.7 }
        ],
        target: 4.5,
        status: 'good',
        description: 'Exceeding target by 0.2 points'
      },
      {
        id: 'denial_rate',
        title: 'Denial Rate',
        value: '3.8%',
        change: -1.3,
        changeType: 'increase',
        trend: [
          { date: '2024-01-01', value: 5.1 },
          { date: '2024-01-02', value: 4.8 },
          { date: '2024-01-03', value: 4.2 },
          { date: '2024-01-04', value: 3.9 },
          { date: '2024-01-05', value: 3.8 }
        ],
        target: 5,
        status: 'good',
        description: 'Below target threshold'
      },
      {
        id: 'avg_wait_time',
        title: 'Avg Wait Time',
        value: '18 min',
        change: -5.2,
        changeType: 'increase',
        trend: [
          { date: '2024-01-01', value: 23 },
          { date: '2024-01-02', value: 21 },
          { date: '2024-01-03', value: 19 },
          { date: '2024-01-04', value: 18 },
          { date: '2024-01-05', value: 18 }
        ],
        target: 15,
        status: 'warning',
        description: '3 minutes above target'
      },
      {
        id: 'no_show_rate',
        title: 'No-Show Rate',
        value: '8.2%',
        change: 1.5,
        changeType: 'decrease',
        trend: [
          { date: '2024-01-01', value: 6.7 },
          { date: '2024-01-02', value: 7.2 },
          { date: '2024-01-03', value: 7.8 },
          { date: '2024-01-04', value: 8.0 },
          { date: '2024-01-05', value: 8.2 }
        ],
        target: 5,
        status: 'critical',
        description: '3.2% above target threshold'
      }
    ],
    revenueAnalysis: [
      { month: 'Jan', revenue: 75000, target: 70000, collections: 71000, outstanding: 4000 },
      { month: 'Feb', revenue: 82000, target: 75000, collections: 78000, outstanding: 4000 },
      { month: 'Mar', revenue: 78000, target: 75000, collections: 74000, outstanding: 4000 },
      { month: 'Apr', revenue: 85000, target: 80000, collections: 81000, outstanding: 4000 },
      { month: 'May', revenue: 92000, target: 85000, collections: 87000, outstanding: 5000 },
      { month: 'Jun', revenue: 88000, target: 85000, collections: 84000, outstanding: 4000 }
    ],
    patientFlow: [
      { time: '8:00', scheduled: 12, arrived: 10, completed: 8, waiting: 2 },
      { time: '9:00', scheduled: 15, arrived: 14, completed: 12, waiting: 2 },
      { time: '10:00', scheduled: 18, arrived: 16, completed: 14, waiting: 2 },
      { time: '11:00', scheduled: 14, arrived: 13, completed: 11, waiting: 2 },
      { time: '12:00', scheduled: 8, arrived: 7, completed: 6, waiting: 1 },
      { time: '13:00', scheduled: 10, arrived: 9, completed: 8, waiting: 1 },
      { time: '14:00', scheduled: 16, arrived: 15, completed: 13, waiting: 2 },
      { time: '15:00', scheduled: 14, arrived: 12, completed: 10, waiting: 2 },
      { time: '16:00', scheduled: 12, arrived: 11, completed: 9, waiting: 2 },
      { time: '17:00', scheduled: 8, arrived: 7, completed: 6, waiting: 1 }
    ],
    providerPerformance: [
      { name: 'Dr. Smith', patients: 312, revenue: 156000, satisfaction: 4.8, efficiency: 92 },
      { name: 'Dr. Johnson', patients: 287, revenue: 143500, satisfaction: 4.7, efficiency: 88 },
      { name: 'Dr. Williams', patients: 298, revenue: 149000, satisfaction: 4.9, efficiency: 95 },
      { name: 'Dr. Brown', patients: 350, revenue: 175000, satisfaction: 4.6, efficiency: 85 }
    ],
    departmentMetrics: [
      { department: 'Cardiology', revenue: 125000, patients: 245, satisfaction: 4.8 },
      { department: 'Orthopedics', revenue: 98000, patients: 189, satisfaction: 4.6 },
      { department: 'Internal Medicine', revenue: 156000, patients: 412, satisfaction: 4.7 },
      { department: 'Pediatrics', revenue: 87000, patients: 298, satisfaction: 4.9 },
      { department: 'Dermatology', revenue: 76000, patients: 156, satisfaction: 4.5 }
    ],
    conversionFunnel: [
      { name: 'Inquiries', value: 1000, fill: '#8884d8' },
      { name: 'Appointments Scheduled', value: 750, fill: '#83a6ed' },
      { name: 'Appointments Completed', value: 650, fill: '#8dd1e1' },
      { name: 'Follow-up Scheduled', value: 450, fill: '#82ca9d' },
      { name: 'Treatment Completed', value: 380, fill: '#a4de6c' }
    ]
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Metrics Data</h3>
        <p className="text-muted-foreground">Unable to load metrics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Advanced Metrics</h1>
          <p className="text-muted-foreground">
            Deep insights and advanced visualizations for your practice
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
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
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.kpiCards.map((card: MetricCard) => (
          <Card key={card.id} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className="flex items-center space-x-1">
                {getStatusIcon(card.status)}
                {getChangeIcon(card.changeType)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {card.changeType === 'increase' ? '+' : ''}{card.change}% from last period
                </p>
                {card.target && (
                  <Badge variant={card.status === 'good' ? 'default' : 'secondary'}>
                    Target: {typeof card.target === 'number' && card.target > 100 
                      ? formatCurrency(card.target) 
                      : card.target}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              
              {/* Mini trend chart */}
              <div className="mt-4 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={card.trend}>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={card.status === 'good' ? '#10b981' : card.status === 'warning' ? '#f59e0b' : '#ef4444'}
                      fill={card.status === 'good' ? '#10b981' : card.status === 'warning' ? '#f59e0b' : '#ef4444'}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Advanced Charts */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Analysis</TabsTrigger>
          <TabsTrigger value="patient-flow">Patient Flow</TabsTrigger>
          <TabsTrigger value="performance">Provider Performance</TabsTrigger>
          <TabsTrigger value="departments">Department Metrics</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Target Analysis</CardTitle>
                <CardDescription>Monthly performance against targets</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <ComposedChart data={data.revenueAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${value / 1000}K`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Actual Revenue" />
                    <Line type="monotone" dataKey="target" stroke="#ff7300" strokeWidth={3} name="Target" />
                    <Area type="monotone" dataKey="collections" fill="#82ca9d" fillOpacity={0.6} name="Collections" />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Revenue breakdown by source</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Insurance', value: 65, fill: '#0088FE' },
                        { name: 'Self Pay', value: 20, fill: '#00C49F' },
                        { name: 'Medicare', value: 10, fill: '#FFBB28' },
                        { name: 'Medicaid', value: 5, fill: '#FF8042' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.revenueAnalysis.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patient-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Patient Flow</CardTitle>
              <CardDescription>Patient scheduling and completion patterns throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.patientFlow}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="scheduled" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  <Area type="monotone" dataKey="arrived" stackId="2" stroke="#82ca9d" fill="#82ca9d" />
                  <Area type="monotone" dataKey="completed" stackId="3" stroke="#ffc658" fill="#ffc658" />
                  <Area type="monotone" dataKey="waiting" stackId="4" stroke="#ff7300" fill="#ff7300" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance Matrix</CardTitle>
              <CardDescription>Multi-dimensional provider performance analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={data.providerPerformance}>
                  <CartesianGrid />
                  <XAxis dataKey="patients" name="Patients" />
                  <YAxis dataKey="revenue" name="Revenue" tickFormatter={(value) => `$${value / 1000}K`} />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(value as number) : value,
                      name
                    ]}
                  />
                  <Scatter name="Providers" dataKey="revenue" fill="#8884d8">
                    {data.providerPerformance.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance Treemap</CardTitle>
              <CardDescription>Department revenue and patient volume visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <Treemap
                  data={data.departmentMetrics}
                  dataKey="revenue"
                  aspectRatio={4 / 3}
                  stroke="#fff"
                  fill="#8884d8"
                >
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Conversion Funnel</CardTitle>
              <CardDescription>Patient journey from inquiry to treatment completion</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <FunnelChart data={data.conversionFunnel}>
                  <Tooltip />
                  <Funnel
                    dataKey="value"
                    data={data.conversionFunnel}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdvancedMetricsVisualization;