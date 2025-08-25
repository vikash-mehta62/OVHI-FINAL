import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug, Wifi, Shield, Clock, AlertCircle } from 'lucide-react';

export interface EnhancedErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showErrorDetails?: boolean;
  reportErrors?: boolean;
}

interface EnhancedErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

export class EnhancedErrorBoundary extends Component<
  EnhancedErrorBoundaryProps,
  EnhancedErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: EnhancedErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report error to monitoring system
    if (this.props.reportErrors) {
      this.reportError(error, errorInfo);
    }

    // Log error details
    console.error('EnhancedErrorBoundary caught an error:', error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, this would send to your error reporting service
    // e.g., Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Example: Send to monitoring service
    if (typeof window !== 'undefined' && window.fetch) {
      fetch('/api/v1/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  };

  private getErrorType = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'permission';
    }
    if (message.includes('timeout') || message.includes('took too long')) {
      return 'timeout';
    }
    
    return 'generic';
  };

  private getErrorIcon = (errorType: string) => {
    switch (errorType) {
      case 'network':
        return <Wifi className="h-6 w-6 text-orange-500" />;
      case 'validation':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'permission':
        return <Shield className="h-6 w-6 text-red-500" />;
      case 'timeout':
        return <Clock className="h-6 w-6 text-blue-500" />;
      default:
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
    }
  };

  private getErrorMessage = (errorType: string, originalMessage: string): { title: string; description: string } => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Problem',
          description: 'Unable to connect to the server. Please check your internet connection and try again.'
        };
      case 'validation':
        return {
          title: 'Invalid Data',
          description: 'The information provided is not valid. Please check your input and try again.'
        };
      case 'permission':
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this resource. Please contact your administrator.'
        };
      case 'timeout':
        return {
          title: 'Request Timeout',
          description: 'The operation is taking longer than expected. Please try again.'
        };
      default:
        return {
          title: 'Something Went Wrong',
          description: 'An unexpected error occurred. Our team has been notified and is working to fix this issue.'
        };
    }
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: ''
    });
  };

  private canRetry = (): boolean => {
    const { enableRetry = true, maxRetries = 3 } = this.props;
    const errorType = this.state.error ? this.getErrorType(this.state.error) : 'generic';
    
    // Don't allow retry for validation and permission errors
    if (errorType === 'validation' || errorType === 'permission') {
      return false;
    }
    
    return enableRetry && this.state.retryCount < maxRetries;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorType = this.state.error ? this.getErrorType(this.state.error) : 'generic';
      const { title, description } = this.getErrorMessage(
        errorType, 
        this.state.error?.message || 'Unknown error'
      );
      const canRetry = this.canRetry();
      const { maxRetries = 3, showErrorDetails = false } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[200px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {this.getErrorIcon(errorType)}
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm text-gray-600">
                  {description}
                </AlertDescription>
              </Alert>

              {showErrorDetails && this.state.error && (
                <Alert variant="destructive">
                  <Bug className="h-4 w-4" />
                  <AlertDescription className="text-xs font-mono">
                    <details>
                      <summary className="cursor-pointer font-sans font-medium mb-2">
                        Technical Details (Error ID: {this.state.errorId})
                      </summary>
                      <div className="space-y-2">
                        <div>
                          <strong>Message:</strong> {this.state.error.message}
                        </div>
                        {this.state.error.stack && (
                          <div>
                            <strong>Stack:</strong>
                            <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-gray-100 rounded">
                              {this.state.error.stack}
                            </pre>
                          </div>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="whitespace-pre-wrap text-xs mt-1 p-2 bg-gray-100 rounded">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again ({this.state.retryCount}/{maxRetries})
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReset}
                  variant="outline"
                  className="w-full"
                >
                  Reset Component
                </Button>

                {errorType === 'network' && (
                  <Button 
                    onClick={() => window.location.reload()}
                    variant="ghost"
                    className="w-full text-sm"
                  >
                    Reload Page
                  </Button>
                )}
              </div>

              {this.state.retryCount >= maxRetries && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Maximum retry attempts reached. Please refresh the page or contact support if the problem persists.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Export as default for easier importing
export default EnhancedErrorBoundary;