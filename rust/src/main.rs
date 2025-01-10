use tonic::{transport::Server, Request, Response, Status};
use redis::{Client, Commands, Connection};
use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use tokio::sync::mpsc;
use futures::StreamExt;

pub mod matcher {
    tonic::include_proto!("matcher");
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Ask {
    provider_id: String,
    model: String,
    gpu_type: String,
    price: Decimal,
    max_latency: u32,
    available_tokens: u32,
    last_heartbeat: u64
}

#[derive(Debug, Serialize, Deserialize)]
struct Bid {
    model: String,
    prompt: String, 
    max_price: Decimal,
    max_latency: u32,
    timestamp: u64
}

#[derive(Debug)]
struct MatcherService {
    redis: Client,
    stale_threshold: u64,
}

impl MatcherService {
    fn new(redis: Client) -> Self {
        Self {
            redis,
            stale_threshold: 120, // 2 minutes
        }
    }
}

#[tonic::async_trait]
impl matcher::matcher_service_server::MatcherService for MatcherService {
    type SubmitBidStreamStream = futures::stream::BoxStream<'static, Result<matcher::StreamResponse, Status>>;
    async fn submit_bid(
        &self,
        request: Request<matcher::BidRequest>
    ) -> Result<Response<matcher::BidResponse>, Status> {
        let bid = request.into_inner().bid;
        let mut conn = self.redis.get_connection().map_err(|e| {
            Status::internal(format!("Redis connection failed: {}", e))
        })?;

        let internal_bid = Bid {
            model: bid.model,
            prompt: bid.prompt,
            max_price: bid.max_price.parse().map_err(|_| {
                Status::invalid_argument("Invalid price format")
            })?,
            max_latency: bid.max_latency,
            timestamp: chrono::Utc::now().timestamp() as u64
        };

        let best_ask = self.find_best_match(&mut conn, &internal_bid)
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("No matching provider available"))?;

        Ok(Response::new(matcher::BidResponse {
            provider_id: best_ask.provider_id,
            status: "matched".to_string()
        }))
    }

    type SubmitBidStreamStream = futures::stream::BoxStream<'static, Result<matcher::StreamResponse, Status>>;

    async fn submit_bid_stream(
        &self,
        request: Request<matcher::BidRequest>
    ) -> Result<Response<Self::SubmitBidStreamStream>, Status> {
        let bid = request.into_inner().bid;
        let mut conn = self.redis.get_connection().map_err(|e| {
            Status::internal(format!("Redis connection failed: {}", e))
        })?;

        let internal_bid = Bid {
            model: bid.model.clone(),
            prompt: bid.prompt,
            max_price: bid.max_price.parse()?,
            max_latency: bid.max_latency,
            timestamp: chrono::Utc::now().timestamp() as u64
        };

        let best_ask = self.find_best_match(&mut conn, &internal_bid)
            .map_err(|e| Status::internal(e.to_string()))?
            .ok_or_else(|| Status::not_found("No matching provider available"))?;

        let stream = forward_request_stream(best_ask, internal_bid).await?;
        Ok(Response::new(Box::pin(stream)))
    }

