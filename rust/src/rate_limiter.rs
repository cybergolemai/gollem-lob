// src/rate_limiter.rs
use std::{
    collections::HashMap,
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::sync::RwLock;

pub struct TokenBucket {
    tokens: f64,
    last_update: Instant,
    capacity: f64,
    fill_rate: f64,
}

impl TokenBucket {
    fn new(capacity: f64, fill_rate: f64) -> Self {
        Self {
            tokens: capacity,
            last_update: Instant::now(),
            capacity,
            fill_rate,
        }
    }

    fn try_consume(&mut self, tokens: f64) -> bool {
        self.refill();
        if self.tokens >= tokens {
            self.tokens -= tokens;
            true
        } else {
            false
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_update).as_secs_f64();
        self.tokens = (self.tokens + elapsed * self.fill_rate).min(self.capacity);
        self.last_update = now;
    }
}

pub struct RateLimiter {
    buckets: Arc<RwLock<HashMap<String, TokenBucket>>>,
    capacity: f64,
    fill_rate: f64,
}

impl RateLimiter {
    pub fn new(capacity: f64, fill_rate: f64) -> Self {
        Self {
            buckets: Arc::new(RwLock::new(HashMap::new())),
            capacity,
            fill_rate,
        }
    }

    pub async fn try_acquire(&self, key: &str, tokens: f64) -> bool {
        let mut buckets = self.buckets.write().await;
        let bucket = buckets.entry(key.to_string()).or_insert_with(|| {
            TokenBucket::new(self.capacity, self.fill_rate)
        });
        bucket.try_consume(tokens)
    }
}

// Add to main.rs:
pub struct MatcherService {
    redis: Client,
    circuit_breaker: CircuitBreaker,
    rate_limiter: RateLimiter,
}

impl MatcherService {
    pub fn new(redis: Client) -> Self {
        Self {
            redis,
            circuit_breaker: CircuitBreaker::new(3, Duration::from_secs(30), Duration::from_secs(5)),
            rate_limiter: RateLimiter::new(100.0, 10.0), // 100 requests per minute
        }
    }
}