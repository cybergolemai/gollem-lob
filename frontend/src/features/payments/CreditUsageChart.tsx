import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useCredits } from './hooks/useCredits';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Loader2, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Decimal } from 'decimal.js';

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

type TimeRange = '7d' | '30d' | '90d';

export default function CreditUsageChart() {
  const { getDailyUsage, isTransactionsLoading } = useCredits();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Get range of dates to display
  const getDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    return { start, end };
  };

  // Filter and process data based on selected time range
  const getFilteredData = () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const { start } = getDateRange(days);
    const allData = getDailyUsage();

    // Fill in missing dates with zero usage
    const filledData = [];
    const currentDate = new Date(start);
    
    while (currentDate <= new Date()) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const existingData = allData.find(d => d.date === dateStr);
      
      filledData.push({
        date: dateStr,
        amount: existingData ? existingData.amount : '0',
        // Add running total
        total: existingData ? existingData.amount : '0'
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate running total
    let runningTotal = new Decimal(0);
    return filledData.map(day => {
      runningTotal = runningTotal.plus(new Decimal(day.amount));
      return {
        ...day,
        total: runningTotal.toString()
      };
    });
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-background border rounded-lg shadow-lg p-4">
        <p className="font-medium">{new Date(label).toLocaleDateString()}</p>
        <p className="text-sm text-muted-foreground">
          Daily Usage: {new Decimal(payload[0].value).toFixed(2)} credits
        </p>
        <p className="text-sm text-muted-foreground">
          Total Usage: {new Decimal(payload[1].value).toFixed(2)} credits
        </p>
      </div>
    );
  };

  if (isTransactionsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const data = getFilteredData();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Credit Usage</CardTitle>
            <CardDescription>Daily credit consumption and cumulative usage</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7D
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30D
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90D
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="totalUsage" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                className="text-muted-foreground text-xs"
              />
              <YAxis 
                className="text-muted-foreground text-xs"
                tickFormatter={(value) => new Decimal(value).toFixed(0)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#dailyUsage)"
                name="Daily Usage"
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                fill="url(#totalUsage)"
                name="Total Usage"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4" />
            <p>No usage data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}