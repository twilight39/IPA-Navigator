import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import {
  CopyIcon,
  GlobeIcon,
  LockIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useFileUpload } from "../hooks/useFileUpload.tsx";
import { toast } from "sonner";

interface ClassroomSettingsContentProps {
  classroomId: string;
  onSaveStatusChange: (status: "saved" | "saving" | "error") => void;
}

export function ClassroomSettingsContent(
  { classroomId, onSaveStatusChange }: ClassroomSettingsContentProps,
) {
  const router = useRouter();
  const navigate = useNavigate();

  const classroom = useQuery(api.functions.classrooms.getClassroom, {
    classroomId,
  });
  const members = useQuery(api.functions.classrooms.getClassroomMembers, {
    classroomId,
  });

  const updateClassroom = useMutation(
    api.functions.classrooms.updateClassroom,
  );
  const generateInviteCode = useMutation(
    api.functions.classrooms.generateInviteCode,
  );
  const removeMember = useMutation(
    api.functions.classrooms.removeClassroomMember,
  );
  const archiveClassroom = useMutation(
    api.functions.classrooms.archiveClassroom,
  );

  const { uploadFiles, isUploading } = useFileUpload();

  const [localName, setLocalName] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (classroom) {
      setLocalName(classroom.name);
      setLocalDescription(classroom.description || "");
      setVisibility(classroom.visibility);
    }
  }, [classroom]);

  if (!classroom || !members) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    uploadFiles([file])
      .then((imageIds) => {
        const imageId = imageIds[0];
        if (imageId) {
          handleChange("imageId", imageId);
          toast.success("Image uploaded successfully!");
        }
      })
      .catch((error) => {
        console.error("Image upload failed:", error);
        toast.error("Failed to upload image. Please try again.");
      });
  };

  const handleChange = async (field: string, value: any) => {
    onSaveStatusChange("saving");
    try {
      if (field === "name") {
        await updateClassroom({ classroomId, name: value });
      } else if (field === "description") {
        await updateClassroom({ classroomId, description: value });
      } else if (field === "visibility") {
        await updateClassroom({ classroomId, visibility: value });
      } else if (field === "imageId") {
        await updateClassroom({ classroomId, imageId: value });
      }
      onSaveStatusChange("saved");
    } catch (error) {
      onSaveStatusChange("error");
      toast.error("Failed to save changes");
    }
  };

  const handleGenerateCode = async () => {
    try {
      await generateInviteCode({ classroomId });
      toast.success("Invite code generated");
    } catch (error) {
      toast.error("Failed to generate invite code");
    }
  };

  const handleRemoveMember = async (enrollmentId: string) => {
    if (!confirm("Remove this member from the classroom?")) return;
    try {
      await removeMember({ classroomId, enrollmentId });
      toast.success("Member removed");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleDeleteClassroom = async () => {
    try {
      await archiveClassroom({ classroomId });
      toast.success("Classroom deleted");
      navigate({ to: "/classrooms" });
    } catch (error) {
      toast.error("Failed to delete classroom");
    }
  };

  return (
    <div className="max-w space-y-6">
      {/* Banner Image Card */}
      <div className="card bg-white shadow-sm border border-slate-200 overflow-hidden">
        <figure className="relative h-32 w-full">
          {classroom.imageUrl
            ? (
              <img
                src={classroom.imageUrl}
                alt="Classroom banner"
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

          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/30 via-black/15 via-black/5 to-transparent backdrop-blur-[2px]">
          </div>

          <div className="absolute top-4 right-4">
            <div
              className="tooltip tooltip-left"
              data-tip={classroom.imageUrl ? "Change image" : "Upload image"}
            >
              <button
                type="button"
                className="btn btn-circle btn-sm bg-base-100/90 hover:bg-base-100 border-none shadow-lg"
                onClick={() =>
                  document.getElementById("classroom-image-upload")?.click()}
              >
                <PencilIcon size={16} className="text-base-content" />
              </button>
            </div>
          </div>

          <div className="absolute bottom-2 left-4 right-4">
            <input
              type="text"
              className="w-full max-w-2xl text-xl font-bold bg-transparent p-1"
              value={localName}
              placeholder="Enter classroom name..."
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

          <input
            id="classroom-image-upload"
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
        </figure>

        <div className="card-body p-5">
          <h3 className="card-title text-lg">Classroom Description</h3>
          <p className="text-sm text-base-content/70">
            Introduce the classroom with a brief description.
          </p>
          <textarea
            placeholder="Enter classroom description..."
            className="textarea textarea-bordered w-full resize-none mt-4"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={(e) => {
              handleChange("description", e.target.value);
            }}
          />
        </div>
      </div>

      {/* Visibility Card */}
      <div className="card bg-base-100 shadow-sm border border-slate-200">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">Visibility</h2>

          <div className="space-y-3 mt-4">
            <label
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
              onClick={() => handleChange("visibility", "public")}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === "public"}
                onChange={() => {}}
                className="radio radio-primary"
              />
              <div className="flex-1">
                <p className="font-medium flex items-center gap-2">
                  <GlobeIcon size={16} />
                  Public
                </p>
                <p className="text-xs text-slate-500">
                  Anyone can find and join this classroom
                </p>
              </div>
            </label>

            <label
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50"
              onClick={() => handleChange("visibility", "private")}
            >
              <input
                type="radio"
                name="visibility"
                checked={visibility === "private"}
                onChange={() => {}}
                className="radio radio-primary"
              />
              <div className="flex-1">
                <p className="font-medium flex items-center gap-2">
                  <LockIcon size={16} />
                  Private
                </p>
                <p className="text-xs text-slate-500">
                  Only members with an invite code can join
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Invite Code Card */}
      {visibility === "private" && (
        <div className="card bg-base-100 shadow-sm border border-slate-200">
          <div className="card-body p-5">
            <h2 className="card-title text-lg">Invite Code</h2>

            <div className="mt-4">
              {classroom.inviteCode
                ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">
                      Share this code with students to invite them
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={classroom.inviteCode}
                        readOnly
                        className="input input-bordered flex-1 font-mono font-bold text-lg"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(classroom.inviteCode!);
                          toast.success("Code copied!");
                        }}
                        className="btn btn-ghost btn-square"
                      >
                        <CopyIcon size={18} />
                      </button>
                    </div>
                    <button
                      onClick={handleGenerateCode}
                      className="btn btn-sm btn-outline"
                    >
                      Regenerate Code
                    </button>
                  </div>
                )
                : (
                  <>
                    <p className="text-sm text-slate-600 mb-3">
                      Generate an invite code for private classrooms
                    </p>
                    <button
                      onClick={handleGenerateCode}
                      className="btn btn-sm btn-primary"
                    >
                      Generate Invite Code
                    </button>
                  </>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Members Card */}
      <div className="card bg-base-100 shadow-sm border border-slate-200">
        <div className="card-body p-5">
          <h2 className="card-title text-lg">Members ({members.length})</h2>

          <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <div
                key={member.enrollmentId}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="avatar placeholder">
                    <div className="bg-slate-200 text-slate-600 rounded-full w-8">
                      {member.picture
                        ? (
                          <img
                            src={member.picture}
                            alt={member.name}
                            className="rounded-full"
                          />
                        )
                        : (
                          <span className="text-xs">
                            {member.name.charAt(0)}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {member.role === "teacher" ? "Teacher" : "Student"}
                    </p>
                  </div>
                </div>

                {member.role === "student" && (
                  <button
                    onClick={() => handleRemoveMember(member.enrollmentId)}
                    className="btn btn-sm btn-ghost btn-square text-error"
                  >
                    <TrashIcon size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card bg-base-100 shadow-sm border border-error">
        <div className="card-body p-5">
          <h2 className="card-title text-lg text-error">Danger Zone</h2>

          <p className="text-sm text-slate-600 mt-2">
            Deleting a classroom is permanent and cannot be undone.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn btn-error btn-outline mt-4"
          >
            <TrashIcon size={18} />
            Delete Classroom
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <dialog open className="modal modal-open">
          <form
            method="dialog"
            className="modal-box"
            onSubmit={(e) => e.preventDefault()}
          >
            <h3 className="font-bold text-lg">Delete Classroom?</h3>
            <p className="py-4">
              Are you sure you want to delete this classroom? This action cannot
              be undone and all progress will be lost.
            </p>
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => {
                  handleDeleteClassroom();
                  setShowDeleteModal(false);
                }}
              >
                Delete
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
