import React from 'react';
import { MainLayout } from '@/layouts/MainLayout';
import TransactionList from '@/features/payments/transaction-history/TransactionList';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from "@/components/ui/scroll-area"
import { HistoryIcon } from 'lucide-react';

export default function HistoryPage() {
  return (
    <MainLayout>
      <div className="container space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <HistoryIcon className="h-6 w-6" />
              Transaction History
            </CardTitle>
            <CardDescription>
              Review a detailed history of your credit purchases and usage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea>
              <div className="pb-4">
                <TransactionList />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

// Icon component - you can replace this with lucide-react if you prefer
const HistoryIcon = React.forwardRef<
  React.ForwardRefExoticComponent<any>,
  React.ComponentPropsWithoutRef<React.ForwardRefExoticComponent<any>>
>(({ className, ...props }, ref) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    ref={ref}
    {...props}
  >
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </svg>
));
HistoryIcon.displayName = "HistoryIcon";