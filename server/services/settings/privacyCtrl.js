const connection = require('../../config/db');
const { validationResult } = require('express-validator');

// Get user privacy settings
const getPrivacySettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(`
      SELECT 
        data_sharing_consent,
        analytics_tracking,
        marketing_consent,
        third_party_sharing,
        data_retention_period,
        auto_delete_inactive,
        export_data_format,
        delete_account_request,
        audit_log_retention,
        session_timeout,
        two_factor_enabled,
        login_notifications,
        data_encryption_level,
        backup_frequency,
        gdpr_compliance,
        hipaa_compliance,
        created_at,
        updated_at
      FROM user_privacy_settings 
      WHERE user_id = ?
    `, [user_id]);

    if (settings.length === 0) {
      // Create default privacy settings
      const defaultSettings = {
        user_id,
        data_sharing_consent: false,
        analytics_tracking: false,
        marketing_consent: false,
        third_party_sharing: false,
        data_retention_period: 2555, // 7 years in days (HIPAA requirement)
        auto_delete_inactive: false,
        export_data_format: 'json',
        delete_account_request: false,
        audit_log_retention: 2555, // 7 years
        session_timeout: 30, // 30 minutes
        two_factor_enabled: false,
        login_notifications: true,
        data_encryption_level: 'aes256',
        backup_frequency: 'daily',
        gdpr_compliance: true,
        hipaa_compliance: true
      };

      await connection.query(
        'INSERT INTO user_privacy_settings SET ?',
        [defaultSettings]
      );

      return res.json({
        success: true,
        data: defaultSettings
      });
    }

    res.json({
      success: true,
      data: settings[0]
    });

  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch privacy settings',
      error: error.message
    });
  }
};

// Update privacy settings
const updatePrivacySettings = async (req, res) => {
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
      data_sharing_consent,
      analytics_tracking,
      marketing_consent,
      third_party_sharing,
      data_retention_period,
      auto_delete_inactive,
      export_data_format,
      audit_log_retention,
      session_timeout,
      two_factor_enabled,
      login_notifications,
      data_encryption_level,
      backup_frequency
    } = req.body;

    // Validate HIPAA compliance requirements
    if (data_retention_period < 2555) { // Less than 7 years
      return res.status(400).json({
        success: false,
        message: 'Data retention period must be at least 7 years for HIPAA compliance'
      });
    }

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_privacy_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      data_sharing_consent: data_sharing_consent ?? false,
      analytics_tracking: analytics_tracking ?? false,
      marketing_consent: marketing_consent ?? false,
      third_party_sharing: third_party_sharing ?? false,
      data_retention_period: data_retention_period ?? 2555,
      auto_delete_inactive: auto_delete_inactive ?? false,
      export_data_format: export_data_format ?? 'json',
      audit_log_retention: audit_log_retention ?? 2555,
      session_timeout: session_timeout ?? 30,
      two_factor_enabled: two_factor_enabled ?? false,
      login_notifications: login_notifications ?? true,
      data_encryption_level: data_encryption_level ?? 'aes256',
      backup_frequency: backup_frequency ?? 'daily',
      updated_at: new Date()
    };

    if (existing.length > 0) {
      // Update existing settings
      await connection.query(
        'UPDATE user_privacy_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      // Create new settings
      settingsData.user_id = user_id;
      settingsData.created_at = new Date();
      settingsData.gdpr_compliance = true;
      settingsData.hipaa_compliance = true;
      
      await connection.query(
        'INSERT INTO user_privacy_settings SET ?',
        [settingsData]
      );
    }

    // Log the change for audit (required for HIPAA)
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'privacy',
      JSON.stringify(settingsData),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: settingsData
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings',
      error: error.message
    });
  }
};

// Request data export (GDPR Right to Data Portability)
const requestDataExport = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { format = 'json' } = req.body;

    // Check if there's already a pending request
    const [pendingRequest] = await connection.query(`
      SELECT id FROM data_export_requests 
      WHERE user_id = ? AND status = 'pending'
    `, [user_id]);

    if (pendingRequest.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data export request already pending'
      });
    }

    // Create export request
    const requestData = {
      user_id,
      export_format: format,
      status: 'pending',
      requested_at: new Date(),
      estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    const [result] = await connection.query(
      'INSERT INTO data_export_requests SET ?',
      [requestData]
    );

    // Log the request
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'data_export',
      JSON.stringify({ request_id: result.insertId, format }),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Data export request submitted successfully',
      data: {
        request_id: result.insertId,
        estimated_completion: requestData.estimated_completion
      }
    });

  } catch (error) {
    console.error('Error requesting data export:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request data export',
      error: error.message
    });
  }
};

