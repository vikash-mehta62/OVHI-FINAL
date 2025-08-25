import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Phone, 
  Mail, 
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Send,
  CreditCard,
  Building,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/utils/rcmFormatters';

interface PatientAccount {
  id: number;
  patientId: number;
  patientName: string;
  totalBalance: number;
  aging30: number;
  aging60: number;
  aging90: number;
  aging120Plus: number;
  lastPaymentDate: string;
  lastStatementDate: string;
  collectionStatus: string;
  priority: string;
  assignedCollector: string;
  contactAttempts: number;
  paymentPlanActive: boolean;
  insurancePending: number;
}

interface PaymentPlan {
  id: number;
  patientId: number;
  patientName: string;
  totalAmount: number;
  monthlyPayment: number;
  remainingBalance: number;
  nextPaymentDate: string;
  planStatus: string;
  paymentsRemaining: number;
  autoPayEnabled: boolean;
}

interface CollectionActivity {
  id: number;
  patientId: number;
  activityType: string;
  activityDate: string;
  description: string;
  outcome: string;
  nextAction: string;
  nextActionDate: string;
  performedBy: string;
}

const CollectionsManagement: React.FC = () => {
  const [patientAccounts, setPatientAccounts] = useState<PatientAccount[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [activities, setActivities] = useState<CollectionActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState<PatientAccount | null>(null);
  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);

  useEffect(() => {
    fetchPatientAccounts();
    fetchPaymentPlans();
    fetchCollectionActivities();
  }, []);

  const fetchPatientAccounts = async () => {
    try {
      const response = await fetch('/api/v1/rcm/collections/accounts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPatientAccounts(data.data);
      } else {
        // Mock data for development
        setPatientAccounts(getMockPatientAccounts());
      }
    } catch (error) {
      console.error('Failed to fetch patient accounts:', error);
      setPatientAccounts(getMockPatientAccounts());
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentPlans = async () => {
    try {
      const response = await fetch('/api/v1/rcm/collections/payment-plans', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPaymentPlans(data.data);
      } else {
        // Mock data for development
        setPaymentPlans(getMockPaymentPlans());
      }
    } catch (error) {
      console.error('Failed to fetch payment plans:', error);
      setPaymentPlans(getMockPaymentPlans());
    }
  };

  const fetchCollectionActivities = async () => {
    try {
      const response = await fetch('/api/v1/rcm/collections/activities', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.data);
      } else {
        // Mock data for development
        setActivities(getMockActivities());
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities(getMockActivities());
    }
  };

  const getMockPatientAccounts = (): PatientAccount[] => [
    {
      id: 1,
      patientId: 1001,
      patientName: 'John Smith',
      totalBalance: 1250.00,
      aging30: 300.00,
      aging60: 450.00,
      aging90: 250.00,
      aging120Plus: 250.00,
      lastPaymentDate: '2023-12-15',
      lastStatementDate: '2024-01-15',
      collectionStatus: 'active',
      priority: 'high',
      assignedCollector: 'Sarah Johnson',
      contactAttempts: 3,
      paymentPlanActive: false,
      insurancePending: 0.00
    },
    {
      id: 2,
      patientId: 1002,
      patientName: 'Mary Davis',
      totalBalance: 850.00,
      aging30: 850.00,
      aging60: 0.00,
      aging90: 0.00,
      aging120Plus: 0.00,
      lastPaymentDate: '2024-01-10',
      lastStatementDate: '2024-01-20',
      collectionStatus: 'new',
      priority: 'medium',
      assignedCollector: 'Mike Wilson',
      contactAttempts: 1,
      paymentPlanActive: true,
      insurancePending: 200.00
    },
    {
      id: 3,
      patientId: 1003,
      patientName: 'Robert Brown',
      totalBalance: 2100.00,
      aging30: 0.00,
      aging60: 500.00,
      aging90: 800.00,
      aging120Plus: 800.00,
      lastPaymentDate: '2023-11-20',
      lastStatementDate: '2024-01-10',
      collectionStatus: 'collections',
      priority: 'urgent',
      assignedCollector: 'Lisa Chen',
      contactAttempts: 8,
      paymentPlanActive: false,
      insurancePending: 0.00
    }
  ];

  const getMockPaymentPlans = (): PaymentPlan[] => [
    {
      id: 1,
      patientId: 1002,
      patientName: 'Mary Davis',
      totalAmount: 1200.00,
      monthlyPayment: 150.00,
      remainingBalance: 850.00,
      nextPaymentDate: '2024-02-01',
      planStatus: 'active',
      paymentsRemaining: 6,
      autoPayEnabled: true
    },
    {
      id: 2,
      patientId: 1004,
      patientName: 'Jennifer Wilson',
      totalAmount: 800.00,
      monthlyPayment: 100.00,
      remainingBalance: 300.00,
      nextPaymentDate: '2024-02-05',
      planStatus: 'active',
      paymentsRemaining: 3,
      autoPayEnabled: false
    }
  ];

  const getMockActivities = (): CollectionActivity[] => [
    {
      id: 1,
      patientId: 1001,
      activityType: 'phone_call',
      activityDate: '2024-01-20',
      description: 'Called patient regarding overdue balance',
      outcome: 'no_answer',
      nextAction: 'send_letter',
      nextActionDate: '2024-01-25',
      performedBy: 'Sarah Johnson'
    },
    {
      id: 2,
      patientId: 1003,
      activityType: 'email',
      activityDate: '2024-01-18',
      description: 'Sent payment reminder email',
      outcome: 'delivered',
      nextAction: 'phone_call',
      nextActionDate: '2024-01-22',
      performedBy: 'Lisa Chen'
    }
  ];

  const createPaymentPlan = async (planData: any) => {
    try {
      const response = await fetch('/api/v1/rcm/collections/payment-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        fetchPaymentPlans();
        fetchPatientAccounts();
        setShowPaymentPlanDialog(false);
      }
    } catch (error) {
      console.error('Failed to create payment plan:', error);
    }
  };

  const logActivity = async (activityData: any) => {
    try {
      const response = await fetch('/api/v1/rcm/collections/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(activityData)
      });

      if (response.ok) {
        fetchCollectionActivities();
        setShowActivityDialog(false);
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
      active: { color: 'bg-yellow-100 text-yellow-800', label: 'Active' },
      collections: { color: 'bg-red-100 text-red-800', label: 'Collections' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      written_off: { color: 'bg-gray-100 text-gray-800', label: 'Written Off' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-green-100 text-green-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredAccounts = patientAccounts.filter(account => {
    const matchesSearch = account.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || account.collectionStatus === statusFilter;
    const matchesAging = agingFilter === 'all' || 
      (agingFilter === '30' && account.aging30 > 0) ||
      (agingFilter === '60' && account.aging60 > 0) ||
      (agingFilter === '90' && account.aging90 > 0) ||
      (agingFilter === '120' && account.aging120Plus > 0);
    
    return matchesSearch && matchesStatus && matchesAging;
  });

  const collectionsStats = {
    totalAccounts: patientAccounts.length,
    totalBalance: patientAccounts.reduce((sum, a) => sum + a.totalBalance, 0),
    aging30: patientAccounts.reduce((sum, a) => sum + a.aging30, 0),
    aging60: patientAccounts.reduce((sum, a) => sum + a.aging60, 0),
    aging90: patientAccounts.reduce((sum, a) => sum + a.aging90, 0),
    aging120Plus: patientAccounts.reduce((sum, a) => sum + a.aging120Plus, 0),
    activePaymentPlans: paymentPlans.filter(p => p.planStatus === 'active').length,
    collectionsAccounts: patientAccounts.filter(a => a.collectionStatus === 'collections').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Collections Management</h2>
          <p className="text-muted-foreground">
            Patient account management, payment plans, and collection activities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowPaymentPlanDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Payment Plan
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchPatientAccounts()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(collectionsStats.totalBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionsStats.totalAccounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">0-30 Days</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(collectionsStats.aging30)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-60 Days</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(collectionsStats.aging60)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">61-90 Days</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(collectionsStats.aging90)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(collectionsStats.aging120Plus)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Plans</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{collectionsStats.activePaymentPlans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collections</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{collectionsStats.collectionsAccounts}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Patient Accounts</TabsTrigger>
          <TabsTrigger value="payment-plans">Payment Plans</TabsTrigger>
          <TabsTrigger value="activities">Collection Activities</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by patient name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="collections">Collections</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="aging-filter">Aging</Label>
                  <Select value={agingFilter} onValueChange={setAgingFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="30">0-30 Days</SelectItem>
                      <SelectItem value="60">31-60 Days</SelectItem>
                      <SelectItem value="90">61-90 Days</SelectItem>
                      <SelectItem value="120">90+ Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Patient Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>Patient Accounts ({filteredAccounts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Total Balance</TableHead>
                    <TableHead>0-30 Days</TableHead>
                    <TableHead>31-60 Days</TableHead>
                    <TableHead>61-90 Days</TableHead>
                    <TableHead>90+ Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Contact Attempts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        <div>
                          {account.patientName}
                          {account.paymentPlanActive && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Payment Plan
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(account.totalBalance)}</TableCell>
                      <TableCell className={account.aging30 > 0 ? 'text-green-600' : 'text-gray-400'}>
                        {formatCurrency(account.aging30)}
                      </TableCell>
                      <TableCell className={account.aging60 > 0 ? 'text-yellow-600' : 'text-gray-400'}>
                        {formatCurrency(account.aging60)}
                      </TableCell>
                      <TableCell className={account.aging90 > 0 ? 'text-orange-600' : 'text-gray-400'}>
                        {formatCurrency(account.aging90)}
                      </TableCell>
                      <TableCell className={account.aging120Plus > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {formatCurrency(account.aging120Plus)}
                      </TableCell>
                      <TableCell>{getStatusBadge(account.collectionStatus)}</TableCell>
                      <TableCell>{getPriorityBadge(account.priority)}</TableCell>
                      <TableCell>{account.assignedCollector}</TableCell>
                      <TableCell>
                        <span className={account.contactAttempts > 5 ? 'text-red-600 font-medium' : ''}>
                          {account.contactAttempts}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAccount(account)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowActivityDialog(true);
                            }}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAccount(account);
                              setShowPaymentPlanDialog(true);
                            }}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Payment Plans</CardTitle>
              <CardDescription>Manage patient payment plans and schedules</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Monthly Payment</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Payments Left</TableHead>
                    <TableHead>Auto Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.patientName}</TableCell>
                      <TableCell>{formatCurrency(plan.totalAmount)}</TableCell>
                      <TableCell>{formatCurrency(plan.monthlyPayment)}</TableCell>
                      <TableCell>{formatCurrency(plan.remainingBalance)}</TableCell>
                      <TableCell>{plan.nextPaymentDate}</TableCell>
                      <TableCell>{plan.paymentsRemaining}</TableCell>
                      <TableCell>
                        {plan.autoPayEnabled ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(plan.planStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collection Activities</CardTitle>
              <CardDescription>Track all collection efforts and outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Activity Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Next Action</TableHead>
                    <TableHead>Next Date</TableHead>
                    <TableHead>Performed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>{activity.activityDate}</TableCell>
                      <TableCell>{activity.patientId}</TableCell>
                      <TableCell className="capitalize">
                        {activity.activityType.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{activity.description}</TableCell>
                      <TableCell className="capitalize">
                        {activity.outcome.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="capitalize">
                        {activity.nextAction.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{activity.nextActionDate}</TableCell>
                      <TableCell>{activity.performedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Collection Rate</span>
                    <span className="font-medium">78%</span>
                  </div>
                  <Progress value={78} className="w-full" />
                  
                  <div className="flex justify-between items-center">
                    <span>Average Days to Collect</span>
                    <span className="font-medium">45 days</span>
                  </div>
                  <Progress value={65} className="w-full" />
                  
                  <div className="flex justify-between items-center">
                    <span>Payment Plan Success Rate</span>
                    <span className="font-medium">85%</span>
                  </div>
                  <Progress value={85} className="w-full" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aging Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-green-600">0-30 Days</span>
                    <span className="font-medium">{formatCurrency(collectionsStats.aging30)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-600">31-60 Days</span>
                    <span className="font-medium">{formatCurrency(collectionsStats.aging60)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-orange-600">61-90 Days</span>
                    <span className="font-medium">{formatCurrency(collectionsStats.aging90)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-600">90+ Days</span>
                    <span className="font-medium">{formatCurrency(collectionsStats.aging120Plus)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Plan Dialog */}
      <Dialog open={showPaymentPlanDialog} onOpenChange={setShowPaymentPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Payment Plan</DialogTitle>
            <DialogDescription>
              Set up a payment plan for {selectedAccount?.patientName}
            </DialogDescription>
          </DialogHeader>
          <PaymentPlanForm
            account={selectedAccount}
            onSubmit={createPaymentPlan}
            onCancel={() => setShowPaymentPlanDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Collection Activity</DialogTitle>
            <DialogDescription>
              Record collection activity for {selectedAccount?.patientName}
            </DialogDescription>
          </DialogHeader>
          <ActivityForm
            account={selectedAccount}
            onSubmit={logActivity}
            onCancel={() => setShowActivityDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payment Plan Form Component
interface PaymentPlanFormProps {
  account: PatientAccount | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const PaymentPlanForm: React.FC<PaymentPlanFormProps> = ({ account, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    totalAmount: account?.totalBalance || 0,
    monthlyPayment: 0,
    startDate: '',
    autoPayEnabled: false,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientId: account?.patientId,
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="totalAmount">Total Amount</Label>
        <Input
          id="totalAmount"
          type="number"
          step="0.01"
          value={formData.totalAmount}
          onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })}
          required
        />
      </div>

      <div>
        <Label htmlFor="monthlyPayment">Monthly Payment</Label>
        <Input
          id="monthlyPayment"
          type="number"
          step="0.01"
          value={formData.monthlyPayment}
          onChange={(e) => setFormData({ ...formData, monthlyPayment: parseFloat(e.target.value) })}
          required
        />
      </div>

      <div>
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="autoPayEnabled"
          checked={formData.autoPayEnabled}
          onChange={(e) => setFormData({ ...formData, autoPayEnabled: e.target.checked })}
        />
        <Label htmlFor="autoPayEnabled">Enable Auto Pay</Label>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about the payment plan..."
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Plan</Button>
      </div>
    </form>
  );
};

// Activity Form Component
interface ActivityFormProps {
  account: PatientAccount | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const ActivityForm: React.FC<ActivityFormProps> = ({ account, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    activityType: '',
    description: '',
    outcome: '',
    nextAction: '',
    nextActionDate: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      patientId: account?.patientId,
      activityDate: new Date().toISOString().split('T')[0],
      performedBy: 'Current User', // This should come from auth context
      ...formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="activityType">Activity Type</Label>
        <Select value={formData.activityType} onValueChange={(value) => setFormData({ ...formData, activityType: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select activity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone_call">Phone Call</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="letter">Letter</SelectItem>
            <SelectItem value="in_person">In Person</SelectItem>
            <SelectItem value="payment_received">Payment Received</SelectItem>
            <SelectItem value="payment_plan_setup">Payment Plan Setup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the collection activity..."
          required
        />
      </div>

      <div>
        <Label htmlFor="outcome">Outcome</Label>
        <Select value={formData.outcome} onValueChange={(value) => setFormData({ ...formData, outcome: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="successful">Successful</SelectItem>
            <SelectItem value="no_answer">No Answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="disconnected">Disconnected</SelectItem>
            <SelectItem value="promised_payment">Promised Payment</SelectItem>
            <SelectItem value="dispute">Dispute</SelectItem>
            <SelectItem value="payment_plan_requested">Payment Plan Requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="nextAction">Next Action</Label>
        <Select value={formData.nextAction} onValueChange={(value) => setFormData({ ...formData, nextAction: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select next action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone_call">Phone Call</SelectItem>
            <SelectItem value="send_letter">Send Letter</SelectItem>
            <SelectItem value="send_email">Send Email</SelectItem>
            <SelectItem value="payment_plan">Setup Payment Plan</SelectItem>
            <SelectItem value="collections_agency">Send to Collections</SelectItem>
            <SelectItem value="write_off">Write Off</SelectItem>
            <SelectItem value="no_action">No Action Needed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="nextActionDate">Next Action Date</Label>
        <Input
          id="nextActionDate"
          type="date"
          value={formData.nextActionDate}
          onChange={(e) => setFormData({ ...formData, nextActionDate: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Log Activity</Button>
      </div>
    </form>
  );
};

export default CollectionsManagement;