import { useCallback } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProvider } from './hooks/useProvider';
import { Loader2, Server, Zap, DollarSign } from 'lucide-react';
import { Decimal } from 'decimal.js';

interface ProviderSelectorProps {
  model: string;
  onProviderSelect: (providerId: string) => void;
  selectedProvider?: string;
  disabled?: boolean;
}

export default function ProviderSelector({
  model,
  onProviderSelect,
  selectedProvider,
  disabled
}: ProviderSelectorProps) {
  const { orderBook, isLoading, error } = useProvider(model);

  const handleProviderSelect = useCallback((providerId: string) => {
    if (!disabled) {
      onProviderSelect(providerId);
    }
  }, [disabled, onProviderSelect]);

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
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Failed to load providers
        </CardContent>
      </Card>
    );
  }

  if (!orderBook || orderBook.total_asks === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          No providers available
        </CardContent>
      </Card>
    );
  }

  const minPrice = new Decimal(orderBook.min_price);
  const maxPrice = new Decimal(orderBook.max_price);
  const priceRange = maxPrice.minus(minPrice);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Available Providers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {orderBook.depths.map((depth) => {
          if (depth.model !== model) return null;

          return (
            <div key={depth.model} className="space-y-2">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {Array.from({ length: depth.provider_count }).map((_, index) => {
                  const providerId = `${depth.model}_provider_${index}`;
                  const price = minPrice.plus(
                    priceRange.times(index / depth.provider_count)
                  );

                  return (
                    <Button
                      key={providerId}
                      variant={selectedProvider === providerId ? "default" : "outline"}
                      className={`
                        flex items-center justify-between p-4 h-auto
                        ${selectedProvider === providerId ? 'ring-2 ring-primary' : ''}
                      `}
                      onClick={() => handleProviderSelect(providerId)}
                      disabled={disabled}
                    >
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4" />
                        <div className="text-left">
                          <p className="font-medium">Provider {index + 1}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            {price.toFixed(8)} credits/token
                          </div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}