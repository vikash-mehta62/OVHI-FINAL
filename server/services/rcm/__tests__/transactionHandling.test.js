/**
 * Transaction Handling Tests
 * Comprehensive tests for transaction rollback scenarios and data consistency
 */

const transactionalRCMService = require('../transactionalRCMService');
const dbUtils = require('../../../utils/dbUtils');
const transactionManager = require('../../../utils/transactionManager');

// Mock dependencies
jest.mock('../../../utils/dbUtils');
jest.mock('../../../utils/transactionManager');

describe('Transaction Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Payment Processing Transactions', () => {
    describe('processPaymentWithTransaction', () => {
      it('should complete payment transaction successfully', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance',
          transactionId: 'TXN123456'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPaymentResult = { insertId: 1 };
        const mockClaimUpdate = { affectedRows: 1 };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPaymentResult) // Insert payment
          .mockResolvedValueOnce(mockClaimUpdate); // Update claim status

        const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

        expect(mockConnection.beginTransaction).toHaveBeenCalled();
        expect(mockConnection.commit).toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.data.paymentId).toBe(1);
      });

      it('should rollback on payment insertion failure', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const paymentError = new Error('Payment insertion failed');

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery.mockRejectedValue(paymentError);

        const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

        expect(mockConnection.beginTransaction).toHaveBeenCalled();
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
        expect(mockConnection.release).toHaveBeenCalled();
        expect(result.success).toBe(false);
      });

      it('should rollback on claim status update failure', async () => {
        const paymentData = {
          claimId: 1,
          amount: 150.00,
          paymentMethod: 'insurance'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPaymentResult = { insertId: 1 };
        const claimUpdateError = new Error('Claim update failed');

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPaymentResult) // Payment succeeds
          .mockRejectedValue(claimUpdateError); // Claim update fails

        const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

        expect(mockConnection.beginTransaction).toHaveBeenCalled();
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
        expect(result.success).toBe(false);
      });

      it('should handle partial payments correctly', async () => {
        const paymentData = {
          claimId: 1,
          amount: 75.00, // Partial payment
          paymentMethod: 'patient'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockClaim = [{ id: 1, totalAmount: 150.00, paidAmount: 0 }];
        const mockPaymentResult = { insertId: 1 };
        const mockClaimUpdate = { affectedRows: 1 };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockClaim) // Get claim details
          .mockResolvedValueOnce(mockPaymentResult) // Insert payment
          .mockResolvedValueOnce(mockClaimUpdate); // Update claim with partial payment

        const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

        expect(result.success).toBe(true);
        expect(result.data.remainingBalance).toBe(75.00);
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should handle overpayment scenarios', async () => {
        const paymentData = {
          claimId: 1,
          amount: 200.00, // Overpayment
          paymentMethod: 'insurance'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockClaim = [{ id: 1, totalAmount: 150.00, paidAmount: 0 }];

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery.mockResolvedValueOnce(mockClaim);

        const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('exceeds claim amount');
        expect(mockConnection.rollback).toHaveBeenCalled();
      });
    });
  });

  describe('Claim Creation Transactions', () => {
    describe('createClaimWithValidation', () => {
      it('should create claim with all validations', async () => {
        const claimData = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          diagnosis: 'Z00.00',
          procedure: '99213',
          amount: 150.00
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPatient = [{ id: 1, name: 'John Doe', active: true }];
        const mockProvider = [{ id: 1, name: 'Dr. Smith', active: true }];
        const mockClaimResult = { insertId: 1 };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPatient) // Validate patient
          .mockResolvedValueOnce(mockProvider) // Validate provider
          .mockResolvedValueOnce([]) // Check for duplicates
          .mockResolvedValueOnce(mockClaimResult); // Insert claim

        const result = await transactionalRCMService.createClaimWithValidation(claimData);

        expect(result.success).toBe(true);
        expect(result.data.id).toBe(1);
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should rollback on invalid patient', async () => {
        const claimData = {
          patientId: 999, // Non-existent patient
          providerId: 1,
          serviceDate: '2023-01-15'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery.mockResolvedValueOnce([]); // No patient found

        const result = await transactionalRCMService.createClaimWithValidation(claimData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid patient');
        expect(mockConnection.rollback).toHaveBeenCalled();
      });

      it('should rollback on duplicate claim detection', async () => {
        const claimData = {
          patientId: 1,
          providerId: 1,
          serviceDate: '2023-01-15',
          claimNumber: 'CLM001'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPatient = [{ id: 1, active: true }];
        const mockProvider = [{ id: 1, active: true }];
        const mockDuplicate = [{ id: 1, claimNumber: 'CLM001' }];

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPatient)
          .mockResolvedValueOnce(mockProvider)
          .mockResolvedValueOnce(mockDuplicate); // Duplicate found

        const result = await transactionalRCMService.createClaimWithValidation(claimData);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Duplicate claim');
        expect(mockConnection.rollback).toHaveBeenCalled();
      });
    });
  });

  describe('Collection Activity Transactions', () => {
    describe('createCollectionActivityWithUpdates', () => {
      it('should create activity and update account status', async () => {
        const activityData = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient',
          nextFollowUp: '2023-02-01',
          updateAccountStatus: 'contacted'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockActivityResult = { insertId: 1 };
        const mockAccountUpdate = { affectedRows: 1 };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockActivityResult) // Insert activity
          .mockResolvedValueOnce(mockAccountUpdate); // Update account

        const result = await transactionalRCMService.createCollectionActivityWithUpdates(activityData);

        expect(result.success).toBe(true);
        expect(result.data.id).toBe(1);
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should rollback on account update failure', async () => {
        const activityData = {
          accountId: 1,
          activityType: 'phone_call',
          notes: 'Contacted patient',
          updateAccountStatus: 'contacted'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockActivityResult = { insertId: 1 };
        const accountUpdateError = new Error('Account update failed');

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockActivityResult) // Activity succeeds
          .mockRejectedValue(accountUpdateError); // Account update fails

        const result = await transactionalRCMService.createCollectionActivityWithUpdates(activityData);

        expect(result.success).toBe(false);
        expect(mockConnection.rollback).toHaveBeenCalled();
      });
    });
  });

  describe('Denial and Appeal Transactions', () => {
    describe('createAppealWithClaimUpdate', () => {
      it('should create appeal and update claim status', async () => {
        const appealData = {
          claimId: 1,
          appealReason: 'Documentation was submitted',
          supportingDocuments: ['doc1.pdf'],
          updateClaimStatus: 'under_appeal'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockAppealResult = { insertId: 1 };
        const mockClaimUpdate = { affectedRows: 1 };

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockAppealResult) // Insert appeal
          .mockResolvedValueOnce(mockClaimUpdate); // Update claim status

        const result = await transactionalRCMService.createAppealWithClaimUpdate(appealData);

        expect(result.success).toBe(true);
        expect(result.data.id).toBe(1);
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should rollback on claim status update failure', async () => {
        const appealData = {
          claimId: 1,
          appealReason: 'Documentation was submitted',
          updateClaimStatus: 'under_appeal'
        };

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockAppealResult = { insertId: 1 };
        const claimUpdateError = new Error('Claim status update failed');

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockAppealResult) // Appeal succeeds
          .mockRejectedValue(claimUpdateError); // Claim update fails

        const result = await transactionalRCMService.createAppealWithClaimUpdate(appealData);

        expect(result.success).toBe(false);
        expect(mockConnection.rollback).toHaveBeenCalled();
      });
    });
  });

  describe('Batch Operations Transactions', () => {
    describe('processBatchPayments', () => {
      it('should process multiple payments in single transaction', async () => {
        const paymentsData = [
          { claimId: 1, amount: 150.00, paymentMethod: 'insurance' },
          { claimId: 2, amount: 200.00, paymentMethod: 'insurance' },
          { claimId: 3, amount: 100.00, paymentMethod: 'patient' }
        ];

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPaymentResults = [
          { insertId: 1 },
          { insertId: 2 },
          { insertId: 3 }
        ];

        const mockClaimUpdates = [
          { affectedRows: 1 },
          { affectedRows: 1 },
          { affectedRows: 1 }
        ];

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPaymentResults[0])
          .mockResolvedValueOnce(mockClaimUpdates[0])
          .mockResolvedValueOnce(mockPaymentResults[1])
          .mockResolvedValueOnce(mockClaimUpdates[1])
          .mockResolvedValueOnce(mockPaymentResults[2])
          .mockResolvedValueOnce(mockClaimUpdates[2]);

        const result = await transactionalRCMService.processBatchPayments(paymentsData);

        expect(result.success).toBe(true);
        expect(result.data.processedCount).toBe(3);
        expect(result.data.failedCount).toBe(0);
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should rollback entire batch on any failure', async () => {
        const paymentsData = [
          { claimId: 1, amount: 150.00, paymentMethod: 'insurance' },
          { claimId: 2, amount: 200.00, paymentMethod: 'insurance' }
        ];

        const mockConnection = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn()
        };

        const mockPaymentResult = { insertId: 1 };
        const mockClaimUpdate = { affectedRows: 1 };
        const secondPaymentError = new Error('Second payment failed');

        transactionManager.getConnection.mockResolvedValue(mockConnection);
        dbUtils.executeQuery
          .mockResolvedValueOnce(mockPaymentResult) // First payment succeeds
          .mockResolvedValueOnce(mockClaimUpdate) // First claim update succeeds
          .mockRejectedValue(secondPaymentError); // Second payment fails

        const result = await transactionalRCMService.processBatchPayments(paymentsData);

        expect(result.success).toBe(false);
        expect(mockConnection.rollback).toHaveBeenCalled();
        expect(mockConnection.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle connection acquisition failures', async () => {
      const connectionError = new Error('Connection pool exhausted');
      transactionManager.getConnection.mockRejectedValue(connectionError);

      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should release connection even on rollback', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      const paymentError = new Error('Payment failed');

      transactionManager.getConnection.mockResolvedValue(mockConnection);
      dbUtils.executeQuery.mockRejectedValue(paymentError);

      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      await transactionalRCMService.processPaymentWithTransaction(paymentData);

      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should handle rollback failures gracefully', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn().mockRejectedValue(new Error('Rollback failed')),
        release: jest.fn()
      };

      const paymentError = new Error('Payment failed');

      transactionManager.getConnection.mockResolvedValue(mockConnection);
      dbUtils.executeQuery.mockRejectedValue(paymentError);

      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

      expect(result.success).toBe(false);
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('Deadlock Handling', () => {
    it('should retry on deadlock detection', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      const deadlockError = new Error('Deadlock found when trying to get lock');
      deadlockError.code = 'ER_LOCK_DEADLOCK';

      const mockPaymentResult = { insertId: 1 };
      const mockClaimUpdate = { affectedRows: 1 };

      transactionManager.getConnection.mockResolvedValue(mockConnection);
      dbUtils.executeQuery
        .mockRejectedValueOnce(deadlockError) // First attempt fails with deadlock
        .mockResolvedValueOnce(mockPaymentResult) // Retry succeeds
        .mockResolvedValueOnce(mockClaimUpdate);

      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

      expect(result.success).toBe(true);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should fail after maximum retry attempts', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      const deadlockError = new Error('Deadlock found when trying to get lock');
      deadlockError.code = 'ER_LOCK_DEADLOCK';

      transactionManager.getConnection.mockResolvedValue(mockConnection);
      dbUtils.executeQuery.mockRejectedValue(deadlockError); // Always fails

      const paymentData = {
        claimId: 1,
        amount: 150.00,
        paymentMethod: 'insurance'
      };

      const result = await transactionalRCMService.processPaymentWithTransaction(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum retry attempts exceeded');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });
  });
});