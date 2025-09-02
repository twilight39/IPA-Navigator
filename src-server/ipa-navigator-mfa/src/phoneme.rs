//! Phoneme conversion utilities (ARPAbet <-> IPA) and phonetic feature extraction.

use std::collections::HashMap;
use std::sync::LazyLock;

/// Phonetic features of a phoneme
#[derive(Debug, Clone, Default, PartialEq)]
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
    // Check if features are completely identical
    if a == b {
        return 1.0; // Perfect match
    }

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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phoneme_features_default() {
        let features = PhonemeFeatures::default();

        // Default should have all fields set to false
        assert!(!features.is_plosive);
        assert!(!features.is_fricative);
        assert!(!features.is_affricate);
        assert!(!features.is_nasal);
        assert!(!features.is_approximant);
        assert!(!features.is_lateral);

        assert!(!features.is_bilabial);
        assert!(!features.is_labiodental);
        assert!(!features.is_dental);
        assert!(!features.is_alveolar);
        assert!(!features.is_postalveolar);
        assert!(!features.is_palatal);
        assert!(!features.is_velar);
        assert!(!features.is_glottal);

        assert!(!features.is_vowel);
        assert!(!features.is_front);
        assert!(!features.is_central);
        assert!(!features.is_back);
        assert!(!features.is_close);
        assert!(!features.is_mid);
        assert!(!features.is_open);
        assert!(!features.is_rounded);

        assert!(!features.is_voiced);
    }

    #[test]
    fn test_calculate_feature_similarity() {
        // Test identical features
        let features_a = PhonemeFeatures {
            is_plosive: true,
            is_voiced: true,
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        // Same features should have perfect similarity
        assert_eq!(
            calculate_feature_similarity(&features_a, &features_a),
            1.0,
            "Identical features should have similarity of 1.0"
        );

        // Test similar features with one difference
        let features_b = PhonemeFeatures {
            is_plosive: true,
            is_voiced: false, // Only difference
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        let similarity_with_one_diff = calculate_feature_similarity(&features_a, &features_b);
        assert!(
            similarity_with_one_diff < 1.0 && similarity_with_one_diff > 0.5,
            "Similar features should have high but not perfect similarity: {}",
            similarity_with_one_diff
        );

        // Test very different features
        let features_c = PhonemeFeatures {
            is_vowel: true,
            is_open: true,
            is_back: true,
            ..PhonemeFeatures::default()
        };

        let similarity_different = calculate_feature_similarity(&features_a, &features_c);
        assert!(
            similarity_different < 0.5,
            "Different feature types should have low similarity: {}",
            similarity_different
        );
    }

    #[test]
    fn test_ipa_phoneme_features_map() {
        // Test that common phonemes have entries in the map
        let common_phonemes = ["p", "b", "t", "d", "k", "g", "a", "i", "u", "s", "z"];

        for phoneme in common_phonemes {
            assert!(
                IPA_PHONEME_FEATURES.contains_key(phoneme),
                "Map should contain common phoneme '{}'",
                phoneme
            );
        }

        // Test some specific feature values

        // 'p' should be a voiceless bilabial plosive
        let p_features = IPA_PHONEME_FEATURES.get("p").unwrap();
        assert!(p_features.is_plosive);
        assert!(p_features.is_bilabial);
        assert!(!p_features.is_voiced);

        // 'a' should be an open vowel
        let a_features = IPA_PHONEME_FEATURES.get("a").unwrap();
        assert!(a_features.is_vowel);
        assert!(a_features.is_open);
        assert!(!a_features.is_plosive);
    }

    #[test]
    fn test_calculate_feature_similarity_identical() {
        // Test with identical features
        let features_a = PhonemeFeatures {
            is_plosive: true,
            is_voiced: true,
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        let similarity = calculate_feature_similarity(&features_a, &features_a);
        assert_eq!(
            similarity, 1.0,
            "Identical features should have similarity of 1.0"
        );
    }

    #[test]
    fn test_calculate_feature_similarity_similar() {
        // Test with similar features (one difference)
        let features_a = PhonemeFeatures {
            is_plosive: true,
            is_voiced: true,
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        let features_b = PhonemeFeatures {
            is_plosive: true,
            is_voiced: false, // Only difference
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        let similarity = calculate_feature_similarity(&features_a, &features_b);
        assert!(
            similarity < 1.0 && similarity > 0.5,
            "Similar features should have high but not perfect similarity: {}",
            similarity
        );
    }

    #[test]
    fn test_calculate_feature_similarity_different() {
        // Test with very different features
        let consonant_features = PhonemeFeatures {
            is_plosive: true,
            is_bilabial: true,
            ..PhonemeFeatures::default()
        };

        let vowel_features = PhonemeFeatures {
            is_vowel: true,
            is_open: true,
            is_back: true,
            ..PhonemeFeatures::default()
        };

        let similarity = calculate_feature_similarity(&consonant_features, &vowel_features);
        assert!(
            similarity < 0.5,
            "Different feature types should have low similarity: {}",
            similarity
        );
    }
}
