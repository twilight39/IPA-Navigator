import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { toast } from "sonner";
import { XIcon } from "@phosphor-icons/react";

export function CreateClassroomModal() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">(
    "public",
  );
  const [isLoading, setIsLoading] = useState(false);

  const createClassroom = useMutation(
    api.functions.classrooms.createClassroom,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Classroom name is required");
      return;
    }

    setIsLoading(true);
    try {
      await createClassroom({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });

      toast.success("Classroom created successfully!");

      // Reset form
      setName("");
      setDescription("");
      setVisibility("public");

      // Close modal
      const modal = document.getElementById(
        "create_classroom_modal",
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      toast.error("Failed to create classroom");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog id="create_classroom_modal" className="modal">
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Create Classroom</h3>
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost">
              <XIcon size={18} />
            </button>
          </form>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              <span className="label-text font-medium">Classroom Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g., English Pronunciation 101"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              placeholder="Add a description for your classroom..."
              className="textarea textarea-bordered w-full"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text font-medium">Visibility</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "public" | "private")}
              disabled={isLoading}
            >
              <option value="public">Public (Anyone can join)</option>
              <option value="private">
                Private (Invite only)
              </option>
            </select>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button type="button" className="btn btn-ghost">
                Cancel
              </button>
            </form>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? <span className="loading loading-spinner loading-sm"></span>
                : null}
              Create
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
}
