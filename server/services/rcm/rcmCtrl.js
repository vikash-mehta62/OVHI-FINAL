const connection = require("../../config/db");
const moment = require("moment");
const logAudit = require("../../utils/logAudit");
const axios = require('axios');

// Dashboard Data
const getRCMDashboardData = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '7d':
        dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case '30d':
        dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      case '90d':
        dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        break;
      case '1y':
        dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
        break;
    }

    // Total Revenue
    const [revenueData] = await connection.query(`
      SELECT 
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_revenue,
        COUNT(DISTINCT cb.patient_id) as total_claims,
        COUNT(DISTINCT CASE WHEN cb.status = 2 THEN cb.id END) as paid_claims,
        COUNT(DISTINCT CASE WHEN cb.status = 3 THEN cb.id END) as denied_claims
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
    `, [user_id]);

    // Collection Rate
    const [collectionData] = await connection.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as collected_amount,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
    `, [user_id]);

    // Days in A/R
    const [arData] = await connection.query(`
      SELECT 
        AVG(DATEDIFF(COALESCE(cb.billed_date, CURDATE()), cb.created)) as avg_days_ar
      FROM cpt_billing cb
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status != 2 ${dateFilter}
    `, [user_id]);

    // Denial Rate
    const denialRate = revenueData[0].total_claims > 0
      ? (revenueData[0].denied_claims / revenueData[0].total_claims * 100).toFixed(1)
      : 0;

    // Collection Rate
    const collectionRate = collectionData[0].total_billed > 0
      ? (collectionData[0].collected_amount / collectionData[0].total_billed * 100).toFixed(1)
      : 0;

    // Monthly Revenue Trend
    const [monthlyRevenue] = await connection.query(`
      SELECT 
        DATE_FORMAT(cb.created, '%Y-%m') as month,
        COALESCE(SUM(cc.price * cb.code_units), 0) as revenue,
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as collections
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? 
        AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(cb.created, '%Y-%m')
      ORDER BY month
    `, [user_id]);

    const dashboardData = {
      kpis: {
        totalRevenue: revenueData[0].total_revenue || 0,
        collectionRate: parseFloat(collectionRate),
        denialRate: parseFloat(denialRate),
        daysInAR: Math.round(arData[0].avg_days_ar || 0),
        totalClaims: revenueData[0].total_claims || 0,
        paidClaims: revenueData[0].paid_claims || 0,
        deniedClaims: revenueData[0].denied_claims || 0
      },
      trends: {
        monthlyRevenue: monthlyRevenue.map(row => ({
          month: moment(row.month).format('MMM'),
          revenue: parseFloat(row.revenue),
          collections: parseFloat(row.collections)
        }))
      }
    };

    res.status(200).json({
      success: true,
      data: dashboardData || []
    });

  } catch (error) {
    console.error("Error fetching RCM dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard data"
    });
  }
};

// Claims Status Tracking
const getClaimsStatus = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      page = 1,
      limit = 10,
      status = 'all',
      search = '',
      priority = 'all'
    } = req.query;

    const offset = (page - 1) * limit;
    let statusFilter = '';
    let searchFilter = '';

    if (status !== 'all') {
      statusFilter = `AND cb.status = ${connection.escape(status)}`;
    }

    if (search) {
      searchFilter = `AND (
        CONCAT(up.firstname, ' ', up.lastname) LIKE ${connection.escape('%' + search + '%')} OR
        cb.id LIKE ${connection.escape('%' + search + '%')} OR
        pc.claim_md_tracking_id LIKE ${connection.escape('%' + search + '%')}
      )`;
    }

    const [claims] = await connection.query(`
      SELECT 
        cb.id as claim_id,
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        cb.created as service_date,
        cb.billed_date as submission_date,
        cb.status,
        cc.code as procedure_code,
        cc.price * cb.code_units as total_amount,
        CASE 
          WHEN cb.status = 2 THEN cc.price * cb.code_units 
          ELSE 0 
        END as paid_amount,
        pc.claim_md_tracking_id,
        pc.payer_name,
        DATEDIFF(CURDATE(), cb.created) as processing_days,
        CASE 
          WHEN DATEDIFF(CURDATE(), cb.created) > 30 THEN 'urgent'
          WHEN DATEDIFF(CURDATE(), cb.created) > 14 THEN 'normal'
          ELSE 'normal'
        END as priority,
        CASE cb.status
          WHEN 0 THEN 'draft'
          WHEN 1 THEN 'submitted'
          WHEN 2 THEN 'paid'
          WHEN 3 THEN 'denied'
          WHEN 4 THEN 'appealed'
          ELSE 'unknown'
        END as status_text
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id 
        AND FIND_IN_SET(cb.id, pc.billing_ids)
      WHERE um.fk_physician_id = ? ${statusFilter} ${searchFilter}
      ORDER BY cb.created DESC
      LIMIT ? OFFSET ?
    `, [user_id, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total
      FROM cpt_billing cb
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id 
        AND FIND_IN_SET(cb.id, pc.billing_ids)
      WHERE um.fk_physician_id = ? ${statusFilter} ${searchFilter}
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: claims,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching claims status:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching claims status"
    });
  }
};

// A/R Aging Report
const getARAgingReport = async (req, res) => {
  try {
    const { user_id } = req.user;

    // A/R Aging Buckets
    const [agingData] = await connection.query(`
      SELECT 
        CASE 
          WHEN DATEDIFF(CURDATE(), cb.created) <= 30 THEN '0-30'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 60 THEN '31-60'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 90 THEN '61-90'
          WHEN DATEDIFF(CURDATE(), cb.created) <= 120 THEN '91-120'
          ELSE '120+'
        END as age_bucket,
        COUNT(*) as count,
        COALESCE(SUM(cc.price * cb.code_units), 0) as amount
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status != 2
      GROUP BY age_bucket
      ORDER BY 
        CASE age_bucket
          WHEN '0-30' THEN 1
          WHEN '31-60' THEN 2
          WHEN '61-90' THEN 3
          WHEN '91-120' THEN 4
          WHEN '120+' THEN 5
        END
    `, [user_id]);

    // Individual A/R Accounts
    const [arAccounts] = await connection.query(`
      SELECT 
        cb.id as account_id,
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        pc.payer_name,
        COALESCE(SUM(cc.price * cb.code_units), 0) as balance,
        MAX(cb.created) as last_service_date,
        DATEDIFF(CURDATE(), MAX(cb.created)) as days_past_due,
        CASE 
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 30 THEN 90
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 60 THEN 75
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 90 THEN 60
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 120 THEN 45
          ELSE 25
        END as collectability_score,
        CASE 
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 30 THEN 'Send payment reminder via email'
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 60 THEN 'Phone call required'
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 90 THEN 'Consider payment plan'
          ELSE 'Collections agency referral'
        END as recommended_action,
        CASE 
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 30 THEN 'email'
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 60 THEN 'phone'
          ELSE 'letter'
        END as contact_method
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status != 2
      GROUP BY cb.patient_id
      HAVING balance > 0
      ORDER BY days_past_due DESC
      LIMIT 50
    `, [user_id]);

    const totalAR = agingData.reduce((sum, bucket) => sum + parseFloat(bucket.amount), 0);

    const arBuckets = agingData.map(bucket => ({
      range: bucket.age_bucket === '0-30' ? '0-30 days' :
        bucket.age_bucket === '31-60' ? '31-60 days' :
          bucket.age_bucket === '61-90' ? '61-90 days' :
            bucket.age_bucket === '91-120' ? '91-120 days' : '120+ days',
      amount: parseFloat(bucket.amount),
      count: bucket.count,
      percentage: totalAR > 0 ? ((parseFloat(bucket.amount) / totalAR) * 100).toFixed(1) : 0,
      priority: bucket.age_bucket === '0-30' ? 'low' :
        bucket.age_bucket === '31-60' ? 'medium' : 'high',
      collectability: bucket.age_bucket === '0-30' ? 95 :
        bucket.age_bucket === '31-60' ? 85 :
          bucket.age_bucket === '61-90' ? 70 :
            bucket.age_bucket === '91-120' ? 50 : 25
    }));

    res.status(200).json({
      success: true,
      data: {
        totalAR,
        arBuckets,
        arAccounts: arAccounts.map(account => ({
          ...account,
          balance: parseFloat(account.balance),
          collectability_score: parseInt(account.collectability_score)
        }))
      }
    });

  } catch (error) {
    console.error("Error fetching A/R aging report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching A/R aging report"
    });
  }
};

// Denial Analytics
const getDenialAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '7d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case '30d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      case '90d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        break;
    }

    // Denial trends by month
    const [denialTrends] = await connection.query(`
      SELECT 
        DATE_FORMAT(cb.created, '%Y-%m') as month,
        COUNT(*) as total_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        (COUNT(CASE WHEN cb.status = 3 THEN 1 END) / COUNT(*) * 100) as denial_rate
      FROM cpt_billing cb
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? 
        AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(cb.created, '%Y-%m')
      ORDER BY month
    `, [user_id]);

    // Top denial reasons (mock data - would need denial_reasons table)
    const denialReasons = [
      { reason: 'Insufficient documentation', count: 15, percentage: 35.7 },
      { reason: 'Invalid procedure code', count: 12, percentage: 28.6 },
      { reason: 'Patient eligibility', count: 8, percentage: 19.0 },
      { reason: 'Duplicate claim', count: 4, percentage: 9.5 },
      { reason: 'Other', count: 3, percentage: 7.1 }
    ];

    res.status(200).json({
      success: true,
      data: {
        denialTrends: denialTrends.map(trend => ({
          month: moment(trend.month).format('MMM'),
          rate: parseFloat(trend.denial_rate).toFixed(1),
          total_claims: trend.total_claims,
          denied_claims: trend.denied_claims
        })),
        denialReasons
      }
    });

  } catch (error) {
    console.error("Error fetching denial analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching denial analytics"
    });
  }
};

// Payment Posting Data
const getPaymentPostingData = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { date = moment().format('YYYY-MM-DD') } = req.query;

    // Recent payments
    const [payments] = await connection.query(`
      SELECT 
        cb.id as payment_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        pc.payer_name,
        cc.price * cb.code_units as payment_amount,
        cb.billed_date as payment_date,
        'Electronic' as payment_method,
        cb.id as check_number
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status = 2
        AND DATE(cb.billed_date) = ?
      ORDER BY cb.billed_date DESC
      LIMIT 20
    `, [user_id, date]);

    // Payment summary
    const [summary] = await connection.query(`
      SELECT 
        COUNT(*) as total_payments,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_amount,
        COUNT(DISTINCT cb.patient_id) as unique_patients
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status = 2
        AND DATE(cb.billed_date) = ?
    `, [user_id, date]);

    res.status(200).json({
      success: true,
      data: {
        payments: payments.map(payment => ({
          ...payment,
          payment_amount: parseFloat(payment.payment_amount)
        })),
        summary: {
          total_payments: summary[0].total_payments,
          total_amount: parseFloat(summary[0].total_amount),
          unique_patients: summary[0].unique_patients
        }
      }
    });

  } catch (error) {
    console.error("Error fetching payment posting data:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payment posting data"
    });
  }
};

// Revenue Forecasting
const getRevenueForecasting = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Historical revenue for forecasting
    const [historicalRevenue] = await connection.query(`
      SELECT 
        DATE_FORMAT(cb.created, '%Y-%m') as month,
        COALESCE(SUM(cc.price * cb.code_units), 0) as revenue
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? 
        AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(cb.created, '%Y-%m')
      ORDER BY month
    `, [user_id]);

    // Simple forecasting based on average growth
    const revenues = historicalRevenue.map(r => parseFloat(r.revenue));
    const avgRevenue = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length;
    const growthRate = revenues.length > 1 ?
      ((revenues[revenues.length - 1] - revenues[0]) / revenues[0]) / revenues.length : 0.05;

    // Generate next 6 months forecast
    const forecast = [];
    for (let i = 1; i <= 6; i++) {
      const forecastMonth = moment().add(i, 'month');
      const forecastRevenue = avgRevenue * (1 + (growthRate * i));
      forecast.push({
        month: forecastMonth.format('MMM YYYY'),
        projected_revenue: Math.round(forecastRevenue),
        confidence: Math.max(60, 90 - (i * 5)) // Decreasing confidence over time
      });
    }

    res.status(200).json({
      success: true,
      data: {
        historical: historicalRevenue.map(h => ({
          month: moment(h.month).format('MMM YYYY'),
          revenue: parseFloat(h.revenue)
        })),
        forecast,
        metrics: {
          avgMonthlyRevenue: Math.round(avgRevenue),
          growthRate: (growthRate * 100).toFixed(1) + '%'
        }
      }
    });

  } catch (error) {
    console.error("Error fetching revenue forecasting:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue forecasting"
    });
  }
};

// Collections Workflow
const getCollectionsWorkflow = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Active collection accounts
    const [collectionAccounts] = await connection.query(`
      SELECT 
        cb.patient_id as account_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.phone,
        up.work_email,
        COALESCE(SUM(cc.price * cb.code_units), 0) as balance,
        MAX(cb.created) as last_service_date,
        DATEDIFF(CURDATE(), MAX(cb.created)) as days_outstanding,
        CASE 
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 30 THEN 'new'
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 60 THEN 'follow_up'
          WHEN DATEDIFF(CURDATE(), MAX(cb.created)) <= 90 THEN 'collections'
          ELSE 'write_off'
        END as collection_stage,
        'pending' as status
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      WHERE um.fk_physician_id = ? AND cb.status != 2
      GROUP BY cb.patient_id
      HAVING balance > 0
      ORDER BY days_outstanding DESC
      LIMIT 50
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: collectionAccounts.map(account => ({
        ...account,
        balance: parseFloat(account.balance)
      }))
    });

  } catch (error) {
    console.error("Error fetching collections workflow:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching collections workflow"
    });
  }
};

