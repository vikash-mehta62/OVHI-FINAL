/**
 * RCM Routes with Code Splitting
 * Implements route-level code splitting for RCM module
 */

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// Import lazy components
import {
  LazyRCMDashboard,
  LazyClaimsManagement,
  LazyARAgingManagement,
  LazyCollectionsManagement,
  LazyPaymentManagement,
  LazyDenialManagement,
  LazyPatientStatements,
  LazyEligibilityChecker,
  PageLoadingFallback,
  preloadComponents,
  usePreloadOnHover
} from './LazyComponents';

// Route configuration with lazy loading
const routeConfig = [
  {
    path: 'dashboard',
    component: LazyRCMDashboard,
    preload: 'dashboard' as const,
    title: 'RCM Dashboard',
    description: 'Revenue cycle management overview and analytics'
  },
  {
    path: 'claims',
    component: LazyClaimsManagement,
    preload: 'management' as const,
    title: 'Claims Management',
    description: 'Manage and track insurance claims'
  },
  {
    path: 'ar-aging',
    component: LazyARAgingManagement,
    preload: 'management' as const,
    title: 'A/R Aging',
    description: 'Accounts receivable aging analysis'
  },
  {
    path: 'collections',
    component: LazyCollectionsManagement,
    preload: 'management' as const,
    title: 'Collections',
    description: 'Manage collection workflows and follow-ups'
  },
  {
    path: 'payments',
    component: LazyPaymentManagement,
    preload: 'management' as const,
    title: 'Payment Management',
    description: 'Process and track payments'
  },
  {
    path: 'denials',
    component: LazyDenialManagement,
    preload: 'management' as const,
    title: 'Denial Management',
    description: 'Manage claim denials and appeals'
  },
  {
    path: 'statements',
    component: LazyPatientStatements,
    preload: 'management' as const,
    title: 'Patient Statements',
    description: 'Generate and manage patient statements'
  },
  {
    path: 'eligibility',
    component: LazyEligibilityChecker,
    preload: 'management' as const,
    title: 'Eligibility Checker',
    description: 'Check patient insurance eligibility'
  }
];

/**
 * Error fallback component for route-level errors
 */
const RouteErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div className="mt-4 text-center">
        <h3 className="text-lg font-medium text-gray-900">Something went wrong</h3>
        <p className="mt-2 text-sm text-gray-500">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <div className="mt-6 flex space-x-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/rcm/dashboard'}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Navigation component with preloading
 */
export const RCMNavigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex space-x-8">
            {routeConfig.map((route) => {
              const preloadProps = usePreloadOnHover(route.preload);
              
              return (
                <a
                  key={route.path}
                  href={`/rcm/${route.path}`}
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  {...preloadProps}
                >
                  {route.title}
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

/**
 * Route wrapper with performance monitoring
 */
const RouteWrapper: React.FC<{ 
  component: React.ComponentType; 
  title: string;
  description: string;
}> = ({ component: Component, title, description }) => {
  // Set page title and meta description
  React.useEffect(() => {
    document.title = `${title} - RCM`;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    }
  }, [title, description]);

  return <Component />;
};

/**
 * Main RCM Routes component
 */
const RCMRoutes: React.FC = () => {
  // Preload dashboard components on app start
  React.useEffect(() => {
    // Preload dashboard after a short delay to not block initial render
    const timer = setTimeout(() => {
      preloadComponents.dashboard();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={RouteErrorFallback}
      onError={(error, errorInfo) => {
        console.error('RCM Route Error:', error, errorInfo);
        // Here you could send error to monitoring service
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <RCMNavigation />
        
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Default redirect to dashboard */}
              <Route path="/" element={<Navigate to="/rcm/dashboard" replace />} />
              
              {/* Dynamic routes from configuration */}
              {routeConfig.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <RouteWrapper
                      component={route.component}
                      title={route.title}
                      description={route.description}
                    />
                  }
                />
              ))}
              
              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/rcm/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
};

export default RCMRoutes;