import { renderHook, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useRCMData } from '../useRCMData';

// Mock the API
jest.mock('@/services/operations/rcm', () => ({
  getRCMDashboardDataAPI: jest.fn()
}));

const mockGetRCMDashboardDataAPI = require('@/services/operations/rcm').getRCMDashboardDataAPI;

// Mock store
const createMockStore = (authState = { token: 'mock-token' }) => {
  return configureStore({
    reducer: {
      auth: (state = authState) => state
    }
  });
};

// Wrapper component for Redux Provider
const createWrapper = (store: any) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useRCMData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data successfully', async () => {
    const mockData = {
      kpis: {
        totalRevenue: 125000,
        collectionRate: 87.5,
        denialRate: 3.2,
        daysInAR: 28,
        paidClaims: 450,
        deniedClaims: 15,
        totalClaims: 500
      },
      trends: {
        monthlyRevenue: []
      }
    };

    mockGetRCMDashboardDataAPI.mockResolvedValue({
      success: true,
      data: mockData
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRCMData(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.kpis).toEqual(mockData.kpis);
    expect(result.current.error).toBe(null);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle API errors', async () => {
    const errorMessage = 'Failed to fetch data';
    mockGetRCMDashboardDataAPI.mockRejectedValue(new Error(errorMessage));

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRCMData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBe(null);
  });

  it('should not fetch when disabled', async () => {
    const store = createMockStore();
    const wrapper = createWrapper(store);

    renderHook(() => useRCMData({ enabled: false }), { wrapper });

    expect(mockGetRCMDashboardDataAPI).not.toHaveBeenCalled();
  });

  it('should not fetch without token', async () => {
    const store = createMockStore({ token: null });
    const wrapper = createWrapper(store);

    renderHook(() => useRCMData(), { wrapper });

    expect(mockGetRCMDashboardDataAPI).not.toHaveBeenCalled();
  });

  it('should refetch data when timeframe changes', async () => {
    const mockData = { kpis: {}, trends: {} };
    mockGetRCMDashboardDataAPI.mockResolvedValue({
      success: true,
      data: mockData
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result, rerender } = renderHook(
      ({ timeframe }) => useRCMData({ timeframe }),
      {
        wrapper,
        initialProps: { timeframe: '30d' }
      }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledWith('mock-token', '30d');

    // Change timeframe
    rerender({ timeframe: '90d' });

    await waitFor(() => {
      expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledWith('mock-token', '90d');
    });

    expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledTimes(2);
  });

  it('should handle manual refetch', async () => {
    const mockData = { kpis: {}, trends: {} };
    mockGetRCMDashboardDataAPI.mockResolvedValue({
      success: true,
      data: mockData
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(() => useRCMData(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledTimes(1);

    // Manual refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledTimes(2);
  });

  it('should mark data as stale after refresh interval', async () => {
    const mockData = { kpis: {}, trends: {} };
    mockGetRCMDashboardDataAPI.mockResolvedValue({
      success: true,
      data: mockData
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(
      () => useRCMData({ refreshInterval: 100 }), // Very short interval for testing
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isStale).toBe(false);

    // Wait for data to become stale
    await waitFor(
      () => {
        expect(result.current.isStale).toBe(true);
      },
      { timeout: 200 }
    );
  });

  it('should handle auto-refresh', async () => {
    const mockData = { kpis: {}, trends: {} };
    mockGetRCMDashboardDataAPI.mockResolvedValue({
      success: true,
      data: mockData
    });

    const store = createMockStore();
    const wrapper = createWrapper(store);

    const { result } = renderHook(
      () => useRCMData({ 
        autoRefresh: true, 
        refreshInterval: 100 // Very short interval for testing
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledTimes(1);

    // Wait for auto-refresh
    await waitFor(
      () => {
        expect(mockGetRCMDashboardDataAPI).toHaveBeenCalledTimes(2);
      },
      { timeout: 200 }
    );
  });
});