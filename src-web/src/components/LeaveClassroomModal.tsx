import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api.js";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Modal } from "./Modal.tsx";
import { useState } from "react";

interface LeaveClassroomModalProps {
  classroomId: string;
  classroomName: string;
}

export function LeaveClassroomModal(
  { classroomId, classroomName }: LeaveClassroomModalProps,
) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const leaveClassroom = useMutation(
    api.functions.classrooms.leaveClassroom,
  );

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leaveClassroom({ classroomId });
      toast.success("You have left the classroom");

      const modal = document.getElementById(
        `leave_classroom_modal_${classroomId}`,
      ) as HTMLDialogElement;
      if (modal) modal.close();

      navigate({ to: "/classrooms" });
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to leave classroom";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    const modal = document.getElementById(
      `leave_classroom_modal_${classroomId}`,
    ) as HTMLDialogElement;
    if (modal) modal.close();
  };

  return (
    <Modal id={`leave_classroom_modal_${classroomId}`}>
      <div className="p-6 space-y-4 bg-base-100">
        <h2 className="text-xl font-bold text-slate-800">Leave Classroom?</h2>

        <p className="text-slate-600">
          Are you sure you want to leave{" "}
          <span className="font-semibold">{classroomName}</span>? You can rejoin
          later with the invite code.
        </p>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={handleCancel}
            className="btn btn-ghost"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleLeave}
            className="btn btn-error"
            disabled={isLoading}
          >
            {isLoading
              ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Leaving...
                </>
              )
              : (
                "Leave"
              )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
