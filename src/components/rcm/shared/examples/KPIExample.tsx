import React from 'react';
import { KPICard, CurrencyDisplay, MetricCard } from '@/components/rcm/shared';
import { DollarSign, TrendingUp, Target, Users } from 'lucide-react';

const KPIExample: React.FC = () => {
  return (
    <div className="space-y-8 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">KPI Card Examples</h2>
        
        {/* Basic KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <KPICard
            title="Total Revenue"
            value={<CurrencyDisplay amount={125000} variant="large" />}
            change={12.5}
            changeType="increase"
            icon={<DollarSign className="h-5 w-5 text-green-600" />}
            description="Revenue collected this period"
          />
          
          <KPICard
            title="Collection Rate"
            value="87.5%"
            change={2.1}
            changeType="increase"
            icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
            description="Percentage of billed amount collected"
            variant="compact"
          />
          
          <KPICard
            title="Active Patients"
            value="1,247"
            change={-3.2}
            changeType="decrease"
            icon={<Users className="h-5 w-5 text-purple-600" />}
            description="Patients with active accounts"
            variant="detailed"
          />
        </div>

        {/* Metric Cards with Progress */}
        <h3 className="text-xl font-semibold mb-4">Metric Cards with Progress</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MetricCard
            title="Monthly Collection Goal"
            value={<CurrencyDisplay amount={87500} variant="large" />}
            change={{
              value: 15.3,
              period: "vs last month",
              type: "increase"
            }}
            progress={{
              current: 87500,
              target: 100000,
              label: "Goal Progress"
            }}
            icon={<Target className="h-6 w-6 text-green-600" />}
            description="Progress toward monthly collection target"
            size="lg"
          />
          
          <MetricCard
            title="Denial Rate"
            value="3.2%"
            change={{
              value: -0.8,
              period: "vs last month", 
              type: "increase"
            }}
            progress={{
              current: 32,
              target: 50,
              label: "Target: <5%"
            }}
            icon={<TrendingUp className="h-6 w-6 text-red-600" />}
            description="Percentage of claims denied"
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
};

export default KPIExample;