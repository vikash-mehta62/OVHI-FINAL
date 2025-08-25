/**
 * Consolidated RCM Service
 * Merges duplicate functions from rcmCtrl.js, collectionsCtrl.js, and eraProcessingCtrl.js
 * Provides unified business logic for all RCM operations
 */

const RCMService = require('./rcmService');
const {
  executeQuery,
  executeTransaction,
  executeQueryWithPagination,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  executeTransaction: executeAdvancedTransaction,
  executeBatch,
  transactional,
  IsolationLevels
} = require('../../utils/transactionManager');
const {
  formatCurrency,
  formatDate,
  calculateDaysInAR,
  validateClaimData,
  calculateCollectionRate,
  calculateDenialRate,
  getAgingBucket,
  getCollectabilityScore,
  getClaimRecommendations
} = require('../../utils/rcmUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const {
  ResponseFormatter,
  PaginationMeta
} = require('../../utils/standardizedResponse');

/**
 * Consolidated RCM Service Class
 * Extends the base RCMService with additional consolidated functionality
 */
class ConsolidatedRCMService extends RCMService {
  constructor() {
    super();
    this.name = 'ConsolidatedRCMService';
  }

  /**
   * ERA Processing - Consolidated from multiple implementations
   * @param {Object} options - ERA processing options
   * @returns {Object} Processing results
   */
  async processERAFile(options = {}) {
    const {
      eraData,
      fileName,
      autoPost = false,
      userId
    } = options;

    try {
      // Validate input
      if (!eraData || !fileName) {
        throw createValidationError('ERA data and filename are required');
      }

      // Parse ERA data (X12 835 format)
      const parsedERA = await this.parseERAData(eraData);
      
      // Execute advanced transaction for atomic processing with rollback handling
      const result = await executeAdvancedTransaction(async (connection, context) => {
        // Create savepoint for ERA record creation
        await context.createSavepoint('era_record');
        
        // Store ERA record
        const eraRecord = await context.execute(`
          INSERT INTO era_files 
          (provider_id, file_name, file_size, total_payments, total_adjustments, status, processed_date, auto_posted)
          VALUES (?, ?, ?, ?, ?, 'processed', NOW(), ?)
        `, [
          userId, 
          fileName, 
          eraData.length, 
          parsedERA.totalPayments, 
          parsedERA.totalAdjustments,
          autoPost
        ]);

        const eraId = eraRecord.insertId;
        const processedPayments = [];
        let autoPostedCount = 0;

        // Process individual payment details with batch operations
        const paymentOperations = parsedERA.payments.map((payment, index) => ({
          query: `
            INSERT INTO era_payment_details 
            (era_file_id, claim_id, patient_id, service_date, billed_amount, paid_amount, 
             adjustment_amount, reason_codes, check_number, payer_name, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
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
            autoPost ? 'auto_posted' : 'pending'
          ]
        }));

        // Execute batch insert for payment details
        const paymentResults = await context.executeBatch(paymentOperations);

        // Process auto-posting for valid payments
        for (let i = 0; i < parsedERA.payments.length; i++) {
          const payment = parsedERA.payments[i];
          const paymentDetailId = paymentResults[i].insertId;

          // Auto-post if enabled and payment is valid
          if (autoPost && payment.paid_amount > 0) {
            try {
              // Create savepoint for auto-posting
              await context.createSavepoint(`autopost_${i}`);
              
              const autoPostResult = await this.autoPostPayment(payment, userId, context);
              if (autoPostResult.success) {
                autoPostedCount++;
                
                // Update payment detail status
                await context.execute(`
                  UPDATE era_payment_details 
                  SET status = 'auto_posted', posted_date = NOW()
                  WHERE id = ?
                `, [paymentDetailId]);
              }
            } catch (autoPostError) {
              // Rollback to savepoint if auto-posting fails
              await context.rollbackToSavepoint(`autopost_${i}`);
              console.warn(`Auto-posting failed for payment ${i}:`, autoPostError.message);
            }
          }

          processedPayments.push({
            ...payment,
            era_detail_id: paymentDetailId,
            auto_posted: autoPost && payment.paid_amount > 0
          });
        }

        // Log audit trail
        await auditLog({
          table_name: 'era_files',
          record_id: eraId,
          action: 'PROCESS',
          old_values: null,
          new_values: JSON.stringify({
            fileName,
            totalPayments: parsedERA.totalPayments,
            processedCount: parsedERA.payments.length,
            autoPostedCount
          }),
          user_id: userId,
          timestamp: new Date()
        });

        return {
          eraId,
          fileName,
          totalPayments: parsedERA.totalPayments,
          totalAdjustments: parsedERA.totalAdjustments,
          processedCount: parsedERA.payments.length,
          autoPostedCount,
          payments: processedPayments
        };
      });

      return result;

    } catch (error) {
      throw createDatabaseError('Failed to process ERA file', {
        originalError: error.message,
        fileName,
        userId
      });
    }
  }

  /**
   * Payment Posting - Consolidated payment posting logic
   * @param {Object} options - Payment posting options
   * @returns {Object} Payment posting results
   */
  async postPayment(options = {}) {
    const {
      claimId,
      paymentAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      adjustmentAmount = 0,
      adjustmentReason,
      userId
    } = options;

    try {
      // Validate input
      if (!claimId || !paymentAmount || !paymentDate) {
        throw createValidationError('Claim ID, payment amount, and payment date are required');
      }

      // Get claim details
      const claim = await executeQuerySingle(
        'SELECT * FROM billings WHERE id = ?',
        [claimId]
      );

      if (!claim) {
        throw createNotFoundError('Claim not found');
      }

      // Execute payment posting with advanced transaction handling
      const result = await executeAdvancedTransaction(async (connection, context) => {
        // Create savepoint for payment record
        await context.createSavepoint('payment_record');
        
        // Insert payment record
        const paymentRecord = await context.execute(`
          INSERT INTO payments 
          (claim_id, patient_id, payment_amount, payment_date, payment_method, 
           check_number, adjustment_amount, adjustment_reason, posted_by, posted_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          claimId,
          claim.patient_id,
          paymentAmount,
          paymentDate,
          paymentMethod,
          checkNumber,
          adjustmentAmount,
          adjustmentReason,
          userId
        ]);

        // Create savepoint for claim updates
        await context.createSavepoint('claim_updates');
        
        // Update claim status and amounts
        const newPaidAmount = (claim.paid_amount || 0) + parseFloat(paymentAmount);
        const newOutstandingAmount = claim.total_amount - newPaidAmount;
        const newStatus = newOutstandingAmount <= 0 ? 2 : 1; // 2 = Paid, 1 = Partially Paid

        await context.execute(`
          UPDATE billings 
          SET paid_amount = ?, 
              outstanding_amount = ?, 
              status = ?,
              updated = NOW()
          WHERE id = ?
        `, [newPaidAmount, newOutstandingAmount, newStatus, claimId]);

        // Create savepoint for patient account updates
        await context.createSavepoint('patient_account_updates');
        
        // Update patient account balance
        await context.execute(`
          UPDATE patient_accounts 
          SET total_balance = total_balance - ?,
              last_payment_date = ?,
              updated_date = NOW()
          WHERE patient_id = ?
        `, [paymentAmount, paymentDate, claim.patient_id]);

        // Log audit trail
        await auditLog({
          table_name: 'billings',
          record_id: claimId,
          action: 'PAYMENT_POST',
          old_values: JSON.stringify({
            paid_amount: claim.paid_amount,
            outstanding_amount: claim.outstanding_amount,
            status: claim.status
          }),
          new_values: JSON.stringify({
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstandingAmount,
            status: newStatus,
            payment_amount: paymentAmount
          }),
          user_id: userId,
          timestamp: new Date()
        });

        return {
          paymentId: paymentRecord.insertId,
          claimId,
          paymentAmount,
          newPaidAmount,
          newOutstandingAmount,
          newStatus
        };
      });

      return result;

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to post payment', {
        originalError: error.message,
        claimId,
        paymentAmount
      });
    }
  }

