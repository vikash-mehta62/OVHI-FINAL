/**
 * Lazy Component Definitions
 * Centralized lazy loading configuration for RCM components with advanced optimization
 */

import { lazy, ComponentType } from 'react';
import { LoadingSpinner } from './shared/LoadingSpinner';
import { LazyComponentWrapper, createLazyComponent, LazyRoute, LazyChart } from './shared/LazyComponentWrapper';

// Loading fallback component
export const LazyLoadingFallback = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner message={message} />
  </div>
);

// Chart loading fallback
export const ChartLoadingFallback = () => (
  <LazyLoadingFallback message="Loading chart..." />
);

// Dashboard loading fallback
export const DashboardLoadingFallback = () => (
  <LazyLoadingFallback message="Loading dashboard..." />
);

// Page loading fallback
export const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner message="Loading page..." />
  </div>
);

// ============================================================================
// DASHBOARD COMPONENTS (Enhanced with optimization)
// ============================================================================

// Main dashboard component with route-based optimization
export const LazyRCMDashboard = createLazyComponent(
  () => import('./RCMDashboard').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/dashboard',
    priority: 'high',
    preloadProbability: 0.9
  }
);

// Dashboard sections with intersection-based loading
export const LazyKPICards = createLazyComponent(
  () => import('./dashboard/KPICards').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'intersection',
    priority: 'high'
  }
);

export const LazyChartsSection = createLazyComponent(
  () => import('./dashboard/ChartsSection').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'intersection',
    priority: 'medium'
  }
);

export const LazyDashboardHeader = createLazyComponent(
  () => import('./dashboard/DashboardHeader').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'immediate',
    priority: 'high'
  }
);

// ============================================================================
// CHART COMPONENTS (Optimized for intersection-based loading)
// ============================================================================

export const LazyRevenueChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/RevenueChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyRevenueSourceChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/RevenueSourceChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyClaimsStatusChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/ClaimsStatusChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyClaimsProcessingChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/ClaimsProcessingChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyPaymentSummaryChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/PaymentSummaryChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyPaymentMethodsChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/PaymentMethodsChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyPaymentTrendsChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/PaymentTrendsChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyARAgingChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/ARAgingChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

export const LazyPerformanceMetricsChart = (props: any) => (
  <LazyChart
    importFn={() => import('./dashboard/charts/PerformanceMetricsChart').then(module => ({ default: module.default }))}
    chartProps={props}
    className="h-64"
  />
);

// ============================================================================
// MANAGEMENT COMPONENTS (Route-based optimization)
// ============================================================================

export const LazyClaimsManagement = createLazyComponent(
  () => import('./ClaimsManagement').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/claims',
    priority: 'high',
    preloadProbability: 0.8
  }
);

export const LazyARAgingManagement = createLazyComponent(
  () => import('./ARAgingManagement').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/ar-aging',
    priority: 'high',
    preloadProbability: 0.8
  }
);

export const LazyCollectionsManagement = createLazyComponent(
  () => import('./CollectionsManagement').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/collections',
    priority: 'medium',
    preloadProbability: 0.7
  }
);

export const LazyPaymentManagement = createLazyComponent(
  () => import('./PaymentManagement').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/payments',
    priority: 'high',
    preloadProbability: 0.8
  }
);

export const LazyDenialManagement = createLazyComponent(
  () => import('./DenialManagement').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'route',
    route: '/rcm/denials',
    priority: 'medium',
    preloadProbability: 0.7
  }
);

export const LazyPatientStatements = createLazyComponent(
  () => import('./PatientStatements').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'hover',
    priority: 'low',
    preloadProbability: 0.6
  }
);

export const LazyEligibilityChecker = createLazyComponent(
  () => import('./EligibilityChecker').then(module => ({ default: module.default })),
  {
    loadingStrategy: 'hover',
    priority: 'low',
    preloadProbability: 0.6
  }
);

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

