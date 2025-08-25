/**
 * RCM Frontend Utilities Index
 * Centralized exports for all RCM utility functions
 */

// Formatting utilities
export * from './rcmFormatters';

// Validation utilities
export * from './rcmValidation';

// Calculation utilities
export * from './rcmCalculations';

// Helper utilities
export * from './rcmHelpers';

// Re-export commonly used functions for convenience
export {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeProps,
  getPriorityBadgeProps,
  formatPercentage,
  formatLargeNumber,
  getRelativeTime,
  calculateDaysBetween,
  formatAgingBucket,
  getAgingBucketColor,
  getCollectionPriority,
  formatPatientName,
  formatClaimAmount,
  formatCollectionRate,
  formatDenialRate
} from './rcmFormatters';

export {
  validatePatientInfo,
  validateClaimInfo,
  validateInsuranceInfo,
  validatePaymentInfo,
  isValidSSN,
  isValidPhoneNumber,
  isValidEmail,
  isValidCPTCode,
  isValidDiagnosisCode,
  validateDateRange,
  validateAmountRange,
  sanitizeInput,
  validateSearchQuery
} from './rcmValidation';

export {
  calculateCollectionRate,
  calculateNetCollectionRate,
  calculateDenialRate,
  calculateDaysInAR,
  calculateAgingAnalysis,
  calculateCollectionMetrics,
  calculatePaymentSuccessRate,
  calculateRevenueTrend,
  calculateClaimProcessingEfficiency,
  calculatePayerPerformance,
  calculateBenchmarkComparisons
} from './rcmCalculations';

export {
  sortData,
  filterData,
  paginateData,
  getNestedValue,
  setNestedValue,
  debounce,
  throttle,
  generateId,
  deepClone,
  isEmpty,
  deepMerge,
  objectToQueryString,
  queryStringToObject,
  formatFileSize,
  downloadFile,
  copyToClipboard,
  getBrowserInfo,
  isMobile,
  getViewportDimensions,
  scrollToElement,
  storage
} from './rcmHelpers';

// Type exports
export type {
  BadgeProps,
  ValidationResult,
  KPICalculations,
  AgingAnalysis,
  CollectionMetrics,
  SortConfig,
  FilterConfig,
  PaginationConfig
} from './rcmFormatters';

export type { ValidationResult } from './rcmValidation';
export type { KPICalculations, AgingAnalysis, CollectionMetrics } from './rcmCalculations';
export type { SortConfig, FilterConfig, PaginationConfig } from './rcmHelpers';