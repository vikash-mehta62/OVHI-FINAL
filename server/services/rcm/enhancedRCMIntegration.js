/**
 * Enhanced RCM Integration Example
 * Demonstrates how to integrate comprehensive transaction handling into existing RCM operations
 */

const TransactionalRCMService = require('./transactionalRCMService');
const {
  executeTransaction,
  executeBatch,
  transactional,
  IsolationLevels
} = require('../../utils/transactionManager');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');

/**
 * Enhanced RCM Integration Service
 * Shows how to integrate transaction handling into existing RCM operations
 */
class EnhancedRCMIntegration extends TransactionalRCMService {
  constructor() {
    super();
    this.name = 'EnhancedRCMIntegration';
  }

  /**
   * Enhanced Claim Status Update with Transaction Support
   * Demonstrates atomic claim updates with patient account adjustments
   */
  async updateClaimStatusWithTransaction(claimId, updateData) {
    const { status, notes, userId } = updateData;

    try {
      return await executeTransaction(async (connection, context) => {
        // Create savepoint for validation
        await context.createSavepoint('validation');

        // Validate claim exists and get current data
        const existingClaim = await context.execute(
          'SELECT * FROM billings WHERE id = ?',
          [claimId]
        );

        if (!existingClaim || existingClaim.length === 0) {
          throw createNotFoundError('Claim not found');
        }

        const claim = existingClaim[0];

        // Create savepoint for claim update
        await context.createSavepoint('claim_update');

        // Update claim status
        await context.execute(`
          UPDATE billings 
          SET status = ?, notes = ?, updated = NOW()
          WHERE id = ?
        `, [status, notes || '', claimId]);

        // Create savepoint for patient account updates
        await context.createSavepoint('account_update');

        // Update patient account based on status change
        if (status === 2 && claim.status !== 2) { // Changed to Paid
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = total_balance - ?,
                last_payment_date = NOW(),
                updated_date = NOW()
            WHERE patient_id = ?
          `, [claim.total_amount, claim.patient_id]);
        } else if (claim.status === 2 && status !== 2) { // Changed from Paid
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = total_balance + ?,
                updated_date = NOW()
            WHERE patient_id = ?
          `, [claim.total_amount, claim.patient_id]);
        }

        // Create savepoint for audit logging
        await context.createSavepoint('audit_log');

        // Log audit trail
        await context.execute(`
          INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values, user_id, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          'billings',
          claimId,
          'UPDATE',
          JSON.stringify({ status: claim.status }),
          JSON.stringify({ status, notes }),
          userId
        ]);

        // Get updated claim data
        const updatedClaim = await context.execute(
          'SELECT * FROM billings WHERE id = ?',
          [claimId]
        );

        return {
          claimId,
          previousStatus: claim.status,
          newStatus: status,
          notes,
          updatedAt: new Date().toISOString(),
          claim: updatedClaim[0]
        };

      }, {
        isolationLevel: IsolationLevels.READ_COMMITTED,
        timeout: 30000,
        retryAttempts: 3,
        onRollback: async (error) => {
          console.error(`Claim update rollback for claim ${claimId}:`, error.message);
        }
      });

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to update claim status', {
        originalError: error.message,
        claimId,
        updateData
      });
    }
  }

  /**
   * Enhanced Payment Processing with Comprehensive Transaction Support
   * Demonstrates complex payment processing with multiple related updates
   */
  async processPaymentWithTransaction(paymentData) {
    const {
      claimId,
      paymentAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      adjustmentAmount = 0,
      adjustmentReason,
      userId
    } = paymentData;

    try {
      return await executeTransaction(async (connection, context) => {
        // Create savepoint for claim validation
        await context.createSavepoint('claim_validation');

        // Get claim details
        const claim = await context.execute(
          'SELECT * FROM billings WHERE id = ?',
          [claimId]
        );

        if (!claim || claim.length === 0) {
          throw createNotFoundError('Claim not found');
        }

        const claimData = claim[0];

        // Validate payment amount
        const remainingBalance = claimData.total_amount - (claimData.paid_amount || 0);
        if (paymentAmount > remainingBalance) {
          throw createValidationError(`Payment amount exceeds remaining balance: ${remainingBalance}`);
        }

        // Create savepoint for payment record
        await context.createSavepoint('payment_record');

        // Insert payment record
        const paymentResult = await context.execute(`
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

        const paymentId = paymentResult.insertId;

        // Create savepoint for claim updates
        await context.createSavepoint('claim_updates');

        // Update claim amounts and status
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

        // Create savepoint for patient account updates
        await context.createSavepoint('account_updates');

        // Update patient account balance
        await context.execute(`
          UPDATE patient_accounts 
          SET total_balance = total_balance - ?,
              last_payment_date = ?,
              updated_date = NOW()
          WHERE patient_id = ?
        `, [paymentAmount, paymentDate, claimData.patient_id]);

        // Create savepoint for insurance updates (if applicable)
        if (paymentMethod === 'insurance') {
          await context.createSavepoint('insurance_updates');
          
          // Update insurance payment tracking
          await context.execute(`
            INSERT INTO insurance_payments (
              claim_id, patient_id, payer_id, payment_amount, payment_date, 
              check_number, processed_by, processed_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            claimId,
            claimData.patient_id,
            claimData.payer_id || null,
            paymentAmount,
            paymentDate,
            checkNumber,
            userId
          ]);
        }

        // Create savepoint for audit logging
        await context.createSavepoint('audit_logging');

        // Log comprehensive audit trail
        await context.execute(`
          INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values, user_id, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          'billings',
          claimId,
          'PAYMENT_POST',
          JSON.stringify({
            paid_amount: claimData.paid_amount,
            outstanding_amount: claimData.outstanding_amount,
            status: claimData.status
          }),
          JSON.stringify({
            paid_amount: newPaidAmount,
            outstanding_amount: newOutstandingAmount,
            status: newStatus,
            payment_amount: paymentAmount,
            payment_id: paymentId
          }),
          userId
        ]);

        return {
          paymentId,
          claimId,
          paymentAmount,
          newPaidAmount,
          newOutstandingAmount,
          newStatus,
          processedAt: new Date().toISOString()
        };

      }, {
        isolationLevel: IsolationLevels.READ_COMMITTED,
        timeout: 45000, // Longer timeout for complex operations
        retryAttempts: 3,
        onRollback: async (error) => {
          console.error(`Payment processing rollback for claim ${claimId}:`, error.message);
          // Could send notification to administrators
        },
        onCommit: async (result) => {
          console.log(`Payment processed successfully: ${result.paymentId}`);
          // Could trigger post-payment workflows
        }
      });

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to process payment', {
        originalError: error.message,
        claimId,
        paymentAmount
      });
    }
  }

  /**
   * Enhanced ERA Processing with Batch Transaction Support
   * Demonstrates complex batch processing with individual rollback capabilities
   */
  async processERAWithBatchTransactions(eraData, options = {}) {
    const { fileName, autoPost = false, userId } = options;

    try {
      return await executeTransaction(async (connection, context) => {
        // Parse ERA data
        const parsedERA = await this.parseERAData(eraData);

        // Create savepoint for ERA record
        await context.createSavepoint('era_record');

        // Store ERA file record
        const eraResult = await context.execute(`
          INSERT INTO era_files 
          (provider_id, file_name, file_size, total_payments, total_adjustments, 
           status, processed_date, auto_posted)
          VALUES (?, ?, ?, ?, ?, 'processing', NOW(), ?)
        `, [
          userId,
          fileName,
          eraData.length,
          parsedERA.totalPayments,
          parsedERA.totalAdjustments,
          autoPost
        ]);

        const eraId = eraResult.insertId;

        // Process payments in batches with individual savepoints
        const batchSize = 10;
        const results = [];
        let processedCount = 0;
        let autoPostedCount = 0;

        for (let i = 0; i < parsedERA.payments.length; i += batchSize) {
          const batch = parsedERA.payments.slice(i, i + batchSize);
          const batchSavepoint = `batch_${Math.floor(i / batchSize)}`;

          await context.createSavepoint(batchSavepoint);

          try {
            // Process each payment in the batch
            for (let j = 0; j < batch.length; j++) {
              const payment = batch[j];
              const paymentIndex = i + j;
              const paymentSavepoint = `payment_${paymentIndex}`;

              try {
                await context.createSavepoint(paymentSavepoint);

                // Insert payment detail
                const paymentDetailResult = await context.execute(`
                  INSERT INTO era_payment_details 
                  (era_file_id, claim_id, patient_id, service_date, billed_amount, 
                   paid_amount, adjustment_amount, reason_codes, check_number, 
                   payer_name, status)
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
                  autoPost ? 'pending_auto_post' : 'pending'
                ]);

                // Auto-post if enabled and valid
                if (autoPost && payment.paid_amount > 0) {
                  try {
                    await this.processIndividualPayment({
                      claimId: payment.claim_id,
                      paymentAmount: payment.paid_amount,
                      paymentDate: payment.service_date,
                      paymentMethod: 'ERA',
                      checkNumber: payment.check_number,
                      adjustmentAmount: payment.adjustment_amount,
                      adjustmentReason: payment.reason_codes.join(', ')
                    }, userId, context);

                    // Update payment detail status
                    await context.execute(`
                      UPDATE era_payment_details 
                      SET status = 'auto_posted', posted_date = NOW()
                      WHERE id = ?
                    `, [paymentDetailResult.insertId]);

                    autoPostedCount++;
                  } catch (autoPostError) {
                    console.warn(`Auto-posting failed for payment ${paymentIndex}:`, autoPostError.message);
                    // Continue with next payment
                  }
                }

                await context.releaseSavepoint(paymentSavepoint);
                processedCount++;

                results.push({
                  index: paymentIndex,
                  success: true,
                  paymentDetailId: paymentDetailResult.insertId,
                  autoPosted: autoPost && payment.paid_amount > 0
                });

              } catch (paymentError) {
                await context.rollbackToSavepoint(paymentSavepoint);
                
                results.push({
                  index: paymentIndex,
                  success: false,
                  error: paymentError.message
                });

                console.warn(`Failed to process payment ${paymentIndex}:`, paymentError.message);
              }
            }

            await context.releaseSavepoint(batchSavepoint);

          } catch (batchError) {
            await context.rollbackToSavepoint(batchSavepoint);
            console.error(`Batch ${Math.floor(i / batchSize)} failed:`, batchError.message);
            
            // Add failed results for the entire batch
            for (let j = 0; j < batch.length; j++) {
              results.push({
                index: i + j,
                success: false,
                error: `Batch processing failed: ${batchError.message}`
              });
            }
          }
        }

        // Update ERA file status
        await context.execute(`
          UPDATE era_files 
          SET status = 'processed',
              processed_count = ?,
              auto_posted_count = ?,
              updated_date = NOW()
          WHERE id = ?
        `, [processedCount, autoPostedCount, eraId]);

        // Log comprehensive audit trail
        await context.execute(`
          INSERT INTO audit_logs (
            table_name, record_id, action, old_values, new_values, user_id, timestamp
          ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
          'era_files',
          eraId,
          'PROCESS',
          null,
          JSON.stringify({
            fileName,
            totalPayments: parsedERA.totalPayments,
            processedCount,
            autoPostedCount,
            failedCount: results.filter(r => !r.success).length
          }),
          userId
        ]);

        return {
          eraId,
          fileName,
          totalPayments: parsedERA.totalPayments,
          totalAdjustments: parsedERA.totalAdjustments,
          processedCount,
          autoPostedCount,
          failedCount: results.filter(r => !r.success).length,
          results
        };

      }, {
        isolationLevel: IsolationLevels.READ_COMMITTED,
        timeout: 300000, // 5 minutes for large ERA files
        retryAttempts: 2,
        onRollback: async (error) => {
          console.error(`ERA processing rollback for file ${fileName}:`, error.message);
        }
      });

    } catch (error) {
      throw createDatabaseError('Failed to process ERA file', {
        originalError: error.message,
        fileName
      });
    }
  }

  /**
   * Test Transaction Rollback Scenarios
   * Comprehensive testing of various rollback scenarios
   */
  async runTransactionTests() {
    const testResults = [];

    // Test 1: Payment failure rollback
    try {
      const result = await this.testTransactionRollback('payment_failure');
      testResults.push({
        test: 'payment_failure',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      testResults.push({
        test: 'payment_failure',
        success: false,
        error: error.message
      });
    }

    // Test 2: Bulk update partial failure
    try {
      const result = await this.testTransactionRollback('bulk_update_partial_failure');
      testResults.push({
        test: 'bulk_update_partial_failure',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      testResults.push({
        test: 'bulk_update_partial_failure',
        success: false,
        error: error.message
      });
    }

    // Test 3: Balance transfer insufficient funds
    try {
      const result = await this.testTransactionRollback('balance_transfer_insufficient_funds');
      testResults.push({
        test: 'balance_transfer_insufficient_funds',
        success: result.success,
        message: result.message
      });
    } catch (error) {
      testResults.push({
        test: 'balance_transfer_insufficient_funds',
        success: false,
        error: error.message
      });
    }

    return {
      totalTests: testResults.length,
      passedTests: testResults.filter(t => t.success).length,
      failedTests: testResults.filter(t => !t.success).length,
      results: testResults
    };
  }
}

module.exports = EnhancedRCMIntegration;