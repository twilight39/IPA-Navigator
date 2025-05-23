FROM rust:1 AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin src-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

COPY --from=builder /app/target/release/src-server /usr/local/bin

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3002
ENV RUST_LOG=info
EXPOSE 3002

# Set the default command to run the application
ENTRYPOINT ["/usr/local/bin/src-server"]