    async fn get_order_book_status(
        &self,
        request: Request<matcher::OrderBookRequest>
    ) -> Result<Response<matcher::OrderBookStatus>, Status> {
        let mut conn = self.redis.get_connection().map_err(|e| {
            Status::internal(format!("Redis connection failed: {}", e))
        })?;

        let model = request.into_inner().model;
        let pattern = match model.as_str() {
            "" => "ask:*".to_string(),
            m => format!("ask:*:{}", m)
        };

        let keys: Vec<String> = conn.keys(&pattern)?;
        let now = chrono::Utc::now().timestamp() as u64;
        
        let mut active_providers = std::collections::HashSet::new();
        let mut model_depths = std::collections::HashMap::new();
        let mut min_price = rust_decimal::Decimal::MAX;
        let mut max_price = rust_decimal::Decimal::MIN;

        for key in keys {
            if let Ok(ask_data) = conn.get::<_, String>(&key) {
                if let Ok(ask) = serde_json::from_str::<Ask>(&ask_data) {
                    if now - ask.last_heartbeat <= self.stale_threshold {
                        active_providers.insert(ask.provider_id.clone());
                        
                        let depth = model_depths.entry(ask.model.clone())
                            .or_insert_with(|| matcher::ModelDepth {
                                model: ask.model.clone(),
                                ask_count: 0,
                                provider_count: 0,
                            });
                        
                        depth.ask_count += 1;
                        min_price = min_price.min(ask.price);
                        max_price = max_price.max(ask.price);
                    }
                }
            }
        }

        // Update provider counts
        for depth in model_depths.values_mut() {
            depth.provider_count = active_providers.iter()
                .filter(|p| keys.iter().any(|k| k.contains(p)))
                .count() as u32;
        }

        Ok(Response::new(matcher::OrderBookStatus {
            total_asks: keys.len() as u32,
            active_providers: active_providers.len() as u32,
            depths: model_depths.into_values().collect(),
            last_match_timestamp: now,
            min_price: min_price.to_string(),
            max_price: max_price.to_string(),
        }))
    }

    async fn get_circuit_status(
        &self,
        request: Request<matcher::CircuitStatusRequest>
    ) -> Result<Response<matcher::CircuitStatus>, Status> {
        let provider_id = request.into_inner().provider_id;
        let providers = self.circuit_breaker.get_status(&provider_id).await;

        Ok(Response::new(matcher::CircuitStatus {
            provider_id: provider_id.clone(),
            state: providers.state as i32,
            failure_count: providers.failures,
            last_failure_timestamp: providers.last_failure.elapsed().as_secs(),
            reset_timestamp: providers.reset_after.elapsed().as_secs(),
        }))
    }

    async fn get_rate_limit_status(
        &self,
        request: Request<matcher::RateLimitRequest>
    ) -> Result<Response<matcher::RateLimitStatus>, Status> {
        let provider_id = request.into_inner().provider_id;
        let status = self.rate_limiter.get_status(&provider_id).await;

        Ok(Response::new(matcher::RateLimitStatus {
            provider_id,
            remaining_tokens: status.remaining_tokens,
            tokens_per_second: status.tokens_per_second,
            reset_timestamp: status.reset_at.elapsed().as_secs(),
            is_limited: status.is_limited,
        }))
    }

    async fn get_latency_metrics(
        &self,
        request: Request<matcher::LatencyRequest>
    ) -> Result<Response<matcher::LatencyMetrics>, Status> {
        let req = request.into_inner();
        let metrics = self.latency_router.get_metrics(
            &req.provider_id,
            Duration::from_secs(req.time_window_secs)
        ).await;

        Ok(Response::new(matcher::LatencyMetrics {
            provider_id: req.provider_id,
            p50_ms: metrics.p50.as_millis() as f64,
            p95_ms: metrics.p95.as_millis() as f64,
            p99_ms: metrics.p99.as_millis() as f64,
            sample_count: metrics.samples,
            window_start_timestamp: metrics.window_start.timestamp() as u64,
            window_end_timestamp: metrics.window_end.timestamp() as u64,
        }))
    }

    async fn update_provider_status(
        &self,
        request: Request<matcher::ProviderStatusRequest>
    ) -> Result<Response<matcher::ProviderStatusResponse>, Status> {
        let status = request.into_inner();
        let mut conn = self.redis.get_connection().map_err(|e| {
            Status::internal(format!("Redis connection failed: {}", e))
        })?;

        let ask = Ask {
            provider_id: status.provider_id,
            model: status.model,
            gpu_type: status.gpu_type,
            price: status.price.parse().map_err(|_| {
                Status::invalid_argument("Invalid price format")
            })?,
            max_latency: status.max_latency,
            available_tokens: status.available_tokens,
            last_heartbeat: chrono::Utc::now().timestamp() as u64
        };

        self.update_ask(&mut conn, &ask).map_err(|e| {
            Status::internal(format!("Failed to update orderbook: {}", e))
        })?;

        Ok(Response::new(matcher::ProviderStatusResponse {
            status: "updated".to_string()
        }))
    }
}