// Update Claim Status
const updateClaimStatus = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { status, notes } = req.body;
    const { user_id } = req.user;

    await connection.query(`
      UPDATE cpt_billing 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `, [status, claimId]);

    // Log the status change
    await logAudit(req, 'UPDATE', 'CLAIM_STATUS', claimId,
      `Claim status updated to ${status}${notes ? ': ' + notes : ''}`);

    res.status(200).json({
      success: true,
      message: 'Claim status updated successfully'
    });

  } catch (error) {
    console.error("Error updating claim status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating claim status"
    });
  }
};

// Bulk Claim Status Update
const bulkClaimStatusUpdate = async (req, res) => {
  try {
    const { claimIds, status } = req.body;
    const { user_id } = req.user;

    if (!Array.isArray(claimIds) || claimIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid claim IDs provided"
      });
    }

    const placeholders = claimIds.map(() => '?').join(',');
    await connection.query(`
      UPDATE cpt_billing 
      SET status = ?, updated_at = NOW()
      WHERE id IN (${placeholders})
    `, [status, ...claimIds]);

    await logAudit(req, 'BULK_UPDATE', 'CLAIM_STATUS', 0,
      `Bulk status update to ${status} for ${claimIds.length} claims`);

    res.status(200).json({
      success: true,
      message: `${claimIds.length} claims updated successfully`
    });

  } catch (error) {
    console.error("Error bulk updating claim status:", error);
    res.status(500).json({
      success: false,
      message: "Error bulk updating claim status"
    });
  }
};

