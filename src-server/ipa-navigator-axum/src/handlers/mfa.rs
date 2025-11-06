use axum::extract::Json;
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
// use ipa_navigator_mfa::{api::assess_pronunciation, docker::MfaDialect};

use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::error::Error;

/// Request for pronunciation assessment
#[derive(Debug, Deserialize)]
pub struct PronunciationRequest {
    /// Base64-encoded audio data (WAV format expected)
    pub audio: String,

    /// Plain text transcript of the spoken words
    pub transcript: String,

    /// Dialect for pronunciation comparison (default: "us")
    #[serde(default = "default_dialect")]
    pub dialect: String,
}

fn default_dialect() -> String {
    "us".to_string()
}

/// Response for pronunciation assessment
#[derive(Debug, Serialize)]
pub struct PronunciationResponse {
    /// Overall pronunciation score (0.0-1.0)
    pub overall_score: f64,

    /// Detailed assessment of each phoneme
    pub phoneme_details: Vec<PhonemeAssessmentDetail>,
}

/// Detailed information about an individual phoneme
#[derive(Debug, Serialize)]
pub struct PhonemeAssessmentDetail {
    pub expected: String,
    pub actual: String,
    pub score: f64,
    pub start_time: f64,
    pub end_time: f64,
}

/*
/// Handle pronunciation assessment requests
pub async fn assess(
    Json(request): Json<PronunciationRequest>,
) -> Result<Json<PronunciationResponse>, Error> {
    info!(
        "Processing pronunciation assessment request for text: '{}'",
        request.transcript
    );

    // Decode base64 audio data
    let audio_data = BASE64
        .decode(&request.audio)
        .map_err(|e| Error::BadRequest(format!("Invalid audio data format: {}", e)))?;

    // Determine dialect
    let dialect = match request.dialect.to_lowercase().as_str() {
        "us" => MfaDialect::AmericanEnglish,
        "uk" => MfaDialect::BritishEnglish,
        _ => {
            return Err(Error::BadRequest(format!(
                "Unsupported dialect: {}",
                request.dialect
            )));
        }
    };

    info!("Using dialect: {:?}", dialect);

    // Process through MFA
    let assessment =
        assess_pronunciation(&audio_data, &request.transcript, dialect).map_err(|e| {
            error!("MFA processing error: {:?}", e);
            Error::InternalServerError(format!("Failed to process pronunciation assessment: {}", e))
        })?;

    info!(
        "Pronunciation assessment complete, overall score: {:.2}%",
        assessment.overall_score * 100.0
    );

    // Convert to API response format
    let response = PronunciationResponse {
        overall_score: assessment.overall_score,
        phoneme_details: assessment
            .phoneme_details
            .into_iter()
            .map(|detail| PhonemeAssessmentDetail {
                expected: detail.expected,
                actual: detail.actual,
                score: detail.score,
                start_time: detail.start_time,
                end_time: detail.end_time,
            })
            .collect(),
    };

    Ok(Json(response))
}
 */
