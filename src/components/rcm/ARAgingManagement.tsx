import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Phone,
  Mail,
  FileText,
  Calendar,
  User,
  Building,
  Search,
  Filter,
  Eye,
  Edit,
  Send,
  CheckCircle,
  Target
} from 'lucide-react';
import { toast } from 'sonner';

interface ARAccount {
  id: string;
  patientName: string;
  patientId: string;
  accountNumber: string;
  balance: number;
  daysOutstanding: number;
  lastPaymentDate: string;
  lastContactDate: string;
  payerName: string;
  status: 'active' | 'follow_up' | 'collections' | 'write_off';
  priority: 'low' | 'medium' | 'high';
  agingBucket: '0-30' | '31-60' | '61-90' | '91-120' | '120+';
  contactAttempts: number;
  notes: string;
}

interface ARStats {
  totalAR: number;
  daysInAR: number;
  collectionRate: number;
  writeOffRate: number;
  agingBuckets: {
    bucket: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
}

const ARAgingManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [accounts, setAccounts] = useState<ARAccount[]>([]);
  const [stats, setStats] = useState<ARStats>({
    totalAR: 0,
    daysInAR: 0,
    collectionRate: 0,
    writeOffRate: 0,
    agingBuckets: []
  });
  const [selectedAccount, setSelectedAccount] = useState<ARAccount | null>(null);
  const [filterBucket, setFilterBucket] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sample data
  useEffect(() => {
    const sampleAccounts: ARAccount[] = [
      {
        id: '1',
        patientName: 'John Smith',
        patientId: 'PAT001',
        accountNumber: 'ACC001',
        balance: 1250.00,
        daysOutstanding: 45,
        lastPaymentDate: '2023-12-15',
        lastContactDate: '2024-01-10',
        payerName: 'Blue Cross Blue Shield',
        status: 'follow_up',
        priority: 'medium',
        agingBucket: '31-60',
        contactAttempts: 2,
        notes: 'Patient requested payment plan. Follow up on 1/25.'
      },
      {
        id: '2',
        patientName: 'Jane Doe',
        patientId: 'PAT002',
        accountNumber: 'ACC002',
        balance: 850.00,
        daysOutstanding: 15,
        lastPaymentDate: '2024-01-05',
        lastContactDate: '2024-01-08',
        payerName: 'Aetna',
        status: 'active',
        priority: 'low',
        agingBucket: '0-30',
        contactAttempts: 1,
        notes: 'Insurance pending. Expected payment by month end.'
      },
      {
        id: '3',
        patientName: 'Bob Johnson',
        patientId: 'PAT003',
        accountNumber: 'ACC003',
        balance: 2100.00,
        daysOutstanding: 95,
        lastPaymentDate: '2023-10-20',
        lastContactDate: '2024-01-15',
        payerName: 'Medicare',
        status: 'collections',
        priority: 'high',
        agingBucket: '91-120',
        contactAttempts: 5,
        notes: 'Sent to collections agency. Awaiting response.'
      },
      {
        id: '4',
        patientName: 'Alice Brown',
        patientId: 'PAT004',
        accountNumber: 'ACC004',
        balance: 450.00,
        daysOutstanding: 135,
        lastPaymentDate: '2023-09-10',
        lastContactDate: '2024-01-12',
        payerName: 'Self Pay',
        status: 'write_off',
        priority: 'low',
        agingBucket: '120+',
        contactAttempts: 8,
        notes: 'Patient unable to pay. Considering write-off.'
      }
    ];

    const sampleStats: ARStats = {
      totalAR: 125680.50,
      daysInAR: 42.5,
      collectionRate: 94.2,
      writeOffRate: 2.8,
      agingBuckets: [
        { bucket: '0-30', amount: 45230.25, percentage: 36, count: 89 },
        { bucket: '31-60', amount: 38450.75, percentage: 31, count: 67 },
        { bucket: '61-90', amount: 25680.00, percentage: 20, count: 45 },
        { bucket: '91-120', amount: 12150.50, percentage: 10, count: 28 },
        { bucket: '120+', amount: 4169.00, percentage: 3, count: 15 }
      ]
    };

    setAccounts(sampleAccounts);
    setStats(sampleStats);
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const matchesBucket = filterBucket === 'all' || account.agingBucket === filterBucket;
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      account.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.payerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesBucket && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'follow_up': return 'bg-yellow-100 text-yellow-800';
      case 'collections': return 'bg-red-100 text-red-800';
      case 'write_off': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case '0-30': return 'bg-green-100 text-green-800';
      case '31-60': return 'bg-yellow-100 text-yellow-800';
      case '61-90': return 'bg-orange-100 text-orange-800';
      case '91-120': return 'bg-red-100 text-red-800';
      case '120+': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFollowUp = (account: ARAccount) => {
    setSelectedAccount(account);
    setShowFollowUpDialog(true);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAccounts(prev => prev.map(account => 
        account.id === selectedAccount.id 
          ? { 
              ...account, 
              lastContactDate: new Date().toISOString().split('T')[0],
              contactAttempts: account.contactAttempts + 1
            }
          : account
      ));
      
      setShowFollowUpDialog(false);
      setSelectedAccount(null);
      toast.success('Follow-up recorded successfully');
    } catch (error) {
      toast.error('Failed to record follow-up');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    const selectedAccounts = filteredAccounts.filter(account => 
      action === 'follow_up' ? account.status === 'active' : true
    );

    if (selectedAccounts.length === 0) {
      toast.info('No accounts selected for this action');
      return;
    }

    setLoading(true);
    try {
      // Simulate bulk action
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`${action} completed for ${selectedAccounts.length} accounts`);
    } catch (error) {
      toast.error(`Failed to perform ${action}`);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">A/R Aging Management</h2>
          <p className="text-gray-600">Monitor and manage accounts receivable aging</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => handleBulkAction('follow_up')}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            Bulk Follow-up
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total A/R</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${stats.totalAR.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">Outstanding balance</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Days in A/R</p>
                <p className="text-2xl font-bold text-orange-600">{stats.daysInAR}</p>
                <p className="text-xs text-orange-600">Target: 35 days</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Collection Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.collectionRate}%</p>
                <p className="text-xs text-green-600">+2.1% vs last month</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Write-off Rate</p>
                <p className="text-2xl font-bold text-red-600">{stats.writeOffRate}%</p>
                <p className="text-xs text-red-600">Target: <3%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Account Management</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search by patient, account, or payer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterBucket} onValueChange={setFilterBucket}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Aging Bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Buckets</SelectItem>
                    <SelectItem value="0-30">0-30 Days</SelectItem>
                    <SelectItem value="31-60">31-60 Days</SelectItem>
                    <SelectItem value="61-90">61-90 Days</SelectItem>
                    <SelectItem value="91-120">91-120 Days</SelectItem>
                    <SelectItem value="120+">120+ Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="collections">Collections</SelectItem>
                    <SelectItem value="write_off">Write-off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Accounts Table */}
          <Card>
            <CardHeader>
              <CardTitle>A/R Accounts ({filteredAccounts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Account #</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Days Outstanding</TableHead>
                      <TableHead>Aging Bucket</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Last Contact</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{account.patientName}</p>
                            <p className="text-sm text-gray-500">{account.patientId}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{account.accountNumber}</TableCell>
                        <TableCell>
                          <p className="font-bold">${account.balance.toFixed(2)}</p>
                        </TableCell>
                        <TableCell>
                          <span className={account.daysOutstanding > 90 ? 'text-red-600 font-bold' : ''}>
                            {account.daysOutstanding}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getBucketColor(account.agingBucket)}>
                            {account.agingBucket}
                          </Badge>
                        </TableCell>
                        <TableCell>{account.payerName}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(account.status)}>
                            {account.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(account.priority)}>
                            {account.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{account.lastContactDate}</p>
                            <p className="text-xs text-gray-500">
                              {account.contactAttempts} attempts
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFollowUp(account)}
                            >
                              <Phone className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Mail className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aging Chart */}
            <Card>
              <CardHeader>
                <CardTitle>A/R Aging Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.agingBuckets}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ bucket, percentage }) => `${bucket}: ${percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {stats.agingBuckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Aging Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Aging Bucket Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.agingBuckets.map((bucket, index) => (
                    <div key={bucket.bucket} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <p className="font-medium">{bucket.bucket} Days</p>
                          <p className="text-sm text-gray-600">{bucket.count} accounts</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${bucket.amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{bucket.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Collections Management</CardTitle>
              <CardDescription>
                Accounts requiring collection activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAccounts.filter(account => 
                  account.status === 'collections' || account.daysOutstanding > 90
                ).map((account) => (
                  <div key={account.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-red-900">{account.patientName}</h4>
                        <p className="text-sm text-red-700">
                          Account: {account.accountNumber} | {account.daysOutstanding} days outstanding
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-900">${account.balance.toFixed(2)}</p>
                        <Badge className={getPriorityColor(account.priority)}>
                          {account.priority} priority
                        </Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-sm text-red-700">
                        <strong>Last Contact:</strong> {account.lastContactDate} 
                        ({account.contactAttempts} attempts)
                      </p>
                      <p className="text-sm text-red-700">
                        <strong>Notes:</strong> {account.notes}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-red-700">
                        Recommended Action: {account.daysOutstanding > 120 ? 'Consider write-off' : 'Escalate collection efforts'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline">
                          <Phone className="w-3 h-3 mr-1" />
                          Call
                        </Button>
                        <Button size="sm" variant="outline">
                          <Mail className="w-3 h-3 mr-1" />
                          Email
                        </Button>
                        <Button size="sm">
                          Update Status
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Current Month Collections</p>
                      <p className="text-lg font-bold text-blue-600">$98,450</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Collection Efficiency</p>
                      <p className="text-lg font-bold text-green-600">94.2%</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-600">Accounts > 90 Days</p>
                      <p className="text-lg font-bold text-orange-600">43 accounts</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Aging Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Collection Letters
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Phone className="w-4 h-4 mr-2" />
                    Schedule Follow-up Calls
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export to Collections Agency
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Follow-up</DialogTitle>
            <DialogDescription>
              {selectedAccount && `${selectedAccount.patientName} - Account: ${selectedAccount.accountNumber}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Method</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="letter">Letter</SelectItem>
                      <SelectItem value="in_person">In Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Outcome</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select outcome" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment_promised">Payment Promised</SelectItem>
                      <SelectItem value="payment_plan">Payment Plan Setup</SelectItem>
                      <SelectItem value="no_contact">No Contact</SelectItem>
                      <SelectItem value="dispute">Dispute Raised</SelectItem>
                      <SelectItem value="hardship">Financial Hardship</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label>Follow-up Notes</Label>
                <Textarea 
                  placeholder="Enter detailed notes about the contact..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label>Next Follow-up Date</Label>
                <Input type="date" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFollowUp} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Follow-up'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ARAgingManagement;

  const fetchARData = async () => {
    try {
      setLoading(true);
      const response = await getARAgingReportAPI(token);
      if (response.success) {
        setArData(response.data);
      }
    } catch (error) {
      console.error('Error fetching A/R aging data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchARData();
  }, []);



  const getCollectabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      high: { color: 'bg-red-500', text: 'High' },
      medium: { color: 'bg-yellow-500', text: 'Medium' },
      low: { color: 'bg-green-500', text: 'Low' }
    };
    
    const { color, text } = config[priority as keyof typeof config] || config.medium;
    
    return (
      <Badge className={`${color} text-white`}>
        {text}
      </Badge>
    );
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading A/R aging data...</span>
      </div>
    );
  }

  if (!arData) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p>Unable to load A/R aging data</p>
        <Button onClick={fetchARData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/R Aging Management</h2>
          <p className="text-muted-foreground">
            Monitor and manage accounts receivable aging
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchARData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total A/R</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(arData.totalAR)}</div>
            <p className="text-xs text-muted-foreground">
              Outstanding receivables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">0-30 Days</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(arData.arBuckets.find((b: any) => b.range === '0-30 days')?.amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {arData.arBuckets.find((b: any) => b.range === '0-30 days')?.percentage || 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-90 Days</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (arData.arBuckets.find((b: any) => b.range === '31-60 days')?.amount || 0) +
                (arData.arBuckets.find((b: any) => b.range === '61-90 days')?.amount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires follow-up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                (arData.arBuckets.find((b: any) => b.range === '91-120 days')?.amount || 0) +
                (arData.arBuckets.find((b: any) => b.range === '120+ days')?.amount || 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical collection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A/R Aging Chart */}
        <Card>
          <CardHeader>
            <CardTitle>A/R Aging Distribution</CardTitle>
            <CardDescription>
              Outstanding amounts by aging bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arData.arBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis tickFormatter={(value) => `${value / 1000}K`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="amount" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Collectability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Collectability Analysis</CardTitle>
            <CardDescription>
              Expected collection rates by aging bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={arData.arBuckets}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, collectability }) => `${range}: ${collectability}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="collectability"
                >
                  {arData.arBuckets.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* A/R Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>A/R Accounts</CardTitle>
          <CardDescription>
            Individual accounts requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Payer</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Days Past Due</TableHead>
                <TableHead>Collectability</TableHead>
                <TableHead>Recommended Action</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arData.arAccounts.slice(0, 10).map((account: any) => (
                <TableRow key={account.account_id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{account.patient_name}</div>
                      <div className="text-sm text-muted-foreground">
                        ID: {account.patient_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{account.payer_name || 'Self Pay'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                    <div className="text-sm text-muted-foreground">
                      Last service: {formatDate(account.last_service_date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{account.days_past_due} days</div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getCollectabilityColor(account.collectability_score)}`}>
                      {account.collectability_score}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{account.recommended_action}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {account.contact_method === 'phone' && (
                        <Button variant="outline" size="sm">
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}
                      {account.contact_method === 'email' && (
                        <Button variant="outline" size="sm">
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ARAgingManagement;