/**
 * Comprehensive Transaction Manager
 * Advanced transaction handling with rollback mechanisms, nested transactions,
 * and comprehensive error recovery for RCM operations
 */

const pool = require('../config/db');
const { createDatabaseError } = require('../middleware/errorHandler');

/**
 * Transaction isolation levels
 */
const IsolationLevels = {
  READ_UNCOMMITTED: 'READ UNCOMMITTED',
  READ_COMMITTED: 'READ COMMITTED',
  REPEATABLE_READ: 'REPEATABLE READ',
  SERIALIZABLE: 'SERIALIZABLE'
};

/**
 * Transaction status enum
 */
const TransactionStatus = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMMITTED: 'committed',
  ROLLED_BACK: 'rolled_back',
  FAILED: 'failed'
};

/**
 * Advanced Transaction Manager Class
 */
class TransactionManager {
  constructor() {
    this.activeTransactions = new Map();
    this.transactionCounter = 0;
  }

  /**
   * Execute a function within a transaction with comprehensive error handling
   * @param {Function} callback - Function to execute within transaction
   * @param {Object} options - Transaction options
   * @returns {Promise<*>} Transaction result
   */
  async executeTransaction(callback, options = {}) {
    const {
      isolationLevel = IsolationLevels.READ_COMMITTED,
      timeout = 30000, // 30 seconds default timeout
      retryAttempts = 3,
      retryDelay = 1000,
      savepoints = false,
      onRollback = null,
      onCommit = null
    } = options;

    const transactionId = this.generateTransactionId();
    let connection = null;
    let attempt = 0;

    while (attempt < retryAttempts) {
      try {
        connection = await this.getConnection();
        
        // Set transaction isolation level
        await connection.execute(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
        
        // Begin transaction
        await connection.beginTransaction();
        
        // Track active transaction
        this.trackTransaction(transactionId, connection, {
          status: TransactionStatus.ACTIVE,
          startTime: Date.now(),
          isolationLevel,
          savepoints: []
        });

        // Set transaction timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Transaction timeout after ${timeout}ms`));
          }, timeout);
        });

        // Execute callback with timeout
        const result = await Promise.race([
          callback(connection, this.createTransactionContext(transactionId, connection)),
          timeoutPromise
        ]);

        // Commit transaction
        await connection.commit();
        
        // Update transaction status
        this.updateTransactionStatus(transactionId, TransactionStatus.COMMITTED);
        
        // Execute commit callback
        if (onCommit) {
          await onCommit(result);
        }

        // Log successful transaction
        this.logTransaction(transactionId, 'COMMITTED', {
          duration: Date.now() - this.getTransaction(transactionId).startTime,
          attempt: attempt + 1
        });

        return result;

      } catch (error) {
        attempt++;
        
        if (connection) {
          try {
            await connection.rollback();
            this.updateTransactionStatus(transactionId, TransactionStatus.ROLLED_BACK);
            
            // Execute rollback callback
            if (onRollback) {
              await onRollback(error);
            }
          } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
            this.updateTransactionStatus(transactionId, TransactionStatus.FAILED);
          }
        }

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt >= retryAttempts) {
          this.logTransaction(transactionId, 'FAILED', {
            error: error.message,
            attempt,
            retryable: isRetryable
          });
          
          throw createDatabaseError('Transaction failed', {
            originalError: error.message,
            transactionId,
            attempt,
            isolationLevel
          });
        }

        // Wait before retry
        await this.delay(retryDelay * attempt);
        
        console.warn(`Transaction attempt ${attempt} failed, retrying:`, error.message);

      } finally {
        if (connection) {
          connection.release();
        }
        this.cleanupTransaction(transactionId);
      }
    }
  }

  /**
   * Execute multiple operations in a single transaction
   * @param {Array} operations - Array of operation objects
   * @param {Object} options - Transaction options
   * @returns {Promise<Array>} Array of operation results
   */
  async executeBatch(operations, options = {}) {
    return this.executeTransaction(async (connection, context) => {
      const results = [];
      
      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        
        try {
          // Create savepoint for each operation if enabled
          if (options.savepoints) {
            await context.createSavepoint(`op_${i}`);
          }
          
          let result;
          
          if (typeof operation === 'function') {
            // Execute function operation
            result = await operation(connection, context);
          } else if (operation.query) {
            // Execute query operation
            const [queryResult] = await connection.execute(operation.query, operation.params || []);
            result = queryResult;
          } else {
            throw new Error(`Invalid operation at index ${i}`);
          }
          
          results.push({
            index: i,
            success: true,
            result
          });
          
        } catch (error) {
          if (options.savepoints) {
            // Rollback to savepoint
            await context.rollbackToSavepoint(`op_${i}`);
          }
          
          if (options.continueOnError) {
            results.push({
              index: i,
              success: false,
              error: error.message
            });
          } else {
            throw error;
          }
        }
      }
      
      return results;
    }, options);
  }

  /**
   * Execute a distributed transaction across multiple databases/services
   * @param {Array} participants - Array of transaction participants
   * @param {Object} options - Transaction options
   * @returns {Promise<*>} Transaction result
   */
  async executeDistributedTransaction(participants, options = {}) {
    const transactionId = this.generateTransactionId();
    const participantStates = new Map();
    
    try {
      // Phase 1: Prepare all participants
      for (const participant of participants) {
        try {
          await participant.prepare(transactionId);
          participantStates.set(participant.id, 'prepared');
        } catch (error) {
          participantStates.set(participant.id, 'failed');
          throw error;
        }
      }
      
      // Phase 2: Commit all participants
      const results = [];
      for (const participant of participants) {
        try {
          const result = await participant.commit(transactionId);
          participantStates.set(participant.id, 'committed');
          results.push(result);
        } catch (error) {
          // If any commit fails, rollback all
          await this.rollbackDistributedTransaction(participants, transactionId);
          throw error;
        }
      }
      
      return results;
      
    } catch (error) {
      // Rollback all prepared participants
      await this.rollbackDistributedTransaction(participants, transactionId);
      throw error;
    }
  }

  /**
   * Create a transaction context with helper methods
   * @param {string} transactionId - Transaction ID
   * @param {Object} connection - Database connection
   * @returns {Object} Transaction context
   */
  createTransactionContext(transactionId, connection) {
    return {
      transactionId,
      connection,
      
      // Savepoint management
      createSavepoint: async (name) => {
        await connection.execute(`SAVEPOINT ${name}`);
        const transaction = this.getTransaction(transactionId);
        if (transaction) {
          transaction.savepoints.push(name);
        }
      },
      
      rollbackToSavepoint: async (name) => {
        await connection.execute(`ROLLBACK TO SAVEPOINT ${name}`);
      },
      
      releaseSavepoint: async (name) => {
        await connection.execute(`RELEASE SAVEPOINT ${name}`);
        const transaction = this.getTransaction(transactionId);
        if (transaction) {
          transaction.savepoints = transaction.savepoints.filter(sp => sp !== name);
        }
      },
      
      // Query execution within transaction
      execute: async (query, params = []) => {
        const [result] = await connection.execute(query, params);
        return result;
      },
      
      // Batch operations
      executeBatch: async (queries) => {
        const results = [];
        for (const queryObj of queries) {
          const { query, params = [] } = queryObj;
          const [result] = await connection.execute(query, params);
          results.push(result);
        }
        return results;
      },
      
      // Lock management
      acquireLock: async (lockName, timeout = 10) => {
        const [result] = await connection.execute(
          'SELECT GET_LOCK(?, ?) as lock_result', 
          [lockName, timeout]
        );
        return result[0].lock_result === 1;
      },
      
      releaseLock: async (lockName) => {
        const [result] = await connection.execute(
          'SELECT RELEASE_LOCK(?) as release_result', 
          [lockName]
        );
        return result[0].release_result === 1;
      }
    };
  }

  /**
   * Get database connection with retry logic
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<Object>} Database connection
   */
  async getConnection(maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = await pool.getConnection();
        return connection;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw createDatabaseError('Failed to get database connection', {
            originalError: error.message,
            attempts: attempt
          });
        }
        
        await this.delay(1000 * attempt);
      }
    }
    
    throw lastError;
  }

  /**
   * Check if an error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ER_LOCK_WAIT_TIMEOUT',
      'ER_LOCK_DEADLOCK'
    ];
    
    const retryableMessages = [
      'Connection lost',
      'Connection timeout',
      'Deadlock found',
      'Lock wait timeout'
    ];
    
    return retryableCodes.includes(error.code) ||
           retryableMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Generate unique transaction ID
   * @returns {string} Transaction ID
   */
  generateTransactionId() {
    return `txn_${Date.now()}_${++this.transactionCounter}`;
  }

  /**
   * Track active transaction
   * @param {string} transactionId - Transaction ID
   * @param {Object} connection - Database connection
   * @param {Object} metadata - Transaction metadata
   */
  trackTransaction(transactionId, connection, metadata) {
    this.activeTransactions.set(transactionId, {
      connection,
      ...metadata
    });
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Object|null} Transaction data
   */
  getTransaction(transactionId) {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Update transaction status
   * @param {string} transactionId - Transaction ID
   * @param {string} status - New status
   */
  updateTransactionStatus(transactionId, status) {
    const transaction = this.activeTransactions.get(transactionId);
    if (transaction) {
      transaction.status = status;
      transaction.endTime = Date.now();
    }
  }

  /**
   * Cleanup transaction tracking
   * @param {string} transactionId - Transaction ID
   */
  cleanupTransaction(transactionId) {
    this.activeTransactions.delete(transactionId);
  }

  /**
   * Rollback distributed transaction
   * @param {Array} participants - Transaction participants
   * @param {string} transactionId - Transaction ID
   */
  async rollbackDistributedTransaction(participants, transactionId) {
    for (const participant of participants) {
      try {
        await participant.rollback(transactionId);
      } catch (error) {
        console.error(`Failed to rollback participant ${participant.id}:`, error);
      }
    }
  }

  /**
   * Log transaction activity
   * @param {string} transactionId - Transaction ID
   * @param {string} action - Action performed
   * @param {Object} metadata - Additional metadata
   */
  logTransaction(transactionId, action, metadata = {}) {
    console.log(`Transaction ${transactionId} ${action}:`, {
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get active transactions count
   * @returns {number} Number of active transactions
   */
  getActiveTransactionCount() {
    return this.activeTransactions.size;
  }

  /**
   * Get transaction statistics
   * @returns {Object} Transaction statistics
   */
  getTransactionStats() {
    const transactions = Array.from(this.activeTransactions.values());
    
    return {
      active: transactions.filter(t => t.status === TransactionStatus.ACTIVE).length,
      committed: transactions.filter(t => t.status === TransactionStatus.COMMITTED).length,
      rolledBack: transactions.filter(t => t.status === TransactionStatus.ROLLED_BACK).length,
      failed: transactions.filter(t => t.status === TransactionStatus.FAILED).length,
      total: transactions.length
    };
  }
}

/**
 * Singleton transaction manager instance
 */
const transactionManager = new TransactionManager();

/**
 * Convenience function for executing transactions
 * @param {Function} callback - Transaction callback
 * @param {Object} options - Transaction options
 * @returns {Promise<*>} Transaction result
 */
const executeTransaction = async (callback, options = {}) => {
  return transactionManager.executeTransaction(callback, options);
};

/**
 * Convenience function for batch operations
 * @param {Array} operations - Operations to execute
 * @param {Object} options - Transaction options
 * @returns {Promise<Array>} Batch results
 */
const executeBatch = async (operations, options = {}) => {
  return transactionManager.executeBatch(operations, options);
};

/**
 * Transaction decorator for service methods
 * @param {Object} options - Transaction options
 * @returns {Function} Method decorator
 */
const transactional = (options = {}) => {
  return (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      return executeTransaction(async (connection, context) => {
        // Replace the first argument with transaction context if it's a connection
        const modifiedArgs = args.map((arg, index) => {
          if (index === 0 && typeof arg === 'object' && arg.execute) {
            return context;
          }
          return arg;
        });
        
        return originalMethod.apply(this, modifiedArgs);
      }, options);
    };
    
    return descriptor;
  };
};

module.exports = {
  TransactionManager,
  transactionManager,
  executeTransaction,
  executeBatch,
  transactional,
  IsolationLevels,
  TransactionStatus
};