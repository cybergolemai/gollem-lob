import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, Activity, Cpu } from 'lucide-react';
import { api } from '@/lib/api';
import type { OrderBookStatus, Transaction } from '@/types/api';
import { Decimal } from 'decimal.js';

export default function Dashboard() {
  const [balance, setBalance] = useState<string>('0');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch balance
        const balanceData = await api.getCreditBalance();
        setBalance(balanceData.balance);

        // Fetch order book status
        const orderBookData = await api.getOrderBookStatus();
        setOrderBook(orderBookData);

        // Get recent transactions
        const historyData = await api.getTransactionHistory();
        setTransactions(historyData.transactions);
      } catch (err) {
        setError('Failed to load dashboard data. Please try again later.');
        console.error('Dashboard data fetch error:', err);
      }
    };

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, []);

  // Process transaction data for the chart
  const chartData = transactions.slice().reverse().map(tx => ({
    date: new Date(tx.timestamp * 1000).toLocaleDateString(),
    balance: new Decimal(tx.balance_after).toNumber()
  }));

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Credit Balance Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Decimal(balance).toFixed(8)} credits
            </div>
          </CardContent>
        </Card>

        {/* Active Providers Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orderBook?.active_providers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Min Price: {orderBook?.min_price || 'N/A'} credits
            </p>
          </CardContent>
        </Card>

        {/* Transaction Count Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance History Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Balance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.transaction_id}
                className="flex items-center justify-between border-b last:border-0 pb-4 last:pb-0"
              >
                <div>
                  <p className="font-medium">
                    {tx.type.replace('TRANSACTION_TYPE_', '').toLowerCase()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(tx.timestamp * 1000).toLocaleString()}
                  </p>
                </div>
                <div className={`text-right ${tx.amount.startsWith('-') ? 'text-destructive' : 'text-green-600'}`}>
                  {new Decimal(tx.amount).toFixed(8)} credits
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}