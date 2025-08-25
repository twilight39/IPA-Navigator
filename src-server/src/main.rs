use ipa_navigator_axum::{Config as server_config, create_router};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Get server configuration
    let config = server_config::from_env();
    let addr = format!("{}:{}", config.host, config.port);

    // Create the router
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    let router = create_router();

    // Create the server
    info!("Starting server on {}", listener.local_addr().unwrap());
    if let Err(e) = axum::serve(listener, router).await {
        error!("Server error: {}", e);
    }
}
