import {
  DotsSixVerticalIcon,
  PlusCircleIcon,
  SpeakerHighIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { internal } from "../../../convex/_generated/api.js";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface EditorContentProps {
  excerpts: TextExcerpt[];
  loading: React.Dispatch<React.SetStateAction<"saved" | "saving" | "error">>;
  chapterId: string;
  playAudio?: (text: string) => void;
}

// Type definitions
interface TextExcerpt {
  excerptId: string;
  id: string;
  text: string;
  order: number;
}

// Editor Content Component
export const EditorContent = ({
  excerpts,
  loading,
  chapterId,
  playAudio,
}: EditorContentProps) => {
  const addExcerptAction = useAction(
    internal.functions.excerpts.addExcerpt,
  );

  const addExcerpt = () => {
    const toastId = toast.loading("Adding new excerpt...");
    loading("saving");

    addExcerptAction({ chapterId, text: "" })
      .then(() => {
        toast.success("Excerpt added successfully", { id: toastId });
        loading("saved");
      })
      .catch((error) => {
        toast.error(
          `Failed to add excerpt: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { id: toastId },
        );
        loading("error");
      });
  };

  const reorderExcerptsMutation = useMutation(
    internal.functions.excerpts.reorderExcerpts,
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = excerpts.findIndex((item) => item.id === active.id);
      const newIndex = excerpts.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        loading("saving");
        const toastId = toast.loading("Reordering excerpts...");

        const chapterExcerptId1 = excerpts[oldIndex].id;
        const chapterExcerptId2 = excerpts[newIndex].id;

        reorderExcerptsMutation({
          chapterId,
          chapterExcerptId1,
          chapterExcerptId2,
        })
          .then(() => {
            toast.success("Excerpts reordered successfully", { id: toastId });
            loading("saved");
          })
          .catch((error) => {
            toast.error(
              `Failed to reorder excerpts: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              { id: toastId },
            );
            loading("error");
          });
      }
    }
  };

  return (
    <div className="space-y-4">
      {excerpts.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={excerpts.map((excerpt) => excerpt.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {excerpts.map((excerpt, index) => (
                <ExcerptItem
                  key={excerpt.id}
                  chapterId={chapterId}
                  excerpt={excerpt}
                  loading={loading}
                  index={index}
                  playAudio={() => {}}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {excerpts.length === 0 && (
        <div className="card bg-base-100 shadow-sm border border-slate-200 p-12 text-center">
          <div className="card-body">
            <p className="text-slate-500 mb-4">
              No text excerpts yet. Add your first excerpt to get started.
            </p>
            <button
              type="button"
              className="btn btn-primary mx-auto"
              onClick={addExcerpt}
            >
              <PlusCircleIcon size={18} className="mr-2" />
              Add First Excerpt
            </button>
          </div>
        </div>
      )}

      {/* Add Excerpt Button - Below the excerpts */}
      {excerpts.length > 0 && (
        <div className="card bg-base-100 shadow-sm border border-slate-200">
          <div className="card-body p-4">
            <button
              type="button"
              className="btn btn-outline w-full"
              onClick={addExcerpt}
            >
              <PlusCircleIcon size={18} className="mr-2" />
              Add Text Excerpt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ExcerptItem = ({
  excerpt,
  playAudio,
  loading,
  chapterId,
  index,
}: {
  excerpt: TextExcerpt;
  index: number;
  playAudio: (text: string) => void;
  loading: React.Dispatch<React.SetStateAction<"saved" | "saving" | "error">>;
  chapterId: string;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: excerpt.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const [text, setText] = useState(excerpt.text);

  const updateExcerptAction = useAction(
    internal.functions.excerpts.updateExcerpt,
  );
  const deleteExcerptMutation = useMutation(
    internal.functions.excerpts.deleteExcerpt,
  );

  const deleteExcerpt = () => {
    const toastId = toast.loading("Deleting excerpt...");
    loading("saving");

    deleteExcerptMutation({ chapterExcerptId: excerpt.id })
      .then(() => {
        toast.success("Excerpt deleted successfully", { id: toastId });
      })
      .catch((error) => {
        toast.error(
          `Failed to delete excerpt: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { id: toastId },
        );
      });
    loading("saved");
  };

  // Handle local text changes without API calls
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  // Save changes when user clicks away from textarea
  const saveChanges = async () => {
    // Only call API if text has actually changed
    if (text !== excerpt.text) {
      const toastId = toast.loading("Saving changes...");
      loading("saving");

      try {
        await updateExcerptAction({
          chapterExcerptId: excerpt.id,
          text: text,
        });
        toast.success("Changes saved successfully", { id: toastId });
        loading("saved");
      } catch (error) {
        toast.error(
          `Failed to save changes: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { id: toastId },
        );
        loading("error");
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card bg-base-100 shadow-sm border border-slate-200 ${
        isDragging ? "shadow-lg" : ""
      }`}
      data-id={excerpt.id}
    >
      <div className="card-body p-3 mx-1">
        <div className="flex justify-between items-center">
          <h3 className="card-title text-lg">Excerpt {index + 1}</h3>
          <div className="flex gap-2 items-center">
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => playAudio(excerpt.text)}
              disabled={!excerpt.text}
            >
              <SpeakerHighIcon size={18} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle text-error"
              onClick={deleteExcerpt}
            >
              <TrashIcon size={18} />
            </button>
            <div
              className="cursor-grab active:cursor-grabbing hover:bg-slate-100 p-1 rounded-md"
              title="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <DotsSixVerticalIcon size={20} className="text-slate-500" />
            </div>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">
            Text Content
          </label>
          <textarea
            value={text}
            onChange={handleTextChange}
            onBlur={saveChanges}
            placeholder="Enter the text that students will practice..."
            className="textarea textarea-bordered w-full mt-1"
          />
        </div>
      </div>
    </div>
  );
};
