from fastapi import FastAPI, HTTPException

import torch
import os
from pydantic import BaseModel
import base64
import soundfile as sf
import tempfile
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
import numpy as np
import torchaudio

DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
SAMPLING_RATE: int = 16000
MODEL_NAME = "facebook/wav2vec2-lv-60-espeak-cv-ft"

print(f"Loading Wav2Vec2 phoneme model on {DEVICE}...")
processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
model = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME).to(DEVICE)
print("Wav2Vec2 model loaded successfully.")

app = FastAPI()


class PhonemeAlignRequest(BaseModel):
    audio_b64: str
    target_transcript: str
    accent: str  # "us" or "uk"


class PhonemeResult(BaseModel):
    phoneme: str
    start: float
    end: float
    confidence: float


def preprocess_audio(audio_path: str) -> torch.Tensor:
    """Load and preprocess audio for wav2vec2."""
    audio, orig_sr = torchaudio.load(audio_path)

    # Convert to mono if stereo
    if audio.shape[0] > 1:
        audio = torch.mean(audio, dim=0, keepdim=True)

    # Resample to 16kHz if necessary
    if orig_sr != SAMPLING_RATE:
        resampler = torchaudio.transforms.Resample(orig_sr, SAMPLING_RATE)
        audio = resampler(audio)

    # Flatten to 1D
    audio = audio.squeeze()
    return audio


def extract_phoneme_timings(logits: torch.Tensor, audio_length: int) -> list[dict[...]]:
    """
    Extract phoneme-level timings from CTC logits.
    """
    # Get predicted phoneme IDs
    predicted_ids = torch.argmax(logits, dim=-1)
    predicted_ids = predicted_ids.squeeze().cpu().numpy()

    # Convert to phonemes
    phonemes = []
    confidences = []

    # Get confidence scores (max probability for each frame)
    probs = torch.nn.functional.softmax(logits, dim=-1)
    max_probs = torch.max(probs, dim=-1)[0].squeeze().cpu().numpy()

    # Calculate frame duration in seconds
    # Wav2vec2 produces one prediction per ~20ms of audio
    frame_duration = audio_length / len(predicted_ids) / SAMPLING_RATE

    # Group consecutive identical predictions (CTC collapse)
    current_phoneme = None
    current_start = 0
    current_confidences = []

    phoneme_timings = []

    for i, (phoneme_id, confidence) in enumerate(zip(predicted_ids, max_probs)):
        phoneme = processor.decode([phoneme_id]).strip()

        # Skip blank tokens (CTC uses these for alignment)
        if phoneme == "" or phoneme == processor.tokenizer.pad_token:
            if current_phoneme is not None:
                # End current phoneme
                phoneme_timings.append(
                    {
                        "phoneme": str(current_phoneme),
                        "start": float(round(current_start * frame_duration, 3)),
                        "end": float(round(i * frame_duration, 3)),
                        "confidence": float(round(np.mean(current_confidences), 3)),
                    }
                )
                current_phoneme = None
                current_confidences = []
            continue

        if phoneme != current_phoneme:
            # End previous phoneme
            if current_phoneme is not None:
                phoneme_timings.append(
                    {
                        "phoneme": current_phoneme,
                        "start": round(current_start * frame_duration, 3),
                        "end": round(i * frame_duration, 3),
                        "confidence": round(np.mean(current_confidences), 3),
                    }
                )

            # Start new phoneme
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


@app.post("/phoneme_align")
async def phoneme_align(request: PhonemeAlignRequest):
    """
    Perform phoneme-level alignment and return detailed results.
    """
    try:
        # Decode audio
        audio_bytes = base64.b64decode(request.audio_b64)
        # Preprocess audio

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(audio_bytes)
            temp_path = tmp.name

        try:
            # Preprocess audio
            audio_tensor = preprocess_audio(temp_path)
            audio_length = len(audio_tensor)
            # Prepare input for model
            inputs = processor(
                audio_tensor.numpy(), sampling_rate=SAMPLING_RATE, return_tensors="pt"
            )
            inputs = {k: v.to(DEVICE) for k, v in inputs.items()}

            # Run inference
            with torch.no_grad():
                logits = model(**inputs).logits

            # Extract attributes
            phoneme_timings = extract_phoneme_timings(logits, audio_length)
            overall_confidence = (
                np.mean([p["confidence"] for p in phoneme_timings])
                if phoneme_timings
                else 0.0
            )

            print(f"Phoneme timings: {phoneme_timings}")

            return {
                "status": "success",
                "phonemes": phoneme_timings,
                "overall_confidence": float(round(overall_confidence, 3)),
                "target_transcript": request.target_transcript,
            }

        finally:
            os.remove(temp_path)

    except Exception as e:
        print(f"Error in phoneme alignment: {e}")
        raise HTTPException(
            status_code=500, detail=f"Phoneme alignment failed: {str(e)}"
        )
