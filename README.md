# GoLLeM: GPU Orderbook for LLM Inference

Market maker for LLM inference requests. Routes to lowest-cost GPU provider meeting latency requirements.

## Build Lambda Package

```bash
cd lambda
npm install @grpc/grpc-js @grpc/proto-loader
zip -r ../lambda.zip index.js matcher.proto node_modules package.json
```

## Deploy Infrastructure

1. Configure AWS credentials:
```bash
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
```

2. Deploy with Terraform:
```bash
cd terraform
terraform init
terraform apply
```

3. Add secrets to GitHub:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

## Test API

Get provider match with price/latency constraints:
```bash
curl -X POST https://api.cybergolem.io/api/generate \
  -H "x-max-price: 0.001" \
  -H "x-max-latency: 1000" \
  -d '{
    "model": "hhao/qwen2.5-coder-tools",
    "prompt": "Why is the sky blue?"
  }'
```

Response contains provider endpoint for direct streaming:
```json
{
  "provider_id": "http://provider.example.com",
  "status": "matched"
}
```

Stream from provider:
```bash
curl http://provider.example.com/api/generate \
  -d '{
    "model": "hhao/qwen2.5-coder-tools", 
    "prompt": "Why is the sky blue?"
  }'
```

## Architecture

1. Lambda proxies requests to Rust gRPC service
2. Rust service queries MemoryDB order book
3. Returns best provider match
4. Client streams directly from provider

## Monitoring

Basic CloudWatch metrics included:
- Lambda invocations/errors
- MemoryDB operations
- API Gateway requests

## Limitations

- Single region deployment
- Basic provider health checks
- No redundancy for Rust service
