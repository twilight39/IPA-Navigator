use espeak_rs::text_to_phonemes;

/// Converts a string of text into a vector of phonemes using the specified language.
pub fn text_to_phonemes_string(text: &str, lang: &str) -> Result<String, String> {
    text_to_phonemes(text, lang, None, true, false)
        .map(|phonemes| phonemes.join(""))
        .map_err(|err| format!("Phonemizer error: {}", err))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_text_to_phonemes_string() {
        let text = "Hello, world!";
        let lang = "en-us";
        let phonemes = text_to_phonemes_string(text, lang).unwrap();
        assert!(!phonemes.is_empty(), "Phonemes should not be empty");
    }

    #[test]
    fn test_invalid_language() {
        let text = "Hello, world!";
        let lang = "invalid-lang";
        let result = text_to_phonemes_string(text, lang);
        assert!(
            result.is_err(),
            "Should return an error for invalid language"
        );
    }
}
