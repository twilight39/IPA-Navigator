from fastapi import FastAPI, HTTPException
import whisperx
import torch
from contextlib import asynccontextmanager
from pydantic import BaseModel
import base64
import io
import soundfile as sf
import tempfile
import sys
import httpx
from phonemizer import phonemize
import difflib

app = FastAPI()
MODEL_SERVER_URL = "http://localhost:8001/phoneme_align"


class AlignmentRequest(BaseModel):
    audio_data: str
    transcript: str
    accent: str = "us"


def get_target_phonemes(text: str, accent: str) -> list[str]:
    """Generate target phonemes from transcript."""
    lang = "en-us" if accent == "us" else "en"
    phonemes_str = phonemize(text, language=lang, backend="espeak", strip=True)

    phonemes_clean = phonemes_str.replace(" ", "")
    individual_phonemes = list(phonemes_clean)

    return individual_phonemes


def calculate_phoneme_accuracy(
    detected: list[dict[...]], target: list[str]
) -> dict[...]:
    """Calculate pronunciation accuracy by comparing detected vs target phonemes."""
    detected_phonemes = [p["phoneme"] for p in detected if p["phoneme"].strip()]

    # Use sequence alignment to match detected vs target phonemes
    matcher = difflib.SequenceMatcher(None, target, detected_phonemes)

    opcodes = matcher.get_opcodes()

    # Initialize results array
    enhanced_results = []
    detected_idx = 0

    # Process each alignment operation
    for tag, target_start, target_end, detected_start, detected_end in opcodes:
        if tag == "equal":
            # Perfect matches - these phonemes are correct
            for i in range(detected_start, detected_end):
                base_confidence = detected[detected_idx]["confidence"]
                enhanced_results.append(
                    {
                        **detected[detected_idx],
                        "accuracy_score": min(
                            1.0, base_confidence + 0.1
                        ),  # Bonus for correct
                        "is_correct": True,
                        "alignment_type": "correct",
                    }
                )
                detected_idx += 1

        elif tag == "replace":
            # Substitutions - wrong phoneme in roughly the right place
            for i in range(detected_start, detected_end):
                base_confidence = detected[detected_idx]["confidence"]
                target_phoneme = (
                    target[target_start + (i - detected_start)]
                    if target_start + (i - detected_start) < target_end
                    else "?"
                )
                enhanced_results.append(
                    {
                        **detected[detected_idx],
                        "accuracy_score": base_confidence
                        * 0.5,  # Penalty for wrong phoneme
                        "is_correct": False,
                        "alignment_type": "substitution",
                        "expected_phoneme": target_phoneme,
                    }
                )
                detected_idx += 1

        elif tag == "insert":
            # Extra phonemes that shouldn't be there
            for i in range(detected_start, detected_end):
                base_confidence = detected[detected_idx]["confidence"]
                enhanced_results.append(
                    {
                        **detected[detected_idx],
                        "accuracy_score": base_confidence
                        * 0.3,  # Big penalty for extra phonemes
                        "is_correct": False,
                        "alignment_type": "insertion",
                        "expected_phoneme": None,
                    }
                )
                detected_idx += 1

        elif tag == "delete":
            # Missing phonemes - these don't appear in detected but should
            # We can't score these since they weren't detected, but we can report them
            for i in range(target_start, target_end):
                missing_phoneme = target[i]
                # Add a placeholder for missing phonemes (optional)
                enhanced_results.append(
                    {
                        "phoneme": f"[MISSING: {missing_phoneme}]",
                        "start": enhanced_results[-1]["end"]
                        if enhanced_results
                        else 0.0,
                        "end": enhanced_results[-1]["end"] if enhanced_results else 0.0,
                        "confidence": 0.0,
                        "accuracy_score": 0.0,
                        "is_correct": False,
                        "alignment_type": "deletion",
                        "expected_phoneme": missing_phoneme,
                    }
                )

    # Calculate overall statistics
    correct_phonemes = sum(1 for p in enhanced_results if p.get("is_correct", False))
    total_target_phonemes = len(target)
    total_detected_phonemes = len(
        [p for p in enhanced_results if not p["phoneme"].startswith("[MISSING")]
    )

    overall_accuracy = (
        correct_phonemes / total_target_phonemes if total_target_phonemes > 0 else 0.0
    )

    return {
        "phonemes": enhanced_results,
        "overall_accuracy": round(overall_accuracy, 3),
        "statistics": {
            "correct": correct_phonemes,
            "total_target": total_target_phonemes,
            "total_detected": total_detected_phonemes,
            "match_ratio": f"{correct_phonemes}/{total_target_phonemes}",
        },
    }


@app.post("/align")
async def align_audio(request: AlignmentRequest):
    if request.accent not in ["us", "uk"]:
        raise HTTPException(status_code=400, detail="Accent must be 'us' or 'uk'")

    # Get target phonemes from the transcript
    target_phonemes = get_target_phonemes(request.transcript, request.accent)

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                MODEL_SERVER_URL,
                json={
                    "audio_b64": request.audio_data,
                    "target_transcript": request.transcript,
                    "accent": request.accent,
                },
            )
            response.raise_for_status()  # Raise an exception for 4xx/5xx responses
            phoneme_result = response.json()

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503, detail=f"Model server is unavailable: {e}"
            )

    print("Raw alignment received:", phoneme_result)

    accuracy_analysis = calculate_phoneme_accuracy(
        phoneme_result["phonemes"], target_phonemes
    )

    return {
        "status": "success",
        "target_phonemes": target_phonemes,
        "detected_phonemes": phoneme_result["phonemes"],
        "pronunciation_analysis": accuracy_analysis,
        "overall_confidence": phoneme_result["overall_confidence"],
        "transcript": request.transcript,
    }
