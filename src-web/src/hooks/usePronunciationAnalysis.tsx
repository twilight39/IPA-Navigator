import { useState } from "react";
import { toast } from "sonner";

interface PhonemeDetail {
  expected: string;
  actual: string;
  score: number;
  start_time: number;
  end_time: number;
}

interface AnalysisResult {
  overall_score: number;
  phoneme_details: PhonemeDetail[];
}

type Dialect = "us" | "uk";

interface UsePronunciationAnalysisOptions {
  serverUrl?: string;
  defaultDialect?: Dialect;
}

export function usePronunciationAnalysis(
  options: UsePronunciationAnalysisOptions = {},
) {
  const {
    serverUrl = "http://0.0.0.0:3002/api/pronunciation",
    defaultDialect = "uk",
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null,
  );
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.addEventListener("dataavailable", (event) => {
        audioChunks.push(event.data);
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);

        setAudioBlob(audioBlob);
        setAudioURL(audioUrl);
        setIsRecording(false);
      });

      setMediaRecorder(recorder);
      recorder.start();
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
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      // Close the media stream tracks to properly release the microphone
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // The result includes the data URL prefix (e.g., "data:audio/wav;base64,")
        // We need to remove that prefix to get just the base64 data
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

  const analyzeAudio = async (
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

        const response = await fetch(serverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audio: base64Audio,
            transcript,
            dialect,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `Analysis API error: ${response.status} ${response.statusText}`,
          );
        }

        const analysisResult: AnalysisResult = await response.json();
        setResult(analysisResult);
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
        `Analysis complete! Score: ${Math.round(data.overall_score * 100)}%`,
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

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
    setMediaRecorder(null);
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