  /**
   * Collections Workflow - Consolidated collections management
   * @param {Object} options - Collections options
   * @returns {Object} Collections data
   */
  async getCollectionsWorkflow(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      priority = 'all',
      agingBucket = 'all'
    } = options;

    try {
      let whereConditions = ['pa.total_balance > 0'];
      let queryParams = [];

      // Status filter
      if (status !== 'all') {
        whereConditions.push('pa.collection_status = ?');
        queryParams.push(status);
      }

      // Priority filter
      if (priority !== 'all') {
        whereConditions.push('pa.priority = ?');
        queryParams.push(priority);
      }

      // Aging bucket filter
      if (agingBucket !== 'all') {
        switch (agingBucket) {
          case '0-30':
            whereConditions.push('pa.aging_0_30 > 0');
            break;
          case '31-60':
            whereConditions.push('pa.aging_31_60 > 0');
            break;
          case '61-90':
            whereConditions.push('pa.aging_61_90 > 0');
            break;
          case '90+':
            whereConditions.push('pa.aging_91_plus > 0');
            break;
        }
      }

      const whereClause = whereConditions.join(' AND ');

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
        WHERE ${whereClause}
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

      const result = await executeQueryWithPagination(query, queryParams, page, limit);

      // Format response using standardized formatter
      const formattedAccounts = ResponseFormatter.collections(result.data, {
        status,
        priority,
        agingBucket
      });

      return {
        ...formattedAccounts,
        pagination: result.pagination
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch collections workflow', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Update Collection Status - Consolidated collection status management
   * @param {number} accountId - Account ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated account data
   */
  async updateCollectionStatus(accountId, updateData) {
    const {
      status,
      priority,
      assignedCollector,
      notes,
      userId
    } = updateData;

    try {
      // Validate account exists
      const existingAccount = await executeQuerySingle(
        'SELECT * FROM patient_accounts WHERE id = ?',
        [accountId]
      );

      if (!existingAccount) {
        throw createNotFoundError('Patient account not found');
      }

      // Execute update with advanced transaction handling and isolation
      const result = await executeAdvancedTransaction(async (connection, context) => {
        // Acquire lock on patient account to prevent concurrent updates
        const lockAcquired = await context.acquireLock(`patient_account_${accountId}`, 10);
        if (!lockAcquired) {
          throw createDatabaseError('Failed to acquire lock on patient account');
        }

        try {
          // Create savepoint for account update
          await context.createSavepoint('account_update');
          
          // Update account
          const updateQuery = `
            UPDATE patient_accounts 
            SET collection_status = COALESCE(?, collection_status),
                priority = COALESCE(?, priority),
                assigned_collector = COALESCE(?, assigned_collector),
                updated_date = NOW()
            WHERE id = ?
          `;

          await context.execute(updateQuery, [status, priority, assignedCollector, accountId]);

          // Create savepoint for activity logging
          await context.createSavepoint('activity_log');
          
          // Log collection activity
          if (notes || status) {
            await context.execute(`
              INSERT INTO collection_activities (
                patient_id,
                activity_type,
                activity_date,
                description,
                outcome,
                performed_by,
                notes
              ) VALUES (?, 'status_update', NOW(), ?, 'updated', ?, ?)
            `, [
              existingAccount.patient_id,
              `Collection status updated to ${status || existingAccount.collection_status}`,
              userId,
              notes
            ]);
          }
        } finally {
          // Release the lock
          await context.releaseLock(`patient_account_${accountId}`);
        }

        // Log audit trail
        await auditLog({
          table_name: 'patient_accounts',
          record_id: accountId,
          action: 'UPDATE',
          old_values: JSON.stringify({
            collection_status: existingAccount.collection_status,
            priority: existingAccount.priority,
            assigned_collector: existingAccount.assigned_collector
          }),
          new_values: JSON.stringify({
            collection_status: status || existingAccount.collection_status,
            priority: priority || existingAccount.priority,
            assigned_collector: assignedCollector || existingAccount.assigned_collector
          }),
          user_id: userId,
          timestamp: new Date()
        });

        return { accountId, status, priority, assignedCollector };
      });

      return result;

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to update collection status', {
        originalError: error.message,
        accountId,
        updateData
      });
    }
  }

