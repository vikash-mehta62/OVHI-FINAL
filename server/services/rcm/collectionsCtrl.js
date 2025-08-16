const mysql = require('mysql2/promise');
const dbConfig = require('../../config/db');

// Get patient accounts for collections
const getPatientAccounts = async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const query = `
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
    `;
    
    const [accounts] = await connection.execute(query);
    
    res.json({
      success: true,
      data: accounts
    });
    
  } catch (error) {
    console.error('Error fetching patient accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient accounts',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get payment plans
const getPaymentPlans = async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
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
    
    const [plans] = await connection.execute(query);
    
    res.json({
      success: true,
      data: plans
    });
    
  } catch (error) {
    console.error('Error fetching payment plans:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment plans',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Create payment plan
const createPaymentPlan = async (req, res) => {
  let connection;
  
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
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    
    // Calculate payments remaining
    const paymentsRemaining = Math.ceil(totalAmount / monthlyPayment);
    
    // Insert payment plan
    const insertQuery = `
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
    `;
    
    const [result] = await connection.execute(insertQuery, [
      patientId,
      totalAmount,
      monthlyPayment,
      totalAmount, // Initial remaining balance
      startDate,
      paymentsRemaining,
      autoPayEnabled ? 1 : 0,
      notes || null
    ]);
    
    // Update patient account status
    const updateAccountQuery = `
      UPDATE patient_accounts 
      SET collection_status = 'payment_plan',
          updated_date = NOW()
      WHERE patient_id = ?
    `;
    
    await connection.execute(updateAccountQuery, [patientId]);
    
    // Log collection activity
    const activityQuery = `
      INSERT INTO collection_activities (
        patient_id,
        activity_type,
        activity_date,
        description,
        outcome,
        next_action,
        performed_by
      ) VALUES (?, 'payment_plan_setup', NOW(), ?, 'successful', 'monitor_payments', ?)
    `;
    
    const description = `Payment plan created: $${monthlyPayment}/month for ${paymentsRemaining} payments`;
    await connection.execute(activityQuery, [
      patientId,
      description,
      req.user?.name || 'System'
    ]);
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Payment plan created successfully',
      data: { id: result.insertId }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error creating payment plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment plan',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get collection activities
const getCollectionActivities = async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    const { patientId, limit = 50 } = req.query;
    
    let query = `
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
    
    const params = [];
    
    if (patientId) {
      query += ' WHERE ca.patient_id = ?';
      params.push(patientId);
    }
    
    query += ' ORDER BY ca.activity_date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [activities] = await connection.execute(query, params);
    
    res.json({
      success: true,
      data: activities
    });
    
  } catch (error) {
    console.error('Error fetching collection activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection activities',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Log collection activity
const logCollectionActivity = async (req, res) => {
  let connection;
  
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
    
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();
    
    // Insert activity
    const insertQuery = `
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
    `;
    
    const [result] = await connection.execute(insertQuery, [
      patientId,
      activityType,
      description,
      outcome || null,
      nextAction || null,
      nextActionDate || null,
      req.user?.name || 'System',
      notes || null
    ]);
    
    // Update patient account contact attempts
    const updateQuery = `
      UPDATE patient_accounts 
      SET contact_attempts = contact_attempts + 1,
          last_contact_date = NOW(),
          updated_date = NOW()
      WHERE patient_id = ?
    `;
    
    await connection.execute(updateQuery, [patientId]);
    
    // Update collection status based on outcome
    if (outcome === 'payment_received') {
      const statusQuery = `
        UPDATE patient_accounts 
        SET collection_status = 'resolved',
            updated_date = NOW()
        WHERE patient_id = ? AND total_balance <= 0
      `;
      await connection.execute(statusQuery, [patientId]);
    }
    
    await connection.commit();
    
    res.json({
      success: true,
      message: 'Collection activity logged successfully',
      data: { id: result.insertId }
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error logging collection activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log collection activity',
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Update payment plan
const updatePaymentPlan = async (req, res) => {
  let connection;
  
  try {
    const { id } = req.params;
    const {
      monthlyPayment,
      nextPaymentDate,
      autoPayEnabled,
      status,
      notes
    } = req.body;
    
    connection = await mysql.createConnection(dbConfig);
    
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
    
    await connection.execute(updateQuery, [
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
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// Get collections analytics
const getCollectionsAnalytics = async (req, res) => {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    
    // Get aging summary
    const agingQuery = `
      SELECT 
        COUNT(*) as total_accounts,
        SUM(total_balance) as total_balance,
        SUM(aging_0_30) as aging_30,
        SUM(aging_31_60) as aging_60,
        SUM(aging_61_90) as aging_90,
        SUM(aging_91_plus) as aging_120_plus
      FROM patient_accounts 
      WHERE total_balance > 0
    `;
    
    const [agingData] = await connection.execute(agingQuery);
    
    // Get collection performance
    const performanceQuery = `
      SELECT 
        collection_status,
        COUNT(*) as count,
        SUM(total_balance) as balance
      FROM patient_accounts 
      WHERE total_balance > 0
      GROUP BY collection_status
    `;
    
    const [performanceData] = await connection.execute(performanceQuery);
    
    // Get payment plan stats
    const paymentPlanQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(remaining_balance) as total_remaining
      FROM payment_plans
      GROUP BY status
    `;
    
    const [paymentPlanData] = await connection.execute(paymentPlanQuery);
    
    // Get recent activity summary
    const activityQuery = `
      SELECT 
        activity_type,
        outcome,
        COUNT(*) as count
      FROM collection_activities 
      WHERE activity_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY activity_type, outcome
    `;
    
    const [activityData] = await connection.execute(activityQuery);
    
    res.json({
      success: true,
      data: {
        aging: agingData[0],
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
  } finally {
    if (connection) {
      await connection.end();
    }
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