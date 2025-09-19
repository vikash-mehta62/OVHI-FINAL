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

module.exports = router;