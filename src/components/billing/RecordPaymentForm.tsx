import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import billingService from '@/services/billingService';
import { toast } from 'sonner';

interface Bill {
  id: number;
  patient_id: number;
  patient_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  physician_name?: string;
}

interface RecordPaymentFormProps {
  bill: Bill;
  onSuccess: () => void;
}

interface PaymentFormData {
  amount: string;
  payment_method: 'card' | 'cash' | 'bank_transfer' | 'insurance' | 'check';
  transaction_id: string;
  notes: string;
}

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ bill, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PaymentFormData>({
    defaultValues: {
      amount: bill.total_amount.toString(),
      payment_method: 'card',
      transaction_id: '',
      notes: ''
    }
  });

  const watchedAmount = watch('amount');
  const watchedMethod = watch('payment_method');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setLoading(true);

      const amount = parseFloat(data.amount);
      
      if (amount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (amount > bill.total_amount) {
        toast.error('Payment amount cannot exceed the bill total');
        return;
      }

      const paymentData = {
        bill_id: bill.id,
        amount: amount,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id || undefined,
        notes: data.notes || undefined
      };

      await billingService.createPayment(paymentData);
      toast.success('Payment recorded successfully');
      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const setFullPayment = () => {
    setValue('amount', bill.total_amount.toString());
  };

  return (
    <div className="space-y-6">
      {/* Bill Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Bill Number:</span>
              <span className="font-medium">#{bill.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Patient:</span>
              <span className="font-medium">{bill.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(bill.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium capitalize">{bill.status}</span>
            </div>
            {bill.physician_name && (
              <div className="flex justify-between">
                <span className="text-gray-600">Physician:</span>
                <span className="font-medium">{bill.physician_name}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="amount">Payment Amount *</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setFullPayment}
            >
              Pay Full Amount
            </Button>
          </div>
          <Input
            {...register('amount', {
              required: 'Payment amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' },
              max: { value: bill.total_amount, message: 'Amount cannot exceed bill total' }
            })}
            type="number"
            step="0.01"
            min="0.01"
            max={bill.total_amount}
            placeholder="0.00"
          />
          {errors.amount && (
            <p className="text-sm text-red-600">{errors.amount.message}</p>
          )}
          {watchedAmount && (
            <p className="text-sm text-gray-600">
              Payment: {formatCurrency(parseFloat(watchedAmount) || 0)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="payment_method">Payment Method *</Label>
          <Select
            onValueChange={(value) => setValue('payment_method', value as PaymentFormData['payment_method'])}
            defaultValue="card"
          >
            <SelectTrigger>
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Credit/Debit Card</SelectItem>
              <SelectItem value="check">Check</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="insurance">Insurance Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(watchedMethod === 'card' || watchedMethod === 'bank_transfer') && (
          <div className="space-y-2">
            <Label htmlFor="transaction_id">Transaction ID</Label>
            <Input
              {...register('transaction_id')}
              placeholder="Enter transaction ID from payment processor"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            {...register('notes')}
            placeholder="Additional notes about this payment..."
            rows={3}
          />
        </div>

        <div className="flex gap-4 justify-end pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="min-w-32"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default RecordPaymentForm;