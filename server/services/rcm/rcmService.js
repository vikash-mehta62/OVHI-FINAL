/**
 * RCM Service Layer
 * Main service facade for Revenue Cycle Management operations
 * Handles business logic and data access for RCM functionality
 */

const moment = require('moment');
const axios = require('axios');
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
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');

/**
 * RCM Service Class
 * Provides business logic for Revenue Cycle Management operations
 */
class RCMService {
  constructor() {
    this.name = 'RCMService';
  }

  /**
   * Get RCM Dashboard Data
   * @param {Object} options - Query options
   * @param {string} options.timeframe - Time period for data (7d, 30d, 90d, 1y)
   * @param {number} options.userId - User ID for filtering
   * @returns {Object} Dashboard data with KPIs and metrics
   */
  async getDashboardData(options = {}) {
    const { timeframe = '30d', userId } = options;

    try {
      // Build date filter based on timeframe
      let dateFilter = '';
      switch (timeframe) {
        case '7d':
          dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
          break;
        case '30d':
          dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
          break;
        case '90d':
          dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
          break;
        case '1y':
          dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
          break;
        default:
          dateFilter = "AND DATE(created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
      }

      // Get claims summary
      const claimsQuery = `
        SELECT 
          COUNT(*) as total_claims,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as draft_claims,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as submitted_claims,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as paid_claims,
          SUM(CASE WHEN status = 3 THEN 1 ELSE 0 END) as denied_claims,
          SUM(total_amount) as total_billed,
          SUM(CASE WHEN status = 2 THEN total_amount ELSE 0 END) as total_collected,
          AVG(total_amount) as avg_claim_amount
        FROM billings 
        WHERE 1=1 ${dateFilter}
      `;

      const claimsData = await executeQuerySingle(claimsQuery);

      // Get A/R aging data
      const arQuery = `
        SELECT 
          SUM(CASE WHEN DATEDIFF(CURDATE(), service_date) <= 30 THEN total_amount ELSE 0 END) as aging_0_30,
          SUM(CASE WHEN DATEDIFF(CURDATE(), service_date) BETWEEN 31 AND 60 THEN total_amount ELSE 0 END) as aging_31_60,
          SUM(CASE WHEN DATEDIFF(CURDATE(), service_date) BETWEEN 61 AND 90 THEN total_amount ELSE 0 END) as aging_61_90,
          SUM(CASE WHEN DATEDIFF(CURDATE(), service_date) > 90 THEN total_amount ELSE 0 END) as aging_90_plus
        FROM billings 
        WHERE status IN (1, 3) ${dateFilter}
      `;

      const arData = await executeQuerySingle(arQuery);

      // Get denial analytics
      const denialQuery = `
        SELECT 
          COUNT(*) as total_denials,
          SUM(total_amount) as denied_amount,
          AVG(total_amount) as avg_denial_amount
        FROM billings 
        WHERE status = 3 ${dateFilter}
      `;

      const denialData = await executeQuerySingle(denialQuery);

      // Calculate KPIs
      const collectionRate = calculateCollectionRate(
        claimsData.total_collected || 0,
        claimsData.total_billed || 0
      );

      const denialRate = calculateDenialRate(
        claimsData.denied_claims || 0,
        claimsData.total_claims || 0
      );

      const totalAR = (arData.aging_0_30 || 0) + (arData.aging_31_60 || 0) + 
                     (arData.aging_61_90 || 0) + (arData.aging_90_plus || 0);

      // Get recent activity
      const activityQuery = `
        SELECT 
          'claim_submitted' as activity_type,
          COUNT(*) as count,
          DATE(created) as activity_date
        FROM billings 
        WHERE status = 1 ${dateFilter}
        GROUP BY DATE(created)
        ORDER BY activity_date DESC
        LIMIT 7
      `;

      const recentActivity = await executeQuery(activityQuery);

      return {
        summary: {
          totalClaims: claimsData.total_claims || 0,
          totalBilled: claimsData.total_billed || 0,
          totalCollected: claimsData.total_collected || 0,
          totalAR: totalAR,
          collectionRate: collectionRate,
          denialRate: denialRate,
          avgClaimAmount: claimsData.avg_claim_amount || 0
        },
        claimsBreakdown: {
          draft: claimsData.draft_claims || 0,
          submitted: claimsData.submitted_claims || 0,
          paid: claimsData.paid_claims || 0,
          denied: claimsData.denied_claims || 0
        },
        arAging: {
          aging_0_30: arData.aging_0_30 || 0,
          aging_31_60: arData.aging_31_60 || 0,
          aging_61_90: arData.aging_61_90 || 0,
          aging_90_plus: arData.aging_90_plus || 0
        },
        denialAnalytics: {
          totalDenials: denialData.total_denials || 0,
          deniedAmount: denialData.denied_amount || 0,
          avgDenialAmount: denialData.avg_denial_amount || 0
        },
        recentActivity: recentActivity || [],
        timeframe: timeframe,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch dashboard data', {
        originalError: error.message,
        timeframe,
        userId
      });
    }
  }

  /**
   * Get Claims Status with filtering and pagination
   * @param {Object} options - Query options
   * @returns {Object} Claims data with pagination
   */
  async getClaimsStatus(options = {}) {
    const {
      page = 1,
      limit = 10,
      status = 'all',
      search = '',
      priority = 'all',
      dateFrom,
      dateTo
    } = options;

    try {
      let whereConditions = ['1=1'];
      let queryParams = [];

      // Status filter
      if (status !== 'all') {
        whereConditions.push('b.status = ?');
        queryParams.push(status);
      }

      // Search filter
      if (search) {
        whereConditions.push('(p.first_name LIKE ? OR p.last_name LIKE ? OR b.procedure_code LIKE ?)');
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      // Date range filter
      if (dateFrom) {
        whereConditions.push('DATE(b.service_date) >= ?');
        queryParams.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push('DATE(b.service_date) <= ?');
        queryParams.push(dateTo);
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
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
        LEFT JOIN patients p ON b.patient_id = p.id
        WHERE ${whereClause}
        ORDER BY b.created DESC
      `;

      const result = await executeQueryWithPagination(query, queryParams, page, limit);

      // Add recommendations for each claim
      const claimsWithRecommendations = result.data.map(claim => ({
        ...claim,
        total_amount: formatCurrency(claim.total_amount),
        service_date: formatDate(claim.service_date),
        aging_bucket: getAgingBucket(claim.days_in_ar),
        collectability_score: getCollectabilityScore(claim.days_in_ar),
        recommendations: getClaimRecommendations(claim)
      }));

      return {
        claims: claimsWithRecommendations,
        pagination: result.pagination,
        filters: {
          status,
          search,
          priority,
          dateFrom,
          dateTo
        }
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch claims status', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Update claim status
   * @param {number} claimId - Claim ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated claim data
   */
  async updateClaimStatus(claimId, updateData) {
    const { status, notes, userId } = updateData;

    try {
      // Validate claim exists
      const existingClaim = await executeQuerySingle(
        'SELECT * FROM billings WHERE id = ?',
        [claimId]
      );

      if (!existingClaim) {
        throw createNotFoundError('Claim not found');
      }

      // Update claim
      const updateQuery = `
        UPDATE billings 
        SET status = ?, notes = ?, updated = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [status, notes || '', claimId]);

      // Log audit trail
      await auditLog({
        table_name: 'billings',
        record_id: claimId,
        action: 'UPDATE',
        old_values: JSON.stringify({ status: existingClaim.status }),
        new_values: JSON.stringify({ status, notes }),
        user_id: userId,
        timestamp: new Date()
      });

      // Get updated claim
      const updatedClaim = await executeQuerySingle(
        'SELECT * FROM billings WHERE id = ?',
        [claimId]
      );

      return {
        ...updatedClaim,
        total_amount: formatCurrency(updatedClaim.total_amount),
        service_date: formatDate(updatedClaim.service_date)
      };

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

  /**
   * Get A/R Aging Report
   * @param {Object} options - Query options
   * @returns {Object} A/R aging data
   */
  async getARAgingReport(options = {}) {
    const {
      includeZeroBalance = false,
      payerFilter,
      priorityFilter = 'all'
    } = options;

    try {
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

      const query = `
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
        LEFT JOIN patients p ON b.patient_id = p.id
        WHERE ${whereClause}
        ORDER BY days_outstanding DESC, b.total_amount DESC
      `;

      const arData = await executeQuery(query, queryParams);

      // Group by aging buckets
      const agingBuckets = {
        '0-30': { count: 0, amount: 0, claims: [] },
        '31-60': { count: 0, amount: 0, claims: [] },
        '61-90': { count: 0, amount: 0, claims: [] },
        '91-120': { count: 0, amount: 0, claims: [] },
        '120+': { count: 0, amount: 0, claims: [] }
      };

      arData.forEach(claim => {
        const bucket = claim.aging_bucket;
        agingBuckets[bucket].count++;
        agingBuckets[bucket].amount += parseFloat(claim.total_amount);
        agingBuckets[bucket].claims.push({
          ...claim,
          total_amount: formatCurrency(claim.total_amount),
          service_date: formatDate(claim.service_date),
          collectability_score: getCollectabilityScore(claim.days_outstanding)
        });
      });

      // Calculate totals
      const totals = {
        totalClaims: arData.length,
        totalAmount: arData.reduce((sum, claim) => sum + parseFloat(claim.total_amount), 0),
        avgDaysOutstanding: arData.length > 0 ? 
          arData.reduce((sum, claim) => sum + claim.days_outstanding, 0) / arData.length : 0
      };

      return {
        agingBuckets,
        totals: {
          ...totals,
          totalAmount: formatCurrency(totals.totalAmount)
        },
        filters: {
          includeZeroBalance,
          payerFilter,
          priorityFilter
        },
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw createDatabaseError('Failed to generate A/R aging report', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Get claim by ID
   * @param {number} claimId - Claim ID
   * @returns {Object} Claim data
   */
  async getClaimById(claimId) {
    try {
      const query = `
        SELECT 
          b.*,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          p.email as patient_email,
          p.phone as patient_phone
        FROM billings b
        LEFT JOIN patients p ON b.patient_id = p.id
        WHERE b.id = ?
      `;

      const claim = await executeQuerySingle(query, [claimId]);
      
      if (!claim) {
        throw createNotFoundError('Claim not found');
      }

      return claim;

    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to fetch claim details', {
        originalError: error.message,
        claimId
      });
    }
  }

  /**
   * Get denial analytics
   * @param {Object} options - Query options
   * @returns {Object} Denial analytics data
   */
  async getDenialAnalytics(options = {}) {
    const { timeframe = '30d' } = options;

    try {
      let dateFilter = '';
      switch (timeframe) {
        case '7d':
          dateFilter = "AND DATE(b.created) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
          break;
        case '30d':
          dateFilter = "AND DATE(b.created) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)";
          break;
        case '90d':
          dateFilter = "AND DATE(b.created) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)";
          break;
        case '1y':
          dateFilter = "AND DATE(b.created) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)";
          break;
      }

      // Get denial summary
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_denials,
          SUM(total_amount) as denied_amount,
          AVG(total_amount) as avg_denial_amount
        FROM billings b
        WHERE b.status = 3 ${dateFilter}
      `;

      const summary = await executeQuerySingle(summaryQuery);

      // Get denial reasons (if available)
      const reasonsQuery = `
        SELECT 
          denial_reason,
          COUNT(*) as count,
          SUM(total_amount) as amount
        FROM billings b
        WHERE b.status = 3 AND denial_reason IS NOT NULL ${dateFilter}
        GROUP BY denial_reason
        ORDER BY count DESC
        LIMIT 10
      `;

      const denialReasons = await executeQuery(reasonsQuery);

      // Get denial trends by date
      const trendsQuery = `
        SELECT 
          DATE(created) as denial_date,
          COUNT(*) as count,
          SUM(total_amount) as amount
        FROM billings b
        WHERE b.status = 3 ${dateFilter}
        GROUP BY DATE(created)
        ORDER BY denial_date DESC
        LIMIT 30
      `;

      const trends = await executeQuery(trendsQuery);

      return {
        summary: {
          totalDenials: summary.total_denials || 0,
          deniedAmount: formatCurrency(summary.denied_amount || 0),
          avgDenialAmount: formatCurrency(summary.avg_denial_amount || 0)
        },
        denialReasons: denialReasons.map(reason => ({
          ...reason,
          amount: formatCurrency(reason.amount)
        })),
        trends: trends.map(trend => ({
          ...trend,
          denial_date: formatDate(trend.denial_date),
          amount: formatCurrency(trend.amount)
        })),
        timeframe,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw createDatabaseError('Failed to fetch denial analytics', {
        originalError: error.message,
        options
      });
    }
  }

  /**
   * Create new claim
   * @param {Object} claimData - Claim data
   * @returns {Object} Created claim
   */
  async createClaim(claimData) {
    try {
      // Validate claim data
      const validatedData = validateClaimData(claimData);
      if (!validatedData.isValid) {
        throw createValidationError('Invalid claim data', validatedData.errors);
      }

      const {
        patient_id,
        procedure_code,
        total_amount,
        service_date,
        diagnosis_code,
        notes,
        created_by,
        payer_name,
        policy_number,
        group_number,
        unit_price,
        code_units,
        procedure_description,
        diagnosis_description
      } = claimData;

      const insertQuery = `
        INSERT INTO billings (
          patient_id, procedure_code, total_amount, service_date, 
          diagnosis_code, notes, status, created_by, created, updated,
          payer_name, policy_number, group_number, unit_price, code_units,
          procedure_description, diagnosis_description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?)
      `;

      const result = await executeQuery(insertQuery, [
        patient_id,
        procedure_code,
        total_amount,
        service_date,
        diagnosis_code || '',
        notes || '',
        claimData.status || 0, // Default to draft
        created_by,
        payer_name || '',
        policy_number || '',
        group_number || '',
        unit_price || total_amount,
        code_units || 1,
        procedure_description || '',
        diagnosis_description || ''
      ]);

      // Get the created claim
      const newClaim = await this.getClaimById(result.insertId);

      // Log audit trail
      await auditLog({
        table_name: 'billings',
        record_id: result.insertId,
        action: 'CREATE',
        old_values: null,
        new_values: JSON.stringify(claimData),
        user_id: created_by,
        timestamp: new Date()
      });

      return newClaim;
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to create claim', {
        originalError: error.message,
        claimData
      });
    }
  }

  /**
   * Update claim
   * @param {number} claimId - Claim ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated claim
   */
  async updateClaim(claimId, updateData) {
    try {
      // Get existing claim
      const existingClaim = await this.getClaimById(claimId);

      const {
        patient_id,
        procedure_code,
        total_amount,
        service_date,
        diagnosis_code,
        notes,
        updated_by,
        payer_name,
        policy_number,
        group_number,
        unit_price,
        code_units,
        procedure_description,
        diagnosis_description,
        status
      } = updateData;

      const updateQuery = `
        UPDATE billings 
        SET patient_id = ?, procedure_code = ?, total_amount = ?, 
            service_date = ?, diagnosis_code = ?, notes = ?, 
            updated_by = ?, updated = NOW(), payer_name = ?,
            policy_number = ?, group_number = ?, unit_price = ?,
            code_units = ?, procedure_description = ?, diagnosis_description = ?,
            status = ?
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        patient_id || existingClaim.patient_id,
        procedure_code || existingClaim.procedure_code,
        total_amount || existingClaim.total_amount,
        service_date || existingClaim.service_date,
        diagnosis_code || existingClaim.diagnosis_code,
        notes || existingClaim.notes,
        updated_by,
        payer_name || existingClaim.payer_name,
        policy_number || existingClaim.policy_number,
        group_number || existingClaim.group_number,
        unit_price || existingClaim.unit_price,
        code_units || existingClaim.code_units,
        procedure_description || existingClaim.procedure_description,
        diagnosis_description || existingClaim.diagnosis_description,
        status !== undefined ? status : existingClaim.status,
        claimId
      ]);

      // Log audit trail
      await auditLog({
        table_name: 'billings',
        record_id: claimId,
        action: 'UPDATE',
        old_values: JSON.stringify(existingClaim),
        new_values: JSON.stringify(updateData),
        user_id: updated_by,
        timestamp: new Date()
      });

      // Return updated claim
      return await this.getClaimById(claimId);
    } catch (error) {
      if (error.isOperational) {
        throw error;
      }
      throw createDatabaseError('Failed to update claim', {
        originalError: error.message,
        claimId,
        updateData
      });
    }
  }
}

module.exports = RCMService;