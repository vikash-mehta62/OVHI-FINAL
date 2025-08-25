/**
 * Error Handler Hook Tests
 * Comprehensive test suite for error handling hooks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useErrorHandler, useAsyncOperation, useNetworkRequest, useFormValidation } from '../useErrorHandler';
import { ErrorType, ErrorSeverity } from '@/components/rcm/shared/EnhancedErrorBoundary';

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
  vi.clearAllTimers();
  vi.useFakeTimers();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
  vi.useRealTimers();
});

// Mock fetch
global.fetch = vi.fn();

describe('useErrorHandler', () => {
  describe('Basic Error Handling', () => {
    it('should handle string errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error message');
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Test error message');
      expect(result.current.retryCount).toBe(0);
    });

    it('should handle Error objects', () => {
      const { result } = renderHook(() => useErrorHandler());
      const testError = new Error('Test error object');

      act(() => {
        result.current.handleError(testError);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Test error object');
    });

    it('should enhance errors with metadata', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error', { userId: '123', action: 'test' });
      });

      expect(result.current.error?.timestamp).toBeInstanceOf(Date);
      expect(result.current.error?.type).toBeDefined();
      expect(result.current.error?.severity).toBeDefined();
      expect(result.current.error?.context).toEqual({ userId: '123', action: 'test' });
      expect(result.current.error?.url).toBe(window.location.href);
      expect(result.current.error?.userAgent).toBe(navigator.userAgent);
    });

    it('should clear errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Test error');
      });

      expect(result.current.isError).toBe(true);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.retryCount).toBe(0);
    });
  });

  describe('Error Callbacks', () => {
    it('should call onError callback', () => {
      const onError = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onError }));

      act(() => {
        result.current.handleError('Test error');
      });

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error'
        })
      );
    });

    it('should call onRecover callback when clearing error', () => {
      const onRecover = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onRecover }));

      act(() => {
        result.current.handleError('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(onRecover).toHaveBeenCalled();
    });

    it('should call onRetry callback during retry', async () => {
      const onRetry = vi.fn();
      const { result } = renderHook(() => useErrorHandler({ onRetry, maxRetries: 2 }));

      // Set up a retryable error
      act(() => {
        result.current.handleError('Network timeout');
      });

      // Mock a successful operation for retry
      const mockOperation = vi.fn().mockResolvedValue('success');
      result.current.withErrorHandling(mockOperation);

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry retryable errors', async () => {
      const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }));
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');

      // Store operation for retry
      await act(async () => {
        try {
          await result.current.withErrorHandling(mockOperation)();
        } catch (error) {
          // Expected to fail first time
        }
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.retryCount).toBe(0);

      // Retry the operation
      await act(async () => {
        await result.current.retry();
      });

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not exceed max retries', async () => {
      const { result } = renderHook(() => useErrorHandler({ maxRetries: 2 }));
      const mockOperation = vi.fn().mockRejectedValue(new Error('Network timeout'));

      // Store operation for retry
      await act(async () => {
        try {
          await result.current.withErrorHandling(mockOperation)();
        } catch (error) {
          // Expected to fail
        }
      });

      // Retry multiple times
      await act(async () => {
        await result.current.retry();
      });

      await act(async () => {
        await result.current.retry();
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.retryCount).toBe(2); // Should not exceed maxRetries
    });

    it('should auto-retry retryable errors when enabled', async () => {
      const { result } = renderHook(() => 
        useErrorHandler({ enableAutoRetry: true, retryDelay: 100 })
      );
      
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue('success');

      await act(async () => {
        try {
          await result.current.withErrorHandling(mockOperation)();
        } catch (error) {
          // Expected to fail first time
        }
      });

      expect(result.current.isError).toBe(true);

      // Fast-forward time to trigger auto-retry
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });
    });
  });

  describe('withErrorHandling wrapper', () => {
    it('should wrap async functions with error handling', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));

      const wrappedOperation = result.current.withErrorHandling(mockOperation);

      await act(async () => {
        const returnValue = await wrappedOperation('arg1', 'arg2');
        expect(returnValue).toBeUndefined(); // Should return undefined on error
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Test error');
      expect(mockOperation).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should return result on success', async () => {
      const { result } = renderHook(() => useErrorHandler());
      const mockOperation = vi.fn().mockResolvedValue('success result');

      const wrappedOperation = result.current.withErrorHandling(mockOperation);

      let returnValue;
      await act(async () => {
        returnValue = await wrappedOperation();
      });

      expect(returnValue).toBe('success result');
      expect(result.current.isError).toBe(false);
    });

    it('should clear previous errors on success', async () => {
      const { result } = renderHook(() => useErrorHandler());

      // First, create an error
      act(() => {
        result.current.handleError('Previous error');
      });

      expect(result.current.isError).toBe(true);

      // Then, run a successful operation
      const mockOperation = vi.fn().mockResolvedValue('success');
      const wrappedOperation = result.current.withErrorHandling(mockOperation);

      await act(async () => {
        await wrappedOperation();
      });

      expect(result.current.isError).toBe(false);
    });
  });

  describe('Error Categorization', () => {
    it('should categorize network errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Network request failed');
      });

      expect(result.current.error?.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('should categorize validation errors', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Validation failed: required field');
      });

      expect(result.current.error?.type).toBe(ErrorType.VALIDATION_ERROR);
    });

    it('should determine error severity', () => {
      const { result } = renderHook(() => useErrorHandler());

      act(() => {
        result.current.handleError('Critical system failure');
      });

      expect(result.current.error?.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });
});

describe('useAsyncOperation', () => {
  it('should execute operation and return data', async () => {
    const mockOperation = vi.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, [])
    );

    await waitFor(() => {
      expect(result.current.data).toBe('test data');
      expect(result.current.loading).toBe(false);
      expect(result.current.isError).toBe(false);
    });
  });

  it('should handle operation errors', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, [])
    );

    await waitFor(() => {
      expect(result.current.data).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toBe('Operation failed');
    });
  });

  it('should show loading state during operation', () => {
    const mockOperation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('data'), 100))
    );
    
    const { result } = renderHook(() => 
      useAsyncOperation(mockOperation, [])
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
  });
});

describe('useNetworkRequest', () => {
  beforeEach(() => {
    (global.fetch as any).mockClear();
  });

  it('should make successful network requests', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' })
    });

    const { result } = renderHook(() => 
      useNetworkRequest('/api/test', {})
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'test' });
      expect(result.current.loading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/test', {});
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    });

    const { result } = renderHook(() => 
      useNetworkRequest('/api/test', {})
    );

    await waitFor(() => {
      expect(result.current.data).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain('404');
    });
  });

  it('should auto-retry network requests', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: 'success' })
      });

    const { result } = renderHook(() => 
      useNetworkRequest('/api/test', {})
    );

    // Fast-forward time to trigger retry
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: 'success' });
      expect(result.current.isError).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe('useFormValidation', () => {
  it('should validate form data successfully', () => {
    const validationSchema = (data: any) => {
      const errors = [];
      if (!data.name) errors.push('Name is required');
      if (!data.email) errors.push('Email is required');
      return errors.length > 0 ? errors : null;
    };

    const { result } = renderHook(() => 
      useFormValidation(validationSchema)
    );

    let isValid;
    act(() => {
      isValid = result.current.validate({ name: 'John', email: 'john@example.com' });
    });

    expect(isValid).toBe(true);
    expect(result.current.validationErrors).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('should handle validation errors', () => {
    const validationSchema = (data: any) => {
      const errors = [];
      if (!data.name) errors.push('Name is required');
      if (!data.email) errors.push('Email is required');
      return errors.length > 0 ? errors : null;
    };

    const { result } = renderHook(() => 
      useFormValidation(validationSchema)
    );

    let isValid;
    act(() => {
      isValid = result.current.validate({ name: '', email: '' });
    });

    expect(isValid).toBe(false);
    expect(result.current.validationErrors).toEqual(['Name is required', 'Email is required']);
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.type).toBe(ErrorType.VALIDATION_ERROR);
  });

  it('should handle validation schema errors', () => {
    const validationSchema = () => {
      throw new Error('Schema error');
    };

    const { result } = renderHook(() => 
      useFormValidation(validationSchema)
    );

    let isValid;
    act(() => {
      isValid = result.current.validate({ name: 'John' });
    });

    expect(isValid).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Schema error');
  });
});