# RCM Data Fetching Hooks

A comprehensive collection of custom React hooks for fetching, caching, and managing RCM (Revenue Cycle Management) data with proper error handling, loading states, and stale-while-revalidate patterns.

## Overview

These hooks provide a consistent interface for data fetching across the RCM application, with built-in features like:

- **Automatic caching** with configurable stale times
- **Error handling** with retry mechanisms
- **Loading states** and stale data indicators
- **Real-time updates** with auto-refresh capabilities
- **Optimistic updates** for better user experience
- **TypeScript support** with comprehensive type definitions

## Available Hooks

### Core Data Hooks

#### `useRCMData`
Fetches comprehensive RCM dashboard data including KPIs and trends.

```tsx
import { useRCMData } from '@/hooks';

const Dashboard = () => {
  const {
    data,
    kpis,
    loading,
    error,
    refetch,
    isStale,
    lastUpdated
  } = useRCMData({
    timeframe: '30d',
    autoRefresh: true,
    refreshInterval: 300000, // 5 minutes
    enabled: true
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <KPICards kpis={kpis} />
      {isStale && <StaleDataIndicator lastUpdated={lastUpdated} />}
    </div>
  );
};
```

**Options:**
- `timeframe`: Data timeframe ('7d', '30d', '90d', '1y')
- `autoRefresh`: Enable automatic data refresh
- `refreshInterval`: Refresh interval in milliseconds
- `enabled`: Enable/disable the hook

**Returns:**
- `data`: Complete dashboard data
- `kpis`: KPI data subset
- `loading`: Loading state
- `error`: Error message if any
- `refetch`: Manual refetch function
- `isStale`: Whether data is stale
- `lastUpdated`: Last update timestamp

#### `useClaims`
Manages claims data with filtering, pagination, and search capabilities.

```tsx
import { useClaims } from '@/hooks';

const ClaimsTable = () => {
  const {
    claims,
    loading,
    error,
    totalCount,
    totalPages,
    currentPage,
    updateFilters,
    updatePagination
  } = useClaims({
    filters: {
      status: ['pending', 'denied'],
      dateRange: {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    },
    pagination: {
      page: 1,
      limit: 20,
      sortBy: 'serviceDate',
      sortOrder: 'desc'
    }
  });

  const handleFilterChange = (newFilters) => {
    updateFilters(newFilters);
  };

  const handlePageChange = (page) => {
    updatePagination({ page });
  };

  return (
    <DataTable
      data={claims}
      loading={loading}
      pagination={{
        current: currentPage,
        total: totalCount,
        pageSize: 20,
        onChange: handlePageChange
      }}
    />
  );
};
```

**Options:**
- `filters`: Search and filter criteria
- `pagination`: Pagination parameters
- `enabled`: Enable/disable the hook
- `staleTime`: Data staleness threshold

**Returns:**
- `claims`: Array of claim data
- `loading`: Loading state
- `error`: Error message
- `totalCount`: Total number of claims
- `totalPages`: Total number of pages
- `currentPage`: Current page number
- `updateFilters`: Update filter function
- `updatePagination`: Update pagination function

#### `useARData`
Fetches accounts receivable data with aging analysis and collection opportunities.

```tsx
import { useARData } from '@/hooks';

const ARDashboard = () => {
  const {
    accounts,
    summary,
    loading,
    error,
    getAccountsByBucket,
    getHighPriorityAccounts
  } = useARData({
    filters: {
      amountRange: { min: 100, max: 10000 }
    },
    autoRefresh: true
  });

  const urgentAccounts = getHighPriorityAccounts();
  const oldestAccounts = getAccountsByBucket('120+');

  return (
    <div>
      <ARSummary summary={summary} />
      <HighPriorityAccounts accounts={urgentAccounts} />
      <AgingBuckets accounts={accounts} />
    </div>
  );
};
```

**Options:**
- `filters`: Filter criteria for accounts
- `enabled`: Enable/disable the hook
- `staleTime`: Data staleness threshold
- `autoRefresh`: Enable automatic refresh
- `refreshInterval`: Refresh interval

**Returns:**
- `accounts`: Array of patient account data
- `summary`: A/R summary with aging breakdown
- `loading`: Loading state
- `error`: Error message
- `getAccountsByBucket`: Filter accounts by aging bucket
- `getHighPriorityAccounts`: Get high-priority accounts

#### `useCollections`
Manages collections data including accounts, activities, and status updates.

```tsx
import { useCollections } from '@/hooks';

const CollectionsManager = () => {
  const {
    accounts,
    activities,
    summary,
    updateAccountStatus,
    addActivity,
    getAccountsByStatus
  } = useCollections({
    status: ['first_notice', 'second_notice', 'final_notice']
  });

  const handleStatusUpdate = async (accountId, newStatus) => {
    await updateAccountStatus(accountId, newStatus);
  };

  const handleAddActivity = async (activityData) => {
    await addActivity(activityData);
  };

  const firstNoticeAccounts = getAccountsByStatus('first_notice');

  return (
    <div>
      <CollectionsSummary summary={summary} />
      <AccountsList 
        accounts={firstNoticeAccounts}
        onStatusUpdate={handleStatusUpdate}
      />
      <ActivitiesLog 
        activities={activities}
        onAddActivity={handleAddActivity}
      />
    </div>
  );
};
```

