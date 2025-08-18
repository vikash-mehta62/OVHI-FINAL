import axios from 'axios';

const API_BASE_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';

export interface Template {
  id: string;
  name: string;
  specialty: string;
  template_type: 'letter' | 'form' | 'summary' | 'authorization';
  content_template: string;
  variables: string[];
  formatting_options: any;
  letterhead_config: any;
  signature_config: any;
  is_default: boolean;
  is_active: boolean;
  created_by: string;
  version: string;
  created_at: string;
  updated_at: string;
  usage_count?: number;
  templateVariables?: Array<{
    variable_name: string;
    variable_type: string;
    default_value?: string;
    is_required: boolean;
    validation_rules: any;
    display_order: number;
  }>;
}

export interface CreateTemplateData {
  name: string;
  specialty: string;
  templateType?: 'letter' | 'form' | 'summary' | 'authorization';
  contentTemplate: string;
  formattingOptions?: any;
  letterheadConfig?: any;
  signatureConfig?: any;
  isDefault?: boolean;
}

export interface TemplateResponse {
  success: boolean;
  template?: Template;
  templates?: Template[];
  message?: string;
  error?: string;
}

export interface DocumentGenerationOptions {
  format?: 'pdf' | 'html' | 'text' | 'docx';
  includeAttachments?: boolean;
  digitalSignature?: boolean;
  letterhead?: boolean;
}

export interface GeneratedDocument {
  success: boolean;
  content: string;
  metadata: {
    templateId: string;
    templateName: string;
    templateVersion: string;
    generatedAt: string;
    generatedBy: string;
    referralId: string;
    documentType: string;
    format?: string;
    filePath?: string;
    fileSize?: number;
  };
  template: Template;
}

export interface TemplateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
  sessionValidation?: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
  validatedAt?: string;
}

export interface TemplateUsageStatistics {
  templateId: string;
  dateRange: { startDate: string; endDate: string };
  summary: {
    total_usage: number;
    completed_referrals: number;
    unique_providers: number;
    unique_specialists: number;
    avg_completion_days: number;
  };
  providerUsage: Array<{
    provider_id: string;
    usage_count: number;
    completed_count: number;
  }>;
  trends: Array<{
    usage_date: string;
    daily_usage: number;
  }>;
  generatedAt: string;
}

export interface EditorSession {
  sessionId: string;
  templateId?: string;
  isNew: boolean;
  createdAt: string;
  lastModified: string;
  lastSaved?: string;
  lastAutoSave?: string;
  isDirty: boolean;
  collaborators: string[];
  changeCount: number;
  contentLength: number;
  autoSaveEnabled: boolean;
}

