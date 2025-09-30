import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CheckIcon,
  MicrophoneIcon,
  PlayIcon,
  SpeakerHighIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { useNavigate } from "@tanstack/react-router";
import { useTTS } from "../../../hooks/useTTS.tsx";
import { usePronunciationAnalysis } from "../../../hooks/usePronunciationAnalysis.tsx";
import { WordPracticeModal } from "../../../components/ChapterComponents/WordPracticeModal.tsx";
import { usePhonemeFeedbacks } from "../../../hooks/usePhonemeFeedbacks.tsx";

export const Route = createFileRoute(
  "/_protected/chapters/$chapterId/practice",
)({
  component: ChapterPracticeComponent,
});

function ChapterPracticeComponent() {
  const params = useParams({
    from: "/_protected/chapters/$chapterId/practice",
  });
  const chapterId = params.chapterId;
  const navigate = useNavigate();

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

  // Get chapter data
  const chapter = useQuery(api.functions.chapters.getChapter, {
    chapterId,
  });

  // Get excerpts for this chapter
  const excerpts = useQuery(api.functions.excerpts.getExcerptsForChapter, {
    chapterId,
  });

  // Session state
  const [currentExcerptIndex, setCurrentExcerptIndex] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleListen = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      const currentExcerpt = excerpts[currentExcerptIndex];
      playText(currentExcerpt.text);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Handle analysis
  const handleAnalyze = async () => {
    if (hasRecording && excerpts) {
      const result = analyzeAudio(excerpts[currentExcerptIndex].text);
      if (result) {
        setShowFeedback(true);
      }
    }
  };

  // Reset everything for this excerpt
  const handleReset = () => {
    resetRecording();
    setShowFeedback(false);
  };

  const handleNextExcerpt = () => {
    if (excerpts && currentExcerptIndex < excerpts.length - 1) {
      setCurrentExcerptIndex((prev) => Math.min(prev + 1, excerpts.length - 1));
      stopAudio();
      handleReset();
    }
  };

  const handlePreviousExcerpt = () => {
    if (currentExcerptIndex > 0) {
      setCurrentExcerptIndex((prev) => Math.max(prev - 1, 0));
      stopAudio();
      handleReset();
    }
  };

  // Show loading state if data is not yet available
  if (!chapter || !excerpts) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Show message if no excerpts are available
  if (excerpts.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <h1 className="text-3xl font-zilla font-bold ml-4">{chapter.name}</h1>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <p className="text-xl mb-4">
              This chapter doesn't have any practice content yet.
            </p>
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/chapters" });
              }}
              className="btn btn-primary mx-auto"
            >
              Return to Chapters
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = Math.round(
    ((currentExcerptIndex + 1) / excerpts.length) * 100,
  );

  return (
    <div className="space-y-6 p-6 mx-auto">
      <div className="text-center pb-2">
        <h1 className="text-4xl font-bold">
          {chapter.name}
        </h1>
        <p className="text-slate-600">
          {chapter.description || "Practice your pronunciation skills."}
        </p>
      </div>

      {/* Practice Card */}
      <div className="card bg-base-100 shadow-xl border border-slate-200 mx-auto max-w-3xl">
        <div className="card-body space-y-6">
          {/* Progress and Listen Button */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-zilla font-semibold">
                Practice Excerpt {currentExcerptIndex + 1} of {excerpts.length}
              </h2>
              <div
                className="radial-progress text-primary"
                style={{
                  "--value": progressPercentage,
                  "--size": "2.5rem",
                } as React.CSSProperties}
                role="progressbar"
              >
                <span className="text-xs font-medium">
                  {progressPercentage}%
                </span>
              </div>
            </div>
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
              }`}
            >
              {ttsLoading
                ? (
                  "Loading..."
                )
                : isPlaying
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

          {/* Excerpt Display */}
          <div className="text-center p-8 bg-base-200 rounded-lg">
            <p className="text-2xl font-zilla leading-relaxed">
              "{excerpts[currentExcerptIndex].text}"
            </p>
          </div>

          {/* Feedback Section - Conditional */}
          {showFeedback && analysisResult && (
            <div className="text-center space-y-4 p-6 bg-success/10 rounded-lg border border-success/20">
              <h3 className="text-lg font-zilla font-semibold text-success">
                Recording Complete!
              </h3>
              <p className="text-success-content font-zilla">
                AI analysis complete. Your score:{" "}
                {Math.round(analysisResult.overall_accuracy * 100)}%
              </p>

              <div className="flex items-center justify-center gap-4 mt-4">
                <PhonemeModal
                  analysisData={analysisResult}
                  audioURL={audioURL}
                />
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

            {hasRecording && (
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
                {isAnalyzing ? "Analyzing..." : "Analyze Pronunciation"}
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

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handlePreviousExcerpt}
              disabled={currentExcerptIndex === 0 || isAnalyzing || isRecording}
              className="btn btn-outline"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNextExcerpt}
              disabled={currentExcerptIndex === excerpts.length - 1 ||
                isAnalyzing || isRecording}
              className="btn btn-primary"
            >
              Next <ArrowRightIcon size={20} className="ml-2" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const PhonemeModal = ({
  analysisData,
  audioURL,
}: {
  analysisData: any;
  audioURL: string | null;
}) => {
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [selectedPhonemeIndex, setSelectedPhonemeIndex] = useState(0);
  const [showWordPractice, setShowWordPractice] = useState(false);
  const { stopAudio, playText, isLoading: ttsLoading, isPlaying } = useTTS();
  const { feedbackMap } = usePhonemeFeedbacks();

  const audioRef = useRef<HTMLAudioElement>(null);

  const playWordSegment = (wordResult: any) => {
    if (!audioURL || !audioRef.current || !wordResult.time_boundary.start) {
      console.warn("Cannot play word segment: missing audio or timing data");
      return;
    }

    const audio = audioRef.current;
    const startTime = wordResult.time_boundary.start - 0.2 > 0
      ? wordResult.time_boundary.start - 0.2
      : 0;
    const endTime = wordResult.time_boundary.end - 0.3;

    audio.currentTime = startTime;
    audio.play();

    const stopPlayback = () => {
      if (audio.currentTime >= endTime) {
        audio.pause();
        audio.removeEventListener("timeupdate", stopPlayback);
      }
    };

    audio.addEventListener("timeupdate", stopPlayback);
  };

  const getStatusColor = (status: string, accuracy: number = 1) => {
    switch (status) {
      case "correct":
        return accuracy >= 0.9
          ? "btn-success text-white"
          : "btn-info text-white";
      case "substitution":
        return "btn-warning text-white";
      case "deletion":
        return "btn-error text-white";
      default:
        return "btn-neutral text-white";
    }
  };

  const getWordAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return "badge-success";
    if (accuracy >= 0.75) return "badge-info";
    if (accuracy >= 0.6) return "badge-warning";
    return "badge-error";
  };

  const navigateWord = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedWordIndex > 0) {
      setSelectedWordIndex(selectedWordIndex - 1);
      setSelectedPhonemeIndex(0);
    } else if (
      direction === "next" &&
      selectedWordIndex < analysisData.word_results.length - 1
    ) {
      setSelectedWordIndex(selectedWordIndex + 1);
      setSelectedPhonemeIndex(0);
    }
  };

  const navigatePhoneme = (direction: "prev" | "next") => {
    const currentWord = analysisData.word_results[selectedWordIndex];
    const phonemeCount = currentWord.phoneme_analysis.phoneme_results.length;

    if (direction === "prev" && selectedPhonemeIndex > 0) {
      setSelectedPhonemeIndex(selectedPhonemeIndex - 1);
    } else if (
      direction === "next" && selectedPhonemeIndex < phonemeCount - 1
    ) {
      setSelectedPhonemeIndex(selectedPhonemeIndex + 1);
    }
  };

  const getFeedbackForPhoneme = (phoneme: any) => {
    const { target, detected, score, status } = phoneme;

    if (status === "correct") {
      if (phoneme.accuracy >= 0.9) {
        return {
          type: "success",
          title: "Excellent pronunciation!",
          message:
            `Your pronunciation of /${target}/ is spot on. Keep up the great work!`,
        };
      } else {
        return {
          type: "info",
          title: "Good pronunciation!",
          message:
            `You got the /${target}/ sound right, but there's room for improvement. Practice makes perfect!`,
        };
      }
    } else if (status === "substitution") {
      return {
        type: "warning",
        title: "Substitution detected",
        message:
          `You pronounced /${detected}/ instead of /${target}/. Try focusing on the target sound and comparing it to the reference audio.`,
      };
    } else if (status === "deletion") {
      return {
        type: "error",
        title: "Sound missed",
        message:
          `The /${target}/ sound wasn't detected in your pronunciation. Make sure to pronounce this sound clearly and practice the word slowly.`,
      };
    } else {
      return {
        type: "neutral",
        title: "Keep practicing",
        message:
          `Continue working on the /${target}/ sound. Listen to the reference and try to match it closely.`,
      };
    }
  };

  if (analysisData.word_results.length === 0) return null;

  const currentWord = analysisData.word_results[selectedWordIndex];
  const currentPhoneme =
    currentWord.phoneme_analysis.phoneme_results[selectedPhonemeIndex];
  const feedback = getFeedbackForPhoneme(currentPhoneme);

  return (
    <>
      {/* Hidden audio element for word playback */}
      {audioURL && <audio ref={audioRef} src={audioURL} preload="auto" />}

      <button
        className="btn btn-primary"
        onClick={() =>
          (document.getElementById("phoneme_modal") as HTMLDialogElement)
            ?.showModal()}
      >
        <ChartBarIcon size={16} className="mr-1" />
        Detailed Analysis
      </button>

      <dialog id="phoneme_modal" className="modal">
        <div className="modal-box max-w-4xl bg-base-100 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Detailed Phoneme Analysis</h3>
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost">✕</button>
            </form>
          </div>

          <div className="space-y-6">
            {/* Overall Accuracy */}
            <div className="bg-base-200 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">Overall Accuracy</span>
                <div
                  className={`badge ${
                    getWordAccuracyColor(analysisData.overall_accuracy)
                  } badge-lg`}
                >
                  {Math.round(analysisData.overall_accuracy * 100)}%
                </div>
              </div>
            </div>

            {/* Word-by-Word Analysis */}
            <div className="space-y-3">
              <h4 className="font-medium">Word-by-Word Analysis</h4>
              <div className="flex flex-wrap gap-3 text-lg">
                {analysisData.word_results.map((
                  wordResult: any,
                  wordIndex: number,
                ) => (
                  <div
                    key={wordIndex}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          setSelectedWordIndex(wordIndex);
                          setSelectedPhonemeIndex(0);
                        }}
                        className={`btn btn-outline ${
                          selectedWordIndex === wordIndex
                            ? "btn-primary"
                            : "btn-ghost"
                        }`}
                      >
                        <span className="font-medium">{wordResult.word}</span>
                      </button>

                      <div
                        className={`badge mt-1 ${
                          getWordAccuracyColor(wordResult.word_accuracy)
                        }`}
                      >
                        {Math.round(wordResult.word_accuracy * 100)}%
                      </div>
                    </div>

                    {/* Phonemes for this word */}
                    <div className="flex gap-1 flex-wrap">
                      {wordResult.phoneme_analysis.phoneme_results.map((
                        phoneme: any,
                        phonemeIndex: number,
                      ) => (
                        <button
                          key={phonemeIndex}
                          onClick={() => {
                            setSelectedWordIndex(wordIndex);
                            setSelectedPhonemeIndex(phonemeIndex);
                          }}
                          className={`btn btn-xs font-mono ${
                            selectedWordIndex === wordIndex &&
                              selectedPhonemeIndex === phonemeIndex
                              ? "ring-2 ring-primary transform scale-110"
                              : ""
                          } ${
                            getStatusColor(phoneme.status, phoneme.accuracy)
                          }`}
                          title={`${phoneme.status} - ${
                            Math.round(phoneme.accuracy * 100)
                          }% accurate`}
                        >
                          /{phoneme.target}/
                          {phoneme.status === "substitution" &&
                            phoneme.detected && (
                            <div className="text-[10px] opacity-80">
                              →{phoneme.detected}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected word and phoneme details */}
            <div className="bg-base-200 p-6 rounded-lg">
              {/* Word-level controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-base-300">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-semibold">
                    {currentWord.word}
                  </span>
                  <div
                    className={`badge ${
                      getWordAccuracyColor(currentWord.word_accuracy)
                    } badge-lg`}
                  >
                    {Math.round(currentWord.word_accuracy * 100)}%
                  </div>
                  {currentWord.transcribed_as !== currentWord.word && (
                    <span className="text-sm text-error">
                      → "{currentWord.transcribed_as || "not detected"}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigateWord("prev")}
                    disabled={selectedWordIndex === 0}
                  >
                    <ArrowLeftIcon size={16} />
                  </button>
                  <span className="text-sm">
                    {selectedWordIndex + 1} of{" "}
                    {analysisData.word_results.length}
                  </span>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => navigateWord("next")}
                    disabled={selectedWordIndex ===
                      analysisData.word_results.length - 1}
                  >
                    <ArrowRightIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Word actions */}
              <div className="flex gap-2 mb-4">
                {currentWord.time_boundary &&
                  currentWord.time_boundary.start !== null && audioURL && (
                  <button
                    className="btn btn-outline btn-sm"
                    type="button"
                    onClick={() => playWordSegment(currentWord)}
                  >
                    <PlayIcon size={16} className="mr-2" />
                    Replay Word
                  </button>
                )}
                <button
                  className={`btn btn-outline btn-sm ${
                    isPlaying ? "btn-error" : "btn-primary"
                  }`}
                  type="button"
                  onClick={() => {
                    if (isPlaying) {
                      stopAudio();
                    } else {
                      playText(currentWord.word);
                    }
                  }}
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
                        <XIcon size={16} className="mr-2" />
                        Stop Reference
                      </>
                    )
                    : (
                      <>
                        <SpeakerHighIcon size={16} className="mr-2" />
                        Reference
                      </>
                    )}
                </button>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => setShowWordPractice(true)}
                >
                  Practice Word
                </button>
              </div>

              {/* Phoneme-level details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Phoneme Analysis</span>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigatePhoneme("prev")}
                      disabled={selectedPhonemeIndex === 0}
                    >
                      <ArrowLeftIcon size={16} />
                    </button>
                    <span className="text-sm">
                      {selectedPhonemeIndex + 1} of{" "}
                      {currentWord.phoneme_analysis.phoneme_results.length}
                    </span>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => navigatePhoneme("next")}
                      disabled={selectedPhonemeIndex ===
                        currentWord.phoneme_analysis.phoneme_results.length - 1}
                    >
                      <ArrowRightIcon size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-base-100 p-4 rounded-lg space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-2xl font-mono font-bold bg-base-200 px-3 py-1 rounded">
                      /{currentPhoneme.target}/
                    </span>
                    {currentPhoneme.detected &&
                      currentPhoneme.detected !== currentPhoneme.target && (
                      <>
                        <span className="text-base-content/50">→</span>
                        <span className="text-xl font-mono font-bold bg-base-200 px-3 py-1 rounded">
                          /{currentPhoneme.detected}/
                        </span>
                      </>
                    )}
                    <div
                      className={`badge ${
                        getWordAccuracyColor(currentPhoneme.accuracy)
                      } badge-lg`}
                    >
                      {currentPhoneme.status} -{" "}
                      {Math.round(currentPhoneme.accuracy * 100)}%
                    </div>
                  </div>

                  {currentPhoneme.confidence && (
                    <div className="text-sm">
                      <span className="font-medium">Confidence:</span>{" "}
                      {Math.round(currentPhoneme.confidence * 100)}%
                    </div>
                  )}

                  {currentPhoneme.timing && (
                    <div className="text-sm">
                      <span className="font-medium">Timing:</span>{" "}
                      {currentPhoneme.timing.start.toFixed(2)}s -{" "}
                      {currentPhoneme.timing.end.toFixed(2)}s
                    </div>
                  )}

                  {/* Status-specific feedback */}
                  <div
                    className={`alert ${
                      feedback.type === "success"
                        ? "alert-success"
                        : feedback.type === "info"
                        ? "alert-info"
                        : feedback.type === "warning"
                        ? "alert-warning"
                        : feedback.type === "error"
                        ? "alert-error"
                        : "alert-neutral"
                    }`}
                  >
                    <div>
                      <h3 className="font-bold">{feedback.title}</h3>
                      <div className="text-sm">{feedback.message}</div>
                    </div>
                  </div>

                  {/* Improvement Tips */}
                  {currentPhoneme.accuracy < 0.8 && (
                    <div className="bg-base-200 p-3 rounded">
                      <h4 className="font-medium mb-2">Improvement Tips:</h4>
                      <ul className="text-sm space-y-1">
                        {(feedbackMap.get(currentPhoneme.target)?.description ??
                          [
                            "No specific tips found for this phoneme. Try listening to the reference and focusing on tongue/lip position.",
                          ]).map((tip, i) => <li key={i}>• {tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      {showWordPractice && (
        <WordPracticeModal
          isOpen={showWordPractice}
          onClose={() => setShowWordPractice(false)}
          wordResult={currentWord}
        />
      )}
    </>
  );
};
