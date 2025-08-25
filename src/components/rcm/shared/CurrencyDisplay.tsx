import React from 'react';
import { formatCurrency } from '@/utils/rcmFormatters';

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showSign?: boolean;
  variant?: 'default' | 'large' | 'small' | 'compact';
  color?: 'default' | 'positive' | 'negative' | 'muted';
  className?: string;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency = 'USD',
  showSign = false,
  variant = 'default',
  color = 'default',
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'large':
        return 'text-2xl font-bold';
      case 'small':
        return 'text-sm font-medium';
      case 'compact':
        return 'text-xs font-normal';
      default:
        return 'text-base font-semibold';
    }
  };

  const getColorStyles = () => {
    switch (color) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'muted':
        return 'text-muted-foreground';
      default:
        return 'text-foreground';
    }
  };

  const formatAmount = () => {
    let formattedAmount = formatCurrency(Math.abs(amount), currency);
    
    if (showSign) {
      if (amount > 0) {
        formattedAmount = `+${formattedAmount}`;
      } else if (amount < 0) {
        formattedAmount = `-${formattedAmount}`;
      }
    } else if (amount < 0) {
      formattedAmount = `-${formattedAmount}`;
    }
    
    return formattedAmount;
  };

  const getAutoColor = () => {
    if (color !== 'default') return color;
    
    if (amount > 0) return 'positive';
    if (amount < 0) return 'negative';
    return 'default';
  };

  const finalColor = getAutoColor();
  const variantStyles = getVariantStyles();
  const colorStyles = getColorStyles();

  return (
    <span 
      className={`
        inline-flex items-center
        ${variantStyles}
        ${colorStyles}
        ${className}
      `}
      title={`${currency} ${amount.toLocaleString()}`}
    >
      {formatAmount()}
    </span>
  );
};

export default CurrencyDisplay;