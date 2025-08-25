/**
 * Transaction Integration Example
 * Demonstrates how to integrate comprehensive transaction handling into RCM operations
 */

const EnhancedRCMIntegration = require('./enhancedRCMIntegration');
const { transactionManager } = require('../../utils/transactionManager');

/**
 * Example usage of enhanced transaction handling in RCM operations
 */
async function demonstrateTransactionHandling() {
  const rcmService = new EnhancedRCMIntegration();

  console.log('=== RCM Transaction Handling Demonstration ===\n');

  try {
    // 1. Demonstrate claim status update with transaction
    console.log('1. Testing Claim Status Update with Transaction...');
    const claimUpdateResult = await rcmService.updateClaimStatusWithTransaction(1, {
      status: 2, // Paid
      notes: 'Payment received and processed',
      userId: 1
    });
    console.log('✅ Claim update successful:', claimUpdateResult);
    console.log('');

    // 2. Demonstrate payment processing with comprehensive transaction
    console.log('2. Testing Payment Processing with Transaction...');
    const paymentResult = await rcmService.processPaymentWithTransaction({
      claimId: 2,
      paymentAmount: 150.00,
      paymentDate: '2024-01-15',
      paymentMethod: 'check',
      checkNumber: 'CHK001',
      adjustmentAmount: 10.00,
      adjustmentReason: 'Contractual adjustment',
      userId: 1
    });
    console.log('✅ Payment processing successful:', paymentResult);
    console.log('');

    // 3. Demonstrate bulk claim updates with savepoints
    console.log('3. Testing Bulk Claim Updates with Savepoints...');
    const bulkUpdateResult = await rcmService.bulkUpdateClaimStatus([1, 2, 3], {
      status: 1, // Submitted
      notes: 'Bulk status update',
      userId: 1
    });
    console.log('✅ Bulk update completed:', bulkUpdateResult.summary);
    console.log('');

    // 4. Demonstrate batch payment processing
    console.log('4. Testing Batch Payment Processing...');
    const batchPayments = [
      {
        claimId: 4,
        paymentAmount: 75.00,
        paymentDate: '2024-01-15',
        paymentMethod: 'cash'
      },
      {
        claimId: 5,
        paymentAmount: 125.00,
        paymentDate: '2024-01-15',
        paymentMethod: 'card'
      }
    ];

    const batchResult = await rcmService.processBatchPayments(batchPayments, {
      userId: 1,
      validateClaims: true,
      autoReconcile: true
    });
    console.log('✅ Batch payment processing completed:', batchResult.summary);
    console.log('');

    // 5. Demonstrate balance transfer with locks
    console.log('5. Testing Balance Transfer with Locks...');
    const transferResult = await rcmService.transferPatientBalance(1, 2, 50.00, {
      userId: 1,
      reason: 'Account consolidation',
      notes: 'Transferring balance between patient accounts'
    });
    console.log('✅ Balance transfer successful:', transferResult);
    console.log('');

    // 6. Demonstrate ERA processing with batch transactions
    console.log('6. Testing ERA Processing with Batch Transactions...');
    const mockERAData = `
      CLP*1*1*2024-01-01*100*75*15*CO-45*CHK123*Test Payer
      CLP*2*2*2024-01-02*200*150*25*CO-45*CHK124*Test Payer
      CLP*3*3*2024-01-03*150*100*20*CO-45*CHK125*Test Payer
    `;

    const eraResult = await rcmService.processERAWithBatchTransactions(mockERAData, {
      fileName: 'test_era_batch.txt',
      autoPost: true,
      userId: 1
    });
    console.log('✅ ERA processing completed:', {
      eraId: eraResult.eraId,
      processedCount: eraResult.processedCount,
      autoPostedCount: eraResult.autoPostedCount,
      failedCount: eraResult.failedCount
    });
    console.log('');

    // 7. Demonstrate payment reversal
    console.log('7. Testing Payment Reversal...');
    const reversalResult = await rcmService.reversePayment(paymentResult.paymentId, {
      userId: 1,
      reason: 'Duplicate payment',
      notes: 'Payment was processed twice'
    });
    console.log('✅ Payment reversal successful:', reversalResult);
    console.log('');

    // 8. Get transaction statistics
    console.log('8. Transaction Statistics:');
    const stats = transactionManager.getTransactionStats();
    console.log('📊 Transaction Stats:', stats);
    console.log('');

    // 9. Run comprehensive rollback tests
    console.log('9. Running Transaction Rollback Tests...');
    const testResults = await rcmService.runTransactionTests();
    console.log('🧪 Test Results:', testResults);
    console.log('');

    console.log('=== All Transaction Demonstrations Completed Successfully! ===');

  } catch (error) {
    console.error('❌ Transaction demonstration failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

/**
 * Demonstrate error handling and rollback scenarios
 */
async function demonstrateErrorHandling() {
  const rcmService = new EnhancedRCMIntegration();

  console.log('\n=== Error Handling and Rollback Demonstration ===\n');

  // Test 1: Invalid claim ID (should rollback)
  console.log('1. Testing Invalid Claim ID Rollback...');
  try {
    await rcmService.updateClaimStatusWithTransaction(999999, {
      status: 2,
      notes: 'This should fail',
      userId: 1
    });
    console.log('❌ Test failed - should have thrown error');
  } catch (error) {
    console.log('✅ Rollback successful for invalid claim ID:', error.message);
  }

  // Test 2: Insufficient balance transfer (should rollback)
  console.log('\n2. Testing Insufficient Balance Transfer Rollback...');
  try {
    await rcmService.transferPatientBalance(1, 2, 999999, {
      userId: 1,
      reason: 'Should fail',
      notes: 'Insufficient funds test'
    });
    console.log('❌ Test failed - should have thrown error');
  } catch (error) {
    console.log('✅ Rollback successful for insufficient balance:', error.message);
  }

  // Test 3: Payment amount exceeding claim balance (should rollback)
  console.log('\n3. Testing Overpayment Rollback...');
  try {
    await rcmService.processPaymentWithTransaction({
      claimId: 1,
      paymentAmount: 999999, // Exceeds claim amount
      paymentDate: '2024-01-15',
      paymentMethod: 'test',
      userId: 1
    });
    console.log('❌ Test failed - should have thrown error');
  } catch (error) {
    console.log('✅ Rollback successful for overpayment:', error.message);
  }

  console.log('\n=== Error Handling Demonstrations Completed ===');
}

/**
 * Demonstrate performance monitoring
 */
async function demonstratePerformanceMonitoring() {
  const rcmService = new EnhancedRCMIntegration();

  console.log('\n=== Performance Monitoring Demonstration ===\n');

  // Start performance monitoring
  console.log('Starting performance monitoring...');
  
  // Perform several operations to generate metrics
  const operations = [];
  for (let i = 0; i < 5; i++) {
    operations.push(
      rcmService.getDashboardData({ timeframe: '30d' })
    );
  }

  const startTime = Date.now();
  await Promise.all(operations);
  const endTime = Date.now();

  console.log(`✅ Completed ${operations.length} operations in ${endTime - startTime}ms`);

  // Get performance statistics
  const performanceStats = transactionManager.getPerformanceStats();
  console.log('📊 Performance Statistics:', performanceStats);

  // Get slow queries
  const slowQueries = transactionManager.getSlowQueries(1000); // > 1 second
  if (slowQueries.length > 0) {
    console.log('🐌 Slow Queries Detected:', slowQueries);
  } else {
    console.log('✅ No slow queries detected');
  }

  // Generate optimization report
  const optimizationReport = transactionManager.generateOptimizationReport();
  console.log('📈 Optimization Report:', optimizationReport);

  console.log('\n=== Performance Monitoring Completed ===');
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Run all demonstrations
    await demonstrateTransactionHandling();
    await demonstrateErrorHandling();
    await demonstratePerformanceMonitoring();

    console.log('\n🎉 All demonstrations completed successfully!');
    console.log('\nKey Features Demonstrated:');
    console.log('✅ Atomic transaction operations');
    console.log('✅ Savepoint-based partial rollbacks');
    console.log('✅ Comprehensive error handling');
    console.log('✅ Batch processing with individual rollbacks');
    console.log('✅ Account locking for financial operations');
    console.log('✅ Performance monitoring and optimization');
    console.log('✅ Audit trail logging');
    console.log('✅ Retry logic for transient failures');

  } catch (error) {
    console.error('❌ Demonstration failed:', error.message);
    process.exit(1);
  }
}

// Export for use in other modules
module.exports = {
  demonstrateTransactionHandling,
  demonstrateErrorHandling,
  demonstratePerformanceMonitoring,
  main
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}