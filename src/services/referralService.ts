import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

export interface Referral {
  id: string;
  referral_number: string;
  patient_id: string;
  provider_id: string;
  encounter_id?: string;
  specialist_id?: string;
  specialty_type: string;
  referral_reason: string;
  clinical_notes?: string;
  urgency_level: 'routine' | 'urgent' | 'stat';
  appointment_type: 'consultation' | 'treatment' | 'second_opinion' | 'procedure';
  status: 'draft' | 'pending' | 'sent' | 'scheduled' | 'completed' | 'cancelled' | 'expired';
  authorization_required: boolean;
  authorization_status?: 'pending' | 'approved' | 'denied' | 'expired' | 'not_required';
  expected_duration?: string;
  scheduled_date?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
  
  // Populated fields
  specialist_name?: string;
  specialist_practice?: string;
  specialist_phone?: string;
  specialist_email?: string;
  attachment_count?: number;
  status_change_count?: number;
}

export interface ReferralFilters {
  status?: string[];
  specialty?: string[];
  urgency?: string[];
  patientId?: string;
  specialistId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface CreateReferralData {
  patientId: string;
  providerId: string;
  encounterId?: string;
  specialistId?: string;
  specialtyType: string;
  referralReason: string;
  clinicalNotes?: string;
  urgencyLevel?: 'routine' | 'urgent' | 'stat';
  appointmentType?: 'consultation' | 'treatment' | 'second_opinion' | 'procedure';
  authorizationRequired?: boolean;
  expectedDuration?: string;
  preferredAppointmentTime?: string;
  followUpRequired?: boolean;
  followUpInstructions?: string;
  attachments?: Array<{
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
    attachmentType: string;
    description?: string;
  }>;
}

export interface UpdateReferralData {
  specialistId?: string;
  referralReason?: string;
  clinicalNotes?: string;
  urgencyLevel?: 'routine' | 'urgent' | 'stat';
  appointmentType?: 'consultation' | 'treatment' | 'second_opinion' | 'procedure';
  expectedDuration?: string;
  followUpInstructions?: string;
}

export interface ReferralResponse {
  success: boolean;
  referral?: Referral;
  referrals?: Referral[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    totalPages: number;
    currentPage: number;
  };
  message?: string;
  error?: string;
}

class ReferralService {
  private apiClient = axios.create({
    baseURL: `${API_BASE_URL}/referrals`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  constructor() {
    // Add request interceptor for authentication
    this.apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create a new referral
   */
  async createReferral(data: CreateReferralData): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.post('/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create referral');
    }
  }

  /**
   * Get referrals by provider with filtering and pagination
   */
  async getReferralsByProvider(
    providerId: string,
    filters: ReferralFilters = {},
    pagination: { limit?: number; offset?: number; sortBy?: string; sortOrder?: string } = {}
  ): Promise<ReferralResponse> {
    try {
      const params = {
        providerId,
        ...filters,
        ...pagination,
      };
      
      const response = await this.apiClient.get('/provider', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch referrals');
    }
  }

  /**
   * Get referrals by patient
   */
  async getReferralsByPatient(
    patientId: string,
    filters: ReferralFilters = {}
  ): Promise<ReferralResponse> {
    try {
      const params = { patientId, ...filters };
      const response = await this.apiClient.get('/patient', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch patient referrals');
    }
  }

  /**
   * Get referral by ID
   */
  async getReferralById(referralId: string): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.get(`/${referralId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch referral');
    }
  }

  /**
   * Update referral
   */
  async updateReferral(referralId: string, data: UpdateReferralData): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.put(`/${referralId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update referral');
    }
  }

  /**
   * Update referral status
   */
  async updateReferralStatus(
    referralId: string,
    newStatus: string,
    notes?: string,
    options?: any
  ): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.patch(`/${referralId}/status`, {
        status: newStatus,
        notes,
        ...options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update referral status');
    }
  }

  /**
   * Generate referral letter
   */
  async generateReferralLetter(
    referralId: string,
    templateId?: string
  ): Promise<{ success: boolean; content: string; template: any; referral: Referral }> {
    try {
      const response = await this.apiClient.post(`/${referralId}/generate-letter`, {
        templateId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate referral letter');
    }
  }

  /**
   * Generate document
   */
  async generateDocument(
    referralId: string,
    templateId: string,
    options: {
      format?: 'pdf' | 'html' | 'text' | 'docx';
      includeAttachments?: boolean;
      digitalSignature?: boolean;
      letterhead?: boolean;
    } = {}
  ): Promise<{ success: boolean; document: any; metadata: any }> {
    try {
      const response = await this.apiClient.post(`/${referralId}/generate-document`, {
        templateId,
        ...options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate document');
    }
  }

  /**
   * Add attachment to referral
   */
  async addAttachment(
    referralId: string,
    attachment: {
      fileName: string;
      filePath: string;
      fileType: string;
      fileSize: number;
      attachmentType: string;
      description?: string;
    }
  ): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.post(`/${referralId}/attachments`, attachment);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add attachment');
    }
  }

  /**
   * Process authorization
   */
  async processAuthorization(referralId: string): Promise<ReferralResponse> {
    try {
      const response = await this.apiClient.post(`/${referralId}/authorization`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to process authorization');
    }
  }

  /**
   * Get referral statistics
   */
  async getReferralStatistics(
    providerId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<{
    totalReferrals: number;
    completedReferrals: number;
    pendingReferrals: number;
    urgentReferrals: number;
    specialtyBreakdown: Array<{ specialty: string; count: number }>;
    statusBreakdown: Array<{ status: string; count: number }>;
  }> {
    try {
      const params = { providerId, ...dateRange };
      const response = await this.apiClient.get('/statistics', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }

  /**
   * Search referrals
   */
  async searchReferrals(
    query: string,
    filters: ReferralFilters = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<ReferralResponse> {
    try {
      const params = { query, ...filters, ...pagination };
      const response = await this.apiClient.get('/search', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search referrals');
    }
  }

  /**
   * Validate referral for workflow action
   */
  async validateForWorkflowAction(
    referralId: string,
    action: string
  ): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    try {
      const response = await this.apiClient.post(`/${referralId}/validate`, { action });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate referral');
    }
  }

  /**
   * Get referral audit trail
   */
  async getAuditTrail(referralId: string): Promise<{
    auditTrail: Array<{
      id: number;
      action: string;
      oldValues: any;
      newValues: any;
      userId: string;
      createdAt: string;
      userFirstname?: string;
      userLastname?: string;
    }>;
  }> {
    try {
      const response = await this.apiClient.get(`/${referralId}/audit-trail`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch audit trail');
    }
  }
}

export const referralService = new ReferralService();
export default referralService;