import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PatientAccountData, CollectionStatus, APIResponse } from '@/components/rcm/shared/types';

interface CollectionActivity {
  id: string;
  accountId: string;
  patientName: string;
  activityType: 'call' | 'email' | 'letter' | 'payment_plan' | 'settlement' | 'write_off';
  description: string;
  amount?: number;
  date: string;
  userId: string;
  userName: string;
  status: 'completed' | 'pending' | 'failed';
  nextAction?: string;
  nextActionDate?: string;
}

interface CollectionsSummary {
  totalAccountsInCollections: number;
  totalCollectionsBalance: number;
  collectionRate: number;
  averageCollectionTime: number;
  statusBreakdown: Array<{
    status: CollectionStatus;
    count: number;
    amount: number;
  }>;
  monthlyCollections: Array<{
    month: string;
    collected: number;
    target: number;
  }>;
  topPerformers: Array<{
    userId: string;
    userName: string;
    collectionsAmount: number;
    accountsResolved: number;
  }>;
}

interface UseCollectionsOptions {
  status?: CollectionStatus[];
  enabled?: boolean;
  staleTime?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseCollectionsReturn {
  accounts: PatientAccountData[];
  activities: CollectionActivity[];
  summary: CollectionsSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateAccountStatus: (accountId: string, status: CollectionStatus) => Promise<void>;
  addActivity: (activity: Omit<CollectionActivity, 'id' | 'date' | 'userId' | 'userName'>) => Promise<void>;
  getAccountsByStatus: (status: CollectionStatus) => PatientAccountData[];
  getActivitiesForAccount: (accountId: string) => CollectionActivity[];
  isStale: boolean;
  lastUpdated: Date | null;
}

// Mock API functions - replace with actual API calls
const fetchCollectionsDataAPI = async (
  token: string,
  status?: CollectionStatus[]
): Promise<APIResponse<{ accounts: PatientAccountData[]; activities: CollectionActivity[]; summary: CollectionsSummary }>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockAccounts: PatientAccountData[] = [
        {
          id: '1',
          patientId: 'PAT-001',
          patientName: 'John Doe',
          balance: 2500.00,
          insuranceBalance: 0,
          patientBalance: 2500.00,
          status: 'collections',
          agingBucket: '120+',
          collectionStatus: 'second_notice',
          contactAttempts: 3,
          lastContactDate: '2024-01-15'
        },
        {
          id: '2',
          patientId: 'PAT-002',
          patientName: 'Jane Smith',
          balance: 1800.75,
          insuranceBalance: 0,
          patientBalance: 1800.75,
          status: 'collections',
          agingBucket: '91-120',
          collectionStatus: 'collections_agency',
          contactAttempts: 5,
          lastContactDate: '2024-01-10'
        }
      ];

      const mockActivities: CollectionActivity[] = [
        {
          id: '1',
          accountId: '1',
          patientName: 'John Doe',
          activityType: 'call',
          description: 'Attempted phone contact - no answer, left voicemail',
          date: '2024-01-15',
          userId: 'USER-001',
          userName: 'Sarah Johnson',
          status: 'completed',
          nextAction: 'Send second notice letter',
          nextActionDate: '2024-01-22'
        },
        {
          id: '2',
          accountId: '2',
          patientName: 'Jane Smith',
          activityType: 'letter',
          description: 'Sent final notice letter via certified mail',
          date: '2024-01-10',
          userId: 'USER-002',
          userName: 'Mike Davis',
          status: 'completed',
          nextAction: 'Transfer to collections agency',
          nextActionDate: '2024-01-25'
        }
      ];

      const mockSummary: CollectionsSummary = {
        totalAccountsInCollections: 45,
        totalCollectionsBalance: 125000.00,
        collectionRate: 68.5,
        averageCollectionTime: 85,
        statusBreakdown: [
          { status: 'first_notice', count: 15, amount: 35000.00 },
          { status: 'second_notice', count: 12, amount: 28000.00 },
          { status: 'final_notice', count: 8, amount: 22000.00 },
          { status: 'collections_agency', count: 6, amount: 25000.00 },
          { status: 'legal_action', count: 3, amount: 12000.00 },
          { status: 'settled', count: 1, amount: 3000.00 }
        ],
        monthlyCollections: [
          { month: 'Jan 2024', collected: 15000, target: 20000 },
          { month: 'Dec 2023', collected: 18500, target: 20000 },
          { month: 'Nov 2023', collected: 22000, target: 20000 }
        ],
        topPerformers: [
          { userId: 'USER-001', userName: 'Sarah Johnson', collectionsAmount: 45000, accountsResolved: 12 },
          { userId: 'USER-002', userName: 'Mike Davis', collectionsAmount: 38000, accountsResolved: 10 }
        ]
      };

