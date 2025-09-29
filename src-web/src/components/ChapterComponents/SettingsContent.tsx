import { // @ts-types="react"
  useEffect,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { PencilIcon, SparkleIcon, TrashIcon } from "@phosphor-icons/react";
import { useChapterOptions } from "../../hooks/useChapterOptions.tsx";
import { useFileUpload } from "../../hooks/useFileUpload.tsx";
import { toast } from "sonner";
import {
  CategorySuggestion,
  CategoryWithAssignment,
} from "../../components/ChapterCategories/types.tsx";
import { CategorySelector } from "../../components/ChapterCategories/CategorySelector.tsx";

interface SettingsContentProps {
  chapterId: string;
  onSaveStatusChange: (status: "saved" | "saving" | "error") => void;
}

export function SettingsContent(
  { chapterId, onSaveStatusChange }: SettingsContentProps,
) {
  const chapter = useQuery(api.functions.chapters.getChapter, { chapterId });
  const updateChapter = useMutation(api.functions.chapters.updateChapter);
  const { uploadFiles, isUploading } = useFileUpload();

  const [localName, setLocalName] = useState(chapter.name);
  const [localDescription, setLocalDescription] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<
    CategoryWithAssignment[]
  >([]);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);

  useEffect(() => {
    if (chapter) {
      setLocalName(chapter.name);
      setLocalDescription(chapter.description);
      setSelectedCategoryIds(chapter.categoryIds || []);
    }
  }, [chapter]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    // Upload the image and get the storage ID
    uploadFiles([file]).then((imageIds) => {
      const imageId = imageIds[0];
      if (imageId) {
        handleChange("imageId", imageId);
        toast.success("Image uploaded successfully!");
      }
    }).catch((error) => {
      console.error("Image upload failed:", error);
      toast.error("Failed to upload image. Please try again.");
    });
  };

  // console.log(chapter);

  const handleChange = async (field: string, value: any) => {
    onSaveStatusChange("saving");
    const name = field === "name" ? value : chapter.name;
    const description = field === "description" ? value : chapter.description;
    const categoryIds = field === "categoryIds"
      ? value
      : [...chapter.categories, ...chapter.difficulty].map((c) => c._id).filter(
        Boolean,
      );
    const imageId = field === "imageId" ? value : chapter.imageId;

    await updateChapter({
      chapterId,
      name,
      description,
      categoryIds,
      imageId,
    });
    onSaveStatusChange("saved");
  };

  if (!chapter) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  return (
    <div className="max-w space-y-6">
      <div className="card bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner Image Section */}
        <figure className="relative h-32 w-full">
          {/* Background Image or Placeholder */}
          {chapter.imageUrl
            ? (
              <img
                src={chapter.imageUrl}
                alt="Chapter banner"
                className="w-full h-full object-cover"
              />
            )
            : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-base-content/40 text-lg">
                  No image selected
                </span>
              </div>
            )}

          {/* Glass blur overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/30 via-black/15 via-black/5 to-transparent backdrop-blur-[2px]">
          </div>

          {/* Upload/Edit Button */}
          <div className="absolute top-4 right-4">
            <div
              className="tooltip tooltip-left"
              data-tip={chapter.imageUrl ? "Change image" : "Upload image"}
            >
              <button
                type="button"
                className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-none shadow-lg"
                onClick={() => document.getElementById("image-upload")?.click()}
              >
                <PencilIcon size={16} className="text-base-content" />
              </button>
            </div>
          </div>

          {/* Chapter Title - Bottom Left */}
          <div className="absolute bottom-2 left-4 right-4">
            <input
              type="text"
              className="w-full max-w-2xl text-xl font-bold bg-transparent p-1"
              value={localName}
              placeholder="Enter chapter title..."
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={(e) => {
                handleChange("name", e.target.value);
              }}
              style={{
                color: "white",
                textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                caretColor: "white",
                border: "none",
                outline: "none",
                boxShadow: "none",
              }}
            />
          </div>

          {/* Hidden file input */}
          <input
            id="image-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
          />
        </figure>

        <div className="card-body p-3 mx-1">
          <div className="item-gap-2">
            <h3 className="card-title text-lg">
              Chapter Description
            </h3>
            <p className="text-sm text-base-content/70">
              Introduce the chapter with a brief description to provide context.
            </p>
            <textarea
              name="description"
              placeholder="Enter chapter description..."
              className="textarea textarea-bordered w-full resize-none mt-4"
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={(e) => {
                handleChange("description", e.target.value);
              }}
            />
          </div>
          <div className="flex items-center justify-between mb-2 mt-6">
            <div>
              <h3 className="card-title text-lg">Chapter Categories</h3>
              <p className="text-sm text-base-content/70">
                Manage categories for better organization and AI-powered
                suggestions.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm gap-2"
            >
              <SparkleIcon size={16} />
              Generate AI Suggestions
            </button>
          </div>

          <CategorySelector
            chapter={chapter}
            handleChange={handleChange}
          />
        </div>
      </div>
    </div>
  );
}
