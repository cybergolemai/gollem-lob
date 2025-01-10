# GoLLeM-LOB: GPU Limit Orderbook for LLM Inference

Market maker for LLM inference requests with Pareto-optimal matching on price, latency, and throughput.

## Quick Start

Build Lambda package:
```bash
cd lambda
npm install @grpc/grpc-js @grpc/proto-loader @aws-sdk/client-cloudwatch
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

## API Endpoints

Generate Text:
```bash
curl -X POST https://api.cybergolem.io/api/generate \
  -H "x-max-price: 0.001" \
  -H "x-max-latency: 1000" \
  -d '{
    "model": "gpt4",
    "prompt": "test prompt"
  }'
```

Monitor Order Book:
```bash
curl https://api.cybergolem.io/api/orderbook/status
curl https://api.cybergolem.io/api/provider/circuit?providerId=xyz
curl https://api.cybergolem.io/api/provider/ratelimit?providerId=xyz
curl https://api.cybergolem.io/api/provider/latency?providerId=xyz
```

Register Provider:
```bash
curl -X POST https://api.cybergolem.io/api/provider/status \
  -d '{
    "provider_id": "xyz",
    "model": "gpt4",
    "gpu_type": "a100",
    "price": "0.001",
    "max_latency": 1000,
    "available_tokens": 1000000
  }'
```

## Architecture

1. Client submits bid with price/latency constraints
2. Lambda proxies to Rust gRPC matcher service
3. Matcher queries MemoryDB order book with Pareto-optimal matching
4. Returns best provider match meeting constraints
5. Client streams directly from provider

## Monitoring 

CloudWatch:
- Lambda invocations/errors
- MemoryDB operations/latency
- API Gateway requests

Prometheus/Grafana:
- Order book depth
- Provider latency p95
- Circuit breaker status
- Rate limit utilization 

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