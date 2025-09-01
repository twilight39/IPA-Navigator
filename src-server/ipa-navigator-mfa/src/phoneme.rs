//! Phoneme conversion utilities (ARPAbet <-> IPA) and phonetic feature extraction.

use std::collections::HashMap;
use std::sync::LazyLock;

/// Phonetic features of a phoneme
#[derive(Debug, Clone, Default)]
pub struct PhonemeFeatures {
    // Manner of articulation
    is_plosive: bool,
    is_fricative: bool,
    is_affricate: bool,
    is_nasal: bool,
    is_approximant: bool,
    is_lateral: bool,

    // Place of articulation
    is_bilabial: bool,
    is_labiodental: bool,
    is_dental: bool,
    is_alveolar: bool,
    is_postalveolar: bool,
    is_palatal: bool,
    is_velar: bool,
    is_glottal: bool,

    // Vowel features
    is_vowel: bool,
    is_front: bool,
    is_central: bool,
    is_back: bool,
    is_close: bool,
    is_mid: bool,
    is_open: bool,
    is_rounded: bool,

    // Voicing
    is_voiced: bool,
}

/// Calculate similarity between two phonemes based on their features
pub fn calculate_feature_similarity(a: &PhonemeFeatures, b: &PhonemeFeatures) -> f64 {
    // If one is a vowel and the other is a consonant, they're quite different
    if a.is_vowel != b.is_vowel {
        return 0.1; // Minimal similarity
    }

    let mut similarity: f64 = 0.0;

    // For vowels, compare vowel features
    if a.is_vowel && b.is_vowel {
        // Check vowel height
        if (a.is_close && b.is_close) || (a.is_mid && b.is_mid) || (a.is_open && b.is_open) {
            similarity += 0.3;
        } else if (a.is_close && b.is_mid)
            || (a.is_mid && b.is_close)
            || (a.is_mid && b.is_open)
            || (a.is_open && b.is_mid)
        {
            // Adjacent heights get some similarity
            similarity += 0.15;
        }

        // Check vowel backness
        if (a.is_front && b.is_front) || (a.is_central && b.is_central) || (a.is_back && b.is_back)
        {
            similarity += 0.3;
        } else if (a.is_front && b.is_central)
            || (a.is_central && b.is_front)
            || (a.is_central && b.is_back)
            || (a.is_back && b.is_central)
        {
            // Adjacent backness gets some similarity
            similarity += 0.15;
        }

        // Check roundedness
        if a.is_rounded == b.is_rounded {
            similarity += 0.3;
        }

        return similarity.min(0.9); // Cap at 0.9 for non-identical vowels
    }

    // For consonants, compare consonant features

    // Manner of articulation (most important)
    if (a.is_plosive && b.is_plosive)
        || (a.is_fricative && b.is_fricative)
        || (a.is_affricate && b.is_affricate)
        || (a.is_nasal && b.is_nasal)
        || (a.is_approximant && b.is_approximant)
    {
        similarity += 0.4;
    } else if (a.is_plosive && b.is_affricate)
        || (a.is_affricate && b.is_plosive)
        || (a.is_fricative && b.is_affricate)
        || (a.is_affricate && b.is_fricative)
    {
        // Related manners get partial similarity
        similarity += 0.2;
    }

    // Place of articulation
    if (a.is_bilabial && b.is_bilabial)
        || (a.is_labiodental && b.is_labiodental)
        || (a.is_dental && b.is_dental)
        || (a.is_alveolar && b.is_alveolar)
        || (a.is_postalveolar && b.is_postalveolar)
        || (a.is_palatal && b.is_palatal)
        || (a.is_velar && b.is_velar)
        || (a.is_glottal && b.is_glottal)
    {
        similarity += 0.3;
    } else if (a.is_bilabial && b.is_labiodental)
        || (a.is_labiodental && b.is_bilabial)
        || (a.is_dental && b.is_alveolar)
        || (a.is_alveolar && b.is_dental)
        || (a.is_alveolar && b.is_postalveolar)
        || (a.is_postalveolar && b.is_alveolar)
        || (a.is_postalveolar && b.is_palatal)
        || (a.is_palatal && b.is_postalveolar)
        || (a.is_palatal && b.is_velar)
        || (a.is_velar && b.is_palatal)
    {
        // Adjacent places get partial similarity
        similarity += 0.15;
    }

    // Voicing
    if a.is_voiced == b.is_voiced {
        similarity += 0.2;
    }

    // Laterality
    if a.is_lateral == b.is_lateral {
        similarity += 0.1;
    }

    // Cap at 0.9 for non-identical consonants
    similarity.min(0.9)
}

