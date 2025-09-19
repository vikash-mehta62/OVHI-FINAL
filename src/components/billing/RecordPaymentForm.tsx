import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import billingService, { Invoice, PaymentData } from '@/services/billingService';
import { toast } from 'sonner';

interface RecordPaymentFormProps {
  invoice: Invoice;
  onSuccess: () => void;
}

interface PaymentFormData {
  amount_paid: string;
  payment_method: 'cash' | 'card' | 'check' | 'bank_transfer' | 'insurance';
  transaction_id: string;
  reference_number: string;
  notes: string;
}

const RecordPaymentForm: React.FC<RecordPaymentFormProps> = ({ invoice, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<PaymentFormData>({
    defaultValues: {
      amount_paid: invoice.amount_due.toString(),
      payment_method: 'card',
      transaction_id: '',
      reference_number: '',
      notes: ''
    }
  });

  const watchedAmount = watch('amount_paid');
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

      const amount = parseFloat(data.amount_paid);
      
      if (amount <= 0) {
        toast.error('Payment amount must be greater than 0');
        return;
      }

      if (amount > invoice.amount_due) {
        toast.error('Payment amount cannot exceed the amount due');
        return;
      }

      const paymentData: PaymentData = {
        invoice_id: invoice.id,
        amount_paid: amount,
        payment_method: data.payment_method,
        transaction_id: data.transaction_id || undefined,
        reference_number: data.reference_number || undefined,
        notes: data.notes || undefined
      };

      await billingService.recordPayment(paymentData);
      onSuccess();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const setFullPayment = () => {
    setValue('amount_paid', invoice.amount_due.toString());
  };

  return (
    <div className="space-y-6">
      {/* Invoice Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Patient:</span>
              <span className="font-medium">{invoice.patient_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-medium text-green-600">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900 font-semibold">Amount Due:</span>
              <span className="font-bold text-red-600">{formatCurrency(invoice.amount_due)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="amount_paid">Payment Amount *</Label>
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
            {...register('amount_paid', {
              required: 'Payment amount is required',
              min: { value: 0.01, message: 'Amount must be greater than 0' },
              max: { value: invoice.amount_due, message: 'Amount cannot exceed amount due' }
            })}
            type="number"
            step="0.01"
            min="0.01"
            max={invoice.amount_due}
            placeholder="0.00"
          />
          {errors.amount_paid && (
            <p className="text-sm text-red-600">{errors.amount_paid.message}</p>
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

        {watchedMethod === 'card' && (
          <div className="space-y-2">
            <Label htmlFor="transaction_id">Transaction ID</Label>
            <Input
              {...register('transaction_id')}
              placeholder="Enter transaction ID from payment processor"
            />
          </div>
        )}

        {watchedMethod === 'check' && (
          <div className="space-y-2">
            <Label htmlFor="reference_number">Check Number</Label>
            <Input
              {...register('reference_number')}
              placeholder="Enter check number"
            />
          </div>
        )}

        {watchedMethod === 'bank_transfer' && (
          <div className="space-y-2">
            <Label htmlFor="reference_number">Reference Number</Label>
            <Input
              {...register('reference_number')}
              placeholder="Enter bank transfer reference"
            />
          </div>
        )}

        {watchedMethod === 'insurance' && (
          <div className="space-y-2">
            <Label htmlFor="reference_number">Claim Number</Label>
            <Input
              {...register('reference_number')}
              placeholder="Enter insurance claim number"
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