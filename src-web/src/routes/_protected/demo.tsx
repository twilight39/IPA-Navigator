import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CheckIcon,
  MicrophoneIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react";

export const Route = createFileRoute("/_protected/demo")({
  component: DemoComponent,
});

function DemoComponent() {
  const [currentSentence, setCurrentSentence] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Sample practice sentences
  const sentences = [
    "The quick brown fox jumps over the lazy dog",
    "She sells seashells by the seashore",
    "How much wood would a woodchuck chuck",
  ];

  const playAudio = () => {
    // Simulate audio playback
    console.log("Playing audio for:", sentences[currentSentence]);
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    // Simulate recording for 2 seconds
    setTimeout(() => {
      setIsRecording(false);
      setHasRecorded(true);
      setShowFeedback(true);
    }, 2000);
  };

  const handleReset = () => {
    setIsRecording(false);
    setHasRecorded(false);
    setShowFeedback(false);
  };

  return (
    <div className="p-6 bg-base-100">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-zilla font-bold">
            Pronunciation Trainer
          </h1>
          <p className="text-base-content/70 font-zilla">
            Perfect your pronunciation with AI-powered feedback
          </p>
        </div>

        {/* Practice Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-6">
            {/* Progress and Listen Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-zilla font-semibold">
                Practice Sentence {currentSentence + 1} of {sentences.length}
              </h2>
              <button
                onClick={playAudio}
                className="btn btn-outline btn-primary"
              >
                <SpeakerHighIcon size={20} weight="bold" className="mr-2" />
                Listen
              </button>
            </div>

            {/* Sentence Display */}
            <div className="text-center p-8 bg-base-200 rounded-lg">
              <p className="text-2xl font-zilla leading-relaxed">
                "{sentences[currentSentence]}"
              </p>
            </div>

            {/* Recording Controls */}
            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartRecording}
                disabled={isRecording}
                className={`btn ${
                  isRecording ? "btn-error" : "btn-primary"
                } btn-lg`}
              >
                <MicrophoneIcon size={24} weight="bold" className="mr-2" />
                {isRecording ? "Recording..." : "Start Recording"}
              </button>

              <button
                onClick={handleReset}
                className="btn btn-outline btn-lg"
              >
                <ArrowClockwiseIcon size={24} weight="bold" className="mr-2" />
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
