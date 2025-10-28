import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStoreUserEffect } from "../../hooks/useStoreUserEffect.tsx";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import {
  GraduationCapIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusCircleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { ChapterCreateModal } from "../../components/AddChapterModal.tsx";

export const Route = createFileRoute("/_protected/collection")({
  component: CollectionComponent,
});

function CollectionComponent() {
  const navigate = useNavigate();
  const { userId, isLoading } = useStoreUserEffect();
  const [searchQuery, setSearchQuery] = useState("");

  const allChapters: Chapter[] | undefined = useQuery(
    api.functions.chapters.getChaptersWithProgress,
    {},
  );

  const isLoadingChapters = allChapters === undefined;

  if (isLoadingChapters || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  const myChapters = allChapters.filter(
    (chapter) => chapter.created_by === userId,
  );

  const filteredChapters = myChapters.filter((chapter) =>
    chapter.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePractice = () => {};

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-zilla font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            My Collection
          </h1>
          <p className="text-slate-600 font-zilla">
            Manage and practice your created pronunciation collections.
          </p>
        </div>
      </div>

      {myChapters.length === 0
        ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-md rounded-xl shadow-sm text-center">
            <div className="bg-blue-50 p-4 rounded-full mb-4">
              <GraduationCapIcon className="h-10 w-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-zilla font-semibold text-slate-800 mb-2">
              No Collections Yet
            </h3>
            <p className="text-slate-600 font-zilla mb-6 max-w-md">
              Create your first pronunciation collection to start organizing
              your practice materials.
            </p>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                const modal = document.getElementById(
                  "chapter_create_modal",
                ) as HTMLDialogElement;
                if (modal) modal.showModal();
              }}
            >
              <PlusCircleIcon size={18} weight="bold" className="mr-1" />
              Create Chapter
            </button>
          </div>
        )
        : (
          <>
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                type="text"
                placeholder="Search your collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered input-primary w-full pl-10 bg-white/80"
              />
            </div>

            {/* No Results */}
            {filteredChapters.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500">
                  No collections match your search.
                </p>
              </div>
            )}

            {/* Chapters Grid */}
            {filteredChapters.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChapters.map((chapter) => (
                  <CollectionCard
                    key={chapter._id}
                    chapter={chapter}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </>
        )}

      <ChapterCreateModal />
    </div>
  );
}

type Chapter = {
  _id: string;
  name: string;
  description?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  imageUrl?: string;
  created_by: string;
  created_at: number;
  progress: {
    completedCount: number;
    totalCount: number;
    accuracy: number;
    completed: boolean;
    updatedAt: number;
  } | null;
};

function CollectionCard(
  {
    chapter,
    navigate,
  }: {
    chapter: Chapter;
    navigate: ReturnType<typeof useNavigate>;
  },
) {
  const progressPercent = chapter.progress
    ? Math.round(
      (chapter.progress.completedCount / chapter.progress.totalCount) * 100,
    )
    : 0;

  const difficultyColor = {
    "Beginner": "bg-green-100 text-green-800",
    "Intermediate": "bg-yellow-100 text-yellow-800",
    "Advanced": "bg-red-100 text-red-800",
  }[chapter.difficulty] || "bg-blue-100 text-blue-800";

  const radialColor = {
    "Beginner": "bg-green-100 text-green-600",
    "Intermediate": "bg-yellow-100 text-yellow-600",
    "Advanced": "bg-red-100 text-red-600",
  }[chapter.difficulty] || "bg-blue-100 text-blue-600";

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="h-32 relative">
        {chapter.imageUrl
          ? (
            <img
              src={chapter.imageUrl}
              alt={chapter.name}
              className="w-full h-full object-cover"
            />
          )
          : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500/10 to-indigo-500/20" />
          )}
        <div className="absolute top-2 right-2">
          <span
            className={`badge font-medium px-2 py-1 text-xs rounded-full ${
              chapter.difficulty === "Beginner"
                ? "bg-green-100 text-green-800"
                : chapter.difficulty === "Intermediate"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {chapter.difficulty}
          </span>
        </div>

        {/* Progress Ring - Bottom Right */}
        {chapter.progress && chapter.progress.totalCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg px-2 py-1">
            <div
              className={`radial-progress ${radialColor}`}
              style={{
                "--value": progressPercent,
                "--size": "2.5rem",
                "--thickness": "3px",
              } as React.CSSProperties}
            >
              <span className="text-xs font-bold">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="p-5">
        <h3 className="text-xl font-zilla font-semibold text-slate-800 mb-2">
          {chapter.name}
        </h3>
        {chapter.description && (
          <p className="text-slate-600 font-zilla text-sm mb-4 line-clamp-2">
            {chapter.description}
          </p>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-zilla">
            {new Date(chapter.created_at).toLocaleDateString()}
          </span>
          <div className="flex space-x-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                navigate({
                  to: "/chapters/$chapterId/edit",
                  search: { from: "/collection" },
                  params: { chapterId: chapter._id },
                });
              }}
            >
              <NotePencilIcon size={18} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => {
                navigate({
                  to: "/chapters/$chapterId/practice",
                  search: { from: "/collection" },
                  params: { chapterId: chapter._id },
                });
              }}
            >
              <GraduationCapIcon
                size={18}
                className="mr-1"
                weight="fill"
              />
              Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
