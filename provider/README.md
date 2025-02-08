# Provider Quick Start Guide

## System Prerequisites
- Ubuntu/Lubuntu 22.04+
- NVIDIA Driver 525+
- CUDA 12.0+
- Python 3.10+
- Ollama installed and running

## Docker Setup

1. Install Docker and NVIDIA Container Toolkit:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/libnvidia-container/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

2. Build and run:
```bash
cd provider
docker build -t gollem-provider .
docker run --gpus all -d \
    -e REDIS_URL="redis://your-memorydb-endpoint:6379" \
    -e PROVIDER_ID="your-provider-id" \
    gollem-provider
```

## Manual Setup

1. Install system dependencies:
```bash
sudo apt update && sudo apt install -y python3-pip nvidia-cuda-toolkit
```

2. Create service user:
```bash
sudo useradd -r -s /bin/false gollem
```

3. Create service directories:
```bash
sudo mkdir -p /opt/gollem/provider
sudo mkdir -p /var/log/gollem
sudo chown -R gollem:gollem /opt/gollem /var/log/gollem
```

4. Install provider package:
```bash
cd /opt/gollem/provider
sudo -u gollem git clone https://github.com/your-org/gollem-lob.git .
sudo -u gollem pip3 install -r provider/requirements.txt
```

5. Create model configuration:
```bash
sudo -u gollem tee /opt/gollem/provider/models.json << EOF
{
  "models": [
    {
      "name": "gpt4",
      "vram_required": 40000,  # MB
      "base_price": "0.001",
      "max_concurrent": 1
    },
    {
      "name": "gpt3",
      "vram_required": 20000,  # MB
      "base_price": "0.0005",
      "max_concurrent": 2
    }
  ],
  "allocation_strategy": "first-available"  # or "max-density"
}
EOF
```

6. Create service configuration:
```bash
sudo -u gollem tee /opt/gollem/provider/config.env << EOF
REDIS_URL="redis://your-memorydb-endpoint:6379"
PROVIDER_ID="your-provider-id"
MAX_LATENCY=1000
PAYOUT_THRESHOLD=100.00
MODEL_CONFIG=/opt/gollem/provider/models.json
EOF
```

## Model Management

The provider service automatically:
- Creates separate asks per model per GPU
- Tracks VRAM allocation across models
- Adjusts asks based on current utilization
- Cancels/updates asks when resources change

For example, on an A100 80GB:
- Can concurrently offer GPT-4 (40GB) and GPT-3 (20GB)
- When one model is matched, other asks are automatically adjusted
- If GPU utilization exceeds thresholds, asks are removed or prices increased
- New asks are created when capacity becomes available

## Systemd Service Setup

1. Create service file:
```bash
sudo tee /etc/systemd/system/gollem-provider.service << EOF
[Unit]
Description=GoLLeM GPU Provider Service
After=network.target ollama.service

[Service]
Type=simple
User=gollem
Group=gollem
EnvironmentFile=/opt/gollem/provider/config.env
WorkingDirectory=/opt/gollem/provider
ExecStart=/usr/bin/python3 provider/monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

2. Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable gollem-provider
sudo systemctl start gollem-provider
```

## Monitoring

Check service status:
```bash
sudo systemctl status gollem-provider
```

View logs:
```bash
sudo journalctl -u gollem-provider -f
```

Monitor GPU metrics:
```bash
nvidia-smi -l 1
```

## Troubleshooting

Common issues:

1. Service fails to start:
- Check logs: `journalctl -u gollem-provider -n 50`
- Verify NVIDIA drivers: `nvidia-smi`
- Test Redis connection: `redis-cli -u $REDIS_URL ping`

2. No asks appearing in orderbook:
- Verify Ollama is running: `systemctl status ollama`
- Check GPU access permissions: `groups gollem`
- Validate provider ID is unique
- Check model configuration matches available VRAM