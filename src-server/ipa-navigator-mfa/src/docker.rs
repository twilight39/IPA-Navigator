//! Functions for interacting with MFA Docker container

use crate::constants::ASSETS_PATH;
use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::LazyLock;

/// Path to the UK English MFA dictionary
pub static UK_DICTIONARY_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    PathBuf::from(format!(
        "{}/MFA_Dictionaries/english_uk_mfa.dict",
        *ASSETS_PATH
    ))
});

/// Path to the US English MFA dictionary
pub static US_DICTIONARY_PATH: LazyLock<PathBuf> = LazyLock::new(|| {
    PathBuf::from(format!(
        "{}/MFA_Dictionaries/english_us_mfa.dict",
        *ASSETS_PATH
    ))
});

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

/// Run MFA align using Docker or direct command to process audio
///
/// # Arguments
/// * `job_dir` - Directory containing audio file and transcript
/// * `dialect` - Dialect to use for pronunciation
///
/// # Returns
/// Path to the generated TextGrid file
pub fn run_mfa_align(job_dir: impl AsRef<Path>, dialect: MfaDialect) -> Result<PathBuf> {
    let job_dir = job_dir.as_ref();

    // Check if we're inside a Docker container
    if is_running_in_docker() {
        dbg!("Running in Docker container");
        // Running inside Docker - try to run MFA directly if it's installed
        run_mfa_align_container(job_dir, dialect)
    } else {
        dbg!("Running on host machine");
        // Running on host - use Docker exec approach
        run_mfa_align_local(job_dir, dialect)
    }
}

/// Check if we're running inside a Docker container
fn is_running_in_docker() -> bool {
    Path::new("/.dockerenv").exists()
        || fs::read_to_string("/proc/1/cgroup")
            .map(|s| s.contains("/docker/"))
            .unwrap_or(false)
}

/// Run MFA align directly (when inside the container)
fn run_mfa_align_container(job_dir: &Path, dialect: MfaDialect) -> Result<PathBuf> {
    let dictionary = dialect.dictionary_name();

    // Assume MFA is installed and in PATH
    let mfa_cmd = format!(
        "source ~/miniconda3/etc/profile.d/conda.sh && \
        conda activate aligner && \
        mfa align {} {} {} {} --include-original-text --clean",
        job_dir.display(),
        dictionary,
        DEFAULT_ACOUSTIC_MODEL,
        job_dir.display()
    );

    // Execute the command directly
    let output = Command::new("bash")
        .args(["-c", &mfa_cmd])
        .output()
        .context("Failed to execute MFA command directly")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("MFA align failed: {}", stderr));
    }

    find_textgrid_file(job_dir)
}

/// Run MFA align locally (when on host)
fn run_mfa_align_local(job_dir: &Path, dialect: MfaDialect) -> Result<PathBuf> {
    let dictionary = dialect.dictionary_name();

    // Prepare MFA command to run locally
    let mfa_cmd = format!(
        "source ~/.zshrc && \
        conda activate aligner && \
        mfa align {} {} {} {} --clean --include-original-text",
        job_dir.display(),
        dictionary,
        DEFAULT_ACOUSTIC_MODEL,
        job_dir.display()
    );

    // Execute the command locally
    let output = Command::new("zsh")
        .args(["-c", &mfa_cmd])
        .output()
        .context("Failed to execute MFA command locally")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("MFA align failed: {}", stderr));
    }

    find_textgrid_file(job_dir)
}

/// Helper function to find the TextGrid file in a directory
fn find_textgrid_file(dir: &Path) -> Result<PathBuf> {
    for entry in fs::read_dir(dir).context("Failed to read directory")? {
        let entry = entry.context("Failed to read directory entry")?;
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "TextGrid") {
            return Ok(path);
        }
    }

    Err(anyhow::anyhow!(
        "Expected TextGrid file not found in {}",
        dir.display()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    #[ignore]
    fn test_run_mfa_align() {
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
}
