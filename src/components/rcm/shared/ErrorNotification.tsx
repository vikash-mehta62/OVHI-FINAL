/**
 * Error Notification System
 * Toast notifications and error display components
 */

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, Copy, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ErrorType, ErrorSeverity, EnhancedError } from './EnhancedErrorBoundary';
import { useErrorContext } from '@/contexts/ErrorContext';

// Notification types
export enum NotificationType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success'
}

// Notification interface
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  error?: EnhancedError;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'default' | 'outline' | 'destructive';
  icon?: React.ReactNode;
}

// Error notification props
interface ErrorNotificationProps {
  error: EnhancedError;
  onDismiss?: () => void;
  onRetry?: () => void;
  onReport?: () => void;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Error Notification Component
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  onRetry,
  onReport,
  showDetails = false,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const getNotificationStyle = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'border-red-500 bg-red-50 text-red-900';
      case ErrorSeverity.HIGH:
        return 'border-orange-500 bg-orange-50 text-orange-900';
      case ErrorSeverity.MEDIUM:
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      case ErrorSeverity.LOW:
        return 'border-blue-500 bg-blue-50 text-blue-900';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-900';
    }
  };

  const getIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return <AlertTriangle className=\"h-5 w-5 text-red-500\" />;
      case ErrorSeverity.HIGH:
        return <AlertCircle className=\"h-5 w-5 text-orange-500\" />;
      case ErrorSeverity.MEDIUM:
        return <Info className=\"h-5 w-5 text-yellow-500\" />;
      case ErrorSeverity.LOW:
        return <Info className=\"h-5 w-5 text-blue-500\" />;
      default:
        return <AlertCircle className=\"h-5 w-5 text-gray-500\" />;
    }
  };

  const getSeverityBadgeVariant = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'destructive';
      case ErrorSeverity.HIGH:
        return 'destructive';
      case ErrorSeverity.MEDIUM:
        return 'secondary';
      case ErrorSeverity.LOW:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getTypeIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return '🌐';
      case ErrorType.PERMISSION_ERROR:
        return '🔒';
      case ErrorType.VALIDATION_ERROR:
        return '⚠️';
      case ErrorType.DATA_ERROR:
        return '📊';
      case ErrorType.COMPONENT_ERROR:
        return '⚛️';
      default:
        return '❌';
    }
  };

  const handleReport = async () => {
    if (reportSent || !onReport) return;

    setIsReporting(true);
    try {
      await onReport();
      setReportSent(true);
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    } finally {
      setIsReporting(false);
    }
  };

  const handleCopy = async () => {
    const errorDetails = {
      message: error.message,
      type: error.type,
      severity: error.severity,
      timestamp: error.timestamp,
      url: error.url,
      stack: error.stack,
      context: error.context
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    } catch (clipboardError) {
      console.error('Failed to copy error details:', clipboardError);
    }
  };

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getNotificationStyle(error.severity || ErrorSeverity.MEDIUM)}`}>
        {getIcon(error.severity || ErrorSeverity.MEDIUM)}
        <span className=\"text-sm font-medium truncate flex-1\">{error.message}</span>
        {onDismiss && (
          <Button variant=\"ghost\" size=\"sm\" onClick={onDismiss}>
            <X className=\"h-4 w-4\" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${getNotificationStyle(error.severity || ErrorSeverity.MEDIUM)}`}>
      <CardContent className=\"p-4\">
        <div className=\"flex items-start space-x-3\">
          {getIcon(error.severity || ErrorSeverity.MEDIUM)}
          
          <div className=\"flex-1 min-w-0\">
            <div className=\"flex items-center space-x-2 mb-1\">
              <h4 className=\"font-medium text-sm\">
                {getTypeIcon(error.type || ErrorType.UNKNOWN_ERROR)} Error Occurred
              </h4>
              <Badge variant={getSeverityBadgeVariant(error.severity || ErrorSeverity.MEDIUM)}>
                {error.severity || 'Unknown'}
              </Badge>
              {error.type && (
                <Badge variant=\"outline\" className=\"text-xs\">
                  {error.type}
                </Badge>
              )}
            </div>
            
            <p className=\"text-sm text-gray-700 mb-2\">{error.message}</p>
            
            {error.timestamp && (
              <p className=\"text-xs text-gray-500 mb-2\">
                {error.timestamp.toLocaleString()}
              </p>
            )}

            {isExpanded && (
              <div className=\"mt-3 space-y-2\">
                {error.context && Object.keys(error.context).length > 0 && (
                  <div className=\"bg-gray-100 p-2 rounded text-xs\">
                    <strong>Context:</strong>
                    <pre className=\"mt-1 whitespace-pre-wrap\">
                      {JSON.stringify(error.context, null, 2)}
                    </pre>
                  </div>
                )}
                
                {error.stack && process.env.NODE_ENV === 'development' && (
                  <details className=\"text-xs\">
                    <summary className=\"cursor-pointer font-medium text-gray-600 hover:text-gray-800\">
                      Stack Trace
                    </summary>
                    <pre className=\"mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-32 whitespace-pre-wrap\">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className=\"flex flex-wrap gap-2 mt-3\">
              {onRetry && error.retryable && (
                <Button size=\"sm\" variant=\"outline\" onClick={onRetry}>
                  <RefreshCw className=\"h-3 w-3 mr-1\" />
                  Retry
                </Button>
              )}
              
              <Button size=\"sm\" variant=\"outline\" onClick={handleCopy}>
                <Copy className=\"h-3 w-3 mr-1\" />
                Copy
              </Button>
              
              {onReport && (
                <Button 
                  size=\"sm\" 
                  variant=\"outline\" 
                  onClick={handleReport}
                  disabled={isReporting || reportSent}
                >
                  <Send className=\"h-3 w-3 mr-1\" />
                  {isReporting ? 'Reporting...' : reportSent ? 'Reported' : 'Report'}
                </Button>
              )}
              
              <Button 
                size=\"sm\" 
                variant=\"ghost\" 
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? 'Less' : 'More'}
              </Button>
            </div>
          </div>

          {onDismiss && (
            <Button variant=\"ghost\" size=\"sm\" onClick={onDismiss}>
              <X className=\"h-4 w-4\" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Toast Notification Component
 */
interface ToastNotificationProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!notification.persistent && notification.duration) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300); // Allow fade out animation
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  const getToastStyle = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ERROR:
        return 'border-red-500 bg-red-50 text-red-900';
      case NotificationType.WARNING:
        return 'border-yellow-500 bg-yellow-50 text-yellow-900';
      case NotificationType.INFO:
        return 'border-blue-500 bg-blue-50 text-blue-900';
      case NotificationType.SUCCESS:
        return 'border-green-500 bg-green-50 text-green-900';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-900';
    }
  };

  const getToastIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.ERROR:
        return <AlertTriangle className=\"h-5 w-5 text-red-500\" />;
      case NotificationType.WARNING:
        return <AlertCircle className=\"h-5 w-5 text-yellow-500\" />;
      case NotificationType.INFO:
        return <Info className=\"h-5 w-5 text-blue-500\" />;
      case NotificationType.SUCCESS:
        return <CheckCircle className=\"h-5 w-5 text-green-500\" />;
      default:
        return <Info className=\"h-5 w-5 text-gray-500\" />;
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <Card className={`border-l-4 shadow-lg ${getToastStyle(notification.type)}`}>
        <CardContent className=\"p-4\">
          <div className=\"flex items-start space-x-3\">
            {getToastIcon(notification.type)}
            
            <div className=\"flex-1 min-w-0\">
              <h4 className=\"font-medium text-sm mb-1\">{notification.title}</h4>
              <p className=\"text-sm\">{notification.message}</p>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className=\"flex space-x-2 mt-3\">
                  {notification.actions.map((action, index) => (
                    <Button
                      key={index}
                      size=\"sm\"
                      variant={action.variant || 'outline'}
                      onClick={action.action}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <Button 
              variant=\"ghost\" 
              size=\"sm\" 
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onDismiss(notification.id), 300);
              }}
            >
              <X className=\"h-4 w-4\" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Error Notification Container
 */
export const ErrorNotificationContainer: React.FC = () => {
  const { state, removeError } = useErrorContext();
  const [toasts, setToasts] = useState<Notification[]>([]);

  // Convert errors to toast notifications
  useEffect(() => {
    const newToasts = state.errors
      .filter(error => error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH)
      .map(error => ({
        id: `${error.timestamp?.getTime()}_${error.message}`,
        type: error.severity === ErrorSeverity.CRITICAL ? NotificationType.ERROR : NotificationType.WARNING,
        title: 'System Error',
        message: error.message,
        error,
        duration: error.severity === ErrorSeverity.CRITICAL ? 0 : 5000, // Critical errors persist
        persistent: error.severity === ErrorSeverity.CRITICAL,
        actions: [
          {
            label: 'Dismiss',
            action: () => removeError(`${error.timestamp?.getTime()}_${error.message}`),
            variant: 'outline' as const
          }
        ]
      }));

    setToasts(newToasts);
  }, [state.errors, removeError]);

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    removeError(id);
  };

  return (
    <div className=\"fixed top-0 right-0 z-50 p-4 space-y-2\">
      {toasts.map(toast => (
        <ToastNotification
          key={toast.id}
          notification={toast}
          onDismiss={handleDismissToast}
        />
      ))}
    </div>
  );
};

export default ErrorNotification;