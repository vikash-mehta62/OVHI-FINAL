const express = require('express');
const router = express.Router();
const billingService = require('../services/billing/billingService');

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       required:
 *         - patient_id
 *         - items
 *       properties:
 *         patient_id:
 *           type: integer
 *           description: Patient ID
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               service_id:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *                 default: 1
 *               unit_price:
 *                 type: number
 *         notes:
 *           type: string
 *         created_by:
 *           type: integer
 *     
 *     Payment:
 *       type: object
 *       required:
 *         - invoice_id
 *         - amount_paid
 *         - payment_method
 *       properties:
 *         invoice_id:
 *           type: integer
 *         amount_paid:
 *           type: number
 *         payment_method:
 *           type: string
 *           enum: [cash, card, check, bank_transfer, insurance, online]
 *         transaction_id:
 *           type: string
 *         reference_number:
 *           type: string
 *         payment_gateway:
 *           type: string
 *           enum: [stripe, square, paypal, authorize_net, manual]
 *         gateway_transaction_id:
 *           type: string
 *         notes:
 *           type: string
 *         created_by:
 *           type: integer
 */

/**
 * @swagger
 * /api/bills:
 *   post:
 *     summary: Create a new bill
 *     tags: [Bills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bill'
 *     responses:
 *       201:
 *         description: Bill created successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
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

/**
 * @swagger
 * /api/bills:
 *   get:
 *     summary: Get all bills with pagination
 *     tags: [Bills]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Bills retrieved successfully
 */
router.get('/bills', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        
        const bills = await billingService.getAllBills(limit, offset);
        res.json({
            success: true,
            data: bills,
            pagination: {
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

/**
 * @swagger
 * /api/bills/{id}:
 *   get:
 *     summary: Get bill by ID
 *     tags: [Bills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bill retrieved successfully
 *       404:
 *         description: Bill not found
 */
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

/**
 * @swagger
 * /api/bills/{id}/status:
 *   put:
 *     summary: Update bill status
 *     tags: [Bills]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, finalized, cancelled]
 *     responses:
 *       200:
 *         description: Bill status updated successfully
 */
router.put('/bills/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const result = await billingService.updateBillStatus(req.params.id, status);
        res.json({
            success: true,
            message: 'Bill status updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating bill status:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/bills/{id}/items:
 *   put:
 *     summary: Update bill items
 *     tags: [Bills]
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
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     service_id:
 *                       type: integer
 *                     quantity:
 *                       type: integer
 *                     unit_price:
 *                       type: number
 *     responses:
 *       200:
 *         description: Bill items updated successfully
 */
router.put('/bills/:id/items', async (req, res) => {
    try {
        const { items } = req.body;
        const result = await billingService.updateBillItems(req.params.id, items);
        res.json({
            success: true,
            message: 'Bill items updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating bill items:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/bills/{id}/invoice:
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
 *       400:
 *         description: Bill cannot be converted to invoice
 */
router.post('/bills/:id/invoice', async (req, res) => {
    try {
        const { due_in_days = 30 } = req.body;
        const invoice = await billingService.generateInvoice(req.params.id, due_in_days);
        res.status(201).json({
            success: true,
            message: 'Invoice generated successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Error generating invoice:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @swagger
 * /api/invoices:
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
        const filters = {
            status: req.query.status,
            patient_id: req.query.patient_id,
            overdue_only: req.query.overdue_only === 'true',
            from_date: req.query.from_date,
            to_date: req.query.to_date,
            limit: req.query.limit
        };

        const invoices = await billingService.getInvoiceSummary(filters);
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

/**
 * @swagger
 * /api/invoices/{id}:
 *   get:
 *     summary: Get invoice details with line items and payments
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *       404:
 *         description: Invoice not found
 */
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
 * /api/invoices/{id}/payments:
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
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Payment validation error
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

/**
 * @swagger
 * /api/invoices/{id}/payments:
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
        const payments = await billingService.getPaymentHistory(req.params.id);
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
 * /api/invoices/{id}/status:
 *   put:
 *     summary: Update invoice status
 *     tags: [Invoices]
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, partially_paid, paid, overdue, cancelled]
 *     responses:
 *       200:
 *         description: Invoice status updated successfully
 */
router.put('/invoices/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const invoice = await billingService.updateInvoiceStatus(req.params.id, status);
        res.json({
            success: true,
            message: 'Invoice status updated successfully',
            data: invoice
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
 * /api/invoices/{id}/cancel:
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
        const invoice = await billingService.cancelInvoice(req.params.id, reason);
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
 * /api/payments/{id}/void:
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
        const result = await billingService.voidPayment(req.params.id, reason);
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
 * /api/reports/aging:
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
        const report = await billingService.getAgingReport(patientId);
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

// Utility endpoints
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

router.get('/patients/search', async (req, res) => {
    try {
        const { q: searchTerm, user_id } = req.query;
        const patients = await billingService.searchPatient(searchTerm, user_id);
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

module.exports = router;