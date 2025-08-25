/**
 * Enhanced Pagination Utilities
 * Provides cursor-based pagination and caching for RCM operations
 */

const { executeQuery } = require('./dbUtils');

/**
 * Pagination types
 */
const PAGINATION_TYPES = {
  OFFSET: 'offset',
  CURSOR: 'cursor'
};

/**
 * Execute query with cursor-based pagination
 * More efficient for large datasets as it doesn't require counting all records
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Results with cursor pagination metadata
 */
const executeQueryWithCursorPagination = async (options) => {
  const {
    baseQuery,
    params = [],
    cursorColumn = 'id',
    cursor = null,
    limit = 10,
    direction = 'ASC',
    orderBy = cursorColumn
  } = options;

  try {
    let query = baseQuery;
    let queryParams = [...params];

    // Add cursor condition if provided
    if (cursor) {
      const operator = direction === 'ASC' ? '>' : '<';
      query += ` AND ${cursorColumn} ${operator} ?`;
      queryParams.push(cursor);
    }

    // Add ordering and limit
    query += ` ORDER BY ${orderBy} ${direction} LIMIT ?`;
    queryParams.push(parseInt(limit) + 1); // Get one extra to check if there's a next page

    const results = await executeQuery(query, queryParams);
    
    // Check if there are more results
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    
    // Get next cursor
    let nextCursor = null;
    if (hasMore && data.length > 0) {
      nextCursor = data[data.length - 1][cursorColumn];
    }

    return {
      data,
      pagination: {
        hasMore,
        nextCursor,
        limit: parseInt(limit),
        direction,
        cursorColumn
      }
    };

  } catch (error) {
    console.error('Cursor pagination error:', error);
    throw error;
  }
};

/**
 * Execute query with enhanced offset pagination
 * Includes performance optimizations and metadata
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Results with enhanced pagination metadata
 */
const executeQueryWithEnhancedPagination = async (options) => {
  const {
    baseQuery,
    countQuery,
    params = [],
    page = 1,
    limit = 10,
    enableCount = true,
    cacheKey = null,
    cacheTTL = 300 // 5 minutes
  } = options;

  const offset = (page - 1) * limit;
  
  try {
    let total = null;
    let totalPages = null;

    // Execute queries
    const queries = [
      executeQuery(`${baseQuery} LIMIT ? OFFSET ?`, [...params, parseInt(limit), parseInt(offset)])
    ];

    // Add count query if enabled
    if (enableCount) {
      queries.push(executeQuery(countQuery, params));
    }

    const results = await Promise.all(queries);
    const dataResults = results[0];
    
    if (enableCount) {
      const totalResults = results[1];
      total = totalResults[0]?.total || totalResults.length;
      totalPages = Math.ceil(total / limit);
    }

    // Calculate pagination metadata
    const currentPage = parseInt(page);
    const pageLimit = parseInt(limit);
    
    return {
      data: dataResults,
      pagination: {
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages,
        hasNext: enableCount ? currentPage < totalPages : dataResults.length === pageLimit,
        hasPrev: currentPage > 1,
        offset,
        enableCount
      },
      meta: {
        resultCount: dataResults.length,
        generatedAt: new Date().toISOString(),
        cached: false
      }
    };

  } catch (error) {
    console.error('Enhanced pagination error:', error);
    throw error;
  }
};

/**
 * Build pagination metadata for API responses
 * @param {Object} paginationResult - Result from pagination function
 * @param {Object} requestInfo - Request information
 * @returns {Object} Standardized pagination metadata
 */
