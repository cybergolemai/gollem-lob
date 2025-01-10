import subprocess
import json
import time
import redis
from decimal import Decimal
from datetime import datetime

class GPUMonitor:
    def __init__(self, redis_url, provider_id, ask_price, max_latency):
        self.redis = redis.from_url(redis_url)
        self.provider_id = provider_id
        self.base_price = Decimal(ask_price)
        self.max_latency = max_latency

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
            return None

    def calculate_available_tokens(self, memory_free):
        # Rough estimation: 1GB = 1B tokens for 7B model
        return int(memory_free * 1_000_000_000)

    def adjust_price(self, utilization):
        # Dynamic pricing based on utilization
        if utilization > 90:
            return self.base_price * Decimal('2.0')
        elif utilization > 70:
            return self.base_price * Decimal('1.5')
        return self.base_price

    def update_ask(self, gpu_stats):
        if not gpu_stats:
            return False

        for idx, stats in enumerate(gpu_stats):
            ask = {
                'provider_id': f"{self.provider_id}_gpu{idx}",
                'model': "gpt4",  # Update for your model
                'gpu_type': "a100",  # Update for your GPU
                'price': str(self.adjust_price(stats['utilization'])),
                'max_latency': self.max_latency,
                'available_tokens': self.calculate_available_tokens(stats['memory_free']),
                'last_heartbeat': int(datetime.utcnow().timestamp())
            }

            self.redis.set(
                f"ask:{ask['provider_id']}:gpt4",
                json.dumps(ask),
                ex=120  # Auto-expire after 2 minutes if monitor fails
            )

        return True

def main():
    monitor = GPUMonitor(
        redis_url="redis://your-memorydb-endpoint:6379",
        provider_id="provider1",
        ask_price="0.001",
        max_latency=1000
    )

    while True:
        stats = monitor.get_gpu_stats()
        if monitor.update_ask(stats):
            print(f"Updated asks for {len(stats)} GPUs")
        else:
            print("Failed to update asks - check nvidia-smi")
        time.sleep(30)

if __name__ == "__main__":
    main()