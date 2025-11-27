from phonemizer import phonemize
from typing import TypedDict, cast, Literal
import panphon, panphon.distance
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from functools import lru_cache
import difflib
from .wav2vec import Phoneme, is_valid_phoneme


# Initialize panphon feature table globally
try:
    ft = panphon.FeatureTable()
    dst = panphon.distance.Distance()
    PANPHON_AVAILABLE = True
    print("Panphon loaded successfully for phoneme similarity calculations")
except ImportError:
    PANPHON_AVAILABLE = False  # pyright: ignore[reportConstantRedefinition]
    print("Warning: panphon not available, falling back to simple similarity")


class WordPhonemes(TypedDict):
    word: str
    phonemes: list[str]


def get_target_phonemes_by_word(text: str, accent: str) -> list[WordPhonemes]:
    """Generate target phonemes grouped by word."""
    lang = "en-us" if accent == "us" else "en-gb"

    phonemes = phonemize(
        text.strip('.,?";').lower(), language=lang, backend="espeak", strip=True
    )
    phonemes = cast(str, phonemes)

    words = text.strip(".,?;").split()
    phoneme_words = phonemes.split(" ")

    return [
        {
            "word": word,
            "phonemes": normalize_target_phonemes(
                parse_phoneme_string(phoneme_word) if phoneme_word else []
            ),
        }
        for word, phoneme_word in zip(words, phoneme_words)
        if word
    ]


def calculate_phoneme_similarity(phoneme1: str, phoneme2: str) -> float:
    """
    Calculate articulatory similarity between two phonemes.
    Uses panphon if available, falls back to comprehensive rule-based system.
    """
    if phoneme1 == phoneme2:
        return 1.0

    if not PANPHON_AVAILABLE:
        return calculate_phoneme_similarity_rule_based(phoneme1, phoneme2)

    try:
        print(
            f"Calculating similarity between '{phoneme1}' and '{phoneme2}' using panphon..."
        )

        # Get Segment objects
        distance = dst.weighted_feature_edit_distance(phoneme1, phoneme2)
        weights = sum(ft.weights)

        return min(0.95, max(0.0, 1 - distance / weights))
    except Exception as e:
        print(f"Error calculating phoneme similarity with panphon: {e}")
        return calculate_phoneme_similarity_rule_based(phoneme1, phoneme2)


