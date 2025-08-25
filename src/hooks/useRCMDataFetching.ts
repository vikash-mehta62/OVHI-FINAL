import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRCMData } from './useRCMData';
import { useClaims } from './useClaims';
import { useARData } from './useARData';
import { useCollections } from './useCollections';
import { usePayments } from './usePayments';
import { useDenialAnalytics } from './useDenialAnalytics';
import { useRevenueAnalytics } from './useRevenueAnalytics';
import { useRCMCache, rcmCacheUtils } from './useRCMCache';
import { SearchFilters, PaginationParams } from '@/components/rcm/shared/types';

interface RCMDataFetchingOptions {
  timeframe?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
  modules?: Array<'dashboard' | 'claims' | 'ar' | 'collections' | 'payments' | 'denials' | 'revenue'>;
  staleWhileRevalidate?: boolean;
  backgroundRefresh?: boolean;
}

interface RCMDataState {
  dashboard: ReturnType<typeof useRCMData>;
  claims: ReturnType<typeof useClaims>;
  ar: ReturnType<typeof useARData>;
  collections: ReturnType<typeof useCollections>;
  payments: ReturnType<typeof usePayments>;
  denials: ReturnType<typeof useDenialAnalytics>;
  revenue: ReturnType<typeof useRevenueAnalytics>;
}

interface UseRCMDataFetchingReturn {
  data: RCMDataState;
  loading: {
    any: boolean;
    all: boolean;
    dashboard: boolean;
    claims: boolean;
    ar: boolean;
    collections: boolean;
    payments: boolean;
    denials: boolean;
    revenue: boolean;
  };
  error: {
    any: boolean;
    dashboard: string | null;
    claims: string | null;
    ar: string | null;
    collections: string | null;
    payments: string | null;
    denials: string | null;
    revenue: string | null;
  };
  refetch: {
    all: () => Promise<void>;
    dashboard: () => Promise<void>;
    claims: () => Promise<void>;
    ar: () => Promise<void>;
    collections: () => Promise<void>;
    payments: () => Promise<void>;
    denials: () => Promise<void>;
    revenue: () => Promise<void>;
  };
  isStale: {
    any: boolean;
    dashboard: boolean;
    claims: boolean;
    ar: boolean;
    collections: boolean;
    payments: boolean;
    denials: boolean;
    revenue: boolean;
  };
  lastUpdated: {
    dashboard: Date | null;
    claims: Date | null;
    ar: Date | null;
    collections: Date | null;
    payments: Date | null;
    denials: Date | null;
    revenue: Date | null;
  };
  updateTimeframe: (timeframe: string) => void;
  updateFilters: (module: keyof RCMDataState, filters: SearchFilters) => void;
  updatePagination: (module: 'claims', pagination: Partial<PaginationParams>) => void;
  invalidateCache: (modules?: Array<keyof RCMDataState>) => void;
  preloadData: (modules: Array<keyof RCMDataState>) => Promise<void>;
  getDataFreshness: () => {
    module: keyof RCMDataState;
    lastUpdated: Date | null;
    isStale: boolean;
    cacheHit: boolean;
  }[];
}

export const useRCMDataFetching = (options: RCMDataFetchingOptions = {}): UseRCMDataFetchingReturn => {
  const {
    timeframe: initialTimeframe = '30d',
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enabled = true,
    modules = ['dashboard', 'claims', 'ar', 'collections', 'payments', 'denials', 'revenue'],
    staleWhileRevalidate = true,
    backgroundRefresh = true
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  const [timeframe, setTimeframe] = useState(initialTimeframe);

  // Individual hook configurations
  const hookOptions = useMemo(() => ({
    timeframe,
    autoRefresh: autoRefresh && backgroundRefresh,
    refreshInterval,
    enabled: enabled && !!token,
    staleTime: staleWhileRevalidate ? refreshInterval : refreshInterval / 2
  }), [timeframe, autoRefresh, backgroundRefresh, refreshInterval, enabled, token, staleWhileRevalidate]);

  // Initialize hooks conditionally based on modules
  const dashboard = useRCMData(
    modules.includes('dashboard') ? hookOptions : { ...hookOptions, enabled: false }
  );

  const claims = useClaims(
    modules.includes('claims') ? {
      ...hookOptions,
      pagination: { page: 1, limit: 20 }
    } : { enabled: false }
  );

  const ar = useARData(
    modules.includes('ar') ? hookOptions : { ...hookOptions, enabled: false }
  );

  const collections = useCollections(
    modules.includes('collections') ? hookOptions : { ...hookOptions, enabled: false }
  );

  const payments = usePayments(
    modules.includes('payments') ? hookOptions : { ...hookOptions, enabled: false }
  );

  const denials = useDenialAnalytics(
    modules.includes('denials') ? hookOptions : { ...hookOptions, enabled: false }
  );

  const revenue = useRevenueAnalytics(
    modules.includes('revenue') ? {
      ...hookOptions,
      includeForecast: true,
      includeBenchmarks: true
    } : { ...hookOptions, enabled: false }
  );

  // Aggregate data state
  const data: RCMDataState = useMemo(() => ({
    dashboard,
    claims,
    ar,
    collections,
    payments,
    denials,
    revenue
  }), [dashboard, claims, ar, collections, payments, denials, revenue]);

  // Aggregate loading states
  const loading = useMemo(() => {
    const states = {
      dashboard: dashboard.loading,
      claims: claims.loading,
      ar: ar.loading,
      collections: collections.loading,
      payments: payments.loading,
      denials: denials.loading,
      revenue: revenue.loading
    };

    return {
      ...states,
      any: Object.values(states).some(Boolean),
      all: Object.values(states).every(Boolean)
    };
  }, [dashboard.loading, claims.loading, ar.loading, collections.loading, payments.loading, denials.loading, revenue.loading]);

  // Aggregate error states
  const error = useMemo(() => {
    const states = {
      dashboard: dashboard.error,
      claims: claims.error,
      ar: ar.error,
      collections: collections.error,
      payments: payments.error,
      denials: denials.error,
      revenue: revenue.error
    };

    return {
      ...states,
      any: Object.values(states).some(Boolean)
    };
  }, [dashboard.error, claims.error, ar.error, collections.error, payments.error, denials.error, revenue.error]);

  // Aggregate stale states
  const isStale = useMemo(() => {
    const states = {
      dashboard: dashboard.isStale,
      claims: claims.isStale,
      ar: ar.isStale,
      collections: collections.isStale,
      payments: payments.isStale,
      denials: denials.isStale,
      revenue: revenue.isStale
    };

    return {
      ...states,
      any: Object.values(states).some(Boolean)
    };
  }, [dashboard.isStale, claims.isStale, ar.isStale, collections.isStale, payments.isStale, denials.isStale, revenue.isStale]);

  // Aggregate last updated states
  const lastUpdated = useMemo(() => ({
    dashboard: dashboard.lastUpdated,
    claims: claims.lastUpdated,
    ar: ar.lastUpdated,
    collections: collections.lastUpdated,
    payments: payments.lastUpdated,
    denials: denials.lastUpdated,
    revenue: revenue.lastUpdated
  }), [dashboard.lastUpdated, claims.lastUpdated, ar.lastUpdated, collections.lastUpdated, payments.lastUpdated, denials.lastUpdated, revenue.lastUpdated]);

  // Refetch functions
  const refetch = useMemo(() => ({
    dashboard: dashboard.refetch,
    claims: claims.refetch,
    ar: ar.refetch,
    collections: collections.refetch,
    payments: payments.refetch,
    denials: denials.refetch,
    revenue: revenue.refetch,
    all: async () => {
      const promises = [];
      if (modules.includes('dashboard')) promises.push(dashboard.refetch());
      if (modules.includes('claims')) promises.push(claims.refetch());
      if (modules.includes('ar')) promises.push(ar.refetch());
      if (modules.includes('collections')) promises.push(collections.refetch());
      if (modules.includes('payments')) promises.push(payments.refetch());
      if (modules.includes('denials')) promises.push(denials.refetch());
      if (modules.includes('revenue')) promises.push(revenue.refetch());
      
      await Promise.allSettled(promises);
    }
  }), [dashboard.refetch, claims.refetch, ar.refetch, collections.refetch, payments.refetch, denials.refetch, revenue.refetch, modules]);

  // Update functions
  const updateTimeframe = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const updateFilters = useCallback((module: keyof RCMDataState, filters: SearchFilters) => {
    switch (module) {
      case 'claims':
        claims.updateFilters(filters);
        break;
      case 'ar':
        ar.updateFilters(filters);
        break;
      case 'denials':
        denials.updateFilters(filters);
        break;
      case 'revenue':
        revenue.updateFilters(filters);
        break;
      default:
        console.warn(`Filters not supported for module: ${module}`);
    }
  }, [claims, ar, denials, revenue]);

  const updatePagination = useCallback((module: 'claims', pagination: Partial<PaginationParams>) => {
    if (module === 'claims') {
      claims.updatePagination(pagination);
    }
  }, [claims]);

  // Cache management
  const invalidateCache = useCallback((targetModules?: Array<keyof RCMDataState>) => {
    const modulesToInvalidate = targetModules || modules;
    const patterns = modulesToInvalidate.map(module => new RegExp(`^${module}-`));
    
    patterns.forEach(pattern => {
      rcmCacheUtils.invalidatePattern(pattern);
    });
  }, [modules]);

  const preloadData = useCallback(async (targetModules: Array<keyof RCMDataState>) => {
    const promises = targetModules.map(async (module) => {
      try {
        switch (module) {
          case 'dashboard':
            await dashboard.refetch();
            break;
          case 'claims':
            await claims.refetch();
            break;
          case 'ar':
            await ar.refetch();
            break;
          case 'collections':
            await collections.refetch();
            break;
          case 'payments':
            await payments.refetch();
            break;
          case 'denials':
            await denials.refetch();
            break;
          case 'revenue':
            await revenue.refetch();
            break;
        }
      } catch (error) {
        console.warn(`Failed to preload ${module} data:`, error);
      }
    });

    await Promise.allSettled(promises);
  }, [dashboard, claims, ar, collections, payments, denials, revenue]);

  const getDataFreshness = useCallback(() => {
    return modules.map(module => ({
      module,
      lastUpdated: lastUpdated[module],
      isStale: isStale[module],
      cacheHit: !!lastUpdated[module] && !isStale[module]
    }));
  }, [modules, lastUpdated, isStale]);

  // Background refresh for stale data
  useEffect(() => {
    if (!backgroundRefresh || !staleWhileRevalidate || !enabled) return;

    const interval = setInterval(() => {
      // Only refresh stale modules
      const staleModules = modules.filter(module => isStale[module]);
      
      if (staleModules.length > 0) {
        console.log('Background refreshing stale modules:', staleModules);
        staleModules.forEach(module => {
          refetch[module]().catch(error => {
            console.warn(`Background refresh failed for ${module}:`, error);
          });
        });
      }
    }, refreshInterval / 2); // Check more frequently than refresh interval

    return () => clearInterval(interval);
  }, [backgroundRefresh, staleWhileRevalidate, enabled, modules, isStale, refetch, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts or intervals
      // This is handled by individual hooks
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    lastUpdated,
    updateTimeframe,
    updateFilters,
    updatePagination,
    invalidateCache,
    preloadData,
    getDataFreshness
  };
};