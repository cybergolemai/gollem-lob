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