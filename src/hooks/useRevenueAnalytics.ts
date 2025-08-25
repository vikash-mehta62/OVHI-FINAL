import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRCMCache } from './useRCMCache';
import { APIResponse, RevenueData, SearchFilters, TimeSeriesDataPoint } from '@/components/rcm/shared/types';

interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  collectionRate: number;
  adjustmentRate: number;
  writeOffRate: number;
  averageReimbursementRate: number;
  revenuePerClaim: number;
  revenueGrowthRate: number;
  forecastedRevenue: number;
}

interface RevenueBreakdown {
  byPayer: Array<{
    payerName: string;
    revenue: number;
    percentage: number;
    claimCount: number;
    averageReimbursement: number;
    collectionRate: number;
  }>;
  byProvider: Array<{
    providerName: string;
    revenue: number;
    percentage: number;
    claimCount: number;
    averageClaimAmount: number;
    collectionRate: number;
  }>;
  byServiceType: Array<{
    serviceType: string;
    cptCode: string;
    revenue: number;
    volume: number;
    averageAmount: number;
    reimbursementRate: number;
  }>;
  byLocation: Array<{
    locationName: string;
    revenue: number;
    percentage: number;
    patientCount: number;
    averageRevenuePerPatient: number;
  }>;
}

interface RevenueForecast {
  nextMonth: {
    projected: number;
    confidence: number;
    factors: string[];
  };
  nextQuarter: {
    projected: number;
    confidence: number;
    factors: string[];
  };
  yearEnd: {
    projected: number;
    confidence: number;
    factors: string[];
  };
  scenarios: {
    optimistic: number;
    realistic: number;
    pessimistic: number;
  };
}

interface RevenueAnalytics {
  metrics: RevenueMetrics;
  trends: TimeSeriesDataPoint[];
  breakdown: RevenueBreakdown;
  forecast: RevenueForecast;
  benchmarks: {
    industryAverage: {
      collectionRate: number;
      daysInAR: number;
      denialRate: number;
    };
    performanceScore: number;
    recommendations: Array<{
      category: string;
      priority: 'high' | 'medium' | 'low';
      description: string;
      potentialImpact: number;
    }>;
  };
  cashFlow: {
    current: number;
    projected30Days: number;
    projected60Days: number;
    projected90Days: number;
    outstandingAR: number;
  };
}

interface UseRevenueAnalyticsOptions {
  timeframe?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
  filters?: SearchFilters;
  enabled?: boolean;
  staleTime?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  includeForecast?: boolean;
  includeBenchmarks?: boolean;
}

interface UseRevenueAnalyticsReturn {
  analytics: RevenueAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTimeframe: (timeframe: string) => void;
  updateGranularity: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  updateFilters: (filters: SearchFilters) => void;
  getRevenueByPeriod: (startDate: string, endDate: string) => number;
  getTopPerformers: (category: 'payer' | 'provider' | 'service', limit?: number) => any[];
  getGrowthRate: (periods: number) => number;
  isStale: boolean;
  lastUpdated: Date | null;
}

// Mock API function - replace with actual API call
const fetchRevenueAnalyticsAPI = async (
  token: string,
  timeframe: string,
  granularity: string,
  filters: SearchFilters = {},
  options: { includeForecast?: boolean; includeBenchmarks?: boolean } = {}
): Promise<APIResponse<RevenueAnalytics>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAnalytics: RevenueAnalytics = {
        metrics: {
          totalRevenue: 1250000.00,
          netRevenue: 1125000.00,
          grossRevenue: 1400000.00,
          collectionRate: 89.3,
          adjustmentRate: 8.9,
          writeOffRate: 1.8,
          averageReimbursementRate: 85.2,
          revenuePerClaim: 425.50,
          revenueGrowthRate: 12.5,
          forecastedRevenue: 1380000.00
        },
        trends: [
          { date: '2024-01-01', value: 42000, category: 'daily' },
          { date: '2024-01-02', value: 38500, category: 'daily' },
          { date: '2024-01-03', value: 45200, category: 'daily' },
          { date: '2024-01-04', value: 41800, category: 'daily' },
          { date: '2024-01-05', value: 47300, category: 'daily' },
          { date: '2024-01-06', value: 39600, category: 'daily' },
          { date: '2024-01-07', value: 44100, category: 'daily' }
        ],
        breakdown: {
          byPayer: [
            {
              payerName: 'Blue Cross Blue Shield',
              revenue: 425000.00,
              percentage: 34.0,
              claimCount: 1250,
              averageReimbursement: 340.00,
              collectionRate: 92.5
            },
            {
              payerName: 'Medicare',
              revenue: 312500.00,
              percentage: 25.0,
              claimCount: 1850,
              averageReimbursement: 169.00,
              collectionRate: 95.2
            },
            {
              payerName: 'Aetna',
              revenue: 250000.00,
              percentage: 20.0,
              claimCount: 875,
              averageReimbursement: 285.70,
              collectionRate: 88.7
            },
            {
              payerName: 'UnitedHealth',
              revenue: 187500.00,
              percentage: 15.0,
              claimCount: 625,
              averageReimbursement: 300.00,
              collectionRate: 87.3
            },
            {
              payerName: 'Self-Pay',
              revenue: 75000.00,
              percentage: 6.0,
              claimCount: 450,
              averageReimbursement: 166.67,
              collectionRate: 65.8
            }
          ],
          byProvider: [
            {
              providerName: 'Dr. Smith',
              revenue: 350000.00,
              percentage: 28.0,
              claimCount: 1200,
              averageClaimAmount: 291.67,
              collectionRate: 91.2
            },
            {
              providerName: 'Dr. Johnson',
              revenue: 275000.00,
              percentage: 22.0,
              claimCount: 950,
              averageClaimAmount: 289.47,
              collectionRate: 89.8
            },
            {
              providerName: 'Dr. Williams',
              revenue: 225000.00,
              percentage: 18.0,
              claimCount: 800,
              averageClaimAmount: 281.25,
              collectionRate: 88.5
            },
            {
              providerName: 'Dr. Brown',
              revenue: 200000.00,
              percentage: 16.0,
              claimCount: 700,
              averageClaimAmount: 285.71,
              collectionRate: 90.1
            },
            {
              providerName: 'Dr. Davis',
              revenue: 200000.00,
              percentage: 16.0,
              claimCount: 750,
              averageClaimAmount: 266.67,
              collectionRate: 87.9
            }
          ],
          byServiceType: [
            {
              serviceType: 'Office Visits',
              cptCode: '99213',
              revenue: 450000.00,
              volume: 2250,
              averageAmount: 200.00,
              reimbursementRate: 88.5
            },
            {
              serviceType: 'Procedures',
              cptCode: '12001',
              revenue: 325000.00,
              volume: 650,
              averageAmount: 500.00,
              reimbursementRate: 92.3
            },
            {
              serviceType: 'Consultations',
              cptCode: '99244',
              revenue: 275000.00,
              volume: 550,
              averageAmount: 500.00,
              reimbursementRate: 85.7
            },
            {
              serviceType: 'Diagnostics',
              cptCode: '73060',
              revenue: 200000.00,
              volume: 800,
              averageAmount: 250.00,
              reimbursementRate: 90.1
            }
          ],
          byLocation: [
            {
              locationName: 'Main Office',
              revenue: 625000.00,
              percentage: 50.0,
              patientCount: 2500,
              averageRevenuePerPatient: 250.00
            },
            {
              locationName: 'North Branch',
              revenue: 375000.00,
              percentage: 30.0,
              patientCount: 1500,
              averageRevenuePerPatient: 250.00
            },
            {
              locationName: 'South Branch',
              revenue: 250000.00,
              percentage: 20.0,
              patientCount: 1000,
              averageRevenuePerPatient: 250.00
            }
          ]
        },
        forecast: {
          nextMonth: {
            projected: 115000.00,
            confidence: 85,
            factors: ['Seasonal trends', 'Historical performance', 'Current pipeline']
          },
          nextQuarter: {
            projected: 345000.00,
            confidence: 78,
            factors: ['Market conditions', 'Provider capacity', 'Payer mix changes']
          },
          yearEnd: {
            projected: 1380000.00,
            confidence: 72,
            factors: ['Economic outlook', 'Regulatory changes', 'Competition']
          },
          scenarios: {
            optimistic: 1450000.00,
            realistic: 1380000.00,
            pessimistic: 1280000.00
          }
        },
        benchmarks: {
          industryAverage: {
            collectionRate: 85.5,
            daysInAR: 45,
            denialRate: 15.2
          },
          performanceScore: 87,
          recommendations: [
            {
              category: 'Collections',
              priority: 'high',
              description: 'Improve self-pay collection rate through payment plans',
              potentialImpact: 25000.00
            },
            {
              category: 'Denials',
              priority: 'medium',
              description: 'Reduce administrative denials through better documentation',
              potentialImpact: 18000.00
            },
            {
              category: 'A/R Management',
              priority: 'medium',
              description: 'Implement automated follow-up for aging accounts',
              potentialImpact: 15000.00
            }
          ]
        },
        cashFlow: {
          current: 125000.00,
          projected30Days: 95000.00,
          projected60Days: 75000.00,
          projected90Days: 45000.00,
          outstandingAR: 340000.00
        }
      };

      resolve({
        success: true,
        data: mockAnalytics
      });
    }, 1100);
  });
};

