const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const fs = require('fs');
const path = require('path');

// ERA Processing Controller
const processERAFile2 = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { era_data, file_name, auto_post = false } = req.body;

    if (!era_data || !file_name) {
      return res.status(400).json({
        success: false,
        message: "ERA data and filename are required"
      });
    }

    // Parse ERA data (X12 835 format simulation)
    const parsedERA = await parseERAData(era_data);
    
    // Store ERA record
    const [eraRecord] = await connection.query(`
      INSERT INTO era_files 
      (provider_id, file_name, file_size, total_payments, total_adjustments, status, processed_date, auto_posted)
      VALUES (?, ?, ?, ?, ?, 'processed', NOW(), ?)
    `, [
      user_id, 
      file_name, 
      era_data.length, 
      parsedERA.totalPayments, 
      parsedERA.totalAdjustments,
      auto_post
    ]);

    const eraId = eraRecord.insertId;

    // Process individual payment details
    const processedPayments = [];
    let autoPostedCount = 0;

    for (const payment of parsedERA.payments) {
      // Store ERA payment detail
      const [paymentDetail] = await connection.query(`
        INSERT INTO era_payment_details 
        (era_file_id, claim_id, patient_id, service_date, billed_amount, paid_amount, 
         adjustment_amount, reason_codes, check_number, payer_name, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        eraId,
        payment.claim_id,
        payment.patient_id,
        payment.service_date,
        payment.billed_amount,
        payment.paid_amount,
        payment.adjustment_amount,
        JSON.stringify(payment.reason_codes),
        payment.check_number,
        payment.payer_name,
        auto_post ? 'auto_posted' : 'pending'
      ]);

      // Auto-post if enabled and payment is valid
      if (auto_post && payment.paid_amount > 0) {
        const autoPostResult = await autoPostPayment(payment, user_id);
        if (autoPostResult.success) {
          autoPostedCount++;
          
          // Update payment detail status
          await connection.query(`
            UPDATE era_payment_details 
            SET status = 'auto_posted', posted_date = NOW()
            WHERE id = ?
          `, [paymentDetail.insertId]);
        }
      }

      processedPayments.push({
        ...payment,
        era_detail_id: paymentDetail.insertId,
        auto_posted: auto_post && payment.paid_amount > 0
      });
    }

    await logAudit(req, 'PROCESS', 'ERA_FILE', eraId, 
      `Processed ERA file: ${file_name}, ${parsedERA.payments.length} payments, Auto-posted: ${autoPostedCount}`);

    res.status(200).json({
      success: true,
      message: `ERA file processed successfully`,
      data: {
        era_id: eraId,
        file_name,
        total_payments: parsedERA.totalPayments,
        total_adjustments: parsedERA.totalAdjustments,
        processed_count: parsedERA.payments.length,
        auto_posted_count: autoPostedCount,
        payments: processedPayments
      }
    });

  } catch (error) {
    console.error("Error processing ERA file:", error);
    res.status(500).json({
      success: false,
      message: "Error processing ERA file"
    });
  }
};

// Parse ERA data (simplified X12 835 parser)
async function parseERAData(eraData) {
  // This is a simplified parser - in production, you'd use a proper X12 parser
  const payments = [];
  let totalPayments = 0;
  let totalAdjustments = 0;

  // Simulate parsing ERA data
  // In real implementation, this would parse actual X12 835 format
  const lines = eraData.split('\n');
  let currentPayment = null;

  for (let i = 0; i < Math.min(lines.length, 20); i++) { // Limit for demo
    // Generate sample payment data
    const payment = {
      claim_id: Math.floor(Math.random() * 100) + 1,
      patient_id: Math.floor(Math.random() * 10) + 101,
      service_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      billed_amount: Math.floor(Math.random() * 500) + 100,
      paid_amount: Math.floor(Math.random() * 400) + 80,
      adjustment_amount: Math.floor(Math.random() * 50),
      reason_codes: ['CO-45', 'PR-1', 'OA-23'][Math.floor(Math.random() * 3)],
      check_number: `CHK${1000 + i}`,
      payer_name: ['Blue Cross Blue Shield', 'Aetna', 'UnitedHealthcare', 'Cigna'][Math.floor(Math.random() * 4)],
      patient_name: `Patient ${i + 1}`,
      cpt_code: ['99213', '99214', '90834', '90837'][Math.floor(Math.random() * 4)]
    };

    payments.push(payment);
    totalPayments += payment.paid_amount;
    totalAdjustments += payment.adjustment_amount;
  }

  return {
    payments,
    totalPayments,
    totalAdjustments
  };
}

// Auto-post payment to patient account
async function autoPostPayment(payment, providerId) {
  try {
    // Check if claim exists and is valid for posting
    const [claimCheck] = await connection.query(`
      SELECT cb.id, cb.patient_id, cb.status, cc.price * cb.code_units as expected_amount
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE cb.id = ? AND um.fk_physician_id = ? AND cb.status IN (1, 4)
    `, [payment.claim_id, providerId]);

    if (claimCheck.length === 0) {
      return { success: false, reason: 'Claim not found or not eligible for posting' };
    }

    const claim = claimCheck[0];

    // Validate payment amount is reasonable
    if (payment.paid_amount > claim.expected_amount * 1.1) {
      return { success: false, reason: 'Payment amount exceeds expected amount' };
    }

    // Create payment record
    await connection.query(`
      INSERT INTO patient_payments 
      (patient_id, provider_id, billing_id, payment_method, amount, fee_amount, net_amount, 
       status, payment_date, description, transaction_id, source_type)
      VALUES (?, ?, ?, 'insurance', ?, 0, ?, 'completed', NOW(), ?, ?, 'era')
    `, [
      claim.patient_id,
      providerId,
      payment.claim_id,
      payment.paid_amount,
      payment.paid_amount,
      `ERA Payment - ${payment.payer_name}`,
      `ERA-${payment.check_number}`
    ]);

    // Update claim status to paid if fully paid
    if (payment.paid_amount >= claim.expected_amount * 0.95) { // 95% threshold
      await connection.query(`
        UPDATE cpt_billing 
        SET status = 2, updated_at = NOW()
        WHERE id = ?
      `, [payment.claim_id]);
    }

    return { success: true };

  } catch (error) {
    console.error('Auto-post error:', error);
    return { success: false, reason: error.message };
  }
}

// Get ERA files list
const getERAFiles = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 10, status = 'all' } = req.query;

    const offset = (page - 1) * limit;
    let statusFilter = '';
    let queryParams = [user_id];

    if (status !== 'all') {
      statusFilter = 'AND ef.status = ?';
      queryParams.push(status);
    }

    const [eraFiles] = await connection.query(`
      SELECT 
        ef.id as era_id,
        ef.file_name,
        ef.file_size,
        ef.total_payments,
        ef.total_adjustments,
        ef.status,
        ef.processed_date,
        ef.auto_posted,
        COUNT(epd.id) as payment_count,
        COUNT(CASE WHEN epd.status = 'auto_posted' THEN 1 END) as auto_posted_count,
        COUNT(CASE WHEN epd.status = 'pending' THEN 1 END) as pending_count
      FROM era_files ef
      LEFT JOIN era_payment_details epd ON epd.era_file_id = ef.id
      WHERE ef.provider_id = ? ${statusFilter}
      GROUP BY ef.id
      ORDER BY ef.processed_date DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM era_files ef
      WHERE ef.provider_id = ? ${statusFilter}
    `, queryParams);

    res.status(200).json({
      success: true,
      data: eraFiles,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching ERA files:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ERA files"
    });
  }
};

// Get ERA payment details
const getERAPaymentDetails = async (req, res) => {
  try {
    const { era_id } = req.params;
    const { user_id } = req.user;

    // Get ERA file info
    const [eraInfo] = await connection.query(`
      SELECT * FROM era_files 
      WHERE id = ? AND provider_id = ?
    `, [era_id, user_id]);

    if (eraInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ERA file not found"
      });
    }

    // Get payment details
    const [paymentDetails] = await connection.query(`
      SELECT 
        epd.*,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        cc.code as cpt_code,
        cc.description as service_description
      FROM era_payment_details epd
      LEFT JOIN user_profiles up ON up.fk_userid = epd.patient_id
      LEFT JOIN cpt_billing cb ON cb.id = epd.claim_id
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      WHERE epd.era_file_id = ?
      ORDER BY epd.service_date DESC
    `, [era_id]);

    res.status(200).json({
      success: true,
      data: {
        era_info: eraInfo[0],
        payment_details: paymentDetails
      }
    });

  } catch (error) {
    console.error("Error fetching ERA payment details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ERA payment details"
    });
  }
};

// Manual post ERA payment
const manualPostERAPayment = async (req, res) => {
  try {
    const { era_detail_id } = req.params;
    const { user_id } = req.user;

    // Get ERA payment detail
    const [paymentDetail] = await connection.query(`
      SELECT epd.*, ef.provider_id
      FROM era_payment_details epd
      LEFT JOIN era_files ef ON ef.id = epd.era_file_id
      WHERE epd.id = ? AND ef.provider_id = ?
    `, [era_detail_id, user_id]);

    if (paymentDetail.length === 0) {
      return res.status(404).json({
        success: false,
        message: "ERA payment detail not found"
      });
    }

    const payment = paymentDetail[0];

    if (payment.status === 'auto_posted') {
      return res.status(400).json({
        success: false,
        message: "Payment already posted"
      });
    }

    // Auto-post the payment
    const autoPostResult = await autoPostPayment(payment, user_id);

    if (autoPostResult.success) {
      // Update payment detail status
      await connection.query(`
        UPDATE era_payment_details 
        SET status = 'manual_posted', posted_date = NOW()
        WHERE id = ?
      `, [era_detail_id]);

      await logAudit(req, 'POST', 'ERA_PAYMENT', era_detail_id, 
        `Manually posted ERA payment: $${payment.paid_amount}`);

      res.status(200).json({
        success: true,
        message: "Payment posted successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: autoPostResult.reason
      });
    }

  } catch (error) {
    console.error("Error posting ERA payment:", error);
    res.status(500).json({
      success: false,
      message: "Error posting ERA payment"
    });
  }
};

// Get office payments (card/cash)
const getOfficePayments = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { 
      page = 1, 
      limit = 20, 
      date_from,
      date_to,
      payment_method = 'all'
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE pp.provider_id = ? AND pp.source_type = "office"';
    let queryParams = [user_id];

    if (payment_method !== 'all') {
      whereClause += ' AND pp.payment_method = ?';
      queryParams.push(payment_method);
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
        cb.id as billing_claim_id,
        cc.code as procedure_code
      FROM patient_payments pp
      LEFT JOIN user_profiles up ON up.fk_userid = pp.patient_id
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
    console.error("Error fetching office payments:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching office payments"
    });
  }
};

// Record office payment
const recordOfficePayment = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      patient_id,
      billing_id,
      payment_method,
      amount,
      card_last_four,
      card_brand,
      check_number,
      cash_received,
      change_given,
      description
    } = req.body;

    if (!patient_id || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "Patient ID, amount, and payment method are required"
      });
    }

    // Calculate net amount (no fees for office payments)
    const netAmount = parseFloat(amount);
    const feeAmount = 0;

    // Create payment record
    const [paymentResult] = await connection.query(`
      INSERT INTO patient_payments 
      (patient_id, provider_id, billing_id, payment_method, amount, fee_amount, net_amount, 
       status, payment_date, description, card_last_four, card_brand, transaction_id, source_type,
       metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), ?, ?, ?, ?, 'office', ?)
    `, [
      patient_id,
      user_id,
      billing_id,
      payment_method,
      amount,
      feeAmount,
      netAmount,
      description || `Office payment - ${payment_method}`,
      card_last_four,
      card_brand,
      `OFFICE-${Date.now()}`,
      JSON.stringify({
        check_number,
        cash_received,
        change_given,
        recorded_by: user_id,
        recorded_at: new Date()
      })
    ]);

    // Update billing record if applicable
    if (billing_id) {
      await connection.query(`
        UPDATE cpt_billing 
        SET status = 2, updated_at = NOW()
        WHERE id = ? AND patient_id = ?
      `, [billing_id, patient_id]);
    }

    await logAudit(req, 'RECORD', 'OFFICE_PAYMENT', paymentResult.insertId, 
      `Recorded office payment: $${amount} via ${payment_method}`);

    res.status(200).json({
      success: true,
      message: "Office payment recorded successfully",
      data: {
        payment_id: paymentResult.insertId,
        amount: netAmount,
        payment_method,
        status: 'completed'
      }
    });

  } catch (error) {
    console.error("Error recording office payment:", error);
    res.status(500).json({
      success: false,
      message: "Error recording office payment"
    });
  }
};

module.exports = {
  processERAFile2,
  getERAFiles,
  getERAPaymentDetails,
  manualPostERAPayment,
  getOfficePayments,
  recordOfficePayment
};