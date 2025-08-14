const connection = require('../../config/database');
const { validationResult } = require('express-validator');

// Get user notification settings
const getNotificationSettings = async (req, res) => {
  try {
    const { user_id } = req.user;

    const [settings] = await connection.query(`
      SELECT 
        email_notifications,
        sms_notifications,
        push_notifications,
        appointment_reminders,
        billing_alerts,
        system_updates,
        marketing_emails,
        security_alerts,
        reminder_frequency,
        quiet_hours_start,
        quiet_hours_end,
        notification_sound,
        created_at,
        updated_at
      FROM user_notification_settings 
      WHERE user_id = ?
    `, [user_id]);

    if (settings.length === 0) {
      // Create default settings if none exist
      const defaultSettings = {
        user_id,
        email_notifications: true,
        sms_notifications: false,
        push_notifications: true,
        appointment_reminders: true,
        billing_alerts: true,
        system_updates: true,
        marketing_emails: false,
        security_alerts: true,
        reminder_frequency: 24,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        notification_sound: 'default'
      };

      await connection.query(
        'INSERT INTO user_notification_settings SET ?',
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
    console.error('Error fetching notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification settings',
      error: error.message
    });
  }
};

// Update notification settings
const updateNotificationSettings = async (req, res) => {
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
      email_notifications,
      sms_notifications,
      push_notifications,
      appointment_reminders,
      billing_alerts,
      system_updates,
      marketing_emails,
      security_alerts,
      reminder_frequency,
      quiet_hours_start,
      quiet_hours_end,
      notification_sound
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.query(
      'SELECT id FROM user_notification_settings WHERE user_id = ?',
      [user_id]
    );

    const settingsData = {
      email_notifications: email_notifications ?? true,
      sms_notifications: sms_notifications ?? false,
      push_notifications: push_notifications ?? true,
      appointment_reminders: appointment_reminders ?? true,
      billing_alerts: billing_alerts ?? true,
      system_updates: system_updates ?? true,
      marketing_emails: marketing_emails ?? false,
      security_alerts: security_alerts ?? true,
      reminder_frequency: reminder_frequency ?? 24,
      quiet_hours_start: quiet_hours_start ?? '22:00',
      quiet_hours_end: quiet_hours_end ?? '08:00',
      notification_sound: notification_sound ?? 'default',
      updated_at: new Date()
    };

    if (existing.length > 0) {
      // Update existing settings
      await connection.query(
        'UPDATE user_notification_settings SET ? WHERE user_id = ?',
        [settingsData, user_id]
      );
    } else {
      // Create new settings
      settingsData.user_id = user_id;
      settingsData.created_at = new Date();
      
      await connection.query(
        'INSERT INTO user_notification_settings SET ?',
        [settingsData]
      );
    }

    // Log the change for audit
    await connection.query(`
      INSERT INTO settings_audit (
        user_id, setting_category, new_value, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      user_id,
      'notifications',
      JSON.stringify(settingsData),
      req.ip,
      req.get('User-Agent')
    ]);

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: settingsData
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
};

// Test notification delivery
const testNotification = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { type } = req.body; // email, sms, push

    // Get user contact info
    const [user] = await connection.query(`
      SELECT email, phone FROM users WHERE id = ?
    `, [user_id]);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const testMessage = {
      title: 'Test Notification',
      body: 'This is a test notification from OVHI Healthcare Management System.',
      timestamp: new Date()
    };

    // Here you would integrate with your notification service
    // For now, we'll just simulate the test
    let result = { delivered: true, method: type };

    switch (type) {
      case 'email':
        // Simulate email sending
        result.recipient = user[0].email;
        break;
      case 'sms':
        // Simulate SMS sending
        result.recipient = user[0].phone;
        break;
      case 'push':
        // Simulate push notification
        result.recipient = 'Browser/Mobile App';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid notification type'
        });
    }

    res.json({
      success: true,
      message: `Test ${type} notification sent successfully`,
      data: result
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
};

// Get notification history
const getNotificationHistory = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = ?';
    let queryParams = [user_id];

    if (type) {
      whereClause += ' AND notification_type = ?';
      queryParams.push(type);
    }

    const [notifications] = await connection.query(`
      SELECT 
        id,
        notification_type,
        title,
        message,
        status,
        sent_at,
        read_at,
        delivery_method
      FROM user_notifications 
      ${whereClause}
      ORDER BY sent_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    const [countResult] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM user_notifications 
      ${whereClause}
    `, queryParams);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history',
      error: error.message
    });
  }
};

// Mark notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { user_id } = req.user;
    const { notificationId } = req.params;

    await connection.query(`
      UPDATE user_notifications 
      SET read_at = NOW(), status = 'read'
      WHERE id = ? AND user_id = ?
    `, [notificationId, user_id]);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

module.exports = {
  getNotificationSettings,
  updateNotificationSettings,
  testNotification,
  getNotificationHistory,
  markNotificationRead
};