const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class MobileAppService {
  /**
   * Register mobile device for push notifications
   */
  async registerMobileDevice(userId, deviceData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO mobile_devices (
          user_id, device_token, device_type, device_model,
          os_version, app_version, timezone, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE
          device_token = VALUES(device_token),
          device_model = VALUES(device_model),
          os_version = VALUES(os_version),
          app_version = VALUES(app_version),
          timezone = VALUES(timezone),
          last_active = NOW(),
          is_active = TRUE
      `, [
        userId,
        deviceData.device_token,
        deviceData.device_type, // 'ios' or 'android'
        deviceData.device_model,
        deviceData.os_version,
        deviceData.app_version,
        deviceData.timezone || 'UTC'
      ]);
      
      return { success: true, device_id: result.insertId };
    } catch (error) {
      console.error('Error registering mobile device:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generate mobile session token for secure video calls
   */
  async generateMobileSessionToken(userId, sessionId) {
    try {
      const payload = {
        user_id: userId,
        session_id: sessionId,
        type: 'mobile_telehealth',
        issued_at: Date.now(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };
      
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
        expiresIn: '24h'
      });
      
      // Store token in database for validation
      let connection = await pool.getConnection();
      await connection.query(`
        INSERT INTO mobile_session_tokens (
          user_id, session_id, token_hash, expires_at
        ) VALUES (?, ?, ?, ?)
      `, [
        userId, 
        sessionId, 
        this.hashToken(token), 
        new Date(payload.expires_at)
      ]);
      connection.release();
      
      return { success: true, token };
    } catch (error) {
      console.error('Error generating mobile session token:', error);
      throw error;
    }
  }

  /**
   * Get mobile-optimized session data
   */
  async getMobileSessionData(sessionId, userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [sessions] = await connection.query(`
        SELECT 
          ts.session_id,
          ts.session_type,
          ts.session_status,
          ts.scheduled_start_time,
          ts.actual_start_time,
          ts.duration_minutes,
          ts.chief_complaint,
          ts.ringcentral_join_url,
          ts.ringcentral_meeting_id,
          
          -- Patient/Provider Info (depending on user role)
          CASE 
            WHEN ts.patient_id = ? THEN CONCAT(pr.firstname, ' ', pr.lastname)
            ELSE CONCAT(p.firstname, ' ', p.lastname)
          END as other_party_name,
          
          CASE 
            WHEN ts.patient_id = ? THEN pr.work_email
            ELSE p.work_email
          END as other_party_email,
          
          -- Mobile-specific settings
          md.device_type,
          md.device_model,
          md.os_version,
          md.app_version
          
        FROM telehealth_sessions ts
        LEFT JOIN user_profiles p ON ts.patient_id = p.fk_userid
        LEFT JOIN user_profiles pr ON ts.provider_id = pr.fk_userid
        LEFT JOIN mobile_devices md ON md.user_id = ? AND md.is_active = TRUE
        WHERE ts.session_id = ? 
        AND (ts.patient_id = ? OR ts.provider_id = ?)
      `, [userId, userId, userId, sessionId, userId, userId]);
      
      if (sessions.length === 0) {
        throw new Error('Session not found or access denied');
      }
      
      const session = sessions[0];
      
      // Add mobile-specific optimizations
      session.mobile_optimized = true;
      session.supports_background_mode = session.device_type === 'ios';
      session.supports_picture_in_picture = session.os_version >= (session.device_type === 'ios' ? '14.0' : '8.0');
      
      return session;
    } catch (error) {
      console.error('Error getting mobile session data:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Send push notification for telehealth events
   */
  async sendTelehealthNotification(userId, notificationData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Get user's active devices
      const [devices] = await connection.query(`
        SELECT device_token, device_type, notification_preferences
        FROM mobile_devices 
        WHERE user_id = ? AND is_active = TRUE
      `, [userId]);
      
      const notifications = [];
      
      for (const device of devices) {
        const notification = await this.createPushNotification(device, notificationData);
        notifications.push(notification);
        
        // Log notification
        await connection.query(`
          INSERT INTO mobile_notifications (
            user_id, device_token, notification_type, title, body,
            data_payload, sent_at, status
          ) VALUES (?, ?, ?, ?, ?, ?, NOW(), 'sent')
        `, [
          userId,
          device.device_token,
          notificationData.type,
          notificationData.title,
          notificationData.body,
          JSON.stringify(notificationData.data || {})
        ]);
      }
      
      return { success: true, notifications_sent: notifications.length };
    } catch (error) {
      console.error('Error sending telehealth notification:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Create platform-specific push notification
   */
  async createPushNotification(device, notificationData) {
    const baseNotification = {
      title: notificationData.title,
      body: notificationData.body,
      data: {
        type: notificationData.type,
        session_id: notificationData.session_id,
        action_url: notificationData.action_url,
        ...notificationData.data
      }
    };
    
    if (device.device_type === 'ios') {
      return {
        ...baseNotification,
        aps: {
          alert: {
            title: notificationData.title,
            body: notificationData.body
          },
          badge: 1,
          sound: 'default',
          'content-available': 1,
          category: 'TELEHEALTH_SESSION'
        }
      };
    } else if (device.device_type === 'android') {
      return {
        ...baseNotification,
        android: {
          priority: 'high',
          notification: {
            channel_id: 'telehealth_sessions',
            icon: 'ic_telehealth',
            color: '#007bff',
            sound: 'default',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        }
      };
    }
    
    return baseNotification;
  }

  /**
   * Handle mobile app session events
   */
  async handleMobileSessionEvent(userId, sessionId, eventType, eventData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Log the event
      await connection.query(`
        INSERT INTO mobile_session_events (
          user_id, session_id, event_type, event_data, device_info, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        userId,
        sessionId,
        eventType,
        JSON.stringify(eventData),
        JSON.stringify(eventData.device_info || {})
      ]);
      
      // Handle specific events
      switch (eventType) {
        case 'app_backgrounded':
          await this.handleAppBackgrounded(userId, sessionId, eventData);
          break;
        case 'app_foregrounded':
          await this.handleAppForegrounded(userId, sessionId, eventData);
          break;
        case 'connection_quality_changed':
          await this.handleConnectionQualityChanged(userId, sessionId, eventData);
          break;
        case 'battery_low':
          await this.handleLowBattery(userId, sessionId, eventData);
          break;
        case 'network_changed':
          await this.handleNetworkChanged(userId, sessionId, eventData);
          break;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error handling mobile session event:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get mobile app configuration
   */
  async getMobileAppConfig(userId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [configs] = await connection.query(`
        SELECT 
          mac.*,
          up.firstname,
          up.lastname,
          up.work_email
        FROM mobile_app_config mac
        LEFT JOIN user_profiles up ON mac.user_id = up.fk_userid
        WHERE mac.user_id = ?
      `, [userId]);
      
      const defaultConfig = {
        user_id: userId,
        video_quality: 'auto',
        audio_quality: 'high',
        auto_mute_on_join: false,
        background_mode_enabled: true,
        push_notifications_enabled: true,
        biometric_auth_enabled: false,
        data_saver_mode: false,
        theme: 'system'
      };
      
      return configs[0] || defaultConfig;
    } catch (error) {
      console.error('Error getting mobile app config:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update mobile app configuration
   */
  async updateMobileAppConfig(userId, configData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO mobile_app_config (
          user_id, video_quality, audio_quality, auto_mute_on_join,
          background_mode_enabled, push_notifications_enabled,
          biometric_auth_enabled, data_saver_mode, theme
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          video_quality = VALUES(video_quality),
          audio_quality = VALUES(audio_quality),
          auto_mute_on_join = VALUES(auto_mute_on_join),
          background_mode_enabled = VALUES(background_mode_enabled),
          push_notifications_enabled = VALUES(push_notifications_enabled),
          biometric_auth_enabled = VALUES(biometric_auth_enabled),
          data_saver_mode = VALUES(data_saver_mode),
          theme = VALUES(theme),
          updated_at = NOW()
      `, [
        userId,
        configData.video_quality || 'auto',
        configData.audio_quality || 'high',
        configData.auto_mute_on_join || false,
        configData.background_mode_enabled !== false,
        configData.push_notifications_enabled !== false,
        configData.biometric_auth_enabled || false,
        configData.data_saver_mode || false,
        configData.theme || 'system'
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating mobile app config:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Handle app backgrounded event
   */
  async handleAppBackgrounded(userId, sessionId, eventData) {
    // Notify other participants that user is in background mode
    await this.sendTelehealthNotification(userId, {
      type: 'session_background_mode',
      title: 'Background Mode',
      body: 'You are now in background mode during the telehealth session',
      session_id: sessionId
    });
  }

  /**
   * Handle app foregrounded event
   */
  async handleAppForegrounded(userId, sessionId, eventData) {
    // Update session status and notify if needed
    console.log(`User ${userId} returned to foreground in session ${sessionId}`);
  }

  /**
   * Handle connection quality changes
   */
  async handleConnectionQualityChanged(userId, sessionId, eventData) {
    if (eventData.quality === 'poor') {
      await this.sendTelehealthNotification(userId, {
        type: 'connection_quality_warning',
        title: 'Connection Quality',
        body: 'Your connection quality is poor. Consider switching to a better network.',
        session_id: sessionId
      });
    }
  }

  /**
   * Handle low battery warning
   */
  async handleLowBattery(userId, sessionId, eventData) {
    await this.sendTelehealthNotification(userId, {
      type: 'battery_warning',
      title: 'Low Battery',
      body: 'Your battery is low. Consider connecting to a charger.',
      session_id: sessionId
    });
  }

  /**
   * Handle network changes
   */
  async handleNetworkChanged(userId, sessionId, eventData) {
    if (eventData.network_type === 'cellular' && eventData.previous_network === 'wifi') {
      await this.sendTelehealthNotification(userId, {
        type: 'network_change_warning',
        title: 'Network Changed',
        body: 'Switched to cellular data. Video quality may be affected.',
        session_id: sessionId
      });
    }
  }

  /**
   * Generate deep link for mobile app
   */
  generateDeepLink(action, params = {}) {
    const baseUrl = 'ovhi://telehealth';
    const queryParams = new URLSearchParams(params).toString();
    return `${baseUrl}/${action}${queryParams ? `?${queryParams}` : ''}`;
  }

  /**
   * Hash token for secure storage
   */
  hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate mobile session token
   */
  async validateMobileSessionToken(token) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const tokenHash = this.hashToken(token);
      const [tokens] = await connection.query(`
        SELECT user_id, session_id, expires_at
        FROM mobile_session_tokens
        WHERE token_hash = ? AND expires_at > NOW()
      `, [tokenHash]);
      
      if (tokens.length === 0) {
        throw new Error('Invalid or expired token');
      }
      
      return {
        valid: true,
        user_id: tokens[0].user_id,
        session_id: tokens[0].session_id
      };
    } catch (error) {
      console.error('Error validating mobile session token:', error);
      return { valid: false };
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new MobileAppService();