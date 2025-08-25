import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  staleTime: number;
  key: string;
}

interface CacheOptions {
  staleTime?: number;
  cacheTime?: number;
  enabled?: boolean;
}

interface UseRCMCacheReturn<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  isCached: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
  setData: (data: T) => void;
}

class RCMCache {
  private cache = new Map<string, CacheEntry<any>>();
  private timers = new Map<string, NodeJS.Timeout>();

  set<T>(key: string, data: T, staleTime: number, cacheTime: number): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set cache entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      key
    });

    // Set cleanup timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, cacheTime);
    
    this.timers.set(key, timer);
  }

  get<T>(key: string): CacheEntry<T> | null {
    return this.cache.get(key) || null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;
    
    return Date.now() - entry.timestamp > entry.staleTime;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Global cache instance
const globalCache = new RCMCache();

export const useRCMCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): UseRCMCacheReturn<T> => {
  const {
    staleTime = 300000, // 5 minutes
    cacheTime = 600000, // 10 minutes
    enabled = true
  } = options;

  const [data, setDataState] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  const mountedRef = useRef(true);

  // Update fetcher ref when it changes
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first (unless forced)
    if (!force) {
      const cached = globalCache.get<T>(key);
      if (cached && !globalCache.isStale(key)) {
        setDataState(cached.data);
        setError(null);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await fetcherRef.current();
      
      if (mountedRef.current) {
        setDataState(result);
        globalCache.set(key, result, staleTime, cacheTime);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        console.error(`Cache fetch error for key "${key}":`, err);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [key, enabled, staleTime, cacheTime]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    globalCache.delete(key);
    setDataState(null);
  }, [key]);

  const setData = useCallback((newData: T) => {
    setDataState(newData);
    globalCache.set(key, newData, staleTime, cacheTime);
  }, [key, staleTime, cacheTime]);

  // Computed values
  const isCached = globalCache.has(key);
  const isStale = globalCache.isStale(key);

  return {
    data,
    isLoading,
    isStale,
    isCached,
    error,
    refetch,
    invalidate,
    setData
  };
};

// Cache management utilities
export const rcmCacheUtils = {
  // Clear all cache
  clearAll: () => globalCache.clear(),
  
  // Clear specific keys
  clear: (keys: string[]) => {
    keys.forEach(key => globalCache.delete(key));
  },
  
  // Get cache info
  getInfo: () => ({
    size: globalCache.size(),
    keys: globalCache.keys()
  }),
  
  // Invalidate by pattern
  invalidatePattern: (pattern: RegExp) => {
    const keys = globalCache.keys();
    keys.forEach(key => {
      if (pattern.test(key)) {
        globalCache.delete(key);
      }
    });
  },
  
  // Preload data
  preload: async <T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}) => {
    const { staleTime = 300000, cacheTime = 600000 } = options;
    
    try {
      const data = await fetcher();
      globalCache.set(key, data, staleTime, cacheTime);
      return data;
    } catch (error) {
      console.error(`Preload error for key "${key}":`, error);
      throw error;
    }
  }
};