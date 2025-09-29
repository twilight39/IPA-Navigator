import React, { useRef, useState } from "react";
import {
  MicrophoneIcon,
  PlayIcon,
  SpeakerHighIcon,
  StopIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useTTS } from "../../hooks/useTTS.tsx";
import { usePronunciationAnalysis } from "../../hooks/usePronunciationAnalysis.tsx";

interface WordPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordResult: any; // Replace with proper type
  originalText: string; // The full text for context
}

export function WordPracticeModal({
  isOpen,
  onClose,
  wordResult,
}: WordPracticeModalProps) {
  const [practiceResults, setPracticeResults] = useState<any>(null);
  const modalRef = useRef<HTMLDialogElement>(null);

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

  // Open/close modal based on isOpen prop
  React.useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.showModal();
    } else if (!isOpen && modalRef.current) {
      modalRef.current.close();
    }
  }, [isOpen]);

  const getStatusColor = (status: string, accuracy: number = 1) => {
    switch (status) {
      case "correct":
        return accuracy >= 0.9 ? "badge-success" : "badge-info";
      case "substitution":
        return "badge-warning";
      case "deletion":
        return "badge-error";
      default:
        return "badge-neutral";
    }
  };

  const getWordAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return "badge-success";
    if (accuracy >= 0.75) return "badge-info";
    if (accuracy >= 0.6) return "badge-warning";
    return "badge-error";
  };

  const handleStartRecording = async () => {
    resetRecording();
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleAnalyze = async () => {
    if (hasRecording) {
      const result = await analyzeAudio(wordResult.word);
      if (result && result.word_results.length > 0) {
        // Find the matching word result or use the first one
        const matchingWord = result.word_results.find(
          (wr: any) => wr.word.toLowerCase() === wordResult.word.toLowerCase(),
        ) || result.word_results[0];

        setPracticeResults(matchingWord);
      }
    }
  };

  const handlePlayReference = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playText(wordResult.word);
    }
  };

  const handleReset = () => {
    resetRecording();
    setPracticeResults(null);
  };

  const currentResults = practiceResults || wordResult;
  const hasImprovement = practiceResults &&
    practiceResults.word_accuracy > wordResult.word_accuracy;

  return (
    <dialog
      ref={modalRef}
      className="modal"
      onClose={onClose}
    >
      <div className="modal-box max-w-lg bg-base-100">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl">
            Practice: "{wordResult.word}"
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Word Overview */}
          <div className="bg-base-200 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold">{wordResult.word}</span>
              <div
                className={`badge badge-lg ${
                  getWordAccuracyColor(currentResults.word_accuracy)
                }`}
              >
                {Math.round(currentResults.word_accuracy * 100)}%
              </div>
            </div>

            {/* Show improvement if practice results exist */}
            {hasImprovement && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base-content/70">Original:</span>
                <div
                  className={`badge ${
                    getWordAccuracyColor(wordResult.word_accuracy)
                  }`}
                >
                  {Math.round(wordResult.word_accuracy * 100)}%
                </div>
                <span className="text-base-content/70">→</span>
                <span className="text-success font-medium">Improved!</span>
              </div>
            )}

            {/* Phoneme Breakdown */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Phoneme Analysis:</span>
              <div className="flex flex-wrap gap-1">
                {currentResults.phoneme_analysis.phoneme_results.map((
                  phoneme: any,
                  index: number,
                ) => (
                  <div
                    key={index}
                    className={`badge font-mono text-xs ${
                      getStatusColor(phoneme.status, phoneme.accuracy)
                    }`}
                    title={`Target: /${phoneme.target}/ | Detected: ${
                      phoneme.detected ? `/${phoneme.detected}/` : "none"
                    } | Accuracy: ${Math.round(phoneme.accuracy * 100)}%`}
                  >
                    /{phoneme.target}/
                    {phoneme.status === "substitution" && phoneme.detected && (
                      <span className="ml-1 opacity-80">
                        →{phoneme.detected}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reference Audio Button */}
            <button
              className={`btn btn-outline btn-sm w-full ${
                isPlaying ? "btn-error" : "btn-primary"
              }`}
              onClick={handlePlayReference}
              disabled={ttsLoading}
            >
              {ttsLoading
                ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2">
                    </span>
                    Loading...
                  </>
                )
                : isPlaying
                ? (
                  <>
                    <StopIcon size={16} className="mr-2" />
                    Stop Reference
                  </>
                )
                : (
                  <>
                    <SpeakerHighIcon size={16} className="mr-2" />
                    Listen to Reference
                  </>
                )}
            </button>
          </div>

          {/* Recording Section */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <button
                onClick={isRecording
                  ? handleStopRecording
                  : handleStartRecording}
                disabled={isAnalyzing || ttsLoading || isPlaying}
                className={`btn btn-circle btn-lg ${
                  isRecording ? "btn-error" : "btn-primary"
                }`}
              >
                {isRecording
                  ? <StopIcon size={28} weight="fill" />
                  : <MicrophoneIcon size={28} weight="bold" />}
              </button>
            </div>

            <p className="text-sm text-base-content/70">
              {isRecording && "Recording... Click to stop"}
              {isAnalyzing && "Analyzing pronunciation..."}
              {!isRecording && !isAnalyzing &&
                "Click to record your pronunciation"}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-center">
              {hasRecording && !practiceResults && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isRecording}
                  className={`btn btn-success btn-sm ${
                    isAnalyzing ? "loading" : ""
                  }`}
                >
                  {!isAnalyzing && <PlayIcon size={16} className="mr-2" />}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={isRecording || isAnalyzing}
                className="btn btn-outline btn-sm"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Improvement Tips */}
          {currentResults.word_accuracy < 0.9 && (
            <div className="alert alert-warning">
              <div>
                <h4 className="font-bold">Improvement Tips:</h4>
                <ul className="text-sm mt-2 space-y-1">
                  {currentResults.phoneme_analysis.phoneme_results
                    .filter((p: any) => p.accuracy < 0.8)
                    .slice(0, 3) // Show max 3 tips to avoid overwhelming
                    .map((phoneme: any, index: number) => (
                      <li key={index}>
                        • Focus on the /{phoneme.target}/ sound
                        {phoneme.status === "substitution" &&
                          phoneme.detected &&
                          ` (you pronounced /${phoneme.detected}/)`}
                      </li>
                    ))}
                  <li>
                    • Listen to the reference audio and try to match it closely
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Success Message */}
          {hasImprovement && (
            <div className="alert alert-success">
              <div>
                <h4 className="font-bold">Great improvement!</h4>
                <p className="text-sm">
                  Your pronunciation accuracy improved by{"  "}{Math.round(
                    (practiceResults.word_accuracy - wordResult.word_accuracy) *
                      100,
                  )}%! Keep practicing to perfect your pronunciation.
                </p>
              </div>
            </div>
          )}

          {/* Perfect Score Celebration */}
          {currentResults.word_accuracy >= 0.95 && (
            <div className="alert alert-success">
              <div>
                <h4 className="font-bold">Excellent pronunciation! 🎉</h4>
                <p className="text-sm">
                  You've mastered the pronunciation of "{wordResult.word}". Your
                  accuracy is outstanding!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-action">
          <button
            className="btn btn-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
