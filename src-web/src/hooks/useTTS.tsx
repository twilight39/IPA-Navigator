import { useState } from "react";
import { toast } from "sonner";

type TTSVoice =
  | "american_female_bella"
  | "american_female_nicole"
  | "american_female_sky"
  | "american_male_fenrir"
  | "american_male_michael"
  | "american_male_puck"
  | "british_female_emma"
  | "british_female_isabella"
  | "british_female_lily"
  | "british_male_fable"
  | "british_male_george"
  | "british_male_lewis";

interface UseTTSOptions {
  serverUrl?: string;
  defaultVoice?: TTSVoice;
  defaultSpeed?: number;
}

export function useTTS(options: UseTTSOptions = {}) {
  const {
    serverUrl = "http://0.0.0.0:3002/api/tts",
    defaultVoice = "american_female_bella",
    defaultSpeed = 1,
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const playText = async (
    text: string,
    voice: TTSVoice = defaultVoice,
    speed: number = defaultSpeed,
  ) => {
    // Stop any currently playing audio
    stopAudio();

    setError(null);
    setIsLoading(true);

    // Function that returns the promise for fetching and playing audio
    const fetchAndPlayAudio = async () => {
      try {
        const response = await fetch(serverUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voice,
            speed,
          }),
        });

        if (!response.ok) {
          throw new Error(
            `TTS API error: ${response.status} ${response.statusText}`,
          );
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const newAudio = new Audio(audioUrl);

        newAudio.onended = () => {
          setIsPlaying(false);
        };

        newAudio.onpause = () => {
          setIsPlaying(false);
        };

        newAudio.onerror = (e) => {
          const errorMessage = `Audio playback error: ${e}`;
          setError(errorMessage);
          setIsPlaying(false);
          throw new Error(errorMessage);
        };

        setAudio(newAudio);
        await newAudio.play();
        setIsPlaying(true);

        return "Audio playback started";
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "Unknown error occurred";
        setError(errorMessage);
        throw error; // Re-throw for toast.promise to catch
      } finally {
        setIsLoading(false);
      }
    };

    toast.promise(fetchAndPlayAudio(), {
      loading: "Generating audio...",
      success: (message) => message,
      error: (error) =>
        `Failed to generate audio: ${error.message || "Unknown error"}`,
    });
  };

  return {
    playText,
    stopAudio,
    isPlaying,
    error,
  };
}
