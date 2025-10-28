import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Modal } from "./Modal.tsx";

interface JoinWithCodeModalProps {
  onClose?: () => void;
}

export function JoinWithCodeModal({ onClose }: JoinWithCodeModalProps) {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const joinWithCode = useMutation(
    api.functions.classrooms.joinClassroomWithCode,
  );

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }

    setIsLoading(true);
    try {
      const result = await joinWithCode({ inviteCode });
      toast.success("Successfully joined classroom!");
      setInviteCode("");

      const modal = document.getElementById(
        "join_with_code_modal",
      ) as HTMLDialogElement;
      if (modal) modal.close();

      navigate({
        to: "/classrooms/$classroomId",
        params: { classroomId: result.classroomId },
      });
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
    <Modal id="join_with_code_modal">
      <div className="p-8 space-y-6 bg-base-100">
        <div>
          <h2 className="text-2xl font-bold">Join with Code</h2>
          <p className="text-slate-600 mt-2">
            Enter the invite code to join a classroom
          </p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter invite code..."
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleJoin();
            }}
            className="input input-bordered w-full font-mono font-bold text-center text-2xl tracking-widest"
            disabled={isLoading}
            maxLength={6}
          />

          <button
            onClick={handleJoin}
            className="btn btn-primary w-full"
            disabled={isLoading || !inviteCode.trim()}
          >
            {isLoading
              ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Joining...
                </>
              )
              : (
                "Join Classroom"
              )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
