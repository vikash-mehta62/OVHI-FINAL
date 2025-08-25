import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getRCMDashboardDataAPI } from '@/services/operations/rcm';
import { DashboardData, KPIData, APIResponse } from '@/components/rcm/shared/types';
import { useRCMCache } from './useRCMCache';

interface UseRCMDataOptions {
  timeframe?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseRCMDataReturn {
  data: DashboardData | null;
  kpis: KPIData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  lastUpdated: Date | null;
}

export const useRCMData = (options: UseRCMDataOptions = {}): UseRCMDataReturn => {
  const {
    timeframe = '30d',
    autoRefresh = false,
    refreshInterval = 300000, // 5 minutes
    enabled = true
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  // Create cache key based on options
  const cacheKey = useMemo(() => 
    `rcm-dashboard-${timeframe}-${token ? 'authenticated' : 'anonymous'}`,
    [timeframe, token]
  );

  // Use cache for data fetching
  const {
    data,
    isLoading: loading,
    error,
    refetch,
    isStale,
    isCached
  } = useRCMCache<DashboardData>(
    cacheKey,
    async () => {
      if (!token) {
        throw new Error('Authentication token is required');
      }
      
      const response = await getRCMDashboardDataAPI(token, timeframe);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch RCM data');
      }
      
      return response.data;
    },
    {
      staleTime: refreshInterval,
      cacheTime: refreshInterval * 2,
      enabled: enabled && !!token
    }
  );

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled || !token) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, enabled, token, refetch]);

  // Computed values
  const kpis = useMemo(() => data?.kpis || null, [data]);
  const lastUpdated = useMemo(() => 
    isCached ? new Date() : null, 
    [isCached]
  );

  return {
    data,
    kpis,
    loading,
    error,
    refetch,
    isStale,
    lastUpdated
  };
};