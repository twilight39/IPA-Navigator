//! Functions for interacting with Docker containers

use anyhow::{Context, Result};
use std::process::Command;

/// Handles Docker container interactions
pub struct DockerRunner {
    /// The name of the Docker container to interact with
    container_name: String,
}

impl DockerRunner {
    /// Create a new Docker runner with the specified container name
    pub fn new(container_name: impl Into<String>) -> Self {
        Self {
            container_name: container_name.into(),
        }
    }

    /// Check if the container is running
    pub fn is_running(&self) -> Result<bool> {
        let output = Command::new("docker")
            .args(["ps", "-q", "-f", &format!("name={}", self.container_name)])
            .output()
            .context("Failed to execute docker ps command")?;

        Ok(!output.stdout.is_empty())
    }

    /// Run the MFA align command in the Docker container
    pub fn run_mfa_align(
        &self,
        corpus_path: &str,
        dict_path: &str,
        acoustic_model: &str,
        output_path: &str,
    ) -> Result<()> {
        println!(
            "Running MFA align with:\nCorpus: {}\nDict: {}\nModel: {}\nOutput: {}",
            corpus_path, dict_path, acoustic_model, output_path
        );

        // Create a command that sources conda and runs mfa in the right environment
        let mfa_command = format!(
            "source /home/mfauser/miniconda3/etc/profile.d/conda.sh && \
                 conda activate aligner && \
                 mfa align {} {} {} {}",
            corpus_path, dict_path, acoustic_model, output_path
        );

        let status = Command::new("docker")
            .args(["exec", &self.container_name, "bash", "-c", &mfa_command])
            .status()
            .context("Failed to execute mfa align command in Docker container")?;

        if !status.success() {
            return Err(anyhow::anyhow!(
                "mfa align failed with exit code: {:?}",
                status.code()
            ));
        }

        Ok(())
    }

