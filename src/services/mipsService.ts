import axios from 'axios';

const API_BASE_URL = '/api/v1/mips';

export interface EligibilityData {
  providerId: string;
  performanceYear: number;
  tin: string;
  npi: string;
  specialty?: string;
}

export interface QualityMeasure {
  measureId: string;
  title: string;
  type: string;
  collectionType: string;
  specialtySet: string;
  isHighPriority: boolean;
  isOutcome: boolean;
  description: string;
  numeratorDescription: string;
  denominatorDescription: string;
  exclusionsDescription: string;
  minimumCases: number;
  benchmarkData: any;
  cptCodes: string[];
  icd10Codes: string[];
  currentStatus: string;
}

export interface MeasureSelection {
  measureId: string;
  selectionReason?: string;
  expectedCompleteness?: number;
  targetRate?: number;
  submissionMethod?: string;
}

export interface PIAttestation {
  providerId: string;
  performanceYear: number;
  measureId: string;
  numeratorValue: number;
  denominatorValue: number;
  evidenceDocumentation?: string;
}

export interface IAAttestation {
  providerId: string;
  performanceYear: number;
  activityId: string;
  startDate: string;
  endDate: string;
  attestationStatement: string;
  supportingEvidence?: string;
}

class MIPSService {
  
  // ============================================================================
  // ELIGIBILITY METHODS
  // ============================================================================

  async checkEligibility(data: EligibilityData) {
    try {
      const response = await axios.post(`${API_BASE_URL}/eligibility/check`, data);
      return response.data;
    } catch (error) {
      console.error('Error checking MIPS eligibility:', error);
      throw error;
    }
  }

