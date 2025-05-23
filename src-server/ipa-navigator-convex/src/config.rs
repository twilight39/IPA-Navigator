use std::env;

pub struct Config {
    pub convex_deployment_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        let convex_deployment_url = match env::var("CONVEX_DEPLOYMENT_URL") {
            Ok(url) => url,
            Err(_) => "https://tremendous-bear-886.convex.cloud".to_string(),
        };

        Self {
            convex_deployment_url,
        }
    }
}
