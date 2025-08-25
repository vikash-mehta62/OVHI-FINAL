import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/rcmFormatters';

interface PaymentMethodsChartProps {
  paymentData: {
    payment_methods: Array<{
      payment_method: string;
      total_amount: number;
    }>;
  } | null;
}

const PaymentMethodsChart: React.FC<PaymentMethodsChartProps> = ({ paymentData }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
        <CardDescription>
          Revenue breakdown by payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentData && paymentData.payment_methods.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={paymentData.payment_methods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ payment_method, total_amount }) => 
                  `${payment_method}: ${formatCurrency(total_amount)}`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="total_amount"
              >
                {paymentData.payment_methods.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payment method data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsChart;