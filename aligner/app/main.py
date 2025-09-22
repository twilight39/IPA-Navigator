from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from .wav2vec import (
    phoneme_align,
    extract_phonemes_by_timespan,
    calculate_phoneme_accuracy,
)
import asyncio
from .whisper import word_align
from .phonemes import get_target_phonemes_by_word
import numpy as np
import time
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

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
    for i, word_alignment in enumerate(word_alignments):
        if i < len(target_phonemes_by_word):
            target_phonemes = target_phonemes_by_word[i]["phonemes"]

            # Extract phonemes within word boundaries
            word_phonemes = extract_phonemes_by_timespan(  # Fixed function name
                phoneme_timings,  # Pass the processed phoneme timings, not raw logits
                float(word_alignment["start_time"]),
                float(word_alignment["end_time"]),
            )
            word_accuracy = calculate_phoneme_accuracy(word_phonemes, target_phonemes)

            word_result = {
                "word": word_alignment["expected_word"],
                "word_alignment_confidence": word_alignment["confidence"],
                "time_boundary": {
                    "start": word_alignment["start_time"],
                    "end": word_alignment["end_time"],
                },
                "phonemes_in_timespan": word_phonemes,
                "pronunciation_accuracy": word_accuracy,
            }

            word_results.append(word_result)
            total_accuracy += word_accuracy["accuracy"]
            total_words += 1

    overall_accuracy = total_accuracy / total_words if total_words > 0 else 0.0
    overall_confidence = (
        np.mean([w["pronunciation_accuracy"]["confidence"] for w in word_results])
        if word_results
        else 0.0
    )

    return {
        "overall_accuracy": round(overall_accuracy, 3),
        "overall_confidence": float(round(overall_confidence, 3)),
        "total_words": total_words,
        "word_alignments": word_alignments,
        "word_results": word_results,
        "target_phonemes_by_word": target_phonemes_by_word,
    }

    """
    return {
        "status": "success",
        "target_phonemes": target_phonemes,
        "detected_phonemes": phoneme_result["phonemes"],
        "pronunciation_analysis": accuracy_analysis,
        "overall_confidence": phoneme_result["overall_confidence"],
        "transcript": request.transcript,
    }
    """