# Comprehensive phonetic feature definitions for fallback
CONSONANT_FEATURES = {
    # Place of articulation
    "bilabial": {"p", "b", "m", "ɸ", "β", "w"},
    "labiodental": {"f", "v"},
    "dental": {"θ", "ð"},
    "alveolar": {"t", "d", "n", "s", "z", "l", "r", "ɾ"},
    "postalveolar": {"ʃ", "ʒ", "tʃ", "dʒ", "ɹ"},
    "retroflex": {"ʈ", "ɖ", "ɳ", "ʂ", "ʐ", "ɻ"},
    "palatal": {"c", "ɟ", "ɲ", "ç", "ʝ", "j"},
    "velar": {"k", "g", "ŋ", "x", "ɣ", "w"},
    "uvular": {"q", "ɢ", "ɴ", "χ", "ʁ"},
    "pharyngeal": {"ħ", "ʕ"},
    "glottal": {"ʔ", "h", "ɦ"},
    # Manner of articulation
    "stop": {"p", "b", "t", "d", "ʈ", "ɖ", "c", "ɟ", "k", "g", "q", "ɢ", "ʔ"},
    "nasal": {"m", "ɱ", "n", "ɳ", "ɲ", "ŋ", "ɴ"},
    "trill": {"ʙ", "r", "ʀ"},
    "tap": {"ⱱ", "ɾ", "ɽ"},
    "fricative": {
        "ɸ",
        "β",
        "f",
        "v",
        "θ",
        "ð",
        "s",
        "z",
        "ʃ",
        "ʒ",
        "ʂ",
        "ʐ",
        "ç",
        "ʝ",
        "x",
        "ɣ",
        "χ",
        "ʁ",
        "ħ",
        "ʕ",
        "h",
        "ɦ",
    },
    "lateral_fricative": {"ɬ", "ɮ"},
    "approximant": {"ʋ", "ɹ", "ɻ", "j", "ɰ"},
    "lateral_approximant": {"l", "ɭ", "ʎ", "ʟ"},
    "affricate": {"tʃ", "dʒ", "ts", "dz"},
    # Voicing
    "voiced": {
        "b",
        "d",
        "ɖ",
        "ɟ",
        "g",
        "ɢ",
        "ɱ",
        "m",
        "n",
        "ɳ",
        "ɲ",
        "ŋ",
        "ɴ",
        "ʙ",
        "r",
        "ʀ",
        "ⱱ",
        "ɾ",
        "ɽ",
        "β",
        "v",
        "ð",
        "z",
        "ʒ",
        "ʐ",
        "ʝ",
        "ɣ",
        "ʁ",
        "ʕ",
        "ɦ",
        "ɮ",
        "ʋ",
        "ɹ",
        "ɻ",
        "j",
        "ɰ",
        "l",
        "ɭ",
        "ʎ",
        "ʟ",
        "w",
        "dʒ",
        "dz",
    },
    "voiceless": {
        "p",
        "t",
        "ʈ",
        "c",
        "k",
        "q",
        "ʔ",
        "ɸ",
        "f",
        "θ",
        "s",
        "ʃ",
        "ʂ",
        "ç",
        "x",
        "χ",
        "ħ",
        "h",
        "ɬ",
        "tʃ",
        "ts",
    },
    # Airstream
    "pulmonic": {
        "p",
        "b",
        "t",
        "d",
        "k",
        "g",
        "f",
        "v",
        "s",
        "z",
        "m",
        "n",
        "l",
        "r",
    },  # Most common consonants
    "ejective": {"pʼ", "tʼ", "kʼ"},
    "implosive": {"ɓ", "ɗ", "ɠ"},
}


VOWEL_FEATURES = {
    # Height
    "close": {"i", "y", "ɨ", "ʉ", "ɯ", "u", "ɪ", "ʏ", "ʊ", "ɪ̈", "ʊ̈"},
    "near_close": {"ɪ", "ʏ", "ɪ̈", "ʊ̈", "ʊ"},
    "close_mid": {"e", "ø", "ɘ", "ɵ", "ɤ", "o"},
    "mid": {"e̞", "ø̞", "ə", "ɵ̞", "ɤ̞", "o̞"},
    "open_mid": {"ɛ", "œ", "ɜ", "ɞ", "ʌ", "ɔ"},
    "near_open": {"æ", "ɐ"},
    "open": {"a", "ɶ", "ä", "ɑ", "ɒ"},
    # Backness
    "front": {"i", "y", "ɪ", "ʏ", "e", "ø", "ɛ", "œ", "æ", "a", "ɶ"},
    "near_front": {"ɪ̈", "ʏ̈"},
    "central": {"ɨ", "ʉ", "ɘ", "ɵ", "ə", "ɜ", "ɞ", "ɐ", "ä"},
    "near_back": {"ʊ̈", "ɤ̞"},
    "back": {"ɯ", "u", "ʊ", "ɤ", "o", "ʌ", "ɔ", "ɑ", "ɒ"},
    # Roundedness
    "rounded": {"y", "ʏ", "ø", "œ", "ɶ", "ʉ", "ɵ", "ɞ", "u", "ʊ", "o", "ɔ", "ɒ"},
    "unrounded": {
        "i",
        "ɪ",
        "e",
        "ɛ",
        "æ",
        "a",
        "ɨ",
        "ɘ",
        "ə",
        "ɜ",
        "ɐ",
        "ɯ",
        "ɤ",
        "ʌ",
        "ä",
        "ɑ",
    },
    # Tenseness (for English vowels)
    "tense": {"i", "e", "u", "o", "ɑ"},
    "lax": {"ɪ", "ɛ", "ʊ", "ɔ", "æ", "ʌ", "ə"},
    # Length (common distinctions)
    "long": {"iː", "eː", "uː", "oː", "ɑː", "ɔː"},
    "short": {"ɪ", "ɛ", "ʊ", "ɔ", "æ", "ʌ", "ə"},
}


# Diphthongs (combinations of vowel sounds)
DIPHTHONGS = {
    "closing": {"aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ"},
    "centering": {"ɪə", "eə", "ʊə"},
}


@lru_cache(maxsize=256)
def get_phoneme_features_comprehensive(phoneme: str) -> set[str]:
    """Get all features for a phoneme using comprehensive rule-based system."""
    features: set[str] = set()

    # Handle diphthongs first
    for diphthong_type, diphthongs in DIPHTHONGS.items():
        if phoneme in diphthongs:
            features.add("diphthong")
            features.add(f"diphthong_{diphthong_type}")

    # Consonant features
    for feature_type, phonemes in CONSONANT_FEATURES.items():
        if phoneme in phonemes:
            features.add(feature_type)

    # Vowel features
    for feature_type, phonemes in VOWEL_FEATURES.items():
        if phoneme in phonemes:
            features.add(feature_type)

    # Add broad categories
    if any(phoneme in CONSONANT_FEATURES[f] for f in CONSONANT_FEATURES):
        features.add("consonant")
    if any(phoneme in VOWEL_FEATURES[f] for f in VOWEL_FEATURES):
        features.add("vowel")

    return features


def calculate_phoneme_similarity_rule_based(phoneme1: str, phoneme2: str) -> float:
    """
    Analyze what specific features differ between two phonemes using comprehensive system.
    Useful when panphon is not available.
    """
    if phoneme1 == phoneme2:
        return 1.0

    features1 = get_phoneme_features_comprehensive(phoneme1)
    features2 = get_phoneme_features_comprehensive(phoneme2)

    if not features1 or not features2:
        return 0.1  # Very low similarity for unknown phonemes

    # If one is vowel and other is consonant, very low similarity
    if ("vowel" in features1 and "consonant" in features2) or (
        "consonant" in features1 and "vowel" in features2
    ):
        return 0.05

    # Calculate weighted similarity based on feature importance
    shared_features = features1 & features2
    total_features = features1 | features2

    if not total_features:
        return 0.1

    # Weight certain features more heavily
    high_weight_features = {
        "stop",
        "fricative",
        "nasal",
        "approximant",  # Manner of articulation
        "bilabial",
        "alveolar",
        "velar",
        "dental",  # Place of articulation
        "close",
        "open",
        "front",
        "back",  # Vowel position
        "voiced",
        "voiceless",  # Voicing
    }

    weighted_shared = 0
    weighted_total = 0

    for feature in total_features:
        weight = 2.0 if feature in high_weight_features else 1.0
        weighted_total += weight
        if feature in shared_features:
            weighted_shared += weight

    similarity = weighted_shared / weighted_total if weighted_total > 0 else 0.0
    similarity = min(0.95, similarity)

    # Apply minimum thresholds based on feature sharing
    if similarity > 0.7:
        return max(0.8, similarity)  # High similarity
    elif similarity > 0.4:
        return max(0.6, similarity)  # Medium similarity
    elif similarity > 0.2:
        return max(0.3, similarity)  # Low similarity
    else:
        return max(0.1, similarity)  # Very low similarity


class PhonemeResult(TypedDict):
    position: int | None
    target: str | None
    detected: str | None
    accuracy: float
    confidence: float | None
    timing: dict[str, float] | None
    status: Literal["correct", "substitution", "insertion", "deletion"]
    similarity_score: float | None


class PhonemeAnalysis(TypedDict):
    target_phonemes: list[str]
    detected_phonemes: list[str]
    phoneme_results: list[PhonemeResult]
    word_accuracy: float


