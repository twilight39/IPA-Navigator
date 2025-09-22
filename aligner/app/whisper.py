import whisperx
from whisperx.types import SingleWordSegment, AlignedTranscriptionResult
import torch
import os
import base64
import tempfile
from fastapi import HTTPException
import re
import difflib
from typing import TypedDict, cast
from Levenshtein import ratio
import time

MODEL = "base"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "int8"
LOCAL_MODEL = os.path.join(os.path.dirname(__file__), "../models")
BATCH_SIZE = 8

# Load model
transcribe_model = whisperx.load_model(
    MODEL, DEVICE, compute_type=COMPUTE_TYPE, download_root=LOCAL_MODEL
)
align_model, metadata = whisperx.load_align_model(
    language_code="en", device=DEVICE, model_dir=LOCAL_MODEL
)


def normalize_word(word: str):
    """Normalize word for comparison"""
    return re.sub(r"[^\w]", "", word.lower())


class WordAlignment(TypedDict):
    expected_word: str
    expected_index: int
    transcribed_word: str | None
    confidence: float
    start_time: float | None
    end_time: float | None


def fuzzy_word_alignment(
    expected_words: list[str], whisperx_segments: list[SingleWordSegment]
) -> list[WordAlignment]:
    """
    Align WhisperX word segments to expected words
    """
    expected_normalized = [normalize_word(w) for w in expected_words]
    transcribed_normalized = [normalize_word(w["word"]) for w in whisperx_segments]

    matcher = difflib.SequenceMatcher(None, expected_normalized, transcribed_normalized)

    word_alignments: list[WordAlignment] = [
        {
            "expected_word": word,
            "expected_index": i,
            "transcribed_word": None,
            "confidence": 0.0,
            "start_time": None,
            "end_time": None,
        }
        for i, word in enumerate(expected_words)
    ]

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            # Perfect matches
            for k in range(i2 - i1):
                exp_idx = i1 + k
                trans_idx = j1 + k
                word_alignments[exp_idx].update(
                    {
                        "transcribed_word": whisperx_segments[trans_idx]["word"],
                        "confidence": 1.0,
                        "start_time": whisperx_segments[trans_idx]["start"],
                        "end_time": whisperx_segments[trans_idx]["end"],
                    }
                )

        elif tag == "replace":
            # Handle substitutions with fuzzy matching
            expected_chunk = expected_words[i1:i2]
            transcribed_chunk = whisperx_segments[j1:j2]

            for i, exp_word in enumerate(expected_chunk):
                best_match: SingleWordSegment | None = None
                best_score = 0.0

                for trans_word_segment in transcribed_chunk:
                    score = ratio(
                        normalize_word(exp_word),
                        normalize_word(trans_word_segment["word"]),
                    )
                    score = cast(float, score)
                    if score > best_score:
                        best_score = score
                        best_match = trans_word_segment

                        # If a reasonably good match is found, update the placeholder.
                if best_match and best_score > 0.5:  # Lowered threshold slightly
                    exp_idx = i1 + i
                    word_alignments[exp_idx].update(
                        {
                            "transcribed_word": best_match["word"],
                            "confidence": best_score,
                            "start_time": best_match["start"],
                            "end_time": best_match["end"],
                        }
                    )

    return word_alignments


def word_align(audio_b64: str, transcript: str):
    start_time = time.perf_counter()
    try:
        # Decode base64 audio
        audio_data = base64.b64decode(audio_b64)

        # Save to a temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name

        try:
            audio = whisperx.load_audio(tmp_file_path)

            model_transcription = transcribe_model.transcribe(
                audio, batch_size=BATCH_SIZE, language="en"
            )

            result: AlignedTranscriptionResult = whisperx.align(
                model_transcription["segments"],
                align_model,
                metadata,
                audio,
                DEVICE,
            )

            expected_words = transcript.split()
            word_alignments = fuzzy_word_alignment(
                expected_words, result["word_segments"]
            )

            end_time = time.perf_counter()
            print(f"Word alignment took: {end_time - start_time:.4f} seconds")
            return word_alignments

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Alignment failed: {str(e)}")

        finally:
            # Clean up temporary file
            os.remove(tmp_file_path)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
