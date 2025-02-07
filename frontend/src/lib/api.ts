import { Decimal } from 'decimal.js';

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, any>;
  };
}

export interface CreditBalance {
  balance: string;
  formatted: string;
}

export interface PaymentIntent {
  clientSecret: string;
}

export interface OrderBookStatus {
  total_asks: number;
  active_providers: number;
  min_price: string;
  max_price: string;
}

export interface ProviderStatus {
  provider_id: string;
  status: string;
  earned_credits: string;
  pending_payout: string;
}

// API Client Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.cybergolem.io';

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (isJson && data.error) {
      throw new ApiError(data.error.message, data.error.code, data.error.details);
    }
    throw new ApiError(data || response.statusText);
  }

  return data as T;
}

// API Client Class
export class ApiClient {
  private token: string | null = null;

  constructor(private baseUrl: string = API_BASE_URL) {}

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Credit and Payment Methods
  async getCreditBalance(): Promise<CreditBalance> {
    const response = await fetch(`${this.baseUrl}/api/payments/balance`, {
      headers: this.getHeaders(),
    });
    return handleResponse<CreditBalance>(response);
  }

  async createPaymentIntent(amount: number): Promise<PaymentIntent> {
    const response = await fetch(`${this.baseUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        amount,
        currency: 'usd',
      }),
    });
    return handleResponse<PaymentIntent>(response);
  }

  // Inference Methods
  async generateText(params: {
    model: string;
    prompt: string;
    maxPrice?: string;
    maxLatency?: number;
  }): Promise<ApiResponse<any>> {
    const headers = {
      ...this.getHeaders(),
      'x-max-price': params.maxPrice || '0.001',
      'x-max-latency': params.maxLatency?.toString() || '1000',
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: params.model,
        prompt: params.prompt,
      }),
    });
    return handleResponse(response);
  }

  // Order Book Methods
  async getOrderBookStatus(model?: string): Promise<OrderBookStatus> {
    const url = new URL(`${this.baseUrl}/api/orderbook/status`);
    if (model) {
      url.searchParams.append('model', model);
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return handleResponse<OrderBookStatus>(response);
  }

  async getProviderStatus(providerId: string): Promise<ProviderStatus> {
    const url = new URL(`${this.baseUrl}/api/provider/status`);
    url.searchParams.append('providerId', providerId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return handleResponse<ProviderStatus>(response);
  }

  // Circuit Breaker Status
  async getCircuitStatus(providerId: string): Promise<ApiResponse<any>> {
    const url = new URL(`${this.baseUrl}/api/provider/circuit`);
    url.searchParams.append('providerId', providerId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return handleResponse(response);
  }

  // Rate Limit Status
  async getRateLimitStatus(providerId: string): Promise<ApiResponse<any>> {
    const url = new URL(`${this.baseUrl}/api/provider/ratelimit`);
    url.searchParams.append('providerId', providerId);

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return handleResponse(response);
  }

  // Latency Metrics
  async getLatencyMetrics(
    providerId: string,
    timeWindow?: number
  ): Promise<ApiResponse<any>> {
    const url = new URL(`${this.baseUrl}/api/provider/latency`);
    url.searchParams.append('providerId', providerId);
    if (timeWindow) {
      url.searchParams.append('timeWindow', timeWindow.toString());
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    return handleResponse(response);
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export factory function for testing
export const createApiClient = (baseUrl?: string) => new ApiClient(baseUrl);