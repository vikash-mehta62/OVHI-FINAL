/**
 * Integration Management Service
 * Handles external system integrations and monitoring
 */

const { executeQuery, executeQuerySingle } = require('../../utils/dbUtils');
const { createDatabaseError, createNotFoundError } = require('../../middleware/errorHandler');

class IntegrationManagementService {
  constructor() {
    this.name = 'IntegrationManagementService';
  }

  /**
   * Get all integrations
   * @returns {Array} List of integrations
   */
  async getIntegrations() {
    try {
      const integrations = await executeQuery(`
        SELECT 
          id,
          name,
          type,
          status,
          configuration,
          created_at,
          updated_at
        FROM integrations
        ORDER BY name ASC
      `);

      return integrations.map(integration => ({
        ...integration,
        configuration: integration.configuration ? JSON.parse(integration.configuration) : {}
      }));
    } catch (error) {
      throw createDatabaseError('Failed to get integrations', {
        originalError: error.message
      });
    }
  }

  /**
   * Create integration
   * @param {Object} integrationData - Integration data
   * @returns {Object} Created integration
   */
  async createIntegration(integrationData) {
    try {
      const query = `
        INSERT INTO integrations (
          name, type, status, configuration, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `;

      const params = [
        integrationData.name,
        integrationData.type,
        integrationData.status || 'inactive',
        JSON.stringify(integrationData.configuration || {})
      ];

      const result = await executeQuery(query, params);
      
      return {
        id: result.insertId,
        ...integrationData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      throw createDatabaseError('Failed to create integration', {
        originalError: error.message,
        integrationData
      });
    }
  }

  /**
   * Get integration by ID
   * @param {number} id - Integration ID
   * @returns {Object} Integration data
   */
  async getIntegrationById(id) {
    try {
      const integration = await executeQuerySingle(`
        SELECT 
          id,
          name,
          type,
          status,
          configuration,
          created_at,
          updated_at
        FROM integrations
        WHERE id = ?
      `, [id]);

      if (!integration) {
        throw createNotFoundError('Integration not found');
      }

      return {
        ...integration,
        configuration: integration.configuration ? JSON.parse(integration.configuration) : {}
      };
    } catch (error) {
      throw createDatabaseError('Failed to get integration', {
        originalError: error.message,
        integrationId: id
      });
    }
  }

  /**
   * Update integration
   * @param {number} id - Integration ID
   * @param {Object} updateData - Update data
   * @returns {Object} Updated integration
   */
  async updateIntegration(id, updateData) {
    try {
      const query = `
        UPDATE integrations SET
          name = COALESCE(?, name),
          type = COALESCE(?, type),
          status = COALESCE(?, status),
          configuration = COALESCE(?, configuration),
          updated_at = NOW()
        WHERE id = ?
      `;

      const params = [
        updateData.name,
        updateData.type,
        updateData.status,
        updateData.configuration ? JSON.stringify(updateData.configuration) : null,
        id
      ];

      const result = await executeQuery(query, params);

      if (result.affectedRows === 0) {
        throw createNotFoundError('Integration not found');
      }

      return await this.getIntegrationById(id);
    } catch (error) {
      throw createDatabaseError('Failed to update integration', {
        originalError: error.message,
        integrationId: id,
        updateData
      });
    }
  }

  /**
   * Delete integration
   * @param {number} id - Integration ID
   * @returns {boolean} Success status
   */
  async deleteIntegration(id) {
    try {
      const result = await executeQuery('DELETE FROM integrations WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        throw createNotFoundError('Integration not found');
      }

      return true;
    } catch (error) {
      throw createDatabaseError('Failed to delete integration', {
        originalError: error.message,
        integrationId: id
      });
    }
  }

  /**
   * Test integration connection
   * @param {number} id - Integration ID
   * @returns {Object} Test result
   */
  async testConnection(id) {
    try {
      const integration = await this.getIntegrationById(id);
      
      // Mock test result
      return {
        success: true,
        integration_id: id,
        integration_name: integration.name,
        test_timestamp: new Date().toISOString(),
        response_time: Math.floor(Math.random() * 1000) + 100, // Mock response time
        status: 'connected'
      };
    } catch (error) {
      throw createDatabaseError('Failed to test integration connection', {
        originalError: error.message,
        integrationId: id
      });
    }
  }

  /**
   * Get integration metrics
   * @returns {Object} Integration metrics
   */
  async getMetrics() {
    try {
      const metrics = await executeQuerySingle(`
        SELECT 
          COUNT(*) as total_integrations,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_integrations,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_integrations,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as error_integrations
        FROM integrations
      `);

      return {
        total: metrics.total_integrations || 0,
        active: metrics.active_integrations || 0,
        inactive: metrics.inactive_integrations || 0,
        errors: metrics.error_integrations || 0,
        health_score: metrics.total_integrations > 0 
          ? Math.round((metrics.active_integrations / metrics.total_integrations) * 100)
          : 100
      };
    } catch (error) {
      throw createDatabaseError('Failed to get integration metrics', {
        originalError: error.message
      });
    }
  }
}

module.exports = IntegrationManagementService;