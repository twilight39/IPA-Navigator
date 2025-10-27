import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, SpeakerX } from "@phosphor-icons/react";
import { useTTS } from "../../hooks/useTTS.tsx";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/settings")({
  component: RouteComponent,
});

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

const VOICE_OPTIONS: Record<
  string,
  Array<{
    value: TTSVoice;
    label: string;
  }>
> = {
  AmericanFemale: [
    { value: "american_female_bella", label: "Bella" },
    { value: "american_female_nicole", label: "Nicole" },
    { value: "american_female_sky", label: "Sky" },
  ],
  AmericanMale: [
    { value: "american_male_fenrir", label: "Fenrir" },
    { value: "american_male_michael", label: "Michael" },
    { value: "american_male_puck", label: "Puck" },
  ],
  BritishFemale: [
    { value: "british_female_emma", label: "Emma" },
    { value: "british_female_isabella", label: "Isabella" },
    { value: "british_female_lily", label: "Lily" },
  ],
  BritishMale: [
    { value: "british_male_fable", label: "Fable" },
    { value: "british_male_george", label: "George" },
    { value: "british_male_lewis", label: "Lewis" },
  ],
};

function RouteComponent() {
  const [accent, setAccent] = useState<"us" | "uk">("us");

  const { userVoice, setUserVoice } = useTTS();

  const handleVoiceChange = async (voice: TTSVoice) => {
    try {
      await setUserVoice({ voice });
    } catch (error) {
      toast.error("Failed to save voice preference");
    }
  };

  const getVoiceCategory = (voice: TTSVoice) => {
    if (voice.startsWith("american_female")) {
      return "AmericanFemale";
    }
    if (voice.startsWith("american_male")) {
      return "AmericanMale";
    }
    if (voice.startsWith("british_female")) {
      return "BritishFemale";
    }
    return "BritishMale";
  };

  const handleAccentChange = async (
    newAccent: "us" | "uk",
  ) => {
    setAccent(newAccent);

    // Get the new category based on accent
    const newCategory = newAccent === "us" ? "AmericanFemale" : "BritishFemale";
    const newVoice = VOICE_OPTIONS[newCategory][0].value;

    try {
      await setUserVoice({ voice: newVoice });
    } catch (error) {
      toast.error("Failed to save voice preference");
    }
  };

  const currentCategory = getVoiceCategory(
    (userVoice as TTSVoice) || "american_female_bella",
  );
  const isAmericanAccent = currentCategory.startsWith("American");

  return (
    <div className="min-h-screen bg-base-100 p-4 sm:p-8 flex items-start justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-base-content mb-2 text-center">
            Settings
          </h1>
          <p className="text-base-content/60 text-center">
            Customize your pronunciation practice experience
          </p>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {/* Accent Setting */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Globe
                  size={24}
                  weight="bold"
                  className="text-primary"
                />
                <h2 className="text-xl font-semibold text-base-content">
                  Accent Preference
                </h2>
              </div>
              <p className="text-sm text-base-content/60 mb-4">
                Choose the accent for phonetic alignment and reference
                pronunciations
              </p>

              <div className="space-y-3">
                {[
                  {
                    value: "us" as const,
                    label: "American English",
                    flag: "🇺🇸",
                  },
                  {
                    value: "uk" as const,
                    label: "British English",
                    flag: "🇬🇧",
                  },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-all"
                  >
                    <input
                      type="radio"
                      name="accent"
                      value={option.value}
                      checked={accent === option.value}
                      onChange={(e) => {
                        handleAccentChange(
                          e.target.value as "us" | "uk",
                        );
                      }}
                      className="radio radio-primary"
                    />
                    <span className="text-lg">
                      {option.flag}
                    </span>
                    <span className="text-base-content font-medium">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="divider my-2" />

            {/* Voice Setting */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <SpeakerX
                  size={24}
                  weight="bold"
                  className="text-primary"
                />
                <h2 className="text-xl font-semibold text-base-content">
                  Speaker Voice
                </h2>
              </div>
              <p className="text-sm text-base-content/60 mb-4">
                Select your preferred voice for listening exercises
              </p>

              {/* Female Voices */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-base-content/70 mb-3 ml-1">
                  Female Voices
                </h3>
                <div className="space-y-2">
                  {VOICE_OPTIONS[
                    isAmericanAccent ? "AmericanFemale" : "BritishFemale"
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-all"
                    >
                      <input
                        type="radio"
                        name="voice"
                        value={option.value}
                        checked={userVoice === option.value}
                        onChange={(e) =>
                          handleVoiceChange(
                            e.target.value as TTSVoice,
                          )}
                        className="radio radio-primary"
                      />
                      <span className="text-base-content font-medium">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Male Voices */}
              <div>
                <h3 className="text-sm font-semibold text-base-content/70 mb-3 ml-1">
                  Male Voices
                </h3>
                <div className="space-y-2">
                  {VOICE_OPTIONS[
                    isAmericanAccent ? "AmericanMale" : "BritishMale"
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-base-300 hover:border-primary hover:bg-base-200 transition-all"
                    >
                      <input
                        type="radio"
                        name="voice"
                        value={option.value}
                        checked={userVoice === option.value}
                        onChange={(e) =>
                          handleVoiceChange(
                            e.target.value as TTSVoice,
                          )}
                        className="radio radio-primary"
                      />
                      <span className="text-base-content font-medium">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
