const connection = require('../server/config/db');

async function testInvoiceGeneration() {
    try {
        console.log('Testing invoice generation with payments...');

        // Get a bill with payments
        const [bills] = await connection.execute(`
            SELECT b.*, 
                   COALESCE(b.amount_paid, 0) as amount_paid,
                   (b.total_amount - COALESCE(b.amount_paid, 0)) as amount_due,
                   CONCAT(up.firstname, " ", up.lastname) as patient_name
            FROM bills b
            JOIN user_profiles up ON b.patient_id = up.fk_userid
            WHERE b.amount_paid > 0
            LIMIT 1
        `);

        if (bills.length === 0) {
            console.log('No bills with payments found. Creating a test scenario...');
            return;
        }

        const bill = bills[0];
        console.log('Found bill with payments:', {
            id: bill.id,
            patient_name: bill.patient_name,
            total_amount: bill.total_amount,
            amount_paid: bill.amount_paid,
            amount_due: bill.amount_due
        });

        // Check if invoice already exists
        const [existingInvoices] = await connection.execute(
            'SELECT id FROM invoices WHERE bill_id = ?',
            [bill.id]
        );

        if (existingInvoices.length > 0) {
            console.log('Invoice already exists for this bill:', existingInvoices[0].id);
            
            // Get the invoice details
            const [invoices] = await connection.execute(`
                SELECT i.*, 
                       COALESCE(i.amount_paid, 0) as invoice_amount_paid,
                       (i.total_amount - COALESCE(i.amount_paid, 0)) as invoice_balance_due
                FROM invoices i
                WHERE i.id = ?
            `, [existingInvoices[0].id]);

            console.log('Invoice details:', {
                id: invoices[0].id,
                invoice_number: invoices[0].invoice_number,
                total_amount: invoices[0].total_amount,
                amount_paid: invoices[0].invoice_amount_paid,
                balance_due: invoices[0].invoice_balance_due,
                status: invoices[0].status
            });

            // Check payments linked to this invoice
            const [payments] = await connection.execute(
                'SELECT * FROM payments WHERE invoice_id = ?',
                [existingInvoices[0].id]
            );

            console.log('Payments linked to invoice:', payments.length);
            payments.forEach(payment => {
                console.log('  Payment:', {
                    id: payment.id,
                    amount: payment.amount_paid || payment.amount,
                    method: payment.payment_method,
                    status: payment.status,
                    date: payment.payment_date || payment.paid_at
                });
            });

        } else {
            console.log('No invoice exists yet. This bill can be used to test invoice generation.');
        }

    } catch (error) {
        console.error('Error testing invoice generation:', error);
    } finally {
        process.exit(0);
    }
}

testInvoiceGeneration();