      resolve({
        success: true,
        data: {
          accounts: mockAccounts,
          activities: mockActivities,
          summary: mockSummary
        }
      });
    }, 1200);
  });
};

const updateAccountStatusAPI = async (
  token: string,
  accountId: string,
  status: CollectionStatus
): Promise<APIResponse<void>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: undefined });
    }, 500);
  });
};

const addActivityAPI = async (
  token: string,
  activity: Omit<CollectionActivity, 'id' | 'date' | 'userId' | 'userName'>
): Promise<APIResponse<CollectionActivity>> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newActivity: CollectionActivity = {
        ...activity,
        id: `ACT-${Date.now()}`,
        date: new Date().toISOString(),
        userId: 'USER-CURRENT',
        userName: 'Current User'
      };
      resolve({ success: true, data: newActivity });
    }, 500);
  });
};

export const useCollections = (options: UseCollectionsOptions = {}): UseCollectionsReturn => {
  const {
    status,
    enabled = true,
    staleTime = 300000, // 5 minutes
    autoRefresh = false,
    refreshInterval = 600000 // 10 minutes
  } = options;

  const { token } = useSelector((state: any) => state.auth);
  
  const [accounts, setAccounts] = useState<PatientAccountData[]>([]);
  const [activities, setActivities] = useState<CollectionActivity[]>([]);
  const [summary, setSummary] = useState<CollectionsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchCollectionsData = useCallback(async () => {
    if (!enabled || !token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchCollectionsDataAPI(token, status);
      
      if (response.success) {
        setAccounts(response.data.accounts);
        setActivities(response.data.activities);
        setSummary(response.data.summary);
        setLastUpdated(new Date());
        setIsStale(false);
      } else {
        throw new Error(response.message || 'Failed to fetch collections data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Collections data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, status, enabled]);

  // Initial fetch and status changes
  useEffect(() => {
    fetchCollectionsData();
  }, [fetchCollectionsData]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      setIsStale(true);
      fetchCollectionsData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, enabled, fetchCollectionsData]);

  // Mark data as stale after staleTime
  useEffect(() => {
    if (!lastUpdated || !enabled) return;

    const timeout = setTimeout(() => {
      setIsStale(true);
    }, staleTime);

    return () => clearTimeout(timeout);
  }, [lastUpdated, staleTime, enabled]);

  const updateAccountStatus = useCallback(async (accountId: string, newStatus: CollectionStatus) => {
    if (!token) return;

    try {
      const response = await updateAccountStatusAPI(token, accountId, newStatus);
      
      if (response.success) {
        // Update local state
        setAccounts(prev => prev.map(account => 
          account.id === accountId 
            ? { ...account, collectionStatus: newStatus }
            : account
        ));
      } else {
        throw new Error(response.message || 'Failed to update account status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update account status';
      setError(errorMessage);
      console.error('Update account status error:', err);
    }
  }, [token]);

  const addActivity = useCallback(async (activityData: Omit<CollectionActivity, 'id' | 'date' | 'userId' | 'userName'>) => {
    if (!token) return;

    try {
      const response = await addActivityAPI(token, activityData);
      
      if (response.success) {
        // Add to local state
        setActivities(prev => [response.data, ...prev]);
      } else {
        throw new Error(response.message || 'Failed to add activity');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add activity';
      setError(errorMessage);
      console.error('Add activity error:', err);
    }
  }, [token]);

  // Memoized computed values
  const getAccountsByStatus = useCallback((targetStatus: CollectionStatus) => {
    return accounts.filter(account => account.collectionStatus === targetStatus);
  }, [accounts]);

  const getActivitiesForAccount = useCallback((accountId: string) => {
    return activities.filter(activity => activity.accountId === accountId);
  }, [activities]);

  return {
    accounts,
    activities,
    summary,
    loading,
    error,
    refetch: fetchCollectionsData,
    updateAccountStatus,
    addActivity,
    getAccountsByStatus,
    getActivitiesForAccount,
    isStale,
    lastUpdated
  };
};