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
import { apiConnector } from '@/services/apiConnector';

interface Payment {
  id: number;
  patient_id: number;
  patient_name: string;
  claim_id?: number;
  procedure_code?: string;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  status: string;
  payment_method: string;
  payment_date: string;
  transaction_id?: string;
  card_last_four?: string;
  card_brand?: string;
  gateway_name?: string;
  description?: string;
  check_number?: string;
  reference_number?: string;
  adjustment_amount?: number;
  adjustment_reason?: string;
  posted_by?: number;
  created_at: string;
}

interface OfficePayment {
  id: number;
  patient_id: number;
  patient_name: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  check_number?: string;
  card_last_four?: string;
  card_brand?: string;
  cash_received?: number;
  change_given?: number;
  description?: string;
  status: string;
  created_at: string;
  reference_number?: string;
  payment_number?: string;
  claim_id?: number;
}

const PaymentHistory: React.FC = () => {
  const { token, user } = useSelector((state: any) => state.auth);
  const [activeTab, setActiveTab] = useState('office');

  // Debug token state
  console.log('PaymentHistory - Token:', token ? 'Present' : 'Missing');
  console.log('PaymentHistory - User:', user ? user.id : 'No user');

  // Office Payments State
  const [officePayments, setOfficePayments] = useState<OfficePayment[]>([]);
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

  // Online Payments State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState<string | null>(null);

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

  // API Functions
  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching online payments with token:', token ? 'Present' : 'Missing');

      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.payment_method !== 'all' && { payment_method: filters.payment_method })
      });

      const url = `http://localhost:8000/api/v1/payments/history?${queryParams}`;
      console.log('Fetching online payments from URL:', url);

      const response = await apiConnector(
        'GET',
        url,
        null,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      );

      console.log('Online payments response:', response);

      if (response?.data?.success) {
        const paymentsData = response.data.data || [];
        console.log('Online payments data:', paymentsData);
        setPayments(paymentsData);
        setPagination(response.data.pagination || { total: 0, totalPages: 0 });
      } else {
        console.log('Online payments API not successful, showing empty state');
        setPayments([]);
        setPagination({ total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error('Error fetching online payments:', error);
      setError(`Error fetching online payments: ${error.message}`);
      setPayments([]);
      setPagination({ total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Fetch office payments from RCM API
  const fetchOfficePayments = async () => {
    try {
      setOfficeLoading(true);
      setError(null);

      console.log('Fetching office payments with token:', token ? 'Present' : 'Missing');

      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.date_from && { date_from: filters.date_from }),
        ...(filters.date_to && { date_to: filters.date_to }),
        ...(filters.payment_method !== 'all' && { payment_method: filters.payment_method })
      });

      const url = `http://localhost:8000/api/v1/rcm/office-payments?${queryParams}`;
      console.log('Fetching from URL:', url);

      const response = await apiConnector(
        'GET',
        url,
        null,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      );

      console.log('Office payments response:', response);

      if (response?.data?.success) {
        // The API returns data in response.data.data.payments structure
        const paymentsData = response.data.data?.payments || response.data.payments || [];
        console.log('Office payments data:', paymentsData);

        // Transform the data to match our interface
        const transformedPayments = paymentsData.map(payment => ({
          id: payment.id,
          patient_id: payment.patient_id,
          patient_name: payment.patient_name || 'Unknown Patient',
          // Remove $ sign and parse amount
          amount: parseFloat((payment.payment_amount || payment.amount || '0').toString().replace('$', '')),
          payment_method: payment.payment_method || 'Electronic',
          payment_date: payment.payment_date,
          status: payment.status || payment.status_text || 'completed',
          check_number: payment.check_number,
          reference_number: payment.reference_number,
          created_at: payment.created_at,
          payment_number: payment.payment_number
        }));

        console.log('Transformed payments:', transformedPayments);
        setOfficePayments(transformedPayments);
        
        // Also set pagination if available
        if (response.data.data?.pagination) {
          setPagination(response.data.data.pagination);
        }
      } else {
        console.log('API response not successful:', response?.data?.message || 'Unknown error');
        setError(`Failed to load office payments: ${response?.data?.message || 'API error'}`);
        setOfficePayments([]);
      }
    } catch (error) {
      console.error('Error fetching office payments:', error);
      setError(`Error fetching office payments: ${error.message}`);
      setOfficePayments([]);
    } finally {
      setOfficeLoading(false);
    }
  };

  // Fetch ERA files
  const fetchERAFiles = async () => {
    try {
      setEraLoading(true);
      setError(null);

      console.log('Fetching ERA files with token:', token ? 'Present' : 'Missing');

      const response = await apiConnector(
        'GET',
        'http://localhost:8000/api/v1/payments/era/queue',
        null,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      );

      console.log('ERA files response:', response);

      if (response?.data?.success) {
        const eraData = response.data.data || [];
        console.log('ERA files data:', eraData);
        setEraFiles(eraData);
      } else {
        console.log('ERA API not successful:', response?.data?.message || 'Unknown error');
        setError(`Failed to load ERA files: ${response?.data?.message || 'API error'}`);
        setEraFiles([]);
      }
    } catch (error) {
      console.error('Error fetching ERA files:', error);
      setError(`Error fetching ERA files: ${error.message}`);
      setEraFiles([]);
    } finally {
      setEraLoading(false);
    }
  };

  // Record office payment
  const handleRecordOfficePayment = async () => {
    try {
      setRecordingPayment(true);
      setError(null);

      // Validate required fields
      if (!officePaymentForm.patient_id || !officePaymentForm.amount) {
        setError('Patient ID and amount are required');
        return;
      }

      const paymentData = {
        patient_id: parseInt(officePaymentForm.patient_id),
        claim_id: officePaymentForm.billing_id ? parseInt(officePaymentForm.billing_id) : null,
        payment_amount: parseFloat(officePaymentForm.amount),
        payment_method: officePaymentForm.payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        ...(officePaymentForm.card_last_four && { card_last_four: officePaymentForm.card_last_four }),
        ...(officePaymentForm.card_brand && { card_brand: officePaymentForm.card_brand }),
        ...(officePaymentForm.check_number && { check_number: officePaymentForm.check_number }),
        ...(officePaymentForm.description && { description: officePaymentForm.description }),
        status: 'completed'
      };

      console.log('Recording office payment:', paymentData);

      const response = await apiConnector(
        'POST',
        'http://localhost:8000/api/v1/rcm/payments/post',
        paymentData,
        {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      );

      console.log('Record payment response:', response);

      if (response?.data?.success) {
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
      } else {
        setError(`Failed to record payment: ${response?.data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error recording office payment:', error);
      setError(`Error recording payment: ${error.message}`);
    } finally {
      setRecordingPayment(false);
    }
  };

  // Process ERA file
  const handleProcessERA = async () => {
    try {
      setProcessingERA(true);
      setError(null);

      const response = await apiConnector(
        'POST',
        'http://localhost:8000/api/v1/payments/era/upload',
        eraUploadForm,
        { Authorization: `Bearer ${token}` }
      );

      if (response?.data?.success) {
        setShowERAUpload(false);
        setEraUploadForm({
          file_name: '',
          era_data: '',
          auto_post: true
        });
        fetchERAFiles();
      } else {
        setError('Failed to process ERA file');
      }
    } catch (error) {
      console.error('Error processing ERA:', error);
      setError('Error processing ERA file');
    } finally {
      setProcessingERA(false);
    }
  };

  // Get ERA details
  const handleViewERADetails = async (eraId: number) => {
    try {
      setError(null);
      const response = await apiConnector(
        'GET',
        `http://localhost:8000/api/v1/payments/era/${eraId}/details`,
        null,
        { Authorization: `Bearer ${token}` }
      );

      if (response?.data?.success) {
        setEraDetails(response.data.data);
        setSelectedERAFile(eraFiles.find(f => f.era_id === eraId));
      } else {
        // Sample ERA details
        setEraDetails({
          era_id: eraId,
          payments: [
            {
              claim_id: 'CLM-001',
              patient_name: 'John Doe',
              service_date: '2024-01-15',
              charged_amount: 150.00,
              paid_amount: 120.00,
              adjustment_amount: 30.00,
              adjustment_reason: 'Contractual adjustment'
            }
          ]
        });
        setSelectedERAFile(eraFiles.find(f => f.era_id === eraId));
      }
    } catch (error) {
      console.error('Error fetching ERA details:', error);
      setError('Error fetching ERA details');
    }
  };

  // Manual post ERA payment
  const handleManualPostERA = async (eraDetailId: number) => {
    try {
      setError(null);
      const response = await apiConnector(
        'POST',
        `http://localhost:8000/api/v1/payments/era/${eraDetailId}/post`,
        {},
        { Authorization: `Bearer ${token}` }
      );

      if (response?.data?.success && selectedERAFile) {
        handleViewERADetails(selectedERAFile.era_id);
      } else {
        setError('Failed to post ERA payment');
      }
    } catch (error) {
      console.error('Error posting ERA payment:', error);
      setError('Error posting ERA payment');
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

  // Show authentication message if no token
  if (!token) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground">
              Please log in to access payment management features.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertDescription className="text-blue-800">
            Debug: Token {token ? 'present' : 'missing'}, User: {user?.id || 'none'}
          </AlertDescription>
        </Alert>
      )}

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
                        onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, patient_id: e.target.value })}
                        placeholder="Patient ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="billing_id">Billing ID (Optional)</Label>
                      <Input
                        id="billing_id"
                        type="number"
                        value={officePaymentForm.billing_id}
                        onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, billing_id: e.target.value })}
                        placeholder="Billing ID"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        value={officePaymentForm.payment_method}
                        onValueChange={(value) => setOfficePaymentForm({ ...officePaymentForm, payment_method: value })}
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
                        onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, amount: e.target.value })}
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
                          onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, card_last_four: e.target.value })}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <Label htmlFor="card_brand">Card Brand</Label>
                        <Select
                          value={officePaymentForm.card_brand}
                          onValueChange={(value) => setOfficePaymentForm({ ...officePaymentForm, card_brand: value })}
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
                        onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, check_number: e.target.value })}
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
                          onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, cash_received: e.target.value })}
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
                          onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, change_given: e.target.value })}
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
                      onChange={(e) => setOfficePaymentForm({ ...officePaymentForm, description: e.target.value })}
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
                    {officePayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center">
                            <Banknote className="h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-500">No office payments found</p>
                            <p className="text-sm text-gray-400">Office payments will appear here when recorded</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      officePayments.map((payment) => (
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
                            {payment.reference_number && (
                              <div>Ref: {payment.reference_number}</div>
                            )}
                            {payment.check_number && (
                              <div>Check: {payment.check_number}</div>
                            )}
                            {payment.payment_number && (
                              <div className="text-gray-500">{payment.payment_number}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ERA Processing Tab */}
        <TabsContent value="era" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">ERA Processing</h3>
              <p className="text-sm text-muted-foreground">Electronic Remittance Advice processing and auto-posting</p>
            </div>
            <Dialog open={showERAUpload} onOpenChange={setShowERAUpload}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload ERA
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload ERA File</DialogTitle>
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
                      onChange={(e) => setEraUploadForm({ ...eraUploadForm, file_name: e.target.value })}
                      placeholder="ERA file name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="era_data">ERA Data</Label>
                    <textarea
                      id="era_data"
                      className="w-full h-32 p-2 border rounded-md"
                      value={eraUploadForm.era_data}
                      onChange={(e) => setEraUploadForm({ ...eraUploadForm, era_data: e.target.value })}
                      placeholder="Paste ERA data here..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto_post"
                      checked={eraUploadForm.auto_post}
                      onChange={(e) => setEraUploadForm({ ...eraUploadForm, auto_post: e.target.checked })}
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
                      <TableHead>ERA Number</TableHead>
                      <TableHead>Payer</TableHead>
                      <TableHead>Check Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Claims</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eraFiles.map((era) => (
                      <TableRow key={era.era_id}>
                        <TableCell>
                          <div className="font-medium">{era.era_number}</div>
                        </TableCell>
                        <TableCell>
                          <div>{era.payer_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(era.check_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(era.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{era.claims_count} claims</div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(era.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewERADetails(era.era_id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {era.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleManualPostERA(era.era_id)}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Online Payments Tab */}
        <TabsContent value="online" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Online Payments</h3>
              <p className="text-sm text-muted-foreground">Credit card and online payment transactions</p>
            </div>
          </div>

          {/* Online Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle>Online Payment Transactions</CardTitle>
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
                      {payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center">
                              <CreditCard className="h-12 w-12 text-gray-400 mb-4" />
                              <p className="text-gray-500">No online payments found</p>
                              <p className="text-sm text-gray-400">Online payments will appear here when processed</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{payment.patient_name || 'Unknown Patient'}</div>
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
                                {payment.fee_amount && payment.fee_amount > 0 && (
                                  <div className="text-sm text-red-600">
                                    Fee: {formatCurrency(payment.fee_amount)}
                                  </div>
                                )}
                                {payment.net_amount && (
                                  <div className="text-sm text-green-600">
                                    Net: {formatCurrency(payment.net_amount)}
                                  </div>
                                )}
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
                                {payment.transaction_id || 'N/A'}
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
                                        Transaction #{payment.transaction_id || payment.id}
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
                                      setShowRefundDialog(true);
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process a refund for payment #{selectedPayment?.transaction_id || selectedPayment?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund_amount">Refund Amount</Label>
              <Input
                id="refund_amount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder={`Max: ${selectedPayment?.amount || 0}`}
              />
            </div>
            <div>
              <Label htmlFor="refund_reason">Reason</Label>
              <Input
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRefundDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRefund}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Process Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentHistory;