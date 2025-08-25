/**
 * Lazy Component Wrapper
 * Advanced wrapper for lazy-loaded components with optimization features
 */

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLazyLoading, useIntersectionLazyLoading, useHoverPreloading } from '@/hooks/useLazyLoading';
import { useBundleOptimizer } from '@/utils/bundleOptimizer';
import { LoadingSpinner } from './LoadingSpinner';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';

interface LazyComponentWrapperProps {
  children?: React.ReactNode;
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  loadingStrategy?: 'immediate' | 'intersection' | 'hover' | 'route' | 'priority';
  priority?: 'high' | 'medium' | 'low';
  route?: string;
  preloadProbability?: number;
  className?: string;
  style?: React.CSSProperties;
  onLoadStart?: () => void;
  onLoadSuccess?: (component: React.ComponentType) => void;
  onLoadError?: (error: Error) => void;
  componentProps?: Record<string, any>;
}

/**
 * Default loading fallback
 */
const DefaultLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Loading component...' }) => (
  <div className="flex items-center justify-center h-32">
    <LoadingSpinner message={message} />
  </div>
);

/**
 * Default error fallback
 */
const DefaultErrorFallback: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center h-32 space-y-4 p-4 border border-red-200 rounded-lg bg-red-50">
    <div className="text-red-500">
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <div className="text-center">
      <h3 className="text-sm font-medium text-red-800">Failed to load component</h3>
      <p className="text-xs text-red-600 mt-1">{error.message}</p>
      <button
        onClick={retry}
        className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Try Again
      </button>
    </div>
  </div>
);

/**
 * Performance monitoring wrapper
 */
const PerformanceWrapper: React.FC<{ 
  children: React.ReactNode; 
  componentName: string;
  onMetrics?: (metrics: { loadTime: number; renderTime: number }) => void;
}> = ({ children, componentName, onMetrics }) => {
  const [renderStartTime] = useState(() => performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime;
    
    // Get load time from performance entries
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const loadTime = entries[0]?.loadEventEnd - entries[0]?.loadEventStart || 0;

    onMetrics?.({ loadTime, renderTime });

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 ${componentName} Performance:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        loadTime: `${loadTime.toFixed(2)}ms`
      });
    }
  }, [componentName, renderStartTime, onMetrics]);

  return <>{children}</>;
};

/**
 * Lazy Component Wrapper with advanced optimization
 */
