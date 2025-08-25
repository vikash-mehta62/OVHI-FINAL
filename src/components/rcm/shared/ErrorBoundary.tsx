import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  title?: string;
  message?: string;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RCM Component Error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined 
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const {
        title = 'Something went wrong',
        message = 'An unexpected error occurred while loading this component.',
        showDetails = process.env.NODE_ENV === 'development',
        className = ''
      } = this.props;

      return (
        <Card className={`max-w-2xl mx-auto ${className}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-xl font-semibold text-red-600">
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              {message}
            </p>

            {showDetails && this.state.error && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center mb-2">
                  <Bug className="h-4 w-4 text-red-500 mr-2" />
                  <span className="font-medium text-sm">Error Details</span>
                </div>
                <div className="text-xs font-mono text-gray-700 space-y-2">
                  <div>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center space-x-3">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>
            </div>

            {showDetails && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  If this error persists, please contact support with the error details above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Enhanced Error Boundary Wrapper
 * Provides the same interface as the legacy ErrorBoundary but with enhanced features
 */
export const ErrorBoundaryEnhanced: React.FC<ErrorBoundaryProps> = ({ 
  children, 
  fallback, 
  onError,
  showDetails,
  title,
  message,
  className 
}) => {
  return (
    <EnhancedErrorBoundary
      fallback={fallback}
      onError={onError}
      reportErrors={true}
      enableRetry={true}
      showErrorDetails={showDetails}
    >
      {children}
    </EnhancedErrorBoundary>
  );
};

export default ErrorBoundary;
export { EnhancedErrorBoundary };