import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProvider, type ProviderHealth } from './hooks/useProvider';
import { Loader2, Server, Activity, Clock } from 'lucide-react';

interface ProviderStatusProps {
  providerId: string;
  showDetailed?: boolean;
}

export default function ProviderStatus({ providerId, showDetailed = false }: ProviderStatusProps) {
  const { getProviderHealth } = useProvider();
  const [health, setHealth] = useState<ProviderHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const health = await getProviderHealth(providerId);
        setHealth(health);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch provider health');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [providerId, getProviderHealth]);

  if (loading) {
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
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!health) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Provider Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(health.status)}`} />
            <span className="font-medium capitalize">{health.status}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            ID: {providerId}
          </span>
        </div>

        {showDetailed && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Circuit Breaker</span>
                </div>
                <p className="text-lg font-medium capitalize">
                  {health.circuit.state.toLowerCase()}
                </p>
                {health.circuit.failure_count > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {health.circuit.failure_count} recent failures
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Latency (p95)</span>
                </div>
                <p className="text-lg font-medium">
                  {health.latency.p95_ms.toFixed(0)}ms
                </p>
                <p className="text-sm text-muted-foreground">
                  {health.latency.sample_count} samples
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  <span>Rate Limit</span>
                </div>
                <p className="text-lg font-medium">
                  {health.rateLimit.remaining_tokens.toFixed(0)} tokens
                </p>
                <p className="text-sm text-muted-foreground">
                  {health.rateLimit.tokens_per_second}/sec
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}