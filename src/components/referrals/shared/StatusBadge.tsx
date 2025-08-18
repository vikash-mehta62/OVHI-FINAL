import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, Send, Calendar, CheckCircle, XCircle, 
  AlertTriangle, FileText 
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  size = 'default',
  showIcon = true 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return {
          label: 'Draft',
          variant: 'secondary' as const,
          icon: FileText,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        };
      case 'pending':
        return {
          label: 'Pending',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
        };
      case 'sent':
        return {
          label: 'Sent',
          variant: 'default' as const,
          icon: Send,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
      case 'scheduled':
        return {
          label: 'Scheduled',
          variant: 'default' as const,
          icon: Calendar,
          className: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
        };
      case 'completed':
        return {
          label: 'Completed',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 hover:bg-green-200'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-800 hover:bg-red-200'
        };
      case 'expired':
        return {
          label: 'Expired',
          variant: 'destructive' as const,
          icon: AlertTriangle,
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-200'
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          icon: FileText,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.icon;

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${size === 'sm' ? 'text-xs px-2 py-0.5' : size === 'lg' ? 'text-sm px-3 py-1' : ''}`}
    >
      {showIcon && (
        <IconComponent className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
      )}
      {config.label}
    </Badge>
  );
};