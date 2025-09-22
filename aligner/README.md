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
  "accent": "us" | "uk"
}
```

**Reponse Body:**
```json
{
  "overall_accuracy": 0.85,
  "overall_confidence": 0.939,
  "total_words": 5,
  "word_results": [
    {
      "word": "tease",
      "expected_index": 3,
      "transcribed_as": "test",
      "word_accuracy": 0.25,
      "word_confidence": 0.67,
      "time_boundary": { "start": 1.067, "end": 1.432 },
      "phoneme_analysis": {
        "target_phonemes": ["t", "i", "ː", "z"],
        "detected_phonemes": ["t", "ɛ", "s", "t"],
        "phoneme_results": [
          {
            "position": 0,
            "target": "t",
            "detected": "t",
            "accuracy": 1.0,
            "confidence": 0.982,
            "timing": { "start": 1.008, "end": 1.028 },
            "status": "correct"
          },
          {
            "position": 1,
            "target": "i",
            "detected": "ɛ",
            "accuracy": 0.6,  // Based on articulatory similarity
            "confidence": 0.924,
            "timing": { "start": 1.129, "end": 1.149 },
            "status": "substitution",
            "similarity_score": 0.6  // Tongue position, mouth shape similarity
          },
          {
            "position": 2,
            "target": "ː",
            "detected": null,
            "accuracy": 0.0,
            "timing": null,
            "status": "deletion"
          },
          {
            "position": 3,
            "target": "z",
            "detected": "s",
            "accuracy": 0.8,  // Voicing difference but same place/manner
            "confidence": 0.996,
            "timing": { "start": 1.27, "end": 1.29 },
            "status": "substitution",
            "similarity_score": 0.8
          },
          {
            "position": null,
            "target": null,
            "detected": "t",
            "accuracy": 0.0,
            "confidence": 0.983,
            "timing": { "start": 1.371, "end": 1.391 },
            "status": "insertion"
          }
        ]
      }
    }    // ... other words
  ]
}
