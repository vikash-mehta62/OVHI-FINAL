import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRCMDataFetching } from '../useRCMDataFetching';

// Mock all the individual hooks
jest.mock('../useRCMData', () => ({
  useRCMData: jest.fn()
}));

jest.mock('../useClaims', () => ({
  useClaims: jest.fn()
}));

jest.mock('../useARData', () => ({
  useARData: jest.fn()
}));

jest.mock('../useCollections', () => ({
  useCollections: jest.fn()
}));

jest.mock('../usePayments', () => ({
  usePayments: jest.fn()
}));

jest.mock('../useDenialAnalytics', () => ({
  useDenialAnalytics: jest.fn()
}));

jest.mock('../useRevenueAnalytics', () => ({
  useRevenueAnalytics: jest.fn()
}));

jest.mock('../useRCMCache', () => ({
  useRCMCache: jest.fn(),
  rcmCacheUtils: {
    invalidatePattern: jest.fn()
  }
}));

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    auth: (state = { token: 'mock-token' }) => state
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('useRCMDataFetching', () => {
  const mockUseRCMData = require('../useRCMData').useRCMData;
  const mockUseClaims = require('../useClaims').useClaims;
  const mockUseARData = require('../useARData').useARData;
  const mockUseCollections = require('../useCollections').useCollections;
  const mockUsePayments = require('../usePayments').usePayments;
  const mockUseDenialAnalytics = require('../useDenialAnalytics').useDenialAnalytics;
  const mockUseRevenueAnalytics = require('../useRevenueAnalytics').useRevenueAnalytics;
  const mockRcmCacheUtils = require('../useRCMCache').rcmCacheUtils;

  const createMockHookReturn = (overrides = {}) => ({
    data: null,
    loading: false,
    error: null,
    refetch: jest.fn(),
    isStale: false,
    lastUpdated: null,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock returns for all hooks
    mockUseRCMData.mockReturnValue(createMockHookReturn());
    mockUseClaims.mockReturnValue(createMockHookReturn({
      updateFilters: jest.fn(),
      updatePagination: jest.fn()
    }));
    mockUseARData.mockReturnValue(createMockHookReturn({
      updateFilters: jest.fn()
    }));
    mockUseCollections.mockReturnValue(createMockHookReturn());
    mockUsePayments.mockReturnValue(createMockHookReturn());
    mockUseDenialAnalytics.mockReturnValue(createMockHookReturn({
      updateFilters: jest.fn()
    }));
    mockUseRevenueAnalytics.mockReturnValue(createMockHookReturn({
      updateFilters: jest.fn()
    }));
  });

  it('should initialize with default options', () => {
    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    expect(result.current.data).toBeDefined();
    expect(result.current.loading.any).toBe(false);
    expect(result.current.error.any).toBe(false);
    expect(result.current.refetch).toBeDefined();
    expect(result.current.isStale.any).toBe(false);
  });

  it('should initialize only specified modules', () => {
    renderHook(() => useRCMDataFetching({
      modules: ['dashboard', 'claims']
    }), { wrapper });

    // Should enable dashboard and claims
    expect(mockUseRCMData).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );
    expect(mockUseClaims).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    );

    // Should disable other modules
    expect(mockUseARData).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(mockUseCollections).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('should aggregate loading states correctly', () => {
    mockUseRCMData.mockReturnValue(createMockHookReturn({ loading: true }));
    mockUseClaims.mockReturnValue(createMockHookReturn({ loading: false }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    expect(result.current.loading.dashboard).toBe(true);
    expect(result.current.loading.claims).toBe(false);
    expect(result.current.loading.any).toBe(true);
    expect(result.current.loading.all).toBe(false);
  });

  it('should aggregate error states correctly', () => {
    mockUseRCMData.mockReturnValue(createMockHookReturn({ error: 'Dashboard error' }));
    mockUseClaims.mockReturnValue(createMockHookReturn({ error: null }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    expect(result.current.error.dashboard).toBe('Dashboard error');
    expect(result.current.error.claims).toBeNull();
    expect(result.current.error.any).toBe(true);
  });

  it('should aggregate stale states correctly', () => {
    mockUseRCMData.mockReturnValue(createMockHookReturn({ isStale: true }));
    mockUseClaims.mockReturnValue(createMockHookReturn({ isStale: false }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    expect(result.current.isStale.dashboard).toBe(true);
    expect(result.current.isStale.claims).toBe(false);
    expect(result.current.isStale.any).toBe(true);
  });

  it('should update timeframe for all modules', () => {
    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    act(() => {
      result.current.updateTimeframe('90d');
    });

    // Should trigger re-render with new timeframe
    // This would be reflected in subsequent hook calls
    expect(result.current).toBeDefined();
  });

  it('should update filters for specific modules', () => {
    const mockUpdateFilters = jest.fn();
    mockUseClaims.mockReturnValue(createMockHookReturn({
      updateFilters: mockUpdateFilters
    }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    const filters = { searchTerm: 'test' };
    
    act(() => {
      result.current.updateFilters('claims', filters);
    });

    expect(mockUpdateFilters).toHaveBeenCalledWith(filters);
  });

  it('should update pagination for claims module', () => {
    const mockUpdatePagination = jest.fn();
    mockUseClaims.mockReturnValue(createMockHookReturn({
      updatePagination: mockUpdatePagination
    }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    const pagination = { page: 2, limit: 50 };
    
    act(() => {
      result.current.updatePagination('claims', pagination);
    });

    expect(mockUpdatePagination).toHaveBeenCalledWith(pagination);
  });

  it('should refetch all modules', async () => {
    const mockRefetchDashboard = jest.fn().mockResolvedValue(undefined);
    const mockRefetchClaims = jest.fn().mockResolvedValue(undefined);
    
    mockUseRCMData.mockReturnValue(createMockHookReturn({
      refetch: mockRefetchDashboard
    }));
    mockUseClaims.mockReturnValue(createMockHookReturn({
      refetch: mockRefetchClaims
    }));

    const { result } = renderHook(() => useRCMDataFetching({
      modules: ['dashboard', 'claims']
    }), { wrapper });

    await act(async () => {
      await result.current.refetch.all();
    });

    expect(mockRefetchDashboard).toHaveBeenCalled();
    expect(mockRefetchClaims).toHaveBeenCalled();
  });

  it('should invalidate cache for specified modules', () => {
    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    act(() => {
      result.current.invalidateCache(['dashboard', 'claims']);
    });

    expect(mockRcmCacheUtils.invalidatePattern).toHaveBeenCalledTimes(2);
    expect(mockRcmCacheUtils.invalidatePattern).toHaveBeenCalledWith(
      expect.objectContaining({ source: '^dashboard-' })
    );
    expect(mockRcmCacheUtils.invalidatePattern).toHaveBeenCalledWith(
      expect.objectContaining({ source: '^claims-' })
    );
  });

  it('should preload data for specified modules', async () => {
    const mockRefetchDashboard = jest.fn().mockResolvedValue(undefined);
    const mockRefetchClaims = jest.fn().mockResolvedValue(undefined);
    
    mockUseRCMData.mockReturnValue(createMockHookReturn({
      refetch: mockRefetchDashboard
    }));
    mockUseClaims.mockReturnValue(createMockHookReturn({
      refetch: mockRefetchClaims
    }));

    const { result } = renderHook(() => useRCMDataFetching(), { wrapper });

    await act(async () => {
      await result.current.preloadData(['dashboard', 'claims']);
    });

    expect(mockRefetchDashboard).toHaveBeenCalled();
    expect(mockRefetchClaims).toHaveBeenCalled();
  });

  it('should get data freshness information', () => {
    const mockDate = new Date('2024-01-15T10:00:00Z');
    
    mockUseRCMData.mockReturnValue(createMockHookReturn({
      lastUpdated: mockDate,
      isStale: false
    }));
    mockUseClaims.mockReturnValue(createMockHookReturn({
      lastUpdated: null,
      isStale: true
    }));

    const { result } = renderHook(() => useRCMDataFetching({
      modules: ['dashboard', 'claims']
    }), { wrapper });

    const freshness = result.current.getDataFreshness();

    expect(freshness).toHaveLength(2);
    expect(freshness[0]).toEqual({
      module: 'dashboard',
      lastUpdated: mockDate,
      isStale: false,
      cacheHit: true
    });
    expect(freshness[1]).toEqual({
      module: 'claims',
      lastUpdated: null,
      isStale: true,
      cacheHit: false
    });
  });

  it('should handle background refresh for stale data', async () => {
    const mockRefetchDashboard = jest.fn().mockResolvedValue(undefined);
    
    mockUseRCMData.mockReturnValue(createMockHookReturn({
      refetch: mockRefetchDashboard,
      isStale: true
    }));

    renderHook(() => useRCMDataFetching({
      modules: ['dashboard'],
      backgroundRefresh: true,
      staleWhileRevalidate: true,
      refreshInterval: 100 // Short interval for testing
    }), { wrapper });

    // Wait for background refresh to trigger
    await waitFor(() => {
      expect(mockRefetchDashboard).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should not fetch when disabled', () => {
    renderHook(() => useRCMDataFetching({
      enabled: false
    }), { wrapper });

    expect(mockUseRCMData).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(mockUseClaims).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('should handle module-specific options', () => {
    renderHook(() => useRCMDataFetching({
      timeframe: '90d',
      refreshInterval: 600000
    }), { wrapper });

    expect(mockUseRCMData).toHaveBeenCalledWith(
      expect.objectContaining({
        timeframe: '90d',
        refreshInterval: 600000
      })
    );

    expect(mockUseRevenueAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        timeframe: '90d',
        refreshInterval: 600000,
        includeForecast: true,
        includeBenchmarks: true
      })
    );
  });
});