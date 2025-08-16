import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Activity, CheckCircle, AlertCircle, Plus } from 'lucide-react';

// Import existing CCM components
import GetAllCcmTask from './GetAllCcmTask';
import AddCcmTaskDialog from './AddCcmTaskDialog';
import CareCoordinationActivities from './CareCoordinationActivities';

interface CCMMetrics {
  totalPatients: number;
  activeCarePlans: number;
  completedTasks: number;
  pendingTasks: number;
  monthlyMinutes: number;
  targetMinutes: number;
  billingEligible: number;
  recentActivities: Array<{
    id: string;
    patientName: string;
    activity: string;
    duration: number;
    timestamp: string;
    provider: string;
  }>;
}

const CCMDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<CCMMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    fetchCCMMetrics();
  }, []);

  const fetchCCMMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/ccm/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      } else {
        // Mock data for development
        setMetrics({
          totalPatients: 45,
          activeCarePlans: 38,
          completedTasks: 127,
          pendingTasks: 23,
          monthlyMinutes: 1240,
          targetMinutes: 1600,
          billingEligible: 32,
          recentActivities: [
            {
              id: '1',
              patientName: 'John Smith',
              activity: 'Care plan review',
              duration: 15,
              timestamp: new Date().toISOString(),
              provider: 'Dr. Johnson'
            },
            {
              id: '2',
              patientName: 'Mary Davis',
              activity: 'Medication reconciliation',
              duration: 20,
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              provider: 'Nurse Williams'
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching CCM metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
  };

  const getProgressPercentage = () => {
    if (!metrics) return 0;
    return Math.min((metrics.monthlyMinutes / metrics.targetMinutes) * 100, 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Chronic Care Management</h1>
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
        <h1 className="text-3xl font-bold">Chronic Care Management</h1>
        <Button onClick={() => setShowAddTask(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add CCM Task
        </Button>
      </div>

      {metrics && (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.totalPatients}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.activeCarePlans} with active care plans
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Minutes</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatMinutes(metrics.monthlyMinutes)}</div>
                <div className="mt-2">
                  <Progress value={getProgressPercentage()} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatMinutes(metrics.targetMinutes)} target
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.completedTasks}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Completed</span>
                  <AlertCircle className="h-3 w-3 text-orange-500 ml-2" />
                  <span>{metrics.pendingTasks} pending</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billing Eligible</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.billingEligible}</div>
                <p className="text-xs text-muted-foreground">
                  Patients ready for billing
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="tasks" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="activities">Care Coordination</TabsTrigger>
              <TabsTrigger value="recent">Recent Activities</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">
              <GetAllCcmTask />
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <CareCoordinationActivities />
            </TabsContent>

            <TabsContent value="recent" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent CCM Activities</CardTitle>
                  <CardDescription>Latest care coordination activities and time tracking</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                            <Activity className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{activity.patientName}</div>
                            <div className="text-sm text-muted-foreground">{activity.activity}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatMinutes(activity.duration)}</div>
                          <div className="text-xs text-muted-foreground">{activity.provider}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Billing Summary */}
          <Card>
            <CardHeader>
              <CardTitle>CCM Billing Summary</CardTitle>
              <CardDescription>Monthly billing eligibility and time tracking summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{metrics.billingEligible}</div>
                  <div className="text-sm text-muted-foreground">Patients eligible for CCM billing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formatMinutes(metrics.monthlyMinutes)}</div>
                  <div className="text-sm text-muted-foreground">Total care coordination time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    ${(metrics.billingEligible * 42.60).toFixed(0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Estimated monthly revenue (CPT 99490)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Task Dialog */}
      {showAddTask && (
        <AddCcmTaskDialog 
          isOpen={showAddTask}
          onClose={() => setShowAddTask(false)}
          onTaskAdded={fetchCCMMetrics}
        />
      )}
    </div>
  );
};

export default CCMDashboard;