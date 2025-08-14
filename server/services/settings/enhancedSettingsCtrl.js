const connection = require("../../config/db");
const logAudit = require("../../utils/logAudit");

// Notification Settings
const updateNotificationSettings = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      emailNotifications,
      inAppNotifications,
      quietHours,
      notificationTypes
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_notification_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      user_id,
      email_appointments: emailNotifications?.appointments || false,
      email_lab_results: emailNotifications?.labResults || false,
      email_patient_registration: emailNotifications?.patientRegistration || false,
      email_messages: emailNotifications?.messages || false,
      app_appointments: inAppNotifications?.appointments || false,
      app_checkins: inAppNotifications?.checkins || false,
      app_lab_results: inAppNotifications?.labResults || false,
      app_prescriptions: inAppNotifications?.prescriptions || false,
      quiet_hours_enabled: quietHours?.enabled || false,
      quiet_hours_start: quietHours?.startTime || '22:00',
      quiet_hours_end: quietHours?.endTime || '07:00',
      updated_at: new Date()
    };

    if (existing.length > 0) {
      await connection.query(
        'UPDATE user_notification_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      await connection.query(
        'INSERT INTO user_notification_settings SET ?',
        [{ ...settingsData, created_at: new Date() }]
      );
    }

    await logAudit(req, 'UPDATE', 'NOTIFICATION_SETTINGS', user_id, 'Notification settings updated');

    res.json({
      success: true,
      message: 'Notification settings updated successfully'
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
};

const getNotificationSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(
      'SELECT * FROM user_notification_settings WHERE user_id = ?',
      [user_id]
    );

    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        data: {
          emailNotifications: {
            appointments: true,
            labResults: true,
            patientRegistration: true,
            messages: true
          },
          inAppNotifications: {
            appointments: true,
            checkins: true,
            labResults: true,
            prescriptions: true
          },
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '07:00'
          }
        }
      });
    }

    const setting = settings[0];
    res.json({
      success: true,
      data: {
        emailNotifications: {
          appointments: setting.email_appointments,
          labResults: setting.email_lab_results,
          patientRegistration: setting.email_patient_registration,
          messages: setting.email_messages
        },
        inAppNotifications: {
          appointments: setting.app_appointments,
          checkins: setting.app_checkins,
          labResults: setting.app_lab_results,
          prescriptions: setting.app_prescriptions
        },
        quietHours: {
          enabled: setting.quiet_hours_enabled,
          startTime: setting.quiet_hours_start,
          endTime: setting.quiet_hours_end
        }
      }
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification settings'
    });
  }
};

// Privacy Settings
const updatePrivacySettings = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      dataRetentionPeriod,
      shareDataForResearch,
      allowMarketingCommunications,
      auditLogRetention,
      hipaaCompliance,
      dataEncryption
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_privacy_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      user_id,
      data_retention_period: dataRetentionPeriod || 7, // years
      share_data_research: shareDataForResearch || false,
      marketing_communications: allowMarketingCommunications || false,
      audit_log_retention: auditLogRetention || 3, // years
      hipaa_compliance: hipaaCompliance || true,
      data_encryption: dataEncryption || true,
      updated_at: new Date()
    };

    if (existing.length > 0) {
      await connection.query(
        'UPDATE user_privacy_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      await connection.query(
        'INSERT INTO user_privacy_settings SET ?',
        [{ ...settingsData, created_at: new Date() }]
      );
    }

    await logAudit(req, 'UPDATE', 'PRIVACY_SETTINGS', user_id, 'Privacy settings updated');

    res.json({
      success: true,
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings'
    });
  }
};

const getPrivacySettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(
      'SELECT * FROM user_privacy_settings WHERE user_id = ?',
      [user_id]
    );

    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        data: {
          dataRetentionPeriod: 7,
          shareDataForResearch: false,
          allowMarketingCommunications: false,
          auditLogRetention: 3,
          hipaaCompliance: true,
          dataEncryption: true
        }
      });
    }

    const setting = settings[0];
    res.json({
      success: true,
      data: {
        dataRetentionPeriod: setting.data_retention_period,
        shareDataForResearch: setting.share_data_research,
        allowMarketingCommunications: setting.marketing_communications,
        auditLogRetention: setting.audit_log_retention,
        hipaaCompliance: setting.hipaa_compliance,
        dataEncryption: setting.data_encryption
      }
    });

  } catch (error) {
    console.error('Get privacy settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get privacy settings'
    });
  }
};