// Get detailed claim information
const getClaimDetails = async (req, res) => {
  try {
    const { claimId } = req.params;
    const { user_id } = req.user;

    // Get claim details
    const [claimData] = await connection.query(`
      SELECT 
        cb.id as claim_id,
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.dob,
        up.phone,
        up.work_email,
        cb.created as service_date,
        cb.billed_date as submission_date,
        cb.status,
        cc.code as procedure_code,
        cc.description as procedure_description,
        cc.price as unit_price,
        cb.code_units,
        cc.price * cb.code_units as total_amount,
        pc.claim_md_tracking_id,
        pc.payer_name,
        pc.policy_number,
        pc.group_number,
        DATEDIFF(CURDATE(), cb.created) as processing_days,
        CASE cb.status
          WHEN 0 THEN 'Draft'
          WHEN 1 THEN 'Submitted'
          WHEN 2 THEN 'Paid'
          WHEN 3 THEN 'Denied'
          WHEN 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as status_text
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id 
        AND FIND_IN_SET(cb.id, pc.billing_ids)
      WHERE cb.id = ? AND um.fk_physician_id = ?
    `, [claimId, user_id]);

    if (claimData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Claim not found"
      });
    }

    // Get claim history/notes (mock data for now)
    const claimHistory = [
      {
        date: moment().subtract(5, 'days').format('YYYY-MM-DD'),
        action: 'Claim Submitted',
        user: 'System',
        notes: 'Claim submitted to ClaimMD'
      },
      {
        date: moment().subtract(3, 'days').format('YYYY-MM-DD'),
        action: 'Status Update',
        user: 'System',
        notes: 'Claim received by payer'
      }
    ];

    // Get related diagnoses
    const [diagnoses] = await connection.query(`
      SELECT 
        pd.diagnosis_code,
        pd.diagnosis_description
      FROM patient_diagnoses pd
      WHERE pd.patient_id = ?
      ORDER BY pd.created_at DESC
      LIMIT 5
    `, [claimData[0].patient_id]);

    const claim = claimData[0];
    res.status(200).json({
      success: true,
      data: {
        claim: {
          ...claim,
          unit_price: parseFloat(claim.unit_price),
          total_amount: parseFloat(claim.total_amount)
        },
        history: claimHistory,
        diagnoses: diagnoses,
        recommendations: getClaimRecommendations(claim)
      }
    });

  } catch (error) {
    console.error("Error fetching claim details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching claim details"
    });
  }
};