export const useRevenueAnalytics = (options: UseRevenueAnalyticsOptions = {}): UseRevenueAnalyticsReturn => {
  const {
    timeframe: initialTimeframe = '30d',
    granularity: initialGranularity = 'daily',
    filters: initialFilters = {},
    enabled = true,
    staleTime = 300000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 600000, // 10 minutes
    includeForecast = true,
    includeBenchmarks = true
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [granularity, setGranularity] = useState(initialGranularity);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);

  // Create cache key based on options
  const cacheKey = useMemo(() => 
    `revenue-analytics-${timeframe}-${granularity}-${JSON.stringify(filters)}-${includeForecast}-${includeBenchmarks}-${token ? 'authenticated' : 'anonymous'}`,
    [timeframe, granularity, filters, includeForecast, includeBenchmarks, token]
  );

  // Use cache for data fetching
  const {
    data: analytics,
    isLoading: loading,
    error,
    refetch,
    isStale,
    isCached
  } = useRCMCache<RevenueAnalytics>(
    cacheKey,
    async () => {
      if (!token) {
        throw new Error('Authentication token is required');
      }
      
      const response = await fetchRevenueAnalyticsAPI(
        token, 
        timeframe, 
        granularity, 
        filters,
        { includeForecast, includeBenchmarks }
      );
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch revenue analytics');
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

  const updateGranularity = useCallback((newGranularity: 'daily' | 'weekly' | 'monthly') => {
    setGranularity(newGranularity);
  }, []);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Memoized computed values
  const getRevenueByPeriod = useCallback((startDate: string, endDate: string) => {
    if (!analytics?.trends) return 0;
    
    return analytics.trends
      .filter(point => point.date >= startDate && point.date <= endDate)
      .reduce((total, point) => total + point.value, 0);
  }, [analytics]);

  const getTopPerformers = useCallback((
    category: 'payer' | 'provider' | 'service', 
    limit = 5
  ) => {
    if (!analytics?.breakdown) return [];
    
    switch (category) {
      case 'payer':
        return analytics.breakdown.byPayer
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      case 'provider':
        return analytics.breakdown.byProvider
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      case 'service':
        return analytics.breakdown.byServiceType
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, limit);
      default:
        return [];
    }
  }, [analytics]);

  const getGrowthRate = useCallback((periods: number) => {
    if (!analytics?.trends || analytics.trends.length < periods + 1) return 0;
    
    const recent = analytics.trends.slice(-periods);
    const previous = analytics.trends.slice(-(periods * 2), -periods);
    
    const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, point) => sum + point.value, 0) / previous.length;
    
    return previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;
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
    updateGranularity,
    updateFilters,
    getRevenueByPeriod,
    getTopPerformers,
    getGrowthRate,
    isStale,
    lastUpdated
  };
};