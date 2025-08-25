/**
 * Transaction Rollback Tests
 * Comprehensive tests for RCM transaction handling and rollback scenarios
 */

const TransactionalRCMService = require('../transactionalRCMService');
const { executeQuery, executeQuerySingle } = require('../../../utils/dbUtils');
const {
  executeTransaction,
  transactionManager
} = require('../../../utils/transactionManager');

describe('RCM Transaction Rollback Tests', () => {
  let rcmService;
  let testClaimId;
  let testPatientId;

  beforeAll(async () => {
    rcmService = new TransactionalRCMService();
    
    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Reset any transaction state
    transactionManager.activeTransactions.clear();
  });

  describe('Payment Processing Rollback', () => {
    test('should rollback payment when claim update fails', async () => {
      const initialPaymentCount = await getPaymentCount();
      const initialClaimData = await getClaimData(testClaimId);

      try {
        // Mock a scenario where payment insert succeeds but claim update fails
        await executeTransaction(async (connection, context) => {
          // Insert payment (this should succeed)
          await context.execute(`
            INSERT INTO payments 
            (claim_id, patient_id, payment_amount, payment_date, payment_method, posted_by, posted_date)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `, [testClaimId, testPatientId, 100, '2024-01-01', 'test', 1]);

          // Force an error in claim update
          throw new Error('Simulated claim update failure');
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toBe('Simulated claim update failure');
      }

      // Verify rollback - payment count should be unchanged
      const finalPaymentCount = await getPaymentCount();
      const finalClaimData = await getClaimData(testClaimId);

      expect(finalPaymentCount).toBe(initialPaymentCount);
      expect(finalClaimData.paid_amount).toBe(initialClaimData.paid_amount);
      expect(finalClaimData.status).toBe(initialClaimData.status);
    });

    test('should rollback all operations when patient account update fails', async () => {
      const initialState = await captureInitialState();

      try {
        await rcmService.postPayment({
          claimId: testClaimId,
          paymentAmount: 100,
          paymentDate: '2024-01-01',
          paymentMethod: 'test',
          userId: 1
        });

        // Simulate failure by updating patient account to invalid state
        await executeQuery('UPDATE patient_accounts SET patient_id = NULL WHERE patient_id = ?', [testPatientId]);
        
        // This should fail due to foreign key constraint
        await rcmService.postPayment({
          claimId: testClaimId,
          paymentAmount: 50,
          paymentDate: '2024-01-01',
          paymentMethod: 'test',
          userId: 1
        });

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        // Verify rollback
        const finalState = await captureInitialState();
        
        // First payment should have succeeded, second should have rolled back
        expect(finalState.paymentCount).toBe(initialState.paymentCount + 1);
      }
    });
  });

  describe('Bulk Update Rollback', () => {
    test('should use savepoints for partial rollback in bulk operations', async () => {
      const validClaimIds = [testClaimId];
      const invalidClaimIds = [999999, 999998]; // Non-existent claims
      const mixedClaimIds = [...validClaimIds, ...invalidClaimIds];

      const initialClaimData = await getClaimData(testClaimId);

      const result = await rcmService.bulkUpdateClaimStatus(mixedClaimIds, {
        status: 2, // Paid
        notes: 'Test bulk update',
        userId: 1
      });

      // Should have partial success
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(2);
      expect(result.summary.total).toBe(3);

      // Valid claim should be updated
      const updatedClaimData = await getClaimData(testClaimId);
      expect(updatedClaimData.status).toBe(2);
      expect(updatedClaimData.notes).toBe('Test bulk update');

      // Verify audit log was created for successful update
      const auditLogs = await executeQuery(
        'SELECT * FROM audit_logs WHERE table_name = ? AND record_id = ? AND action = ?',
        ['billings', testClaimId, 'BULK_UPDATE']
      );
      expect(auditLogs.length).toBeGreaterThan(0);
    });

    test('should rollback entire batch if critical error occurs', async () => {
      const initialState = await captureInitialState();

      try {
        // Mock a critical system error during bulk update
        const originalExecute = executeQuery;
        executeQuery = jest.fn().mockRejectedValue(new Error('Database connection lost'));

        await rcmService.bulkUpdateClaimStatus([testClaimId], {
          status: 2,
          notes: 'Should rollback',
          userId: 1
        });

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Database connection lost');
      } finally {
        // Restore original function
        executeQuery = originalExecute;
      }

      // Verify complete rollback
      const finalState = await captureInitialState();
      expect(finalState.claimStatus).toBe(initialState.claimStatus);
    });
  });

  describe('Balance Transfer Rollback', () => {
    test('should rollback when insufficient funds', async () => {
      const fromPatientId = testPatientId;
      const toPatientId = testPatientId + 1;
      
      const initialFromBalance = await getPatientBalance(fromPatientId);
      const initialToBalance = await getPatientBalance(toPatientId);

      try {
        await rcmService.transferPatientBalance(
          fromPatientId,
          toPatientId,
          initialFromBalance + 1000, // More than available
          {
            userId: 1,
            reason: 'Test transfer',
            notes: 'Should fail'
          }
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Insufficient balance');
      }

      // Verify no changes to balances
      const finalFromBalance = await getPatientBalance(fromPatientId);
      const finalToBalance = await getPatientBalance(toPatientId);

      expect(finalFromBalance).toBe(initialFromBalance);
      expect(finalToBalance).toBe(initialToBalance);

      // Verify no transfer record was created
      const transferRecords = await executeQuery(
        'SELECT * FROM balance_transfers WHERE from_patient_id = ? AND to_patient_id = ?',
        [fromPatientId, toPatientId]
      );
      expect(transferRecords.length).toBe(0);
    });

    test('should rollback when target patient account is locked', async () => {
      const fromPatientId = testPatientId;
      const toPatientId = testPatientId + 1;
      
      const initialFromBalance = await getPatientBalance(fromPatientId);
      const initialToBalance = await getPatientBalance(toPatientId);

      // Simulate account lock by starting a long-running transaction
      const lockPromise = executeTransaction(async (connection, context) => {
        await context.acquireLock(`patient_${toPatientId}`, 30);
        // Hold lock for a while
        await new Promise(resolve => setTimeout(resolve, 2000));
      });

      try {
        // This should fail due to lock timeout
        await rcmService.transferPatientBalance(
          fromPatientId,
          toPatientId,
          100,
          {
            userId: 1,
            reason: 'Test transfer',
            notes: 'Should fail due to lock'
          }
        );

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Failed to acquire locks');
      }

      // Wait for lock to be released
      await lockPromise;

      // Verify no changes to balances
      const finalFromBalance = await getPatientBalance(fromPatientId);
      const finalToBalance = await getPatientBalance(toPatientId);

      expect(finalFromBalance).toBe(initialFromBalance);
      expect(finalToBalance).toBe(initialToBalance);
    });
  });

  describe('Payment Reversal Rollback', () => {
    test('should rollback reversal when claim update fails', async () => {
      // First, create a payment to reverse
      const paymentResult = await rcmService.postPayment({
        claimId: testClaimId,
        paymentAmount: 100,
        paymentDate: '2024-01-01',
        paymentMethod: 'test',
        userId: 1
      });

      const paymentId = paymentResult.paymentId;
      const initialPaymentData = await getPaymentData(paymentId);
      const initialClaimData = await getClaimData(testClaimId);

      // Mock claim update failure during reversal
      try {
        await executeTransaction(async (connection, context) => {
          // Mark payment as reversed (this should succeed)
          await context.execute(`
            UPDATE payments 
            SET status = 'reversed', reversed_by = ?, reversed_date = NOW()
            WHERE id = ?
          `, [1, paymentId]);

          // Force error in claim update
          throw new Error('Simulated claim update failure during reversal');
        });

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Simulated claim update failure during reversal');
      }

      // Verify rollback - payment should not be marked as reversed
      const finalPaymentData = await getPaymentData(paymentId);
      const finalClaimData = await getClaimData(testClaimId);

      expect(finalPaymentData.status).toBe(initialPaymentData.status);
      expect(finalClaimData.paid_amount).toBe(initialClaimData.paid_amount);
    });
  });

  describe('ERA Processing Rollback', () => {
    test('should rollback ERA processing when auto-posting fails', async () => {
      const mockERAData = `
        CLP*${testClaimId}*${testPatientId}*2024-01-01*100*50*25*reason1,reason2*CHK123*Test Payer
      `;

      const initialPaymentCount = await getPaymentCount();
      const initialERACount = await getERAFileCount();

      try {
        // Mock auto-posting failure
        const originalPostPayment = rcmService.postPayment;
        rcmService.postPayment = jest.fn().mockRejectedValue(new Error('Auto-posting failed'));

        await rcmService.processERAFile({
          eraData: mockERAData,
          fileName: 'test_era.txt',
          autoPost: true,
          userId: 1
        });

        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('Auto-posting failed');
      } finally {
        // Restore original method
        rcmService.postPayment = originalPostPayment;
      }

      // Verify rollback - no ERA file or payments should be created
      const finalPaymentCount = await getPaymentCount();
      const finalERACount = await getERAFileCount();

      expect(finalPaymentCount).toBe(initialPaymentCount);
      expect(finalERACount).toBe(initialERACount);
    });
  });

  describe('Concurrent Transaction Handling', () => {
    test('should handle concurrent payment posting with proper isolation', async () => {
      const concurrentPayments = [
        { amount: 50, method: 'cash' },
        { amount: 75, method: 'check' },
        { amount: 25, method: 'card' }
      ];

      const initialClaimData = await getClaimData(testClaimId);

      // Process payments concurrently
      const promises = concurrentPayments.map((payment, index) =>
        rcmService.postPayment({
          claimId: testClaimId,
          paymentAmount: payment.amount,
          paymentDate: '2024-01-01',
          paymentMethod: payment.method,
          checkNumber: `CHK${index}`,
          userId: 1
        })
      );

      const results = await Promise.all(promises);

      // Verify all payments were processed
      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.paymentId).toBeDefined();
        expect(result.claimId).toBe(testClaimId);
      });

      // Verify final claim state is consistent
      const finalClaimData = await getClaimData(testClaimId);
      const totalPayments = concurrentPayments.reduce((sum, p) => sum + p.amount, 0);
      
      expect(finalClaimData.paid_amount).toBe(
        (initialClaimData.paid_amount || 0) + totalPayments
      );
    });

    test('should handle deadlock scenarios with retry logic', async () => {
      // This test simulates a deadlock scenario and verifies retry logic
      const patient1 = testPatientId;
      const patient2 = testPatientId + 1;

      // Create two concurrent transfers in opposite directions
      const transfer1Promise = rcmService.transferPatientBalance(
        patient1, patient2, 50,
        { userId: 1, reason: 'Test transfer 1' }
      );

      const transfer2Promise = rcmService.transferPatientBalance(
        patient2, patient1, 25,
        { userId: 1, reason: 'Test transfer 2' }
      );

      // Both should complete successfully despite potential deadlock
      const [result1, result2] = await Promise.all([transfer1Promise, transfer2Promise]);

      expect(result1.transferId).toBeDefined();
      expect(result2.transferId).toBeDefined();
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test patient
    const patientResult = await executeQuery(`
      INSERT INTO patients (first_name, last_name, email, phone)
      VALUES ('Test', 'Patient', 'test@example.com', '555-0123')
    `);
    testPatientId = patientResult.insertId;

    // Create test patient account
    await executeQuery(`
      INSERT INTO patient_accounts (patient_id, total_balance, aging_0_30, aging_31_60, aging_61_90, aging_91_plus)
      VALUES (?, 1000, 500, 300, 150, 50)
    `, [testPatientId]);

    // Create second test patient for transfer tests
    const patient2Result = await executeQuery(`
      INSERT INTO patients (first_name, last_name, email, phone)
      VALUES ('Test', 'Patient2', 'test2@example.com', '555-0124')
    `);

    await executeQuery(`
      INSERT INTO patient_accounts (patient_id, total_balance, aging_0_30, aging_31_60, aging_61_90, aging_91_plus)
      VALUES (?, 500, 250, 150, 75, 25)
    `, [patient2Result.insertId]);

    // Create test claim
    const claimResult = await executeQuery(`
      INSERT INTO billings (patient_id, total_amount, service_date, status, procedure_code)
      VALUES (?, 200, '2024-01-01', 1, 'TEST001')
    `, [testPatientId]);
    testClaimId = claimResult.insertId;
  }

  async function cleanupTestData() {
    if (testClaimId) {
      await executeQuery('DELETE FROM billings WHERE id = ?', [testClaimId]);
    }
    if (testPatientId) {
      await executeQuery('DELETE FROM patient_accounts WHERE patient_id = ?', [testPatientId]);
      await executeQuery('DELETE FROM patient_accounts WHERE patient_id = ?', [testPatientId + 1]);
      await executeQuery('DELETE FROM patients WHERE id IN (?, ?)', [testPatientId, testPatientId + 1]);
    }
    
    // Clean up any test payments, transfers, etc.
    await executeQuery('DELETE FROM payments WHERE posted_by = 1 AND payment_method LIKE "test%"');
    await executeQuery('DELETE FROM balance_transfers WHERE processed_by = 1');
    await executeQuery('DELETE FROM era_files WHERE provider_id = 1 AND file_name LIKE "test%"');
  }

  async function getPaymentCount() {
    const result = await executeQuerySingle('SELECT COUNT(*) as count FROM payments');
    return result.count;
  }

  async function getClaimData(claimId) {
    return await executeQuerySingle('SELECT * FROM billings WHERE id = ?', [claimId]);
  }

  async function getPaymentData(paymentId) {
    return await executeQuerySingle('SELECT * FROM payments WHERE id = ?', [paymentId]);
  }

  async function getPatientBalance(patientId) {
    const result = await executeQuerySingle(
      'SELECT total_balance FROM patient_accounts WHERE patient_id = ?',
      [patientId]
    );
    return parseFloat(result.total_balance);
  }

  async function getERAFileCount() {
    const result = await executeQuerySingle('SELECT COUNT(*) as count FROM era_files');
    return result.count;
  }

  async function captureInitialState() {
    return {
      paymentCount: await getPaymentCount(),
      claimStatus: (await getClaimData(testClaimId)).status,
      patientBalance: await getPatientBalance(testPatientId)
    };
  }
});