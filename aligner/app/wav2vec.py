import torch
import base64
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
import numpy as np
import torchaudio
from typing import TypedDict

# from warnings import deprecated # Sadly only in Python 3.13+
from fastapi import HTTPException
import difflib
import time
import io

DEVICE: str = (
    "cuda"
    if torch.cuda.is_available()
    else "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)
SAMPLING_RATE: int = 16000
MODEL_NAME = "facebook/wav2vec2-lv-60-espeak-cv-ft"
DEBUG = True

print(f"Loading Wav2Vec2 phoneme model on {DEVICE}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME).to(DEVICE)
print("Wav2Vec2 model loaded successfully.")

VALID_PHONEMES = {
    # Vowels
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
    "aː",
    "eː",
    "iː",
    "oː",
    "uː",
    "ɑː",
    "ɔː",
    "aɪ",
    "aʊ",
    "eɪ",
    "oʊ",
    "ɔɪ",
    "ɪə",
    "eə",
    "ʊə",
    # Consonants
    "p",
    "b",
    "t",
    "d",
    "k",
    "g",
    "f",
    "v",
    "θ",
    "ð",
    "s",
    "z",
    "ʃ",
    "ʒ",
    "m",
    "n",
    "ŋ",
    "l",
    "r",
    "ɹ",
    "ɾ",
    "w",
    "j",
    "h",
    "ɦ",
    "tʃ",
    "dʒ",
    "ts",
    "dz",
    # Less common
    "ç",
    "x",
    "ʁ",
    "ɻ",
    "ʎ",
    "ɲ",
    "ɲ̥",
}


def is_valid_phoneme(phoneme: str) -> bool:
    """Check if a phoneme is in the valid IPA set."""
    # Strip any artifacts (periods, numbers, etc.)
    cleaned = "".join(c for c in phoneme if c not in "0123456789.,")
    return cleaned in VALID_PHONEMES and len(cleaned) > 0


def preprocess_audio(audio_buffer: io.BytesIO) -> torch.Tensor:
    """Load and preprocess audio for wav2vec2."""
    start_time = time.perf_counter()
    audio, orig_sr = torchaudio.load(audio_buffer)

    # Convert to mono if stereo
    if audio.shape[0] > 1:
        audio = torch.mean(audio, dim=0, keepdim=True)

    # Resample to 16kHz if necessary
    if orig_sr != SAMPLING_RATE:
        resampler = torchaudio.transforms.Resample(orig_sr, SAMPLING_RATE)
        audio = resampler(audio)

    # Flatten to 1D
    audio = audio.squeeze()
    end_time = time.perf_counter()
    print(f"Audio preprocessing completed in {end_time - start_time:.4f} seconds.")
    return audio


class Phoneme(TypedDict):
    phoneme: str
    start: float
    end: float
    confidence: float


def extract_phoneme_timings_from_logits(
    logits: torch.Tensor, audio_length: int
) -> list[Phoneme]:
    """
    Convert raw logits back to phoneme timings.
    """
    # Get predicted phoneme IDs
    predicted_ids = torch.argmax(logits, dim=-1).squeeze().cpu().numpy()

    # Get confidence scores
    probs = torch.nn.functional.softmax(logits, dim=-1)
    max_probs = torch.max(probs, dim=-1)[0].squeeze().cpu().numpy()

    # Calculate frame duration
    frame_duration = audio_length / len(predicted_ids) / SAMPLING_RATE

    # DEBUG: Log raw predictions
    if DEBUG:
        raw_predictions = []
        for i, (phoneme_id, confidence) in enumerate(zip(predicted_ids, max_probs)):
            phoneme = processor.decode([phoneme_id]).strip()
            raw_predictions.append(
                {"id": int(phoneme_id), "raw": phoneme, "confidence": float(confidence)}
            )

        print("\n=== RAW PHONEME PREDICTIONS ===")
        print(f"Total frames: {len(predicted_ids)}")
        for i, pred in enumerate(raw_predictions[:50]):  # First 50
            print(
                f"  {i}: id={pred['id']:3d} | raw='{pred['raw']:10s}' | conf={pred['confidence']:.3f}"
            )
        print()

    # Group consecutive identical predictions (CTC collapse)
    phoneme_timings = []
    current_phoneme = None
    current_start = 0
    current_confidences = []

    for i, (phoneme_id, confidence) in enumerate(zip(predicted_ids, max_probs)):
        phoneme = processor.decode([phoneme_id]).strip()

        # Clean phoneme of artifacts
        phoneme = "".join(c for c in phoneme if c not in "0123456789.,;:\"'").strip()

        # Skip blank tokens
        if (
            phoneme == ""
            or phoneme == processor.tokenizer.pad_token
            or not phoneme
            or not is_valid_phoneme(phoneme)
        ):
            if current_phoneme is not None:
                phoneme_timings.append(
                    {
                        "phoneme": current_phoneme,
                        "start": round(current_start * frame_duration, 3),
                        "end": round(i * frame_duration, 3),
                        "confidence": round(np.mean(current_confidences), 3),
                    }
                )
                current_phoneme = None
                current_confidences = []
            continue

        if phoneme != current_phoneme:
            if current_phoneme is not None:
                phoneme_timings.append(
                    {
                        "phoneme": current_phoneme,
                        "start": round(current_start * frame_duration, 3),
                        "end": round(i * frame_duration, 3),
                        "confidence": round(np.mean(current_confidences), 3),
                    }
                )

            current_phoneme = phoneme
            current_start = i
            current_confidences = [confidence]
        else:
            current_confidences.append(confidence)

    # Handle final phoneme
    if current_phoneme is not None:
        phoneme_timings.append(
            {
                "phoneme": current_phoneme,
                "start": round(current_start * frame_duration, 3),
                "end": round(len(predicted_ids) * frame_duration, 3),
                "confidence": round(np.mean(current_confidences), 3),
            }
        )

    # DEBUG: Log filtered phonemes
    if DEBUG:
        print("=== AFTER FILTERING ===")
        for timing in phoneme_timings:
            print(
                f"  {timing['phoneme']:10s} | conf={timing['confidence']:.3f} | {timing['start']:.3f}-{timing['end']:.3f}s"
            )
        print()

    return phoneme_timings


def phoneme_align(audio_b64: str):
    """
    Perform phoneme-level alignment and return detailed results.
    """
    start_time = time.perf_counter()
    try:
        print("Starting phoneme alignment...")

        # Decode audio
        audio_bytes = base64.b64decode(audio_b64)
        # Preprocess audio

        # Preprocess audio
        audio_buffer = io.BytesIO(audio_bytes)
        audio_tensor = preprocess_audio(audio_buffer)
        audio_length = len(audio_tensor)

        # Prepare input for model
        print("Processing with Wav2Vec2 processor...")
        inputs = processor(
            audio_tensor.numpy(), sampling_rate=SAMPLING_RATE, return_tensors="pt"
        )
        inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

        # Run inference
        print("Running model inference...")
        with torch.no_grad():
            logits = model(**inputs).logits

        end_time = time.perf_counter()
        print(f"Phoneme alignment completed in {end_time - start_time:.4f} seconds.")
        return extract_phoneme_timings_from_logits(logits, audio_length)

    except Exception as e:
        print(f"Error in phoneme alignment: {e}")
        raise HTTPException(
            status_code=500, detail=f"Phoneme alignment failed: {str(e)}"
        )


def extract_phonemes_by_timespan(
    phoneme_timings: list[Phoneme],
    start_time: float,
    end_time: float,
    target_phoneme_count: int,
    overlap_threshold: float = 0.0025,
    max_buffer_s: float = 0.3,
) -> list[Phoneme]:
    """Extract phonemes that overlap with the specified time span."""
    if target_phoneme_count <= 0 or not phoneme_timings:
        return []

    # First pass: Find phonemes that actually overlap the word
    candidates = []
    for i, phoneme_data in enumerate(phoneme_timings):
        p_start = phoneme_data["start"]
        p_end = phoneme_data["end"]

        # Check if phoneme overlaps with word boundaries
        if p_end > start_time and p_start < end_time:
            overlap = min(p_end, end_time) - max(p_start, start_time)
            candidates.append(
                {
                    "index": i,
                    "phoneme": phoneme_data,
                    "overlap": overlap,
                    "start": p_start,
                }
            )

    # If we found enough, use them
    if len(candidates) >= target_phoneme_count:
        # Sort by overlap amount (prefer phonemes mostly within word)
        candidates.sort(key=lambda x: -x["overlap"])
        selected = candidates[:target_phoneme_count]
    else:
        # Second pass: expand search to nearby phonemes
        word_center = (start_time + end_time) / 2
        all_candidates = []

        for i, phoneme_data in enumerate(phoneme_timings):
            p_start = phoneme_data["start"]
            distance = abs(p_start - word_center)

            all_candidates.append(
                {
                    "index": i,
                    "phoneme": phoneme_data,
                    "distance": distance,
                    "start": p_start,
                    "in_bounds": distance < 0.1,  # Strongly prefer close ones
                }
            )

        # Sort: in-bounds first, then by distance
        all_candidates.sort(key=lambda x: (not x["in_bounds"], x["distance"]))
        selected = all_candidates[:target_phoneme_count]

    # Re-sort by chronological order
    selected.sort(key=lambda x: x["index"])
    result = [item["phoneme"] for item in selected]

    print(
        f"  Word: {start_time:.3f}-{end_time:.3f}s | "
        f"Expected: {target_phoneme_count} | "
        f"Found: {len(result)} | "
        f"Phonemes: {[p['phoneme'] for p in result]}"
    )

    return result


# @deprecated(reason="Use phonemes.calculate_phoneme_similarity instead", version="1.0.0")
def calculate_phoneme_accuracy(
    detected: list[Phoneme], target: list[str]
) -> dict[str, ...]:
    """Calculate accuracy between detected and target phonemes."""
    detected_phonemes = [p["phoneme"] for p in detected if p["phoneme"].strip()]

    # Use sequence alignment to match detected vs target phonemes
    matcher = difflib.SequenceMatcher(None, target, detected_phonemes)
    similarity = matcher.ratio()

    # Count exact matches
    matching_blocks = matcher.get_matching_blocks()
    total_matched = sum(
        block.size for block in matching_blocks[:-1]
    )  # Exclude dummy block

    # Calculate confidence
    avg_confidence = np.mean([p["confidence"] for p in detected]) if detected else 0.0

    return {
        "accuracy": round(similarity, 3),
        "phoneme_accuracy": round(total_matched / len(target), 3) if target else 0.0,
        "detected_phonemes": detected_phonemes,
        "target_phonemes": target,
        "matched_phonemes": total_matched,
        "total_target": len(target),
        "confidence": round(avg_confidence, 3),
    }
