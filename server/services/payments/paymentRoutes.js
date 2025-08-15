const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getPaymentGateways,
  configurePaymentGateway,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  processRefund,
  handleStripeWebhook,
  getPaymentAnalytics
} = require('./paymentCtrl');

// Validation middleware
const validatePaymentGateway = [
  body('gateway_name').notEmpty().withMessage('Gateway name is required'),
  body('gateway_type').isIn(['stripe', 'square', 'paypal', 'authorize_net']).withMessage('Invalid gateway type'),
  body('api_key').optional().isString(),
  body('secret_key').optional().isString(),
  body('is_sandbox').optional().isBoolean(),
  body('is_active').optional().isBoolean()
];

const validatePaymentIntent = [
  body('patient_id').isInt({ min: 1 }).withMessage('Valid patient ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('billing_id').optional().isInt({ min: 1 }),
  body('description').optional().isString().isLength({ max: 500 })
];

const validateRefund = [
  body('amount').optional().isFloat({ min: 0.01 }).withMessage('Valid refund amount is required'),
  body('reason').optional().isString().isLength({ max: 500 })
];

// Routes

// GET /api/v1/payments/gateways - Get payment gateway configurations
router.get('/gateways', getPaymentGateways);

// POST /api/v1/payments/gateways - Configure payment gateway
router.post('/gateways', validatePaymentGateway, configurePaymentGateway);

// POST /api/v1/payments/intent - Create payment intent
router.post('/intent', validatePaymentIntent, createPaymentIntent);

// POST /api/v1/payments/:payment_id/confirm - Confirm payment
router.post('/:payment_id/confirm', confirmPayment);

// GET /api/v1/payments/history - Get payment history
router.get('/history', getPaymentHistory);

// POST /api/v1/payments/:payment_id/refund - Process refund
router.post('/:payment_id/refund', validateRefund, processRefund);

// POST /api/v1/payments/stripe/webhook - Stripe webhook handler
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// GET /api/v1/payments/analytics - Get payment analytics
router.get('/analytics', getPaymentAnalytics);

module.exports = router;