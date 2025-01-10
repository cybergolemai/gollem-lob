// tests/matcher_test.rs
use rust_decimal::Decimal;
use std::str::FromStr;

#[cfg(test)]
mod tests {
    use super::*;
    use crate::matcher::{Ask, Bid, find_best_match};

    #[test]
    fn test_basic_matching() {
        let bid = Bid {
            model: "gpt-4".to_string(),
            prompt: "test".to_string(),
            max_price: Decimal::from_str("0.001").unwrap(),
            max_latency: 1000,
            timestamp: 1234567890,
        };

        let asks = vec![
            Ask {
                provider_id: "provider1".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0009").unwrap(),
                max_latency: 800,
                available_tokens: 1000000,
            },
            Ask {
                provider_id: "provider2".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0008").unwrap(),
                max_latency: 900,
                available_tokens: 1000000,
            },
        ];

        let result = find_best_match(&bid, &asks);
        assert!(result.is_some());
        let matched_ask = result.unwrap();
        assert_eq!(matched_ask.provider_id, "provider2");
        assert_eq!(matched_ask.price, Decimal::from_str("0.0008").unwrap());
    }

    #[test]
    fn test_no_matching_price() {
        let bid = Bid {
            model: "gpt-4".to_string(),
            prompt: "test".to_string(),
            max_price: Decimal::from_str("0.0007").unwrap(),
            max_latency: 1000,
            timestamp: 1234567890,
        };

        let asks = vec![
            Ask {
                provider_id: "provider1".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0009").unwrap(),
                max_latency: 800,
                available_tokens: 1000000,
            },
        ];

        let result = find_best_match(&bid, &asks);
        assert!(result.is_none());
    }

    #[test]
    fn test_no_matching_latency() {
        let bid = Bid {
            model: "gpt-4".to_string(),
            prompt: "test".to_string(),
            max_price: Decimal::from_str("0.001").unwrap(),
            max_latency: 500,
            timestamp: 1234567890,
        };

        let asks = vec![
            Ask {
                provider_id: "provider1".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0009").unwrap(),
                max_latency: 800,
                available_tokens: 1000000,
            },
        ];

        let result = find_best_match(&bid, &asks);
        assert!(result.is_none());
    }

    #[test]
    fn test_no_matching_model() {
        let bid = Bid {
            model: "gpt-4".to_string(),
            prompt: "test".to_string(),
            max_price: Decimal::from_str("0.001").unwrap(),
            max_latency: 1000,
            timestamp: 1234567890,
        };

        let asks = vec![
            Ask {
                provider_id: "provider1".to_string(),
                model: "claude-v2".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0009").unwrap(),
                max_latency: 800,
                available_tokens: 1000000,
            },
        ];

        let result = find_best_match(&bid, &asks);
        assert!(result.is_none());
    }

    #[test]
    fn test_multiple_valid_matches() {
        let bid = Bid {
            model: "gpt-4".to_string(),
            prompt: "test".to_string(),
            max_price: Decimal::from_str("0.001").unwrap(),
            max_latency: 1000,
            timestamp: 1234567890,
        };

        let asks = vec![
            Ask {
                provider_id: "provider1".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0009").unwrap(),
                max_latency: 800,
                available_tokens: 1000000,
            },
            Ask {
                provider_id: "provider2".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "a100".to_string(),
                price: Decimal::from_str("0.0008").unwrap(),
                max_latency: 900,
                available_tokens: 1000000,
            },
            Ask {
                provider_id: "provider3".to_string(),
                model: "gpt-4".to_string(),
                gpu_type: "h100".to_string(),
                price: Decimal::from_str("0.00075").unwrap(),
                max_latency: 950,
                available_tokens: 1000000,
            },
        ];

        let result = find_best_match(&bid, &asks);
        assert!(result.is_some());
        let matched_ask = result.unwrap();
        assert_eq!(matched_ask.provider_id, "provider3");
        assert_eq!(matched_ask.price, Decimal::from_str("0.00075").unwrap());
    }
}