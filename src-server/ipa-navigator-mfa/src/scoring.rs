//! Functions for scoring phoneme accuracy by comparing MFA results with expected pronunciations

use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};

use crate::docker::MfaDialect;
use crate::mfa_parser::{MfaSegment, parse_textgrid};
use crate::phoneme::{
    IPA_PHONEME_FEATURES, PhonemeFeatures, arpa_to_ipa, calculate_feature_similarity,
};

/// Dictionary entry mapping a word to its phonemes
#[derive(Debug, Clone)]
pub struct DictionaryEntry {
    pub word: String,
    pub phonemes: Vec<String>,
}

/// Detailed information about individual phoneme accuracy
#[derive(Debug, Clone)]
pub struct PhonemeAccuracy {
    pub expected: String,
    pub actual: String,
    pub actual_arpa: String,
    pub score: f64,
    pub start_time: f64,
    pub end_time: f64,
}

/// Overall pronunciation assessment result
#[derive(Debug, Clone)]
pub struct PronunciationAssessment {
    pub overall_score: f64,
    pub phoneme_details: Vec<PhonemeAccuracy>,
    pub transcript: String, // The original text being spoken
}

/// Score the pronunciation accuracy based on phonemes in a TextGrid file
pub fn score_phoneme_accuracy(
    textgrid_path: impl AsRef<Path>,
    dialect: MfaDialect,
) -> Result<PronunciationAssessment> {
    // Load the dictionary
    let dictionary = load_dictionary(dialect)?;

    // Parse the TextGrid file
    let segments = parse_textgrid(textgrid_path.as_ref())?;

    // Extract actual phonemes from MFA output
    let actual_phonemes: Vec<&MfaSegment> = segments
        .iter()
        .filter(|s| s.segment_type == "phone" && !s.label.is_empty())
        .collect();

    // Get expected phonemes from dictionary based on transcript words
    let transcript_path = textgrid_path.as_ref().with_extension("lab");
    let transcript = std::fs::read_to_string(&transcript_path)
        .with_context(|| format!("Failed to read transcript file: {:?}", transcript_path))?;

    let mut expected_phonemes = Vec::new();
    for word in transcript.split_whitespace() {
        let word_lower = word.to_lowercase();
        // Remove any non-alphabetic characters
        let word_clean: String = word_lower.chars().filter(|c| c.is_alphabetic()).collect();

        if let Some(phonemes) = dictionary.get(&word_clean) {
            expected_phonemes.extend(phonemes.clone());
        }
    }

    // Compare expected vs. actual phonemes
    let mut phoneme_details = Vec::new();
    let min_len = expected_phonemes.len().min(actual_phonemes.len());

    // Match phonemes one-by-one as best we can
    for i in 0..min_len {
        let expected_ipa = &expected_phonemes[i];
        let actual_segment = actual_phonemes[i];
        let actual_arpa = actual_segment.label.clone();

        // Convert ARPAbet to IPA for the actual phoneme
        let actual_ipa = arpa_to_ipa(&actual_arpa).unwrap_or("unknown").to_string();

        // Calculate similarity between IPA phonemes
        let similarity = phoneme_similarity(expected_ipa, &actual_ipa);

        phoneme_details.push(PhonemeAccuracy {
            expected: expected_ipa.clone(),
            actual: actual_ipa,
            actual_arpa,
            score: similarity,
            start_time: actual_segment.begin,
            end_time: actual_segment.end,
        });
    }

    // Handle remaining expected phonemes (missing in actual)
    for i in min_len..expected_phonemes.len() {
        phoneme_details.push(PhonemeAccuracy {
            expected: expected_phonemes[i].clone(),
            actual: String::new(),
            actual_arpa: String::new(),
            score: 0.0, // Missing phoneme = 0 score
            start_time: 0.0,
            end_time: 0.0,
        });
    }

    // Handle additional actual phonemes (not expected)
    for i in min_len..actual_phonemes.len() {
        let actual_segment = actual_phonemes[i];
        let actual_arpa = actual_segment.label.clone();
        let actual_ipa = arpa_to_ipa(&actual_arpa).unwrap_or("unknown").to_string();

        phoneme_details.push(PhonemeAccuracy {
            expected: String::new(),
            actual: actual_ipa,
            actual_arpa,
            score: 0.0, // Extra phoneme = 0 score
            start_time: actual_segment.begin,
            end_time: actual_segment.end,
        });
    }

    // Calculate overall score
    let overall_score = if phoneme_details.is_empty() {
        0.0
    } else {
        phoneme_details.iter().map(|p| p.score).sum::<f64>() / phoneme_details.len() as f64
    };

    Ok(PronunciationAssessment {
        overall_score,
        phoneme_details,
        transcript: transcript.to_string(),
    })
}

/// Calculate phoneme similarity based on phonetic features
pub fn phoneme_similarity(a: &str, b: &str) -> f64 {
    // If strings are identical, return perfect score
    if a == b {
        return 1.0;
    }

    // Get features for each phoneme
    let default_features = PhonemeFeatures::default();
    let a_features = IPA_PHONEME_FEATURES.get(a).unwrap_or(&default_features);
    let b_features = IPA_PHONEME_FEATURES.get(b).unwrap_or(&default_features);

    // Calculate similarity based on shared features
    calculate_feature_similarity(a_features, b_features)
}

/// Load the pronunciation dictionary for the given dialect
pub fn load_dictionary(dialect: MfaDialect) -> Result<HashMap<String, Vec<String>>> {
    let dict_path = dialect.dictionary_path();

    let file = File::open(dict_path)
        .with_context(|| format!("Failed to open dictionary file: {:?}", dict_path))?;

    let reader = BufReader::new(file);
    let mut dictionary = HashMap::new();

    for line in reader.lines() {
        let line = line?;
        let parts: Vec<&str> = line.trim().split_whitespace().collect();

        if parts.len() >= 2 {
            let word = parts[0].to_lowercase();

            // Extract only the phoneme symbols, filtering out numeric values
            let phonemes: Vec<String> = parts[1..]
                .iter()
                .filter_map(|s| {
                    // Try to parse as float to check if it's a numeric value
                    if s.parse::<f64>().is_ok() {
                        None // Skip numeric values
                    } else {
                        Some(s.to_string()) // Keep phoneme symbols
                    }
                })
                .collect();

            dictionary.insert(word, phonemes);
        }
    }

    Ok(dictionary)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::docker::MfaDialect;

    #[test]
    fn test_load_dictionary() -> Result<()> {
        // Test loading US dictionary
        let us_dict = load_dictionary(MfaDialect::AmericanEnglish)?;
        assert!(!us_dict.is_empty(), "US dictionary should not be empty");

        // Check for common words
        assert!(
            us_dict.contains_key("hello"),
            "Dictionary should contain 'hello'"
        );

        // Test loading UK dictionary
        let uk_dict = load_dictionary(MfaDialect::BritishEnglish)?;
        assert!(!uk_dict.is_empty(), "UK dictionary should not be empty");

        Ok(())
    }

    #[test]
    fn test_dictionary_entry_content() -> Result<()> {
        // Test specific entries from the dictionary
        let us_dict = load_dictionary(MfaDialect::AmericanEnglish)?;

        // Check for "hello" and verify its phonemes
        if let Some(hello_phonemes) = us_dict.get("hello") {
            println!("Phonemes for 'hello': {:?}", hello_phonemes);
            assert!(
                !hello_phonemes.is_empty(),
                "Should have phonemes for 'hello'"
            );

            assert!(hello_phonemes.join(" ") == vec!["h", "ə", "l", "ow"].join(" "))
        } else {
            assert!(false, "Dictionary should contain 'hello'");
        }

        // Check for "world" and verify its phonemes
        if let Some(world_phonemes) = us_dict.get("world") {
            println!("Phonemes for 'world': {:?}", world_phonemes);
            assert!(
                !world_phonemes.is_empty(),
                "Should have phonemes for 'world'"
            );

            assert!(world_phonemes.join(" ") == vec!["w", "ɝ", "ɫ", "d"].join(" "))
        } else {
            assert!(false, "Dictionary should contain 'world'");
        }

        Ok(())
    }

    #[test]
    fn test_phoneme_similarity_exact_match() {
        // Test exact matches for different phonemes
        assert_eq!(
            phoneme_similarity("p", "p"),
            1.0,
            "Identical consonants should match exactly"
        );
        assert_eq!(
            phoneme_similarity("a", "a"),
            1.0,
            "Identical vowels should match exactly"
        );
        assert_eq!(
            phoneme_similarity("ŋ", "ŋ"),
            1.0,
            "Identical special symbols should match exactly"
        );
    }

    #[test]
    fn test_phoneme_similarity_consonant_pairs() {
        // Test pairs of consonants with different relationships

        // Test voice pairs (should be somewhat similar)
        let voiced_voiceless = phoneme_similarity("b", "p");
        assert!(
            voiced_voiceless > 0.5,
            "Voice pairs should be similar: {}",
            voiced_voiceless
        );
        assert!(
            voiced_voiceless < 1.0,
            "Voice pairs should not be identical: {}",
            voiced_voiceless
        );

        // Test same place but different manner
        let plosive_nasal = phoneme_similarity("b", "m");
        assert!(
            plosive_nasal > 0.2,
            "Same place phonemes should have some similarity: {}",
            plosive_nasal
        );

        // Test different place but same manner
        let different_place = phoneme_similarity("p", "t");
        assert!(
            different_place > 0.2,
            "Same manner phonemes should have some similarity: {}",
            different_place
        );

        // Test completely different consonants
        let completely_different = phoneme_similarity("p", "z");
        assert!(
            completely_different < voiced_voiceless,
            "Very different consonants should be less similar than voice pairs: {}",
            completely_different
        );
    }

    #[test]
    fn test_phoneme_similarity_vowel_pairs() {
        // Test pairs of vowels with different relationships

        // Test height neighbors
        let height_neighbors = phoneme_similarity("i", "e");
        assert!(
            height_neighbors > 0.4,
            "Vowel height neighbors should be similar: {}",
            height_neighbors
        );

        // Test backness neighbors
        let backness_neighbors = phoneme_similarity("e", "ə");
        assert!(
            backness_neighbors > 0.4,
            "Vowel backness neighbors should be similar: {}",
            backness_neighbors
        );

        // Test rounding pairs
        let rounded_unrounded = phoneme_similarity("u", "i");
        assert!(
            rounded_unrounded > 0.2,
            "Vowels differing mainly in rounding should have some similarity: {}",
            rounded_unrounded
        );

        // Test very different vowels
        let very_different_vowels = phoneme_similarity("i", "ɑ");
        assert!(
            very_different_vowels < height_neighbors,
            "Very different vowels should be less similar than height neighbors: {}",
            very_different_vowels
        );
    }

    #[test]
    fn test_phoneme_similarity_vowel_consonant_pairs() {
        // Vowels and consonants should have minimal similarity
        let vowel_consonant = phoneme_similarity("a", "p");
        assert!(
            vowel_consonant < 0.3,
            "Vowels and consonants should have low similarity: {}",
            vowel_consonant
        );
    }

    #[test]
    fn test_phoneme_similarity_unknown_phonemes() {
        // Test with unknown phonemes
        assert!(
            phoneme_similarity("unknown", "p") < 0.5,
            "Unknown phoneme should have low similarity to any real phoneme"
        );
        assert_eq!(
            phoneme_similarity("unknown", "unknown"),
            1.0,
            "Unknown phoneme should match itself"
        );

        // Test with phoneme not in the features map
        assert!(
            phoneme_similarity("xyz", "p") < 0.5,
            "Non-existent phoneme should have low similarity to any real phoneme"
        );
    }
}
