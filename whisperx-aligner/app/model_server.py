import torch
import whisperx
from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import base64
import tempfile
import os
from contextlib import asynccontextmanager

# --- Configuration ---
MODEL_NAME = "base.en"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
COMPUTE_TYPE = "int8"


print("Loading WhisperX model... (This will happen only once)")
model = whisperx.load_model(MODEL_NAME, DEVICE, compute_type=COMPUTE_TYPE)
align_model, align_metadata = whisperx.load_align_model(
    language_code="en", device=DEVICE
)
print("Model loaded successfully.")


# --- API Definition ---
app = FastAPI()


class RawAlignRequest(BaseModel):
    audio_b64: str


@app.post("/raw_align")
async def raw_align(request: RawAlignRequest):
    audio_bytes = base64.b64decode(request.audio_b64)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_bytes)
        temp_path = tmp.name

    try:
        audio = whisperx.load_audio(temp_path)
        result = model.transcribe(audio)
        alignment = whisperx.align(
            result["segments"], align_model, align_metadata, audio, DEVICE
        )
        return alignment  # Return the raw result
    finally:
        os.remove(temp_path)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