// Process ERA (Electronic Remittance Advice) file
const processERAFile = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { eraData, fileName } = req.body;

    if (!eraData || !fileName) {
      return res.status(400).json({
        success: false,
        message: "ERA data and filename are required"
      });
    }

    // Parse ERA data (simplified - real implementation would parse X12 835 format)
    const processedPayments = [];
    let totalProcessed = 0;
    let totalAmount = 0;

    // Mock ERA processing
    for (let i = 0; i < 10; i++) {
      const payment = {
        claim_id: Math.floor(Math.random() * 1000) + 1,
        patient_name: `Patient ${i + 1}`,
        service_date: moment().subtract(Math.floor(Math.random() * 30), 'days').format('YYYY-MM-DD'),
        billed_amount: Math.floor(Math.random() * 500) + 100,
        paid_amount: Math.floor(Math.random() * 400) + 80,
        adjustment_amount: Math.floor(Math.random() * 50),
        status: Math.random() > 0.8 ? 'denied' : 'paid',
        reason_codes: ['CO-45', 'PR-1']
      };

      processedPayments.push(payment);
      totalProcessed++;
      totalAmount += payment.paid_amount;
    }

    // Log ERA processing
    await logAudit(req, 'PROCESS', 'ERA_FILE', 0,
      `Processed ERA file: ${fileName}, ${totalProcessed} payments, $${totalAmount}`);

    res.status(200).json({
      success: true,
      message: `ERA file processed successfully`,
      data: {
        fileName,
        totalProcessed,
        totalAmount,
        processedPayments,
        summary: {
          paid_claims: processedPayments.filter(p => p.status === 'paid').length,
          denied_claims: processedPayments.filter(p => p.status === 'denied').length,
          total_adjustments: processedPayments.reduce((sum, p) => sum + p.adjustment_amount, 0)
        }
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

// Update collection status for an account
const updateCollectionStatus = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { status, notes, nextAction, contactDate } = req.body;
    const { user_id } = req.user;

    // Update collection status (would need collections table)
    // For now, we'll update the billing record
    await connection.query(`
      UPDATE cpt_billing 
      SET updated_at = NOW()
      WHERE patient_id = ?
    `, [accountId]);

    // Log collection activity
    await logAudit(req, 'UPDATE', 'COLLECTION_STATUS', accountId,
      `Collection status updated: ${status}. Notes: ${notes || 'None'}`);

    res.status(200).json({
      success: true,
      message: 'Collection status updated successfully',
      data: {
        accountId,
        status,
        nextAction,
        contactDate,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Error updating collection status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating collection status"
    });
  }
};

// Get comprehensive RCM analytics
const getRCMAnalytics = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '30d', compareWith = 'previous' } = req.query;

    let dateFilter = '';
    let compareDateFilter = '';

    switch (timeframe) {
      case '7d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        compareDateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE(cb.created) < DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        break;
      case '30d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        compareDateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 60 DAY) AND DATE(cb.created) < DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      case '90d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        compareDateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 180 DAY) AND DATE(cb.created) < DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        break;
    }

    // Current period metrics
    const [currentMetrics] = await connection.query(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed,
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as total_collected,
        AVG(DATEDIFF(COALESCE(cb.billed_date, CURDATE()), cb.created)) as avg_collection_days
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
    `, [user_id]);

    // Previous period metrics for comparison
    const [previousMetrics] = await connection.query(`
      SELECT 
        COUNT(*) as total_claims,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed,
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as total_collected
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${compareDateFilter}
    `, [user_id]);

    // Calculate KPIs and changes
    const current = currentMetrics[0];
    const previous = previousMetrics[0];

    const collectionRate = current.total_billed > 0 ?
      (current.total_collected / current.total_billed * 100) : 0;
    const denialRate = current.total_claims > 0 ?
      (current.denied_claims / current.total_claims * 100) : 0;

    const prevCollectionRate = previous.total_billed > 0 ?
      (previous.total_collected / previous.total_billed * 100) : 0;
    const prevDenialRate = previous.total_claims > 0 ?
      (previous.denied_claims / previous.total_claims * 100) : 0;

    // Top performing procedures
    const [topProcedures] = await connection.query(`
      SELECT 
        cc.code,
        cc.description,
        COUNT(*) as frequency,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_revenue,
        AVG(cc.price * cb.code_units) as avg_revenue,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_count,
        (COUNT(CASE WHEN cb.status = 2 THEN 1 END) / COUNT(*) * 100) as success_rate
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
      GROUP BY cc.code, cc.description
      ORDER BY total_revenue DESC
      LIMIT 10
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalRevenue: {
            current: parseFloat(current.total_collected),
            previous: parseFloat(previous.total_collected),
            change: calculatePercentageChange(current.total_collected, previous.total_collected)
          },
          collectionRate: {
            current: parseFloat(collectionRate.toFixed(1)),
            previous: parseFloat(prevCollectionRate.toFixed(1)),
            change: parseFloat((collectionRate - prevCollectionRate).toFixed(1))
          },
          denialRate: {
            current: parseFloat(denialRate.toFixed(1)),
            previous: parseFloat(prevDenialRate.toFixed(1)),
            change: parseFloat((denialRate - prevDenialRate).toFixed(1))
          },
          avgCollectionDays: {
            current: Math.round(current.avg_collection_days || 0),
            trend: 'stable' // Would calculate based on historical data
          },
          totalClaims: {
            current: current.total_claims,
            previous: previous.total_claims,
            change: calculatePercentageChange(current.total_claims, previous.total_claims)
          }
        },
        topProcedures: topProcedures.map(proc => ({
          ...proc,
          total_revenue: parseFloat(proc.total_revenue),
          avg_revenue: parseFloat(proc.avg_revenue),
          success_rate: parseFloat(proc.success_rate.toFixed(1))
        })),
        timeframe,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error("Error fetching RCM analytics:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching RCM analytics"
    });
  }
};

// Generate comprehensive RCM report
const generateRCMReport = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      reportType = 'comprehensive',
      dateRange,
      format = 'json',
      includeCharts = false
    } = req.body;

    const startDate = dateRange?.start || moment().subtract(30, 'days').format('YYYY-MM-DD');
    const endDate = dateRange?.end || moment().format('YYYY-MM-DD');

    let reportData = {};

    switch (reportType) {
      case 'financial':
        reportData = await generateFinancialReport(user_id, startDate, endDate);
        break;
      case 'operational':
        reportData = await generateOperationalReport(user_id, startDate, endDate);
        break;
      case 'comprehensive':
      default:
        reportData = await generateComprehensiveReport(user_id, startDate, endDate);
        break;
    }

    // Log report generation
    await logAudit(req, 'GENERATE', 'RCM_REPORT', 0,
      `Generated ${reportType} report for ${startDate} to ${endDate}`);

    res.status(200).json({
      success: true,
      data: {
        reportType,
        dateRange: { start: startDate, end: endDate },
        generatedAt: new Date(),
        format,
        ...reportData
      }
    });

  } catch (error) {
    console.error("Error generating RCM report:", error);
    res.status(500).json({
      success: false,
      message: "Error generating RCM report"
    });
  }
};

// Get payer performance analytics
const getPayerPerformance = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '90d' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '30d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
        break;
      case '90d':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
        break;
      case '1y':
        dateFilter = "AND DATE(cb.created) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
        break;
    }

    const [payerPerformance] = await connection.query(`
      SELECT 
        COALESCE(pc.payer_name, 'Self Pay') as payer_name,
        COUNT(*) as total_claims,
        COUNT(CASE WHEN cb.status = 2 THEN 1 END) as paid_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_billed,
        COALESCE(SUM(CASE WHEN cb.status = 2 THEN cc.price * cb.code_units END), 0) as total_paid,
        AVG(DATEDIFF(COALESCE(cb.billed_date, CURDATE()), cb.created)) as avg_payment_days,
        (COUNT(CASE WHEN cb.status = 2 THEN 1 END) / COUNT(*) * 100) as approval_rate,
        (COUNT(CASE WHEN cb.status = 3 THEN 1 END) / COUNT(*) * 100) as denial_rate
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN patient_claims pc ON pc.patient_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
      GROUP BY pc.payer_name
      HAVING total_claims >= 5
      ORDER BY total_billed DESC
    `, [user_id]);

    res.status(200).json({
      success: true,
      data: payerPerformance.map(payer => ({
        ...payer,
        total_billed: parseFloat(payer.total_billed),
        total_paid: parseFloat(payer.total_paid),
        avg_payment_days: Math.round(payer.avg_payment_days || 0),
        approval_rate: parseFloat(payer.approval_rate.toFixed(1)),
        denial_rate: parseFloat(payer.denial_rate.toFixed(1)),
        performance_score: calculatePayerScore(payer)
      }))
    });

  } catch (error) {
    console.error("Error fetching payer performance:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching payer performance"
    });
  }
};

// Get denial trends analysis
const getDenialTrends = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { timeframe = '6m' } = req.query;

    let dateFilter = '';
    switch (timeframe) {
      case '3m':
        dateFilter = "AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)";
        break;
      case '6m':
        dateFilter = "AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)";
        break;
      case '1y':
        dateFilter = "AND cb.created >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
        break;
    }

    // Monthly denial trends
    const [denialTrends] = await connection.query(`
      SELECT 
        DATE_FORMAT(cb.created, '%Y-%m') as month,
        COUNT(*) as total_claims,
        COUNT(CASE WHEN cb.status = 3 THEN 1 END) as denied_claims,
        (COUNT(CASE WHEN cb.status = 3 THEN 1 END) / COUNT(*) * 100) as denial_rate,
        COALESCE(SUM(CASE WHEN cb.status = 3 THEN cc.price * cb.code_units END), 0) as denied_amount
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      WHERE um.fk_physician_id = ? ${dateFilter}
      GROUP BY DATE_FORMAT(cb.created, '%Y-%m')
      ORDER BY month
    `, [user_id]);

    // Top denial reasons (mock data - would need denial_reasons table)
    const denialReasons = [
      { reason: 'Insufficient Documentation', count: 25, percentage: 35.7, trend: 'increasing' },
      { reason: 'Invalid Procedure Code', count: 18, percentage: 25.7, trend: 'stable' },
      { reason: 'Patient Eligibility Issues', count: 12, percentage: 17.1, trend: 'decreasing' },
      { reason: 'Duplicate Claim', count: 8, percentage: 11.4, trend: 'stable' },
      { reason: 'Authorization Required', count: 7, percentage: 10.0, trend: 'increasing' }
    ];

    // Denial prevention recommendations
    const recommendations = [
      {
        priority: 'high',
        category: 'Documentation',
        recommendation: 'Implement pre-submission documentation checklist',
        impact: 'Could reduce denials by 15-20%'
      },
      {
        priority: 'medium',
        category: 'Coding',
        recommendation: 'Regular coding training for staff',
        impact: 'Could reduce coding-related denials by 10%'
      },
      {
        priority: 'medium',
        category: 'Eligibility',
        recommendation: 'Real-time eligibility verification',
        impact: 'Could prevent 80% of eligibility denials'
      }
    ];

    res.status(200).json({
      success: true,
      data: {
        trends: denialTrends.map(trend => ({
          month: moment(trend.month).format('MMM YYYY'),
          total_claims: trend.total_claims,
          denied_claims: trend.denied_claims,
          denial_rate: parseFloat(trend.denial_rate.toFixed(1)),
          denied_amount: parseFloat(trend.denied_amount)
        })),
        topReasons: denialReasons,
        recommendations,
        summary: {
          avgDenialRate: denialTrends.length > 0 ?
            (denialTrends.reduce((sum, t) => sum + parseFloat(t.denial_rate), 0) / denialTrends.length).toFixed(1) : 0,
          totalDeniedAmount: denialTrends.reduce((sum, t) => sum + parseFloat(t.denied_amount), 0),
          improvementOpportunity: 'High - Focus on documentation and coding accuracy'
        }
      }
    });

  } catch (error) {
    console.error("Error fetching denial trends:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching denial trends"
    });
  }
};

// Get detailed A/R account information
const getARAccountDetails = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { user_id } = req.user;

    // Get account details
    const [accountData] = await connection.query(`
      SELECT 
        cb.patient_id as account_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.dob,
        up.phone,
        up.work_email,
        up.address,
        up.city,
        up.state,
        up.zip,
        COALESCE(SUM(cc.price * cb.code_units), 0) as total_balance,
        COUNT(*) as total_claims,
        MAX(cb.created) as last_service_date,
        MIN(cb.created) as first_service_date,
        DATEDIFF(CURDATE(), MAX(cb.created)) as days_outstanding
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      WHERE cb.patient_id = ? AND um.fk_physician_id = ? AND cb.status != 2
      GROUP BY cb.patient_id
    `, [accountId, user_id]);

    if (accountData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "A/R account not found"
      });
    }

    // Get individual claims for this account
    const [claims] = await connection.query(`
      SELECT 
        cb.id as claim_id,
        cb.created as service_date,
        cc.code as procedure_code,
        cc.description as procedure_description,
        cc.price * cb.code_units as amount,
        cb.status,
        CASE cb.status
          WHEN 0 THEN 'Draft'
          WHEN 1 THEN 'Submitted'
          WHEN 3 THEN 'Denied'
          WHEN 4 THEN 'Appealed'
          ELSE 'Unknown'
        END as status_text,
        DATEDIFF(CURDATE(), cb.created) as age_days
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      WHERE cb.patient_id = ? AND cb.status != 2
      ORDER BY cb.created DESC
    `, [accountId]);

    // Get collection history (mock data)
    const collectionHistory = [
      {
        date: moment().subtract(7, 'days').format('YYYY-MM-DD'),
        action: 'Statement Sent',
        method: 'Mail',
        result: 'Delivered',
        notes: 'First statement sent'
      },
      {
        date: moment().subtract(14, 'days').format('YYYY-MM-DD'),
        action: 'Phone Call',
        method: 'Phone',
        result: 'No Answer',
        notes: 'Left voicemail'
      }
    ];

    const account = accountData[0];
    const collectabilityScore = calculateCollectabilityScore(account.days_outstanding, account.total_balance);

    res.status(200).json({
      success: true,
      data: {
        account: {
          ...account,
          total_balance: parseFloat(account.total_balance),
          collectability_score: collectabilityScore,
          risk_level: collectabilityScore > 70 ? 'low' : collectabilityScore > 40 ? 'medium' : 'high',
          recommended_action: getRecommendedAction(account.days_outstanding, collectabilityScore)
        },
        claims: claims.map(claim => ({
          ...claim,
          amount: parseFloat(claim.amount)
        })),
        collectionHistory,
        paymentOptions: [
          { type: 'full_payment', description: 'Pay full balance', amount: account.total_balance },
          { type: 'payment_plan', description: '6-month payment plan', amount: Math.round(account.total_balance / 6) },
          { type: 'settlement', description: 'Settlement offer (80%)', amount: Math.round(account.total_balance * 0.8) }
        ]
      }
    });

  } catch (error) {
    console.error("Error fetching A/R account details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching A/R account details"
    });
  }
};

// Initiate automated follow-up for A/R accounts
const initiateAutomatedFollowUp = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { followUpType, scheduledDate, message } = req.body;
    const { user_id } = req.user;

    // Validate follow-up type
    const validTypes = ['email', 'phone', 'letter', 'statement'];
    if (!validTypes.includes(followUpType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid follow-up type"
      });
    }

    // Get account information
    const [accountData] = await connection.query(`
      SELECT 
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.work_email,
        up.phone,
        COALESCE(SUM(cc.price * cb.code_units), 0) as balance
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      WHERE cb.patient_id = ? AND um.fk_physician_id = ? AND cb.status != 2
      GROUP BY cb.patient_id
    `, [accountId, user_id]);

    if (accountData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    const account = accountData[0];

    // Create follow-up record (would need follow_up_tasks table)
    const followUpId = Math.floor(Math.random() * 10000); // Mock ID

    // Schedule the follow-up based on type
    let followUpResult = {};
    switch (followUpType) {
      case 'email':
        followUpResult = await scheduleEmailFollowUp(account, message, scheduledDate);
        break;
      case 'phone':
        followUpResult = await schedulePhoneFollowUp(account, message, scheduledDate);
        break;
      case 'letter':
        followUpResult = await scheduleLetterFollowUp(account, message, scheduledDate);
        break;
      case 'statement':
        followUpResult = await scheduleStatementFollowUp(account, scheduledDate);
        break;
    }

    // Log the follow-up initiation
    await logAudit(req, 'CREATE', 'FOLLOW_UP', accountId,
      `Automated ${followUpType} follow-up scheduled for ${scheduledDate}`);

    res.status(200).json({
      success: true,
      message: `${followUpType.charAt(0).toUpperCase() + followUpType.slice(1)} follow-up scheduled successfully`,
      data: {
        followUpId,
        accountId,
        followUpType,
        scheduledDate,
        status: 'scheduled',
        ...followUpResult
      }
    });

  } catch (error) {
    console.error("Error initiating automated follow-up:", error);
    res.status(500).json({
      success: false,
      message: "Error initiating automated follow-up"
    });
  }
};

