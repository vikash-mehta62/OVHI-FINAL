import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ClaimData, SearchFilters, PaginationParams, APIResponse } from '@/components/rcm/shared/types';

interface UseClaimsOptions {
  filters?: SearchFilters;
  pagination?: PaginationParams;
  enabled?: boolean;
  staleTime?: number;
}

interface UseClaimsReturn {
  claims: ClaimData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  refetch: () => Promise<void>;
  updateFilters: (filters: SearchFilters) => void;
  updatePagination: (pagination: Partial<PaginationParams>) => void;
  isStale: boolean;
  lastUpdated: Date | null;
}

// Mock API function - replace with actual API call
const fetchClaimsAPI = async (
  token: string, 
  filters: SearchFilters = {}, 
  pagination: PaginationParams = { page: 1, limit: 20 }
): Promise<APIResponse<{ claims: ClaimData[]; total: number }>> => {
  // This would be replaced with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockClaims: ClaimData[] = [
        {
          id: '1',
          claimNumber: 'CLM-2024-001',
          patientName: 'John Doe',
          patientId: 'PAT-001',
          serviceDate: '2024-01-15',
          submissionDate: '2024-01-16',
          amount: 1250.00,
          paidAmount: 1250.00,
          status: 'paid',
          payerName: 'Blue Cross Blue Shield',
          cptCodes: ['99213', '90834'],
          diagnosisCodes: ['F32.9'],
          lastUpdated: '2024-01-20',
          daysInAR: 12
        },
        {
          id: '2',
          claimNumber: 'CLM-2024-002',
          patientName: 'Jane Smith',
          patientId: 'PAT-002',
          serviceDate: '2024-01-18',
          submissionDate: '2024-01-19',
          amount: 850.50,
          status: 'pending',
          payerName: 'Aetna',
          cptCodes: ['99214'],
          diagnosisCodes: ['M79.3'],
          lastUpdated: '2024-01-22',
          daysInAR: 25
        }
      ];

      resolve({
        success: true,
        data: {
          claims: mockClaims,
          total: 150
        },
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: 150,
          totalPages: Math.ceil(150 / pagination.limit)
        }
      });
    }, 1000);
  });
};

export const useClaims = (options: UseClaimsOptions = {}): UseClaimsReturn => {
  const {
    filters: initialFilters = {},
    pagination: initialPagination = { page: 1, limit: 20 },
    enabled = true,
    staleTime = 300000 // 5 minutes
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [claims, setClaims] = useState<ClaimData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationParams>(initialPagination);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchClaims = useCallback(async () => {
    if (!enabled || !token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchClaimsAPI(token, filters, pagination);
      
      if (response.success) {
        setClaims(response.data.claims);
        setTotalCount(response.data.total);
        setTotalPages(response.pagination?.totalPages || 0);
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        throw new Error(response.message || 'Failed to fetch claims');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Claims fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, filters, pagination, enabled]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

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
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const updatePagination = useCallback((newPagination: Partial<PaginationParams>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  // Memoized computed values
  const currentPage = useMemo(() => pagination.page, [pagination.page]);

  return {
    claims,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    refetch: fetchClaims,
    updateFilters,
    updatePagination,
    isStale,
    lastUpdated
  };
};