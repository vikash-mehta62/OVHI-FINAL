/**
 * Advanced Lazy Loading Hook
 * Provides intelligent lazy loading with preloading, caching, and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bundleAnalyzer } from '@/utils/bundleAnalyzer';

interface LazyLoadingOptions {
  preload?: boolean;
  preloadDelay?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cacheTimeout?: number;
  onLoadStart?: () => void;
  onLoadSuccess?: (module: any) => void;
  onLoadError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
}

interface LazyLoadingState<T> {
  component: T | null;
  loading: boolean;
  error: Error | null;
  retryCount: number;
  cached: boolean;
  loadTime: number;
}

// Module cache with TTL
const moduleCache = new Map<string, { module: any; timestamp: number; ttl: number }>();

/**
 * Advanced lazy loading hook with intelligent preloading and caching
 */
export const useLazyLoading = <T = any>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadingOptions = {}
) => {
  const {
    preload = false,
    preloadDelay = 0,
    retryAttempts = 3,
    retryDelay = 1000,
    cacheTimeout = 5 * 60 * 1000, // 5 minutes
    onLoadStart,
    onLoadSuccess,
    onLoadError,
    onRetry
  } = options;

  const [state, setState] = useState<LazyLoadingState<T>>({
    component: null,
    loading: false,
    error: null,
    retryCount: 0,
    cached: false,
    loadTime: 0
  });

  const importFnRef = useRef(importFn);
  const loadStartTimeRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cache key from import function
  const cacheKey = importFnRef.current.toString();

  /**
   * Load component with caching and error handling
   */
  const loadComponent = useCallback(async (isRetry = false) => {
    // Check cache first
    const cached = moduleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      setState(prev => ({
        ...prev,
        component: cached.module.default,
        loading: false,
        error: null,
        cached: true,
        loadTime: 0
      }));
      onLoadSuccess?.(cached.module.default);
      return cached.module.default;
    }

    // Start loading
    loadStartTimeRef.current = performance.now();
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      cached: false
    }));

    onLoadStart?.();

    try {
      const module = await importFnRef.current();
      const loadTime = performance.now() - loadStartTimeRef.current;

      // Cache the module
      moduleCache.set(cacheKey, {
        module,
        timestamp: Date.now(),
        ttl: cacheTimeout
      });

      setState(prev => ({
        ...prev,
        component: module.default,
        loading: false,
        error: null,
        retryCount: 0,
        loadTime
      }));

      onLoadSuccess?.(module.default);
      return module.default;

    } catch (error) {
      const loadTime = performance.now() - loadStartTimeRef.current;
      const currentError = error as Error;

      setState(prev => ({
        ...prev,
        loading: false,
        error: currentError,
        loadTime,
        retryCount: isRetry ? prev.retryCount + 1 : 0
      }));

      onLoadError?.(currentError);

      // Auto-retry if attempts remaining
      if (state.retryCount < retryAttempts) {
        onRetry?.(state.retryCount + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          loadComponent(true);
        }, retryDelay * Math.pow(2, state.retryCount)); // Exponential backoff
      }

      throw currentError;
    }
  }, [cacheKey, cacheTimeout, retryAttempts, retryDelay, state.retryCount, onLoadStart, onLoadSuccess, onLoadError, onRetry]);

  /**
   * Manual retry function
   */
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    loadComponent(true);
  }, [loadComponent]);

  /**
   * Preload component
   */
  const preloadComponent = useCallback(() => {
    if (!state.component && !state.loading) {
      loadComponent();
    }
  }, [state.component, state.loading, loadComponent]);

  /**
   * Clear cache for this component
   */
  const clearCache = useCallback(() => {
    moduleCache.delete(cacheKey);
  }, [cacheKey]);

  // Handle preloading
  useEffect(() => {
    if (preload) {
      if (preloadDelay > 0) {
        preloadTimeoutRef.current = setTimeout(preloadComponent, preloadDelay);
      } else {
        preloadComponent();
      }
    }

    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [preload, preloadDelay, preloadComponent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    load: loadComponent,
    retry,
    preload: preloadComponent,
    clearCache
  };
};

/**
 * Hook for intersection-based lazy loading
 */
export const useIntersectionLazyLoading = <T = any>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadingOptions & { rootMargin?: string; threshold?: number } = {}
) => {
  const { rootMargin = '50px', threshold = 0.1, ...lazyOptions } = options;
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  const lazyLoading = useLazyLoading(importFn, {
    ...lazyOptions,
    preload: isIntersecting
  });

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.unobserve(target);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [rootMargin, threshold]);

  return {
    ...lazyLoading,
    targetRef
  };
};

/**
 * Hook for hover-based preloading
 */
export const useHoverPreloading = <T = any>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadingOptions = {}
) => {
  const lazyLoading = useLazyLoading(importFn, options);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    lazyLoading.preload();
  }, [lazyLoading]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    lazyLoading.preload();
  }, [lazyLoading]);

  return {
    ...lazyLoading,
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus
    }
  };
};

/**
 * Hook for route-based preloading
 */
export const useRoutePreloading = <T = any>(
  importFn: () => Promise<{ default: T }>,
  routes: string[],
  options: LazyLoadingOptions = {}
) => {
  const lazyLoading = useLazyLoading(importFn, options);
  const currentPath = window.location.pathname;

  useEffect(() => {
    // Preload if current route matches any of the specified routes
    const shouldPreload = routes.some(route => 
      currentPath.includes(route) || currentPath === route
    );

    if (shouldPreload) {
      lazyLoading.preload();
    }
  }, [currentPath, routes, lazyLoading]);

  return lazyLoading;
};

/**
 * Hook for priority-based lazy loading
 */
export const usePriorityLazyLoading = <T = any>(
  importFn: () => Promise<{ default: T }>,
  priority: 'high' | 'medium' | 'low' = 'medium',
  options: LazyLoadingOptions = {}
) => {
  const priorityDelays = {
    high: 0,
    medium: 1000,
    low: 3000
  };

  return useLazyLoading(importFn, {
    ...options,
    preload: true,
    preloadDelay: priorityDelays[priority]
  });
};

/**
 * Global cache management
 */
export const lazyCacheManager = {
  /**
   * Clear all cached modules
   */
  clearAll: () => {
    moduleCache.clear();
  },

  /**
   * Clear expired modules
   */
  clearExpired: () => {
    const now = Date.now();
    for (const [key, value] of moduleCache.entries()) {
      if (now - value.timestamp > value.ttl) {
        moduleCache.delete(key);
      }
    }
  },

  /**
   * Get cache statistics
   */
  getStats: () => {
    const now = Date.now();
    const total = moduleCache.size;
    const expired = Array.from(moduleCache.values()).filter(
      value => now - value.timestamp > value.ttl
    ).length;

    return {
      total,
      active: total - expired,
      expired,
      hitRate: bundleAnalyzer.getStats().cacheHitRate
    };
  },

  /**
   * Preload multiple components
   */
  preloadComponents: async (importFns: Array<() => Promise<any>>) => {
    const promises = importFns.map(fn => fn().catch(error => {
      console.warn('Failed to preload component:', error);
      return null;
    }));

    const results = await Promise.allSettled(promises);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  }
};

// Auto-cleanup expired cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    lazyCacheManager.clearExpired();
  }, 5 * 60 * 1000);
}

export default useLazyLoading;