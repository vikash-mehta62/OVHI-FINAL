const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");

// Get all claims with filtering and pagination
const getAllClaims = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { 
      status, 
      payer, 
      dateFrom, 
      dateTo, 
      page = 1, 
      limit = 50,
      search 
    } = req.query;

    let whereClause = 'WHERE c.provider_id = ?';
    let params = [user_id];

    if (status && status !== 'all') {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    if (payer && payer !== 'all') {
      whereClause += ' AND c.payer_name LIKE ?';
      params.push(`%${payer}%`);
    }

    if (dateFrom) {
      whereClause += ' AND c.service_date >= ?';
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ' AND c.service_date <= ?';
      params.push(dateTo);
    }

    if (search) {
      whereClause += ' AND (p.patient_name LIKE ? OR c.claim_number LIKE ? OR c.payer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const offset = (page - 1) * limit;

    const [claims] = await connection.query(`
      SELECT 
        c.claim_id,
        c.claim_number,
        c.patient_id,
        p.patient_name,
        c.provider_id,
        pr.provider_name,
        c.service_date,
        c.submission_date,
        c.status,
        c.total_amount,
        c.paid_amount,
        c.balance_amount,
        c.payer_name,
        c.validation_score,
        c.last_updated,
        c.days_in_process,
        c.priority,
        GROUP_CONCAT(DISTINCT cd.icd_code) as diagnosis_codes,
        GROUP_CONCAT(DISTINCT cp.cpt_code) as procedure_codes
      FROM claims c
      LEFT JOIN patients p ON c.patient_id = p.patient_id
      LEFT JOIN providers pr ON c.provider_id = pr.provider_id
      LEFT JOIN claim_diagnosis_codes cd ON c.claim_id = cd.claim_id
      LEFT JOIN claim_procedure_codes cp ON c.claim_id = cp.claim_id
      ${whereClause}
      GROUP BY c.claim_id
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(DISTINCT c.claim_id) as total
      FROM claims c
      LEFT JOIN patients p ON c.patient_id = p.patient_id
      ${whereClause}
    `, params);

    res.status(200).json({
      success: true,
      data: {
        claims: claims.map(claim => ({
          ...claim,
          diagnosisCodes: claim.diagnosis_codes ? claim.diagnosis_codes.split(',') : [],
          procedureCodes: claim.procedure_codes ? claim.procedure_codes.split(',') : []
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error("Error fetching claims:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch claims",
      details: error.message
    });
  }
};

// Get claim statistics
const getClaimStats = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get basic stats
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_claims,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_claims,
        COUNT(CASE WHEN status = 'denied' THEN 1 END) as denied_claims,
        SUM(total_amount) as total_amount,
        SUM(paid_amount) as paid_amount,
        SUM(balance_amount) as pending_amount,
        AVG(days_in_process) as average_processing_time
      FROM claims 
      WHERE provider_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [user_id]);

    // Calculate clean claim rate
    const [cleanClaimStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_submitted,
        COUNT(CASE WHEN validation_score >= 95 THEN 1 END) as clean_claims
      FROM claims 
      WHERE provider_id = ? AND status IN ('submitted', 'paid', 'accepted')
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `, [user_id]);

    const cleanClaimRate = cleanClaimStats[0].total_submitted > 0 
      ? Math.round((cleanClaimStats[0].clean_claims / cleanClaimStats[0].total_submitted) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        ...stats[0],
        cleanClaimRate
      }
    });

  } catch (error) {
    console.error("Error fetching claim stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch claim statistics",
      details: error.message
    });
  }
};

// Submit claim
const submitClaim = async (req, res) => {
  const { claimId } = req.params;
  const { user_id } = req.user;

  try {
    // Check if claim exists and belongs to user
    const [claims] = await connection.query(
      'SELECT * FROM claims WHERE claim_id = ? AND provider_id = ?',
      [claimId, user_id]
    );

    if (claims.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    const claim = claims[0];

    if (claim.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft claims can be submitted'
      });
    }

    // Update claim status
    await connection.query(`
      UPDATE claims SET 
        status = 'submitted',
        submission_date = NOW(),
        last_updated = NOW()
      WHERE claim_id = ?
    `, [claimId]);

    await logAudit(req, 'SUBMIT', 'CLAIM', claimId, 
      `Claim submitted: ${claim.claim_number}`);

    res.status(200).json({
      success: true,
      message: 'Claim submitted successfully',
      claimId
    });

  } catch (error) {
    console.error("Error submitting claim:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit claim",
      details: error.message
    });
  }
};

// Bulk submit claims
const bulkSubmitClaims = async (req, res) => {
  const { claimIds } = req.body;
  const { user_id } = req.user;

  try {
    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No claim IDs provided'
      });
    }

    // Start transaction
    await connection.beginTransaction();

    const results = [];

    for (const claimId of claimIds) {
      try {
        // Check if claim exists and is in draft status
        const [claims] = await connection.query(
          'SELECT * FROM claims WHERE claim_id = ? AND provider_id = ? AND status = "draft"',
          [claimId, user_id]
        );

        if (claims.length === 0) {
          results.push({ claimId, success: false, error: 'Claim not found or not in draft status' });
          continue;
        }

        // Update claim status
        await connection.query(`
          UPDATE claims SET 
            status = 'submitted',
            submission_date = NOW(),
            last_updated = NOW()
          WHERE claim_id = ?
        `, [claimId]);

        results.push({ claimId, success: true });

      } catch (error) {
        results.push({ claimId, success: false, error: error.message });
      }
    }

    await connection.commit();

    const successCount = results.filter(r => r.success).length;

    await logAudit(req, 'BULK_SUBMIT', 'CLAIMS', 0, 
      `Bulk claim submission: ${successCount}/${claimIds.length} claims submitted`);

    res.status(200).json({
      success: true,
      message: `${successCount} claims submitted successfully`,
      results
    });

  } catch (error) {
    await connection.rollback();
    console.error("Error bulk submitting claims:", error);
    res.status(500).json({
      success: false,
      error: "Failed to bulk submit claims",
      details: error.message
    });
  }
};

// Get claim details
const getClaimDetails = async (req, res) => {
  const { claimId } = req.params;
  const { user_id } = req.user;

  try {
    // Get claim details
    const [claims] = await connection.query(`
      SELECT 
        c.*,
        p.patient_name,
        p.patient_address,
        p.patient_phone,
        pr.provider_name
      FROM claims c
      LEFT JOIN patients p ON c.patient_id = p.patient_id
      LEFT JOIN providers pr ON c.provider_id = pr.provider_id
      WHERE c.claim_id = ? AND c.provider_id = ?
    `, [claimId, user_id]);

    if (claims.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    // Get diagnosis codes
    const [diagnosisCodes] = await connection.query(
      'SELECT * FROM claim_diagnosis_codes WHERE claim_id = ?',
      [claimId]
    );

    // Get procedure codes
    const [procedureCodes] = await connection.query(
      'SELECT * FROM claim_procedure_codes WHERE claim_id = ?',
      [claimId]
    );

    // Get claim history
    const [history] = await connection.query(`
      SELECT * FROM claim_audit_trail 
      WHERE claim_id = ? 
      ORDER BY performed_at DESC
    `, [claimId]);

    const claim = {
      ...claims[0],
      diagnosisCodes,
      procedureCodes,
      history
    };

    res.status(200).json({
      success: true,
      data: claim
    });

  } catch (error) {
    console.error("Error fetching claim details:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch claim details",
      details: error.message
    });
  }
};

// Update claim status
const updateClaimStatus = async (req, res) => {
  const { claimId } = req.params;
  const { status, notes } = req.body;
  const { user_id } = req.user;

  try {
    // Validate status
    const validStatuses = ['draft', 'submitted', 'accepted', 'rejected', 'paid', 'denied', 'appealed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Get current claim
    const [claims] = await connection.query(
      'SELECT * FROM claims WHERE claim_id = ? AND provider_id = ?',
      [claimId, user_id]
    );

    if (claims.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Claim not found'
      });
    }

    const oldStatus = claims[0].status;

    // Update claim status
    await connection.query(`
      UPDATE claims SET 
        status = ?,
        last_updated = NOW()
      WHERE claim_id = ?
    `, [status, claimId]);

    // Log status change
    await connection.query(`
      INSERT INTO claim_audit_trail (
        claim_id, action, old_status, new_status, 
        changes, performed_by
      ) VALUES (?, 'STATUS_CHANGE', ?, ?, ?, ?)
    `, [
      claimId, oldStatus, status,
      JSON.stringify({ notes, timestamp: new Date().toISOString() }),
      user_id
    ]);

    await logAudit(req, 'UPDATE', 'CLAIM_STATUS', claimId, 
      `Claim status changed from ${oldStatus} to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Claim status updated successfully',
      claimId,
      oldStatus,
      newStatus: status
    });

  } catch (error) {
    console.error("Error updating claim status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update claim status",
      details: error.message
    });
  }
};

module.exports = {
  getAllClaims,
  getClaimStats,
  submitClaim,
  bulkSubmitClaims,
  getClaimDetails,
  updateClaimStatus
};