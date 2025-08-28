const connection = require("../../config/db");
const stripe = require('stripe');
const { validationResult } = require('express-validator');
const logAudit = require("../../utils/logAudit");

// Initialize payment gateways
let stripeClient = null;

// Initialize Stripe client
const initializeStripe = async (secretKey) => {
  try {
    stripeClient = stripe(secretKey);
    return stripeClient;
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    throw error;
  }
};

// Get payment gateway configuration
const getPaymentGateways = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [gateways] = await connection.query(`
      SELECT 
        id,
        gateway_name,
        gateway_type,
        is_sandbox,
        is_active,
        configuration,
        created_at
      FROM payment_gateways 
      WHERE provider_id = ?
      ORDER BY is_active DESC, gateway_name
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: gateways.map(gateway => ({
        ...gateway,
        // Don't expose sensitive keys in response
        api_key: gateway.api_key ? '***' + gateway.api_key.slice(-4) : null,
        secret_key: gateway.secret_key ? '***' + gateway.secret_key.slice(-4) : null
      }))
    });

  } catch (error) {
    console.error("Error fetching payment gateways:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment gateways"
    });
  }
};

// Configure payment gateway
const configurePaymentGateway = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array()
      });
    }

    const { user_id } = req.user;
    const {
      gateway_name,
      gateway_type,
      api_key,
      secret_key,
      webhook_secret,
      is_sandbox = true,
      is_active = false,
      configuration = {}
    } = req.body;

    // Test the gateway configuration
    let testResult = { success: false, message: 'Gateway not tested' };
    
    if (gateway_type === 'stripe' && secret_key) {
      try {
        const testStripe = stripe(secret_key);
        await testStripe.accounts.retrieve();
        testResult = { success: true, message: 'Stripe connection successful' };
      } catch (error) {
        testResult = { success: false, message: `Stripe test failed: ${error.message}` };
      }
    }

    if (!testResult.success && is_active) {
      return res.status(400).json({
        success: false,
        message: `Cannot activate gateway: ${testResult.message}`
      });
    }

    // Deactivate other gateways of the same type if this one is being activated
    if (is_active) {
      await connection.query(`
        UPDATE payment_gateways 
        SET is_active = FALSE 
        WHERE provider_id = ? AND gateway_type = ? AND is_active = TRUE
      `, [user_id, gateway_type]);
    }

    // Insert or update gateway configuration
    const [result] = await connection.query(`
      INSERT INTO payment_gateways 
      (provider_id, gateway_name, gateway_type, api_key, secret_key, webhook_secret, is_sandbox, is_active, configuration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        api_key = VALUES(api_key),
        secret_key = VALUES(secret_key),
        webhook_secret = VALUES(webhook_secret),
        is_sandbox = VALUES(is_sandbox),
        is_active = VALUES(is_active),
        configuration = VALUES(configuration),
        updated_at = NOW()
    `, [user_id, gateway_name, gateway_type, api_key, secret_key, webhook_secret, is_sandbox, is_active, JSON.stringify(configuration)]);

    await logAudit(req, 'CONFIGURE', 'PAYMENT_GATEWAY', result.insertId, 
      `Configured ${gateway_type} payment gateway: ${gateway_name}`);

    res.status(200).json({
      success: true,
      message: `Payment gateway configured successfully`,
      data: {
        gateway_id: result.insertId,
        test_result: testResult
      }
    });

  } catch (error) {
    console.error("Error configuring payment gateway:", error);
    res.status(500).json({
      success: false,
      message: "Error configuring payment gateway"
    });
  }
};

// Create payment intent (Stripe)
const createPaymentIntent = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { 
      patient_id, 
      billing_id, 
      amount, 
      description = 'Medical service payment',
      payment_method_types = ['card']
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required"
      });
    }

    // Get active Stripe gateway
    const [gateways] = await connection.query(`
      SELECT * FROM payment_gateways 
      WHERE provider_id = ? AND gateway_type = 'stripe' AND is_active = TRUE
      LIMIT 1
    `, [user_id]);

    if (gateways.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active Stripe gateway configured"
      });
    }

    const gateway = gateways[0];
    const stripeClient = stripe(gateway.secret_key);

    // Create payment intent
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      payment_method_types,
      description,
      metadata: {
        patient_id: patient_id.toString(),
        billing_id: billing_id ? billing_id.toString() : '',
        provider_id: user_id.toString()
      }
    });

    // Store payment record
    const [paymentResult] = await connection.query(`
      INSERT INTO patient_payments 
      (patient_id, provider_id, billing_id, payment_gateway_id, transaction_id, payment_method, amount, status, description)
      VALUES (?, ?, ?, ?, ?, 'credit_card', ?, 'pending', ?)
    `, [patient_id, user_id, billing_id, gateway.id, paymentIntent.id, amount, description]);

    await logAudit(req, 'CREATE', 'PAYMENT_INTENT', paymentResult.insertId, 
      `Created payment intent for $${amount} - Patient ID: ${patient_id}`);

    res.status(200).json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        payment_id: paymentResult.insertId,
        amount: amount,
        currency: 'usd'
      }
    });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({
      success: false,
      message: "Error creating payment intent",
      error: error.message
    });
  }
};

// Confirm payment
const confirmPayment = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { payment_intent_id, payment_method_id } = req.body;
    const { user_id } = req.user;

    // Get payment record
    const [payments] = await connection.query(`
      SELECT pp.*, pg.secret_key 
      FROM patient_payments pp
      JOIN payment_gateways pg ON pg.id = pp.payment_gateway_id
      WHERE pp.id = ? AND pp.provider_id = ?
    `, [payment_id, user_id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    const payment = payments[0];
    const stripeClient = stripe(payment.secret_key);

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripeClient.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status === 'succeeded') {
      // Calculate fees (assuming 2.9% + $0.30 for Stripe)
      const feeAmount = (payment.amount * 0.029) + 0.30;
      const netAmount = payment.amount - feeAmount;

      // Update payment record
      await connection.query(`
        UPDATE patient_payments 
        SET 
          status = 'completed',
          fee_amount = ?,
          net_amount = ?,
          card_last_four = ?,
          card_brand = ?,
          payment_date = NOW(),
          metadata = ?
        WHERE id = ?
      `, [
        feeAmount,
        netAmount,
        paymentIntent.charges.data[0]?.payment_method_details?.card?.last4 || null,
        paymentIntent.charges.data[0]?.payment_method_details?.card?.brand || null,
        JSON.stringify({
          stripe_payment_intent: payment_intent_id,
          stripe_charge_id: paymentIntent.charges.data[0]?.id
        }),
        payment_id
      ]);

      // Update billing record if applicable
      if (payment.billing_id) {
        await connection.query(`
          UPDATE cpt_billing 
          SET status = 2, updated_at = NOW()
          WHERE id = ?
        `, [payment.billing_id]);
      }

      await logAudit(req, 'CONFIRM', 'PAYMENT', payment_id, 
        `Payment confirmed: $${payment.amount} - Transaction: ${payment_intent_id}`);

      res.status(200).json({
        success: true,
        message: "Payment confirmed successfully",
        data: {
          payment_id,
          amount: payment.amount,
          net_amount: netAmount,
          fee_amount: feeAmount,
          status: 'completed'
        }
      });
    } else {
      // Update payment as failed
      await connection.query(`
        UPDATE patient_payments 
        SET status = 'failed', updated_at = NOW()
        WHERE id = ?
      `, [payment_id]);

      res.status(400).json({
        success: false,
        message: `Payment failed: ${paymentIntent.status}`,
        data: {
          payment_id,
          status: paymentIntent.status
        }
      });
    }

  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).json({
      success: false,
      message: "Error confirming payment",
      error: error.message
    });
  }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { 
      patient_id, 
      page = 1, 
      limit = 20, 
      status = 'all',
      date_from,
      date_to
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE pp.provider_id = ?';
    let queryParams = [user_id];

    if (patient_id) {
      whereClause += ' AND pp.patient_id = ?';
      queryParams.push(patient_id);
    }

    if (status !== 'all') {
      whereClause += ' AND pp.status = ?';
      queryParams.push(status);
    }

    if (date_from) {
      whereClause += ' AND DATE(pp.payment_date) >= ?';
      queryParams.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND DATE(pp.payment_date) <= ?';
      queryParams.push(date_to);
    }

    const [payments] = await connection.query(`
      SELECT 
        pp.*,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        pg.gateway_name,
        cb.id as billing_claim_id,
        cc.code as procedure_code
      FROM patient_payments pp
      LEFT JOIN user_profiles up ON up.fk_userid = pp.patient_id
      LEFT JOIN payment_gateways pg ON pg.id = pp.payment_gateway_id
      LEFT JOIN cpt_billing cb ON cb.id = pp.billing_id
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      ${whereClause}
      ORDER BY pp.payment_date DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM patient_payments pp
      ${whereClause}
    `, queryParams);

    res.status(200).json({
      success: true,
      data: payments.map(payment => ({
        ...payment,
        amount: parseFloat(payment.amount),
        fee_amount: parseFloat(payment.fee_amount),
        net_amount: parseFloat(payment.net_amount)
      })),
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment history"
    });
  }
};

// Process refund
const processRefund = async (req, res) => {
  try {
    const { payment_id } = req.params;
    const { amount, reason = 'Requested by provider' } = req.body;
    const { user_id } = req.user;

    // Get payment record
    const [payments] = await connection.query(`
      SELECT pp.*, pg.secret_key 
      FROM patient_payments pp
      JOIN payment_gateways pg ON pg.id = pp.payment_gateway_id
      WHERE pp.id = ? AND pp.provider_id = ? AND pp.status = 'completed'
    `, [payment_id, user_id]);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Payment not found or cannot be refunded"
      });
    }

    const payment = payments[0];
    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot exceed original payment amount"
      });
    }

    const stripeClient = stripe(payment.secret_key);
    const metadata = JSON.parse(payment.metadata || '{}');

    // Process refund through Stripe
    const refund = await stripeClient.refunds.create({
      payment_intent: metadata.stripe_payment_intent,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        refund_reason: reason,
        original_payment_id: payment_id.toString()
      }
    });

    // Update payment record
    await connection.query(`
      UPDATE patient_payments 
      SET 
        status = 'refunded',
        refund_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [reason, payment_id]);

    // Create refund record
    await connection.query(`
      INSERT INTO patient_payments 
      (patient_id, provider_id, billing_id, payment_gateway_id, transaction_id, payment_method, amount, status, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
    `, [
      payment.patient_id,
      payment.provider_id,
      payment.billing_id,
      payment.payment_gateway_id,
      refund.id,
      payment.payment_method,
      -refundAmount, // Negative amount for refund
      `Refund: ${reason}`,
      JSON.stringify({
        refund_id: refund.id,
        original_payment_id: payment_id,
        refund_reason: reason
      })
    ]);

    await logAudit(req, 'REFUND', 'PAYMENT', payment_id, 
      `Refunded $${refundAmount} - Reason: ${reason}`);

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        refund_id: refund.id,
        amount: refundAmount,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      message: "Error processing refund",
      error: error.message
    });
  }
};

// Stripe webhook handler
const handleStripeWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const { user_id } = req.user || {};

    // Get webhook secret from active Stripe gateway
    const [gateways] = await connection.query(`
      SELECT webhook_secret FROM payment_gateways 
      WHERE gateway_type = 'stripe' AND is_active = TRUE
      LIMIT 1
    `);

    if (gateways.length === 0) {
      return res.status(400).json({ error: 'No active Stripe gateway found' });
    }

    const endpointSecret = gateways[0].webhook_secret;
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailure(failedPayment);
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to handle successful payments
const handlePaymentSuccess = async (paymentIntent) => {
  try {
    await connection.query(`
      UPDATE patient_payments 
      SET status = 'completed', updated_at = NOW()
      WHERE transaction_id = ? AND status = 'pending'
    `, [paymentIntent.id]);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

// Helper function to handle failed payments
const handlePaymentFailure = async (paymentIntent) => {
  try {
    await connection.query(`
      UPDATE patient_payments 
      SET status = 'failed', updated_at = NOW()
      WHERE transaction_id = ? AND status = 'pending'
    `, [paymentIntent.id]);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

// Get payment analytics
const getPaymentAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '7d':
        dateFilter = "AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case '30d':
        dateFilter = "AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      case '90d':
        dateFilter = "AND DATE(payment_date) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        break;
    }

    // Payment summary
    const [summary] = await connection.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN fee_amount END), 0) as total_fees,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN net_amount END), 0) as net_revenue
      FROM patient_payments 
      WHERE provider_id = ? ${dateFilter}
    `, [user_id]);

    // Payment methods breakdown
    const [paymentMethods] = await connection.query(`
      SELECT 
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_amount
      FROM patient_payments 
      WHERE provider_id = ? AND status = 'completed' ${dateFilter}
      GROUP BY payment_method
    `, [user_id]);

    // Daily payment trends
    const [dailyTrends] = await connection.query(`
      SELECT 
        DATE(payment_date) as payment_date,
        COUNT(*) as payment_count,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as daily_revenue
      FROM patient_payments 
      WHERE provider_id = ? ${dateFilter}
      GROUP BY DATE(payment_date)
      ORDER BY payment_date
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          ...summary[0],
          total_revenue: parseFloat(summary[0].total_revenue),
          total_fees: parseFloat(summary[0].total_fees),
          net_revenue: parseFloat(summary[0].net_revenue),
          success_rate: summary[0].total_payments > 0 
            ? ((summary[0].successful_payments / summary[0].total_payments) * 100).toFixed(1)
            : 0
        },
        payment_methods: paymentMethods.map(method => ({
          ...method,
          total_amount: parseFloat(method.total_amount)
        })),
        daily_trends: dailyTrends.map(trend => ({
          ...trend,
          daily_revenue: parseFloat(trend.daily_revenue)
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching payment analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment analytics"
    });
  }
};

// Payment Posting Engine Functions

// Get ERA processing queue
const getERAQueue = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { status, payer } = req.query;

    let whereClause = 'WHERE provider_id = ?';
    let params = [user_id];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (payer) {
      whereClause += ' AND payer_name LIKE ?';
      params.push(`%${payer}%`);
    }

    const [eras] = await connection.query(`
      SELECT 
        id,
        era_number,
        payer_name,
        check_number,
        check_date,
        total_amount,
        claims_count,
        status,
        auto_posted,
        exceptions,
        created_at,
        processed_at
      FROM era_payments 
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    res.status(200).json({
      success: true,
      data: eras
    });

  } catch (error) {
    console.error("Error fetching ERA queue:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch ERA queue",
      details: error.message
    });
  }
};

// Process ERA auto-posting
const processERAAutoPost = async (req, res) => {
  const { eraId } = req.params;
  const { user_id } = req.user;

  try {
    // Start transaction
    await connection.beginTransaction();

    // Get ERA details
    const [eras] = await connection.query(
      'SELECT * FROM era_payments WHERE id = ? AND provider_id = ?',
      [eraId, user_id]
    );

    if (eras.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        error: 'ERA not found'
      });
    }

    const era = eras[0];

    // Get payment details for this ERA
    const [paymentDetails] = await connection.query(`
      SELECT 
        claim_id,
        patient_name,
        service_date,
        charged_amount,
        paid_amount,
        adjustment_amount,
        adjustment_reason
      FROM era_payment_details 
      WHERE era_id = ?
    `, [eraId]);

    let autoPostedCount = 0;
    let exceptionsCount = 0;
    const exceptions = [];

    // Process each payment detail
    for (const detail of paymentDetails) {
      try {
        // Check if claim exists
        const [claims] = await connection.query(
          'SELECT * FROM claims WHERE claim_id = ?',
          [detail.claim_id]
        );

        if (claims.length === 0) {
          exceptions.push(`Claim ${detail.claim_id} not found`);
          exceptionsCount++;
          continue;
        }

        // Validate payment amount
        const claim = claims[0];
        if (detail.paid_amount > claim.total_charges) {
          exceptions.push(`Payment amount exceeds charges for claim ${detail.claim_id}`);
          exceptionsCount++;
          continue;
        }

        // Post payment
        await connection.query(`
          INSERT INTO payment_postings (
            claim_id, era_id, paid_amount, adjustment_amount,
            adjustment_reason, posted_date, posted_by, auto_posted
          ) VALUES (?, ?, ?, ?, ?, NOW(), ?, true)
        `, [
          detail.claim_id, eraId, detail.paid_amount,
          detail.adjustment_amount, detail.adjustment_reason, user_id
        ]);

        // Update claim status
        await connection.query(
          'UPDATE claims SET status = ?, paid_amount = ? WHERE claim_id = ?',
          ['paid', detail.paid_amount, detail.claim_id]
        );

        autoPostedCount++;

      } catch (detailError) {
        console.error(`Error processing payment detail:`, detailError);
        exceptions.push(`Error processing claim ${detail.claim_id}: ${detailError.message}`);
        exceptionsCount++;
      }
    }

    // Update ERA status
    const finalStatus = exceptionsCount > 0 ? 'exception' : 'posted';
    await connection.query(`
      UPDATE era_payments SET 
        status = ?,
        auto_posted = true,
        exceptions = ?,
        processed_at = NOW(),
        processed_by = ?
      WHERE id = ?
    `, [finalStatus, JSON.stringify(exceptions), user_id, eraId]);

    await connection.commit();

    await logAudit(req, 'PROCESS', 'ERA_AUTO_POST', eraId, 
      `ERA auto-posted: ${autoPostedCount} payments, ${exceptionsCount} exceptions`);

    res.status(200).json({
      success: true,
      message: 'ERA processed successfully',
      data: {
        eraId,
        autoPostedCount,
        exceptionsCount,
        exceptions,
        status: finalStatus
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error processing ERA auto-post:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process ERA auto-post",
      details: error.message
    });
  }
};

// Bulk process ERAs
const processBulkERAPost = async (req, res) => {
  const { eraIds } = req.body;
  const { user_id } = req.user;

  try {
    const results = [];

    for (const eraId of eraIds) {
      try {
        // Process each ERA (simplified version)
        await connection.query(`
          UPDATE era_payments SET 
            status = 'posted',
            auto_posted = true,
            processed_at = NOW(),
            processed_by = ?
          WHERE id = ? AND provider_id = ? AND status = 'pending'
        `, [user_id, eraId, user_id]);

        results.push({ eraId, success: true });
      } catch (error) {
        results.push({ eraId, success: false, error: error.message });
      }
    }

    await logAudit(req, 'PROCESS', 'BULK_ERA_POST', 0, 
      `Bulk ERA processing: ${results.length} ERAs processed`);

    res.status(200).json({
      success: true,
      message: 'Bulk ERA processing completed',
      data: results
    });

  } catch (error) {
    console.error("Error processing bulk ERA post:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bulk ERA post",
      details: error.message
    });
  }
};

// Get payment posting statistics
const getPaymentPostingStats = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get total posted amount
    const [totalPosted] = await connection.query(`
      SELECT COALESCE(SUM(paid_amount), 0) as total_posted
      FROM payment_postings 
      WHERE posted_by = ? AND posted_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [user_id]);

    // Get auto-posting percentage
    const [autoPostStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_postings,
        SUM(CASE WHEN auto_posted = true THEN 1 ELSE 0 END) as auto_postings
      FROM payment_postings 
      WHERE posted_by = ? AND posted_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [user_id]);

    // Get exceptions count
    const [exceptions] = await connection.query(`
      SELECT COUNT(*) as exceptions_count
      FROM era_payments 
      WHERE provider_id = ? AND status = 'exception' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [user_id]);

    // Calculate average posting time (mock data for now)
    const averagePostingTime = 2.5;

    const autoPostedPercentage = autoPostStats[0].total_postings > 0 
      ? Math.round((autoPostStats[0].auto_postings / autoPostStats[0].total_postings) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalPosted: totalPosted[0].total_posted,
        autoPostedPercentage,
        exceptionsCount: exceptions[0].exceptions_count,
        averagePostingTime
      }
    });

  } catch (error) {
    console.error("Error fetching payment posting stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment posting stats",
      details: error.message
    });
  }
};

// Upload ERA file
const uploadERAFile = async (req, res) => {
  try {
    const { user_id } = req.user;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No ERA file uploaded'
      });
    }

    // Process ERA file (simplified - would normally parse EDI format)
    const eraNumber = `ERA-${Date.now()}`;
    
    const [result] = await connection.query(`
      INSERT INTO era_payments (
        era_number, provider_id, payer_name, check_number,
        check_date, total_amount, claims_count, status,
        file_path, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `, [
      eraNumber, user_id, 'Sample Payer', 'CHK123456',
      new Date().toISOString().split('T')[0], 1500.00, 5,
      file.path, user_id
    ]);

    await logAudit(req, 'UPLOAD', 'ERA_FILE', result.insertId, 
      `ERA file uploaded: ${file.originalname}`);

    res.status(201).json({
      success: true,
      message: 'ERA file uploaded successfully',
      data: {
        eraId: result.insertId,
        eraNumber,
        fileName: file.originalname
      }
    });

  } catch (error) {
    console.error("Error uploading ERA file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload ERA file",
      details: error.message
    });
  }
};

module.exports = {
  getPaymentGateways,
  configurePaymentGateway,
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory,
  processRefund,
  handleStripeWebhook,
  getPaymentAnalytics,
  // Payment Posting Engine
  getERAQueue,
  processERAAutoPost,
  processBulkERAPost,
  getPaymentPostingStats,
  uploadERAFile
};