const connection = require('../../config/database');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

// Get all integrations for a user
const getIntegrations = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [integrations] = await connection.query(`
      SELECT 
        id,
        integration_type,
        integration_name,
        status,
        configuration,
        last_sync,
        sync_frequency,
        error_count,
        last_error,
        created_at,
        updated_at
      FROM user_integrations 
      WHERE user_id = ?
      ORDER BY integration_type, integration_name
    `, [user_id]);

    // Mask sensitive configuration data
    const maskedIntegrations = integrations.map(integration => ({
      ...integration,
      configuration: integration.configuration ? 
        JSON.parse(integration.configuration) : {},
      // Mask API keys and secrets
      configuration_masked: integration.configuration ? 
        maskSensitiveData(JSON.parse(integration.configuration)) : {}
    }));

    res.json({
      success: true,
      data: maskedIntegrations
    });

  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integrations',
      error: error.message
    });
  }
};

// Create or update integration
const saveIntegration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id } = req.user;
    const {
      integration_type,
      integration_name,
      configuration,
      sync_frequency = 'daily',
      auto_sync = true
    } = req.body;

    // Encrypt sensitive configuration data
    const encryptedConfig = encryptSensitiveData(configuration);

    // Check if integration already exists
    const [existing] = await connection.query(`
      SELECT id FROM user_integrations 
      WHERE user_id = ? AND integration_type = ? AND integration_name = ?
    `, [user_id, integration_type, integration_name]);

    let integrationId;

    if (existing.length > 0) {
      // Update existing integration
      await connection.query(`
        UPDATE user_integrations 
        SET configuration = ?, sync_frequency = ?, auto_sync = ?, updated_at = NOW()
        WHERE id = ?
      `, [JSON.stringify(encryptedConfig), sync_frequency, auto_sync, existing[0].id]);
      
      integrationId = existing[0].id;
    } else {
      // Create new integration
      const [result] = await connection.query(`
        INSERT INTO user_integrations (
          user_id, integration_type, integration_name, configuration, 
          sync_frequency, auto_sync, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())
      `, [
        user_id, integration_type, integration_name, 
        JSON.stringify(encryptedConfig), sync_frequency, auto_sync
      ]);
      
      integrationId = result.insertId;
    }

    // Test the integration connection
    const testResult = await testIntegrationConnection(integration_type, configuration);
    
    // Update status based on test result
    await connection.query(`
      UPDATE user_integrations 
      SET status = ?, last_error = ?, error_count = ?
      WHERE id = ?
    `, [
      testResult.success ? 'active' : 'error',
      testResult.success ? null : testResult.error,
      testResult.success ? 0 : 1,
      integrationId
    ]);

    // Log the integration change
    await connection.query(`
      INSERT INTO integration_audit_log (
        user_id, integration_id, action, details, created_at
      ) VALUES (?, ?, ?, ?, NOW())
    `, [
      user_id, integrationId, existing.length > 0 ? 'updated' : 'created',
      JSON.stringify({ integration_type, integration_name, test_result: testResult })
    ]);

    res.json({
      success: true,
      message: `Integration ${existing.length > 0 ? 'updated' : 'created'} successfully`,
      data: {
        integration_id: integrationId,
        status: testResult.success ? 'active' : 'error',
        test_result: testResult
      }
    });

  } catch (error) {
    console.error('Error saving integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save integration',
      error: error.message
    });
  }
};

// Test integration connection
const testIntegration = async (req, res) => {
  try {
    const { integration_id } = req.params;
    const { user_id } = req.user;

    // Get integration details
    const [integration] = await connection.query(`
      SELECT integration_type, configuration 
      FROM user_integrations 
      WHERE id = ? AND user_id = ?
    `, [integration_id, user_id]);

    if (integration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    const config = JSON.parse(integration[0].configuration);
    const decryptedConfig = decryptSensitiveData(config);

    // Test the connection
    const testResult = await testIntegrationConnection(
      integration[0].integration_type, 
      decryptedConfig
    );

    // Update integration status
    await connection.query(`
      UPDATE user_integrations 
      SET status = ?, last_error = ?, error_count = CASE WHEN ? THEN 0 ELSE error_count + 1 END
      WHERE id = ?
    `, [
      testResult.success ? 'active' : 'error',
      testResult.success ? null : testResult.error,
      testResult.success,
      integration_id
    ]);

    // Log the test
    await connection.query(`
      INSERT INTO integration_audit_log (
        user_id, integration_id, action, details, created_at
      ) VALUES (?, ?, 'tested', ?, NOW())
    `, [user_id, integration_id, JSON.stringify(testResult)]);

    res.json({
      success: true,
      data: testResult
    });

  } catch (error) {
    console.error('Error testing integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test integration',
      error: error.message
    });
  }
};