export interface TemplateSuggestions {
  variables: Array<{
    variable: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  content: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  formatting: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  improvements: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

class TemplateService {
  private apiClient = axios.create({
    baseURL: `${API_BASE_URL}/templates`,
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
        console.error('Template API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateData): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.post('/', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create template');
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(templateId: string, data: Partial<CreateTemplateData>): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.put(`/${templateId}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update template');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.get(`/${templateId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch template');
    }
  }

  /**
   * Get templates by specialty
   */
  async getTemplatesBySpecialty(specialty: string, includeGeneral = true): Promise<TemplateResponse> {
    try {
      const params = { specialty, includeGeneral };
      const response = await this.apiClient.get('/by-specialty', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch templates by specialty');
    }
  }

  /**
   * Generate document from template
   */
  async generateDocument(
    templateId: string,
    referralData: any,
    options: DocumentGenerationOptions = {}
  ): Promise<GeneratedDocument> {
    try {
      const response = await this.apiClient.post(`/${templateId}/generate`, {
        referralData,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate document');
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(templateId: string, sampleData?: any): Promise<{
    success: boolean;
    content: string;
    template: Template;
    sampleData: any;
  }> {
    try {
      const response = await this.apiClient.post(`/${templateId}/preview`, { sampleData });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to preview template');
    }
  }

  /**
   * Validate template syntax and variables
   */
  async validateTemplate(templateContent: string, specialty = 'General'): Promise<TemplateValidation> {
    try {
      const response = await this.apiClient.post('/validate', {
        templateContent,
        specialty,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate template');
    }
  }

  /**
   * Clone template with modifications
   */
  async cloneTemplate(
    templateId: string,
    cloneData: {
      name?: string;
      specialty?: string;
      templateType?: string;
      contentTemplate?: string;
      formattingOptions?: any;
      letterheadConfig?: any;
      signatureConfig?: any;
    }
  ): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.post(`/${templateId}/clone`, cloneData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to clone template');
    }
  }

  /**
   * Deactivate template
   */
  async deactivateTemplate(templateId: string, reason: string): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.patch(`/${templateId}/deactivate`, { reason });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to deactivate template');
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStatistics(
    templateId: string,
    dateRange?: { startDate: string; endDate: string }
  ): Promise<TemplateUsageStatistics> {
    try {
      const params = dateRange || {};
      const response = await this.apiClient.get(`/${templateId}/usage-statistics`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch template usage statistics');
    }
  }

  // Template Editor Service Methods

  /**
   * Create new template editor session
   */
  async createEditorSession(templateId?: string, options: { autoSave?: boolean } = {}): Promise<{
    success: boolean;
    sessionId: string;
    session: EditorSession;
    message: string;
  }> {
    try {
      const response = await this.apiClient.post('/editor/sessions', {
        templateId,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to create editor session');
    }
  }

  /**
   * Update template content in editor session
   */
  async updateSessionContent(
    sessionId: string,
    content: string,
    options: { validate?: boolean } = {}
  ): Promise<{
    success: boolean;
    session: EditorSession;
    validation?: TemplateValidation;
    message: string;
  }> {
    try {
      const response = await this.apiClient.put(`/editor/sessions/${sessionId}/content`, {
        content,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update session content');
    }
  }

  /**
   * Validate template content in session
   */
  async validateSessionContent(sessionId: string): Promise<TemplateValidation> {
    try {
      const response = await this.apiClient.post(`/editor/sessions/${sessionId}/validate`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to validate session content');
    }
  }

  /**
   * Save template from editor session
   */
  async saveTemplate(sessionId: string, saveData: CreateTemplateData): Promise<TemplateResponse> {
    try {
      const response = await this.apiClient.post(`/editor/sessions/${sessionId}/save`, saveData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to save template');
    }
  }

  /**
   * Preview template from editor session
   */
  async previewSessionTemplate(sessionId: string, sampleData?: any): Promise<{
    success: boolean;
    preview: {
      content: string;
      template: Template;
      sampleData: any;
    };
    sessionId: string;
  }> {
    try {
      const response = await this.apiClient.post(`/editor/sessions/${sessionId}/preview`, {
        sampleData,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to preview session template');
    }
  }

  /**
   * Get template suggestions based on content
   */
  async getTemplateSuggestions(
    sessionId: string,
    context: { specialty?: string } = {}
  ): Promise<{
    success: boolean;
    suggestions: TemplateSuggestions;
    sessionId: string;
  }> {
    try {
      const response = await this.apiClient.post(`/editor/sessions/${sessionId}/suggestions`, {
        context,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get template suggestions');
    }
  }

  /**
   * Close editor session
   */
  async closeEditorSession(sessionId: string, options: { force?: boolean } = {}): Promise<{
    success: boolean;
    hasUnsavedChanges?: boolean;
    message: string;
  }> {
    try {
      const response = await this.apiClient.delete(`/editor/sessions/${sessionId}`, {
        data: options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to close editor session');
    }
  }

  /**
   * Get editor session history
   */
  async getSessionHistory(
    sessionId: string,
    options: { limit?: number; offset?: number; changeType?: string } = {}
  ): Promise<{
    success: boolean;
    sessionId: string;
    changes: Array<{
      timestamp: string;
      userId: string;
      type: string;
      oldContent?: string;
      newContent?: string;
      changeSize?: number;
    }>;
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    try {
      const params = options;
      const response = await this.apiClient.get(`/editor/sessions/${sessionId}/history`, { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get session history');
    }
  }

  // Document Generation Service Methods

  /**
   * Generate document in specified format
   */
  async generateDocumentFormat(
    referralId: string,
    templateId: string,
    options: DocumentGenerationOptions = {}
  ): Promise<{
    success: boolean;
    document: {
      filename: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      createdAt: string;
    };
    metadata: any;
  }> {
    try {
      const response = await this.apiClient.post('/documents/generate', {
        referralId,
        templateId,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate document');
    }
  }

  /**
   * Generate document with attachments
   */
  async generateDocumentWithAttachments(
    referralId: string,
    templateId: string,
    options: DocumentGenerationOptions = {}
  ): Promise<{
    success: boolean;
    document: any;
    attachments: number;
    metadata: any;
  }> {
    try {
      const response = await this.apiClient.post('/documents/generate-with-attachments', {
        referralId,
        templateId,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to generate document with attachments');
    }
  }

  /**
   * Batch generate documents
   */
  async batchGenerateDocuments(
    referralIds: string[],
    templateId: string,
    options: DocumentGenerationOptions = {}
  ): Promise<{
    success: boolean;
    totalProcessed: number;
    successful: number;
    failed: number;
    results: Array<{
      referralId: string;
      success: boolean;
      document?: any;
      metadata?: any;
    }>;
    errors: Array<{
      referralId: string;
      error: string;
    }>;
  }> {
    try {
      const response = await this.apiClient.post('/documents/batch-generate', {
        referralIds,
        templateId,
        options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to batch generate documents');
    }
  }

  /**
   * Get document generation statistics
   */
  async getGenerationStatistics(dateRange?: { startDate: string; endDate: string }): Promise<{
    dateRange: { startDate: string; endDate: string };
    statistics: Array<{
      format: string;
      total_generated: number;
      unique_referrals: number;
      unique_users: number;
      format_count: number;
    }>;
    generatedAt: string;
  }> {
    try {
      const params = dateRange || {};
      const response = await this.apiClient.get('/documents/statistics', { params });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to fetch generation statistics');
    }
  }
}

export const templateService = new TemplateService();
export default templateService;