def calculate_detailed_phoneme_analysis(
    detected: list[Phoneme], target: list[str]
) -> PhonemeAnalysis:
    """Calculate detailed phoneme-level analysis with individual phoneme results."""
    detected_phonemes = [
        p["phoneme"]
        for p in detected
        if p["phoneme"].strip() and is_valid_phoneme(p["phoneme"])
    ]

    # Use sequence alignment to get operations
    matcher = difflib.SequenceMatcher(None, target, detected_phonemes)

    phoneme_results: list[PhonemeResult] = []
    target_pos = 0
    detected_pos = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            # Correct matches
            for k in range(i2 - i1):
                target_phoneme = target[i1 + k]
                detected_phoneme = detected_phonemes[j1 + k]
                detected_data = detected[j1 + k] if j1 + k < len(detected) else None

                phoneme_results.append(
                    {
                        "position": i1 + k,
                        "target": target_phoneme,
                        "detected": detected_phoneme,
                        "accuracy": 1.0,
                        "confidence": detected_data["confidence"]
                        if detected_data
                        else 1.0,
                        "timing": {
                            "start": detected_data["start"],
                            "end": detected_data["end"],
                        }
                        if detected_data
                        else None,
                        "status": "correct",
                        "similarity_score": 1.0,
                    }
                )

        elif tag == "replace":
            # Substitutions
            target_chunk = target[i1:i2]
            detected_chunk = detected_phonemes[j1:j2]

            # Handle 1:1 substitutions primarily
            for k in range(min(len(target_chunk), len(detected_chunk))):
                target_phoneme = target_chunk[k]
                detected_phoneme = detected_chunk[k]
                detected_data = detected[j1 + k] if j1 + k < len(detected) else None

                similarity = calculate_phoneme_similarity(
                    target_phoneme, detected_phoneme
                )

                phoneme_results.append(
                    {
                        "position": i1 + k,
                        "target": target_phoneme,
                        "detected": detected_phoneme,
                        "accuracy": similarity,
                        "confidence": detected_data["confidence"]
                        if detected_data
                        else 0.0,
                        "timing": {
                            "start": detected_data["start"],
                            "end": detected_data["end"],
                        }
                        if detected_data
                        else None,
                        "status": "substitution",
                        "similarity_score": similarity,
                    }
                )

            # Handle extra detected phonemes as insertions
            for k in range(len(target_chunk), len(detected_chunk)):
                detected_phoneme = detected_chunk[k]
                detected_data = detected[j1 + k] if j1 + k < len(detected) else None

                phoneme_results.append(
                    {
                        "position": None,
                        "target": None,
                        "detected": detected_phoneme,
                        "accuracy": 0.0,
                        "confidence": detected_data["confidence"]
                        if detected_data
                        else 0.0,
                        "timing": {
                            "start": detected_data["start"],
                            "end": detected_data["end"],
                        }
                        if detected_data
                        else None,
                        "status": "insertion",
                        "similarity_score": None,
                    }
                )

            # Handle missing target phonemes as deletions
            for k in range(len(detected_chunk), len(target_chunk)):
                target_phoneme = target_chunk[k]

                phoneme_results.append(
                    {
                        "position": i1 + k,
                        "target": target_phoneme,
                        "detected": None,
                        "accuracy": 0.0,
                        "timing": None,
                        "status": "deletion",
                        "similarity_score": None,
                        "confidence": None,
                    }
                )

        elif tag == "delete":
            # Missing phonemes (deletions)
            for k in range(i2 - i1):
                target_phoneme = target[i1 + k]

                phoneme_results.append(
                    {
                        "position": i1 + k,
                        "target": target_phoneme,
                        "detected": None,
                        "accuracy": 0.0,
                        "timing": None,
                        "status": "deletion",
                        "similarity_score": None,
                        "confidence": None,
                    }
                )

        elif tag == "insert":
            # Extra phonemes (insertions)
            for k in range(j2 - j1):
                detected_phoneme = detected_phonemes[j1 + k]
                detected_data = detected[j1 + k] if j1 + k < len(detected) else None

                phoneme_results.append(
                    {
                        "position": None,
                        "target": None,
                        "detected": detected_phoneme,
                        "accuracy": 0.0,
                        "confidence": detected_data["confidence"]
                        if detected_data
                        else 0.0,
                        "timing": {
                            "start": detected_data["start"],
                            "end": detected_data["end"],
                        }
                        if detected_data
                        else None,
                        "status": "insertion",
                        "similarity_score": None,
                    }
                )

    # Calculate overall word accuracy
    correct_phonemes = sum(
        1 for result in phoneme_results if result["status"] == "correct"
    )
    partial_credit = sum(
        result["accuracy"]
        for result in phoneme_results
        if result["status"] == "substitution"
    )
    total_target = len(target)
    word_accuracy = (
        (correct_phonemes + partial_credit) / total_target if total_target > 0 else 0.0
    )

    return {
        "target_phonemes": target,
        "detected_phonemes": detected_phonemes,
        "phoneme_results": phoneme_results,
        "word_accuracy": round(word_accuracy, 3),
    }


