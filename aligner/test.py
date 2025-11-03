import os

os.environ["PHONEMIZER_ESPEAK_LIBRARY"] = (
    "/opt/homebrew/Cellar/espeak-ng/1.52.0/lib/libespeak-ng.dylib"
)

from app.phonemes import normalize_target_phonemes, parse_phoneme_string

test_cases = [
    "aɪ",      # Should → ['aɪ']
    "aɪs",     # Should → ['aɪ', 's']
    "ɔːl",     # Should → ['ɔː', 'l']
    "fɔːɹ",    # Should → ['f', 'ɔː', 'ɹ']
]

for test in test_cases:
    parsed = parse_phoneme_string(test)
    normalized = normalize_target_phonemes(parsed)
    print(f"{test}: parsed={parsed} → normalized={normalized}")
