const connection = require('../../config/db');
const Joi = require('joi');

// Validation schemas
const billSchema = Joi.object({
    patient_id: Joi.number().integer().positive().required(),
    items: Joi.array().items(
        Joi.object({
            service_id: Joi.number().integer().positive().required(),
            quantity: Joi.number().integer().positive().default(1),
            unit_price: Joi.number().positive().required()
        })
    ).min(1).required(),
    notes: Joi.string().allow('', null),
    created_by: Joi.number().integer().positive()
});

const paymentSchema = Joi.object({
    invoice_id: Joi.number().integer().positive().required(),
    amount_paid: Joi.number().positive().required(),
    payment_method: Joi.string().valid('cash', 'card', 'check', 'bank_transfer', 'insurance', 'online').required(),
    transaction_id: Joi.string().allow('', null),
    reference_number: Joi.string().allow('', null),
    payment_gateway: Joi.string().valid('stripe', 'square', 'paypal', 'authorize_net', 'manual').default('manual'),
    gateway_transaction_id: Joi.string().allow('', null),
    notes: Joi.string().allow('', null),
    created_by: Joi.number().integer().positive()
});

class BillingService {
    // Validate bill data
    validateBillData(billData) {
        const { error, value } = billSchema.validate(billData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }
        return value;
    }

    // Validate payment data
    validatePaymentData(paymentData) {
        const { error, value } = paymentSchema.validate(paymentData);
        if (error) {
            throw new Error(`Validation error: ${error.details[0].message}`);
        }
        return value;
    }

