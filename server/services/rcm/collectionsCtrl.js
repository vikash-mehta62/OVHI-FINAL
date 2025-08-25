const {
  executeQuery,
  executeTransaction,
  executeQueryWithPagination
} = require('../../utils/dbUtils');
const {
  ErrorTypes,
  handleControllerError,
  sendSuccessResponse,
  formatDatabaseError
} = require('../../middleware/errorHandler');

// Get patient accounts for collections
const getPatientAccounts = async (req, res) => {
  try {
    const accounts = await executeQuery(`
      SELECT 
        pa.id,
        pa.patient_id as patientId,
        CONCAT(p.first_name, ' ', p.last_name) as patientName,
        pa.total_balance as totalBalance,
        pa.aging_0_30 as aging30,
        pa.aging_31_60 as aging60,
        pa.aging_61_90 as aging90,
        pa.aging_91_plus as aging120Plus,
        pa.last_payment_date as lastPaymentDate,
        pa.last_statement_date as lastStatementDate,
        pa.collection_status as collectionStatus,
        pa.priority,
        pa.assigned_collector as assignedCollector,
        pa.contact_attempts as contactAttempts,
        CASE WHEN pp.id IS NOT NULL THEN 1 ELSE 0 END as paymentPlanActive,
        COALESCE(pa.insurance_pending, 0) as insurancePending
      FROM patient_accounts pa
      LEFT JOIN patients p ON pa.patient_id = p.id
      LEFT JOIN payment_plans pp ON pa.patient_id = pp.patient_id AND pp.status = 'active'
      WHERE pa.total_balance > 0
      ORDER BY 
        CASE pa.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        pa.aging_91_plus DESC,
        pa.total_balance DESC
    `);
    
    sendSuccessResponse(res, accounts, 'Patient accounts retrieved successfully');
    
  } catch (error) {
    const dbError = formatDatabaseError(error);
    handleControllerError(dbError, res, req);
  }
};

// Get payment plans
const getPaymentPlans = async (req, res) => {
  try {
    const query = `
      SELECT 
        pp.id,
        pp.patient_id as patientId,
        CONCAT(p.first_name, ' ', p.last_name) as patientName,
        pp.total_amount as totalAmount,
        pp.monthly_payment as monthlyPayment,
        pp.remaining_balance as remainingBalance,
        pp.next_payment_date as nextPaymentDate,
        pp.status as planStatus,
        pp.payments_remaining as paymentsRemaining,
        pp.auto_pay_enabled as autoPayEnabled,
        pp.created_date,
        pp.notes
      FROM payment_plans pp
      LEFT JOIN patients p ON pp.patient_id = p.id
      WHERE pp.status IN ('active', 'pending')
      ORDER BY pp.next_payment_date ASC
    `;
    
    const plans = await executeQuery(query);
    
    sendSuccessResponse(res, plans, 'Payment plans retrieved successfully');
    
  } catch (error) {
    const dbError = formatDatabaseError(error);
    handleControllerError(dbError, res, req);
  }
};

// Create payment plan
const createPaymentPlan = async (req, res) => {
  try {
    const {
      patientId,
      totalAmount,
      monthlyPayment,
      startDate,
      autoPayEnabled,
      notes
    } = req.body;
    
    if (!patientId || !totalAmount || !monthlyPayment || !startDate) {
      const missingFields = [];
      if (!patientId) missingFields.push('patientId');
      if (!totalAmount) missingFields.push('totalAmount');
      if (!monthlyPayment) missingFields.push('monthlyPayment');
      if (!startDate) missingFields.push('startDate');
      
      throw ErrorTypes.MISSING_REQUIRED_FIELDS(missingFields);
    }
    
    // Business logic validation
    if (monthlyPayment > totalAmount) {
      throw ErrorTypes.VALIDATION_ERROR('Monthly payment cannot exceed total amount', {
        monthlyPayment,
        totalAmount
      });
    }
    
    // Calculate payments remaining
    const paymentsRemaining = Math.ceil(totalAmount / monthlyPayment);
    
    // Prepare transaction queries
    const queries = [
      {
        query: `
          INSERT INTO payment_plans (
            patient_id,
            total_amount,
            monthly_payment,
            remaining_balance,
            next_payment_date,
            status,
            payments_remaining,
            auto_pay_enabled,
            created_date,
            notes
          ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NOW(), ?)
        `,
        params: [
          patientId,
          totalAmount,
          monthlyPayment,
          totalAmount, // Initial remaining balance
          startDate,
          paymentsRemaining,
          autoPayEnabled ? 1 : 0,
          notes || null
        ]
      },
      {
        query: `
          UPDATE patient_accounts 
          SET collection_status = 'payment_plan',
              updated_date = NOW()
          WHERE patient_id = ?
        `,
        params: [patientId]
      },
      {
        query: `
          INSERT INTO collection_activities (
            patient_id,
            activity_type,
            activity_date,
            description,
            outcome,
            next_action,
            performed_by
          ) VALUES (?, 'payment_plan_setup', NOW(), ?, 'successful', 'monitor_payments', ?)
        `,
        params: [
          patientId,
          `Payment plan created: $${monthlyPayment}/month for ${paymentsRemaining} payments`,
          req.user?.name || 'System'
        ]
      }
    ];
    
    const results = await executeTransaction(queries);
    
    sendSuccessResponse(res, { id: results[0].insertId }, 'Payment plan created successfully', 201);
    
  } catch (error) {
    // Check if it's already a formatted error
    if (error.isOperational) {
      handleControllerError(error, res, req);
    } else {
      const dbError = formatDatabaseError(error);
      handleControllerError(dbError, res, req);
    }
  }
};

