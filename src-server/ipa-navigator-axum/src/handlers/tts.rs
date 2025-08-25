use axum::{
    extract::Json,
    http::{HeaderMap, StatusCode, header},
    response::IntoResponse,
};
use ipa_navigator_kokoro::{
    error::TtsError,
    tts::KokoroTTS,
    voices::{
        AmericanFemaleVoice, AmericanMaleVoice, BritishFemaleVoice, BritishMaleVoice, VoiceType,
    },
};

use serde::{Deserialize, Serialize};
use std::sync::{Arc, LazyLock, Mutex};

// Static TTS instance initialized lazily
static TTS_INSTANCE: LazyLock<Mutex<Option<Arc<KokoroTTS>>>> = LazyLock::new(|| Mutex::new(None));

// Get a reference to the TTS instance
fn get_tts() -> Result<Arc<KokoroTTS>, TtsError> {
    let mut tts_guard = TTS_INSTANCE
        .lock()
        .map_err(|_| TtsError::ModelLoadError("Failed to acquire TTS instance lock".to_string()))?;

    if tts_guard.is_none() {
        // Initialize TTS if not already done
        let tts = KokoroTTS::new()?;
        *tts_guard = Some(Arc::new(tts));
    }

    tts_guard
        .clone()
        .ok_or_else(|| TtsError::ModelLoadError("TTS initialization failed".to_string()))
}

// Request model for TTS endpoint
#[derive(Debug, Deserialize)]
pub struct TtsRequest {
    text: String,
    voice: String,
    speed: Option<f32>,
}

// Response model for TTS endpoint errors
#[derive(Debug, Serialize)]
pub struct TtsErrorResponse {
    error: String,
}

// Helper function to parse voice string to VoiceType
fn parse_voice(voice_str: &str) -> Result<VoiceType, String> {
    match voice_str {
        "american_female_bella" => Ok(VoiceType::AmericanFemale(AmericanFemaleVoice::Bella)),
        "american_female_nicole" => Ok(VoiceType::AmericanFemale(AmericanFemaleVoice::Nicole)),
        "american_female_sky" => Ok(VoiceType::AmericanFemale(AmericanFemaleVoice::Sky)),
        "american_male_fenrir" => Ok(VoiceType::AmericanMale(AmericanMaleVoice::Fenrir)),
        "american_male_michael" => Ok(VoiceType::AmericanMale(AmericanMaleVoice::Michael)),
        "american_male_puck" => Ok(VoiceType::AmericanMale(AmericanMaleVoice::Puck)),
        "british_female_emma" => Ok(VoiceType::BritishFemale(BritishFemaleVoice::Emma)),
        "british_female_isabella" => Ok(VoiceType::BritishFemale(BritishFemaleVoice::Isabella)),
        "british_female_lily" => Ok(VoiceType::BritishFemale(BritishFemaleVoice::Lily)),
        "british_male_fable" => Ok(VoiceType::BritishMale(BritishMaleVoice::Fable)),
        "british_male_george" => Ok(VoiceType::BritishMale(BritishMaleVoice::George)),
        "british_male_lewis" => Ok(VoiceType::BritishMale(BritishMaleVoice::Lewis)),
        _ => Err(format!("Unsupported voice: {}", voice_str)),
    }
}

// TTS endpoint handler
pub async fn synthesize_speech(
    Json(request): Json<TtsRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<TtsErrorResponse>)> {
    let tts = get_tts().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(TtsErrorResponse {
                error: format!("TTS initialization error: {}", e),
            }),
        )
    })?;

    let voice = parse_voice(&request.voice)
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(TtsErrorResponse { error: e })))?;

    let speed = request.speed.unwrap_or(1.0);
    if !(0.5..=2.0).contains(&speed) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(TtsErrorResponse {
                error: "Speed must be between 0.5 and 2.0".to_string(),
            }),
        ));
    }

    tracing::info!(
        "Processing TTS request: text='{}', voice={:?}, speed={}",
        request.text,
        voice,
        speed
    );

    // Process the text to speech
    let result = tts.process_tts(&request.text, &voice, speed).map_err(|e| {
        tracing::error!("TTS processing error: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(TtsErrorResponse {
                error: format!("TTS processing error: {}", e),
            }),
        )
    })?;

    // Get the slice from ndarray
    let audio_slice = result.as_slice().ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(TtsErrorResponse {
                error: "Failed to convert audio data".to_string(),
            }),
        )
    })?;

    // Convert to WAV
    let wav_data = tts.audio_to_wav(audio_slice);
    tracing::debug!("Generated audio of {} bytes", wav_data.len());

    // Set up headers for audio response
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "audio/wav".parse().unwrap());
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"tts.wav\"").parse().unwrap(),
    );

    // Return the WAV data with appropriate headers
    Ok((headers, wav_data))
}
