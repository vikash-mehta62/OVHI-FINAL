// Common TypeScript interfaces for RCM components

export interface KPIData {
  totalRevenue: number;
  collectionRate: number;
  denialRate: number;
  daysInAR: number;
  paidClaims: number;
  deniedClaims: number;
  totalClaims: number;
  pendingClaims?: number;
  averageClaimAmount?: number;
  monthlyGrowth?: number;
}

export interface PaymentData {
  summary: {
    successful_payments: number;
    failed_payments: number;
    success_rate: number;
    total_revenue: number;
    total_fees: number;
    net_revenue: number;
    average_transaction_amount?: number;
    processing_time_avg?: number;
  };
  payment_methods: Array<{
    payment_method: string;
    total_amount: number;
    transaction_count: number;
    success_rate: number;
  }>;
  daily_trends: Array<{
    payment_date: string;
    daily_revenue: number;
    payment_count: number;
    success_rate: number;
  }>;
  gateway_performance?: Array<{
    gateway_name: string;
    success_rate: number;
    average_processing_time: number;
    total_volume: number;
  }>;
}

export interface ClaimData {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  serviceDate: string;
  submissionDate: string;
  amount: number;
  paidAmount?: number;
  status: ClaimStatus;
  payerName: string;
  cptCodes: string[];
  diagnosisCodes: string[];
  denialReason?: string;
  lastUpdated: string;
  daysInAR: number;
}

export interface PatientAccountData {
  id: string;
  patientId: string;
  patientName: string;
  balance: number;
  insuranceBalance: number;
  patientBalance: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  status: AccountStatus;
  agingBucket: AgingBucket;
  collectionStatus?: CollectionStatus;
  contactAttempts?: number;
  lastContactDate?: string;
}

export interface RevenueData {
  period: string;
  totalRevenue: number;
  collections: number;
  adjustments: number;
  writeOffs: number;
  netRevenue: number;
  collectionRate: number;
  adjustmentRate: number;
  writeOffRate: number;
}

export interface DashboardData {
  kpis: KPIData;
  trends: {
    monthlyRevenue: RevenueData[];
    dailyCollections: Array<{
      date: string;
      amount: number;
      count: number;
    }>;
    claimStatusTrends: Array<{
      date: string;
      paid: number;
      denied: number;
      pending: number;
    }>;
  };
  topPerformers?: {
    providers: Array<{
      name: string;
      revenue: number;
      collectionRate: number;
    }>;
    payerTypes: Array<{
      name: string;
      revenue: number;
      claimCount: number;
    }>;
  };
}

// Status Types
export type ClaimStatus = 
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'paid'
  | 'denied'
  | 'pending'
  | 'processing'
  | 'appealed'
  | 'cancelled'
  | 'voided';

export type AccountStatus = 
  | 'current'
  | 'overdue'
  | 'collections'
  | 'payment_plan'
  | 'written_off'
  | 'closed'
  | 'disputed';

export type CollectionStatus = 
  | 'not_started'
  | 'first_notice'
  | 'second_notice'
  | 'final_notice'
  | 'collections_agency'
  | 'legal_action'
  | 'settled'
  | 'uncollectible';

export type AgingBucket = 
  | '0-30'
  | '31-60'
  | '61-90'
  | '91-120'
  | '120+';

export type PaymentMethod = 
  | 'credit_card'
  | 'debit_card'
  | 'ach'
  | 'check'
  | 'cash'
  | 'insurance'
  | 'other';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'disputed';

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  loading?: boolean;
  error?: string | null;
}

export interface DataComponentProps<T = any> extends BaseComponentProps {
  data: T;
  onRefresh?: () => void;
  onError?: (error: Error) => void;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  onClick?: () => void;
  onSelect?: (item: any) => void;
  disabled?: boolean;
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  category?: string;
  metadata?: Record<string, any>;
}

export interface MultiSeriesDataPoint {
  label: string;
  [key: string]: string | number;
}

// Filter and Search Types
export interface FilterOption {
  label: string;
  value: string | number;
  count?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SearchFilters {
  dateRange?: DateRange;
  status?: string[];
  payerType?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  searchTerm?: string;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Event Handler Types
export type ChangeHandler<T = any> = (value: T) => void;
export type ClickHandler = () => void;
export type SelectHandler<T = any> = (item: T) => void;
export type FilterHandler = (filters: SearchFilters) => void;
export type SortHandler = (field: string, direction: 'asc' | 'desc') => void;