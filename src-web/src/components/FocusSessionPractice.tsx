import { useState } from "react";
import {
  ArrowClockwiseIcon,
  ChartBarIcon,
  CheckIcon,
  MicrophoneIcon,
  SpeakerHighIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { useTTS } from "../hooks/useTTS.tsx";
import { usePronunciationAnalysis } from "../hooks/usePronunciationAnalysis.tsx";
import { PhonemeModal } from "../routes/_protected/chapters/$chapterId.practice.tsx";

interface FocusSessionPracticeProps {
  excerpt: {
    _id: string;
    text: string;
    phonemes: string[];
    phoneme_counts: any;
  };
  onComplete: () => void;
  onClose: () => void;
}

export function FocusSessionPractice({
  excerpt,
  onComplete,
  onClose,
}: FocusSessionPracticeProps) {
  const saveResults = useMutation(
    api.functions.performance.saveFocusSessionPracticeResults,
  );

  const { playText, stopAudio, isPlaying, isLoading: ttsLoading } = useTTS();
  const {
    startRecording,
    stopRecording,
    analyzeAudio,
    result: analysisResult,
    hasRecording,
    isRecording,
    isAnalyzing,
    reset: resetRecording,
    audioURL,
  } = usePronunciationAnalysis();

  const [showFeedback, setShowFeedback] = useState(false);

  const handleListen = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playText(excerpt.text);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  function cleanNulls(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(cleanNulls);
    } else if (obj && typeof obj === "object") {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        cleaned[key] = value === null ? undefined : cleanNulls(value);
      }
      return cleaned;
    }
    return obj;
  }

  const handleAnalyze = async () => {
    if (hasRecording) {
      const result = analyzeAudio(excerpt.text);

      let analysis = null;
      if (result && typeof result.unwrap === "function") {
        analysis = await result.unwrap();
      }

      if (analysis) {
        setShowFeedback(true);
        await saveResults({
          excerptId: excerpt._id as any,
          results: cleanNulls(analysis),
        });
      }
    }
  };

  const handleReset = () => {
    resetRecording();
    setShowFeedback(false);
  };

  return (
    <dialog open className="modal modal-open">
      <div className="modal-box max-w-2xl bg-base-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Practice Excerpt</h3>
          <button
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Excerpt Display */}
          <div className="text-center p-6 bg-base-200 rounded-lg">
            <p className="text-2xl font-bold leading-relaxed">
              "{excerpt.text}"
            </p>
          </div>

          {/* Listen Button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleListen}
              disabled={ttsLoading || isRecording || isAnalyzing}
              className={`btn ${
                isPlaying
                  ? "btn-error"
                  : ttsLoading
                  ? "btn-outline btn-neutral loading"
                  : "btn-outline btn-primary"
              } btn-lg`}
            >
              {ttsLoading ? "Loading..." : isPlaying
                ? (
                  <>
                    <XIcon size={20} weight="bold" className="mr-2" />
                    Stop
                  </>
                )
                : (
                  <>
                    <SpeakerHighIcon size={20} weight="bold" className="mr-2" />
                    Listen
                  </>
                )}
            </button>
          </div>

          {/* Feedback Section */}
          {showFeedback && analysisResult && (
            <div className="alert alert-success">
              <div>
                <h4 className="font-bold">Recording analyzed!</h4>
                <p className="text-sm">
                  Score: {Math.round(analysisResult.overall_accuracy * 100)}%
                </p>
              </div>
            </div>
          )}

          {/* Recording Controls */}
          <div className="flex justify-center gap-4 flex-wrap">
            {!showFeedback && (
              <>
                <button
                  type="button"
                  onClick={handleRecordToggle}
                  disabled={isAnalyzing || ttsLoading || isPlaying}
                  className={`btn ${
                    isRecording ? "btn-error" : "btn-primary"
                  } btn-lg`}
                >
                  <MicrophoneIcon size={24} weight="bold" className="mr-2" />
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
              </>
            )}

            {hasRecording && !showFeedback && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isRecording}
                className={`btn btn-success btn-lg btn-outline ${
                  isAnalyzing ? "loading" : ""
                }`}
              >
                {!isAnalyzing && (
                  <CheckIcon size={24} weight="bold" className="mr-2" />
                )}
                {isAnalyzing ? "Analyzing..." : "Analyze"}
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              disabled={isRecording || isAnalyzing}
              className="btn btn-outline btn-lg"
            >
              <ArrowClockwiseIcon size={24} weight="bold" className="mr-2" />
              Reset
            </button>
          </div>

          {/* Detailed Analysis & Next */}
          <div className="modal-action pt-4 flex gap-2 justify-between">
            {showFeedback && analysisResult && (
              <PhonemeModal
                analysisData={analysisResult}
                audioURL={audioURL}
              />
            )}
            <button
              onClick={() => {
                handleReset();
                onComplete();
              }}
              className="btn btn-primary"
            >
              {showFeedback ? "Next" : "Close"}
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
