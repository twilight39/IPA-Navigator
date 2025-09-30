import { useEffect, useRef, useState } from "react";
import {
  MicrophoneIcon,
  PlayIcon,
  SpeakerHighIcon,
  StopIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useTTS } from "../../hooks/useTTS.tsx";
import {
  usePronunciationAnalysis,
} from "../../hooks/usePronunciationAnalysis.tsx";
import { usePhonemeFeedbacks } from "../../hooks/usePhonemeFeedbacks.tsx";

interface WordPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordResult: any;
}

export function WordPracticeModal({
  isOpen,
  onClose,
  wordResult,
}: WordPracticeModalProps) {
  const [practiceResults, setPracticeResults] = useState<any>(null);
  const [selectedPhonemeIndex, setSelectedPhonemeIndex] = useState(0);

  console.log(wordResult);

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
  const { feedbackMap } = usePhonemeFeedbacks();

  // Open/close modal based on isOpen prop
  useEffect(() => {
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

  const handleStartRecording = () => {
    resetRecording();
    setPracticeResults(null);
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleAnalyze = async () => {
    if (hasRecording) {
      const result = analyzeAudio(wordResult.word);
      if (result !== undefined) {
        const analysis = await result.unwrap();
        if (analysis.word_results.length > 0) {
          const matchingWord = analysis.word_results.find(
            (wr: any) =>
              wr.word.toLowerCase() === wordResult.word.toLowerCase(),
          ) || analysis.word_results[0];

          setPracticeResults(matchingWord);
        }
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
    setSelectedPhonemeIndex(0);
  };

  const currentResults = practiceResults || wordResult;
  const currentPhonemeResults = currentResults?.phoneme_analysis
    ?.phoneme_results || [];

  const hasImprovement = practiceResults &&
    practiceResults.word_accuracy > wordResult.word_accuracy;

  useEffect(() => {
    if (
      selectedPhonemeIndex >= currentPhonemeResults.length &&
      currentPhonemeResults.length > 0
    ) {
      setSelectedPhonemeIndex(0);
    }
  }, [currentPhonemeResults, selectedPhonemeIndex]);

  return (
    <dialog
      ref={modalRef}
      className="modal"
      onClose={onClose}
    >
      <div className="modal-box max-w-lg bg-base-100 p-6 shadow-xl rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-xl text-base-content">
            Practice: "{wordResult.word}"
          </h3>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Word Overview and Phoneme Breakdown - Mimics bg-gradient-to-br from-blue-50 to-slate-50 */}
          <div className="bg-base-100 p-4 rounded-lg border border-base-300 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-base-content">
                {wordResult.word}
              </span>
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
              <div className="flex items-center gap-2 text-sm text-base-content/70">
                <span>Original:</span>
                <div
                  className={`badge ${
                    getWordAccuracyColor(wordResult.word_accuracy)
                  }`}
                >
                  {Math.round(wordResult.word_accuracy * 100)}%
                </div>
                <span>→</span>
                <span className="text-success font-medium">Improved!</span>
              </div>
            )}

            {/* Phoneme Breakdown */}
            {currentPhonemeResults.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {currentPhonemeResults.map((
                  phoneme: any,
                  index: number,
                ) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedPhonemeIndex(index)}
                    className={`badge font-mono text-xs transition-all duration-100 cursor-pointer ${
                      getStatusColor(phoneme.status, phoneme.accuracy)
                    } ${
                      selectedPhonemeIndex === index
                        ? "ring-2 ring-primary ring-offset-1"
                        : ""
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
                  </button>
                ))}
              </div>
            )}

            {/* Reference Audio Button (New placement) */}
            <button
              onClick={handlePlayReference}
              disabled={ttsLoading || isRecording || isAnalyzing}
              className="btn btn-outline btn-sm w-full mt-3"
            >
              <SpeakerHighIcon size={16} className="mr-2" />
              {isPlaying ? "Stop Reference" : "Listen to Reference"}
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
                aria-label={isRecording ? "Stop Recording" : "Start Recording"}
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
                  disabled={isAnalyzing || isRecording || ttsLoading ||
                    isPlaying}
                  className={`btn btn-success btn-sm ${
                    isAnalyzing ? "animate-pulse" : "" // Simulating loading spinner
                  }`}
                >
                  {isAnalyzing && (
                    <span className="loading loading-spinner mr-2"></span>
                  )}
                  {isAnalyzing ? "Analyzing..." : "Analyze"}
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={isRecording || isAnalyzing || ttsLoading || isPlaying}
                className="btn btn-outline btn-sm"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Phoneme Description (New separate section) */}
          {currentPhonemeResults.length > 0 && (
            <div className="bg-base-200 p-4 rounded-lg border border-base-300">
              {/* Distinct background */}
              <h4 className="font-semibold text-sm mb-2 text-base-content">
                How to pronounce /{currentPhonemeResults[selectedPhonemeIndex]
                  .target}/
              </h4>
              <ul className="text-xs space-y-1 list-disc list-inside text-base-content/80">
                {(feedbackMap.get(
                  currentPhonemeResults[selectedPhonemeIndex].target,
                )?.description ?? [
                  "No specific tips found for this phoneme. Try listening to the reference and focusing on tongue/lip position.",
                ]).map((tip: string, i: number) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          )}

          {/* Success Message - Restyled */}
          {hasImprovement && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200">
              <h4 className="font-bold text-emerald-800 mb-1">
                Great improvement!
              </h4>
              <p className="text-sm text-emerald-700">
                Your pronunciation accuracy improved by {Math.round(
                  (practiceResults.word_accuracy - wordResult.word_accuracy) *
                    100,
                )}%! Keep practicing to perfect your pronunciation.
              </p>
            </div>
          )}

          {/* Perfect Score Celebration - Restyled */}
          {currentResults.word_accuracy >= 0.95 && (
            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200">
              <h4 className="font-bold text-emerald-800 mb-1">
                Excellent pronunciation! 🎉
              </h4>
              <p className="text-sm text-emerald-700">
                You've mastered the pronunciation of "{wordResult.word}". Your
                accuracy is outstanding!
              </p>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-action mt-6">
          {/* Added margin top */}
          <button
            className="btn btn-primary w-full"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      {/* Backdrop */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} aria-label="Close dialog backdrop">
          close
        </button>
      </form>
    </dialog>
  );
}
