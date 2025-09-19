import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  FileText, 
  Eye, 
  CreditCard, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react';
import billingService from '@/services/billingService';
import { toast } from 'sonner';
import BillDetailsDialog from './BillDetailsDialog';
import InvoicePDFGenerator from './InvoicePDFGenerator';

interface EnhancedBillingDashboardProps {
  onCreateNew?: () => void;
}

const EnhancedBillingDashboard: React.FC<EnhancedBillingDashboardProps> = ({ onCreateNew }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [agingReport, setAgingReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showBillDetails, setShowBillDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load bills, invoices, and aging report in parallel
      const [billsData, invoicesData] = await Promise.allSettled([
        billingService.getAllBills(),
        billingService.getInvoices({ limit: 50 })
      ]);

      if (billsData.status === 'fulfilled') {
        setBills(billsData.value);
      } else {
        console.warn('Failed to load bills:', billsData.reason);
        setBills([]);
      }

      if (invoicesData.status === 'fulfilled') {
        setInvoices(invoicesData.value);
      } else {
        console.warn('Failed to load invoices:', invoicesData.reason);
        setInvoices([]);
      }

      // Try to load aging report, but don't fail if it's not available
      try {
        const agingData = await billingService.getInvoices({ overdue_only: true });
        setAgingReport(agingData);
      } catch (error) {
        console.warn('Aging report not available:', error);
        setAgingReport([]);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (billId: number) => {
    try {
      const invoice = await billingService.generateInvoice(billId);
      toast.success(`Invoice ${invoice.invoice_number} generated successfully`);
      loadData(); // Refresh data
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    }
  };

  const handleViewBill = (bill: any) => {
    setSelectedBill(bill);
    setShowBillDetails(true);
  };

  const handleInvoiceGenerated = (invoice: any) => {
    toast.success(`Invoice ${invoice.invoice_number} generated and downloaded!`);
    loadData(); // Refresh data
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string, type: 'bill' | 'invoice' = 'bill') => {
    const statusConfig = {
      bill: {
        draft: { class: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
        finalized: { class: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
        cancelled: { class: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
      },
      invoice: {
        pending: { class: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
        partially_paid: { class: 'bg-orange-100 text-orange-800 border-orange-200', icon: DollarSign },
        paid: { class: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
        overdue: { class: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
        cancelled: { class: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle }
      }
    };

    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]] || 
                   { class: 'bg-gray-100 text-gray-800 border-gray-200', icon: Clock };
    
    const Icon = config.icon;

    return (
      <Badge className={`${config.class} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const calculateStats = () => {
    const totalBills = bills.length;
    const draftBills = bills.filter(b => b.status === 'draft').length;
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || 0), 0);
    const outstandingAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due || inv.total_amount), 0);

    return {
      totalBills,
      draftBills,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue,
      outstandingAmount
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Billing Dashboard</h1>
          <p className="text-gray-600">Manage bills, invoices, and payments with PDF generation</p>
        </div>
        {onCreateNew && (
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Bill
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalBills}</p>
                <p className="text-xs text-gray-500">{stats.draftBills} draft</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalInvoices}</p>
                <p className="text-xs text-gray-500">{stats.paidInvoices} paid</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
                <p className="text-xs text-gray-500">Collected</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstandingAmount)}</p>
                <p className="text-xs text-gray-500">{stats.overdueInvoices} overdue</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Bills and Invoices */}
      <Tabs defaultValue="bills" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bills">Bills ({bills.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* Bills Tab */}
        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle>Bills Management</CardTitle>
            </CardHeader>
            <CardContent>
              {bills.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
                  <p className="text-gray-600 mb-4">Get started by creating your first bill</p>
                  {onCreateNew && (
                    <Button onClick={onCreateNew}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Bill
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {bills.map((bill) => (
                    <div key={bill.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="font-semibold text-lg">Bill #{bill.id}</h3>
                            {getStatusBadge(bill.status, 'bill')}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Patient:</strong> {bill.patient_name}</p>
                            {bill.physician_name && (
                              <p><strong>Physician:</strong> {bill.physician_name}</p>
                            )}
                            <p><strong>Created:</strong> {formatDate(bill.created_at)}</p>
                            <p><strong>Items:</strong> {bill.items?.length || 0} service(s)</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600 mb-2">
                            {formatCurrency(bill.total_amount)}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewBill(bill)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {bill.status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleGenerateInvoice(bill.id)}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Invoice
                                </Button>
                                
                                <InvoicePDFGenerator
                                  billId={bill.id}
                                  billData={bill}
                                  onInvoiceGenerated={handleInvoiceGenerated}
                                  variant="default"
                                  size="sm"
                                  showText={false}
                                />
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bill Items Preview */}
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium mb-2">Services:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {bill.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between bg-gray-50 p-2 rounded">
                              <span>{item.service_name} ({item.service_code})</span>
                              <span className="font-medium">
                                {item.quantity} × {formatCurrency(item.unit_price)}
                              </span>
                            </div>
                          )) || (
                            <p className="text-gray-500 text-sm">No items found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoices Management</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                  <p className="text-gray-600">Invoices will appear here when you generate them from bills</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                            {getStatusBadge(invoice.status, 'invoice')}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>Patient:</strong> {invoice.patient_name}</p>
                            <p><strong>Due Date:</strong> {formatDate(invoice.due_date)}</p>
                            <p><strong>Amount Paid:</strong> {formatCurrency(invoice.amount_paid || 0)}</p>
                            <p><strong>Balance Due:</strong> {formatCurrency(invoice.balance_due || invoice.total_amount)}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue-600 mb-2">
                            {formatCurrency(invoice.total_amount)}
                          </p>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast.info('Invoice details view coming soon');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {(invoice.status === 'pending' || invoice.status === 'partially_paid') && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  toast.info('Payment recording coming soon');
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bill Details Dialog */}
      {showBillDetails && selectedBill && (
        <BillDetailsDialog
          bill={selectedBill}
          open={showBillDetails}
          onClose={() => {
            setShowBillDetails(false);
            setSelectedBill(null);
          }}
          onUpdate={loadData}
        />
      )}
    </div>
  );
};

export default EnhancedBillingDashboard;