import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCredits } from '../hooks/useCredits';
import { formatRelativeTime } from '@/utils/formatters';
import { Loader2, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import type { Transaction } from '@/types/api';
import Link from 'next/link';

export default function TransactionList() {
  const { transactions, isTransactionsLoading } = useCredits();
  const [page, setPage] = useState(1);
  const perPage = 10;

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'TRANSACTION_TYPE_PURCHASE':
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case 'TRANSACTION_TYPE_USAGE':
        return <ArrowDownCircle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    return type
      .replace('TRANSACTION_TYPE_', '')
      .toLowerCase()
      .replace(/_/g, ' ');
  };

  if (isTransactionsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const paginatedTransactions = transactions.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {paginatedTransactions.map((transaction) => (
            <Link
              key={transaction.transaction_id}
              href={`/transactions/${transaction.transaction_id}`}
              className="block"
            >
              <div className="flex items-center justify-between p-4 hover:bg-muted rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  {getTransactionIcon(transaction.type)}
                  <div>
                    <p className="font-medium capitalize">
                      {getTransactionLabel(transaction.type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatRelativeTime(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${
                    transaction.type === 'TRANSACTION_TYPE_PURCHASE'
                      ? 'text-green-600'
                      : transaction.type === 'TRANSACTION_TYPE_USAGE'
                      ? 'text-red-600'
                      : ''
                  }`}>
                    {transaction.type === 'TRANSACTION_TYPE_PURCHASE' ? '+' : ''}
                    {transaction.amount} credits
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Balance: {transaction.balance_after} credits
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {transactions.length > perPage && (
            <div className="flex justify-center gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page * perPage >= transactions.length}
              >
                Next
              </Button>
            </div>
          )}

          {transactions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No transactions yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}