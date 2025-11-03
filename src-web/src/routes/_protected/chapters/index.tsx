import { createFileRoute } from "@tanstack/react-router";
import { // @ts-types="react"
  useEffect,
  useState,
} from "react";
import {
  BookmarkSimpleIcon,
  BookOpenTextIcon,
  BooksIcon,
  GraduationCapIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PlusCircleIcon,
  ShareNetworkIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useStoreUserEffect } from "../../../hooks/useStoreUserEffect.tsx";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api.js";
import { ChapterCreateModal } from "../../../components/AddChapterModal.tsx";
import { ChaptersInProgressTab } from "../../../components/ChaptersInProgressTab.tsx";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/_protected/chapters/")({
  component: ChaptersComponent,
});

// Mock categories for the filter
const categories = [
  { value: "all", label: "All Categories" },
  { value: "vowels", label: "Vowels" },
  { value: "consonants", label: "Consonants" },
  { value: "diphthongs", label: "Diphthongs" },
];

function ChaptersComponent() {
  const [activeTab, setActiveTab] = useState("explore");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string[]>([]);
  const chapters: Chapter[] =
    useQuery(api.functions.chapters.getChaptersWithProgress, {}) || [];
  const { userId, isLoading } = useStoreUserEffect();

  return (
    <div className="space-y-4 p-4 mx-auto">
      <div className="flex items-center justify-between pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Chapters
          </h1>
          <p className="text-slate-600">
            Practice collections to improve your pronunciation
          </p>
        </div>
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

      <div className="flex justify-start">
        <div className="tabs tabs-boxed bg-white border border-slate-200 rounded-lg inline-flex">
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "explore" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("explore")}
          >
            <BookOpenTextIcon size={18} className="mr-2" />
            Explore
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "my-chapters" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("my-chapters")}
          >
            <BooksIcon size={18} className="mr-2" />
            My Chapters
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "bookmarked" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("bookmarked")}
          >
            <BookmarkSimpleIcon size={18} className="mr-2" />
            Bookmarked
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "in-progress" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("in-progress")}
          >
            <UsersThreeIcon size={18} className="mr-2" />
            In Progress
          </a>
        </div>
      </div>

      {activeTab === "in-progress"
        ? (
          <>
            <ChaptersInProgressTab
              chapters={chapters}
              userId={userId}
            />
          </>
        )
        : (
          <>
            <ChapterFilters
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCategories={selectedCategory}
              setSelectedCategories={setSelectedCategory}
            />

            <ChapterGrid
              chapters={activeTab === "my-chapters"
                ? chapters.filter((chapter) => chapter.created_by === userId)
                : activeTab === "bookmarked"
                ? chapters.filter((chapter) => chapter.isBookmarked)
                : chapters}
              activeTab={activeTab}
              searchQuery={searchQuery}
              selectedCategories={selectedCategory}
              userId={userId}
            />
          </>
        )}

      <ChapterCreateModal />
    </div>
  );
}

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

// ChapterFilters component
const ChapterFilters = (
  { searchQuery, setSearchQuery, selectedCategories, setSelectedCategories },
) => {
  return (
    <div>
      <div className="relative">
        <MagnifyingGlassIcon
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search chapters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered input-primary w-full pl-10 bg-white/80"
        />
      </div>

      <form
        className="flex flex-wrap gap-2 mt-3"
        onReset={() => setSelectedCategories([])}
      >
        {categories.filter((c) => c.value !== "all").map((category) => (
          <input
            key={category.value}
            className={`btn btn-sm ${
              selectedCategories?.includes(category.value)
                ? "btn-primary"
                : "btn-ghost"
            }`}
            type="checkbox"
            name="categories"
            aria-label={category.label}
            checked={selectedCategories?.includes(category.value)}
            onChange={() => {
              setSelectedCategories((prev) =>
                prev !== undefined && prev.includes(category.value)
                  ? prev.filter((v) => v !== category.value)
                  : [...prev, category.value]
              );
            }}
          />
        ))}
        <input
          className="btn btn-square btn-sm"
          type="reset"
          value="×"
          aria-label="Clear filters"
        />
      </form>
    </div>
  );
};