// Get collection activities
const getCollectionActivities = async (req, res) => {
  try {
    const { patientId, page = 1, limit = 50 } = req.query;
    
    let baseQuery = `
      SELECT 
        ca.id,
        ca.patient_id as patientId,
        ca.activity_type as activityType,
        ca.activity_date as activityDate,
        ca.description,
        ca.outcome,
        ca.next_action as nextAction,
        ca.next_action_date as nextActionDate,
        ca.performed_by as performedBy,
        ca.notes
      FROM collection_activities ca
    `;
    
    let countQuery = `SELECT COUNT(*) as total FROM collection_activities ca`;
    const params = [];
    
    if (patientId) {
      const whereClause = ' WHERE ca.patient_id = ?';
      baseQuery += whereClause;
      countQuery += whereClause;
      params.push(patientId);
    }
    
    baseQuery += ' ORDER BY ca.activity_date DESC';
    
    const result = await executeQueryWithPagination(
      baseQuery,
      countQuery,
      params,
      { page: parseInt(page), limit: parseInt(limit) }
    );
    
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
    
  } catch (error) {
    console.error('Error fetching collection activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection activities',
      error: error.message
    });
  }
};

// Log collection activity
const logCollectionActivity = async (req, res) => {
  try {
    const {
      patientId,
      activityType,
      description,
      outcome,
      nextAction,
      nextActionDate,
      notes
    } = req.body;
    
    if (!patientId || !activityType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Prepare transaction queries
    const queries = [
      {
        query: `
          INSERT INTO collection_activities (
            patient_id,
            activity_type,
            activity_date,
            description,
            outcome,
            next_action,
            next_action_date,
            performed_by,
            notes
          ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?)
        `,
        params: [
          patientId,
          activityType,
          description,
          outcome || null,
          nextAction || null,
          nextActionDate || null,
          req.user?.name || 'System',
          notes || null
        ]
      },
      {
        query: `
          UPDATE patient_accounts 
          SET contact_attempts = contact_attempts + 1,
              last_contact_date = NOW(),
              updated_date = NOW()
          WHERE patient_id = ?
        `,
        params: [patientId]
      }
    ];
    
    // Add conditional query for payment received outcome
    if (outcome === 'payment_received') {
      queries.push({
        query: `
          UPDATE patient_accounts 
          SET collection_status = 'resolved',
              updated_date = NOW()
          WHERE patient_id = ? AND total_balance <= 0
        `,
        params: [patientId]
      });
    }
    
    const results = await executeTransaction(queries);
    
    res.json({
      success: true,
      message: 'Collection activity logged successfully',
      data: { id: results[0].insertId }
    });
    
  } catch (error) {
    console.error('Error logging collection activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log collection activity',
      error: error.message
    });
  }
};

// Update payment plan
const updatePaymentPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      monthlyPayment,
      nextPaymentDate,
      autoPayEnabled,
      status,
      notes
    } = req.body;
    
    const updateQuery = `
      UPDATE payment_plans 
      SET monthly_payment = COALESCE(?, monthly_payment),
          next_payment_date = COALESCE(?, next_payment_date),
          auto_pay_enabled = COALESCE(?, auto_pay_enabled),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_date = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      monthlyPayment,
      nextPaymentDate,
      autoPayEnabled !== undefined ? (autoPayEnabled ? 1 : 0) : null,
      status,
      notes,
      id
    ]);
    
    res.json({
      success: true,
      message: 'Payment plan updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating payment plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment plan',
      error: error.message
    });
  }
};

// Get collections analytics
const getCollectionsAnalytics = async (req, res) => {
  try {
    // Execute all queries in parallel for better performance
    const [agingData, performanceData, paymentPlanData, activityData] = await Promise.all([
      // Get aging summary
      executeQuery(`
        SELECT 
          COUNT(*) as total_accounts,
          SUM(total_balance) as total_balance,
          SUM(aging_0_30) as aging_30,
          SUM(aging_31_60) as aging_60,
          SUM(aging_61_90) as aging_90,
          SUM(aging_91_plus) as aging_120_plus
        FROM patient_accounts 
        WHERE total_balance > 0
      `),
      
      // Get collection performance
      executeQuery(`
        SELECT 
          collection_status,
          COUNT(*) as count,
          SUM(total_balance) as balance
        FROM patient_accounts 
        WHERE total_balance > 0
        GROUP BY collection_status
      `),
      
      // Get payment plan stats
      executeQuery(`
        SELECT 
          status,
          COUNT(*) as count,
          SUM(remaining_balance) as total_remaining
        FROM payment_plans
        GROUP BY status
      `),
      
      // Get recent activity summary
      executeQuery(`
        SELECT 
          activity_type,
          outcome,
          COUNT(*) as count
        FROM collection_activities 
        WHERE activity_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY activity_type, outcome
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        aging: agingData[0] || {},
        performance: performanceData,
        paymentPlans: paymentPlanData,
        recentActivity: activityData
      }
    });
    
  } catch (error) {
    console.error('Error fetching collections analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collections analytics',
      error: error.message
    });
  }
};

module.exports = {
  getPatientAccounts,
  getPaymentPlans,
  createPaymentPlan,
  updatePaymentPlan,
  getCollectionActivities,
  logCollectionActivity,
  getCollectionsAnalytics
};