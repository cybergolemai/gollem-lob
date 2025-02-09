import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CreditCard, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Decimal } from 'decimal.js';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

const CreditPurchase = () => {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(new Decimal(0));
  const [balance, setBalance] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Credit conversion rate
  const CREDIT_RATE = new Decimal('0.001'); // $0.001 per credit

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const result = await api.getCreditBalance();
        setBalance(result.balance);
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      }
    };

    fetchBalance();
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      const decimalAmount = value ? new Decimal(value) : new Decimal(0);
      setCredits(decimalAmount.div(CREDIT_RATE).floor());
    }
  };

  const handlePurchase = async () => {
    if (!stripe || !elements) {
      setError('Payment system not initialized');
      return;
    }

    const amountDecimal = new Decimal(amount);
    if (amountDecimal.lessThan(1)) {
      setError('Minimum purchase amount is $1.00');
      return;
    }
    if (amountDecimal.greaterThan(1000)) {
      setError('Maximum purchase amount is $1,000.00');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { clientSecret } = await api.createPaymentIntent(amountDecimal.toNumber());
      
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/confirm`,
          payment_method_data: {
            billing_details: {
              // Add any additional billing details if needed
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // The confirmPayment will redirect to return_url on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Purchase Credits
        </CardTitle>
        <CardDescription>
          Current Balance: {balance ? `${new Decimal(balance).toFixed(8)} credits` : 'Loading...'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount (USD)</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              className="pl-10"
              placeholder="0.00"
              disabled={loading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            You will receive approximately {credits.toFixed(0)} credits
          </p>
        </div>

        {clientSecret && (
          <div className="mt-4">
            <PaymentElement />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handlePurchase} 
          disabled={loading || !amount || new Decimal(amount || 0).lessThan(1)}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Purchase Credits</>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreditPurchase;