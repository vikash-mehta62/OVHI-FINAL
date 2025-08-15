import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, DollarSign, User, FileText } from 'lucide-react';
import { paymentAPI } from '@/services/operations/payments';

// Initialize Stripe (you'll need to get this from your gateway settings)
const stripePromise = loadStripe('pk_test_your_publishable_key_here');

interface PaymentFormProps {
  patientId: number;
  billingId?: number;
  amount: number;
  description?: string;
  onSuccess?: (paymentData: any) => void;
  onCancel?: () => void;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  patientId,
  billingId,
  amount,
  description = 'Medical service payment',
  onSuccess,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  useEffect(() => {
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await paymentAPI.createPaymentIntent({
        patient_id: patientId,
        billing_id: billingId,
        amount,
        description
      });

      if (response.success) {
        setClientSecret(response.data.client_secret);
        setPaymentId(response.data.payment_id);
      } else {
        setError('Failed to initialize payment');
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to initialize payment');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found');
      setProcessing(false);
      return;
    }

    // Confirm payment with Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: 'Patient Name', // You might want to pass this as a prop
        },
      },
    });

    if (stripeError) {
      setError(stripeError.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      // Confirm payment on your backend
      try {
        const response = await paymentAPI.confirmPayment(paymentId!, {
          payment_intent_id: paymentIntent.id,
          payment_method_id: paymentIntent.payment_method
        });

        if (response.success) {
          onSuccess?.(response.data);
        } else {
          setError('Payment confirmation failed');
        }
      } catch (error: any) {
        setError(error.response?.data?.message || 'Payment confirmation failed');
      }
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amount:</span>
              <span className="font-semibold">${amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Description:</span>
              <span className="text-sm">{description}</span>
            </div>
          </div>

          {/* Card Element */}
          <div>
            <Label>Card Information</Label>
            <div className="mt-1 p-3 border border-gray-300 rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>

          {error && (
            <Alert className="border-red-500">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={!stripe || processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center">
            Your payment information is secure and encrypted.
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};

export default PaymentForm;