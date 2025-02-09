import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Receipt, Clock, CreditCard, Info } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';
import type { Transaction } from '@/types/api';

export default function TransactionDetails() {
  const router = useRouter();
  const { id } = router.query;

  const { data: transaction, isLoading, error } = useQuery<Transaction>({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await fetch(`/api/payments/transactions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch transaction');
      return response.json();
    },
    enabled: !!id
  });

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load transaction details
        </AlertDescription>
      </Alert>
    );
  }

  if (!transaction) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Transaction not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="outline"
        onClick={handleBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Transactions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Transaction ID: {transaction.transaction_id}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Receipt className="h-4 w-4" />
                <span>Amount</span>
              </div>
              <p className="text-2xl font-bold">
                {transaction.amount} credits
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Date & Time</span>
              </div>
              <p className="text-2xl font-bold">
                {formatDateTime(transaction.timestamp)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Balance After</span>
              </div>
              <p className="text-2xl font-bold">
                {transaction.balance_after} credits
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Status</span>
              </div>
              <p className="text-2xl font-bold capitalize">
                {transaction.payment_status.toLowerCase()}
              </p>
            </div>
          </div>

          {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Additional Details</h3>
              <div className="rounded-lg bg-muted p-4">
                <dl className="space-y-2">
                  {Object.entries(transaction.metadata).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-2">
                      <dt className="text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}