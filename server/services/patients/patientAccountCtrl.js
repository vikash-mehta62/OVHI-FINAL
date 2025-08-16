const db = require("../../config/db");
const { v4: uuidv4 } = require('uuid');

// Get patient account summary
const getPatientAccountSummary = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required"
      });
    }

    const query = `
      SELECT * FROM patient_account_summary 
      WHERE patient_id = ?
    `;
    
    const [results] = await db.execute(query, [patientId]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient account not found"
      });
    }

    res.status(200).json({
      success: true,
      data: results[0]
    });
  } catch (error) {
    console.error("Error fetching patient account summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get patient claims with details
const getPatientClaims = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required"
      });
    }

    const claimsQuery = `
      SELECT 
        c.*,
        CONCAT(u.firstName, ' ', u.lastName) as provider_name,
        DATEDIFF(CURDATE(), c.submitted_date) as days_since_submission,
        CASE 
          WHEN c.status = 'denied' AND c.appeal_deadline IS NOT NULL 
          THEN DATEDIFF(c.appeal_deadline, CURDATE())
          ELSE NULL 
        END as days_until_appeal_deadline
      FROM claims c
      LEFT JOIN users u ON c.provider_id = u.id
      WHERE c.patient_id = ?
      ORDER BY c.service_date DESC
    `;
    
    const [claims] = await db.execute(claimsQuery, [patientId]);
    
    // Get line items for each claim
    for (let claim of claims) {
      const lineItemsQuery = `
        SELECT * FROM claim_line_items 
        WHERE claim_id = ?
        ORDER BY line_item_id
      `;
      const [lineItems] = await db.execute(lineItemsQuery, [claim.claim_id]);
      claim.line_items = lineItems;
    }

    res.status(200).json({
      success: true,
      data: claims
    });
  } catch (error) {
    console.error("Error fetching patient claims:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get claim details with activity log and comments
const getClaimDetails = async (req, res) => {
  try {
    const { claimId } = req.params;
    
    // Get claim basic info
    const claimQuery = `
      SELECT 
        c.*,
        CONCAT(u.firstName, ' ', u.lastName) as provider_name,
        DATEDIFF(CURDATE(), c.submitted_date) as days_since_submission
      FROM claims c
      LEFT JOIN users u ON c.provider_id = u.id
      WHERE c.claim_id = ?
    `;
    
    const [claimResults] = await db.execute(claimQuery, [claimId]);
    
    if (claimResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    const claim = claimResults[0];

    // Get line items
    const lineItemsQuery = `
      SELECT * FROM claim_line_items 
      WHERE claim_id = ?
      ORDER BY line_item_id
    `;
    const [lineItems] = await db.execute(lineItemsQuery, [claimId]);
    claim.line_items = lineItems;

    // Get activity log
    const activityQuery = `
      SELECT 
        cal.*,
        CONCAT(u.firstName, ' ', u.lastName) as performed_by_name
      FROM claim_activity_log cal
      LEFT JOIN users u ON cal.performed_by = u.id
      WHERE cal.claim_id = ?
      ORDER BY cal.performed_at DESC
    `;
    const [activities] = await db.execute(activityQuery, [claimId]);
    claim.activity_log = activities;

    // Get comments
    const commentsQuery = `
      SELECT 
        cc.*,
        CONCAT(u.firstName, ' ', u.lastName) as created_by_name
      FROM claim_comments cc
      LEFT JOIN users u ON cc.created_by = u.id
      WHERE cc.claim_id = ?
      ORDER BY cc.created_at DESC
    `;
    const [comments] = await db.execute(commentsQuery, [claimId]);
    claim.comments = comments;

    res.status(200).json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error("Error fetching claim details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Add comment to claim
const addClaimComment = async (req, res) => {
  try {
    const { claimId, comment, commentType = 'note' } = req.body;
    const userId = req.user.id;
    
    if (!claimId || !comment) {
      return res.status(400).json({
        success: false,
        message: "Claim ID and comment are required"
      });
    }

    // Insert comment
    const insertQuery = `
      INSERT INTO claim_comments (claim_id, comment_text, comment_type, created_by)
      VALUES (?, ?, ?, ?)
    `;
    
    await db.execute(insertQuery, [claimId, comment, commentType, userId]);

    // Add to activity log
    const activityQuery = `
      INSERT INTO claim_activity_log (claim_id, activity_type, description, performed_by)
      VALUES (?, 'comment_added', ?, ?)
    `;
    
    await db.execute(activityQuery, [claimId, `Comment added: ${comment.substring(0, 100)}...`, userId]);

    res.status(201).json({
      success: true,
      message: "Comment added successfully"
    });
  } catch (error) {
    console.error("Error adding claim comment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Void claim
const voidClaim = async (req, res) => {
  try {
    const { claimId, reason } = req.body;
    const userId = req.user.id;
    
    if (!claimId || !reason) {
      return res.status(400).json({
        success: false,
        message: "Claim ID and reason are required"
      });
    }

    // Update claim status
    const updateQuery = `
      UPDATE claims 
      SET status = 'voided', updated_at = CURRENT_TIMESTAMP
      WHERE claim_id = ?
    `;
    
    await db.execute(updateQuery, [claimId]);

    // Add to activity log
    const activityQuery = `
      INSERT INTO claim_activity_log (claim_id, activity_type, description, performed_by)
      VALUES (?, 'voided', ?, ?)
    `;
    
    await db.execute(activityQuery, [claimId, `Claim voided: ${reason}`, userId]);

    // Add comment
    const commentQuery = `
      INSERT INTO claim_comments (claim_id, comment_text, comment_type, created_by)
      VALUES (?, ?, 'note', ?)
    `;
    
    await db.execute(commentQuery, [claimId, `CLAIM VOIDED: ${reason}`, userId]);

    res.status(200).json({
      success: true,
      message: "Claim voided successfully"
    });
  } catch (error) {
    console.error("Error voiding claim:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Correct claim
const correctClaim = async (req, res) => {
  try {
    const { claimId, correctionNotes } = req.body;
    const userId = req.user.id;
    
    if (!claimId || !correctionNotes) {
      return res.status(400).json({
        success: false,
        message: "Claim ID and correction notes are required"
      });
    }

    // Update original claim status
    const updateQuery = `
      UPDATE claims 
      SET status = 'corrected', updated_at = CURRENT_TIMESTAMP
      WHERE claim_id = ?
    `;
    
    await db.execute(updateQuery, [claimId]);

    // Add to activity log
    const activityQuery = `
      INSERT INTO claim_activity_log (claim_id, activity_type, description, performed_by)
      VALUES (?, 'corrected', ?, ?)
    `;
    
    await db.execute(activityQuery, [claimId, `Claim corrected: ${correctionNotes}`, userId]);

    // Add comment
    const commentQuery = `
      INSERT INTO claim_comments (claim_id, comment_text, comment_type, created_by)
      VALUES (?, ?, 'action_required', ?)
    `;
    
    await db.execute(commentQuery, [claimId, `CORRECTION SUBMITTED: ${correctionNotes}`, userId]);

    res.status(200).json({
      success: true,
      message: "Claim correction submitted successfully"
    });
  } catch (error) {
    console.error("Error correcting claim:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get patient payments
const getPatientPayments = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required"
      });
    }

    const query = `
      SELECT 
        pp.*,
        c.service_date,
        CONCAT(u.firstName, ' ', u.lastName) as created_by_name
      FROM patient_payments pp
      LEFT JOIN claims c ON pp.claim_id = c.claim_id
      LEFT JOIN users u ON pp.created_by = u.id
      WHERE pp.patient_id = ?
      ORDER BY pp.payment_date DESC
    `;
    
    const [results] = await db.execute(query, [patientId]);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching patient payments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Record patient payment
const recordPatientPayment = async (req, res) => {
  try {
    const { 
      patientId, 
      claimId, 
      paymentType, 
      paymentMethod, 
      amount, 
      paymentDate, 
      referenceNumber, 
      payerName, 
      checkNumber, 
      transactionId, 
      appliedToServiceDate, 
      notes 
    } = req.body;
    const userId = req.user.id;
    
    if (!patientId || !paymentType || !paymentMethod || !amount || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields: patientId, paymentType, paymentMethod, amount, paymentDate"
      });
    }

    const insertQuery = `
      INSERT INTO patient_payments (
        patient_id, claim_id, payment_type, payment_method, amount, payment_date,
        reference_number, payer_name, check_number, transaction_id, 
        applied_to_service_date, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(insertQuery, [
      patientId, claimId, paymentType, paymentMethod, amount, paymentDate,
      referenceNumber, payerName, checkNumber, transactionId, 
      appliedToServiceDate, notes, userId
    ]);

    res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      paymentId: result.insertId
    });
  } catch (error) {
    console.error("Error recording payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get patient statements
const getPatientStatements = async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required"
      });
    }

    const query = `
      SELECT 
        ps.*,
        CONCAT(u.firstName, ' ', u.lastName) as created_by_name
      FROM patient_statements ps
      LEFT JOIN users u ON ps.created_by = u.id
      WHERE ps.patient_id = ?
      ORDER BY ps.statement_date DESC
    `;
    
    const [results] = await db.execute(query, [patientId]);

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching patient statements:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Generate patient statement
const generatePatientStatement = async (req, res) => {
  try {
    const { 
      patientId, 
      statementDate, 
      dueDate, 
      includeServicesFrom, 
      includeServicesTo, 
      additionalMessage,
      sendEmail = false 
    } = req.body;
    const userId = req.user.id;
    
    if (!patientId || !statementDate || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Required fields: patientId, statementDate, dueDate"
      });
    }

    // Generate statement ID
    const statementId = `STMT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Calculate totals from account summary
    const summaryQuery = `
      SELECT * FROM patient_account_summary WHERE patient_id = ?
    `;
    const [summaryResults] = await db.execute(summaryQuery, [patientId]);
    
    if (summaryResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient account not found"
      });
    }

    const summary = summaryResults[0];

    // Insert statement
    const insertQuery = `
      INSERT INTO patient_statements (
        statement_id, patient_id, statement_date, due_date, 
        total_charges, total_payments, total_adjustments, balance_due,
        include_services_from, include_services_to, additional_message, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await db.execute(insertQuery, [
      statementId, patientId, statementDate, dueDate,
      summary.total_charges, summary.total_payments, summary.total_adjustments, summary.outstanding_balance,
      includeServicesFrom || statementDate, includeServicesTo || statementDate, additionalMessage, userId
    ]);

    // Get services for statement line items
    const servicesQuery = `
      SELECT 
        c.service_date,
        GROUP_CONCAT(cli.description SEPARATOR ', ') as description,
        SUM(cli.total_charge) as charges,
        SUM(cli.paid_amount) as payments,
        SUM(cli.adjustment_amount) as adjustments,
        SUM(cli.patient_responsibility) as balance,
        c.claim_id
      FROM claims c
      JOIN claim_line_items cli ON c.claim_id = cli.claim_id
      WHERE c.patient_id = ? 
        AND c.service_date BETWEEN ? AND ?
        AND c.status != 'voided'
      GROUP BY c.claim_id, c.service_date
      ORDER BY c.service_date DESC
    `;
    
    const [services] = await db.execute(servicesQuery, [
      patientId, 
      includeServicesFrom || statementDate, 
      includeServicesTo || statementDate
    ]);

    // Insert statement line items
    for (const service of services) {
      const lineItemQuery = `
        INSERT INTO statement_line_items (
          statement_id, service_date, description, charges, payments, adjustments, balance, claim_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await db.execute(lineItemQuery, [
        statementId, service.service_date, service.description,
        service.charges, service.payments, service.adjustments, service.balance, service.claim_id
      ]);
    }

    // Update statement status if sending email
    if (sendEmail) {
      const updateQuery = `
        UPDATE patient_statements 
        SET status = 'sent', sent_date = CURDATE(), sent_method = 'email'
        WHERE statement_id = ?
      `;
      await db.execute(updateQuery, [statementId]);
    }

    res.status(201).json({
      success: true,
      message: sendEmail ? "Statement generated and sent successfully" : "Statement generated successfully",
      statementId: statementId
    });
  } catch (error) {
    console.error("Error generating patient statement:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Download statement (placeholder - would generate PDF)
const downloadStatement = async (req, res) => {
  try {
    const { statementId } = req.params;
    
    // In a real implementation, this would generate a PDF
    // For now, we'll just return the statement data
    const query = `
      SELECT 
        ps.*,
        CONCAT(p.firstName, ' ', p.lastName) as patient_name,
        p.addressLine1, p.addressLine2, p.city, p.state, p.zipCode
      FROM patient_statements ps
      JOIN patients p ON ps.patient_id = p.patientId
      WHERE ps.statement_id = ?
    `;
    
    const [results] = await db.execute(query, [statementId]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Statement not found"
      });
    }

    // Get line items
    const lineItemsQuery = `
      SELECT * FROM statement_line_items 
      WHERE statement_id = ?
      ORDER BY service_date DESC
    `;
    const [lineItems] = await db.execute(lineItemsQuery, [statementId]);
    
    const statement = results[0];
    statement.line_items = lineItems;

    res.status(200).json({
      success: true,
      data: statement,
      message: "Statement data retrieved (PDF generation would happen here)"
    });
  } catch (error) {
    console.error("Error downloading statement:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Resend statement
const resendStatement = async (req, res) => {
  try {
    const { statementId } = req.body;
    
    if (!statementId) {
      return res.status(400).json({
        success: false,
        message: "Statement ID is required"
      });
    }

    // Update statement status
    const updateQuery = `
      UPDATE patient_statements 
      SET status = 'sent', sent_date = CURDATE(), sent_method = 'email'
      WHERE statement_id = ?
    `;
    
    await db.execute(updateQuery, [statementId]);

    res.status(200).json({
      success: true,
      message: "Statement resent successfully"
    });
  } catch (error) {
    console.error("Error resending statement:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

module.exports = {
  getPatientAccountSummary,
  getPatientClaims,
  getClaimDetails,
  addClaimComment,
  voidClaim,
  correctClaim,
  getPatientPayments,
  recordPatientPayment,
  getPatientStatements,
  generatePatientStatement,
  downloadStatement,
  resendStatement
};