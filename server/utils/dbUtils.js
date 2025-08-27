const pool = require('../config/db');

/**
 * Database Utilities
 * Standardized database connection and query handling for RCM operations
 */

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  enableLogging: process.env.NODE_ENV !== 'production',
  slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000, // 1 second
  logSlowQueries: process.env.LOG_SLOW_QUERIES === 'true',
  maxLoggedQueries: 100
};

// In-memory storage for query performance metrics
const queryMetrics = {
  totalQueries: 0,
  slowQueries: [],
  averageResponseTime: 0,
  totalResponseTime: 0,
  queryTypes: new Map()
};

/**
 * Log query performance metrics
 * @param {string} query - SQL query
 * @param {number} executionTime - Query execution time in ms
 * @param {boolean} isSlowQuery - Whether this is a slow query
 */
const logQueryPerformance = (query, executionTime, isSlowQuery = false) => {
  if (!PERFORMANCE_CONFIG.enableLogging) return;

  queryMetrics.totalQueries++;
  queryMetrics.totalResponseTime += executionTime;
  queryMetrics.averageResponseTime = queryMetrics.totalResponseTime / queryMetrics.totalQueries;

  // Track query types
  const queryType = query.trim().split(' ')[0].toUpperCase();
  const currentCount = queryMetrics.queryTypes.get(queryType) || 0;
  queryMetrics.queryTypes.set(queryType, currentCount + 1);

  if (isSlowQuery && PERFORMANCE_CONFIG.logSlowQueries) {
    const slowQueryInfo = {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      executionTime,
      timestamp: new Date().toISOString(),
      queryType
    };

    queryMetrics.slowQueries.push(slowQueryInfo);

    // Keep only the most recent slow queries
    if (queryMetrics.slowQueries.length > PERFORMANCE_CONFIG.maxLoggedQueries) {
      queryMetrics.slowQueries = queryMetrics.slowQueries.slice(-PERFORMANCE_CONFIG.maxLoggedQueries);
    }

    console.warn('Slow query detected:', slowQueryInfo);
  }
};

/**
 * Get a connection from the pool
 * @returns {Promise<Connection>} Database connection
 */
const getConnection = async () => {
  try {
    const connection = await pool.getConnection();
    return connection;
  } catch (error) {
    console.error('Error getting database connection:', error);
    throw new Error('Database connection failed');
  }
};

/**
 * Execute a single query with automatic connection management and performance monitoring
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
const executeQuery = async (query, params = []) => {
  let connection;
  const startTime = Date.now();
  
  try {
    connection = await getConnection();
    const [results] = await connection.execute(query, params);
    
    // Log performance metrics
    const executionTime = Date.now() - startTime;
    const isSlowQuery = executionTime > PERFORMANCE_CONFIG.slowQueryThreshold;
    logQueryPerformance(query, executionTime, isSlowQuery);
    
    return results;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Database query error:', {
      query: query.substring(0, 100) + '...', // Log first 100 chars of query
      params: params,
      executionTime: `${executionTime}ms`,
      error: error.message
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Execute multiple queries in a transaction with performance monitoring
 * @param {Array} queries - Array of query objects with {query, params}
 * @returns {Promise<Array>} Array of query results
 */
