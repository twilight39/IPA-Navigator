import {
  createFileRoute,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, EyeIcon } from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { EditorContent } from "../../../components/ChapterComponents/EditorContent.tsx";

export const Route = createFileRoute("/_protected/chapters/$chapterId/edit")({
  component: ChapterEditorComponent,
});

function ChapterEditorComponent() {
  const [activeTab, setActiveTab] = useState("editor");
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "saved" | "saving" | "error"
  >("saved");

  const params = useParams({ from: "/_protected/chapters/$chapterId/edit" });
  const chapterId = params.chapterId;
  const excerpts = useQuery(api.functions.excerpts.getExcerptsForChapter, {
    chapterId,
  });

  const router = useRouter();
  const navigate = useNavigate();

  const handleBackNavigation = () => {
    const from = router.state.location.search.from;

    navigate({ to: from });
  };

  const chapter = useQuery(api.functions.chapters.getChapter, {
    chapterId,
  });

  // Show loading state if chapter data is not yet available
  if (!chapter) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-3xl font-zilla font-bold text-foreground">
              {chapter?.name || "Edit Chapter"}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Auto-save:</span>
              <span
                className={`font-medium ${
                  autoSaveStatus === "saved"
                    ? "text-green-600"
                    : autoSaveStatus === "saving"
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {autoSaveStatus === "saved"
                  ? "All changes saved"
                  : autoSaveStatus === "saving"
                  ? "Saving..."
                  : "Error saving"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button type="button" className="btn btn-outline" onClick={() => {}}>
            <EyeIcon size={18} />
            Preview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-start">
        <div className="tabs tabs-boxed bg-white border border-slate-200 rounded-lg inline-flex">
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "editor" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("editor")}
          >
            Content Editor
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "settings" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("settings")}
          >
            Chapter Settings
          </a>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "editor"
          ? (
            <EditorContent
              excerpts={excerpts}
              loading={setAutoSaveStatus}
              chapterId={chapterId}
            />
          )
          : <></>}
      </div>
    </div>
  );
}
