// Common Types
export type ErrorCode = 
  | 'ERROR_UNSPECIFIED'
  | 'ERROR_INSUFFICIENT_CREDITS'
  | 'ERROR_PROVIDER_UNAVAILABLE'
  | 'ERROR_RATE_LIMITED'
  | 'ERROR_CIRCUIT_OPEN'
  | 'ERROR_INVALID_REQUEST'
  | 'ERROR_PAYMENT_FAILED'
  | 'ERROR_CREDIT_SYSTEM_ERROR';

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Payment and Credit Types
export type PaymentStatus = 
  | 'PAYMENT_STATUS_UNSPECIFIED'
  | 'PAYMENT_STATUS_SUCCEEDED'
  | 'PAYMENT_STATUS_INSUFFICIENT_CREDITS'
  | 'PAYMENT_STATUS_FAILED'
  | 'PAYMENT_STATUS_PENDING'
  | 'PAYMENT_STATUS_REFUNDED';

export interface CreditBalance {
  balance: string;           // Decimal string
  pending_credits: string;   // Decimal string
  reserved_credits: string;  // Decimal string
  last_updated: number;      // Unix timestamp
  balance_verified: boolean;
}

export interface PaymentIntent {
  client_secret: string;
  amount: string;           // Decimal string
  currency: string;
  metadata?: Record<string, string>;
}

export type TransactionType = 
  | 'TRANSACTION_TYPE_PURCHASE'
  | 'TRANSACTION_TYPE_USAGE'
  | 'TRANSACTION_TYPE_REFUND'
  | 'TRANSACTION_TYPE_ADJUSTMENT'
  | 'TRANSACTION_TYPE_PROVIDER_PAYOUT';

export interface Transaction {
  transaction_id: string;
  user_id: string;
  amount: string;          // Decimal string
  balance_after: string;   // Decimal string
  provider_id?: string;
  timestamp: number;       // Unix timestamp
  type: TransactionType;
  metadata?: Record<string, string>;
  payment_status: PaymentStatus;
}

// Inference Types
export interface GenerationRequest {
  model: string;
  prompt: string;
  max_price?: string;     // Decimal string
  max_latency?: number;   // Milliseconds
}

export interface GenerationResponse {
  provider_id: string;
  status: string;
  credits_used: string;    // Decimal string
  credits_remaining: string; // Decimal string
  transaction_id: string;
  payment_status: PaymentStatus;
  failure_reason?: string;
}

export interface StreamResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  credits_used: string;    // Decimal string
  payment_status: PaymentStatus;
  metadata?: Record<string, string>;
}

// Order Book Types
export interface Ask {
  provider_id: string;
  model: string;
  gpu_type: string;
  price: string;          // Decimal string
  max_latency: number;    // Milliseconds
  available_tokens: number;
  credit_rate: string;    // Decimal string
  last_heartbeat: number; // Unix timestamp
  capabilities?: Record<string, string>;
}

export interface ModelDepth {
  model: string;
  ask_count: number;
  provider_count: number;
  gpu_distribution: Record<string, number>;
}

export interface OrderBookStatus {
  total_asks: number;
  active_providers: number;
  depths: ModelDepth[];
  last_match_timestamp: number;
  min_price: string;      // Decimal string
  max_price: string;      // Decimal string
  min_credit_rate: string; // Decimal string
  max_credit_rate: string; // Decimal string
  available_models: string[];
  available_gpu_types: string[];
}

// Provider Types
export interface ProviderStatus {
  provider_id: string;
  model: string;
  gpu_type: string;
  price: string;         // Decimal string
  max_latency: number;   // Milliseconds
  available_tokens: number;
  credit_rate: string;   // Decimal string
  capabilities?: Record<string, string>;
}

export interface ProviderStatusResponse {
  status: string;
  earned_credits: string; // Decimal string
  pending_payout: string; // Decimal string
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitStatus {
  provider_id: string;
  state: CircuitState;
  failure_count: number;
  last_failure_timestamp: number;
  reset_timestamp: number;
}

export interface RateLimitStatus {
  provider_id: string;
  remaining_tokens: string;    // Decimal string
  tokens_per_second: string;   // Decimal string
  reset_timestamp: number;
  is_limited: boolean;
}

export interface LatencyMetrics {
  provider_id: string;
  p50_ms: string;          // Decimal string
  p95_ms: string;          // Decimal string
  p99_ms: string;          // Decimal string
  sample_count: number;
  window_start_timestamp: number;
  window_end_timestamp: number;
}