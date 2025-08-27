/**
 * Unified RCM Service - Production Ready
 * Consolidates all RCM functionality into a single, optimized service
 * Eliminates duplicates and provides comprehensive RCM operations
 */

const moment = require('moment');
const {
  executeQuery,
  executeTransaction,
  executeQueryWithPagination,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  executeTransaction: executeAdvancedTransaction,
  executeBatch,
  transactional,
  IsolationLevels
} = require('../../utils/transactionManager');
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
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const {
  getFromCache,
  setInCache,
  generateCacheKey,
  invalidateCache
} = require('../../utils/cacheUtils');

/**
 * Unified RCM Service Class
 * Single source of truth for all RCM operations
 */
class UnifiedRCMService {
  constructor() {
    this.name = 'UnifiedRCMService';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // =====================================================
  // DASHBOARD AND ANALYTICS
  // =====================================================

  /**
   * Get comprehensive RCM dashboard data
   * Optimized single query approach with caching
   */
  async getDashboardData(options = {}) {
    const { timeframe = '30d', userId } = options;
    const cacheKey = generateCacheKey('rcm', 'dashboard', { timeframe, userId });

    try {
      // Try cache first
      const cached = await getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

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

      // Get recent activity trends
      const activityQuery = `
        SELECT 
          DATE(created) as activity_date,
          COUNT(*) as submissions,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as payments,
          SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as denials,
          SUM(total_amount) as daily_billed,
          SUM(CASE WHEN status = 2 THEN total_amount ELSE 0 END) as daily_collected
        FROM billings 
        WHERE created >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(created)
        ORDER BY activity_date DESC
        LIMIT 30
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

      const result = {
        summary: {
          totalClaims: dashboardData.total_claims || 0,
          totalBilled: formatCurrency(dashboardData.total_billed || 0),
          totalCollected: formatCurrency(dashboardData.total_collected || 0),
          totalAR: formatCurrency(totalAR),
          collectionRate: collectionRate,
          denialRate: denialRate,
          avgClaimAmount: formatCurrency(dashboardData.avg_claim_amount || 0)
        },
        kpis: {
          collectionRate: collectionRate,
          denialRate: denialRate,
          daysInAR: this.calculateAverageDaysInAR(dashboardData),
          firstPassRate: this.calculateFirstPassRate(dashboardData)
        },
        claimsBreakdown: {
          draft: dashboardData.draft_claims || 0,
          submitted: dashboardData.submitted_claims || 0,
          paid: dashboardData.paid_claims || 0,
          denied: dashboardData.denied_claims || 0
        },
        arAging: {
          aging_0_30: formatCurrency(dashboardData.aging_0_30 || 0),
          aging_31_60: formatCurrency(dashboardData.aging_31_60 || 0),
          aging_61_90: formatCurrency(dashboardData.aging_61_90 || 0),
          aging_90_plus: formatCurrency(dashboardData.aging_90_plus || 0)
        },
        denialAnalytics: {
          totalDenials: dashboardData.denied_claims || 0,
          deniedAmount: formatCurrency(dashboardData.denied_amount || 0),
          avgDenialAmount: formatCurrency(dashboardData.avg_denial_amount || 0)
        },
        trends: {
          monthlyRevenue: this.processRevenueData(recentActivity),
          recentActivity: recentActivity.slice(0, 7)
        },
        timeframe: timeframe,
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      await setInCache(cacheKey, result, 300); // 5 minutes

      return result;

    } catch (error) {
      throw createDatabaseError('Failed to fetch dashboard data', {
        originalError: error.message,
        timeframe,
        userId
      });
    }
  }

  // =====================================================
  // CLAIMS MANAGEMENT
  // =====================================================

  /**
   * Create new claim with comprehensive validation
   */
  async createClaim(claimData) {
    try {
      const {
        patient_id,
        provider_id,
        procedure_code,
        diagnosis_code,
        total_amount,
        service_date,
        notes,
        userId
      } = claimData;

      // Validate required fields
      if (!patient_id || !procedure_code || !total_amount || !service_date) {
        throw createValidationError('Missing required fields for claim creation');
      }

      // Generate claim number
      const claimNumber = `CLM${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const result = await executeQuery(`
        INSERT INTO billings (
          claim_number, patient_id, provider_id, procedure_code, 
          diagnosis_code, total_amount, service_date, notes, 
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
      `, [
        claimNumber, patient_id, provider_id || 1, procedure_code,
        diagnosis_code, total_amount, service_date, notes || ''
      ]);

      // Log the creation
      await auditLog({
        table_name: 'billings',
        record_id: result.insertId,
        action: 'CREATE',
        old_values: null,
        new_values: JSON.stringify(claimData),
        user_id: userId,
        timestamp: new Date()
      });

      return {
        id: result.insertId,
        claim_number: claimNumber,
        ...claimData,
        status: 0,
        created_at: new Date()
      };

    } catch (error) {
      throw createDatabaseError('Failed to create claim', {
        originalError: error.message,
        claimData
      });
    }
  }

  /**
   * Get claim by ID with comprehensive details
   */
  async getClaimById(claimId) {
    try {
      const claim = await executeQuerySingle(`
        SELECT 
          b.*,
          p.first_name,
          p.last_name,
          p.phone_number,
          p.email,
          pr.first_name as provider_first_name,
          pr.last_name as provider_last_name,
          COALESCE(SUM(pay.amount), 0) as total_paid,
          (b.total_amount - COALESCE(SUM(pay.amount), 0)) as balance_due
        FROM billings b
        LEFT JOIN patients p ON b.patient_id = p.id
        LEFT JOIN providers pr ON b.provider_id = pr.id
        LEFT JOIN payments pay ON b.id = pay.claim_id
        WHERE b.id = ?
        GROUP BY b.id
      `, [claimId]);

      if (!claim) {
        return null;
      }

      // Get payment history
      const payments = await executeQuery(`
        SELECT 
          amount,
          payment_date,
          payment_method,
          check_number,
          notes,
          created_at
        FROM payments 
        WHERE claim_id = ?
        ORDER BY created_at DESC
      `, [claimId]);

      return {
        ...claim,
        payments: payments || []
      };

    } catch (error) {
      throw createDatabaseError('Failed to get claim by ID', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get payment posting data with filtering
   */
  async getPaymentPostingData(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status = 'all',
        search = '',
        dateFrom,
        dateTo
      } = options;

      const offset = (page - 1) * limit;
      let whereConditions = ['1=1'];
      let queryParams = [];

      // Status filter
      if (status !== 'all') {
        whereConditions.push('b.status = ?');
        queryParams.push(parseInt(status));
      }

      // Search filter
      if (search) {
        whereConditions.push(`(
          b.claim_number LIKE ? OR 
          p.first_name LIKE ? OR 
          p.last_name LIKE ? OR
          b.procedure_code LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Date range filter
      if (dateFrom) {
        whereConditions.push('b.service_date >= ?');
        queryParams.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push('b.service_date <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');

      // Get payments data
      const payments = await executeQuery(`
        SELECT 
          b.id,
          b.claim_number,
          b.total_amount,
          b.service_date,
          b.status,
          p.first_name,
          p.last_name,
          COALESCE(SUM(pay.amount), 0) as total_paid,
          (b.total_amount - COALESCE(SUM(pay.amount), 0)) as balance_due,
          COUNT(pay.id) as payment_count
        FROM billings b
        LEFT JOIN patients p ON b.patient_id = p.id
        LEFT JOIN payments pay ON b.id = pay.claim_id
        WHERE ${whereClause}
        GROUP BY b.id
        ORDER BY b.service_date DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, limit, offset]);

      // Get total count
      const totalCount = await executeQuerySingle(`
        SELECT COUNT(DISTINCT b.id) as total
        FROM billings b
        LEFT JOIN patients p ON b.patient_id = p.id
        WHERE ${whereClause}
      `, queryParams);

      return {
        payments: payments || [],
        pagination: {
          page,
          limit,
          total: totalCount?.total || 0,
          totalPages: Math.ceil((totalCount?.total || 0) / limit)
        }
      };

    } catch (error) {
      throw createDatabaseError('Failed to get payment posting data', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Get claims with enhanced filtering and pagination
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
      enableCache = true
    } = options;

    try {
      const cacheKey = generateCacheKey('rcm', 'claims', {
        status, search, priority, dateFrom, dateTo, page, limit
      });

      // Try cache first if enabled
      if (enableCache) {
        const cached = await getFromCache(cacheKey);
        if (cached) {
          return { ...cached, cached: true };
        }
      }

      let whereConditions = [];
      let queryParams = [];

      // Build optimized WHERE clause
      if (status !== 'all') {
        whereConditions.push('b.status = ?');
        queryParams.push(status);
      }

      if (dateFrom) {
        whereConditions.push('b.service_date >= ?');
        queryParams.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push('b.service_date <= ?');
        queryParams.push(dateTo);
      }

      if (search) {
        whereConditions.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR b.procedure_code LIKE ?)');
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? 
        'WHERE ' + whereConditions.join(' AND ') : '';

      // Optimized query with covering indexes
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
          END as status_text,
          b.payer_name,
          b.diagnosis_code
        FROM billings b
        INNER JOIN patients p ON b.patient_id = p.id
        ${whereClause}
        ORDER BY b.created DESC
      `;

      const result = await executeQueryWithPagination(baseQuery, queryParams, page, limit);

      // Enhance claims with recommendations
      const enhancedClaims = result.data.map(claim => ({
        ...claim,
        total_amount: formatCurrency(claim.total_amount),
        service_date: formatDate(claim.service_date),
        aging_bucket: getAgingBucket(claim.days_in_ar),
        collectability_score: getCollectabilityScore(claim.days_in_ar),
        recommendations: getClaimRecommendations(claim)
      }));

      const responseData = {
        claims: enhancedClaims,
        pagination: result.pagination,
        filters: { status, search, priority, dateFrom, dateTo },
        meta: {
          generatedAt: new Date().toISOString(),
          cached: false
        }
      };

      // Cache the result
      if (enableCache) {
        await setInCache(cacheKey, responseData, 180); // 3 minutes
      }

      return responseData;

    } catch (error) {
      throw createDatabaseError('Failed to fetch claims status', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Update claim status with comprehensive transaction handling
   */
  async updateClaimStatus(claimId, updateData) {
    const { status, notes, userId } = updateData;

    try {
      return await executeAdvancedTransaction(async (connection, context) => {
        // Get existing claim with lock
        const existingClaim = await context.execute(
          'SELECT * FROM billings WHERE id = ? FOR UPDATE',
          [claimId]
        );

        if (!existingClaim || existingClaim.length === 0) {
          throw createNotFoundError('Claim not found');
        }

        const claim = existingClaim[0];

        // Create savepoint for claim update
        await context.createSavepoint('claim_update');

        // Update claim
        await context.execute(`
          UPDATE billings 
          SET status = ?, notes = ?, updated = NOW()
          WHERE id = ?
        `, [status, notes || '', claimId]);

        // Update related patient account if status affects balance
        if (status === 2) { // Paid status
          await context.execute(`
            UPDATE patient_accounts 
            SET total_balance = GREATEST(0, total_balance - ?),
                last_payment_date = NOW(),
                updated_date = NOW()
            WHERE patient_id = ?
          `, [claim.total_amount, claim.patient_id]);
        }

        // Log audit trail
        await auditLog({
          table_name: 'billings',
          record_id: claimId,
          action: 'UPDATE_STATUS',
          old_values: JSON.stringify({ status: claim.status }),
          new_values: JSON.stringify({ status, notes }),
          user_id: userId,
          timestamp: new Date()
        });

        // Invalidate related caches
        await this.invalidateRelatedCaches('claim_update', { claimId, status });

        return {
          claimId,
          previousStatus: claim.status,
          newStatus: status,
          updatedAt: new Date().toISOString()
        };
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

  // =====================================================
  // PAYMENT PROCESSING
  // =====================================================

  /**
   * Process payment with comprehensive validation and transaction handling
   */
  async postPayment(options = {}) {
    const {
      claimId,
      paymentAmount,
      paymentDate,
      paymentMethod,
      checkNumber,
      adjustmentAmount = 0,
      adjustmentReason,
      userId
    } = options;

    try {
      // Validate input
      if (!claimId || !paymentAmount || !paymentDate) {
        throw createValidationError('Claim ID, payment amount, and payment date are required');
      }

      return await executeAdvancedTransaction(async (connection, context) => {
        // Get claim details with lock
        const claim = await context.execute(
          'SELECT * FROM billings WHERE id = ? FOR UPDATE',
          [claimId]
        );

        if (!claim || claim.length === 0) {
          throw createNotFoundError('Claim not found');
        }

        const claimData = claim[0];

        // Create savepoint for payment record
        await context.createSavepoint('payment_record');

        // Insert payment record
        const paymentRecord = await context.execute(`
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

        // Update claim status and amounts
        const newPaidAmount = (claimData.paid_amount || 0) + parseFloat(paymentAmount);
        const newOutstandingAmount = Math.max(0, claimData.total_amount - newPaidAmount);
        const newStatus = newOutstandingAmount <= 0 ? 2 : 1; // 2 = Paid, 1 = Partially Paid

        await context.execute(`
          UPDATE billings 
          SET paid_amount = ?, 
              outstanding_amount = ?, 
              status = ?,
              updated = NOW()
          WHERE id = ?
        `, [newPaidAmount, newOutstandingAmount, newStatus, claimId]);

        // Update patient account balance
        await context.execute(`
          UPDATE patient_accounts 
          SET total_balance = GREATEST(0, total_balance - ?),
              last_payment_date = ?,
              updated_date = NOW()
          WHERE patient_id = ?
        `, [paymentAmount, paymentDate, claimData.patient_id]);

        // Log audit trail
        await auditLog({
          table_name: 'payments',
          record_id: paymentRecord.insertId,
          action: 'PAYMENT_POST',
          old_values: null,
          new_values: JSON.stringify({
            claimId,
            paymentAmount,
            paymentMethod,
            checkNumber
          }),
          user_id: userId,
          timestamp: new Date()
        });

        // Invalidate related caches
        await this.invalidateRelatedCaches('payment_post', { claimId, paymentAmount });

        return {
          paymentId: paymentRecord.insertId,
          claimId,
          paymentAmount: formatCurrency(paymentAmount),
          newPaidAmount: formatCurrency(newPaidAmount),
          newOutstandingAmount: formatCurrency(newOutstandingAmount),
          newStatus,
          processedAt: new Date().toISOString()
        };
      });

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to post payment', {
        originalError: error.message,
        claimId,
        paymentAmount
      });
    }
  }

