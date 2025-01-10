use std::{collections::HashMap, time::{Duration, Instant}};
use tokio::sync::RwLock;
use std::sync::Arc;

#[derive(Debug, Clone)]
struct LatencyStats {
    p95_latency: Duration,
    samples: Vec<Duration>,
    last_update: Instant,
}

impl LatencyStats {
    fn new() -> Self {
        Self {
            p95_latency: Duration::from_millis(100), // Default assumption
            samples: Vec::with_capacity(100),
            last_update: Instant::now(),
        }
    }

    fn add_sample(&mut self, latency: Duration) {
        self.samples.push(latency);
        if self.samples.len() >= 100 {
            self.samples.sort_unstable();
            let p95_idx = (self.samples.len() as f64 * 0.95) as usize;
            self.p95_latency = self.samples[p95_idx];
            self.samples.clear();
        }
        self.last_update = Instant::now();
    }

    fn is_stale(&self) -> bool {
        self.last_update.elapsed() > Duration::from_secs(300)
    }
}

pub struct LatencyRouter {
    stats: Arc<RwLock<HashMap<String, LatencyStats>>>,
}

impl LatencyRouter {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(RwLock::new(HashMap::new()))
        }
    }

    pub async fn record_latency(&self, provider_id: &str, latency: Duration) {
        let mut stats = self.stats.write().await;
        let provider_stats = stats.entry(provider_id.to_string())
            .or_insert_with(LatencyStats::new);
        provider_stats.add_sample(latency);
    }

    pub async fn filter_by_latency(&self, asks: &mut Vec<Ask>, max_latency: Duration) {
        let stats = self.stats.read().await;
        asks.retain(|ask| {
            if let Some(provider_stats) = stats.get(&ask.provider_id) {
                if provider_stats.is_stale() {
                    true // Keep providers with stale stats
                } else {
                    provider_stats.p95_latency <= max_latency
                }
            } else {
                true // Keep providers with no stats
            }
        });
    }
}

// Modify OrderBook to use LatencyRouter
impl OrderBook {
    pub async fn find_matches_with_routing(
        &mut self,
        bid: &Bid,
        circuit_breaker: &CircuitBreaker,
        latency_router: &LatencyRouter
    ) -> redis::RedisResult<Vec<Ask>> {
        let mut matches = self.find_matches(bid)?;
        
        // Filter by circuit breaker
        matches.retain(|ask| circuit_breaker.can_execute(&ask.provider_id).await);
        
        // Filter by latency requirements
        latency_router.filter_by_latency(&mut matches, Duration::from_millis(bid.max_latency as u64)).await;
        
        Ok(matches)
    }
}