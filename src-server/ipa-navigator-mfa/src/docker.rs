//! Functions for interacting with MFA Docker container

use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::LazyLock;

/// Path to the UK English MFA dictionary
pub static UK_DICTIONARY_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from("src-server/assets/MFA_Dictionaries/english_uk_mfa.dict"));

/// Path to the US English MFA dictionary
pub static US_DICTIONARY_PATH: LazyLock<PathBuf> =
    LazyLock::new(|| PathBuf::from("src-server/assets/MFA_Dictionaries/english_us_mfa.dict"));

/// Name of the MFA development container
pub const MFA_CONTAINER_NAME: &str = "ipa-mfa-dev";

/// Supported dialects for MFA pronunciation dictionaries
#[derive(Debug, Clone, Copy)]
pub enum MfaDialect {
    /// American English (US)
    AmericanEnglish,
    /// British English (UK)
    BritishEnglish,
}

impl MfaDialect {
    /// Get the MFA dictionary name for this dialect
    pub fn dictionary_name(&self) -> &'static str {
        match self {
            MfaDialect::AmericanEnglish => "english_us_mfa",
            MfaDialect::BritishEnglish => "english_uk_mfa",
        }
    }

    /// Get the path to the dictionary file for this dialect
    pub fn dictionary_path(&self) -> &'static PathBuf {
        match self {
            MfaDialect::AmericanEnglish => &US_DICTIONARY_PATH,
            MfaDialect::BritishEnglish => &UK_DICTIONARY_PATH,
        }
    }
}

/// Standard acoustic model to use for all alignments
pub const DEFAULT_ACOUSTIC_MODEL: &str = "english_mfa";

/// Run MFA align using Docker to process a spoken word
///
/// # Arguments
/// * `job_dir` - Directory containing audio file and transcript
/// * `dialect` - Dialect to use for pronunciation
///
/// # Returns
/// Path to the generated TextGrid file
pub fn run_mfa_align(job_dir: impl AsRef<Path>, dialect: MfaDialect) -> Result<PathBuf> {
    let job_dir = job_dir.as_ref();

    // Get the dictionary name for the selected dialect
    let dictionary = dialect.dictionary_name();

    // Prepare MFA command to run inside the container
    // Convert the local path to the container path by replacing 'data' with '/data'
    let job_dir_str = job_dir.to_string_lossy();
    let container_job_path = if job_dir_str.starts_with("data/") {
        format!("/{}", job_dir_str)
    } else {
        return Err(anyhow::anyhow!(
            "Job directory must be within 'data/' directory: {}",
            job_dir.display()
        ));
    };

    // Prepare MFA command to run inside the container
    // Mount the job directory as /data/job in the container
    // Prepare MFA command to run inside the container
    let mfa_cmd = format!(
        "source /home/mfauser/miniconda3/etc/profile.d/conda.sh && \
        conda activate aligner && \
        mfa align {} {} {} {} --clean",
        container_job_path, dictionary, DEFAULT_ACOUSTIC_MODEL, container_job_path
    );

    // Execute the command in the existing container
    let output = Command::new("docker")
        .args(["exec", MFA_CONTAINER_NAME, "bash", "-c", &mfa_cmd])
        .output()
        .context("Failed to execute Docker command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("MFA align failed: {}", stderr));
    }

    // Find the TextGrid file in the output directory
    let mut textgrid_path = None;
    for entry in fs::read_dir(job_dir).context("Failed to read output directory")? {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "TextGrid") {
            textgrid_path = Some(path);
            break;
        }
    }

    match textgrid_path {
        Some(path) => Ok(path),
        None => Err(anyhow::anyhow!(
            "Expected TextGrid file not found after MFA align in {}",
            job_dir.display()
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    #[ignore]
    fn test_run_mfa_align() {
        if !docker_container_running() {
            println!(
                "Skipping test_run_mfa_align: Docker container '{}' is not running",
                MFA_CONTAINER_NAME
            );
            return;
        }

        let job_dir = PathBuf::from("data/test_job");
        fs::create_dir_all(&job_dir).expect("Failed to create job directory");

        fs::copy(PathBuf::from("tests/input.wav"), job_dir.join("input.wav"))
            .expect("Failed to copy input.wav");
        fs::copy(PathBuf::from("tests/input.lab"), job_dir.join("input.lab"))
            .expect("Failed to copy input.lab");

        // Run MFA align
        let result = run_mfa_align("data/test_job", MfaDialect::BritishEnglish);

        // Check if the alignment succeeded and produced a TextGrid file
        assert!(result.is_ok(), "MFA alignment failed: {:?}", result.err());

        let textgrid_path = result.unwrap();
        assert!(
            textgrid_path.exists(),
            "TextGrid file not created at {:?}",
            textgrid_path
        );

        // Verify the content of the TextGrid file
        let textgrid_content =
            fs::read_to_string(&textgrid_path).expect("Failed to read TextGrid file");
        assert!(
            textgrid_content.contains("File type"),
            "TextGrid file has invalid content"
        );

        // Copy the output TextGrid file back to the tests directory for reference
        let output_filename = textgrid_path.file_name().unwrap();
        let dest_path = PathBuf::from("tests").join(output_filename);

        fs::copy(&textgrid_path, &dest_path).expect("Failed to copy output TextGrid file");
    }

    /// Helper function to check if the MFA Docker container is running
    fn docker_container_running() -> bool {
        let output = Command::new("docker")
            .args([
                "ps",
                "--filter",
                &format!("name={}", MFA_CONTAINER_NAME),
                "--format",
                "{{.Names}}",
            ])
            .output()
            .expect("Failed to execute docker ps command");

        if !output.status.success() {
            return false;
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        !output_str.trim().is_empty()
    }
}
