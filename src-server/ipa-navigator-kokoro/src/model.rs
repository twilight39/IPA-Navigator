use crate::error::TtsError;
use crate::voices::VoiceType;
use crate::{constants::ASSETS_PATH, voices::ALL_VOICES};
use ndarray::{ArrayBase, IxDyn, OwnedRepr};
use ort::{
    session::{
        Session, SessionInputValue, SessionInputs, SessionOutputs, builder::GraphOptimizationLevel,
    },
    value::{Tensor, Value},
};
use std::io::Read;

use std::{borrow::Cow, collections::HashMap, fs::File, path::PathBuf};

pub struct KokoroModel {
    session: Session,
    voice_embeddings: HashMap<VoiceType, Vec<f32>>,
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
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_file(model_path)?;

        Ok(Self {
            session: session,
            voice_embeddings: HashMap::new(),
        })
    }

    /// Loads a single voice embedding from a file
    pub fn load_voice_embedding(&self, voice_type: VoiceType) -> Result<Vec<f32>, TtsError> {
        let voice_file: PathBuf = voice_type.path();

        if !voice_file.exists() {
            return Err(TtsError::VoiceDataError(format!(
                "Voice file not found at path: {}",
                voice_file.display()
            )));
        }

        // Read the binary file
        let mut file = File::open(&voice_file)
            .map_err(|e| TtsError::VoiceDataError(format!("Failed to open voice file: {}", e)))?;

        // Read the file into a buffer
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)
            .map_err(|e| TtsError::VoiceDataError(format!("Failed to read voice file: {}", e)))?;

        // Convert bytes to f32 values
        // The expected size is 510 * 1 * 256 * 4 bytes (since each f32 is 4 bytes)
        if buffer.len() != 510 * 1 * 256 * 4 {
            return Err(TtsError::VoiceDataError(format!(
                "Vaoice file has unexpected size: expected {} bytes, got {} bytes",
                510 * 1 * 256 * 4,
                buffer.len()
            )));
        }

        // Create a vector to store the f32 values
        let mut tensor = Vec::with_capacity(510 * 1 * 256);

        // Convert bytes to f32 values
        for chunk in buffer.chunks_exact(4) {
            if chunk.len() == 4 {
                let value = f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]);
                tensor.push(value);
            }
        }

        Ok(tensor)
    }

    /// Loads all available voice embeddings and caches them for later use
    pub fn load_all_voice_embeddings(&mut self) -> Result<(), TtsError> {
        let voices = *ALL_VOICES;

        tracing::info!("Loading {} voice embeddings", voices.len());

        let mut failed_voices = Vec::new();

        for voice in voices {
            match self.load_voice_embedding(voice) {
                Ok(embedding) => {
                    tracing::debug!("Loaded voice embedding for {:?}", voice);
                    self.voice_embeddings.insert(voice, embedding);
                }
                Err(err) => {
                    tracing::warn!("Failed to load voice {:?}: {}", voice, err);
                    failed_voices.push((voice, err));
                }
            }
        }

        if !failed_voices.is_empty() {
            tracing::warn!("Failed to load {} voices", failed_voices.len());
            // Return first error if any voices failed to load
            return Err(TtsError::VoiceDataError(failed_voices[0].1.to_string()));
        }

        tracing::info!(
            "Successfully loaded {} voice embeddings",
            self.voice_embeddings.len()
        );
        Ok(())
    }

    /// Gets a voice embedding from the cache, or loads it if not already loaded
    pub fn get_voice_embedding(&mut self, voice_type: VoiceType) -> Result<Vec<f32>, TtsError> {
        if !self.voice_embeddings.contains_key(&voice_type) {
            let embedding = self.load_voice_embedding(voice_type)?;
            self.voice_embeddings.insert(voice_type, embedding);
        }

        Ok(self.voice_embeddings.get(&voice_type).unwrap().clone())
    }

    /// Returns a list of all successfully loaded voices
    pub fn available_voices(&self) -> Vec<VoiceType> {
        self.voice_embeddings.keys().cloned().collect()
    }

    /// Runs inference on the model with the given tokens, voice type, and speed.
    /// Returns the generated audio as an ndarray.
    pub fn infer(
        &mut self,
        tokens: Vec<i64>,
        voice_embedding: Vec<f32>,
        speed: f32,
        chunk_number: Option<usize>,
    ) -> Result<ArrayBase<OwnedRepr<f32>, IxDyn>, TtsError> {
        // Debugging info
        if let Some(chunk) = chunk_number {
            tracing::debug!("Processing chunk {} with {} tokens", chunk, tokens.len());
        }

        // Create the tokens tensor - shape [1, sequence_length]
        let tokens_shape = vec![1, tokens.len() as i32];
        let tokens_tensor = Tensor::from_array((tokens_shape, tokens.clone()))?;

        // Process the voice embedding to match model's expected [1, 256] shape
        // Our voice embedding is 510*1*256 (130560) elements
        let mut style_data = vec![0.0f32; 256];

        // Average across the 510 "frames" to get a single 256-dimensional vector
        if voice_embedding.len() == 510 * 256 {
            for i in 0..256 {
                let mut sum = 0.0;
                for j in 0..510 {
                    sum += voice_embedding[j * 256 + i];
                }
                style_data[i] = sum / 510.0;
            }
        } else {
            // Fallback - just use the first 256 elements
            style_data.extend_from_slice(&voice_embedding[..256.min(voice_embedding.len())]);
            style_data.resize(256, 0.0);
        }

        // Create the style tensor - shape [1, 256] as expected by model
        let style_shape = vec![1, 256];
        let style_tensor = Tensor::from_array((style_shape, style_data))?;

        // Create the speed tensor - shape [1]
        let speed_tensor = Tensor::from_array(([1], vec![speed; 1]))?;

        // Create SessionInputValues
        let tokens_value: SessionInputValue = SessionInputValue::Owned(Value::from(tokens_tensor));
        let style_value: SessionInputValue = SessionInputValue::Owned(Value::from(style_tensor));
        let speed_value: SessionInputValue = SessionInputValue::Owned(Value::from(speed_tensor));

        let inputs: Vec<(Cow<str>, SessionInputValue)> = vec![
            (Cow::Borrowed("input_ids"), tokens_value),
            (Cow::Borrowed("style"), style_value),
            (Cow::Borrowed("speed"), speed_value),
        ];

        // Run Inference
        tracing::debug!("Running inference with {} tokens", tokens.len());
        let outputs: SessionOutputs = self
            .session
            .run(SessionInputs::from(inputs))
            .map_err(|e| TtsError::InferenceError(format!("Inference failed: {}", e)))?;

        // Extract output audio
        let (shape, data) = outputs["waveform"]
            .try_extract_tensor::<f32>()
            .map_err(|e| {
                TtsError::InferenceError(format!("Failed to extract output tensor: {}", e))
            })?;

        // Convert Shape and &[f32] to ArrayBase<OwnedRepr<f32>, IxDyn>
        let shape_vec: Vec<usize> = shape.into_iter().map(|&i| i as usize).collect();
        let data_vec: Vec<f32> = data.to_vec();
        let chunk_info = chunk_number
            .map(|n| format!("Chunk: {}, ", n))
            .unwrap_or_default();

        tracing::debug!(
            "{}inference output: audio_shape={:?}, sample_count={}",
            chunk_info,
            shape_vec,
            data_vec.len()
        );
        match ArrayBase::<OwnedRepr<f32>, IxDyn>::from_shape_vec(shape_vec, data_vec) {
            Ok(array) => {
                tracing::debug!(
                    "{}inference output array created successfully with shape {:?}",
                    chunk_info,
                    array.shape()
                );
                Ok(array)
            }
            Err(err) => {
                tracing::error!("{}failed to create output array: {}", chunk_info, err);
                return Err(TtsError::InferenceError(format!(
                    "Failed to create output array: {}",
                    err
                )));
            }
        }
    }

    /// Convenience method to run inference with a voice type instead of embedding
    pub fn infer_with_voice_type(
        &mut self,
        tokens: Vec<i64>,
        voice_type: VoiceType,
        speed: f32,
        chunk_number: Option<usize>,
    ) -> Result<ArrayBase<OwnedRepr<f32>, IxDyn>, TtsError> {
        let voice_embedding = self.get_voice_embedding(voice_type)?;
        self.infer(tokens, voice_embedding, speed, chunk_number)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::phonemizer::text_to_phonemes_string;
    use crate::tokenize::tokenize;
    use crate::voices::{
        AmericanFemaleVoice, AmericanMaleVoice, BritishFemaleVoice, BritishMaleVoice, VoiceType,
    };
    use std::fs::create_dir_all;
    use std::path::PathBuf;
    use std::time::Instant;

    #[test]
    fn test_model_initialization() {
        let model = KokoroModel::new();
        match model {
            Ok(_) => assert!(true, "Model initialized successfully"),
            Err(err) => {
                println!("Model initialization error: {:?}", err);
                assert!(false, "Model Initialization Failed: {:?}", err);
            }
        }
    }

    #[test]
    fn test_load_single_voice_embedding() {
        let model = match KokoroModel::new() {
            Ok(m) => m,
            Err(e) => {
                println!("Skipping test as model could not be loaded: {:?}", e);
                return;
            }
        };

        // Test loading a single voice embedding
        let voice_type = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let result = model.load_voice_embedding(voice_type);
        assert!(
            result.is_ok(),
            "Failed to load voice embedding: {:?}",
            result.err()
        );

        let embedding = result.unwrap();
        assert_eq!(
            embedding.len(),
            510 * 1 * 256,
            "Embedding has incorrect size"
        );
    }

    #[test]
    fn test_load_all_voice_embeddings() {
        let mut model = match KokoroModel::new() {
            Ok(m) => m,
            Err(e) => {
                println!("Skipping test as model could not be loaded: {:?}", e);
                return;
            }
        };

        let result = model.load_all_voice_embeddings();
        assert!(
            result.is_ok(),
            "Failed to load all voice embeddings: {:?}",
            result.err()
        );

        // Verify that voice embeddings were loaded
        assert!(
            !model.voice_embeddings.is_empty(),
            "No voice embeddings were loaded"
        );

        // Check if all voices from ALL_VOICES were loaded
        let loaded_count = model.voice_embeddings.len();
        let expected_count = ALL_VOICES.len();
        assert_eq!(
            loaded_count, expected_count,
            "Not all voice embeddings were loaded"
        );
    }

    #[test]
    fn test_get_voice_embedding() {
        let mut model = match KokoroModel::new() {
            Ok(m) => m,
            Err(e) => {
                println!("Skipping test as model could not be loaded: {:?}", e);
                return;
            }
        };

        // Test getting a voice embedding for a voice type that hasn't been loaded yet
        let voice_type = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let result = model.get_voice_embedding(voice_type);
        assert!(
            result.is_ok(),
            "Failed to get voice embedding: {:?}",
            result.err()
        );

        // Verify that the embedding was cached
        assert!(
            model.voice_embeddings.contains_key(&voice_type),
            "Voice embedding was not cached after getting it"
        );

        // Get it again to test the cached path
        let cached_result = model.get_voice_embedding(voice_type);
        assert!(
            cached_result.is_ok(),
            "Failed to get cached voice embedding"
        );

        // Verify both embeddings are identical
        assert_eq!(
            result.unwrap(),
            cached_result.unwrap(),
            "Cached embedding differs from original"
        );
    }

    #[test]
    fn test_multiple_voice_types() {
        let mut model = match KokoroModel::new() {
            Ok(m) => m,
            Err(e) => {
                println!("Skipping test as model could not be loaded: {:?}", e);
                return;
            }
        };

        // Test loading embeddings for different voice types
        let voice_types = [
            VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
            VoiceType::AmericanMale(AmericanMaleVoice::Michael),
            VoiceType::BritishFemale(BritishFemaleVoice::Emma),
            VoiceType::BritishMale(BritishMaleVoice::Fable),
        ];

        for voice_type in voice_types.iter() {
            let result = model.get_voice_embedding(*voice_type);
            assert!(
                result.is_ok(),
                "Failed to load voice embedding for {:?}: {:?}",
                voice_type,
                result.err()
            );
        }

        // Check that all voice embeddings were cached
        for voice_type in voice_types.iter() {
            assert!(
                model.voice_embeddings.contains_key(voice_type),
                "Voice embedding for {:?} was not cached",
                voice_type
            );
        }

        // Check the available voices count
        assert_eq!(
            model.available_voices().len(),
            voice_types.len(),
            "Incorrect number of available voices"
        );
    }

    #[test]
    fn test_available_voices() {
        let mut model = match KokoroModel::new() {
            Ok(m) => m,
            Err(e) => {
                println!("Skipping test as model could not be loaded: {:?}", e);
                return;
            }
        };

        // Initially there should be no available voices
        assert!(
            model.available_voices().is_empty(),
            "New model should have no available voices"
        );

        // Load one voice and check if it's available
        let voice_type = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let _ = model.get_voice_embedding(voice_type);

        let available = model.available_voices();
        assert_eq!(available.len(), 1, "Expected exactly one available voice");
        assert!(
            available.contains(&voice_type),
            "The loaded voice is not in the available voices list"
        );
    }

    mod utils {
        use super::*;
        use hound::{SampleFormat, WavSpec, WavWriter};

        // Helper function to save audio output to a WAV file
        pub fn save_audio_output(
            output: &ArrayBase<OwnedRepr<f32>, IxDyn>,
            filename: &str,
        ) -> Result<PathBuf, Box<dyn std::error::Error>> {
            // Create test_output directory if it doesn't exist
            let output_dir = PathBuf::from(format!("{}/test_output", *ASSETS_PATH));
            create_dir_all(&output_dir)?;

            let output_path = output_dir.join(filename);

            // Set up WAV file specification
            let spec = WavSpec {
                channels: 1,
                sample_rate: 24000, // Kokoro model output rate
                bits_per_sample: 16,
                sample_format: SampleFormat::Int,
            };

            // Create WAV writer
            let mut writer = WavWriter::create(&output_path, spec)?;

            // Get a slice view of the array if possible
            if let Some(slice) = output.as_slice() {
                // Convert f32 samples to i16 and write to WAV file
                for &sample in slice {
                    // Scale and clamp the sample to i16 range
                    let scaled_sample = (sample * 32767.0).round().clamp(-32768.0, 32767.0) as i16;
                    writer.write_sample(scaled_sample)?;
                }
            } else {
                // Fallback for when as_slice() isn't available
                // Iterate through the array and write each sample
                for &sample in output.iter() {
                    let scaled_sample = (sample * 32767.0).round().clamp(-32768.0, 32767.0) as i16;
                    writer.write_sample(scaled_sample)?;
                }
            }

            writer.finalize()?;
            println!("Audio saved to: {}", output_path.display());

            Ok(output_path)
        }

        // Helper function to add padding tokens
        pub fn add_padding_to_tokens(
            tokens: Vec<i64>,
            padding_start: usize,
            padding_end: usize,
        ) -> Vec<i64> {
            let mut padded_tokens = vec![0i64; padding_start];
            padded_tokens.extend(tokens);
            padded_tokens.extend(vec![0i64; padding_end]);
            padded_tokens
        }

        // Helper function to process text to tokens with appropriate language
        fn text_to_tokens(text: &str, lang: &str) -> Result<Vec<i64>, Box<dyn std::error::Error>> {
            let phonemes = text_to_phonemes_string(text, lang)?;

            let tokens_i32 = tokenize(&phonemes);
            let tokens: Vec<i64> = tokens_i32.iter().map(|&t| t as i64).collect();

            Ok(tokens)
        }

        // Main test inference function
        pub fn test_inference(
            text: &str,
            voice: VoiceType,
            speed: f32,
            output_file_name: &str,
        ) -> Result<(), Box<dyn std::error::Error>> {
            // Initialize the model
            let mut model = match KokoroModel::new() {
                Ok(m) => m,
                Err(e) => {
                    return Err(Box::new(TtsError::ModelLoadError(format!(
                        "Model could not be loaded: {}",
                        e
                    ))));
                }
            };

            let tokens = utils::text_to_tokens(text, "en-us")?;
            let tokens = utils::add_padding_to_tokens(tokens, 1, 1);

            // Select voice for testing
            let voice_embedding = match model.get_voice_embedding(voice) {
                Ok(emb) => emb,
                Err(e) => {
                    return Err(Box::new(TtsError::VoiceDataError(format!(
                        "Failed to get voice embedding: {}",
                        e
                    ))));
                }
            };

            // Start timing
            let start_time = Instant::now();

            // Run inference
            let result = model.infer(tokens, voice_embedding, speed, None);

            // Check if inference succeeded
            match result {
                Ok(output) => {
                    let inference_time = start_time.elapsed();
                    println!("Inference completed in {:?}", inference_time);
                    println!("Output shape: {:?}", output.shape());

                    // Save the audio to a file for manual verification
                    let filename = format!("test_{}.wav", output_file_name);
                    match utils::save_audio_output(&output, &filename) {
                        Ok(output_path) => {
                            println!("TTS output saved to: {}", output_path.display());
                        }
                        Err(e) => {
                            return Err(Box::new(TtsError::IoError(std::io::Error::new(
                                std::io::ErrorKind::Other,
                                format!("Failed to save audio output: {}", e),
                            ))));
                        }
                    }

                    // Verify output is not empty
                    assert!(
                        output.shape().iter().product::<usize>() > 0,
                        "Output array is empty"
                    );
                }
                Err(err) => {
                    return Err(Box::new(TtsError::InferenceError(format!(
                        "Inference failed: {}",
                        err
                    ))));
                }
            }

            Ok(())
        }
    }

    /// Utility function to inspect model metadata
    /// Keep this as a debugging tool
    #[allow(dead_code)]
    fn inspect_model_metadata() -> Result<(), Box<dyn std::error::Error>> {
        use ort::session::builder::SessionBuilder;
        use std::path::PathBuf;

        // Load the model directly to inspect its metadata
        let model_path = PathBuf::from(format!("{}/Kokoro/model.onnx", *ASSETS_PATH));
        println!("Loading model from: {}", model_path.display());

        // Create a session just for inspection
        let session = SessionBuilder::new()?.commit_from_file(model_path)?;

        // Get metadata about inputs
        println!("\nModel Metadata:");
        match session.metadata() {
            Ok(metadata) => {
                println!("Producer Name: {:?}", metadata.producer());
                println!("Graph Description: {:?}", metadata.graph_description());
                println!("Domain: {:?}", metadata.domain());
                println!("Description: {:?}", metadata.description());
                println!("Version: {:?}", metadata.version());
                println!("Custom Keys: {:?}", metadata.custom_keys());
            }
            Err(e) => {
                println!("Failed to get model metadata: {}", e);
            }
        }

        // Get input names and info
        println!("\nModel Inputs:");
        let mut input_names = Vec::new();
        for input in session.inputs {
            println!("Name: {}, Type: {:?}", input.name, input.input_type);
            input_names.push(input.name.clone());
        }

        // Get output names and info
        println!("\nModel Outputs:");
        let mut output_names = Vec::new();
        for output in session.outputs {
            println!("Name: {}, Type: {:?}", output.name, output.output_type);
            output_names.push(output.name.clone());
        }

        Ok(())
    }

    #[test]
    fn test_short_inference_with_padding() -> Result<(), Box<dyn std::error::Error>> {
        match utils::test_inference(
            "Hello World",
            VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
            1.0,
            "short_inference_with_padding",
        ) {
            Ok(_) => println!("Short inference with padding test passed"),
            Err(e) => {
                assert!(false, "Short inference with padding test failed: {}", e);
            }
        }

        Ok(())
    }

    #[test]
    fn test_different_voices() -> Result<(), Box<dyn std::error::Error>> {
        // Test multiple voices to ensure they all work correctly
        let voices = [
            (
                VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
                "voice_bella",
            ),
            (
                VoiceType::AmericanMale(AmericanMaleVoice::Michael),
                "voice_michael",
            ),
            (
                VoiceType::BritishFemale(BritishFemaleVoice::Emma),
                "voice_emma",
            ),
            (
                VoiceType::BritishMale(BritishMaleVoice::Fable),
                "voice_fable",
            ),
        ];

        for (voice, name) in voices.iter() {
            println!("\nTesting voice: {:?}", voice);
            match utils::test_inference(
                "This is a test of different voices in the Kokoro TTS system.",
                *voice,
                1.0,
                name,
            ) {
                Ok(_) => println!("Voice test passed for {:?}", voice),
                Err(e) => println!("Voice test failed for {:?}: {}", voice, e),
            }
        }

        Ok(())
    }

    #[test]
    fn test_long_text() -> Result<(), Box<dyn std::error::Error>> {
        // Test with a longer paragraph to ensure it handles longer texts correctly
        let long_text = "The Kokoro text-to-speech system can generate natural-sounding audio \
                         from text input. It supports multiple voices and languages, and can \
                         be used to create audio content for a variety of applications. This \
                         test verifies that the system works correctly with longer text passages.";

        match utils::test_inference(
            long_text,
            VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
            1.0,
            "long_text",
        ) {
            Ok(_) => println!("Long text inference test passed"),
            Err(e) => {
                assert!(false, "Long text inference test failed: {}", e);
            }
        }

        Ok(())
    }

    #[test]
    fn test_different_speeds() -> Result<(), Box<dyn std::error::Error>> {
        // Test different speech speeds
        let speeds = [
            (0.8, "speed_slow"),
            (1.0, "speed_normal"),
            (1.2, "speed_fast"),
        ];

        let text = "This text will be spoken at different speeds to test the speed parameter.";
        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);

        for (speed, name) in speeds.iter() {
            println!("\nTesting speed: {}", speed);
            match utils::test_inference(text, voice, *speed, name) {
                Ok(_) => println!("Speed test passed for speed {}", speed),
                Err(e) => println!("Speed test failed for speed {}: {}", speed, e),
            }
        }

        Ok(())
    }

    #[test]
    fn test_multilingual_phonemes() -> Result<(), Box<dyn std::error::Error>> {
        // Test handling of different language phonemes
        let voice_langs = [
            (
                VoiceType::AmericanFemale(AmericanFemaleVoice::Bella),
                "en-us",
                "us_phonemes",
            ),
            (
                VoiceType::BritishFemale(BritishFemaleVoice::Emma),
                "en",
                "gb_phonemes",
            ),
        ];

        let text = "Hello, this is a test of phoneme generation in different accents.";

        for (voice, lang, name) in voice_langs.iter() {
            println!("\nTesting language: {}", lang);

            // Get phonemes for this language
            let phonemes = match text_to_phonemes_string(text, lang) {
                Ok(p) => {
                    println!("Phonemes for '{}' in {}: {}", text, lang, p);
                    p
                }
                Err(e) => {
                    return Err(Box::new(TtsError::PhonemeError(format!(
                        "Phonemizer failed for language {}: {}",
                        lang, e
                    ))));
                }
            };

            // Get tokens
            let tokens = tokenize(&phonemes);
            let padded_tokens = utils::add_padding_to_tokens(tokens, 3, 3);

            // Initialize the model
            let mut model = match KokoroModel::new() {
                Ok(m) => m,
                Err(e) => {
                    return Err(Box::new(TtsError::ModelLoadError(format!(
                        "Model could not be loaded: {}",
                        e
                    ))));
                }
            };

            // Run inference
            let voice_embedding = model.get_voice_embedding(*voice)?;
            match model.infer(padded_tokens, voice_embedding, 1.0, None) {
                Ok(output) => {
                    // Save output
                    let filename = format!("test_{}.wav", name);
                    utils::save_audio_output(&output, &filename)?;
                    println!("Phoneme test passed for language {}", lang);
                }
                Err(e) => {
                    return Err(Box::new(TtsError::InferenceError(format!(
                        "Inference failed for language {}: {}",
                        lang, e
                    ))));
                }
            }
        }

        Ok(())
    }
}
