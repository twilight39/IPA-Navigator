use crate::error::TtsError;
use crate::model::KokoroModel;
use crate::normalize::normalize_text;
use crate::phonemizer::text_to_phonemes_string;
use crate::tokenize::tokenize;
use crate::voices::VoiceType;
use hound::{WavSpec, WavWriter};
use lru::LruCache;
use ndarray::{ArrayBase, IxDyn, OwnedRepr};
use std::io::Cursor;
use std::num::NonZeroUsize;
use std::sync::Mutex;

use std::time::{Duration, Instant};

static CACHE_TTL: Duration = Duration::from_secs(60 * 60); // 1 hour

// Cache entry with timestamp for potential time-based eviction
struct CacheEntry {
    audio: ArrayBase<OwnedRepr<f32>, IxDyn>,
    timestamp: Instant,
}

pub struct KokoroTTS {
    model: Mutex<KokoroModel>,
    cache: Mutex<LruCache<String, CacheEntry>>,
    cache_ttl: Duration,
}

impl KokoroTTS {
    pub fn new() -> Result<Self, TtsError> {
        let mut model = KokoroModel::new()?;
        model.load_all_voice_embeddings()?;

        // Initialize LRU cache with a capacity of 50 entries
        let cache_size = NonZeroUsize::new(50).unwrap();

        Ok(Self {
            model: Mutex::new(model),
            cache: Mutex::new(LruCache::new(cache_size)),
            cache_ttl: CACHE_TTL,
        })
    }

    /// Lists all available voices with their display names
    pub fn available_voices(&self) -> Vec<VoiceType> {
        let model = self.model.lock().unwrap_or_else(|e| {
            panic!("Failed to acquire model lock: {:?}", e);
        });
        model.available_voices()
    }

    /// Generate a cache key based on text, voice, and speed
    fn generate_cache_key(text: &str, voice_type: &VoiceType, speed: f32) -> String {
        format!("{}:{}:{}", text, voice_type.file_name(), speed)
    }

    /// Process text into audio using the specified voice and speed
    pub fn process_tts(
        &self,
        text: &str,
        voice_type: &VoiceType,
        speed: f32,
    ) -> Result<ArrayBase<OwnedRepr<f32>, IxDyn>, TtsError> {
        // Normalize the input text
        let normalized_text = normalize_text(text);

        // Generate cache key
        let cache_key = Self::generate_cache_key(&normalized_text, voice_type, speed);

        // Try to get from cache first
        {
            let mut cache = self.cache.lock().map_err(|_| {
                TtsError::InferenceError("Failed to acquire cache lock".to_string())
            })?;

            if let Some(entry) = cache.get(&cache_key) {
                // Check if the entry is still valid (not expired)
                if entry.timestamp.elapsed() < self.cache_ttl {
                    return Ok(entry.audio.clone());
                }
                // If expired, remove it and continue to regenerate
                cache.pop(&cache_key);
            }
        }

        let language = voice_type.language();
        let phonemes = text_to_phonemes_string(&normalized_text, language)
            .map_err(|e| TtsError::PhonemeError(e.to_string()))?;

        let tokens = tokenize(&phonemes);
        let mut padded_tokens = vec![0i64; 1];
        padded_tokens.extend(tokens);
        padded_tokens.extend(vec![0i64; 1]);
        let tokens = padded_tokens;

        // Lock the model to get the voice embedding and run inference
        let mut model = self
            .model
            .lock()
            .map_err(|_| TtsError::InferenceError("Failed to acquire model lock".to_string()))?;

        let voice_embedding = model
            .get_voice_embedding(voice_type.clone())
            .map_err(|_e| {
                TtsError::VoiceDataError(format!("Voice embedding not found for {:?}", voice_type))
            })?;

        // Generate audio
        let audio_data = model.infer(tokens, voice_embedding, speed, None)?;

        // Store in cache
        {
            let mut cache = self.cache.lock().map_err(|_| {
                TtsError::InferenceError("Failed to acquire cache lock".to_string())
            })?;

            cache.put(
                cache_key,
                CacheEntry {
                    audio: audio_data.clone(),
                    timestamp: Instant::now(),
                },
            );
        }

        Ok(audio_data)
    }

    pub fn audio_to_wav(&self, audio_data: &[f32]) -> Vec<u8> {
        let spec = WavSpec {
            channels: 1,
            sample_rate: 24000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        // Create a buffer for the WAV data
        let mut buffer = Vec::new();

        // Create a cursor that will write to the buffer
        let mut cursor = Cursor::new(&mut buffer);

        // Create a WAV writer that writes to the cursor
        let mut writer = WavWriter::new(&mut cursor, spec).unwrap();

        // Write the audio samples
        for &sample in audio_data {
            let amplitude = (sample.clamp(-1.0, 1.0) * i16::MAX as f32) as i16;
            writer.write_sample(amplitude).unwrap();
        }

        // Finalize the WAV writer
        writer.finalize().unwrap();

        // Return the buffer containing the WAV data
        buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::ASSETS_PATH;
    use crate::error::TtsError;
    use crate::voices::{AmericanFemaleVoice, BritishFemaleVoice, VoiceType};
    use std::thread;

    #[test]
    fn test_generate_cache_key() {
        let voice1 = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let voice2 = VoiceType::BritishFemale(BritishFemaleVoice::Emma);

        let key1 = KokoroTTS::generate_cache_key("Hello world", &voice1, 1.0);
        let key2 = KokoroTTS::generate_cache_key("Hello world", &voice1, 1.0);
        let key3 = KokoroTTS::generate_cache_key("Hello world", &voice2, 1.0);
        let key4 = KokoroTTS::generate_cache_key("Hello world", &voice1, 1.5);

        // Same inputs should produce the same key
        assert_eq!(key1, key2, "Same inputs should generate the same cache key");

        // Different voices should produce different keys
        assert_ne!(
            key1, key3,
            "Different voices should produce different cache keys"
        );

        // Different speeds should produce different keys
        assert_ne!(
            key1, key4,
            "Different speeds should produce different cache keys"
        );
    }

    #[test]
    fn test_audio_to_wav() -> Result<(), TtsError> {
        let tts = match KokoroTTS::new() {
            Ok(tts) => tts,
            Err(e) => {
                return Err(TtsError::ModelLoadError(format!(
                    "Failed to initialize KokoroTTS: {}",
                    e
                )));
            }
        };

        // Create a simple audio array
        let audio_data = vec![0.0f32, 0.5, 1.0, 0.5, 0.0, -0.5, -1.0, -0.5];

        let wav_data = tts.audio_to_wav(&audio_data);

        // Basic validation of WAV format
        assert!(
            wav_data.len() > 44,
            "WAV data should be larger than header size"
        );
        assert_eq!(&wav_data[0..4], b"RIFF", "WAV should start with RIFF tag");
        assert_eq!(&wav_data[8..12], b"WAVE", "WAV should have WAVE format");

        Ok(())
    }

    #[test]
    fn test_cache_behavior() -> Result<(), TtsError> {
        let tts = match KokoroTTS::new() {
            Ok(tts) => tts,
            Err(e) => {
                return Err(TtsError::ModelLoadError(format!(
                    "Failed to initialize KokoroTTS: {}",
                    e
                )));
            }
        };

        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let text = "This is a cache test";
        let cache_key = KokoroTTS::generate_cache_key(text, &voice, 1.0);

        // Initially the cache should be empty
        {
            let cache = tts.cache.lock().unwrap();
            assert_eq!(cache.len(), 0, "Cache should be empty initially");
            assert!(
                !cache.contains(&cache_key),
                "Cache should not contain our key yet"
            );
        }

        // Process text - should add to cache
        let result = tts.process_tts(text, &voice, 1.0);
        assert!(result.is_ok(), "TTS processing should succeed");

        // Now the cache should contain our item
        {
            let cache = tts.cache.lock().unwrap();
            assert_eq!(cache.len(), 1, "Cache should have 1 item");
            assert!(cache.contains(&cache_key), "Cache should contain our key");
        }

        // Process same text again - should use cache
        let result2 = tts.process_tts(text, &voice, 1.0);
        assert!(result2.is_ok(), "TTS processing should succeed again");

        // Cache should still have 1 item
        {
            let cache = tts.cache.lock().unwrap();
            assert_eq!(cache.len(), 1, "Cache should still have 1 item");
        }

        // Process different text - should add to cache
        let different_text = "This is a different text";
        let result3 = tts.process_tts(different_text, &voice, 1.0);
        assert!(
            result3.is_ok(),
            "TTS processing with different text should succeed"
        );

        // Cache should now have 2 items
        {
            let cache = tts.cache.lock().unwrap();
            assert_eq!(cache.len(), 2, "Cache should now have 2 items");
        }

        Ok(())
    }

    #[test]
    fn test_cache_eviction() -> Result<(), TtsError> {
        let tts = match KokoroTTS::new() {
            Ok(tts) => tts,
            Err(e) => {
                return Err(TtsError::ModelLoadError(format!(
                    "Failed to initialize KokoroTTS: {}",
                    e
                )));
            }
        };

        // Replace the cache with a smaller one (capacity 2)
        let small_cache = LruCache::new(NonZeroUsize::new(2).unwrap());
        {
            let mut cache = tts.cache.lock().unwrap();
            *cache = small_cache;
        }

        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);

        // Add 3 different items to trigger eviction
        for i in 1..=3 {
            let text = format!("Cache eviction test {}", i);
            let result = tts.process_tts(&text, &voice, 1.0);
            assert!(
                result.is_ok(),
                "TTS processing should succeed for text {}",
                i
            );
        }

        // Check that cache has only 2 items (capacity)
        {
            let cache = tts.cache.lock().unwrap();
            assert_eq!(cache.len(), 2, "Cache should have reached capacity");

            // The first item should have been evicted
            let first_key = KokoroTTS::generate_cache_key("Cache eviction test 1", &voice, 1.0);
            assert!(
                !cache.contains(&first_key),
                "First item should have been evicted"
            );

            // The newer items should still be in the cache
            let second_key = KokoroTTS::generate_cache_key("Cache eviction test 2", &voice, 1.0);
            let third_key = KokoroTTS::generate_cache_key("Cache eviction test 3", &voice, 1.0);

            assert!(
                cache.contains(&second_key) || cache.contains(&third_key),
                "At least one of the newer items should be in cache"
            );
        }

        Ok(())
    }

    #[test]
    #[ignore]
    fn test_cache_expiration() -> Result<(), TtsError> {
        let mut tts = match KokoroTTS::new() {
            Ok(tts) => tts,
            Err(e) => {
                return Err(TtsError::ModelLoadError(format!(
                    "Failed to initialize KokoroTTS: {}",
                    e
                )));
            }
        };

        // Set a short TTL for testing
        tts.cache_ttl = Duration::from_millis(50);

        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);
        let text = "Cache expiration test";
        let cache_key = KokoroTTS::generate_cache_key(text, &voice, 1.0);

        // Process text to add to cache
        let result = tts.process_tts(text, &voice, 1.0);
        assert!(result.is_ok(), "TTS processing should succeed");

        // Verify item is in cache
        {
            let cache = tts.cache.lock().unwrap();
            assert!(
                cache.contains(&cache_key),
                "Item should be in cache initially"
            );
        }

        // Wait for cache to expire
        thread::sleep(Duration::from_millis(60));

        // Now when we process again, it should regenerate and update the cache
        let result2 = tts.process_tts(text, &voice, 1.0);
        assert!(
            result2.is_ok(),
            "TTS processing after expiration should succeed"
        );

        // Verify the timestamp in the cache is recent
        {
            let cache = tts.cache.lock().unwrap();
            if let Some(entry) = cache.peek(&cache_key) {
                assert!(
                    entry.timestamp.elapsed() < Duration::from_millis(50),
                    "Cache entry should have a fresh timestamp"
                );
            } else {
                panic!("Item should still be in cache");
            }
        }

        Ok(())
    }

    #[test]
    fn test_thread_safety() {
        use std::sync::{Arc, Barrier};

        let tts = Arc::new(KokoroTTS::new().expect("Failed to initialize KokoroTTS"));
        let threads = 5;
        let barrier = Arc::new(Barrier::new(threads));
        let mut handles = Vec::new();

        for i in 0..threads {
            let tts_clone = Arc::clone(&tts);
            let barrier_clone = Arc::clone(&barrier);
            let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);

            let handle = thread::spawn(move || {
                // Wait for all threads to be ready
                barrier_clone.wait();

                // Access the cache from multiple threads
                let _cache_key =
                    KokoroTTS::generate_cache_key(&format!("Thread {}", i), &voice, 1.0);

                // This just verifies we can access the cache without panicking
                let result = tts_clone.cache.lock();
                assert!(
                    result.is_ok(),
                    "Thread {} should be able to lock the cache",
                    i
                );
            });

            handles.push(handle);
        }

        // Wait for all threads to complete
        for handle in handles {
            handle.join().unwrap();
        }
    }

    // Integration test for the full pipeline - marked as ignored
    #[test]
    fn test_full_pipeline() {
        use std::fs;
        use std::path::Path;

        let tts = KokoroTTS::new().expect("Failed to initialize KokoroTTS");

        // Create test output directory
        let test_dir = Path::new(&*ASSETS_PATH).join("test_output");
        fs::create_dir_all(&test_dir).expect("Failed to create test output directory");
        let output_path = test_dir.join("integration_test.wav");

        let voice = VoiceType::AmericanFemale(AmericanFemaleVoice::Bella);

        // Process text to speech
        let text = "This is a full pipeline integration test for the Kokoro TTS system.";
        let result = tts.process_tts(text, &voice, 1.0);
        assert!(result.is_ok(), "TTS processing should succeed");

        let audio_data = result.unwrap();
        assert!(!audio_data.is_empty(), "Audio data should not be empty");

        // Convert to WAV and save
        let wav_data = tts.audio_to_wav(audio_data.as_slice().unwrap());
        assert!(
            wav_data.len() > 44,
            "WAV data should be larger than header size"
        );

        // Save to specified location
        fs::write(&output_path, &wav_data).expect("Failed to write WAV file");

        println!("Saved integration test output to {:?}", output_path);
    }
}
