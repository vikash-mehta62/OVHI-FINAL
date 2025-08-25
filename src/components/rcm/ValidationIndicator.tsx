import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ValidationError {
  field?: string;
  code?: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  cms_reference?: string;
  suggested_fix?: string;
}

interface ValidationIndicatorProps {
  isValid?: boolean;
  isValidating?: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({
  isValid,
  isValidating = false,
  errors = [],
  warnings = [],
  size = 'md',
  showText = false,
  className = ''
}) => {
  // Determine validation state
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const hasValidation = isValid !== undefined;

  // Get icon size based on size prop
  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'h-3 w-3';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  // Get status and icon
  const getStatusInfo = () => {
    if (isValidating) {
      return {
        icon: <Loader2 className={`${getIconSize()} animate-spin text-blue-500`} />,
        text: 'Validating...',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50'
      };
    }

    if (hasErrors) {
      return {
        icon: <XCircle className={`${getIconSize()} text-red-500`} />,
        text: `${errors.length} error${errors.length > 1 ? 's' : ''}`,
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    }

    if (hasWarnings) {
      return {
        icon: <AlertTriangle className={`${getIconSize()} text-yellow-500`} />,
        text: `${warnings.length} warning${warnings.length > 1 ? 's' : ''}`,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50'
      };
    }

    if (isValid) {
      return {
        icon: <CheckCircle className={`${getIconSize()} text-green-500`} />,
        text: 'Valid',
        color: 'text-green-600',
        bgColor: 'bg-green-50'
      };
    }

    if (hasValidation && !isValid) {
      return {
        icon: <XCircle className={`${getIconSize()} text-red-500`} />,
        text: 'Invalid',
        color: 'text-red-600',
        bgColor: 'bg-red-50'
      };
    }

    return {
      icon: <Info className={`${getIconSize()} text-gray-400`} />,
      text: 'Not validated',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50'
    };
  };

  const statusInfo = getStatusInfo();

  // Create tooltip content
  const getTooltipContent = () => {
    const allMessages = [
      ...errors.map(e => ({ ...e, type: 'error' })),
      ...warnings.map(w => ({ ...w, type: 'warning' }))
    ];

    if (allMessages.length === 0) {
      return statusInfo.text;
    }

    return (
      <div className="space-y-2 max-w-xs">
        {allMessages.map((msg, index) => (
          <div key={index} className="text-sm">
            <div className={`font-medium ${msg.type === 'error' ? 'text-red-200' : 'text-yellow-200'}`}>
              {msg.code && `${msg.code}: `}{msg.message}
            </div>
            {msg.cms_reference && (
              <div className="text-xs text-gray-300 mt-1">
                Reference: {msg.cms_reference}
              </div>
            )}
            {msg.suggested_fix && (
              <div className="text-xs text-gray-200 mt-1">
                Suggestion: {msg.suggested_fix}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const indicator = (
    <div className={`flex items-center gap-2 ${className}`}>
      {statusInfo.icon}
      {showText && (
        <span className={`text-sm ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
      )}
    </div>
  );

  // If there are validation messages, wrap in tooltip
  if (hasErrors || hasWarnings || isValidating) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            {getTooltipContent()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return indicator;
};

// Badge variant for validation status
interface ValidationBadgeProps {
  status: 'valid' | 'invalid' | 'warning' | 'pending' | 'validating';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  showIcon = true,
  size = 'md'
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'valid':
        return {
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Valid'
        };
      case 'warning':
        return {
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Warning'
        };
      case 'invalid':
        return {
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="h-3 w-3" />,
          text: 'Invalid'
        };
      case 'validating':
        return {
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Loader2 className="h-3 w-3 animate-spin" />,
          text: 'Validating'
        };
      default:
        return {
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: <Info className="h-3 w-3" />,
          text: 'Pending'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant={config.variant} className={`${config.className} ${size === 'sm' ? 'text-xs' : ''}`}>
      {showIcon && (
        <span className="mr-1">
          {config.icon}
        </span>
      )}
      {config.text}
    </Badge>
  );
};

export default ValidationIndicator;