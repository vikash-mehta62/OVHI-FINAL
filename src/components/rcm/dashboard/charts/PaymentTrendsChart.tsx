import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/rcmFormatters';

interface PaymentTrendsChartProps {
  paymentData: {
    daily_trends: Array<{
      payment_date: string;
      daily_revenue: number;
      payment_count: number;
    }>;
  } | null;
}

const PaymentTrendsChart: React.FC<PaymentTrendsChartProps> = ({ paymentData }) => {
  if (!paymentData || paymentData.daily_trends.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Payment Trends</CardTitle>
        <CardDescription>
          Payment volume and revenue by day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={paymentData.daily_trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="payment_date" />
            <YAxis yAxisId="left" tickFormatter={(value) => `${value / 1000}K`} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value, name) => [
                name === 'daily_revenue' ? formatCurrency(value as number) : value,
                name === 'daily_revenue' ? 'Revenue' : 'Count'
              ]}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="daily_revenue" fill="#3B82F6" name="Daily Revenue" />
            <Line yAxisId="right" type="monotone" dataKey="payment_count" stroke="#10B981" name="Payment Count" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default PaymentTrendsChart;