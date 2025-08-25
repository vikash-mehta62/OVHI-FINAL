// Shared RCM Component Library
// Export all shared components and utilities

// Core Components
export { default as KPICard } from './KPICard';
export type { KPICardProps } from './KPICard';

export { default as StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusType } from './StatusBadge';

export { default as CurrencyDisplay } from './CurrencyDisplay';
export type { CurrencyDisplayProps } from './CurrencyDisplay';

export { default as LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

export { default as ErrorBoundary } from './ErrorBoundary';
export type { ErrorBoundaryProps } from './ErrorBoundary';

export { default as DataTable, columnRenderers } from './DataTable';
export type { DataTableProps, Column } from './DataTable';

export { default as MetricCard } from './MetricCard';
export type { MetricCardProps } from './MetricCard';

// Types and Interfaces
export * from './types';

// Utility Functions
export const getStatusBadgeProps = (status: string) => {
  // Helper function to get consistent status badge properties
  const statusMap: Record<string, { variant: 'default' | 'outline' | 'secondary', color?: string }> = {
    'paid': { variant: 'default' },
    'denied': { variant: 'default' },
    'pending': { variant: 'outline' },
    'processing': { variant: 'secondary' },
    'overdue': { variant: 'default' },
    'cancelled': { variant: 'secondary' },
    'completed': { variant: 'default' },
    'draft': { variant: 'outline' },
    'submitted': { variant: 'secondary' },
    'approved': { variant: 'default' },
    'rejected': { variant: 'default' },
    'in_review': { variant: 'outline' }
  };

  return statusMap[status.toLowerCase()] || { variant: 'outline' as const };
};

export const formatMetricValue = (value: number, type: 'currency' | 'percentage' | 'number' | 'days') => {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${Math.round(value)} days`;
    default:
      return value.toLocaleString();
  }
};

export const getChangeType = (current: number, previous: number): 'increase' | 'decrease' | 'neutral' => {
  if (current > previous) return 'increase';
  if (current < previous) return 'decrease';
  return 'neutral';
};

export const calculateChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getAgingBucketColor = (bucket: string): string => {
  const colorMap: Record<string, string> = {
    '0-30': 'text-green-600',
    '31-60': 'text-yellow-600',
    '61-90': 'text-orange-600',
    '91-120': 'text-red-600',
    '120+': 'text-red-800'
  };
  return colorMap[bucket] || 'text-gray-600';
};

export const getCollectionPriority = (daysInAR: number, amount: number): 'low' | 'medium' | 'high' | 'urgent' => {
  if (daysInAR > 120 || amount > 10000) return 'urgent';
  if (daysInAR > 90 || amount > 5000) return 'high';
  if (daysInAR > 60 || amount > 1000) return 'medium';
  return 'low';
};

// Constants
export const AGING_BUCKETS = ['0-30', '31-60', '61-90', '91-120', '120+'] as const;

export const CLAIM_STATUSES = [
  'draft',
  'submitted', 
  'in_review',
  'paid',
  'denied',
  'pending',
  'processing',
  'appealed',
  'cancelled',
  'voided'
] as const;

export const PAYMENT_METHODS = [
  'credit_card',
  'debit_card',
  'ach',
  'check',
  'cash',
  'insurance',
  'other'
] as const;

export const COLLECTION_STATUSES = [
  'not_started',
  'first_notice',
  'second_notice', 
  'final_notice',
  'collections_agency',
  'legal_action',
  'settled',
  'uncollectible'
] as const;