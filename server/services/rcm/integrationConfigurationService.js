/**
 * Integration Configuration Service
 * Handles configuration, testing, and management of external system integrations
 */

const {
  executeQuery,
  executeQuerySingle,
  auditLog
} = require('../../utils/dbUtils');
const {
  createDatabaseError,
  createNotFoundError,
  createValidationError
} = require('../../middleware/errorHandler');
const { formatDate } = require('../../utils/rcmUtils');
const ExternalSystemIntegrationService = require('./externalSystemIntegrationService');

class IntegrationConfigurationService {
  constructor() {
    this.name = 'IntegrationConfigurationService';
    this.integrationService = new ExternalSystemIntegrationService();
    
    // Default configuration templates
    this.configurationTemplates = {
      cms: {
        timeout_seconds: 30,
        retry_attempts: 3,
        health_check_interval: 300, // 5 minutes
        required_fields: ['endpoint_url', 'api_key'],
        test_endpoint: '/health'
      },
      clearinghouse: {
        timeout_seconds: 60,
        retry_attempts: 2,
        health_check_interval: 600, // 10 minutes
        required_fields: ['endpoint_url', 'api_key', 'submitter_id'],
        test_endpoint: '/ping'
      },
      payer: {
        timeout_seconds: 45,
        retry_attempts: 3,
        health_check_interval: 300, // 5 minutes
        required_fields: ['endpoint_url', 'api_key'],
        test_endpoint: '/status'
      },
      prior_auth: {
        timeout_seconds: 45,
        retry_attempts: 3,
        health_check_interval: 300, // 5 minutes
        required_fields: ['endpoint_url', 'api_key'],
        test_endpoint: '/health'
      },
      era_processor: {
        timeout_seconds: 30,
        retry_attempts: 2,
        health_check_interval: 600, // 10 minutes
        required_fields: ['endpoint_url', 'api_key'],
        test_endpoint: '/health'
      }
    };
  }

  /**
   * Get all integration configurations
   * @param {Object} filters - Filter criteria
   * @returns {Array} Integration configurations
   */
  async getIntegrationConfigurations(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.integration_type) {
        whereClause += ' AND integration_type = ?';
        params.push(filters.integration_type);
      }

      if (filters.is_active !== undefined) {
        whereClause += ' AND is_active = ?';
        params.push(filters.is_active);
      }

      const configurations = await executeQuery(`
        SELECT 
          ic.*,
          ipm.uptime_percentage,
          ipm.avg_response_time_ms,
          ipm.total_requests,
          ipm.successful_requests,
          ipm.failed_requests
        FROM integration_configurations ic
        LEFT JOIN integration_performance_metrics ipm ON ic.integration_id = ipm.integration_id 
          AND ipm.metric_date = CURDATE()
        ${whereClause}
        ORDER BY ic.integration_name
      `, params);

