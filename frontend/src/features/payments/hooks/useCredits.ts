import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Decimal } from 'decimal.js';
import type { Transaction } from '@/types/api';

export function useCredits() {
  const queryClient = useQueryClient();

  const { data: balance, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: async () => {
      const response = await api.getCreditBalance();
      return new Decimal(response.balance);
    },
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery({
    queryKey: ['credits', 'transactions'],
    queryFn: async () => {
      const response = await fetch('/api/payments/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      return data.transactions as Transaction[];
    }
  });

  const { mutateAsync: purchaseCredits } = useMutation({
    mutationFn: async (amount: number) => {
      const response = await api.createPaymentIntent(amount);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['credits']);
    }
  });

  // Calculate daily credit usage
  const getDailyUsage = () => {
    const dailyUsage = new Map<string, Decimal>();
    
    transactions.forEach(tx => {
      if (tx.type === 'TRANSACTION_TYPE_USAGE') {
        const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
        const current = dailyUsage.get(date) || new Decimal(0);
        dailyUsage.set(date, current.plus(new Decimal(tx.amount).abs()));
      }
    });

    return Array.from(dailyUsage.entries())
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, amount]) => ({
        date,
        amount: amount.toString()
      }));
  };

  // Get total credits spent
  const getTotalSpent = () => {
    return transactions
      .filter(tx => tx.type === 'TRANSACTION_TYPE_USAGE')
      .reduce((acc, tx) => acc.plus(new Decimal(tx.amount).abs()), new Decimal(0));
  };

  // Get remaining credits
  const getRemainingCredits = () => {
    return balance || new Decimal(0);
  };

  // Check if balance is low (less than 100 credits)
  const isBalanceLow = () => {
    return (balance || new Decimal(0)).lessThan(100);
  };

  return {
    balance,
    isBalanceLoading,
    transactions,
    isTransactionsLoading,
    purchaseCredits,
    getDailyUsage,
    getTotalSpent,
    getRemainingCredits,
    isBalanceLow
  };
}