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

interface ClaimsProcessingChartProps {
  kpis: {
    paidClaims: number;
    deniedClaims: number;
    totalClaims: number;
    daysInAR: number;
  };
}

const ClaimsProcessingChart: React.FC<ClaimsProcessingChartProps> = ({ kpis }) => {
  const data = [
    { status: 'Paid', days: 14, count: kpis.paidClaims },
    { status: 'Denied', days: 8, count: kpis.deniedClaims },
    { 
      status: 'Pending', 
      days: kpis.daysInAR, 
      count: kpis.totalClaims - kpis.paidClaims - kpis.deniedClaims 
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claims Processing Time</CardTitle>
        <CardDescription>
          Average time to process claims by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="days" fill="#3B82F6" name="Avg Days" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ClaimsProcessingChart;