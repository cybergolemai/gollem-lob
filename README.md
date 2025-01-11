# GoLLeM-LOB: GPU Limit Orderbook for LLM Inference

Market maker for LLM inference requests with Pareto-optimal matching on price, latency, and throughput, featuring a secure credit-based payment system.

## Quick Start

Build Lambda package:
```bash
cd lambda
npm install @grpc/grpc-js @grpc/proto-loader @aws-sdk/client-cloudwatch @aws-sdk/client-dynamodb @aws-sdk/client-secrets-manager decimal.js stripe
cp ../rust/proto/matcher.proto .
zip -r ../lambda.zip index.js matcher.proto node_modules package.json
```

Deploy infrastructure:
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
cd terraform
terraform init
terraform apply
```

## Credit System

The platform uses a credit-based system for all transactions:

- Credits are purchased in advance using Stripe
- All prices and balances maintain 8 decimal precision
- Credits are deducted at time of inference
- Providers accumulate credits for payouts
- System uses DynamoDB for transaction ledger

### Credit Pricing

Credits are calculated based on:
- Base rate: 1 credit = $0.001 USD
- Model multiplier: GPT-4 = 2x, GPT-3 = 1x
- GPU multiplier: H100 = 2x, A100 = 1.5x
- Token length: 1 credit per 4 tokens (base rate)

## API Endpoints

### Generate Text:
```bash
curl -X POST https://api.cybergolem.io/api/generate \
  -H "x-max-price: 0.001" \
  -H "x-max-latency: 1000" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d '{
    "model": "gpt4",
    "prompt": "test prompt"
  }'
```

### Monitor Order Book:
```bash
curl https://api.cybergolem.io/api/orderbook/status
curl https://api.cybergolem.io/api/provider/circuit?providerId=xyz
curl https://api.cybergolem.io/api/provider/ratelimit?providerId=xyz
curl https://api.cybergolem.io/api/provider/latency?providerId=xyz
```

### Payment Operations:
```bash
# Purchase credits
curl -X POST https://api.cybergolem.io/api/payments/create-intent \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -d '{
    "amount": 10.00,
    "currency": "usd"
  }'

# Check balance
curl -X GET https://api.cybergolem.io/api/payments/balance \
  -H "Authorization: Bearer ${USER_TOKEN}"

# View transaction history
curl -X GET https://api.cybergolem.io/api/payments/transactions \
  -H "Authorization: Bearer ${USER_TOKEN}"
```

### Register Provider:
```bash
curl -X POST https://api.cybergolem.io/api/provider/status \
  -d '{
    "provider_id": "xyz",
    "model": "gpt4",
    "gpu_type": "a100",
    "price": "0.001",
    "max_latency": 1000,
    "available_tokens": 1000000,
    "credit_rate": "0.00000150"
  }'
```

## Architecture

1. Client submits bid with price/latency constraints
2. System verifies available credits
3. Lambda proxies to Rust gRPC matcher service
4. Matcher queries MemoryDB order book with Pareto-optimal matching
5. Credits are atomically deducted upon match
6. Returns best provider match meeting constraints
7. Client streams directly from provider
8. Provider accumulates credits for payout

## Provider Payouts

Providers can receive payments through:
1. Automatic Stripe payouts when threshold reached ($100)
2. Manual payout requests through dashboard
3. Scheduled monthly settlements

Payout Process:
1. Credits are converted to USD at current rate
2. Stripe Connect handles provider verification
3. System maintains audit trail of all payouts
4. Real-time balance tracking in DynamoDB

## Monitoring 

CloudWatch:
- Lambda invocations/errors
- MemoryDB operations/latency
- API Gateway requests
- Credit balance alerts
- Payment processing status

Prometheus/Grafana:
- Order book depth
- Provider latency p95
- Circuit breaker status
- Rate limit utilization
- Credit usage metrics
- Payment success rates

## Limitations

System:
- Single region deployment
- No high availability for matcher service
- No redundancy for MemoryDB
- Centralized matching bottleneck

Security:
- Basic provider health checks
- No provider authentication
- No rate limiting per client
- No bid/ask validation

Financial:
- Minimum credit purchase: $1.00
- Maximum credit purchase: $1,000.00 per transaction
- Provider minimum payout: $100.00
- Settlement period: 30 days max

## Provider Integration

1. Install provider agent:
```bash
cd provider
pip install -r requirements.txt
```

2. Run monitoring service:
```bash
export REDIS_URL="redis://your-memorydb-endpoint:6379"
python monitor.py --provider-id xyz --ask-price 0.001
```

Agent publishes:
- GPU utilization
- VRAM availability
- Model serving latency
- Credit accumulation
- Payout eligibility

## Security Considerations

Payment Security:
- All payment processing handled by Stripe
- No credit card data touches our servers
- Secure webhook validation
- Atomic credit transactions
- Full audit trail in DynamoDB

Credit System Security:
- 8 decimal precision for all calculations
- Double-entry bookkeeping
- Automatic reconciliation
- Transaction logs for all operations
- Balance monitoring and alerts