import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, AlertTriangle } from 'lucide-react';
import { useInference } from './hooks/useInference';
import { useCredits } from '@/features/payments/hooks/useCredits';
import { Decimal } from 'decimal.js';

interface CostEstimatorProps {
  promptLength: number;
  selectedModel: string;
}

export default function CostEstimator({
  promptLength,
  selectedModel
}: CostEstimatorProps) {
  const { estimateCost } = useInference();
  const { balance } = useCredits();
  const [estimatedCost, setEstimatedCost] = useState<Decimal>(new Decimal(0));

  useEffect(() => {
    const cost = estimateCost(promptLength, selectedModel);
    setEstimatedCost(cost);
  }, [promptLength, selectedModel, estimateCost]);

  const hasInsufficientCredits = balance && estimatedCost.greaterThan(balance);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Estimated Cost</p>
              <p className="text-2xl font-bold">
                {estimatedCost.toFixed(8)} credits
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-lg font-medium">
              {balance?.toFixed(8) || '0'} credits
            </p>
          </div>
        </div>

        {hasInsufficientCredits && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Insufficient credits. Please purchase more credits to continue.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Cost Breakdown:</p>
          <ul className="list-disc list-inside mt-1">
            <li>Base tokens: {Math.ceil(promptLength / 4)}</li>
            <li>Model multiplier: {selectedModel === 'gpt4' ? '2x' : '1x'}</li>
            <li>Total tokens: {Math.ceil(promptLength / 4)} × {selectedModel === 'gpt4' ? '2' : '1'}</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}