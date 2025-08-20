use crate::constants::ASSETS_PATH;
use crate::error::TtsError;
use crate::voices::VoiceType;
use ort::{
    execution_providers::CoreMLExecutionProvider,
    session::{Session, builder::GraphOptimizationLevel},
};

use std::path::PathBuf;

pub struct KokoroModel {
    session: Session,
}

impl KokoroModel {
    pub fn new() -> Result<Self, TtsError> {
        let model_path = PathBuf::from(format!("{}/Kokoro/model.onnx", *ASSETS_PATH));

        if !model_path.exists() {
            return Err(TtsError::ModelLoadError(format!(
                "Model file not found at path: {}",
                model_path.display()
            )));
        }

        let session = Session::builder()?
            .with_execution_providers([CoreMLExecutionProvider::default().build()])?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(model_path)?;

        Ok(Self { session: session })
    }

    pub fn load_voice_embedding(&self, voice_type: VoiceType) {
        let voice_file: PathBuf = voice_type.path();
    }
}