    // Create a new bill draft
    async createBill(billData) {
        const validatedData = this.validateBillData(billData);
        const { patient_id, items, notes, created_by } = validatedData;

        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            // Calculate total amount
            let totalAmount = 0;
            for (const item of items) {
                totalAmount += (item.unit_price * item.quantity);
            }

            // Create the bill
            const [billResult] = await conn.query(
                'INSERT INTO bills (patient_id, notes, total_amount, created_by) VALUES (?, ?, ?, ?)',
                [patient_id, notes || null, totalAmount, created_by || null]
            );

            const billId = billResult.insertId;

            // Add bill items
            for (const item of items) {
                await conn.query(
                    'INSERT INTO bill_items (bill_id, service_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
                    [billId, item.service_id, item.quantity, item.unit_price]
                );
            }

            await conn.commit();
            return await this.getBillById(billId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Get bill by ID with items
    async getBillById(billId) {
        const [bills] = await connection.execute(`
      SELECT b.*, CONCAT(up.firstname, " ", up.lastname) as patient_name, up.work_email as patient_email
      FROM bills b
      JOIN user_profiles up ON b.patient_id = up.fk_userid
      WHERE b.id = ?
    `, [billId]);

        if (bills.length === 0) {
            throw new Error('Bill not found');
        }

        const [items] = await connection.execute(`
      SELECT bi.*, s.name as service_name, s.cpt_codes as service_code
      FROM bill_items bi
      JOIN services s ON bi.service_id = s.service_id
      WHERE bi.bill_id = ?
    `, [billId]);

        return {
            ...bills[0],
            items
        };
    }
    async getAllBills(limit, offset) {
        // Fetch bills
        const [bills] = await connection.execute(
            `
            SELECT 
                b.*,
                CASE b.status
                    WHEN 0 THEN 'pending'
                    WHEN 1 THEN 'approved'
                    WHEN 3 THEN 'partially_paid'
                    WHEN 4 THEN 'paid'
                    WHEN 5 THEN 'Denied/cancelled'
                    ELSE 'unknown'
                END AS status,
                CONCAT(up.firstname, " ", up.lastname) AS patient_name, 
                up.work_email AS patient_email,
                up.dob,
                up.city,
                up.state,
                up.country,
                up.zip,
                up.address_line,
                up.address_line_2,
                CONCAT(up2.firstname, " ", up2.lastname) AS physician_name
            FROM bills b
            JOIN user_profiles up ON b.patient_id = up.fk_userid
            LEFT JOIN users_mappings um ON b.patient_id = up.fk_userid
            JOIN user_profiles up2 ON um.fk_physician_id = up2.fk_userid
            GROUP BY b.id
            ORDER BY b.created_at DESC
            LIMIT ? OFFSET ?
            `,
            [limit, offset]
        );


        if (bills.length === 0) {
            return [];
        }

        // Attach bill items to each bill
        for (const bill of bills) {
            const [items] = await connection.execute(
                `
                SELECT bi.*, s.name AS service_name, s.cpt_codes AS service_code
                FROM bill_items bi
                JOIN services s ON bi.service_id = s.service_id
                WHERE bi.bill_id = ?
                `,
                [bill.id]
            );

            bill.items = items; // add items to bill
        }

        return bills;
    }

    // Update bill status
    async updateBillStatus(billId, status) {
        // Convert string status to numeric value
        let numericStatus = Number(status)

        const [result] = await connection.execute(`
            UPDATE bills 
            SET status = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `, [numericStatus, billId]);

        if (result.affectedRows === 0) {
            throw new Error('Bill not found');
        }

        return { success: true };
    }

    // Update bill items
    async updateBillItems(billId, items) {
        try {
            // Start transaction

            // Delete existing bill items
            await connection.execute(`
                DELETE FROM bill_items WHERE bill_id = ?
            `, [billId]);

            // Insert new bill items and calculate total
            let totalAmount = 0;
            for (const item of items) {
                const lineTotal = item.quantity * item.unit_price;
                totalAmount += lineTotal;

                await connection.execute(`
                    INSERT INTO bill_items (bill_id, service_id, quantity, unit_price)
                    VALUES (?, ?, ?, ?)
                `, [billId, item.service_id, item.quantity, item.unit_price]);
            }

            // Update bill total amount
            await connection.execute(`
                UPDATE bills 
                SET total_amount = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [totalAmount, billId]);


            console.log(`Bill ${billId} updated with ${items.length} items, total: $${totalAmount}`);
            // Return the updated bill data
            return {
                success: true,
                totalAmount,
                message: `Bill updated successfully. New total: $${totalAmount.toFixed(2)}`
            };
        } catch (error) {
            // Rollback transaction on error
            console.error('Error updating bill items:', error);
            throw error;
        }
    }

    // Generate invoice from bill
    async generateInvoice(billId, dueInDays = 30) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            // Get bill details
            const bill = await this.getBillById(billId);

            if (bill.status === 'finalized') {
                throw new Error('Bill is already finalized - invoice may already exist');
            }

            // Check if invoice already exists for this bill
            const [existingInvoice] = await conn.query(
                'SELECT id FROM invoices WHERE bill_id = ?',
                [billId]
            );

            if (existingInvoice.length > 0) {
                throw new Error('Invoice already exists for this bill');
            }

            // Generate invoice number
            const invoiceNumber = await this.generateInvoiceNumber();

            // Calculate due date
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + dueInDays);

            // Create invoice
            const [invoiceResult] = await conn.query(`
                INSERT INTO invoices (invoice_number, bill_id, patient_id, total_amount, due_date, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [invoiceNumber, billId, bill.patient_id, bill.total_amount, dueDate, bill.notes]);

            const invoiceId = invoiceResult.insertId;

            // Copy bill items to invoice items with service details snapshot
            for (const item of bill.items) {
                await conn.query(`
                    INSERT INTO invoice_items (invoice_id, service_id, service_name, service_code, quantity, unit_price)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [invoiceId, item.service_id, item.service_name, item.service_code, item.quantity, item.unit_price]);
            }

            // Mark bill as finalized
            await conn.query(
                'UPDATE bills SET status = "finalized" WHERE id = ?',
                [billId]
            );

            await conn.commit();
            return await this.getInvoiceById(invoiceId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Generate unique invoice number with proper sequence handling
    async generateInvoiceNumber() {
        const year = new Date().getFullYear();
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            // Get or create sequence for current year
            const [sequences] = await conn.query(
                'SELECT last_sequence FROM invoice_sequences WHERE year = ? FOR UPDATE',
                [year]
            );

            let nextSequence;
            if (sequences.length === 0) {
                // First invoice of the year
                nextSequence = 1;
                await conn.query(
                    'INSERT INTO invoice_sequences (year, last_sequence) VALUES (?, ?)',
                    [year, nextSequence]
                );
            } else {
                // Increment sequence
                nextSequence = sequences[0].last_sequence + 1;
                await conn.query(
                    'UPDATE invoice_sequences SET last_sequence = ? WHERE year = ?',
                    [nextSequence, year]
                );
            }

            await conn.commit();

            // Format: INV-2025-0001
            const paddedSequence = nextSequence.toString().padStart(4, '0');
            return `INV-${year}-${paddedSequence}`;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Get invoice by ID with items and payments
    async getInvoiceById(invoiceId) {
        const [invoices] = await connection.execute(`
      SELECT i.*, CONCAT(up.firstname, " ", up.lastname) as patient_name, up.work_email as patient_email, 
             up.phone as patient_phone, up.address as patient_address, up.insurance_provider, up.insurance_id
      FROM invoices i
      JOIN user_profiles up ON i.patient_id = up.fk_userid
      WHERE i.id = ?
    `, [invoiceId]);

        if (invoices.length === 0) {
            throw new Error('Invoice not found');
        }

        const [items] = await connection.execute(`
      SELECT * FROM invoice_items WHERE invoice_id = ?
    `, [invoiceId]);

        const [payments] = await connection.execute(`
      SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC
    `, [invoiceId]);

        return {
            ...invoices[0],
            items,
            payments
        };
    }

    // Record payment against an invoice
    async recordPayment(paymentData) {
        const validatedData = this.validatePaymentData(paymentData);
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            // Get current invoice with lock
            const [invoices] = await conn.query(
                'SELECT * FROM invoices WHERE id = ? FOR UPDATE',
                [validatedData.invoice_id]
            );

            if (invoices.length === 0) {
                throw new Error('Invoice not found');
            }

            const invoice = invoices[0];

            if (invoice.status === 'paid') {
                throw new Error('Invoice is already fully paid');
            }

            if (invoice.status === 'cancelled') {
                throw new Error('Cannot record payment for cancelled invoice');
            }

            // Check if payment amount exceeds remaining balance
            const remainingBalance = parseFloat(invoice.total_amount) - parseFloat(invoice.amount_paid);
            if (parseFloat(validatedData.amount_paid) > remainingBalance) {
                throw new Error(`Payment amount (${validatedData.amount_paid}) exceeds remaining balance (${remainingBalance.toFixed(2)})`);
            }

            // Record payment
            const [paymentResult] = await conn.query(`
                INSERT INTO payments (
                    invoice_id, amount_paid, payment_method, transaction_id, 
                    reference_number, payment_gateway, gateway_transaction_id, 
                    notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                validatedData.invoice_id,
                validatedData.amount_paid,
                validatedData.payment_method,
                validatedData.transaction_id,
                validatedData.reference_number,
                validatedData.payment_gateway,
                validatedData.gateway_transaction_id,
                validatedData.notes,
                validatedData.created_by
            ]);

            await conn.commit();

            // Return updated invoice (triggers will have updated the status automatically)
            return await this.getInvoiceById(validatedData.invoice_id);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Get all invoices with filters
    async getInvoices(filters = {}) {
        let query = `
      SELECT i.*, CONCAT(up.firstname, " ", up.lastname) as patient_name, up.work_email as patient_email
      FROM invoices i
      JOIN user_profiles up ON i.patient_id = up.fk_userid
      WHERE 1=1
    `;
        const params = [];

        if (filters.status) {
            query += ' AND i.status = ?';
            params.push(filters.status);
        }

        if (filters.patient_id) {
            query += ' AND i.patient_id = ?';
            params.push(filters.patient_id);
        }

        if (filters.from_date) {
            query += ' AND DATE(i.created_at) >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND DATE(i.created_at) <= ?';
            params.push(filters.to_date);
        }

        query += ' ORDER BY i.created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }

        const [invoices] = await connection.execute(query, params);
        return invoices;
    }

    // Get all services
    async getServices() {
        const [services] = await connection.execute(
            'SELECT service_id, name, description, cpt_codes, price, created_at FROM services ORDER BY name'
        );
        return services;
    }

    // Get all patients
    async getPatients() {
        const [patients] = await connection.execute(`
            SELECT CONCAT(up.firstname, " ", up.lastname) as patient_name, 
                   up.fk_userid as patient_id,
                   up.work_email as email,
                   up.phone,
                   up.dob as date_of_birth,
                   up.address
            FROM user_profiles up 
            LEFT JOIN users_mappings um ON um.user_id = up.fk_userid 
            WHERE um.fk_role_id = 7 
            ORDER BY up.firstname, up.lastname
        `);
        return patients;
    }

    // Update invoice status (with validation)
    async updateInvoiceStatus(invoiceId, status) {
        const validStatuses = ['pending', 'partially_paid', 'paid', 'overdue', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }

        // Don't allow status changes for paid invoices unless cancelling
        const [invoice] = await connection.execute(
            'SELECT status, amount_paid, total_amount FROM invoices WHERE id = ?',
            [invoiceId]
        );

        if (invoice.length === 0) {
            throw new Error('Invoice not found');
        }

        if (invoice[0].status === 'paid' && status !== 'cancelled') {
            throw new Error('Cannot change status of paid invoice');
        }

        await connection.execute(
            'UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, invoiceId]
        );

        return await this.getInvoiceById(invoiceId);
    }

    // Get payment history for an invoice
    async getPaymentHistory(invoiceId) {
        const [payments] = await connection.execute(`
            SELECT 
                p.*,
                CONCAT(up.firstname, ' ', up.lastname) as recorded_by_name
            FROM payments p
            LEFT JOIN user_profiles up ON p.created_by = up.fk_userid
            WHERE p.invoice_id = ?
            ORDER BY p.paid_at DESC
        `, [invoiceId]);

        return payments;
    }

    // Get aging report
    async getAgingReport(patientId = null) {
        let query = `
            SELECT 
                ar.*,
                CONCAT(up.firstname, ' ', up.lastname) as patient_name,
                up.work_email as patient_email,
                up.phone as patient_phone
            FROM aging_report ar
            JOIN user_profiles up ON ar.patient_id = up.fk_userid
        `;

        const params = [];
        if (patientId) {
            query += ' WHERE ar.patient_id = ?';
            params.push(patientId);
        }

        query += ' ORDER BY ar.total_outstanding DESC';

        const [results] = await connection.execute(query, params);
        return results;
    }

    // Get invoice summary with enhanced details
    async getInvoiceSummary(filters = {}) {
        let query = `
            SELECT 
                ins.*,
                CONCAT(up.firstname, ' ', up.lastname) as patient_name,
                up.work_email as patient_email,
                up.phone as patient_phone,
                b.created_by as bill_created_by,
                CONCAT(up2.firstname, ' ', up2.lastname) as bill_creator_name
            FROM invoice_summary ins
            JOIN user_profiles up ON ins.patient_id = up.fk_userid
            LEFT JOIN bills b ON ins.id = (SELECT invoice_id FROM invoices WHERE bill_id = b.id LIMIT 1)
            LEFT JOIN user_profiles up2 ON b.created_by = up2.fk_userid
            WHERE 1=1
        `;

        const params = [];

        if (filters.status) {
            query += ' AND ins.current_status = ?';
            params.push(filters.status);
        }

        if (filters.patient_id) {
            query += ' AND ins.patient_id = ?';
            params.push(filters.patient_id);
        }

        if (filters.overdue_only) {
            query += ' AND ins.current_status = "overdue"';
        }

        if (filters.from_date) {
            query += ' AND DATE(ins.created_at) >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND DATE(ins.created_at) <= ?';
            params.push(filters.to_date);
        }

        query += ' ORDER BY ins.created_at DESC';

        if (filters.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(filters.limit));
        }

        const [results] = await connection.execute(query, params);
        return results;
    }

    // Cancel invoice (only if not paid)
    async cancelInvoice(invoiceId, reason = null) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [invoice] = await conn.query(
                'SELECT status, amount_paid FROM invoices WHERE id = ? FOR UPDATE',
                [invoiceId]
            );

            if (invoice.length === 0) {
                throw new Error('Invoice not found');
            }

            if (invoice[0].status === 'paid') {
                throw new Error('Cannot cancel a paid invoice');
            }

            if (parseFloat(invoice[0].amount_paid) > 0) {
                throw new Error('Cannot cancel invoice with payments. Refund payments first.');
            }

            await conn.query(
                'UPDATE invoices SET status = "cancelled", notes = CONCAT(COALESCE(notes, ""), "\nCancelled: ", ?) WHERE id = ?',
                [reason || 'No reason provided', invoiceId]
            );

            await conn.commit();
            return await this.getInvoiceById(invoiceId);
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Void/refund payment
    async voidPayment(paymentId, reason = null) {
        const conn = await connection.getConnection();

        try {
            await conn.beginTransaction();

            const [payment] = await conn.query(
                'SELECT * FROM payments WHERE id = ? FOR UPDATE',
                [paymentId]
            );

            if (payment.length === 0) {
                throw new Error('Payment not found');
            }

            // Add note about void reason
            await conn.query(
                'UPDATE payments SET notes = CONCAT(COALESCE(notes, ""), "\nVOIDED: ", ?) WHERE id = ?',
                [reason || 'No reason provided', paymentId]
            );

            // Delete the payment (triggers will update invoice status)
            await conn.query('DELETE FROM payments WHERE id = ?', [paymentId]);

            await conn.commit();
            return { success: true, message: 'Payment voided successfully' };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
    // Get bill data for PDF generation (without creating invoice)
    async getBillForPDF(billId) {
        try {
            // Get bill with patient details
            const [bills] = await connection.execute(`
                SELECT 
                    b.*,
                     CASE b.status
        WHEN 0 THEN 'Pending'
        WHEN 1 THEN 'Approved'
        WHEN 3 THEN 'Partially Paid'
        WHEN 4 THEN 'Paid'
        WHEN 5 THEN 'Cancelled / Voided'
        ELSE 'Unknown'
    END AS status,
                    CONCAT(up.firstname, " ", up.lastname) AS patient_name,
                    up.work_email AS patient_email,
                    up.phone AS patient_phone,
                    CONCAT(up.address_line, 
                           CASE WHEN up.address_line_2 IS NOT NULL AND up.address_line_2 != '' 
                                THEN CONCAT(', ', up.address_line_2) 
                                ELSE '' 
                           END,
                           CASE WHEN up.city IS NOT NULL THEN CONCAT(', ', up.city) ELSE '' END,
                           CASE WHEN up.state IS NOT NULL THEN CONCAT(', ', up.state) ELSE '' END,
                           CASE WHEN up.zip IS NOT NULL THEN CONCAT(' ', up.zip) ELSE '' END
                    ) AS patient_address,
                    CONCAT(up2.firstname, " ", up2.lastname) AS physician_name
                FROM bills b
                JOIN user_profiles up ON b.patient_id = up.fk_userid
                LEFT JOIN users_mappings um ON b.patient_id = up.fk_userid
                LEFT JOIN user_profiles up2 ON um.fk_physician_id = up2.fk_userid
                WHERE b.id = ?
            `, [billId]);

            if (bills.length === 0) {
                throw new Error('Bill not found');
            }

            // Get bill items with service details
            const [items] = await connection.execute(`
                SELECT 
                    bi.*,
                    s.name AS service_name,
                    s.cpt_codes AS service_code,
                    (bi.quantity * bi.unit_price) AS line_total
                FROM bill_items bi
                JOIN services s ON bi.service_id = s.service_id
                WHERE bi.bill_id = ?
            `, [billId]);

            const bill = bills[0];

            // Generate a temporary invoice number for PDF
            const year = new Date().getFullYear();
            const tempInvoiceNumber = `INV-${year}-${billId.toString().padStart(4, '0')}`;

            // Calculate due date (30 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);

            return {
                invoice_number: tempInvoiceNumber,
                bill_id: bill.id,
                patient_name: bill.patient_name,
                patient_email: bill.patient_email,
                patient_phone: bill.patient_phone,
                patient_address: bill.patient_address,
                physician_name: bill.physician_name,
                issued_date: bill.created_at,
                due_date: dueDate.toISOString(),
                total_amount: parseFloat(bill.total_amount),
                amount_paid: 0, // Bills haven't been paid yet
                balance_due: parseFloat(bill.total_amount),
                status: bill.status,
                notes: bill.notes,
                items: items.map(item => ({
                    service_name: item.service_name,
                    service_code: item.service_code,
                    quantity: item.quantity,
                    unit_price: parseFloat(item.unit_price),
                    line_total: parseFloat(item.line_total)
                })),
                payments: [] // No payments for draft bills
            };
        } catch (error) {
            console.error("Error getting bill for PDF:", error);
            throw error;
        }
    }

    // Search patients
    async searchPatient(searchTerm, userId = null) {
        try {
            let query = `
        SELECT CONCAT(up.firstname, " ", up.lastname) as patient_name, 
               up.fk_userid as patient_id 
        FROM user_profiles up 
        LEFT JOIN users_mappings um ON um.user_id = up.fk_userid 
        WHERE um.fk_role_id = 7 
      `;

            const params = [];

            // Add physician filter if userId provided
            if (userId) {
                query += ' AND um.fk_physician_id = ?';
                params.push(userId);
            }

            // Add search term filter
            if (searchTerm) {
                query += ` AND (
          up.firstname LIKE ? OR 
          up.middlename LIKE ? OR 
          up.lastname LIKE ? OR 
          up.work_email LIKE ? OR 
          up.phone LIKE ? OR 
          up.dob LIKE ?
        )`;
                const searchPattern = `%${searchTerm}%`;
                params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
            }

            query += ' LIMIT 10';

            const [rows] = await connection.execute(query, params);
            return rows;
        } catch (error) {
            console.error("Error searching patient:", error);
            throw new Error("Error in search patient API");
        }
    }
}

module.exports = new BillingService();