/**
 * Error Handling System Test
 * Comprehensive test of all error handling components and utilities
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EnhancedErrorBoundary, ErrorType, ErrorSeverity } from '@/components/rcm/shared/EnhancedErrorBoundary';
import { ErrorProvider, useErrorContext } from '@/contexts/ErrorContext';
import { ErrorNotificationContainer } from '@/components/rcm/shared/ErrorNotification';
import { useErrorHandler, useAsyncOperation, useNetworkRequest } from '@/hooks/useErrorHandler';
import { apiGet, apiPost } from '@/utils/apiErrorHandler';

// Test component that throws different types of errors
const ErrorTestComponent: React.FC<{ errorType: string }> = ({ errorType }) => {
  const { addError } = useErrorContext();
  const { handleError, withErrorHandling } = useErrorHandler();

  const throwError = () => {
    switch (errorType) {
      case 'component':
        throw new Error('Component rendering error');
      case 'network':
        throw new Error('Network request failed');
      case 'validation':
        throw new Error('Validation failed: required field missing');
      case 'permission':
        throw new Error('Permission denied: unauthorized access');
      case 'critical':
        const criticalError = new Error('Critical system failure') as any;
        criticalError.severity = ErrorSeverity.CRITICAL;
        throw criticalError;
      default:
        throw new Error('Unknown error occurred');
    }
  };

  const handleAsyncError = withErrorHandling(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('Async operation failed');
  });

  const handleContextError = () => {
    addError('Context error test', {
      component: 'ErrorTestComponent',
      action: 'handleContextError',
      timestamp: new Date().toISOString()
    });
  };

  const handleManualError = () => {
    try {
      throw new Error('Manual error handling test');
    } catch (error) {
      handleError(error as Error, {
        component: 'ErrorTestComponent',
        method: 'handleManualError'
      });
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Error Test Component - {errorType}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={throwError} variant="destructive">
          Throw {errorType} Error
        </Button>
        <Button onClick={handleAsyncError} variant="outline">
          Async Error
        </Button>
        <Button onClick={handleContextError} variant="outline">
          Context Error
        </Button>
        <Button onClick={handleManualError} variant="outline">
          Manual Error
        </Button>
      </CardContent>
    </Card>
  );
};

// Network request test component
const NetworkTestComponent: React.FC = () => {
  const [url, setUrl] = useState('/api/test');
  const { data, loading, error, isError, execute } = useNetworkRequest(url, {}, {
    enableAutoRetry: false // Disable auto-retry for testing
  });

  const testApiCalls = async () => {
    try {
      // Test successful API call
      const result1 = await apiGet('/api/success');
      console.log('API Success:', result1);

      // Test API error
      const result2 = await apiPost('/api/error', { test: 'data' });
      console.log('API Result:', result2);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Network Request Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Test URL:</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="/api/endpoint"
          />
        </div>
        
        <div className="space-y-2">
          <Button onClick={execute} disabled={loading}>
            {loading ? 'Loading...' : 'Test Network Request'}
          </Button>
          <Button onClick={testApiCalls} variant="outline">
            Test API Utilities
          </Button>
        </div>

        {isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Network Error:</p>
            <p className="text-red-700 text-sm">{error?.message}</p>
          </div>
        )}

        {data && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 font-medium">Success:</p>
            <pre className="text-green-700 text-sm">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Async operation test component
const AsyncOperationTestComponent: React.FC = () => {
  const [shouldFail, setShouldFail] = useState(false);
  
  const asyncOperation = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (shouldFail) {
      throw new Error('Async operation intentionally failed');
    }
    return { message: 'Async operation completed successfully', timestamp: new Date() };
  };

  const { data, loading, error, isError, execute, retry } = useAsyncOperation(
    asyncOperation,
    [shouldFail],
    {
      enableAutoRetry: true,
      maxRetries: 2,
      onError: (error) => console.log('Async operation error:', error),
      onRetry: (count) => console.log('Retry attempt:', count)
    }
  );

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Async Operation Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="shouldFail"
            checked={shouldFail}
            onChange={(e) => setShouldFail(e.target.checked)}
          />
          <label htmlFor="shouldFail">Should Fail</label>
        </div>

        <div className="space-y-2">
          <Button onClick={execute} disabled={loading}>
            {loading ? 'Loading...' : 'Execute Async Operation'}
          </Button>
          {isError && (
            <Button onClick={retry} variant="outline">
              Retry Operation
            </Button>
          )}
        </div>

        {loading && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800">Operation in progress...</p>
          </div>
        )}

        {isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-medium">Operation Failed:</p>
            <p className="text-red-700 text-sm">{error?.message}</p>
          </div>
        )}

        {data && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-green-800 font-medium">Operation Success:</p>
            <pre className="text-green-700 text-sm">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Error statistics component
const ErrorStatsComponent: React.FC = () => {
  const { state, clearErrors } = useErrorContext();

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle>Error Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium">Total Errors</p>
            <p className="text-2xl font-bold text-red-600">{state.errorCount}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium">Active Errors</p>
            <p className="text-2xl font-bold text-orange-600">{state.errors.length}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium">Critical Errors</p>
            <p className="text-2xl font-bold text-red-800">{state.errorStats.criticalErrors}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="font-medium">Error History</p>
            <p className="text-2xl font-bold text-blue-600">{state.errorHistory.length}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Errors by Type:</h4>
          {Object.entries(state.errorStats.errorsByType).map(([type, count]) => (
            <div key={type} className="flex justify-between text-sm">
              <span>{type}:</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Errors by Severity:</h4>
          {Object.entries(state.errorStats.errorsBySeverity).map(([severity, count]) => (
            <div key={severity} className="flex justify-between text-sm">
              <span>{severity}:</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>

        <Button onClick={clearErrors} variant="outline" className="w-full">
          Clear All Errors
        </Button>
      </CardContent>
    </Card>
  );
};

// Main test application
const ErrorHandlingTestApp: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState<string>('component');

  return (
    <ErrorProvider maxErrors={20} autoRemoveDelay={10000}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Error Handling System Test
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Boundary Tests */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Error Boundary Tests</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Error Type:</label>
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="component">Component Error</option>
                  <option value="network">Network Error</option>
                  <option value="validation">Validation Error</option>
                  <option value="permission">Permission Error</option>
                  <option value="critical">Critical Error</option>
                </select>
              </div>

              <EnhancedErrorBoundary
                enableReporting={true}
                enableRecovery={true}
                maxRetries={3}
                level="section"
                onError={(error, errorInfo) => {
                  console.log('Error boundary caught:', error, errorInfo);
                }}
              >
                <ErrorTestComponent errorType={selectedTest} />
              </EnhancedErrorBoundary>
            </div>

            {/* Error Statistics */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Error Statistics</h2>
              <ErrorStatsComponent />
            </div>

            {/* Network Tests */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Network Request Tests</h2>
              <EnhancedErrorBoundary level="section">
                <NetworkTestComponent />
              </EnhancedErrorBoundary>
            </div>

            {/* Async Operation Tests */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Async Operation Tests</h2>
              <EnhancedErrorBoundary level="section">
                <AsyncOperationTestComponent />
              </EnhancedErrorBoundary>
            </div>
          </div>

          {/* Instructions */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Test Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Error Boundary Tests:</strong> Select different error types and click "Throw Error" to test error boundaries.</p>
                <p><strong>Network Tests:</strong> Change the URL and test network requests. Try invalid URLs to see error handling.</p>
                <p><strong>Async Tests:</strong> Toggle "Should Fail" and test async operations with retry functionality.</p>
                <p><strong>Error Statistics:</strong> Monitor error counts and types as you trigger different errors.</p>
                <p><strong>Notifications:</strong> Critical and high-severity errors will show toast notifications.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Global Error Notifications */}
        <ErrorNotificationContainer />
      </div>
    </ErrorProvider>
  );
};

export default ErrorHandlingTestApp;