import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRCMCache } from './useRCMCache';
import { APIResponse, ClaimData, SearchFilters } from '@/components/rcm/shared/types';

interface DenialReason {
  code: string;
  description: string;
  count: number;
  amount: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  category: 'clinical' | 'administrative' | 'technical' | 'authorization';
}

interface DenialTrend {
  date: string;
  count: number;
  amount: number;
  rate: number;
}

interface DenialAnalytics {
  summary: {
    totalDenials: number;
    denialRate: number;
    totalDeniedAmount: number;
    averageDenialAmount: number;
    topDenialReason: string;
    monthlyTrend: 'up' | 'down' | 'stable';
  };
  reasons: DenialReason[];
  trends: DenialTrend[];
  byPayer: Array<{
    payerName: string;
    denialCount: number;
    denialRate: number;
    amount: number;
  }>;
  byProvider: Array<{
    providerName: string;
    denialCount: number;
    denialRate: number;
    amount: number;
  }>;
  recoverableAmount: number;
  appealOpportunities: Array<{
    claimId: string;
    patientName: string;
    amount: number;
    denialReason: string;
    appealProbability: number;
    daysToAppeal: number;
  }>;
}

interface UseDenialAnalyticsOptions {
  timeframe?: string;
  filters?: SearchFilters;
  enabled?: boolean;
  staleTime?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseDenialAnalyticsReturn {
  analytics: DenialAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTimeframe: (timeframe: string) => void;
  updateFilters: (filters: SearchFilters) => void;
  getReasonsByCategory: (category: DenialReason['category']) => DenialReason[];
  getTopReasons: (limit?: number) => DenialReason[];
  getAppealableAmount: () => number;
  isStale: boolean;
  lastUpdated: Date | null;
}

// Mock API function - replace with actual API call
const fetchDenialAnalyticsAPI = async (
  token: string,
  timeframe: string,
  filters: SearchFilters = {}
): Promise<APIResponse<DenialAnalytics>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAnalytics: DenialAnalytics = {
        summary: {
          totalDenials: 156,
          denialRate: 12.5,
          totalDeniedAmount: 125000.00,
          averageDenialAmount: 801.28,
          topDenialReason: 'CO-45 - Charges exceed fee schedule',
          monthlyTrend: 'down'
        },
        reasons: [
          {
            code: 'CO-45',
            description: 'Charges exceed fee schedule',
            count: 45,
            amount: 35000.00,
            percentage: 28.8,
            trend: 'stable',
            category: 'administrative'
          },
          {
            code: 'CO-97',
            description: 'Payment adjusted because the benefit for this service is included in the payment/allowance for another service/procedure',
            count: 32,
            amount: 22000.00,
            percentage: 20.5,
            trend: 'decreasing',
            category: 'clinical'
          },
          {
            code: 'CO-16',
            description: 'Claim/service lacks information or has submission/billing error',
            count: 28,
            amount: 18500.00,
            percentage: 17.9,
            trend: 'increasing',
            category: 'administrative'
          },
          {
            code: 'CO-18',
            description: 'Duplicate claim/service',
            count: 25,
            amount: 15000.00,
            percentage: 16.0,
            trend: 'stable',
            category: 'technical'
          },
          {
            code: 'CO-197',
            description: 'Precertification/authorization/notification absent',
            count: 26,
            amount: 34500.00,
            percentage: 16.7,
            trend: 'increasing',
            category: 'authorization'
          }
        ],
        trends: [
          { date: '2024-01-01', count: 42, amount: 32000, rate: 13.2 },
          { date: '2024-01-02', count: 38, amount: 28500, rate: 12.8 },
          { date: '2024-01-03', count: 35, amount: 26000, rate: 11.9 },
          { date: '2024-01-04', count: 41, amount: 31500, rate: 12.5 }
        ],
        byPayer: [
          { payerName: 'Blue Cross Blue Shield', denialCount: 45, denialRate: 15.2, amount: 38000 },
          { payerName: 'Aetna', denialCount: 32, denialRate: 11.8, amount: 25000 },
          { payerName: 'UnitedHealth', denialCount: 28, denialRate: 10.5, amount: 22000 },
          { payerName: 'Cigna', denialCount: 25, denialRate: 12.1, amount: 20000 },
          { payerName: 'Humana', denialCount: 26, denialRate: 13.8, amount: 20000 }
        ],
        byProvider: [
          { providerName: 'Dr. Smith', denialCount: 35, denialRate: 14.2, amount: 28000 },
          { providerName: 'Dr. Johnson', denialCount: 28, denialRate: 11.5, amount: 22000 },
          { providerName: 'Dr. Williams', denialCount: 32, denialRate: 13.1, amount: 25000 },
          { providerName: 'Dr. Brown', denialCount: 25, denialRate: 10.8, amount: 20000 },
          { providerName: 'Dr. Davis', denialCount: 36, denialRate: 15.5, amount: 30000 }
        ],
        recoverableAmount: 75000.00,
        appealOpportunities: [
          {
            claimId: 'CLM-2024-001',
            patientName: 'John Doe',
            amount: 1250.00,
            denialReason: 'CO-45 - Charges exceed fee schedule',
            appealProbability: 85,
            daysToAppeal: 45
          },
          {
            claimId: 'CLM-2024-002',
            patientName: 'Jane Smith',
            amount: 850.00,
            denialReason: 'CO-16 - Claim lacks information',
            appealProbability: 92,
            daysToAppeal: 38
          },
          {
            claimId: 'CLM-2024-003',
            patientName: 'Bob Johnson',
            amount: 1500.00,
            denialReason: 'CO-197 - Authorization absent',
            appealProbability: 78,
            daysToAppeal: 52
          }
        ]
      };

      resolve({
        success: true,
        data: mockAnalytics
      });
    }, 900);
  });
};

export const useDenialAnalytics = (options: UseDenialAnalyticsOptions = {}): UseDenialAnalyticsReturn => {
  const {
    timeframe: initialTimeframe = '30d',
    filters: initialFilters = {},
    enabled = true,
    staleTime = 300000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 600000 // 10 minutes
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  // Create cache key based on options
  const cacheKey = useMemo(() => 
    `denial-analytics-${timeframe}-${JSON.stringify(filters)}-${token ? 'authenticated' : 'anonymous'}`,
    [timeframe, filters, token]
  );

  // Use cache for data fetching
  const {
    data: analytics,
    isLoading: loading,
    error,
    refetch,
    isStale,
    isCached
  } = useRCMCache<DenialAnalytics>(
    cacheKey,
    async () => {
      if (!token) {
        throw new Error('Authentication token is required');
      }
      
      const response = await fetchDenialAnalyticsAPI(token, timeframe, filters);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch denial analytics');
      }
      
      return response.data;
    },
    {
      staleTime,
      cacheTime: staleTime * 2,
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

  const updateTimeframe = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Memoized computed values
  const getReasonsByCategory = useCallback((category: DenialReason['category']) => {
    return analytics?.reasons.filter(reason => reason.category === category) || [];
  }, [analytics]);

  const getTopReasons = useCallback((limit = 5) => {
    return analytics?.reasons
      .sort((a, b) => b.count - a.count)
      .slice(0, limit) || [];
  }, [analytics]);

  const getAppealableAmount = useMemo(() => {
    return () => {
      return analytics?.appealOpportunities
        .filter(opp => opp.appealProbability > 70)
        .reduce((total, opp) => total + opp.amount, 0) || 0;
    };
  }, [analytics]);

  const lastUpdated = useMemo(() => 
    isCached ? new Date() : null, 
    [isCached]
  );

  return {
    analytics,
    loading,
    error,
    refetch,
    updateTimeframe,
    updateFilters,
    getReasonsByCategory,
    getTopReasons,
    getAppealableAmount,
    isStale,
    lastUpdated
  };
};