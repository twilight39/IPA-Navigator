import os
os.environ['PHONEMIZER_ESPEAK_LIBRARY'] = '/opt/homebrew/Cellar/espeak-ng/1.52.0/lib/libespeak-ng.dylib'
print("Set Espeak Dylib Path.")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .wav2vec import (
    phoneme_align,
    extract_phonemes_by_timespan,
)
import asyncio
from .whisper import word_align
from .phonemes import get_target_phonemes_by_word, calculate_detailed_phoneme_analysis
import numpy as np
import time
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Should be restricted in production
    allow_credentials=True,
    allow_methods=["POST"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=3)


class AlignmentRequest(BaseModel):
    audio_data: str
    transcript: str
    accent: str = "us"

@app.post("/align")
async def align_audio(request: AlignmentRequest):
    if request.accent not in ["us", "uk"]:
        raise HTTPException(status_code=400, detail="Accent must be 'us' or 'uk'")

    loop = asyncio.get_event_loop()

    parallel_models_start = time.perf_counter()
    word_align_task = loop.run_in_executor(
        executor, word_align, request.audio_data, request.transcript
    )
    phoneme_align_task = loop.run_in_executor(
        executor, phoneme_align, request.audio_data
    )

    # Await the results from both tasks
    word_alignments, phoneme_timings = await asyncio.gather(
        word_align_task, phoneme_align_task
    )

    parallel_models_end = time.perf_counter()
    print(
        f"1. Parallel model execution (WhisperX + Wav2Vec2) took: {parallel_models_end - parallel_models_start:.4f} seconds"
    )

    espeak_start = time.perf_counter()
    target_phonemes_by_word = get_target_phonemes_by_word(
        request.transcript, request.accent
    )
    espeak_end = time.perf_counter()
    print(f"2. Espeak phoneme generation took: {espeak_end - espeak_start:.4f} seconds")

    word_results = []
    total_accuracy = 0
    total_words = 0
    for word_alignment in word_alignments:
        expected_index = word_alignment["expected_index"]

        # Ensure the index is valid for the target phonemes list
        if expected_index < len(target_phonemes_by_word):
            target_phonemes = target_phonemes_by_word[expected_index]["phonemes"]

            # Extract phonemes within word boundaries
            word_phonemes = extract_phonemes_by_timespan(  # Fixed function name
                phoneme_timings,  # Pass the processed phoneme timings
                float(word_alignment["start_time"])
                if word_alignment["start_time"]
                else 0.0,
                float(word_alignment["end_time"])
                if word_alignment["end_time"]
                else 0.0,
            )

            phoneme_analysis = calculate_detailed_phoneme_analysis(
                word_phonemes, target_phonemes
            )

            expected_word_from_phonemes = target_phonemes_by_word[expected_index][
                "word"
            ]
            if expected_word_from_phonemes.lower().strip(".,?!") != word_alignment[
                "expected_word"
            ].lower().strip(".,?!"):
                print(
                    f"Warning: Word mismatch at index {expected_index}. Aligner expected '{word_alignment['expected_word']}', phoneme generator had '{expected_word_from_phonemes}'."
                )

            word_result = {
                "word": word_alignment["expected_word"],
                "expected_index": word_alignment["expected_index"],
                "transcribed_as": word_alignment["transcribed_word"],
                "word_accuracy": phoneme_analysis["word_accuracy"],
                "word_confidence": word_alignment["confidence"],
                "time_boundary": {
                    "start": word_alignment["start_time"],
                    "end": word_alignment["end_time"],
                },
                "phoneme_analysis": phoneme_analysis,
            }

            word_results.append(word_result)
            total_accuracy += phoneme_analysis["word_accuracy"]
            total_words += 1

    overall_accuracy = total_accuracy / total_words if total_words > 0 else 0.0
    overall_confidence = (
        np.mean(
            [
                w["word_confidence"]
                for w in word_results
                if w["word_confidence"] is not None
            ]
        )
        if word_results
        else 0.0
    )

    return {
        "overall_accuracy": round(overall_accuracy, 3),
        "overall_confidence": float(round(overall_confidence, 3)),
        "total_words": total_words,
        "word_results": word_results,
    }

class AnalyzePhonemesRequest(BaseModel):
    text: str
    accent: str = "us"

@app.post("/analyze-phonemes")
async def analyze_phonemes(request: AnalyzePhonemesRequest):
    """Analyze phonemes in text and return counts."""
    try:
        target_phonemes_by_word = get_target_phonemes_by_word(
            request.text, request.accent
        )

        # Flatten all phonemes
        all_phonemes = []
        for word_data in target_phonemes_by_word:
            all_phonemes.extend(word_data["phonemes"])

        # Count by type
        vowels = {"a", "e", "i", "o", "u", "ɪ", "ɛ", "æ", "ʌ", "ɔ", "ə", "ɑ", "ɒ", "ɐ"}
        diphthongs = {"aɪ", "aʊ", "eɪ", "oʊ", "ɔɪ", "ɪə", "eə", "ʊə"}
        difficult = {"ð", "θ", "ŋ", "ɪ", "ʃ", "ʒ", "ɹ"}

        vowel_count = sum(1 for p in all_phonemes if p in vowels)
        consonant_count = len(all_phonemes) - vowel_count  # Rough estimate
        diphthong_count = sum(1 for p in all_phonemes if p in diphthongs)
        difficult_count = sum(1 for p in all_phonemes if p in difficult)

        return {
            "phonemes": all_phonemes,
            "counts": {
                "vowels": vowel_count,
                "consonants": consonant_count,
                "diphthongs": diphthong_count,
                "difficult": difficult_count,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
