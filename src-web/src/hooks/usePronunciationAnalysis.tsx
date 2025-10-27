import { useState } from "react";
import { toast } from "sonner";
import RecordRTC from "recordrtc";

export interface PhonemeResult {
  position: number | null;
  target: string | null;
  detected: string | null;
  accuracy: number;
  confidence: number | null;
  timing: {
    start: number;
    end: number;
  } | null;
  status: "correct" | "substitution" | "insertion" | "deletion";
  similarity_score: number | null;
}

export interface PhonemeAnalysis {
  target_phonemes: string[];
  detected_phonemes: string[];
  phoneme_results: PhonemeResult[];
  word_accuracy: number;
}

export interface WordResult {
  word: string;
  expected_index: number;
  transcribed_as: string | null;
  word_accuracy: number;
  word_confidence: number;
  time_boundary: {
    start: number | null;
    end: number | null;
  };
  phoneme_analysis: PhonemeAnalysis;
}

export interface AnalysisResult {
  overall_accuracy: number;
  overall_confidence: number;
  total_words: number;
  word_results: WordResult[];
}

type Dialect = "us" | "uk";

interface UsePronunciationAnalysisOptions {
  serverUrl?: string;
  defaultDialect?: Dialect;
}

interface UsePronunciationAnalysisOptions {
  serverUrl?: string;
  defaultDialect?: Dialect;
}

export function usePronunciationAnalysis(
  options: UsePronunciationAnalysisOptions = {},
) {
  const {
    serverUrl = "http://127.0.0.1:8000/align",
    defaultDialect = "uk",
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recorder, setRecorder] = useState<any>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Start recording audio
  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      setAudioBlob(null);
      setAudioURL(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const recordRTC = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1, // Mono
        desiredSampRate: 16000, // 16kHz
        bufferSize: 16384,
        audioBitsPerSecond: 128000,
      });

      recordRTC.startRecording();
      setRecorder(recordRTC);
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Failed to access microphone";
      setError(errorMessage);
      toast.error(`Recording error: ${errorMessage}`);
    }
  };

  const stopRecording = () => {
    if (recorder && isRecording) {
      recorder.stopRecording(() => {
        const blob = recorder.getBlob();
        // console.log("RecordRTC blob:", blob.size, "bytes, type:", blob.type);

        setAudioBlob(blob);
        setAudioURL(URL.createObjectURL(blob));
        setIsRecording(false);

        try {
          const internalRecorder = recorder.getInternalRecorder();
          if (internalRecorder && internalRecorder.stream) {
            internalRecorder.stream.getTracks().forEach(
              (track: MediaStreamTrack) => {
                track.stop();
              },
            );
          }
        } catch (e) {
          console.warn("Could not clean up media stream:", e);
        }
      });
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result?.toString().split(",")[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzeAudio = (
    transcript: string,
    dialect: Dialect = defaultDialect,
  ) => {
    if (!audioBlob) {
      const errorMessage = "No recording available to analyze";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }

    setIsAnalyzing(true);

    const analyzeAudioPromise = async () => {
      try {
        const base64Audio = await blobToBase64(audioBlob);
        // console.log("Base64 audio length:", base64Audio.length);

        const response = await fetch(serverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio_data: base64Audio,
            transcript,
            accent: dialect,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Analysis API error: ${response.status} ${response.statusText}`,
          );
        }

        const analysisResult: AnalysisResult = await response.json();
        setResult(analysisResult);
        console.log(analysisResult);
        return analysisResult;
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Unknown error occurred";
        setError(errorMessage);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    };

    return toast.promise(analyzeAudioPromise(), {
      loading: "Analyzing pronunciation...",
      success: (data) =>
        `Analysis complete! Score: ${Math.round(data.overall_accuracy * 100)}%`,
      error: (error) => `Analysis failed: ${error.message || "Unknown error"}`,
    });
  };

  const reset = () => {
    setIsRecording(false);
    setIsAnalyzing(false);
    setResult(null);
    setError(null);
    setAudioBlob(null);
    setAudioURL(null);

    if (recorder) {
      // Stop recording if still active
      if (isRecording) {
        recorder.stopRecording(() => {
          try {
            const internalRecorder = recorder.getInternalRecorder();
            if (internalRecorder && internalRecorder.stream) {
              internalRecorder.stream.getTracks().forEach(
                (track: MediaStreamTrack) => {
                  track.stop();
                },
              );
            }
          } catch (e) {
            console.warn("Could not clean up media stream in reset:", e);
          }
        });
      } else {
        // Just clean up streams if recording already stopped
        try {
          const internalRecorder = recorder.getInternalRecorder();
          if (internalRecorder && internalRecorder.stream) {
            internalRecorder.stream.getTracks().forEach(
              (track: MediaStreamTrack) => {
                track.stop();
              },
            );
          }
        } catch (e) {
          console.warn("Could not clean up media stream in reset:", e);
        }
      }
    }
    setRecorder(null);
  };

  return {
    startRecording,
    stopRecording,
    analyzeAudio,
    reset,
    isRecording,
    isAnalyzing,
    result,
    error,
    hasRecording: !!audioBlob,
    audioURL,
  };
}
