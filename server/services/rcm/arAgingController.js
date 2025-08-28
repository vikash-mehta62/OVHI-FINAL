const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");

// Get A/R aging report
const getARAgingReport = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { 
      bucket, 
      status, 
      payer,
      minBalance = 0,
      page = 1, 
      limit = 50 
    } = req.query;

    let whereClause = 'WHERE ar.provider_id = ? AND ar.balance > ?';
    let params = [user_id, minBalance];

    if (bucket && bucket !== 'all') {
      whereClause += ' AND ar.aging_bucket = ?';
      params.push(bucket);
    }

    if (status && status !== 'all') {
      whereClause += ' AND ar.status = ?';
      params.push(status);
    }

    if (payer && payer !== 'all') {
      whereClause += ' AND ar.payer_name LIKE ?';
      params.push(`%${payer}%`);
    }

    const offset = (page - 1) * limit;

    const [accounts] = await connection.query(`
      SELECT 
        ar.id,
        ar.patient_id,
        p.patient_name,
        ar.account_number,
        ar.balance,
        ar.days_outstanding,
        ar.last_payment_date,
        ar.last_contact_date,
        ar.payer_name,
        ar.status,
        ar.priority,
        ar.aging_bucket,
        ar.contact_attempts,
        ar.notes,
        ar.created_at
      FROM ar_accounts ar
      LEFT JOIN patients p ON ar.patient_id = p.patient_id
      ${whereClause}
      ORDER BY ar.days_outstanding DESC, ar.balance DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM ar_accounts ar
      ${whereClause}
    `, params);

    res.status(200).json({
      success: true,
      data: {
        accounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching A/R aging report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch A/R aging report",
      details: error.message
    });
  }
};

// Get A/R aging statistics
const getARStats = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get total A/R and days in A/R
    const [totalStats] = await connection.query(`
      SELECT 
        SUM(balance) as total_ar,
        AVG(days_outstanding) as days_in_ar,
        COUNT(*) as total_accounts
      FROM ar_accounts 
      WHERE provider_id = ? AND balance > 0
    `, [user_id]);

    // Get aging buckets
    const [agingBuckets] = await connection.query(`
      SELECT 
        aging_bucket as bucket,
        SUM(balance) as amount,
        COUNT(*) as count
      FROM ar_accounts 
      WHERE provider_id = ? AND balance > 0
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN '0-30' THEN 1
          WHEN '31-60' THEN 2
          WHEN '61-90' THEN 3
          WHEN '91-120' THEN 4
          WHEN '120+' THEN 5
        END
    `, [user_id]);

    // Calculate percentages
    const totalAmount = totalStats[0].total_ar || 0;
    const bucketsWithPercentage = agingBuckets.map(bucket => ({
      ...bucket,
      percentage: totalAmount > 0 ? Math.round((bucket.amount / totalAmount) * 100) : 0
    }));

    // Get collection rate (mock calculation)
    const collectionRate = 94.2;
    const writeOffRate = 2.8;

    res.status(200).json({
      success: true,
      data: {
        totalAR: totalStats[0].total_ar || 0,
        daysInAR: Math.round(totalStats[0].days_in_ar || 0),
        collectionRate,
        writeOffRate,
        agingBuckets: bucketsWithPercentage
      }
    });

  } catch (error) {
    console.error("Error fetching A/R stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch A/R statistics",
      details: error.message
    });
  }
};

// Record follow-up activity
const recordFollowUp = async (req, res) => {
  const { accountId } = req.params;
  const { 
    contactMethod, 
    outcome, 
    notes, 
    nextFollowUpDate,
    promisedPaymentDate,
    promisedAmount 
  } = req.body;
  const { user_id } = req.user;

  try {
    // Check if account exists
    const [accounts] = await connection.query(
      'SELECT * FROM ar_accounts WHERE id = ? AND provider_id = ?',
      [accountId, user_id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'A/R account not found'
      });
    }

    // Start transaction
    await connection.beginTransaction();

    // Insert follow-up record
    await connection.query(`
      INSERT INTO ar_follow_ups (
        account_id, contact_method, outcome, notes,
        next_follow_up_date, promised_payment_date, promised_amount,
        performed_by, performed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      accountId, contactMethod, outcome, notes,
      nextFollowUpDate, promisedPaymentDate, promisedAmount,
      user_id
    ]);

    // Update account
    await connection.query(`
      UPDATE ar_accounts SET 
        last_contact_date = CURDATE(),
        contact_attempts = contact_attempts + 1,
        notes = CONCAT(IFNULL(notes, ''), '\n', ?, ' - ', ?, ': ', ?),
        status = CASE 
          WHEN ? = 'payment_promised' THEN 'follow_up'
          WHEN ? = 'payment_plan' THEN 'follow_up'
          WHEN ? = 'no_contact' THEN 'follow_up'
          WHEN ? = 'dispute' THEN 'follow_up'
          WHEN ? = 'hardship' THEN 'collections'
          ELSE status
        END
      WHERE id = ?
    `, [
      new Date().toISOString().split('T')[0],
      contactMethod,
      outcome,
      outcome, outcome, outcome, outcome, outcome,
      accountId
    ]);

    await connection.commit();

    await logAudit(req, 'RECORD', 'AR_FOLLOW_UP', accountId, 
      `Follow-up recorded: ${contactMethod} - ${outcome}`);

    res.status(201).json({
      success: true,
      message: 'Follow-up recorded successfully',
      accountId
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error recording follow-up:", error);
    res.status(500).json({
      success: false,
      error: "Failed to record follow-up",
      details: error.message
    });
  }
};

// Update account status
const updateAccountStatus = async (req, res) => {
  const { accountId } = req.params;
  const { status, reason, notes } = req.body;
  const { user_id } = req.user;

  try {
    // Validate status
    const validStatuses = ['active', 'follow_up', 'collections', 'write_off', 'paid'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Get current account
    const [accounts] = await connection.query(
      'SELECT * FROM ar_accounts WHERE id = ? AND provider_id = ?',
      [accountId, user_id]
    );

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'A/R account not found'
      });
    }

    const oldStatus = accounts[0].status;

    // Update account status
    await connection.query(`
      UPDATE ar_accounts SET 
        status = ?,
        notes = CONCAT(IFNULL(notes, ''), '\n', ?, ': Status changed to ', ?, ' - ', ?),
        last_updated = NOW()
      WHERE id = ?
    `, [
      status,
      new Date().toISOString().split('T')[0],
      status,
      reason || notes || 'No reason provided',
      accountId
    ]);

    // Log status change
    await connection.query(`
      INSERT INTO ar_status_history (
        account_id, old_status, new_status, reason, 
        changed_by, changed_at
      ) VALUES (?, ?, ?, ?, ?, NOW())
    `, [accountId, oldStatus, status, reason || notes, user_id]);

    await logAudit(req, 'UPDATE', 'AR_STATUS', accountId, 
      `A/R status changed from ${oldStatus} to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Account status updated successfully',
      accountId,
      oldStatus,
      newStatus: status
    });

  } catch (error) {
    console.error("Error updating account status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update account status",
      details: error.message
    });
  }
};

