/**
 * API Error Handler
 * Specialized error handling for API requests and responses
 */

import { ErrorType, ErrorSeverity, EnhancedError } from '@/components/rcm/shared/EnhancedErrorBoundary';

// API Error types
export enum APIErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND_ERROR = 'not_found_error',
  SERVER_ERROR = 'server_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  MAINTENANCE_ERROR = 'maintenance_error',
  UNKNOWN_API_ERROR = 'unknown_api_error'
}

// API Error interface
export interface APIError extends EnhancedError {
  status?: number;
  statusText?: string;
  endpoint?: string;
  method?: string;
  requestId?: string;
  responseData?: any;
  retryAfter?: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableStatuses: number[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/**
 * API Error Handler Class
 */
export class APIErrorHandler {
  private retryConfig: RetryConfig;
  private requestInterceptors: Array<(config: RequestInit) => RequestInit> = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];
  private errorInterceptors: Array<(error: APIError) => APIError | Promise<APIError>> = [];

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Enhanced fetch with error handling and retry logic
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const requestConfig = this.applyRequestInterceptors(options);
    const startTime = Date.now();
    let lastError: APIError | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        // Add timeout if not specified
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        const response = await fetch(url, {
          ...requestConfig,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Apply response interceptors
        const processedResponse = await this.applyResponseInterceptors(response);

        // Check for HTTP errors
        if (!processedResponse.ok) {
          const apiError = await this.createAPIError(processedResponse, url, requestConfig.method || 'GET');
          throw apiError;
        }

        return processedResponse;

      } catch (error) {
        const apiError = await this.handleFetchError(error, url, requestConfig.method || 'GET', attempt);
        lastError = await this.applyErrorInterceptors(apiError);

        // Check if we should retry
        if (attempt < this.retryConfig.maxRetries && this.shouldRetry(apiError)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          continue;
        }

        // Log performance metrics
        this.logRequestMetrics(url, requestConfig.method || 'GET', startTime, attempt + 1, apiError);
        throw lastError;
      }
    }

    throw lastError || new Error('Unexpected error in API request');
  }

