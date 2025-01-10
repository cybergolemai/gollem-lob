use tonic::{transport::Server, Request, Response, Status};
use redis::{Client, Commands, Connection};
use serde::{Deserialize, Serialize};
use rust_decimal::Decimal;
use tokio::sync::mpsc;
use futures::StreamExt;
use tonic::transport::Server;

pub mod matcher {
    tonic::include_proto!("matcher");
}

#[derive(Debug, Serialize, Deserialize)]
struct Ask {
    provider_id: String,
    model: String,
    gpu_type: String,
    price: Decimal,
    max_latency: u32,
    available_tokens: u32
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
            max_price: bid.max_price.parse().map_err(|e| {
                Status::invalid_argument("Invalid price format")
            })?,
            max_latency: bid.max_latency,
            timestamp: chrono::Utc::now().timestamp() as u64
        };

        let asks: Vec<Ask> = conn.zrangebyscore("asks", "-inf", "+inf").map_err(|e| {
            Status::internal("Failed to query order book")
        })?;

        let best_ask = match find_best_match(&internal_bid, &asks) {
            Some(ask) => ask,
            None => return Err(Status::not_found("No matching provider available"))
        };

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
            model: bid.model,
            prompt: bid.prompt,
            max_price: bid.max_price.parse()?,
            max_latency: bid.max_latency,
            timestamp: chrono::Utc::now().timestamp() as u64
        };

        let asks: Vec<Ask> = conn.zrangebyscore("asks", "-inf", "+inf")?;
        let best_ask = find_best_match(&internal_bid, &asks)
            .ok_or_else(|| Status::not_found("No matching provider available"))?;

        let stream = forward_request_stream(best_ask, internal_bid).await?;
        Ok(Response::new(Box::pin(stream)))
    }
}

fn find_best_match(bid: &Bid, asks: &Vec<Ask>) -> Option<Ask> {
    asks.iter()
        .filter(|ask| {
            ask.model == bid.model &&
            ask.price <= bid.max_price &&
            ask.max_latency <= bid.max_latency 
        })
        .min_by_key(|ask| (ask.price, ask.max_latency))
        .cloned()
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

    let service = MatcherService {
        redis: Client::open(redis_url)?,
    };

    let addr = "[::0]:50051".parse()?;
    println!("MatcherService listening on {}", addr);

    Server::builder()
        .add_service(matcher::matcher_service_server::MatcherServiceServer::new(service))
        .serve(addr)
        .await?;

    Ok(())
}
