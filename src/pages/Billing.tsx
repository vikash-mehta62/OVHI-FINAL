import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, DollarSign, FileText, Filter, Search, Receipt, Download, CreditCard } from 'lucide-react';
import CreateBillForm from '@/components/billing/CreateBillForm';
import PaymentDetailsDialog from '@/components/billing/PaymentDetailsDialog';
import RecordPaymentForm from '@/components/billing/RecordPaymentForm';
import BillDetailsDialog from '@/components/billing/BillDetailsDialog';
import billingService from '@/services/billingService';
import enhancedPdfGenerator from '@/utils/enhancedPdfGenerator';
import { toast } from 'sonner';
import { Bill, Payment } from '@/types/billing';

const Billing = () => {
  const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills');
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showCreateBill, setShowCreateBill] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState<number | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'bills') {
      filterBills();
    } else {
      filterPayments();
    }
  }, [bills, payments, statusFilter, searchTerm, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load bills from API
      try {
        const billsData = await billingService.getAllBills();
        setBills(billsData);
      } catch (error) {
        console.error('Failed to load bills from API:', error);
        toast.error('Failed to load bills');
        setBills([]);
      }

      // Load payments from API
      try {
        const paymentsData = await billingService.getPayments();
        setPayments(paymentsData);
      } catch (error) {
        console.error('Failed to load payments from API:', error);
        toast.error('Failed to load payments');
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const filterBills = () => {
    let filtered = bills;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => bill.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(bill =>
        bill.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.id.toString().includes(searchTerm)
      );
    }

    setFilteredBills(filtered);
  };

  const filterPayments = () => {
    let filtered = payments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toString().includes(searchTerm)
      );
    }

    setFilteredPayments(filtered);
  };

  const handleBillCreated = () => {
    setShowCreateBill(false);
    loadData();
    toast.success('Bill created successfully');
  };

  const handlePaymentRecorded = () => {
    setShowPaymentForm(false);
    loadData();
    toast.success('Payment recorded successfully');
  };

  const handleCreatePayment = async (billId: number) => {
    try {
      setSelectedBill(bills.find(b => b.id === billId) || null);
      setShowPaymentForm(true);
    } catch (error) {
      console.error('Error opening payment form:', error);
      toast.error('Failed to open payment form');
    }
  };

  const handleGenerateInvoicePDF = async (bill: Bill) => {
    try {
      setGeneratingPDF(bill.id);

      // Get bill data directly from database formatted for PDF
      const billPdfData = await billingService.getBillForPDF(bill.id);

      // Generate and download the PDF directly from bill data using enhanced generator
      await enhancedPdfGenerator.downloadInvoicePDF(billPdfData);

      toast.success(`PDF invoice for Bill #${bill.id} downloaded successfully!`);

      // No need to switch tabs or refresh data since we're not creating an invoice

    } catch (error: any) {
      console.error('Error generating PDF from bill:', error);
      toast.error(error.response?.data?.message || 'Failed to generate PDF invoice');
    } finally {
      setGeneratingPDF(null);
    }
  };



  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handleRefundPayment = async (paymentId: number) => {
    try {
      await billingService.refundPayment(paymentId);
      toast.success('Payment refunded successfully');
      loadData();
    } catch (error) {
      console.error('Error refunding payment:', error);
      toast.error('Failed to refund payment');
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

  const getTotalsByStatus = () => {
    if (activeTab === 'bills') {
      const draftTotal = bills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const partiallyPaidTotal = bills.filter(b => b.status === 'partially_paid').reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0);
      const paidTotal = bills.filter(b => b.status === 'paid').reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const overdueTotal = bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

      const pendingBillsTotal = draftTotal + partiallyPaidTotal; // Combine 'pending' and 'partially_paid' as 'pending'

      return {
        pending: pendingBillsTotal, // Combined total for 'pending' bills
        completed: paidTotal, // Map 'paid' to 'completed' for consistency
        failed: overdueTotal, // Map 'overdue' to 'failed' for consistency
        refunded: 0
      };
    } else {
      const totals = {
        pending: 0,
        completed: 0,
        failed: 0,
        refunded: 0
      };

      payments.forEach(payment => {
        if (totals.hasOwnProperty(payment.status)) {
          totals[payment.status as keyof typeof totals] += (Number(payment.amount) || 0);
        }
      });

      return totals;
    }
  };

  const totals = getTotalsByStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="text-gray-600">Manage patient billing and payment processing</p>
        </div>
        <Dialog open={showCreateBill} onOpenChange={setShowCreateBill}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Bill</DialogTitle>
            </DialogHeader>
            <CreateBillForm onSuccess={handleBillCreated} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'bills' | 'payments')}>
        <TabsList className="grid w-fit grid-cols-2">
          <TabsTrigger value="bills" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Bills (Drafts)
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
          {/* Bills Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Draft Bills</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.pending)}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <FileText className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ready to Invoice</p>
                    <p className="text-2xl font-bold text-blue-600">{bills.filter(b => b.status === 'pending').length}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Bills</p>
                    <p className="text-2xl font-bold text-gray-600">{bills.length}</p>
                  </div>
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-6 w-6 text-gray-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Bill Amount</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {bills.length > 0 ? formatCurrency(bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0) / bills.length) : '$0.00'}
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          {/* Payments Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.pending || 0)}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totals.completed || 0)}</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totals.failed || 0)}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <FileText className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold text-blue-600">{payments.length}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder={activeTab === 'bills' ? "Search by patient name or bill ID..." : "Search by patient name or transaction ID..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {activeTab === 'bills' ? (
                    <SelectItem value="draft">Draft</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      {activeTab === 'bills' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Billings</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Bill #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Paid</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Due</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Date</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm min-w-[200px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-4 font-medium text-gray-900">#{bill.id}</td>
                      <td className="py-4 px-4 text-gray-700">{bill.patient_name}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{formatCurrency(bill.total_amount)}</td>
                      <td className="py-4 px-4 font-medium text-green-600">{formatCurrency(bill.amount_paid || 0)}</td>
                      <td className="py-4 px-4 font-medium text-red-600">{formatCurrency(bill.amount_due || bill.total_amount)}</td>
                      <td className="py-4 px-4">
                        <Badge className="bg-yellow-100 text-yellow-800 font-medium px-2.5 py-1 rounded-full text-xs">
                          {bill.status ? bill.status.charAt(0).toUpperCase() + bill.status.slice(1) : 'Unknown'}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{formatDate(bill.created_at)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBill(bill);
                              setShowBillDetails(true);
                            }}
                            className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                            title="View Bill Details"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </Button>

                          {/* <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateInvoice(bill.id)}
                            className="h-8 px-3 border-green-300 text-green-700 hover:border-green-400 hover:bg-green-50"
                            title="Generate Invoice Only"
                          >
                            <Receipt className="h-3 w-3 mr-1" />
                            <span className="text-xs font-medium">Invoice</span>
                          </Button> */}

                          <div className="w-[130px] flex justify-center">
                            {bill.status?.toLowerCase() !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => handleCreatePayment(bill.id)}
                                className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm"
                                title="Create Payment"
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                <span className="text-xs font-medium">Add Payment</span>
                              </Button>
                            )}
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleGenerateInvoicePDF(bill)}
                            disabled={generatingPDF === bill.id}
                            className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate Invoice & Download PDF"
                          >
                            {generatingPDF === bill.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                <span className="text-xs font-medium">Generating...</span>
                              </>
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                <span className="text-xs font-medium">Download PDF</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBills.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No bills found</p>
                  <p className="text-sm text-gray-500">No bills match your current search criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Table */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Payments</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Payment #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Bill #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700 text-sm">Date</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 text-sm min-w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="py-4 px-4 font-medium text-blue-600">#{payment.id}</td>
                      <td className="py-4 px-4 text-gray-700">{payment.patient_name}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">#{payment.bill_id}</td>
                      <td className="py-4 px-4 font-medium text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="py-4 px-4 text-gray-700 capitalize">{payment.payment_method.replace('_', ' ')}</td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{payment.transaction_id || 'N/A'}</td>
                      <td className="py-4 px-4">
                        <Badge className={`${getPaymentStatusColor(payment.status)} font-medium px-2.5 py-1 rounded-full text-xs`}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">{formatDate(payment.payment_date)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowPaymentDetails(true);
                            }}
                            className="h-8 w-8 p-0 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                            title="View Payment Details"
                          >
                            <Eye className="h-4 w-4 text-gray-600" />
                          </Button>
                          {/* {payment.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRefundPayment(payment.id)}
                              className="h-8 px-3 border-red-300 text-red-700 hover:border-red-400 hover:bg-red-50"
                              title="Refund Payment"
                            >
                              <span className="text-xs font-medium">Refund</span>
                            </Button>
                          )} */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">No payments found</p>
                  <p className="text-sm text-gray-500">No payments match your current search criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Details Dialog */}
      <Dialog open={showPaymentDetails} onOpenChange={setShowPaymentDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <PaymentDetailsDialog payment={selectedPayment} />
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Form Dialog */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <RecordPaymentForm
              bill={selectedBill}
              onSuccess={handlePaymentRecorded}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bill Details Dialog */}
      <BillDetailsDialog
        bill={selectedBill}
        open={showBillDetails}
        onOpenChange={setShowBillDetails}
        onBillUpdated={loadData}
      />
    </div>
  );
};

export default Billing;