  /**
   * Create API error from response
   */
  private async createAPIError(response: Response, url: string, method: string): Promise<APIError> {
    let responseData: any = null;
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
        errorMessage = responseData.message || responseData.error || errorMessage;
      } else {
        responseData = await response.text();
      }
    } catch (parseError) {
      // Ignore parse errors, use default message
    }

    const apiError = new Error(errorMessage) as APIError;
    
    // Enhance with API-specific properties
    apiError.type = this.mapStatusToErrorType(response.status);
    apiError.severity = this.mapStatusToSeverity(response.status);
    apiError.status = response.status;
    apiError.statusText = response.statusText;
    apiError.endpoint = url;
    apiError.method = method;
    apiError.responseData = responseData;
    apiError.requestId = response.headers.get('x-request-id') || undefined;
    apiError.retryAfter = this.parseRetryAfter(response.headers.get('retry-after'));
    apiError.timestamp = new Date();
    apiError.url = window.location.href;
    apiError.userAgent = navigator.userAgent;
    apiError.recoverable = this.isRecoverableStatus(response.status);
    apiError.retryable = this.isRetryableStatus(response.status);

    return apiError;
  }

  /**
   * Handle fetch errors (network, timeout, etc.)
   */
  private async handleFetchError(error: any, url: string, method: string, attempt: number): Promise<APIError> {
    let apiError: APIError;

    if (error.name === 'AbortError') {
      apiError = new Error('Request timeout') as APIError;
      apiError.type = ErrorType.NETWORK_ERROR;
      apiError.severity = ErrorSeverity.MEDIUM;
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      apiError = new Error('Network error: Unable to connect') as APIError;
      apiError.type = ErrorType.NETWORK_ERROR;
      apiError.severity = ErrorSeverity.HIGH;
    } else {
      apiError = error as APIError;
      apiError.type = apiError.type || ErrorType.UNKNOWN_ERROR;
      apiError.severity = apiError.severity || ErrorSeverity.MEDIUM;
    }

    // Add API context
    apiError.endpoint = url;
    apiError.method = method;
    apiError.timestamp = new Date();
    apiError.url = window.location.href;
    apiError.userAgent = navigator.userAgent;
    apiError.context = {
      ...apiError.context,
      attempt: attempt + 1,
      maxRetries: this.retryConfig.maxRetries
    };

    return apiError;
  }

  /**
   * Map HTTP status to error type
   */
  private mapStatusToErrorType(status: number): ErrorType {
    if (status === 401) return ErrorType.PERMISSION_ERROR;
    if (status === 403) return ErrorType.PERMISSION_ERROR;
    if (status === 404) return ErrorType.DATA_ERROR;
    if (status === 422) return ErrorType.VALIDATION_ERROR;
    if (status === 429) return ErrorType.NETWORK_ERROR;
    if (status >= 500) return ErrorType.NETWORK_ERROR;
    return ErrorType.UNKNOWN_ERROR;
  }

  /**
   * Map HTTP status to severity
   */
  private mapStatusToSeverity(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status === 429) return ErrorSeverity.MEDIUM;
    if (status === 404) return ErrorSeverity.MEDIUM;
    if (status === 401 || status === 403) return ErrorSeverity.HIGH;
    if (status === 422) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Check if status is recoverable
   */
  private isRecoverableStatus(status: number): boolean {
    return [401, 422, 429].includes(status) || (status >= 500 && status < 600);
  }

  /**
   * Check if status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.retryConfig.retryableStatuses.includes(status);
  }

  /**
   * Parse retry-after header
   */
  private parseRetryAfter(retryAfter: string | null): number | undefined {
    if (!retryAfter) return undefined;
    
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? undefined : seconds * 1000; // Convert to milliseconds
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: APIError): boolean {
    if (!error.retryable) return false;
    if (error.status && !this.retryConfig.retryableStatuses.includes(error.status)) return false;
    return true;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Apply request interceptors
   */
  private applyRequestInterceptors(config: RequestInit): RequestInit {
    return this.requestInterceptors.reduce((acc, interceptor) => interceptor(acc), config);
  }

  /**
   * Apply response interceptors
   */
  private async applyResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse = response;
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    return processedResponse;
  }

  /**
   * Apply error interceptors
   */
  private async applyErrorInterceptors(error: APIError): Promise<APIError> {
    let processedError = error;
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }
    return processedError;
  }

  /**
   * Log request metrics
   */
  private logRequestMetrics(url: string, method: string, startTime: number, attempts: number, error?: APIError) {
    const duration = Date.now() - startTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.group(`📊 API Request Metrics`);
      console.log(`URL: ${method} ${url}`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Attempts: ${attempts}`);
      if (error) {
        console.log(`Error: ${error.message}`);
        console.log(`Status: ${error.status}`);
      }
      console.groupEnd();
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: (config: RequestInit) => RequestInit) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: (response: Response) => Response | Promise<Response>) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: (error: APIError) => APIError | Promise<APIError>) {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * Create a configured fetch function
   */
  createFetch() {
    return this.fetch.bind(this);
  }
}

/**
 * Default API error handler instance
 */
export const apiErrorHandler = new APIErrorHandler();

/**
 * Enhanced fetch with error handling
 */
export const enhancedFetch = apiErrorHandler.createFetch();

/**
 * API request wrapper with error handling
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await enhancedFetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  return response.json();
}

/**
 * GET request with error handling
 */
export async function apiGet<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request with error handling
 */
export async function apiPost<T = any>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * PUT request with error handling
 */
export async function apiPut<T = any>(url: string, data?: any, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * DELETE request with error handling
 */
export async function apiDelete<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: 'DELETE' });
}

/**
 * Upload file with error handling
 */
export async function apiUpload<T = any>(
  url: string,
  file: File,
  options: RequestInit = {}
): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await enhancedFetch(url, {
    ...options,
    method: 'POST',
    body: formData
  });

  return response.json();
}

export default APIErrorHandler;