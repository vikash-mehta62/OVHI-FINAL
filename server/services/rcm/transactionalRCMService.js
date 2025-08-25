/**
 * Transactional RCM Service
 * Enhanced RCM service with comprehensive transaction handling
 * Implements atomic operations with proper rollback mechanisms
 */

const ConsolidatedRCMService = require('./consolidatedRCMService');
const {
  executeTransaction,
  executeBatch,
  transactional,
  IsolationLevels,
  TransactionStatus
} = require('../../utils/transactionManager');
const {
  executeQuery,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');

/**
 * Transactional RCM Service Class
 * Extends ConsolidatedRCMService with enhanced transaction handling
 */
class TransactionalRCMService extends ConsolidatedRCMService {
  constructor() {
    super();
    this.name = 'TransactionalRCMService';
  }

  /**
   * Bulk Update Claim Status with Transaction Support
   * @param {Array} claimIds - Array of claim IDs
   * @param {Object} updateData - Update data
   * @returns {Object} Bulk update results
   */
  @transactional({
    isolationLevel: IsolationLevels.READ_COMMITTED,
    timeout: 60000, // 1 minute timeout for bulk operations
    retryAttempts: 3,
    savepoints: true
  })
  async bulkUpdateClaimStatus(claimIds, updateData) {
    const { status, notes, userId } = updateData;

    try {
      // Validate input
      if (!Array.isArray(claimIds) || claimIds.length === 0) {
        throw createValidationError('Claim IDs array is required');
      }

      return await executeTransaction(async (connection, context) => {
        const results = [];
        const failedUpdates = [];

        // Process each claim with individual savepoints
        for (let i = 0; i < claimIds.length; i++) {
          const claimId = claimIds[i];
          const savepointName = `claim_update_${i}`;

          try {
            // Create savepoint for this claim
            await context.createSavepoint(savepointName);

            // Validate claim exists and get current data
            const existingClaim = await context.execute(
              'SELECT * FROM billings WHERE id = ?',
              [claimId]
            );

            if (!existingClaim || existingClaim.length === 0) {
              throw new Error(`Claim ${claimId} not found`);
            }

            const claim = existingClaim[0];

            // Update claim status
            await context.execute(`
              UPDATE billings 
              SET status = ?, notes = ?, updated = NOW()
              WHERE id = ?
            `, [status, notes || '', claimId]);

            // Update related patient account if status affects balance
            if (status === 2) { // Paid status
              await context.execute(`
                UPDATE patient_accounts 
                SET total_balance = total_balance - ?,
                    last_payment_date = NOW(),
                    updated_date = NOW()
                WHERE patient_id = ?
              `, [claim.total_amount, claim.patient_id]);
            }

            // Log audit trail
            await auditLog({
              table_name: 'billings',
              record_id: claimId,
              action: 'BULK_UPDATE',
              old_values: JSON.stringify({ status: claim.status }),
              new_values: JSON.stringify({ status, notes }),
              user_id: userId,
              timestamp: new Date()
            });

            // Release savepoint on success
            await context.releaseSavepoint(savepointName);

            results.push({
              claimId,
              success: true,
              previousStatus: claim.status,
              newStatus: status
            });

          } catch (error) {
            // Rollback to savepoint on failure
            await context.rollbackToSavepoint(savepointName);
            
            failedUpdates.push({
              claimId,
              success: false,
              error: error.message
            });

            console.warn(`Failed to update claim ${claimId}:`, error.message);
          }
        }

        return {
          results: [...results, ...failedUpdates],
          summary: {
            total: claimIds.length,
            successful: results.length,
            failed: failedUpdates.length
          }
        };
      });

    } catch (error) {
      throw createDatabaseError('Failed to bulk update claim status', {
        originalError: error.message,
        claimIds: claimIds.slice(0, 10), // Log first 10 IDs only
        updateData
      });
    }
  }

  /**
   * Process Batch Payments with Transaction Support
   * @param {Array} payments - Array of payment objects
   * @param {Object} options - Processing options
   * @returns {Object} Batch processing results
   */
  async processBatchPayments(payments, options = {}) {
    const { userId, validateClaims = true, autoReconcile = false } = options;

    try {
      // Validate input
      if (!Array.isArray(payments) || payments.length === 0) {
        throw createValidationError('Payments array is required');
      }

      return await executeTransaction(async (connection, context) => {
        const results = [];
        const failedPayments = [];
        let totalProcessed = 0;
        let totalAmount = 0;

        // Create main savepoint for batch operation
        await context.createSavepoint('batch_payments');

        for (let i = 0; i < payments.length; i++) {
          const payment = payments[i];
          const paymentSavepoint = `payment_${i}`;

          try {
            // Create savepoint for individual payment
            await context.createSavepoint(paymentSavepoint);

            // Validate claim if required
            if (validateClaims) {
              const claim = await context.execute(
                'SELECT * FROM billings WHERE id = ?',
                [payment.claimId]
              );

              if (!claim || claim.length === 0) {
                throw new Error(`Claim ${payment.claimId} not found`);
              }

              // Check if claim is in valid state for payment
              if (claim[0].status === 2) { // Already paid
                throw new Error(`Claim ${payment.claimId} is already paid`);
              }
            }

            // Process payment using existing method
            const paymentResult = await this.processIndividualPayment(payment, userId, context);

            // Auto-reconcile if enabled
            if (autoReconcile) {
              await this.reconcilePayment(paymentResult.paymentId, context);
            }

            // Release savepoint on success
            await context.releaseSavepoint(paymentSavepoint);

            results.push({
              ...paymentResult,
              success: true,
              index: i
            });

            totalProcessed++;
            totalAmount += parseFloat(payment.paymentAmount);

          } catch (error) {
            // Rollback to savepoint on failure
            await context.rollbackToSavepoint(paymentSavepoint);

            failedPayments.push({
              index: i,
              claimId: payment.claimId,
              success: false,
              error: error.message,
              payment: payment
            });

            console.warn(`Failed to process payment ${i}:`, error.message);
          }
        }

        // Log batch processing audit
        await auditLog({
          table_name: 'payments',
          record_id: null,
          action: 'BATCH_PROCESS',
          old_values: null,
          new_values: JSON.stringify({
            totalPayments: payments.length,
            processedCount: totalProcessed,
            failedCount: failedPayments.length,
            totalAmount
          }),
          user_id: userId,
          timestamp: new Date()
        });

        return {
          results: [...results, ...failedPayments],
          summary: {
            total: payments.length,
            successful: totalProcessed,
            failed: failedPayments.length,
            totalAmount
          }
        };
      }, {
        isolationLevel: IsolationLevels.READ_COMMITTED,
        timeout: 120000, // 2 minutes for batch operations
        retryAttempts: 2
      });

    } catch (error) {
      throw createDatabaseError('Failed to process batch payments', {
        originalError: error.message,
        paymentCount: payments.length
      });
    }
  }

  /**
   * Transfer Patient Balance with Transaction Support
   * @param {number} fromPatientId - Source patient ID
   * @param {number} toPatientId - Target patient ID
   * @param {number} amount - Amount to transfer
   * @param {Object} options - Transfer options
   * @returns {Object} Transfer results
   */
  async transferPatientBalance(fromPatientId, toPatientId, amount, options = {}) {
    const { userId, reason, notes } = options;

    try {
      // Validate input
      if (!fromPatientId || !toPatientId || !amount || amount <= 0) {
        throw createValidationError('Valid patient IDs and positive amount are required');
      }

      if (fromPatientId === toPatientId) {
        throw createValidationError('Cannot transfer balance to the same patient');
      }

      return await executeTransaction(async (connection, context) => {
        // Acquire locks on both patient accounts to prevent concurrent modifications
        const fromLockAcquired = await context.acquireLock(`patient_${fromPatientId}`, 10);
        const toLockAcquired = await context.acquireLock(`patient_${toPatientId}`, 10);

        if (!fromLockAcquired || !toLockAcquired) {
          throw createDatabaseError('Failed to acquire locks on patient accounts');
        }

        try {
          // Create savepoint for balance verification
          await context.createSavepoint('balance_verification');

          // Get current balances
          const fromAccount = await context.execute(
            'SELECT * FROM patient_accounts WHERE patient_id = ?',
            [fromPatientId]
          );

          const toAccount = await context.execute(
            'SELECT * FROM patient_accounts WHERE patient_id = ?',
            [toPatientId]
          );

          if (!fromAccount || fromAccount.length === 0) {
            throw createNotFoundError(`Patient account ${fromPatientId} not found`);
          }

          if (!toAccount || toAccount.length === 0) {
            throw createNotFoundError(`Patient account ${toPatientId} not found`);
          }

          const fromBalance = parseFloat(fromAccount[0].total_balance);
          const toBalance = parseFloat(toAccount[0].total_balance);

          // Validate sufficient balance
          if (fromBalance < amount) {
            throw createValidationError(`Insufficient balance. Available: ${fromBalance}, Requested: ${amount}`);
          }

          // Create savepoint for balance updates
          await context.createSavepoint('balance_updates');

          // Update source account
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = total_balance - ?,
                updated_date = NOW()
            WHERE patient_id = ?
          `, [amount, fromPatientId]);

          // Update target account
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = total_balance + ?,
                updated_date = NOW()
            WHERE patient_id = ?
          `, [amount, toPatientId]);

          // Create savepoint for transaction logging
          await context.createSavepoint('transaction_logging');

          // Log balance transfer transaction
          const transferId = await context.execute(`
            INSERT INTO balance_transfers (
              from_patient_id,
              to_patient_id,
              amount,
              reason,
              notes,
              processed_by,
              processed_date,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'completed')
          `, [fromPatientId, toPatientId, amount, reason, notes, userId]);

          // Log audit trail for both accounts
          await auditLog({
            table_name: 'patient_accounts',
            record_id: fromPatientId,
            action: 'BALANCE_TRANSFER_OUT',
            old_values: JSON.stringify({ total_balance: fromBalance }),
            new_values: JSON.stringify({ total_balance: fromBalance - amount }),
            user_id: userId,
            timestamp: new Date()
          });

          await auditLog({
            table_name: 'patient_accounts',
            record_id: toPatientId,
            action: 'BALANCE_TRANSFER_IN',
            old_values: JSON.stringify({ total_balance: toBalance }),
            new_values: JSON.stringify({ total_balance: toBalance + amount }),
            user_id: userId,
            timestamp: new Date()
          });

          return {
            transferId: transferId.insertId,
            fromPatientId,
            toPatientId,
            amount,
            fromBalanceBefore: fromBalance,
            fromBalanceAfter: fromBalance - amount,
            toBalanceBefore: toBalance,
            toBalanceAfter: toBalance + amount,
            processedAt: new Date().toISOString()
          };

        } finally {
          // Release locks
          await context.releaseLock(`patient_${fromPatientId}`);
          await context.releaseLock(`patient_${toPatientId}`);
        }
      }, {
        isolationLevel: IsolationLevels.SERIALIZABLE, // Highest isolation for financial transactions
        timeout: 30000,
        retryAttempts: 3
      });

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to transfer patient balance', {
        originalError: error.message,
        fromPatientId,
        toPatientId,
        amount
      });
    }
  }

  /**
   * Reverse Payment with Transaction Support
   * @param {number} paymentId - Payment ID to reverse
   * @param {Object} options - Reversal options
   * @returns {Object} Reversal results
   */
  async reversePayment(paymentId, options = {}) {
    const { userId, reason, notes } = options;

    try {
      // Validate input
      if (!paymentId) {
        throw createValidationError('Payment ID is required');
      }

      return await executeTransaction(async (connection, context) => {
        // Create savepoint for payment verification
        await context.createSavepoint('payment_verification');

        // Get payment details
        const payment = await context.execute(
          'SELECT * FROM payments WHERE id = ? AND status != "reversed"',
          [paymentId]
        );

        if (!payment || payment.length === 0) {
          throw createNotFoundError('Payment not found or already reversed');
        }

        const paymentData = payment[0];

        // Get related claim
        const claim = await context.execute(
          'SELECT * FROM billings WHERE id = ?',
          [paymentData.claim_id]
        );

        if (!claim || claim.length === 0) {
          throw createNotFoundError('Related claim not found');
        }

        const claimData = claim[0];

        // Acquire lock on patient account
        const lockAcquired = await context.acquireLock(`patient_${paymentData.patient_id}`, 10);
        if (!lockAcquired) {
          throw createDatabaseError('Failed to acquire lock on patient account');
        }

        try {
          // Create savepoint for reversal operations
          await context.createSavepoint('payment_reversal');

          // Mark payment as reversed
          await context.execute(`
            UPDATE payments 
            SET status = 'reversed',
                reversal_reason = ?,
                reversal_notes = ?,
                reversed_by = ?,
                reversed_date = NOW(),
                updated = NOW()
            WHERE id = ?
          `, [reason, notes, userId, paymentId]);

          // Update claim amounts
          const newPaidAmount = (claimData.paid_amount || 0) - parseFloat(paymentData.payment_amount);
          const newOutstandingAmount = claimData.total_amount - newPaidAmount;
          const newStatus = newPaidAmount <= 0 ? 1 : (newOutstandingAmount <= 0 ? 2 : 1); // 1 = Submitted, 2 = Paid

          await context.execute(`
            UPDATE billings 
            SET paid_amount = ?,
                outstanding_amount = ?,
                status = ?,
                updated = NOW()
            WHERE id = ?
          `, [newPaidAmount, newOutstandingAmount, newStatus, paymentData.claim_id]);

          // Update patient account balance
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = total_balance + ?,
                updated_date = NOW()
            WHERE patient_id = ?
          `, [paymentData.payment_amount, paymentData.patient_id]);

          // Create reversal transaction record
          const reversalId = await context.execute(`
            INSERT INTO payment_reversals (
              original_payment_id,
              claim_id,
              patient_id,
              reversed_amount,
              reason,
              notes,
              processed_by,
              processed_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            paymentId,
            paymentData.claim_id,
            paymentData.patient_id,
            paymentData.payment_amount,
            reason,
            notes,
            userId
          ]);

          // Log audit trail
          await auditLog({
            table_name: 'payments',
            record_id: paymentId,
            action: 'REVERSE',
            old_values: JSON.stringify({ status: paymentData.status }),
            new_values: JSON.stringify({ 
              status: 'reversed',
              reason,
              notes
            }),
            user_id: userId,
            timestamp: new Date()
          });

          return {
            reversalId: reversalId.insertId,
            paymentId,
            claimId: paymentData.claim_id,
            patientId: paymentData.patient_id,
            reversedAmount: paymentData.payment_amount,
            reason,
            notes,
            processedAt: new Date().toISOString()
          };

        } finally {
          // Release lock
          await context.releaseLock(`patient_${paymentData.patient_id}`);
        }
      }, {
        isolationLevel: IsolationLevels.SERIALIZABLE,
        timeout: 30000,
        retryAttempts: 3
      });

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to reverse payment', {
        originalError: error.message,
        paymentId
      });
    }
  }

  /**
   * Process Individual Payment (Helper Method)
   * @private
   */
  async processIndividualPayment(payment, userId, context) {
    const {
      claimId,
      paymentAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      adjustmentAmount = 0,
      adjustmentReason
    } = payment;

    // Get claim details
    const claim = await context.execute(
      'SELECT * FROM billings WHERE id = ?',
      [claimId]
    );

    if (!claim || claim.length === 0) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const claimData = claim[0];

    // Insert payment record
    const paymentRecord = await context.execute(`
      INSERT INTO payments 
      (claim_id, patient_id, payment_amount, payment_date, payment_method, 
       check_number, adjustment_amount, adjustment_reason, posted_by, posted_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'posted')
    `, [
      claimId,
      claimData.patient_id,
      paymentAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      adjustmentAmount,
      adjustmentReason,
      userId
    ]);

    // Update claim status and amounts
    const newPaidAmount = (claimData.paid_amount || 0) + parseFloat(paymentAmount);
    const newOutstandingAmount = claimData.total_amount - newPaidAmount;
    const newStatus = newOutstandingAmount <= 0 ? 2 : 1; // 2 = Paid, 1 = Partially Paid

    await context.execute(`
      UPDATE billings 
      SET paid_amount = ?, 
          outstanding_amount = ?, 
          status = ?,
          updated = NOW()
      WHERE id = ?
    `, [newPaidAmount, newOutstandingAmount, newStatus, claimId]);

    // Update patient account balance
    await context.execute(`
      UPDATE patient_accounts 
      SET total_balance = total_balance - ?,
          last_payment_date = ?,
          updated_date = NOW()
      WHERE patient_id = ?
    `, [paymentAmount, paymentDate, claimData.patient_id]);

    return {
      paymentId: paymentRecord.insertId,
      claimId,
      paymentAmount,
      newPaidAmount,
      newOutstandingAmount,
      newStatus
    };
  }

  /**
   * Reconcile Payment (Helper Method)
   * @private
   */
  async reconcilePayment(paymentId, context) {
    // Mark payment as reconciled
    await context.execute(`
      UPDATE payments 
      SET reconciled = 1,
          reconciled_date = NOW()
      WHERE id = ?
    `, [paymentId]);

    return { paymentId, reconciled: true };
  }

  /**
   * Test Transaction Rollback Scenarios
   * @param {string} scenario - Test scenario name
   * @returns {Object} Test results
   */
  async testTransactionRollback(scenario) {
    try {
      switch (scenario) {
        case 'payment_failure':
          return await this.testPaymentFailureRollback();
        case 'bulk_update_partial_failure':
          return await this.testBulkUpdatePartialFailure();
        case 'balance_transfer_insufficient_funds':
          return await this.testBalanceTransferInsufficientFunds();
        default:
          throw new Error(`Unknown test scenario: ${scenario}`);
      }
    } catch (error) {
      return {
        scenario,
        success: false,
        error: error.message,
        rollbackTested: true
      };
    }
  }

  /**
   * Test Payment Failure Rollback
   * @private
   */
  async testPaymentFailureRollback() {
    return await executeTransaction(async (connection, context) => {
      // Create a test payment that will fail
      await context.createSavepoint('test_payment');
      
      try {
        // This should fail due to invalid claim ID
        await this.processIndividualPayment({
          claimId: 999999, // Non-existent claim
          paymentAmount: 100,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'test'
        }, 1, context);
        
        return { success: false, message: 'Test should have failed' };
      } catch (error) {
        // Rollback to savepoint
        await context.rollbackToSavepoint('test_payment');
        return { 
          success: true, 
          message: 'Rollback successful',
          error: error.message 
        };
      }
    });
  }

  /**
   * Test Bulk Update Partial Failure
   * @private
   */
  async testBulkUpdatePartialFailure() {
    const testClaimIds = [1, 999999, 2]; // Middle ID doesn't exist
    
    const result = await this.bulkUpdateClaimStatus(testClaimIds, {
      status: 1,
      notes: 'Test update',
      userId: 1
    });

    return {
      success: result.summary.failed > 0 && result.summary.successful > 0,
      message: 'Partial failure handled correctly',
      result
    };
  }

  /**
   * Test Balance Transfer Insufficient Funds
   * @private
   */
  async testBalanceTransferInsufficientFunds() {
    try {
      await this.transferPatientBalance(1, 2, 999999, {
        userId: 1,
        reason: 'Test transfer',
        notes: 'Should fail due to insufficient funds'
      });
      
      return { success: false, message: 'Test should have failed' };
    } catch (error) {
      return {
        success: error.message.includes('Insufficient balance'),
        message: 'Insufficient funds validation working',
        error: error.message
      };
    }
  }
}

module.exports = TransactionalRCMService;