import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Activity, CheckCircle, XCircle } from 'lucide-react';

interface OperationalMetrics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowRate: number;
  averageWaitTime: number;
  patientSatisfaction: number;
  providerUtilization: number;
  encountersPerDay: number;
  appointmentTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  providerPerformance: Array<{
    provider: string;
    appointments: number;
    utilization: number;
    satisfaction: number;
  }>;
}

const OperationalAnalytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('30d');
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOperationalMetrics();
  }, [timeframe]);

  const fetchOperationalMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/analytics/operational?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching operational metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Operational Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Operational Analytics</h1>
        <div className="flex gap-4">
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
          <Button variant="outline">Export Report</Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Key Operational Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalAppointments}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                  {metrics.completedAppointments} completed
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">No-Show Rate</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.noShowRate)}</div>
                <p className="text-xs text-muted-foreground">
                  Industry avg: 15-20%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Wait Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTime(metrics.averageWaitTime)}</div>
                <p className="text-xs text-muted-foreground">
                  Target: &lt;15 min
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Provider Utilization</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(metrics.providerUtilization)}</div>
                <p className="text-xs text-muted-foreground">
                  Optimal: 80-85%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Appointment Types Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Types</CardTitle>
              <CardDescription>Distribution of appointment types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.appointmentTypes.map((type, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium">{type.type}</div>
                      <Badge variant="secondary">{formatPercentage(type.percentage)}</Badge>
                    </div>
                    <div className="font-medium">{type.count} appointments</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Provider Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Provider Performance</CardTitle>
              <CardDescription>Individual provider metrics and utilization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.providerPerformance.map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{provider.provider}</div>
                        <div className="text-sm text-muted-foreground">
                          {provider.appointments} appointments
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4 text-right">
                      <div>
                        <div className="text-sm font-medium">Utilization</div>
                        <div className="text-sm text-muted-foreground">
                          {formatPercentage(provider.utilization)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Satisfaction</div>
                        <div className="text-sm text-muted-foreground">
                          {provider.satisfaction.toFixed(1)}/5.0
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Appointment Trends Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Trends</CardTitle>
              <CardDescription>Daily appointment volume and patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Appointment trends chart will be displayed here</p>
                  <p className="text-sm text-gray-400">Chart component integration pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default OperationalAnalytics;