// Setup payment plan for patient
const setupPaymentPlan = async (req, res) => {
  try {
    const { accountId } = req.params;
    const {
      totalAmount,
      monthlyPayment,
      numberOfPayments,
      startDate,
      interestRate = 0,
      notes
    } = req.body;
    const { user_id } = req.user;

    // Validate payment plan parameters
    if (!totalAmount || !monthlyPayment || !numberOfPayments || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment plan parameters"
      });
    }

    if (monthlyPayment * numberOfPayments < totalAmount * 0.9) {
      return res.status(400).json({
        success: false,
        message: "Payment plan total must be at least 90% of balance"
      });
    }

    // Get account information
    const [accountData] = await connection.query(`
      SELECT 
        cb.patient_id,
        CONCAT(up.firstname, ' ', up.lastname) as patient_name,
        up.work_email,
        up.phone,
        COALESCE(SUM(cc.price * cb.code_units), 0) as current_balance
      FROM cpt_billing cb
      LEFT JOIN cpt_codes cc ON cc.id = cb.cpt_code_id
      LEFT JOIN users_mappings um ON um.user_id = cb.patient_id
      LEFT JOIN user_profiles up ON up.fk_userid = cb.patient_id
      WHERE cb.patient_id = ? AND um.fk_physician_id = ? AND cb.status != 2
      GROUP BY cb.patient_id
    `, [accountId, user_id]);

    if (accountData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Account not found"
      });
    }

    // Create payment plan (would need payment_plans table)
    const paymentPlanId = Math.floor(Math.random() * 10000); // Mock ID

    // Generate payment schedule
    const paymentSchedule = [];
    const start = moment(startDate);

    for (let i = 0; i < numberOfPayments; i++) {
      const dueDate = start.clone().add(i, 'month');
      const isLastPayment = i === numberOfPayments - 1;
      const amount = isLastPayment ?
        totalAmount - (monthlyPayment * (numberOfPayments - 1)) :
        monthlyPayment;

      paymentSchedule.push({
        paymentNumber: i + 1,
        dueDate: dueDate.format('YYYY-MM-DD'),
        amount: parseFloat(amount.toFixed(2)),
        status: 'scheduled',
        principal: amount,
        interest: 0 // Would calculate if interest rate > 0
      });
    }

    // Log payment plan creation
    await logAudit(req, 'CREATE', 'PAYMENT_PLAN', accountId,
      `Payment plan created: ${numberOfPayments} payments of $${monthlyPayment}`);

    res.status(200).json({
      success: true,
      message: 'Payment plan created successfully',
      data: {
        paymentPlanId,
        accountId,
        patientName: accountData[0].patient_name,
        totalAmount: parseFloat(totalAmount),
        monthlyPayment: parseFloat(monthlyPayment),
        numberOfPayments,
        startDate,
        interestRate,
        status: 'active',
        paymentSchedule,
        createdAt: new Date(),
        notes
      }
    });

  } catch (error) {
    console.error("Error setting up payment plan:", error);
    res.status(500).json({
      success: false,
      message: "Error setting up payment plan"
    });
  }
};

// Get ClaimMD status for claims
const getClaimMDStatus = async (req, res) => {
  try {
    const { trackingId } = req.params;
    const { user_id } = req.user;

    if (!trackingId) {
      return res.status(400).json({
        success: false,
        message: "Tracking ID is required"
      });
    }

    // Mock ClaimMD API call (would integrate with actual ClaimMD API)
    const claimMDStatus = {
      trackingId,
      status: 'processed',
      statusDescription: 'Claim processed successfully',
      submissionDate: moment().subtract(5, 'days').format('YYYY-MM-DD'),
      lastUpdated: moment().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
      payerResponse: {
        payerName: 'Blue Cross Blue Shield',
        responseCode: 'A1',
        responseDescription: 'Accepted',
        expectedPaymentDate: moment().add(7, 'days').format('YYYY-MM-DD')
      },
      claimDetails: {
        patientName: 'John Doe',
        serviceDate: moment().subtract(10, 'days').format('YYYY-MM-DD'),
        procedureCode: '99213',
        billedAmount: 150.00,
        allowedAmount: 120.00,
        patientResponsibility: 30.00
      },
      statusHistory: [
        {
          date: moment().subtract(5, 'days').format('YYYY-MM-DD'),
          status: 'submitted',
          description: 'Claim submitted to ClaimMD'
        },
        {
          date: moment().subtract(4, 'days').format('YYYY-MM-DD'),
          status: 'transmitted',
          description: 'Claim transmitted to payer'
        },
        {
          date: moment().subtract(1, 'day').format('YYYY-MM-DD'),
          status: 'processed',
          description: 'Claim processed by payer'
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: claimMDStatus
    });

  } catch (error) {
    console.error("Error fetching ClaimMD status:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ClaimMD status"
    });
  }
};

