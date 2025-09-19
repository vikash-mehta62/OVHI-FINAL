import jsPDF from 'jspdf';

export interface InvoiceData {
    invoice_number: string;
    bill_id: number;
    patient_name: string;
    patient_email?: string;
    patient_phone?: string;
    patient_address?: string;
    insurance_provider?: string;
    insurance_id?: string;
    issued_date: string;
    due_date: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    notes?: string;
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

class PDFGenerator {
    downloadInvoicePDF(invoiceData: InvoiceData): void {
        const doc = new jsPDF();

        // Set up professional color palette
        const colors = {
            primary: '#2c2c2c',      // Dark charcoal/black
            secondary: '#6b7280',     // Medium gray
            accent: '#f5f5dc',        // Beige
            lightGray: '#f8f9fa',     // Light gray
            white: '#ffffff',         // White
            text: '#1f2937',          // Dark gray text
            lightText: '#6b7280'      // Light gray text
        };

        // Header with beige background
        doc.setFillColor(245, 245, 220); // Beige background
        doc.rect(0, 0, 210, 40, 'F');

        // Company name in dark charcoal
        doc.setTextColor(colors.primary);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('OVHI Healthcare', 20, 25);

        // Invoice title
        doc.setTextColor(colors.text);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 150, 60);

        // Invoice details
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.lightText);
        doc.text(`Invoice #: ${invoiceData.invoice_number}`, 150, 70);
        doc.text(`Date: ${new Date(invoiceData.issued_date).toLocaleDateString()}`, 150, 78);
        doc.text(`Due Date: ${new Date(invoiceData.due_date).toLocaleDateString()}`, 150, 86);

        // Status badge with gray background
        doc.setFillColor(107, 114, 128); // Medium gray
        doc.roundedRect(150, 92, 40, 8, 2, 2, 'F');
        doc.setTextColor(colors.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(invoiceData.status.toUpperCase(), 152, 98);

        // Patient Information
        doc.setTextColor(colors.text);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, 70);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        let yPos = 80;
        doc.text(invoiceData.patient_name, 20, yPos);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.lightText);

        if (invoiceData.patient_email) {
            yPos += 8;
            doc.text(invoiceData.patient_email, 20, yPos);
        }

        if (invoiceData.patient_phone) {
            yPos += 8;
            doc.text(invoiceData.patient_phone, 20, yPos);
        }

        if (invoiceData.patient_address) {
            yPos += 8;
            // Split long addresses into multiple lines
            const addressLines = this.splitText(invoiceData.patient_address, 40);
            addressLines.forEach(line => {
                doc.text(line, 20, yPos);
                yPos += 8;
            });
            yPos -= 8; // Adjust for the last increment
        }

        // Insurance Information
        if (invoiceData.insurance_provider) {
            yPos += 15;
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colors.text);
            doc.text('Insurance:', 20, yPos);
            yPos += 8;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(colors.lightText);
            doc.text(invoiceData.insurance_provider, 20, yPos);

            if (invoiceData.insurance_id) {
                yPos += 8;
                doc.text(`Policy #: ${invoiceData.insurance_id}`, 20, yPos);
            }
        }

        // Services table
        const tableStartY = Math.max(yPos + 20, 130);

        // Table header with dark gray background
        doc.setFillColor(44, 44, 44); // Dark charcoal
        doc.rect(20, tableStartY, 170, 10, 'F');

        doc.setTextColor(colors.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Service Description', 25, tableStartY + 7);
        doc.text('CPT Code', 105, tableStartY + 7);
        doc.text('Qty', 130, tableStartY + 7);
        doc.text('Unit Price', 145, tableStartY + 7);
        doc.text('Total', 170, tableStartY + 7);

        // Table rows
        doc.setTextColor(colors.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        let currentY = tableStartY + 15;

        invoiceData.items.forEach((item, index) => {
            // Alternate row colors - beige and white
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 245); // Very light beige
                doc.rect(20, currentY - 5, 170, 10, 'F');
            }

            // Truncate long service names
            const serviceName = item.service_name.length > 35 ?
                item.service_name.substring(0, 32) + '...' :
                item.service_name;

            doc.text(serviceName, 25, currentY);
            doc.setTextColor(colors.lightText);
            doc.text(item.service_code || '', 105, currentY);
            doc.text(item.quantity.toString(), 130, currentY);
            doc.text(`$${item.unit_price.toFixed(2)}`, 145, currentY);
            doc.setTextColor(colors.text);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${item.line_total.toFixed(2)}`, 170, currentY);
            doc.setFont('helvetica', 'normal');

            currentY += 12;
        });

        // Table border in medium gray
        doc.setDrawColor(156, 163, 175); // Medium gray
        doc.rect(20, tableStartY, 170, currentY - tableStartY);

        const finalY = currentY + 10;

        // Summary section with beige background
        const summaryX = 130;
        let summaryY = finalY;

        // Add beige background for summary section
        doc.setFillColor(245, 245, 220); // Beige
        doc.rect(summaryX - 5, summaryY - 5, 65, 40, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.lightText);

        // Calculate subtotal from items
        const subtotal = invoiceData.items.reduce((sum, item) => sum + item.line_total, 0);

        // Subtotal
        doc.text('Subtotal:', summaryX, summaryY);
        doc.setTextColor(colors.text);
        doc.text(`$${subtotal.toFixed(2)}`, summaryX + 40, summaryY);

        // Total
        summaryY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.lightText);
        doc.text('Total:', summaryX, summaryY);
        doc.setTextColor(colors.text);
        doc.text(`$${invoiceData.total_amount.toFixed(2)}`, summaryX + 40, summaryY);

        // Amount Paid
        if (invoiceData.amount_paid > 0) {
            summaryY += 8;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(colors.lightText);
            doc.text('Amount Paid:', summaryX, summaryY);
            doc.setTextColor(colors.text);
            doc.text(`$${invoiceData.amount_paid.toFixed(2)}`, summaryX + 40, summaryY);
        }

        // Balance Due
        summaryY += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(colors.primary); // Dark charcoal for emphasis
        doc.text('Balance Due:', summaryX, summaryY);
        doc.text(`$${invoiceData.balance_due.toFixed(2)}`, summaryX + 40, summaryY);

        // Footer with light gray background
        const footerY = 270;
        doc.setFillColor(248, 249, 250); // Light gray
        doc.rect(0, footerY - 10, 210, 30, 'F');

        doc.setTextColor(colors.lightText);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Thank you for choosing OVHI Healthcare!', 20, footerY);
        doc.text('For questions about this invoice, please contact our billing department.', 20, footerY + 8);

        // Payment instructions
        doc.text('Payment can be made online at ovhi.com/payments or by calling (555) 123-4567', 20, footerY + 16);

        // Generate filename
        const patientNameForFile = invoiceData.patient_name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Invoice_${invoiceData.invoice_number}_${patientNameForFile}.pdf`;

        // Save the PDF
        doc.save(filename);
    }



    private splitText(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) return [text];

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach(word => {
            if ((currentLine + word).length <= maxLength) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        });

        if (currentLine) lines.push(currentLine);
        return lines;
    }
}

const pdfGenerator = new PDFGenerator();
export default pdfGenerator;