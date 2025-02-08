use redis::{Commands, Connection, RedisError};
use rust_decimal::prelude::*;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::time::{SystemTime, UNIX_EPOCH};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreditTransaction {
    pub user_id: String,
    pub amount: Decimal,
    pub balance_after: Decimal,
    pub provider_id: String,
    pub timestamp: u64,
    pub transaction_type: String,
}

impl Ask {
    fn dominates(&self, other: &Ask) -> bool {
        let price_better = self.price <= other.price;
        let latency_better = self.max_latency <= other.max_latency;
        let tokens_better = self.available_tokens >= other.available_tokens;
        
        (price_better && latency_better && tokens_better) && 
        (self.price < other.price || self.max_latency < other.max_latency || self.available_tokens > other.available_tokens)
    }

    fn calculate_credit_cost(&self, prompt_length: usize) -> Decimal {
        // Base cost calculation using prompt length
        let base_cost = Decimal::from(prompt_length).div(Decimal::from(4));
        
        // Adjust cost based on model type and GPU
        let model_multiplier = match self.model.as_str() {
            "gpt4" => Decimal::from(2),
            "gpt3" => Decimal::from(1),
            _ => Decimal::ONE,
        };

        let gpu_multiplier = match self.gpu_type.as_str() {
            "a100" => Decimal::from_str("1.5").unwrap(),
            "h100" => Decimal::from_str("2.0").unwrap(),
            _ => Decimal::ONE,
        };

        // Calculate final cost with 8 decimal precision
        base_cost
            .mul(model_multiplier)
            .mul(gpu_multiplier)
            .round_dp_with_strategy(8, RoundingStrategy::ToZero)
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

    pub fn add_ask(&mut self, ask: Ask) -> redis::RedisResult<()> {
        let key = format!("ask:{}:{}", ask.provider_id, ask.model);
        let serialized = serde_json::to_string(&ask).unwrap();
        self.redis.set(&key, serialized)?;
        
        self.redis.zadd(
            format!("price:{}:{}", ask.model, ask.gpu_type),
            &ask.provider_id,
            ask.price.to_string()
        )?;
        
        self.redis.zadd(
            format!("latency:{}:{}", ask.model, ask.gpu_type),
            &ask.provider_id,
            ask.max_latency
        )
    }

    pub async fn verify_credits(
        &mut self,
        user_id: &str,
        required_credits: Decimal
    ) -> redis::RedisResult<bool> {
        let balance = self.get_credit_balance(user_id)?;
        Ok(balance >= required_credits)
    }

    fn get_credit_balance(&mut self, user_id: &str) -> redis::RedisResult<Decimal> {
        let balance_key = format!("credit:balance:{}", user_id);
        let balance: Option<String> = self.redis.get(&balance_key)?;
        
        Ok(match balance {
            Some(b) => Decimal::from_str(&b).unwrap_or(Decimal::ZERO),
            None => Decimal::ZERO,
        })
    }

    pub async fn deduct_credits(
        &mut self,
        user_id: &str,
        amount: Decimal,
        provider_id: &str,
    ) -> redis::RedisResult<()> {
        let balance_key = format!("credit:balance:{}", user_id);
        let current_balance = self.get_credit_balance(user_id)?;
        
        let new_balance = (current_balance - amount)
            .round_dp_with_strategy(8, RoundingStrategy::ToZero);

        if new_balance < Decimal::ZERO {
            return Err(RedisError::from((
                redis::ErrorKind::ResponseError,
                "Insufficient credits"
            )));
        }

        let transaction = CreditTransaction {
            user_id: user_id.to_string(),
            amount,
            balance_after: new_balance,
            provider_id: provider_id.to_string(),
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs(),
            transaction_type: "inference_usage".to_string(),
        };

        // Atomic transaction
        redis::pipe()
            .atomic()
            .set(&balance_key, new_balance.to_string())
            .rpush(
                format!("credit:transactions:{}", user_id),
                serde_json::to_string(&transaction).unwrap()
            )
            .query(&mut self.redis)?;

        Ok(())
    }

    pub fn remove_stale(&mut self) -> redis::RedisResult<u32> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
            
        let mut removed = 0;

        let keys: Vec<String> = self.redis.keys("ask:*")?;
        for key in keys {
            let ask: Ask = match self.redis.get(&key) {
                Ok(data) => serde_json::from_str(&data).unwrap(),
                Err(_) => continue,
            };

            if now - ask.last_heartbeat > self.stale_threshold {
                self.redis.del(&key)?;
                
                self.redis.zrem(
                    format!("price:{}:{}", ask.model, ask.gpu_type),
                    &ask.provider_id
                )?;
                
                self.redis.zrem(
                    format!("latency:{}:{}", ask.model, ask.gpu_type),
                    &ask.provider_id
                )?;

                removed += 1;
            }
        }

        Ok(removed)
    }

    pub async fn find_matches_with_credits(
        &mut self,
        bid: &Bid,
        prompt_length: usize,
    ) -> redis::RedisResult<Vec<(Ask, Decimal)>> {
        let asks: Vec<Ask> = self.redis.keys("ask:*")?
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

        let mut frontier = Vec::new();
        for ask in asks {
            let credit_cost = ask.calculate_credit_cost(prompt_length);
            
            if !frontier.iter().any(|(f, _)| f.dominates(&ask)) {
                frontier.retain(|(f, _)| !ask.dominates(f));
                frontier.push((ask, credit_cost));
            }
        }

        // Sort by credit cost as primary key
        frontier.sort_by(|a, b| a.1.cmp(&b.1));
        
        Ok(frontier)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use redis::Client;
    use rust_decimal_macros::dec;

    fn setup() -> OrderBook {
        let client = Client::open("redis://127.0.0.1/").unwrap();
        let conn = client.get_connection().unwrap();
        OrderBook::new(conn, 60)
    }

    #[test]
    fn test_credit_calculation() {
        let ask = Ask {
            provider_id: "p1".into(),
            model: "gpt4".into(),
            gpu_type: "a100".into(),
            price: dec!(0.001),
            max_latency: 100,
            available_tokens: 1000,
            last_heartbeat: 123,
        };

        let credit_cost = ask.calculate_credit_cost(100);
        assert_eq!(credit_cost, dec!(75.00000000)); // (100/4) * 2 * 1.5
    }

    #[test]
    fn test_pareto_dominance() {
        let ask1 = Ask {
            provider_id: "p1".into(),
            model: "gpt4".into(),
            gpu_type: "a100".into(),
            price: dec!(0.001),
            max_latency: 100,
            available_tokens: 1000,
            last_heartbeat: 123,
        };

        let ask2 = Ask {
            provider_id: "p2".into(),
            model: "gpt4".into(),
            gpu_type: "a100".into(),
            price: dec!(0.002),
            max_latency: 200,
            available_tokens: 500,
            last_heartbeat: 123,
        };

        assert!(ask1.dominates(&ask2));
        assert!(!ask2.dominates(&ask1));
    }
}