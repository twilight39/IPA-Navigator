import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CheckIcon,
  MicrophoneIcon,
  SpeakerHighIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { useNavigate } from "@tanstack/react-router";
import { useTTS } from "../../../hooks/useTTS.tsx";
import { usePronunciationAnalysis } from "../../../hooks/usePronunciationAnalysis.tsx";

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
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);

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
      const result = await analyzeAudio(excerpts[currentExcerptIndex].text);
      if (result) {
        setShowFeedback(true);
      }
    }
  };

  // Reset everything for this excerpt
  const handleReset = () => {
    resetRecording();
    setShowFeedback(false);
    setShowDetailedFeedback(false);
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
                {Math.round(analysisResult.overall_score * 100)}%
              </p>

              <div className="flex items-center justify-center gap-4 mt-4">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowDetailedFeedback(!showDetailedFeedback)}
                >
                  <ChartBarIcon size={16} className="mr-1" />
                  {showDetailedFeedback ? "Hide Details" : "Show Details"}
                </button>
              </div>

              {showDetailedFeedback && (
                <PhonemeDetails
                  phonemeDetails={analysisResult.phoneme_details}
                  text={excerpts[currentExcerptIndex].text}
                />
              )}
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
                    {isAnalyzing ? "Analyzing..." : "Analyze Pronunciation"}
                  </button>
                )}
              </>
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

// Phoneme modal component
const PhonemeDetails = ({
  phonemeDetails,
  text,
}: {
  phonemeDetails: any[];
  text: string;
}) => {
  const [selectedPhonemeIndex, setSelectedPhonemeIndex] = useState(0);

  const getScoreClass = (score: number) => {
    if (score >= 0.9) return "bg-success text-success-content";
    if (score >= 0.75) return "bg-info text-info-content";
    if (score >= 0.6) return "bg-warning text-warning-content";
    return "bg-error text-error-content";
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 0.9) return "badge-success";
    if (score >= 0.75) return "badge-info";
    if (score >= 0.6) return "badge-warning";
    return "badge-error";
  };

  const navigatePhoneme = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedPhonemeIndex > 0) {
      setSelectedPhonemeIndex(selectedPhonemeIndex - 1);
    } else if (
      direction === "next" && selectedPhonemeIndex < phonemeDetails.length - 1
    ) {
      setSelectedPhonemeIndex(selectedPhonemeIndex + 1);
    }
  };

  const currentPhoneme = phonemeDetails[selectedPhonemeIndex];

  // Mock feedback generation based on phoneme score
  const generateFeedback = (phoneme: any) => {
    const { expected, actual, score } = phoneme;

    if (score >= 0.9) {
      return {
        feedback: `Excellent pronunciation of /${expected}/!`,
        improvement: `Keep up the good work! Your pronunciation is spot on.`,
      };
    } else if (score >= 0.75) {
      return {
        feedback:
          `Good pronunciation of /${expected}/, but there's room for improvement.`,
        improvement: `Try to focus on the precise articulation of this sound.`,
      };
    } else if (score >= 0.6) {
      return {
        feedback: `Your pronunciation of /${expected}/ needs some work.`,
        improvement:
          `Listen carefully to the reference audio and try to mimic the exact sound.`,
      };
    } else {
      return {
        feedback:
          `You pronounced /${expected}/ more like /${actual}/. This needs improvement.`,
        improvement:
          `Practice this sound in isolation, then in words. Pay attention to mouth and tongue position.`,
      };
    }
  };

  const feedback = generateFeedback(currentPhoneme);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Detailed Phoneme Analysis</h3>

      {/* Phoneme visualization */}
      <div className="overflow-x-auto p-1">
        <div className="flex flex-wrap gap-2">
          {phonemeDetails.map((phoneme, index) => (
            <button
              key={index}
              onClick={() => setSelectedPhonemeIndex(index)}
              className={`px-2 py-1 rounded font-mono text-xs ${
                getScoreClass(phoneme.score)
              }
                          ${
                selectedPhonemeIndex === index
                  ? "ring-2 ring-primary transform scale-110"
                  : ""
              }
                          cursor-pointer hover:opacity-90`}
            >
              /{phoneme.expected}/
            </button>
          ))}
        </div>
      </div>

      {/* Selected phoneme details */}
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-mono font-bold">
              /{currentPhoneme?.expected}/
            </span>
            <div
              className={`badge ${getScoreBadgeClass(currentPhoneme?.score)}`}
            >
              {Math.round(currentPhoneme?.score * 100)}%
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => navigatePhoneme("prev")}
              disabled={selectedPhonemeIndex === 0}
            >
              <ArrowLeftIcon size={14} />
            </button>
            <span className="text-sm">
              {selectedPhonemeIndex + 1} of {phonemeDetails.length}
            </span>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => navigatePhoneme("next")}
              disabled={selectedPhonemeIndex === phonemeDetails.length - 1}
            >
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-2 bg-base-100 p-4 rounded-lg">
          <div>
            <span className="font-medium">Feedback:</span>
            <span>{feedback.feedback}</span>
          </div>
          <div>
            <span className="font-medium">How to improve:</span>
            <span>{feedback.improvement}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