impl MatcherService {
    fn update_ask(&self, conn: &mut Connection, ask: &Ask) -> redis::RedisResult<()> {
        // Store full ask data
        let key = format!("ask:{}:{}", ask.provider_id, ask.model);
        conn.set(&key, serde_json::to_string(ask).unwrap())?;

        // Update sorted sets for efficient querying
        conn.zadd(
            format!("price:{}:{}", ask.model, ask.gpu_type),
            &ask.provider_id,
            ask.price.to_string()
        )?;

        conn.zadd(
            format!("latency:{}:{}", ask.model, ask.gpu_type),
            &ask.provider_id,
            ask.max_latency
        )
    }

    fn find_best_match(&self, conn: &mut Connection, bid: &Bid) -> redis::RedisResult<Option<Ask>> {
        let now = chrono::Utc::now().timestamp() as u64;
        
        // Get asks sorted by price
        let asks: Vec<String> = conn.zrangebyscore(
            format!("price:{}:*", bid.model),
            "-inf",
            bid.max_price.to_string()
        )?;

        // Filter and find best match
        let mut valid_asks: Vec<Ask> = Vec::new();
        for provider_id in asks {
            let key = format!("ask:{}:{}", provider_id, bid.model);
            if let Ok(ask_data) = conn.get::<_, String>(&key) {
                if let Ok(ask) = serde_json::from_str::<Ask>(&ask_data) {
                    if ask.max_latency <= bid.max_latency 
                        && now - ask.last_heartbeat <= self.stale_threshold {
                        valid_asks.push(ask);
                    }
                }
            }
        }

        Ok(valid_asks.into_iter()
            .min_by_key(|ask| (ask.price, ask.max_latency))
            .cloned())
    }
}

async fn forward_request_stream(
    ask: Ask,
    bid: Bid,
) -> Result<impl Stream<Item = Result<matcher::StreamResponse, Status>>, Status> {
    let client = reqwest::Client::new();
    
    let request_body = serde_json::json!({
        "model": bid.model,
        "prompt": bid.prompt
    });

    let response = client
        .post(&ask.provider_id)
        .json(&request_body)
        .send()
        .await
        .map_err(|e| Status::internal(format!("Provider request failed: {}", e)))?;

    let stream = response
        .bytes_stream()
        .map_err(|e| Status::internal(format!("Stream error: {}", e)))
        .and_then(|chunk| async move {
            let chunk_str = std::str::from_utf8(&chunk)
                .map_err(|e| Status::internal(format!("UTF-8 decode error: {}", e)))?;
            
            let response: serde_json::Value = serde_json::from_str(chunk_str)
                .map_err(|e| Status::internal(format!("JSON parse error: {}", e)))?;

            Ok(matcher::StreamResponse {
                model: response["model"].as_str().unwrap_or_default().to_string(),
                created_at: response["created_at"].as_str().unwrap_or_default().to_string(),
                response: response["response"].as_str().unwrap_or_default().to_string(),
                done: response["done"].as_bool().unwrap_or(false),
                done_reason: response.get("done_reason").and_then(|r| r.as_str()).map(String::from)
            })
        })
        .boxed();

    Ok(stream)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let redis_url = std::env::var("REDIS_URL")
        .unwrap_or_else(|_| "redis://localhost:6379".to_string());

    let service = MatcherService::new(Client::open(redis_url)?);

    let addr = "[::0]:50051".parse()?;
    println!("MatcherService listening on {}", addr);

    Server::builder()
        .add_service(matcher::matcher_service_server::MatcherServiceServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}