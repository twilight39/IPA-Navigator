import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  MicrophoneIcon,
  SpeakerHighIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { useNavigate } from "@tanstack/react-router";
import { useTTS } from "../../../hooks/useTTS.tsx";

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

  const { playText, stopAudio, isPlaying, error: ttsError } = useTTS();

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
  const [isRecording, setIsRecording] = useState(false);

  const handleListen = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      const currentExcerpt = excerpts[currentExcerptIndex];
      playText(currentExcerpt.text);
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
              className={`btn ${
                isPlaying ? "btn-error btn-outline" : "btn-outline btn-primary"
              }`}
            >
              {isPlaying
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

          {/* Recording Controls */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {}}
              disabled={isRecording}
              className={`btn ${
                isRecording ? "btn-error" : "btn-primary"
              } btn-lg`}
            >
              <MicrophoneIcon size={24} weight="bold" className="mr-2" />
              {isRecording ? "Recording..." : "Start Recording"}
            </button>

            <button
              onClick={() => {}}
              className="btn btn-outline btn-lg"
            >
              <ArrowClockwiseIcon size={24} weight="bold" className="mr-2" />
              Reset
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <button
              onClick={() =>
                setCurrentExcerptIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentExcerptIndex === 0}
              className="btn btn-outline"
            >
              Previous
            </button>

            <button
              onClick={() =>
                setCurrentExcerptIndex((prev) =>
                  Math.min(prev + 1, excerpts.length - 1)
                )}
              disabled={currentExcerptIndex === excerpts.length - 1}
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
