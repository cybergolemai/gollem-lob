import subprocess
import json
import time
import redis
from decimal import Decimal, ROUND_DOWN
from datetime import datetime
import logging
from dataclasses import dataclass
from typing import Optional, Dict, List

@dataclass
class ProviderEarnings:
    total_credits: Decimal
    pending_payout: Decimal
    last_payout: datetime
    total_inference_count: int

class GPUMonitor:
    def __init__(
        self, 
        redis_url: str,
        provider_id: str,
        ask_price: str,
        max_latency: int,
        payout_threshold: Decimal = Decimal('100.00')
    ):
        self.redis = redis.from_url(redis_url)
        self.provider_id = provider_id
        self.base_price = Decimal(ask_price).quantize(Decimal('0.00000001'), rounding=ROUND_DOWN)
        self.max_latency = max_latency
        self.payout_threshold = payout_threshold
        self.logger = logging.getLogger('GPUMonitor')

    def get_gpu_stats(self):
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'],
                capture_output=True,
                text=True,
                check=True
            )
            stats = []
            for line in result.stdout.strip().split('\n'):
                util, mem_used, mem_total = map(float, line.split(', '))
                stats.append({
                    'utilization': util,
                    'memory_used': mem_used,
                    'memory_total': mem_total,
                    'memory_free': mem_total - mem_used
                })
            return stats
        except subprocess.CalledProcessError:
            self.logger.error("Failed to get GPU stats", exc_info=True)
            return None

    def calculate_available_tokens(self, memory_free: float) -> int:
        tokens_per_gb = Decimal('1000000000')  # 1B tokens per GB
        return int(Decimal(str(memory_free)).mul(tokens_per_gb))

    def calculate_credit_rate(self, gpu_type: str, model: str) -> Decimal:
        # Base credit rate per token
        base_rate = Decimal('0.000001')  # 1 credit per million tokens

        # Adjust based on GPU type
        gpu_multipliers = {
            'a100': Decimal('1.5'),
            'h100': Decimal('2.0'),
            'default': Decimal('1.0')
        }
        gpu_multiplier = gpu_multipliers.get(gpu_type.lower(), gpu_multipliers['default'])

        # Adjust based on model
        model_multipliers = {
            'gpt4': Decimal('2.0'),
            'gpt3': Decimal('1.0'),
            'default': Decimal('1.0')
        }
        model_multiplier = model_multipliers.get(model.lower(), model_multipliers['default'])

        return base_rate.mul(gpu_multiplier).mul(model_multiplier).quantize(
            Decimal('0.00000001'),
            rounding=ROUND_DOWN
        )

    def adjust_price(self, utilization: float) -> Decimal:
        # Dynamic pricing based on utilization with precise decimal handling
        if utilization > 90:
            multiplier = Decimal('2.0')
        elif utilization > 70:
            multiplier = Decimal('1.5')
        else:
            multiplier = Decimal('1.0')

        return self.base_price.mul(multiplier).quantize(
            Decimal('0.00000001'),
            rounding=ROUND_DOWN
        )

    def get_earnings(self) -> ProviderEarnings:
        try:
            earnings_key = f"provider:earnings:{self.provider_id}"
            raw_data = self.redis.get(earnings_key)
            
            if raw_data:
                data = json.loads(raw_data)
                return ProviderEarnings(
                    total_credits=Decimal(data['total_credits']),
                    pending_payout=Decimal(data['pending_payout']),
                    last_payout=datetime.fromtimestamp(data['last_payout']),
                    total_inference_count=data['total_inference_count']
                )
            return ProviderEarnings(
                total_credits=Decimal('0'),
                pending_payout=Decimal('0'),
                last_payout=datetime.now(),
                total_inference_count=0
            )
        except Exception as e:
            self.logger.error(f"Failed to get earnings: {e}", exc_info=True)
            return None

    def check_payout_eligibility(self) -> Optional[Decimal]:
        earnings = self.get_earnings()
        if not earnings:
            return None

        if earnings.pending_payout >= self.payout_threshold:
            return earnings.pending_payout
        return None

    def update_ask(self, gpu_stats: List[Dict]) -> bool:
        if not gpu_stats:
            return False

        current_time = int(datetime.utcnow().timestamp())
        
        try:
            # Update asks for each GPU
            for idx, stats in enumerate(gpu_stats):
                gpu_id = f"{self.provider_id}_gpu{idx}"
                
                # Calculate prices and rates with proper decimal handling
                price = self.adjust_price(stats['utilization'])
                credit_rate = self.calculate_credit_rate("a100", "gpt4")
                available_tokens = self.calculate_available_tokens(stats['memory_free'])

                ask = {
                    'provider_id': gpu_id,
                    'model': "gpt4",
                    'gpu_type': "a100",
                    'price': str(price),
                    'credit_rate': str(credit_rate),
                    'max_latency': self.max_latency,
                    'available_tokens': available_tokens,
                    'last_heartbeat': current_time,
                    'capabilities': {
                        'streaming': 'true',
                        'batch_support': 'true',
                        'max_tokens': str(available_tokens)
                    }
                }

                # Atomic update with proper expiration
                pipe = self.redis.pipeline()
                pipe.set(
                    f"ask:{gpu_id}:gpt4",
                    json.dumps(ask),
                    ex=120  # Auto-expire after 2 minutes if monitor fails
                )
                
                # Update provider status
                status_key = f"provider:status:{gpu_id}"
                status = {
                    'last_heartbeat': current_time,
                    'gpu_utilization': stats['utilization'],
                    'memory_used': stats['memory_used'],
                    'memory_total': stats['memory_total'],
                    'current_price': str(price),
                    'credit_rate': str(credit_rate)
                }
                pipe.set(status_key, json.dumps(status), ex=120)
                pipe.execute()

            # Check for pending payouts
            payout_amount = self.check_payout_eligibility()
            if payout_amount:
                self.logger.info(f"Payout threshold reached: {payout_amount} credits pending")
                # Trigger payout process (implement based on your payment system)
                self.request_payout(payout_amount)

            return True

        except Exception as e:
            self.logger.error(f"Failed to update ask: {e}", exc_info=True)
            return False

    def request_payout(self, amount: Decimal):
        try:
            payout_request = {
                'provider_id': self.provider_id,
                'amount': str(amount),
                'timestamp': int(datetime.utcnow().timestamp()),
                'status': 'pending'
            }
            
            # Record payout request
            self.redis.rpush(
                f"provider:payouts:{self.provider_id}",
                json.dumps(payout_request)
            )
            
            # Notify payout service (implement based on your system)
            self.redis.publish(
                'payout_requests',
                json.dumps(payout_request)
            )
            
        except Exception as e:
            self.logger.error(f"Failed to request payout: {e}", exc_info=True)

def main():
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger('GPUMonitor')

    try:
        monitor = GPUMonitor(
            redis_url="redis://your-memorydb-endpoint:6379",
            provider_id="provider1",
            ask_price="0.001",
            max_latency=1000,
            payout_threshold=Decimal('100.00')
        )

        while True:
            try:
                stats = monitor.get_gpu_stats()
                if monitor.update_ask(stats):
                    logger.info(f"Updated asks for {len(stats)} GPUs")
                else:
                    logger.warning("Failed to update asks - check nvidia-smi")
            except Exception as e:
                logger.error(f"Monitor iteration failed: {e}", exc_info=True)
            
            time.sleep(30)

    except Exception as e:
        logger.critical(f"Monitor failed to start: {e}", exc_info=True)
        raise

if __name__ == "__main__":
    main()