  // =====================================================
  // A/R AGING AND COLLECTIONS
  // =====================================================

  /**
   * Get comprehensive A/R aging report
   */
  async getARAgingReport(options = {}) {
    const {
      includeZeroBalance = false,
      payerFilter,
      priorityFilter = 'all'
    } = options;

    const cacheKey = generateCacheKey('rcm', 'ar_aging', {
      includeZeroBalance, payerFilter, priorityFilter
    });

    try {
      // Try cache first
      const cached = await getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

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

      // Optimized query with window functions
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
            END as aging_bucket,
            b.payer_name,
            b.procedure_code
          FROM billings b
          INNER JOIN patients p ON b.patient_id = p.id
          WHERE ${whereClause}
        )
        SELECT 
          *,
          SUM(total_amount) OVER (PARTITION BY aging_bucket) as bucket_total,
          COUNT(*) OVER (PARTITION BY aging_bucket) as bucket_count
        FROM aging_data
        ORDER BY days_outstanding DESC, total_amount DESC
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
          agingBuckets[bucket].amount = claim.bucket_total;
        }
        
        agingBuckets[bucket].claims.push({
          id: claim.id,
          patient_id: claim.patient_id,
          patient_name: claim.patient_name,
          total_amount: formatCurrency(claim.total_amount),
          service_date: formatDate(claim.service_date),
          status: claim.status,
          days_outstanding: claim.days_outstanding,
          collectability_score: getCollectabilityScore(claim.days_outstanding),
          payer_name: claim.payer_name,
          procedure_code: claim.procedure_code
        });

