import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { useCredits } from '@/features/payments/hooks/useCredits';
import { api } from '@/lib/api';
import { Decimal } from 'decimal.js';

type PaymentStatus = 'loading' | 'success' | 'error';

interface PaymentDetails {
  amount: Decimal;
  credits: Decimal;
}

export default function PaymentConfirmation() {
  const router = useRouter();
  const { refetch: refetchCredits } = useCredits();
  const [status, setStatus] = useState<PaymentStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      // Get the payment_intent_client_secret from URL
      const clientSecret = new URLSearchParams(window.location.search).get(
        'payment_intent_client_secret'
      );

      if (!clientSecret) {
        setStatus('error');
        setError('Invalid payment session');
        return;
      }

      try {
        const result = await api.verifyPaymentIntent(clientSecret);
        
        if (result.status === 'succeeded') {
          setStatus('success');
          setPaymentDetails({
            amount: new Decimal(result.amount).div(100), // Convert from cents
            credits: new Decimal(result.metadata?.credits || 0)
          });
          await refetchCredits();
        } else if (result.status === 'processing') {
          setStatus('loading');
        } else {
          setStatus('error');
          setError('Payment was not successful, please try again');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [refetchCredits]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  const handleTryAgain = () => {
    router.push('/credits');
  };

  return (
    <div className="container max-w-lg py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful'}
            {status === 'error' && 'Payment Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your payment...'}
            {status === 'success' && 'Your credits have been added to your account'}
            {status === 'error' && 'There was a problem processing your payment'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Verifying payment...
              </p>
            </div>
          )}

          {status === 'success' && paymentDetails && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <h3 className="mt-4 text-lg font-semibold">
                  ${paymentDetails.amount.toFixed(2)} USD
                </h3>
                <p className="text-sm text-muted-foreground">
                  {paymentDetails.credits.toFixed(8)} credits added to your account
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-8">
                <XCircle className="h-12 w-12 text-destructive" />
                <p className="mt-4 text-sm text-muted-foreground">
                  {error || 'An unexpected error occurred'}
                </p>
              </div>
              <Alert variant="destructive">
                <AlertDescription>
                  Your payment could not be processed. Please try again or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end gap-4">
          {status === 'error' && (
            <Button onClick={handleTryAgain} variant="outline">
              Try Again
            </Button>
          )}
          <Button onClick={handleContinue}>
            {status === 'success' ? (
              <>
                Continue to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Return to Dashboard'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}