    /// Execute a command in the Docker container
    pub fn exec_command(&self, command: &str) -> Result<String> {
        let output = Command::new("docker")
            .args(["exec", &self.container_name, "bash", "-c", command])
            .output()
            .context("Failed to execute command in Docker container")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!(
                "Command failed with exit code {:?}: {}",
                output.status.code(),
                stderr
            ));
        }

        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use std::path::{Path, PathBuf};

    // Helper function to copy a file
    fn copy_file(from: impl AsRef<Path>, to: impl AsRef<Path>) -> Result<()> {
        fs::copy(&from, &to).with_context(|| {
            format!(
                "Failed to copy from {:?} to {:?}",
                from.as_ref(),
                to.as_ref()
            )
        })?;
        Ok(())
    }

    #[test]
    #[ignore = "Requires Docker container to be running"]
    fn test_docker_runner_integration() -> Result<()> {
        // Define paths for test files
        let tests_dir = PathBuf::from("tests");
        let data_dir = PathBuf::from("data");

        // Create test input and output directories
        let input_dir = data_dir.join("input").join("test_mfa");
        let output_dir = data_dir.join("output").join("test_mfa");

        // Create directories if they don't exist
        fs::create_dir_all(&input_dir).context("Failed to create input directory")?;
        fs::create_dir_all(&output_dir).context("Failed to create output directory")?;

        println!(
            "Created test directories: {:?}, {:?}",
            input_dir, output_dir
        );

        // Verify the test audio file exists
        let test_audio_file = tests_dir.join("input.wav");
        if !test_audio_file.exists() {
            return Err(anyhow::anyhow!(
                "Test audio file not found at: {}",
                test_audio_file.display()
            ));
        }

        // Create a transcript file for the test
        let test_transcript_content = "This is a test sentence.";
        let test_transcript_file = tests_dir.join("input.lab");
        fs::write(&test_transcript_file, test_transcript_content)
            .context("Failed to create test transcript file")?;

        // Copy files to the data/input/test_mfa directory
        let input_audio_file = input_dir.join("input.wav");
        let input_transcript_file = input_dir.join("input.lab");

        copy_file(&test_audio_file, &input_audio_file)?;
        copy_file(&test_transcript_file, &input_transcript_file)?;

        println!(
            "Copied test files to input directory: {:?}, {:?}",
            input_audio_file, input_transcript_file
        );

        // Create a log file for the test
        let log_file = tests_dir.join("mfa_test.log");
        let mut log = fs::File::create(&log_file).context("Failed to create log file")?;

        writeln!(log, "MFA Docker Integration Test").context("Failed to write to log file")?;
        writeln!(log, "========================").context("Failed to write to log file")?;
        writeln!(
            log,
            "Test started at: {}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        )
        .context("Failed to write to log file")?;

        // Setup container name
        let container_name = "ipa-mfa-dev";
        let docker_runner = DockerRunner::new(container_name);

        writeln!(log, "Using container: {}", container_name)
            .context("Failed to write to log file")?;

        // Check if Docker is available
        let docker_version = Command::new("docker").arg("--version").output();
        match docker_version {
            Ok(output) => {
                let version = String::from_utf8_lossy(&output.stdout);
                writeln!(log, "Docker version: {}", version.trim())
                    .context("Failed to write to log file")?;
            }
            Err(_) => {
                writeln!(log, "Docker not available. Skipping test.")
                    .context("Failed to write to log file")?;
                return Ok(());
            }
        }

        // Check if the container exists and is running
        let is_running = docker_runner.is_running()?;
        writeln!(log, "Container running: {}", is_running)
            .context("Failed to write to log file")?;

        if !is_running {
            // Check if container exists but is not running
            let exists = Command::new("docker")
                .args(["ps", "-a", "-q", "-f", &format!("name={}", container_name)])
                .output()
                .map(|output| !output.stdout.is_empty())
                .unwrap_or(false);

            if exists {
                writeln!(log, "Starting container...").context("Failed to write to log file")?;
                let start_status = Command::new("docker")
                    .args(["start", container_name])
                    .status()
                    .context("Failed to start container")?;

                if !start_status.success() {
                    writeln!(log, "Failed to start container. Skipping test.")
                        .context("Failed to write to log file")?;
                    return Ok(());
                }

                writeln!(log, "Container started successfully")
                    .context("Failed to write to log file")?;
            } else {
                writeln!(log, "Container does not exist. Skipping test.")
                    .context("Failed to write to log file")?;
                return Ok(());
            }
        }

        // Define the Docker container paths for MFA
        let container_input_path = "/data/input/test_mfa";
        let container_output_path = "/data/output/test_mfa";
        let container_dict_path = "english_uk_mfa";

        // Run MFA align
        writeln!(log, "Running MFA alignment with:").context("Failed to write to log file")?;
        writeln!(log, "  Corpus: {}", container_input_path)
            .context("Failed to write to log file")?;
        writeln!(log, "  Dictionary: {}", container_dict_path)
            .context("Failed to write to log file")?;
        writeln!(log, "  Output: {}", container_output_path)
            .context("Failed to write to log file")?;

        let result = docker_runner.run_mfa_align(
            container_input_path,
            container_dict_path,
            "english_mfa",
            container_output_path,
        );

        match &result {
            Ok(_) => writeln!(log, "MFA alignment completed successfully")
                .context("Failed to write to log file")?,
            Err(e) => writeln!(log, "MFA alignment failed: {}", e)
                .context("Failed to write to log file")?,
        };

        // Check if output files were created
        match docker_runner.exec_command(&format!("ls -la {}", container_output_path)) {
            Ok(listing) => {
                writeln!(log, "Output directory listing:")
                    .context("Failed to write to log file")?;
                writeln!(log, "{}", listing).context("Failed to write to log file")?;
            }
            Err(e) => writeln!(log, "Failed to list output directory: {}", e)
                .context("Failed to write to log file")?,
        };

        // Check for TextGrid file
        let local_textgrid_files = match fs::read_dir(&output_dir) {
            Ok(entries) => {
                let textgrid_files: Vec<_> = entries
                    .filter_map(|entry| {
                        entry.ok().and_then(|e| {
                            let path = e.path();
                            if path.extension().map_or(false, |ext| ext == "TextGrid") {
                                Some(path)
                            } else {
                                None
                            }
                        })
                    })
                    .collect();

                writeln!(
                    log,
                    "Found {} TextGrid files locally:",
                    textgrid_files.len()
                )
                .context("Failed to write to log file")?;

                for path in &textgrid_files {
                    writeln!(log, "  {}", path.display()).context("Failed to write to log file")?;
                }

                textgrid_files
            }
            Err(e) => {
                writeln!(log, "Failed to read output directory: {}", e)
                    .context("Failed to write to log file")?;
                Vec::new()
            }
        };

        // Test completed
        writeln!(
            log,
            "Test completed at: {}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        )
        .context("Failed to write to log file")?;

        println!("Test completed, log saved to: {}", log_file.display());
        println!("Output files should be in: {}", output_dir.display());

        Ok(())
    }
}
