import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Download, Mail, DollarSign, Calendar, User, FileText } from 'lucide-react';
import billingService from '@/services/billingService';
import { toast } from 'sonner';

interface Invoice {
  id: number;
  invoice_number: string;
  bill_id: number;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  status: 'pending' | 'paid' | 'discarded' | 'overdue';
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  due_date: string;
  created_at: string;
  items: Array<{
    id: number;
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  payments: Array<{
    id: number;
    amount_paid: number;
    payment_method: string;
    paid_at: string;
  }>;
}

interface InvoicesListProps {
  onViewInvoice?: (invoiceId: number) => void;
  onRecordPayment?: (invoiceId: number) => void;
  onDownloadInvoice?: (invoiceId: number) => void;
}

const InvoicesList: React.FC<InvoicesListProps> = ({ 
  onViewInvoice, 
  onRecordPayment, 
  onDownloadInvoice 
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      
      // Mock data for invoices (replace with actual API call)
      const mockInvoices: Invoice[] = [
        {
          id: 1,
          invoice_number: "INV-2024-0001",
          bill_id: 1,
          patient_id: 12,
          patient_name: "John Doe",
          patient_email: "john.doe@email.com",
          patient_phone: "555-0101",
          status: "pending",
          total_amount: 150.00,
          amount_paid: 0.00,
          amount_due: 150.00,
          due_date: "2024-02-15",
          created_at: new Date().toISOString(),
          items: [
            {
              id: 1,
              service_name: "Office Visit",
              service_code: "99213",
              quantity: 1,
              unit_price: 150.00,
              line_total: 150.00
            }
          ],
          payments: []
        },
        {
          id: 2,
          invoice_number: "INV-2024-0002",
          bill_id: 2,
          patient_id: 13,
          patient_name: "Jane Smith",
          patient_email: "jane.smith@email.com",
          patient_phone: "555-0102",
          status: "paid",
          total_amount: 275.00,
          amount_paid: 275.00,
          amount_due: 0.00,
          due_date: "2024-02-10",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          items: [
            {
              id: 2,
              service_name: "Consultation",
              service_code: "99214",
              quantity: 1,
              unit_price: 200.00,
              line_total: 200.00
            },
            {
              id: 3,
              service_name: "Lab Test",
              service_code: "80053",
              quantity: 1,
              unit_price: 75.00,
              line_total: 75.00
            }
          ],
          payments: [
            {
              id: 1,
              amount_paid: 275.00,
              payment_method: "card",
              paid_at: new Date(Date.now() - 43200000).toISOString()
            }
          ]
        }
      ];

      // Try to load from API, fallback to mock data
      try {
        const invoicesData = await billingService.getInvoices();
        setInvoices(invoicesData);
      } catch (apiError) {
        console.warn('API call failed, using mock data:', apiError);
        setInvoices(mockInvoices);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'discarded':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const toggleInvoiceExpansion = (invoiceId: number) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoices...</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Invoices Management</h2>
          <p className="text-gray-600">Track finalized invoices and payments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.amount_paid, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-600">Invoices will appear here when bills are finalized</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border rounded-lg overflow-hidden">
                  {/* Invoice Header */}
                  <div 
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleInvoiceExpansion(invoice.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{invoice.invoice_number}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {invoice.patient_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              Due: {formatDate(invoice.due_date)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(invoice.total_amount)}</p>
                          <p className="text-sm text-gray-600">
                            Paid: {formatCurrency(invoice.amount_paid)}
                          </p>
                          {invoice.amount_due > 0 && (
                            <p className="text-sm text-red-600">
                              Due: {formatCurrency(invoice.amount_due)}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {onViewInvoice && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewInvoice(invoice.id);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onDownloadInvoice && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDownloadInvoice(invoice.id);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {invoice.status === 'pending' && onRecordPayment && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRecordPayment(invoice.id);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Record Payment
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Items (Expandable) */}
                  {expandedInvoice === invoice.id && (
                    <div className="p-4 border-t">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Items */}
                        <div>
                          <h4 className="font-medium mb-3">Invoice Items</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead className="text-center">Qty</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {invoice.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.service_name}</TableCell>
                                  <TableCell className="text-gray-600">{item.service_code}</TableCell>
                                  <TableCell className="text-center">{item.quantity}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {formatCurrency(item.line_total)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Payments */}
                        <div>
                          <h4 className="font-medium mb-3">Payment History</h4>
                          {invoice.payments.length === 0 ? (
                            <p className="text-gray-500 text-sm">No payments recorded</p>
                          ) : (
                            <div className="space-y-2">
                              {invoice.payments.map((payment) => (
                                <div key={payment.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <div>
                                    <p className="font-medium">{formatCurrency(payment.amount_paid)}</p>
                                    <p className="text-sm text-gray-600">
                                      {payment.payment_method} • {formatDate(payment.paid_at)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicesList;