const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate Patient Statement
const generatePatientStatement = async (req, res) => {
  try {
    const { patient_id } = req.params;
    const { user_id } = req.user;
    const { 
      statement_date = new Date(),
      include_paid = false,
      custom_message = ''
    } = req.body;

    // Get patient information
    const [patientInfo] = await connection.query(`
      SELECT 
        up.firstname,
        up.lastname,
        up.dob,
        up.phone,
        up.work_email,
        up.address,
        up.city,
        up.state,
        up.zip_code
      FROM user_profiles up
      LEFT JOIN users_mappings um ON um.user_id = up.fk_userid
      WHERE up.fk_userid = ? AND um.fk_physician_id = ?
    `, [patient_id, user_id]);

    if (patientInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    const patient = patientInfo[0];

    // Get provider information
    const [providerInfo] = await connection.query(`
      SELECT 
        up.firstname as provider_firstname,
        up.lastname as provider_lastname,
        up.phone as provider_phone,
        up.work_email as provider_email,
        up.address as provider_address,
        up.city as provider_city,
        up.state as provider_state,
        up.zip_code as provider_zip
      FROM user_profiles up
      WHERE up.fk_userid = ?
    `, [user_id]);

    const provider = providerInfo[0] || {};

    // Get billing information
    let statusFilter = include_paid ? '' : 'AND cb.status != 2';
    
    const [billingData] = await connection.query(`
      SELECT 
        cb.id as billing_id,
        cb.created as service_date,
        cb.billed_date,
        cb.status,
        cc.code as cpt_code,
        cc.description as service_description,
        cc.price as unit_price,
        cb.code_units,
        (cc.price * cb.code_units) as total_amount,
        CASE 
          WHEN cb.status = 2 THEN (cc.price * cb.code_units)
          ELSE 0
        END as paid_amount,
        CASE cb.status
          WHEN 0 THEN 'Draft'
          WHEN 1 THEN 'Submitted'
          WHEN 2 THEN 'Paid'
          WHEN 3 THEN 'Denied'
          WHEN 4 THEN 'Appealed'
        END as status_text,
        pc.payer_name,
        pc.policy_number
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id
      WHERE cb.patient_id = ? AND um.fk_physician_id = ? ${statusFilter}
      ORDER BY cb.created DESC
    `, [patient_id, user_id]);

    // Calculate totals
    const totals = calculateStatementTotals(billingData);

    // Get payment history
    const [paymentHistory] = await connection.query(`
      SELECT 
        pp.payment_date,
        pp.amount,
        pp.payment_method,
        pp.transaction_id,
        pp.description
      FROM patient_payments pp
      WHERE pp.patient_id = ? AND pp.status = 'completed'
      ORDER BY pp.payment_date DESC
    `, [patient_id]);

    // Generate statement data
    const statementData = {
      statement_id: `STMT-${Date.now()}`,
      statement_date: new Date(statement_date),
      patient,
      provider,
      billing_data: billingData,
      payment_history: paymentHistory,
      totals,
      custom_message,
      aging: calculateAging(billingData)
    };

    // Generate PDF
    const pdfBuffer = await generateStatementPDF(statementData);

    // Save statement record
    const [statementRecord] = await connection.query(`
      INSERT INTO patient_statements 
      (patient_id, provider_id, statement_date, total_amount, balance_due, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'generated', NOW())
    `, [patient_id, user_id, statement_date, totals.total_charges, totals.balance_due]);

    await logAudit(req, 'GENERATE', 'PATIENT_STATEMENT', statementRecord.insertId, 
      `Generated patient statement for ${patient.firstname} ${patient.lastname}`);

    res.status(200).json({
      success: true,
      data: {
        statement_id: statementRecord.insertId,
        statement_data: statementData,
        pdf_generated: true
      }
    });

  } catch (error) {
    console.error("Error generating patient statement:", error);
    res.status(500).json({
      success: false,
      message: "Error generating patient statement"
    });
  }
};

// Calculate statement totals
function calculateStatementTotals(billingData) {
  const totals = {
    total_charges: 0,
    total_payments: 0,
    insurance_payments: 0,
    patient_payments: 0,
    adjustments: 0,
    balance_due: 0,
    current: 0,
    days_30: 0,
    days_60: 0,
    days_90: 0,
    days_120_plus: 0
  };

  const today = new Date();

  billingData.forEach(item => {
    totals.total_charges += parseFloat(item.total_amount);
    
    if (item.status === 2) { // Paid
      totals.total_payments += parseFloat(item.paid_amount);
      totals.insurance_payments += parseFloat(item.paid_amount);
    } else {
      // Calculate aging
      const serviceDate = new Date(item.service_date);
      const daysDiff = Math.floor((today - serviceDate) / (24 * 60 * 60 * 1000));
      const amount = parseFloat(item.total_amount);

      if (daysDiff <= 30) {
        totals.current += amount;
      } else if (daysDiff <= 60) {
        totals.days_30 += amount;
      } else if (daysDiff <= 90) {
        totals.days_60 += amount;
      } else if (daysDiff <= 120) {
        totals.days_90 += amount;
      } else {
        totals.days_120_plus += amount;
      }
    }
  });

  totals.balance_due = totals.total_charges - totals.total_payments - totals.adjustments;

  return totals;
}

// Calculate aging breakdown
function calculateAging(billingData) {
  const aging = {
    current: { amount: 0, count: 0 },
    days_30: { amount: 0, count: 0 },
    days_60: { amount: 0, count: 0 },
    days_90: { amount: 0, count: 0 },
    days_120_plus: { amount: 0, count: 0 }
  };

  const today = new Date();

  billingData.forEach(item => {
    if (item.status !== 2) { // Not paid
      const serviceDate = new Date(item.service_date);
      const daysDiff = Math.floor((today - serviceDate) / (24 * 60 * 60 * 1000));
      const amount = parseFloat(item.total_amount);

      if (daysDiff <= 30) {
        aging.current.amount += amount;
        aging.current.count++;
      } else if (daysDiff <= 60) {
        aging.days_30.amount += amount;
        aging.days_30.count++;
      } else if (daysDiff <= 90) {
        aging.days_60.amount += amount;
        aging.days_60.count++;
      } else if (daysDiff <= 120) {
        aging.days_90.amount += amount;
        aging.days_90.count++;
      } else {
        aging.days_120_plus.amount += amount;
        aging.days_120_plus.count++;
      }
    }
  });

  return aging;
}

// Generate PDF statement
async function generateStatementPDF(statementData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('PATIENT STATEMENT', 50, 50);
      doc.fontSize(12).text(`Statement Date: ${statementData.statement_date.toLocaleDateString()}`, 400, 50);
      doc.text(`Statement ID: ${statementData.statement_id}`, 400, 65);

      // Provider Information
      doc.fontSize(14).text('From:', 50, 100);
      doc.fontSize(12)
         .text(`${statementData.provider.provider_firstname} ${statementData.provider.provider_lastname}`, 50, 120)
         .text(statementData.provider.provider_address || '', 50, 135)
         .text(`${statementData.provider.provider_city || ''}, ${statementData.provider.provider_state || ''} ${statementData.provider.provider_zip || ''}`, 50, 150)
         .text(`Phone: ${statementData.provider.provider_phone || ''}`, 50, 165);

      // Patient Information
      doc.fontSize(14).text('To:', 300, 100);
      doc.fontSize(12)
         .text(`${statementData.patient.firstname} ${statementData.patient.lastname}`, 300, 120)
         .text(statementData.patient.address || '', 300, 135)
         .text(`${statementData.patient.city || ''}, ${statementData.patient.state || ''} ${statementData.patient.zip_code || ''}`, 300, 150)
         .text(`DOB: ${statementData.patient.dob ? new Date(statementData.patient.dob).toLocaleDateString() : ''}`, 300, 165);

      // Account Summary
      let yPos = 220;
      doc.fontSize(14).text('Account Summary', 50, yPos);
      yPos += 25;

      doc.fontSize(12)
         .text(`Total Charges: $${statementData.totals.total_charges.toFixed(2)}`, 50, yPos)
         .text(`Insurance Payments: $${statementData.totals.insurance_payments.toFixed(2)}`, 200, yPos)
         .text(`Patient Payments: $${statementData.totals.patient_payments.toFixed(2)}`, 350, yPos);
      
      yPos += 20;
      doc.fontSize(14).text(`Balance Due: $${statementData.totals.balance_due.toFixed(2)}`, 50, yPos);

      // Aging Summary
      yPos += 40;
      doc.fontSize(14).text('Aging Summary', 50, yPos);
      yPos += 20;

      doc.fontSize(10)
         .text('Current', 50, yPos)
         .text('31-60 Days', 150, yPos)
         .text('61-90 Days', 250, yPos)
         .text('91-120 Days', 350, yPos)
         .text('120+ Days', 450, yPos);

      yPos += 15;
      doc.text(`$${statementData.totals.current.toFixed(2)}`, 50, yPos)
         .text(`$${statementData.totals.days_30.toFixed(2)}`, 150, yPos)
         .text(`$${statementData.totals.days_60.toFixed(2)}`, 250, yPos)
         .text(`$${statementData.totals.days_90.toFixed(2)}`, 350, yPos)
         .text(`$${statementData.totals.days_120_plus.toFixed(2)}`, 450, yPos);

      // Service Details
      yPos += 50;
      doc.fontSize(14).text('Service Details', 50, yPos);
      yPos += 25;

      // Table headers
      doc.fontSize(10)
         .text('Date', 50, yPos)
         .text('Service', 120, yPos)
         .text('CPT', 300, yPos)
         .text('Charges', 350, yPos)
         .text('Payments', 420, yPos)
         .text('Balance', 480, yPos);

      yPos += 15;
      doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
      yPos += 10;

      // Service items
      statementData.billing_data.forEach(item => {
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }

        const balance = parseFloat(item.total_amount) - parseFloat(item.paid_amount);
        
        doc.fontSize(9)
           .text(new Date(item.service_date).toLocaleDateString(), 50, yPos)
           .text(item.service_description.substring(0, 25), 120, yPos)
           .text(item.cpt_code, 300, yPos)
           .text(`$${parseFloat(item.total_amount).toFixed(2)}`, 350, yPos)
           .text(`$${parseFloat(item.paid_amount).toFixed(2)}`, 420, yPos)
           .text(`$${balance.toFixed(2)}`, 480, yPos);

        yPos += 15;
      });

      // Payment Instructions
      yPos += 30;
      if (yPos > 650) {
        doc.addPage();
        yPos = 50;
      }

      doc.fontSize(12).text('Payment Instructions:', 50, yPos);
      yPos += 20;
      doc.fontSize(10)
         .text('• Please remit payment within 30 days of statement date', 50, yPos)
         .text('• Include statement ID with payment', 50, yPos + 15)
         .text('• For questions, call: ' + (statementData.provider.provider_phone || ''), 50, yPos + 30);

      if (statementData.custom_message) {
        yPos += 60;
        doc.fontSize(12).text('Important Message:', 50, yPos);
        yPos += 20;
        doc.fontSize(10).text(statementData.custom_message, 50, yPos, { width: 500 });
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// Get patient statements
const getPatientStatements = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { patient_id, page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE ps.provider_id = ?';
    let queryParams = [user_id];

    if (patient_id) {
      whereClause += ' AND ps.patient_id = ?';
      queryParams.push(patient_id);
    }

    const [statements] = await connection.query(`
      SELECT 
        ps.id as statement_id,
        ps.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        ps.statement_date,
        ps.total_amount,
        ps.balance_due,
        ps.status,
        ps.created_at,
        ps.sent_date,
        ps.payment_received_date
      FROM patient_statements ps
      LEFT JOIN user_profiles up ON up.fk_userid = ps.patient_id
      ${whereClause}
      ORDER BY ps.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM patient_statements ps
      ${whereClause}
    `, queryParams);

    res.status(200).json({
      success: true,
      data: statements,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error("Error getting patient statements:", error);
    res.status(500).json({
      success: false,
      message: "Error getting patient statements"
    });
  }
};

// Send patient statement
const sendPatientStatement = async (req, res) => {
  try {
    const { statement_id } = req.params;
    const { user_id } = req.user;
    const { send_method = 'email', email_address, custom_message = '' } = req.body;

    // Get statement details
    const [statementData] = await connection.query(`
      SELECT 
        ps.*,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.work_email as patient_email
      FROM patient_statements ps
      LEFT JOIN user_profiles up ON up.fk_userid = ps.patient_id
      WHERE ps.id = ? AND ps.provider_id = ?
    `, [statement_id, user_id]);

    if (statementData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Statement not found"
      });
    }

    const statement = statementData[0];
    const recipientEmail = email_address || statement.patient_email;

    if (send_method === 'email' && !recipientEmail) {
      return res.status(400).json({
        success: false,
        message: "Email address is required"
      });
    }

    // Update statement status
    await connection.query(`
      UPDATE patient_statements 
      SET status = 'sent', sent_date = NOW(), send_method = ?
      WHERE id = ?
    `, [send_method, statement_id]);

    await logAudit(req, 'SEND', 'PATIENT_STATEMENT', statement_id, 
      `Sent patient statement via ${send_method} to ${statement.patient_name}`);

    res.status(200).json({
      success: true,
      message: `Statement sent successfully via ${send_method}`,
      data: {
        statement_id,
        send_method,
        recipient: send_method === 'email' ? recipientEmail : 'Patient address'
      }
    });

  } catch (error) {
    console.error("Error sending patient statement:", error);
    res.status(500).json({
      success: false,
      message: "Error sending patient statement"
    });
  }
};

module.exports = {
  generatePatientStatement,
  getPatientStatements,
  sendPatientStatement
};