export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  importFn,
  fallback: FallbackComponent = DefaultLoadingFallback,
  errorFallback: ErrorFallbackComponent = DefaultErrorFallback,
  loadingStrategy = 'immediate',
  priority = 'medium',
  route,
  preloadProbability = 0.5,
  className,
  style,
  onLoadStart,
  onLoadSuccess,
  onLoadError,
  componentProps = {}
}) => {
  const { shouldPreload, getLoadingPriority } = useBundleOptimizer();
  const [componentName] = useState(() => {
    // Extract component name from import function
    const fnString = importFn.toString();
    const match = fnString.match(/import\(['"`](.+?)['"`]\)/);
    return match ? match[1].split('/').pop()?.replace(/['"]/g, '') || 'Unknown' : 'Unknown';
  });

  // Determine if component should be preloaded based on strategy
  const shouldPreloadComponent = useCallback(() => {
    if (route) {
      return shouldPreload(route, preloadProbability);
    }
    return preloadProbability >= 0.5;
  }, [route, preloadProbability, shouldPreload]);

  // Select appropriate lazy loading hook based on strategy
  const getLazyLoadingHook = () => {
    const options = {
      onLoadStart,
      onLoadSuccess,
      onLoadError,
      retryAttempts: 3,
      retryDelay: 1000
    };

    switch (loadingStrategy) {
      case 'intersection':
        return useIntersectionLazyLoading(importFn, {
          ...options,
          rootMargin: '100px',
          threshold: 0.1
        });

      case 'hover':
        return useHoverPreloading(importFn, options);

      case 'priority':
        const priorityDelays = { high: 0, medium: 1000, low: 3000 };
        return useLazyLoading(importFn, {
          ...options,
          preload: true,
          preloadDelay: priorityDelays[priority]
        });

      case 'route':
        return useLazyLoading(importFn, {
          ...options,
          preload: shouldPreloadComponent()
        });

      case 'immediate':
      default:
        return useLazyLoading(importFn, {
          ...options,
          preload: true,
          preloadDelay: 0
        });
    }
  };

  const lazyLoading = getLazyLoadingHook();

  // Handle performance metrics
  const handleMetrics = useCallback((metrics: { loadTime: number; renderTime: number }) => {
    // Send metrics to analytics or monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: analytics.track('component_performance', { componentName, ...metrics });
    }
  }, [componentName]);

  // Render loading state
  if (lazyLoading.loading) {
    return (
      <div className={className} style={style}>
        <FallbackComponent />
      </div>
    );
  }

  // Render error state
  if (lazyLoading.error) {
    return (
      <div className={className} style={style}>
        <ErrorFallbackComponent error={lazyLoading.error} retry={lazyLoading.retry} />
      </div>
    );
  }

  // Render component when loaded
  if (lazyLoading.component) {
    const Component = lazyLoading.component;
    
    return (
      <div className={className} style={style}>
        <PerformanceWrapper componentName={componentName} onMetrics={handleMetrics}>
          <EnhancedErrorBoundary
            level="component"
            enableRecovery={true}
            enableReporting={true}
          >
            <Component {...componentProps}>
              {children}
            </Component>
          </EnhancedErrorBoundary>
        </PerformanceWrapper>
      </div>
    );
  }

  // Render intersection observer target for intersection strategy
  if (loadingStrategy === 'intersection' && 'targetRef' in lazyLoading) {
    return (
      <div ref={lazyLoading.targetRef} className={className} style={style}>
        <FallbackComponent />
      </div>
    );
  }

  // Render hover target for hover strategy
  if (loadingStrategy === 'hover' && 'hoverProps' in lazyLoading) {
    return (
      <div {...lazyLoading.hoverProps} className={className} style={style}>
        <FallbackComponent />
      </div>
    );
  }

  // Default fallback
  return (
    <div className={className} style={style}>
      <FallbackComponent />
    </div>
  );
};

/**
 * Higher-order component for creating lazy components
 */
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: React.ComponentType<P> }>,
  options: Omit<LazyComponentWrapperProps, 'importFn' | 'componentProps'> = {}
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <LazyComponentWrapper
      importFn={importFn}
      componentProps={{ ...props, ref }}
      {...options}
    />
  ));
};

/**
 * Lazy route component wrapper
 */
export const LazyRoute: React.FC<{
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  route: string;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}> = ({ importFn, route, fallback, errorFallback }) => {
  return (
    <LazyComponentWrapper
      importFn={importFn}
      loadingStrategy="route"
      route={route}
      fallback={fallback}
      errorFallback={errorFallback}
      className="min-h-screen"
    />
  );
};

/**
 * Lazy chart component wrapper with specific optimizations
 */
export const LazyChart: React.FC<{
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  chartProps?: Record<string, any>;
  className?: string;
}> = ({ importFn, chartProps, className }) => {
  return (
    <LazyComponentWrapper
      importFn={importFn}
      loadingStrategy="intersection"
      priority="medium"
      componentProps={chartProps}
      className={className}
      fallback={() => (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border">
          <LoadingSpinner message="Loading chart..." />
        </div>
      )}
    />
  );
};

/**
 * Lazy modal component wrapper
 */
export const LazyModal: React.FC<{
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  isOpen: boolean;
  modalProps?: Record<string, any>;
}> = ({ importFn, isOpen, modalProps }) => {
  return isOpen ? (
    <LazyComponentWrapper
      importFn={importFn}
      loadingStrategy="immediate"
      priority="high"
      componentProps={modalProps}
    />
  ) : null;
};

export default LazyComponentWrapper;