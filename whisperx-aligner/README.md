# WhisperX Aligner Service

A fast and accurate audio-text alignment service based on WhisperX.

## API Usage

### Alignment Endpoint

#### POST /align

**Request Body:**
```json
{
  "audio_data": "base64_encoded_audio",
  "transcript": "text to align with the audio",
  "language": "en"
}
```

**Reponse Body:**
```json
{
  "segments": [
    {
      "word": "example",
      "start": 0.34,
      "end": 0.82,
      "phonemes": [
        {"phoneme": "ɪ", "start": 0.34, "end": 0.41},
        {"phoneme": "ɡ", "start": 0.41, "end": 0.48},
        {"phoneme": "z", "start": 0.48, "end": 0.56},
        {"phoneme": "æ", "start": 0.56, "end": 0.69},
        {"phoneme": "m", "start": 0.69, "end": 0.75},
        {"phoneme": "p", "start": 0.75, "end": 0.79},
        {"phoneme": "əl", "start": 0.79, "end": 0.82}
      ]
    }
  ],
  "overall_confidence": 0.95
}
