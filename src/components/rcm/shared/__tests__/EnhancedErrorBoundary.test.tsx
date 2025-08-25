/**
 * Enhanced Error Boundary Tests
 * Comprehensive test suite for error boundary functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EnhancedErrorBoundary, ErrorType, ErrorSeverity, EnhancedError } from '../EnhancedErrorBoundary';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
});

// Test component that throws errors
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = false, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// Mock fetch for error reporting
global.fetch = vi.fn();

describe('EnhancedErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  describe('Error Catching', () => {
    it('should catch and display errors', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage=\"Test error message\" />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render children when no error occurs', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={false} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      
      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage=\"Callback test error\" />
        </EnhancedErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error'
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Enhancement', () => {
    it('should enhance error with metadata', () => {
      const onError = vi.fn();
      
      render(
        <EnhancedErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage=\"Enhancement test\" />
        </EnhancedErrorBoundary>
      );

      const enhancedError = onError.mock.calls[0][0] as EnhancedError;
      
      expect(enhancedError.timestamp).toBeInstanceOf(Date);
      expect(enhancedError.type).toBeDefined();
      expect(enhancedError.severity).toBeDefined();
      expect(enhancedError.userAgent).toBe(navigator.userAgent);
      expect(enhancedError.url).toBe(window.location.href);
      expect(enhancedError.sessionId).toBeDefined();
    });

    it('should categorize network errors correctly', () => {
      const networkError = new Error('Network request failed');
      const categorized = EnhancedErrorBoundary.enhanceError(networkError);
      
      expect(categorized.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('should categorize validation errors correctly', () => {
      const validationError = new Error('Validation failed: required field missing');
      const categorized = EnhancedErrorBoundary.enhanceError(validationError);
      
      expect(categorized.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should determine critical severity correctly', () => {
      const criticalError = new Error('Critical system failure');
      const categorized = EnhancedErrorBoundary.enhanceError(criticalError);
      
      expect(categorized.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Error Recovery', () => {
    it('should show retry button for retryable errors', () => {
      const retryableError = new Error('Network timeout') as EnhancedError;
      retryableError.retryable = true;
      
      const ThrowRetryableError = () => {
        throw retryableError;
      };

      render(
        <EnhancedErrorBoundary enableRecovery={true}>
          <ThrowRetryableError />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should reset error state when reset button is clicked', () => {
      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Reset'));
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should retry operation when retry button is clicked', async () => {
      let shouldThrow = true;
      
      const RetryableComponent = () => {
        if (shouldThrow) {
          const error = new Error('Retryable error') as EnhancedError;
          error.retryable = true;
          throw error;
        }
        return <div>Success after retry</div>;
      };

      render(
        <EnhancedErrorBoundary enableRecovery={true}>
          <RetryableComponent />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Simulate successful retry
      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));
      
      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });
    });
  });

  describe('Error Reporting', () => {
    it('should report critical errors automatically', async () => {
      const criticalError = new Error('Critical system error') as EnhancedError;
      criticalError.severity = ErrorSeverity.CRITICAL;
      
      const ThrowCriticalError = () => {
        throw criticalError;
      };

      render(
        <EnhancedErrorBoundary enableReporting={true}>
          <ThrowCriticalError />
        </EnhancedErrorBoundary>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/errors',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('Critical system error')
          })
        );
      });
    });

    it('should allow manual error reporting', async () => {
      render(
        <EnhancedErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      fireEvent.click(screen.getByText('Report Issue'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('should show reporting status', async () => {
      // Mock slow response
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: () => ({}) }), 100))
      );

      render(
        <EnhancedErrorBoundary enableReporting={true}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      fireEvent.click(screen.getByText('Report Issue'));
      
      expect(screen.getByText('Reporting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Reported')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback component', () => {
      const CustomFallback: React.FC<any> = ({ error }) => (
        <div>Custom error: {error.message}</div>
      );

      render(
        <EnhancedErrorBoundary fallback={CustomFallback}>
          <ThrowError shouldThrow={true} errorMessage=\"Custom fallback test\" />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Custom error: Custom fallback test')).toBeInTheDocument();
    });
  });

  describe('Error Isolation', () => {
    it('should isolate errors when isolate prop is true', () => {
      const onError = vi.fn();
      
      render(
        <div>
          <EnhancedErrorBoundary isolate={true} onError={onError}>
            <ThrowError shouldThrow={true} />
          </EnhancedErrorBoundary>
          <div>Other content</div>
        </div>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Other content')).toBeInTheDocument();
    });
  });

  describe('Reset on Props Change', () => {
    it('should reset error when resetKeys change', () => {
      const { rerender } = render(
        <EnhancedErrorBoundary resetKeys={['key1']}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      rerender(
        <EnhancedErrorBoundary resetKeys={['key2']}>
          <ThrowError shouldThrow={false} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should reset error when children change and resetOnPropsChange is true', () => {
      const { rerender } = render(
        <EnhancedErrorBoundary resetOnPropsChange={true}>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      rerender(
        <EnhancedErrorBoundary resetOnPropsChange={true}>
          <div>New content</div>
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('New content')).toBeInTheDocument();
    });
  });

  describe('Copy Error Details', () => {
    it('should copy error details to clipboard', async () => {
      // Mock clipboard API
      const mockWriteText = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage=\"Copy test error\" />
        </EnhancedErrorBoundary>
      );

      fireEvent.click(screen.getByText('Copy Details'));

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining('Copy test error')
        );
      });
    });
  });

  describe('Development Mode', () => {
    it('should show developer details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(screen.getByText('Developer Details')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should log errors in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <EnhancedErrorBoundary>
          <ThrowError shouldThrow={true} />
        </EnhancedErrorBoundary>
      );

      expect(console.group).toHaveBeenCalledWith('🚨 Error Boundary Caught Error');
      expect(console.error).toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });
});