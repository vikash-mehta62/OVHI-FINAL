// RCM Data Fetching Hooks
// Export all custom hooks for easy importing

// Core RCM data hooks
export { useRCMData } from './useRCMData';
export { useClaims } from './useClaims';
export { useARData } from './useARData';
export { useCollections } from './useCollections';
export { usePayments } from './usePayments';

// Analytics hooks
export { useDenialAnalytics } from './useDenialAnalytics';
export { useRevenueAnalytics } from './useRevenueAnalytics';

// Comprehensive data fetching hook
export { useRCMDataFetching } from './useRCMDataFetching';

// Cache management hook
export { useRCMCache, rcmCacheUtils } from './useRCMCache';

// Re-export types for convenience
export type {
  DashboardData,
  KPIData,
  ClaimData,
  PatientAccountData,
  PaymentData,
  SearchFilters,
  PaginationParams,
  APIResponse,
  ClaimStatus,
  AccountStatus,
  CollectionStatus,
  PaymentMethod,
  PaymentStatus,
  AgingBucket
} from '@/components/rcm/shared/types';