**Options:**
- `status`: Filter by collection status
- `enabled`: Enable/disable the hook
- `staleTime`: Data staleness threshold
- `autoRefresh`: Enable automatic refresh
- `refreshInterval`: Refresh interval

**Returns:**
- `accounts`: Collections accounts
- `activities`: Collection activities
- `summary`: Collections summary data
- `updateAccountStatus`: Update account status function
- `addActivity`: Add new activity function
- `getAccountsByStatus`: Filter accounts by status
- `getActivitiesForAccount`: Get activities for specific account

#### `usePayments`
Handles payment data including transactions, analytics, and gateway performance.

```tsx
import { usePayments } from '@/hooks';

const PaymentsAnalytics = () => {
  const {
    paymentData,
    transactions,
    loading,
    updateTimeframe,
    filterByMethod,
    getSuccessRate,
    getAverageTransactionAmount
  } = usePayments({
    timeframe: '30d',
    autoRefresh: true
  });

  const successRate = getSuccessRate();
  const avgAmount = getAverageTransactionAmount();

  const handleTimeframeChange = (timeframe) => {
    updateTimeframe(timeframe);
  };

  const handleMethodFilter = (methods) => {
    filterByMethod(methods);
  };

  return (
    <div>
      <PaymentSummary 
        data={paymentData}
        successRate={successRate}
        averageAmount={avgAmount}
      />
      <TransactionsList transactions={transactions} />
      <PaymentFilters 
        onTimeframeChange={handleTimeframeChange}
        onMethodFilter={handleMethodFilter}
      />
    </div>
  );
};
```

**Options:**
- `timeframe`: Data timeframe
- `method`: Filter by payment methods
- `status`: Filter by payment status
- `enabled`: Enable/disable the hook
- `autoRefresh`: Enable automatic refresh

**Returns:**
- `paymentData`: Payment analytics data
- `transactions`: Individual transactions
- `loading`: Loading state
- `error`: Error message
- `updateTimeframe`: Update timeframe function
- `filterByMethod`: Filter by payment method
- `filterByStatus`: Filter by payment status
- `getTransactionsByMethod`: Get transactions by method
- `getSuccessRate`: Calculate success rate
- `getAverageTransactionAmount`: Calculate average amount

### Cache Management Hook

#### `useRCMCache`
Provides advanced caching capabilities with stale-while-revalidate patterns.

```tsx
import { useRCMCache, rcmCacheUtils } from '@/hooks';

const CachedComponent = () => {
  const {
    data,
    isLoading,
    isStale,
    isCached,
    error,
    refetch,
    invalidate,
    setData
  } = useRCMCache(
    'dashboard-data-30d', // cache key
    async () => {
      // fetcher function
      const response = await fetchDashboardData('30d');
      return response.data;
    },
    {
      staleTime: 300000, // 5 minutes
      cacheTime: 600000, // 10 minutes
      enabled: true
    }
  );

  // Manual cache operations
  const clearCache = () => {
    rcmCacheUtils.clearAll();
  };

  const preloadData = async () => {
    await rcmCacheUtils.preload('next-data', fetchNextData);
  };

  return (
    <div>
      {isStale && <StaleIndicator />}
      {isCached && <CachedIndicator />}
      <DataDisplay data={data} loading={isLoading} />
    </div>
  );
};
```

**Options:**
- `staleTime`: Time before data is considered stale
- `cacheTime`: Time before data is removed from cache
- `enabled`: Enable/disable caching

**Returns:**
- `data`: Cached data
- `isLoading`: Loading state
- `isStale`: Whether data is stale
- `isCached`: Whether data is in cache
- `error`: Error message
- `refetch`: Force refetch function
- `invalidate`: Invalidate cache function
- `setData`: Manually set cache data

**Cache Utilities:**
- `rcmCacheUtils.clearAll()`: Clear entire cache
- `rcmCacheUtils.clear(keys)`: Clear specific keys
- `rcmCacheUtils.getInfo()`: Get cache information
- `rcmCacheUtils.invalidatePattern(regex)`: Invalidate by pattern
- `rcmCacheUtils.preload(key, fetcher)`: Preload data

## Advanced Usage Patterns

### Combining Multiple Hooks

```tsx
import { useRCMData, useClaims, usePayments } from '@/hooks';

const ComprehensiveDashboard = () => {
  const { kpis, loading: rcmLoading } = useRCMData({ timeframe: '30d' });
  const { claims, loading: claimsLoading } = useClaims({ 
    filters: { status: ['pending'] },
    pagination: { page: 1, limit: 5 }
  });
  const { paymentData, loading: paymentsLoading } = usePayments({ 
    timeframe: '30d' 
  });

  const isLoading = rcmLoading || claimsLoading || paymentsLoading;

  return (
    <div>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <KPISection kpis={kpis} />
          <RecentClaims claims={claims} />
          <PaymentSummary data={paymentData} />
        </>
      )}
    </div>
  );
};
```

