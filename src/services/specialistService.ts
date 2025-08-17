import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

export interface Specialist {
  id: string;
  name: string;
  title?: string;
  specialty_primary: string;
  specialties_secondary?: string[];
  practice_name?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  npi_number?: string;
  license_numbers?: string[];
  insurance_networks?: string[];
  availability_hours?: any;
  accepts_new_patients: boolean;
  preferred_referral_method: 'fax' | 'email' | 'portal' | 'phone';
  patient_satisfaction_score?: number;
  average_response_time?: number;
  total_referrals_received?: number;
  completed_referrals?: number;
  completion_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpecialistFilters {
  query?: string;
  specialty?: string | string[];
  location?: {
    city?: string;
    state?: string;
    zipCode?: string;
    radius?: number;
    latitude?: number;
    longitude?: number;
  };
  insuranceNetworks?: string[];
  acceptsNewPatients?: boolean;
  preferredReferralMethod?: string;
  availability?: {
    dayOfWeek?: string;
  };
  performanceThreshold?: {
    minSatisfactionScore?: number;
    maxResponseTime?: number;
    minCompletionRate?: number;
  };
}

export interface CreateSpecialistData {
  name: string;
  title?: string;
  specialtyPrimary: string;
  specialtiesSecondary?: string[];
  practiceName?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  npiNumber?: string;
  licenseNumbers?: string[];
  insuranceNetworks?: string[];
  availabilityHours?: any;
  acceptsNewPatients?: boolean;
  preferredReferralMethod?: 'fax' | 'email' | 'portal' | 'phone';
}

export interface SpecialistResponse {
  success: boolean;
  specialist?: Specialist;
  specialists?: Specialist[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    totalPages: number;
    currentPage: number;
  };
  searchCriteria?: SpecialistFilters;
  message?: string;
  error?: string;
}

export interface SpecialistSuggestion {
  suggestions: Specialist[];
  criteria: any;
  totalFound: number;
}

export interface SpecialistPerformance {
  specialistId: string;
  dateRange: { startDate: string; endDate: string };
  metrics: Array<{
    metric_date: string;
    referrals_received: number;
    referrals_scheduled: number;
    referrals_completed: number;
    average_scheduling_time: number;
    avg_satisfaction: number;
    avg_response_time: number;
  }>;
  outcomes: Array<{
    status: string;
    urgency_level: string;
    count: number;
    avg_days_to_complete: number;
  }>;
  satisfactionTrends: Array<{
    date: string;
    avg_satisfaction: number;
    review_count: number;
  }>;
  performanceScore: {
    score: number;
    components: {
      satisfaction: number;
      responseTime: number;
      completionRate: number;
    };
  };
  summary: {
    totalReferrals: number;
    completedReferrals: number;
    averageResponseTime: number;
    averageSatisfaction: number;
  };
}

class SpecialistService {
  private apiClient = axios.create({
    baseURL: `${API_BASE_URL}/specialists`,
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
        console.error('Specialist API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Search specialists with advanced filtering
   */
  async searchSpecialists(
    searchCriteria: SpecialistFilters = {},
    pagination: { limit?: number; offset?: number; sortBy?: string; sortOrder?: string } = {}
  ): Promise<SpecialistResponse> {
    try {
      const params = { ...searchCriteria, ...pagination };
      const response = await this.apiClient.get('/search', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to search specialists');
    }
  }

  /**
   * Get specialist by ID
   */
  async getSpecialistById(specialistId: string): Promise<SpecialistResponse> {
    try {
      const response = await this.apiClient.get(`/${specialistId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch specialist');
    }
  }

  /**
   * Add new specialist
   */
  async addSpecialist(data: CreateSpecialistData): Promise<SpecialistResponse> {
    try {
      const response = await this.apiClient.post('/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add specialist');
    }
  }

  /**
   * Update specialist
   */
  async updateSpecialist(
    specialistId: string,
    data: Partial<CreateSpecialistData>
  ): Promise<SpecialistResponse> {
    try {
      const response = await this.apiClient.put(`/${specialistId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update specialist');
    }
  }

  /**
   * Get specialist suggestions based on criteria
   */
  async getSpecialistSuggestions(criteria: {
    specialtyType: string;
    patientLocation?: { city?: string; state?: string };
    insuranceNetworks?: string[];
    urgencyLevel?: 'routine' | 'urgent' | 'stat';
    preferredReferralMethod?: string;
    limit?: number;
  }): Promise<SpecialistSuggestion> {
    try {
      const response = await this.apiClient.post('/suggestions', criteria);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get specialist suggestions');
    }
  }

  /**
   * Get specialist performance analytics
   */
  async getSpecialistPerformance(
    specialistId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<SpecialistPerformance> {
    try {
      const params = dateRange || {};
      const response = await this.apiClient.get(`/${specialistId}/performance`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch specialist performance');
    }
  }

  /**
   * Get available specialties
   */
  async getAvailableSpecialties(): Promise<{
    specialties: Array<{
      specialty: string;
      specialist_count: number;
      accepting_new_patients: number;
    }>;
    totalSpecialties: number;
  }> {
    try {
      const response = await this.apiClient.get('/specialties');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch specialties');
    }
  }

  /**
   * Get specialists by location
   */
  async getSpecialistsByLocation(
    location: { city?: string; state?: string; zipCode?: string },
    filters: { specialty?: string; limit?: number } = {}
  ): Promise<SpecialistResponse> {
    try {
      const params = { ...location, ...filters };
      const response = await this.apiClient.get('/by-location', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch specialists by location');
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStatistics(): Promise<{
    summary: {
      total_specialists: number;
      active_specialists: number;
      accepting_new_patients: number;
      unique_specialties: number;
      unique_locations: number;
      avg_satisfaction_score: number;
      avg_response_time: number;
    };
    topSpecialties: Array<{
      specialty_primary: string;
      count: number;
      avg_satisfaction: number;
    }>;
    topLocations: Array<{
      location: string;
      specialist_count: number;
    }>;
    generatedAt: string;
  }> {
    try {
      const response = await this.apiClient.get('/network-statistics');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch network statistics');
    }
  }

  /**
   * Advanced specialist search with scoring
   */
  async advancedSpecialistSearch(searchCriteria: {
    query?: string;
    specialty?: string;
    location?: { city?: string; state?: string };
    insuranceNetworks?: string[];
    urgencyLevel?: 'routine' | 'urgent' | 'stat';
    patientAge?: number;
    performanceThreshold?: {
      minSatisfaction?: number;
      maxResponseTime?: number;
    };
    limit?: number;
    sortBy?: 'relevance' | 'satisfaction' | 'response_time' | 'name';
  }): Promise<{
    specialists: Specialist[];
    searchCriteria: any;
    totalFound: number;
    searchPerformed: string;
  }> {
    try {
      const response = await this.apiClient.post('/advanced-search', searchCriteria);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to perform advanced search');
    }
  }

  /**
   * Deactivate specialist
   */
  async deactivateSpecialist(specialistId: string, reason: string): Promise<SpecialistResponse> {
    try {
      const response = await this.apiClient.patch(`/${specialistId}/deactivate`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate specialist');
    }
  }

  /**
   * Update specialist metrics
   */
  async updateSpecialistMetrics(
    specialistId: string,
    metricsData: {
      referralsReceived?: number;
      referralsScheduled?: number;
      referralsCompleted?: number;
      averageSchedulingTime?: number;
      patientSatisfactionTotal?: number;
      patientSatisfactionCount?: number;
      responseTimeTotal?: number;
      responseCount?: number;
    }
  ): Promise<SpecialistResponse> {
    try {
      const response = await this.apiClient.post(`/${specialistId}/metrics`, metricsData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update specialist metrics');
    }
  }
}

export const specialistService = new SpecialistService();
export default specialistService;