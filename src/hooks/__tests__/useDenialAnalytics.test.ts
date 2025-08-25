import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useDenialAnalytics } from '../useDenialAnalytics';

// Mock the cache hook
jest.mock('../useRCMCache', () => ({
  useRCMCache: jest.fn()
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

describe('useDenialAnalytics', () => {
  const mockCacheHook = require('../useRCMCache').useRCMCache;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default options', () => {
    const mockAnalytics = {
      summary: {
        totalDenials: 156,
        denialRate: 12.5,
        totalDeniedAmount: 125000.00,
        averageDenialAmount: 801.28,
        topDenialReason: 'CO-45 - Charges exceed fee schedule',
        monthlyTrend: 'down' as const
      },
      reasons: [
        {
          code: 'CO-45',
          description: 'Charges exceed fee schedule',
          count: 45,
          amount: 35000.00,
          percentage: 28.8,
          trend: 'stable' as const,
          category: 'administrative' as const
        }
      ],
      trends: [],
      byPayer: [],
      byProvider: [],
      recoverableAmount: 75000.00,
      appealOpportunities: []
    };

    mockCacheHook.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: true
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    expect(result.current.analytics).toEqual(mockAnalytics);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it('should handle loading state', () => {
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: false
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    expect(result.current.analytics).toBeNull();
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should handle error state', () => {
    const mockError = 'Failed to fetch denial analytics';
    
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
      refetch: jest.fn(),
      isStale: false,
      isCached: false
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    expect(result.current.analytics).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
  });

  it('should update timeframe', () => {
    const mockRefetch = jest.fn();
    
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isStale: false,
      isCached: false
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    act(() => {
      result.current.updateTimeframe('90d');
    });

    // Should trigger a re-render with new cache key
    expect(mockCacheHook).toHaveBeenCalledWith(
      expect.stringContaining('90d'),
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('should update filters', () => {
    const mockRefetch = jest.fn();
    
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isStale: false,
      isCached: false
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    act(() => {
      result.current.updateFilters({
        dateRange: {
          startDate: '2024-01-01',
          endDate: '2024-01-31'
        }
      });
    });

    // Should trigger a re-render with new cache key containing filters
    expect(mockCacheHook).toHaveBeenCalledWith(
      expect.stringContaining('dateRange'),
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('should get reasons by category', () => {
    const mockAnalytics = {
      summary: {
        totalDenials: 156,
        denialRate: 12.5,
        totalDeniedAmount: 125000.00,
        averageDenialAmount: 801.28,
        topDenialReason: 'CO-45 - Charges exceed fee schedule',
        monthlyTrend: 'down' as const
      },
      reasons: [
        {
          code: 'CO-45',
          description: 'Charges exceed fee schedule',
          count: 45,
          amount: 35000.00,
          percentage: 28.8,
          trend: 'stable' as const,
          category: 'administrative' as const
        },
        {
          code: 'CO-97',
          description: 'Payment adjusted',
          count: 32,
          amount: 22000.00,
          percentage: 20.5,
          trend: 'decreasing' as const,
          category: 'clinical' as const
        }
      ],
      trends: [],
      byPayer: [],
      byProvider: [],
      recoverableAmount: 75000.00,
      appealOpportunities: []
    };

    mockCacheHook.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: true
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    const administrativeReasons = result.current.getReasonsByCategory('administrative');
    expect(administrativeReasons).toHaveLength(1);
    expect(administrativeReasons[0].code).toBe('CO-45');

    const clinicalReasons = result.current.getReasonsByCategory('clinical');
    expect(clinicalReasons).toHaveLength(1);
    expect(clinicalReasons[0].code).toBe('CO-97');
  });

  it('should get top reasons', () => {
    const mockAnalytics = {
      summary: {
        totalDenials: 156,
        denialRate: 12.5,
        totalDeniedAmount: 125000.00,
        averageDenialAmount: 801.28,
        topDenialReason: 'CO-45 - Charges exceed fee schedule',
        monthlyTrend: 'down' as const
      },
      reasons: [
        {
          code: 'CO-45',
          description: 'Charges exceed fee schedule',
          count: 45,
          amount: 35000.00,
          percentage: 28.8,
          trend: 'stable' as const,
          category: 'administrative' as const
        },
        {
          code: 'CO-97',
          description: 'Payment adjusted',
          count: 32,
          amount: 22000.00,
          percentage: 20.5,
          trend: 'decreasing' as const,
          category: 'clinical' as const
        },
        {
          code: 'CO-16',
          description: 'Claim lacks information',
          count: 28,
          amount: 18500.00,
          percentage: 17.9,
          trend: 'increasing' as const,
          category: 'administrative' as const
        }
      ],
      trends: [],
      byPayer: [],
      byProvider: [],
      recoverableAmount: 75000.00,
      appealOpportunities: []
    };

    mockCacheHook.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: true
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    const topReasons = result.current.getTopReasons(2);
    expect(topReasons).toHaveLength(2);
    expect(topReasons[0].code).toBe('CO-45');
    expect(topReasons[1].code).toBe('CO-97');
  });

  it('should calculate appealable amount', () => {
    const mockAnalytics = {
      summary: {
        totalDenials: 156,
        denialRate: 12.5,
        totalDeniedAmount: 125000.00,
        averageDenialAmount: 801.28,
        topDenialReason: 'CO-45 - Charges exceed fee schedule',
        monthlyTrend: 'down' as const
      },
      reasons: [],
      trends: [],
      byPayer: [],
      byProvider: [],
      recoverableAmount: 75000.00,
      appealOpportunities: [
        {
          claimId: 'CLM-001',
          patientName: 'John Doe',
          amount: 1250.00,
          denialReason: 'CO-45',
          appealProbability: 85,
          daysToAppeal: 45
        },
        {
          claimId: 'CLM-002',
          patientName: 'Jane Smith',
          amount: 850.00,
          denialReason: 'CO-16',
          appealProbability: 92,
          daysToAppeal: 38
        },
        {
          claimId: 'CLM-003',
          patientName: 'Bob Johnson',
          amount: 1500.00,
          denialReason: 'CO-197',
          appealProbability: 65, // Below 70% threshold
          daysToAppeal: 52
        }
      ]
    };

    mockCacheHook.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: true
    });

    const { result } = renderHook(() => useDenialAnalytics(), { wrapper });

    const appealableAmount = result.current.getAppealableAmount();
    // Should only include opportunities with >70% probability
    expect(appealableAmount).toBe(2100.00); // 1250 + 850
  });

  it('should handle auto-refresh', async () => {
    const mockRefetch = jest.fn();
    
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      isStale: false,
      isCached: false
    });

    renderHook(() => useDenialAnalytics({
      autoRefresh: true,
      refreshInterval: 100 // Short interval for testing
    }), { wrapper });

    // Wait for auto-refresh to trigger
    await waitFor(() => {
      expect(mockRefetch).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('should not fetch when disabled', () => {
    mockCacheHook.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      isStale: false,
      isCached: false
    });

    renderHook(() => useDenialAnalytics({
      enabled: false
    }), { wrapper });

    expect(mockCacheHook).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      expect.objectContaining({
        enabled: false
      })
    );
  });
});