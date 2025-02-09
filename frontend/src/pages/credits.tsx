import React from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import CreditBalance from '@/features/payments/credit-purchase/CreditBalance';
import CreditPurchase from '@/features/payments/credit-purchase/CreditPurchase';
import CreditUsageChart from '@/features/payments/CreditUsageChart';
import TransactionList from '@/features/payments/transaction-history/TransactionList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Wallet, ListChecks, BarChart } from 'lucide-react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CreditsPage() {
  return (
    <MainLayout>
      <div className="container space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Credits
          </h1>
          <p className="max-w-2xl mx-auto text-muted-foreground">
            View your current credit balance, purchase more credits, and track your usage history.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Credit Balance Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                Current Balance
              </CardTitle>
              <CardDescription>Real-time credit balance</CardDescription>
            </CardHeader>
            <CardContent>
              <CreditBalance />
            </CardContent>
          </Card>

          {/* Credit Purchase Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-lg font-medium flex items-center gap-1">
                <CreditCard className="h-4 w-4" />
                Purchase Credits
              </CardTitle>
              <CardDescription>Securely add credits to your account</CardDescription>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <CreditPurchase />
              </Elements>
            </CardContent>
          </Card>
        </div>

        {/* Credit Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-1">
              <BarChart className="h-4 w-4" />
              Credit Usage Chart
            </CardTitle>
            <CardDescription>Visual representation of your credit consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <CreditUsageChart />
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center gap-1">
              <ListChecks className="h-4 w-4" />
              Transaction History
            </CardTitle>
            <CardDescription>Detailed record of your credit transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionList />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}