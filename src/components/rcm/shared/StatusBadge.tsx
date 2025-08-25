import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Pause,
  RefreshCw,
  DollarSign,
  FileText
} from 'lucide-react';

export type StatusType = 
  | 'paid' 
  | 'denied' 
  | 'pending' 
  | 'processing' 
  | 'overdue' 
  | 'cancelled' 
  | 'draft' 
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'in_review'
  | 'completed';

export interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  showIcon?: boolean;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showIcon = true,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getStatusConfig = (status: StatusType) => {
    const configs = {
      paid: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        defaultText: 'Paid'
      },
      denied: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        defaultText: 'Denied'
      },
      pending: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: Clock,
        defaultText: 'Pending'
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: RefreshCw,
        defaultText: 'Processing'
      },
      overdue: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: AlertTriangle,
        defaultText: 'Overdue'
      },
      cancelled: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: XCircle,
        defaultText: 'Cancelled'
      },
      draft: {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: FileText,
        defaultText: 'Draft'
      },
      submitted: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: FileText,
        defaultText: 'Submitted'
      },
      approved: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        defaultText: 'Approved'
      },
      rejected: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        defaultText: 'Rejected'
      },
      in_review: {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Clock,
        defaultText: 'In Review'
      },
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        defaultText: 'Completed'
      }
    };

    return configs[status] || configs.pending;
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          badge: 'px-2 py-1 text-xs',
          icon: 'h-3 w-3'
        };
      case 'lg':
        return {
          badge: 'px-4 py-2 text-base',
          icon: 'h-5 w-5'
        };
      default:
        return {
          badge: 'px-3 py-1 text-sm',
          icon: 'h-4 w-4'
        };
    }
  };

  const getVariantStyles = () => {
    const config = getStatusConfig(status);
    
    switch (variant) {
      case 'outline':
        return `border ${config.color.replace('bg-', 'border-').replace('text-', 'text-')} bg-transparent`;
      case 'secondary':
        return 'bg-secondary text-secondary-foreground';
      default:
        return config.color;
    }
  };

  const config = getStatusConfig(status);
  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const Icon = config.icon;
  const displayText = text || config.defaultText;

  return (
    <Badge 
      className={`
        inline-flex items-center gap-1 font-medium
        ${sizeStyles.badge}
        ${variantStyles}
        ${className}
      `}
    >
      {showIcon && <Icon className={sizeStyles.icon} />}
      {displayText}
    </Badge>
  );
};

export default StatusBadge;