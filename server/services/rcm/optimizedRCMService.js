/**
 * Optimized RCM Service Layer
 * Performance-optimized version of RCM operations with improved queries and caching
 */

const moment = require('moment');
const {
  formatCurrency,
  formatDate,
  calculateDaysInAR,
  validateClaimData,
  calculateCollectionRate,
  calculateDenialRate,
  getAgingBucket,
  getCollectabilityScore,
  getClaimRecommendations
} = require('../../utils/rcmUtils');
const {
  executeQuery,
  executeTransaction,
  executeQueryWithPagination,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  executeQueryWithCursorPagination,
  executeQueryWithEnhancedPagination,
  validatePaginationParams,
  PAGINATION_TYPES
} = require('../../utils/paginationUtils');
const {
  getFromCache,
  setInCache,
  generateCacheKey
} = require('../../utils/cacheUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');

/**
 * Optimized RCM Service Class
 * Provides performance-optimized business logic for RCM operations
 */
class OptimizedRCMService {
  constructor() {
    this.name = 'OptimizedRCMService';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cached data or execute query
   * @param {string} key - Cache key
   * @param {Function} queryFn - Function that returns query promise
   * @param {number} timeout - Cache timeout in milliseconds
   * @returns {Promise} Query result
   */
  async getCachedData(key, queryFn, timeout = this.cacheTimeout) {
    const cached = this.cache.get(key);
    
    if (cached && (Date.now() - cached.timestamp) < timeout) {
      return cached.data;
    }
    
    const data = await queryFn();
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }

  /**
   * Clear cache for specific key or all cache
   * @param {string} key - Cache key to clear (optional)
   */
  clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Invalidate related caches when data changes
   * @param {string} operation - Type of operation (create, update, delete)
   * @param {Object} data - Data that was changed
   */
  async invalidateRelatedCaches(operation, data = {}) {
    const { deleteFromCache } = require('../../utils/cacheUtils');
    
    try {
      const invalidationPatterns = [];

      // Always invalidate dashboard cache
      invalidationPatterns.push('rcm:dashboard:*');

      // Invalidate claims cache
      if (operation.includes('claim')) {
        invalidationPatterns.push('rcm:claims:*');
      }

      // Invalidate A/R aging cache
      if (operation.includes('payment') || operation.includes('claim')) {
        invalidationPatterns.push('rcm:ar_aging:*');
      }

      // Invalidate denial analytics cache
      if (data.status === 3 || operation.includes('denial')) {
        invalidationPatterns.push('rcm:denial_analytics:*');
      }

      // Execute cache invalidation
      const invalidationPromises = invalidationPatterns.map(pattern => 
        deleteFromCache(pattern)
      );

      await Promise.all(invalidationPromises);

      // Also clear service-level cache
      this.clearCache();

      console.log(`Cache invalidated for operation: ${operation}`);

    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Get optimized RCM Dashboard Data
   * Uses single query with subqueries for better performance
   * @param {Object} options - Query options
   * @returns {Object} Dashboard data with KPIs and metrics
   */
  async getDashboardData(options = {}) {
    const { timeframe = '30d', userId } = options;
    const cacheKey = `dashboard_${timeframe}_${userId || 'all'}`;

    try {
      return await this.getCachedData(cacheKey, async () => {
        // Build date filter based on timeframe
        const dateFilter = this.buildDateFilter(timeframe);
        
        // Single optimized query for all dashboard metrics
        const dashboardQuery = `
          SELECT 
            -- Claims summary
            COUNT(*) as total_claims,
            SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as draft_claims,
            SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as submitted_claims,
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as paid_claims,
            SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as denied_claims,
            
            -- Financial summary
            SUM(total_amount) as total_billed,
            SUM(CASE WHEN status = 2 THEN total_amount ELSE 0 END) as total_collected,
            AVG(total_amount) as avg_claim_amount,
            
            -- A/R Aging (optimized with single pass)
            SUM(CASE 
              WHEN status IN (1, 3) AND DATEDIFF(CURDATE(), service_date) <= 30 
              THEN total_amount ELSE 0 
            END) as aging_0_30,
            SUM(CASE 
              WHEN status IN (1, 3) AND DATEDIFF(CURDATE(), service_date) BETWEEN 31 AND 60 
              THEN total_amount ELSE 0 
            END) as aging_31_60,
            SUM(CASE 
              WHEN status IN (1, 3) AND DATEDIFF(CURDATE(), service_date) BETWEEN 61 AND 90 
              THEN total_amount ELSE 0 
            END) as aging_61_90,
            SUM(CASE 
              WHEN status IN (1, 3) AND DATEDIFF(CURDATE(), service_date) > 90 
              THEN total_amount ELSE 0 
            END) as aging_90_plus,
            
            -- Denial analytics
            SUM(CASE WHEN status = 3 THEN total_amount ELSE 0 END) as denied_amount,
            AVG(CASE WHEN status = 3 THEN total_amount ELSE NULL END) as avg_denial_amount
            
          FROM billings 
          WHERE 1=1 ${dateFilter}
        `;

        const dashboardData = await executeQuerySingle(dashboardQuery);

        // Get recent activity with optimized query
        const activityQuery = `
          SELECT 
            DATE(created) as activity_date,
            COUNT(*) as submissions,
            SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as payments,
            SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as denials
          FROM billings 
          WHERE created >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY DATE(created)
          ORDER BY activity_date DESC
          LIMIT 7
        `;

        const recentActivity = await executeQuery(activityQuery);

        // Calculate KPIs
        const collectionRate = calculateCollectionRate(
          dashboardData.total_collected || 0,
          dashboardData.total_billed || 0
        );

        const denialRate = calculateDenialRate(
          dashboardData.denied_claims || 0,
          dashboardData.total_claims || 0
        );

        const totalAR = (dashboardData.aging_0_30 || 0) + (dashboardData.aging_31_60 || 0) + 
                       (dashboardData.aging_61_90 || 0) + (dashboardData.aging_90_plus || 0);

        return {
          summary: {
            totalClaims: dashboardData.total_claims || 0,
            totalBilled: dashboardData.total_billed || 0,
            totalCollected: dashboardData.total_collected || 0,
            totalAR: totalAR,
            collectionRate: collectionRate,
            denialRate: denialRate,
            avgClaimAmount: dashboardData.avg_claim_amount || 0
          },
          claimsBreakdown: {
            draft: dashboardData.draft_claims || 0,
            submitted: dashboardData.submitted_claims || 0,
            paid: dashboardData.paid_claims || 0,
            denied: dashboardData.denied_claims || 0
          },
          arAging: {
            aging_0_30: dashboardData.aging_0_30 || 0,
            aging_31_60: dashboardData.aging_31_60 || 0,
            aging_61_90: dashboardData.aging_61_90 || 0,
            aging_90_plus: dashboardData.aging_90_plus || 0
          },
          denialAnalytics: {
            totalDenials: dashboardData.denied_claims || 0,
            deniedAmount: dashboardData.denied_amount || 0,
            avgDenialAmount: dashboardData.avg_denial_amount || 0
          },
          recentActivity: recentActivity || [],
          timeframe: timeframe,
          generatedAt: new Date().toISOString(),
          cached: false
        };
      });

    } catch (error) {
      throw createDatabaseError('Failed to fetch optimized dashboard data', {
        originalError: error.message,
        timeframe,
        userId
      });
    }
  }

  /**
   * Get Claims Status with enhanced pagination and caching
   * Supports both cursor-based and offset-based pagination
   * @param {Object} options - Query options
   * @returns {Object} Claims data with enhanced pagination
   */
  async getClaimsStatus(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      search = '',
      priority = 'all',
      dateFrom,
      dateTo,
      paginationType = PAGINATION_TYPES.OFFSET,
      cursor = null,
      enableCache = true,
      cacheTTL = 300
    } = options;

    try {
      // Validate pagination parameters
      const paginationParams = validatePaginationParams({
        page,
        limit,
        cursor,
        type: paginationType
      });

      // Generate cache key
      const cacheKey = generateCacheKey('rcm', 'claims', {
        status,
        search,
        priority,
        dateFrom,
        dateTo,
        page: paginationParams.page,
        limit: paginationParams.limit,
        cursor: paginationParams.cursor,
        type: paginationParams.type
      });

      // Try cache first if enabled
      if (enableCache) {
        const cached = await getFromCache(cacheKey);
        if (cached) {
          return {
            ...cached.data,
            cached: true,
            cacheKey: cached.cacheKey
          };
        }
      }

      let whereConditions = [];
      let queryParams = [];

      // Optimize WHERE clause ordering - most selective conditions first
      
      // Status filter (most selective, uses index)
      if (status !== 'all') {
        whereConditions.push('b.status = ?');
        queryParams.push(status);
      }

      // Date range filter (uses index)
      if (dateFrom) {
        whereConditions.push('b.service_date >= ?');
        queryParams.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push('b.service_date <= ?');
        queryParams.push(dateTo);
      }

      // Search filter (less selective, applied last)
      if (search) {
        whereConditions.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR b.procedure_code LIKE ?)');
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';

      // Base query with covering index usage
      const baseQuery = `
        SELECT 
          b.id,
          b.patient_id,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          b.procedure_code,
          b.total_amount,
          b.service_date,
          b.status,
          b.created,
          b.updated,
          DATEDIFF(CURDATE(), b.service_date) as days_in_ar,
          CASE 
            WHEN b.status = 0 THEN 'Draft'
            WHEN b.status = 1 THEN 'Submitted'
            WHEN b.status = 2 THEN 'Paid'
            WHEN b.status = 3 THEN 'Denied'
            WHEN b.status = 4 THEN 'Appealed'
            ELSE 'Unknown'
          END as status_text
        FROM billings b
        INNER JOIN patients p ON b.patient_id = p.id
        ${whereClause}
      `;

      let result;

      if (paginationParams.type === PAGINATION_TYPES.CURSOR) {
        // Use cursor-based pagination for better performance on large datasets
        result = await executeQueryWithCursorPagination({
          baseQuery,
          params: queryParams,
          cursor: paginationParams.cursor,
          limit: paginationParams.limit,
          cursorColumn: 'b.created',
          orderBy: 'b.created',
          direction: 'DESC'
        });
      } else {
        // Use enhanced offset-based pagination
        const countQuery = `
          SELECT COUNT(*) as total
          FROM billings b
          INNER JOIN patients p ON b.patient_id = p.id
          ${whereClause}
        `;

        result = await executeQueryWithEnhancedPagination({
          baseQuery: baseQuery + ' ORDER BY b.created DESC',
          countQuery,
          params: queryParams,
          page: paginationParams.page,
          limit: paginationParams.limit,
          enableCount: true
        });
      }

      // Optimize recommendations calculation
      const claimsWithRecommendations = result.data.map(claim => {
        const agingBucket = getAgingBucket(claim.days_in_ar);
        const collectabilityScore = getCollectabilityScore(claim.days_in_ar);
        
        return {
          ...claim,
          total_amount: formatCurrency(claim.total_amount),
          service_date: formatDate(claim.service_date),
          aging_bucket: agingBucket,
          collectability_score: collectabilityScore,
          recommendations: getClaimRecommendations(claim)
        };
      });

      const responseData = {
        claims: claimsWithRecommendations,
        pagination: {
          ...result.pagination,
          type: paginationParams.type
        },
        filters: {
          status,
          search,
          priority,
          dateFrom,
          dateTo
        },
        meta: {
          ...result.meta,
          cached: false,
          generatedAt: new Date().toISOString()
        }
      };

      // Cache the result if enabled
      if (enableCache) {
        await setInCache(cacheKey, responseData, cacheTTL);
      }

      return responseData;

    } catch (error) {
      throw createDatabaseError('Failed to fetch enhanced claims status', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Get optimized A/R Aging Report
   * Uses single query with window functions for better performance
   * @param {Object} options - Query options
   * @returns {Object} A/R aging data
   */
  async getARAgingReport(options = {}) {
    const {
      includeZeroBalance = false,
      payerFilter,
      priorityFilter = 'all'
    } = options;

    const cacheKey = `ar_aging_${includeZeroBalance}_${payerFilter || 'all'}_${priorityFilter}`;

    try {
      return await this.getCachedData(cacheKey, async () => {
        let whereConditions = ['b.status IN (1, 3)']; // Submitted or Denied
        let queryParams = [];

        if (!includeZeroBalance) {
          whereConditions.push('b.total_amount > 0');
        }

        if (payerFilter) {
          whereConditions.push('b.payer_id = ?');
          queryParams.push(payerFilter);
        }

        const whereClause = whereConditions.join(' AND ');

        // Optimized query with window functions and CTEs
        const query = `
          WITH aging_data AS (
            SELECT 
              b.id,
              b.patient_id,
              CONCAT(p.first_name, ' ', p.last_name) as patient_name,
              b.total_amount,
              b.service_date,
              b.status,
              DATEDIFF(CURDATE(), b.service_date) as days_outstanding,
              CASE 
                WHEN DATEDIFF(CURDATE(), b.service_date) <= 30 THEN '0-30'
                WHEN DATEDIFF(CURDATE(), b.service_date) <= 60 THEN '31-60'
                WHEN DATEDIFF(CURDATE(), b.service_date) <= 90 THEN '61-90'
                WHEN DATEDIFF(CURDATE(), b.service_date) <= 120 THEN '91-120'
                ELSE '120+'
              END as aging_bucket
            FROM billings b
            INNER JOIN patients p ON b.patient_id = p.id
            WHERE ${whereClause}
          ),
          bucket_summary AS (
            SELECT 
              aging_bucket,
              COUNT(*) as count,
              SUM(total_amount) as amount,
              AVG(days_outstanding) as avg_days
            FROM aging_data
            GROUP BY aging_bucket
          )
          SELECT 
            ad.*,
            bs.count as bucket_count,
            bs.amount as bucket_amount,
            bs.avg_days as bucket_avg_days
          FROM aging_data ad
          JOIN bucket_summary bs ON ad.aging_bucket = bs.aging_bucket
          ORDER BY ad.days_outstanding DESC, ad.total_amount DESC
        `;

        const arData = await executeQuery(query, queryParams);

        // Process results efficiently
        const agingBuckets = {
          '0-30': { count: 0, amount: 0, claims: [] },
          '31-60': { count: 0, amount: 0, claims: [] },
          '61-90': { count: 0, amount: 0, claims: [] },
          '91-120': { count: 0, amount: 0, claims: [] },
          '120+': { count: 0, amount: 0, claims: [] }
        };

        let totalClaims = 0;
        let totalAmount = 0;
        let totalDaysOutstanding = 0;

        arData.forEach(claim => {
          const bucket = claim.aging_bucket;
          
          // Use pre-calculated bucket totals from query
          if (agingBuckets[bucket].count === 0) {
            agingBuckets[bucket].count = claim.bucket_count;
            agingBuckets[bucket].amount = claim.bucket_amount;
          }
          
          agingBuckets[bucket].claims.push({
            id: claim.id,
            patient_id: claim.patient_id,
            patient_name: claim.patient_name,
            total_amount: formatCurrency(claim.total_amount),
            service_date: formatDate(claim.service_date),
            status: claim.status,
            days_outstanding: claim.days_outstanding,
            collectability_score: getCollectabilityScore(claim.days_outstanding)
          });

          totalClaims++;
          totalAmount += parseFloat(claim.total_amount);
          totalDaysOutstanding += claim.days_outstanding;
        });

        const totals = {
          totalClaims,
          totalAmount: formatCurrency(totalAmount),
          avgDaysOutstanding: totalClaims > 0 ? Math.round(totalDaysOutstanding / totalClaims) : 0
        };

        return {
          agingBuckets,
          totals,
          filters: {
            includeZeroBalance,
            payerFilter,
            priorityFilter
          },
          generatedAt: new Date().toISOString(),
          cached: false
        };
      });

    } catch (error) {
      throw createDatabaseError('Failed to generate optimized A/R aging report', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Get optimized denial analytics
   * Uses efficient aggregation queries
   * @param {Object} options - Query options
   * @returns {Object} Denial analytics data
   */
  async getDenialAnalytics(options = {}) {
    const { timeframe = '30d' } = options;
    const cacheKey = `denial_analytics_${timeframe}`;

    try {
      return await this.getCachedData(cacheKey, async () => {
        const dateFilter = this.buildDateFilter(timeframe);

        // Single optimized query for all denial analytics
        const analyticsQuery = `
          SELECT 
            -- Summary metrics
            COUNT(*) as total_denials,
            SUM(total_amount) as denied_amount,
            AVG(total_amount) as avg_denial_amount,
            
            -- Denial reasons aggregation
            JSON_OBJECTAGG(
              COALESCE(denial_reason, 'Unknown'),
              JSON_OBJECT(
                'count', COUNT(*),
                'amount', SUM(total_amount)
              )
            ) as denial_reasons_json
            
          FROM billings 
          WHERE status = 3 ${dateFilter}
        `;

        const analyticsData = await executeQuerySingle(analyticsQuery);

        // Get denial trends efficiently
        const trendsQuery = `
          SELECT 
            DATE(created) as denial_date,
            COUNT(*) as count,
            SUM(total_amount) as amount
          FROM billings 
          WHERE status = 3 ${dateFilter}
          GROUP BY DATE(created)
          ORDER BY denial_date DESC
          LIMIT 30
        `;

        const trends = await executeQuery(trendsQuery);

        // Process denial reasons from JSON
        let denialReasons = [];
        if (analyticsData.denial_reasons_json) {
          const reasonsData = JSON.parse(analyticsData.denial_reasons_json);
          denialReasons = Object.entries(reasonsData)
            .map(([reason, data]) => ({
              denial_reason: reason,
              count: data.count,
              amount: formatCurrency(data.amount)
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
        }

        return {
          summary: {
            totalDenials: analyticsData.total_denials || 0,
            deniedAmount: formatCurrency(analyticsData.denied_amount || 0),
            avgDenialAmount: formatCurrency(analyticsData.avg_denial_amount || 0)
          },
          denialReasons,
          trends: trends.map(trend => ({
            ...trend,
            denial_date: formatDate(trend.denial_date),
            amount: formatCurrency(trend.amount)
          })),
          timeframe,
          generatedAt: new Date().toISOString(),
          cached: false
        };
      });

    } catch (error) {
      throw createDatabaseError('Failed to fetch optimized denial analytics', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Build date filter for queries
   * @param {string} timeframe - Time period
   * @returns {string} SQL date filter
   */
  buildDateFilter(timeframe) {
    switch (timeframe) {
      case '7d':
        return "AND created >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
      case '30d':
        return "AND created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      case '90d':
        return "AND created >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
      case '1y':
        return "AND created >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
      default:
        return "AND created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
    }
  }

  /**
   * Get comprehensive query performance statistics
   * @returns {Object} Performance metrics
   */
  async getQueryPerformanceStats() {
    try {
      // Get database index statistics
      const indexStatsQuery = `
        SELECT 
          TABLE_NAME,
          INDEX_NAME,
          CARDINALITY,
          INDEX_TYPE,
          NON_UNIQUE,
          COLUMN_NAME
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME IN ('billings', 'patients', 'payments')
        ORDER BY TABLE_NAME, CARDINALITY DESC
      `;

      // Get table statistics
      const tableStatsQuery = `
        SELECT 
          TABLE_NAME,
          TABLE_ROWS,
          DATA_LENGTH,
          INDEX_LENGTH,
          DATA_FREE,
          AUTO_INCREMENT,
          CREATE_TIME,
          UPDATE_TIME
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME IN ('billings', 'patients', 'payments')
      `;

      const [indexStats, tableStats] = await Promise.all([
        executeQuery(indexStatsQuery),
        executeQuery(tableStatsQuery)
      ]);

      // Get query performance metrics from dbUtils
      const { getQueryMetrics } = require('../../utils/dbUtils');
      const queryMetrics = getQueryMetrics();

      return {
        indexStatistics: indexStats,
        tableStatistics: tableStats,
        queryMetrics: queryMetrics,
        cacheStats: {
          size: this.cache.size,
          keys: Array.from(this.cache.keys()),
          hitRate: this.calculateCacheHitRate()
        },
        recommendations: this.generatePerformanceRecommendations(queryMetrics, indexStats),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch performance statistics', {
        originalError: error.message
      });
    }
  }

  /**
   * Calculate cache hit rate
   * @returns {number} Cache hit rate percentage
   */
  calculateCacheHitRate() {
    // This is a simplified calculation - in production you'd track hits/misses
    const cacheSize = this.cache.size;
    const totalRequests = cacheSize * 2; // Estimate
    return cacheSize > 0 ? Math.round((cacheSize / totalRequests) * 100) : 0;
  }

  /**
   * Generate performance recommendations based on metrics
   * @param {Object} queryMetrics - Query performance metrics
   * @param {Array} indexStats - Database index statistics
   * @returns {Array} Performance recommendations
   */
  generatePerformanceRecommendations(queryMetrics, indexStats) {
    const recommendations = [];

    // Check for slow queries
    if (queryMetrics.slowQueries && queryMetrics.slowQueries.length > 0) {
      recommendations.push({
        type: 'slow_queries',
        severity: 'high',
        message: `${queryMetrics.slowQueries.length} slow queries detected`,
        action: 'Review and optimize slow queries, consider adding indexes'
      });
    }

    // Check average response time
    if (queryMetrics.averageResponseTime > 500) {
      recommendations.push({
        type: 'response_time',
        severity: 'medium',
        message: `Average query response time is ${Math.round(queryMetrics.averageResponseTime)}ms`,
        action: 'Consider query optimization and connection pooling tuning'
      });
    }

    // Check for missing indexes on large tables
    const largeTableThreshold = 10000;
    indexStats.forEach(stat => {
      if (stat.CARDINALITY > largeTableThreshold && stat.INDEX_NAME === 'PRIMARY') {
        recommendations.push({
          type: 'indexing',
          severity: 'medium',
          message: `Table ${stat.TABLE_NAME} has ${stat.CARDINALITY} rows but may need additional indexes`,
          action: 'Review query patterns and add appropriate composite indexes'
        });
      }
    });

    // Check cache utilization
    if (this.cache.size === 0) {
      recommendations.push({
        type: 'caching',
        severity: 'low',
        message: 'Cache is not being utilized',
        action: 'Consider implementing caching for frequently accessed data'
      });
    }

    return recommendations;
  }
}

module.exports = OptimizedRCMService;