/**
 * Error Context Provider
 * Global error state management and handling
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { ErrorType, ErrorSeverity, EnhancedError } from '@/components/rcm/shared/EnhancedErrorBoundary';
import { globalErrorHandler } from '@/utils/globalErrorHandler';

// Error context state
interface ErrorState {
  errors: EnhancedError[];
  activeError: EnhancedError | null;
  errorCount: number;
  isErrorModalOpen: boolean;
  errorHistory: EnhancedError[];
  errorStats: {
    totalErrors: number;
    criticalErrors: number;
    errorsByType: Record<ErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
  };
}

// Error actions
type ErrorAction =
  | { type: 'ADD_ERROR'; payload: EnhancedError }
  | { type: 'REMOVE_ERROR'; payload: string }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_ACTIVE_ERROR'; payload: EnhancedError | null }
  | { type: 'TOGGLE_ERROR_MODAL'; payload?: boolean }
  | { type: 'UPDATE_ERROR_STATS' };

// Error context interface
interface ErrorContextType {
  state: ErrorState;
  addError: (error: Error | string, context?: Record<string, any>) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  setActiveError: (error: EnhancedError | null) => void;
  toggleErrorModal: (open?: boolean) => void;
  getErrorsByType: (type: ErrorType) => EnhancedError[];
  getErrorsBySeverity: (severity: ErrorSeverity) => EnhancedError[];
  hasErrors: boolean;
  hasCriticalErrors: boolean;
}

// Initial state
const initialState: ErrorState = {
  errors: [],
  activeError: null,
  errorCount: 0,
  isErrorModalOpen: false,
  errorHistory: [],
  errorStats: {
    totalErrors: 0,
    criticalErrors: 0,
    errorsByType: {} as Record<ErrorType, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>
  }
};

// Error reducer
function errorReducer(state: ErrorState, action: ErrorAction): ErrorState {
  switch (action.type) {
    case 'ADD_ERROR': {
      const newError = action.payload;
      const updatedErrors = [...state.errors, newError];
      const updatedHistory = [...state.errorHistory, newError].slice(-100); // Keep last 100 errors
      
      return {
        ...state,
        errors: updatedErrors,
        errorCount: state.errorCount + 1,
        errorHistory: updatedHistory,
        errorStats: calculateErrorStats(updatedHistory)
      };
    }
    
    case 'REMOVE_ERROR': {
      const errorId = action.payload;
      const updatedErrors = state.errors.filter(error => 
        `${error.timestamp?.getTime()}_${error.message}` !== errorId
      );
      
      return {
        ...state,
        errors: updatedErrors,
        activeError: state.activeError && 
          `${state.activeError.timestamp?.getTime()}_${state.activeError.message}` === errorId 
          ? null 
          : state.activeError
      };
    }
    
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        activeError: null,
        isErrorModalOpen: false
      };
    
    case 'SET_ACTIVE_ERROR':
      return {
        ...state,
        activeError: action.payload
      };
    
    case 'TOGGLE_ERROR_MODAL':
      return {
        ...state,
        isErrorModalOpen: action.payload ?? !state.isErrorModalOpen
      };
    
    case 'UPDATE_ERROR_STATS':
      return {
        ...state,
        errorStats: calculateErrorStats(state.errorHistory)
      };
    
    default:
      return state;
  }
}

// Calculate error statistics
function calculateErrorStats(errors: EnhancedError[]) {
  const stats = {
    totalErrors: errors.length,
    criticalErrors: 0,
    errorsByType: {} as Record<ErrorType, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>
  };

  errors.forEach(error => {
    // Count by severity
    const severity = error.severity || ErrorSeverity.LOW;
    stats.errorsBySeverity[severity] = (stats.errorsBySeverity[severity] || 0) + 1;
    
    if (severity === ErrorSeverity.CRITICAL) {
      stats.criticalErrors++;
    }

    // Count by type
    const type = error.type || ErrorType.UNKNOWN_ERROR;
    stats.errorsByType[type] = (stats.errorsByType[type] || 0) + 1;
  });

  return stats;
}

// Create context
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Error provider component
interface ErrorProviderProps {
  children: React.ReactNode;
  maxErrors?: number;
  autoRemoveDelay?: number;
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({
  children,
  maxErrors = 10,
  autoRemoveDelay = 5000
}) => {
  const [state, dispatch] = useReducer(errorReducer, initialState);

  /**
   * Enhance error with additional context
   */
  const enhanceError = useCallback((error: Error | string, context?: Record<string, any>): EnhancedError => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    const enhancedError = errorObj as EnhancedError;

    // Add metadata if not already present
    if (!enhancedError.timestamp) {
      enhancedError.timestamp = new Date();
    }
    
    if (!enhancedError.type) {
      enhancedError.type = categorizeError(errorObj);
    }
    
    if (!enhancedError.severity) {
      enhancedError.severity = determineSeverity(errorObj);
    }

    // Add context
    enhancedError.context = { ...enhancedError.context, ...context };
    enhancedError.url = window.location.href;
    enhancedError.userAgent = navigator.userAgent;
    enhancedError.sessionId = getSessionId();
    enhancedError.userId = getUserId();

    return enhancedError;
  }, []);

  /**
   * Add error to state
   */
  const addError = useCallback((error: Error | string, context?: Record<string, any>) => {
    const enhancedError = enhanceError(error, context);
    
    dispatch({ type: 'ADD_ERROR', payload: enhancedError });

    // Auto-remove non-critical errors after delay
    if (enhancedError.severity !== ErrorSeverity.CRITICAL && autoRemoveDelay > 0) {
      const errorId = `${enhancedError.timestamp?.getTime()}_${enhancedError.message}`;
      setTimeout(() => {
        dispatch({ type: 'REMOVE_ERROR', payload: errorId });
      }, autoRemoveDelay);
    }

    // Limit number of errors in state
    if (state.errors.length >= maxErrors) {
      const oldestError = state.errors[0];
      const oldestErrorId = `${oldestError.timestamp?.getTime()}_${oldestError.message}`;
      dispatch({ type: 'REMOVE_ERROR', payload: oldestErrorId });
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Context - New Error');
      console.error('Error:', enhancedError);
      console.error('Context:', context);
      console.groupEnd();
    }
  }, [enhanceError, autoRemoveDelay, maxErrors, state.errors.length]);

  /**
   * Remove error from state
   */
  const removeError = useCallback((errorId: string) => {
    dispatch({ type: 'REMOVE_ERROR', payload: errorId });
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    dispatch({ type: 'CLEAR_ERRORS' });
  }, []);

  /**
   * Set active error
   */
  const setActiveError = useCallback((error: EnhancedError | null) => {
    dispatch({ type: 'SET_ACTIVE_ERROR', payload: error });
  }, []);

  /**
   * Toggle error modal
   */
  const toggleErrorModal = useCallback((open?: boolean) => {
    dispatch({ type: 'TOGGLE_ERROR_MODAL', payload: open });
  }, []);

  /**
   * Get errors by type
   */
  const getErrorsByType = useCallback((type: ErrorType) => {
    return state.errors.filter(error => error.type === type);
  }, [state.errors]);

  /**
   * Get errors by severity
   */
  const getErrorsBySeverity = useCallback((severity: ErrorSeverity) => {
    return state.errors.filter(error => error.severity === severity);
  }, [state.errors]);

  // Computed properties
  const hasErrors = state.errors.length > 0;
  const hasCriticalErrors = state.errors.some(error => error.severity === ErrorSeverity.CRITICAL);

  // Update error stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'UPDATE_ERROR_STATS' });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Context value
  const contextValue: ErrorContextType = {
    state,
    addError,
    removeError,
    clearErrors,
    setActiveError,
    toggleErrorModal,
    getErrorsByType,
    getErrorsBySeverity,
    hasErrors,
    hasCriticalErrors
  };

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
};

// Hook to use error context
export const useErrorContext = (): ErrorContextType => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};

// Helper functions
function categorizeError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';

  if (message.includes('network') || message.includes('fetch') || message.includes('xhr')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
    return ErrorType.PERMISSION_ERROR;
  }
  
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return ErrorType.VALIDATION_ERROR;
  }
  
  if (message.includes('data') || message.includes('parse') || message.includes('json')) {
    return ErrorType.DATA_ERROR;
  }
  
  if (stack.includes('react') || stack.includes('component')) {
    return ErrorType.COMPONENT_ERROR;
  }

  return ErrorType.UNKNOWN_ERROR;
}

function determineSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();
  
  if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
    return ErrorSeverity.CRITICAL;
  }
  
  if (message.includes('error') || message.includes('failed') || message.includes('exception')) {
    return ErrorSeverity.HIGH;
  }
  
  if (message.includes('warning') || message.includes('invalid')) {
    return ErrorSeverity.MEDIUM;
  }

  return ErrorSeverity.LOW;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
}

function getUserId(): string | undefined {
  return localStorage.getItem('userId') || undefined;
}

export default ErrorProvider;