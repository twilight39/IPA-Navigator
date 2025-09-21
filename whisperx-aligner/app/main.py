from fastapi import FastAPI, HTTPException
import whisperx
import torch
import os
from contextlib import asynccontextmanager
from pydantic import BaseModel
import base64
import io
import soundfile as sf
import tempfile
import sys
import httpx

app = FastAPI()

MODEL_SERVER_URL = "http://localhost:8001/raw_align"


class AlignmentRequest(BaseModel):
    audio_data: str
    transcript: str
    language: str = "en"


@app.post("/align")
async def align_audio(request: AlignmentRequest):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                MODEL_SERVER_URL,
                json={"audio_b64": request.audio_data},
            )
            response.raise_for_status()  # Raise an exception for 4xx/5xx responses
            raw_alignment = response.json()

        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503, detail=f"Model server is unavailable: {e}"
            )

    aligned_output = []
    print("Raw alignment received:", raw_alignment)
    for segment in raw_alignment.get("segments", []):
        for word in segment.get("words", []):
            aligned_output.append(
                {
                    "word": word["word"],
                    "start": word.get("start"),
                    "end": word.get("end"),
                    "score": word.get("score"),
                }
            )

    return {"status": "success", "alignment": aligned_output}