      return configurations.map(config => ({
        ...config,
        configuration: config.configuration ? JSON.parse(config.configuration) : {},
        success_rate: config.total_requests > 0 ? 
          Math.round((config.successful_requests / config.total_requests) * 100) : 0
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get integration configurations', {
        originalError: error.message,
        filters
      });
    }
  }

  /**
   * Get single integration configuration
   * @param {string} integrationId - Integration ID
   * @returns {Object} Integration configuration
   */
  async getIntegrationConfiguration(integrationId) {
    try {
      const config = await executeQuerySingle(`
        SELECT 
          ic.*,
          ipm.uptime_percentage,
          ipm.avg_response_time_ms,
          ipm.total_requests,
          ipm.successful_requests,
          ipm.failed_requests
        FROM integration_configurations ic
        LEFT JOIN integration_performance_metrics ipm ON ic.integration_id = ipm.integration_id 
          AND ipm.metric_date = CURDATE()
        WHERE ic.integration_id = ?
      `, [integrationId]);

      if (!config) {
        throw createNotFoundError(`Integration configuration not found: ${integrationId}`);
      }

      return {
        ...config,
        configuration: config.configuration ? JSON.parse(config.configuration) : {},
        success_rate: config.total_requests > 0 ? 
          Math.round((config.successful_requests / config.total_requests) * 100) : 0
      };
    } catch (error) {
      throw createDatabaseError('Failed to get integration configuration', {
        originalError: error.message,
        integrationId
      });
    }
  }

  /**
   * Create or update integration configuration
   * @param {string} integrationId - Integration ID
   * @param {Object} configData - Configuration data
   * @param {number} userId - User ID making the change
   * @returns {Object} Updated configuration
   */
  async updateIntegrationConfiguration(integrationId, configData, userId) {
    try {
      // Validate configuration data
      this.validateConfigurationData(configData);

      // Encrypt sensitive data
      const encryptedConfig = this.encryptSensitiveData(configData);

      // Update or insert configuration
      await executeQuery(`
        INSERT INTO integration_configurations (
          integration_id, integration_name, integration_type, endpoint_url,
          api_key_encrypted, timeout_seconds, retry_attempts, is_active,
          test_mode, configuration, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          integration_name = VALUES(integration_name),
          integration_type = VALUES(integration_type),
          endpoint_url = VALUES(endpoint_url),
          api_key_encrypted = VALUES(api_key_encrypted),
          timeout_seconds = VALUES(timeout_seconds),
          retry_attempts = VALUES(retry_attempts),
          is_active = VALUES(is_active),
          test_mode = VALUES(test_mode),
          configuration = VALUES(configuration),
          updated_at = NOW()
      `, [
        integrationId,
        configData.integration_name,
        configData.integration_type,
        configData.endpoint_url,
        encryptedConfig.api_key_encrypted,
        configData.timeout_seconds || 30,
        configData.retry_attempts || 3,
        configData.is_active !== false,
        configData.test_mode || false,
        JSON.stringify(encryptedConfig.configuration)
      ]);

      // Log configuration change
      await this.logConfigurationChange(integrationId, 'configuration_updated', {
        user_id: userId,
        changes: configData,
        timestamp: new Date().toISOString()
      });

      // Return updated configuration
      return await this.getIntegrationConfiguration(integrationId);
    } catch (error) {
      throw createDatabaseError('Failed to update integration configuration', {
        originalError: error.message,
        integrationId,
        configData
      });
    }
  }

  /**
   * Test integration connection
   * @param {string} integrationId - Integration ID
   * @param {Object} options - Test options
   * @returns {Object} Test results
   */
  async testIntegrationConnection(integrationId, options = {}) {
    try {
      const startTime = Date.now();
      let testResult = {
        integration_id: integrationId,
        test_started_at: new Date().toISOString(),
        test_completed_at: null,
        status: 'pending',
        response_time_ms: null,
        error_message: null,
        test_details: {}
      };

      try {
        // Get integration configuration
        const config = await this.getIntegrationConfiguration(integrationId);
        
        if (!config.is_active) {
          throw new Error('Integration is not active');
        }

        // Perform health check using the integration service
        await this.integrationService.checkIntegrationHealth(integrationId);
        
        // Calculate response time
        const responseTime = Date.now() - startTime;
        
        testResult = {
          ...testResult,
          test_completed_at: new Date().toISOString(),
          status: 'success',
          response_time_ms: responseTime,
          test_details: {
            endpoint_url: config.endpoint_url,
            timeout_seconds: config.timeout_seconds,
            test_type: 'health_check'
          }
        };

        // Update health status
        await this.updateHealthStatus(integrationId, 'healthy', null);

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        testResult = {
          ...testResult,
          test_completed_at: new Date().toISOString(),
          status: 'failure',
          response_time_ms: responseTime,
          error_message: error.message,
          test_details: {
            error_type: error.name,
            test_type: 'health_check'
          }
        };

        // Update health status
        await this.updateHealthStatus(integrationId, 'unhealthy', error.message);
      }

      // Log test result
      await this.logIntegrationTest(integrationId, testResult, options.userId);

      return testResult;
    } catch (error) {
      throw createDatabaseError('Failed to test integration connection', {
        originalError: error.message,
        integrationId
      });
    }
  }

  /**
   * Get integration performance dashboard data
   * @param {Object} filters - Filter criteria
   * @returns {Object} Dashboard data
   */
  async getIntegrationDashboard(filters = {}) {
    try {
      const timeRange = filters.timeRange || '24h';
      
      // Get overall statistics
      const overallStats = await executeQuerySingle(`
        SELECT 
          COUNT(*) as total_integrations,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_integrations,
          COUNT(CASE WHEN health_status = 'healthy' THEN 1 END) as healthy_integrations,
          COUNT(CASE WHEN health_status = 'unhealthy' THEN 1 END) as unhealthy_integrations,
          AVG(CASE WHEN health_status = 'healthy' THEN 100 ELSE 0 END) as overall_health_percentage
        FROM integration_configurations
      `);

      // Get performance metrics
      const performanceMetrics = await executeQuery(`
        SELECT 
          integration_id,
          SUM(total_requests) as total_requests,
          SUM(successful_requests) as successful_requests,
          SUM(failed_requests) as failed_requests,
          AVG(avg_response_time_ms) as avg_response_time,
          AVG(uptime_percentage) as avg_uptime
        FROM integration_performance_metrics
        WHERE metric_date >= DATE_SUB(CURDATE(), INTERVAL ${this.getIntervalDays(timeRange)} DAY)
        GROUP BY integration_id
      `);

      // Get recent activity
      const recentActivity = await executeQuery(`
        SELECT 
          integration_id,
          activity_type,
          status,
          response_time_ms,
          created_at
        FROM integration_logs
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${this.getIntervalHours(timeRange)} HOUR)
        ORDER BY created_at DESC
        LIMIT 50
      `);

      // Get integration status distribution
      const statusDistribution = await executeQuery(`
        SELECT 
          health_status,
          COUNT(*) as count
        FROM integration_configurations
        GROUP BY health_status
      `);

      return {
        overall_statistics: overallStats,
        performance_metrics: performanceMetrics.map(metric => ({
          ...metric,
          success_rate: metric.total_requests > 0 ? 
            Math.round((metric.successful_requests / metric.total_requests) * 100) : 0
        })),
        recent_activity: recentActivity,
        status_distribution: statusDistribution,
        time_range: timeRange,
        generated_at: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to get integration dashboard data', {
        originalError: error.message,
        filters
      });
    }
  }

  /**
   * Get integration audit trail
   * @param {Object} filters - Filter criteria
   * @returns {Object} Audit trail data
   */
  async getIntegrationAuditTrail(filters = {}) {
    try {
      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.integration_id) {
        whereClause += ' AND integration_id = ?';
        params.push(filters.integration_id);
      }

      if (filters.activity_type) {
        whereClause += ' AND activity_type = ?';
        params.push(filters.activity_type);
      }

      if (filters.date_from) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.date_to);
      }

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      const auditEntries = await executeQuery(`
        SELECT *
        FROM integration_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      const totalCount = await executeQuerySingle(`
        SELECT COUNT(*) as total
        FROM integration_logs
        ${whereClause}
      `, params);

      return {
        audit_entries: auditEntries.map(entry => ({
          ...entry,
          details: entry.details ? JSON.parse(entry.details) : {}
        })),
        pagination: {
          page,
          limit,
          total: totalCount.total,
          pages: Math.ceil(totalCount.total / limit)
        },
        filters
      };
    } catch (error) {
      throw createDatabaseError('Failed to get integration audit trail', {
        originalError: error.message,
        filters
      });
    }
  }

  /**
   * Export integration audit data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format (csv, json)
   * @returns {string} Exported data
   */
  async exportIntegrationAuditData(filters = {}, format = 'csv') {
    try {
      const auditData = await this.getIntegrationAuditTrail({
        ...filters,
        limit: 10000 // Large limit for export
      });

      if (format === 'csv') {
        return this.convertAuditDataToCSV(auditData.audit_entries);
      } else {
        return JSON.stringify(auditData, null, 2);
      }
    } catch (error) {
      throw createDatabaseError('Failed to export integration audit data', {
        originalError: error.message,
        filters,
        format
      });
    }
  }

  /**
   * Update global integration settings
   * @param {Object} settings - Global settings
   * @param {number} userId - User ID making the change
   * @returns {Object} Update result
   */
  async updateGlobalSettings(settings, userId) {
    try {
      // Store global settings
      await executeQuery(`
        INSERT INTO integration_global_settings (
          settings, updated_by, updated_at
        ) VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          settings = VALUES(settings),
          updated_by = VALUES(updated_by),
          updated_at = NOW()
      `, [
        JSON.stringify(settings),
        userId
      ]);

      // Log settings change
      await this.logConfigurationChange('global', 'global_settings_updated', {
        user_id: userId,
        settings: settings,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to update global settings', {
        originalError: error.message,
        settings
      });
    }
  }

  /**
   * Helper methods
   */

  /**
   * Validate configuration data
   * @private
   */
  validateConfigurationData(configData) {
    const requiredFields = ['integration_name', 'integration_type', 'endpoint_url'];
    
    for (const field of requiredFields) {
      if (!configData[field]) {
        throw createValidationError(`Missing required field: ${field}`);
      }
    }

    // Validate integration type
    const validTypes = ['cms', 'clearinghouse', 'payer', 'prior_auth', 'era_processor'];
    if (!validTypes.includes(configData.integration_type)) {
      throw createValidationError(`Invalid integration type: ${configData.integration_type}`);
    }

    // Validate URL format
    try {
      new URL(configData.endpoint_url);
    } catch (error) {
      throw createValidationError('Invalid endpoint URL format');
    }

    // Validate numeric fields
    if (configData.timeout_seconds && (configData.timeout_seconds < 1 || configData.timeout_seconds > 300)) {
      throw createValidationError('Timeout must be between 1 and 300 seconds');
    }

    if (configData.retry_attempts && (configData.retry_attempts < 0 || configData.retry_attempts > 10)) {
      throw createValidationError('Retry attempts must be between 0 and 10');
    }
  }

  /**
   * Encrypt sensitive configuration data
   * @private
   */
  encryptSensitiveData(configData) {
    // In production, implement proper encryption
    // For now, just return the data with a placeholder for encryption
    return {
      api_key_encrypted: configData.api_key ? Buffer.from(configData.api_key).toString('base64') : null,
      configuration: {
        ...configData.configuration,
        // Remove sensitive fields from configuration object
        api_key: undefined
      }
    };
  }

  /**
   * Update health status for integration
   * @private
   */
  async updateHealthStatus(integrationId, status, errorMessage = null) {
    await executeQuery(`
      UPDATE integration_configurations 
      SET 
        health_status = ?,
        last_health_check = NOW()
      WHERE integration_id = ?
    `, [status, integrationId]);
  }

  /**
   * Log configuration change
   * @private
   */
  async logConfigurationChange(integrationId, changeType, details) {
    try {
      await executeQuery(`
        INSERT INTO integration_logs (
          integration_id, activity_type, details, created_at
        ) VALUES (?, ?, ?, NOW())
      `, [
        integrationId,
        changeType,
        JSON.stringify(details)
      ]);
    } catch (error) {
      console.error('Failed to log configuration change:', error);
    }
  }

  /**
   * Log integration test
   * @private
   */
  async logIntegrationTest(integrationId, testResult, userId) {
    try {
      await executeQuery(`
        INSERT INTO integration_logs (
          integration_id, activity_type, status, response_time_ms,
          details, created_at
        ) VALUES (?, 'connection_test', ?, ?, ?, NOW())
      `, [
        integrationId,
        testResult.status,
        testResult.response_time_ms,
        JSON.stringify({
          ...testResult,
          tested_by: userId
        })
      ]);
    } catch (error) {
      console.error('Failed to log integration test:', error);
    }
  }

  /**
   * Convert audit data to CSV format
   * @private
   */
  convertAuditDataToCSV(auditEntries) {
    if (!auditEntries || auditEntries.length === 0) {
      return 'No data available';
    }

    const headers = [
      'Integration ID',
      'Activity Type',
      'Status',
      'Response Time (ms)',
      'Error Message',
      'Created At'
    ];

    const csvRows = [
      headers.join(','),
      ...auditEntries.map(entry => [
        entry.integration_id,
        entry.activity_type,
        entry.status,
        entry.response_time_ms || '',
        entry.error_message || '',
        entry.created_at
      ].map(field => `"${field}"`).join(','))
    ];

    return csvRows.join('\n');
  }

  /**
   * Get interval days for time range
   * @private
   */
  getIntervalDays(timeRange) {
    switch (timeRange) {
      case '1h': return 1;
      case '24h': return 1;
      case '7d': return 7;
      case '30d': return 30;
      default: return 1;
    }
  }

  /**
   * Get interval hours for time range
   * @private
   */
  getIntervalHours(timeRange) {
    switch (timeRange) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      case '30d': return 720;
      default: return 24;
    }
  }
}

module.exports = IntegrationConfigurationService;