// Appearance Settings
const updateAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      theme,
      fontSize,
      language,
      dateFormat,
      timeFormat,
      density,
      colorScheme
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_appearance_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      user_id,
      theme: theme || 'light',
      font_size: fontSize || 'medium',
      language: language || 'en',
      date_format: dateFormat || 'MM/DD/YYYY',
      time_format: timeFormat || '12h',
      density: density || 'comfortable',
      color_scheme: colorScheme || 'blue',
      updated_at: new Date()
    };

    if (existing.length > 0) {
      await connection.query(
        'UPDATE user_appearance_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      await connection.query(
        'INSERT INTO user_appearance_settings SET ?',
        [{ ...settingsData, created_at: new Date() }]
      );
    }

    await logAudit(req, 'UPDATE', 'APPEARANCE_SETTINGS', user_id, 'Appearance settings updated');

    res.json({
      success: true,
      message: 'Appearance settings updated successfully'
    });

  } catch (error) {
    console.error('Update appearance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update appearance settings'
    });
  }
};

const getAppearanceSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(
      'SELECT * FROM user_appearance_settings WHERE user_id = ?',
      [user_id]
    );

    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        data: {
          theme: 'light',
          fontSize: 'medium',
          language: 'en',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          density: 'comfortable',
          colorScheme: 'blue'
        }
      });
    }

    const setting = settings[0];
    res.json({
      success: true,
      data: {
        theme: setting.theme,
        fontSize: setting.font_size,
        language: setting.language,
        dateFormat: setting.date_format,
        timeFormat: setting.time_format,
        density: setting.density,
        colorScheme: setting.color_scheme
      }
    });

  } catch (error) {
    console.error('Get appearance settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get appearance settings'
    });
  }
};

// Security Settings
const updateSecuritySettings = async (req, res) => {
  try {
    const { user_id } = req.user;
    const {
      twoFactorEnabled,
      sessionTimeout,
      maxConcurrentSessions,
      passwordExpiry,
      loginNotifications
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_security_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      user_id,
      two_factor_enabled: twoFactorEnabled || false,
      session_timeout: sessionTimeout || 30, // minutes
      max_concurrent_sessions: maxConcurrentSessions || 3,
      password_expiry_days: passwordExpiry || 90,
      login_notifications: loginNotifications || true,
      updated_at: new Date()
    };

    if (existing.length > 0) {
      await connection.query(
        'UPDATE user_security_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      await connection.query(
        'INSERT INTO user_security_settings SET ?',
        [{ ...settingsData, created_at: new Date() }]
      );
    }

    await logAudit(req, 'UPDATE', 'SECURITY_SETTINGS', user_id, 'Security settings updated');

    res.json({
      success: true,
      message: 'Security settings updated successfully'
    });

  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update security settings'
    });
  }
};

const getSecuritySettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(
      'SELECT * FROM user_security_settings WHERE user_id = ?',
      [user_id]
    );

    if (settings.length === 0) {
      // Return default settings
      return res.json({
        success: true,
        data: {
          twoFactorEnabled: false,
          sessionTimeout: 30,
          maxConcurrentSessions: 3,
          passwordExpiry: 90,
          loginNotifications: true
        }
      });
    }

    const setting = settings[0];
    res.json({
      success: true,
      data: {
        twoFactorEnabled: setting.two_factor_enabled,
        sessionTimeout: setting.session_timeout,
        maxConcurrentSessions: setting.max_concurrent_sessions,
        passwordExpiry: setting.password_expiry_days,
        loginNotifications: setting.login_notifications
      }
    });

  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get security settings'
    });
  }
};

// Settings Export/Import
const exportSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    // Get all user settings
    const [notifications] = await connection.query(
      'SELECT * FROM user_notification_settings WHERE user_id = ?',
      [user_id]
    );
    const [privacy] = await connection.query(
      'SELECT * FROM user_privacy_settings WHERE user_id = ?',
      [user_id]
    );
    const [appearance] = await connection.query(
      'SELECT * FROM user_appearance_settings WHERE user_id = ?',
      [user_id]
    );
    const [security] = await connection.query(
      'SELECT * FROM user_security_settings WHERE user_id = ?',
      [user_id]
    );

    const exportData = {
      exportDate: new Date().toISOString(),
      userId: user_id,
      settings: {
        notifications: notifications[0] || null,
        privacy: privacy[0] || null,
        appearance: appearance[0] || null,
        security: security[0] || null
      }
    };

    res.json({
      success: true,
      data: exportData
    });

  } catch (error) {
    console.error('Export settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export settings'
    });
  }
};

module.exports = {
  updateNotificationSettings,
  getNotificationSettings,
  updatePrivacySettings,
  getPrivacySettings,
  updateAppearanceSettings,
  getAppearanceSettings,
  updateSecuritySettings,
  getSecuritySettings,
  exportSettings
};