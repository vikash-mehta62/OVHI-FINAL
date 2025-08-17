import { apiConnector } from './apiConnector';

const BASE_URL = '/api/v1/telehealth';

export interface TelehealthSession {
  id: number;
  session_id: string;
  appointment_id?: number;
  patient_id: number;
  provider_id: number;
  session_type: 'video' | 'audio' | 'phone';
  session_status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduled_start_time: string;
  actual_start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  chief_complaint?: string;
  consultation_notes?: string;
  diagnosis_codes?: string[];
  treatment_plan?: string;
  prescriptions_issued?: any[];
  follow_up_required?: boolean;
  follow_up_date?: string;
  ringcentral_meeting_id?: string;
  ringcentral_join_url?: string;
  ringcentral_host_url?: string;
  consent_obtained?: boolean;
  recording_consent?: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  patient_firstname?: string;
  patient_lastname?: string;
  patient_email?: string;
  patient_phone?: string;
  provider_firstname?: string;
  provider_lastname?: string;
}

export interface WaitingRoomEntry {
  id: number;
  session_id: number;
  patient_id: number;
  join_time: string;
  estimated_wait_time: number;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'called' | 'in_session' | 'left';
  actual_wait_time: number;
  // Joined fields
  patient_firstname: string;
  patient_lastname: string;
  patient_email: string;
  patient_phone: string;
  chief_complaint: string;
}

export interface SessionAnalytics {
  total_sessions: number;
  completed_sessions: number;
  cancelled_sessions: number;
  no_show_sessions: number;
  avg_connection_quality: number;
  total_technical_issues: number;
  avg_session_duration: number;
  avg_patient_rating: number;
  total_revenue: number;
  avg_wait_time: number;
}

export interface CreateSessionRequest {
  patient_id: number;
  appointment_id?: number;
  session_type?: 'video' | 'audio' | 'phone';
  scheduled_start_time: string;
  chief_complaint?: string;
}

export interface SessionNotesRequest {
  consultation_notes?: string;
  diagnosis_codes?: string[];
  treatment_plan?: string;
  prescriptions_issued?: any[];
  follow_up_required?: boolean;
  follow_up_date?: string;
}

export interface TranscriptRequest {
  speaker_type: 'patient' | 'provider' | 'system';
  speaker_id?: number;
  transcript_text: string;
  confidence_score?: number;
  timestamp_start?: string;
  timestamp_end?: string;
}

