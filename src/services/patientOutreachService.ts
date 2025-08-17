import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Types
export interface PatientCommunicationPreferences {
  id?: number;
  patient_id: number;
  timezone: string;
  language: string;
  quiet_start: string;
  quiet_end: string;
  work_start: string;
  work_end: string;
  best_hour?: number;
  allow_email: boolean;
  allow_sms: boolean;
  allow_whatsapp: boolean;
  marketing_opt_in_email: boolean;
  marketing_opt_in_sms: boolean;
  marketing_opt_in_whatsapp: boolean;
  email_address?: string;
  sms_number?: string;
  whatsapp_number?: string;
}

export interface CommunicationTemplate {
  id?: number;
  name: string;
  purpose: 'appt_confirm' | 'appt_reminder' | 'no_show' | 'rx_refill' | 'lab_ready' | 'campaign_education' | 'urgent';
  channel: 'email' | 'sms' | 'whatsapp';
  language: string;
  subject?: string;
  body: string;
  variables: string[];
  is_marketing: boolean;
  organization_id?: number;
  provider_id?: number;
  is_active: boolean;
}

export interface PatientSegment {
  id?: number;
  name: string;
  description?: string;
  rules: any; // JSON rules object
  organization_id?: number;
  created_by?: number;
  is_active: boolean;
  patient_count?: number;
}

export interface CommunicationCampaign {
  id?: number;
  name: string;
  description?: string;
  segment_id: number;
  steps: any[]; // Array of campaign steps
  ab_variants?: any; // A/B test configuration
  organization_id?: number;
  created_by?: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
}

export interface CommunicationJob {
  id?: number;
  patient_id: number;
  template_id: number;
  campaign_id?: number;
  purpose: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject?: string;
  body: string;
  variables?: any;
  scheduled_at: string;
  sent_at?: string;
  status: 'queued' | 'processing' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed' | 'cancelled';
  is_urgent: boolean;
}

export interface CommunicationStats {
  date: string;
  organization_id?: number;
  provider_id?: number;
  channel: 'email' | 'sms' | 'whatsapp';
  purpose: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  replied_count: number;
  bounced_count: number;
  unsubscribed_count: number;
}

// API Service Class
class PatientOutreachService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Patient Communication Preferences
  async getPatientPreferences(patientId: number): Promise<PatientCommunicationPreferences> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patients/${patientId}/comm-context`,
      { headers: this.getAuthHeaders() }
    );
    return response.data.preferences;
  }

  async updatePatientPreferences(
    patientId: number, 
    preferences: Partial<PatientCommunicationPreferences>
  ): Promise<PatientCommunicationPreferences> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/patients/${patientId}/comm-preferences`,
      preferences,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Communication Templates
  async getTemplates(filters?: {
    purpose?: string;
    channel?: string;
    language?: string;
    is_active?: boolean;
  }): Promise<CommunicationTemplate[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/templates?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async createTemplate(template: Omit<CommunicationTemplate, 'id'>): Promise<CommunicationTemplate> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/templates`,
      template,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateTemplate(id: number, template: Partial<CommunicationTemplate>): Promise<CommunicationTemplate> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/comm/templates/${id}`,
      template,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async deleteTemplate(id: number): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/v1/comm/templates/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  // Patient Segments
  async getSegments(): Promise<PatientSegment[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/segments`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async createSegment(segment: Omit<PatientSegment, 'id'>): Promise<PatientSegment> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/segments`,
      segment,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateSegment(id: number, segment: Partial<PatientSegment>): Promise<PatientSegment> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/comm/segments/${id}`,
      segment,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async evaluateSegment(id: number): Promise<{ patient_count: number; patients: any[] }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/segments/${id}/evaluate`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Communication Campaigns
  async getCampaigns(): Promise<CommunicationCampaign[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/campaigns`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async createCampaign(campaign: Omit<CommunicationCampaign, 'id'>): Promise<CommunicationCampaign> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/campaigns`,
      campaign,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateCampaign(id: number, campaign: Partial<CommunicationCampaign>): Promise<CommunicationCampaign> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/comm/campaigns/${id}`,
      campaign,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async launchCampaign(id: number): Promise<{ message: string; jobs_created: number }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/campaigns/${id}/launch`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async pauseCampaign(id: number): Promise<CommunicationCampaign> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/campaigns/${id}/pause`,
      {},
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Communication Jobs
  async scheduleCommunication(jobData: {
    patient_id: number;
    purpose: string;
    template_id?: number;
    variables: any;
    preferred_channel?: 'email' | 'sms' | 'whatsapp';
    send_at?: string;
    campaign_id?: number;
    is_urgent?: boolean;
  }): Promise<{
    job_id: string;
    scheduled_at: string;
    channel: string;
    estimated_delivery: string;
  }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/v1/comm/schedule`,
      jobData,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getCommunicationJobs(filters?: {
    patient_id?: number;
    status?: string;
    channel?: string;
    campaign_id?: number;
    limit?: number;
    offset?: number;
  }): Promise<CommunicationJob[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/jobs?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async cancelCommunicationJob(jobId: number): Promise<void> {
    await axios.post(
      `${API_BASE_URL}/api/v1/comm/jobs/${jobId}/cancel`,
      {},
      { headers: this.getAuthHeaders() }
    );
  }

  // Analytics and Statistics
  async getCommunicationStats(filters?: {
    start_date?: string;
    end_date?: string;
    channel?: string;
    purpose?: string;
    provider_id?: number;
    campaign_id?: number;
  }): Promise<CommunicationStats[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/analytics/stats?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Dashboard specific methods
  async getDashboardStats(): Promise<any> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/dashboard/stats`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getRecentCommunications(): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/communications/recent`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getActiveCampaigns(): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/campaigns`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getAnalyticsData(): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/analytics/stats`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getChannelPerformance(): Promise<any[]> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/patient-outreach/analytics/channels`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getCampaignAnalytics(campaignId: number): Promise<{
    campaign: CommunicationCampaign;
    stats: CommunicationStats[];
    performance: {
      total_sent: number;
      delivery_rate: number;
      open_rate: number;
      click_rate: number;
      reply_rate: number;
      roi: number;
      cost: number;
    };
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/campaigns/${campaignId}/analytics`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getEngagementAnalytics(filters?: {
    start_date?: string;
    end_date?: string;
    patient_id?: number;
  }): Promise<{
    engagement_trends: any[];
    best_hours: any[];
    channel_preferences: any[];
    fatigue_analysis: any[];
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/analytics/engagement?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Organization Settings
  async getOrganizationSettings(): Promise<{
    business_name: string;
    business_address: string;
    business_phone: string;
    support_email: string;
    default_timezone: string;
    default_language: string;
    enable_marketing: boolean;
    marketing_consent_required: boolean;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/settings/organization`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateOrganizationSettings(settings: any): Promise<any> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/comm/settings/organization`,
      settings,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  // Provider Settings
  async getProviderSettings(providerId?: number): Promise<{
    default_timezone: string;
    default_language: string;
    enable_auto_reminders: boolean;
    reminder_hours_before: number[];
    signature: string;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/comm/settings/provider${providerId ? `/${providerId}` : ''}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async updateProviderSettings(settings: any, providerId?: number): Promise<any> {
    const response = await axios.put(
      `${API_BASE_URL}/api/v1/comm/settings/provider${providerId ? `/${providerId}` : ''}`,
      settings,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

// Export singleton instance
export const patientOutreachService = new PatientOutreachService();
export default patientOutreachService;