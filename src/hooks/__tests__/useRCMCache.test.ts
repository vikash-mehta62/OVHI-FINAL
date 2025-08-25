import { renderHook, waitFor, act } from '@testing-library/react';
import { useRCMCache, rcmCacheUtils } from '../useRCMCache';

describe('useRCMCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    rcmCacheUtils.clearAll();
    jest.clearAllMocks();
  });

  it('should cache data successfully', async () => {
    const mockData = { test: 'data' };
    const mockFetcher = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher, {
        staleTime: 1000,
        cacheTime: 2000
      })
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.isCached).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.isCached).toBe(true);
    expect(result.current.isStale).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should return cached data on subsequent renders', async () => {
    const mockData = { test: 'data' };
    const mockFetcher = jest.fn().mockResolvedValue(mockData);

    // First render
    const { result: result1 } = renderHook(() =>
      useRCMCache('test-key', mockFetcher)
    );

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // Second render with same key
    const { result: result2 } = renderHook(() =>
      useRCMCache('test-key', mockFetcher)
    );

    // Should return cached data immediately
    expect(result2.current.data).toEqual(mockData);
    expect(result2.current.isCached).toBe(true);
    expect(mockFetcher).toHaveBeenCalledTimes(1); // No additional fetch
  });

  it('should handle fetch errors', async () => {
    const errorMessage = 'Fetch failed';
    const mockFetcher = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.data).toBe(null);
    expect(result.current.isCached).toBe(false);
  });

  it('should not fetch when disabled', async () => {
    const mockFetcher = jest.fn();

    renderHook(() =>
      useRCMCache('test-key', mockFetcher, { enabled: false })
    );

    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('should force refetch when refetch is called', async () => {
    const mockData1 = { test: 'data1' };
    const mockData2 = { test: 'data2' };
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData1);
    expect(mockFetcher).toHaveBeenCalledTimes(1);

    // Force refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.data).toEqual(mockData2);
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('should invalidate cache', async () => {
    const mockData = { test: 'data' };
    const mockFetcher = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isCached).toBe(true);

    // Invalidate cache
    act(() => {
      result.current.invalidate();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.isCached).toBe(false);
  });

  it('should set data manually', async () => {
    const mockFetcher = jest.fn();
    const manualData = { manual: 'data' };

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher, { enabled: false })
    );

    // Set data manually
    act(() => {
      result.current.setData(manualData);
    });

    expect(result.current.data).toEqual(manualData);
    expect(result.current.isCached).toBe(true);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('should mark data as stale after staleTime', async () => {
    const mockData = { test: 'data' };
    const mockFetcher = jest.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() =>
      useRCMCache('test-key', mockFetcher, {
        staleTime: 100 // Very short stale time for testing
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
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

  describe('rcmCacheUtils', () => {
    it('should clear all cache', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ test: 'data' });

      // Add some data to cache
      const { result } = renderHook(() =>
        useRCMCache('test-key-1', mockFetcher)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(rcmCacheUtils.getInfo().size).toBe(1);

      // Clear all cache
      rcmCacheUtils.clearAll();

      expect(rcmCacheUtils.getInfo().size).toBe(0);
    });

    it('should clear specific keys', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ test: 'data' });

      // Add multiple items to cache
      const { result: result1 } = renderHook(() =>
        useRCMCache('test-key-1', mockFetcher)
      );
      const { result: result2 } = renderHook(() =>
        useRCMCache('test-key-2', mockFetcher)
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      expect(rcmCacheUtils.getInfo().size).toBe(2);

      // Clear specific key
      rcmCacheUtils.clear(['test-key-1']);

      expect(rcmCacheUtils.getInfo().size).toBe(1);
      expect(rcmCacheUtils.getInfo().keys).toEqual(['test-key-2']);
    });

    it('should invalidate by pattern', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ test: 'data' });

      // Add items with different patterns
      const { result: result1 } = renderHook(() =>
        useRCMCache('dashboard-30d', mockFetcher)
      );
      const { result: result2 } = renderHook(() =>
        useRCMCache('dashboard-90d', mockFetcher)
      );
      const { result: result3 } = renderHook(() =>
        useRCMCache('claims-data', mockFetcher)
      );

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
        expect(result3.current.isLoading).toBe(false);
      });

      expect(rcmCacheUtils.getInfo().size).toBe(3);

      // Invalidate dashboard pattern
      rcmCacheUtils.invalidatePattern(/^dashboard-/);

      expect(rcmCacheUtils.getInfo().size).toBe(1);
      expect(rcmCacheUtils.getInfo().keys).toEqual(['claims-data']);
    });

    it('should preload data', async () => {
      const mockData = { preloaded: 'data' };
      const mockFetcher = jest.fn().mockResolvedValue(mockData);

      // Preload data
      const result = await rcmCacheUtils.preload('preload-key', mockFetcher);

      expect(result).toEqual(mockData);
      expect(rcmCacheUtils.getInfo().size).toBe(1);
      expect(rcmCacheUtils.getInfo().keys).toEqual(['preload-key']);

      // Use preloaded data
      const { result: hookResult } = renderHook(() =>
        useRCMCache('preload-key', mockFetcher)
      );

      // Should return preloaded data immediately
      expect(hookResult.current.data).toEqual(mockData);
      expect(hookResult.current.isCached).toBe(true);
      expect(mockFetcher).toHaveBeenCalledTimes(1); // Only called during preload
    });
  });
});