export const LazyDataTable = lazy(() => 
  import('./shared/DataTable').then(module => ({ default: module.default }))
);

export const LazyVirtualizedTable = lazy(() => 
  import('./shared/VirtualizedTable').then(module => ({ default: module.default }))
);

export const LazyKPICard = lazy(() => 
  import('./shared/KPICard').then(module => ({ default: module.default }))
);

export const LazyStatusBadge = lazy(() => 
  import('./shared/StatusBadge').then(module => ({ default: module.default }))
);

export const LazyCurrencyDisplay = lazy(() => 
  import('./shared/CurrencyDisplay').then(module => ({ default: module.default }))
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Higher-order component for adding lazy loading with error boundary
 */
export const withLazyLoading = <P extends object>(
  LazyComponent: ComponentType<P>,
  fallback: React.ComponentType = LazyLoadingFallback,
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>
) => {
  return (props: P) => {
    const FallbackComponent = fallback;
    const ErrorFallback = errorFallback || DefaultErrorFallback;

    return (
      <ErrorBoundaryWrapper fallback={ErrorFallback}>
        <React.Suspense fallback={<FallbackComponent />}>
          <LazyComponent {...props} />
        </React.Suspense>
      </ErrorBoundaryWrapper>
    );
  };
};

/**
 * Default error fallback component
 */
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry: () => void }) => (
  <div className="flex flex-col items-center justify-center h-64 space-y-4">
    <div className="text-red-500">
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    </div>
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900">Failed to load component</h3>
      <p className="text-sm text-gray-500 mt-1">{error.message}</p>
      <button
        onClick={retry}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Try Again
      </button>
    </div>
  </div>
);

/**
 * Error boundary wrapper for lazy components
 */
class ErrorBoundaryWrapper extends React.Component<
  { children: React.ReactNode; fallback: React.ComponentType<{ error: Error; retry: () => void }> },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

// ============================================================================
// PRELOADING UTILITIES
// ============================================================================

/**
 * Preload components for better user experience
 */
export const preloadComponents = {
  dashboard: () => {
    LazyRCMDashboard;
    LazyKPICards;
    LazyChartsSection;
  },
  
  charts: () => {
    LazyRevenueChart;
    LazyClaimsStatusChart;
    LazyPaymentSummaryChart;
  },
  
  management: () => {
    LazyClaimsManagement;
    LazyARAgingManagement;
    LazyCollectionsManagement;
  },
  
  all: () => {
    preloadComponents.dashboard();
    preloadComponents.charts();
    preloadComponents.management();
  }
};

/**
 * Preload components on user interaction
 */
export const usePreloadOnHover = (componentGroup: keyof typeof preloadComponents) => {
  const preload = () => {
    preloadComponents[componentGroup]();
  };

  return {
    onMouseEnter: preload,
    onFocus: preload
  };
};

/**
 * Bundle information for monitoring
 */
export const bundleInfo = {
  dashboard: {
    components: ['RCMDashboard', 'KPICards', 'ChartsSection'],
    estimatedSize: '45KB'
  },
  charts: {
    components: ['RevenueChart', 'ClaimsStatusChart', 'PaymentSummaryChart', 'ARAgingChart'],
    estimatedSize: '60KB'
  },
  management: {
    components: ['ClaimsManagement', 'ARAgingManagement', 'CollectionsManagement'],
    estimatedSize: '80KB'
  },
  shared: {
    components: ['DataTable', 'VirtualizedTable', 'KPICard'],
    estimatedSize: '25KB'
  }
};

export default {
  // Dashboard
  LazyRCMDashboard,
  LazyKPICards,
  LazyChartsSection,
  
  // Charts
  LazyRevenueChart,
  LazyClaimsStatusChart,
  LazyPaymentSummaryChart,
  
  // Management
  LazyClaimsManagement,
  LazyARAgingManagement,
  LazyCollectionsManagement,
  
  // Utilities
  withLazyLoading,
  preloadComponents,
  usePreloadOnHover,
  bundleInfo
};