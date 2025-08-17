const db = require('../../config/db');
const crypto = require('crypto');

/**
 * Specialist Directory Service
 * Comprehensive specialist network management, search, and performance tracking
 */

class SpecialistService {
  constructor() {
    this.validSpecialties = [
      'Cardiology', 'Dermatology', 'Endocrinology', 'Gastroenterology',
      'Hematology/Oncology', 'Nephrology', 'Neurology', 'Orthopedics',
      'Pulmonology', 'Rheumatology', 'Urology', 'Mental Health',
      'Physical Therapy', 'Radiology', 'Surgery', 'Ophthalmology',
      'ENT', 'Pediatrics', 'Obstetrics/Gynecology', 'Emergency Medicine',
      'Anesthesiology', 'Pathology', 'Psychiatry', 'Family Medicine',
      'Internal Medicine', 'General Surgery', 'Plastic Surgery',
      'Orthopedic Surgery', 'Neurosurgery', 'Cardiac Surgery'
    ];

    this.validReferralMethods = ['fax', 'email', 'portal', 'phone'];
    this.searchableFields = ['name', 'practice_name', 'specialty_primary', 'city', 'state'];
  }

  /**
   * Add new specialist to directory
   */
  async addSpecialist(specialistData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Validate specialist data
      this.validateSpecialistData(specialistData);

      // Generate unique specialist ID
      const specialistId = this.generateSpecialistId();

      // Insert specialist record
      const [result] = await connection.execute(`
        INSERT INTO referral_specialists (
          id, name, title, specialty_primary, specialties_secondary,
          practice_name, phone, fax, email, website,
          address_line1, address_line2, city, state, zip_code,
          npi_number, license_numbers, insurance_networks,
          availability_hours, accepts_new_patients, preferred_referral_method,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
      `, [
        specialistId,
        specialistData.name,
        specialistData.title || null,
        specialistData.specialtyPrimary,
        JSON.stringify(specialistData.specialtiesSecondary || []),
        specialistData.practiceName || null,
        specialistData.phone || null,
        specialistData.fax || null,
        specialistData.email || null,
        specialistData.website || null,
        specialistData.addressLine1 || null,
        specialistData.addressLine2 || null,
        specialistData.city || null,
        specialistData.state || null,
        specialistData.zipCode || null,
        specialistData.npiNumber || null,
        JSON.stringify(specialistData.licenseNumbers || []),
        JSON.stringify(specialistData.insuranceNetworks || []),
        JSON.stringify(specialistData.availabilityHours || {}),
        specialistData.acceptsNewPatients !== false,
        specialistData.preferredReferralMethod || 'fax'
      ]);

      // Initialize performance metrics
      await this.initializeSpecialistMetrics(specialistId, connection);

      await connection.commit();

      // Get complete specialist data
      const specialist = await this.getSpecialistById(specialistId);

      // Log audit trail
      await this.logSpecialistAudit({
        userId,
        action: 'SPECIALIST_CREATED',
        specialistId,
        newValues: specialist,
        ipAddress: specialistData.ipAddress,
        userAgent: specialistData.userAgent
      });

      return {
        success: true,
        specialist,
        message: 'Specialist added successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error adding specialist:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update specialist information
   */
  async updateSpecialist(specialistId, updateData, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current specialist data
      const currentSpecialist = await this.getSpecialistById(specialistId, connection);
      if (!currentSpecialist) {
        throw new Error('Specialist not found');
      }

      // Validate update data
      this.validateSpecialistUpdateData(updateData);

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      const fieldMappings = {
        name: 'name',
        title: 'title',
        specialtyPrimary: 'specialty_primary',
        specialtiesSecondary: 'specialties_secondary',
        practiceName: 'practice_name',
        phone: 'phone',
        fax: 'fax',
        email: 'email',
        website: 'website',
        addressLine1: 'address_line1',
        addressLine2: 'address_line2',
        city: 'city',
        state: 'state',
        zipCode: 'zip_code',
        npiNumber: 'npi_number',
        licenseNumbers: 'license_numbers',
        insuranceNetworks: 'insurance_networks',
        availabilityHours: 'availability_hours',
        acceptsNewPatients: 'accepts_new_patients',
        preferredReferralMethod: 'preferred_referral_method'
      };

      for (const [key, dbField] of Object.entries(fieldMappings)) {
        if (updateData.hasOwnProperty(key)) {
          updateFields.push(`${dbField} = ?`);
          
          // Handle JSON fields
          if (['specialtiesSecondary', 'licenseNumbers', 'insuranceNetworks', 'availabilityHours'].includes(key)) {
            updateValues.push(JSON.stringify(updateData[key]));
          } else {
            updateValues.push(updateData[key]);
          }
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Add updated_at field
      updateFields.push('updated_at = NOW()');
      updateValues.push(specialistId);

      // Execute update
      await connection.execute(`
        UPDATE referral_specialists 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);

      await connection.commit();

      // Get updated specialist data
      const updatedSpecialist = await this.getSpecialistById(specialistId);

      // Log audit trail
      await this.logSpecialistAudit({
        userId,
        action: 'SPECIALIST_UPDATED',
        specialistId,
        oldValues: currentSpecialist,
        newValues: updatedSpecialist,
        ipAddress: updateData.ipAddress,
        userAgent: updateData.userAgent
      });

      return {
        success: true,
        specialist: updatedSpecialist,
        message: 'Specialist updated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error updating specialist:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Search specialists with advanced filtering
   */
  async searchSpecialists(searchCriteria, pagination = {}) {
    try {
      const {
        query = null,
        specialty = null,
        location = null,
        insuranceNetworks = null,
        acceptsNewPatients = null,
        preferredReferralMethod = null,
        availability = null,
        performanceThreshold = null
      } = searchCriteria;

      const {
        limit = 50,
        offset = 0,
        sortBy = 'name',
        sortOrder = 'ASC'
      } = pagination;

      let baseQuery = `
        SELECT 
          s.*,
          COALESCE(s.patient_satisfaction_score, 0) as satisfaction_score,
          COALESCE(s.average_response_time, 0) as avg_response_time,
          COALESCE(s.total_referrals_received, 0) as total_referrals,
          COALESCE(s.completed_referrals, 0) as completed_referrals,
          CASE 
            WHEN s.total_referrals_received > 0 
            THEN ROUND((s.completed_referrals / s.total_referrals_received) * 100, 2)
            ELSE 0 
          END as completion_rate
        FROM referral_specialists s
        WHERE s.is_active = TRUE
      `;

      const params = [];

      // Text search across multiple fields
      if (query) {
        baseQuery += ` AND (
          s.name LIKE ? OR 
          s.practice_name LIKE ? OR 
          s.specialty_primary LIKE ? OR
          s.city LIKE ? OR
          s.state LIKE ?
        )`;
        const searchPattern = `%${query}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      // Specialty filter
      if (specialty) {
        if (Array.isArray(specialty)) {
          baseQuery += ` AND (s.specialty_primary IN (${specialty.map(() => '?').join(',')}) OR 
            ${specialty.map(() => 'JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?))').join(' OR ')})`;
          params.push(...specialty, ...specialty);
        } else {
          baseQuery += ` AND (s.specialty_primary = ? OR JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)))`;
          params.push(specialty, specialty);
        }
      }

      // Location filter
      if (location) {
        if (location.city) {
          baseQuery += ` AND s.city = ?`;
          params.push(location.city);
        }
        if (location.state) {
          baseQuery += ` AND s.state = ?`;
          params.push(location.state);
        }
        if (location.zipCode) {
          baseQuery += ` AND s.zip_code = ?`;
          params.push(location.zipCode);
        }
        if (location.radius && location.latitude && location.longitude) {
          // This would require geocoding - simplified for now
          baseQuery += ` AND s.city = ?`;
          params.push(location.city);
        }
      }

      // Insurance networks filter
      if (insuranceNetworks && insuranceNetworks.length > 0) {
        const networkConditions = insuranceNetworks.map(() => 'JSON_CONTAINS(s.insurance_networks, JSON_QUOTE(?))').join(' OR ');
        baseQuery += ` AND (${networkConditions})`;
        params.push(...insuranceNetworks);
      }

      // Accepts new patients filter
      if (acceptsNewPatients !== null) {
        baseQuery += ` AND s.accepts_new_patients = ?`;
        params.push(acceptsNewPatients);
      }

      // Preferred referral method filter
      if (preferredReferralMethod) {
        baseQuery += ` AND s.preferred_referral_method = ?`;
        params.push(preferredReferralMethod);
      }

      // Performance threshold filter
      if (performanceThreshold) {
        if (performanceThreshold.minSatisfactionScore) {
          baseQuery += ` AND s.patient_satisfaction_score >= ?`;
          params.push(performanceThreshold.minSatisfactionScore);
        }
        if (performanceThreshold.maxResponseTime) {
          baseQuery += ` AND s.average_response_time <= ?`;
          params.push(performanceThreshold.maxResponseTime);
        }
        if (performanceThreshold.minCompletionRate) {
          baseQuery += ` AND (s.completed_referrals / GREATEST(s.total_referrals_received, 1)) >= ?`;
          params.push(performanceThreshold.minCompletionRate / 100);
        }
      }

      // Availability filter (simplified - would integrate with scheduling system)
      if (availability) {
        if (availability.dayOfWeek) {
          baseQuery += ` AND JSON_EXTRACT(s.availability_hours, '$.${availability.dayOfWeek}') IS NOT NULL`;
        }
      }

      // Add sorting
      const validSortFields = ['name', 'specialty_primary', 'city', 'state', 'satisfaction_score', 'avg_response_time', 'completion_rate'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
      const order = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      baseQuery += ` ORDER BY ${sortField} ${order}`;

      // Add pagination
      baseQuery += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);

      const [specialists] = await db.execute(baseQuery, params);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM referral_specialists s
        WHERE s.is_active = TRUE
      `;

      const countParams = [];
      let paramIndex = 0;

      // Apply same filters to count query (rebuild without sorting/pagination)
      if (query) {
        countQuery += ` AND (
          s.name LIKE ? OR 
          s.practice_name LIKE ? OR 
          s.specialty_primary LIKE ? OR
          s.city LIKE ? OR
          s.state LIKE ?
        )`;
        const searchPattern = `%${query}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (specialty) {
        if (Array.isArray(specialty)) {
          countQuery += ` AND (s.specialty_primary IN (${specialty.map(() => '?').join(',')}) OR 
            ${specialty.map(() => 'JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?))').join(' OR ')})`;
          countParams.push(...specialty, ...specialty);
        } else {
          countQuery += ` AND (s.specialty_primary = ? OR JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)))`;
          countParams.push(specialty, specialty);
        }
      }

      if (location) {
        if (location.city) {
          countQuery += ` AND s.city = ?`;
          countParams.push(location.city);
        }
        if (location.state) {
          countQuery += ` AND s.state = ?`;
          countParams.push(location.state);
        }
        if (location.zipCode) {
          countQuery += ` AND s.zip_code = ?`;
          countParams.push(location.zipCode);
        }
      }

      if (insuranceNetworks && insuranceNetworks.length > 0) {
        const networkConditions = insuranceNetworks.map(() => 'JSON_CONTAINS(s.insurance_networks, JSON_QUOTE(?))').join(' OR ');
        countQuery += ` AND (${networkConditions})`;
        countParams.push(...insuranceNetworks);
      }

      if (acceptsNewPatients !== null) {
        countQuery += ` AND s.accepts_new_patients = ?`;
        countParams.push(acceptsNewPatients);
      }

      if (preferredReferralMethod) {
        countQuery += ` AND s.preferred_referral_method = ?`;
        countParams.push(preferredReferralMethod);
      }

      if (performanceThreshold) {
        if (performanceThreshold.minSatisfactionScore) {
          countQuery += ` AND s.patient_satisfaction_score >= ?`;
          countParams.push(performanceThreshold.minSatisfactionScore);
        }
        if (performanceThreshold.maxResponseTime) {
          countQuery += ` AND s.average_response_time <= ?`;
          countParams.push(performanceThreshold.maxResponseTime);
        }
        if (performanceThreshold.minCompletionRate) {
          countQuery += ` AND (s.completed_referrals / GREATEST(s.total_referrals_received, 1)) >= ?`;
          countParams.push(performanceThreshold.minCompletionRate / 100);
        }
      }

      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;

      return {
        specialists,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
          currentPage: Math.floor(offset / limit) + 1
        },
        searchCriteria
      };

    } catch (error) {
      console.error('Error searching specialists:', error);
      throw error;
    }
  }

  /**
   * Get specialist by ID with complete details
   */
  async getSpecialistById(specialistId, connection = null) {
    try {
      const conn = connection || db;

      const [specialists] = await conn.execute(`
        SELECT 
          s.*,
          COALESCE(s.patient_satisfaction_score, 0) as satisfaction_score,
          COALESCE(s.average_response_time, 0) as avg_response_time,
          COALESCE(s.total_referrals_received, 0) as total_referrals,
          COALESCE(s.completed_referrals, 0) as completed_referrals,
          CASE 
            WHEN s.total_referrals_received > 0 
            THEN ROUND((s.completed_referrals / s.total_referrals_received) * 100, 2)
            ELSE 0 
          END as completion_rate
        FROM referral_specialists s
        WHERE s.id = ?
      `, [specialistId]);

      if (specialists.length === 0) {
        return null;
      }

      const specialist = specialists[0];

      // Get recent performance metrics
      const [recentMetrics] = await conn.execute(`
        SELECT 
          metric_date,
          referrals_received,
          referrals_scheduled,
          referrals_completed,
          average_scheduling_time,
          patient_satisfaction_total,
          patient_satisfaction_count,
          response_time_total,
          response_count
        FROM referral_specialist_metrics 
        WHERE specialist_id = ? 
        ORDER BY metric_date DESC 
        LIMIT 30
      `, [specialistId]);

      // Get recent referrals count
      const [recentReferrals] = await conn.execute(`
        SELECT 
          COUNT(*) as total_recent,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_recent,
          COUNT(CASE WHEN urgency_level = 'urgent' THEN 1 END) as urgent_recent,
          COUNT(CASE WHEN urgency_level = 'stat' THEN 1 END) as stat_recent
        FROM referrals 
        WHERE specialist_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [specialistId]);

      return {
        ...specialist,
        recentMetrics,
        recentReferralStats: recentReferrals[0] || {
          total_recent: 0,
          completed_recent: 0,
          urgent_recent: 0,
          stat_recent: 0
        }
      };

    } catch (error) {
      console.error('Error getting specialist by ID:', error);
      throw error;
    }
  }

  /**
   * Get specialist performance analytics
   */
  async getSpecialistPerformance(specialistId, dateRange = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = dateRange;

      // Get performance metrics over time
      const [metrics] = await db.execute(`
        SELECT 
          metric_date,
          referrals_received,
          referrals_scheduled,
          referrals_completed,
          average_scheduling_time,
          CASE 
            WHEN patient_satisfaction_count > 0 
            THEN ROUND(patient_satisfaction_total / patient_satisfaction_count, 2)
            ELSE 0 
          END as avg_satisfaction,
          CASE 
            WHEN response_count > 0 
            THEN ROUND(response_time_total / response_count, 2)
            ELSE 0 
          END as avg_response_time
        FROM referral_specialist_metrics 
        WHERE specialist_id = ? 
        AND metric_date BETWEEN ? AND ?
        ORDER BY metric_date
      `, [specialistId, startDate, endDate]);

      // Get referral outcomes
      const [outcomes] = await db.execute(`
        SELECT 
          status,
          urgency_level,
          COUNT(*) as count,
          AVG(DATEDIFF(COALESCE(completed_at, NOW()), created_at)) as avg_days_to_complete
        FROM referrals 
        WHERE specialist_id = ? 
        AND created_at BETWEEN ? AND ?
        GROUP BY status, urgency_level
      `, [specialistId, startDate, endDate]);

      // Get patient satisfaction trends
      const [satisfactionTrends] = await db.execute(`
        SELECT 
          DATE(created_at) as date,
          AVG(patient_satisfaction_score) as avg_satisfaction,
          COUNT(*) as review_count
        FROM referral_quality_metrics rqm
        JOIN referrals r ON rqm.referral_id = r.id
        WHERE r.specialist_id = ? 
        AND r.created_at BETWEEN ? AND ?
        AND rqm.patient_satisfaction_score IS NOT NULL
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [specialistId, startDate, endDate]);

      // Calculate performance scores
      const performanceScore = await this.calculatePerformanceScore(specialistId, dateRange);

      return {
        specialistId,
        dateRange: { startDate, endDate },
        metrics,
        outcomes,
        satisfactionTrends,
        performanceScore,
        summary: {
          totalReferrals: metrics.reduce((sum, m) => sum + (m.referrals_received || 0), 0),
          completedReferrals: metrics.reduce((sum, m) => sum + (m.referrals_completed || 0), 0),
          averageResponseTime: metrics.length > 0 ? 
            metrics.reduce((sum, m) => sum + (m.avg_response_time || 0), 0) / metrics.length : 0,
          averageSatisfaction: satisfactionTrends.length > 0 ?
            satisfactionTrends.reduce((sum, s) => sum + (s.avg_satisfaction || 0), 0) / satisfactionTrends.length : 0
        }
      };

    } catch (error) {
      console.error('Error getting specialist performance:', error);
      throw error;
    }
  }

  /**
   * Update specialist performance metrics
   */
  async updateSpecialistMetrics(specialistId, metricsData) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const today = new Date().toISOString().split('T')[0];

      // Update or insert daily metrics
      await connection.execute(`
        INSERT INTO referral_specialist_metrics (
          specialist_id, metric_date, referrals_received, referrals_scheduled,
          referrals_completed, average_scheduling_time, patient_satisfaction_total,
          patient_satisfaction_count, response_time_total, response_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          referrals_received = referrals_received + VALUES(referrals_received),
          referrals_scheduled = referrals_scheduled + VALUES(referrals_scheduled),
          referrals_completed = referrals_completed + VALUES(referrals_completed),
          average_scheduling_time = (average_scheduling_time + VALUES(average_scheduling_time)) / 2,
          patient_satisfaction_total = patient_satisfaction_total + VALUES(patient_satisfaction_total),
          patient_satisfaction_count = patient_satisfaction_count + VALUES(patient_satisfaction_count),
          response_time_total = response_time_total + VALUES(response_time_total),
          response_count = response_count + VALUES(response_count)
      `, [
        specialistId,
        today,
        metricsData.referralsReceived || 0,
        metricsData.referralsScheduled || 0,
        metricsData.referralsCompleted || 0,
        metricsData.averageSchedulingTime || 0,
        metricsData.patientSatisfactionTotal || 0,
        metricsData.patientSatisfactionCount || 0,
        metricsData.responseTimeTotal || 0,
        metricsData.responseCount || 0
      ]);

      // Update specialist summary metrics
      await this.updateSpecialistSummaryMetrics(specialistId, connection);

      await connection.commit();

      return {
        success: true,
        message: 'Specialist metrics updated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error updating specialist metrics:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Deactivate specialist
   */
  async deactivateSpecialist(specialistId, reason, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // Get current specialist
      const specialist = await this.getSpecialistById(specialistId, connection);
      if (!specialist) {
        throw new Error('Specialist not found');
      }

      // Check for active referrals
      const [activeReferrals] = await connection.execute(`
        SELECT COUNT(*) as count 
        FROM referrals 
        WHERE specialist_id = ? AND status IN ('pending', 'sent', 'scheduled')
      `, [specialistId]);

      if (activeReferrals[0].count > 0) {
        throw new Error(`Cannot deactivate specialist with ${activeReferrals[0].count} active referrals`);
      }

      // Deactivate specialist
      await connection.execute(`
        UPDATE referral_specialists 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = ?
      `, [specialistId]);

      await connection.commit();

      // Log audit trail
      await this.logSpecialistAudit({
        userId,
        action: 'SPECIALIST_DEACTIVATED',
        specialistId,
        oldValues: { is_active: true },
        newValues: { is_active: false, reason }
      });

      return {
        success: true,
        message: 'Specialist deactivated successfully'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('Error deactivating specialist:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Sync with external specialist directory
   */
  async syncWithExternalDirectory(directorySource, syncOptions = {}) {
    try {
      console.log(`Starting sync with external directory: ${directorySource}`);

      // This would integrate with external specialist directories
      // For now, return a placeholder response
      
      const syncResult = {
        success: true,
        source: directorySource,
        syncedAt: new Date().toISOString(),
        statistics: {
          specialistsProcessed: 0,
          specialistsAdded: 0,
          specialistsUpdated: 0,
          specialistsDeactivated: 0,
          errors: []
        }
      };

      // Log sync event
      await db.execute(`
        INSERT INTO referral_sync_logs (
          integration_id, sync_type, sync_direction, sync_status,
          request_data, response_data, created_at
        ) VALUES ('external_directory', 'sync', 'inbound', 'success', ?, ?, NOW())
      `, [
        JSON.stringify({ source: directorySource, options: syncOptions }),
        JSON.stringify(syncResult)
      ]);

      return syncResult;

    } catch (error) {
      console.error('Error syncing with external directory:', error);
      throw error;
    }
  }

  /**
   * Get specialist suggestions based on criteria
   */
  async getSpecialistSuggestions(criteria) {
    try {
      const {
        specialtyType,
        patientLocation,
        insuranceNetworks,
        urgencyLevel = 'routine',
        preferredReferralMethod,
        limit = 10
      } = criteria;

      let query = `
        SELECT 
          s.*,
          COALESCE(s.patient_satisfaction_score, 0) as satisfaction_score,
          COALESCE(s.average_response_time, 999) as avg_response_time,
          CASE 
            WHEN s.total_referrals_received > 0 
            THEN ROUND((s.completed_referrals / s.total_referrals_received) * 100, 2)
            ELSE 0 
          END as completion_rate,
          -- Calculate match score
          (
            CASE WHEN s.specialty_primary = ? THEN 50 ELSE 0 END +
            CASE WHEN JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)) THEN 30 ELSE 0 END +
            CASE WHEN s.accepts_new_patients = TRUE THEN 20 ELSE 0 END +
            CASE WHEN s.patient_satisfaction_score >= 4.0 THEN 15 ELSE 0 END +
            CASE WHEN s.average_response_time <= 24 THEN 10 ELSE 0 END +
            CASE WHEN s.preferred_referral_method = ? THEN 5 ELSE 0 END
          ) as match_score
        FROM referral_specialists s
        WHERE s.is_active = TRUE
        AND s.accepts_new_patients = TRUE
        AND (s.specialty_primary = ? OR JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)))
      `;

      const params = [
        specialtyType, specialtyType, preferredReferralMethod || 'fax',
        specialtyType, specialtyType
      ];

      // Add location filter if provided
      if (patientLocation) {
        if (patientLocation.city) {
          query += ` AND s.city = ?`;
          params.push(patientLocation.city);
        }
        if (patientLocation.state) {
          query += ` AND s.state = ?`;
          params.push(patientLocation.state);
        }
      }

      // Add insurance network filter
      if (insuranceNetworks && insuranceNetworks.length > 0) {
        const networkConditions = insuranceNetworks.map(() => 'JSON_CONTAINS(s.insurance_networks, JSON_QUOTE(?))').join(' OR ');
        query += ` AND (${networkConditions})`;
        params.push(...insuranceNetworks);
      }

      // Add urgency-based filtering
      if (urgencyLevel === 'urgent') {
        query += ` AND s.average_response_time <= 24`; // 24 hours for urgent
      } else if (urgencyLevel === 'stat') {
        query += ` AND s.average_response_time <= 4`; // 4 hours for STAT
      }

      // Order by match score and performance
      query += ` 
        ORDER BY 
          match_score DESC,
          s.patient_satisfaction_score DESC,
          s.average_response_time ASC
        LIMIT ?
      `;
      params.push(limit);

      const [suggestions] = await db.execute(query, params);

      return {
        suggestions,
        criteria,
        totalFound: suggestions.length
      };

    } catch (error) {
      console.error('Error getting specialist suggestions:', error);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Validate specialist data
   */
  validateSpecialistData(data) {
    const required = ['name', 'specialtyPrimary'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!this.validSpecialties.includes(data.specialtyPrimary)) {
      throw new Error(`Invalid primary specialty: ${data.specialtyPrimary}`);
    }

    if (data.preferredReferralMethod && !this.validReferralMethods.includes(data.preferredReferralMethod)) {
      throw new Error(`Invalid referral method: ${data.preferredReferralMethod}`);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.npiNumber && !this.isValidNPI(data.npiNumber)) {
      throw new Error('Invalid NPI number format');
    }
  }

  /**
   * Validate specialist update data
   */
  validateSpecialistUpdateData(data) {
    if (data.specialtyPrimary && !this.validSpecialties.includes(data.specialtyPrimary)) {
      throw new Error(`Invalid primary specialty: ${data.specialtyPrimary}`);
    }

    if (data.preferredReferralMethod && !this.validReferralMethods.includes(data.preferredReferralMethod)) {
      throw new Error(`Invalid referral method: ${data.preferredReferralMethod}`);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.npiNumber && !this.isValidNPI(data.npiNumber)) {
      throw new Error('Invalid NPI number format');
    }
  }

  /**
   * Generate unique specialist ID
   */
  generateSpecialistId() {
    return `SPEC_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Initialize specialist metrics
   */
  async initializeSpecialistMetrics(specialistId, connection) {
    const today = new Date().toISOString().split('T')[0];
    
    await connection.execute(`
      INSERT INTO referral_specialist_metrics (
        specialist_id, metric_date, referrals_received, referrals_scheduled,
        referrals_completed, average_scheduling_time, patient_satisfaction_total,
        patient_satisfaction_count, response_time_total, response_count
      ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [specialistId, today]);
  }

  /**
   * Update specialist summary metrics
   */
  async updateSpecialistSummaryMetrics(specialistId, connection) {
    // Calculate and update summary metrics from daily metrics
    const [summaryData] = await connection.execute(`
      SELECT 
        SUM(referrals_received) as total_received,
        SUM(referrals_completed) as total_completed,
        AVG(average_scheduling_time) as avg_scheduling_time,
        CASE 
          WHEN SUM(patient_satisfaction_count) > 0 
          THEN SUM(patient_satisfaction_total) / SUM(patient_satisfaction_count)
          ELSE 0 
        END as avg_satisfaction,
        CASE 
          WHEN SUM(response_count) > 0 
          THEN SUM(response_time_total) / SUM(response_count)
          ELSE 0 
        END as avg_response_time
      FROM referral_specialist_metrics 
      WHERE specialist_id = ?
    `, [specialistId]);

    if (summaryData.length > 0) {
      const summary = summaryData[0];
      
      await connection.execute(`
        UPDATE referral_specialists 
        SET 
          total_referrals_received = ?,
          completed_referrals = ?,
          patient_satisfaction_score = ?,
          average_response_time = ?
        WHERE id = ?
      `, [
        summary.total_received || 0,
        summary.total_completed || 0,
        summary.avg_satisfaction || 0,
        summary.avg_response_time || 0,
        specialistId
      ]);
    }
  }

  /**
   * Calculate performance score
   */
  async calculatePerformanceScore(specialistId, dateRange) {
    try {
      const [metrics] = await db.execute(`
        SELECT 
          AVG(CASE WHEN patient_satisfaction_count > 0 THEN patient_satisfaction_total / patient_satisfaction_count ELSE 0 END) as avg_satisfaction,
          AVG(CASE WHEN response_count > 0 THEN response_time_total / response_count ELSE 0 END) as avg_response_time,
          SUM(referrals_received) as total_received,
          SUM(referrals_completed) as total_completed
        FROM referral_specialist_metrics 
        WHERE specialist_id = ? 
        AND metric_date BETWEEN ? AND ?
      `, [specialistId, dateRange.startDate, dateRange.endDate]);

      if (metrics.length === 0 || !metrics[0].total_received) {
        return { score: 0, breakdown: {} };
      }

      const data = metrics[0];
      const completionRate = data.total_received > 0 ? (data.total_completed / data.total_received) : 0;

      // Calculate weighted performance score (0-100)
      const satisfactionScore = (data.avg_satisfaction / 5) * 30; // 30% weight
      const responseScore = Math.max(0, (48 - data.avg_response_time) / 48) * 25; // 25% weight
      const completionScore = completionRate * 25; // 25% weight
      const volumeScore = Math.min(data.total_received / 10, 1) * 20; // 20% weight

      const totalScore = satisfactionScore + responseScore + completionScore + volumeScore;

      return {
        score: Math.round(totalScore),
        breakdown: {
          satisfaction: Math.round(satisfactionScore),
          responseTime: Math.round(responseScore),
          completion: Math.round(completionScore),
          volume: Math.round(volumeScore)
        },
        metrics: {
          avgSatisfaction: data.avg_satisfaction,
          avgResponseTime: data.avg_response_time,
          completionRate: completionRate,
          totalReferrals: data.total_received
        }
      };

    } catch (error) {
      console.error('Error calculating performance score:', error);
      return { score: 0, breakdown: {} };
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate NPI number format
   */
  isValidNPI(npi) {
    // NPI is 10 digits
    const npiRegex = /^\d{10}$/;
    return npiRegex.test(npi);
  }

  /**
   * Log specialist audit trail
   */
  async logSpecialistAudit(auditData) {
    try {
      await db.execute(`
        INSERT INTO referral_audit_logs (
          referral_id, user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES (NULL, ?, ?, 'specialist', ?, ?, ?, ?, ?, NOW())
      `, [
        auditData.userId,
        auditData.action,
        auditData.specialistId,
        JSON.stringify(auditData.oldValues || {}),
        JSON.stringify(auditData.newValues || {}),
        auditData.ipAddress || null,
        auditData.userAgent || null
      ]);
    } catch (error) {
      console.error('Error logging specialist audit:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }
}

module.exports = new SpecialistService();rror)
;
      throw error;
    }
  }

  /**
   * Get all available specialties
   */
  async getAvailableSpecialties() {
    try {
      const [specialties] = await db.execute(`
        SELECT 
          specialty_primary as specialty,
          COUNT(*) as specialist_count,
          COUNT(CASE WHEN accepts_new_patients = TRUE THEN 1 END) as accepting_new_patients
        FROM referral_specialists 
        WHERE is_active = TRUE
        GROUP BY specialty_primary
        ORDER BY specialist_count DESC
      `);

      return {
        specialties,
        totalSpecialties: specialties.length
      };

    } catch (error) {
      console.error('Error getting available specialties:', error);
      throw error;
    }
  }

  /**
   * Get specialists by location
   */
  async getSpecialistsByLocation(location, filters = {}) {
    try {
      const { specialty, limit = 20 } = filters;

      let query = `
        SELECT 
          s.*,
          COALESCE(s.patient_satisfaction_score, 0) as satisfaction_score,
          COALESCE(s.average_response_time, 0) as avg_response_time
        FROM referral_specialists s
        WHERE s.is_active = TRUE
      `;

      const params = [];

      if (location.city) {
        query += ` AND s.city = ?`;
        params.push(location.city);
      }

      if (location.state) {
        query += ` AND s.state = ?`;
        params.push(location.state);
      }

      if (location.zipCode) {
        query += ` AND s.zip_code = ?`;
        params.push(location.zipCode);
      }

      if (specialty) {
        query += ` AND (s.specialty_primary = ? OR JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)))`;
        params.push(specialty, specialty);
      }

      query += ` ORDER BY s.patient_satisfaction_score DESC LIMIT ?`;
      params.push(limit);

      const [specialists] = await db.execute(query, params);

      return {
        specialists,
        location,
        totalFound: specialists.length
      };

    } catch (error) {
      console.error('Error getting specialists by location:', error);
      throw error;
    }
  }

  /**
   * Calculate performance score for specialist
   */
  async calculatePerformanceScore(specialistId, dateRange = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate = new Date().toISOString().split('T')[0]
      } = dateRange;

      // Get performance metrics
      const [metrics] = await db.execute(`
        SELECT 
          AVG(CASE WHEN patient_satisfaction_count > 0 
              THEN patient_satisfaction_total / patient_satisfaction_count 
              ELSE 0 END) as avg_satisfaction,
          AVG(CASE WHEN response_count > 0 
              THEN response_time_total / response_count 
              ELSE 0 END) as avg_response_time,
          SUM(referrals_completed) as total_completed,
          SUM(referrals_received) as total_received
        FROM referral_specialist_metrics 
        WHERE specialist_id = ? 
        AND metric_date BETWEEN ? AND ?
      `, [specialistId, startDate, endDate]);

      const metric = metrics[0];
      
      // Calculate weighted performance score (0-100)
      let score = 0;
      
      // Satisfaction score (40% weight)
      if (metric.avg_satisfaction > 0) {
        score += (metric.avg_satisfaction / 5.0) * 40;
      }
      
      // Response time score (30% weight) - lower is better
      if (metric.avg_response_time > 0) {
        const responseScore = Math.max(0, (48 - metric.avg_response_time) / 48);
        score += responseScore * 30;
      }
      
      // Completion rate score (30% weight)
      if (metric.total_received > 0) {
        const completionRate = metric.total_completed / metric.total_received;
        score += completionRate * 30;
      }

      return {
        score: Math.round(score),
        components: {
          satisfaction: metric.avg_satisfaction || 0,
          responseTime: metric.avg_response_time || 0,
          completionRate: metric.total_received > 0 ? 
            (metric.total_completed / metric.total_received) : 0
        },
        dateRange: { startDate, endDate }
      };

    } catch (error) {
      console.error('Error calculating performance score:', error);
      return { score: 0, components: {}, dateRange };
    }
  }

  /**
   * Update specialist summary metrics
   */
  async updateSpecialistSummaryMetrics(specialistId, connection) {
    try {
      // Calculate summary metrics from daily metrics
      const [summaryData] = await connection.execute(`
        SELECT 
          SUM(referrals_received) as total_received,
          SUM(referrals_completed) as total_completed,
          AVG(CASE WHEN response_count > 0 
              THEN response_time_total / response_count 
              ELSE NULL END) as avg_response_time,
          AVG(CASE WHEN patient_satisfaction_count > 0 
              THEN patient_satisfaction_total / patient_satisfaction_count 
              ELSE NULL END) as avg_satisfaction
        FROM referral_specialist_metrics 
        WHERE specialist_id = ?
      `, [specialistId]);

      const summary = summaryData[0];

      // Update specialist summary fields
      await connection.execute(`
        UPDATE referral_specialists 
        SET 
          total_referrals_received = ?,
          completed_referrals = ?,
          average_response_time = ?,
          patient_satisfaction_score = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [
        summary.total_received || 0,
        summary.total_completed || 0,
        summary.avg_response_time || 0,
        summary.avg_satisfaction || 0,
        specialistId
      ]);

    } catch (error) {
      console.error('Error updating specialist summary metrics:', error);
      throw error;
    }
  }

  /**
   * Initialize specialist metrics
   */
  async initializeSpecialistMetrics(specialistId, connection) {
    const today = new Date().toISOString().split('T')[0];
    
    await connection.execute(`
      INSERT INTO referral_specialist_metrics (
        specialist_id, metric_date, referrals_received, referrals_scheduled,
        referrals_completed, average_scheduling_time, patient_satisfaction_total,
        patient_satisfaction_count, response_time_total, response_count
      ) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)
    `, [specialistId, today]);
  }

  // Validation Methods

  /**
   * Validate specialist data
   */
  validateSpecialistData(data) {
    const required = ['name', 'specialtyPrimary'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (data.specialtyPrimary && !this.validSpecialties.includes(data.specialtyPrimary)) {
      throw new Error(`Invalid specialty: ${data.specialtyPrimary}`);
    }

    if (data.preferredReferralMethod && !this.validReferralMethods.includes(data.preferredReferralMethod)) {
      throw new Error(`Invalid referral method: ${data.preferredReferralMethod}`);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.npiNumber && !this.isValidNPI(data.npiNumber)) {
      throw new Error('Invalid NPI number format');
    }
  }

  /**
   * Validate specialist update data
   */
  validateSpecialistUpdateData(data) {
    if (data.specialtyPrimary && !this.validSpecialties.includes(data.specialtyPrimary)) {
      throw new Error(`Invalid specialty: ${data.specialtyPrimary}`);
    }

    if (data.preferredReferralMethod && !this.validReferralMethods.includes(data.preferredReferralMethod)) {
      throw new Error(`Invalid referral method: ${data.preferredReferralMethod}`);
    }

    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    if (data.npiNumber && !this.isValidNPI(data.npiNumber)) {
      throw new Error('Invalid NPI number format');
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate NPI number format
   */
  isValidNPI(npi) {
    return /^\d{10}$/.test(npi);
  }

  // Helper Methods

  /**
   * Generate unique specialist ID
   */
  generateSpecialistId() {
    return `SPEC_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Log specialist audit trail
   */
  async logSpecialistAudit(auditData) {
    try {
      await db.execute(`
        INSERT INTO referral_audit_logs (
          user_id, action, entity_type, entity_id,
          old_values, new_values, ip_address, user_agent, created_at
        ) VALUES (?, ?, 'specialist', ?, ?, ?, ?, ?, NOW())
      `, [
        auditData.userId,
        auditData.action,
        auditData.specialistId,
        JSON.stringify(auditData.oldValues || {}),
        JSON.stringify(auditData.newValues || {}),
        auditData.ipAddress || null,
        auditData.userAgent || null
      ]);
    } catch (error) {
      console.error('Error logging specialist audit:', error);
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Get specialist network statistics
   */
  async getNetworkStatistics() {
    try {
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as total_specialists,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_specialists,
          COUNT(CASE WHEN accepts_new_patients = TRUE THEN 1 END) as accepting_new_patients,
          COUNT(DISTINCT specialty_primary) as unique_specialties,
          COUNT(DISTINCT CONCAT(city, ', ', state)) as unique_locations,
          AVG(patient_satisfaction_score) as avg_satisfaction_score,
          AVG(average_response_time) as avg_response_time
        FROM referral_specialists
      `);

      const [topSpecialties] = await db.execute(`
        SELECT 
          specialty_primary,
          COUNT(*) as count,
          AVG(patient_satisfaction_score) as avg_satisfaction
        FROM referral_specialists 
        WHERE is_active = TRUE
        GROUP BY specialty_primary
        ORDER BY count DESC
        LIMIT 10
      `);

      const [topLocations] = await db.execute(`
        SELECT 
          CONCAT(city, ', ', state) as location,
          COUNT(*) as specialist_count
        FROM referral_specialists 
        WHERE is_active = TRUE AND city IS NOT NULL AND state IS NOT NULL
        GROUP BY city, state
        ORDER BY specialist_count DESC
        LIMIT 10
      `);

      return {
        summary: stats[0],
        topSpecialties,
        topLocations,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting network statistics:', error);
      throw error;
    }
  }

  /**
   * Search specialists with advanced filters and scoring
   */
  async advancedSpecialistSearch(searchCriteria) {
    try {
      const {
        query,
        specialty,
        location,
        insuranceNetworks,
        urgencyLevel = 'routine',
        patientAge,
        performanceThreshold,
        limit = 20,
        sortBy = 'relevance'
      } = searchCriteria;

      let baseQuery = `
        SELECT 
          s.*,
          COALESCE(s.patient_satisfaction_score, 0) as satisfaction_score,
          COALESCE(s.average_response_time, 999) as avg_response_time,
          CASE 
            WHEN s.total_referrals_received > 0 
            THEN ROUND((s.completed_referrals / s.total_referrals_received) * 100, 2)
            ELSE 0 
          END as completion_rate,
          -- Calculate relevance score
          (
            CASE WHEN s.specialty_primary = ? THEN 50 ELSE 0 END +
            CASE WHEN JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)) THEN 30 ELSE 0 END +
            CASE WHEN s.accepts_new_patients = TRUE THEN 20 ELSE 0 END +
            CASE WHEN s.patient_satisfaction_score >= 4.0 THEN 15 ELSE 0 END +
            CASE WHEN s.average_response_time <= 24 THEN 10 ELSE 0 END +
            CASE WHEN ? = 'urgent' AND s.average_response_time <= 12 THEN 15 ELSE 0 END +
            CASE WHEN ? = 'stat' AND s.average_response_time <= 4 THEN 25 ELSE 0 END
          ) as relevance_score
        FROM referral_specialists s
        WHERE s.is_active = TRUE
      `;

      const params = [
        specialty || '',
        specialty || '',
        urgencyLevel,
        urgencyLevel
      ];

      // Add filters
      if (specialty) {
        baseQuery += ` AND (s.specialty_primary = ? OR JSON_CONTAINS(s.specialties_secondary, JSON_QUOTE(?)))`;
        params.push(specialty, specialty);
      }

      if (query) {
        baseQuery += ` AND (
          s.name LIKE ? OR 
          s.practice_name LIKE ? OR 
          s.specialty_primary LIKE ?
        )`;
        const searchPattern = `%${query}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (location) {
        if (location.city) {
          baseQuery += ` AND s.city = ?`;
          params.push(location.city);
        }
        if (location.state) {
          baseQuery += ` AND s.state = ?`;
          params.push(location.state);
        }
      }

      if (insuranceNetworks && insuranceNetworks.length > 0) {
        const networkConditions = insuranceNetworks.map(() => 'JSON_CONTAINS(s.insurance_networks, JSON_QUOTE(?))').join(' OR ');
        baseQuery += ` AND (${networkConditions})`;
        params.push(...insuranceNetworks);
      }

      if (performanceThreshold) {
        if (performanceThreshold.minSatisfaction) {
          baseQuery += ` AND s.patient_satisfaction_score >= ?`;
          params.push(performanceThreshold.minSatisfaction);
        }
        if (performanceThreshold.maxResponseTime) {
          baseQuery += ` AND s.average_response_time <= ?`;
          params.push(performanceThreshold.maxResponseTime);
        }
      }

      // Add sorting
      switch (sortBy) {
        case 'relevance':
          baseQuery += ` ORDER BY relevance_score DESC, s.patient_satisfaction_score DESC`;
          break;
        case 'satisfaction':
          baseQuery += ` ORDER BY s.patient_satisfaction_score DESC, relevance_score DESC`;
          break;
        case 'response_time':
          baseQuery += ` ORDER BY s.average_response_time ASC, relevance_score DESC`;
          break;
        case 'name':
          baseQuery += ` ORDER BY s.name ASC`;
          break;
        default:
          baseQuery += ` ORDER BY relevance_score DESC`;
      }

      baseQuery += ` LIMIT ?`;
      params.push(limit);

      const [specialists] = await db.execute(baseQuery, params);

      return {
        specialists,
        searchCriteria,
        totalFound: specialists.length,
        searchPerformed: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error in advanced specialist search:', error);
      throw error;
    }
  }
}

module.exports = new SpecialistService();