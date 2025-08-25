use std::collections::HashMap;
use std::sync::LazyLock;

/// Mapping of characters to token IDs for text-to-speech (TTS) processing.
pub static VOCABULARY: LazyLock<HashMap<char, usize>> = LazyLock::new(|| {
    // Character to Token ID mapping is based on:
    // https://github.com/lucasjinreal/Kokoros/blob/main/kokoros/src/tts/vocab.rs
    let pad = "$";
    let punctuation = ";:,.!?¡¿—…\"«»“” ";
    let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let letters_ipa = "ɑɐɒæɓʙβɔɕçɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧħɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴøɵɸθœɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍχʎʏʑʐʒʔʡʕʢǀǁǂǃˈˌːˑʼʴʰʱʲʷˠˤ˞↓↑→↗↘'̩'ᵻ";

    let symbols: String = [pad, punctuation, letters, letters_ipa].concat();

    symbols
        .chars()
        .enumerate()
        .map(|(idx, c)| (c, idx))
        .collect()
});

/// Mapping of token IDs to characters for text-to-speech (TTS) processing.
pub static REVERSE_VOCABULARY: LazyLock<HashMap<usize, char>> =
    LazyLock::new(|| VOCABULARY.iter().map(|(&c, &idx)| (idx, c)).collect());

#[cfg(test)]
mod tests {
    use crate::error::TtsError;
    use std::io;

    #[test]
    fn test_error_conversion() {
        // Test IO error conversion
        let io_error = io::Error::new(io::ErrorKind::NotFound, "file not found");
        let tts_error: TtsError = io_error.into();

        match tts_error {
            TtsError::IoError(_) => assert!(true),
            _ => assert!(false, "Expected IoError variant"),
        }

        // Test ONNX Runtime error conversion
        // This is harder to test as it requires creating an actual ONNX error
    }

    #[test]
    fn test_error_display() {
        let error = TtsError::ModelLoadError("test error".to_string());
        assert_eq!(format!("{}", error), "Failed to load model: test error");

        let error = TtsError::PhonemeError("phoneme error".to_string());
        assert_eq!(
            format!("{}", error),
            "Failed to generate phonemes: phoneme error"
        );
    }
}
