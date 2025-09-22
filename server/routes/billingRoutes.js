const express = require('express');
const router = express.Router();
const billingService = require('../services/billing/billingService');

// Create bill draft
router.post('/bills', async (req, res) => {
  try {
    const bill = await billingService.createBill(req.body);
    res.status(201).json({
      success: true,
      data: bill,
      message: 'Bill created successfully'
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

// Generate invoice from bill
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

// Record payment
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

// Get all invoices with filters
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await billingService.getInvoices(req.query);
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

// Get all bills
router.get('/get-all-bills', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const bills = await billingService.getAllBills(limit, offset, req);
    res.json({
      success: true,
      data: bills
    });
  } catch (error) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update bill status
router.patch('/bills/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await billingService.updateBillStatus(req.params.id, status);
    res.json({
      success: true,
      data: result,
      message: 'Bill status updated successfully'
    });
  } catch (error) {
    console.error('Error updating bill status:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update bill items
router.put('/bills/:id/items', async (req, res) => {
  try {
    const { items } = req.body;
    const result = await billingService.updateBillItems(req.params.id, items);
    res.json({
      success: true,
      data: result,
      message: 'Bill items updated successfully'
    });
  } catch (error) {
    console.error('Error updating bill items:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update bill amount_paid
router.patch('/bills/:id/amount-paid', async (req, res) => {
  try {
    const { amount_paid } = req.body;
    const result = await billingService.updateBillAmountPaid(req.params.id, amount_paid);
    res.json({
      success: true,
      data: result,
      message: 'Bill amount paid updated successfully'
    });
  } catch (error) {
    console.error('Error updating bill amount paid:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get bill data for PDF
router.get('/bills/:id/pdf-data', async (req, res) => {
  try {
    const providerId = req.user?.user_id;
    const billData = await billingService.getBillForPDF(req.params.id, providerId);
    res.json({
      success: true,
      data: billData
    });
  } catch (error) {
    console.error('Error getting bill PDF data:', error);
    res.status(400).json({
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

// Search patients
router.post('/search-patients', async (req, res) => {
  try {
    const { searchTerm } = req.body;
    const userId = req.user?.user_id; // Get user ID from auth middleware
    
    const patients = await billingService.searchPatient(searchTerm, userId);
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

// Get all payments with filters
router.get('/payments', async (req, res) => {
  try {
    const payments = await billingService.getPayments(req.query, req);
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create payment for a bill
router.post('/payments/create', async (req, res) => {
  try {
    const payment = await billingService.createPayment(req.body, req);
    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get payment by ID
router.get('/payments/:id', async (req, res) => {
  try {
    const payment = await billingService.getPaymentById(req.params.id);
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

// Refund payment
router.post('/payments/:id/refund', async (req, res) => {
  try {
    const payment = await billingService.refundPayment(req.params.id);
    res.json({
      success: true,
      data: payment,
      message: 'Payment refunded successfully'
    });
  } catch (error) {
    console.error('Error refunding payment:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;