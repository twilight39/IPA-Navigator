//! Functions for creating and managing corpus files for MFA

use anyhow::{Context, Result};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use uuid::Uuid;

/// Struct to build a corpus for MFA alignment
pub struct CorpusBuilder {
    base_dir: PathBuf,
    job_id: String,
}

impl CorpusBuilder {
    /// Create a new corpus builder with a random job ID
    pub fn new(base_dir: impl AsRef<Path>) -> Self {
        Self {
            base_dir: base_dir.as_ref().to_path_buf(),
            job_id: Uuid::new_v4().to_string(),
        }
    }

    /// Get the corpus directory path
    pub fn corpus_dir(&self) -> PathBuf {
        self.base_dir
            .join("input")
            .join("corpus")
            .join(&self.job_id)
    }

    /// Create the corpus directory
    fn create_dirs(&self) -> Result<()> {
        let corpus_dir = self.corpus_dir();
        fs::create_dir_all(&corpus_dir)
            .with_context(|| format!("Failed to create corpus directory at {:?}", corpus_dir))?;

        let output_dir = self.base_dir.join("output").join(&self.job_id);
        fs::create_dir_all(&output_dir)
            .with_context(|| format!("Failed to create output directory at {:?}", output_dir))?;

        Ok(())
    }

    /// Save audio file to corpus directory
    pub fn save_audio(&self, audio_data: &[u8], filename: &str) -> Result<PathBuf, anyhow::Error> {
        let audio_path = self.corpus_dir().join(filename);
        fs::write(&audio_path, audio_data)
            .with_context(|| format!("Failed to write audio file to {:?}", audio_path))?;
        Ok(audio_path)
    }

    /// Save phoneme transcription to corpus directory
    pub fn save_transcript(
        &self,
        phonemes: &str,
        filename: &str,
    ) -> Result<PathBuf, anyhow::Error> {
        let lab_path = self.corpus_dir().join(filename.replace(".wav", ".lab"));

        let mut file = File::create(&lab_path)
            .with_context(|| format!("Failed to create transcript file at {:?}", lab_path))?;

        file.write_all(phonemes.as_bytes())
            .with_context(|| "Failed to write phonemes to transcript file")?;

        Ok(lab_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_corpus_builder_new() {
        let temp_dir = tempdir().unwrap();
        let base_path = temp_dir.path();

        let builder = CorpusBuilder::new(base_path);

        // Check that job_id is a valid UUID
        let job_id = builder.job_id.clone();
        assert_eq!(job_id.len(), 36, "job_id should be a UUID of length 36");

        // Check that corpus_dir path is correctly formed
        let corpus_dir = builder.corpus_dir();
        assert!(corpus_dir.starts_with(base_path));
        assert!(corpus_dir.to_string_lossy().contains("input/corpus"));
    }

    #[test]
    fn test_save_audio() {
        let temp_dir = tempdir().unwrap();
        let base_path = temp_dir.path();

        let builder = CorpusBuilder::new(base_path);
        builder.create_dirs().unwrap();

        let test_audio = b"This is fake audio data";
        let filename = "test.wav";

        let audio_path = builder.save_audio(test_audio, filename).unwrap();

        // Check if file was created with correct content
        assert!(audio_path.exists(), "Audio file should exist");
        let saved_content = fs::read(&audio_path).unwrap();
        assert_eq!(
            &saved_content, test_audio,
            "Saved audio content should match input"
        );
    }

    #[test]
    fn test_save_transcript() {
        let temp_dir = tempdir().unwrap();
        let base_path = temp_dir.path();

        let builder = CorpusBuilder::new(base_path);
        builder.create_dirs().unwrap();

        let test_phonemes = "h ɛ l oʊ";
        let audio_filename = "hello.wav";

        let transcript_path = builder
            .save_transcript(test_phonemes, audio_filename)
            .unwrap();

        // Check if file was created with the right name and content
        assert!(transcript_path.exists(), "Transcript file should exist");
        assert_eq!(
            transcript_path.file_name().unwrap(),
            "hello.lab",
            "Transcript filename should be changed from .wav to .lab"
        );

        let saved_content = fs::read_to_string(&transcript_path).unwrap();
        assert_eq!(
            &saved_content, test_phonemes,
            "Saved transcript content should match input"
        );
    }
}
