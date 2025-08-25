import React, { useMemo, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/rcm/shared';

// Lazy load chart components for better performance
const RevenueChart = lazy(() => import('./charts/RevenueChart'));
const RevenueSourceChart = lazy(() => import('./charts/RevenueSourceChart'));
const ClaimsStatusChart = lazy(() => import('./charts/ClaimsStatusChart'));
const ClaimsProcessingChart = lazy(() => import('./charts/ClaimsProcessingChart'));
const PaymentSummaryChart = lazy(() => import('./charts/PaymentSummaryChart'));
const PaymentMethodsChart = lazy(() => import('./charts/PaymentMethodsChart'));
const PaymentTrendsChart = lazy(() => import('./charts/PaymentTrendsChart'));
const ARAgingChart = lazy(() => import('./charts/ARAgingChart'));
const PerformanceMetricsChart = lazy(() => import('./charts/PerformanceMetricsChart'));
const ActionItems = lazy(() => import('./ActionItems'));

interface ChartsSectionProps {
  dashboardData: {
    kpis: {
      totalRevenue: number;
      collectionRate: number;
      denialRate: number;
      daysInAR: number;
      paidClaims: number;
      deniedClaims: number;
      totalClaims: number;
    };
    trends: {
      monthlyRevenue: Array<{
        month: string;
        revenue: number;
        collections: number;
      }>;
    };
  };
  paymentData: {
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
  } | null;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ dashboardData, paymentData }) => {
  // Memoize extracted data to prevent unnecessary recalculations
  const { kpis, trends } = useMemo(() => ({
    kpis: dashboardData.kpis,
    trends: dashboardData.trends
  }), [dashboardData.kpis, dashboardData.trends]);

  // Memoize chart loading fallback
  const chartLoadingFallback = useMemo(() => (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner message="Loading chart..." />
    </div>
  ), []);

  return (
    <Tabs defaultValue="revenue" className="space-y-4">
      <TabsList>
        <TabsTrigger value="revenue">Revenue Trends</TabsTrigger>
        <TabsTrigger value="claims">Claims Analysis</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="aging">A/R Aging</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="revenue" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={chartLoadingFallback}>
            <RevenueChart data={trends.monthlyRevenue} />
          </Suspense>
          <Suspense fallback={chartLoadingFallback}>
            <RevenueSourceChart totalRevenue={kpis.totalRevenue} />
          </Suspense>
        </div>
      </TabsContent>

      <TabsContent value="claims" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={chartLoadingFallback}>
            <ClaimsStatusChart kpis={kpis} />
          </Suspense>
          <Suspense fallback={chartLoadingFallback}>
            <ClaimsProcessingChart kpis={kpis} />
          </Suspense>
        </div>
      </TabsContent>

      <TabsContent value="payments" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={chartLoadingFallback}>
            <PaymentSummaryChart paymentData={paymentData} />
          </Suspense>
          <Suspense fallback={chartLoadingFallback}>
            <PaymentMethodsChart paymentData={paymentData} />
          </Suspense>
        </div>
        <Suspense fallback={chartLoadingFallback}>
          <PaymentTrendsChart paymentData={paymentData} />
        </Suspense>
      </TabsContent>

      <TabsContent value="aging" className="space-y-4">
        <Suspense fallback={chartLoadingFallback}>
          <ARAgingChart />
        </Suspense>
      </TabsContent>

      <TabsContent value="performance" className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={chartLoadingFallback}>
            <PerformanceMetricsChart kpis={kpis} />
          </Suspense>
          <Suspense fallback={chartLoadingFallback}>
            <ActionItems />
          </Suspense>
        </div>
      </TabsContent>
    </Tabs>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(ChartsSection);