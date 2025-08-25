import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ClaimsStatusChartProps {
  kpis: {
    paidClaims: number;
    deniedClaims: number;
    totalClaims: number;
  };
}

const ClaimsStatusChart: React.FC<ClaimsStatusChartProps> = ({ kpis }) => {
  const pendingClaims = kpis.totalClaims - kpis.paidClaims - kpis.deniedClaims;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims Status Distribution</CardTitle>
        <CardDescription>
          Current status of all claims
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>Paid Claims</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{kpis.paidClaims}</div>
              <div className="text-sm text-muted-foreground">
                {((kpis.paidClaims / kpis.totalClaims) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span>Denied Claims</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{kpis.deniedClaims}</div>
              <div className="text-sm text-muted-foreground">
                {((kpis.deniedClaims / kpis.totalClaims) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span>Pending Claims</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">{pendingClaims}</div>
              <div className="text-sm text-muted-foreground">
                {((pendingClaims / kpis.totalClaims) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaimsStatusChart;