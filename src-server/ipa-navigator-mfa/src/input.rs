//! Functions for preparing input files for MFA

use anyhow::{Context, Result};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Handles preparation of input files for MFA
pub struct InputPreparer {
    dict_dir: PathBuf,
}

#[derive(Debug, Clone, Copy)]
pub enum EnglishDialect {
    US,
    UK,
}

impl InputPreparer {
    /// Create a new input preparer
    pub fn new(dict_dir: impl AsRef<Path>) -> Self {
        Self {
            dict_dir: dict_dir.as_ref().to_path_buf(),
        }
    }

    /// Get the path to the dictionary file for the specified dialect
    pub fn get_dictionary_path(&self, dialect: EnglishDialect) -> PathBuf {
        match dialect {
            EnglishDialect::US => self.dict_dir.join("en_us.dict"),
            EnglishDialect::UK => self.dict_dir.join("en_uk.dict"),
        }
    }

    /// Create a transcript file with plain text
    pub fn create_transcript_file(&self, text: &str, output_path: &Path) -> Result<PathBuf> {
        fs::write(output_path, text)
            .with_context(|| format!("Failed to write transcript file to {:?}", output_path))?;
        Ok(output_path.to_path_buf())
    }

    /// Extract words from a transcript
    pub fn extract_words(&self, text: &str) -> Vec<String> {
        text.split_whitespace()
            .map(|word| {
                // Remove punctuation and convert to lowercase
                word.chars()
                    .filter(|&c| c.is_alphanumeric() || c == '\'')
                    .collect::<String>()
                    .to_lowercase()
            })
            .filter(|word| !word.is_empty())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use std::process::Command;
    use tempfile::tempdir;

    #[test]
    fn test_dictionary_path() {
        let temp_dir = tempdir().unwrap();
        let dict_dir = temp_dir.path();

        let preparer = InputPreparer::new(dict_dir);

        // Test US dictionary path
        let us_path = preparer.get_dictionary_path(EnglishDialect::US);
        assert_eq!(us_path.file_name().unwrap(), "en_us.dict");

        // Test UK dictionary path
        let uk_path = preparer.get_dictionary_path(EnglishDialect::UK);
        assert_eq!(uk_path.file_name().unwrap(), "en_uk.dict");
    }

    #[test]
    fn test_create_transcript_file() {
        let temp_dir = tempdir().unwrap();
        let preparer = InputPreparer::new(temp_dir.path());

        let text = "This is a sample transcript.";
        let output_path = temp_dir.path().join("transcript.txt");

        let result = preparer.create_transcript_file(text, &output_path);
        assert!(result.is_ok(), "Should successfully create transcript file");

        // Verify file was created
        assert!(output_path.exists(), "Transcript file should exist");

        // Check content
        let content = fs::read_to_string(&output_path).unwrap();
        assert_eq!(content, text, "File content should match input text");
    }

    #[test]
    fn test_extract_words() {
        let temp_dir = tempdir().unwrap();
        let preparer = InputPreparer::new(temp_dir.path());

        let text = "Hello, world! This is a test. It's working.";
        let words = preparer.extract_words(text);

        let expected = vec![
            "hello".to_string(),
            "world".to_string(),
            "this".to_string(),
            "is".to_string(),
            "a".to_string(),
            "test".to_string(),
            "it's".to_string(),
            "working".to_string(),
        ];

        assert_eq!(words, expected, "Should extract words correctly");
    }
}