const buildPaginationMeta = (paginationResult, requestInfo = {}) => {
  const { pagination, meta } = paginationResult;
  const { baseUrl = '', query = {} } = requestInfo;

  const links = {};

  if (pagination.type === PAGINATION_TYPES.CURSOR) {
    // Cursor-based pagination links
    if (pagination.hasMore && pagination.nextCursor) {
      links.next = `${baseUrl}?${new URLSearchParams({
        ...query,
        cursor: pagination.nextCursor,
        limit: pagination.limit
      }).toString()}`;
    }
  } else {
    // Offset-based pagination links
    if (pagination.hasPrev) {
      links.prev = `${baseUrl}?${new URLSearchParams({
        ...query,
        page: pagination.page - 1,
        limit: pagination.limit
      }).toString()}`;
    }

    if (pagination.hasNext) {
      links.next = `${baseUrl}?${new URLSearchParams({
        ...query,
        page: pagination.page + 1,
        limit: pagination.limit
      }).toString()}`;
    }

    if (pagination.totalPages) {
      links.first = `${baseUrl}?${new URLSearchParams({
        ...query,
        page: 1,
        limit: pagination.limit
      }).toString()}`;

      links.last = `${baseUrl}?${new URLSearchParams({
        ...query,
        page: pagination.totalPages,
        limit: pagination.limit
      }).toString()}`;
    }
  }

  return {
    ...pagination,
    links,
    meta: {
      ...meta,
      requestedAt: new Date().toISOString()
    }
  };
};

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} Validated and sanitized parameters
 */
const validatePaginationParams = (params) => {
  const {
    page = 1,
    limit = 10,
    cursor = null,
    direction = 'ASC',
    type = PAGINATION_TYPES.OFFSET
  } = params;

  // Validate and sanitize parameters
  const validatedParams = {
    page: Math.max(1, parseInt(page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(limit) || 10)), // Max 100 items per page
    cursor: cursor || null,
    direction: ['ASC', 'DESC'].includes(direction?.toUpperCase()) ? direction.toUpperCase() : 'ASC',
    type: Object.values(PAGINATION_TYPES).includes(type) ? type : PAGINATION_TYPES.OFFSET
  };

  return validatedParams;
};

/**
 * Calculate pagination statistics
 * @param {Object} pagination - Pagination metadata
 * @returns {Object} Pagination statistics
 */
const calculatePaginationStats = (pagination) => {
  const stats = {
    currentPage: pagination.page,
    totalPages: pagination.totalPages,
    totalItems: pagination.total,
    itemsPerPage: pagination.limit,
    currentPageItems: pagination.data?.length || 0
  };

  if (pagination.total && pagination.limit) {
    stats.percentageComplete = Math.round((pagination.page / pagination.totalPages) * 100);
    stats.itemsRemaining = Math.max(0, pagination.total - (pagination.page * pagination.limit));
  }

  return stats;
};

/**
 * Create pagination helper for specific query patterns
 * @param {Object} config - Configuration for the pagination helper
 * @returns {Function} Configured pagination function
 */
const createPaginationHelper = (config) => {
  const {
    baseQuery,
    countQuery,
    defaultLimit = 10,
    maxLimit = 100,
    defaultSort = 'id ASC'
  } = config;

  return async (params = {}) => {
    const validatedParams = validatePaginationParams({
      ...params,
      limit: Math.min(maxLimit, params.limit || defaultLimit)
    });

    if (validatedParams.type === PAGINATION_TYPES.CURSOR) {
      return executeQueryWithCursorPagination({
        baseQuery,
        params: params.queryParams || [],
        cursor: validatedParams.cursor,
        limit: validatedParams.limit,
        direction: validatedParams.direction,
        cursorColumn: params.cursorColumn || 'id'
      });
    } else {
      return executeQueryWithEnhancedPagination({
        baseQuery,
        countQuery,
        params: params.queryParams || [],
        page: validatedParams.page,
        limit: validatedParams.limit,
        enableCount: params.enableCount !== false
      });
    }
  };
};

module.exports = {
  PAGINATION_TYPES,
  executeQueryWithCursorPagination,
  executeQueryWithEnhancedPagination,
  buildPaginationMeta,
  validatePaginationParams,
  calculatePaginationStats,
  createPaginationHelper
};