// ChapterGrid component
function ChapterGrid({
  chapters,
  activeTab,
  searchQuery,
  selectedCategories,
  userId,
}: {
  chapters: Chapter[];
  activeTab: string;
  searchQuery: string;
  selectedCategories: string[];
  userId: string | null;
}) {
  const filteredChapters = chapters.filter((chapter) => {
    // Search filter
    const matchesSearch = chapter.name
      ? chapter.name.toLowerCase().includes(searchQuery.toLowerCase())
      : false;

    // Category filter
    let matchesCategory = true;
    if (selectedCategories.length > 0) {
      // Check if any of the chapter's categories match any selected filter
      matchesCategory = selectedCategories.every((filter) =>
        chapter.categories?.some((cat) =>
          cat.name.toLowerCase() === filter.toLowerCase()
        )
      );
    }

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {filteredChapters.map((chapter) => (
        <ChapterCard key={chapter._id} chapter={chapter} userId={userId} />
      ))}
    </div>
  );
}

// ChapterCard component
function ChapterCard(
  { chapter, userId }: { chapter: Chapter; userId: string | null },
) {
  const [isLiked, setIsLiked] = useState(chapter.isLiked);
  const [isBookmarked, setIsBookmarked] = useState(chapter.isBookmarked);
  const navigate = useNavigate();

  const toggleLike = useMutation(api.functions.social.toggleLike);
  const toggleBookmark = useMutation(api.functions.social.toggleBookmark);

  useEffect(() => {
    setIsLiked(chapter.isLiked);
    setIsBookmarked(chapter.isBookmarked);
  }, [chapter.isLiked, chapter.isBookmarked]);

  const handleLike = () => {
    setIsLiked(!isLiked);
    toggleLike({ chapterId: chapter._id });
  };
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toggleBookmark({ chapterId: chapter._id });
  };
  const handleShare = async () => {
    const url =
      `${import.meta.env.VITE_APP_URL}/chapters/${chapter._id}/practice`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

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

  const formattedDate = new Date(chapter.created_at).toLocaleDateString();

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

        {/* Progress Ring - Bottom Right */}
        {chapter.progress && chapter.progress.totalCount > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-2 rounded-lg px-2 py-1">
            <div
              className={`radial-progress ${radialColor}`}
              style={{
                "--value": Math.round(
                  (chapter.progress.completedCount /
                    chapter.progress.totalCount) *
                    100,
                ),
                "--size": "2.5rem",
                "--thickness": "3px",
              } as React.CSSProperties}
              aria-valuenow={Math.round(
                (chapter.progress.completedCount /
                  chapter.progress.totalCount) *
                  100,
              )}
              role="progressbar"
            >
              <span className="text-xs font-bold">
                {Math.round(
                  (chapter.progress.completedCount /
                    chapter.progress.totalCount) *
                    100,
                )}%
              </span>
            </div>
          </div>
        )}
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
          <span className="mx-1.5">•</span>
          <span>{formattedDate}</span>
        </div>

        <div className="card-actions flex justify-between items-center mt-4">
          <div className="flex space-x-1">
            <button
              className={`btn btn-sm btn-ghost btn-square ${
                isLiked ? "text-red-500" : ""
              }`}
              onClick={handleLike}
            >
              <HeartIcon size={18} weight={isLiked ? "fill" : "regular"} />
            </button>
            <button
              className={`btn btn-sm btn-ghost btn-square ${
                isBookmarked ? "text-blue-500" : ""
              }`}
              onClick={handleBookmark}
            >
              <BookmarkSimpleIcon
                size={18}
                weight={isBookmarked ? "fill" : "regular"}
              />
            </button>
            <button
              className="btn btn-sm btn-ghost btn-square"
              onClick={handleShare}
            >
              <ShareNetworkIcon size={18} weight="regular" />
            </button>
          </div>
          <div className="flex space-x-2">
            {userId === chapter.created_by && (
              <button
                className="btn btn-sm btn-ghost btn-square"
                onClick={() => {
                  navigate({
                    search: { from: "/chapters" },
                    to: "/chapters/$chapterId/edit",
                    params: { chapterId: chapter._id },
                  });
                }}
              >
                <NotePencilIcon size={18} />
              </button>
            )}
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                navigate({
                  search: { from: "/chapters" },
                  to: "/chapters/$chapterId/practice",
                  params: { chapterId: chapter._id },
                });
              }}
            >
              <GraduationCapIcon size={18} className="mr-1" weight="fill" />
              Practice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
