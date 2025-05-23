use anyhow::Error;
use convex::ConvexClient;

pub async fn create_client() -> Result<ConvexClient, Error> {
    let config = crate::config::Config::from_env();
    ConvexClient::new(config.convex_deployment_url.as_str()).await
}
