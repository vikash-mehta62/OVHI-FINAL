import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  description?: string;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  description,
  variant = 'default',
  className = ''
}) => {
  const getChangeColor = () => {
    if (changeType === 'increase') return 'text-green-600';
    if (changeType === 'decrease') return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = () => {
    if (changeType === 'increase') return <TrendingUp className="h-4 w-4" />;
    if (changeType === 'decrease') return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          card: 'p-4',
          header: 'pb-1',
          title: 'text-xs font-medium',
          value: 'text-lg font-bold',
          change: 'text-xs'
        };
      case 'detailed':
        return {
          card: 'p-6',
          header: 'pb-3',
          title: 'text-base font-medium',
          value: 'text-3xl font-bold',
          change: 'text-sm'
        };
      default:
        return {
          card: '',
          header: 'pb-2',
          title: 'text-sm font-medium',
          value: 'text-2xl font-bold',
          change: 'text-xs'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Card className={`${styles.card} ${className}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 ${styles.header}`}>
        <CardTitle className={styles.title}>{title}</CardTitle>
        {icon && <div className="flex-shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className={styles.value}>{value}</div>
        {change !== undefined && (
          <div className={`flex items-center ${styles.change} ${getChangeColor()}`}>
            {getChangeIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change}% from last period
            </span>
          </div>
        )}
        {description && (
          <p className={`text-xs text-muted-foreground mt-1 ${variant === 'detailed' ? 'text-sm' : ''}`}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default KPICard;