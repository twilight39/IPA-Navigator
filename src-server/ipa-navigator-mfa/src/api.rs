//! API module for the MFA pipeline

use anyhow::{Context, Result};
use std::fs;
use tempfile::{TempDir, tempdir};
use uuid::Uuid;

use crate::docker::{MfaDialect, run_mfa_align};
use crate::scoring::{PronunciationAssessment, score_phoneme_accuracy};

/// Represents an MFA job to process audio
pub struct MfaJob {
    job_dir: TempDir,
    dialect: MfaDialect,
}

/// Result of an MFA pronunciation assessment
#[derive(Debug, Clone)]
pub struct MfaResult {
    pub assessment: PronunciationAssessment,
    pub job_id: String,
}

impl MfaJob {
    /// Create a new MFA job
    ///
    /// # Arguments
    /// * `audio_data` - The raw audio data (WAV format expected)
    /// * `transcript` - The plain text transcript of the audio
    /// * `dialect` - The dialect to use for pronunciation scoring
    ///
    /// # Returns
    /// A new MfaJob instance
    pub fn new(audio_data: &[u8], transcript: &str, dialect: MfaDialect) -> Result<Self> {
        // Create a temporary directory for this job
        let job_dir = tempdir().context("Failed to create temporary directory for MFA job")?;

        let job_id = Uuid::new_v4().to_string();

        // Write audio file
        let audio_path = job_dir.path().join(format!("{}.wav", job_id));
        fs::write(&audio_path, audio_data)
            .with_context(|| format!("Failed to write audio file to {:?}", audio_path))?;

        // Write transcript file (.lab extension for MFA compatibility)
        let transcript_path = job_dir.path().join(format!("{}.lab", job_id));
        fs::write(&transcript_path, transcript)
            .with_context(|| format!("Failed to write transcript file to {:?}", transcript_path))?;

        Ok(Self { job_dir, dialect })
    }

    /// Process the job through the MFA pipeline
    pub fn process(&self) -> Result<MfaResult> {
        // Run MFA alignment
        let textgrid_path = run_mfa_align(self.job_dir.path(), self.dialect)?;

        // Score the pronunciation
        let assessment = score_phoneme_accuracy(&textgrid_path, self.dialect)?;

        Ok(MfaResult {
            assessment,
            job_id: self
                .job_dir
                .path()
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
        })
    }
}

/// Convenience function to run the entire MFA pipeline in one call
///
/// # Arguments
/// * `audio_data` - The raw audio data (WAV format expected)
/// * `transcript` - The plain text transcript of the audio
/// * `dialect` - The dialect to use for pronunciation scoring
///
/// # Returns
/// Assessment results including overall score and phoneme-level details
pub fn assess_pronunciation(
    audio_data: &[u8],
    transcript: &str,
    dialect: MfaDialect,
) -> Result<PronunciationAssessment> {
    let job = MfaJob::new(audio_data, transcript, dialect)?;
    let result = job.process()?;
    Ok(result.assessment)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn test_mfa_job_creation() {
        let audio_data = b"fake audio data";
        let transcript = "hello world";

        let job = MfaJob::new(audio_data, transcript, MfaDialect::AmericanEnglish);
        assert!(job.is_ok(), "Should create MFA job successfully");

        let job = job.unwrap();
        let dir_path = job.job_dir.path();

        // Find WAV file and check content
        let wav_file = fs::read_dir(dir_path)
            .unwrap()
            .find_map(|entry| {
                let path = entry.unwrap().path();
                if path.extension().map_or(false, |ext| ext == "wav") {
                    Some(path)
                } else {
                    None
                }
            })
            .expect("Should have a WAV file in the job directory");

        let wav_content = fs::read(wav_file).unwrap();
        assert_eq!(
            wav_content, audio_data,
            "WAV file should have the right content"
        );

        // Find LAB file and check content
        let lab_file = fs::read_dir(dir_path)
            .unwrap()
            .find_map(|entry| {
                let path = entry.unwrap().path();
                if path.extension().map_or(false, |ext| ext == "lab") {
                    Some(path)
                } else {
                    None
                }
            })
            .expect("Should have a LAB file in the job directory");

        let lab_content = fs::read_to_string(lab_file).unwrap();
        assert_eq!(
            lab_content, transcript,
            "LAB file should have the right content"
        );
    }

    #[test]
    #[ignore = "Requires MFA to be installed"]
    fn test_full_pipeline() {
        // This test would need a real audio file
        let audio_path = PathBuf::from("tests/input.wav");
        if !audio_path.exists() {
            return; // Skip if test audio not available
        }

        let audio_data = fs::read(audio_path).unwrap();
        let transcript = "This is a test sentence.";

        let result = assess_pronunciation(&audio_data, transcript, MfaDialect::BritishEnglish);

        assert!(result.is_ok(), "Should complete pronunciation assessment");

        let assessment = result.unwrap();
        println!("Assessment Result: {:?}", assessment);
        assert!(assessment.overall_score >= 0.0, "Should have a valid score");
        assert!(
            !assessment.phoneme_details.is_empty(),
            "Should have phoneme details"
        );
    }
}
