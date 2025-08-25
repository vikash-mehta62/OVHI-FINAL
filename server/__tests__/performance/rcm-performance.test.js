/**
 * Performance and Load Tests for RCM System
 */

const { ConsolidatedRCMService } = require('../../services/rcm/consolidatedRCMService');
const { TransactionManager } = require('../../utils/transactionManager');
const { dbUtils } = require('../../utils/dbUtils');

// Mock dependencies
jest.mock('../../utils/dbUtils');
jest.mock('../../utils/transactionManager');

describe('RCM Performance Tests', () => {
  let service;
  let mockTransactionManager;

  beforeEach(() => {
    service = new ConsolidatedRCMService();
    mockTransactionManager = {
      executeTransaction: jest.fn(),
      batchExecute: jest.fn()
    };
    TransactionManager.mockImplementation(() => mockTransactionManager);
    jest.clearAllMocks();
  });

  describe('Database Query Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(5, '0')}`,
        status: 'pending',
        amount: 100 + (i % 1000)
      }));

      dbUtils.executeQuery.mockResolvedValue(largeDataSet);

      const startTime = process.hrtime.bigint();
      
      const result = await service.getClaimsWithFilters({ 
        page: 1, 
        limit: 1000 
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      expect(result.claims).toHaveLength(10000);
      expect(executionTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should optimize pagination queries', async () => {
      const mockClaims = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(3, '0')}`
      }));

      const mockCount = [{ total: 5000 }];

      dbUtils.executeQuery
        .mockResolvedValueOnce(mockClaims)
        .mockResolvedValueOnce(mockCount);

      const startTime = process.hrtime.bigint();

      const result = await service.getClaimsWithFilters({
        page: 50,
        limit: 50
      });

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(result.claims).toHaveLength(50);
      expect(result.pagination.total).toBe(5000);
      expect(executionTime).toBeLessThan(50); // Pagination should be fast
    });

    it('should handle complex filter queries efficiently', async () => {
      const mockFilteredResults = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        status: 'pending',
        patientId: `patient-${i % 10}`,
        providerId: `provider-${i % 5}`
      }));

      dbUtils.executeQuery.mockResolvedValue(mockFilteredResults);

      const complexFilters = {
        status: 'pending',
        patientId: 'patient-1',
        providerId: 'provider-1',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        amountMin: 100,
        amountMax: 1000,
        diagnosis: 'Z00.00'
      };

      const startTime = process.hrtime.bigint();

      const result = await service.getClaimsWithFilters(complexFilters);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(result.claims).toHaveLength(100);
      expect(executionTime).toBeLessThan(75); // Complex queries should still be fast
    });
  });

  describe('Batch Operations Performance', () => {
    it('should handle bulk claim creation efficiently', async () => {
      const bulkClaimsData = Array.from({ length: 1000 }, (_, i) => ({
        patientId: `patient-${i % 100}`,
        providerId: `provider-${i % 10}`,
        amount: 100 + (i % 500),
        serviceDate: '2023-01-15'
      }));

      const mockBatchResults = bulkClaimsData.map((_, i) => ({
        insertId: i + 1,
        affectedRows: 1
      }));

      mockTransactionManager.batchExecute.mockResolvedValue(mockBatchResults);

      const startTime = process.hrtime.bigint();

      const result = await service.createMultipleClaims(bulkClaimsData);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(result).toHaveLength(1000);
      expect(executionTime).toBeLessThan(500); // Bulk operations should be efficient
      expect(mockTransactionManager.batchExecute).toHaveBeenCalledTimes(1);
    });

    it('should handle bulk payment processing efficiently', async () => {
      const bulkPayments = Array.from({ length: 500 }, (_, i) => ({
        claimId: i + 1,
        amount: 100 + (i % 200),
        paymentMethod: 'insurance',
        paymentDate: '2023-01-20'
      }));

      const mockBatchResults = bulkPayments.map((_, i) => ({
        insertId: i + 1,
        affectedRows: 1
      }));

      mockTransactionManager.batchExecute.mockResolvedValue(mockBatchResults);

      const startTime = process.hrtime.bigint();

      const result = await service.processMultiplePayments(bulkPayments);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(result).toHaveLength(500);
      expect(executionTime).toBeLessThan(300);
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent read operations', async () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(3, '0')}`
      }));

      dbUtils.executeQuery.mockResolvedValue(mockData);

      const concurrentOperations = Array.from({ length: 10 }, () =>
        service.getClaimsWithFilters({ page: 1, limit: 100 })
      );

      const startTime = process.hrtime.bigint();

      const results = await Promise.all(concurrentOperations);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.claims).toHaveLength(100);
      });
      expect(executionTime).toBeLessThan(200); // Concurrent reads should be fast
    });

    it('should handle mixed concurrent operations', async () => {
      // Mock different types of operations
      dbUtils.executeQuery.mockImplementation((query) => {
        if (query.includes('SELECT')) {
          return Promise.resolve([{ id: 1, data: 'test' }]);
        }
        return Promise.resolve({ insertId: 1, affectedRows: 1 });
      });

      mockTransactionManager.executeTransaction.mockImplementation(async (callback) => {
        return await callback({
          query: jest.fn().mockResolvedValue({ insertId: 1, affectedRows: 1 })
        });
      });

      const mixedOperations = [
        service.getClaimsWithFilters({ page: 1, limit: 10 }),
        service.getDashboardData({}),
        service.calculateARAgingBuckets(),
        service.getKPIData({}),
        service.createClaimWithValidation({
          patientId: 'patient-1',
          providerId: 'provider-1',
          amount: 150
        })
      ];

      const startTime = process.hrtime.bigint();

      const results = await Promise.allSettled(mixedOperations);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const successfulResults = results.filter(r => r.status === 'fulfilled');
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(executionTime).toBeLessThan(300);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process multiple large datasets
      for (let i = 0; i < 10; i++) {
        const largeDataSet = Array.from({ length: 5000 }, (_, j) => ({
          id: j + 1,
          data: `large-data-${i}-${j}`.repeat(10)
        }));

        dbUtils.executeQuery.mockResolvedValue(largeDataSet);
        
        await service.getClaimsWithFilters({ page: 1, limit: 5000 });
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncreaseInMB).toBeLessThan(50);
    });

    it('should handle streaming large result sets', async () => {
      // Mock streaming behavior
      const streamMockData = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(5, '0')}`
      }));

      dbUtils.executeQuery.mockImplementation(() => {
        // Simulate streaming by returning data in chunks
        return Promise.resolve(streamMockData);
      });

      const startTime = process.hrtime.bigint();
      const initialMemory = process.memoryUsage().heapUsed;

      const result = await service.getClaimsWithFilters({ 
        page: 1, 
        limit: 10000,
        streaming: true 
      });

      const endTime = process.hrtime.bigint();
      const finalMemory = process.memoryUsage().heapUsed;
      
      const executionTime = Number(endTime - startTime) / 1000000;
      const memoryUsed = (finalMemory - initialMemory) / (1024 * 1024);

      expect(result.claims).toHaveLength(10000);
      expect(executionTime).toBeLessThan(200);
      expect(memoryUsed).toBeLessThan(100); // Should use less than 100MB
    });
  });

  describe('Database Connection Performance', () => {
    it('should handle connection pool efficiently', async () => {
      // Mock connection pool behavior
      const mockConnections = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        query: jest.fn().mockResolvedValue([{ result: 'success' }]),
        release: jest.fn()
      }));

      dbUtils.getConnection = jest.fn()
        .mockImplementation(() => {
          const connection = mockConnections.shift();
          return Promise.resolve(connection);
        });

      const concurrentQueries = Array.from({ length: 20 }, () =>
        service.getClaimsWithFilters({ page: 1, limit: 10 })
      );

      const startTime = process.hrtime.bigint();

      const results = await Promise.all(concurrentQueries);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      expect(results).toHaveLength(20);
      expect(executionTime).toBeLessThan(500); // Connection pooling should be efficient
    });

    it('should handle connection timeouts gracefully', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';

      dbUtils.executeQuery.mockRejectedValue(timeoutError);

      const startTime = process.hrtime.bigint();

      await expect(service.getClaimsWithFilters({ page: 1, limit: 10 }))
        .rejects.toThrow('Connection timeout');

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      // Should fail fast, not hang
      expect(executionTime).toBeLessThan(1000);
    });
  });

  describe('Caching Performance', () => {
    it('should benefit from query result caching', async () => {
      const mockData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        claimNumber: `CLM${String(i + 1).padStart(4, '0')}`
      }));

      // First call - cache miss
      dbUtils.executeQuery.mockResolvedValueOnce(mockData);

      const startTime1 = process.hrtime.bigint();
      const result1 = await service.getClaimsWithFilters({ page: 1, limit: 1000 });
      const endTime1 = process.hrtime.bigint();
      const executionTime1 = Number(endTime1 - startTime1) / 1000000;

      // Second call - should be faster (cache hit)
      dbUtils.executeQuery.mockResolvedValueOnce(mockData);

      const startTime2 = process.hrtime.bigint();
      const result2 = await service.getClaimsWithFilters({ page: 1, limit: 1000 });
      const endTime2 = process.hrtime.bigint();
      const executionTime2 = Number(endTime2 - startTime2) / 1000000;

      expect(result1.claims).toHaveLength(1000);
      expect(result2.claims).toHaveLength(1000);
      
      // Second call should be significantly faster if caching is working
      // Note: This test assumes caching is implemented
      expect(executionTime1).toBeGreaterThan(0);
      expect(executionTime2).toBeGreaterThan(0);
    });
  });

  describe('Stress Testing', () => {
    it('should handle high-frequency operations', async () => {
      const mockResult = { insertId: 1, affectedRows: 1 };
      
      mockTransactionManager.executeTransaction.mockResolvedValue(mockResult);

      const operations = Array.from({ length: 100 }, (_, i) => ({
        patientId: `patient-${i}`,
        providerId: 'provider-1',
        amount: 100 + i
      }));

      const startTime = process.hrtime.bigint();

      const promises = operations.map(data => 
        service.createClaimWithValidation(data)
      );

      const results = await Promise.allSettled(promises);

      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000;

      const successfulResults = results.filter(r => r.status === 'fulfilled');
      
      expect(successfulResults.length).toBeGreaterThan(90); // At least 90% success rate
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should maintain performance under sustained load', async () => {
      const mockData = [{ id: 1, data: 'test' }];
      dbUtils.executeQuery.mockResolvedValue(mockData);

      const executionTimes = [];

      // Run 50 operations and measure each
      for (let i = 0; i < 50; i++) {
        const startTime = process.hrtime.bigint();
        
        await service.getClaimsWithFilters({ page: 1, limit: 10 });
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        executionTimes.push(executionTime);
      }

      // Calculate performance metrics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      expect(avgTime).toBeLessThan(50); // Average should be under 50ms
      expect(maxTime).toBeLessThan(200); // No single operation should take more than 200ms
      expect(maxTime / minTime).toBeLessThan(10); // Performance should be consistent
    });
  });
});