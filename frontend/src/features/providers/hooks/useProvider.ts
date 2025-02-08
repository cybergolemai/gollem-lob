import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { 
  ProviderStatus, 
  CircuitStatus, 
  RateLimitStatus, 
  LatencyMetrics,
  OrderBookStatus
} from '@/types/api';

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  circuit: CircuitStatus;
  rateLimit: RateLimitStatus;
  latency: LatencyMetrics;
}

export interface UseProviderReturn {
  providers: ProviderStatus[];
  activeProviders: number;
  orderBook: OrderBookStatus | null;
  getProviderHealth: (providerId: string) => Promise<ProviderHealth>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProvider(model?: string): UseProviderReturn {
  // Fetch order book status
  const { 
    data: orderBook,
    isLoading: isOrderBookLoading,
    error: orderBookError,
    refetch: refetchOrderBook
  } = useQuery({
    queryKey: ['orderbook', model],
    queryFn: () => api.getOrderBookStatus(model),
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  // Fetch provider health data
  const getProviderHealth = async (providerId: string): Promise<ProviderHealth> => {
    const [circuit, rateLimit, latency] = await Promise.all([
      api.getCircuitStatus(providerId),
      api.getRateLimitStatus(providerId),
      api.getLatencyMetrics(providerId)
    ]);

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      circuit.state === 'OPEN' ||
      latency.p95_ms > 2000 || // 2 second latency threshold
      rateLimit.is_limited
    ) {
      status = 'unhealthy';
    } else if (
      circuit.state === 'HALF_OPEN' ||
      latency.p95_ms > 1000 || // 1 second latency threshold
      rateLimit.remaining_tokens < (rateLimit.tokens_per_second * 10) // Less than 10 seconds worth of tokens
    ) {
      status = 'degraded';
    }

    return {
      status,
      circuit,
      rateLimit,
      latency
    };
  };

  const refetch = async () => {
    await refetchOrderBook();
  };

  return {
    providers: orderBook?.depths.flatMap(depth => 
      Array(depth.provider_count).fill({
        model: depth.model,
        provider_count: depth.provider_count,
        // Other provider fields would come from the API
      })
    ) || [],
    activeProviders: orderBook?.active_providers || 0,
    orderBook: orderBook || null,
    getProviderHealth,
    isLoading: isOrderBookLoading,
    error: orderBookError || null,
    refetch
  };
}