  async getEligibilityStatus(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/eligibility/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching eligibility status:', error);
      throw error;
    }
  }

  async getMIPSTimeline(performanceYear: number) {
    try {
      const response = await axios.get(`${API_BASE_URL}/timeline/${performanceYear}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching MIPS timeline:', error);
      throw error;
    }
  }

  // ============================================================================
  // QUALITY MEASURES METHODS
  // ============================================================================

  async getAvailableQualityMeasures(specialty?: string, performanceYear?: number, collectionType?: string) {
    try {
      const params: any = {};
      if (specialty) params.specialty = specialty;
      if (performanceYear) params.performanceYear = performanceYear;
      if (collectionType) params.collectionType = collectionType;

      const response = await axios.get(`${API_BASE_URL}/quality/measures`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching quality measures:', error);
      throw error;
    }
  }

  async selectQualityMeasures(providerId: string, performanceYear: number, selectedMeasures: MeasureSelection[]) {
    try {
      const response = await axios.post(`${API_BASE_URL}/quality/measures/select`, {
        providerId,
        performanceYear,
        selectedMeasures
      });
      return response.data;
    } catch (error) {
      console.error('Error selecting quality measures:', error);
      throw error;
    }
  }

  async getQualityPerformance(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/quality/performance/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching quality performance:', error);
      throw error;
    }
  }

  async calculateQualityPerformance(providerId: string, performanceYear: number, measureId?: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/quality/performance/calculate`, {
        providerId,
        performanceYear,
        measureId
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating quality performance:', error);
      throw error;
    }
  }

  // ============================================================================
  // PROMOTING INTEROPERABILITY METHODS
  // ============================================================================

  async getPIMeasures(performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/pi/measures`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching PI measures:', error);
      throw error;
    }
  }

  async getPIPerformance(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/pi/performance/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching PI performance:', error);
      throw error;
    }
  }

  async attestPIMeasure(attestation: PIAttestation) {
    try {
      const response = await axios.post(`${API_BASE_URL}/pi/attest`, attestation);
      return response.data;
    } catch (error) {
      console.error('Error attesting PI measure:', error);
      throw error;
    }
  }

  // ============================================================================
  // IMPROVEMENT ACTIVITIES METHODS
  // ============================================================================

  async getIAActivities(performanceYear?: number, subcategory?: string) {
    try {
      const params: any = {};
      if (performanceYear) params.performanceYear = performanceYear;
      if (subcategory) params.subcategory = subcategory;

      const response = await axios.get(`${API_BASE_URL}/ia/activities`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching IA activities:', error);
      throw error;
    }
  }

  async getIAAttestations(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/ia/attestations/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching IA attestations:', error);
      throw error;
    }
  }

  async attestIAActivity(attestation: IAAttestation) {
    try {
      const response = await axios.post(`${API_BASE_URL}/ia/attest`, attestation);
      return response.data;
    } catch (error) {
      console.error('Error attesting IA activity:', error);
      throw error;
    }
  }

  // ============================================================================
  // DASHBOARD AND SCORING METHODS
  // ============================================================================

  async getDashboardData(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/dashboard/${providerId}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching MIPS dashboard data:', error);
      throw error;
    }
  }

  async calculateCompositeScore(providerId: string, performanceYear: number) {
    try {
      const response = await axios.post(`${API_BASE_URL}/score/calculate`, {
        providerId,
        performanceYear
      });
      return response.data;
    } catch (error) {
      console.error('Error calculating composite score:', error);
      throw error;
    }
  }

  async identifyDataGaps(providerId: string, performanceYear: number) {
    try {
      const response = await axios.post(`${API_BASE_URL}/gaps/identify`, {
        providerId,
        performanceYear
      });
      return response.data;
    } catch (error) {
      console.error('Error identifying data gaps:', error);
      throw error;
    }
  }

  async getDataGaps(providerId: string, performanceYear?: number, status?: string) {
    try {
      const params: any = {};
      if (performanceYear) params.performanceYear = performanceYear;
      if (status) params.status = status;

      const response = await axios.get(`${API_BASE_URL}/gaps/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching data gaps:', error);
      throw error;
    }
  }

  async updateDataGap(gapId: string, updates: { status?: string; resolutionNotes?: string; assignedTo?: string }) {
    try {
      const response = await axios.put(`${API_BASE_URL}/gaps/${gapId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating data gap:', error);
      throw error;
    }
  }

  // ============================================================================
  // SUBMISSION METHODS
  // ============================================================================

  async getSubmissionStatus(providerId: string, performanceYear?: number) {
    try {
      const params = performanceYear ? { performanceYear } : {};
      const response = await axios.get(`${API_BASE_URL}/submission/${providerId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching submission status:', error);
      throw error;
    }
  }

  async submitMIPSData(providerId: string, performanceYear: number, submissionMethod?: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/submission/submit`, {
        providerId,
        performanceYear,
        submissionMethod
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting MIPS data:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  formatScore(score: number): string {
    return score ? score.toFixed(2) : '0.00';
  }

  formatPercentage(value: number): string {
    return value ? `${value.toFixed(1)}%` : '0.0%';
  }

  getEligibilityStatusColor(status: string): string {
    const colors = {
      eligible: 'green',
      not_eligible: 'red',
      exempt: 'blue',
      pending: 'yellow'
    };
    return colors[status as keyof typeof colors] || 'gray';
  }

  getSubmissionStatusColor(status: string): string {
    const colors = {
      draft: 'gray',
      ready: 'blue',
      submitted: 'green',
      accepted: 'green',
      rejected: 'red'
    };
    return colors[status as keyof typeof colors] || 'gray';
  }

  getGapSeverityColor(severity: string): string {
    const colors = {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'blue'
    };
    return colors[severity as keyof typeof colors] || 'gray';
  }

  calculateDaysRemaining(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isDeadlineApproaching(endDate: string, warningDays: number = 30): boolean {
    const daysRemaining = this.calculateDaysRemaining(endDate);
    return daysRemaining <= warningDays && daysRemaining > 0;
  }

  isDeadlinePassed(endDate: string): boolean {
    return this.calculateDaysRemaining(endDate) < 0;
  }

  // Validation helpers
  validateEligibilityData(data: Partial<EligibilityData>): string[] {
    const errors: string[] = [];
    
    if (!data.providerId) errors.push('Provider ID is required');
    if (!data.performanceYear) errors.push('Performance year is required');
    if (!data.tin) errors.push('TIN is required');
    if (!data.npi) errors.push('NPI is required');
    
    if (data.tin && !/^\d{2}-\d{7}$/.test(data.tin)) {
      errors.push('TIN must be in format XX-XXXXXXX');
    }
    
    if (data.npi && !/^\d{10}$/.test(data.npi)) {
      errors.push('NPI must be 10 digits');
    }
    
    return errors;
  }

  validateMeasureSelection(measures: MeasureSelection[]): string[] {
    const errors: string[] = [];
    
    if (measures.length < 6) {
      errors.push('Minimum 6 quality measures required');
    }
    
    if (measures.length > 6) {
      errors.push('Maximum 6 quality measures allowed');
    }
    
    measures.forEach((measure, index) => {
      if (!measure.measureId) {
        errors.push(`Measure ${index + 1}: Measure ID is required`);
      }
      
      if (measure.expectedCompleteness && (measure.expectedCompleteness < 0 || measure.expectedCompleteness > 100)) {
        errors.push(`Measure ${index + 1}: Expected completeness must be between 0-100%`);
      }
      
      if (measure.targetRate && (measure.targetRate < 0 || measure.targetRate > 100)) {
        errors.push(`Measure ${index + 1}: Target rate must be between 0-100%`);
      }
    });
    
    return errors;
  }

  validatePIAttestation(attestation: Partial<PIAttestation>): string[] {
    const errors: string[] = [];
    
    if (!attestation.providerId) errors.push('Provider ID is required');
    if (!attestation.performanceYear) errors.push('Performance year is required');
    if (!attestation.measureId) errors.push('Measure ID is required');
    if (attestation.numeratorValue === undefined) errors.push('Numerator value is required');
    if (attestation.denominatorValue === undefined) errors.push('Denominator value is required');
    
    if (attestation.numeratorValue !== undefined && attestation.numeratorValue < 0) {
      errors.push('Numerator value cannot be negative');
    }
    
    if (attestation.denominatorValue !== undefined && attestation.denominatorValue < 0) {
      errors.push('Denominator value cannot be negative');
    }
    
    if (attestation.numeratorValue !== undefined && attestation.denominatorValue !== undefined && 
        attestation.numeratorValue > attestation.denominatorValue) {
      errors.push('Numerator cannot be greater than denominator');
    }
    
    return errors;
  }

  validateIAAttestation(attestation: Partial<IAAttestation>): string[] {
    const errors: string[] = [];
    
    if (!attestation.providerId) errors.push('Provider ID is required');
    if (!attestation.performanceYear) errors.push('Performance year is required');
    if (!attestation.activityId) errors.push('Activity ID is required');
    if (!attestation.startDate) errors.push('Start date is required');
    if (!attestation.endDate) errors.push('End date is required');
    if (!attestation.attestationStatement) errors.push('Attestation statement is required');
    
    if (attestation.startDate && attestation.endDate) {
      const start = new Date(attestation.startDate);
      const end = new Date(attestation.endDate);
      
      if (start >= end) {
        errors.push('End date must be after start date');
      }
      
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 90) {
        errors.push('Activity must be performed for at least 90 consecutive days');
      }
    }
    
    return errors;
  }
}

export const mipsService = new MIPSService();