DIPHTHONGS_TO_COMBINE = {
    ("a", "ɪ"): "aɪ",
    ("a", "ʊ"): "aʊ",
    ("e", "ɪ"): "eɪ",
    ("o", "ʊ"): "oʊ",
    ("ɔ", "ɪ"): "ɔɪ",
    ("ɪ", "ə"): "ɪə",
    ("e", "ə"): "eə",
    ("ʊ", "ə"): "ʊə",
}


def normalize_target_phonemes(phonemes: list[str]) -> list[str]:
    """
    Normalize target phonemes by:
    1. Combining vowels with length markers (u + ː → uː)
    2. Combining split diphthongs (a + ɪ → aɪ)
    3. Applying English phonetic rules
    """
    if not phonemes:
        return phonemes

    normalized: list[str] = []
    i = 0

    while i < len(phonemes):
        current = phonemes[i]

        # FIRST: Check if current + next form a diphthong
        if i + 1 < len(phonemes):
            pair = (current, phonemes[i + 1])
            if pair in DIPHTHONGS_TO_COMBINE:
                normalized.append(DIPHTHONGS_TO_COMBINE[pair])
                i += 2
                continue

        # SECOND: Check if next phoneme is a length marker
        if (
            i + 1 < len(phonemes)
            and phonemes[i + 1] == "ː"
            and is_vowel_phoneme(current)
        ):
            normalized.append(current + "ː")
            i += 2
        # THIRD: Keep phoneme if it's not a standalone length marker
        elif current != "ː":
            normalized.append(current)
            i += 1
        else:
            # Skip standalone length markers
            i += 1

    # Apply English phonetic rules: final unstressed /i/ becomes /iː/
    if normalized:
        last_idx = len(normalized) - 1
        if (
            normalized[last_idx] == "i"
            and last_idx > 0
            and is_vowel_phoneme(normalized[last_idx - 1])
        ):
            normalized[last_idx] = "iː"

    return normalized


def is_vowel_phoneme(phoneme: str) -> bool:
    """Check if a phoneme is a vowel."""
    vowels = {
        "a",
        "e",
        "i",
        "o",
        "u",
        "ɪ",
        "ɛ",
        "æ",
        "ʌ",
        "ɔ",
        "ə",
        "ɑ",
        "ɒ",
        "ɐ",
        "iː",
        "eː",
        "uː",
        "oː",
        "ɑː",
        "ɔː",
    }
    return phoneme in vowels


def parse_phoneme_string(phoneme_str: str) -> list[str]:
    """
    Parse a phoneme string into individual phonemes, handling multi-character phonemes.

    Examples:
    "aɪs" → ["aɪ", "s"]
    "ɔːl" → ["ɔː", "l"]
    "skɹiːm" → ["s", "k", "ɹ", "iː", "m"]
    """
    if not phoneme_str:
        return []

    phonemes: list[str] = []
    i = 0

    while i < len(phoneme_str):
        current = phoneme_str[i]

        # Check if next character is a length marker or ties
        if i + 1 < len(phoneme_str) and phoneme_str[i + 1] in "ːˑ‿":
            phonemes.append(current + phoneme_str[i + 1])
            i += 2
        else:
            phonemes.append(current)
            i += 1

    return phonemes
