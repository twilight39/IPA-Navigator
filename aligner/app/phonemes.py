from phonemizer import phonemize
from typing import TypedDict, cast


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
        {"word": word, "phonemes": list(phoneme_word) if phoneme_word else []}
        for word, phoneme_word in zip(words, phoneme_words)
        if word
    ]
