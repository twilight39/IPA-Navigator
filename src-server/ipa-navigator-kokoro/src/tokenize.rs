use crate::vocab::{REVERSE_VOCABULARY, VOCABULARY};

/// Converts a string of phonemes into a vector of token IDs.
pub fn tokenize(phonemes: &str) -> Vec<i64> {
    phonemes
        .chars()
        .filter_map(|c| VOCABULARY.get(&c))
        .map(|&id| id as i64)
        .collect::<Vec<i64>>()
}

/// Converts a vector of token IDs back into a string of phonemes.
pub fn tokens_to_phonemes(tokens: &[i64]) -> String {
    tokens
        .iter()
        .filter_map(|&t| REVERSE_VOCABULARY.get(&(t as usize)))
        .collect()
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_tokenize() {
        let text = "heɪ ðɪs ɪz ˈlʌvliː!";
        let tokens = tokenize(text);

        // Expected tokens based on the vocabulary mapping defined in `vocab.rs`
        let expected = vec![
            50, 47, 102, 16, 81, 102, 61, 16, 102, 68, 16, 156, 54, 138, 64, 54, 51, 158, 5,
        ];

        assert_eq!(tokens, expected);

        // Test empty string
        let empty = "";
        let empty_tokens = tokenize(empty);
        assert!(empty_tokens.is_empty());

        // Test punctuation
        let punct = "...";
        let punct_tokens = tokenize(punct);
        assert_eq!(punct_tokens.len(), 3);
    }

    #[test]
    fn test_tokens_to_phonemes() {
        let tokens = vec![24, 47, 54, 54, 57, 5];
        let text = tokens_to_phonemes(&tokens);
        assert_eq!(text, "Hello!");

        let tokens = vec![
            0, 50, 83, 54, 156, 57, 135, 3, 16, 65, 156, 87, 158, 54, 46, 5, 0,
        ];

        let text = tokens_to_phonemes(&tokens);
        assert_eq!(text, "$həlˈoʊ, wˈɜːld!$");

        // Test empty vector
        let empty_tokens: Vec<i64> = vec![];
        assert_eq!(tokens_to_phonemes(&empty_tokens), "");
    }
}