// Generate collection letters
const generateCollectionLetters = async (req, res) => {
  const { accountIds, letterType = 'standard' } = req.body;
  const { user_id } = req.user;

  try {
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No account IDs provided'
      });
    }

    // Validate accounts belong to user
    const [accounts] = await connection.query(`
      SELECT id, patient_id, balance, days_outstanding
      FROM ar_accounts 
      WHERE id IN (${accountIds.map(() => '?').join(',')}) AND provider_id = ?
    `, [...accountIds, user_id]);

    if (accounts.length !== accountIds.length) {
      return res.status(400).json({
        success: false,
        error: 'Some accounts not found or not accessible'
      });
    }

    // Generate letters (mock implementation)
    const letters = accounts.map(account => ({
      accountId: account.id,
      patientId: account.patient_id,
      letterType,
      generatedAt: new Date().toISOString(),
      status: 'generated'
    }));

    // Log letter generation
    for (const account of accounts) {
      await connection.query(`
        INSERT INTO ar_collection_letters (
          account_id, letter_type, generated_by, generated_at
        ) VALUES (?, ?, ?, NOW())
      `, [account.id, letterType, user_id]);
    }

    await logAudit(req, 'GENERATE', 'COLLECTION_LETTERS', 0, 
      `Generated ${letters.length} collection letters`);

    res.status(200).json({
      success: true,
      message: `${letters.length} collection letters generated successfully`,
      data: letters
    });

  } catch (error) {
    console.error("Error generating collection letters:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate collection letters",
      details: error.message
    });
  }
};

// Get account details with history
const getAccountDetails = async (req, res) => {
  const { accountId } = req.params;
  const { user_id } = req.user;

  try {
    // Get account details
    const [accounts] = await connection.query(`
      SELECT 
        ar.*,
        p.patient_name,
        p.patient_address,
        p.patient_phone,
        p.patient_email
      FROM ar_accounts ar
      LEFT JOIN patients p ON ar.patient_id = p.patient_id
      WHERE ar.id = ? AND ar.provider_id = ?
    `, [accountId, user_id]);

    if (accounts.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'A/R account not found'
      });
    }

    // Get follow-up history
    const [followUps] = await connection.query(`
      SELECT 
        af.*,
        u.user_name as performed_by_name
      FROM ar_follow_ups af
      LEFT JOIN users u ON af.performed_by = u.user_id
      WHERE af.account_id = ?
      ORDER BY af.performed_at DESC
    `, [accountId]);

    // Get status history
    const [statusHistory] = await connection.query(`
      SELECT 
        ash.*,
        u.user_name as changed_by_name
      FROM ar_status_history ash
      LEFT JOIN users u ON ash.changed_by = u.user_id
      WHERE ash.account_id = ?
      ORDER BY ash.changed_at DESC
    `, [accountId]);

    // Get collection letters
    const [letters] = await connection.query(`
      SELECT 
        acl.*,
        u.user_name as generated_by_name
      FROM ar_collection_letters acl
      LEFT JOIN users u ON acl.generated_by = u.user_id
      WHERE acl.account_id = ?
      ORDER BY acl.generated_at DESC
    `, [accountId]);

    const account = {
      ...accounts[0],
      followUps,
      statusHistory,
      collectionLetters: letters
    };

    res.status(200).json({
      success: true,
      data: account
    });

  } catch (error) {
    console.error("Error fetching account details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch account details",
      details: error.message
    });
  }
};

module.exports = {
  getARAgingReport,
  getARStats,
  recordFollowUp,
  updateAccountStatus,
  generateCollectionLetters,
  getAccountDetails
};