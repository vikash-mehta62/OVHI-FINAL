const pool = require('../../config/db');
const { v4: uuidv4 } = require('uuid');

class TelehealthService {
  /**
   * Create a new telehealth session
   */
  async createSession(sessionData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const sessionId = `TH-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      
      const [result] = await connection.query(`
        INSERT INTO telehealth_sessions (
          session_id, appointment_id, patient_id, provider_id, session_type,
          scheduled_start_time, chief_complaint, consent_obtained,
          ringcentral_meeting_id, ringcentral_join_url, ringcentral_host_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        sessionData.appointment_id,
        sessionData.patient_id,
        sessionData.provider_id,
        sessionData.session_type || 'video',
        sessionData.scheduled_start_time,
        sessionData.chief_complaint,
        sessionData.consent_obtained || false,
        sessionData.ringcentral_meeting_id,
        sessionData.ringcentral_join_url,
        sessionData.ringcentral_host_url
      ]);
      
      return {
        id: result.insertId,
        session_id: sessionId,
        ...sessionData
      };
    } catch (error) {
      console.error('Error creating telehealth session:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [sessions] = await connection.query(`
        SELECT 
          ts.*,
          p.firstname as patient_firstname,
          p.lastname as patient_lastname,
          p.work_email as patient_email,
          pr.firstname as provider_firstname,
          pr.lastname as provider_lastname
        FROM telehealth_sessions ts
        LEFT JOIN user_profiles p ON ts.patient_id = p.fk_userid
        LEFT JOIN user_profiles pr ON ts.provider_id = pr.fk_userid
        WHERE ts.session_id = ? OR ts.id = ?
      `, [sessionId, sessionId]);
      
      return sessions[0] || null;
    } catch (error) {
      console.error('Error getting telehealth session:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(sessionId, status, additionalData = {}) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const updateFields = ['session_status = ?'];
      const updateValues = [status];
      
      if (status === 'in_progress' && !additionalData.actual_start_time) {
        updateFields.push('actual_start_time = NOW()');
      }
      
      if (status === 'completed') {
        updateFields.push('end_time = NOW()');
        updateFields.push('duration_minutes = TIMESTAMPDIFF(MINUTE, actual_start_time, NOW())');
      }
      
      // Add any additional fields
      Object.keys(additionalData).forEach(key => {
        updateFields.push(`${key} = ?`);
        updateValues.push(additionalData[key]);
      });
      
      updateValues.push(sessionId);
      
      const [result] = await connection.query(`
        UPDATE telehealth_sessions 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE session_id = ? OR id = ?
      `, [...updateValues, sessionId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get provider's sessions
   */
  async getProviderSessions(providerId, filters = {}) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      let whereClause = 'WHERE ts.provider_id = ?';
      let queryParams = [providerId];
      
      if (filters.status) {
        whereClause += ' AND ts.session_status = ?';
        queryParams.push(filters.status);
      }
      
      if (filters.date_from) {
        whereClause += ' AND DATE(ts.scheduled_start_time) >= ?';
        queryParams.push(filters.date_from);
      }
      
      if (filters.date_to) {
        whereClause += ' AND DATE(ts.scheduled_start_time) <= ?';
        queryParams.push(filters.date_to);
      }
      
      const [sessions] = await connection.query(`
        SELECT 
          ts.*,
          p.firstname as patient_firstname,
          p.lastname as patient_lastname,
          p.work_email as patient_email,
          p.phone as patient_phone,
          tw.priority_level,
          tw.estimated_wait_time
        FROM telehealth_sessions ts
        LEFT JOIN user_profiles p ON ts.patient_id = p.fk_userid
        LEFT JOIN telehealth_waiting_room tw ON ts.id = tw.session_id
        ${whereClause}
        ORDER BY ts.scheduled_start_time DESC
        LIMIT ${filters.limit || 50}
      `, queryParams);
      
      return sessions;
    } catch (error) {
      console.error('Error getting provider sessions:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Add patient to waiting room
   */
  async addToWaitingRoom(sessionId, patientId, priority = 'medium') {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO telehealth_waiting_room (
          session_id, patient_id, priority_level, estimated_wait_time
        ) VALUES (?, ?, ?, ?)
      `, [sessionId, patientId, priority, this.calculateEstimatedWaitTime(priority)]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error adding to waiting room:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get waiting room queue
   */
  async getWaitingRoom(providerId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [queue] = await connection.query(`
        SELECT 
          tw.*,
          ts.session_id,
          ts.chief_complaint,
          p.firstname as patient_firstname,
          p.lastname as patient_lastname,
          p.work_email as patient_email,
          p.phone as patient_phone,
          TIMESTAMPDIFF(MINUTE, tw.join_time, NOW()) as actual_wait_time
        FROM telehealth_waiting_room tw
        JOIN telehealth_sessions ts ON tw.session_id = ts.id
        JOIN user_profiles p ON tw.patient_id = p.fk_userid
        WHERE ts.provider_id = ? AND tw.status = 'waiting'
        ORDER BY 
          CASE tw.priority_level 
            WHEN 'urgent' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END,
          tw.join_time ASC
      `, [providerId]);
      
      return queue;
    } catch (error) {
      console.error('Error getting waiting room:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Save session notes and clinical data
   */
  async saveSessionNotes(sessionId, clinicalData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        UPDATE telehealth_sessions 
        SET 
          consultation_notes = ?,
          diagnosis_codes = ?,
          treatment_plan = ?,
          prescriptions_issued = ?,
          follow_up_required = ?,
          follow_up_date = ?,
          updated_at = NOW()
        WHERE session_id = ? OR id = ?
      `, [
        clinicalData.consultation_notes,
        JSON.stringify(clinicalData.diagnosis_codes || []),
        clinicalData.treatment_plan,
        JSON.stringify(clinicalData.prescriptions_issued || []),
        clinicalData.follow_up_required || false,
        clinicalData.follow_up_date,
        sessionId,
        sessionId
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error saving session notes:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Save session transcript
   */
  async saveTranscript(sessionId, transcriptData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        INSERT INTO telehealth_transcripts (
          session_id, speaker_type, speaker_id, transcript_text,
          confidence_score, timestamp_start, timestamp_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        sessionId,
        transcriptData.speaker_type,
        transcriptData.speaker_id,
        transcriptData.transcript_text,
        transcriptData.confidence_score,
        transcriptData.timestamp_start,
        transcriptData.timestamp_end
      ]);
      
      return result.insertId;
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Get session analytics for provider
   */
  async getProviderAnalytics(providerId, dateRange = {}) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      let whereClause = 'WHERE provider_id = ?';
      let queryParams = [providerId];
      
      if (dateRange.start) {
        whereClause += ' AND date_recorded >= ?';
        queryParams.push(dateRange.start);
      }
      
      if (dateRange.end) {
        whereClause += ' AND date_recorded <= ?';
        queryParams.push(dateRange.end);
      }
      
      const [analytics] = await connection.query(`
        SELECT 
          SUM(total_sessions) as total_sessions,
          SUM(completed_sessions) as completed_sessions,
          SUM(cancelled_sessions) as cancelled_sessions,
          SUM(no_show_sessions) as no_show_sessions,
          AVG(avg_connection_quality) as avg_connection_quality,
          SUM(technical_issues_count) as total_technical_issues,
          AVG(avg_session_duration) as avg_session_duration,
          AVG(avg_patient_rating) as avg_patient_rating,
          SUM(total_revenue) as total_revenue,
          AVG(avg_wait_time) as avg_wait_time
        FROM telehealth_analytics 
        ${whereClause}
      `, queryParams);
      
      return analytics[0];
    } catch (error) {
      console.error('Error getting provider analytics:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Record session quality metrics
   */
  async recordQualityMetrics(sessionId, qualityData) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [result] = await connection.query(`
        UPDATE telehealth_sessions 
        SET 
          connection_quality = ?,
          network_issues = ?,
          device_info = ?,
          updated_at = NOW()
        WHERE session_id = ? OR id = ?
      `, [
        JSON.stringify(qualityData.connection_quality || {}),
        JSON.stringify(qualityData.network_issues || []),
        JSON.stringify(qualityData.device_info || {}),
        sessionId,
        sessionId
      ]);
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error recording quality metrics:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Calculate estimated wait time based on priority and current queue
   */
  calculateEstimatedWaitTime(priority) {
    const baseTimes = {
      'urgent': 5,
      'high': 10,
      'medium': 15,
      'low': 20
    };
    
    return baseTimes[priority] || 15;
  }

  /**
   * Generate billing code for telehealth session
   */
  generateBillingCode(sessionType, duration) {
    // CPT codes for telehealth services
    if (sessionType === 'video') {
      if (duration <= 10) return '99441'; // 5-10 minutes
      if (duration <= 20) return '99442'; // 11-20 minutes
      if (duration <= 30) return '99443'; // 21-30 minutes
      return '99444'; // 31+ minutes
    } else if (sessionType === 'audio') {
      return '99441'; // Audio-only consultation
    }
    
    return '99213'; // Default E/M code
  }

  /**
   * Check HIPAA compliance for session
   */
  async checkHIPAACompliance(sessionId) {
    let connection;
    try {
      connection = await pool.getConnection();
      
      const [session] = await connection.query(`
        SELECT consent_obtained, recording_consent, hipaa_compliant
        FROM telehealth_sessions 
        WHERE session_id = ? OR id = ?
      `, [sessionId, sessionId]);
      
      if (!session[0]) {
        throw new Error('Session not found');
      }
      
      const compliance = {
        consent_obtained: session[0].consent_obtained,
        recording_consent: session[0].recording_consent,
        hipaa_compliant: session[0].hipaa_compliant,
        overall_compliant: session[0].consent_obtained && session[0].hipaa_compliant
      };
      
      // Log compliance audit
      await connection.query(`
        INSERT INTO telehealth_compliance_audit (
          session_id, audit_type, compliance_status, audit_details
        ) VALUES (?, 'hipaa', ?, ?)
      `, [
        sessionId,
        compliance.overall_compliant ? 'compliant' : 'non_compliant',
        JSON.stringify(compliance)
      ]);
      
      return compliance;
    } catch (error) {
      console.error('Error checking HIPAA compliance:', error);
      throw error;
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new TelehealthService();