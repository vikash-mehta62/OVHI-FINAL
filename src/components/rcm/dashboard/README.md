# RCM Dashboard Components

This directory contains the refactored RCM Dashboard components, broken down from the original monolithic `RCMDashboard.tsx` component into smaller, focused, and reusable components.

## Component Architecture

### Main Components

#### `DashboardHeader.tsx`
- **Purpose**: Renders the dashboard header with title, description, and controls
- **Props**: 
  - `timeframe`: Current selected timeframe
  - `onTimeframeChange`: Callback for timeframe changes
  - `onRefresh`: Callback for refresh action
  - `onExport`: Callback for export action
  - `refreshing`: Boolean indicating refresh state
- **Features**: Timeframe selector, refresh button, export button

#### `KPICards.tsx`
- **Purpose**: Renders the key performance indicator cards
- **Props**: 
  - `kpis`: Object containing KPI data (totalRevenue, collectionRate, denialRate, daysInAR)
- **Features**: 
  - Individual `KPICard` component for reusability
  - Automatic change type calculation based on values
  - Proper formatting and icons

#### `ChartsSection.tsx`
- **Purpose**: Main container for all chart tabs and content
- **Props**: 
  - `dashboardData`: Complete dashboard data object
  - `paymentData`: Payment analytics data
- **Features**: 
  - Tab-based navigation
  - Lazy loading of chart components
  - Proper data flow to child components

### Chart Components (`charts/` directory)

#### `RevenueChart.tsx`
- **Purpose**: Monthly revenue trend area chart
- **Props**: `data` - Array of monthly revenue data
- **Chart Type**: Area chart with revenue and collections

#### `RevenueSourceChart.tsx`
- **Purpose**: Revenue breakdown by payer type
- **Props**: `totalRevenue` - Total revenue amount
- **Chart Type**: Pie chart with calculated percentages

#### `ClaimsStatusChart.tsx`
- **Purpose**: Claims status distribution display
- **Props**: `kpis` - KPI data with claims information
- **Chart Type**: Custom status indicators with percentages

#### `ClaimsProcessingChart.tsx`
- **Purpose**: Claims processing time by status
- **Props**: `kpis` - KPI data for processing times
- **Chart Type**: Bar chart showing average days

#### `PaymentSummaryChart.tsx`
- **Purpose**: Payment processing summary and metrics
- **Props**: `paymentData` - Payment analytics data
- **Features**: Success rate visualization, revenue breakdown

#### `PaymentMethodsChart.tsx`
- **Purpose**: Payment methods breakdown
- **Props**: `paymentData` - Payment analytics data
- **Chart Type**: Pie chart with payment method distribution

#### `PaymentTrendsChart.tsx`
- **Purpose**: Daily payment trends over time
- **Props**: `paymentData` - Payment analytics data
- **Chart Type**: Combined bar and line chart

#### `ARAgingChart.tsx`
- **Purpose**: Accounts receivable aging analysis
- **Props**: None (uses static data for now)
- **Chart Type**: Bar chart with aging buckets

#### `PerformanceMetricsChart.tsx`
- **Purpose**: Performance metrics vs benchmarks
- **Props**: `kpis` - KPI data for metrics
- **Features**: Progress bars with benchmark comparisons

### Utility Components

#### `LoadingSpinner.tsx`
- **Purpose**: Reusable loading spinner component
- **Props**: 
  - `message`: Loading message (optional)
  - `size`: Spinner size ('sm', 'md', 'lg')
- **Features**: Configurable size and message

#### `ErrorBoundary.tsx`
- **Purpose**: Error boundary for graceful error handling
- **Props**: 
  - `children`: Child components to wrap
  - `fallback`: Custom fallback component (optional)
- **Features**: Error catching, retry functionality, custom fallbacks

#### `ActionItems.tsx`
- **Purpose**: Displays recommended actions and alerts
- **Props**: None (uses static data for now)
- **Features**: Color-coded action items with descriptions

## Benefits of Component Breakdown

### 1. **Improved Maintainability**
- Each component has a single responsibility
- Easier to locate and fix issues
- Cleaner code organization

### 2. **Enhanced Reusability**
- Components can be reused across different dashboards
- `KPICard` can be used in other parts of the application
- Chart components are modular and configurable

### 3. **Better Performance**
- Smaller components reduce re-render scope
- Easier to implement React.memo optimizations
- Lazy loading capabilities for charts

### 4. **Improved Testing**
- Each component can be tested in isolation
- Easier to write focused unit tests
- Better test coverage

### 5. **Better Developer Experience**
- Easier to understand component structure
- Faster development with focused components
- Better IDE support and IntelliSense

## Usage Examples

### Basic Usage
```tsx
import { DashboardHeader, KPICards, ChartsSection } from './dashboard';

// Use individual components
<DashboardHeader 
  timeframe={timeframe}
  onTimeframeChange={setTimeframe}
  onRefresh={handleRefresh}
  onExport={handleExport}
  refreshing={refreshing}
/>

<KPICards kpis={dashboardData.kpis} />

<ChartsSection 
  dashboardData={dashboardData} 
  paymentData={paymentData} 
/>
```

### Individual Chart Usage
```tsx
import { RevenueChart, KPICard } from './dashboard';

// Use individual chart
<RevenueChart data={monthlyRevenueData} />

// Use individual KPI card
<KPICard
  title="Total Revenue"
  value="$125,000"
  change={12.5}
  changeType="increase"
  icon={<DollarSign />}
  description="Revenue collected this period"
/>
```

## Component Props Interface

### KPIData Interface
```typescript
interface KPIData {
  totalRevenue: number;
  collectionRate: number;
  denialRate: number;
  daysInAR: number;
  paidClaims: number;
  deniedClaims: number;
  totalClaims: number;
}
```

### PaymentData Interface
```typescript
interface PaymentData {
  summary: {
    successful_payments: number;
    failed_payments: number;
    success_rate: number;
    total_revenue: number;
    total_fees: number;
    net_revenue: number;
  };
  payment_methods: Array<{
    payment_method: string;
    total_amount: number;
  }>;
  daily_trends: Array<{
    payment_date: string;
    daily_revenue: number;
    payment_count: number;
  }>;
}
```

## Future Enhancements

1. **Data Fetching Hooks**: Move data fetching logic to custom hooks
2. **Memoization**: Add React.memo to expensive components
3. **Virtualization**: Implement virtual scrolling for large data sets
4. **Accessibility**: Enhance ARIA labels and keyboard navigation
5. **Theming**: Add theme support for charts and components
6. **Export Functionality**: Implement chart export capabilities
7. **Real-time Updates**: Add WebSocket support for live data updates

## Migration Guide

When migrating from the old monolithic component:

1. **Import Changes**: Update imports to use new component structure
2. **Props Passing**: Ensure proper props are passed to child components
3. **State Management**: Consider moving state to parent components or hooks
4. **Error Handling**: Wrap components in ErrorBoundary for better error handling
5. **Testing**: Update tests to work with new component structure

This refactored structure provides a solid foundation for the RCM dashboard while maintaining all existing functionality and improving code quality, maintainability, and performance.