// Sync integration data
const syncIntegration = async (req, res) => {
  try {
    const { integration_id } = req.params;
    const { user_id } = req.user;
    const { force_sync = false } = req.body;

    // Get integration details
    const [integration] = await connection.query(`
      SELECT * FROM user_integrations 
      WHERE id = ? AND user_id = ?
    `, [integration_id, user_id]);

    if (integration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    const integrationData = integration[0];
    
    // Check if sync is needed (based on frequency and last sync)
    if (!force_sync && integrationData.last_sync) {
      const lastSync = new Date(integrationData.last_sync);
      const now = new Date();
      const hoursSinceSync = (now - lastSync) / (1000 * 60 * 60);
      
      const syncIntervals = {
        'hourly': 1,
        'daily': 24,
        'weekly': 168,
        'monthly': 720
      };
      
      const requiredInterval = syncIntervals[integrationData.sync_frequency] || 24;
      
      if (hoursSinceSync < requiredInterval) {
        return res.json({
          success: true,
          message: 'Sync not needed yet',
          data: {
            last_sync: integrationData.last_sync,
            next_sync: new Date(lastSync.getTime() + requiredInterval * 60 * 60 * 1000)
          }
        });
      }
    }

    // Perform the sync
    const config = JSON.parse(integrationData.configuration);
    const decryptedConfig = decryptSensitiveData(config);
    
    const syncResult = await performIntegrationSync(
      integrationData.integration_type,
      decryptedConfig,
      user_id
    );

    // Update sync status
    await connection.query(`
      UPDATE user_integrations 
      SET last_sync = NOW(), sync_status = ?, last_error = ?
      WHERE id = ?
    `, [
      syncResult.success ? 'completed' : 'failed',
      syncResult.success ? null : syncResult.error,
      integration_id
    ]);

    // Log the sync
    await connection.query(`
      INSERT INTO integration_audit_log (
        user_id, integration_id, action, details, created_at
      ) VALUES (?, ?, 'synced', ?, NOW())
    `, [user_id, integration_id, JSON.stringify(syncResult)]);

    res.json({
      success: true,
      message: syncResult.success ? 'Sync completed successfully' : 'Sync failed',
      data: syncResult
    });

  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync integration',
      error: error.message
    });
  }
};

// Delete integration
const deleteIntegration = async (req, res) => {
  try {
    const { integration_id } = req.params;
    const { user_id } = req.user;

    // Check if integration exists
    const [integration] = await connection.query(`
      SELECT integration_type, integration_name 
      FROM user_integrations 
      WHERE id = ? AND user_id = ?
    `, [integration_id, user_id]);

    if (integration.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found'
      });
    }

    // Delete the integration
    await connection.query(`
      DELETE FROM user_integrations WHERE id = ? AND user_id = ?
    `, [integration_id, user_id]);

    // Log the deletion
    await connection.query(`
      INSERT INTO integration_audit_log (
        user_id, integration_id, action, details, created_at
      ) VALUES (?, ?, 'deleted', ?, NOW())
    `, [
      user_id, integration_id, 
      JSON.stringify({ 
        integration_type: integration[0].integration_type,
        integration_name: integration[0].integration_name
      })
    ]);

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete integration',
      error: error.message
    });
  }
};

