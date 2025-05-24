use std::collections::HashMap;
use std::sync::LazyLock;

/// Mapping of characters to token IDs for text-to-speech (TTS) processing.
static VOCABULARY: LazyLock<HashMap<char, usize>> = LazyLock::new(|| {
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
static REVERSE_VOCABULARY: LazyLock<HashMap<usize, char>> =
    LazyLock::new(|| VOCABULARY.iter().map(|(&c, &idx)| (idx, c)).collect());
