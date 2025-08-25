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

interface RevenueSourceChartProps {
  totalRevenue: number;
}

const RevenueSourceChart: React.FC<RevenueSourceChartProps> = ({ totalRevenue }) => {
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
  
  const data = [
    { name: 'Insurance', value: 65, amount: totalRevenue * 0.65 },
    { name: 'Self Pay', value: 20, amount: totalRevenue * 0.20 },
    { name: 'Medicare', value: 10, amount: totalRevenue * 0.10 },
    { name: 'Medicaid', value: 5, amount: totalRevenue * 0.05 }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Source</CardTitle>
        <CardDescription>
          Breakdown of revenue by payer type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value}%`, name]} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueSourceChart;