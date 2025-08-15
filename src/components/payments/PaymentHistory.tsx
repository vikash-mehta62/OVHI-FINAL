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
import { Badge } from '@/components/ui/badge';
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
  Clock
} from 'lucide-react';
import { paymentAPI } from '@/services/operations/payments';

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
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentAPI.getPaymentHistory(filters);
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

  const handleRefund = async () => {
    if (!selectedPayment) return;

    try {
      const response = await paymentAPI.processRefund(selectedPayment.id, {
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
    fetchPayments();
  }, [filters]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Payment History</h2>
          <p className="text-muted-foreground">
            View and manage all payment transactions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

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
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                placeholder="From Date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value, page: 1 })}
                className="w-40"
              />
              <Input
                type="date"
                placeholder="To Date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value, page: 1 })}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

// Payment Details View Component
interface PaymentDetailsViewProps {
  payment: Payment;
}

const PaymentDetailsView: React.FC<PaymentDetailsViewProps> = ({ payment }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID:</span>
              <span className="font-mono text-sm">{payment.transaction_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Date:</span>
              <span className="font-medium">{formatDateTime(payment.payment_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-medium capitalize">{payment.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gateway:</span>
              <span className="font-medium">{payment.gateway_name}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{payment.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Patient ID:</span>
              <span className="font-medium">{payment.patient_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claim ID:</span>
              <span className="font-medium">{payment.billing_claim_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Procedure:</span>
              <span className="font-medium">{payment.procedure_code || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Financial Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Payment Amount:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(payment.amount)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Processing Fee:</span>
              <span className="text-lg font-semibold text-red-600">
                -{formatCurrency(payment.fee_amount)}
              </span>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Amount:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(payment.net_amount)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method:</span>
            <span className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</span>
          </div>
          {payment.card_brand && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Card Brand:</span>
              <span className="font-medium capitalize">{payment.card_brand}</span>
            </div>
          )}
          {payment.card_last_four && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Card Number:</span>
              <span className="font-mono">•••• •••• •••• {payment.card_last_four}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      {payment.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{payment.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentHistory;