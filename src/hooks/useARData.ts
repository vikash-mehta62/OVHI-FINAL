import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PatientAccountData, AgingBucket, SearchFilters, APIResponse } from '@/components/rcm/shared/types';

interface ARSummary {
  totalBalance: number;
  insuranceBalance: number;
  patientBalance: number;
  averageDaysInAR: number;
  agingBreakdown: Array<{
    bucket: AgingBucket;
    amount: number;
    count: number;
    percentage: number;
  }>;
  collectionOpportunities: Array<{
    priority: 'urgent' | 'high' | 'medium' | 'low';
    count: number;
    amount: number;
  }>;
}

interface UseARDataOptions {
  filters?: SearchFilters;
  enabled?: boolean;
  staleTime?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseARDataReturn {
  accounts: PatientAccountData[];
  summary: ARSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateFilters: (filters: SearchFilters) => void;
  isStale: boolean;
  lastUpdated: Date | null;
  getAccountsByBucket: (bucket: AgingBucket) => PatientAccountData[];
  getHighPriorityAccounts: () => PatientAccountData[];
}

// Mock API function - replace with actual API call
const fetchARDataAPI = async (
  token: string, 
  filters: SearchFilters = {}
): Promise<APIResponse<{ accounts: PatientAccountData[]; summary: ARSummary }>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAccounts: PatientAccountData[] = [
        {
          id: '1',
          patientId: 'PAT-001',
          patientName: 'John Doe',
          balance: 1250.00,
          insuranceBalance: 1000.00,
          patientBalance: 250.00,
          lastPaymentDate: '2024-01-15',
          lastPaymentAmount: 500.00,
          status: 'current',
          agingBucket: '0-30',
          collectionStatus: 'not_started',
          contactAttempts: 0
        },
        {
          id: '2',
          patientId: 'PAT-002',
          patientName: 'Jane Smith',
          balance: 2100.75,
          insuranceBalance: 1500.00,
          patientBalance: 600.75,
          lastPaymentDate: '2023-12-20',
          lastPaymentAmount: 300.00,
          status: 'overdue',
          agingBucket: '91-120',
          collectionStatus: 'second_notice',
          contactAttempts: 3,
          lastContactDate: '2024-01-10'
        },
        {
          id: '3',
          patientId: 'PAT-003',
          patientName: 'Bob Johnson',
          balance: 850.50,
          insuranceBalance: 600.00,
          patientBalance: 250.50,
          status: 'overdue',
          agingBucket: '61-90',
          collectionStatus: 'first_notice',
          contactAttempts: 1,
          lastContactDate: '2024-01-05'
        }
      ];

      const mockSummary: ARSummary = {
        totalBalance: 125000.00,
        insuranceBalance: 85000.00,
        patientBalance: 40000.00,
        averageDaysInAR: 32,
        agingBreakdown: [
          { bucket: '0-30', amount: 56250.00, count: 45, percentage: 45 },
          { bucket: '31-60', amount: 33750.00, count: 27, percentage: 27 },
          { bucket: '61-90', amount: 17500.00, count: 14, percentage: 14 },
          { bucket: '91-120', amount: 11250.00, count: 9, percentage: 9 },
          { bucket: '120+', amount: 6250.00, count: 5, percentage: 5 }
        ],
        collectionOpportunities: [
          { priority: 'urgent', count: 8, amount: 15000.00 },
          { priority: 'high', count: 15, amount: 25000.00 },
          { priority: 'medium', count: 25, amount: 35000.00 },
          { priority: 'low', count: 52, amount: 50000.00 }
        ]
      };

      resolve({
        success: true,
        data: {
          accounts: mockAccounts,
          summary: mockSummary
        }
      });
    }, 800);
  });
};

export const useARData = (options: UseARDataOptions = {}): UseARDataReturn => {
  const {
    filters: initialFilters = {},
    enabled = true,
    staleTime = 300000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 600000 // 10 minutes
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [accounts, setAccounts] = useState<PatientAccountData[]>([]);
  const [summary, setSummary] = useState<ARSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchARData = useCallback(async () => {
    if (!enabled || !token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchARDataAPI(token, filters);
      
      if (response.success) {
        setAccounts(response.data.accounts);
        setSummary(response.data.summary);
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        throw new Error(response.message || 'Failed to fetch A/R data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('A/R Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filters, enabled]);

  // Initial fetch and filter changes
  useEffect(() => {
    fetchARData();
  }, [fetchARData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      setIsStale(true);
      fetchARData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, enabled, fetchARData]);

  // Mark data as stale after staleTime
  useEffect(() => {
    if (!lastUpdated || !enabled) return;

    const timeout = setTimeout(() => {
      setIsStale(true);
    }, staleTime);

    return () => clearTimeout(timeout);
  }, [lastUpdated, staleTime, enabled]);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  // Memoized computed values
  const getAccountsByBucket = useCallback((bucket: AgingBucket) => {
    return accounts.filter(account => account.agingBucket === bucket);
  }, [accounts]);

  const getHighPriorityAccounts = useMemo(() => {
    return () => accounts.filter(account => {
      const daysInAR = account.agingBucket === '120+' ? 150 : 
                      account.agingBucket === '91-120' ? 105 :
                      account.agingBucket === '61-90' ? 75 :
                      account.agingBucket === '31-60' ? 45 : 15;
      
      return daysInAR > 90 || account.balance > 5000;
    });
  }, [accounts]);

  return {
    accounts,
    summary,
    loading,
    error,
    refetch: fetchARData,
    updateFilters,
    isStale,
    lastUpdated,
    getAccountsByBucket,
    getHighPriorityAccounts
  };
};