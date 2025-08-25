import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  target?: number;
  change?: {
    value: number;
    period: string;
    type?: 'increase' | 'decrease' | 'neutral';
  };
  progress?: {
    current: number;
    target: number;
    label?: string;
  };
  icon?: React.ReactNode;
  description?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  target,
  change,
  progress,
  icon,
  description,
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          card: 'p-4',
          title: 'text-sm font-medium',
          value: 'text-lg font-bold',
          change: 'text-xs',
          description: 'text-xs'
        };
      case 'lg':
        return {
          card: 'p-6',
          title: 'text-base font-medium',
          value: 'text-3xl font-bold',
          change: 'text-sm',
          description: 'text-sm'
        };
      default:
        return {
          card: 'p-5',
          title: 'text-sm font-medium',
          value: 'text-2xl font-bold',
          change: 'text-xs',
          description: 'text-xs'
        };
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'outline':
        return 'border-2';
      case 'ghost':
        return 'border-0 shadow-none bg-transparent';
      default:
        return '';
    }
  };

  const getChangeColor = () => {
    if (!change) return '';
    
    switch (change.type) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    if (!change) return null;
    
    switch (change.type) {
      case 'increase':
        return <TrendingUp className="h-4 w-4" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const styles = getSizeStyles();
  const variantStyles = getVariantStyles();

  return (
    <Card className={`${variantStyles} ${className}`}>
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${styles.card}`}>
        <CardTitle className={styles.title}>{title}</CardTitle>
        {icon && <div className="flex-shrink-0">{icon}</div>}
      </CardHeader>
      <CardContent className={styles.card}>
        <div className="space-y-3">
          {/* Main Value */}
          <div className="flex items-baseline justify-between">
            <div className={styles.value}>{value}</div>
            {target && (
              <div className="text-sm text-muted-foreground">
                / {target}
              </div>
            )}
          </div>

          {/* Change Indicator */}
          {change && (
            <div className={`flex items-center ${styles.change} ${getChangeColor()}`}>
              {getChangeIcon()}
              <span className="ml-1">
                {change.value > 0 ? '+' : ''}{change.value}% {change.period}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{progress.label || 'Progress'}</span>
                <span>{progress.current} / {progress.target}</span>
              </div>
              <Progress 
                value={(progress.current / progress.target) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <p className={`${styles.description} text-muted-foreground`}>
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;