  /**
   * Get Payment Posting Data - Consolidated payment data retrieval
   * @param {Object} options - Query options
   * @returns {Object} Payment posting data
   */
  async getPaymentPostingData(options = {}) {
    const {
      page = 1,
      limit = 10,
      dateFrom,
      dateTo,
      paymentMethod = 'all',
      status = 'all'
    } = options;

    try {
      let whereConditions = ['1=1'];
      let queryParams = [];

      // Date range filter
      if (dateFrom) {
        whereConditions.push('DATE(p.payment_date) >= ?');
        queryParams.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push('DATE(p.payment_date) <= ?');
        queryParams.push(dateTo);
      }

      // Payment method filter
      if (paymentMethod !== 'all') {
        whereConditions.push('p.payment_method = ?');
        queryParams.push(paymentMethod);
      }

      // Status filter
      if (status !== 'all') {
        whereConditions.push('p.status = ?');
        queryParams.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          p.id,
          p.claim_id as claimId,
          p.patient_id as patientId,
          CONCAT(pt.first_name, ' ', pt.last_name) as patientName,
          p.payment_amount as paymentAmount,
          p.payment_date as paymentDate,
          p.payment_method as paymentMethod,
          p.check_number as checkNumber,
          p.adjustment_amount as adjustmentAmount,
          p.adjustment_reason as adjustmentReason,
          p.posted_date as postedDate,
          p.posted_by as postedBy,
          b.total_amount as claimAmount,
          b.procedure_code as procedureCode
        FROM payments p
        LEFT JOIN billings b ON p.claim_id = b.id
        LEFT JOIN patients pt ON p.patient_id = pt.id
        WHERE ${whereClause}
        ORDER BY p.posted_date DESC
      `;

      const result = await executeQueryWithPagination(query, queryParams, page, limit);

      // Format response using standardized formatter
      const formattedPayments = ResponseFormatter.payments(result.data, {
        dateFrom,
        dateTo,
        paymentMethod,
        status
      });

      return {
        ...formattedPayments,
        pagination: result.pagination
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch payment posting data', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Helper method to parse ERA data
   * @private
   */
  async parseERAData(eraData) {
    // Simplified ERA parsing logic
    // In a real implementation, this would parse X12 835 format
    const payments = [];
    let totalPayments = 0;
    let totalAdjustments = 0;

    // Mock parsing logic - replace with actual X12 parser
    const lines = eraData.split('\n');
    for (const line of lines) {
      if (line.startsWith('CLP')) {
        // Claim payment information
        const segments = line.split('*');
        const payment = {
          claim_id: segments[1],
          patient_id: segments[2] || null,
          service_date: segments[3] || new Date().toISOString().split('T')[0],
          billed_amount: parseFloat(segments[4]) || 0,
          paid_amount: parseFloat(segments[5]) || 0,
          adjustment_amount: parseFloat(segments[6]) || 0,
          reason_codes: segments[7] ? segments[7].split(',') : [],
          check_number: segments[8] || null,
          payer_name: segments[9] || 'Unknown Payer'
        };
        
        payments.push(payment);
        totalPayments += payment.paid_amount;
        totalAdjustments += payment.adjustment_amount;
      }
    }

    return {
      payments,
      totalPayments,
      totalAdjustments
    };
  }

  /**
   * Helper method to auto-post payment
   * @private
   */
  async autoPostPayment(payment, userId, connection) {
    try {
      // Validate claim exists
      const claim = await connection.execute(
        'SELECT * FROM billings WHERE id = ?',
        [payment.claim_id]
      );

      if (!claim[0] || claim[0].length === 0) {
        return { success: false, reason: 'Claim not found' };
      }

      // Post payment using existing logic
      await this.postPayment({
        claimId: payment.claim_id,
        paymentAmount: payment.paid_amount,
        paymentDate: payment.service_date,
        paymentMethod: 'ERA',
        checkNumber: payment.check_number,
        adjustmentAmount: payment.adjustment_amount,
        adjustmentReason: payment.reason_codes.join(', '),
        userId
      });

      return { success: true };

    } catch (error) {
      return { success: false, reason: error.message };
    }
  }
}

module.exports = ConsolidatedRCMService;