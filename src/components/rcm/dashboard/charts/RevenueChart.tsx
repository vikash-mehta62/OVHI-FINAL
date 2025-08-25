import React, { useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/rcmFormatters';

interface RevenueChartProps {
  data: Array<{
    month: string;
    revenue: number;
    collections: number;
  }>;
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  // Memoized tick formatter to prevent recreation on every render
  const yAxisTickFormatter = useCallback((value: number) => `${value / 1000}K`, []);
  
  // Memoized tooltip formatter
  const tooltipFormatter = useCallback((value: number) => formatCurrency(value), []);

  // Memoized chart configuration to prevent recreation
  const chartConfig = useMemo(() => ({
    areas: [
      {
        dataKey: "revenue",
        stackId: "1",
        stroke: "#3B82F6",
        fill: "#3B82F6",
        fillOpacity: 0.6,
        name: "Total Revenue"
      },
      {
        dataKey: "collections",
        stackId: "2",
        stroke: "#10B981",
        fill: "#10B981",
        fillOpacity: 0.6,
        name: "Collections"
      }
    ]
  }), []);

  // Memoize the chart data to prevent unnecessary recalculations
  const memoizedData = useMemo(() => data, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Revenue Trend</CardTitle>
        <CardDescription>
          Revenue and collections over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={memoizedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={yAxisTickFormatter} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            {chartConfig.areas.map((area) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId={area.stackId}
                stroke={area.stroke}
                fill={area.fill}
                fillOpacity={area.fillOpacity}
                name={area.name}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Memoize the component to prevent unnecessary re-renders when props haven't changed
export default React.memo(RevenueChart);