// Request account deletion (GDPR Right to be Forgotten)
const requestAccountDeletion = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { reason, confirmation } = req.body;

    if (!confirmation || confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Account deletion confirmation required'
      });
    }

    // Check if user has active appointments or pending bills
    const [activeData] = await connection.query(`
      SELECT 
        (SELECT COUNT(*) FROM appointments WHERE patient_id = ? AND appointment_date > NOW()) as future_appointments,
        (SELECT COUNT(*) FROM cpt_billing WHERE patient_id = ? AND status IN (0, 1)) as pending_bills
    `, [user_id, user_id]);

    if (activeData[0].future_appointments > 0 || activeData[0].pending_bills > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete account with active appointments or pending bills',
        data: {
          future_appointments: activeData[0].future_appointments,
          pending_bills: activeData[0].pending_bills
        }
      });
    }

    // Create deletion request
    const deletionData = {
      user_id,
      reason: reason || 'User requested',
      status: 'pending',
      requested_at: new Date(),
      scheduled_deletion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days grace period
    };

    const [result] = await connection.query(
      'INSERT INTO account_deletion_requests SET ?',
      [deletionData]
    );

    // Mark privacy settings to indicate deletion request
    await connection.query(
      'UPDATE user_privacy_settings SET delete_account_request = true WHERE user_id = ?',
      [user_id]
    );

    // Log the request
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'account_deletion',
      JSON.stringify({ request_id: result.insertId, reason }),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Account deletion request submitted. You have 30 days to cancel this request.',
      data: {
        request_id: result.insertId,
        scheduled_deletion: deletionData.scheduled_deletion
      }
    });

  } catch (error) {
    console.error('Error requesting account deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request account deletion',
      error: error.message
    });
  }
};

// Get privacy audit log
const getPrivacyAuditLog = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 20, category } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ? AND setting_category IN (?, ?, ?)';
    let queryParams = [user_id, 'privacy', 'data_export', 'account_deletion'];

    if (category) {
      whereClause = 'WHERE user_id = ? AND setting_category = ?';
      queryParams = [user_id, category];
    }

    const [auditLog] = await connection.query(`
      SELECT 
        id,
        setting_category,
        old_value,
        new_value,
        changed_at,
        ip_address
      FROM settings_audit 
      ${whereClause}
      ORDER BY changed_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM settings_audit 
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
    console.error('Error fetching privacy audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch privacy audit log',
      error: error.message
    });
  }
};

// Get compliance status
const getComplianceStatus = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(`
      SELECT 
        gdpr_compliance,
        hipaa_compliance,
        data_retention_period,
        audit_log_retention,
        data_encryption_level,
        backup_frequency
      FROM user_privacy_settings 
      WHERE user_id = ?
    `, [user_id]);

    if (settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Privacy settings not found'
      });
    }

    const compliance = settings[0];
    
    // Check compliance status
    const complianceStatus = {
      gdpr: {
        compliant: compliance.gdpr_compliance,
        requirements: {
          data_retention: compliance.data_retention_period >= 2555,
          audit_logging: compliance.audit_log_retention >= 2555,
          encryption: compliance.data_encryption_level === 'aes256'
        }
      },
      hipaa: {
        compliant: compliance.hipaa_compliance,
        requirements: {
          data_retention: compliance.data_retention_period >= 2555,
          audit_logging: compliance.audit_log_retention >= 2555,
          encryption: compliance.data_encryption_level === 'aes256',
          backup_frequency: ['daily', 'weekly'].includes(compliance.backup_frequency)
        }
      }
    };

    res.json({
      success: true,
      data: complianceStatus
    });

  } catch (error) {
    console.error('Error fetching compliance status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch compliance status',
      error: error.message
    });
  }
};

module.exports = {
  getPrivacySettings,
  updatePrivacySettings,
  requestDataExport,
  requestAccountDeletion,
  getPrivacyAuditLog,
  getComplianceStatus
};