/// Mapping of IPA phonemes to their phonetic features
pub static IPA_PHONEME_FEATURES: LazyLock<HashMap<String, PhonemeFeatures>> = LazyLock::new(|| {
    let mut features = HashMap::new();

    // Plosives (stops)
    features.insert(
        "p".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_bilabial: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "b".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_bilabial: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "t".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_alveolar: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "d".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_alveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "k".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_velar: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "g".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_velar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɡ".to_string(),
        PhonemeFeatures {
            is_plosive: true,
            is_velar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Nasals
    features.insert(
        "m".to_string(),
        PhonemeFeatures {
            is_nasal: true,
            is_bilabial: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "n".to_string(),
        PhonemeFeatures {
            is_nasal: true,
            is_alveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ŋ".to_string(),
        PhonemeFeatures {
            is_nasal: true,
            is_velar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Fricatives
    features.insert(
        "f".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_labiodental: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "v".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_labiodental: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "θ".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_dental: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ð".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_dental: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "s".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_alveolar: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "z".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_alveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ʃ".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_postalveolar: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ʒ".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_postalveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "h".to_string(),
        PhonemeFeatures {
            is_fricative: true,
            is_glottal: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    // Affricates
    features.insert(
        "tʃ".to_string(),
        PhonemeFeatures {
            is_affricate: true,
            is_postalveolar: true,
            is_voiced: false,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "dʒ".to_string(),
        PhonemeFeatures {
            is_affricate: true,
            is_postalveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Approximants
    features.insert(
        "ɹ".to_string(),
        PhonemeFeatures {
            is_approximant: true,
            is_alveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "j".to_string(),
        PhonemeFeatures {
            is_approximant: true,
            is_palatal: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "w".to_string(),
        PhonemeFeatures {
            is_approximant: true,
            is_bilabial: true,
            is_velar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Lateral approximant
    features.insert(
        "l".to_string(),
        PhonemeFeatures {
            is_approximant: true,
            is_lateral: true,
            is_alveolar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɫ".to_string(),
        PhonemeFeatures {
            is_approximant: true,
            is_lateral: true,
            is_alveolar: true,
            is_velar: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Vowels - Front
    features.insert(
        "i".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_close: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɪ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_close: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "e".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɛ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "æ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_open: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Vowels - Central
    features.insert(
        "ə".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_central: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ʌ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_central: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɚ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_central: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɝ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_central: true,
            is_mid: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Vowels - Back
    features.insert(
        "u".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_close: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ʊ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_close: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "o".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_mid: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɔ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_mid: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɑ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_open: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "a".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_open: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Diphthongs and other combined phonemes
    features.insert(
        "aɪ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_open: true,
            is_close: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "aʊ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_back: true,
            is_open: true,
            is_close: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "eɪ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_front: true,
            is_mid: true,
            is_close: true,
            is_rounded: false,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "oʊ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_mid: true,
            is_close: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    features.insert(
        "ɔɪ".to_string(),
        PhonemeFeatures {
            is_vowel: true,
            is_back: true,
            is_front: true,
            is_mid: true,
            is_close: true,
            is_rounded: true,
            is_voiced: true,
            ..PhonemeFeatures::default()
        },
    );

    // Add the "unknown" phoneme with default features
    features.insert("unknown".to_string(), PhonemeFeatures::default());

    features
});

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
