// src/orderbook.rs
use redis::{Commands, Connection};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ask {
    pub provider_id: String,
    pub model: String,
    pub gpu_type: String,
    pub price: Decimal,
    pub max_latency: u32,
    pub available_tokens: u32,
    pub last_heartbeat: u64,
}

impl Ask {
    // Pareto dominance check: an ask dominates if it's better in at least one dimension
    // and not worse in any dimension
    fn dominates(&self, other: &Ask) -> bool {
        let price_better = self.price <= other.price;
        let latency_better = self.max_latency <= other.max_latency;
        let tokens_better = self.available_tokens >= other.available_tokens;
        
        (price_better && latency_better && tokens_better) && 
        (self.price < other.price || self.max_latency < other.max_latency || self.available_tokens > other.available_tokens)
    }
}

pub struct OrderBook {
    redis: Connection,
    stale_threshold: u64,
}

impl OrderBook {
    pub fn new(redis: Connection, stale_threshold: u64) -> Self {
        Self { redis, stale_threshold }
    }

    // Add or update ask in order book
    pub fn add_ask(&mut self, ask: Ask) -> redis::RedisResult<()> {
        let key = format!("ask:{}:{}", ask.provider_id, ask.model);
        let serialized = serde_json::to_string(&ask).unwrap();
        self.redis.set(key, serialized)?;
        
        // Update sorted sets for efficient querying
        self.redis.zadd(
            format!("price:{}:{}", ask.model, ask.gpu_type),
            ask.provider_id,
            ask.price.to_string()
        )?;
        
        self.redis.zadd(
            format!("latency:{}:{}", ask.model, ask.gpu_type),
            ask.provider_id,
            ask.max_latency
        )
    }

    // Remove stale asks based on heartbeat
    pub fn remove_stale(&mut self) -> redis::RedisResult<u32> {
        let now = chrono::Utc::now().timestamp() as u64;
        let mut removed = 0;

        // Scan all asks
        let keys: Vec<String> = self.redis.keys("ask:*")?;
        for key in keys {
            let ask: Ask = match self.redis.get(&key) {
                Ok(data) => serde_json::from_str(&data).unwrap(),
                Err(_) => continue,
            };

            if now - ask.last_heartbeat > self.stale_threshold {
                self.redis.del(&key)?;
                
                // Remove from sorted sets
                self.redis.zrem(
                    format!("price:{}:{}", ask.model, ask.gpu_type),
                    ask.provider_id
                )?;
                
                self.redis.zrem(
                    format!("latency:{}:{}", ask.model, ask.gpu_type),
                    ask.provider_id
                )?;

                removed += 1;
            }
        }

        Ok(removed)
    }

    // Find Pareto-optimal matches for a bid
    pub fn find_matches(&mut self, bid: &Bid) -> redis::RedisResult<Vec<Ask>> {
        // Get all valid asks for model
        let asks: Vec<Ask> = self.redis.keys("ask:*")
            .iter()
            .filter_map(|key| {
                let ask: Ask = self.redis.get(key).ok()?;
                if ask.model == bid.model && 
                   ask.price <= bid.max_price &&
                   ask.max_latency <= bid.max_latency {
                    Some(ask)
                } else {
                    None
                }
            })
            .collect();

        // Find Pareto frontier
        let mut frontier = Vec::new();
        for ask in asks {
            if !frontier.iter().any(|f: &Ask| f.dominates(&ask)) {
                frontier.retain(|f| !ask.dominates(f));
                frontier.push(ask);
            }
        }

        // Sort by price as primary key
        frontier.sort_by(|a, b| a.price.cmp(&b.price));
        
        Ok(frontier)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use redis::Client;

    fn setup() -> OrderBook {
        let client = Client::open("redis://127.0.0.1/").unwrap();
        let conn = client.get_connection().unwrap();
        OrderBook::new(conn, 60)
    }

    #[test]
    fn test_pareto_dominance() {
        let ask1 = Ask {
            provider_id: "p1".into(),
            model: "gpt4".into(),
            gpu_type: "a100".into(),
            price: Decimal::from_str("0.001").unwrap(),
            max_latency: 100,
            available_tokens: 1000,
            last_heartbeat: 123,
        };

        let ask2 = Ask {
            provider_id: "p2".into(),
            model: "gpt4".into(),
            gpu_type: "a100".into(),
            price: Decimal::from_str("0.002").unwrap(),
            max_latency: 200,
            available_tokens: 500,
            last_heartbeat: 123,
        };

        assert!(ask1.dominates(&ask2));
        assert!(!ask2.dominates(&ask1));
    }
}
