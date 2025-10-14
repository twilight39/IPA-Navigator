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

print(f"Loading Wav2Vec2 phoneme model on {DEVICE}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME).to(DEVICE)
print("Wav2Vec2 model loaded successfully.")


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

    # Group consecutive identical predictions (CTC collapse)
    phoneme_timings = []
    current_phoneme = None
    current_start = 0
    current_confidences = []

    for i, (phoneme_id, confidence) in enumerate(zip(predicted_ids, max_probs)):
        phoneme = processor.decode([phoneme_id]).strip()

        # Skip blank tokens
        if phoneme == "" or phoneme == processor.tokenizer.pad_token:
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
    overlap_threshold: float = 0.005,
    start_buffer_s: float = 0.10,
    end_buffer_s: float = 0.05,
) -> list[Phoneme]:
    """Extract phonemes that overlap with the specified time span."""
    extracted_phonemes: list[Phoneme] = []

    buffered_start_time = max(0.0, start_time - start_buffer_s)
    buffered_end_time = end_time + end_buffer_s  # Could also add a small end buffer

    for phoneme_data in phoneme_timings:
        p_start = phoneme_data["start"]
        p_end = phoneme_data["end"]

        # Calculate overlap
        overlap_start = max(p_start, buffered_start_time)
        overlap_end = min(p_end, buffered_end_time)
        overlap_duration = max(0, overlap_end - overlap_start)

        # Include phoneme if it has sufficient overlap
        if overlap_duration > overlap_threshold:
            extracted_phonemes.append(phoneme_data)
            extracted_phonemes[-1]["confidence"] = float(
                f"{extracted_phonemes[-1]['confidence']:.3f}"
            )

    return extracted_phonemes


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
