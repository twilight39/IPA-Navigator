import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookmarkSimpleIcon,
  BookOpenTextIcon,
  BooksIcon,
  GraduationCapIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  ShareNetworkIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { ChapterCreateModal } from "../../components/AddChapterModal.tsx";

export const Route = createFileRoute("/_protected/chapters")({
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const chapters: Chapter[] =
    useQuery(api.functions.chapters.getChapters, {}) || [];

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
              activeTab === "saved" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("saved")}
          >
            <BookmarkSimpleIcon size={18} className="mr-2" />
            Saved
          </a>
          <a
            className={`tab px-4 py-2 flex items-center rounded-lg ${
              activeTab === "following" ? "bg-slate-200 tab-active" : ""
            }`}
            onClick={() => setActiveTab("following")}
          >
            <UsersThreeIcon size={18} className="mr-2" />
            Following
          </a>
        </div>
      </div>

      <ChapterFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <ChapterGrid
        chapters={chapters}
        activeTab={activeTab}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />

      <ChapterCreateModal />
    </div>
  );
}

type Chapter = {
  _id: string;
  name: string;
  difficulty: string;
  description: string | null;
  created_at: number;
  creator_name: string;
  creator_picture_url: string | null;
  imageUrl: string | null;
};

// ChapterFilters component
const ChapterFilters = (
  { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory },
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

      <div className="flex flex-wrap gap-2 mt-3">
        {categories.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors font-medium ${
              selectedCategory === category.value
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-white text-slate-800 border border-slate-200 hover:bg-slate-100"
            }`}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// ChapterGrid component
function ChapterGrid({
  chapters,
  activeTab,
  searchQuery,
  selectedCategory,
}: {
  chapters: Chapter[];
  activeTab: string;
  searchQuery: string;
  selectedCategory: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
      {chapters.map((chapter) => (
        <ChapterCard key={chapter._id} chapter={chapter} />
      ))}
    </div>
  );
}

// ChapterCard component
function ChapterCard({ chapter }: { chapter: Chapter }) {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = () => setIsLiked(!isLiked);
  const handleSave = () => setIsSaved(!isSaved);
  const handleShare = () => {
    // In a real app, implement share functionality
    console.log("Sharing chapter:", chapter.name);
  };

  const handlePractice = () => {
    // In a real app, navigate to practice page
    console.log("Practice chapter:", chapter.name);
  };

  const difficultyColor = {
    "Beginner": "bg-green-100 text-green-800",
    "Intermediate": "bg-yellow-100 text-yellow-800",
    "Advanced": "bg-red-100 text-red-800",
  }[chapter.difficulty] || "bg-blue-100 text-blue-800";

  const formattedDate = new Date(chapter.created_at).toLocaleDateString();

  return (
    <div className="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200">
      <div className="relative h-36 overflow-hidden">
        {chapter.imageUrl
          ? (
            <img
              src={chapter.imageUrl}
              alt={chapter.name}
              className="w-full h-full object-cover"
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

        <div className="card-actions justify-between items-center mt-4">
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
                isSaved ? "text-blue-500" : ""
              }`}
              onClick={handleSave}
            >
              <BookmarkSimpleIcon
                size={18}
                weight={isSaved ? "fill" : "regular"}
              />
            </button>
            <button
              className="btn btn-sm btn-ghost btn-square"
              onClick={handleShare}
            >
              <ShareNetworkIcon size={18} weight="regular" />
            </button>
          </div>

          <button className="btn btn-sm btn-primary" onClick={handlePractice}>
            <GraduationCapIcon size={18} className="mr-1" weight="fill" />
            Practice
          </button>
        </div>
      </div>
    </div>
  );
}
