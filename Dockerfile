FROM rust:1.75-slim as builder

WORKDIR /usr/src/gollem

# Install build dependencies
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for layer caching
COPY rust/Cargo.toml rust/Cargo.lock ./
COPY rust/build.rs ./

# Create dummy source for layer caching
RUN mkdir src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build --release && \
    rm -rf src target/release/deps/gollem*

# Now copy real source and build
COPY rust/src ./src/
COPY rust/proto ./proto/
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/gollem/target/release/gollem-lob /usr/local/bin/

EXPOSE 50051

CMD ["gollem-lob"]
