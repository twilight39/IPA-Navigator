//! Phoneme conversion utilities (ARPAbet <-> IPA)

use std::collections::HashMap;
use std::sync::LazyLock;

/// Mapping from ARPAbet phonemes to IPA phonemes
pub static ARPA_TO_IPA: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut map = HashMap::new();
    // Vowels
    map.insert("AA", "ɑ");
    map.insert("AE", "æ");
    map.insert("AH", "ʌ");
    map.insert("AO", "ɔ");
    map.insert("AW", "aʊ");
    map.insert("AY", "aɪ");
    map.insert("EH", "ɛ");
    map.insert("ER", "ɝ");
    map.insert("EY", "eɪ");
    map.insert("IH", "ɪ");
    map.insert("IY", "i");
    map.insert("OW", "oʊ");
    map.insert("OY", "ɔɪ");
    map.insert("UH", "ʊ");
    map.insert("UW", "u");
    // Consonants
    map.insert("B", "b");
    map.insert("CH", "tʃ");
    map.insert("D", "d");
    map.insert("DH", "ð");
    map.insert("F", "f");
    map.insert("G", "ɡ");
    map.insert("HH", "h");
    map.insert("JH", "dʒ");
    map.insert("K", "k");
    map.insert("L", "l");
    map.insert("M", "m");
    map.insert("N", "n");
    map.insert("NG", "ŋ");
    map.insert("P", "p");
    map.insert("R", "ɹ");
    map.insert("S", "s");
    map.insert("SH", "ʃ");
    map.insert("T", "t");
    map.insert("TH", "θ");
    map.insert("V", "v");
    map.insert("W", "w");
    map.insert("Y", "j");
    map.insert("Z", "z");
    map.insert("ZH", "ʒ");
    map
});

/// Mapping from IPA phonemes to ARPAbet phonemes
pub static IPA_TO_ARPA: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut map = HashMap::new();
    for (arpa, ipa) in ARPA_TO_IPA.iter() {
        map.insert(*ipa, *arpa);
    }
    map
});

/// Convert ARPAbet phoneme to IPA
pub fn arpa_to_ipa(arpa: &str) -> Option<&'static str> {
    // Handle stress markers and other decorations
    let base_phoneme = arpa.trim_end_matches(|c: char| c.is_numeric() || c == '_');
    ARPA_TO_IPA.get(base_phoneme).copied()
}

/// Convert IPA phoneme to ARPAbet
pub fn ipa_to_arpa(ipa: &str) -> Option<&'static str> {
    IPA_TO_ARPA.get(ipa).copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_arpa_to_ipa_conversion() {
        assert_eq!(arpa_to_ipa("AA"), Some("ɑ"));
        assert_eq!(arpa_to_ipa("AE"), Some("æ"));
        assert_eq!(arpa_to_ipa("IY"), Some("i"));
        assert_eq!(arpa_to_ipa("ZH"), Some("ʒ"));
    }

    #[test]
    fn test_arpa_to_ipa_with_stress_markers() {
        assert_eq!(arpa_to_ipa("AA1"), Some("ɑ"));
        assert_eq!(arpa_to_ipa("AE2"), Some("æ"));
        assert_eq!(arpa_to_ipa("IY0"), Some("i"));
    }

    #[test]
    fn test_arpa_to_ipa_unknown_phoneme() {
        assert_eq!(arpa_to_ipa("XYZ"), None);
        assert_eq!(arpa_to_ipa(""), None);
    }

    #[test]
    fn test_ipa_to_arpa_conversion() {
        assert_eq!(ipa_to_arpa("ɑ"), Some("AA"));
        assert_eq!(ipa_to_arpa("æ"), Some("AE"));
        assert_eq!(ipa_to_arpa("i"), Some("IY"));
        assert_eq!(ipa_to_arpa("ʒ"), Some("ZH"));
    }

    #[test]
    fn test_ipa_to_arpa_unknown_phoneme() {
        assert_eq!(ipa_to_arpa("q"), None); // Not in our mapping
        assert_eq!(ipa_to_arpa(""), None);
    }

    #[test]
    fn test_bidirectional_conversion() {
        // Test round-trip conversions
        for (arpa, _) in ARPA_TO_IPA.iter() {
            let ipa = arpa_to_ipa(arpa);
            assert!(ipa.is_some(), "Failed to convert ARPA {arpa} to IPA");

            let arpa_back = ipa_to_arpa(ipa.unwrap());
            assert_eq!(
                arpa_back,
                Some(*arpa),
                "Failed round-trip conversion: {arpa} -> {} -> {:?}",
                ipa.unwrap(),
                arpa_back
            );
        }
    }
}
