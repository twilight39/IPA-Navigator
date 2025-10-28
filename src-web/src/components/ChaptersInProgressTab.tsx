import {
  ArrowDownIcon,
  ArrowUpIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";

type SortOption = "recency" | "accuracy" | "alphabetical";

type Chapter = {
  _id: string;
  name: string;
  categories: Array<{ name: string; _id: string }>;
  difficulty: string;
  description: string | null;
  created_at: number;
  created_by: string;
  creator_name: string;
  creator_picture_url: string | null;
  imageUrl: string | null;
  isLiked: boolean;
  isBookmarked: boolean;
  progress: {
    completedCount: number;
    totalCount: number;
    accuracy: number;
    completed: boolean;
    updatedAt: number;
  } | null;
};

interface InProgressTabProps {
  chapters: Chapter[];
  userId: string | null;
}

export function ChaptersInProgressTab(
  { chapters, userId }: InProgressTabProps,
) {
  const [sortBy, setSortBy] = useState<SortOption>("recency");
  const [searchQuery, setSearchQuery] = useState("");
  const [removedChapters, setRemovedChapters] = useState<Set<string>>(
    new Set(),
  );

  const hasStartedChapters = chapters.some(
    (ch) =>
      ch.progress && ch.progress.totalCount > 0 &&
      !removedChapters.has(ch._id),
  );

  const filteredAndSortedChapters = useMemo(() => {
    // Filter chapters that have been started
    let filtered = chapters.filter(
      (ch) =>
        ch.progress && ch.progress.totalCount > 0 &&
        !removedChapters.has(ch._id),
    );

    // Filter by search query
    filtered = filtered.filter((chapter) =>
      chapter.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort chapters
    const sorted = [...filtered];

    switch (sortBy) {
      case "recency":
        return sorted.sort((a, b) =>
          (b.progress?.updatedAt || 0) - (a.progress?.updatedAt || 0)
        );
      case "accuracy":
        return sorted.sort((a, b) =>
          (b.progress?.accuracy || 0) - (a.progress?.accuracy || 0)
        );
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [chapters, removedChapters, searchQuery, sortBy]);

  if (!hasStartedChapters) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/80 backdrop-blur-md rounded-xl shadow-sm text-center">
        <div className="bg-blue-50 p-4 rounded-full mb-4">
          <div className="h-10 w-10 text-blue-500">📚</div>
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          No Started Chapters
        </h3>
        <p className="text-slate-600 mb-6 max-w-md">
          Start practicing a chapter to see your progress here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <MagnifyingGlassIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search in progress chapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered input-primary w-full pl-10 bg-white/80"
        />
      </div>

      {/* Sort Controls */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm font-medium text-slate-600 flex items-center">
          Sort by:
        </span>
        <div className="flex gap-2">
          {(["recency", "accuracy", "alphabetical"] as SortOption[]).map(
            (option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`btn btn-sm ${
                  sortBy === option ? "btn-primary" : "btn-ghost"
                }`}
              >
                {option === "recency"
                  ? "Recent"
                  : option === "accuracy"
                  ? "Accuracy"
                  : "A-Z"}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Chapters List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedChapters.map((chapter) => (
          <InProgressChapterCard
            key={chapter._id}
            chapter={chapter}
          />
        ))}
      </div>
    </div>
  );
}

function InProgressChapterCard(
  {
    chapter,
  }: { chapter: Chapter },
) {
  const navigate = useNavigate();

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
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 rounded-lg">
      <div className="relative h-36 overflow-hidden">
        {chapter.imageUrl
          ? (
            <img
              src={chapter.imageUrl}
              alt={chapter.name}
              className="w-full h-full object-cover rounded-t-lg"
            />
          )
          : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500/10 to-indigo-500/20">
            </div>
          )}
        <div className="absolute top-2 right-2">
          <span className={`badge ${difficultyColor} font-medium`}>
            {chapter.difficulty}
          </span>
        </div>
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
      </div>

      <div className="card-body p-5">
        <h3 className="card-title text-slate-800 font-bold line-clamp-1">
          {chapter.name}
        </h3>

        {chapter.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mt-1">
            {chapter.description}
          </p>
        )}

        {/* Progress Stats */}
        <div className="stats stats-vertical lg:stats-horizontal shadow-none bg-slate-50 rounded-lg mt-3">
          <div className="stat p-3">
            <div className="stat-title text-xs">Completed</div>
            <div className="stat-value text-lg">
              {chapter.progress?.completedCount}/{chapter.progress?.totalCount}
            </div>
          </div>
          <div className="stat p-3">
            <div className="stat-title text-xs">Accuracy</div>
            <div className="stat-value text-lg">
              {Math.round(chapter.progress?.accuracy * 100 || 0)}%
            </div>
          </div>
        </div>

        <div className="flex items-center mt-3 text-xs text-slate-500">
          <div className="avatar placeholder mr-2">
            <div className="bg-slate-200 text-slate-600 rounded-full w-6">
              {chapter.creator_picture_url
                ? (
                  <img
                    src={chapter.creator_picture_url}
                    alt={chapter.creator_name || "User"}
                    className="rounded-full"
                  />
                )
                : (
                  <span>
                    {chapter.creator_name
                      ? chapter.creator_name.charAt(0)
                      : "?"}
                  </span>
                )}
            </div>
          </div>
          <span className="font-medium">
            {chapter.creator_name || "Unknown User"}
          </span>
          <button
            className="btn btn-sm btn-primary justify-end ml-auto"
            onClick={() => {
              navigate({
                to: "/chapters/$chapterId/practice",
                params: { chapterId: chapter._id },
                search: { from: "/chapters" },
              });
            }}
          >
            Continue Practice
          </button>
        </div>
      </div>
    </div>
  );
}
