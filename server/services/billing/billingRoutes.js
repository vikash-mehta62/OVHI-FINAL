const express = require('express');
const router = express.Router();
const billingService = require('./billingService');

/**
 * @swagger
 * /api/billing/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patient_id
 *               - items
 *             properties:
 *               patient_id:
 *                 type: integer
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     service_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                       default: 1
 *                     unit_price:
 *                       type: number
 *               notes:
 *                 type: string
 *               created_by:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       400:
 *         description: Validation error
 */
router.post('/bills', async (req, res) => {
    try {
        const bill = await billingService.createBill(req.body);
        res.status(201).json({
            success: true,
            message: 'Bill created successfully',
            data: bill
        });
    } catch (error) {
        console.error('Error creating bill:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get bill by ID
router.get('/bills/:id', async (req, res) => {
    try {
        const bill = await billingService.getBillById(req.params.id);
        res.json({
            success: true,
            data: bill
        });
    } catch (error) {
        console.error('Error fetching bill:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

// Get bill data formatted for PDF generation
router.get('/bills/:id/pdf-data', async (req, res) => {
    // console.log(req.user)
    const { user_id } = req.user;
    try {
        const billPdfData = await billingService.getBillForPDF(req.params.id, user_id);
        res.json({
            success: true,
            data: billPdfData
        });
    } catch (error) {
        console.error('Error fetching bill PDF data:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});
/**
 * @swagger
 * /api/billing/bills:
 *   get:
 *     summary: Get all bills with pagination
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Bills retrieved successfully
 */
router.get('/bills', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;

        const bills = await billingService.getAllBills(limit, offset);
        res.json({
            success: true,
            data: bills,
            pagination: {
                page,
                limit,
                offset,
                count: bills.length
            }
        });
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Legacy endpoint for backward compatibility
router.get('/get-all-bills', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    try {
        const bills = await billingService.getAllBills(limit, offset, req);
        res.json({
            success: true,
            data: bills
        });
    } catch (error) {
        console.error('Error fetching bills:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

// Update bill status
router.patch('/bills/:billId/status', async (req, res) => {
    try {
        const { billId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        await billingService.updateBillStatus(billId, status);
        res.json({
            success: true,
            message: 'Bill status updated successfully'
        });
    } catch (error) {
        console.error('Error updating bill status:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update bill items
router.put('/bills/:billId/items', async (req, res) => {
    try {
        const { billId } = req.params;
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Items array is required'
            });
        }

        await billingService.updateBillItems(billId, items);
        res.json({
            success: true,
            message: 'Bill items updated successfully'
        });
    } catch (error) {
        console.error('Error updating bill items:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/bills/{id}/invoice:
 *   post:
 *     summary: Generate invoice from bill
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               due_in_days:
 *                 type: integer
 *                 default: 30
 *     responses:
 *       201:
 *         description: Invoice generated successfully
 */
router.post('/bills/:id/invoice', async (req, res) => {
    try {
        const { due_in_days = 30 } = req.body;
        const invoice = await billingService.generateInvoice(req.params.id, due_in_days);
        res.status(201).json({
            success: true,
            data: invoice,
            message: 'Invoice generated successfully'
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Legacy endpoint for backward compatibility
router.post('/invoices/:bill_id/generate', async (req, res) => {
    try {
        const invoice = await billingService.generateInvoice(req.params.bill_id);
        res.status(201).json({
            success: true,
            data: invoice,
            message: 'Invoice generated successfully'
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get invoice by ID
router.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await billingService.getInvoiceById(req.params.id);
        res.json({
            success: true,
            data: invoice
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/invoices/{id}/payments:
 *   post:
 *     summary: Record payment against invoice
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount_paid
 *               - payment_method
 *             properties:
 *               amount_paid:
 *                 type: number
 *               payment_method:
 *                 type: string
 *                 enum: [cash, card, check, bank_transfer, insurance, online]
 *               transaction_id:
 *                 type: string
 *               reference_number:
 *                 type: string
 *               payment_gateway:
 *                 type: string
 *                 enum: [stripe, square, paypal, authorize_net, manual]
 *               gateway_transaction_id:
 *                 type: string
 *               notes:
 *                 type: string
 *               created_by:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 */
router.post('/invoices/:id/payments', async (req, res) => {
    try {
        const paymentData = {
            ...req.body,
            invoice_id: parseInt(req.params.id)
        };

        const invoice = await billingService.recordPayment(paymentData);
        res.status(201).json({
            success: true,
            message: 'Payment recorded successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Legacy payment endpoint for backward compatibility
router.get('/payments', async (req, res) => {
    try {
        const payments = await billingService.getPayments({}, req);
        res.status(201).json({
            success: true,
            data: payments,
            message: 'Payment recorded successfully'
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.get('/payments/create', async (req, res) => {
    try {
        const payments = await billingService.createPayment(req.body, req);
        res.status(201).json({
            success: true,
            data: payments,
            message: 'Payment recorded successfully'
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});
router.post('/payments', async (req, res) => {
    try {
        const invoice = await billingService.recordPayment(req.body);
        res.status(201).json({
            success: true,
            data: invoice,
            message: 'Payment recorded successfully'
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/invoices:
 *   get:
 *     summary: Get invoices with filters
 *     tags: [Invoices]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: overdue_only
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 */
router.get('/invoices', async (req, res) => {
    try {
        // Use enhanced invoice summary if available, fallback to legacy method
        const filters = {
            status: req.query.status,
            patient_id: req.query.patient_id,
            overdue_only: req.query.overdue_only === 'true',
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            limit: req.query.limit
        };

        let invoices;
        if (typeof billingService.getInvoiceSummary === 'function') {
            invoices = await billingService.getInvoiceSummary(filters);
        } else {
            invoices = await billingService.getInvoices(req.query);
        }

        res.json({
            success: true,
            data: invoices
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all services
router.get('/services', async (req, res) => {
    try {
        const services = await billingService.getServices();
        res.json({
            success: true,
            data: services
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get all patients
router.get('/patients', async (req, res) => {
    try {
        const patients = await billingService.getPatients();
        res.json({
            success: true,
            data: patients
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Update invoice status
router.patch('/invoices/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const invoice = await billingService.updateInvoiceStatus(req.params.id, status);
        res.json({
            success: true,
            data: invoice,
            message: 'Invoice status updated successfully'
        });
    } catch (error) {
        console.error('Error updating invoice status:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/invoices/{id}/payments:
 *   get:
 *     summary: Get payment history for invoice
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
router.get('/invoices/:id/payments', async (req, res) => {
    try {
        let payments;
        if (typeof billingService.getPaymentHistory === 'function') {
            payments = await billingService.getPaymentHistory(req.params.id);
        } else {
            // Fallback to getting invoice with payments
            const invoice = await billingService.getInvoiceById(req.params.id);
            payments = invoice.payments || [];
        }

        res.json({
            success: true,
            data: payments
        });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/invoices/{id}/cancel:
 *   post:
 *     summary: Cancel invoice
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 */
router.post('/invoices/:id/cancel', async (req, res) => {
    try {
        const { reason } = req.body;
        let invoice;

        if (typeof billingService.cancelInvoice === 'function') {
            invoice = await billingService.cancelInvoice(req.params.id, reason);
        } else {
            // Fallback to status update
            invoice = await billingService.updateInvoiceStatus(req.params.id, 'cancelled');
        }

        res.json({
            success: true,
            message: 'Invoice cancelled successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Error cancelling invoice:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/payments/{id}/void:
 *   post:
 *     summary: Void/refund payment
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment voided successfully
 */
router.post('/payments/:id/void', async (req, res) => {
    try {
        const { reason } = req.body;
        let result;

        if (typeof billingService.voidPayment === 'function') {
            result = await billingService.voidPayment(req.params.id, reason);
        } else {
            throw new Error('Payment void functionality not available');
        }

        res.json({
            success: true,
            message: 'Payment voided successfully',
            data: result
        });
    } catch (error) {
        console.error('Error voiding payment:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/reports/aging:
 *   get:
 *     summary: Get accounts receivable aging report
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: patient_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Aging report retrieved successfully
 */
router.get('/reports/aging', async (req, res) => {
    try {
        const patientId = req.query.patient_id;
        let report;

        if (typeof billingService.getAgingReport === 'function') {
            report = await billingService.getAgingReport(patientId);
        } else {
            // Fallback - return empty report structure
            report = [];
        }

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error generating aging report:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/billing/patients/search:
 *   get:
 *     summary: Search patients
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Patient search completed successfully
 */
router.get('/patients/search', async (req, res) => {
    try {
        const { q: searchTerm, user_id } = req.query;

        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No search term provided"
            });
        }

        const patients = await billingService.searchPatient(searchTerm.trim(), user_id);
        res.json({
            success: true,
            data: patients
        });
    } catch (error) {
        console.error('Error searching patients:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Legacy search endpoint for backward compatibility
router.post("/search-patients", async (req, res) => {
    try {
        const { searchTerm } = req.body;
        const { user_id } = req.user;

        // Return empty array if no search term provided
        if (!searchTerm || searchTerm.trim() === '') {
            return res.status(200).json({
                success: true,
                data: [],
                message: "No search term provided"
            });
        }

        const patients = await billingService.searchPatient(searchTerm.trim(), user_id);

        res.status(200).json({
            success: true,
            data: patients,
            message: "Patients fetched successfully"
        });
    } catch (err) {
        console.error('Error searching patients:', err);
        res.status(500).json({
            success: false,
            message: "Something went wrong while searching patients"
        });
    }
});

module.exports = router;