import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Zap } from 'lucide-react';

interface UrgencyIndicatorProps {
  urgency: 'routine' | 'urgent' | 'stat';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
}

export const UrgencyIndicator: React.FC<UrgencyIndicatorProps> = ({ 
  urgency, 
  size = 'default',
  showLabel = true,
  showIcon = true 
}) => {
  const getUrgencyConfig = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'routine':
        return {
          label: 'Routine',
          icon: Clock,
          className: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500'
        };
      case 'urgent':
        return {
          label: 'Urgent',
          icon: AlertCircle,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500'
        };
      case 'stat':
        return {
          label: 'STAT',
          icon: Zap,
          className: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          label: urgency,
          icon: Clock,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const config = getUrgencyConfig(urgency);
  const IconComponent = config.icon;

  if (!showLabel && !showIcon) {
    // Just show a colored dot
    return (
      <div 
        className={`w-3 h-3 rounded-full ${config.dotColor}`}
        title={config.label}
      />
    );
  }

  return (
    <Badge 
      variant="outline"
      className={`${config.className} ${
        size === 'sm' ? 'text-xs px-2 py-0.5' : 
        size === 'lg' ? 'text-sm px-3 py-1' : 
        'text-xs px-2 py-1'
      }`}
    >
      {showIcon && (
        <IconComponent className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} ${showLabel ? 'mr-1' : ''}`} />
      )}
      {showLabel && config.label}
    </Badge>
  );
};