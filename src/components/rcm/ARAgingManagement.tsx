import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  MoreHorizontal,
  RefreshCw,
  Calendar,
  CreditCard,
  User,
  Target
} from 'lucide-react';
import { 
  getARAgingReportAPI, 
  getARAccountDetailsAPI, 
  initiateAutomatedFollowUpAPI, 
  setupPaymentPlanAPI 
} from '@/services/operations/rcm';

interface ARBucket {
  range: string;
  amount: number;
  count: number;
  percentage: string;
  priority: string;
  collectability: number;
}

interface ARAccount {
  account_id: string;
  patient_name: string;
  payer_name: string;
  balance: number;
  last_service_date: string;
  days_past_due: number;
  collectability_score: number;
  recommended_action: string;
  contact_method: string;
}

interface AccountDetails {
  account: any;
  claims: any[];
  collectionHistory: any[];
  paymentOptions: any[];
}

const ARAgingManagement: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [arData, setArData] = useState<{ totalAR: number; arBuckets: ARBucket[]; arAccounts: ARAccount[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetails | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showPaymentPlanDialog, setShowPaymentPlanDialog] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    followUpType: 'email',
    scheduledDate: '',
    message: ''
  });
  const [paymentPlanForm, setPaymentPlanForm] = useState({
    totalAmount: 0,
    monthlyPayment: 0,
    numberOfPayments: 6,
    startDate: '',
    notes: ''
  });

  const fetchARData = async () => {
    try {
      setLoading(true);
      const response = await getARAgingReportAPI(token);
      if (response.success) {
        setArData(response.data);
      }
    } catch (error) {
      console.error('Error fetching A/R data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAccountDetails = async (accountId: string) => {
    try {
      const response = await getARAccountDetailsAPI(token, accountId);
      if (response.success) {
        setSelectedAccount(response.data);
        setShowAccountDetails(true);
      }
    } catch (error) {
      console.error('Error fetching account details:', error);
    }
  };

  const handleInitiateFollowUp = async () => {
    if (!selectedAccount) return;

    try {
      const response = await initiateAutomatedFollowUpAPI(token, selectedAccount.account.account_id, followUpForm);
      if (response.success) {
        setShowFollowUpDialog(false);
        setFollowUpForm({ followUpType: 'email', scheduledDate: '', message: '' });
        // Refresh account details
        handleViewAccountDetails(selectedAccount.account.account_id);
      }
    } catch (error) {
      console.error('Error initiating follow-up:', error);
    }
  };

  const handleSetupPaymentPlan = async () => {
    if (!selectedAccount) return;

    try {
      const response = await setupPaymentPlanAPI(token, selectedAccount.account.account_id, paymentPlanForm);
      if (response.success) {
        setShowPaymentPlanDialog(false);
        setPaymentPlanForm({
          totalAmount: 0,
          monthlyPayment: 0,
          numberOfPayments: 6,
          startDate: '',
          notes: ''
        });
        // Refresh data
        fetchARData();
      }
    } catch (error) {
      console.error('Error setting up payment plan:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
    return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  useEffect(() => {
    fetchARData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading A/R data...</span>
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

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">A/R Aging Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage outstanding receivables with AI-powered recommendations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchARData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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
            <CardTitle className="text-sm font-medium">Current (0-30)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(arData.arBuckets.find(b => b.range.includes('0-30'))?.amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {arData.arBuckets.find(b => b.range.includes('0-30'))?.percentage}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due (60+)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                arData.arBuckets
                  .filter(b => b.range.includes('61-90') || b.range.includes('91-120') || b.range.includes('120+'))
                  .reduce((sum, b) => sum + b.amount, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Collection Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(
                arData.arAccounts.reduce((sum, acc) => sum + acc.days_past_due, 0) / 
                arData.arAccounts.length
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Days to collect payment
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
            <CardDescription>Outstanding amounts by age bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={arData.arBuckets}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis tickFormatter={(value) => `$${value / 1000}K`} />
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
            <CardDescription>Expected collection rates by age bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {arData.arBuckets.map((bucket, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{bucket.range}</span>
                    <span className="text-sm">{bucket.collectability}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={bucket.collectability} className="flex-1" />
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(bucket.priority)}`}></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(bucket.amount)}</span>
                    <span>{bucket.count} accounts</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* A/R Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>A/R Accounts</CardTitle>
          <CardDescription>
            Individual accounts requiring collection attention
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
                <TableHead>Risk Level</TableHead>
                <TableHead>Collectability</TableHead>
                <TableHead>Recommended Action</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arData.arAccounts.slice(0, 20).map((account) => (
                <TableRow key={account.account_id}>
                  <TableCell>
                    <div className="font-medium">{account.patient_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Last service: {formatDate(account.last_service_date)}
                    </div>
                  </TableCell>
                  <TableCell>{account.payer_name || 'Self Pay'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{formatCurrency(account.balance)}</div>
                  </TableCell>
                  <TableCell>
                    <span className={account.days_past_due > 60 ? 'text-red-600 font-medium' : ''}>
                      {account.days_past_due} days
                    </span>
                  </TableCell>
                  <TableCell>
                    {getRiskBadge(account.collectability_score)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress value={account.collectability_score} className="w-16" />
                      <span className={`text-sm ${getRiskColor(account.collectability_score)}`}>
                        {account.collectability_score}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{account.recommended_action}</div>
                    <div className="text-xs text-muted-foreground">
                      via {account.contact_method}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleViewAccountDetails(account.account_id)}
                        >
                          <User className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Phone className="mr-2 h-4 w-4" />
                          Schedule Call
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Send Statement
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Payment Plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Account Details Dialog */}
      <Dialog open={showAccountDetails} onOpenChange={setShowAccountDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              Detailed information and collection options for this account
            </DialogDescription>
          </DialogHeader>
          
          {selectedAccount && (
            <div className="space-y-6">
              {/* Account Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-medium">{selectedAccount.account.patient_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Balance:</span>
                      <span className="font-medium text-lg">
                        {formatCurrency(selectedAccount.account.total_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Days Outstanding:</span>
                      <span className="font-medium">{selectedAccount.account.days_outstanding}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Risk Level:</span>
                      {getRiskBadge(selectedAccount.account.collectability_score)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recommended Action:</span>
                      <span className="text-sm">{selectedAccount.account.recommended_action}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span>{selectedAccount.account.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{selectedAccount.account.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <div className="text-right text-sm">
                        <div>{selectedAccount.account.address}</div>
                        <div>{selectedAccount.account.city}, {selectedAccount.account.state} {selectedAccount.account.zip}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Outstanding Claims */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Outstanding Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service Date</TableHead>
                        <TableHead>Procedure</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAccount.claims.map((claim, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(claim.service_date)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{claim.procedure_code}</div>
                              <div className="text-sm text-muted-foreground">
                                {claim.procedure_description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(claim.amount)}</TableCell>
                          <TableCell>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {claim.status_text}
                            </Badge>
                          </TableCell>
                          <TableCell>{claim.age_days} days</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Payment Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedAccount.paymentOptions.map((option, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-2">{option.description}</h4>
                        <div className="text-2xl font-bold mb-2">
                          {formatCurrency(option.amount)}
                        </div>
                        <Button 
                          className="w-full" 
                          variant={index === 0 ? "default" : "outline"}
                          onClick={() => {
                            if (option.type === 'payment_plan') {
                              setPaymentPlanForm({
                                ...paymentPlanForm,
                                totalAmount: selectedAccount.account.total_balance,
                                monthlyPayment: option.amount
                              });
                              setShowPaymentPlanDialog(true);
                            }
                          }}
                        >
                          {option.type === 'payment_plan' ? 'Setup Plan' : 'Process Payment'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setFollowUpForm({
                      ...followUpForm,
                      scheduledDate: new Date().toISOString().split('T')[0]
                    });
                    setShowFollowUpDialog(true);
                  }}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button>
                  <Target className="h-4 w-4 mr-2" />
                  Take Action
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              Schedule automated follow-up for this account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Follow-up Type</label>
              <Select 
                value={followUpForm.followUpType} 
                onValueChange={(value) => setFollowUpForm({...followUpForm, followUpType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                  <SelectItem value="statement">Statement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Scheduled Date</label>
              <Input
                type="date"
                value={followUpForm.scheduledDate}
                onChange={(e) => setFollowUpForm({...followUpForm, scheduledDate: e.target.value})}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Message/Notes</label>
              <Textarea
                value={followUpForm.message}
                onChange={(e) => setFollowUpForm({...followUpForm, message: e.target.value})}
                placeholder="Enter follow-up message or notes..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleInitiateFollowUp}>
              Schedule Follow-up
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Plan Dialog */}
      <Dialog open={showPaymentPlanDialog} onOpenChange={setShowPaymentPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Payment Plan</DialogTitle>
            <DialogDescription>
              Create a payment plan for this account
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Total Amount</label>
                <Input
                  type="number"
                  value={paymentPlanForm.totalAmount}
                  onChange={(e) => setPaymentPlanForm({...paymentPlanForm, totalAmount: parseFloat(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Monthly Payment</label>
                <Input
                  type="number"
                  value={paymentPlanForm.monthlyPayment}
                  onChange={(e) => setPaymentPlanForm({...paymentPlanForm, monthlyPayment: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Number of Payments</label>
                <Select 
                  value={paymentPlanForm.numberOfPayments.toString()} 
                  onValueChange={(value) => setPaymentPlanForm({...paymentPlanForm, numberOfPayments: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={paymentPlanForm.startDate}
                  onChange={(e) => setPaymentPlanForm({...paymentPlanForm, startDate: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={paymentPlanForm.notes}
                onChange={(e) => setPaymentPlanForm({...paymentPlanForm, notes: e.target.value})}
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowPaymentPlanDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetupPaymentPlan}>
              Create Payment Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ARAgingManagement;