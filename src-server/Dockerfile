FROM rust:1 AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY ipa-navigator-axum ./ipa-navigator-axum
COPY ipa-navigator-kokoro ./ipa-navigator-kokoro
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
# Install espeak-ng and development libraries needed for building
RUN apt-get update && apt-get install -y \
    espeak-ng \
    espeak-ng-data \
    libespeak-ng-dev \
    build-essential \
    llvm \
    clang \
    libclang-dev \
    libclang1 \
    cmake \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set LIBCLANG_PATH environment variable
ENV LIBCLANG_PATH=/usr/lib/llvm-19/lib/

# Add rustfmt component
RUN rustup component add rustfmt

COPY --from=planner /app/recipe.json recipe.json
# Build dependencies - this is the caching Docker layer!
RUN cargo chef cook --release --recipe-path recipe.json
# Build application
COPY . .
RUN cargo build --release --bin src-server

FROM debian:bookworm-slim AS runtime
WORKDIR /app

# Install espeak-ng runtime dependencies
RUN apt-get update && apt-get install -y \
    espeak-ng \
    espeak-ng-data \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/src-server /usr/local/bin
COPY --from=builder /app/assets ./assets

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3002
ENV RUST_LOG=info
ENV CONVEX_DEPLOYMENT_URL=https://beaming-crane-112.convex.site
ENV ESPEAK_DATA_PATH=/usr/lib/aarch64-linux-gnu/espeak-ng-data
EXPOSE 3002

# Set the default command to run the application
CMD ["/usr/local/bin/src-server"]
