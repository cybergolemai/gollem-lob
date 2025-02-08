import { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProvider, type ProviderHealth } from './hooks/useProvider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Server, Clock, ZapOff } from 'lucide-react';

interface HealthMetrics {
  timestamp: number;
  latencyP95: number;
  availableProviders: number;
  activeCircuits: number;
  rateLimitedProviders: number;
}

interface HealthStatusProps {
  model?: string;
}

export default function HealthStatus({ model }: HealthStatusProps) {
  const { providers, activeProviders, orderBook, getProviderHealth } = useProvider(model);
  const [healthData, setHealthData] = useState<HealthMetrics[]>([]);
  const [providerHealth, setProviderHealth] = useState<Map<string, ProviderHealth>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch health data for all active providers
  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        setLoading(true);
        const healthMap = new Map<string, ProviderHealth>();
        
        for (const provider of providers) {
          const health = await getProviderHealth(provider.provider_id);
          healthMap.set(provider.provider_id, health);
        }

        setProviderHealth(healthMap);

        // Calculate aggregate metrics
        const metrics: HealthMetrics = {
          timestamp: Date.now(),
          latencyP95: calculateAverageLatency(healthMap),
          availableProviders: activeProviders,
          activeCircuits: countActiveCircuits(healthMap),
          rateLimitedProviders: countRateLimitedProviders(healthMap)
        };

        setHealthData(prev => {
          const newData = [...prev, metrics];
          // Keep last hour of data (360 data points at 10s intervals)
          if (newData.length > 360) {
            return newData.slice(newData.length - 360);
          }
          return newData;
        });

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health data');
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
    const interval = setInterval(fetchHealthData, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [providers, activeProviders, getProviderHealth]);

  const calculateAverageLatency = (healthMap: Map<string, ProviderHealth>) => {
    let total = 0;
    let count = 0;
    for (const health of healthMap.values()) {
      total += health.latency.p95_ms;
      count++;
    }
    return count > 0 ? total / count : 0;
  };

  const countActiveCircuits = (healthMap: Map<string, ProviderHealth>) => {
    return Array.from(healthMap.values())
      .filter(health => health.circuit.state !== 'CLOSED')
      .length;
  };

  const countRateLimitedProviders = (healthMap: Map<string, ProviderHealth>) => {
    return Array.from(healthMap.values())
      .filter(health => health.rateLimit.is_limited)
      .length;
  };

  const getSystemStatus = () => {
    if (activeProviders === 0) return 'critical';
    
    const latencyThreshold = 2000; // 2 seconds
    const avgLatency = calculateAverageLatency(providerHealth);
    const circuitBreakers = countActiveCircuits(providerHealth);
    const rateLimited = countRateLimitedProviders(providerHealth);
    
    if (
      avgLatency > latencyThreshold ||
      circuitBreakers > activeProviders / 2 ||
      rateLimited > activeProviders / 2
    ) {
      return 'degraded';
    }
    
    return 'healthy';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Health
            </div>
            <StatusIndicator status={getSystemStatus()} />
          </CardTitle>
          <CardDescription>
            Real-time health metrics for {model || 'all'} providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Active Providers"
              value={activeProviders}
              icon={Server}
              trend={calculateProviderTrend()}
            />
            <MetricCard
              title="Avg. Latency (p95)"
              value={calculateAverageLatency(providerHealth)}
              unit="ms"
              icon={Clock}
              trend={calculateLatencyTrend()}
            />
            <MetricCard
              title="Circuit Breakers"
              value={countActiveCircuits(providerHealth)}
              icon={ZapOff}
              trend={calculateCircuitTrend()}
              className="text-yellow-500"
            />
            <MetricCard
              title="Rate Limited"
              value={countRateLimitedProviders(providerHealth)}
              icon={Activity}
              trend={calculateRateLimitTrend()}
              className="text-red-500"
            />
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="latencyP95"
                  stroke="#8884d8"
                  name="Latency (p95)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="availableProviders"
                  stroke="#82ca9d"
                  name="Available Providers"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="activeCircuits"
                  stroke="#ffc658"
                  name="Circuit Breakers"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rateLimitedProviders"
                  stroke="#ff7300"
                  name="Rate Limited"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Provider Health Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from(providerHealth.entries()).map(([providerId, health]) => (
          <ProviderHealthCard
            key={providerId}
            providerId={providerId}
            health={health}
          />
        ))}
      </div>
    </div>
  );
}

interface StatusIndicatorProps {
  status: 'healthy' | 'degraded' | 'critical';
}

function StatusIndicator({ status }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${getStatusColor()}`} />
      <span className="font-medium capitalize">{status}</span>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  trend?: number;
  unit?: string;
  className?: string;
}

function MetricCard({ title, value, icon: Icon, trend, unit, className }: MetricCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={`h-4 w-4 ${className}`} />
      </div>
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold">
          {value.toFixed(unit ? 1 : 0)}
          {unit && <span className="text-sm font-normal"> {unit}</span>}
        </p>
        {trend !== undefined && (
          <span
            className={`ml-2 text-sm ${
              trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

interface ProviderHealthCardProps {
  providerId: string;
  health: ProviderHealth;
}

function ProviderHealthCard({ providerId, health }: ProviderHealthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Provider {providerId.split('_').pop()}
          </div>
          <StatusIndicator status={health.status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Circuit State</p>
            <p className="font-medium capitalize">{health.circuit.state.toLowerCase()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Latency (p95)</p>
            <p className="font-medium">{health.latency.p95_ms.toFixed(0)}ms</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Rate Limit</p>
            <p className="font-medium">
              {health.rateLimit.remaining_tokens.toFixed(0)}/{health.rateLimit.tokens_per_second}/s
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Failures</p>
            <p className="font-medium">{health.circuit.failure_count}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}