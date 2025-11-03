import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { toast } from "sonner";
import { MagnifyingGlassIcon, PlusIcon, XIcon } from "@phosphor-icons/react";
import { availableParallelism } from "node:os";

type AvailableChapter = {
  _id: string;
  name: string;
  description?: string;
  difficulty: string;
  creatorName: string;
};

interface AddChaptersModalProps {
  classroomId: string;
  onChapterAdded: () => void;
}

export function AddChaptersModal(
  { classroomId, onChapterAdded }: AddChaptersModalProps,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const availableChapters: AvailableChapter[] | undefined = useQuery(
    api.functions.classrooms.getAvailableChapters,
    { classroomId },
  );

  const addChapter = useMutation(
    api.functions.classrooms.addChapterToClassroom,
  );

  const filteredChapters = useMemo(() => {
    if (!availableChapters) return [];
    return availableChapters.filter(
      (chapter) =>
        chapter.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [availableChapters, searchQuery]);

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const handleAddChapters = async () => {
    if (selectedChapters.size === 0) {
      toast.error("Please select at least one chapter");
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        Array.from(selectedChapters).map((chapterId) =>
          addChapter({
            classroomId,
            chapterId: chapterId as any,
          })
        ),
      );

      toast.success(
        `${selectedChapters.size} chapter${
          selectedChapters.size !== 1 ? "s" : ""
        } added!`,
      );

      setSelectedChapters(new Set());
      setSearchQuery("");

      const modal = document.getElementById(
        `add_chapters_modal_${classroomId}`,
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      toast.error("Failed to add chapters");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!availableChapters) {
    return null;
  }

  return (
    <dialog
      id={`add_chapters_modal_${classroomId}`}
      className="modal modal-middle sm:modal-middle"
    >
      <div className="modal-box w-full max-w-2xl max-h-96 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Add Chapters to Classroom</h3>
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost">
              <XIcon size={18} />
            </button>
          </form>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <MagnifyingGlassIcon
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            type="text"
            placeholder="Search chapters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered input-primary w-full pl-10"
            disabled={isLoading}
          />
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredChapters.length === 0
            ? (
              <p className="text-center text-slate-500 py-4">
                No chapters available
              </p>
            )
            : filteredChapters.map((chapter) => (
              <label
                key={chapter._id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={selectedChapters.has(chapter._id)}
                  onChange={() => handleSelectChapter(chapter._id)}
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {chapter.name}
                  </p>
                  {chapter.description && (
                    <p className="text-xs text-slate-600 line-clamp-1">
                      {chapter.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    by {chapter.creatorName} •{" "}
                    <span
                      className={`badge badge-xs ${
                        chapter.difficulty === "Beginner"
                          ? "bg-green-100 text-green-800"
                          : chapter.difficulty === "Intermediate"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {chapter.difficulty}
                    </span>
                  </p>
                </div>
              </label>
            ))}
        </div>

        {/* Footer */}
        <div className="modal-action mt-4">
          <form method="dialog">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isLoading}
            >
              Cancel
            </button>
          </form>
          <button
            onClick={handleAddChapters}
            className="btn btn-primary"
            disabled={isLoading || selectedChapters.size === 0}
          >
            {isLoading
              ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Adding...
                </>
              )
              : (
                <>
                  <PlusIcon size={18} />
                  Add{" "}
                  {selectedChapters.size > 0
                    ? `(${selectedChapters.size})`
                    : ""}
                </>
              )}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