// Get integration audit log
const getIntegrationAuditLog = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { integration_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    let queryParams = [user_id];

    if (integration_id) {
      whereClause += ' AND integration_id = ?';
      queryParams.push(integration_id);
    }

    const [auditLog] = await connection.query(`
      SELECT 
        ial.*,
        ui.integration_type,
        ui.integration_name
      FROM integration_audit_log ial
      LEFT JOIN user_integrations ui ON ial.integration_id = ui.id
      ${whereClause}
      ORDER BY ial.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM integration_audit_log 
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        audit_log: auditLog,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching integration audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration audit log',
      error: error.message
    });
  }
};

// Get available integration types
const getIntegrationTypes = async (req, res) => {
  try {
    const integrationTypes = {
      'ehr': {
        name: 'Electronic Health Records',
        description: 'Connect with EHR systems like Epic, Cerner, Allscripts',
        supported_systems: ['Epic', 'Cerner', 'Allscripts', 'eClinicalWorks', 'NextGen'],
        required_fields: ['api_endpoint', 'client_id', 'client_secret', 'username'],
        optional_fields: ['environment', 'version']
      },
      'lab': {
        name: 'Laboratory Systems',
        description: 'Integrate with lab systems for results and orders',
        supported_systems: ['LabCorp', 'Quest', 'BioReference', 'ARUP'],
        required_fields: ['api_key', 'facility_id', 'username'],
        optional_fields: ['test_mode', 'result_format']
      },
      'pharmacy': {
        name: 'Pharmacy Systems',
        description: 'Connect with pharmacy networks for e-prescribing',
        supported_systems: ['Surescripts', 'CVS', 'Walgreens', 'RxNT'],
        required_fields: ['api_key', 'provider_npi', 'dea_number'],
        optional_fields: ['test_mode', 'preferred_pharmacy']
      },
      'imaging': {
        name: 'Medical Imaging',
        description: 'Integrate with PACS and imaging centers',
        supported_systems: ['PACS', 'Radiology Partners', 'SimonMed'],
        required_fields: ['dicom_endpoint', 'ae_title', 'username', 'password'],
        optional_fields: ['port', 'encryption']
      },
      'billing': {
        name: 'Billing & Claims',
        description: 'Connect with clearinghouses and billing systems',
        supported_systems: ['ClaimMD', 'Availity', 'Trizetto', 'RelayHealth'],
        required_fields: ['api_key', 'submitter_id', 'username'],
        optional_fields: ['test_mode', 'batch_size']
      },
      'telehealth': {
        name: 'Telehealth Platforms',
        description: 'Integrate with video conferencing and telehealth',
        supported_systems: ['Zoom Healthcare', 'Doxy.me', 'SimplePractice', 'Teladoc'],
        required_fields: ['api_key', 'account_id'],
        optional_fields: ['webhook_url', 'recording_enabled']
      }
    };

    res.json({
      success: true,
      data: integrationTypes
    });

  } catch (error) {
    console.error('Error fetching integration types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch integration types',
      error: error.message
    });
  }
};

// Helper functions
const maskSensitiveData = (config) => {
  const masked = { ...config };
  const sensitiveFields = ['api_key', 'client_secret', 'password', 'token', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (masked[field]) {
      masked[field] = '***' + masked[field].slice(-4);
    }
  });
  
  return masked;
};

const encryptSensitiveData = (config) => {
  const encrypted = { ...config };
  const sensitiveFields = ['api_key', 'client_secret', 'password', 'token', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (encrypted[field]) {
      const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
      let encryptedValue = cipher.update(encrypted[field], 'utf8', 'hex');
      encryptedValue += cipher.final('hex');
      encrypted[field] = encryptedValue;
    }
  });
  
  return encrypted;
};

const decryptSensitiveData = (config) => {
  const decrypted = { ...config };
  const sensitiveFields = ['api_key', 'client_secret', 'password', 'token', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (decrypted[field]) {
      try {
        const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY || 'default-key');
        let decryptedValue = decipher.update(decrypted[field], 'hex', 'utf8');
        decryptedValue += decipher.final('utf8');
        decrypted[field] = decryptedValue;
      } catch (error) {
        console.error('Decryption error for field:', field);
      }
    }
  });
  
  return decrypted;
};

const testIntegrationConnection = async (type, config) => {
  // Simulate integration testing - in real implementation, this would make actual API calls
  try {
    switch (type) {
      case 'ehr':
        // Test EHR connection
        if (!config.api_endpoint || !config.client_id) {
          return { success: false, error: 'Missing required EHR configuration' };
        }
        break;
      
      case 'lab':
        // Test lab connection
        if (!config.api_key || !config.facility_id) {
          return { success: false, error: 'Missing required lab configuration' };
        }
        break;
      
      case 'pharmacy':
        // Test pharmacy connection
        if (!config.api_key || !config.provider_npi) {
          return { success: false, error: 'Missing required pharmacy configuration' };
        }
        break;
      
      default:
        return { success: false, error: 'Unsupported integration type' };
    }
    
    // Simulate successful connection
    return { 
      success: true, 
      message: 'Connection test successful',
      tested_at: new Date()
    };
    
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
};

const performIntegrationSync = async (type, config, userId) => {
  // Simulate data synchronization - in real implementation, this would sync actual data
  try {
    const syncResults = {
      records_processed: Math.floor(Math.random() * 100) + 1,
      records_updated: Math.floor(Math.random() * 50),
      records_created: Math.floor(Math.random() * 25),
      errors: Math.floor(Math.random() * 3)
    };
    
    return {
      success: true,
      message: 'Sync completed successfully',
      data: syncResults,
      synced_at: new Date()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  getIntegrations,
  saveIntegration,
  testIntegration,
  syncIntegration,
  deleteIntegration,
  getIntegrationAuditLog,
  getIntegrationTypes
};