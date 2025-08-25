# Comprehensive Error Handling Guide

## Overview

This guide covers the comprehensive error handling system implemented for the RCM module. The system provides multiple layers of error handling, from global error catching to component-level error boundaries and user-friendly error notifications.

## Architecture

### Error Handling Layers

1. **Global Error Handler** - Catches unhandled errors and promise rejections
2. **Enhanced Error Boundary** - React error boundaries with recovery and reporting
3. **Error Context** - Global error state management
4. **Error Handler Hooks** - Component-level error handling utilities
5. **API Error Handler** - Specialized handling for API requests
6. **Error Notifications** - User-friendly error display system

## Components

### 1. Enhanced Error Boundary

The `EnhancedErrorBoundary` component provides comprehensive error catching and recovery:

```tsx
import { EnhancedErrorBoundary } from '@/components/rcm/shared/EnhancedErrorBoundary';

// Basic usage
<EnhancedErrorBoundary>
  <YourComponent />
</EnhancedErrorBoundary>

// Advanced usage with options
<EnhancedErrorBoundary
  enableReporting={true}
  enableRecovery={true}
  maxRetries={3}
  onError={(error, errorInfo) => console.log('Error caught:', error)}
  level="component"
>
  <YourComponent />
</EnhancedErrorBoundary>
```

**Features:**
- Automatic error categorization and severity assessment
- Retry mechanism for recoverable errors
- Error reporting to external services
- User-friendly error display with recovery options
- Development mode debugging information

### 2. Error Handler Hooks

#### useErrorHandler

Primary hook for component-level error handling:

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MyComponent() {
  const {
    error,
    isError,
    handleError,
    clearError,
    retry,
    withErrorHandling
  } = useErrorHandler({
    maxRetries: 3,
    enableAutoRetry: true,
    onError: (error) => console.log('Error occurred:', error)
  });

  // Wrap async operations
  const fetchData = withErrorHandling(async () => {
    const response = await fetch('/api/data');
    return response.json();
  });

  // Manual error handling
  const handleSubmit = async () => {
    try {
      await submitForm();
    } catch (error) {
      handleError(error, { context: 'form submission' });
    }
  };

  if (isError) {
    return <ErrorDisplay error={error} onRetry={retry} onClear={clearError} />;
  }

  return <YourComponent />;
}
```

#### useAsyncOperation

Hook for handling async operations with built-in error handling:

```tsx
import { useAsyncOperation } from '@/hooks/useErrorHandler';

function DataComponent() {
  const {
    data,
    loading,
    error,
    isError,
    execute,
    retry
  } = useAsyncOperation(
    async () => {
      const response = await fetch('/api/data');
      return response.json();
    },
    [], // dependencies
    { enableAutoRetry: true, maxRetries: 3 }
  );

  if (loading) return <LoadingSpinner />;
  if (isError) return <ErrorDisplay error={error} onRetry={retry} />;
  
  return <DataDisplay data={data} />;
}
```

#### useNetworkRequest

Specialized hook for network requests:

```tsx
import { useNetworkRequest } from '@/hooks/useErrorHandler';

function ApiComponent() {
  const { data, loading, error, isError } = useNetworkRequest(
    '/api/endpoint',
    { method: 'GET' },
    { enableAutoRetry: true }
  );

  if (loading) return <LoadingSpinner />;
  if (isError) return <ErrorNotification error={error} />;
  
  return <DataDisplay data={data} />;
}
```

### 3. Error Context

Global error state management:

```tsx
import { ErrorProvider, useErrorContext } from '@/contexts/ErrorContext';

// Wrap your app
function App() {
  return (
    <ErrorProvider maxErrors={10} autoRemoveDelay={5000}>
      <YourApp />
      <ErrorNotificationContainer />
    </ErrorProvider>
  );
}