class TelehealthService {
  /**
   * Create a new telehealth session
   */
  async createSession(sessionData: CreateSessionRequest): Promise<{ success: boolean; data: TelehealthSession }> {
    try {
      const response = await apiConnector('POST', `${BASE_URL}/sessions`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating telehealth session:', error);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<{ success: boolean; data: TelehealthSession }> {
    try {
      const response = await apiConnector('GET', `${BASE_URL}/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting telehealth session:', error);
      throw error;
    }
  }

  /**
   * Update session status
   */
  async updateSessionStatus(
    sessionId: string, 
    status: TelehealthSession['session_status'],
    additionalData?: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('PUT', `${BASE_URL}/sessions/${sessionId}/status`, {
        status,
        ...additionalData
      });
      return response.data;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
    }
  }

  /**
   * Get provider's sessions
   */
  async getProviderSessions(filters?: {
    status?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
  }): Promise<{ success: boolean; data: TelehealthSession[] }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) queryParams.append(key, value.toString());
        });
      }
      
      const url = `${BASE_URL}/provider/sessions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiConnector('GET', url);
      return response.data;
    } catch (error) {
      console.error('Error getting provider sessions:', error);
      throw error;
    }
  }

  /**
   * Get waiting room queue
   */
  async getWaitingRoom(): Promise<{ success: boolean; data: WaitingRoomEntry[] }> {
    try {
      const response = await apiConnector('GET', `${BASE_URL}/waiting-room`);
      return response.data;
    } catch (error) {
      console.error('Error getting waiting room:', error);
      throw error;
    }
  }

  /**
   * Add patient to waiting room
   */
  async addToWaitingRoom(
    sessionId: string, 
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<{ success: boolean; data: { waiting_room_id: number } }> {
    try {
      const response = await apiConnector('POST', `${BASE_URL}/waiting-room/${sessionId}`, {
        priority
      });
      return response.data;
    } catch (error) {
      console.error('Error adding to waiting room:', error);
      throw error;
    }
  }

  /**
   * Save session clinical notes
   */
  async saveSessionNotes(
    sessionId: string, 
    notesData: SessionNotesRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('PUT', `${BASE_URL}/sessions/${sessionId}/notes`, notesData);
      return response.data;
    } catch (error) {
      console.error('Error saving session notes:', error);
      throw error;
    }
  }

  /**
   * Save session transcript
   */
  async saveTranscript(
    sessionId: string, 
    transcriptData: TranscriptRequest
  ): Promise<{ success: boolean; data: { transcript_id: number } }> {
    try {
      const response = await apiConnector('POST', `${BASE_URL}/sessions/${sessionId}/transcript`, transcriptData);
      return response.data;
    } catch (error) {
      console.error('Error saving transcript:', error);
      throw error;
    }
  }

  /**
   * Get provider analytics
   */
  async getAnalytics(dateRange?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{ success: boolean; data: SessionAnalytics }> {
    try {
      const queryParams = new URLSearchParams();
      if (dateRange) {
        Object.entries(dateRange).forEach(([key, value]) => {
          if (value) queryParams.append(key, value);
        });
      }
      
      const url = `${BASE_URL}/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiConnector('GET', url);
      return response.data;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Test RingCentral connection
   */
  async testRingCentralConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiConnector('POST', `${BASE_URL}/ringcentral/test`);
      return response.data;
    } catch (error) {
      console.error('Error testing RingCentral connection:', error);
      throw error;
    }
  }

  /**
   * Start a telehealth session
   */
  async startSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.updateSessionStatus(sessionId, 'in_progress');
  }

  /**
   * End a telehealth session
   */
  async endSession(sessionId: string, sessionData?: {
    consultation_notes?: string;
    diagnosis_codes?: string[];
    treatment_plan?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Save notes if provided
      if (sessionData) {
        await this.saveSessionNotes(sessionId, sessionData);
      }
      
      // Update status to completed
      return this.updateSessionStatus(sessionId, 'completed');
    } catch (error) {
      console.error('Error ending session:', error);
      throw error;
    }
  }

  /**
   * Format session for display
   */
  formatSessionForDisplay(session: TelehealthSession): TelehealthSession & {
    patient_name: string;
    provider_name: string;
    duration_formatted: string;
    status_color: string;
  } {
    const patient_name = `${session.patient_firstname || ''} ${session.patient_lastname || ''}`.trim();
    const provider_name = `${session.provider_firstname || ''} ${session.provider_lastname || ''}`.trim();
    
    const duration_formatted = session.duration_minutes 
      ? `${Math.floor(session.duration_minutes / 60)}h ${session.duration_minutes % 60}m`
      : 'N/A';
    
    const status_color = this.getStatusColor(session.session_status);
    
    return {
      ...session,
      patient_name,
      provider_name,
      duration_formatted,
      status_color
    };
  }

  /**
   * Get status color for UI
   */
  private getStatusColor(status: TelehealthSession['session_status']): string {
    const colors = {
      'scheduled': 'blue',
      'waiting': 'yellow',
      'in_progress': 'green',
      'completed': 'gray',
      'cancelled': 'red',
      'no_show': 'orange'
    };
    
    return colors[status] || 'gray';
  }

  /**
   * Format waiting room entry for display
   */
  formatWaitingRoomEntry(entry: WaitingRoomEntry): WaitingRoomEntry & {
    patient_name: string;
    priority_color: string;
    wait_time_formatted: string;
  } {
    const patient_name = `${entry.patient_firstname} ${entry.patient_lastname}`;
    const priority_color = this.getPriorityColor(entry.priority_level);
    const wait_time_formatted = `${entry.actual_wait_time} min`;
    
    return {
      ...entry,
      patient_name,
      priority_color,
      wait_time_formatted
    };
  }

  /**
   * Get priority color for UI
   */
  private getPriorityColor(priority: WaitingRoomEntry['priority_level']): string {
    const colors = {
      'low': 'green',
      'medium': 'yellow',
      'high': 'orange',
      'urgent': 'red'
    };
    
    return colors[priority] || 'gray';
  }

  /**
   * Validate session data before creation
   */
  validateSessionData(sessionData: CreateSessionRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!sessionData.patient_id) {
      errors.push('Patient ID is required');
    }
    
    if (!sessionData.scheduled_start_time) {
      errors.push('Scheduled start time is required');
    }
    
    if (sessionData.scheduled_start_time) {
      const scheduledTime = new Date(sessionData.scheduled_start_time);
      const now = new Date();
      
      if (scheduledTime < now) {
        errors.push('Scheduled time cannot be in the past');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get session join URL for patient
   */
  getPatientJoinUrl(session: TelehealthSession): string | null {
    return session.ringcentral_join_url || null;
  }

  /**
   * Get session host URL for provider
   */
  getProviderHostUrl(session: TelehealthSession): string | null {
    return session.ringcentral_host_url || null;
  }

  /**
   * Check if session can be started
   */
  canStartSession(session: TelehealthSession): boolean {
    return ['scheduled', 'waiting'].includes(session.session_status);
  }

  /**
   * Check if session can be ended
   */
  canEndSession(session: TelehealthSession): boolean {
    return session.session_status === 'in_progress';
  }

  /**
   * Get billing code for session
   */
  getBillingCode(session: TelehealthSession): string {
    if (session.session_type === 'video') {
      const duration = session.duration_minutes || 0;
      if (duration <= 10) return '99441';
      if (duration <= 20) return '99442';
      if (duration <= 30) return '99443';
      return '99444';
    } else if (session.session_type === 'audio') {
      return '99441';
    }
    
    return '99213'; // Default E/M code
  }
}

export const telehealthService = new TelehealthService();
export default telehealthService;