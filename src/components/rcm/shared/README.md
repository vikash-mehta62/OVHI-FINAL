# RCM Shared Component Library

A comprehensive collection of reusable components, utilities, and TypeScript interfaces specifically designed for Revenue Cycle Management (RCM) applications.

## Overview

This shared component library provides a consistent set of UI components and utilities that can be used across different parts of the RCM system. All components are built with TypeScript, follow accessibility best practices, and are designed to be highly customizable and reusable.

## Components

### Core Components

#### `KPICard`
A versatile card component for displaying key performance indicators with optional change indicators and icons.

```tsx
import { KPICard } from '@/components/rcm/shared';

<KPICard
  title="Total Revenue"
  value="$125,000"
  change={12.5}
  changeType="increase"
  icon={<DollarSign />}
  description="Revenue collected this period"
  variant="default" // 'default' | 'compact' | 'detailed'
/>
```

**Props:**
- `title`: Display title
- `value`: Main value to display
- `change`: Optional percentage change
- `changeType`: 'increase' | 'decrease' | 'neutral'
- `icon`: Optional React icon component
- `description`: Optional description text
- `variant`: Size/style variant
- `className`: Additional CSS classes

#### `StatusBadge`
Consistent status badges with predefined colors and icons for common RCM statuses.

```tsx
import { StatusBadge } from '@/components/rcm/shared';

<StatusBadge 
  status="paid" 
  showIcon={true}
  variant="default" // 'default' | 'outline' | 'secondary'
  size="md" // 'sm' | 'md' | 'lg'
/>
```

**Supported Statuses:**
- `paid`, `denied`, `pending`, `processing`, `overdue`
- `cancelled`, `draft`, `submitted`, `approved`, `rejected`
- `in_review`, `completed`

#### `CurrencyDisplay`
Formatted currency display with automatic color coding and sign handling.

```tsx
import { CurrencyDisplay } from '@/components/rcm/shared';

<CurrencyDisplay
  amount={1250.50}
  currency="USD"
  variant="large" // 'default' | 'large' | 'small' | 'compact'
  color="positive" // 'default' | 'positive' | 'negative' | 'muted'
  showSign={true}
/>
```

#### `LoadingSpinner`
Flexible loading spinner with multiple variants and sizes.

```tsx
import { LoadingSpinner } from '@/components/rcm/shared';

<LoadingSpinner
  message="Loading data..."
  size="md" // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant="default" // 'default' | 'dots' | 'pulse'
  fullScreen={false}
  overlay={false}
/>
```

#### `ErrorBoundary`
React error boundary with detailed error information and recovery options.

```tsx
import { ErrorBoundary } from '@/components/rcm/shared';

<ErrorBoundary
  title="Dashboard Error"
  message="Unable to load dashboard data"
  showDetails={true}
  onError={(error, errorInfo) => console.error(error)}
>
  <YourComponent />
</ErrorBoundary>
```

#### `DataTable`
Feature-rich data table with sorting, custom renderers, and loading states.

```tsx
import { DataTable, columnRenderers } from '@/components/rcm/shared';

const columns = [
  {
    key: 'claimNumber',
    title: 'Claim #',
    dataIndex: 'claimNumber',
    width: '120px'
  },
  {
    key: 'amount',
    title: 'Amount',
    dataIndex: 'amount',
    align: 'right',
    render: (value) => columnRenderers.currency(value)
  },
  {
    key: 'status',
    title: 'Status',
    dataIndex: 'status',
    render: (value) => columnRenderers.status(value)
  }
];

<DataTable
  columns={columns}
  data={claimsData}
  loading={false}
  title="Recent Claims"
  description="Claims submitted in the last 30 days"
  emptyMessage="No claims found"
  striped={true}
  hoverable={true}
/>
```

**Built-in Column Renderers:**
- `columnRenderers.currency(amount, currency)`
- `columnRenderers.status(status, customText)`
- `columnRenderers.date(date)`
- `columnRenderers.percentage(value, decimals)`
- `columnRenderers.badge(text, variant)`

#### `MetricCard`
Advanced metric display with progress bars, targets, and trend indicators.

```tsx
import { MetricCard } from '@/components/rcm/shared';

<MetricCard
  title="Collection Rate"
  value="87.5%"
  target={90}
  change={{
    value: 2.3,
    period: "vs last month",
    type: "increase"
  }}
  progress={{
    current: 875,
    target: 1000,
    label: "Target Progress"
  }}
  icon={<Target />}
  description="Percentage of billed amount collected"
  size="md" // 'sm' | 'md' | 'lg'
  variant="default" // 'default' | 'outline' | 'ghost'
/>
```

## TypeScript Interfaces

### Core Data Types

```typescript
import { 
  KPIData, 
  PaymentData, 
  ClaimData, 
  PatientAccountData,
  DashboardData 
} from '@/components/rcm/shared';

// Example usage
const kpis: KPIData = {
  totalRevenue: 125000,
  collectionRate: 87.5,
  denialRate: 3.2,
  daysInAR: 28,
  paidClaims: 450,
  deniedClaims: 15,
  totalClaims: 500
};
```

### Status Types

```typescript
import { 
  ClaimStatus, 
  AccountStatus, 
  CollectionStatus,
  PaymentStatus 
} from '@/components/rcm/shared';

const claimStatus: ClaimStatus = 'paid';
const accountStatus: AccountStatus = 'current';
```

### Component Props

```typescript
import { 
  BaseComponentProps,
  DataComponentProps,
  InteractiveComponentProps 
} from '@/components/rcm/shared';

interface MyComponentProps extends DataComponentProps<ClaimData[]> {
  onClaimSelect: (claim: ClaimData) => void;
}
```