// Use in components
function MyComponent() {
  const {
    addError,
    clearErrors,
    hasErrors,
    hasCriticalErrors,
    getErrorsByType
  } = useErrorContext();

  const handleAction = () => {
    try {
      // Some operation
    } catch (error) {
      addError(error, { component: 'MyComponent', action: 'handleAction' });
    }
  };

  return <YourComponent />;
}
```

### 4. API Error Handler

Enhanced fetch with automatic error handling and retry:

```tsx
import { apiGet, apiPost, enhancedFetch } from '@/utils/apiErrorHandler';

// Simple API calls
const data = await apiGet('/api/data');
const result = await apiPost('/api/submit', { data: 'value' });

// Custom fetch with error handling
const response = await enhancedFetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

### 5. Global Error Handler

Catches unhandled errors automatically:

```tsx
import { globalErrorHandler } from '@/utils/globalErrorHandler';

// Already initialized automatically
// Access error statistics
const stats = globalErrorHandler.getErrorStats();
console.log('Total errors:', stats.totalErrors);
console.log('Critical errors:', stats.criticalErrors);
```

### 6. Error Notifications

User-friendly error display:

```tsx
import { ErrorNotification, ErrorNotificationContainer } from '@/components/rcm/shared/ErrorNotification';

// Individual error notification
<ErrorNotification
  error={error}
  onDismiss={() => clearError()}
  onRetry={() => retry()}
  onReport={() => reportError()}
  showDetails={true}
/>

// Global notification container (place in app root)
<ErrorNotificationContainer />
```

## Error Types and Severity

### Error Types

- `COMPONENT_ERROR` - React component errors
- `NETWORK_ERROR` - Network and API errors
- `VALIDATION_ERROR` - Form and data validation errors
- `PERMISSION_ERROR` - Authentication and authorization errors
- `DATA_ERROR` - Data parsing and processing errors
- `UNKNOWN_ERROR` - Unclassified errors

### Error Severity

- `CRITICAL` - System-breaking errors requiring immediate attention
- `HIGH` - Significant errors affecting functionality
- `MEDIUM` - Moderate errors with workarounds available
- `LOW` - Minor errors or warnings

## Best Practices

### 1. Error Boundary Placement

```tsx
// Page-level error boundary
<EnhancedErrorBoundary level="page" enableReporting={true}>
  <PageComponent />
</EnhancedErrorBoundary>

// Section-level error boundary
<EnhancedErrorBoundary level="section" isolate={true}>
  <SectionComponent />
</EnhancedErrorBoundary>

// Component-level error boundary
<EnhancedErrorBoundary level="component" enableRecovery={true}>
  <CriticalComponent />
</EnhancedErrorBoundary>
```

### 2. Error Context Usage

```tsx
// Add contextual information to errors
const { addError } = useErrorContext();

try {
  await processPayment(paymentData);
} catch (error) {
  addError(error, {
    userId: user.id,
    paymentId: paymentData.id,
    amount: paymentData.amount,
    timestamp: new Date().toISOString()
  });
}
```

### 3. Async Operation Handling

```tsx
// Use withErrorHandling for consistent error handling
const { withErrorHandling } = useErrorHandler();

const saveData = withErrorHandling(async (data) => {
  const response = await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
});

// Call the wrapped function
const result = await saveData(formData);
```

### 4. Form Validation

```tsx
const validationSchema = (data) => {
  const errors = [];
  if (!data.email) errors.push('Email is required');
  if (!data.password) errors.push('Password is required');
  return errors.length > 0 ? errors : null;
};

const { validate, validationErrors, isError } = useFormValidation(validationSchema);

const handleSubmit = (formData) => {
  if (validate(formData)) {
    // Submit form
  } else {
    // Display validation errors
  }
};
```

## Configuration

### Environment Variables

```env
# Error reporting
REACT_APP_ERROR_REPORTING_ENDPOINT=/api/errors
REACT_APP_ERROR_REPORTING_API_KEY=your-api-key

# Application info
REACT_APP_VERSION=1.0.0
REACT_APP_BUILD_ID=build-123
```

### Error Boundary Configuration

```tsx
<EnhancedErrorBoundary
  enableReporting={process.env.NODE_ENV === 'production'}
  enableRecovery={true}
  maxRetries={3}
  resetOnPropsChange={true}
  resetKeys={[userId, sessionId]}
  level="page"
  onError={(error, errorInfo) => {
    // Custom error handling
    analytics.track('error_occurred', {
      error: error.message,
      component: errorInfo.componentStack
    });
  }}
>
  <App />
</EnhancedErrorBoundary>
```

## Testing

### Error Boundary Testing

```tsx
import { render, screen } from '@testing-library/react';
import { EnhancedErrorBoundary } from '@/components/rcm/shared/EnhancedErrorBoundary';

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
};

test('should catch and display errors', () => {
  render(
    <EnhancedErrorBoundary>
      <ThrowError shouldThrow={true} />
    </EnhancedErrorBoundary>
  );

  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});
```

### Hook Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';

test('should handle errors correctly', () => {
  const { result } = renderHook(() => useErrorHandler());

  act(() => {
    result.current.handleError('Test error');
  });

  expect(result.current.isError).toBe(true);
  expect(result.current.error.message).toBe('Test error');
});
```

## Monitoring and Analytics

### Error Reporting

The system automatically reports errors to configured endpoints:

```javascript
// Error payload structure
{
  message: "Error message",
  stack: "Error stack trace",
  type: "NETWORK_ERROR",
  severity: "HIGH",
  timestamp: "2023-12-01T10:00:00.000Z",
  url: "https://app.example.com/page",
  userAgent: "Mozilla/5.0...",
  userId: "user123",
  sessionId: "session456",
  context: {
    component: "PaymentForm",
    action: "submitPayment"
  },
  environment: "production",
  version: "1.0.0"
}
```

### Error Statistics

```tsx
import { globalErrorHandler } from '@/utils/globalErrorHandler';

// Get error statistics
const stats = globalErrorHandler.getErrorStats();

console.log('Error Statistics:', {
  totalErrors: stats.totalErrors,
  criticalErrors: stats.criticalErrors,
  errorsByType: stats.errorsByType,
  errorsBySeverity: stats.errorsBySeverity
});
```

## Troubleshooting

### Common Issues

1. **Error boundaries not catching errors**
   - Ensure error boundaries are placed correctly in component tree
   - Error boundaries only catch errors in child components
   - Use multiple error boundaries for better isolation

2. **Async errors not being caught**
   - Use `withErrorHandling` wrapper for async operations
   - Handle promise rejections explicitly
   - Consider using `useAsyncOperation` hook

3. **Error reporting not working**
   - Check network connectivity
   - Verify API endpoint configuration
   - Check browser console for reporting errors

4. **Too many error notifications**
   - Adjust `autoRemoveDelay` in ErrorProvider
   - Implement error deduplication
   - Use error throttling in global handler

### Debug Mode

Enable detailed error logging in development:

```tsx
// Set environment variable
NODE_ENV=development

// Or configure manually
<EnhancedErrorBoundary
  enableConsoleLogging={true}
  enableReporting={false}
>
  <App />
</EnhancedErrorBoundary>
```

## Migration Guide

### From Basic Error Handling

```tsx
// Before
try {
  const data = await fetchData();
  setData(data);
} catch (error) {
  console.error(error);
  setError(error.message);
}

// After
const { data, loading, error, isError } = useAsyncOperation(fetchData);
```

### From Simple Error Boundaries

```tsx
// Before
<ErrorBoundary>
  <Component />
</ErrorBoundary>

// After
<EnhancedErrorBoundary
  enableReporting={true}
  enableRecovery={true}
  onError={(error) => analytics.track('error', error)}
>
  <Component />
</EnhancedErrorBoundary>
```

This comprehensive error handling system provides robust error management, user-friendly error display, and detailed error reporting for better debugging and monitoring.