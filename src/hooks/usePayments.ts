import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { paymentAPI } from '@/services/operations/payments';
import { PaymentData, PaymentMethod, PaymentStatus, APIResponse } from '@/components/rcm/shared/types';

interface PaymentTransaction {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  patientId: string;
  patientName: string;
  claimId?: string;
  transactionDate: string;
  processingTime?: number;
  gatewayResponse?: string;
  fees: number;
  netAmount: number;
  gatewayName: string;
}

interface UsePaymentsOptions {
  timeframe?: string;
  method?: PaymentMethod[];
  status?: PaymentStatus[];
  enabled?: boolean;
  staleTime?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UsePaymentsReturn {
  paymentData: PaymentData | null;
  transactions: PaymentTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateTimeframe: (timeframe: string) => void;
  filterByMethod: (methods: PaymentMethod[]) => void;
  filterByStatus: (statuses: PaymentStatus[]) => void;
  getTransactionsByMethod: (method: PaymentMethod) => PaymentTransaction[];
  getTransactionsByStatus: (status: PaymentStatus) => PaymentTransaction[];
  getTotalByMethod: (method: PaymentMethod) => number;
  getSuccessRate: () => number;
  getAverageTransactionAmount: () => number;
  isStale: boolean;
  lastUpdated: Date | null;
}

// Mock API function for transactions - replace with actual API call
const fetchPaymentTransactionsAPI = async (
  token: string,
  options: {
    timeframe?: string;
    method?: PaymentMethod[];
    status?: PaymentStatus[];
  } = {}
): Promise<APIResponse<PaymentTransaction[]>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockTransactions: PaymentTransaction[] = [
        {
          id: 'TXN-001',
          amount: 250.00,
          method: 'credit_card',
          status: 'completed',
          patientId: 'PAT-001',
          patientName: 'John Doe',
          claimId: 'CLM-001',
          transactionDate: '2024-01-15T10:30:00Z',
          processingTime: 2.5,
          gatewayResponse: 'approved',
          fees: 7.50,
          netAmount: 242.50,
          gatewayName: 'Stripe'
        },
        {
          id: 'TXN-002',
          amount: 150.00,
          method: 'ach',
          status: 'completed',
          patientId: 'PAT-002',
          patientName: 'Jane Smith',
          transactionDate: '2024-01-14T14:20:00Z',
          processingTime: 1.8,
          gatewayResponse: 'approved',
          fees: 1.50,
          netAmount: 148.50,
          gatewayName: 'Stripe'
        },
        {
          id: 'TXN-003',
          amount: 75.00,
          method: 'credit_card',
          status: 'failed',
          patientId: 'PAT-003',
          patientName: 'Bob Johnson',
          transactionDate: '2024-01-13T16:45:00Z',
          processingTime: 3.2,
          gatewayResponse: 'declined',
          fees: 0,
          netAmount: 0,
          gatewayName: 'Square'
        }
      ];

      resolve({
        success: true,
        data: mockTransactions
      });
    }, 600);
  });
};

export const usePayments = (options: UsePaymentsOptions = {}): UsePaymentsReturn => {
  const {
    timeframe: initialTimeframe = '30d',
    method: initialMethods,
    status: initialStatuses,
    enabled = true,
    staleTime = 300000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 300000 // 5 minutes
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState(initialTimeframe);
  const [methodFilter, setMethodFilter] = useState<PaymentMethod[] | undefined>(initialMethods);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus[] | undefined>(initialStatuses);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchPaymentData = useCallback(async () => {
    if (!enabled || !token) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch both analytics and transactions
      const [analyticsResponse, transactionsResponse] = await Promise.all([
        paymentAPI.getPaymentAnalytics(token, { timeframe }),
        fetchPaymentTransactionsAPI(token, {
          timeframe,
          method: methodFilter,
          status: statusFilter
        })
      ]);
      
      if (analyticsResponse.success) {
        setPaymentData(analyticsResponse.data);
      }
      
      if (transactionsResponse.success) {
        setTransactions(transactionsResponse.data);
      }
      
      setLastUpdated(new Date());
      setIsStale(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Payment data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, timeframe, methodFilter, statusFilter, enabled]);

  // Initial fetch and dependency changes
  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      setIsStale(true);
      fetchPaymentData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, enabled, fetchPaymentData]);

  // Mark data as stale after staleTime
  useEffect(() => {
    if (!lastUpdated || !enabled) return;

    const timeout = setTimeout(() => {
      setIsStale(true);
    }, staleTime);

    return () => clearTimeout(timeout);
  }, [lastUpdated, staleTime, enabled]);

  const updateTimeframe = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  const filterByMethod = useCallback((methods: PaymentMethod[]) => {
    setMethodFilter(methods.length > 0 ? methods : undefined);
  }, []);

  const filterByStatus = useCallback((statuses: PaymentStatus[]) => {
    setStatusFilter(statuses.length > 0 ? statuses : undefined);
  }, []);

  // Memoized computed values
  const getTransactionsByMethod = useCallback((method: PaymentMethod) => {
    return transactions.filter(txn => txn.method === method);
  }, [transactions]);

  const getTransactionsByStatus = useCallback((status: PaymentStatus) => {
    return transactions.filter(txn => txn.status === status);
  }, [transactions]);

  const getTotalByMethod = useCallback((method: PaymentMethod) => {
    return transactions
      .filter(txn => txn.method === method && txn.status === 'completed')
      .reduce((total, txn) => total + txn.amount, 0);
  }, [transactions]);

  const getSuccessRate = useMemo(() => {
    return () => {
      if (transactions.length === 0) return 0;
      const successful = transactions.filter(txn => txn.status === 'completed').length;
      return (successful / transactions.length) * 100;
    };
  }, [transactions]);

  const getAverageTransactionAmount = useMemo(() => {
    return () => {
      const completedTransactions = transactions.filter(txn => txn.status === 'completed');
      if (completedTransactions.length === 0) return 0;
      
      const total = completedTransactions.reduce((sum, txn) => sum + txn.amount, 0);
      return total / completedTransactions.length;
    };
  }, [transactions]);

  return {
    paymentData,
    transactions,
    loading,
    error,
    refetch: fetchPaymentData,
    updateTimeframe,
    filterByMethod,
    filterByStatus,
    getTransactionsByMethod,
    getTransactionsByStatus,
    getTotalByMethod,
    getSuccessRate,
    getAverageTransactionAmount,
    isStale,
    lastUpdated
  };
};