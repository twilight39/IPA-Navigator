import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { toast } from "sonner";
import { XIcon } from "@phosphor-icons/react";

interface JoinClassroomModalProps {
  classroomId: string;
  isPrivate: boolean;
  onJoinSuccess: () => void;
}

export function JoinClassroomModal(
  { classroomId, isPrivate, onJoinSuccess }: JoinClassroomModalProps,
) {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const joinClassroom = useMutation(api.functions.classrooms.joinClassroom);

  const handleJoin = async () => {
    if (isPrivate && !inviteCode.trim()) {
      toast.error("Please enter invite code");
      return;
    }

    setIsLoading(true);
    try {
      await joinClassroom({
        classroomId,
        inviteCode: isPrivate ? inviteCode : undefined,
      });

      toast.success("Successfully joined classroom!");
      setInviteCode("");
      onJoinSuccess();

      const modal = document.getElementById(
        `join_classroom_modal_${classroomId}`,
      ) as HTMLDialogElement;
      if (modal) modal.close();
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to join";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <dialog
      id={`join_classroom_modal_${classroomId}`}
      className="modal modal-middle"
    >
      <div className="modal-box w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {isPrivate ? "Join Private Classroom" : "Join Classroom"}
          </h3>
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost">
              <XIcon size={18} />
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {isPrivate && (
            <>
              <p className="text-sm text-slate-600">
                Enter the invite code provided by the teacher to join this
                classroom.
              </p>
              <input
                type="text"
                placeholder="Enter invite code..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleJoin();
                }}
                className="input input-bordered w-full font-mono font-bold text-center"
                disabled={isLoading}
              />
            </>
          )}

          {!isPrivate && (
            <p className="text-sm text-slate-600">
              Click join to become a member of this classroom.
            </p>
          )}
        </div>

        <div className="modal-action mt-6">
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
            onClick={handleJoin}
            className="btn btn-primary"
            disabled={isLoading || (isPrivate && !inviteCode.trim())}
          >
            {isLoading
              ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Joining...
                </>
              )
              : (
                "Join"
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
