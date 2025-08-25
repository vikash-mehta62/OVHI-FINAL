import React, { useMemo } from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { KPICard } from '@/components/rcm/shared';
import { formatCurrency } from '@/utils/rcmFormatters';

interface KPICardsProps {
  kpis: {
    totalRevenue: number;
    collectionRate: number;
    denialRate: number;
    daysInAR: number;
  };
}

const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  // Memoized calculation functions to prevent recalculation on every render
  const collectionRateChangeType = useMemo(() => {
    if (kpis.collectionRate >= 85) return 'increase';
    if (kpis.collectionRate >= 70) return 'neutral';
    return 'decrease';
  }, [kpis.collectionRate]);

  const denialRateChangeType = useMemo(() => {
    if (kpis.denialRate <= 5) return 'increase';
    if (kpis.denialRate <= 10) return 'neutral';
    return 'decrease';
  }, [kpis.denialRate]);

  // Memoized formatted values
  const formattedRevenue = useMemo(() => formatCurrency(kpis.totalRevenue), [kpis.totalRevenue]);
  const collectionRateDisplay = useMemo(() => `${kpis.collectionRate}%`, [kpis.collectionRate]);
  const denialRateDisplay = useMemo(() => `${kpis.denialRate}%`, [kpis.denialRate]);

  // Memoized icons to prevent recreation
  const icons = useMemo(() => ({
    revenue: <DollarSign className="h-4 w-4 text-green-600" />,
    collection: <CheckCircle className="h-4 w-4 text-blue-600" />,
    denial: <XCircle className="h-4 w-4 text-red-600" />,
    days: <Clock className="h-4 w-4 text-orange-600" />
  }), []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Revenue"
        value={formattedRevenue}
        change={12.5}
        changeType="increase"
        icon={icons.revenue}
        description="Revenue collected this period"
      />
      <KPICard
        title="Collection Rate"
        value={collectionRateDisplay}
        change={2.1}
        changeType={collectionRateChangeType}
        icon={icons.collection}
        description="Percentage of billed amount collected"
      />
      <KPICard
        title="Denial Rate"
        value={denialRateDisplay}
        change={-1.3}
        changeType={denialRateChangeType}
        icon={icons.denial}
        description="Percentage of claims denied"
      />
      <KPICard
        title="Days in A/R"
        value={kpis.daysInAR}
        change={-2.8}
        changeType="increase"
        icon={icons.days}
        description="Average days to collect payment"
      />
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(KPICards);