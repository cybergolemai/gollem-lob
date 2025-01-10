use std::{collections::HashMap, sync::Arc, time::{Duration, Instant}};
use tokio::sync::RwLock;
use rust_decimal::Decimal;

#[derive(Debug)]
struct ProviderHealth {
    failures: u32,
    last_failure: Instant,
    state: CircuitState,
}

#[derive(Debug, PartialEq)]
enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    providers: Arc<RwLock<HashMap<String, ProviderHealth>>>,
    failure_threshold: u32,
    reset_timeout: Duration,
    half_open_timeout: Duration,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, reset_timeout: Duration, half_open_timeout: Duration) -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            failure_threshold,
            reset_timeout,
            half_open_timeout,
        }
    }

    pub async fn record_failure(&self, provider_id: &str) {
        let mut providers = self.providers.write().await;
        let health = providers.entry(provider_id.to_string()).or_insert(ProviderHealth {
            failures: 0,
            last_failure: Instant::now(),
            state: CircuitState::Closed,
        });

        health.failures += 1;
        health.last_failure = Instant::now();

        if health.failures >= self.failure_threshold {
            health.state = CircuitState::Open;
        }
    }

    pub async fn record_success(&self, provider_id: &str) {
        let mut providers = self.providers.write().await;
        if let Some(health) = providers.get_mut(provider_id) {
            health.failures = 0;
            if health.state == CircuitState::HalfOpen {
                health.state = CircuitState::Closed;
            }
        }
    }

    pub async fn can_execute(&self, provider_id: &str) -> bool {
        let mut providers = self.providers.write().await;
        let health = providers.entry(provider_id.to_string()).or_insert(ProviderHealth {
            failures: 0,
            last_failure: Instant::now(),
            state: CircuitState::Closed,
        });

        match health.state {
            CircuitState::Closed => true,
            CircuitState::Open => {
                if health.last_failure.elapsed() >= self.reset_timeout {
                    health.state = CircuitState::HalfOpen;
                    true
                } else {
                    false
                }
            }
            CircuitState::HalfOpen => {
                health.last_failure.elapsed() >= self.half_open_timeout
            }
        }
    }
}

// Add to orderbook.rs:
impl OrderBook {
    pub async fn find_matches_with_circuit_breaker(
        &mut self, 
        bid: &Bid,
        circuit_breaker: &CircuitBreaker
    ) -> redis::RedisResult<Vec<Ask>> {
        let mut matches = self.find_matches(bid)?;
        matches.retain(|ask| {
            circuit_breaker.can_execute(&ask.provider_id).await
        });
        Ok(matches)
    }
}