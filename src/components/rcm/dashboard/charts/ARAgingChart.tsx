import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/rcmFormatters';

const ARAgingChart: React.FC = () => {
  const data = [
    { range: '0-30 days', amount: 25000, percentage: 45 },
    { range: '31-60 days', amount: 15000, percentage: 27 },
    { range: '61-90 days', amount: 8000, percentage: 14 },
    { range: '91-120 days', amount: 5000, percentage: 9 },
    { range: '120+ days', amount: 3000, percentage: 5 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>A/R Aging Analysis</CardTitle>
        <CardDescription>
          Outstanding receivables by age bucket
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="range" />
            <YAxis tickFormatter={(value) => `${value / 1000}K`} />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Bar dataKey="amount" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ARAgingChart;