import jsPDF from 'jspdf';

export interface EnhancedInvoiceData {
  invoice_number: string;
  bill_id: number;
  issued_date: string;
  due_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  notes?: string;

  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  patient_address?: string;

  logo_url?: string;
  organization_name_value?: string;
  address_value?: string;
  provider_phone?: string;
  email_value?: string;
  website_value?: string;
  fax_value?: string;

  physician_name?: string;
  physician_mail?: string;
  taxonomy?: string;
  npi?: string;

  items: Array<{
    service_name: string;
    service_code: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;

  payments?: Array<{
    amount_paid: number;
    payment_method: string;
    paid_at: string;
    reference_number?: string;
  }>;
}

class EnhancedPDFGenerator {
  private async loadImageAsBase64(url: string): Promise<{ base64: string; format: string }> {
    console.log('🖼️ Loading image:', url);
    
    // Handle base64 URLs directly
    if (url.startsWith('data:image/')) {
      const format = url.includes('png') ? 'PNG' : 'JPEG';
      return { base64: url, format };
    }

    // Try server-side proxy first
    try {
      const proxyUrl = `/api/v1/image/proxy-image?url=${encodeURIComponent(url)}`;
      console.log('📡 Trying server proxy:', proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Image loaded via proxy:', {
            format: result.data.format,
            size: `${Math.round(result.data.size / 1024)}KB`
          });
          
          return {
            base64: result.data.base64,
            format: result.data.format
          };
        }
      }
      
      throw new Error('Proxy not available');
      
    } catch (proxyError) {
      console.warn('📡 Proxy not available, using alternative method');
      
      // Alternative: Use a CORS proxy service
      try {
        const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        console.log('🌐 Using CORS proxy service:', corsProxyUrl);
        
        const response = await fetch(corsProxyUrl);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result as string;
            const format = url.toLowerCase().includes('.png') ? 'PNG' : 'JPEG';
            
            console.log('✅ Image loaded via CORS proxy');
            resolve({ base64, format });
          };
          reader.onerror = () => reject(new Error('Failed to convert blob to base64'));
          reader.readAsDataURL(blob);
        });
        
      } catch (corsError) {
        console.error('❌ All loading methods failed');
        throw new Error(`Image loading failed: ${corsError.message}`);
      }
    }
  }

  async downloadInvoicePDF(invoiceData: EnhancedInvoiceData): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let y = margin;

    // --- Logo + Provider Info
    let logoSpace = 0;
    if (invoiceData.logo_url) {
      try {
        const { base64, format } = await this.loadImageAsBase64(invoiceData.logo_url);
        doc.addImage(base64, format, margin, y, 40, 40);
        logoSpace = 50;
      } catch {
        logoSpace = 50;
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, y, 40, 40, 'F');
        doc.text('LOGO', margin + 10, y + 22);
      }
    }

    doc.setFont('helvetica', 'bold').setFontSize(14);
    doc.text(invoiceData.organization_name_value || 'Healthcare Provider', margin + logoSpace, y + 10);

    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(100);
    if (invoiceData.address_value) {
      invoiceData.address_value.split(',').forEach((line, i) => {
        doc.text(line.trim(), margin + logoSpace, y + 20 + i * 5);
      });
    }

    doc.setFontSize(12).setTextColor(0);
    doc.text(`Invoice #${invoiceData.invoice_number}`, pageWidth - margin, y + 10, { align: 'right' });
    y += 60;

    // --- Bill To + Invoice Meta
    doc.setFont('helvetica', 'bold').setFontSize(11).text('Bill To:', margin, y);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(0);
    doc.text(invoiceData.patient_name, margin, y + 8);
    if (invoiceData.patient_address) {
      invoiceData.patient_address.split(',').forEach((line, i) => {
        doc.text(line.trim(), margin, y + 16 + i * 5);
      });
    }

    const rightX = pageWidth - margin;
    doc.setFontSize(10).setTextColor(100);
    doc.text('Invoice Date:', rightX - 60, y);
    doc.text('Due Date:', rightX - 60, y + 8);
    doc.text('Status:', rightX - 60, y + 16);

    doc.setTextColor(0);
    doc.text(new Date(invoiceData.issued_date).toLocaleDateString(), rightX, y, { align: 'right' });
    doc.text(new Date(invoiceData.due_date).toLocaleDateString(), rightX, y + 8, { align: 'right' });
    doc.text(invoiceData.status, rightX, y + 16, { align: 'right' });

    y += 35;

    // --- Items Table
    const headerY = y;
    doc.setFillColor(60, 60, 60);
    doc.rect(margin, headerY, pageWidth - margin * 2, 10, 'F');
    doc.setTextColor(255).setFont('helvetica', 'bold').setFontSize(10);
    doc.text('Item & Description', margin + 5, headerY + 7);
    doc.text('Qty', pageWidth - 100, headerY + 7, { align: 'center' });
    doc.text('Rate', pageWidth - 60, headerY + 7, { align: 'center' });
    doc.text('Amount', pageWidth - margin, headerY + 7, { align: 'right' });

    y += 15;
    doc.setTextColor(0).setFont('helvetica', 'normal').setFontSize(10);
    invoiceData.items.forEach((item, i) => {
      const rowY = y + i * 8;
      doc.text(item.service_name, margin + 5, rowY);
      doc.text(String(item.quantity), pageWidth - 100, rowY, { align: 'center' });
      doc.text(item.unit_price.toFixed(2), pageWidth - 60, rowY, { align: 'center' });
      doc.text(item.line_total.toFixed(2), pageWidth - margin, rowY, { align: 'right' });
    });
    y += invoiceData.items.length * 8 + 10;

    // --- Totals
    const totalsX = pageWidth - margin;
    doc.setFontSize(10).setFont('helvetica', 'normal');
    const subtotal = invoiceData.items.reduce((s, it) => s + it.line_total, 0);
    doc.text('Subtotal:', totalsX - 60, y);
    doc.text(subtotal.toFixed(2), totalsX, y, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'bold').setFontSize(11);
    doc.text('Total:', totalsX - 60, y);
    doc.text(`$${invoiceData.total_amount.toFixed(2)}`, totalsX, y, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(200, 0, 0);
    doc.text('Paid:', totalsX - 60, y);
    doc.text(`(-) ${invoiceData.amount_paid.toFixed(2)}`, totalsX, y, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(0);
    doc.text('Balance Due:', totalsX - 60, y);
    doc.text(`$${invoiceData.balance_due.toFixed(2)}`, totalsX, y, { align: 'right' });

    y += 20;

    // --- Notes
    doc.setFontSize(10).setFont('helvetica', 'bold').text('Notes:', margin, y);
    doc.setFont('helvetica', 'normal').setTextColor(100);
    const notes = invoiceData.notes
      ? invoiceData.notes.split('\n')
      : ['Thank you for your business!', 'Please make checks payable to:', invoiceData.organization_name_value || 'Provider'];
    notes.forEach((line, i) => doc.text(line, margin, y + 8 + i * 5));

    // Save
    const fileSafeName = invoiceData.patient_name.replace(/[^a-z0-9]/gi, '_');
    doc.save(`Invoice_${invoiceData.invoice_number}_${fileSafeName}.pdf`);
  }
}

const enhancedPdfGenerator = new EnhancedPDFGenerator();
export default enhancedPdfGenerator;