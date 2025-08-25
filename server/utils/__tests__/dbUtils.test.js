const dbUtils = require('../dbUtils');

// Mock the database pool
jest.mock('../../config/db', () => ({
  getConnection: jest.fn(),
  pool: {
    _allConnections: [1, 2, 3],
    _freeConnections: [1, 2]
  }
}));

const mockPool = require('../../config/db');

describe('Database Utils', () => {
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      execute: jest.fn(),
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      end: jest.fn()
    };

    mockPool.getConnection.mockResolvedValue(mockConnection);
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('should execute query successfully and release connection', async () => {
      const mockResults = [{ id: 1, name: 'test' }];
      mockConnection.execute.mockResolvedValue([mockResults]);

      const result = await dbUtils.executeQuery('SELECT * FROM test', []);

      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM test', []);
      expect(mockConnection.release).toHaveBeenCalled();
      expect(result).toEqual(mockResults);
    });

    it('should handle query errors and release connection', async () => {
      const error = new Error('Query failed');
      mockConnection.execute.mockRejectedValue(error);

      await expect(dbUtils.executeQuery('SELECT * FROM test')).rejects.toThrow('Query failed');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockPool.getConnection.mockRejectedValue(new Error('Connection failed'));

      await expect(dbUtils.executeQuery('SELECT * FROM test')).rejects.toThrow('Connection failed');
    });
  });

  describe('executeTransaction', () => {
    it('should execute multiple queries in transaction', async () => {
      const queries = [
        { query: 'INSERT INTO test (name) VALUES (?)', params: ['test1'] },
        { query: 'INSERT INTO test (name) VALUES (?)', params: ['test2'] }
      ];

      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([{ insertId: 2 }]);

      const results = await dbUtils.executeTransaction(queries);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.execute).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
      expect(results).toHaveLength(2);
    });

    it('should rollback on error', async () => {
      const queries = [
        { query: 'INSERT INTO test (name) VALUES (?)', params: ['test1'] },
        { query: 'INSERT INTO test (name) VALUES (?)', params: ['test2'] }
      ];

      mockConnection.execute
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockRejectedValueOnce(new Error('Second query failed'));

      await expect(dbUtils.executeTransaction(queries)).rejects.toThrow('Second query failed');
      
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('executeQueryWithPagination', () => {
    it('should execute paginated query with metadata', async () => {
      const countResult = [{ total: 25 }];
      const dataResult = [{ id: 1 }, { id: 2 }];

      // Mock executeQuery to return different results based on query
      jest.spyOn(dbUtils, 'executeQuery')
        .mockResolvedValueOnce(countResult)
        .mockResolvedValueOnce(dataResult);

      const result = await dbUtils.executeQueryWithPagination(
        'SELECT * FROM test',
        'SELECT COUNT(*) as total FROM test',
        [],
        { page: 2, limit: 10 }
      );

      expect(result.data).toEqual(dataResult);
      expect(result.pagination).toEqual({
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      });
    });
  });

  describe('executeQueryWithRetry', () => {
    it('should retry on retryable errors', async () => {
      const retryableError = new Error('Connection lost');
      retryableError.code = 'ECONNRESET';

      jest.spyOn(dbUtils, 'executeQuery')
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce([{ id: 1 }]);

      // Mock setTimeout to resolve immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => fn());

      const result = await dbUtils.executeQueryWithRetry('SELECT * FROM test', [], 3, 100);

      expect(result).toEqual([{ id: 1 }]);
      expect(dbUtils.executeQuery).toHaveBeenCalledTimes(3);

      global.setTimeout.mockRestore();
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Syntax error');
      
      jest.spyOn(dbUtils, 'executeQuery').mockRejectedValue(nonRetryableError);

      await expect(dbUtils.executeQueryWithRetry('SELECT * FROM test')).rejects.toThrow('Syntax error');
      expect(dbUtils.executeQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildWhereClause', () => {
    it('should build WHERE clause from filters', () => {
      const filters = {
        status: 'active',
        age: 25,
        category: ['A', 'B', 'C']
      };

      const allowedFields = ['status', 'age', 'category'];
      const result = dbUtils.buildWhereClause(filters, allowedFields);

      expect(result.whereClause).toBe('WHERE status = ? AND age = ? AND category IN (?,?,?)');
      expect(result.params).toEqual(['active', 25, 'A', 'B', 'C']);
    });

    it('should filter out disallowed fields', () => {
      const filters = {
        status: 'active',
        maliciousField: 'DROP TABLE'
      };

      const allowedFields = ['status'];
      const result = dbUtils.buildWhereClause(filters, allowedFields);

      expect(result.whereClause).toBe('WHERE status = ?');
      expect(result.params).toEqual(['active']);
    });

    it('should handle custom operators', () => {
      const filters = {
        name: { operator: 'LIKE', value: '%test%' },
        age: { operator: '>', value: 18 }
      };

      const result = dbUtils.buildWhereClause(filters, ['name', 'age']);

      expect(result.whereClause).toBe('WHERE name LIKE ? AND age > ?');
      expect(result.params).toEqual(['%test%', 18]);
    });

    it('should return empty clause for no filters', () => {
      const result = dbUtils.buildWhereClause({});
      expect(result.whereClause).toBe('');
      expect(result.params).toEqual([]);
    });
  });

  describe('closeConnection', () => {
    it('should release pool connection', async () => {
      await dbUtils.closeConnection(mockConnection);
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should end individual connection', async () => {
      const individualConnection = { end: jest.fn() };
      await dbUtils.closeConnection(individualConnection);
      expect(individualConnection.end).toHaveBeenCalled();
    });

    it('should handle null connection gracefully', async () => {
      await expect(dbUtils.closeConnection(null)).resolves.not.toThrow();
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', async () => {
      jest.spyOn(dbUtils, 'executeQuery').mockResolvedValue([{ health_check: 1 }]);

      const status = await dbUtils.getHealthStatus();

      expect(status.status).toBe('healthy');
      expect(status.responseTime).toMatch(/\d+ms/);
      expect(status.pool).toBeDefined();
    });

    it('should return unhealthy status on error', async () => {
      jest.spyOn(dbUtils, 'executeQuery').mockRejectedValue(new Error('DB down'));

      const status = await dbUtils.getHealthStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.error).toBe('DB down');
    });
  });

  describe('batchInsert', () => {
    it('should perform batch insert', async () => {
      const mockResult = { affectedRows: 2 };
      jest.spyOn(dbUtils, 'executeQuery').mockResolvedValue(mockResult);

      const result = await dbUtils.batchInsert(
        'test_table',
        ['name', 'email'],
        [['John', 'john@test.com'], ['Jane', 'jane@test.com']],
        1000
      );

      expect(result.affectedRows).toBe(2);
      expect(result.insertedRows).toBe(2);
      expect(dbUtils.executeQuery).toHaveBeenCalledWith(
        'INSERT INTO test_table (name, email) VALUES (?, ?), (?, ?)',
        ['John', 'john@test.com', 'Jane', 'jane@test.com']
      );
    });

    it('should handle empty rows', async () => {
      const result = await dbUtils.batchInsert('test_table', ['name'], []);
      expect(result.affectedRows).toBe(0);
      expect(result.insertedRows).toBe(0);
    });
  });
});