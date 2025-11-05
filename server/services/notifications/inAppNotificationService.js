const db = require('../../config/db');

/**
 * In-App Notification Service for Appointment Alerts
 * Handles creation and management of in-app notifications
 */

/**
 * Create a notification for appointment scheduled
 */
const notifyAppointmentScheduled = async (userId, appointmentData) => {
  try {
    const { appointmentId, patientName, date, time, providerName } = appointmentData;
    
    // Check user preferences
    const [settings] = await db.query(
      'SELECT app_appointments FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    
    // If no settings exist, don't create notification
    if (settings.length === 0) {
      console.log(`User ${userId} has no notification settings - skipping in-app notification`);
      return null;
    }
    
    // If settings exist but app_appointments is disabled
    if (!settings[0].app_appointments) {
      console.log(`User ${userId} has disabled appointment notifications`);
      return null;
    }

    const metadata = {
      appointment_id: appointmentId,
      action_url: `/provider/appointments`,
      event_type: 'scheduled'
    };

    const [result] = await db.query(
      `INSERT INTO user_notifications 
       (user_id, notification_type, title, message, status, delivery_method, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'appointment_scheduled',
        'Appointment Scheduled',
        `New appointment scheduled with ${patientName} on ${date} at ${time}`,
        'sent',
        'in-app',
        JSON.stringify(metadata)
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error creating appointment scheduled notification:', error);
    throw error;
  }
};

/**
 * Create a notification for appointment rescheduled
 */
const notifyAppointmentRescheduled = async (userId, appointmentData) => {
  try {
    const { appointmentId, patientName, oldDate, oldTime, newDate, newTime } = appointmentData;
    
    // Check user preferences
    const [settings] = await db.query(
      'SELECT app_appointments FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    
    // If no settings exist, don't create notification
    if (settings.length === 0) {
      console.log(`User ${userId} has no notification settings - skipping in-app notification`);
      return null;
    }
    
    // If settings exist but app_appointments is disabled
    if (!settings[0].app_appointments) {
      console.log(`User ${userId} has disabled appointment notifications`);
      return null;
    }

    const metadata = {
      appointment_id: appointmentId,
      action_url: `/provider/appointments`,
      event_type: 'rescheduled',
      old_date: oldDate,
      old_time: oldTime,
      new_date: newDate,
      new_time: newTime
    };

    const [result] = await db.query(
      `INSERT INTO user_notifications 
       (user_id, notification_type, title, message, status, delivery_method, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'appointment_rescheduled',
        'Appointment Rescheduled',
        `Appointment with ${patientName} rescheduled from ${oldDate} ${oldTime} to ${newDate} ${newTime}`,
        'sent',
        'in-app',
        JSON.stringify(metadata)
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error creating appointment rescheduled notification:', error);
    throw error;
  }
};

/**
 * Create a notification for appointment cancelled
 */
const notifyAppointmentCancelled = async (userId, appointmentData) => {
  try {
    const { appointmentId, patientName, date, time, reason } = appointmentData;
    
    // Check user preferences
    const [settings] = await db.query(
      'SELECT app_appointments FROM user_notification_settings WHERE user_id = ?',
      [userId]
    );
    
    // If no settings exist, don't create notification
    if (settings.length === 0) {
      console.log(`User ${userId} has no notification settings - skipping in-app notification`);
      return null;
    }
    
    // If settings exist but app_appointments is disabled
    if (!settings[0].app_appointments) {
      console.log(`User ${userId} has disabled appointment notifications`);
      return null;
    }

    const metadata = {
      appointment_id: appointmentId,
      action_url: `/provider/appointments`,
      event_type: 'cancelled',
      cancellation_reason: reason
    };

    const message = reason 
      ? `Appointment with ${patientName} on ${date} at ${time} has been cancelled. Reason: ${reason}`
      : `Appointment with ${patientName} on ${date} at ${time} has been cancelled.`;

    const [result] = await db.query(
      `INSERT INTO user_notifications 
       (user_id, notification_type, title, message, status, delivery_method, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        'appointment_cancelled',
        'Appointment Cancelled',
        message,
        'sent',
        'in-app',
        JSON.stringify(metadata)
      ]
    );

    return result.insertId;
  } catch (error) {
    console.error('Error creating appointment cancelled notification:', error);
    throw error;
  }
};

/**
 * Get unread notifications for a user
 */
const getUnreadNotifications = async (userId) => {
  try {
    const [notifications] = await db.query(
      `SELECT id, notification_type, title, message, sent_at, metadata 
       FROM user_notifications 
       WHERE user_id = ? AND delivery_method = 'in-app' AND read_at IS NULL 
       ORDER BY sent_at DESC`,
      [userId]
    );

    return notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null
    }));
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

/**
 * Get all notifications for a user with pagination
 */
const getAllNotifications = async (userId, limit = 20, offset = 0, unreadOnly = false) => {
  try {
    let query = `
      SELECT id, notification_type, title, message, sent_at, read_at, metadata 
      FROM user_notifications 
      WHERE user_id = ? AND delivery_method = 'in-app'
    `;
    
    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';

    const [notifications] = await db.query(query, [userId, limit, offset]);

    return notifications.map(n => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null
    }));
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const [result] = await db.query(
      `UPDATE user_notifications 
       SET read_at = CURRENT_TIMESTAMP, status = 'read' 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
const markAllNotificationsAsRead = async (userId) => {
  try {
    const [result] = await db.query(
      `UPDATE user_notifications 
       SET read_at = CURRENT_TIMESTAMP, status = 'read' 
       WHERE user_id = ? AND delivery_method = 'in-app' AND read_at IS NULL`,
      [userId]
    );

    return result.affectedRows;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const [result] = await db.query(
      `DELETE FROM user_notifications 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Get notification count (total and unread)
 */
const getNotificationCount = async (userId) => {
  try {
    const [result] = await db.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread
       FROM user_notifications 
       WHERE user_id = ? AND delivery_method = 'in-app'`,
      [userId]
    );

    return {
      total: result[0].total || 0,
      unread: result[0].unread || 0
    };
  } catch (error) {
    console.error('Error getting notification count:', error);
    throw error;
  }
};

module.exports = {
  notifyAppointmentScheduled,
  notifyAppointmentRescheduled,
  notifyAppointmentCancelled,
  getUnreadNotifications,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationCount
};
