FROM nvidia/cuda:12.1.0-base-ubuntu22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    nvidia-cuda-toolkit \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -L https://ollama.ai/download/ollama-linux-amd64 -o /usr/local/bin/ollama \
    && chmod +x /usr/local/bin/ollama

# Create gollem user
RUN useradd -r -s /bin/false gollem

# Setup directories
RUN mkdir -p /opt/gollem/provider /var/log/gollem \
    && chown -R gollem:gollem /opt/gollem /var/log/gollem

# Switch to gollem user
USER gollem
WORKDIR /opt/gollem/provider

# Copy provider code and configs
COPY --chown=gollem:gollem . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Set environment variables with defaults
ENV REDIS_URL="redis://localhost:6379" \
    PROVIDER_ID="default" \
    MAX_LATENCY=1000 \
    PAYOUT_THRESHOLD=100.00 \
    MODEL_CONFIG="/opt/gollem/provider/models.json"

# Run provider monitor
CMD ["python3", "monitor.py"]

# Note: This container requires NVIDIA Container Toolkit and
# needs to be run with --gpus all flag