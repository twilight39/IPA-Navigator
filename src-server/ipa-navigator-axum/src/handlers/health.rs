use axum::{Json, http::StatusCode};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    status: &'static str,
}

/// Handler for health check endpoint
pub async fn health_check() -> (StatusCode, Json<HealthResponse>) {
    let response = HealthResponse { status: "ok" };

    (StatusCode::OK, Json(response))
}