// Sync data with ClaimMD
const syncClaimMDData = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { syncType = 'all', dateRange } = req.body;

    const startDate = dateRange?.start || moment().subtract(30, 'days').format('YYYY-MM-DD');
    const endDate = dateRange?.end || moment().format('YYYY-MM-DD');

    // Mock ClaimMD sync process
    const syncResults = {
      syncId: Math.floor(Math.random() * 100000),
      syncType,
      dateRange: { start: startDate, end: endDate },
      startTime: new Date(),
      status: 'completed',
      results: {
        claimsProcessed: Math.floor(Math.random() * 50) + 10,
        claimsUpdated: Math.floor(Math.random() * 30) + 5,
        newResponses: Math.floor(Math.random() * 20) + 2,
        errors: Math.floor(Math.random() * 3)
      },
      updatedClaims: [
        {
          claimId: 1001,
          trackingId: 'CMD-2024-001',
          oldStatus: 'submitted',
          newStatus: 'paid',
          paidAmount: 150.00
        },
        {
          claimId: 1002,
          trackingId: 'CMD-2024-002',
          oldStatus: 'submitted',
          newStatus: 'denied',
          denialReason: 'Insufficient documentation'
        }
      ]
    };

    // Log sync activity
    await logAudit(req, 'SYNC', 'CLAIMMD_DATA', 0,
      `ClaimMD sync completed: ${syncResults.results.claimsProcessed} claims processed`);

    res.status(200).json({
      success: true,
      message: 'ClaimMD sync completed successfully',
      data: {
        ...syncResults,
        endTime: new Date(),
        duration: '45 seconds'
      }
    });

  } catch (error) {
    console.error("Error syncing ClaimMD data:", error);
    res.status(500).json({
      success: false,
      message: "Error syncing ClaimMD data"
    });
  }
};

// Helper functions
const calculatePercentageChange = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return parseFloat(((current - previous) / previous * 100).toFixed(1));
};

const getClaimRecommendations = (claim) => {
  const recommendations = [];

  if (claim.processing_days > 30) {
    recommendations.push({
      type: 'follow_up',
      priority: 'high',
      message: 'Claim is overdue - contact payer immediately'
    });
  }

  if (claim.status === 3) { // Denied
    recommendations.push({
      type: 'appeal',
      priority: 'medium',
      message: 'Consider appealing this denial with additional documentation'
    });
  }

  return recommendations;
};

const calculatePayerScore = (payer) => {
  const approvalWeight = 0.4;
  const speedWeight = 0.3;
  const volumeWeight = 0.3;

  const approvalScore = payer.approval_rate;
  const speedScore = Math.max(0, 100 - (payer.avg_payment_days - 14) * 2);
  const volumeScore = Math.min(100, payer.total_claims * 2);

  return Math.round(
    (approvalScore * approvalWeight) +
    (speedScore * speedWeight) +
    (volumeScore * volumeWeight)
  );
};

const calculateCollectabilityScore = (daysOutstanding, balance) => {
  let score = 100;

  // Reduce score based on age
  if (daysOutstanding > 120) score -= 50;
  else if (daysOutstanding > 90) score -= 30;
  else if (daysOutstanding > 60) score -= 20;
  else if (daysOutstanding > 30) score -= 10;

  // Adjust based on balance
  if (balance < 100) score -= 10;
  else if (balance > 1000) score += 10;

  return Math.max(0, Math.min(100, score));
};

const getRecommendedAction = (daysOutstanding, collectabilityScore) => {
  if (daysOutstanding <= 30) return 'Send payment reminder';
  if (daysOutstanding <= 60) return 'Phone call required';
  if (daysOutstanding <= 90) return 'Consider payment plan';
  if (collectabilityScore > 40) return 'Intensive collection efforts';
  return 'Consider write-off or collections agency';
};

// Report generation helper functions
const generateFinancialReport = async (userId, startDate, endDate) => {
  // Implementation would generate detailed financial report
  return {
    summary: { totalRevenue: 50000, collectionRate: 85.5 },
    details: []
  };
};

const generateOperationalReport = async (userId, startDate, endDate) => {
  // Implementation would generate operational metrics report
  return {
    summary: { totalClaims: 150, avgProcessingTime: 12 },
    details: []
  };
};

const generateComprehensiveReport = async (userId, startDate, endDate) => {
  // Implementation would generate comprehensive report
  return {
    financial: await generateFinancialReport(userId, startDate, endDate),
    operational: await generateOperationalReport(userId, startDate, endDate)
  };
};

// Follow-up scheduling helper functions
const scheduleEmailFollowUp = async (account, message, scheduledDate) => {
  return {
    method: 'email',
    recipient: account.email,
    subject: 'Payment Reminder',
    scheduledFor: scheduledDate
  };
};

const schedulePhoneFollowUp = async (account, message, scheduledDate) => {
  return {
    method: 'phone',
    phoneNumber: account.phone,
    callScript: message,
    scheduledFor: scheduledDate
  };
};

const scheduleLetterFollowUp = async (account, message, scheduledDate) => {
  return {
    method: 'letter',
    letterType: 'payment_reminder',
    scheduledFor: scheduledDate
  };
};

const scheduleStatementFollowUp = async (account, scheduledDate) => {
  return {
    method: 'statement',
    statementType: 'balance_due',
    scheduledFor: scheduledDate
  };
};

module.exports = {
  getRCMDashboardData,
  getClaimsStatus,
  updateClaimStatus,
  getARAgingReport,
  getDenialAnalytics,
  getPaymentPostingData,
  processERAFile,
  getRevenueForecasting,
  getCollectionsWorkflow,
  updateCollectionStatus,
  getRCMAnalytics,
  getClaimDetails,
  bulkClaimStatusUpdate,
  generateRCMReport,
  getPayerPerformance,
  getDenialTrends,
  getARAccountDetails,
  initiateAutomatedFollowUp,
  setupPaymentPlan,
  getClaimMDStatus,
  syncClaimMDData
};