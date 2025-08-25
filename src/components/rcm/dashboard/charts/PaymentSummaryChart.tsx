import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Settings } from 'lucide-react';
import { formatCurrency } from '@/utils/rcmFormatters';

interface PaymentSummaryChartProps {
  paymentData: {
    summary: {
      successful_payments: number;
      failed_payments: number;
      success_rate: number;
      total_revenue: number;
      total_fees: number;
      net_revenue: number;
    };
  } | null;
}

const PaymentSummaryChart: React.FC<PaymentSummaryChartProps> = ({ paymentData }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Processing Summary</CardTitle>
        <CardDescription>
          Payment transactions and processing metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        {paymentData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {paymentData.summary.successful_payments}
                </div>
                <div className="text-sm text-muted-foreground">Successful Payments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {paymentData.summary.failed_payments}
                </div>
                <div className="text-sm text-muted-foreground">Failed Payments</div>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm">Success Rate</span>
                <span className="font-semibold">{paymentData.summary.success_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${paymentData.summary.success_rate}%` }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Gross Revenue:</span>
                <span className="font-semibold">{formatCurrency(paymentData.summary.total_revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fees:</span>
                <span className="font-semibold text-red-600">-{formatCurrency(paymentData.summary.total_fees)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Net Revenue:</span>
                <span className="font-bold text-green-600">{formatCurrency(paymentData.summary.net_revenue)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground">No payment data available</p>
            <Button variant="outline" size="sm" className="mt-2">
              <Settings className="h-4 w-4 mr-2" />
              Configure Payment Gateway
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentSummaryChart;