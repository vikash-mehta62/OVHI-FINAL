const axios = require('axios');
const pool = require('../../config/db');

class RingCentralIntegration {
  constructor() {
    this.baseURL = 'https://platform.ringcentral.com';
    this.apiVersion = 'v1.0';
  }

  /**
   * Get RingCentral configuration for provider
   */
  async getProviderConfig(providerId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [configs] = await connection.query(`
        SELECT * FROM ring_cent_config 
        WHERE provider_id = ? AND is_active = TRUE
      `, [providerId]);
      
      return configs[0] || null;
    } catch (error) {
      console.error('Error getting RingCentral config:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Test RingCentral connection
   */
  async testConnection(providerId) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      // Test API connection
      const response = await axios.get(`${this.baseURL}/restapi/${this.apiVersion}/account/~/extension/~`, {
        headers: {
          'Authorization': `Bearer ${config.jwt_token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update test status
      await this.updateConfigStatus(providerId, 'success', null);
      
      return {
        success: true,
        data: response.data,
        message: 'RingCentral connection successful'
      };
    } catch (error) {
      console.error('RingCentral connection test failed:', error);
      
      // Update test status
      await this.updateConfigStatus(providerId, 'failed', error.message);
      
      return {
        success: false,
        error: error.message,
        message: 'RingCentral connection failed'
      };
    }
  }

  /**
   * Create RingCentral meeting
   */
  async createMeeting(providerId, meetingData) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const meetingPayload = {
        topic: meetingData.topic || 'Telehealth Consultation',
        meetingType: 'Instant',
        allowJoinBeforeHost: config.allow_join_before_host || false,
        startHostVideo: true,
        startParticipantsVideo: true,
        audioOptions: ['Phone', 'ComputerAudio'],
        password: meetingData.password || this.generateMeetingPassword(),
        settings: {
          waitingRoom: config.waiting_room_enabled || true,
          muteParticipantsOnEntry: config.mute_participants_on_entry || true,
          allowScreenSharing: true,
          allowRecording: config.auto_recording || false
        }
      };

      const response = await axios.post(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/extension/~/meeting`,
        meetingPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        meeting: {
          id: response.data.id,
          join_url: response.data.links.joinUri,
          host_url: response.data.links.startUri,
          password: meetingPayload.password,
          topic: response.data.topic
        }
      };
    } catch (error) {
      console.error('Error creating RingCentral meeting:', error);
      throw error;
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(providerId, meetingId, updateData) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const response = await axios.put(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/extension/~/meeting/${meetingId}`,
        updateData,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        meeting: response.data
      };
    } catch (error) {
      console.error('Error updating RingCentral meeting:', error);
      throw error;
    }
  }

  /**
   * Delete meeting
   */
  async deleteMeeting(providerId, meetingId) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      await axios.delete(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/extension/~/meeting/${meetingId}`,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error deleting RingCentral meeting:', error);
      throw error;
    }
  }

  /**
   * Get meeting recordings
   */
  async getMeetingRecordings(providerId, meetingId) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const response = await axios.get(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/extension/~/meeting/${meetingId}/recording`,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        recordings: response.data.records || []
      };
    } catch (error) {
      console.error('Error getting meeting recordings:', error);
      throw error;
    }
  }

  /**
   * Download recording
   */
  async downloadRecording(providerId, recordingId) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const response = await axios.get(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/recording/${recordingId}/content`,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`
          },
          responseType: 'stream'
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error downloading recording:', error);
      throw error;
    }
  }

  /**
   * Get call analytics
   */
  async getCallAnalytics(providerId, dateFrom, dateTo) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const response = await axios.get(
        `${this.baseURL}/restapi/${this.apiVersion}/account/~/analytics/calls/aggregate`,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          },
          params: {
            grouping: ['Day'],
            timeZone: 'UTC',
            dateFrom: dateFrom,
            dateTo: dateTo
          }
        }
      );

      return {
        success: true,
        analytics: response.data
      };
    } catch (error) {
      console.error('Error getting call analytics:', error);
      throw error;
    }
  }

  /**
   * Setup webhook for meeting events
   */
  async setupWebhook(providerId, webhookUrl) {
    try {
      const config = await this.getProviderConfig(providerId);
      if (!config) {
        throw new Error('RingCentral configuration not found');
      }

      const webhookPayload = {
        eventFilters: [
          '/restapi/v1.0/account/~/extension/~/meeting',
          '/restapi/v1.0/account/~/extension/~/meeting/*/recording'
        ],
        deliveryMode: {
          transportType: 'WebHook',
          address: webhookUrl
        },
        expiresIn: 604800 // 7 days
      };

      const response = await axios.post(
        `${this.baseURL}/restapi/${this.apiVersion}/subscription`,
        webhookPayload,
        {
          headers: {
            'Authorization': `Bearer ${config.jwt_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Update config with webhook URL
      await this.updateConfig(providerId, { webhook_url: webhookUrl });

      return {
        success: true,
        subscription: response.data
      };
    } catch (error) {
      console.error('Error setting up webhook:', error);
      throw error;
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(eventData) {
    try {
      const { eventType, body } = eventData;

      switch (eventType) {
        case 'meeting-started':
          await this.handleMeetingStarted(body);
          break;
        case 'meeting-ended':
          await this.handleMeetingEnded(body);
          break;
        case 'recording-ready':
          await this.handleRecordingReady(body);
          break;
        default:
          console.log('Unhandled webhook event:', eventType);
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle meeting started event
   */
  async handleMeetingStarted(meetingData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        UPDATE telehealth_sessions 
        SET session_status = 'in_progress', actual_start_time = NOW()
        WHERE ringcentral_meeting_id = ?
      `, [meetingData.id]);
      
      console.log('Meeting started:', meetingData.id);
    } catch (error) {
      console.error('Error handling meeting started:', error);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Handle meeting ended event
   */
  async handleMeetingEnded(meetingData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        UPDATE telehealth_sessions 
        SET 
          session_status = 'completed', 
          end_time = NOW(),
          duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_time, NOW())
        WHERE ringcentral_meeting_id = ?
      `, [meetingData.id]);
      
      console.log('Meeting ended:', meetingData.id);
    } catch (error) {
      console.error('Error handling meeting ended:', error);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Handle recording ready event
   */
  async handleRecordingReady(recordingData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      // Find the session
      const [sessions] = await connection.query(`
        SELECT id FROM telehealth_sessions 
        WHERE ringcentral_meeting_id = ?
      `, [recordingData.meetingId]);
      
      if (sessions.length > 0) {
        await connection.query(`
          INSERT INTO telehealth_recordings (
            session_id, recording_type, ringcentral_recording_id,
            ringcentral_download_url, duration_seconds, file_size
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          sessions[0].id,
          recordingData.type || 'video',
          recordingData.id,
          recordingData.downloadUrl,
          recordingData.duration,
          recordingData.size
        ]);
      }
      
      console.log('Recording ready:', recordingData.id);
    } catch (error) {
      console.error('Error handling recording ready:', error);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update configuration status
   */
  async updateConfigStatus(providerId, status, errorMessage) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      await connection.query(`
        UPDATE ring_cent_config 
        SET test_status = ?, error_message = ?, last_tested = NOW()
        WHERE provider_id = ?
      `, [status, errorMessage, providerId]);
    } catch (error) {
      console.error('Error updating config status:', error);
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update configuration
   */
  async updateConfig(providerId, updates) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const updateFields = Object.keys(updates).map(key => `${key} = ?`);
      const updateValues = Object.values(updates);
      
      await connection.query(`
        UPDATE ring_cent_config 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE provider_id = ?
      `, [...updateValues, providerId]);
    } catch (error) {
      console.error('Error updating config:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Generate secure meeting password
   */
  generateMeetingPassword() {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
  }

  /**
   * Validate webhook signature (for security)
   */
  validateWebhookSignature(payload, signature, secret) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return signature === expectedSignature;
  }
}

module.exports = new RingCentralIntegration();