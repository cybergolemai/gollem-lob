import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CreditCard, Loader2 } from 'lucide-react';

const CreditPurchase = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState(0);
  const [balance, setBalance] = useState(null);

  // Credit conversion rate
  const CREDIT_RATE = 0.001; // $0.001 per credit

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/payments/balance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setBalance(parseFloat(data.balance));
      }
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setCredits(Math.floor(parseFloat(value || 0) / CREDIT_RATE));
    }
  };

  const handlePurchase = async () => {
    if (!amount || parseFloat(amount) < 1) {
      setError('Minimum purchase amount is $1.00');
      return;
    }
    if (parseFloat(amount) > 1000) {
      setError('Maximum purchase amount is $1,000.00');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'usd'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();
      
      // Here you would normally invoke the Stripe payment flow
      // using the clientSecret, but we'll just show a success message
      setAmount('');
      setCredits(0);
      await fetchBalance();
    } catch (err) {
      setError(err.message);
    } finally {
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
          Current Balance: {balance !== null ? `${balance.toFixed(8)} credits` : 'Loading...'}
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
            />
          </div>
          <p className="text-sm text-gray-500">
            You will receive approximately {credits.toLocaleString()} credits
          </p>
        </div>

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
          disabled={loading || !amount || parseFloat(amount) < 1}
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