## Utility Functions

### Status and Formatting Helpers

```typescript
import { 
  getStatusBadgeProps,
  formatMetricValue,
  getChangeType,
  calculateChange,
  getAgingBucketColor,
  getCollectionPriority
} from '@/components/rcm/shared';

// Get consistent status badge properties
const badgeProps = getStatusBadgeProps('paid');

// Format different types of values
const formattedCurrency = formatMetricValue(1250.50, 'currency');
const formattedPercentage = formatMetricValue(87.5, 'percentage');
const formattedDays = formatMetricValue(28, 'days');

// Calculate change indicators
const changeType = getChangeType(100, 85); // 'increase'
const changePercent = calculateChange(100, 85); // 17.65

// Get aging bucket styling
const bucketColor = getAgingBucketColor('91-120'); // 'text-red-600'

// Determine collection priority
const priority = getCollectionPriority(95, 5000); // 'high'
```

## Constants

```typescript
import { 
  AGING_BUCKETS,
  CLAIM_STATUSES,
  PAYMENT_METHODS,
  COLLECTION_STATUSES
} from '@/components/rcm/shared';

// Use predefined constants for consistency
const buckets = AGING_BUCKETS; // ['0-30', '31-60', '61-90', '91-120', '120+']
const statuses = CLAIM_STATUSES; // ['draft', 'submitted', 'paid', ...]
```

## Usage Examples

### Basic Dashboard KPIs

```tsx
import { KPICard, CurrencyDisplay, StatusBadge } from '@/components/rcm/shared';

const DashboardKPIs = ({ kpis }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
    <KPICard
      title="Total Revenue"
      value={<CurrencyDisplay amount={kpis.totalRevenue} variant="large" />}
      change={12.5}
      changeType="increase"
      icon={<DollarSign className="h-5 w-5 text-green-600" />}
    />
    <KPICard
      title="Collection Rate"
      value={`${kpis.collectionRate}%`}
      change={2.1}
      changeType="increase"
      icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
    />
  </div>
);
```

### Claims Data Table

```tsx
import { DataTable, columnRenderers, StatusBadge } from '@/components/rcm/shared';

const ClaimsTable = ({ claims, loading }) => {
  const columns = [
    {
      key: 'claimNumber',
      title: 'Claim Number',
      dataIndex: 'claimNumber',
      width: '150px'
    },
    {
      key: 'patientName',
      title: 'Patient',
      dataIndex: 'patientName'
    },
    {
      key: 'amount',
      title: 'Amount',
      dataIndex: 'amount',
      align: 'right',
      render: (value) => columnRenderers.currency(value)
    },
    {
      key: 'status',
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'serviceDate',
      title: 'Service Date',
      dataIndex: 'serviceDate',
      render: (value) => columnRenderers.date(value)
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={claims}
      loading={loading}
      title="Recent Claims"
      description="Claims submitted in the last 30 days"
    />
  );
};
```

### Error Handling

```tsx
import { ErrorBoundary, LoadingSpinner } from '@/components/rcm/shared';

const RCMDashboard = () => (
  <ErrorBoundary
    title="Dashboard Error"
    message="Unable to load dashboard data"
    onError={(error) => logError(error)}
  >
    <Suspense fallback={<LoadingSpinner message="Loading dashboard..." />}>
      <DashboardContent />
    </Suspense>
  </ErrorBoundary>
);
```

## Styling and Theming

All components use Tailwind CSS classes and are compatible with the shadcn/ui design system. Components automatically adapt to light/dark themes and respect the application's color scheme.

### Custom Styling

```tsx
// Add custom classes
<KPICard 
  className="border-2 border-blue-500 shadow-lg"
  title="Custom Styled KPI"
  value="$50,000"
/>

// Override default styles
<StatusBadge 
  status="paid"
  className="bg-purple-100 text-purple-800"
/>
```

## Accessibility

All components follow WCAG 2.1 guidelines and include:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management

## Performance Considerations

- Components use React.memo where appropriate
- Large data sets are handled efficiently with virtualization
- Lazy loading support for heavy components
- Optimized re-rendering with proper dependency arrays

## Testing

Components include comprehensive test coverage:

```bash
# Run component tests
npm test src/components/rcm/shared

# Run specific component tests
npm test KPICard.test.tsx
```

## Migration Guide

### From Legacy Components

1. **Replace old KPI cards:**
   ```tsx
   // Old
   <div className="kpi-card">
     <h3>Total Revenue</h3>
     <span>${totalRevenue}</span>
   </div>

   // New
   <KPICard
     title="Total Revenue"
     value={<CurrencyDisplay amount={totalRevenue} />}
   />
   ```

2. **Update status displays:**
   ```tsx
   // Old
   <span className={`status ${status}`}>{status}</span>

   // New
   <StatusBadge status={status} />
   ```

3. **Replace loading states:**
   ```tsx
   // Old
   {loading && <div>Loading...</div>}

   // New
   {loading && <LoadingSpinner message="Loading data..." />}
   ```

## Contributing

When adding new components to the shared library:

1. Follow the existing TypeScript patterns
2. Include comprehensive prop interfaces
3. Add proper documentation and examples
4. Write unit tests
5. Update the index.ts exports
6. Follow accessibility guidelines

## Future Enhancements

- [ ] Add more chart components
- [ ] Implement virtual scrolling for large tables
- [ ] Add animation and transition utilities
- [ ] Create form components for RCM data entry
- [ ] Add print-friendly styling options
- [ ] Implement advanced filtering components
- [ ] Add export functionality to data components

This shared component library provides a solid foundation for building consistent, maintainable, and accessible RCM interfaces while promoting code reuse and development efficiency.