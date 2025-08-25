use ort::Error;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum TtsError {
    #[error("Failed to load model: {0}")]
    ModelLoadError(String),

    #[error("Failed to generate phonemes: {0}")]
    PhonemeError(String),

    #[error("Failed to tokenize text: {0}")]
    TokenizationError(String),

    #[error("Inference error: {0}")]
    InferenceError(String),

    #[error("Failed to load voice data: {0}")]
    VoiceDataError(String),

    #[error("I/O error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("ONNX Runtime error: {0}")]
    OrtError(#[from] Error),

    #[error("Download error: {0}")]
    DownloadError(String),
}
