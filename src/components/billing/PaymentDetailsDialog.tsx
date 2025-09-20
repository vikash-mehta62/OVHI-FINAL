import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Calendar, DollarSign, FileText, User } from 'lucide-react';

interface Payment {
  id: number;
  bill_id: number;
  patient_name: string;
  patient_email?: string;
  payment_method: string;
  transaction_id?: string;
  amount: number;
  payment_date: string;
  gateway_response?: any;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  bill_total_amount: number;
  created_at: string;
}

interface PaymentDetailsDialogProps {
  payment: Payment;
}

const PaymentDetailsDialog = ({ payment }: PaymentDetailsDialogProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Payment Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment #{payment.id}</h2>
          <p className="text-gray-600">Payment details and transaction information</p>
        </div>
        <Badge className={`${getStatusColor(payment.status)} font-medium px-3 py-1 rounded-full`}>
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold text-lg">{formatCurrency(payment.amount)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium capitalize">{payment.payment_method.replace('_', ' ')}</span>
            </div>
            
            {payment.transaction_id && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-sm">{payment.transaction_id}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Date:</span>
              <span className="font-medium">{formatDate(payment.payment_date)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">{formatDate(payment.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Patient & Bill Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Patient & Bill Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Patient:</span>
              <span className="font-medium">{payment.patient_name}</span>
            </div>
            
            {payment.patient_email && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium">{payment.patient_email}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bill #:</span>
              <span className="font-medium">#{payment.bill_id}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Bill Total:</span>
              <span className="font-semibold">{formatCurrency(payment.bill_total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes Section */}
      {payment.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{payment.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Gateway Response */}
      {payment.gateway_response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Gateway Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(payment.gateway_response, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PaymentDetailsDialog;