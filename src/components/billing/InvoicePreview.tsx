import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, Mail } from 'lucide-react';
import { Invoice } from '@/services/billingService';

interface InvoicePreviewProps {
  invoice: Invoice;
}

const InvoicePreview: React.FC<InvoicePreviewProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'discarded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // This would integrate with a PDF generation service
    console.log('Download invoice as PDF');
  };

  const handleEmail = () => {
    // This would open email composer or send email
    console.log('Email invoice to patient');
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-2 justify-end print:hidden">
        <Button variant="outline" onClick={handleEmail}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      {/* Invoice Content */}
      <div className="bg-white p-8 rounded-lg border">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-600 mt-2">Healthcare Services</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{invoice.invoice_number}</div>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
            </Badge>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
            <div className="text-gray-600">
              <p className="font-medium">{invoice.patient_name}</p>
              <p>{invoice.patient_email}</p>
              {invoice.patient_phone && <p>{invoice.patient_phone}</p>}
              {invoice.patient_address && (
                <p className="whitespace-pre-line">{invoice.patient_address}</p>
              )}
            </div>
            {invoice.insurance_provider && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900">Insurance:</h4>
                <p className="text-gray-600">{invoice.insurance_provider}</p>
                {invoice.insurance_id && (
                  <p className="text-gray-600">ID: {invoice.insurance_id}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice Date:</span>
                <span className="font-medium">{formatDate(invoice.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span className="font-medium">{formatDate(invoice.due_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Patient ID:</span>
                <span className="font-medium">{invoice.patient_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Services</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-2 px-4">Service</th>
                  <th className="text-left py-2 px-4">Code</th>
                  <th className="text-right py-2 px-4">Qty</th>
                  <th className="text-right py-2 px-4">Unit Price</th>
                  <th className="text-right py-2 px-4">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium">{item.service_name}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{item.service_code}</td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="space-y-2">
              <div className="flex justify-between text-lg">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {invoice.amount_paid > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    <span>-{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Amount Due:</span>
                    <span className={invoice.amount_due > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(invoice.amount_due)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Method</th>
                    <th className="text-left py-2 px-4">Reference</th>
                    <th className="text-right py-2 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100">
                      <td className="py-2 px-4">{formatDate(payment.paid_at)}</td>
                      <td className="py-2 px-4 capitalize">{payment.payment_method.replace('_', ' ')}</td>
                      <td className="py-2 px-4">{payment.transaction_id || payment.reference_number || '-'}</td>
                      <td className="py-2 px-4 text-right font-medium text-green-600">
                        {formatCurrency(payment.amount_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-gray-500 text-sm">
          <p>Thank you for choosing our healthcare services.</p>
          <p>For questions about this invoice, please contact our billing department.</p>
        </div>
      </div>
    </div>
  );
};

export default InvoicePreview;