        totalClaims++;
        totalAmount += parseFloat(claim.total_amount);
        totalDaysOutstanding += claim.days_outstanding;
      });

      // Format bucket amounts
      Object.keys(agingBuckets).forEach(bucket => {
        agingBuckets[bucket].amount = formatCurrency(agingBuckets[bucket].amount);
      });

      const result = {
        agingBuckets,
        totals: {
          totalClaims,
          totalAmount: formatCurrency(totalAmount),
          avgDaysOutstanding: totalClaims > 0 ? Math.round(totalDaysOutstanding / totalClaims) : 0
        },
        filters: {
          includeZeroBalance,
          payerFilter,
          priorityFilter
        },
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      await setInCache(cacheKey, result, 900); // 15 minutes

      return result;

    } catch (error) {
      throw createDatabaseError('Failed to generate A/R aging report', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Get collections workflow data
   */
  async getCollectionsWorkflow(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      priority = 'all',
      agingBucket = 'all'
    } = options;

    try {
      let whereConditions = ['pa.total_balance > 0'];
      let queryParams = [];

      // Build WHERE clause
      if (status !== 'all') {
        whereConditions.push('pa.collection_status = ?');
        queryParams.push(status);
      }

      if (priority !== 'all') {
        whereConditions.push('pa.priority = ?');
        queryParams.push(priority);
      }

      // Aging bucket filter
      if (agingBucket !== 'all') {
        switch (agingBucket) {
          case '0-30':
            whereConditions.push('pa.aging_0_30 > 0');
            break;
          case '31-60':
            whereConditions.push('pa.aging_31_60 > 0');
            break;
          case '61-90':
            whereConditions.push('pa.aging_61_90 > 0');
            break;
          case '90+':
            whereConditions.push('pa.aging_91_plus > 0');
            break;
        }
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          pa.id,
          pa.patient_id as patientId,
          CONCAT(p.first_name, ' ', p.last_name) as patientName,
          pa.total_balance as totalBalance,
          pa.aging_0_30 as aging30,
          pa.aging_31_60 as aging60,
          pa.aging_61_90 as aging90,
          pa.aging_91_plus as aging120Plus,
          pa.last_payment_date as lastPaymentDate,
          pa.last_statement_date as lastStatementDate,
          pa.collection_status as collectionStatus,
          pa.priority,
          pa.assigned_collector as assignedCollector,
          pa.contact_attempts as contactAttempts,
          CASE WHEN pp.id IS NOT NULL THEN 1 ELSE 0 END as paymentPlanActive,
          COALESCE(pa.insurance_pending, 0) as insurancePending
        FROM patient_accounts pa
        LEFT JOIN patients p ON pa.patient_id = p.id
        LEFT JOIN payment_plans pp ON pa.patient_id = pp.patient_id AND pp.status = 'active'
        WHERE ${whereClause}
        ORDER BY 
          CASE pa.priority 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          pa.aging_91_plus DESC,
          pa.total_balance DESC
      `;

      const result = await executeQueryWithPagination(query, queryParams, page, limit);

      // Format response
      const formattedAccounts = result.data.map(account => ({
        ...account,
        totalBalance: formatCurrency(account.totalBalance),
        aging30: formatCurrency(account.aging30),
        aging60: formatCurrency(account.aging60),
        aging90: formatCurrency(account.aging90),
        aging120Plus: formatCurrency(account.aging120Plus),
        lastPaymentDate: account.lastPaymentDate ? formatDate(account.lastPaymentDate) : null,
        lastStatementDate: account.lastStatementDate ? formatDate(account.lastStatementDate) : null
      }));

      return {
        accounts: formattedAccounts,
        pagination: result.pagination,
        filters: { status, priority, agingBucket },
        meta: {
          generatedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch collections workflow', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Update collection status with comprehensive tracking
   */
  async updateCollectionStatus(accountId, updateData) {
    try {
      const {
        status,
        priority,
        assigned_collector,
        notes,
        userId
      } = updateData;

      // Validate account exists
      const account = await executeQuerySingle(`
        SELECT * FROM billings WHERE id = ?
      `, [accountId]);

      if (!account) {
        throw createValidationError('Account not found');
      }

      // Update collection status
      const result = await executeQuery(`
        UPDATE billings 
        SET 
          collection_status = ?,
          collection_priority = ?,
          assigned_collector = ?,
          collection_notes = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [status, priority, assigned_collector, notes, accountId]);

      // Log collection activity
      await executeQuery(`
        INSERT INTO collection_activities (
          account_id, activity_type, status, priority, 
          assigned_collector, notes, user_id, created_at
        ) VALUES (?, 'status_update', ?, ?, ?, ?, ?, NOW())
      `, [accountId, status, priority, assigned_collector, notes, userId]);

      // Log the update
      await auditLog({
        table_name: 'billings',
        record_id: accountId,
        action: 'UPDATE_COLLECTION_STATUS',
        old_values: JSON.stringify({
          collection_status: account.collection_status,
          collection_priority: account.collection_priority
        }),
        new_values: JSON.stringify(updateData),
        user_id: userId,
        timestamp: new Date()
      });

      return {
        success: true,
        accountId,
        updatedFields: updateData,
        affectedRows: result.affectedRows
      };

    } catch (error) {
      throw createDatabaseError('Failed to update collection status', {
        originalError: error.message,
        accountId,
        updateData
      });
    }
  }

  // =====================================================
  // DENIAL ANALYTICS
  // =====================================================

  /**
   * Get comprehensive denial analytics
   */
  async getDenialAnalytics(options = {}) {
    const { timeframe = '30d' } = options;
    const cacheKey = generateCacheKey('rcm', 'denial_analytics', { timeframe });

    try {
      // Try cache first
      const cached = await getFromCache(cacheKey);
      if (cached) {
        return { ...cached, cached: true };
      }

      const dateFilter = this.buildDateFilter(timeframe);

      // Optimized query for all denial analytics
      const analyticsQuery = `
        SELECT 
          -- Summary metrics
          COUNT(*) as total_denials,
          SUM(total_amount) as denied_amount,
          AVG(total_amount) as avg_denial_amount,
          
          -- Top denial reasons
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

      // Get denial trends
      const trendsQuery = `
        SELECT 
          DATE(created) as denial_date,
          COUNT(*) as count,
          SUM(total_amount) as amount,
          AVG(total_amount) as avg_amount
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
            amount: formatCurrency(data.amount),
            percentage: ((data.count / analyticsData.total_denials) * 100).toFixed(1)
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }

      const result = {
        summary: {
          totalDenials: analyticsData.total_denials || 0,
          deniedAmount: formatCurrency(analyticsData.denied_amount || 0),
          avgDenialAmount: formatCurrency(analyticsData.avg_denial_amount || 0)
        },
        denialReasons,
        trends: trends.map(trend => ({
          ...trend,
          denial_date: formatDate(trend.denial_date),
          amount: formatCurrency(trend.amount),
          avg_amount: formatCurrency(trend.avg_amount)
        })),
        timeframe,
        generatedAt: new Date().toISOString(),
        cached: false
      };

      // Cache the result
      await setInCache(cacheKey, result, 600); // 10 minutes

      return result;

    } catch (error) {
      throw createDatabaseError('Failed to fetch denial analytics', {
        originalError: error.message,
        options
      });
    }
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Build date filter for queries
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
   * Calculate average days in A/R
   */
  calculateAverageDaysInAR(data) {
    const totalAmount = parseFloat(data.aging_0_30 || 0) + 
                       parseFloat(data.aging_31_60 || 0) + 
                       parseFloat(data.aging_61_90 || 0) + 
                       parseFloat(data.aging_90_plus || 0);
    
    if (totalAmount === 0) return 0;
    
    const weightedDays = (parseFloat(data.aging_0_30 || 0) * 15) +
                        (parseFloat(data.aging_31_60 || 0) * 45) +
                        (parseFloat(data.aging_61_90 || 0) * 75) +
                        (parseFloat(data.aging_90_plus || 0) * 120);
    
    return Math.round(weightedDays / totalAmount);
  }

  /**
   * Calculate first pass rate
   */
  calculateFirstPassRate(data) {
    const totalClaims = data.total_claims || 0;
    const deniedClaims = data.denied_claims || 0;
    
    if (totalClaims === 0) return 0;
    
    return Math.round(((totalClaims - deniedClaims) / totalClaims) * 100);
  }

  /**
   * Process revenue data for trends
   */
  processRevenueData(activityData) {
    return activityData.slice(0, 6).reverse().map(day => ({
      month: moment(day.activity_date).format('MMM'),
      revenue: parseFloat(day.daily_billed || 0),
      collections: parseFloat(day.daily_collected || 0)
    }));
  }

  // Method aliases for compatibility
  async getClaimsData(options = {}) {
    return this.getClaimsStatus(options);
  }

  async getPaymentsData(options = {}) {
    return this.getPaymentPostingData(options);
  }

  async getARAgingData(options = {}) {
    return this.getARAgingReport(options);
  }

  async getCollectionsData(options = {}) {
    return this.getCollectionsWorkflow(options);
  }

  async getDenialManagementData(options = {}) {
    return this.getDenialAnalytics(options);
  }

  async getPerformanceMetrics(options = {}) {
    // Return basic performance metrics
    return {
      success: true,
      data: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Invalidate related caches when data changes
   */
  async invalidateRelatedCaches(operation, data = {}) {
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
        invalidateCache(pattern)
      );

      await Promise.all(invalidationPromises);

      console.log(`Cache invalidated for operation: ${operation}`);

    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // =====================================================
  // ERA PROCESSING WITH CLAIMMD INTEGRATION
  // =====================================================

  /**
   * Process ERA file with ClaimMD integration
   * Follows ClaimMD API specification: https://api.claim.md/#/paths/~1services~1eradata~1/post
   */
  async processERAFile(options = {}) {
    const {
      eraData,
      fileName,
      autoPost = false,
      userId,
      claimMdIntegration = true
    } = options;

    try {
      // Validate input according to ClaimMD specs
      if (!eraData || !fileName) {
        throw createValidationError('ERA data and filename are required');
      }

      // If ClaimMD integration is enabled, send to ClaimMD first
      let claimMdResponse = null;
      if (claimMdIntegration) {
        claimMdResponse = await this.sendERAToClaimMD(eraData, fileName, userId);
      }

      return await executeAdvancedTransaction(async (connection, context) => {
        // Parse ERA data (X12 835 format)
        const parsedERA = await this.parseERAData(eraData);
        
        // Create savepoint for ERA record creation
        await context.createSavepoint('era_record');
        
        // Store ERA record with ClaimMD reference
        const eraRecord = await context.execute(`
          INSERT INTO era_files 
          (provider_id, file_name, file_size, total_payments, total_adjustments, 
           status, processed_date, auto_posted, claimmd_reference_id, claimmd_status)
          VALUES (?, ?, ?, ?, ?, 'processed', NOW(), ?, ?, ?)
        `, [
          userId, 
          fileName, 
          eraData.length, 
          parsedERA.totalPayments, 
          parsedERA.totalAdjustments,
          autoPost,
          claimMdResponse?.referenceId || null,
          claimMdResponse?.status || 'local_only'
        ]);

        const eraId = eraRecord.insertId;
        const processedPayments = [];
        let autoPostedCount = 0;

        // Process individual payment details with batch operations
        const paymentOperations = parsedERA.payments.map((payment, index) => ({
          query: `
            INSERT INTO era_payment_details 
            (era_file_id, claim_id, patient_id, service_date, billed_amount, paid_amount, 
             adjustment_amount, reason_codes, check_number, payer_name, status, claimmd_payment_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          params: [
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
            autoPost ? 'auto_posted' : 'pending',
            payment.claimmd_payment_id || null
          ]
        }));

        // Execute batch insert for payment details
        const paymentResults = await context.executeBatch(paymentOperations);

        // Process auto-posting for valid payments
        for (let i = 0; i < parsedERA.payments.length; i++) {
          const payment = parsedERA.payments[i];
          const paymentDetailId = paymentResults[i].insertId;

          // Auto-post if enabled and payment is valid
          if (autoPost && payment.paid_amount > 0) {
            try {
              // Create savepoint for auto-posting
              await context.createSavepoint(`autopost_${i}`);
              
              const autoPostResult = await this.autoPostPayment(payment, userId, context);
              if (autoPostResult.success) {
                autoPostedCount++;
                
                // Update payment detail status
                await context.execute(`
                  UPDATE era_payment_details 
                  SET status = 'auto_posted', posted_date = NOW()
                  WHERE id = ?
                `, [paymentDetailId]);
              }
            } catch (autoPostError) {
              // Rollback to savepoint if auto-posting fails
              await context.rollbackToSavepoint(`autopost_${i}`);
              console.warn(`Auto-posting failed for payment ${i}:`, autoPostError.message);
            }
          }

          processedPayments.push({
            ...payment,
            era_detail_id: paymentDetailId,
            auto_posted: autoPost && payment.paid_amount > 0,
            claimmd_status: claimMdResponse?.status || 'local_only'
          });
        }

        // Log audit trail
        await auditLog({
          table_name: 'era_files',
          record_id: eraId,
          action: 'PROCESS_ERA',
          old_values: null,
          new_values: JSON.stringify({
            fileName,
            totalPayments: parsedERA.totalPayments,
            processedCount: parsedERA.payments.length,
            autoPostedCount,
            claimMdIntegration,
            claimMdReferenceId: claimMdResponse?.referenceId
          }),
          user_id: userId,
          timestamp: new Date()
        });

        return {
          eraId,
          fileName,
          totalPayments: parsedERA.totalPayments,
          totalAdjustments: parsedERA.totalAdjustments,
          processedCount: parsedERA.payments.length,
          autoPostedCount,
          payments: processedPayments,
          claimMdIntegration: {
            enabled: claimMdIntegration,
            referenceId: claimMdResponse?.referenceId,
            status: claimMdResponse?.status,
            message: claimMdResponse?.message
          }
        };
      });

    } catch (error) {
      throw createDatabaseError('Failed to process ERA file', {
        originalError: error.message,
        fileName,
        userId
      });
    }
  }

  /**
   * Send ERA data to ClaimMD API
   * Implements ClaimMD ERA data endpoint specification
   */
  async sendERAToClaimMD(eraData, fileName, userId) {
    try {
      const claimMdConfig = await this.getClaimMDConfiguration(userId);
      
      if (!claimMdConfig || !claimMdConfig.apiKey) {
        console.warn('ClaimMD configuration not found, processing locally only');
        return { status: 'config_missing', message: 'ClaimMD configuration not available' };
      }

      // Prepare ClaimMD API request according to their specification
      const requestPayload = {
        eraData: eraData,
        fileName: fileName,
        providerId: userId,
        processingOptions: {
          autoPost: false, // Let our system handle auto-posting
          validateClaims: true,
          generateReports: true
        },
        metadata: {
          uploadedAt: new Date().toISOString(),
          source: 'OVHI_RCM_System',
          version: '1.0.0'
        }
      };

      const response = await fetch(`${claimMdConfig.baseUrl}/services/eradata/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${claimMdConfig.apiKey}`,
          'X-Provider-ID': userId.toString(),
          'User-Agent': 'OVHI-RCM/1.0.0'
        },
        body: JSON.stringify(requestPayload),
        timeout: 30000 // 30 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`ClaimMD API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const claimMdResult = await response.json();

      // Log ClaimMD interaction
      await auditLog({
        table_name: 'claimmd_interactions',
        record_id: null,
        action: 'ERA_SUBMIT',
        old_values: null,
        new_values: JSON.stringify({
          fileName,
          claimMdReferenceId: claimMdResult.referenceId,
          status: claimMdResult.status,
          responseTime: Date.now()
        }),
        user_id: userId,
        timestamp: new Date()
      });

      return {
        referenceId: claimMdResult.referenceId,
        status: claimMdResult.status || 'submitted',
        message: claimMdResult.message || 'Successfully submitted to ClaimMD',
        processingId: claimMdResult.processingId,
        estimatedCompletionTime: claimMdResult.estimatedCompletionTime
      };

    } catch (error) {
      console.error('ClaimMD ERA submission error:', error);
      
      // Log the error but don't fail the entire process
      await auditLog({
        table_name: 'claimmd_interactions',
        record_id: null,
        action: 'ERA_SUBMIT_ERROR',
        old_values: null,
        new_values: JSON.stringify({
          fileName,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        user_id: userId,
        timestamp: new Date()
      });

      return {
        status: 'error',
        message: `ClaimMD submission failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get ClaimMD configuration for provider
   */
  async getClaimMDConfiguration(userId) {
    try {
      const config = await executeQuerySingle(`
        SELECT 
          api_key,
          base_url,
          provider_id as claimmd_provider_id,
          is_active,
          configuration_data
        FROM claimmd_configurations 
        WHERE user_id = ? AND is_active = 1
      `, [userId]);

      if (!config) {
        return null;
      }

      return {
        apiKey: config.api_key,
        baseUrl: config.base_url || 'https://api.claim.md',
        providerId: config.claimmd_provider_id,
        isActive: config.is_active,
        additionalConfig: config.configuration_data ? JSON.parse(config.configuration_data) : {}
      };

    } catch (error) {
      console.error('Error fetching ClaimMD configuration:', error);
      return null;
    }
  }

  /**
   * Check ClaimMD ERA processing status
   */
  async checkClaimMDERAStatus(referenceId, userId) {
    try {
      const claimMdConfig = await this.getClaimMDConfiguration(userId);
      
      if (!claimMdConfig) {
        throw createValidationError('ClaimMD configuration not found');
      }

      const response = await fetch(`${claimMdConfig.baseUrl}/services/eradata/${referenceId}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${claimMdConfig.apiKey}`,
          'X-Provider-ID': userId.toString()
        }
      });

      if (!response.ok) {
        throw new Error(`ClaimMD status check failed: ${response.status}`);
      }

      const statusData = await response.json();

      // Update local ERA record with ClaimMD status
      await executeQuery(`
        UPDATE era_files 
        SET claimmd_status = ?, claimmd_last_check = NOW()
        WHERE claimmd_reference_id = ?
      `, [statusData.status, referenceId]);

      return statusData;

    } catch (error) {
      throw createDatabaseError('Failed to check ClaimMD ERA status', {
        originalError: error.message,
        referenceId,
        userId
      });
    }
  }

  /**
   * Parse ERA data (X12 835 format)
   * Enhanced parser with ClaimMD compatibility
   */
  async parseERAData(eraData) {
    try {
      const payments = [];
      let totalPayments = 0;
      let totalAdjustments = 0;

      // Handle both string and buffer data
      const dataString = typeof eraData === 'string' ? eraData : eraData.toString();
      
      // Split by segments (X12 format uses ~ as segment terminator)
      const segments = dataString.split('~').filter(segment => segment.trim());

      let currentClaim = null;
      let currentPayment = null;

      for (const segment of segments) {
        const elements = segment.split('*');
        const segmentId = elements[0];

        switch (segmentId) {
          case 'CLP': // Claim Payment Information
            if (currentPayment) {
              payments.push(currentPayment);
            }
            
            currentPayment = {
              claim_id: elements[1] || null,
              status_code: elements[2] || null,
              billed_amount: parseFloat(elements[3]) || 0,
              paid_amount: parseFloat(elements[4]) || 0,
              patient_responsibility: parseFloat(elements[5]) || 0,
              claim_filing_indicator: elements[6] || null,
              payer_claim_control_number: elements[7] || null,
              facility_type_code: elements[8] || null,
              claim_frequency_code: elements[9] || null,
              patient_id: null,
              service_date: null,
              adjustment_amount: 0,
              reason_codes: [],
              check_number: null,
              payer_name: 'Unknown Payer',
              claimmd_payment_id: null
            };
            break;

          case 'CAS': // Claim Adjustment Segment
            if (currentPayment) {
              const adjustmentAmount = parseFloat(elements[3]) || 0;
              currentPayment.adjustment_amount += adjustmentAmount;
              currentPayment.reason_codes.push({
                group_code: elements[1],
                reason_code: elements[2],
                adjustment_amount: adjustmentAmount,
                adjustment_quantity: elements[4] || null
              });
            }
            break;

          case 'DTM': // Date/Time Reference
            if (currentPayment && elements[1] === '232') { // Statement date
              currentPayment.service_date = this.parseX12Date(elements[2]);
            }
            break;

          case 'N1': // Entity Name
            if (elements[1] === 'PR' && currentPayment) { // Payer
              currentPayment.payer_name = elements[2] || 'Unknown Payer';
            }
            break;

          case 'TRN': // Trace Number (Check Number)
            if (currentPayment && elements[1] === '1') {
              currentPayment.check_number = elements[2];
            }
            break;

          case 'REF': // Reference Information
            if (currentPayment) {
              if (elements[1] === '1K') { // Patient ID
                currentPayment.patient_id = elements[2];
              } else if (elements[1] === 'CLAIMMD') { // ClaimMD Payment ID
                currentPayment.claimmd_payment_id = elements[2];
              }
            }
            break;
        }
      }

      // Add the last payment if exists
      if (currentPayment) {
        payments.push(currentPayment);
      }

      // Calculate totals
      payments.forEach(payment => {
        totalPayments += payment.paid_amount;
        totalAdjustments += payment.adjustment_amount;
        
        // Set default service date if not provided
        if (!payment.service_date) {
          payment.service_date = new Date().toISOString().split('T')[0];
        }
        
        // Ensure patient_id is set
        if (!payment.patient_id) {
          payment.patient_id = this.extractPatientIdFromClaim(payment.claim_id);
        }
      });

      return {
        payments,
        totalPayments,
        totalAdjustments,
        parsedAt: new Date().toISOString(),
        segmentCount: segments.length,
        paymentCount: payments.length
      };

    } catch (error) {
      throw createDatabaseError('Failed to parse ERA data', {
        originalError: error.message,
        dataLength: eraData.length
      });
    }
  }

  /**
   * Parse X12 date format (CCYYMMDD or YYMMDD)
   */
  parseX12Date(dateString) {
    if (!dateString) return new Date().toISOString().split('T')[0];
    
    try {
      let year, month, day;
      
      if (dateString.length === 8) { // CCYYMMDD
        year = dateString.substring(0, 4);
        month = dateString.substring(4, 6);
        day = dateString.substring(6, 8);
      } else if (dateString.length === 6) { // YYMMDD
        const yy = parseInt(dateString.substring(0, 2));
        year = yy > 50 ? `19${yy}` : `20${yy}`; // Y2K handling
        month = dateString.substring(2, 4);
        day = dateString.substring(4, 6);
      } else {
        return new Date().toISOString().split('T')[0];
      }
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  /**
   * Extract patient ID from claim ID (implementation specific)
   */
  extractPatientIdFromClaim(claimId) {
    // This would be implemented based on your claim ID format
    // For now, return a default or try to look up in database
    return null;
  }

  /**
   * Auto-post payment helper method
   */
  async autoPostPayment(payment, userId, context) {
    try {
      // Validate claim exists
      const claim = await context.execute(
        'SELECT * FROM billings WHERE id = ?',
        [payment.claim_id]
      );

      if (!claim || claim.length === 0) {
        return { success: false, reason: 'Claim not found' };
      }

      const claimData = claim[0];

      // Validate payment amount is reasonable
      if (payment.paid_amount > claimData.total_amount * 1.1) {
        return { success: false, reason: 'Payment amount exceeds expected amount' };
      }

      // Use existing postPayment method
      await this.postPayment({
        claimId: payment.claim_id,
        paymentAmount: payment.paid_amount,
        paymentDate: payment.service_date,
        paymentMethod: 'ERA',
        checkNumber: payment.check_number,
        adjustmentAmount: payment.adjustment_amount,
        adjustmentReason: payment.reason_codes.map(rc => `${rc.group_code}-${rc.reason_code}`).join(', '),
        userId
      });

      return { success: true };

    } catch (error) {
      return { success: false, reason: error.message };
    }
  }}


module.exports = UnifiedRCMService;