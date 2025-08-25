import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { getRCMDashboardDataAPI } from '@/services/operations/rcm';
import { paymentAPI } from '@/services/operations/payments';

// Dashboard components
import DashboardHeader from './dashboard/DashboardHeader';
import KPICards from './dashboard/KPICards';
import ChartsSection from './dashboard/ChartsSection';
import LoadingSpinner from './dashboard/LoadingSpinner';
import ErrorBoundary from './dashboard/ErrorBoundary';

const RCMDashboard: React.FC = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized fetch function to prevent unnecessary re-renders
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [rcmResponse, paymentResponse] = await Promise.all([
        getRCMDashboardDataAPI(token, timeframe),
        paymentAPI.getPaymentAnalytics(token, { timeframe })
      ]);
      
      if (rcmResponse.success) {
        setDashboardData(rcmResponse.data);
      } else {
        setError('Failed to load RCM data');
      }
      
      if (paymentResponse.success) {
        setPaymentData(paymentResponse.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [token, timeframe]);

  // Memoized refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  // Memoized export handler
  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Export functionality to be implemented');
  }, []);

  // Memoized timeframe change handler
  const handleTimeframeChange = useCallback((newTimeframe: string) => {
    setTimeframe(newTimeframe);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized loading component
  const loadingComponent = useMemo(() => (
    <LoadingSpinner message="Loading dashboard..." />
  ), []);

  // Memoized error component
  const errorComponent = useMemo(() => (
    <div className="text-center py-8">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
      <p>{error || 'Unable to load dashboard data'}</p>
      <Button onClick={fetchDashboardData} className="mt-4">
        Try Again
      </Button>
    </div>
  ), [error, fetchDashboardData]);

  // Memoized KPI data to prevent unnecessary recalculations
  const memoizedKpis = useMemo(() => {
    return dashboardData?.kpis || null;
  }, [dashboardData?.kpis]);

  if (loading) {
    return loadingComponent;
  }

  if (error || !dashboardData) {
    return errorComponent;
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <DashboardHeader
          timeframe={timeframe}
          onTimeframeChange={handleTimeframeChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          refreshing={refreshing}
        />

        {memoizedKpis && <KPICards kpis={memoizedKpis} />}

        <ChartsSection 
          dashboardData={dashboardData} 
          paymentData={paymentData} 
        />
      </div>
    </ErrorBoundary>
  );
};

export default RCMDashboard;