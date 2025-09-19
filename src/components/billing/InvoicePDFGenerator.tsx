import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Eye, 
  FileText, 
  Loader2 
} from 'lucide-react';
import billingService from '@/services/billingService';
import pdfGenerator, { InvoiceData } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface InvoicePDFGeneratorProps {
  billId: number;
  billData?: any;
  onInvoiceGenerated?: (invoice: any) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showText?: boolean;
}

const InvoicePDFGenerator: React.FC<InvoicePDFGeneratorProps> = ({
  billId,
  billData,
  onInvoiceGenerated,
  variant = 'default',
  size = 'sm',
  showText = true
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const convertToInvoiceData = (invoice: any): InvoiceData => {
    return {
      invoice_number: invoice.invoice_number,
      bill_id: invoice.bill_id,
      patient_name: invoice.patient_name,
      patient_email: invoice.patient_email,
      patient_phone: invoice.patient_phone,
      patient_address: invoice.patient_address,
      insurance_provider: invoice.insurance_provider,
      insurance_id: invoice.insurance_id,
      issued_date: invoice.issued_date || invoice.created_at,
      due_date: invoice.due_date,
      total_amount: parseFloat(invoice.total_amount),
      amount_paid: parseFloat(invoice.amount_paid || 0),
      balance_due: parseFloat(invoice.balance_due || invoice.total_amount),
      status: invoice.status,
      notes: invoice.notes,
      items: invoice.items.map((item: any) => ({
        service_name: item.service_name,
        service_code: item.service_code,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.line_total || item.quantity * item.unit_price)
      })),
      payments: invoice.payments?.map((payment: any) => ({
        amount_paid: parseFloat(payment.amount_paid),
        payment_method: payment.payment_method,
        paid_at: payment.paid_at,
        reference_number: payment.reference_number
      })) || []
    };
  };

  const handleGenerateAndDownload = async () => {
    try {
      setIsGenerating(true);
      
      // Generate invoice from bill
      const invoice = await billingService.generateAndDownloadInvoicePDF(billId);
      
      // Convert to PDF format
      const invoiceData = convertToInvoiceData(invoice);
      
      // Generate and download PDF
      setIsDownloading(true);
      pdfGenerator.downloadInvoicePDF(invoiceData);
      
      toast.success(`Invoice ${invoice.invoice_number} generated and downloaded successfully!`);
      
      // Notify parent component
      onInvoiceGenerated?.(invoice);
      
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice PDF');
    } finally {
      setIsGenerating(false);
      setIsDownloading(false);
    }
  };

  const handlePreviewPDF = async () => {
    try {
      setIsGenerating(true);
      
      // Generate invoice from bill
      const invoice = await billingService.generateAndDownloadInvoicePDF(billId);
      
      // Convert to PDF format
      const invoiceData = convertToInvoiceData(invoice);
      
      // Preview PDF in new tab
      pdfGenerator.previewInvoicePDF(invoiceData);
      
      toast.success(`Invoice ${invoice.invoice_number} generated successfully!`);
      
      // Notify parent component
      onInvoiceGenerated?.(invoice);
      
    } catch (error: any) {
      console.error('Error generating invoice PDF:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const isLoading = isGenerating || isDownloading;

  return (
    <div className="flex gap-2">
      {/* Generate and Download Button */}
      <Button
        variant={variant}
        size={size}
        onClick={handleGenerateAndDownload}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {showText && (
          <span>
            {isGenerating ? 'Generating...' : isDownloading ? 'Downloading...' : 'Generate PDF'}
          </span>
        )}
      </Button>

      {/* Preview Button */}
      <Button
        variant="outline"
        size={size}
        onClick={handlePreviewPDF}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Eye className="h-4 w-4" />
        {showText && <span>Preview</span>}
      </Button>
    </div>
  );
};

export default InvoicePDFGenerator;