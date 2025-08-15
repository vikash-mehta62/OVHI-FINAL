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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  CreditCard,
  RefreshCw,
  Download,
  Eye,
  RotateCcw,
  Calendar,
  DollarSign,
  User,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Upload,
  Zap,
  Plus,
  Banknote,
  Building
} from 'lucide-react';
import { paymentAPI } from '@/services/operations/payments';
import { 
  getOfficePaymentsAPI, 
  recordOfficePaymentAPI,
  getERAFilesAPI,
  processERAFileAPI,
  getERAPaymentDetailsAPI,
  manualPostERAPaymentAPI
} from '@/services/operations/rcm';

interface Payment {
  id: number;
  patient_id: number;
  patient_name: string;
  billing_claim_id: number;
  procedure_code: string;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  payment_method: string;
  payment_date: string;
  transaction_id: string;
  card_last_four: string;
  card_brand: string;
  gateway_name: string;
  description: string;
}

const PaymentHistory: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [activeTab, setActiveTab] = useState('office');
  
  // Office Payments State
  const [officePayments, setOfficePayments] = useState<Payment[]>([]);
  const [officeLoading, setOfficeLoading] = useState(true);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  
  // ERA State
  const [eraFiles, setEraFiles] = useState<any[]>([]);
  const [eraLoading, setEraLoading] = useState(true);
  const [showERAUpload, setShowERAUpload] = useState(false);
  const [processingERA, setProcessingERA] = useState(false);
  const [selectedERAFile, setSelectedERAFile] = useState<any>(null);
  const [eraDetails, setEraDetails] = useState<any>(null);
  
  // Online Payments State (existing)
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    date_from: '',
    date_to: '',
    payment_method: 'all',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  // Office Payment Form
  const [officePaymentForm, setOfficePaymentForm] = useState({
    patient_id: '',
    billing_id: '',
    payment_method: 'cash',
    amount: '',
    card_last_four: '',
    card_brand: '',
    check_number: '',
    cash_received: '',
    change_given: '',
    description: ''
  });

  // ERA Upload Form
  const [eraUploadForm, setEraUploadForm] = useState({
    file_name: '',
    era_data: '',
    auto_post: true
  });

  // Fetch online payments
  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentHistory(token, filters);
      if (response.success) {
        setPayments(response.data);
        setPagination(response.pagination);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch office payments
  const fetchOfficePayments = async () => {
    try {
      setOfficeLoading(true);
      const response = await getOfficePaymentsAPI(token, filters);
      if (response.success) {
        setOfficePayments(response.data);
      }
    } catch (error) {
      console.error('Error fetching office payments:', error);
    } finally {
      setOfficeLoading(false);
    }
  };

  // Fetch ERA files
  const fetchERAFiles = async () => {
    try {
      setEraLoading(true);
      const response = await getERAFilesAPI(token, { page: 1, limit: 20 });
      if (response.success) {
        setEraFiles(response.data);
      }
    } catch (error) {
      console.error('Error fetching ERA files:', error);
    } finally {
      setEraLoading(false);
    }
  };

  // Record office payment
  const handleRecordOfficePayment = async () => {
    try {
      setRecordingPayment(true);
      const response = await recordOfficePaymentAPI(token, officePaymentForm);
      if (response.success) {
        setShowRecordPayment(false);
        setOfficePaymentForm({
          patient_id: '',
          billing_id: '',
          payment_method: 'cash',
          amount: '',
          card_last_four: '',
          card_brand: '',
          check_number: '',
          cash_received: '',
          change_given: '',
          description: ''
        });
        fetchOfficePayments();
      }
    } catch (error) {
      console.error('Error recording office payment:', error);
    } finally {
      setRecordingPayment(false);
    }
  };

  // Process ERA file
  const handleProcessERA = async () => {
    try {
      setProcessingERA(true);
      const response = await processERAFileAPI(token, eraUploadForm);
      if (response.success) {
        setShowERAUpload(false);
        setEraUploadForm({
          file_name: '',
          era_data: '',
          auto_post: true
        });
        fetchERAFiles();
      }
    } catch (error) {
      console.error('Error processing ERA:', error);
    } finally {
      setProcessingERA(false);
    }
  };

  // Get ERA details
  const handleViewERADetails = async (eraId: number) => {
    try {
      const response = await getERAPaymentDetailsAPI(token, eraId);
      if (response.success) {
        setEraDetails(response.data);
        setSelectedERAFile(eraFiles.find(f => f.era_id === eraId));
      }
    } catch (error) {
      console.error('Error fetching ERA details:', error);
    }
  };

  // Manual post ERA payment
  const handleManualPostERA = async (eraDetailId: number) => {
    try {
      const response = await manualPostERAPaymentAPI(token, eraDetailId);
      if (response.success && selectedERAFile) {
        handleViewERADetails(selectedERAFile.era_id);
      }
    } catch (error) {
      console.error('Error posting ERA payment:', error);
    }
  };

  const handleRefund = async () => {
    if (!selectedPayment) return;

    try {
      const response = await paymentAPI.processRefund(token, selectedPayment.id, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason
      });

      if (response.success) {
        setShowRefundDialog(false);
        setRefundAmount('');
        setRefundReason('');
        setSelectedPayment(null);
        fetchPayments(); // Refresh the list
      }
    } catch (error) {
      console.error('Error processing refund:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'online') {
      fetchPayments();
    } else if (activeTab === 'office') {
      fetchOfficePayments();
    } else if (activeTab === 'era') {
      fetchERAFiles();
    }
  }, [activeTab, filters]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      completed: { color: 'bg-green-500', icon: CheckCircle, text: 'Completed' },
      failed: { color: 'bg-red-500', icon: XCircle, text: 'Failed' },
      refunded: { color: 'bg-gray-500', icon: RotateCcw, text: 'Refunded' },
      cancelled: { color: 'bg-gray-400', icon: XCircle, text: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.text}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string, brand?: string) => {
    if (method === 'credit_card' || method === 'debit_card') {
      return (
        <div className="flex items-center">
          <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
          <span className="capitalize">{brand || method.replace('_', ' ')}</span>
        </div>
      );
    }
    return <span className="capitalize">{method.replace('_', ' ')}</span>;
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // PaymentDetailsView component
  const PaymentDetailsView: React.FC<{ payment: Payment }> = ({ payment }) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Patient</label>
            <p className="font-medium">{payment.patient_name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Amount</label>
            <p className="font-medium">{formatCurrency(payment.amount)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <p className="font-medium capitalize">{payment.status}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Date</label>
            <p className="font-medium">{formatDate(payment.payment_date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Method</label>
            <p className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
            <p className="font-mono text-sm">{payment.transaction_id}</p>
          </div>
        </div>
        {payment.description && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Description</label>
            <p className="text-sm">{payment.description}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment Management</h2>
          <p className="text-muted-foreground">
            Manage office payments, ERA processing, and online transactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (activeTab === 'office') fetchOfficePayments();
            else if (activeTab === 'era') fetchERAFiles();
            else fetchPayments();
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="office" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Office Payments
          </TabsTrigger>
          <TabsTrigger value="era" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            ERA Processing
          </TabsTrigger>
          <TabsTrigger value="online" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Online Payments
          </TabsTrigger>
        </TabsList>

        {/* Office Payments Tab */}
        <TabsContent value="office" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Office Payments</h3>
              <p className="text-sm text-muted-foreground">Cash, card, and check payments received at the office</p>
            </div>
            <Dialog open={showRecordPayment} onOpenChange={setShowRecordPayment}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Office Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment received at the office
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patient_id">Patient ID</Label>
                      <Input
                        id="patient_id"
                        type="number"
                        value={officePaymentForm.patient_id}
                        onChange={(e) => setOfficePaymentForm({...officePaymentForm, patient_id: e.target.value})}
                        placeholder="Patient ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing_id">Billing ID (Optional)</Label>
                      <Input
                        id="billing_id"
                        type="number"
                        value={officePaymentForm.billing_id}
                        onChange={(e) => setOfficePaymentForm({...officePaymentForm, billing_id: e.target.value})}
                        placeholder="Billing ID"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select 
                        value={officePaymentForm.payment_method} 
                        onValueChange={(value) => setOfficePaymentForm({...officePaymentForm, payment_method: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={officePaymentForm.amount}
                        onChange={(e) => setOfficePaymentForm({...officePaymentForm, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {officePaymentForm.payment_method === 'credit_card' || officePaymentForm.payment_method === 'debit_card' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="card_last_four">Last 4 Digits</Label>
                        <Input
                          id="card_last_four"
                          value={officePaymentForm.card_last_four}
                          onChange={(e) => setOfficePaymentForm({...officePaymentForm, card_last_four: e.target.value})}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="card_brand">Card Brand</Label>
                        <Select 
                          value={officePaymentForm.card_brand} 
                          onValueChange={(value) => setOfficePaymentForm({...officePaymentForm, card_brand: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="visa">Visa</SelectItem>
                            <SelectItem value="mastercard">MasterCard</SelectItem>
                            <SelectItem value="amex">American Express</SelectItem>
                            <SelectItem value="discover">Discover</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {officePaymentForm.payment_method === 'check' ? (
                    <div>
                      <Label htmlFor="check_number">Check Number</Label>
                      <Input
                        id="check_number"
                        value={officePaymentForm.check_number}
                        onChange={(e) => setOfficePaymentForm({...officePaymentForm, check_number: e.target.value})}
                        placeholder="Check number"
                      />
                    </div>
                  ) : null}

                  {officePaymentForm.payment_method === 'cash' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cash_received">Cash Received</Label>
                        <Input
                          id="cash_received"
                          type="number"
                          step="0.01"
                          value={officePaymentForm.cash_received}
                          onChange={(e) => setOfficePaymentForm({...officePaymentForm, cash_received: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="change_given">Change Given</Label>
                        <Input
                          id="change_given"
                          type="number"
                          step="0.01"
                          value={officePaymentForm.change_given}
                          onChange={(e) => setOfficePaymentForm({...officePaymentForm, change_given: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={officePaymentForm.description}
                      onChange={(e) => setOfficePaymentForm({...officePaymentForm, description: e.target.value})}
                      placeholder="Payment description"
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowRecordPayment(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleRecordOfficePayment} disabled={recordingPayment}>
                      {recordingPayment ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Receipt className="h-4 w-4 mr-2" />
                          Record Payment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Office Payments Table */}
          <Card>
            <CardContent className="p-6">
              {officeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading office payments...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {officePayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(payment.payment_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.patient_name}</div>
                            <div className="text-sm text-gray-600">ID: {payment.patient_id}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {payment.payment_method === 'cash' ? <Banknote className="h-4 w-4 mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                            <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {payment.card_last_four && `•••• ${payment.card_last_four}`}
                            {payment.check_number && `Check #${payment.check_number}`}
                            {payment.cash_received && `Cash: ${formatCurrency(payment.cash_received)}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Transactions</CardTitle>
          <CardDescription>
            {pagination.total} total payments found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading payments...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.patient_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {payment.procedure_code && `${payment.procedure_code} - `}
                            ID: {payment.patient_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(payment.payment_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{formatCurrency(payment.amount)}</div>
                          {payment.fee_amount > 0 && (
                            <div className="text-sm text-red-600">
                              Fee: {formatCurrency(payment.fee_amount)}
                            </div>
                          )}
                          <div className="text-sm text-green-600">
                            Net: {formatCurrency(payment.net_amount)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {getPaymentMethodIcon(payment.payment_method, payment.card_brand)}
                          {payment.card_last_four && (
                            <div className="text-sm text-muted-foreground">
                              •••• {payment.card_last_four}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(payment.status)}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {payment.transaction_id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedPayment(payment)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Payment Details</DialogTitle>
                                <DialogDescription>
                                  Transaction #{payment.transaction_id}
                                </DialogDescription>
                              </DialogHeader>
                              {selectedPayment && (
                                <PaymentDetailsView payment={selectedPayment} />
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {payment.status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setRefundAmount(payment.amount.toString());
                                setShowRefundDialog(true);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, pagination.total)} of {pagination.total} payments
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === 1}
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {filters.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.page === pagination.totalPages}
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process refund for payment #{selectedPayment?.transaction_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Refund Amount</label>
              <Input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <div className="text-sm text-muted-foreground mt-1">
                Maximum: {selectedPayment ? formatCurrency(selectedPayment.amount) : '$0.00'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Refund Reason</label>
              <Input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Enter reason for refund"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRefundDialog(false);
                  setRefundAmount('');
                  setRefundReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRefund}
                disabled={!refundAmount || !refundReason}
              >
                Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

        {/* ERA Processing Tab */}
        <TabsContent value="era" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">ERA Processing</h3>
              <p className="text-sm text-muted-foreground">Electronic Remittance Advice files and auto-posting</p>
            </div>
            <Dialog open={showERAUpload} onOpenChange={setShowERAUpload}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload ERA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process ERA File</DialogTitle>
                  <DialogDescription>
                    Upload and process Electronic Remittance Advice file
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file_name">File Name</Label>
                    <Input
                      id="file_name"
                      value={eraUploadForm.file_name}
                      onChange={(e) => setEraUploadForm({...eraUploadForm, file_name: e.target.value})}
                      placeholder="ERA_20241215.txt"
                    />
                  </div>
                  <div>
                    <Label htmlFor="era_data">ERA Data</Label>
                    <textarea
                      id="era_data"
                      className="w-full h-32 p-2 border rounded"
                      value={eraUploadForm.era_data}
                      onChange={(e) => setEraUploadForm({...eraUploadForm, era_data: e.target.value})}
                      placeholder="Paste ERA file content here..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_post"
                      checked={eraUploadForm.auto_post}
                      onChange={(e) => setEraUploadForm({...eraUploadForm, auto_post: e.target.checked})}
                    />
                    <Label htmlFor="auto_post">Auto-post payments</Label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowERAUpload(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleProcessERA} disabled={processingERA}>
                      {processingERA ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Process ERA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ERA Files Table */}
          <Card>
            <CardContent className="p-6">
              {eraLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading ERA files...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Processed Date</TableHead>
                      <TableHead>Total Payments</TableHead>
                      <TableHead>Auto-Posted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eraFiles.map((era) => (
                      <TableRow key={era.era_id}>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-400" />
                            {era.file_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(era.processed_date)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatCurrency(era.total_payments)}</div>
                            <div className="text-sm text-gray-600">{era.payment_count} payments</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-green-600">{era.auto_posted_count}</div>
                            <div className="text-sm text-yellow-600">{era.pending_count} pending</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={era.status === 'processed' ? 'bg-green-500' : 'bg-yellow-500'}>
                            {era.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewERADetails(era.era_id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Payments Tab (existing functionality) */}
        <TabsContent value="online" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by patient name, transaction ID..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Online Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Online Payment Transactions</CardTitle>
              <CardDescription>
                Credit card and online payments processed through payment gateways
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading payments...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="font-medium">{payment.patient_name}</div>
                        </TableCell>
                        <TableCell>
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodIcon(payment.payment_method, payment.card_brand)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
};

export default PaymentHistory;