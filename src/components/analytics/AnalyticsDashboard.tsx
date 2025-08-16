import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  FileText,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Settings
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { formatCurrency } from '@/utils/billingUtils';

interface AnalyticsData {
  overview: {
    totalPatients: number;
    totalRevenue: number;
    totalAppointments: number;
    collectionRate: number;
    denialRate: number;
    avgDaysAR: number;
  };
  trends: {
    revenue: Array<{ month: string; revenue: number; collections: number; }>;
    appointments: Array<{ date: string; scheduled: number; completed: number; cancelled: number; }>;
    patients: Array<{ month: string; new: number; returning: number; }>;
  };
  demographics: {
    ageGroups: Array<{ group: string; count: number; percentage: number; }>;
    gender: Array<{ gender: string; count: number; percentage: number; }>;
    insurance: Array<{ type: string; count: number; percentage: number; }>;
  };
  performance: {
    topDiagnoses: Array<{ code: string; description: string; count: number; }>;
    topProcedures: Array<{ code: string; description: string; count: number; revenue: number; }>;
    providerStats: Array<{ name: string; patients: number; revenue: number; satisfaction: number; }>;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeframe]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual API endpoint
      const response = await fetch(`/api/v1/analytics/dashboard?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData.data);
      } else {
        // Mock data for development
        setData(getMockAnalyticsData());
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setData(getMockAnalyticsData());
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const getMockAnalyticsData = (): AnalyticsData => ({
    overview: {
      totalPatients: 1247,
      totalRevenue: 485600,
      totalAppointments: 892,
      collectionRate: 94.2,
      denialRate: 3.8,
      avgDaysAR: 28
    },
    trends: {
      revenue: [
        { month: 'Jan', revenue: 75000, collections: 71000 },
        { month: 'Feb', revenue: 82000, collections: 78000 },
        { month: 'Mar', revenue: 78000, collections: 74000 },
        { month: 'Apr', revenue: 85000, collections: 81000 },
        { month: 'May', revenue: 92000, collections: 87000 },
        { month: 'Jun', revenue: 88000, collections: 84000 }
      ],
      appointments: [
        { date: '2024-01-01', scheduled: 45, completed: 42, cancelled: 3 },
        { date: '2024-01-02', scheduled: 38, completed: 35, cancelled: 3 },
        { date: '2024-01-03', scheduled: 52, completed: 48, cancelled: 4 },
        { date: '2024-01-04', scheduled: 41, completed: 39, cancelled: 2 },
        { date: '2024-01-05', scheduled: 47, completed: 44, cancelled: 3 }
      ],
      patients: [
        { month: 'Jan', new: 45, returning: 156 },
        { month: 'Feb', new: 52, returning: 168 },
        { month: 'Mar', new: 38, returning: 142 },
        { month: 'Apr', new: 61, returning: 178 },
        { month: 'May', new: 47, returning: 165 },
        { month: 'Jun', new: 55, returning: 172 }
      ]
    },
    demographics: {
      ageGroups: [
        { group: '0-18', count: 125, percentage: 10.0 },
        { group: '19-35', count: 312, percentage: 25.0 },
        { group: '36-50', count: 374, percentage: 30.0 },
        { group: '51-65', count: 287, percentage: 23.0 },
        { group: '65+', count: 149, percentage: 12.0 }
      ],
      gender: [
        { gender: 'Female', count: 672, percentage: 53.9 },
        { gender: 'Male', count: 575, percentage: 46.1 }
      ],
      insurance: [
        { type: 'Medicare', count: 312, percentage: 25.0 },
        { type: 'Medicaid', count: 187, percentage: 15.0 },
        { type: 'Private', count: 623, percentage: 50.0 },
        { type: 'Self-Pay', count: 125, percentage: 10.0 }
      ]
    },
    performance: {
      topDiagnoses: [
        { code: 'Z00.00', description: 'Encounter for general adult medical examination', count: 156 },
        { code: 'I10', description: 'Essential hypertension', count: 142 },
        { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', count: 128 },
        { code: 'M79.3', description: 'Panniculitis, unspecified', count: 98 },
        { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', count: 87 }
      ],
      topProcedures: [
        { code: '99213', description: 'Office visit, established patient', count: 245, revenue: 24500 },
        { code: '99214', description: 'Office visit, established patient', count: 189, revenue: 28350 },
        { code: '99203', description: 'Office visit, new patient', count: 156, revenue: 23400 },
        { code: '99212', description: 'Office visit, established patient', count: 134, revenue: 13400 },
        { code: '99204', description: 'Office visit, new patient', count: 98, revenue: 19600 }
      ],
      providerStats: [
        { name: 'Dr. Smith', patients: 312, revenue: 156000, satisfaction: 4.8 },
        { name: 'Dr. Johnson', patients: 287, revenue: 143500, satisfaction: 4.7 },
        { name: 'Dr. Williams', patients: 298, revenue: 149000, satisfaction: 4.9 },
        { name: 'Dr. Brown', patients: 350, revenue: 175000, satisfaction: 4.6 }
      ]
    }
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
        <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Unable to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your practice performance
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.overview.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +8.2% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalAppointments}</div>
            <p className="text-xs text-muted-foreground">
              +5.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.collectionRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Denial Rate</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.denialRate}%</div>
            <p className="text-xs text-muted-foreground">
              -1.3% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Days in A/R</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.avgDaysAR}</div>
            <p className="text-xs text-muted-foreground">
              -2.8 days from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="patients">Patient Analytics</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Collections</CardTitle>
                <CardDescription>Monthly revenue and collection trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.trends.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `$${value / 1000}K`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="collections"
                      stackId="2"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Procedures by Revenue</CardTitle>
                <CardDescription>Highest revenue generating procedures</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.performance.topProcedures}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="code" />
                    <YAxis tickFormatter={(value) => `$${value / 1000}K`} />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <CardDescription>Daily appointment scheduling and completion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.trends.appointments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="scheduled" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="#82ca9d" strokeWidth={2} />
                  <Line type="monotone" dataKey="cancelled" stroke="#ff7300" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Growth</CardTitle>
              <CardDescription>New vs returning patients by month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.trends.patients}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" stackId="a" fill="#8884d8" />
                  <Bar dataKey="returning" stackId="a" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Age Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.demographics.ageGroups}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ group, percentage }) => `${group}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.demographics.ageGroups.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gender Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.demographics.gender}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, percentage }) => `${gender}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.demographics.gender.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Types</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data.demographics.insurance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percentage }) => `${type}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.demographics.insurance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Diagnoses</CardTitle>
                <CardDescription>Most frequently used diagnosis codes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.topDiagnoses.map((diagnosis, index) => (
                    <div key={diagnosis.code} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{diagnosis.code}</Badge>
                          <span className="text-sm font-medium">{diagnosis.description}</span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {diagnosis.count} uses
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provider Performance</CardTitle>
                <CardDescription>Provider statistics and satisfaction scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.performance.providerStats.map((provider, index) => (
                    <div key={provider.name} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{provider.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {provider.patients} patients • {formatCurrency(provider.revenue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">★ {provider.satisfaction}</div>
                        <div className="text-xs text-muted-foreground">satisfaction</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;