const executeTransaction = async (queries) => {
  let connection;
  const startTime = Date.now();
  
  try {
    connection = await getConnection();
    await connection.beginTransaction();
    
    const results = [];
    
    for (const queryObj of queries) {
      const { query, params = [] } = queryObj;
      const queryStartTime = Date.now();
      const [result] = await connection.execute(query, params);
      
      // Log individual query performance within transaction
      const queryExecutionTime = Date.now() - queryStartTime;
      const isSlowQuery = queryExecutionTime > PERFORMANCE_CONFIG.slowQueryThreshold;
      logQueryPerformance(query, queryExecutionTime, isSlowQuery);
      
      results.push(result);
    }
    
    await connection.commit();
    
    // Log overall transaction performance
    const totalExecutionTime = Date.now() - startTime;
    if (PERFORMANCE_CONFIG.enableLogging) {
      console.log(`Transaction completed: ${queries.length} queries in ${totalExecutionTime}ms`);
    }
    
    return results;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    
    const executionTime = Date.now() - startTime;
    console.error('Transaction error:', {
      queriesCount: queries.length,
      executionTime: `${executionTime}ms`,
      error: error.message
    });
    
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Execute a query with pagination support
 * @param {string} baseQuery - Base SQL query without LIMIT clause
 * @param {string} countQuery - Query to get total count
 * @param {Array} params - Query parameters
 * @param {Object} pagination - Pagination options {page, limit}
 * @returns {Promise<Object>} Results with pagination metadata
 */
const executeQueryWithPagination = async (baseQuery, countQuery, params = [], pagination = {}) => {
  const { page = 1, limit = 10 } = pagination;
  const offset = (page - 1) * limit;
  
  try {
    // Execute count query and main query in parallel
    const [totalResults, dataResults] = await Promise.all([
      executeQuery(countQuery, params),
      executeQuery(`${baseQuery} LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)])
    ]);
    
    const total = totalResults[0]?.total || totalResults.length;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data: dataResults,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Paginated query error:', error);
    throw error;
  }
};

/**
 * Execute a query with retry logic for transient failures
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<Array>} Query results
 */
const executeQueryWithRetry = async (query, params = [], maxRetries = 3, retryDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeQuery(query, params);
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable (connection issues, timeouts, etc.)
      const isRetryable = error.code === 'ECONNRESET' || 
                         error.code === 'ETIMEDOUT' || 
                         error.code === 'ENOTFOUND' ||
                         error.message.includes('Connection lost');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      console.warn(`Query attempt ${attempt} failed, retrying in ${retryDelay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw lastError;
};

/**
 * Build dynamic WHERE clause from filters
 * @param {Object} filters - Filter object
 * @param {Array} allowedFields - Array of allowed field names for security
 * @returns {Object} {whereClause, params}
 */
const buildWhereClause = (filters, allowedFields = []) => {
  const conditions = [];
  const params = [];
  
  if (!filters || typeof filters !== 'object') {
    return { whereClause: '', params: [] };
  }
  
  Object.entries(filters).forEach(([key, value]) => {
    // Security check - only allow whitelisted fields
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      console.warn(`Filtered out disallowed field: ${key}`);
      return;
    }
    
    if (value === null || value === undefined) {
      return;
    }
    
    if (Array.isArray(value)) {
      // Handle IN clause
      const placeholders = value.map(() => '?').join(',');
      conditions.push(`${key} IN (${placeholders})`);
      params.push(...value);
    } else if (typeof value === 'object' && value.operator) {
      // Handle custom operators like {operator: 'LIKE', value: '%search%'}
      conditions.push(`${key} ${value.operator} ?`);
      params.push(value.value);
    } else {
      // Handle simple equality
      conditions.push(`${key} = ?`);
      params.push(value);
    }
  });
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  return { whereClause, params };
};

/**
 * Safely close a connection (handles both pool connections and individual connections)
 * @param {Connection} connection - Database connection to close
 */
const closeConnection = async (connection) => {
  try {
    if (connection) {
      // Check if it's a pool connection (has release method) or individual connection
      if (typeof connection.release === 'function') {
        connection.release();
      } else if (typeof connection.end === 'function') {
        await connection.end();
      }
    }
  } catch (error) {
    console.error('Error closing connection:', error);
  }
};

/**
 * Get database health status
 * @returns {Promise<Object>} Health status information
 */
const getHealthStatus = async () => {
  try {
    const startTime = Date.now();
    await executeQuery('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    
    // Get pool status
    const poolStatus = {
      totalConnections: pool.pool._allConnections.length,
      freeConnections: pool.pool._freeConnections.length,
      usedConnections: pool.pool._allConnections.length - pool.pool._freeConnections.length
    };
    
    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      pool: poolStatus,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Execute a stored procedure
 * @param {string} procedureName - Name of the stored procedure
 * @param {Array} params - Procedure parameters
 * @returns {Promise<Array>} Procedure results
 */
const executeStoredProcedure = async (procedureName, params = []) => {
  const placeholders = params.map(() => '?').join(',');
  const query = `CALL ${procedureName}(${placeholders})`;
  
  try {
    return await executeQuery(query, params);
  } catch (error) {
    console.error(`Stored procedure error (${procedureName}):`, error);
    throw error;
  }
};

/**
 * Batch insert with automatic chunking for large datasets
 * @param {string} tableName - Target table name
 * @param {Array} columns - Array of column names
 * @param {Array} rows - Array of row data arrays
 * @param {number} chunkSize - Number of rows per batch (default: 1000)
 * @returns {Promise<Object>} Insert results
 */
const batchInsert = async (tableName, columns, rows, chunkSize = 1000) => {
  if (!rows.length) {
    return { affectedRows: 0, insertedRows: 0 };
  }
  
  const columnList = columns.join(', ');
  const valuePlaceholder = `(${columns.map(() => '?').join(', ')})`;
  
  let totalAffectedRows = 0;
  const startTime = Date.now();
  
  try {
    // Process in chunks
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const valuePlaceholders = chunk.map(() => valuePlaceholder).join(', ');
      const query = `INSERT INTO ${tableName} (${columnList}) VALUES ${valuePlaceholders}`;
      
      // Flatten the chunk data for parameters
      const params = chunk.flat();
      
      const result = await executeQuery(query, params);
      totalAffectedRows += result.affectedRows || 0;
    }
    
    const executionTime = Date.now() - startTime;
    if (PERFORMANCE_CONFIG.enableLogging) {
      console.log(`Batch insert completed: ${rows.length} rows in ${executionTime}ms`);
    }
    
    return {
      affectedRows: totalAffectedRows,
      insertedRows: rows.length,
      executionTime
    };
  } catch (error) {
    console.error(`Batch insert error (${tableName}):`, error);
    throw error;
  }
};

/**
 * Get query performance metrics
 * @returns {Object} Performance statistics
 */
const getQueryMetrics = () => {
  return {
    ...queryMetrics,
    queryTypes: Object.fromEntries(queryMetrics.queryTypes),
    slowQueryThreshold: PERFORMANCE_CONFIG.slowQueryThreshold,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Reset query performance metrics
 */
const resetQueryMetrics = () => {
  queryMetrics.totalQueries = 0;
  queryMetrics.slowQueries = [];
  queryMetrics.averageResponseTime = 0;
  queryMetrics.totalResponseTime = 0;
  queryMetrics.queryTypes.clear();
};

/**
 * Execute a query with detailed performance analysis
 * @param {string} query - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query results with performance data
 */
const executeQueryWithAnalysis = async (query, params = []) => {
  const startTime = Date.now();
  const memoryBefore = process.memoryUsage();
  
  try {
    const results = await executeQuery(query, params);
    const executionTime = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    
    return {
      results,
      performance: {
        executionTime,
        memoryUsage: {
          heapUsedDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
          heapTotalDelta: memoryAfter.heapTotal - memoryBefore.heapTotal
        },
        resultCount: Array.isArray(results) ? results.length : 1,
        isSlowQuery: executionTime > PERFORMANCE_CONFIG.slowQueryThreshold
      }
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    throw {
      ...error,
      performance: {
        executionTime,
        failed: true
      }
    };
  }
};

/**
 * Execute query and return single result
 * @param {string} query - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object|null>} Single result or null
 */
const executeQuerySingle = async (query, params = []) => {
  try {
    const results = await executeQuery(query, params);
    return results && results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Execute query single error:', error);
    throw error;
  }
};

/**
 * Log audit trail for database operations
 * @param {Object} auditData - Audit data
 * @returns {Promise<void>}
 */
const auditLog = async (auditData) => {
  try {
    const {
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      timestamp = new Date()
    } = auditData;

    await executeQuery(`
      INSERT INTO audit_logs (
        table_name, record_id, action, old_values, 
        new_values, user_id, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      timestamp
    ]);

  } catch (error) {
    // Don't throw error for audit logging to prevent breaking main operations
    console.error('Audit log error:', error);
  }
};

module.exports = {
  getConnection,
  executeQuery,
  executeQuerySingle,
  executeTransaction,
  executeQueryWithPagination,
  executeQueryWithRetry,
  buildWhereClause,
  closeConnection,
  getHealthStatus,
  executeStoredProcedure,
  batchInsert,
  auditLog,
  
  // Performance monitoring functions
  getQueryMetrics,
  resetQueryMetrics,
  executeQueryWithAnalysis,
  
  // Export the pool for advanced use cases
  pool
};