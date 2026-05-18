FROM rust:1.85-bookworm AS builder
WORKDIR /app
COPY services/chain/Cargo.toml services/chain/Cargo.lock services/chain/build.rs ./
COPY services/chain/src ./src
COPY proto ./proto
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/zero-chain /usr/local/bin/zero-chain
EXPOSE 50051
CMD ["zero-chain"]