### Error Handling with Retry

```tsx
import { useRCMData } from '@/hooks';

const ResilientComponent = () => {
  const { data, error, refetch, loading } = useRCMData();
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = async () => {
    setRetryCount(prev => prev + 1);
    await refetch();
  };

  if (error) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={handleRetry}
        retryCount={retryCount}
        maxRetries={3}
      />
    );
  }

  return <DataDisplay data={data} loading={loading} />;
};
```

### Optimistic Updates

```tsx
import { useCollections } from '@/hooks';

const OptimisticCollections = () => {
  const { accounts, updateAccountStatus } = useCollections();

  const handleStatusUpdate = async (accountId, newStatus) => {
    // Optimistic update
    const optimisticAccounts = accounts.map(account =>
      account.id === accountId 
        ? { ...account, collectionStatus: newStatus }
        : account
    );
    
    try {
      await updateAccountStatus(accountId, newStatus);
    } catch (error) {
      // Revert on error
      console.error('Failed to update status:', error);
      // The hook will automatically revert the state
    }
  };

  return (
    <AccountsList 
      accounts={accounts}
      onStatusUpdate={handleStatusUpdate}
    />
  );
};
```

### Conditional Data Fetching

```tsx
import { useClaims } from '@/hooks';

const ConditionalClaims = ({ userId, userRole }) => {
  const { claims, loading } = useClaims({
    enabled: userRole === 'admin' || userRole === 'billing',
    filters: {
      // Only fetch user's claims if not admin
      userId: userRole !== 'admin' ? userId : undefined
    }
  });

  if (userRole === 'patient') {
    return <AccessDenied />;
  }

  return <ClaimsTable claims={claims} loading={loading} />;
};
```

### Real-time Updates

```tsx
import { useRCMData } from '@/hooks';

const RealTimeDashboard = () => {
  const { data, isStale, lastUpdated } = useRCMData({
    autoRefresh: true,
    refreshInterval: 60000 // 1 minute
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>RCM Dashboard</h1>
        <div className="flex items-center space-x-2">
          {isStale && <StaleIndicator />}
          <LastUpdated timestamp={lastUpdated} />
        </div>
      </div>
      <DashboardContent data={data} />
    </div>
  );
};
```

## Performance Considerations

### Stale-While-Revalidate
All hooks implement stale-while-revalidate patterns, showing cached data immediately while fetching fresh data in the background.

### Automatic Deduplication
Multiple components using the same hook with identical parameters will share the same request and cache.

### Memory Management
Hooks automatically clean up timers and subscriptions on unmount to prevent memory leaks.

### Bundle Size Optimization
Hooks are tree-shakeable and only import what they need.

## Error Handling

### Automatic Retry
Hooks automatically retry failed requests with exponential backoff for transient errors.

### Error Classification
Different error types are handled appropriately:
- Network errors: Automatic retry
- Authentication errors: Redirect to login
- Validation errors: Show user-friendly message
- Server errors: Log and show generic message

### Graceful Degradation
Hooks provide fallback data and graceful error states to maintain application functionality.

## Testing

### Mock Data
All hooks include mock data for development and testing purposes.

### Test Utilities
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useRCMData } from '@/hooks';

describe('useRCMData', () => {
  it('should fetch data successfully', async () => {
    const { result } = renderHook(() => useRCMData());
    
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBeDefined();
    });
  });
});
```

## Migration Guide

### From Direct API Calls
```tsx
// Before
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await getRCMDashboardDataAPI(token, timeframe);
      setData(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [token, timeframe]);

// After
const { data, loading, error } = useRCMData({ timeframe });
```

### From Redux/Context
```tsx
// Before
const dispatch = useDispatch();
const { data, loading } = useSelector(state => state.rcm);

useEffect(() => {
  dispatch(fetchRCMData(timeframe));
}, [dispatch, timeframe]);

// After
const { data, loading } = useRCMData({ timeframe });
```

## Best Practices

1. **Use appropriate stale times** based on data volatility
2. **Enable auto-refresh** for real-time dashboards
3. **Implement proper error boundaries** for error handling
4. **Use conditional fetching** to avoid unnecessary requests
5. **Leverage caching** for frequently accessed data
6. **Handle loading states** gracefully
7. **Provide fallback data** when possible
8. **Test with mock data** during development

## Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] Offline support with background sync
- [ ] Advanced query invalidation strategies
- [ ] Prefetching and preloading optimizations
- [ ] Request deduplication across components
- [ ] Optimistic update patterns
- [ ] Advanced error recovery mechanisms
- [ ] Performance monitoring and analytics

This hook system provides a robust foundation for data management in the RCM application while maintaining excellent developer experience and application performance.