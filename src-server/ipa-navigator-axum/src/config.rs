use std::env;

pub struct Config {
    pub port: u16,
    pub host: String,
}

impl Config {
    pub fn from_env() -> Self {
        let port = env::var("PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(3002);

        let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        Self { port, host }
    }
}
